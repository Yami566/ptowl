# PTowl production launch runbook

Single-source checklist for everything that needs to be configured outside
the codebase (Cloudflare dashboard, Firebase Console, GitHub repo settings).
All free-tier features. No new custom code anywhere.

Status legend: ☐ pending · ☑ done

---

## 1. Reliability layer (Cloudflare dashboard, ~5 min)

### 1a. Web Analytics — privacy-friendly traffic + Core Web Vitals

☐ <https://dash.cloudflare.com> → Analytics & Logs → Web Analytics →
**Add a site** → enter `ptowl.com` → Save. Auto-injects beacon at the
edge (no script tag, no GDPR banner needed). Dashboard shows page
views, top pages, LCP/CLS/INP.

### 1b. Health Checks — alerts on uptime

☐ <https://dash.cloudflare.com> → Account home → Notifications (or
Traffic → Health Checks if your account exposes it). Create check:

| Field           | Value                                |
| --------------- | ------------------------------------ |
| Hostname        | `ptowl.com`                          |
| Path            | `/api/v1/health`                     |
| Method          | `GET`                                |
| Expected status | `200`                                |
| Expected text   | `"ok":true` (response body contains) |
| Frequency       | `60 sec`                             |
| Retries         | `2`                                  |
| Notification    | Email — your address                 |

Result: an email arrives if `ptowl.com/api/v1/health` returns non-200
or fails to respond for 2 consecutive checks (~3 min).

### 1c. Worker error notifications

☐ <https://dash.cloudflare.com> → Notifications → **Add** → search
"Workers" → pick "Workers Errors". Set threshold (e.g., 50 errors in
5 min) and notification destination (your email). Saves you from
having to scrape logs to know if the API is throwing.

### 1d. Public status page (Upptime via GitHub — free)

Upptime is a GitHub-Actions-based static status page. Runs cron, hits
your health URL, builds a public site at `status.ptowl.com`. Zero
custom code — it's a fork-and-configure tool.

☐ Go to <https://github.com/upptime/upptime> → click **Use this
template** → name your new repo `ptowl-status` → Public → Create.
☐ Edit `.upptimerc.yml` in the new repo:

```yaml
owner: Yami566
repo: ptowl-status
sites:
  - name: PTowl
    url: https://ptowl.com/api/v1/health
status-website:
  cname: status.ptowl.com
```

☐ Settings → Pages → Source: GitHub Actions
☐ DNS: Cloudflare → ptowl.com zone → DNS → Records → +Add

- Type CNAME, Name `status`, Target `Yami566.github.io`, Proxied
  ☐ Wait ~10 min. Visit `status.ptowl.com`. Public uptime + history.

---

## 2. Security/abuse (Cloudflare dashboard, ~3 min)

### 2a. WAF Managed Rules (free)

☐ <https://dash.cloudflare.com> → ptowl.com zone → Security → WAF →
Managed rules → toggle **"Cloudflare Free Managed Ruleset"** ON.
Blocks SQLi, XSS, common CVE attempts at the edge.

### 2b. Bot Fight Mode

☐ Same path → Security → Bots → toggle **"Bot Fight Mode"** ON.
Auto-challenges scrapers and obvious bots. Turn off if it
false-positives a legitimate integration (no known issues yet).

### 2c. Rate Limiting on /api/\*

☐ Security → WAF → **Rate limiting rules** → Create rule:

| Field               | Value                                           |
| ------------------- | ----------------------------------------------- |
| Rule name           | `api-burst-protection`                          |
| Field to match      | URI Path                                        |
| Operator            | `starts with`                                   |
| Value               | `/api/`                                         |
| Requests per period | `100`                                           |
| Period              | `1 minute`                                      |
| Action              | `Block` (or `Managed Challenge` to be friendly) |
| Duration            | `10 minutes`                                    |

Blocks brute-force on `/api/v1/auth/*` and scrape attacks on
`/api/v1/schedules`. Free tier covers 10K rule executions/month.

### 2d. SSL/TLS hardening (verify, don't break)

☐ SSL/TLS → Overview → Encryption mode = **"Full (Strict)"** (not
Flexible). Cloudflare → Origin uses TLS, browser → Cloudflare uses
TLS. Most secure default for any backend served over HTTPS.

☐ SSL/TLS → Edge Certificates → toggle **"Always Use HTTPS"** ON.

---

## 3. Operational hygiene

### 3a. Dependabot (committed in this branch — `.github/dependabot.yml`)

Auto-opens PRs when:

- Any npm dep has a security advisory
- Any npm dep has a minor/patch version available (grouped weekly)
- Any GitHub Action has a new version (monthly)

PRs land tagged `dependencies` and gated by your CI. None auto-merge —
you review and merge. View at
<https://github.com/Yami566/ptowl/security/dependabot>.

### 3b. Cloudflare Workers versioning + gradual deploys

Wrangler v4 (just upgraded) supports `wrangler versions upload` to
ship a new version _without_ serving it, then `wrangler versions
deploy` to roll it out gradually (e.g., 25% → 100%).

For the API Worker, the manual gradual flow is:

```bash
# from apps/api/
npx wrangler versions upload          # uploads, doesn't serve
npx wrangler versions deploy 25       # 25% of traffic on new version
# observe metrics for 5 min
npx wrangler versions deploy 100      # full rollout
```

Or rollback instantly:

```bash
npx wrangler rollback                 # previous version, full traffic
```

The CI deploy still uses `wrangler deploy` (instant 100%) for now —
intentional, since the alternative is manual checkpointing every
deploy. Use the gradual flow manually for major API changes.

---

## 4. Firebase production-readiness (if not already done)

☐ <https://console.firebase.google.com/project/ptowl-bdfbe/authentication/settings>

- Authorized domains contains `ptowl.com` and `www.ptowl.com`
- Email/Password provider enabled with **Email link** sub-toggle ON

☐ Firebase project on **Spark** plan supports passwordless email-link
sign-in for free. No billing change needed unless you re-enable phone
auth at scale.

☐ <https://console.firebase.google.com/project/ptowl-bdfbe/usage/details>

- Set quota alerts at 80% and 100% (email)

---

## 5. Verification (10-min smoke test)

After all the above, run through:

☐ Visit https://ptowl.com/ — see polished landing + city scene + PTOWL
wordmark + email sign-in form
☐ Sign in with email → magic link → `/dashboard`
☐ Create a schedule via preset (5 keypresses)
☐ Open the schedule → print preview shows clinic info + alias
☐ Hit `/nonexistent` — owl 404 with `[Home]` + `[Back to Dashboard]`
☐ Open devtools → Console → no red errors
☐ Visit https://status.ptowl.com — green
☐ Force a 500 by hitting an unauthenticated `/api/v1/me` → CF
notification arrives within 2 min

---

## What's intentionally NOT in this runbook

- LemonSqueezy / payments — Phase 2, deferred
- SMS reminders (Telnyx) — Phase 2, deferred (email reminders work)
- Sentry — deferred; CF Workers Logs cover error tracking for now
- App Check — deferred; Bot Fight Mode + Rate Limiting cover abuse
- CodeQL — earlier removal stays; can re-add after enabling Code
  Scanning in repo settings

---

## What to do when something breaks

| Symptom                          | First check                                    |
| -------------------------------- | ---------------------------------------------- |
| ptowl.com 5xx                    | Workers logs in CF dashboard (real-time tail)  |
| Sign-in fails with auth/internal | Firebase Console → Authentication → Providers  |
| Build fails on push              | Actions tab → click failed run → expand step   |
| Slow API responses               | Workers Analytics → CPU time / errors          |
| User reports missing schedule    | D1 Console → query `schedules` for their alias |
| Need to rollback a bad deploy    | `wrangler rollback` from `apps/api/`           |
| Need to rollback the frontend    | CF Pages → Deployments → previous → Promote    |

---

## After everything above is checked off

You're production-ready. Tell paying users about ptowl.com confidently.
