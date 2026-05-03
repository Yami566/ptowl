# Clerk production instance setup runbook

End-to-end checklist for promoting PTowl from Clerk's Development
instance (`ethical-dingo-48.clerk.accounts.dev`) to a Production
instance with a custom domain (`clerk.ptowl.com`). Replaces the
ad-hoc dashboard nav we kept fumbling through.

Status legend: ☐ pending · ☑ done

---

## Why we're doing this

The Development instance is fine for testing but exposes the Clerk
random subdomain (`ethical-dingo-48.clerk.accounts.dev`) to users
mid-signin. A Production instance gives us:

- Custom domain for sign-in URLs (`clerk.ptowl.com`)
- Our own Google OAuth credentials (no shared dev client)
- Custom email sender for OTP / magic-link emails
- Stricter security defaults (required for Clerk's published SLAs)

Free tier still covers 10,000 MAU on production instances.

---

## Phase A — Create the production instance (Clerk dashboard, ~2 min)

☐ A1. Open <https://dashboard.clerk.com/last-active>.

☐ A2. At the top of the page, click the **"Development"** dropdown
(orange dot, far right of the breadcrumb). You'll see options
including **"Create production instance"** or "Production".

☐ A3. Click **Create production instance**. Clerk asks for: - Application name — keep "My Application" (or rename to "PTowl") - Custom domain — enter `clerk.ptowl.com`

☐ A4. Clerk creates the instance and switches you to it. The page
will say "Verify domain" or similar — Clerk needs DNS records
on `ptowl.com` to prove you control the domain.

☐ A5. Copy the **two CNAME records** Clerk shows. They look like:

    | Type  | Name                             | Target                          |
    | ----- | -------------------------------- | ------------------------------- |
    | CNAME | `clerk.ptowl.com`                | `frontend-api.clerk.services`   |
    | CNAME | `clkmail.clerk.ptowl.com`        | `mail.<random>.clerk.services`  |

    The exact targets vary; copy what Clerk shows you.

☐ A6. **Paste those two CNAMEs into chat.** I'll add them to
Cloudflare DNS via the existing `cf-bootstrap.yml` workflow
(extending it with the Clerk records).

---

## Phase B — DNS records (Cloudflare, automated by me)

☐ B1. Once you paste the CNAMEs from A6, I extend
[.github/workflows/cf-bootstrap.yml](.github/workflows/cf-bootstrap.yml)
to POST them to the Cloudflare DNS API.

☐ B2. I trigger the workflow.

☐ B3. The workflow adds the CNAMEs as **DNS-only** (gray cloud — must
not be proxied for the verification handshake to work).

☐ B4. Back in Clerk dashboard → click **Verify**. Verification
typically completes within 1-5 minutes of DNS propagation.

---

## Phase C — Google OAuth client (you, ~5 min)

Production Clerk instances cannot use Clerk's shared development
Google OAuth credentials. You need to create a Google Cloud OAuth
2.0 Client ID specifically for ptowl.com.

☐ C1. Open <https://console.cloud.google.com> → select or create a
project (e.g., "PTowl").

☐ C2. Left sidebar → **APIs & Services** → **OAuth consent screen**. - User Type: **External** - App name: **PTowl** - User support email: `nurelimusabay@gmail.com` - Developer contact: `nurelimusabay@gmail.com` - Save (skip optional fields)

☐ C3. Left sidebar → **APIs & Services** → **Credentials** →
**+ Create Credentials** → **OAuth client ID**: - Application type: **Web application** - Name: `PTowl Clerk Production` - Authorized JavaScript origins: `https://ptowl.com`,
`https://www.ptowl.com` - Authorized redirect URIs: paste the URL Clerk shows on its
"Configure Google OAuth" page (looks like
`https://clerk.ptowl.com/v1/oauth_callback`) - **Create**

☐ C4. Google shows your **Client ID** and **Client Secret**. Copy
both.

☐ C5. Back in Clerk dashboard → **Configure** → **SSO Connections**
→ **Google** → toggle **Enable** → paste: - Client ID - Client Secret - Save

---

## Phase D — Code updates (me, ~3 min)

☐ D1. You paste the **production publishable key** in chat
(`pk_live_...` — different from the dev `pk_test_...`).
Find it in Clerk dashboard → API Keys.

☐ D2. I update: - [`apps/web/src/main.tsx`](apps/web/src/main.tsx) baked-in
fallback → switch from `pk_test_...` to `pk_live_...` - [`apps/api/wrangler.jsonc`](apps/api/wrangler.jsonc)
`CLERK_FRONTEND_API_URL` → switch from
`https://ethical-dingo-48.clerk.accounts.dev` to
`https://clerk.ptowl.com`

☐ D3. I commit + push as `feat(auth): promote clerk to production`.

☐ D4. Cloudflare Workers Builds rebuilds frontend; GH Actions Deploy
redeploys API. ~3-5 min total.

---

## Phase E — Verify end-to-end (~2 min)

☐ E1. Open <https://ptowl.com> in **fresh incognito**.

☐ E2. The Clerk widget should render. URL in the OAuth popup should
say `clerk.ptowl.com` (NOT `ethical-dingo-48.clerk.accounts.dev`).

☐ E3. Click **Sign up** with email → create test account → land on
`/dashboard`. Confirms: - Production publishable key is live - Production frontend API URL is reachable - API Worker verifies Clerk JWTs against the production JWKS - User provisioned in D1

☐ E4. Sign out, then click **Continue with Google** → Google consent
screen now says "PTowl wants to access your Google account"
(NOT "Continue to ethical-dingo-48..."). Confirms your own
Google OAuth client is active.

---

## Phase F — Email sender (optional, ~5 min later)

Production Clerk lets you send OTP / magic-link emails from your
own domain (e.g., `noreply@ptowl.com`) instead of Clerk's default
sender. Same DKIM/SPF dance as Firebase email-link.

☐ F1. Clerk dashboard → **Configure** → **Customization** →
**Emails**.

☐ F2. Click **Customize sender** → enter `ptowl.com`.

☐ F3. Clerk shows DKIM TXT record. Paste in chat.

☐ F4. I extend `cf-bootstrap.yml` to add the TXT record.

☐ F5. Back in Clerk → click Verify.

(Defer this whole phase until the rest is working. Default Clerk
sender works fine; this is brand polish only.)

---

## Things you should NOT do during this migration

- Don't delete the Development instance until the production cutover
  is verified working. Dev is your fallback if production has issues.
- Don't change the publishable key in `main.tsx` yourself — let me
  do that in one focused commit so the rollback diff is clean.
- Don't put the Clerk **secret key** in chat. Only the publishable
  key (`pk_test_*` / `pk_live_*`) is safe to paste. Secret keys
  (`sk_*`) go directly into Cloudflare Worker secrets via wrangler.

---

## Decision log

Append-only as we go.

- **2026-05-03** — Decided to promote dev → production Clerk instance
  before Phase 4 (Firebase removal). Clean URL exposure to users
  was the trigger.
