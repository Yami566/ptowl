# PTowl — Master Context

> Single source of operational truth for `ptowl.com`. Optimized so any
> future AI assistant (Claude, Copilot, Cursor) can read this file +
> [docs/VISION.md](docs/VISION.md) and be productive in one prompt.
>
> Defers to:
>
> - [docs/VISION.md](docs/VISION.md) — what & for whom (positioning, audience, locked decisions, pricing).
> - [docs/BUILD.md](docs/BUILD.md) — how the code is laid out.
> - [docs/OPERATING.md](docs/OPERATING.md) — dev posture, working agreements.
> - [docs/SHIP.md](docs/SHIP.md) — launch ritual + screencast script.
> - [docs/RUN.md](docs/RUN.md) — ops runbook (incidents, rollback, backups).
>
> This file is the **launch + ops + status** layer that sits on top of those.

---

## TL;DR

PTowl is a Cloudflare-managed scheduling tool for therapy clinics, live
at `https://ptowl.com`. Stack: React 19 + Vite frontend, Hono on
Cloudflare Workers API, D1 database, R2 logo storage, Clerk auth,
MailChannels for outbound email. CI/CD via GitHub Actions on push to
`main`. No custom infrastructure — every moving part is an off-the-shelf
managed service.

The product is intentionally minimal ("Craigslist of clinic scheduling")
and intentionally not HIPAA-claiming (sports-alias privacy instead).
See [docs/VISION.md](docs/VISION.md) for why.

---

## Stack

| Layer            | Choice                                                        | Why                                                   |
| ---------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| DNS + WAF + CDN  | Cloudflare                                                    | One pane of glass, edge-fast, cheap.                  |
| Frontend hosting | Cloudflare Workers Static Assets (primary) + Pages (fallback) | Same network as the API; no third-party hop.          |
| API runtime      | Cloudflare Workers (Hono)                                     | Same edge; no cold starts; per-request pricing.       |
| Database         | Cloudflare D1                                                 | SQLite on the edge; 7-day Time Travel free.           |
| Object storage   | Cloudflare R2                                                 | S3-compatible; no egress fees.                        |
| AI inference     | Workers AI (`@cf/meta/llama-3.1-8b-instruct`)                 | For clinic-timezone inference from address.           |
| Auth             | Clerk (`clerk.ptowl.com` custom domain)                       | Drop-in, MFA + Google OAuth; JWKS-based verify.       |
| Outbound email   | MailChannels (`relay.mailchannels.net`)                       | Free-tier for Cloudflare Workers; transactional only. |
| Calendar export  | `ical-generator` package                                      | RFC-5545 .ics out of the box.                         |
| Bot protection   | Cloudflare Turnstile                                          | Captcha for auth-sensitive endpoints.                 |
| CI/CD            | GitHub Actions                                                | Lockfile-driven, deploy on push to `main`.            |
| Analytics        | Cloudflare Web Analytics                                      | First-party, privacy-friendly, no cookie banner.      |

Locked decisions about the stack live in [docs/VISION.md](docs/VISION.md#locked-decisions-do-not-relitigate).
Do not relitigate them here.

---

## Service map (where each piece is configured)

| Service                         | Config location                                                  | Owner action when changing                           |
| ------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| Cloudflare Workers (API)        | [apps/api/wrangler.jsonc](apps/api/wrangler.jsonc)               | Wrangler deploy via GH Actions.                      |
| Cloudflare Workers (web assets) | [apps/web/wrangler.jsonc](apps/web/wrangler.jsonc)               | Same.                                                |
| D1 schema                       | [apps/api/src/migrations/](apps/api/src/migrations/)             | `wrangler d1 migrations apply` (auto in deploy.yml). |
| R2 buckets                      | Cloudflare dashboard → R2 → `ptowl-logos`, `ptowl-logos-staging` | Manual create with `wrangler r2 bucket create`.      |
| DNS for `ptowl.com`             | Cloudflare dashboard → DNS                                       | Manual via dashboard.                                |
| Clerk auth                      | Clerk dashboard                                                  | URLs, providers, custom domain.                      |
| MailChannels                    | MailChannels console                                             | API key + DNS for `ptowl.com`.                       |
| GitHub Actions                  | [.github/workflows/](.github/workflows/)                         | Edit in repo; secrets in GH repo settings.           |
| CSP / security headers          | [apps/web/public/\_headers](apps/web/public/_headers)            | Edit + redeploy.                                     |
| WAF + rate limits               | Cloudflare dashboard → Security                                  | Manual via dashboard.                                |

---

## Secrets inventory

All secrets are managed via Cloudflare Worker secrets (`wrangler secret put NAME`)
unless noted. None should ever appear in committed files.

| Secret                  | Used by                                   | How to rotate                                                                                                                                             | Notes                                                         |
| ----------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `JWT_SECRET`            | API — signs internal unsubscribe tokens   | `wrangler secret put JWT_SECRET --env production`. 64-char hex.                                                                                           | Rotating invalidates any in-flight unsubscribe links.         |
| `ADMIN_EMAIL`           | API — destination for admin notifications | `wrangler secret put ADMIN_EMAIL --env production`.                                                                                                       | Plain email address.                                          |
| `EMAIL_API_KEY`         | API — MailChannels send                   | Generate new key in MailChannels console → `wrangler secret put EMAIL_API_KEY --env production` → revoke old.                                             | Cron silently no-ops if missing — safe default.               |
| `EMAIL_ENCRYPTION_KEY`  | API — AES-GCM for patient emails in D1    | One-time generate (32 bytes base64) → `wrangler secret put EMAIL_ENCRYPTION_KEY --env production`. **Do not rotate** without re-encrypting existing rows. | Loss = unreadable patient emails. Worth a personal backup.    |
| `TURNSTILE_SECRET_KEY`  | API — verifies Turnstile challenges       | Regenerate in CF dashboard → Turnstile → `wrangler secret put TURNSTILE_SECRET_KEY --env production`.                                                     | Public site key is in frontend; this is the server-side.      |
| `CLOUDFLARE_API_TOKEN`  | GitHub Actions deploy                     | CF dashboard → My Profile → API Tokens → recreate → GH repo settings → Secrets.                                                                           | Scope: Workers Edit + D1 Edit + R2 Edit on the ptowl account. |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions deploy                     | CF dashboard → right sidebar → Account ID → GH repo settings.                                                                                             | Not secret, but kept out of the workflow file for clarity.    |
| `CLERK_SECRET_KEY`      | GitHub Actions — launch-finalize workflow | Clerk dashboard → API keys → Secret keys → Regenerate → GH repo settings → Secrets.                                                                       | Used by `scripts/finalize-launch.mjs` to PATCH Clerk paths.   |

There is no Stripe / LemonSqueezy secret yet because paid tiers are
gated past 50 active clinics (see VISION.md).

---

## Environment variables (non-secret)

Set in [apps/api/wrangler.jsonc](apps/api/wrangler.jsonc) under `vars`:

- `ENVIRONMENT` — `production` or `staging`.
- `FRONTEND_URL` — `https://ptowl.com` (canonical origin used for CORS + CSRF).
- `FRONTEND_URLS` — optional comma-separated allowlist for multi-domain mirror.
- `CLERK_FRONTEND_API_URL` — `https://clerk.ptowl.com` (JWKS issuer; do NOT
  conflate with the sign-in form location, which lives at
  `https://ptowl.com/accounts/sign-in` after the launch-PR ships).

---

## Launch playbook

These are the actions to run end-to-end for a fresh production launch
or for re-validating after a major change. Most are user-side dashboard
tasks; code-side gates are enforced by CI.

### 1. Prerequisites

- Cloudflare account on the Free plan is enough (Workers Paid only
  required if you re-enable the dormant `EMAIL_QUEUE` path — current
  cron-direct path doesn't need it).
- Clerk production instance with custom domain `clerk.ptowl.com`
  configured (CNAME → Clerk's nameserver).
- MailChannels account with `noreply@ptowl.com` accepted as a sender.
- GitHub repo secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` set.

### 2. DNS

Cloudflare DNS for `ptowl.com`:

- `A`/`AAAA` for apex → CF proxied (orange cloud).
- `CNAME` `clerk` → `frontend-api.clerk.services` (Clerk-issued, see
  Clerk dashboard).
- `TXT` `@` includes `v=spf1 include:relay.mailchannels.net ~all`.
- `TXT` `mailchannels._domainkey` → DKIM public key from MailChannels.
- `TXT` `_mailchannels` → `v=mc1 cfid=<account-id>.workers.dev` (Domain Lockdown).

### 3. Clerk Account Portal paths

The sign-in form lives at `ptowl.com/accounts/sign-in` (and sign-up at
`/accounts/sign-up`) via embedded `<SignIn>` / `<SignUp>` components —
see [apps/web/src/pages/SignInPage.tsx](apps/web/src/pages/SignInPage.tsx).
The Clerk Backend needs to know that's where the form lives so its
redirects don't bounce visitors off-domain.

Three places have to agree:

| Where                     | What                                                                                                     | How                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `apps/web/src/main.tsx`   | `ClerkProvider` props `signInUrl`, `signUpUrl`, `signInFallbackRedirectUrl`, `signUpFallbackRedirectUrl` | Already set in code — no action                   |
| Clerk dashboard           | Component paths radios → "page on application domain" with the same paths                                | One-time dashboard click, see below               |
| `apps/api/wrangler.jsonc` | `CLERK_FRONTEND_API_URL` = `https://clerk.ptowl.com` (the JWKS issuer)                                   | Stays put — decoupled from where the form renders |

**Dashboard click recipe** (`dashboard.clerk.com` → PTowl → Production →
Configure → Developers → Paths):

For **`<SignIn />`**: select "Sign-in page on application domain" →
enter `/accounts/sign-in`.

For **`<SignUp />`**: select "Sign-up page on application domain" →
enter `/accounts/sign-up`.

For **"Signing Out"**: select "Path on application domain" → enter
`/` (or `/accounts/sign-in` if you'd rather send signed-out visitors
straight back to the form).

Leave "Application paths → Home URL" blank (defaults to the apex).

Clerk's dashboard banner notes that this page is being deprecated in
favor of code-side configuration — our code-side config in `main.tsx`
is already future-proof. The dashboard flip is the compat layer.

**Automation path (Pro plan)**: the Clerk Backend API exposes
`PATCH /v1/instance` for setting these URLs programmatically. The
bundled `pnpm launch:finalize` script (see §5a) does this when
`CLERK_SECRET_KEY` is exported — useful for re-applying config after
an instance migration or for bootstrapping a sibling app.

**Verify** by fetching Clerk's public environment endpoint after
saving:

```sh
curl -s "https://clerk.ptowl.com/v1/environment" \
  -H "Origin: https://ptowl.com" \
  | python -c "import sys,json; e=json.load(sys.stdin)['display_config']; \
    print('sign_in:', e['sign_in_url']); print('sign_up:', e['sign_up_url'])"
```

Should print URLs containing `/accounts/sign-in` and `/accounts/sign-up`.

### 4. Cloudflare Web Analytics

- CF dashboard → Web Analytics → Add a site → `ptowl.com`.
- Copy the site token.
- Replace `__CF_ANALYTICS_TOKEN__` in [apps/web/index.html](apps/web/index.html)
  with the token. The token is public (renders in browser HTML), safe to commit.
- Toggle "auto-inject" on as belt-and-suspenders — both paths converge on the
  same beacon.

### 5. Deploy

`git push origin main` (or merge a PR to main). [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
auto-runs typecheck → unit tests → build → D1 migrations → API deploy →
frontend fallback deploy. ~5–8 minutes.

### 5a. Rapid finalize (one command)

After a fresh launch — or any time you need to re-verify the
launch-side configuration — run the bundled automation script. It does
the three tasks that have programmatic APIs (CF Web Analytics, MailChannels
DNS records, Clerk Account Portal paths) and tells you what's left for
manual rotation.

```sh
# Set these in your shell — never commit them.
export CLOUDFLARE_API_TOKEN=<scopes: Account:Web Analytics Edit + Zone:DNS:Edit>
export CLOUDFLARE_ACCOUNT_ID=<32-char hex, CF dashboard sidebar>
export CLOUDFLARE_ZONE_ID=<32-char hex, ptowl.com → Overview>
export MAILCHANNELS_DKIM_PUBLIC_KEY=<from MailChannels console>   # optional
export CLERK_SECRET_KEY=sk_live_...                                # optional

pnpm launch:finalize
```

What it does (see [scripts/finalize-launch.mjs](scripts/finalize-launch.mjs)):

1. **Cloudflare Web Analytics** — creates a Web Analytics site for `ptowl.com`
   if missing, extracts the beacon token, patches `apps/web/index.html`
   replacing the `__CF_ANALYTICS_TOKEN__` placeholder. After it runs, you
   commit + push the patched file to make the beacon live.
2. **MailChannels DNS** — ensures SPF (with `relay.mailchannels.net`),
   DKIM TXT at `mailchannels._domainkey`, and the Domain Lockdown TXT at
   `_mailchannels` exist on the zone. Idempotent — re-running is safe.
3. **Clerk paths** — PATCHes the production instance's sign-in / sign-up /
   after-sign-in URLs to `https://ptowl.com/accounts/*`. Optional and only
   runs when `CLERK_SECRET_KEY` is set.

What it does NOT do (you must run manually):

- Rotate the MailChannels API key — no management API. Rotate in their
  console, then `cd apps/api && wrangler secret put EMAIL_API_KEY`.
- Commit the patched `apps/web/index.html` — the script prints the
  exact `git add && git commit` line to copy.

### 6. Smoke test

- `https://ptowl.com` returns 200; HSTS + CSP headers present (`curl -sI`).
- Hero renders; dark-mode toggle works.
- "Sign in" anchor points at `/accounts/sign-in`; Clerk form renders inline.
- Sign in → `/dashboard` loads; Ctrl+K opens command palette.
- Create a test schedule → "Add to calendar" → three options work (Apple/Google/.ics).
- Patient share URL → three calendar buttons render on mobile width.
- CF Web Analytics shows pageviews within 1–2 minutes.

### 7. Rollback if anything regresses

See [docs/RUN.md §Workers (API) rollback](docs/RUN.md#workers-api-rollback). Short version:

```
cd apps/api && wrangler rollback        # 60s, previous Worker version
```

Or revert the merge commit on `main` and let CI redeploy. D1 schema
changes are forward-only; if you need to roll back a migration use
D1 Time Travel (5 min, 30-day window).

---

## Current status (as of this commit)

**Live and healthy:**

- All core scheduling flows (create, edit, share, print, .ics export).
- Clerk auth (Google + email/password + MFA).
- Patient magic-link share at `/p/<token>` with `.ics` and JSON views.
- D1 + R2 + Workers AI bindings active.
- CF WAF, Bot Fight Mode, rate limiting, HSTS, CSP all live.
- Branch protection on `main` (PR + review required).
- Email reminder cron (sends directly via MailChannels, no queue dependency).

**Behind a flag / user-side action:**

- MailChannels API key — must be set as `EMAIL_API_KEY` Worker secret for
  reminders to actually send. Code silently no-ops without it.
- CF Web Analytics token — beacon script is in `index.html` with a
  placeholder; works as soon as the user pastes the real token.

**Deferred (intentional, see VISION.md):**

- Paid tiers (Solo $9 / Clinic $29) — gated past 50 active beta clinics.
- LemonSqueezy payment integration.
- Daily-digest reminder mode (`digest_mode` plumbing exists; scheduling not).
- SMS reminders (Twilio) — Phase 10+.
- Multi-provider clinic admin / role-based access.
- Patient login (deliberately no — magic link only).
- Status page (Upptime fork) — recipe now in §Observability & resilience setup; ~15 minutes user-side.

**Known low-priority TODOs in code:**

- Persist clinic timezone on profile rather than inferring per-request
  ([apps/api/src/services/reminders.ts:25](apps/api/src/services/reminders.ts#L25)).
- Implement the daily digest dispatcher
  ([apps/api/src/services/reminders.ts:28](apps/api/src/services/reminders.ts#L28)).

---

## Recent change history (2026-05-13 launch finalization)

A burst of 13 PRs landed in one day to take PTOwl from "almost launch-ready" to "live and instrumented." Captured here because git log alone doesn't tell the WHY.

| PR            | Subject                                                                          | Why it mattered                                                                                                                                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #45           | Launch UI polish (mobile responsive, dark-mode contrast, dashboard empty states) | Removed the rough edges visible to a real PT walking up to the site.                                                                                                                                                                                                     |
| #46           | One-command launch-finalize automation script                                    | Built `scripts/finalize-launch.mjs` — programmatic CF Web Analytics + Clerk paths + MailChannels DNS.                                                                                                                                                                    |
| #47           | Clerk Account Portal paths procedure in MASTER.md                                | Documented the dashboard radio-button recipe Clerk currently shows.                                                                                                                                                                                                      |
| #48           | PTOwl rebrand + 10-animal greeting roster + Clerk path normalization             | Mixed-case "PTOwl" wordmark across all surfaces. Sign-in greeting rotates through 10 calming Doctor X names. Paths moved to `/accounts/signin` (no hyphen).                                                                                                              |
| #49           | Vite manualChunks typing fix                                                     | Fixed `TS2769` that was blocking every Dependabot PR.                                                                                                                                                                                                                    |
| #50           | ⭐ **Frontend-deploy silent-fail bug fix**                                       | Discovered that `continue-on-error: true` had been hiding broken frontend deploys for 3 prior deploys. PTOwl rebrand had merged but never reached production. Pinned `wrangler` in `apps/web/devDependencies` to fix the wrangler-action npm fallback. Removed the mask. |
| #52           | Dependabot root dev-deps bump (11 updates)                                       | Patched the open vite + esbuild security alerts in one shot.                                                                                                                                                                                                             |
| #53           | Loading overlay default copy refresh                                             | "Loading…" → "Just a moment…"                                                                                                                                                                                                                                            |
| #54           | One-click `launch-finalize` GitHub Actions workflow                              | Manual `workflow_dispatch` triggers the finalize script with secrets from GH Actions.                                                                                                                                                                                    |
| #55           | CF Web Analytics token in `index.html`                                           | Replaced placeholder with real beacon token.                                                                                                                                                                                                                             |
| #56           | Visible signed-in identity in dashboard + `docs/ADMIN-CHEATSHEET.md`             | Header menu now shows the signed-in user's email instead of generic "Profile". Added admin SQL recipes for user management via D1 console.                                                                                                                               |
| #57           | Clearer landing sign-in button + blinking owl favicon                            | Removed misleading Google G icon. Added a 5-second SMIL blink to the favicon owl.                                                                                                                                                                                        |
| #58 (this PR) | Health audit + MASTER.md session log + webmanifest fix + static robots.txt       | This file's "Recent change history" + new `docs/HEALTH-AUDIT.md` + small content bug fixes.                                                                                                                                                                              |

### Lessons learned

1. **`continue-on-error: true` is a footgun.** It masked a real recurring deploy failure for ~12 hours. Never use it on a deploy step unless the step is genuinely optional. Rule of thumb: if a step touches production state, it should fail loudly.
2. **Clerk's URL validator strips hyphens.** `/accounts/sign-up` becomes `/accounts/signup` on save. If you set hyphenated paths in code, dashboard and code diverge silently.
3. **CF Workers Builds (the dashboard-driven git integration) was disconnected** during this session. `deploy.yml` is now the sole authoritative deploy path. Re-enabling Workers Builds would create dual-deploy races.
4. **pnpm `workspace:*` protocol breaks `npm install`** — the wrangler-action falls back to `npm i wrangler@4` if no local wrangler is found, which trips on the workspace protocol. Pin wrangler in every workspace that the action runs from.
5. **Magic-button workflows can't auto-open PRs by default** — GitHub blocks Actions from creating PRs via `GITHUB_TOKEN` unless the repo setting "Allow GitHub Actions to create and approve pull requests" is enabled (Settings → Actions → General → Workflow permissions).

### Magic button — how to use it

After today, `.github/workflows/launch-finalize.yml` exists. To re-apply launch-side configuration any time:

1. GitHub web UI → **Actions** tab → **"Launch Finalize"** → **"Run workflow"** → **main** branch → green button.
2. Workflow uses `CLERK_SECRET_KEY`, `CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_ACCOUNT_ID` from GH Actions secrets.
3. If `apps/web/index.html` gets patched (e.g., CF Web Analytics token replaces the placeholder), the workflow tries to open a PR. If your repo's auto-PR setting is OFF, the PR creation step fails — but the branch and commit ARE on the remote, so just `gh pr create` manually OR enable the auto-PR setting once.

---

## Resume from a clean machine

If your PC dies, gets reset, or you sit down at a brand-new laptop and want to pick up PTOwl work:

### 1. Clone + install (5 min)

```sh
git clone https://github.com/Yami566/ptowl.git
cd ptowl

# Install pnpm if you don't have it (Node should already be installed)
npm install -g pnpm@9
pnpm install --frozen-lockfile

# Verify
pnpm -r typecheck
pnpm test:unit
pnpm build

# Real-browser end-to-end validation against live production
# (requires Chromium — `npx playwright install chromium` first time)
pnpm test:e2e
```

**Three layers of testing exist. Use the right one.** Hard-learned 2026-05-16: HTTP-level smokes alone are insufficient for a React SPA. Four real bugs (silent auth-route redirect, dead 404 catch-all, blocked Clerk icon font, dead fallback link) lived in production for days while every HTTP-level smoke stayed green.

| Layer                                                | What it catches                                                                                        | Run it...                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `pnpm test:unit` (587 tests)                         | Pure functions, security regexes, route handlers in isolation                                          | Every commit, runs in CI                                                                                   |
| `smoke-monthly-health.yml` + `smoke-clerk-urls.yml`  | HTTP-level status codes, Clerk dashboard drift                                                         | Daily on cron + on push to main                                                                            |
| **`pnpm test:e2e`** (57 assertions across 11 routes) | **React hydration failures, route-guard misfires, A11y attribute regressions, JS errors at page load** | **Before any PR that touches auth, routing, or visible UI. Manually after every deploy that feels risky.** |

Full e2e details + how to add new tests: [docs/E2E-TESTS.md](docs/E2E-TESTS.md).

### 2. Authenticate the CLIs (~2 min)

```sh
# GitHub CLI
gh auth login   # pick GitHub.com, HTTPS, browser auth

# Cloudflare Workers CLI (for deploying / secrets)
cd apps/api
npx wrangler login

# That's it — gh + wrangler share their state with the local OS keychain
```

### 3. Read these three files in order (10 min)

1. [docs/VISION.md](docs/VISION.md) — **what & for whom**. Locked product decisions, audience, brand promise, pricing.
2. **This file (`MASTER.md`)** — operational state, secrets inventory, recent change history, launch playbook.
3. [docs/ADMIN-CHEATSHEET.md](docs/ADMIN-CHEATSHEET.md) — plain-language steps for admin tasks via Cloudflare dashboard.

### 4. Sanity-check production is still healthy (1 min)

```sh
curl -sI https://ptowl.com/ -o /dev/null -w "homepage: %{http_code}\n"
curl -sI https://ptowl.com/accounts/signin -o /dev/null -w "signin:   %{http_code}\n"
curl -s https://ptowl.com/api/v1/health
```

All should be 200 / show `"status":"healthy"`.

### 5. Where the dashboards live (bookmark these)

- **Cloudflare** — https://dash.cloudflare.com — Workers, D1, R2, DNS, Web Analytics, WAF
- **Clerk** — https://dashboard.clerk.com → PTowl app → Production
- **MailChannels** — https://www.mailchannels.com — outbound email key + DNS
- **GitHub** — https://github.com/Yami566/ptowl — PRs, Actions, Settings → Secrets
- **PageSpeed Insights** (Lighthouse via web) — https://pagespeed.web.dev/

### 6. If something broke and you need to investigate

- **Production logs** → CF dashboard → Workers & Pages → `ptowl-api` → Logs
- **Deploy logs** → https://github.com/Yami566/ptowl/actions/workflows/deploy.yml
- **Rollback** → see [docs/ADMIN-CHEATSHEET.md §7](docs/ADMIN-CHEATSHEET.md#7-rollback-a-bad-deploy)
- **Down? Confused?** → Open a fresh chat with Claude and paste this file path

---

## The 6 irreducible one-time Clerk dashboard clicks

Per [docs/CLERK-INTEGRATION.md](docs/CLERK-INTEGRATION.md), almost every recurring Clerk dashboard step is now automated via Backend API (`scripts/sync-clerk-paths.mjs` runs on every deploy). Six one-time setups remain that Clerk's API genuinely does not expose. These are listed here so future-Claude or a new contributor never wonders what's unavoidable:

| #   | What                                                                                                                                                                                                                                                                                                                                                                                                                                    | Where                                                            | When                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| 1   | **Webhook endpoint registration.** Add `POST https://ptowl.com/api/v1/webhooks/clerk` in Clerk dashboard → Webhooks. Copy the signing secret, then `cd apps/api && wrangler secret put CLERK_WEBHOOK_SECRET`.                                                                                                                                                                                                                           | Clerk dashboard → Webhooks → Add endpoint                        | Once Wave 1.1 ships (the webhook listener) |
| 2   | **OAuth provider credentials.** If you wire Google/Apple/Microsoft sign-in (Wave 2.2), create the OAuth client in Google Cloud Console / Apple Developer / Azure AD, paste client_id + client_secret into Clerk dashboard → User & Authentication → Social Connections.                                                                                                                                                                 | Provider console + Clerk dashboard                               | Only when adding OAuth                     |
| 3   | **Email template content.** Pro+ feature. PTOwl uses its own MailChannels-backed templates (see [docs/AUTH-LIFECYCLE.md §5](docs/AUTH-LIFECYCLE.md#5-email-surface--5-templates-thats-it)) so we skip this.                                                                                                                                                                                                                             | Clerk dashboard → Customization → Email templates                | n/a — not used                             |
| 4   | **Attack-protection toggles** (account lockout thresholds, bot protection).                                                                                                                                                                                                                                                                                                                                                             | Clerk dashboard → User & Authentication → Attack Protection      | Once, on initial setup                     |
| 5   | **JWT template authoring.** Only needed if we ever require custom claims in the session token. PTOwl doesn't today.                                                                                                                                                                                                                                                                                                                     | Clerk dashboard → Sessions → Customize session token             | Only if needed                             |
| 6   | **Identification strategies** (which fields a new account can use — email_address, phone_number, username). PTOwl's wireframe signup form (PR #91) requires `email_address` enabled. The 2026-05-18 user-screenshot incident — raw "email_address is not a valid parameter" error in the UI — was caused by this toggle being OFF in production. Verification (OTP) stays OFF per [docs/AUTH-LIFECYCLE.md §10](docs/AUTH-LIFECYCLE.md). | Clerk dashboard → User & Authentication → Email, Phone, Username | Once, before launch                        |

After these are set, **recurring Clerk dashboard work for PTOwl is zero**. Every other setting is either code-side (`<ClerkProvider appearance={…}>`, `localization`, `apps/web/src/lib/clerk-strategy.ts` defensive probe) or BAPI-side (`scripts/sync-clerk-paths.mjs`, the upcoming webhook listener, `pnpm clerk:user` CLI).

### Defensive probe (PR #99): `apps/web/src/lib/clerk-strategy.ts`

If row #6 ever gets toggled off in the dashboard (e.g., during a Clerk re-config or accidentally), the LoginPage + SignUpFormPage now detect it at mount via `fetchClerkStrategies()` and render a friendly "Sign-up is being set up — contact help@ptowl.com" maintenance card instead of letting Clerk's raw dashboard-URL error reach end-users. 60-second client-side cache keeps it cheap. Mirrors the proven pattern in `scripts/e2e-auth.mjs:91-112`.

---

## Observability & resilience setup

Closes the audit gaps identified in `~/.claude/plans/use-the-ptowl-file-snuggly-mist.md` §49.4. Each item below is a user-side click-op the founder runs once. After that, the safety net is automatic.

### Clerk URL drift detection (automated — already wired)

The PTOwl auth outage in May 2026 was caused by Clerk's dashboard URLs silently diverging from the routes in code (Clerk strips hyphens, normalizes paths on save). The drift was invisible until a real user couldn't sign in.

`.github/workflows/smoke-clerk-urls.yml` now polls `clerk.ptowl.com/v1/environment` daily (and on every push to main) and fails if `sign_in_url` / `sign_up_url` don't match what the code expects. When red, the workflow output names the divergent field — fix it in the Clerk dashboard → Paths and re-run the workflow.

Update the `EXPECTED_SIGN_IN` / `EXPECTED_SIGN_UP` env vars in that workflow whenever the routes change.

### Workers Logpush — make cron failures visible (5 min, user-side)

Today: if the reminders cron silently fails (bad migration, missing binding, MailChannels rotated), nothing alerts the founder. Patient reminders stop with no error surface.

Fix:

1. Cloudflare dashboard → **Workers & Pages → ptowl-api → Logs → Logpush**
2. **Create Logpush job** → destination: R2 bucket `ptowl-logs` (create if missing)
3. Filter: `outcome != "ok"` to keep volume low; expand to all if storage isn't a concern
4. Save. Logs land in R2 within 5 minutes of any error.

Alternative if R2 setup feels heavy: Cloudflare dashboard → **Notifications → Add → Workers Errors** with destination `nurelimusabay@gmail.com`. One click. Emails on every error.

### Status page (15 min, user-side, one-time)

Today: `https://status.ptowl.com` is referenced in the footer but the DNS record points nowhere. Down incidents → users have no visibility.

Recipe:

1. Fork https://github.com/upptime/upptime into `Yami566/ptowl-status`
2. Edit `.upptimerc.yml` → set `sites:` to:
   ```yaml
   sites:
     - name: Homepage
       url: https://ptowl.com
     - name: API
       url: https://ptowl.com/api/v1/health
     - name: Clerk auth
       url: https://clerk.ptowl.com/v1/environment
   ```
3. Enable GitHub Pages on the fork → custom domain `status.ptowl.com`
4. Cloudflare DNS → add CNAME `status` → `yami566.github.io` (gray cloud — DNS only)

Upptime hits each URL every 5 minutes, writes a markdown changelog of incidents, and posts a green/red badge. Free, repo-driven, zero servers.

### Local dev env template (already in place)

`apps/web/.env.example` documents `VITE_CLERK_PUBLISHABLE_KEY` with the production fallback. A new contributor — or you on a fresh machine — copies it to `.env.local` and is unblocked. The production publishable key is non-secret by design (`pk_*` is browser-safe per Clerk).

### What's still on the user-side TODO

Three remaining items from §49.4 are not automated yet:

1. **CF API token scope validation** — add a pre-deploy step in `deploy.yml` that runs `wrangler d1 migrations list ptowl-db --remote`. If the token loses `D1 Edit` scope, this fails fast instead of a partial deploy. ~2 min to add.
2. **Email rotation health endpoint** — add `POST /api/v1/internal/health/email` (auth-gated to `ADMIN_EMAIL`) that sends a test email. Run monthly post-MailChannels rotation. ~20 min.
3. **D1 monthly snapshot** — `wrangler d1 export ptowl-db --remote` on a CF cron, write to R2. Documented rotation order in §Secrets before any `EMAIL_ENCRYPTION_KEY` rotation. ~15 min.

These ship as small follow-ups when the user has 30 idle minutes.

---

## Cross-references

- **What & for whom** → [docs/VISION.md](docs/VISION.md).
- **How the code is built** → [docs/BUILD.md](docs/BUILD.md).
- **How we work** → [docs/OPERATING.md](docs/OPERATING.md).
- **How we launch** → [docs/SHIP.md](docs/SHIP.md).
- **How we run it** → [docs/RUN.md](docs/RUN.md).
- **Auth lifecycle plan** → [docs/AUTH-LIFECYCLE.md](docs/AUTH-LIFECYCLE.md) — A-Z stages, wireframes, email policy, timezone strategy, lean PR roadmap.
- **Clerk integration roadmap** → [docs/CLERK-INTEGRATION.md](docs/CLERK-INTEGRATION.md) — Clerk capability map, ADA + healthcare benchmark, gap analysis, 3-wave roadmap to eliminate dashboard clicks.
- **Admin actions via CF dashboard** → [docs/ADMIN-CHEATSHEET.md](docs/ADMIN-CHEATSHEET.md).
- **Production health snapshot** → [docs/HEALTH-AUDIT.md](docs/HEALTH-AUDIT.md).
- **Reusable recipe for other repos** → [STACK-TEMPLATE.md](STACK-TEMPLATE.md).

If something in this file conflicts with a file in `docs/`, the file in
`docs/` wins. This file is a thin operational index that ages faster
than the canonical five.
