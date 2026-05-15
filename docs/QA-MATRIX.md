# PTOwl QA Matrix

> Per-route test plan + dependency compliance check + automation gap log.
> Produced during the QA sprint of 2026-05-15 from three parallel audits
> (dependency, page-by-page, automation). Living document — update after
> each shipped PR.
>
> Companion to:
>
> - [AUTH-LIFECYCLE.md](AUTH-LIFECYCLE.md) — the full design + roadmap
> - [../MASTER.md](../MASTER.md) — operational state + secrets + resume playbook
> - [ADMIN-CHEATSHEET.md](ADMIN-CHEATSHEET.md) — SQL recipes for admin actions

---

## 1. How to use this doc

Before any PR merges or any production click-op, run the relevant section's test list. Tick the boxes. If any test fails, the PR isn't done yet.

The three sections are independent:

| Section                           | When to use it                                    | How long                    |
| --------------------------------- | ------------------------------------------------- | --------------------------- |
| §3 — Route-by-route critical path | Before any PR that touches `apps/web/src/pages/*` | ~10 min for affected routes |
| §4 — 5-persona checklist          | Before any PR with a visible UI change            | ~15 min                     |
| §5 — Production health check      | Monthly OR after any deploy that looks risky      | ~3 min                      |

---

## 2. Dependency compliance — off-the-shelf audit

Audit run 2026-05-15. **Zero 🔴 findings.** All bespoke crypto uses standard SubtleCrypto APIs or `jose`. All auth is Clerk-delegated. Rate-limiting moved from custom to CF WAF in a prior cleanup.

### apps/web/package.json

| Module                | Tier        | Used in                                | Notes                        |
| --------------------- | ----------- | -------------------------------------- | ---------------------------- |
| `@clerk/clerk-react`  | 🟢 Clerk    | `contexts/AuthContext.tsx`, `main.tsx` | useAuth, useClerk hooks      |
| `react`, `react-dom`  | 🟡 Standard | ubiquitous                             | React 19 + standard hooks    |
| `react-router-dom`    | 🟡 Standard | `App.tsx`, pages                       | Standard routing             |
| `@fullcalendar/react` | 🟡 Standard | `ScheduleEditor.tsx`                   | Off-the-shelf calendar UI    |
| `sonner`              | 🟡 Standard | ubiquitous                             | Toast notifications          |
| `qrcode.react`        | 🟡 Standard | `PatientSchedulePage.tsx`              | QR render — no custom crypto |
| `canvas-confetti`     | 🟡 Standard | `DashboardPage.tsx`                    | Celebratory animation        |

### apps/api/package.json

| Module                      | Tier          | Used in                                 | Notes                     |
| --------------------------- | ------------- | --------------------------------------- | ------------------------- |
| `hono`                      | 🟢 Cloudflare | `index.ts`                              | CF Worker web framework   |
| `jose`                      | 🟢 Clerk-tier | `crypto/jwt.ts`, `auth/clerk-verify.ts` | Industry-standard JWT lib |
| `ical-generator`            | 🟡 Standard   | `services/reminders.ts`                 | RFC 5545                  |
| `@cloudflare/workers-types` | 🟢 Cloudflare | types                                   | D1/R2/Workers env types   |
| `wrangler`                  | 🟢 Cloudflare | CLI                                     | Deploy + local dev        |
| `@hono/zod-validator`       | 🟡 Standard   | routes                                  | Schema validation         |

### Borderline cases (🟡 with rationale)

| File                          | Pattern                        | Why it's not 🔴                                                                                                              |
| ----------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `crypto/password.ts`          | PBKDF2-SHA256 via SubtleCrypto | Standard WebCrypto. 100k iterations is OWASP-compliant. Legacy-only — new Clerk users skip this.                             |
| `crypto/email-cipher.ts`      | AES-GCM via SubtleCrypto       | Standard WebCrypto. Encrypts patient email at rest in D1 (privacy by design). IV + ciphertext concatenated, no bespoke mode. |
| `crypto/unsubscribe-token.ts` | HMAC-SHA256 via SubtleCrypto   | Standard WebCrypto. Constant-time compare. One-time-use pattern.                                                             |

**Conclusion: COMPLIANT.** No code violates the AUTH-LIFECYCLE.md §2 off-the-shelf rule.

---

## 3. Route-by-route test matrix

Every live `<Route>` in [apps/web/src/App.tsx](../apps/web/src/App.tsx) plus the planned routes. Each row has the one user action that proves the page works, plus the a11y posture check.

### Public routes (no auth required)

| URL                  | Component                 | Critical-path test                                                | Loading      | Error/404                 | Landmark  | Status                         |
| -------------------- | ------------------------- | ----------------------------------------------------------------- | ------------ | ------------------------- | --------- | ------------------------------ |
| `/`                  | `LandingPage.tsx`         | Click "Log In" → goes to `/accounts/signin`                       | ✅           | n/a                       | ✅        | Live ✅                        |
| `/accounts/signin/*` | `SignInPage.tsx`          | Fill email + password → reach `/dashboard`                        | ✅ Clerk SDK | ✅ Fallback link (PR #66) | ✅ PR #69 | Live, PR #60 rebuild in flight |
| `/accounts/signup/*` | `SignUpPage.tsx`          | Fill form → land on dashboard (or `/awaiting-approval` post PR B) | ✅           | ✅ Fallback link          | ✅ PR #69 | Live                           |
| `/p/:token`          | `PatientSchedulePage.tsx` | Open the link → "Add to Google Calendar" subscribes               | ✅ skeleton  | ✅ "Schedule not found"   | ✅ PR #69 | Live                           |
| `/about`             | `AboutPage.tsx`           | Scroll → see feature cards, FAQ, pricing                          | ✅ lazy      | n/a                       | ✅        | Live                           |
| `/privacy`           | `PrivacyPolicyPage.tsx`   | Scroll → render                                                   | ✅ lazy      | n/a                       | ✅        | Live                           |
| `/terms`             | `TermsOfServicePage.tsx`  | Scroll → render                                                   | ✅ lazy      | n/a                       | ✅        | Live                           |
| `/security`          | `SecurityPage.tsx`        | Scroll → render                                                   | ✅ lazy      | n/a                       | ✅        | Live                           |
| `/*`                 | `NotFoundPage.tsx`        | Visit any bad URL → 404 card                                      | n/a          | ✅                        | ✅        | Live                           |

### Clinic-protected routes (auth required)

| URL                    | Component                | Critical-path test                                    | Loading | Error                                   | Landmark | Status |
| ---------------------- | ------------------------ | ----------------------------------------------------- | ------- | --------------------------------------- | -------- | ------ |
| `/dashboard`           | `DashboardPage.tsx`      | Press `2` → type initials → Enter → preview opens     | ✅      | ✅ empty-state                          | ✅       | Live   |
| `/dashboard`           | same                     | Drag-reorder a saved schedule                         | n/a     | ✅ rolls back on failure                | n/a      | Live   |
| `/schedule/:id`        | `SchedulePage.tsx`       | Click "Print" → browser dialog opens                  | ✅      | ✅ "not found" card with retry (PR #62) | ✅       | Live   |
| `/schedule/:id`        | same                     | Click "Share" → token URL copied to clipboard         | n/a     | ✅ toast on failure                     | n/a      | Live   |
| `/customize/templates` | `TemplateEditorPage.tsx` | Edit hotkey → save → appears in dashboard             | ✅ lazy | ✅ toast                                | ✅       | Live   |
| `/customize/print`     | `PrintSettingsPage.tsx`  | Toggle language → preview reflects                    | ✅ lazy | ✅                                      | ✅       | Live   |
| `/profile`             | `ProfilePage.tsx`        | Update clinic name → save → reflected in print header | ✅ lazy | ✅ toast on bad input                   | ✅       | Live   |

### Planned routes — not yet wired

| URL                                | Stage (AUTH-LIFECYCLE §4)      | Blocking PR | Critical-path when ready                                           |
| ---------------------------------- | ------------------------------ | ----------- | ------------------------------------------------------------------ |
| `/login` (new)                     | H, replaces `/accounts/signin` | PR #60      | Same as current signin                                             |
| `/signup` (new)                    | D, replaces `/accounts/signup` | PR #60      | Same as current signup                                             |
| `/awaiting-approval`               | F                              | PR B        | New signup lands here; "Check status" button re-fetches `/auth/me` |
| `/admin/decide?token=…&decision=…` | G                              | PR B        | Founder magic-link → page confirms approve/deny                    |
| `/welcome/practice-type`           | I.1                            | PR G        | Dropdown → submit seeds templates                                  |
| `/welcome`                         | I                              | PR G        | Clinic name + tz + phone → dashboard                               |
| `/signup/picker`                   | C2                             | PR D        | "I'm a clinic" vs "I'm a patient"                                  |
| `/signup/patient`                  | D2                             | PR D        | Patient self-signup                                                |
| `/patient/dashboard`               | J.2                            | PR E        | Patient sees schedules across clinics                              |
| `/displaced`                       | L                              | Phase 4     | Single-device kick page                                            |
| `/forgot-password` + 2 sub-screens | M-N                            | Phase 4     | Email code reset flow                                              |

---

## 4. 5-persona checklist

Every PR with a visible UI change runs through this. From [AUTH-LIFECYCLE.md §7](AUTH-LIFECYCLE.md#7-patient-portal-scope-expansion).

| #   | Persona                      | Browser / setup                                             | Test                                                                                         |
| --- | ---------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Adult patient (baseline)     | Chrome desktop normal                                       | The critical-path test for the changed route                                                 |
| 2   | Pediatric flow               | Chrome desktop, parent's session                            | Deferred to Phase 6 — note as "not yet testable"                                             |
| 3   | Geriatric / low-vision       | Chrome desktop, browser zoom 150%, `prefers-contrast: more` | Layout doesn't break; text reflows; targets still tappable                                   |
| 4   | Motor-impaired keyboard-only | Tab + Enter + Space only, no mouse                          | Every interactive element reachable; focus visible; no traps                                 |
| 5   | Visually impaired            | macOS VoiceOver on Safari (or NVDA on Chrome)               | Reads heading hierarchy in order; aria-labels read for icons; doesn't echo decorative emojis |

A PR with a UI change is incomplete until at least personas 1, 3, 4, 5 are verified. Persona 2 is the only one explicitly deferred.

---

## 5. Production health check (monthly)

Run this after any deploy that touches schemas, services, or auth; otherwise the [smoke-monthly-health.yml](../.github/workflows/smoke-monthly-health.yml) workflow runs it on cron.

| #   | Endpoint                                                          | Expected                                            |
| --- | ----------------------------------------------------------------- | --------------------------------------------------- |
| 1   | `GET https://ptowl.com/`                                          | 200 + HTML containing `PTOwl`                       |
| 2   | `GET https://ptowl.com/accounts/signin` (or `/login` post PR #60) | 200                                                 |
| 3   | `GET https://ptowl.com/api/v1/health`                             | 200 + `{"ok": true, "data": {"status": "healthy"}}` |
| 4   | `GET https://ptowl.com/sitemap.xml`                               | 200                                                 |
| 5   | `GET https://ptowl.com/robots.txt`                                | 200                                                 |
| 6   | `GET https://ptowl.com/favicon.svg`                               | 200                                                 |
| 7   | `GET https://ptowl.com/site.webmanifest`                          | 200                                                 |
| 8   | `GET https://ptowl.com/og-image.png`                              | 200                                                 |

If any return non-200, check:

1. CF dashboard → Workers & Pages → `ptowl-api` → Deployments → recent failures
2. CF dashboard → Workers & Pages → `ptowl` (frontend) → Deployments
3. status.clerk.com — if their outage, expect auth surface to be affected
4. The [smoke-clerk-urls.yml](../.github/workflows/smoke-clerk-urls.yml) workflow run history

---

## 6. Automation gap log

Audit from 2026-05-15. Ranked by where the work belongs.

### Already automated (no action needed)

- [x] CF API token D1 scope check (deploy.yml, PR #68)
- [x] Clerk URL drift smoke test (smoke-clerk-urls.yml, PR #61)
- [x] CF Web Analytics token injection (launch-finalize.yml)
- [x] D1 migrations on every deploy (deploy.yml)
- [x] Workers + Frontend deploys on push to main (deploy.yml)
- [x] Dependabot lockfile auto-merge (lockfile-update.yml)
- [x] Monthly production health check (PR #70)

### Shipping this sprint

- [x] Monthly production health check workflow — this PR
- [x] QA matrix doc — this PR
- [ ] Email rotation health endpoint (PR #71)

### Queue for next sprints

| #   | Manual step                 | Automation                                                   | Effort                    |
| --- | --------------------------- | ------------------------------------------------------------ | ------------------------- |
| 1   | Approve new clinic signups  | Deploy magic-link `/admin/decide` endpoint                   | Medium (PR B)             |
| 2   | D1 daily snapshot           | Scheduled GitHub Action that runs `wrangler d1 export` to R2 | Low (~15 min)             |
| 3   | DKIM record validation      | Add MailChannels DKIM check to launch-finalize.yml           | Low (~30 min)             |
| 4   | Status page deployment      | Fork Upptime → CNAME `status.ptowl.com` → wire 3 endpoints   | Medium (~15 min one-time) |
| 5   | Cron failure alerts         | CF dashboard → Notifications → Workers Errors → email        | Trivial user-side click   |
| 6   | User ban/disable endpoint   | `POST /api/v1/internal/admin/users/:id/disable`              | Low (~15 min)             |
| 7   | Turnstile rotation API call | Add to launch-finalize.yml                                   | Low                       |

### Intentionally manual (do not automate)

- D1 Time Travel restore — human judgment required on restore point
- Worker rollback decision — depends on which version to revert to
- CF Pages rollback — same
- JWT_SECRET rotation — invalidates in-flight unsubscribe links; needs grace-window planning

---

## 7. Sprint shipping log

Track PRs against the audit so the next sprint can pick up where we left off.

### QA sprint of 2026-05-15

| PR  | Summary                                                        | Closes audit item |
| --- | -------------------------------------------------------------- | ----------------- |
| #69 | Landmark id on SignIn / SignUp / PatientSchedule (3 instances) | A11y critical 1   |
| #70 | This QA matrix + monthly health check workflow                 | Automation #17    |
| #71 | Email rotation health endpoint                                 | Automation #2     |

### Previous session of 2026-05-15

| PR  | Summary                                                             | Closes audit item |
| --- | ------------------------------------------------------------------- | ----------------- |
| #61 | Clerk URL drift smoke test + `.env.example` + observability runbook | O1, O6            |
| #62 | Schedule page error state + status glyphs                           | U2, U6            |
| #63 | Landmark wrappers on Landing + About                                | U10 (partial)     |
| #64 | Decorative emoji aria-hidden on Patient + About                     | U3                |
| #65 | Mobile 44px touch targets                                           | U8                |
| #66 | Broken-browser escape hatch on signin/signup                        | Auth fallback     |
| #67 | Auth lifecycle plan archived to docs/                               | Plan archive      |
| #68 | Pre-deploy D1 token scope check                                     | O2                |

---

## 8. The five load-bearing invariants

Recapped here so they're visible alongside the audit. Break any one and the product slips.

1. **No new code outside the off-the-shelf tier** (AUTH-LIFECYCLE §2). Audit confirmed zero 🔴 findings as of 2026-05-15.
2. **Five email templates, no more** (AUTH-LIFECYCLE §5). All inbox respect.
3. **Clinic-local time is canonical, patient view converts** (AUTH-LIFECYCLE §6).
4. **No PHI stored.** Patient portal is a viewer, never a clinical repository.
5. **ADA-first design.** Every PR runs §4 above.

If any future PR violates one of these without an explicit user-locked decision, revert and re-discuss.
