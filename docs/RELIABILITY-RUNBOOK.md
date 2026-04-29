# Reliability runbook

Goal: keep ptowl.com responsive enough that users never notice. Nothing is
truly "never goes down," but we can stack defenses so an outage requires
multiple things to fail simultaneously.

All four layers below are **dashboard-configured** (no code changes). Items
marked _CHECK_ are confirmations of state already paid for; items marked
_SET UP_ need a one-time configuration.

---

## Layer 1 — What Cloudflare already gives us for free

_CHECK_ once after the polish PR merges:

1. **Pages multi-region edge serving.** Static assets and Pages Functions
   serve from every Cloudflare PoP. No config; just confirm the project at
   Cloudflare → Workers & Pages → ptowl shows recent successful deployments.
2. **Workers global deployment.** API runs at the edge worldwide.
   Cloudflare → Workers & Pages → ptowl-api should show "Active" in
   multiple regions.
3. **D1 30-day point-in-time recovery (PITR).** Restores up to 30 days back.
   Confirm at Cloudflare → Storage & Databases → D1 → ptowl-db → Time Travel.
   No-code restore: pick a timestamp, click Restore.
4. **Pages instant rollback.** Last 20 deploys are kept and reversible.
   Each deployment in the Pages dashboard has a "Rollback" button.

---

## Layer 2 — Active monitoring (3 dashboard tasks)

_SET UP_ each once. All free.

### 2a. Cloudflare Health Checks → email alert on outage

1. Cloudflare → Traffic → Health Checks → **Create**.
2. Name: `ptowl-prod-health`.
3. Hostname: `ptowl.com`.
4. Path: `/api/v1/health` (the API already exposes this — returns DB latency
   + connection status).
5. Interval: **60 s**. Retries before alert: **2 consecutive fails**.
6. Expected codes: `200`.
7. Notification → Email → enter your email → Save.

Effect: you get an email within ~3 minutes of any outage and another when
the site recovers. Free up to 25 health checks per zone.

### 2b. Cloudflare Web Analytics

1. Cloudflare → Analytics & Logs → Web Analytics.
2. Click your `ptowl.com` site → **Enable**.
3. No script tag needed (auto-injected at the edge).

Effect: page views, Core Web Vitals (LCP / INP / CLS), top pages, top
referrers. Privacy-first, cookieless. Visible in the same dashboard.

### 2c. Workers Logpush → R2 (optional but cheap)

1. Cloudflare → R2 → Create bucket: `ptowl-logs`.
2. Cloudflare → Workers & Pages → ptowl-api → Logs → **Create Logpush job**.
3. Destination: R2 bucket `ptowl-logs`. Sample rate: 100% (free tier OK at
   our volume).

Effect: every Worker request gets a structured log line in R2 — debug
production issues by querying R2 with a SQL-like tool like
[Vercel Log Drains alt](https://developers.cloudflare.com/logs/log-fields/).

---

## Layer 3 — Notifications (one dashboard task)

_SET UP_ once.

1. Cloudflare → Notifications → **Add**.
2. Type: **Workers Errors** → Select `ptowl-api` → email.
3. Repeat for **Pages Build Failures** → Select `ptowl` → email.
4. Repeat for **D1 Errors** → Select `ptowl-db` → email.

Effect: silent build failures or production exception spikes hit your
inbox before users complain.

---

## Layer 4 — Public status page

Two free options:

### Option A: Upptime (recommended — free, GitHub-hosted, zero infra)

1. Fork <https://github.com/upptime/upptime> as `Yami566/ptowl-status`.
2. Edit `.upptimerc.yml`:
   ```yaml
   owner: Yami566
   repo: ptowl-status
   sites:
     - name: PTowl Web
       url: https://ptowl.com
     - name: PTowl API
       url: https://ptowl.com/api/v1/health
   notifications:
     - type: email
       to: nurelimusabay@gmail.com
   ```
3. GitHub Actions runs every 5 min, pings both URLs, generates a static
   status site at `https://yami566.github.io/ptowl-status`.
4. Point `status.ptowl.com` (CNAME → `yami566.github.io`) at it via the
   Cloudflare DNS dashboard. The footer "Status" link on the site already
   targets `status.ptowl.com`.

### Option B: Cloudflare-hosted single-page status

1. Create a separate Cloudflare Pages project: `ptowl-status`.
2. Drop a single `index.html` showing live health-check status pulled from
   a Worker that reads CF Health Checks API.
3. Wire `status.ptowl.com` to the Pages project.

Option A is simpler and free forever. Recommended.

---

## Rollback runbook

If something is broken in production and you need to revert NOW:

### Pages (frontend) — < 30 seconds

```
Cloudflare → Workers & Pages → ptowl → Deployments
→ Find the last known-good deployment (timestamp before the bad one)
→ click "Rollback" → confirm.
```

That's it. Edge propagates in seconds.

### Workers (API) — < 60 seconds

```
Cloudflare → Workers & Pages → ptowl-api → Deployments
→ Find the last known-good version
→ click "..." → "Promote to active".
```

OR via wrangler if you have it locally:

```
cd apps/api
wrangler deployments list
wrangler deployments rollback <deployment-id>
```

### D1 (database) — < 5 minutes

For an accidentally-applied migration or a bad data write:

```
Cloudflare → Storage & Databases → D1 → ptowl-db → Time Travel
→ Pick a timestamp before the incident
→ Restore.
```

Data writes between the chosen timestamp and now will be lost. PITR is
30-day window.

### "Everything is broken" — full revert

```
git revert <bad-commit-sha> --no-edit
git push origin main
```

That triggers a fresh deploy from the reverted state via deploy.yml.

---

## After this PR merges, do these 4 things in order

(estimated 10 min total)

1. ☐ **Confirm CI green** on the polish PR before merge.
2. ☐ **Squash and merge** the PR. Watch GitHub Actions run deploy.yml until
   it goes green (~2 min).
3. ☐ **Walk the smoke-test checklist** in
   [docs/RELEASE-polish-post-hotfix.md](RELEASE-polish-post-hotfix.md).
4. ☐ **Set up Layer 2 + Layer 3** (Health Check + Notifications + Web
   Analytics, ~5 min). Skip Logpush and Status Page for now if short on
   time — add later.

Layer 4 (status page) and the deferred Sentry / confirm-modal / search
features can land in follow-up PRs.

---

## What this runbook does NOT cover

- **DDoS protection** is automatic on Cloudflare's free tier. No action.
- **WAF rules** can be added via Cloudflare → Security → WAF. Default rules
  are sensible; only customize if you see specific abuse patterns.
- **True zero-downtime via a hot standby region** would require a second
  Cloudflare account or a different stack — not warranted for current
  traffic.
- **Self-serve account deletion** still goes through the
  `mailto:help@ptowl.com` path documented in Privacy. Building a real
  endpoint is a future-round code task.
