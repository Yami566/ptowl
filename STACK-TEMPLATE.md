# Cloudflare-Managed Minimal SaaS — Stack Template

> Repo-agnostic recipe for bootstrapping a small SaaS on Cloudflare with
> as little custom infrastructure as possible. Pulled from the PTowl
> production setup; works for any product where the moving parts are
> "auth + DB + email + a public website."
>
> Paste the one-line prompt below into Claude/Copilot/Cursor in a new
> repo to scaffold this stack. PTowl ([MASTER.md](MASTER.md)) is the
> worked example.

---

## The one-line prompt

Paste this into your AI assistant of choice in an empty repo:

> Bootstrap a Cloudflare-managed minimal SaaS using this stack: React 19
> + Vite + React Router v7 frontend; Hono on Cloudflare Workers API;
> Cloudflare D1 for the database; Cloudflare R2 for blob storage;
> Cloudflare Web Analytics for traffic; Clerk for auth (custom domain);
> MailChannels for outbound transactional email; `ical-generator` if
> calendar export is in scope. CI/CD via GitHub Actions on push to `main`.
> Pnpm workspaces — `apps/web`, `apps/api`, `packages/shared`. Strict
> TypeScript. Lint + typecheck + unit tests + build all gate the deploy.
> Branch protection on `main`. CSP, HSTS, WAF, Bot Fight Mode, rate
> limiting all on. **Nothing custom that an off-the-shelf managed
> service can do.** Treat that as the prime directive — every time
> you'd write infrastructure code, find the managed service first.

---

## Prime directive: nothing custom

If you're about to write infrastructure code, stop and ask whether one
of these solves it instead:

| Need | First-choice managed service | Why this and not that |
| --- | --- | --- |
| Auth + OAuth + MFA | **Clerk** (custom domain) | Drop-in, JWKS-verifiable, MFA + social + email/password out of the box. Better than Auth0 for solo founders (pricing); better than Firebase Auth (no Google account lock-in); better than NextAuth (vendor-managed UI). |
| Database | **Cloudflare D1** | SQLite on the edge, free tier generous, Time Travel free 7d. Beats Postgres-on-Neon for write-light SaaS; beats hosted MySQL for cost; beats Firestore for queryability. |
| Object storage | **Cloudflare R2** | No egress fees (huge for image-heavy products). Beats S3 on egress; beats Cloudinary on price; beats GCS for same-network locality with Workers. |
| Outbound transactional email | **MailChannels** | Free for Workers; transactional only. If you need marketing too, fall back to Resend ($20/mo for 50K). Beats SES for setup time; beats SendGrid on price. |
| Inbound email | Forward to Gmail via CF Email Routing | Free, no app needed. Beats running an MX. |
| Payments | **LemonSqueezy** (MoR) | Handles sales tax + VAT for you. Stripe if pricing math gets weird. Skip until you have paying users. |
| Analytics | **Cloudflare Web Analytics** | First-party, no cookie banner, GDPR-friendly. Beats GA4 on simplicity; beats Plausible on price (free). |
| Error tracking | Cloudflare Workers Observability | Built into Workers. Sentry is overkill until traffic justifies it. |
| Bot/captcha | **Cloudflare Turnstile** | Free, no CAPTCHA images. Beats reCAPTCHA on UX. |
| CDN + DNS + WAF | Cloudflare (same account) | One pane of glass. Avoid the Route53/Cloudfront/WAF tri-vendor split. |
| Calendar export | `ical-generator` (npm) | RFC-5545 .ics with one library. No custom calendar code. |
| AI inference | Workers AI | Same-network, pennies/year for light use. Use the OpenAI API only for use cases CF doesn't support. |
| Search | Cloudflare Workers + D1 FTS5 | SQLite FTS works fine until thousands of rows. Algolia is overkill early. |
| Background jobs (light) | Cloudflare Cron Triggers | 15-min minimum cadence, free. Beats running a queue worker until volume forces it. |
| Background jobs (heavy) | Cloudflare Queues | Needs Workers Paid ($5/mo). Defer until you measure the need. |
| CI/CD | GitHub Actions | Free for public repos, plenty for private. Avoid CircleCI / Jenkins for solo work. |
| Status page | Upptime (GH Pages) | Free, GitHub-hosted, ~10 min setup. |
| Live chat | Cloudflare Zaraz + Tawk.to | Skip until ≥10 users actually ask questions. |

---

## Stack baseline

`apps/api/package.json` minimum runtime deps:

```json
{
  "hono": "^4",
  "jose": "^5",
  "ical-generator": "^7"
}
```

Dev-deps: `wrangler@^4`, `vitest`, `typescript@^5.7`, `@cloudflare/workers-types`.

`apps/web/package.json` minimum runtime deps:

```json
{
  "react": "^19",
  "react-dom": "^19",
  "react-router": "^7",
  "@clerk/clerk-react": "^5",
  "@tanstack/react-query": "^5"
}
```

Dev-deps: `vite@^7`, `typescript@^5.7`, `eslint`, `prettier`.

`packages/shared/package.json` for types + zod schemas + constants
shared between web and api.

---

## Repo scaffold

```
.
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts            # Hono app + scheduled() + queue()
│   │   │   ├── routes/             # one file per resource
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts         # Clerk JWT verify
│   │   │   │   └── ...
│   │   │   ├── services/           # business logic, no Hono dependency
│   │   │   ├── crypto/             # AES-GCM helpers
│   │   │   ├── types/env.ts        # Env interface
│   │   │   └── migrations/         # D1 migrations
│   │   └── wrangler.jsonc
│   └── web/
│       ├── src/
│       │   ├── main.tsx            # ClerkProvider + Router
│       │   ├── App.tsx             # routes
│       │   ├── pages/
│       │   ├── components/
│       │   ├── contexts/
│       │   ├── hooks/
│       │   └── styles/
│       ├── public/
│       │   ├── _headers            # CSP + HSTS + COOP
│       │   └── site.webmanifest
│       ├── index.html
│       └── wrangler.jsonc
├── packages/shared/
│   └── src/
│       ├── types.ts
│       ├── schemas.ts              # zod
│       └── constants.ts
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
├── docs/
│   ├── VISION.md
│   ├── BUILD.md
│   ├── SHIP.md
│   ├── RUN.md
│   └── OPERATING.md
├── MASTER.md
├── STACK-TEMPLATE.md
├── README.md
└── pnpm-workspace.yaml
```

---

## Cloudflare bindings (wrangler.jsonc) baseline

```jsonc
{
  "name": "<your-app>-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-12-01",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },
  "triggers": { "crons": ["*/15 * * * *"] },
  "d1_databases": [{
    "binding": "DB",
    "database_name": "<your-app>-db",
    "database_id": "<from wrangler d1 create>",
    "migrations_dir": "src/migrations"
  }],
  "r2_buckets": [{ "binding": "BLOBS", "bucket_name": "<your-app>-blobs" }],
  "ai": { "binding": "AI" },
  "vars": {
    "ENVIRONMENT": "production",
    "FRONTEND_URL": "https://<your-domain>",
    "CLERK_FRONTEND_API_URL": "https://clerk.<your-domain>"
  },
  "routes": [
    { "pattern": "<your-domain>/api/*", "zone_name": "<your-domain>" }
  ]
}
```

Secrets to set (`wrangler secret put NAME`):

- `JWT_SECRET` — 64-char hex.
- `EMAIL_API_KEY` — MailChannels.
- `EMAIL_ENCRYPTION_KEY` — base64 32 bytes for AES-GCM (don't rotate after first
  use; loss = unreadable encrypted columns).
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile server key.

---

## CI/CD baseline

`.github/workflows/deploy.yml` runs on push to `main`:

1. Setup pnpm + Node 22 + restore cache.
2. `pnpm install --frozen-lockfile`.
3. `pnpm -r typecheck` — gate.
4. `pnpm test:unit` — gate.
5. `pnpm build` — gate.
6. `wrangler d1 migrations apply <db> --remote` — idempotent.
7. `wrangler deploy` (in `apps/api`).
8. `wrangler deploy` (in `apps/web`) — optional fallback if CF Workers Builds
   is also running.

Each step blocks the next on failure. Wrangler steps never fire on broken code.

GitHub secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

---

## Security baseline (`apps/web/public/_headers`)

Pin these from day one — adding them later is harder than starting strict:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Content-Security-Policy: default-src 'self'; ...
```

CSP allowlist for the recommended stack:

- `script-src` — `'self'`, `https://challenges.cloudflare.com` (Turnstile),
  `https://static.cloudflareinsights.com` (Web Analytics), Clerk domains.
- `connect-src` — `'self'`, `https://cloudflareinsights.com`, Clerk API,
  Clerk telemetry.
- `frame-src` — `'self'`, Clerk (for any Clerk-hosted modal), Turnstile.
- `frame-ancestors 'none'` — prevent click-jacking.
- `object-src 'none'`.

Branch protection on `main`: PR required, ≥1 approver, all status checks must pass.

---

## Launch checklist (any product on this stack)

- [ ] Cloudflare account created, domain transferred to CF DNS.
- [ ] `wrangler d1 create <name>` + capture the database ID into wrangler.jsonc.
- [ ] `wrangler r2 bucket create <name>`.
- [ ] Clerk account, application created, custom domain CNAMEd.
- [ ] MailChannels account, API key generated, DNS SPF/DKIM/Domain-Lockdown set.
- [ ] All secrets set via `wrangler secret put`.
- [ ] GitHub repo with `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets.
- [ ] Branch protection on `main` (PR + 1 review + status checks).
- [ ] CSP + security headers in `_headers`.
- [ ] CF Web Analytics enabled + token pasted into `index.html`.
- [ ] First deploy from `main` succeeds end-to-end.
- [ ] Smoke test: sign in, hit one authed endpoint, check observability tab.
- [ ] Status page (Upptime fork) pointed at the new domain. Optional but cheap.

---

## When to break the rules

This template assumes "small SaaS, solo founder, pre-PMF." If you hit any of
these, revisit the choices:

- **>1M req/day** — re-evaluate Workers cost; Cloudflare-Workers is still
  cheap, but D1 may need partitioning.
- **>10GB hot data** — D1 row limits matter; consider Hyperdrive + Postgres.
- **Heavy file processing** — Workers' 30s CPU limit forces queues +
  Containers or moving the work to a real backend.
- **HIPAA / SOC 2 / regulated data** — Cloudflare can do this, but only on the
  Enterprise plan with BAA. Consider whether your product really needs to store
  the regulated data at all (PTowl chose "no" — see VISION.md).
- **Team > 3 engineers** — Cloudflare's local dev story (`wrangler dev`) is
  fine but not great at scale; consider whether worktrees + Docker compose
  pays off.

---

## Reference implementation

[PTowl](https://github.com/Yami566/ptowl) is the worked example. Its
[MASTER.md](MASTER.md) is what this template generates for a specific product.
[docs/VISION.md](docs/VISION.md) shows how to write the "what & for whom"
that sits one layer above this operational stack.
