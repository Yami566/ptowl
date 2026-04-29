# Cloudflare Pages git integration setup

This replaces the GitHub Actions frontend deploy with Cloudflare's native
git integration. After setup, every push to `main` auto-deploys the
frontend to ptowl.com without GitHub Actions involvement. The API Worker

- D1 migrations stay in `deploy.yml` (Cloudflare doesn't run wrangler
  migrations natively).

Why: GH Actions deploys have been silently failing for every push back
to run #1. CF Pages git integration cuts out that dependency for the
frontend, which is the most visible part of the site.

---

## One-time setup (do this in your browser, ~5 minutes)

### Step 1 — Open the Pages project

1. Go to <https://dash.cloudflare.com>
2. Workers & Pages (left sidebar) → click the project named `ptowl`

### Step 2 — Connect to Git (if not already)

1. Click **Settings** tab at the top
2. Scroll to **Builds & deployments**
3. Look at "Source" field:
   - If it says **"Connected to GitHub"** with `Yami566/ptowl` listed:
     skip to Step 3 — git is already connected, the issue is build config.
   - If it says **"Direct Upload"** or has a `Connect to Git` button:
     click that button. Authorize the Cloudflare GitHub App if prompted
     (click `Install & Authorize`). Pick `Yami566/ptowl`. Click Continue.

### Step 3 — Configure build settings

In **Settings → Builds & deployments → Build configurations** click
`Edit configurations` and set EXACTLY:

| Field                  | Value                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| Production branch      | `main`                                                             |
| Build command          | `pnpm install --frozen-lockfile && pnpm --filter @ptowl/web build` |
| Build output directory | `dist`                                                             |
| Root directory         | `apps/web`                                                         |
| Build system version   | `v3` (default)                                                     |
| Node version (env var) | `20` (set under Environment variables, name: `NODE_VERSION`)       |

Click **Save**.

### Step 4 — Add required environment variable

Still in **Settings → Environment variables** (Production scope):

| Name                      | Value                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `NODE_VERSION`            | `20`                                                                                                                  |
| `VITE_TURNSTILE_SITE_KEY` | (the Turnstile site key you already use in production — copy from your existing Pages env or the Turnstile dashboard) |

Save.

### Step 5 — Trigger a deploy

Two ways:

**A. Trigger from CF dashboard (recommended for first test):**

1. Click **Deployments** tab
2. Click **Retry deployment** on the most recent entry, or
3. Click **Create deployment** → pick `main` branch → Deploy

**B. Trigger via push:**

- Just push any commit to main. CF will pick it up within ~30 seconds.

Watch the deployment status in the Deployments tab. Build logs appear
in real time (click the running deployment).

### Step 6 — Verify

Once the deployment shows **"Success"**:

```
curl -s https://ptowl.com/ | grep "Stop scheduling"
```

Should return the new headline. If yes, frontend is live.

---

## What this changes about deploy.yml

After CF Pages git integration is working, the `Deploy Frontend to
Cloudflare Pages` step in `deploy.yml` becomes redundant — CF is doing
that part. We remove just that step from `deploy.yml`. The remaining
steps (D1 migrations + API Worker deploy) keep firing on push.

This commit (the one creating this doc) also strips the Pages-deploy
step from `deploy.yml` so we don't have two systems trying to deploy
the same frontend.

---

## Troubleshooting

### "Build command failed: pnpm: not found"

CF's default build environment may not have pnpm. Solutions in order:

1. Add an environment variable `PNPM_VERSION` = `9`. CF auto-installs it.
2. Or change build command to:
   ```
   npm install -g pnpm@9 && pnpm install --frozen-lockfile && pnpm --filter @ptowl/web build
   ```

### "Build output directory does not exist"

The `dist` is relative to `Root directory` (`apps/web`). So CF looks at
`apps/web/dist`. That's where vite outputs. If still failing, double
check the build command actually ran `pnpm --filter @ptowl/web build`
(not just `pnpm build` which builds all workspaces).

### Build succeeds but ptowl.com still shows old content

- Check **Settings → Custom domains** — `ptowl.com` should be listed.
- If it's pointing to the wrong Pages deployment, click **Deployments**,
  find the latest successful one, click `...` → `Promote to production`.

### "Not authorized" on the GitHub side

The Cloudflare Pages GitHub app needs read access to `Yami566/ptowl`.
Open <https://github.com/settings/installations> → find Cloudflare
Pages → click Configure → grant `Yami566/ptowl` repo access.

---

## API Worker + D1 migrations stay in GitHub Actions

CF Pages git integration only handles the static frontend. The API
Worker (`apps/api`) and D1 migrations still deploy via `deploy.yml`. If
they're also failing, that's a separate fix once we see the actual
wrangler error log.

When CF Pages is working, you'll know GH Actions failing isn't blocking
production frontend updates anymore — only the API + DB updates are
gated on it.
