# Third-party scripts — proxied through Cloudflare Zaraz

PTOWL embeds two categories of third-party JavaScript in the web app:

1. **Tawk.to** — live chat support widget on every page.
2. **Cloudflare Insights / Web Analytics** — first-party, already
   handled by Cloudflare directly.

Per the iteration-5 decision (April 2026), Tawk.to is **proxied through
Cloudflare Zaraz** so it loads from the `ptowl.com` edge instead of
from `embed.tawk.to`. Benefits:

- One fewer third-party domain in the connection list (faster initial
  load, simpler CSP).
- Edge-side script delivery — same point of presence as the rest of
  ptowl.com.
- Zaraz centralizes consent management if we ever add a cookie banner.
- Free up to 100k events/month.

## One-time setup (you do this in the Cloudflare dashboard)

1. Open Cloudflare dashboard → select the `ptowl.com` zone → **Zaraz**.
2. Click **Add new tool**.
3. Search the catalogue for **Tawk.to** and select it.
4. Configure:
   - **Property ID**: `69c2330f46a6c41c341aa7c6` (the first segment of
     the existing src URL `embed.tawk.to/<property>/<widget>`).
   - **Widget ID**: `1jkf9et9r` (the second segment of the same URL).
   - **Trigger**: "Page load — all pages" (default).
5. Save. Zaraz starts injecting the Tawk.to bootstrap from
   `https://ptowl.com/cdn-cgi/zaraz/...` automatically on the next page load.

## Code change — optional follow-up

Once you've confirmed Zaraz-injected Tawk.to is working in production,
the inline `<script>` block in `apps/web/index.html` (lines 36–48) can
be removed. Until then, the inline block is the safety net so chat
keeps working if the dashboard tool is ever disabled.

After removal, the only third-party domain in the network tab should
be `static.cloudflareinsights.com` (Web Analytics, also Zaraz-managed
when enabled).

## Verifying it works

1. Open `https://ptowl.com` in an incognito window.
2. DevTools → Network → filter for `tawk` and for `zaraz`.
3. Expected: the Tawk.to bootstrap loads from a path under
   `/cdn-cgi/zaraz/...`, NOT from `embed.tawk.to`.
4. The chat bubble should still appear in the bottom-right of the page.
5. Open the chat → send a test message → confirm it lands in your
   Tawk.to dashboard.

## Cloudflare Web Analytics

Web Analytics is enabled separately via:

Cloudflare dashboard → Workers & Pages → `ptowl` (Pages project) →
**Settings → Analytics & Logs → Web Analytics → Enable**.

This auto-injects the beacon at the edge — no code change needed.
The privacy-policy disclosure already covers it (Cloudflare-hosted
analytics, no cookies, no fingerprinting).

## What is NOT proxied

- **Firebase Auth SDK** (`firebase` npm package, bundled into the
  client). Used for phone OTP. Bundled, not loaded from a CDN, so
  Zaraz isn't relevant.
- **Reminder email subprocessor** (MailChannels). That's a server-side
  `fetch` from the Worker, not a client-side script.
