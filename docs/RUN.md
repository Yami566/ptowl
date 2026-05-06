# PTowl — Run

> Ops handbook. Production topology, edge hardening, monitoring, DR,
> open security findings. Lives next to `VISION.md` (why), `BUILD.md`
> (how it's built), and `SHIP.md` (how it gets out the door).
> This doc covers what happens after it's out.

---

## TL;DR

- **Live at** `https://ptowl.com`. Cloudflare-native end-to-end.
- **Frontend:** Cloudflare Workers Static Assets (`ptowl`).
- **API:** Hono on Cloudflare Workers (`ptowl-api`), `/api/v1/*`.
- **Data:** D1 (`ptowl-db`, 30-day PITR) + R2 (`LOGOS` bucket).
- **Auth:** Clerk on `clerk.ptowl.com` (production custom domain).
- **Edge hardening:** WAF managed ruleset + Bot Fight Mode + Rate
  Limiting on `/api/*` + Worker Errors notification + Web Analytics —
  all driven by `.github/workflows/cf-bootstrap.yml`.
- **Status page:** `status.ptowl.com` — **planned**, not live.
  Upptime recipe in [Status page](#status-page) section.
- **Rollback:** Workers `wrangler rollback` (~60s); CF Pages dashboard
  rollback (~30s); D1 Time Travel (~5min, 30-day window).
- **Open security findings:** 8 (4 MED, 4 LOW). All known-deferred.

---

## Production topology

```
                          Cloudflare global edge
                                  │
   ┌──────────────────────────────┼──────────────────────────────┐
   │                              │                              │
   ▼                              ▼                              ▼
ptowl (Static Assets)    ptowl-api (Hono Worker)         clerk.ptowl.com
  React SPA              /api/v1/*                        (Clerk prod)
  service.ptowl.com       │       │                        │
                          ▼       ▼                        ▼
                       D1 (PITR)  R2 LOGOS            accounts.ptowl.com
                       ptowl-db   bucket              clkmail.ptowl.com
                                                       (DKIM CNAMEs)
```

| Surface         | Resource             | Notes                                   |
| --------------- | -------------------- | --------------------------------------- |
| Apex            | `ptowl.com`          | Workers Static Assets, proxied (orange) |
| API             | `ptowl.com/api/v1/*` | Hono + Workers                          |
| Auth            | `clerk.ptowl.com`    | DNS-only (gray) — see Gotchas           |
| Auth UI         | `accounts.ptowl.com` | DNS-only (gray)                         |
| Email DKIM      | `clk*._domainkey…`   | DNS-only (gray)                         |
| Database        | D1 `ptowl-db`        | 30-day PITR                             |
| Object storage  | R2 `LOGOS`           | per-user prefix                         |
| Status (future) | `status.ptowl.com`   | Upptime CNAME → GitHub Pages            |

---

## Edge hardening (configured via cf-bootstrap.yml)

`.github/workflows/cf-bootstrap.yml` is a one-shot, idempotent
GitHub Actions workflow. Touch `.github/cf-bootstrap-trigger.txt`
and push to `main` to re-fire (or use `workflow_dispatch`).

### Required `CLOUDFLARE_API_TOKEN` scopes

| Scope                          | Why                              |
| ------------------------------ | -------------------------------- |
| Zone → WAF → Edit              | Managed ruleset + rate limiting  |
| Zone → Zone Settings → Edit    | Bot Fight Mode                   |
| Account → Notifications → Edit | Worker Errors policy             |
| Account → Web Analytics → Edit | RUM site                         |
| Zone → DNS → Edit              | Clerk CNAMEs (currently missing) |

### What the workflow configures

| Step                         | Result                                                 |
| ---------------------------- | ------------------------------------------------------ |
| Resolve zone id              | Looks up `ptowl.com` zone via API                      |
| WAF Free Managed Ruleset     | `execute` action on entry-point ruleset, `latest` ver  |
| Bot Fight Mode               | `fight_mode: true` on `/bot_management`                |
| Rate Limiting `/api/*`       | 100 req/min/IP, block 10 min, by `cf.colo.id + ip.src` |
| Worker Errors notification   | Email policy → `nurelimusabay@gmail.com`               |
| Web Analytics                | `auto_install: true` for `ptowl.com`                   |
| Clerk DNS records (5 CNAMEs) | DNS-only (gray) — see Gotchas                          |

### Re-fire procedure

```bash
# bump trigger file, commit, push to main — workflow runs
date -u +"%Y-%m-%dT%H:%M:%SZ" > .github/cf-bootstrap-trigger.txt
git add .github/cf-bootstrap-trigger.txt
git commit -m "ops: re-fire cf-bootstrap"
git push origin main
```

State (as of `b31fd29`): cf-bootstrap has been run successfully —
WAF, Bot Fight, Rate Limiting, Worker Errors notification, Web
Analytics confirmed live in dashboard.

### SSL/TLS hardening (verify, dashboard-only)

| Setting                       | Required value  |
| ----------------------------- | --------------- |
| SSL/TLS → Overview            | `Full (Strict)` |
| SSL/TLS → Edge → Always HTTPS | ON              |
| SSL/TLS → Edge → Min TLS      | `1.2` or higher |
| SSL/TLS → Edge → HSTS         | enabled         |

---

## Monitoring

### Health endpoint

```
GET https://ptowl.com/api/v1/health
→ { "ok": true, "data": { "status": "healthy", "db": { "connected": true } } }
```

### Cloudflare Health Checks (dashboard-configured)

| Field           | Value               |
| --------------- | ------------------- |
| Hostname        | `ptowl.com`         |
| Path            | `/api/v1/health`    |
| Method          | `GET`               |
| Expected status | `200`               |
| Body must match | `"ok":true`         |
| Frequency       | 60 sec              |
| Retries         | 2 (~3 min to alert) |
| Notification    | email               |

Path: dashboard → Account home → Notifications → Health Checks.

### Notifications

| Type                 | Target Worker / Project | Destination |
| -------------------- | ----------------------- | ----------- |
| Workers Errors       | `ptowl-api`             | email       |
| Pages Build Failures | `ptowl`                 | email       |
| D1 Errors            | `ptowl-db`              | email       |

### Web Analytics

Privacy-friendly, cookieless, edge-injected. View at Cloudflare →
Analytics & Logs → Web Analytics. Page views, LCP / INP / CLS, top
pages and referrers. No script tag in source.

### Workers Logpush → R2 (optional)

```
CF dashboard → R2 → Create bucket: ptowl-logs
CF dashboard → Workers → ptowl-api → Logs → Create Logpush job
  → Destination: R2 bucket ptowl-logs
  → Sample rate: 100%
```

Free at current volume; structured request logs for post-hoc debug.

---

## Status page

**Current state:** Not deployed. The footer "Status" link on
`ptowl.com` points at `status.ptowl.com` but the subdomain has no
DNS record yet. **Not on launch-blocker list.**

### Upptime recipe (when ready, ~10 min)

1. Use the template at `https://github.com/upptime/upptime` →
   create `Yami566/ptowl-status` (Public).
2. Edit `.upptimerc.yml`:
   ```yaml
   owner: Yami566
   repo: ptowl-status
   sites:
     - name: PTowl Web
       url: https://ptowl.com
     - name: PTowl API
       url: https://ptowl.com/api/v1/health
   status-website:
     cname: status.ptowl.com
   notifications:
     - type: email
       to: nurelimusabay@gmail.com
   ```
3. Repo Settings → Pages → Source: GitHub Actions.
4. CF DNS → ptowl.com zone → +Add CNAME `status` →
   `Yami566.github.io` → **Proxied** (orange — Pages tolerates this
   unlike Clerk).
5. Wait ~10 min. Public site at `status.ptowl.com`.

GitHub Actions cron runs every 5 min, hits the URL, generates static
status site. Free forever.

---

## Disaster recovery

### D1 (Cloudflare D1 PITR — 30-day window)

| Scenario                | Path                                               |
| ----------------------- | -------------------------------------------------- |
| Bad migration on remote | `wrangler d1 time-travel restore` to pre-migration |
| Accidental mass delete  | Same                                               |
| Investigate prior state | `--read-only` flag (no rollback)                   |

#### 1. Find a bookmark

```bash
# Most recent
wrangler d1 time-travel info ptowl-db

# By wall-clock
wrangler d1 time-travel info ptowl-db --timestamp=2026-04-25T14:00:00Z
```

#### 2. Inspect (no rollback)

```bash
wrangler d1 time-travel restore ptowl-db --bookmark=<bm> --read-only
```

#### 3. Rollback (destructive)

```bash
# Take a fresh export FIRST
wrangler d1 export ptowl-db --remote \
  --output=./backup-$(date +%Y%m%d-%H%M%S).sql

# Restore
wrangler d1 time-travel restore ptowl-db --bookmark=<bm>
```

The Worker keeps serving during restore; connections switch
seamlessly to the restored state.

### Workers (API) rollback

```bash
cd apps/api
wrangler deployments list
wrangler rollback                    # previous version, full traffic
# or
wrangler rollback <deployment-id>
```

Or dashboard: Workers & Pages → ptowl-api → Deployments → "..." →
"Promote to active".

### CF Pages (frontend) rollback

```
CF dashboard → Workers & Pages → ptowl → Deployments
→ pick last known-good → Rollback → confirm
```

Edge propagates in seconds.

### Workers gradual deploys (optional, for risky API changes)

```bash
cd apps/api
npx wrangler versions upload          # uploads, doesn't serve
npx wrangler versions deploy 25       # 25% of traffic
# observe metrics for 5 min
npx wrangler versions deploy 100      # full rollout
```

Default CI deploy uses `wrangler deploy` (instant 100%) — switch to
the gradual flow manually for major API changes.

### "Everything is broken" full revert

```bash
git revert <bad-commit-sha> --no-edit
git push origin main
```

Triggers a fresh deploy from the reverted state via `deploy.yml`.

### What's NOT covered

- **R2 logo objects** — versioning is ON but PITR-style restore is
  not available. Re-upload from user profile UI.
- **CF Pages content** — re-run deploy on `main` to redeploy any
  version.
- **Secrets/Bindings** — `wrangler secret list` / `wrangler secret put`
  to verify and re-set if rotated.

### Recovery time targets

| Scenario                      | RTO                            | RPO              |
| ----------------------------- | ------------------------------ | ---------------- |
| Worker bad deploy             | < 5 min (rollback)             | 0 (no data lost) |
| CF Pages bad deploy           | < 5 min (rollback)             | 0 (no data lost) |
| D1 corruption / bad migration | < 15 min (Time Travel restore) | up to 30 days    |
| R2 object loss                | depends on re-upload           | n/a              |

---

## Smoke test

Run after any non-trivial deploy or DR event. Ten minutes.

```bash
# 1. API health
curl -fsS https://ptowl.com/api/v1/health
# expect: {"ok":true,"data":{"status":"healthy","db":{"connected":true,...}}}

# 2. Apex + Clerk widget
# Visit https://ptowl.com → polished landing + city scene + PTOWL
# wordmark + Clerk sign-in widget loads (no yellow error bar)

# 3. Sign in
# Email/password OR Continue with Google → /dashboard

# 4. Create a schedule via preset (5 keypresses)

# 5. Print preview shows clinic info + alias

# 6. Share → Send to patient
# /p/<token> URL minted + clipboard / share-sheet

# 7. Visit /p/<token> on phone
# Mobile-first patient page; "Add to my calendar" works

# 8. 404
# Hit /nonexistent → owl 404 with [Home] + [Back to Dashboard]

# 9. Devtools console
# No red errors

# 10. Force a 500 (unauth /api/v1/me) → CF Worker Errors email
# arrives within 5 min
```

---

## Breakage table

| Symptom                                  | First check                                                          |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `ptowl.com` 5xx                          | CF dashboard → Workers → ptowl-api → Logs (real-time tail)           |
| Sign-in fails / Clerk widget hangs       | Clerk dashboard → Sessions; verify allowed domains include ptowl.com |
| Clerk CSP block in console               | CSP allowlist must include `clerk.ptowl.com` + `accounts.ptowl.com`  |
| Build fails on push                      | GitHub Actions → click failed run → expand step                      |
| Slow API responses                       | Workers Analytics → CPU time / errors                                |
| User reports missing schedule            | D1 Console → query `schedules` for their alias                       |
| `/p/:token` says "not found"             | `wrangler d1 execute` → check `share_token` row                      |
| Need to rollback bad API deploy          | `wrangler rollback` from `apps/api/`                                 |
| Need to rollback frontend                | CF Pages dashboard → Deployments → previous → Promote                |
| Reminder cron silent                     | Check `meta.changes` from claim UPDATE; verify cron schedule         |
| Subdomain (clerk/accounts) not resolving | DNS record likely orange (proxied) — must be gray (DNS-only)         |
| `cf-bootstrap` workflow ran but no DNS   | Token missing `Zone:DNS:Edit` — see Gotchas                          |
| 100 req/min limit triggered legitimately | Adjust rate-limiting rule via dashboard or token-edit + re-fire      |

---

## Security findings — open

> Reference: [`RED-TEAM-FINDINGS.md`](./RED-TEAM-FINDINGS.md) (April
> 25, 2026 adversarial pass). All four critical/high findings landed
> on `main` in commit `6515ed5`. Eight findings remain open and
> known-deferred.

### Closed (1-line summary)

| Finding                                                 | Sev  | Status                                                                   |
| ------------------------------------------------------- | ---- | ------------------------------------------------------------------------ |
| Inline `<script>` in unsubscribe page blocked by CSP    | CRIT | **Fixed** in `6515ed5` (rewrote as `<form method="post">` with no JS).   |
| Reminder UPDATE rowcount not checked → race-double-send | CRIT | **Fixed** in `6515ed5` (`meta.changes` guard).                           |
| Reminder cron window too tight (7.5 min)                | HIGH | **Fixed** in `6515ed5` (15-min half-window, 30-min full).                |
| Wizard email field error not associated via ARIA        | HIGH | **Fixed** in `6515ed5` (`aria-describedby` toggles, `aria-invalid` set). |

### Open

#### MED-1 · Brittle static-analysis test patterns

- **Severity:** MED
- **Status:** Process note (assertions migrated to regex).
- **Fix path:** Continue migrating exact-string source-grep tests to
  runtime integration tests (e.g. `csrf-origin.test.ts` style boots a
  real Hono app and asserts behavior). Static-analysis tests are
  fragile to prettier reformats; runtime is not.

#### MED-2 · MailChannels DLQ has no consumer

- **Severity:** MED
- **Status:** Deferred. `wrangler.jsonc` declares
  `dead_letter_queue: ptowl-reminders-dlq` but no Worker pulls from it.
- **Fix path:** Either drop the DLQ binding until we have a place to
  drain it, or split the API Worker into producer + consumer Workers.
  Simplest: a small follow-up Worker with one queue handler that
  posts DLQ messages to email/Slack.

#### MED-3 · Schedule deletion leaves R2 logo objects

- **Severity:** MED
- **Status:** Deferred. `profiles` row cascade-deletes; `LOGOS` R2
  objects do not. No security impact (key embeds random user id; not
  publicly listable). Minor data residue.
- **Fix path:** Add to GDPR-required account-deletion endpoint —
  `LOGOS.list({ prefix: 'logos/' + userId })` then bulk-delete. Cite
  in privacy policy "Your Rights & Data Deletion" section.

#### MED-4 · Subprocessor list hard-coded JSX

- **Severity:** MED
- **Status:** Deferred. Privacy section 7 says the page is the source
  of truth; code commit required to update.
- **Fix path:** Move list to `docs/subprocessors.json`. Static-import
  in the React page AND expose via `GET /api/v1/subprocessors`. One
  source, machine-readable for any future automated DPA fetch.

#### LOW-1 · No "send a test reminder" button

- **Severity:** LOW
- **Status:** Deferred. UX nice-to-have.
- **Fix path:** `POST /api/v1/schedules/:id/test-reminder` that
  bypasses the cron path. Throttle 1/min/user.

#### LOW-2 · No bulk patient-email import

- **Severity:** LOW
- **Status:** Deferred.
- **Fix path:** CSV import on `SchedulePage` list view: `(initials,
email)` rows → existing `PUT /:id/reminders`. Rate-limit ~5 rows/sec
  for MailChannels burst safety.

#### LOW-3 · No reminder open/click/bounce analytics

- **Severity:** LOW
- **Status:** Deferred.
- **Fix path:** Wire MailChannels webhook to
  `POST /api/v1/webhooks/email/{open,click,bounce}`. On bounce, hash
  email and set `email_subscriptions.unsubscribed = 1`. Open/click →
  Workers Analytics Engine dataset.

#### LOW-4 · Daily-digest cron not implemented

- **Severity:** LOW
- **Status:** Deferred — **mitigated for v1** by hiding the
  digest-mode toggle in the UI. Tracked in `PRD.md` Phase 9 (Email +
  Reminders).
- **Fix path:** Schema/queue/unsubscribe-toggle for `digest_mode` are
  wired; `processReminderMessage` ack's digest messages without
  sending. Add a separate scheduled handler at 12:00 UTC unconditionally
  (acceptable v1 — different local hours per timezone) or a per-tz
  7am-window kicker.

### Disposition summary

| Severity  | Closed | Open  |
| --------- | ------ | ----- |
| CRIT      | 2      | 0     |
| HIGH      | 2      | 0     |
| MED       | 0      | 4     |
| LOW       | 0      | 4     |
| **Total** | **4**  | **8** |

---

## Engineering-process notes

Distilled from the March 22 [`SECURITY-UX-AUDIT.md`](./SECURITY-UX-AUDIT.md)
(snapshot of pre-Clerk, pre-removal-of-admin tree). Most of that doc
describes state that no longer exists. The residual process
guidance still applies:

- **Color contrast methodology.** Audit body text against WCAG AA
  (4.5:1 normal text). Owl-themed grays must clear that bar before
  they ship.
- **Touch targets.** Apple guideline: minimum 44×44 px. Apply
  `min-height: 44px` to interactive elements on mobile.
- **CSP / HSTS / X-Frame-Options approach.** Strict, no `unsafe-inline`
  on scriptSrc, no nonce machinery. Any new HTML-rendering route
  designs for that constraint from line one (CRIT-1 was a violation).
  CI greps for inline `<script>` under `apps/api/src/routes/**` would
  catch regressions.
- **Cookie SameSite consistency.** All production cookies use
  `Strict`. Audit any new cookie before merge.
- **Audit-log retention.** 90-day rolling window via cron. HIPAA's
  6-year ask is not in scope at our current tier — when we revisit,
  archive to R2 cold-storage rather than blow up D1.
- **Static-analysis tests are fragile.** Prefer regex assertions or
  full integration tests (boot Hono in-memory and assert behavior).

What of the original audit's specifics is **stale** and should not
be cited:

- Firebase Auth + FirebaseUI bundle bloat (Clerk replaced it; ~400KB
  Firebase SDK chunk gone).
- HIPAA BAA tables citing Firebase phone auth + OneSignal (both gone).
- The `sessions` table being unused (cleared with admin-removal pass).
- The 505-test count.

---

## Vuln reporting

External vulnerability reports go through the disclosure path
documented in the repo root [`SECURITY.md`](../SECURITY.md). Do not
paste reports into issues / PRs / Discussions. Internal findings live
in [`RED-TEAM-FINDINGS.md`](./RED-TEAM-FINDINGS.md).

---

## Subprocessor compliance

Source of truth is the `/privacy` page on `ptowl.com` (Section 7).
Mirrored here for ops convenience.

| Subprocessor       | Purpose                      | Region | DPA                   |
| ------------------ | ---------------------------- | ------ | --------------------- |
| Cloudflare, Inc.   | Workers, D1, R2, DNS, WAF    | Global | Yes (standard CF DPA) |
| Clerk, Inc.        | Authentication               | US     | Yes (Clerk DPA)       |
| MailChannels Corp. | Transactional email delivery | Global | Standard ToS          |
| GitHub, Inc.       | Source hosting + Actions CI  | US     | Yes (Microsoft DPA)   |

PTowl is **AGPL-3.0** — license is NOT advertised on user-facing
surfaces; lives only in `LICENSE` and repo metadata. Subprocessor
list rarely changes; updating today still requires a code commit
(see MED-4 fix path).

---

## Common gotchas

### CSP allowlist must include Clerk production domains

`scriptSrc` / `connectSrc` / `frameSrc` in
`apps/api/src/index.ts` must list `clerk.ptowl.com` and
`accounts.ptowl.com`. Missing entries → silent widget hang on
`/sign-in`. Fixed in `b4ba943`.

### Clerk CNAME rows MUST be DNS-only (gray cloud)

All five Clerk records — `clerk`, `accounts`, `clkmail`,
`clk._domainkey`, `clk2._domainkey` — must be `proxied: false`. The
Clerk verifier reads the underlying CNAME target; a proxied (orange)
record returns Cloudflare's edge IP and verification fails forever.
The `cf-bootstrap.yml` workflow sets `proxied: false` on every record.

### `CLOUDFLARE_API_TOKEN` lacks `Zone:DNS:Edit` (silent failure)

If the token does not include `Zone → DNS → Edit`, the cf-bootstrap
DNS step fails per-record but the overall workflow returns success
(`curl -s` without `-f`, parsed for "identical record already exists"
fallthrough). Symptom: workflow goes green, no DNS records appear.
**Fix:** edit the existing token (do NOT rotate — rotation breaks
the deploy workflow), add `Zone → DNS → Edit`, touch trigger file,
push, re-fire.

### commitlint rejects multi-type prefixes

Conventional Commits config in this repo accepts a single type only.
`feat+fix:`, `feat,docs:`, etc. are rejected by the commit-msg hook.
Use the dominant type and mention secondary changes in the body, or
split into two commits.

### Pushes to `main` require explicit force-of-will

This is a deliberate operational hygiene rule, not a tooling block:
no auto-push from agents. The user pushes to `main`. Branch
protection on `main` requires CI green + linear history.

---

## Founder mechanical tasks

These are tasks the operator (founder) must do by hand. Tracked here
for accountability; the actual launch-day choreography lives in
[`SHIP.md`](./SHIP.md).

| Task                                              | Status               | Notes                                                                               |
| ------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| `cf-bootstrap.yml` initial run                    | **Done** (`b31fd29`) | WAF + Bot Fight + Rate Limit + Worker Errors + Web Analytics confirmed in dashboard |
| Phase C — Google OAuth in Clerk (cosmetic polish) | Open (cosmetic)      | Replace dev-instance branding on consent screen                                     |
| Launch-day screencast                             | See `SHIP.md`        | 60-90s product walkthrough                                                          |
| Launch-day execution checklist                    | See `SHIP.md`        | HN, ProductHunt, X, etc.                                                            |
| Outreach (paying users / pilots)                  | See `SHIP.md`        | Founder-driven, not automatable                                                     |

---

## Cross-references

| Doc                          | Question it answers                                        |
| ---------------------------- | ---------------------------------------------------------- |
| [`./VISION.md`](./VISION.md) | Why PTowl exists. Who it's for. What we're not.            |
| [`./BUILD.md`](./BUILD.md)   | How the codebase is shaped. Tech choices. Local dev.       |
| [`./SHIP.md`](./SHIP.md)     | How a release goes out. Launch-day plan. Outreach.         |
| `./RUN.md` (this file)       | What to do once it's live. Edge, monitoring, DR, security. |
