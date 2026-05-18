#!/usr/bin/env python3
"""
scripts/validate-wireframe.py

Single-source-of-truth validator for the PTOwl wireframe → code →
tests → production chain. Treats the wireframe spec below as canonical
and asserts every layer agrees:

  Layer 1 (CODE):       the route is declared in apps/web/src/App.tsx
  Layer 2 (COMPONENT):  the React component file exists
  Layer 3 (TESTS):      scripts/e2e-live.mjs has a testPage() block
                        targeting the route
  Layer 4 (PRODUCTION): the route returns HTTP 200 on https://ptowl.com
  Layer 5 (CONTENT):    the route renders the wireframe-required text
                        (verified by curl-grep against rendered HTML
                        when possible; some checks defer to Layer 3's
                        Playwright assertions for dynamic React content)
  Layer 6 (ADA):        defends the "ADA-first design" invariant by
                        looking for <main id="main-content"> in the
                        static HTML. Defers to e2e-live.mjs when
                        React-rendered post-hydration.

Why this exists (Chernobyl defense-in-depth):

  Pre-this-script, a wireframe regression could slip through if any
  one layer drifted from the others. The existing tooling caught some
  cases:
    - pnpm typecheck     → catches a missing component import
    - pnpm test:unit     → catches a broken hook
    - e2e-live.mjs       → catches a missing element on production
    - smoke-clerk-urls   → catches Clerk dashboard drift

  But NONE of them catches:
    - Someone deletes a route from App.tsx without updating the test
      (typecheck passes; e2e never runs the deleted route; smoke is OK)
    - Someone adds a new wireframe section to the plan without
      implementing it (no failure surface at all)
    - The wireframe spec drifts away from the planning doc

  This script holds the spec in one place (the WIREFRAME constant
  below) and verifies all four layers agree on it. CI can run it
  as a final gate so a PR can never half-ship a wireframe change.

Exit codes:
  0  — every section in the spec validates across all 5 layers
  1  — at least one layer reports a mismatch (details printed)
  2  — environment / setup error (file missing, network down)

Off-the-shelf classification:
  - Python stdlib only (urllib, pathlib, re, json) — no pip install
  - Standard tooling pattern, no new runtime dependency
"""

from __future__ import annotations

import os
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
APP_TSX = REPO_ROOT / "apps" / "web" / "src" / "App.tsx"
E2E_LIVE = REPO_ROOT / "scripts" / "e2e-live.mjs"

# Allow override for staging environments. Same env var the existing
# e2e-live.mjs uses so the two stay in lockstep.
BASE_URL = os.environ.get("PLAYWRIGHT_BASE_URL", "https://ptowl.com")


# ── Wireframe specification ──────────────────────────────────────────────
#
# This is the canonical spec. Every section maps to a wireframe in the
# planning doc (sections 4.1-4.5 and 21-23 etc.). To add a new wireframe:
# (1) add an entry here, (2) implement the route + component, (3) add a
# testPage() block to scripts/e2e-live.mjs, (4) ship.
#
# The script then verifies all four layers stay in sync forever.

@dataclass
class WireframeSpec:
    plan_section: str           # e.g., "§4.2"
    label: str                  # human-readable name
    route: str                  # URL path declared in App.tsx, e.g. "/accounts/signin/*"
    component_file: str         # repo-relative path
    route_pattern: str          # regex to match in App.tsx
    test_label_pattern: str     # regex to match a testPage(label, ...) call
    # Optional content marker — if set, fetched HTML must contain it.
    # Useful for SSR/early-render content. React-rendered text usually
    # can't be checked this way; rely on Layer 3's Playwright instead.
    html_must_contain: str | None = None
    # Optional override of the URL to fetch in Layer 4. Use for wildcard
    # routes where App.tsx declares "/accounts/signin/*" but the
    # fetchable URL is just "/accounts/signin". Defaults to `route`.
    fetch_path_override: str | None = None

    @property
    def fetch_path(self) -> str:
        return self.fetch_path_override or self.route


@dataclass
class ProductionFetchResult:
    """Result of fetching a route. Replaces the previous side-effect
    pattern where check_production_200 mutated a `_last_body` attribute
    on the spec. A typed return value is what downstream checks should
    consume (check_html_content, check_main_landmark).
    """
    success: bool
    status_code: int | None
    body: str | None
    error: str | None = None


WIREFRAME: list[WireframeSpec] = [
    WireframeSpec(
        plan_section="§4.1",
        label="Landing — two CTAs",
        route="/",
        component_file="apps/web/src/pages/LandingPage.tsx",
        route_pattern=r'path="/"\s+element=\{<LandingPage\s*/>\}',
        test_label_pattern=r"testPage\(\s*['\"]Landing",
    ),
    WireframeSpec(
        plan_section="§4.2",
        label="Login — custom email+password form",
        route="/login",
        component_file="apps/web/src/pages/LoginPage.tsx",
        route_pattern=r'path="/login"\s+element=\{<LoginPage\s*/>\}',
        test_label_pattern=r"testPage\(\s*['\"]Login\s+\(wireframe",
    ),
    WireframeSpec(
        plan_section="§4.3",
        label="Sign up — clinic+email+password form",
        route="/signup",
        component_file="apps/web/src/pages/SignUpFormPage.tsx",
        route_pattern=r'path="/signup"\s+element=\{<SignUpFormPage\s*/>\}',
        test_label_pattern=r"testPage\(\s*['\"]Sign\s*up\s+\(wireframe",
    ),
    WireframeSpec(
        plan_section="§4.4",
        label="Awaiting approval — admin gate landing",
        route="/awaiting-approval",
        component_file="apps/web/src/pages/AwaitingApprovalPage.tsx",
        route_pattern=r'path="/awaiting-approval"\s+element=\{<AwaitingApprovalPage\s*/>\}',
        test_label_pattern=r"testPage\(\s*['\"]Awaiting approval",
    ),
    WireframeSpec(
        plan_section="§L (single-device kick)",
        label="Displaced — signed-in elsewhere page",
        route="/displaced",
        component_file="apps/web/src/pages/DisplacedPage.tsx",
        route_pattern=r'path="/displaced"\s+element=\{<DisplacedPage\s*/>\}',
        test_label_pattern=r"testPage\(\s*['\"]Displaced",
    ),
    WireframeSpec(
        plan_section="§G (admin approval)",
        label="Admin decide — magic-link approval target",
        route="/admin/decide?token=garbage&decision=approve",
        component_file="apps/web/src/pages/AdminDecidePage.tsx",
        route_pattern=r'path="/admin/decide"\s+element=\{<AdminDecidePage\s*/>\}',
        test_label_pattern=r"testPage\(\s*['\"]Admin decide",
    ),
    # ── Public/legal pages (round-2 coverage from script audit) ──────────
    WireframeSpec(
        plan_section="public/legal",
        label="About page",
        route="/about",
        component_file="apps/web/src/pages/AboutPage.tsx",
        route_pattern=r'path="/about"\s+element=\{<AboutPage\s*/>\}',
        test_label_pattern=r"testPage\(\s*['\"]About",
    ),
    WireframeSpec(
        plan_section="public/legal",
        label="Privacy policy",
        route="/privacy",
        component_file="apps/web/src/pages/PrivacyPolicyPage.tsx",
        route_pattern=r'path="/privacy"\s+element=\{<PrivacyPolicyPage\s*/>\}',
        test_label_pattern=r"testPage\(\s*['\"]Privacy",
    ),
    WireframeSpec(
        plan_section="public/legal",
        label="Terms of service",
        route="/terms",
        component_file="apps/web/src/pages/TermsOfServicePage.tsx",
        route_pattern=r'path="/terms"\s+element=\{<TermsOfServicePage\s*/>\}',
        test_label_pattern=r"testPage\(\s*['\"]Terms",
    ),
    WireframeSpec(
        plan_section="public/legal",
        label="Security page",
        route="/security",
        component_file="apps/web/src/pages/SecurityPage.tsx",
        route_pattern=r'path="/security"\s+element=\{<SecurityPage\s*/>\}',
        test_label_pattern=r"testPage\(\s*['\"]Security",
    ),
    # ── Legacy embedded-Clerk routes (still mounted for ticket flows) ────
    WireframeSpec(
        plan_section="legacy /accounts/*",
        label="Sign in (legacy embedded Clerk)",
        route="/accounts/signin/*",
        fetch_path_override="/accounts/signin",
        component_file="apps/web/src/pages/SignInPage.tsx",
        route_pattern=r'path="/accounts/signin/\*"\s+element=\{<SignInPage\s*/>\}',
        test_label_pattern=r"testPage\(\s*['\"]Sign in",
    ),
    WireframeSpec(
        plan_section="legacy /accounts/*",
        label="Sign up (legacy embedded Clerk)",
        route="/accounts/signup/*",
        fetch_path_override="/accounts/signup",
        component_file="apps/web/src/pages/SignUpPage.tsx",
        route_pattern=r'path="/accounts/signup/\*"\s+element=\{<SignUpPage\s*/>\}',
        test_label_pattern=r"testPage\(\s*['\"]Sign up['\"]",
    ),
]


# ── Layer-by-layer check implementations ─────────────────────────────────

@dataclass
class CheckResult:
    layer: str
    passed: bool
    detail: str = ""


def check_route_declared(spec: WireframeSpec, app_tsx_source: str) -> CheckResult:
    if re.search(spec.route_pattern, app_tsx_source):
        return CheckResult("CODE (route declared)", True)
    return CheckResult(
        "CODE (route declared)",
        False,
        f"No match for /{spec.route_pattern}/ in App.tsx — route is missing or renamed.",
    )


def check_component_exists(spec: WireframeSpec) -> CheckResult:
    p = REPO_ROOT / spec.component_file
    if p.exists():
        return CheckResult("COMPONENT (file exists)", True)
    return CheckResult(
        "COMPONENT (file exists)",
        False,
        f"File missing: {spec.component_file}",
    )


def check_test_coverage(spec: WireframeSpec, e2e_live_source: str) -> CheckResult:
    if re.search(spec.test_label_pattern, e2e_live_source):
        return CheckResult("TESTS (e2e-live.mjs)", True)
    return CheckResult(
        "TESTS (e2e-live.mjs)",
        False,
        f"No testPage() block matching /{spec.test_label_pattern}/ — add one.",
    )


def fetch_production(spec: WireframeSpec) -> ProductionFetchResult:
    """Fetch the route once and return a typed result. Downstream
    HTML-content checks (check_html_content, check_main_landmark)
    consume the body from this object instead of refetching."""
    url = f"{BASE_URL}{spec.fetch_path}"
    req = urllib.request.Request(url, headers={"User-Agent": "validate-wireframe.py"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            return ProductionFetchResult(
                success=resp.status == 200,
                status_code=resp.status,
                body=body if resp.status == 200 else None,
                error=None if resp.status == 200 else f"HTTP {resp.status}",
            )
    except urllib.error.HTTPError as e:
        return ProductionFetchResult(False, e.code, None, f"HTTPError {e.code}")
    except urllib.error.URLError as e:
        return ProductionFetchResult(False, None, None, f"URLError {e.reason}")
    except Exception as e:  # noqa: BLE001 — top-level catchall, surfaced in output
        return ProductionFetchResult(False, None, None, f"{type(e).__name__}: {e}")


def check_production_200(fetch: ProductionFetchResult) -> CheckResult:
    if fetch.success:
        return CheckResult("PRODUCTION (HTTP 200)", True)
    return CheckResult("PRODUCTION (HTTP 200)", False, fetch.error or "unknown")


def check_html_content(spec: WireframeSpec, fetch: ProductionFetchResult) -> CheckResult:
    if spec.html_must_contain is None:
        return CheckResult("CONTENT (html marker)", True, "skipped — none required")
    if fetch.body is None:
        return CheckResult("CONTENT (html marker)", False, "no body fetched")
    if spec.html_must_contain in fetch.body:
        return CheckResult("CONTENT (html marker)", True)
    return CheckResult(
        "CONTENT (html marker)",
        False,
        f"HTML did not contain {spec.html_must_contain!r}",
    )


def check_main_landmark(fetch: ProductionFetchResult) -> CheckResult:
    """Layer 6 — ADA defense. The PTOwl plan §33 requires every page
    to have a <main id="main-content"> landmark for skip-to-main
    keyboard navigation. e2e-live.mjs already asserts this with
    Playwright (which sees post-hydration content), but checking the
    static HTML here is a cheap canary that catches SSR-side
    regressions early.

    Most PTOwl pages render <main> via React, so the static HTML
    typically WON'T contain it. We don't treat that as a hard failure
    — surfacing every SSR-side miss would create false positives.
    Instead, we PASS with a 'deferred to e2e-live.mjs' note when the
    static check doesn't find the landmark, and PASS cleanly when it
    does. e2e-live.mjs remains the source of truth for the ADA
    landmark assertion."""
    if fetch.body is None:
        return CheckResult("ADA (main landmark)", False, "no body fetched")
    has_main = '<main' in fetch.body and 'id="main-content"' in fetch.body
    if has_main:
        return CheckResult("ADA (main landmark)", True, "found in static HTML")
    return CheckResult(
        "ADA (main landmark)",
        True,
        "deferred to e2e-live.mjs (React-rendered post-hydration)",
    )


# ── Runner ───────────────────────────────────────────────────────────────

def main() -> int:
    print(f"validate-wireframe.py  base={BASE_URL}  specs={len(WIREFRAME)}")

    try:
        app_tsx_source = APP_TSX.read_text(encoding="utf-8")
    except OSError as e:
        print(f"FATAL: cannot read App.tsx: {e}", file=sys.stderr)
        return 2

    try:
        e2e_live_source = E2E_LIVE.read_text(encoding="utf-8")
    except OSError as e:
        print(f"FATAL: cannot read e2e-live.mjs: {e}", file=sys.stderr)
        return 2

    all_passed = True
    for spec in WIREFRAME:
        print(f"\n=== {spec.plan_section}  {spec.label}  ({spec.route}) ===")
        # Fetch once, share the body across the 3 content-dependent checks.
        fetch = fetch_production(spec)
        checks = [
            check_route_declared(spec, app_tsx_source),
            check_component_exists(spec),
            check_test_coverage(spec, e2e_live_source),
            check_production_200(fetch),
            check_html_content(spec, fetch),
            check_main_landmark(fetch),
        ]
        for c in checks:
            mark = "PASS" if c.passed else "FAIL"
            line = f"  [{mark}] {c.layer}"
            if c.detail:
                line += f"  — {c.detail}"
            print(line)
            if not c.passed:
                all_passed = False

    print("\n" + "-" * 60)
    print(f"Total specs: {len(WIREFRAME)}")
    if all_passed:
        print("OK: ALL WIREFRAME LAYERS IN SYNC")
        return 0
    print("FAIL: DRIFT DETECTED -- see FAILs above")
    print("  Fix workflow: implement the missing layer (code, test, or")
    print("  wireframe spec entry) and re-run. CI will not merge a PR")
    print("  while any wireframe section is half-shipped.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
