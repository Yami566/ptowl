# How to deploy your own PTowl

Step-by-step self-host walkthrough. Lands a working PTowl instance
on your own Cloudflare account in ~15 minutes. AGPL-3.0 means anyone
can do this; community deployment is a first-class use case for the
project.

## What you'll end up with

- `your-domain.com` serving the React frontend (Cloudflare Workers
  Static Assets)
- `your-domain.com/api/*` serving the Hono API Worker
- A Cloudflare D1 database (SQLite at the edge) for clinic +
  schedule storage
- A Cloudflare R2 bucket for clinic logos
- Clerk handling sign-in (email/password + Google)
- Total cost on free tiers: **$0/month** up to ~10,000 monthly
  active users

## Prerequisites

| Account                   | Needed for                                                                     | Free?                          |
| ------------------------- | ------------------------------------------------------------------------------ | ------------------------------ |
| GitHub                    | Forking the repo                                                               | ✅ Free                        |
| Cloudflare                | Workers, D1, R2, DNS                                                           | ✅ Free tier covers everything |
| Clerk                     | Authentication                                                                 | ✅ Free up to 10K MAU          |
| Domain registrar          | If you want a custom domain (skip if you'll use a Workers `*.workers.dev` URL) | ~$10/yr typically              |
| Local Node.js 22 + pnpm 9 | Running `wrangler` for setup                                                   | ✅ Free, one-time install      |

## Step 1 — Fork the repo

Click **Fork** on <https://github.com/Yami566/ptowl>. Or use the
[Deploy to Cloudflare button](https://deploy.workers.cloudflare.com/?url=https://github.com/Yami566/ptowl)
in the main README, which forks + deploys in one click.

If you forked manually:

```bash
git clone https://github.com/<your-username>/ptowl.git
cd ptowl
pnpm install
```

## Step 2 — Create your Cloudflare resources

These are one-time creates. After this you never touch them again.

```bash
# Workers Paid is optional; free tier works for everything below
cd apps/api

# Create the D1 database (will print the database_id)
npx wrangler d1 create ptowl-db

# Create the R2 bucket for clinic logos
npx wrangler r2 bucket create ptowl-logos
```

Paste the `database_id` from the D1 create output into
`apps/api/wrangler.jsonc` under the `d1_databases.database_id` field.

## Step 3 — Set Cloudflare secrets

The API Worker needs a few secrets. Create each one with
`wrangler secret put` (you'll be prompted for the value):

```bash
cd apps/api

# Random 64-char hex for JWT signing
npx wrangler secret put JWT_SECRET

# Email used for admin notifications (your address)
npx wrangler secret put ADMIN_EMAIL

# (Future) outbound email API key — leave blank for now
npx wrangler secret put EMAIL_API_KEY

# Random base64 32-byte key for AES-GCM encryption of patient emails
npx wrangler secret put EMAIL_ENCRYPTION_KEY

# Cloudflare Turnstile secret key (sign up at dash.cloudflare.com/?to=/:account/turnstile)
npx wrangler secret put TURNSTILE_SECRET_KEY
```

Tip for the random secrets: run
`openssl rand -hex 32` for `JWT_SECRET` and
`openssl rand -base64 32` for `EMAIL_ENCRYPTION_KEY`.

## Step 4 — Set up Clerk

1. Create a free account at <https://dashboard.clerk.com>.
2. Create a new application called "PTowl" (or whatever you like).
3. On the **API Keys** page, copy the **Publishable key** (starts
   with `pk_test_…` for a development instance, or `pk_live_…` for
   a production instance with custom domain).
4. Open `apps/web/src/main.tsx` and replace the baked-in publishable
   key with **your own**. Search for the `CLERK_PUBLISHABLE_KEY`
   constant — currently `pk_live_Y2xlcmsucHRvd2wuY29tJA` (the
   upstream PTowl production key, which won't work for your fork).
   You can also leave the baked-in alone and instead set
   `VITE_CLERK_PUBLISHABLE_KEY` in your Cloudflare Pages env vars;
   the env var takes precedence.
5. The Clerk **frontend API URL** is encoded in your publishable
   key — base64-decode the part after `pk_test_` or `pk_live_` to
   read it. Update `apps/api/wrangler.jsonc` `vars.CLERK_FRONTEND_API_URL`
   in BOTH places (production env block + base block) to
   `https://<your-decoded-host>`. Examples:
   - Dev instance: `https://lively-tiger-12.clerk.accounts.dev`
   - Production w/ custom domain: `https://clerk.<your-domain>.com`
6. In Clerk dashboard → **User & Authentication** → enable Email +
   Google sign-in providers.
7. **If you use a custom domain (production instance):** also update
   the CSP in `apps/web/public/_headers` to allowlist your Clerk
   custom-domain hosts. Search the CSP for `clerk.ptowl.com` and
   `accounts.ptowl.com` — replace those with your equivalents in all
   six CSP directives (script-src, style-src, font-src, img-src,
   connect-src, frame-src). If you skip this, the SignIn widget
   will silently fail to render in production.

## Step 5 — Apply database migrations

```bash
cd apps/api
npx wrangler d1 migrations apply ptowl-db --remote
```

This creates the `users`, `schedules`, `appointments`, `templates`,
`profiles`, `audit_log` tables and applies all schema changes.

## Step 6 — Deploy the API Worker

```bash
cd apps/api
npx wrangler deploy
```

You'll get a URL like `https://ptowl-api.<your-cf-account>.workers.dev`.
Test it: `curl <that-url>/api/v1/health` should return
`{"ok":true,"data":{"status":"healthy",...}}`.

## Step 7 — Deploy the frontend

The frontend deploys via Cloudflare Workers Builds (git integration).
On the Cloudflare dashboard:

1. Go to **Workers & Pages**.
2. **Create application** → **Connect to Git**.
3. Pick your forked repo.
4. Set:
   - Build command: `pnpm install --no-frozen-lockfile && pnpm --filter @ptowl/web build`
   - Build output directory: `apps/web/dist`
   - Root directory: `/`
5. Add environment variables:
   - `VITE_CLERK_PUBLISHABLE_KEY` = your `pk_test_…`
6. **Save and Deploy**.

After the first deploy completes, you'll have a URL like
`https://your-app.workers.dev`. Visit it and confirm the Clerk
sign-in widget renders.

## Step 8 — Custom domain (optional)

If you registered a domain (e.g., `myclinic.com`):

1. Add it as a Cloudflare zone (free) and point your registrar's
   nameservers at Cloudflare's.
2. Cloudflare dashboard → your `ptowl-api` Worker → **Settings** →
   **Triggers** → **Custom domains** → add `myclinic.com/api/*`.
3. Same for the frontend Worker → add `myclinic.com`.
4. Update `apps/api/wrangler.jsonc` `routes` to point at your domain.
5. Update Clerk → **User & Authentication** → **Domains** → add
   `myclinic.com` so Clerk accepts auth requests from your origin.
6. Push to your forked repo's `main` branch — Cloudflare Workers
   Builds redeploys automatically.

## Step 9 — Verify end-to-end

1. Open your domain in a fresh incognito window.
2. Sign up via Clerk (email or Google).
3. Land on `/dashboard`.
4. Press `1` to open the keyboard wizard, or `2` for a preset.
5. Type two letters for patient initials (`JS`).
6. Press Enter. Schedule generated.
7. Click **Print** to verify the print layout.
8. Click **Share → Send to patient** to mint a `/p/:token` URL.
9. Visit that URL on your phone. Mobile patient view renders.

If any step fails, check the Cloudflare Workers logs (Real-time tail
in the dashboard) and the browser DevTools console.

## What's automatically protected

Cloudflare provides several behaviors out of the box that we don't
need to build:

- **D1 point-in-time recovery (PITR)** — automatic 7-day retention
  on the free tier, 30 days on paid. Restore via
  `wrangler d1 time-travel restore ptowl-db --timestamp <ISO-8601>`.
- **Edge security** — the `cf-bootstrap.yml` workflow
  (.github/workflows/cf-bootstrap.yml) configures WAF, Bot Fight
  Mode, Rate Limiting, Worker Errors notifications, and Web
  Analytics via the Cloudflare API. Trigger it once after first
  deploy via GitHub Actions UI; it's idempotent.
- **TLS** — Cloudflare auto-provisions and renews certs for any
  zone you add.
- **DDoS protection** — included on the free plan, no setup.

## Updating from upstream

When the main PTowl project ships new features, pull them in:

```bash
git remote add upstream https://github.com/Yami566/ptowl.git
git fetch upstream
git merge upstream/main
git push origin main
```

Cloudflare Workers Builds picks up the push and redeploys
automatically.

## License compliance reminder

PTowl is AGPL-3.0. If you run a modified version as a public service
(SaaS), the license requires you to publish the source of your
modifications to your users. The unmodified upstream version doesn't
trigger this — you're free to self-host without redistribution
obligations as long as you don't change the code.

If AGPL is incompatible with your situation, email us at
help@ptowl.com about a commercial license.

## Help

- Open issues at <https://github.com/Yami566/ptowl/issues> (after
  the repo flips public).
- Or email help@ptowl.com.
