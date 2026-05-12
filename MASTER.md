# PTowl — Master Context

> Single source of operational truth for `ptowl.com`. Optimized so any
> future AI assistant (Claude, Copilot, Cursor) can read this file +
> [docs/VISION.md](docs/VISION.md) and be productive in one prompt.
>
> Defers to:
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

| Layer | Choice | Why |
| --- | --- | --- |
| DNS + WAF + CDN | Cloudflare | One pane of glass, edge-fast, cheap. |
| Frontend hosting | Cloudflare Workers Static Assets (primary) + Pages (fallback) | Same network as the API; no third-party hop. |
| API runtime | Cloudflare Workers (Hono) | Same edge; no cold starts; per-request pricing. |
| Database | Cloudflare D1 | SQLite on the edge; 7-day Time Travel free. |
| Object storage | Cloudflare R2 | S3-compatible; no egress fees. |
| AI inference | Workers AI (`@cf/meta/llama-3.1-8b-instruct`) | For clinic-timezone inference from address. |
| Auth | Clerk (`clerk.ptowl.com` custom domain) | Drop-in, MFA + Google OAuth; JWKS-based verify. |
| Outbound email | MailChannels (`relay.mailchannels.net`) | Free-tier for Cloudflare Workers; transactional only. |
| Calendar export | `ical-generator` package | RFC-5545 .ics out of the box. |
| Bot protection | Cloudflare Turnstile | Captcha for auth-sensitive endpoints. |
| CI/CD | GitHub Actions | Lockfile-driven, deploy on push to `main`. |
| Analytics | Cloudflare Web Analytics | First-party, privacy-friendly, no cookie banner. |

Locked decisions about the stack live in [docs/VISION.md](docs/VISION.md#locked-decisions-do-not-relitigate).
Do not relitigate them here.

---

## Service map (where each piece is configured)

| Service | Config location | Owner action when changing |
| --- | --- | --- |
| Cloudflare Workers (API) | [apps/api/wrangler.jsonc](apps/api/wrangler.jsonc) | Wrangler deploy via GH Actions. |
| Cloudflare Workers (web assets) | [apps/web/wrangler.jsonc](apps/web/wrangler.jsonc) | Same. |
| D1 schema | [apps/api/src/migrations/](apps/api/src/migrations/) | `wrangler d1 migrations apply` (auto in deploy.yml). |
| R2 buckets | Cloudflare dashboard → R2 → `ptowl-logos`, `ptowl-logos-staging` | Manual create with `wrangler r2 bucket create`. |
| DNS for `ptowl.com` | Cloudflare dashboard → DNS | Manual via dashboard. |
| Clerk auth | Clerk dashboard | URLs, providers, custom domain. |
| MailChannels | MailChannels console | API key + DNS for `ptowl.com`. |
| GitHub Actions | [.github/workflows/](.github/workflows/) | Edit in repo; secrets in GH repo settings. |
| CSP / security headers | [apps/web/public/_headers](apps/web/public/_headers) | Edit + redeploy. |
| WAF + rate limits | Cloudflare dashboard → Security | Manual via dashboard. |

---

## Secrets inventory

All secrets are managed via Cloudflare Worker secrets (`wrangler secret put NAME`)
unless noted. None should ever appear in committed files.

| Secret | Used by | How to rotate | Notes |
| --- | --- | --- | --- |
| `JWT_SECRET` | API — signs internal unsubscribe tokens | `wrangler secret put JWT_SECRET --env production`. 64-char hex. | Rotating invalidates any in-flight unsubscribe links. |
| `ADMIN_EMAIL` | API — destination for admin notifications | `wrangler secret put ADMIN_EMAIL --env production`. | Plain email address. |
| `EMAIL_API_KEY` | API — MailChannels send | Generate new key in MailChannels console → `wrangler secret put EMAIL_API_KEY --env production` → revoke old. | Cron silently no-ops if missing — safe default. |
| `EMAIL_ENCRYPTION_KEY` | API — AES-GCM for patient emails in D1 | One-time generate (32 bytes base64) → `wrangler secret put EMAIL_ENCRYPTION_KEY --env production`. **Do not rotate** without re-encrypting existing rows. | Loss = unreadable patient emails. Worth a personal backup. |
| `TURNSTILE_SECRET_KEY` | API — verifies Turnstile challenges | Regenerate in CF dashboard → Turnstile → `wrangler secret put TURNSTILE_SECRET_KEY --env production`. | Public site key is in frontend; this is the server-side. |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions deploy | CF dashboard → My Profile → API Tokens → recreate → GH repo settings → Secrets. | Scope: Workers Edit + D1 Edit + R2 Edit on the ptowl account. |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions deploy | CF dashboard → right sidebar → Account ID → GH repo settings. | Not secret, but kept out of the workflow file for clarity. |

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

### 3. Clerk dashboard URLs

After this PR lands, set in Clerk → Customization → Paths:

- Sign-in URL: `https://ptowl.com/accounts/sign-in`
- Sign-up URL: `https://ptowl.com/accounts/sign-up`
- After sign-in URL: `https://ptowl.com/dashboard`
- After sign-up URL: `https://ptowl.com/dashboard`

`CLERK_FRONTEND_API_URL` in wrangler.jsonc stays at `https://clerk.ptowl.com` —
that's the JWKS issuer, decoupled from where the sign-in form renders.

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
- Status page (Upptime fork) — ~10 minutes user-side.

**Known low-priority TODOs in code:**
- Persist clinic timezone on profile rather than inferring per-request
  ([apps/api/src/services/reminders.ts:25](apps/api/src/services/reminders.ts#L25)).
- Implement the daily digest dispatcher
  ([apps/api/src/services/reminders.ts:28](apps/api/src/services/reminders.ts#L28)).

---

## Cross-references

- **What & for whom** → [docs/VISION.md](docs/VISION.md).
- **How the code is built** → [docs/BUILD.md](docs/BUILD.md).
- **How we work** → [docs/OPERATING.md](docs/OPERATING.md).
- **How we launch** → [docs/SHIP.md](docs/SHIP.md).
- **How we run it** → [docs/RUN.md](docs/RUN.md).
- **Reusable recipe for other repos** → [STACK-TEMPLATE.md](STACK-TEMPLATE.md).

If something in this file conflicts with a file in `docs/`, the file in
`docs/` wins. This file is a thin operational index that ages faster
than the canonical five.
