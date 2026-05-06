# PTowl — Build

> The engineering-themed entry in the 4-doc PTowl library
> (Vision · **Build** · Ship · Run). Architecture, repo layout,
> deploy paths, CI gates, and self-host. Terse, ops-reference voice.

---

## TL;DR

| Field       | Value                                                     |
| ----------- | --------------------------------------------------------- |
| Product     | PTowl — patient schedule generator for therapy clinics    |
| Audience    | PT, OT, SLP, chiro, mental-health, dental — small clinics |
| Pitch       | "5 keypresses. Schedule done. Go home on time."           |
| Stack       | React 19 + Vite · Hono on CF Workers · D1 · R2 · Clerk    |
| Hosting     | Cloudflare end-to-end (Pages-style Workers Static Assets) |
| Auth        | Clerk on `clerk.ptowl.com` (production custom domain)     |
| License     | AGPL-3.0                                                  |
| Cost (beta) | $0/mo on free tiers up to ~10K MAU                        |
| Self-host   | ~15 min via the Deploy-to-Cloudflare button               |

---

## Stack

| Layer            | Tech                                           | Notes                                |
| ---------------- | ---------------------------------------------- | ------------------------------------ |
| Frontend FW      | React 19 + Vite + React Router 7               | TS strict, code-splitting on routes  |
| Frontend hosting | Cloudflare Workers Static Assets (Pages-style) | Git integration auto-deploys on push |
| API runtime      | Hono 4 on Cloudflare Workers                   | V8 isolates, no cold starts          |
| Auth             | Clerk drop-in widget + JWKS verify (`jose`)    | Custom domain `clerk.ptowl.com`      |
| Database         | Cloudflare D1 (SQLite at edge)                 | PITR 7-day free / 30-day paid        |
| Object storage   | Cloudflare R2 (`ptowl-logos`)                  | Clinic logos; dual-write w/ base64   |
| AI binding       | Workers AI (`AI`)                              | Timezone inference from clinic addr  |
| Bot protection   | Cloudflare Turnstile                           | Auth-adjacent endpoints              |
| Validation       | Zod 4 schemas in `packages/shared`             | Single source of truth for contracts |
| Tests            | Vitest 2                                       | Unit only; gates deploy              |
| CI/CD            | GitHub Actions (`deploy.yml`, `ci.yml`)        | + CF Pages git integration           |

Versions are pinned via `pnpm-lock.yaml`. Don't bump packages without
running the full CI matrix (typecheck + test + build) green first.

---

## Architecture

```
                       Browser
                          │
                          ▼
                ┌──────────────────┐
                │ Frontend Worker  │◀──── Clerk widget ──── clerk.ptowl.com
                │ (ptowl.com)      │      (JWT issued)
                └────────┬─────────┘
                         │ fetch /api/v1/* (Bearer JWT)
                         ▼
                ┌──────────────────┐
                │   API Worker     │
                │  (ptowl.com/     │── verify JWT against
                │   api/*)         │   <CLERK_FRONTEND_API_URL>/.well-known/jwks.json
                └─┬──────┬───────┬─┘
                  │      │       │
                  ▼      ▼       ▼
                 ┌──┐  ┌──┐   ┌─────────────────┐
                 │D1│  │R2│   │ Cron (15-min)   │
                 │  │  │  │   │ — reminder      │
                 │  │  │  │   │   driver (gated │
                 │  │  │  │   │   on email svc) │
                 └──┘  └──┘   └─────────────────┘
```

- Both Workers live on the same zone (`ptowl.com`). Routing is split
  by path: `/api/*` → API Worker, everything else → Frontend Worker.
- The frontend ships a baked-in Clerk publishable key fallback in
  `apps/web/src/main.tsx` (`pk_live_Y2xlcmsucHRvd2wuY29tJA`) so the
  widget renders even if `VITE_CLERK_PUBLISHABLE_KEY` is unset.
- Server-side, the API verifies Clerk session JWTs every request
  using `jose.jwtVerify` against the JWKS at
  `${CLERK_FRONTEND_API_URL}/.well-known/jwks.json`.
- No Queues, no Durable Objects, no Workflows. Plain Workers + D1 +
  R2 + cron is sufficient through 100 clinics. The wrangler config
  has commented-out scaffolding for a future `EMAIL_QUEUE` once
  outbound email lands and the project moves to Workers Paid.

---

## Repo layout

```
ptowl/
├── apps/
│   ├── api/                  # Hono API on Cloudflare Workers
│   │   ├── src/
│   │   │   ├── crypto/       # JWT helpers (Clerk JWKS verify)
│   │   │   ├── middleware/   # Clerk auth (CSRF is global hono/csrf)
│   │   │   ├── migrations/   # D1 SQL migrations (0001 → 0018)
│   │   │   ├── routes/       # Hono route handlers
│   │   │   ├── services/     # email.ts, reminders.ts, alias.ts
│   │   │   ├── types/        # env.ts (Bindings type)
│   │   │   └── index.ts      # app entry, scheduled() handler
│   │   ├── tests/            # Vitest unit tests
│   │   └── wrangler.jsonc    # D1, R2, AI, cron, vars
│   └── web/                  # React frontend
│       ├── src/
│       │   ├── components/
│       │   ├── contexts/
│       │   ├── hooks/
│       │   ├── pages/        # Route pages
│       │   ├── App.tsx
│       │   └── main.tsx      # Clerk publishable key baked here
│       ├── public/
│       │   └── _headers      # CSP + security headers (CF Static Assets)
│       └── vite.config.ts
├── packages/
│   └── shared/               # Zod validators, types, constants, alias map
├── docs/                     # PRD, BUILD (this), SHIP, RUN, etc.
├── .github/workflows/
│   ├── ci.yml                # typecheck + test + build + commitlint
│   ├── deploy.yml            # API Worker deploy + D1 migrations
│   ├── cf-bootstrap.yml      # Idempotent edge primitives bootstrap
│   ├── codeql.yml            # Weekly + PR security scan
│   └── release-please.yml    # Conventional-Commit-driven semver PRs
└── pnpm-workspace.yaml
```

CF Pages git integration owns the frontend deploy path (separate from
GH Actions). Don't add a `wrangler pages publish` step to `deploy.yml`
— it'll fight CF Pages and double-deploy.

---

## Features inventory

### Authenticated surface

| Group         | Feature                                   | Status  |
| ------------- | ----------------------------------------- | ------- |
| Auth          | Clerk drop-in (Google + email/password)   | [BUILT] |
| Auth          | Clerk JWT verify per request (jose+JWKS)  | [BUILT] |
| Auth          | Auto-provision D1 user on first authed    | [BUILT] |
| Dashboard     | 5 preset templates as hotkey 2-6 cards    | [BUILT] |
| Dashboard     | Custom Wizard (hotkey 1, 6 steps)         | [BUILT] |
| Dashboard     | Saved schedules paginated list (20/pg)    | [BUILT] |
| Dashboard     | Active / Upcoming / Past chip filter      | [BUILT] |
| Schedule      | 5-keypress flow (preset → initials → ✓)   | [BUILT] |
| Schedule      | 676 sports aliases (AA-ZZ → figures)      | [BUILT] |
| Schedule      | Table + FullCalendar views                | [BUILT] |
| Schedule      | Print preview (`window.print()` + CSS)    | [BUILT] |
| Schedule      | Custom template CRUD                      | [BUILT] |
| Patient share | `POST /schedules/:id/share` mints token   | [BUILT] |
| Patient share | `/p/:token` mobile read-only view         | [BUILT] |
| Patient share | `/p/:token.ics` calendar feed             | [BUILT] |
| Patient share | `/p/:token.json` data feed                | [BUILT] |
| Profile       | Clinic info (name, address, phone, email) | [BUILT] |
| Profile       | Logo URL field (R2 dual-write)            | [BUILT] |
| Profile       | "Delete my data" → mailto:help@ptowl.com  | [BUILT] |
| Onboarding    | First-visit ScheduleWizard splash         | [BUILT] |
| Onboarding    | Onboarding survey (m0018)                 | [BUILT] |

### Public / unauthenticated

| Route       | Purpose                                       |
| ----------- | --------------------------------------------- |
| `/`         | Landing + inline Clerk SignIn widget          |
| `/about`    | Long-form marketing + open-source positioning |
| `/privacy`  | Privacy policy (reflects Clerk + AGPL)        |
| `/terms`    | Terms of service                              |
| `/security` | Public security overview                      |
| `/p/:token` | Patient magic-link read-only view             |
| `*`         | Owl 404                                       |

### Roadmap (engineering items only)

| Item                           | Phase    | Notes                               |
| ------------------------------ | -------- | ----------------------------------- |
| Outbound email service         | Phase 9  | MailChannels candidate, not shipped |
| Auto-email patient magic-link  | Phase 9  | Blocks on email service             |
| 24h / 1h appointment reminders | Phase 9  | Cron driver wired; no sender yet    |
| AI-assisted schedule drafting  | Phase 10 | Workers AI binding present (`AI`)   |
| Multi-provider clinic mode     | Phase 10 | Schema additions required           |

---

## Data model + migrations history

### Core tables (all D1)

| Table          | Purpose                                                 |
| -------------- | ------------------------------------------------------- |
| `users`        | Clerk-provisioned users (id, email, display_name, tier) |
| `profiles`     | Clinic info per user (1:1)                              |
| `templates`    | Per-user schedule templates (hotkey 1-9 unique)         |
| `schedules`    | Generated schedules (initials, alias, dates)            |
| `appointments` | Per-schedule appointment rows                           |
| `audit_log`    | Append-only event trail                                 |

Foreign keys cascade on user delete. Schedule delete cascades to
appointments. Template delete sets `schedules.template_id` to NULL.

### Migration history

| Mig  | File                                         | What it does                               |
| ---- | -------------------------------------------- | ------------------------------------------ |
| 0001 | `0001_initial.sql`                           | Core schema: users/profiles/schedules/etc. |
| ...  | (intermediate migrations, see `migrations/`) | Schema evolution                           |
| 0011 | `0011_profile_logo_r2.sql`                   | Adds `profiles.logo_r2_key`                |
| 0017 | `0017_seed_specialty_templates.sql`          | Seeds 6 specialty defaults                 |
| 0018 | `0018_onboarding_surveys.sql`                | First-run onboarding survey storage        |

To list current state on prod:

```bash
cd apps/api
npx wrangler d1 migrations list ptowl-db --remote
```

Apply pending migrations:

```bash
npx wrangler d1 migrations apply ptowl-db --remote
```

CI applies migrations via `deploy.yml` on push to `main`. Don't run
`apply` manually unless rolling forward a missed deploy.

---

## Deploy paths

Four independent deploy paths — each with its own trigger, runtime,
and ETA. Know which one you tripped before you debug.

| Path            | Trigger                                 | Runtime        | ETA      |
| --------------- | --------------------------------------- | -------------- | -------- |
| Frontend        | Push to `main` (CF Pages git)           | Cloudflare     | ~60 s    |
| API Worker      | Push to `main` → `deploy.yml`           | GitHub Actions | ~3-5 min |
| D1 migrations   | Push to `main` → `deploy.yml`           | GitHub Actions | ~30 s    |
| Edge primitives | Marker-file change → `cf-bootstrap.yml` | GitHub Actions | ~1-2 min |

### Frontend (Cloudflare Pages git integration)

- Project: `ptowl` in Workers & Pages
- Production branch: `main`
- Build command: `pnpm install --frozen-lockfile && pnpm --filter @ptowl/web build`
- Build output: `dist`
- Root: `apps/web`
- Env: `NODE_VERSION=20`, `VITE_TURNSTILE_SITE_KEY=...`, optional
  `VITE_CLERK_PUBLISHABLE_KEY` (overrides the baked-in fallback)

CF picks up pushes to `main` within ~30s, builds, and promotes to
production. No `wrangler pages publish` step in `deploy.yml`.

### API Worker (`apps/api`)

- `cloudflare/wrangler-action@v3` runs `wrangler deploy`
- Routes: `ptowl.com/api/*` and `www.ptowl.com/api/*` (zone `ptowl.com`)
- Bindings: D1 (`DB`), R2 (`LOGOS`), Workers AI (`AI`)
- Cron: `*/15 * * * *` (15-min granularity reminder driver)
- Secrets (set with `wrangler secret put`):
  - `JWT_SECRET` — 64-char hex (legacy; mostly Clerk-backed now)
  - `ADMIN_EMAIL` — `help@ptowl.com`
  - `EMAIL_API_KEY` — MailChannels (Phase 9, not yet wired)
  - `EMAIL_ENCRYPTION_KEY` — AES-256-GCM key for patient email at rest
  - `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile

### D1 migrations

- Same workflow as the Worker deploy. Wrangler applies any unapplied
  migrations against the remote `ptowl-db` before the Worker deploy.
- Staging mirror: `ptowl-db-staging` (id in `wrangler.jsonc env.staging`).

### Edge primitives bootstrap (`cf-bootstrap.yml`)

Idempotent. Configures via the Cloudflare REST API:

- WAF managed rulesets
- Bot Fight Mode
- Rate limiting rules (auth endpoints)
- Worker Errors notifications
- Web Analytics
- Clerk DNS CNAMEs (`clerk.ptowl.com`, `clkmail.clerk.ptowl.com`)

Trigger via Actions UI on the marker-file change. Re-running is safe.

---

## CI gates

`.github/workflows/ci.yml` — runs on every PR + push to `main`.

| Job        | Command                            | Gate? |
| ---------- | ---------------------------------- | ----- |
| typecheck  | `pnpm typecheck`                   | Yes   |
| test       | `pnpm test:unit`                   | Yes   |
| lint       | `pnpm lint`                        | Yes   |
| build      | `pnpm build`                       | Yes   |
| commitlint | Conventional Commits on PR commits | Yes   |
| codeql     | Weekly + PR security scan          | Adv.  |

Concurrency: `ci-${{ github.ref }}` with `cancel-in-progress: true`
(supersedes prior commits' runs on the same PR).

`deploy.yml` runs after CI succeeds:

- Concurrency group: `deploy-production` with
  `cancel-in-progress: false` (no half-deploys)
- Deploys API Worker + applies D1 migrations
- Frontend deploy was removed when CF Pages git integration came
  online (see `CF-PAGES-GIT-SETUP.md` step 6+)

`release-please.yml` opens semver PRs from Conventional Commit
messages on `main`. Merge the release PR to publish a tag.

---

## Local dev

See `CONTRIBUTING.md` for the full local dev loop. The short version:

```bash
pnpm install
pnpm dev:api          # wrangler dev --local --persist-to .wrangler/state
pnpm dev:web          # vite
```

Local auth uses Clerk's dev instance (`pk_test_...`) — set
`VITE_CLERK_PUBLISHABLE_KEY` in `apps/web/.env.local`. The API verifies
JWTs against whichever Clerk frontend API URL is in `wrangler.jsonc`'s
`vars.CLERK_FRONTEND_API_URL` (or the staging override).

> No local Node toolchain is required for review. CI runs typecheck,
> test, and build on every PR. Pushing usually faster than installing.

---

## Self-host (15-min path)

PTowl is AGPL-3.0. Anyone can stand up their own instance. Full
walkthrough lives in `HOW-TO-DEPLOY.md`. Condensed steps:

1. **Fork** `Yami566/ptowl` (or click the Deploy-to-Cloudflare button
   in the README).
2. **Create CF resources** (one-time):
   ```bash
   cd apps/api
   npx wrangler d1 create ptowl-db          # paste id into wrangler.jsonc
   npx wrangler r2 bucket create ptowl-logos
   ```
3. **Set secrets** (`wrangler secret put`): `JWT_SECRET`,
   `ADMIN_EMAIL`, `EMAIL_API_KEY` (placeholder ok),
   `EMAIL_ENCRYPTION_KEY`, `TURNSTILE_SECRET_KEY`.
4. **Set up Clerk**: create app at dashboard.clerk.com, copy
   publishable key, replace the baked-in fallback in
   `apps/web/src/main.tsx` (or set `VITE_CLERK_PUBLISHABLE_KEY` in
   CF env vars). Update `vars.CLERK_FRONTEND_API_URL` in
   `apps/api/wrangler.jsonc` to your Clerk frontend API URL (decode
   the publishable key to read it). Enable Email + Google providers.
5. **CSP**: if you use a Clerk custom domain, replace
   `clerk.ptowl.com` and `accounts.ptowl.com` in
   `apps/web/public/_headers` (six CSP directives). If skipped, the
   SignIn widget silently fails to render.
6. **Apply migrations**:
   `npx wrangler d1 migrations apply ptowl-db --remote`
7. **Deploy API**: `npx wrangler deploy`
8. **Deploy frontend** via CF Workers & Pages → Connect to Git →
   pick your fork. Build settings per `CF-PAGES-GIT-SETUP.md`.
9. **(Optional) Custom domain**: add zone in Cloudflare, point
   registrar nameservers, attach domain to both Workers, update
   Clerk → Domains, update `wrangler.jsonc` `routes`.
10. **Verify**: incognito → sign up → press `1` → type two letters
    → Enter → schedule renders → Print works → Share mints `/p/:token`.

What you don't have to build:

- D1 PITR (auto, 7-day free / 30-day paid)
- TLS (Cloudflare auto-provisions)
- DDoS protection (free plan)

---

## Clerk production setup (Phases A-F, condensed)

Detailed runbook: `CLERK-PRODUCTION-SETUP.md`. Engineering distillation:

| Phase | Owner    | Action                                                                                                                                                                               |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A     | User     | Clerk dashboard → "Create production instance" → custom domain `clerk.ptowl.com` → copy 2 CNAMEs                                                                                     |
| B     | Repo     | Extend `cf-bootstrap.yml` with the CNAMEs (DNS-only / gray cloud), trigger workflow, click Verify in Clerk                                                                           |
| C     | User     | Google Cloud Console → OAuth consent screen + Web client; paste Client ID/Secret into Clerk SSO Connections                                                                          |
| D     | Repo     | Swap `pk_test_` → `pk_live_` in `apps/web/src/main.tsx`; swap `CLERK_FRONTEND_API_URL` to `https://clerk.ptowl.com` in `wrangler.jsonc` (both base and `env.staging`); commit + push |
| E     | Both     | Incognito ptowl.com → widget renders, OAuth popup says `clerk.ptowl.com` (not the dev subdomain)                                                                                     |
| F     | Optional | Custom email sender (`noreply@ptowl.com`) — DKIM TXT via `cf-bootstrap.yml`. Defer until A-E verified.                                                                               |

Things that explicitly DON'T happen during the migration:

- Don't delete the Development instance until prod is verified.
- Don't change the publishable key by hand outside the focused commit.
- Don't paste secret keys (`sk_*`) into chat — only publishable keys
  (`pk_*`). Secret keys go straight into `wrangler secret put`.

Live state today: production instance is active, `pk_live_Y2xlcmsucHRvd2wuY29tJA`
is baked into `apps/web/src/main.tsx`, JWKS verify is hitting
`https://clerk.ptowl.com/.well-known/jwks.json`.

---

## Subprocessors

| Vendor       | Role                               | Status / Notes                     |
| ------------ | ---------------------------------- | ---------------------------------- |
| Cloudflare   | Hosting, DNS, CDN, WAF, D1, R2, AI | Free tier covers ~10K MAU          |
| Clerk        | Authentication                     | Custom domain `clerk.ptowl.com`    |
| Google       | OAuth IdP (via Clerk SSO conn.)    | Per-project OAuth client           |
| Tawk.to      | Live chat widget                   | Proxied via Cloudflare Zaraz       |
| MailChannels | Outbound transactional email       | Phase 9 candidate, NOT YET SHIPPED |

Tawk.to specifics: Property `69c2330f46a6c41c341aa7c6`, Widget
`1jkf9et9r`, injected via `/cdn-cgi/zaraz/...` once enabled in CF
Zaraz dashboard. The inline `<script>` block in `apps/web/index.html`
is the safety-net fallback.

---

## Email (Phase 9, MailChannels candidate, not yet shipped)

The `EMAIL_API_KEY` secret slot exists. The cron driver
(`*/15 * * * *`) exists. The reminder service is wired defensively
(`apps/api/src/services/reminders.ts:62` short-circuits when no
queue/sender binding is present). What's missing: a confirmed sender
provider + DNS records.

**Plan if MailChannels is chosen:**

- `apps/api/src/services/email.ts` POSTs to
  `https://api.mailchannels.net/tx/v1/send` with `X-API-Key` header.
- DNS on `ptowl.com`:
  - SPF: include `relay.mailchannels.net` in the existing record
  - Domain Lockdown: TXT `_mailchannels` =
    `v=mc1 cfid=<account-id>.workers.dev`
  - DKIM: TXT `mailchannels._domainkey` with the public key from
    MailChannels dashboard
- All five transactional templates live inline in `email.ts` (kept
  simple — no template engine).
- Failures are logged and swallowed. Email never blocks signup or
  schedule creation.
- Pricing: as of April 2026, MailChannels deprecated their free tier
  for new senders. Paid plans start ~$5/mo. If that's a no-go, revert
  to Resend (the diff is in git history at the
  `refactor: replace Resend with MailChannels` commit).

**Open decision** (per `AUTOMATION-PLAN.md`): MailChannels vs Resend
vs SendGrid. Resolve before any Phase 9 send goes live.

---

## Storage (R2 for clinic logos)

| Aspect            | Detail                                                 |
| ----------------- | ------------------------------------------------------ | ----- |
| Binding           | `LOGOS` in `wrangler.jsonc`                            |
| Production bucket | `ptowl-logos`                                          |
| Staging bucket    | `ptowl-logos-staging`                                  |
| Migration         | `0011_profile_logo_r2.sql` adds `profiles.logo_r2_key` |
| Object key        | `logos/{userId}/clinic.{png                            | jpg}` |
| Endpoint          | `POST /api/v1/profile/logo`                            |
| Strategy          | Dual-write (binary → R2; base64 → `profiles.logo_url`) |
| Fallback          | `c.env.LOGOS` is optional; falls back to base64-only   |

Why dual-write: the user creating the bucket and running migrations
is a manual step. Until that's done in any given environment, the R2
binding might be missing in production — the optional check makes
the upload route gracefully degrade. No production breakage during
rollout.

Future cleanup (post-launch, when all active clinics have re-uploaded):

1. Add `GET /api/v1/logos/:userId` that streams the R2 object.
2. Update display sites (`ProfilePage.tsx` etc.) to use the new endpoint.
3. Backfill cron copies remaining base64 logos into R2.
4. Migration drops `profiles.logo_url`.

---

## Edge security

### Edge security headers (configured in `apps/web/public/_headers`)

| Header                      | Value                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | `default-src 'self'; script-src 'self' clerk.ptowl.com accounts.ptowl.com challenges.cloudflare.com ...` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload`                                                           |
| `X-Frame-Options`           | `DENY`                                                                                                   |
| `X-Content-Type-Options`    | `nosniff`                                                                                                |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                                                        |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=(), payment=()`                                                   |

### Server-side controls

- **Authentication**: Clerk session JWT, verified per request via
  `jose.jwtVerify` against the JWKS at
  `${CLERK_FRONTEND_API_URL}/.well-known/jwks.json`.
- **CSRF**: `hono/csrf` (origin/referer match on form-encoded POSTs)
  layered with strict CORS allowlist (`origin: [FRONTEND_URL]`,
  `credentials: true`).
- **Input validation**: Zod schemas in `packages/shared` on every
  API input.
- **Rate limiting**: Per-IP sliding window, 3-20 req/min depending
  on endpoint. In-memory Map per Worker isolate. Migrate to CF WAF
  rate limiting rules at 10K+ MAU (already provisioned via
  `cf-bootstrap.yml`).
- **Bot protection**: Turnstile on auth-adjacent endpoints.
- **Patient email at rest**: AES-256-GCM, key in Worker secret only.
- **PII protection**: Sports alias system (676 aliases AA-ZZ → sports
  figures, deterministic via SHA-256 of initials). No real patient
  names ever stored.

---

## Automation roadmap (engineering items)

Per `AUTOMATION-PLAN.md`, ranked.

### 1. Clerk production custom domain — DONE

Was: dev instance `ethical-dingo-48.clerk.accounts.dev`. Now:
`clerk.ptowl.com`. See "Clerk production setup" above.

### 2. Onboarding survey to seeded templates — IN PROGRESS

- Migration `0018_onboarding_surveys.sql` lays the table
- `0017_seed_specialty_templates.sql` seeds 6 specialty defaults
- Form between sign-in and dashboard captures provider type,
  specialty, default sessions/wk, weekend hours, intro tone
- Static lookup table maps survey answers → template set (no AI in
  v1 — predictable, free, deterministic)

### 3. Backups / log retention — RESOLVED, NOTHING TO BUILD

CF D1 PITR is automatic (7-day free, 30-day paid). Restore via
`wrangler d1 time-travel restore ptowl-db --timestamp <ISO-8601>`.
Audit-log rotation deferred (we have years of headroom at <100
rows/day).

### Explicitly NOT in scope right now

| Item                              | Why deferred                       |
| --------------------------------- | ---------------------------------- |
| Email reminders (24h / 1h)        | Blocks on Phase 9 sender choice    |
| Daily clinic digest emails        | Same blocker                       |
| PII detection on patient initials | Onboarding survey teaches initials |
| Failsafe read-only mode           | Scale doesn't justify              |
| Schedule auto-archival            | Lists not yet cluttered            |
| Payments (LemonSqueezy)           | Phase 11+ work                     |
| SMS reminders                     | 10DLC reg + sender; out of scope   |

---

## Common gotchas

The traps that have eaten time. Read before debugging.

### CSP must allowlist Clerk hosts

If you use a Clerk custom domain, the CSP in
`apps/web/public/_headers` must allowlist your Clerk hosts in **six
directives**: `script-src`, `style-src`, `font-src`, `img-src`,
`connect-src`, `frame-src`. Production allowlists `clerk.ptowl.com`
and `accounts.ptowl.com`. Forks must replace those. Symptom of
miss: SignIn widget silently fails to render — no console error
in some browsers.

### CF DNS auto-proxies CNAME to CF-hosted hosts

When adding the Clerk verification CNAMEs, set them to **DNS-only
(gray cloud)**. Cloudflare's auto-proxy default will break Clerk's
verification handshake. The `cf-bootstrap.yml` workflow sets
`proxied: false` on these records explicitly.

### `CLOUDFLARE_API_TOKEN` lacks `Zone:DNS:Edit`

The deploy token scoped for `wrangler-action` doesn't include the
`Zone:DNS:Edit` permission. The `cf-bootstrap.yml` workflow uses a
separate token (`CF_BOOTSTRAP_API_TOKEN`) that does. If you see
`Authentication error (10000)` from a DNS API call, you grabbed the
wrong token in the workflow.

### commitlint rejects multi-type prefixes

`feat+fix:` or `fix(api+web):` will fail the `commitlint` job. Use
a single type and a single optional scope. If a commit genuinely
spans both, pick the dominant change type.

### Explicit "push to main" required

`deploy.yml` does not deploy on tag pushes. Only on `main` push. If
you tagged but didn't push to `main`, nothing went out.

### CF Pages git integration vs. `deploy.yml`

CF Pages git integration owns the frontend deploy. Don't add a
`wrangler pages publish` step to `deploy.yml` — the two systems will
race and the older one will sometimes win.

### Wrangler queues block disabled

The `queues` block in `wrangler.jsonc` is commented out (top-level

- `env.staging`) because Workers Free doesn't include Queues.
  Re-enable per the inline comment when Phase 9 lands and the project
  moves to Workers Paid.

### Env staging mirrors prod intentionally

Don't add a binding to one env block without the other. Drift makes
"works on staging, fails on prod" bugs nearly impossible to diagnose.

---

## Cross-references

| Doc       | Theme                  | Path                       |
| --------- | ---------------------- | -------------------------- |
| Vision    | Product / strategy     | [./VISION.md](./VISION.md) |
| **Build** | Engineering (this doc) | [./BUILD.md](./BUILD.md)   |
| Ship      | Launch / GTM           | [./SHIP.md](./SHIP.md)     |
| Run       | Ops / on-call          | [./RUN.md](./RUN.md)       |

For deeper dives, see the topical references this doc summarizes:

- [HOW-TO-DEPLOY.md](./HOW-TO-DEPLOY.md) — full self-host walkthrough
- [CLERK-PRODUCTION-SETUP.md](./CLERK-PRODUCTION-SETUP.md) — Clerk runbook
- [CF-PAGES-GIT-SETUP.md](./CF-PAGES-GIT-SETUP.md) — frontend deploy details
- [STORAGE.md](./STORAGE.md) — R2 logo dual-write
- [EMAIL.md](./EMAIL.md) — MailChannels candidate plan
- [THIRD-PARTY.md](./THIRD-PARTY.md) — Tawk.to via Zaraz
- [AUTOMATION-PLAN.md](./AUTOMATION-PLAN.md) — phased roadmap
- [PRD.md](./PRD.md) — feature inventory + routes + API contract

---

_Maintained alongside the codebase. When the architecture shifts —
new binding, new vendor, new CI gate — update this file in the same
PR. Drift is the enemy._
