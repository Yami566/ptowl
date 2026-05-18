#!/usr/bin/env python3
"""
scripts/status.py

One-page health snapshot for PTOwl. Walks production + repo + GitHub
state and prints a single tight report so you can re-enter the project
after time away and know exactly where things stand.

Sections:
  1. Production HTTP  — every public route + API health, with latencies
  2. Clerk config     — current display_config URLs + identification strategies
  3. Latest deploy    — workflow conclusion + age + commit subject
  4. Open PRs         — title, mergeable state, CI rollup
  5. Recent failures  — last 5 failed workflow runs (any workflow)
  6. Cron heartbeats  — last scheduled run of each cron workflow

Designed to be runnable from anywhere with `python scripts/status.py`
or `pnpm status`. Stdlib only — no pip install.

Off-the-shelf classification:
  - Python stdlib (urllib, json, subprocess, time, pathlib)
  - Shells out to `gh` CLI (already required for the deploy + e2e flow)
  - Zero npm/pip dependencies

Exit code is always 0 unless the script itself crashes — this is a
report, not a gate. Production health gates live in validate-pipeline.yml.
"""

from __future__ import annotations

import json
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

BASE_URL = "https://ptowl.com"
CLERK_FAPI = "https://clerk.ptowl.com/v1/environment"

# Routes to smoke. Mirrors the post-deploy verification loop used
# everywhere else in this session. Public routes only — protected
# (ClinicRoute) routes 302 to login, so the status check would say
# "redirected" not "healthy".
ROUTES = [
    "/",
    "/login",
    "/signup",
    "/accounts/signin",
    "/accounts/signup",
    "/awaiting-approval",
    "/displaced",
    "/about",
    "/privacy",
    "/terms",
    "/security",
    "/api/v1/health",
]

# Cron-driven workflows whose schedule we want to surface. Names must
# match the `name:` field in .github/workflows/*.yml exactly.
CRON_WORKFLOWS = [
    "Validate pipeline — wireframe, PHI, IDE-noise",
    "Smoke — Clerk URL alignment",
    "D1 daily snapshot to R2",
    "Smoke — monthly production health check",
]


def hr(title: str = "") -> None:
    bar = "=" * 60
    if title:
        print(f"\n{bar}\n{title}\n{bar}")
    else:
        print(bar)


def gh(args: list[str]) -> str | None:
    """Run a gh CLI command and return stdout as text. Returns None on
    failure so individual sections can fail gracefully without aborting
    the whole report."""
    try:
        result = subprocess.run(
            ["gh", *args],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        if result.returncode != 0:
            return None
        return result.stdout
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None


def fetch(url: str, timeout: int = 8) -> tuple[int | None, str | None, float]:
    """Time-bound HTTP GET. Returns (status_code, body, elapsed_seconds)."""
    start = time.monotonic()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "status.py"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            return resp.status, body, time.monotonic() - start
    except urllib.error.HTTPError as e:
        return e.code, None, time.monotonic() - start
    except (urllib.error.URLError, Exception):  # noqa: BLE001
        return None, None, time.monotonic() - start


import time  # noqa: E402 — used by fetch() above


def section_http_smoke() -> int:
    hr("1. PRODUCTION HTTP  (public routes + API health)")
    fails = 0
    for path in ROUTES:
        url = f"{BASE_URL}{path}"
        status, _body, elapsed = fetch(url)
        mark = "PASS" if status == 200 else "FAIL"
        if status != 200:
            fails += 1
        ms = int(elapsed * 1000)
        status_str = str(status) if status else "ERR"
        print(f"  [{mark}] {path:<30} HTTP {status_str}  {ms}ms")
    if fails:
        print(f"\n  WARNING: {fails} route(s) not returning HTTP 200")
    return fails


def section_clerk_config() -> None:
    hr("2. CLERK CONFIG  (clerk.ptowl.com/v1/environment)")
    status, body, _ = fetch(CLERK_FAPI, timeout=6)
    if status != 200 or body is None:
        print(f"  [FAIL] could not GET {CLERK_FAPI} (status={status})")
        return
    try:
        env = json.loads(body)
    except json.JSONDecodeError:
        print("  [FAIL] response was not valid JSON")
        return
    display = env.get("display_config", {})
    auth = env.get("auth_config", {})
    strategies = auth.get("identification_strategies") or []
    single = auth.get("single_session_mode")

    print(f"  sign_in_url           = {display.get('sign_in_url', '?')}")
    print(f"  sign_up_url           = {display.get('sign_up_url', '?')}")
    print(f"  after_sign_in_url     = {display.get('after_sign_in_url', '?')}")
    print(f"  identifier strategies = {', '.join(strategies) if strategies else '(none!)'}")
    print(f"  single_session_mode   = {single}")

    # Flag the specific gap from the 2026-05-18 incident.
    if "email_address" not in strategies:
        print("\n  ⚠  email_address NOT enabled — signup form will render the")
        print("     maintenance card. Toggle in Clerk dashboard:")
        print("     https://dashboard.clerk.com/last-active?path=/user-authentication/email-phone-username")


def section_latest_deploy() -> None:
    hr("3. LATEST DEPLOY  (Deploy PtOwl workflow)")
    out = gh([
        "run", "list",
        "--workflow=Deploy PtOwl (API + D1 + Frontend)",
        "--limit", "1",
        "--json", "conclusion,status,createdAt,headSha,displayTitle",
    ])
    if out is None:
        print("  [FAIL] gh CLI not available or no runs found")
        return
    try:
        runs = json.loads(out)
    except json.JSONDecodeError:
        print("  [FAIL] could not parse gh output")
        return
    if not runs:
        print("  no deploys recorded")
        return
    r = runs[0]
    conclusion = r.get("conclusion") or r.get("status") or "?"
    created = r.get("createdAt", "?")
    sha = (r.get("headSha") or "")[:7]
    title = (r.get("displayTitle") or "")[:80]
    age = _humanize_age(created)
    mark = "PASS" if conclusion == "success" else "FAIL"
    print(f"  [{mark}] conclusion={conclusion}  age={age}  commit={sha}")
    print(f"         {title}")


def section_open_prs() -> None:
    hr("4. OPEN PRs")
    out = gh([
        "pr", "list",
        "--state", "open",
        "--json", "number,title,author,mergeable,statusCheckRollup",
    ])
    if out is None:
        print("  [FAIL] gh CLI not available")
        return
    try:
        prs = json.loads(out)
    except json.JSONDecodeError:
        print("  [FAIL] could not parse gh output")
        return
    if not prs:
        print("  no open PRs")
        return
    for pr in prs:
        num = pr.get("number", "?")
        title = (pr.get("title") or "")[:60]
        author = pr.get("author", {}).get("login", "?")
        mergeable = pr.get("mergeable", "?")
        checks = pr.get("statusCheckRollup") or []
        pass_count = sum(1 for c in checks if c.get("conclusion") == "SUCCESS")
        fail_count = sum(1 for c in checks if c.get("conclusion") == "FAILURE")
        pending = sum(1 for c in checks if c.get("status") in ("QUEUED", "IN_PROGRESS"))
        check_summary = f"{pass_count}✓/{fail_count}✗"
        if pending:
            check_summary += f"/{pending}⌛"
        print(f"  #{num:<4} [{author:<12}] mergeable={mergeable:<11} checks={check_summary}")
        print(f"         {title}")


def section_recent_failures() -> None:
    hr("5. RECENT FAILURES  (last 5 across all workflows)")
    out = gh([
        "run", "list",
        "--status", "failure",
        "--limit", "5",
        "--json", "createdAt,workflowName,headBranch,displayTitle",
    ])
    if out is None:
        print("  [FAIL] gh CLI not available")
        return
    try:
        runs = json.loads(out)
    except json.JSONDecodeError:
        print("  [FAIL] could not parse gh output")
        return
    if not runs:
        print("  no recent failures — system is clean")
        return
    for r in runs:
        age = _humanize_age(r.get("createdAt", ""))
        wf = (r.get("workflowName") or "")[:40]
        branch = (r.get("headBranch") or "")[:25]
        title = (r.get("displayTitle") or "")[:50]
        print(f"  {age:<10}  {wf:<42}  {branch}")
        print(f"             {title}")


def section_cron_heartbeats() -> None:
    hr("6. CRON HEARTBEATS  (last scheduled run per workflow)")
    for wf in CRON_WORKFLOWS:
        out = gh([
            "run", "list",
            f"--workflow={wf}",
            "--event", "schedule",
            "--limit", "1",
            "--json", "conclusion,createdAt",
        ])
        if out is None:
            print(f"  [SKIP] {wf:<55}  (no gh output)")
            continue
        try:
            runs = json.loads(out)
        except json.JSONDecodeError:
            print(f"  [SKIP] {wf:<55}  (parse error)")
            continue
        if not runs:
            print(f"  [SKIP] {wf:<55}  (no scheduled runs found)")
            continue
        r = runs[0]
        conclusion = r.get("conclusion") or "?"
        age = _humanize_age(r.get("createdAt", ""))
        mark = "PASS" if conclusion == "success" else "FAIL"
        print(f"  [{mark}] {wf:<55}  last={age}")


def _humanize_age(iso: str) -> str:
    if not iso:
        return "?"
    try:
        # ISO 8601 with trailing Z — datetime.fromisoformat needs "+00:00"
        ts = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        delta = datetime.now(timezone.utc) - ts
        seconds = int(delta.total_seconds())
        if seconds < 60:
            return f"{seconds}s ago"
        if seconds < 3600:
            return f"{seconds // 60}m ago"
        if seconds < 86400:
            return f"{seconds // 3600}h ago"
        return f"{seconds // 86400}d ago"
    except (ValueError, TypeError):
        return iso[:19]


def main() -> int:
    print(f"PTOwl status snapshot — {datetime.now(timezone.utc).isoformat()[:19]}Z")
    print(f"Base URL: {BASE_URL}")

    section_http_smoke()
    section_clerk_config()
    section_latest_deploy()
    section_open_prs()
    section_recent_failures()
    section_cron_heartbeats()

    hr()
    print("Done. For deeper signal, run:")
    print("  pnpm verify        — local gates (typecheck + lint + tests + python validators)")
    print("  pnpm verify:prod   — production gates (e2e-live + e2e-auth)")
    print("  pnpm test:e2e:auth — authenticated 5-keypress flow (requires CLERK_SECRET_KEY)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
