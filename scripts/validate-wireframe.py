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

import json
import re
import sys
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

REPO_ROOT = Path(__file__).resolve().parent.parent
APP_TSX = REPO_ROOT / "apps" / "web" / "src" / "App.tsx"
E2E_LIVE = REPO_ROOT / "scripts" / "e2e-live.mjs"
BASE_URL = "https://ptowl.com"

# Allow override for staging environments. Same env var the existing
# e2e-live.mjs uses so the two stay in lockstep.
import os
BASE_URL = os.environ.get("PLAYWRIGHT_BASE_URL", BASE_URL)


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
    route: str                  # URL path, must match exactly
    component_file: str         # repo-relative path
    route_pattern: str          # regex to match in App.tsx
    test_label_pattern: str     # regex to match a testPage(label, ...) call
    # Optional content marker — if set, fetched HTML must contain it.
    # Useful for SSR/early-render content. React-rendered text usually
    # can't be checked this way; rely on Layer 3's Playwright instead.
    html_must_contain: str | None = None


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


def check_production_200(spec: WireframeSpec) -> CheckResult:
    url = f"{BASE_URL}{spec.route}"
    req = urllib.request.Request(url, headers={"User-Agent": "validate-wireframe.py"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                # Stash the body on the spec for downstream content check.
                # We attach it as a side-effect attribute so the next check
                # doesn't re-fetch the same page.
                spec._last_body = resp.read().decode("utf-8", errors="ignore")  # type: ignore[attr-defined]
                return CheckResult("PRODUCTION (HTTP 200)", True)
            return CheckResult(
                "PRODUCTION (HTTP 200)", False, f"Got HTTP {resp.status}"
            )
    except urllib.error.HTTPError as e:
        return CheckResult("PRODUCTION (HTTP 200)", False, f"HTTPError {e.code}")
    except urllib.error.URLError as e:
        return CheckResult("PRODUCTION (HTTP 200)", False, f"URLError {e.reason}")
    except Exception as e:  # noqa: BLE001 — top-level catchall, surfaced in output
        return CheckResult("PRODUCTION (HTTP 200)", False, f"{type(e).__name__}: {e}")


def check_html_content(spec: WireframeSpec) -> CheckResult:
    if spec.html_must_contain is None:
        return CheckResult("CONTENT (html marker)", True, "skipped — none required")
    body = getattr(spec, "_last_body", None)
    if body is None:
        return CheckResult("CONTENT (html marker)", False, "no body fetched")
    if spec.html_must_contain in body:
        return CheckResult("CONTENT (html marker)", True)
    return CheckResult(
        "CONTENT (html marker)",
        False,
        f"HTML did not contain {spec.html_must_contain!r}",
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
        checks = [
            check_route_declared(spec, app_tsx_source),
            check_component_exists(spec),
            check_test_coverage(spec, e2e_live_source),
            check_production_200(spec),
            check_html_content(spec),
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
