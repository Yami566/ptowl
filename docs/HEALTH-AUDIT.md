# PTOwl Health Audit — 2026-05-13

> Snapshot of production state across SEO, accessibility, performance, security, and content. Captured during a focused audit session at the end of launch-readiness work.
>
> Findings classified as:
>
> - 🟢 **Pure copy / content edit** — low risk, can ship same-day
> - 🟡 **Config or CSS tweak** — low risk, medium effort
> - 🔴 **Needs new code / architectural** — deferred for explicit decision

---

## Executive summary

**Production is healthy.** Site loads in <200ms, all security headers present, API auth gating works, calendar export rejects bad tokens correctly, sitemap exists, robots.txt is being served (with a bug — see below).

**Top 5 fixable items**:

| #   | Finding                                                                                | Severity | Action                                                                                 |
| --- | -------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| 1   | `site.webmanifest` still said `PTowl` (not `PTOwl`) — out of sync with rebrand         | 🟢       | **FIXED in this PR**                                                                   |
| 2   | `/robots.txt` was Cloudflare-managed and being served with the SPA HTML appended       | 🟡       | **FIXED in this PR** — static `apps/web/public/robots.txt` added; overrides CF managed |
| 3   | All routes return identical SPA shell with same `<title>` and meta — SEO sees one page | 🔴       | Per-route SSR or prerender. Deferred.                                                  |
| 4   | Meta description is 186 chars (Google SERP truncates at ~160)                          | 🟢       | Trim ~26 chars. Small copy edit.                                                       |
| 5   | Bundle: `index.js` is 502 KB minified (post-vite-7 chunking fix)                       | 🟡       | Could route-split LandingPage. Medium effort.                                          |

---

## Section A — Live page audit

All 8 public routes return 200. Response bodies are identical (same SPA shell — 6,907 bytes). React Router takes over client-side. Per-page titles are set by `usePageTitle()` after hydration.

| Path               | HTTP | TTFB   | Bytes | Notes                                             |
| ------------------ | ---- | ------ | ----- | ------------------------------------------------- |
| `/`                | 200  | 159 ms | 6,907 | Landing                                           |
| `/about`           | 200  | 113 ms | 6,907 | Same SPA shell                                    |
| `/accounts/signin` | 200  | 48 ms  | 6,907 | Same SPA shell — title not differentiated for SEO |
| `/accounts/signup` | 200  | 56 ms  | 6,907 | Same SPA shell                                    |
| `/privacy`         | 200  | 64 ms  | 6,907 | Same SPA shell                                    |
| `/terms`           | 200  | 64 ms  | 6,907 | Same SPA shell                                    |
| `/security`        | 200  | 66 ms  | 6,907 | Same SPA shell                                    |
| `/p/<malformed>`   | 200  | 47 ms  | 6,907 | Error state handled client-side                   |

**Friction observations:**

- 🔴 **One-shell SEO problem**: search crawlers see the same `<title>` and `<meta description>` for every URL. The `<link rel="canonical">` always points at `https://ptowl.com/` (root) too. Fix needs SSR or prerender — bigger lift, defer for now.
- 🟢 **Meta description too long**: 186 chars > Google's ~160 char truncate. Trim suggestion: `Built for therapy clinics — PT, OT, SLP, chiro, mental-health, dental hygiene. Recurring patient schedules in 5 keypresses. No PHI stored. Free during beta.` (153 chars).
- 🟢 **Title is solid**: 53 chars, falls in the 50-60 ideal range.
- 🟢 **OG image set + sized correctly**: `og-image.png` at 1200x630, alt text present.
- 🟡 **Cache headers are identical** across routes (`max-age=0, must-revalidate`) — fine for SPA but means Cloudflare's edge cache doesn't help. Could add slightly longer caching for static asset bundles (already-immutable hashed filenames could be `max-age=31536000`).

---

## Section B — Security headers

All routes return identical headers — **strong baseline**:

| Header                      | Value                                                                   | Status                        |
| --------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload`                          | ✅ HSTS preload-ready         |
| `Content-Security-Policy`   | Includes Clerk, Cloudflare Insights, Google fonts, Turnstile, recaptcha | ✅ Strict, no `'unsafe-eval'` |
| `X-Frame-Options`           | `DENY`                                                                  | ✅                            |
| `X-Content-Type-Options`    | `nosniff`                                                               | ✅                            |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                       | ✅                            |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=(), payment=()`                  | ✅ Conservative               |
| `frame-ancestors` (in CSP)  | `'none'`                                                                | ✅ Anti-clickjacking          |

**No accessibility-relevant header issues.** This baseline would score A+ on securityheaders.com.

---

## Section C — robots.txt (fixed in this PR)

**The bug**: hitting `/robots.txt` returned the Cloudflare-managed content signals **followed by** the SPA HTML shell. Crawlers saw `Allow: /` then immediately a `<!DOCTYPE html>...`. Likely confused parsers.

**The cause**: CF's "Managed robots.txt" feature was appending its rules, but the SPA fallback was returning index.html for the same path.

**The fix shipped in this PR**: `apps/web/public/robots.txt` now exists as a static file. The static asset Worker serves it directly, overriding the SPA fallback. CF's managed config still adds its content signals at the edge, but the body now ends cleanly.

---

## Section D — site.webmanifest (fixed in this PR)

**The bug**: the PWA manifest still said `PTowl` and `"Patience Trainer Tool — Designed to help save time"` style copy. The HTML index.html was rebranded in PR #48, but `apps/web/public/site.webmanifest` was missed.

**Impact**: Android/iOS "Add to Home Screen" installs showed `PTowl` as the app name instead of `PTOwl`.

**Fixed in this PR**: name, short_name, description all updated to `PTOwl`.

---

## Section E — Bundle sizes (from latest build)

| Asset                                                         | Minified |
| ------------------------------------------------------------- | -------- |
| `index-*.js` (entry chunk)                                    | ~502 KB  |
| `vendor-*.js` (react + react-router + react-dom + transitive) | ~230 KB  |
| `calendar-*.js` (FullCalendar lib)                            | ~260 KB  |
| `AboutPage-*.js`                                              | 22 KB    |
| `PrivacyPolicyPage-*.js`                                      | 18 KB    |
| `SchedulePage-*.js`                                           | 20 KB    |

🟡 The 502 KB entry chunk is mostly LandingPage + DashboardPage code (both top-imported, not lazy-loaded). Could route-split `LandingPage.tsx` since it's only used on `/`. ~50-70 KB potential savings on first paint. Medium-effort code change. Deferred.

🟡 Vite warns about chunks >500 KB. Real impact at PTowl's traffic scale is negligible. Defer until traffic justifies the optimization work.

---

## Section F — Lighthouse status

**Tried**: Google PageSpeed Insights API → returned HTTP 429 (`Quota exceeded for quota metric 'Queries per day'`, limit = 0 for unauthenticated callers).

**Also tried**: `npx lighthouse` locally → failed because Chrome isn't installed on this Windows shell.

**Recommendation for future Lighthouse runs**:

1. **Free Google Cloud API key path**:
   - Go to https://console.cloud.google.com/apis/credentials → "Create credentials" → "API key"
   - Enable `pagespeedonline.googleapis.com` for the project
   - Append `&key=AIzaSy...` to the PageSpeed Insights URL
   - Free tier: 25,000 queries/day

2. **Local CLI path**:
   - Install Chrome/Chromium → `npx lighthouse https://ptowl.com --output=html --output-path=./report.html`
   - Output is a browsable HTML report

3. **Web-based path**:
   - https://pagespeed.web.dev/ — paste the URL, get a free report. No setup. Best for occasional checks.

**Once a real Lighthouse score is captured, add it to this file and revisit which fixes ship.**

---

## Section G — API health snapshot

```json
GET /api/v1/health
→ {"ok":true,"data":{"status":"healthy","db":{"connected":true,"latency_ms":286},"timestamp":"..."}}
```

🟡 **D1 latency at 286 ms** is higher than typical (<100 ms for warm queries). Could be a cold-start or geographic-distance artifact. Worth a follow-up health probe over a few hours to see if it's steady-state.

---

## Section H — Sitemap

✅ `/sitemap.xml` is served correctly. Includes:

- `/` (priority 1.0, weekly)
- `/about`, `/privacy`, `/terms`, `/security` (priority 0.8, monthly)

Does NOT include `/accounts/*` (correct — auth pages shouldn't be indexed) or `/p/*` (correct — patient share URLs are token-gated).

---

## Recommended action plan

Triaged by impact × effort:

### Ship now (this PR or follow-up)

| Item                                | Impact                       | Effort               |
| ----------------------------------- | ---------------------------- | -------------------- |
| `site.webmanifest` rebrand          | Medium (PWA installs)        | ✅ Done in this PR   |
| Static `robots.txt` override        | Medium (SEO/crawler clarity) | ✅ Done in this PR   |
| Trim meta description to ~155 chars | Low-medium (Google SERP)     | 1 char-counting edit |

### Worth doing soon

| Item                                                               | Impact                       | Effort                 |
| ------------------------------------------------------------------ | ---------------------------- | ---------------------- |
| Get a Google Cloud PageSpeed API key + re-run Lighthouse           | High (quantitative baseline) | ~5 min user-side       |
| Add explicit cache headers for hashed `/assets/*` (1 year max-age) | Low (perf)                   | 3-line `_headers` edit |

### Defer until traffic justifies it

| Item                                            | Impact                | Effort                                         |
| ----------------------------------------------- | --------------------- | ---------------------------------------------- |
| Per-route SSR for SEO (one title/desc per page) | High (organic search) | 🔴 Significant — vite-plugin-ssr or rendertron |
| Route-split LandingPage out of main bundle      | Medium (first paint)  | 🔴 Medium code change                          |
| Investigate D1 286 ms latency over time         | Low (perf)            | Observe → fix only if persistent               |

---

## How to re-run this audit

1. `cd C:\Users\nurel\OneDrive\Documents\GitHub\ptowl`
2. Run the same `curl` commands on each public route — capture response codes, TTFBs, and identical-vs-different bytes.
3. Compare with this snapshot. Anything materially different is news.

---

_Audit captured 2026-05-13 by Claude during the post-launch hygiene session. Re-run quarterly or after major routing/UI changes._ 🦉
