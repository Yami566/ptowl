# Domain alias setup — `patientowl.com` ↔ `ptowl.com`

`ptowl.com` is the canonical short URL for the product. Many users
naturally type `patientowl.com` (the full brand name). When they share
the long form via iMessage / Slack / email, the link must work.

This doc covers two options for handling the alias. **Pick one — they're
mutually exclusive.**

## Option A — 301 redirect (recommended)

`patientowl.com/*` permanently redirects to `ptowl.com/*`. Cleanest
SEO; users see one canonical URL after the bounce.

### Steps (Cloudflare dashboard, 5 minutes)

1. **Add the domain to Cloudflare**
   - Cloudflare dashboard → **Add a Site** → enter `patientowl.com`.
   - Pick the Free plan (or whichever matches your account).
   - Update the registrar's nameservers to the two Cloudflare NSs shown.
   - Wait ~5 min for "Active" status.

2. **Universal SSL** auto-issues a TLS cert. No action needed once the
   zone is Active.

3. **Bulk Redirects** (Cloudflare → Bulk Redirects → Create List):
   - List name: `patientowl-to-ptowl`
   - Type: Redirect
   - Add a rule:
     - **Source URL**: `https://patientowl.com/*` _(also add
       `https://www.patientowl.com/_`)\*
     - **Target URL**: `https://ptowl.com/$1`
     - **Status**: 301 (Permanent Redirect)
     - **Preserve query string**: yes
     - **Preserve path suffix**: yes
4. Test:

   ```bash
   curl -sI https://patientowl.com/about
   # Expect: HTTP/2 301
   #         location: https://ptowl.com/about
   ```

5. After verification, no code changes are needed. Skip Option B below.

## Option B — Mirror (both URLs serve the SPA)

Same Worker, same Pages deployment, two branded URLs. Useful if you want
brand consistency in printed materials (e.g. business cards saying
`patientowl.com` work natively) but adds operational surface area.

### Code already in place (this branch)

- `apps/api/wrangler.jsonc` declares Worker routes for both domains:
  ```jsonc
  "routes": [
    { "pattern": "ptowl.com/api/*", "zone_name": "ptowl.com" },
    { "pattern": "www.ptowl.com/api/*", "zone_name": "ptowl.com" },
    { "pattern": "patientowl.com/api/*", "zone_name": "patientowl.com" },
    { "pattern": "www.patientowl.com/api/*", "zone_name": "patientowl.com" }
  ]
  ```
- `FRONTEND_URLS` env var lists every accepted origin. CORS + hono/csrf
  middleware accept all of them.
- `apps/web/index.html` has `<link rel="canonical" href="https://ptowl.com/">`
  so search engines pick a single primary URL even when both serve the
  same content.

### Steps (Cloudflare dashboard)

1. **Add the domain to Cloudflare** (same as Option A step 1).
2. **Cloudflare Pages → ptowl project → Custom domains → Add a domain**:
   - `patientowl.com`
   - `www.patientowl.com`
     Cloudflare auto-issues TLS and routes traffic to the same Pages build.
3. **Workers → ptowl-api → Triggers → Routes**: Cloudflare picks up the
   new routes from `wrangler.jsonc` on next deploy. Or click
   **Add route** manually after a deploy.
4. Test:
   ```bash
   curl -sI https://patientowl.com
   # Expect: HTTP/2 200, x-powered-by: ... (Pages headers)
   curl -s https://patientowl.com/api/v1/health | head -1
   # Expect: {"ok":true,...}
   ```

## Why iMessage previews fail today

When you paste a URL in iMessage, Apple's link-preview service:

1. Resolves the hostname over DNS.
2. Fetches the URL over HTTPS (must have a valid TLS cert from a
   trusted CA).
3. Parses the response as HTML and reads `<meta property="og:*">`,
   `<meta name="twitter:*">`, `<title>`, favicon.
4. Renders a preview card if all of the above succeeds.

`patientowl.com` is failing one of those steps — most likely #1 (the
domain isn't registered or its DNS doesn't point anywhere) or #2 (no
valid cert, since iOS rejects self-signed and untrusted CAs more
strictly than desktop browsers).

After Option A or B above, the preview card should render correctly
within ~5 minutes (DNS propagation + cert provisioning).

## What to do if you don't own `patientowl.com`

Two paths:

- **Buy the domain** — usually $10–$15/year via Cloudflare Registrar
  (no markup), Namecheap, or Porkbun. Then follow Option A.
- **Stay on `ptowl.com` only** — update marketing materials so people
  always see the short form. Open Graph + iMessage previews are already
  configured for `ptowl.com`. Cheaper, less moving parts.

If `patientowl.com` is a typo (someone misheard "ptowl") then there's
nothing to fix on our end; surface the canonical URL more prominently
in the privacy policy / share modals / email templates.

## Notes

- The PRD already lists Patient Owl as the brand and `ptowl.com` as the
  URL. If you mirror, also update the privacy-policy contact section
  to mention both domains.
- Cloudflare Web Analytics (when enabled) treats each domain as a
  separate site — you'll see split traffic between `ptowl.com` and
  `patientowl.com` in the dashboard. Aggregate via Cloudflare's
  Analytics Engine if a unified view matters.
