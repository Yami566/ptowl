# Domain & URL — `patientowl.com` is not ours

`ptowl.com` is the canonical (and only) domain we own and serve. Many
people will naturally type or remember `patientowl.com` because that
matches the spoken brand name. **This is a problem we cannot solve in
code** — the domain is registered to someone else.

## What's happening when someone shares `patientowl.com` in iMessage

iMessage's link-preview service tries to:

1. Resolve the hostname over DNS.
2. Fetch the URL over HTTPS.
3. Parse OG / Twitter meta tags from the response.

For `patientowl.com`, step 1 might succeed (if the squatter has DNS
records) but step 2 either fails (no TLS) or returns a parking page
without proper meta tags. Either way, no preview card renders and
tapping the link goes somewhere we can't control — usually a parking
page or a 404.

## What we can do

### 1. Make `ptowl.com` the only URL anyone ever sees from us

Already mostly true. Confirmed clean:

- `apps/web/index.html` — `og:url` and Twitter cards point at `ptowl.com`.
- `apps/web/src/pages/PrivacyPolicyPage.tsx` — contact references
  `help@ptowl.com` and `https://ptowl.com`.
- `apps/api/src/services/email.ts` — every transactional email body
  (admin notifications, patient share codes, reminder emails)
  links to `https://ptowl.com`.
- `apps/api/wrangler.jsonc` — `FRONTEND_URL` is `https://ptowl.com`.
- README badges, lean canvas, all docs use `ptowl.com`.

If you spot any `patientowl.com` reference in code or marketing, it's
a bug — replace with `ptowl.com`.

### 2. Surface the canonical URL prominently

`apps/web/index.html` carries `<link rel="canonical" href="https://ptowl.com/">`
so search engines and social previews always pick the canonical form
even if someone reaches us through a redirect or alias.

### 3. (Future option) Acquire `patientowl.com`

If owning the long form becomes important, the realistic paths are:

- **Domain broker outreach** — send a polite acquisition offer to the
  current registrant via the WHOIS contact. Common ranges for
  uncategorized non-trademark `.com` domains: $500–$5,000.
- **Watch for expiry** — most squatted domains release if they don't
  monetize. Use a backorder service (Snapnames, DropCatch).
- **Trademark + UDRP** — only if "Patient Owl" is a registered
  trademark _and_ the current use is bad-faith infringement. Slow,
  expensive, low success rate without a clear case.

If/when acquired, the multi-origin support added in
`apps/api/src/index.ts` (`getAllowedOrigins(env)`) is in place: just
add the new origin to `FRONTEND_URLS` in `wrangler.jsonc` and add the
Worker routes. No code change needed.

### 4. Don't pretend we control it

The earlier commit `9fd11ab` configured Worker routes for
`patientowl.com/api/*` and added `patientowl.com` to the CORS / CSRF
allow-list. That commit was wrong on a false assumption. The follow-up
revert removes those entries — keeping the multi-origin helper in place
for the day we actually buy a second domain we control.

## What to ask folks who share the wrong URL

If someone DM's you saying "your link doesn't work", the answer is:

> The site is at **ptowl.com** (no "patient"). Try
> [https://ptowl.com](https://ptowl.com) instead.

Consider adding the canonical URL to:

- Email signatures
- Business cards (the lean canvas already says "ptowl.com")
- iMessage / share-link copy when sending the schedule URL to a
  patient (the share path already returns the `ptowl.com/cal/<token>.ics`
  form)
- Any social media bios

## What's NOT a fix

- Redirects in our Cloudflare account — only work for domains in our
  account. We don't have `patientowl.com`.
- Worker routes — Cloudflare Workers only intercept traffic for zones
  we own.
- DNS changes — only the registrant of `patientowl.com` can update its
  DNS records.
- Changing our `og:url` to `patientowl.com` — would actively make
  things worse: we'd link previews to a domain we don't control.

## Why I shipped the wrong fix first

Commit `9fd11ab` assumed you owned the domain (or were about to buy it)
and proactively wired up routes + multi-origin support. That assumption
was wrong. Lesson logged: **before adding domain config, confirm the
domain is ours.** Should be a question, not an assumption.
