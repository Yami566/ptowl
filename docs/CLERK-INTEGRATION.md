# PTOwl ↔ Clerk Integration Roadmap

> Where PTOwl uses Clerk today, what Clerk can actually do, how PTOwl
> compares to ADA-first healthcare scheduling tools, and the prioritized
> roadmap for closing the gaps **without manual dashboard clicks**.
>
> Produced 2026-05-15 from three parallel investigations:
> Clerk capability surface + healthcare benchmark + codebase audit.
>
> Companion to:
>
> - [AUTH-LIFECYCLE.md](AUTH-LIFECYCLE.md) — A-Z user stages + email policy
> - [QA-MATRIX.md](QA-MATRIX.md) — route test plan + automation gaps
> - [../MASTER.md](../MASTER.md) — operational state + secrets

---

## 1. TL;DR

PTOwl uses Clerk **narrowly**: `<SignIn>`, `<SignUp>`, `useAuth`, `useClerk`, and JWKS-based JWT verification on the API. That's a deliberate "drop-in auth boundary" — clean and small. But it leaves real value on the table:

- **No webhooks** — every change in Clerk has to be discovered via a polling `/auth/me` call. There's no `user.created` → D1 sync; we re-discover it lazily.
- **No `<UserButton>` / `<UserProfile>`** — we built a custom logout button and a custom profile page instead.
- **No OAuth providers** — Google / Apple sign-in is one config click away and would help motor-impaired users skip typing entirely.
- **No MFA, passkeys, reverification** — all available on the same plan tier we already pay for.
- **Most "click here in the Clerk dashboard" steps ARE scriptable** via the Backend API. The exceptions are documented in §6.

The federal Section 504 / ADA rule for healthcare digital surfaces hits **WCAG 2.1 AA conformance** as a **mandatory** baseline in May 2026. PTOwl is mostly there already — see [QA-MATRIX §2](QA-MATRIX.md) — but a few high-value gaps remain.

This doc proposes a **3-wave roadmap**:

- **Wave 1 (1-2 days of engineering):** Eliminate every reasonable "your side" step. Clerk path config + bot protection + webhook signing secret all become deploy-time idempotent operations. New contributors can clone-and-go.
- **Wave 2 (~1 week):** Ship the user-facing Clerk features that move the needle for disabled patients — passkeys, OAuth, forgot-password, `<UserButton>`, multi-language UI.
- **Wave 3 (deferred):** Healthcare-specific scaffolding — caregiver/profile-switcher, multi-channel reminders, HIPAA BAA upgrade.

---

## 2. Where PTOwl uses Clerk today

The full integration surface, file-by-file. Compact enough to read in one screen.

### Frontend SDK

| File:Line                                                                           | Primitive                         | Use                                                                                                 |
| ----------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| [apps/web/src/main.tsx:80-88](../apps/web/src/main.tsx#L80-L88)                     | `<ClerkProvider>`                 | Root wrapper — `publishableKey`, `signInUrl`, `signUpUrl`, fallback URLs, owl-themed `localization` |
| [apps/web/src/pages/SignInPage.tsx](../apps/web/src/pages/SignInPage.tsx)           | `<SignIn>`                        | Embedded form mounted at `/accounts/signin/*`                                                       |
| [apps/web/src/pages/SignUpPage.tsx](../apps/web/src/pages/SignUpPage.tsx)           | `<SignUp>`                        | Embedded form mounted at `/accounts/signup/*`                                                       |
| [apps/web/src/contexts/AuthContext.tsx](../apps/web/src/contexts/AuthContext.tsx)   | `useAuth`, `useClerk`             | `isLoaded`, `isSignedIn`, `signOut()`                                                               |
| [apps/web/src/api/client.ts](../apps/web/src/api/client.ts)                         | `window.Clerk.session.getToken()` | Attaches Bearer JWT to every API request                                                            |
| [apps/web/src/locale/clerk-strings.json](../apps/web/src/locale/clerk-strings.json) | `localization`                    | Rotates "Welcome back, Doctor {animal}" across 10 calming names                                     |

### Backend (Cloudflare Worker)

| File:Line                                                                 | Primitive       | Use                                                                                    |
| ------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| [apps/api/src/auth/clerk-verify.ts](../apps/api/src/auth/clerk-verify.ts) | JWKS via `jose` | RS256 signature verification against `$CLERK_FRONTEND_API_URL/.well-known/jwks.json`   |
| [apps/api/src/middleware/auth.ts](../apps/api/src/middleware/auth.ts)     | Session token   | `requireAuth` reads `Authorization: Bearer …`, verifies, provisions D1 row             |
| [apps/api/src/auth/provision.ts](../apps/api/src/auth/provision.ts)       | `claims.sub`    | Stores Clerk user id in legacy `firebase_uid` column; auto-creates D1 row on first hit |

### Deploy automation

| File                                                                                                                                              | What it does                                                                                         | What it doesn't do                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [.github/workflows/smoke-clerk-urls.yml](../.github/workflows/smoke-clerk-urls.yml)                                                               | Polls `clerk.ptowl.com/v1/environment` daily; fails if `sign_in_url` / `sign_up_url` drift from code | Doesn't auto-fix; just announces                                                                    |
| [.github/workflows/launch-finalize.yml](../.github/workflows/launch-finalize.yml) + [scripts/finalize-launch.mjs](../scripts/finalize-launch.mjs) | Manual `workflow_dispatch` — when `CLERK_SECRET_KEY` is set, PATCHes `/v1/instance` to align paths   | Doesn't auto-fire on deploy; doesn't sync bot protection, MFA toggle, or any other instance setting |

### What we're NOT using

- 🚫 Organizations (multi-provider clinic teams)
- 🚫 OAuth providers (Google, Apple, Microsoft)
- 🚫 MFA / TOTP / passkeys / backup codes
- 🚫 Webhooks (every Clerk event family — `user.*`, `session.*`, `organization.*`)
- 🚫 `<UserButton>`, `<UserProfile>`, `<Protect>`, `<SignedIn>`, `<SignedOut>`
- 🚫 `useReverification` for sensitive-action gating
- 🚫 Account Portal (`accounts.ptowl.com`)
- 🚫 JWT templates (custom claims)
- 🚫 Allowlist / blocklist identifiers
- 🚫 SAML / OIDC enterprise SSO
- 🚫 Clerk Billing
- 🚫 Account linking

---

## 3. Clerk capability map

Everything Clerk offers, organized by category. Each row tags **automatable** vs **dashboard-only**, and the plan tier required.

Legend: **A** = automatable via Backend API · **D** = dashboard-only · **M** = mixed (set in dashboard, runtime via API) · **U** = unverified

### 3.1 Sign-in methods

| Capability                                 | SDK piece                                                       | Tier | A/D | Notes                                                                      |
| ------------------------------------------ | --------------------------------------------------------------- | ---- | --- | -------------------------------------------------------------------------- |
| Email + password                           | `useSignIn`, `useSignUp`                                        | Free | M   | Strategy toggle is dashboard; users CRUD-able via `POST /v1/users`         |
| Email/SMS code (magic link equivalent)     | `signIn.prepareFirstFactor({ strategy: 'email_code' })`         | Free | M   |                                                                            |
| OAuth (Google, Apple, Microsoft, ~20 more) | `signIn.authenticateWithRedirect({ strategy: 'oauth_google' })` | Free | M   | Provider credentials set in dashboard (D); strategy invocation is code (A) |
| Passkeys (WebAuthn)                        | `user.createPasskey()`, `signIn.authenticateWithPasskey()`      | Pro+ | M   |                                                                            |
| Phone (SMS code)                           | Same code-flow API                                              | Free | M   | SMS billed per message                                                     |
| Enterprise SAML / OIDC                     | `samlConnections` resource                                      | Pro+ | A   | 1 connection included; $75/mo each above that                              |

### 3.2 Multi-factor + reverification

| Capability                         | SDK piece                      | Tier     | A/D           |
| ---------------------------------- | ------------------------------ | -------- | ------------- |
| TOTP (authenticator app)           | `user.createTOTP()`            | Pro+     | M             |
| SMS-based MFA                      | `signIn.mfa.verifyPhoneCode()` | Pro+     | M             |
| Backup codes                       | `user.createBackupCode()`      | Pro+     | A             |
| Passkey-as-MFA                     | Same passkey strategy          | Pro+     | M             |
| Force-MFA org policy               | Dashboard toggle               | Pro+     | D             |
| Reverification (sensitive actions) | `useReverification` hook       | **Free** | A (code-only) |

### 3.3 Sessions + JWT

| Capability                      | SDK piece                        | Tier | A/D |
| ------------------------------- | -------------------------------- | ---- | --- |
| Single-session vs multi-session | `<ClerkProvider>` mode flag      | Free | D   |
| Custom session lifetime         | Dashboard setting                | Pro+ | D   |
| JWT templates (custom claims)   | `jwtTemplates` resource          | Pro+ | M   |
| Programmatic session control    | `POST /v1/sessions/{id}/revoke`  | Free | A   |
| M2M tokens / API keys           | `m2mTokens`, `apiKeys` resources | Free | A   |

### 3.4 User + profile

| Capability                                                          | SDK piece                       | Tier | A/D           |
| ------------------------------------------------------------------- | ------------------------------- | ---- | ------------- |
| `<UserProfile>` prebuilt UI                                         | Component                       | Free | — (code-side) |
| `<UserButton>` avatar + menu                                        | Component                       | Free | — (code-side) |
| User CRUD                                                           | `users` resource                | Free | A             |
| Metadata (`public_metadata`, `private_metadata`, `unsafe_metadata`) | `PATCH /v1/users/{id}/metadata` | Free | A             |
| Ban / unban                                                         | `POST /v1/users/{id}/ban`       | Pro+ | A             |

### 3.5 Organizations

| Capability                                                           | SDK piece                                       | Tier | A/D                             |
| -------------------------------------------------------------------- | ----------------------------------------------- | ---- | ------------------------------- |
| Org CRUD                                                             | `organizations` resource                        | Free | A                               |
| `useOrganization`, `<OrganizationProfile>`, `<OrganizationSwitcher>` | Hooks + components                              | Free | — (code)                        |
| Custom roles + permissions                                           | Dashboard authoring; `has({ permission: '…' })` | Pro+ | D for definitions, A for checks |
| Membership invitations                                               | `organizationInvitations` resource              | Free | A                               |

### 3.6 Webhooks (Svix-backed)

| Capability            | Notes                                                                                                                         | Tier | A/D         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---- | ----------- |
| Event delivery        | `verifyWebhook()` helper validates `svix-id` + `svix-timestamp` + `svix-signature` HMAC-SHA256                                | Free | A (consume) |
| Endpoint registration | **Dashboard-only.** No BAPI for creating endpoints.                                                                           | Free | D           |
| Event families        | `user.created`, `user.updated`, `user.deleted`, `session.*`, `organization.*`, `email.created`, `sms.created`, billing events | Free | A (consume) |

### 3.7 Bot + attack protection

| Capability                                    | Notes                           | Tier | A/D |
| --------------------------------------------- | ------------------------------- | ---- | --- |
| Bot sign-up protection (Cloudflare Turnstile) | Dashboard toggle                | Free | D   |
| Account lockout                               | Dashboard toggle                | Free | D   |
| Allowlist / blocklist                         | `allowlistIdentifiers` resource | Pro+ | A   |

### 3.8 Email + SMS

| Capability                         | Notes              | Tier | A/D              |
| ---------------------------------- | ------------------ | ---- | ---------------- |
| Email template editing (WYSIWYG)   | Dashboard          | Pro+ | D                |
| Custom SPF/DKIM for deliverability | One-time DNS setup | Free | D (DNS one-time) |
| Self-deliver SMS via own provider  | Dashboard toggle   | Free | D                |

### 3.9 Customization

| Capability                       | Notes                              | Tier | A/D      |
| -------------------------------- | ---------------------------------- | ---- | -------- |
| `appearance` prop (theming)      | `variables`, `elements`, `layout`  | Free | — (code) |
| `localization`                   | `<ClerkProvider localization={…}>` | Free | — (code) |
| Remove Clerk branding            | Toggle                             | Pro+ | D        |
| Custom CSS via element overrides | `elements: { … }`                  | Free | — (code) |

### 3.10 Audit + logs

| Capability                                        | Notes                           | Tier | A/D |
| ------------------------------------------------- | ------------------------------- | ---- | --- |
| Application Logs (sign-ins, sign-ups, org events) | 1d Free / 7d Pro / 30d Business | All  | D   |
| User activity report (365-day login graph)        | Per-user                        | Free | D   |
| Session activities (IP, device, browser)          | `user.getSessions()`            | Free | A   |

### 3.11 Domains

| Capability               | Notes                            | Tier               | A/D              |
| ------------------------ | -------------------------------- | ------------------ | ---------------- |
| Production custom domain | `clerk.<domain>` CNAME           | Free               | D (DNS one-time) |
| Satellite domains        | Cross-domain SSO                 | Pro+ ($10/mo each) | D                |
| Dev vs prod instances    | Separate keys; one-way promotion | Free               | D                |

### 3.12 HIPAA

Requires **Enterprise** tier. **Business** plan does NOT include HIPAA BAA. This is a real cost decision PTOwl will face once we cross from "no PHI stored" to "we touch PHI" territory. Today's posture (sports-alias privacy, no real names) keeps us out of HIPAA scope — but a future patient portal that stores patient email + linked schedules edges closer.

---

## 4. Benchmark: what healthcare scheduling for disabled patients should have

From the parallel research against Jane App, WebPT, SimplePractice, TheraNest, Calendly, Cal.com, Square Appointments, Be My Eyes, and Microsoft Accessibility Hub.

Legend: 🔴 universal must-have · 🟡 should-have common · 🟢 differentiator · ✅ = PTOwl has it · ⚠️ = partial · ❌ = gap

### Auth & account

| #   | Item                                                       | Priority | PTOwl                                                 |
| --- | ---------------------------------------------------------- | -------- | ----------------------------------------------------- |
| 1   | Email + password sign-up with secure reset                 | 🔴       | ⚠️ Sign-up works; forgot-password deferred to Phase 4 |
| 2   | SSO via Google + Microsoft                                 | 🔴       | ❌ Removed Google G icon in May 2026                  |
| 3   | Forgot-password with recovery-email fallback               | 🟡       | ❌                                                    |
| 4   | SAML SSO for enterprise/clinic deployments                 | 🟡       | ❌                                                    |
| 5   | Passkeys / biometric login                                 | 🟢       | ❌                                                    |
| 6   | Profile-switcher for caregivers managing multiple patients | 🟢       | ❌                                                    |

### Scheduling core

| #   | Item                                                    | Priority | PTOwl                                                  |
| --- | ------------------------------------------------------- | -------- | ------------------------------------------------------ |
| 7   | Self-service 24/7 online booking                        | 🔴       | ✅                                                     |
| 8   | Reschedule + cancel without re-login                    | 🔴       | ⚠️ Patient can view via `/p/<token>`; can't reschedule |
| 9   | Multi-provider visibility on one calendar               | 🔴       | ❌ Today: one clinic per account                       |
| 10  | Recurring appointments + series booking                 | 🟡       | ✅ Core feature                                        |
| 11  | Calendar overlay showing patient's existing commitments | 🟡       | ❌                                                     |
| 12  | ICS / Google / Outlook export                           | 🟡       | ✅ Three buttons on `/p/<token>`                       |
| 13  | Conflict-avoidance auto-scheduler                       | 🟢       | ❌                                                     |
| 14  | Room/resource assignment                                | 🟢       | ❌                                                     |

### Accessibility

| #   | Item                                                                    | Priority | PTOwl                                                                                      |
| --- | ----------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| 15  | WCAG 2.1 AA conformance (federal rule May 2026)                         | 🔴       | ⚠️ Most surfaces compliant; needs formal audit                                             |
| 16  | Full keyboard navigation for book/reschedule/cancel                     | 🔴       | ⚠️ Dashboard yes; patient view yes                                                         |
| 17  | Screen-reader tested (VoiceOver / NVDA / JAWS / TalkBack)               | 🔴       | ⚠️ Tested informally; needs scripted run                                                   |
| 18  | Visible focus indicators + icon-not-color error states                  | 🔴       | ✅ PR #62 (status glyphs) + PR #76 (high-contrast focus rings)                             |
| 19  | 200% zoom without layout break                                          | 🟡       | ✅                                                                                         |
| 20  | High-contrast / color-blind safe toggle                                 | 🟡       | ✅ PR #76                                                                                  |
| 21  | Plain-language copy (~grade-6 reading)                                  | 🟡       | ⚠️ Partial — patient view warmed (PR #76), clinic side still uses "schedule a series" etc. |
| 22  | Voice control / voice booking                                           | 🟢       | ⚠️ Read-aloud yes (PR #76); voice input no                                                 |
| 23  | Captions/transcripts on video                                           | 🟢       | n/a (no video yet)                                                                         |
| 24  | Cognitive-load reduction (progress, review-before-submit, save partial) | 🟢       | ⚠️ Some — 5-keypress flow is low-cog by design                                             |
| 25  | Alternative input support (switch, eye-gaze)                            | 🟢       | ⚠️ Inherits from keyboard; not explicitly tested                                           |

### Communication

| #   | Item                               | Priority | PTOwl                                                    |
| --- | ---------------------------------- | -------- | -------------------------------------------------------- |
| 26  | Email confirmations + reminders    | 🔴       | ✅ Reminders cron + `apps/api/src/services/reminders.ts` |
| 27  | SMS reminders                      | 🔴       | ❌ Wired but disabled                                    |
| 28  | Phone-call reminder as 3rd channel | 🟡       | ❌                                                       |
| 29  | Secure in-app messaging            | 🟡       | ❌                                                       |
| 30  | Multi-language notifications       | 🟢       | ⚠️ Spanish toggle on print only                          |

### Mobile + offline

| #   | Item                                  | Priority | PTOwl                                               |
| --- | ------------------------------------- | -------- | --------------------------------------------------- |
| 31  | Responsive web works on phone/tablet  | 🔴       | ✅                                                  |
| 32  | Dedicated patient mobile app          | 🟡       | ⚠️ PWA installable ("Add to Home Screen")           |
| 33  | Offline view of upcoming appointments | 🟢       | ❌ Service worker is install-only, no offline cache |

### Caregiver / family

| #   | Item                                            | Priority | PTOwl |
| --- | ----------------------------------------------- | -------- | ----- |
| 34  | Caregiver contact associated with patient       | 🔴       | ❌    |
| 35  | Granular caregiver permissions                  | 🟡       | ❌    |
| 36  | One caregiver login → multiple patient profiles | 🟡       | ❌    |
| 37  | Caregiver consent + audit trail                 | 🟢       | ❌    |

### Compliance + privacy

| #   | Item                               | Priority | PTOwl                                                 |
| --- | ---------------------------------- | -------- | ----------------------------------------------------- |
| 38  | HIPAA-compliant data handling      | 🔴       | ⚠️ Intentional no-PHI design ([VISION.md](VISION.md)) |
| 39  | HITRUST and/or SOC 2               | 🟡       | ❌ Cost-prohibitive at <50 clinics                    |
| 40  | PCI for payments                   | 🟡       | n/a (no payments yet)                                 |
| 41  | Privacy mode masking patient names | 🟡       | ✅ Sports-alias is the whole product                  |
| 42  | Patient self-service data export   | 🟢       | ⚠️ Calendar export yes; full data export no           |

### Help + support

| #   | Item                                            | Priority | PTOwl                            |
| --- | ----------------------------------------------- | -------- | -------------------------------- |
| 43  | Searchable help center                          | 🔴       | ❌                               |
| 44  | Live chat / email support for patients          | 🟡       | ⚠️ Email-only (`help@ptowl.com`) |
| 45  | Dedicated disability support channel (ASL, TTY) | 🟢       | ❌                               |
| 46  | AI self-service accessibility assistant         | 🟢       | ❌                               |
| 47  | 24/7 human help for visually impaired           | 🟢       | ❌                               |

**Summary scorecard:**

- 🔴 must-haves: **13** items. PTOwl has 6 ✅, 6 ⚠️, **1** ❌ (forgot password) — solid.
- 🟡 should-haves: **18** items. PTOwl has 4 ✅, 5 ⚠️, **9** ❌.
- 🟢 differentiators: **16** items. PTOwl has 0 ✅, 5 ⚠️, **11** ❌.

The biggest gaps are in **caregiver flows, SMS reminders, OAuth sign-in, and patient reschedule**. None require leaving the off-the-shelf tier.

---

## 5. Automation strategy — eliminating "your side / my side"

The user's stated goal: **make Clerk integrated and automated so we are not doing things on your side and "my side."** Here's how to get there.

### 5.1 What CAN be fully automated (Wave 1 targets)

| Today's manual step                          | Automation target                                                                                                           | Effort  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------- |
| Clerk dashboard → Paths set per-deploy       | Already half-done in `finalize-launch.mjs`. Fold the PATCH into `deploy.yml` so it runs on every push to `main`. Wave 1.    | ~30 min |
| Single-session mode toggle                   | One BAPI PATCH call — add to finalize script. Wave 1.                                                                       | ~10 min |
| Bot sign-up protection (Turnstile)           | Toggle is dashboard-only, but the Turnstile site key is already a CF secret. One-time setup, no recurring.                  | —       |
| Webhook signing secret                       | After endpoint is created (one-time dashboard click), the secret is a normal CF Worker secret. Store and never touch again. | —       |
| `CLERK_FRONTEND_API_URL` env var             | Already in `wrangler.jsonc`. No change.                                                                                     | —       |
| User CRUD operations (founder admin actions) | All BAPI. Add `pnpm clerk:user <action>` script. Wave 1.                                                                    | ~30 min |
| Session revocation when D1 user deleted      | BAPI `POST /v1/sessions/{id}/revoke`. Wire into account-deletion path when we ship Stage W. Wave 2.                         | ~20 min |
| Allowlist / blocklist (when needed)          | `allowlistIdentifiers` BAPI resource. Add CLI later if abuse becomes real.                                                  | —       |

### 5.2 What CANNOT be automated — the irreducible "your side" list

These remain dashboard-only on Clerk's side as of May 2026. The good news: each is a **one-time** setup, not a recurring chore.

1. **Webhook endpoint registration.** Clerk's BAPI does not expose webhook endpoint creation. After Wave 1 lands a webhook listener, you click once in the Clerk dashboard → Webhooks → Add endpoint with URL `https://ptowl.com/api/v1/webhooks/clerk`, copy the signing secret, paste into `wrangler secret put CLERK_WEBHOOK_SECRET`. Five minutes, done forever.
2. **OAuth provider credentials.** If/when we add Google sign-in (Wave 2), Google Cloud Console requires a one-time client ID + secret creation; paste both into Clerk dashboard. No API path on either side. Same pattern for Apple/Microsoft.
3. **Email template content.** Pro+ feature anyway. PTOwl uses our own MailChannels-backed templates for the founder-approval + clinic-status + patient-cancellation emails (see [AUTH-LIFECYCLE.md §5](AUTH-LIFECYCLE.md#5-email-surface--5-templates-thats-it)), so Clerk's default emails are fine.
4. **Attack-protection toggles.** Dashboard-only. One-time setup.
5. **JWT template authoring.** Pro+ and dashboard-only. PTOwl doesn't need custom JWT claims yet.

That's it. Five one-time dashboard steps for the lifetime of the product.

### 5.3 The webhook listener — the keystone Wave 1 PR

Today, when a user changes their email or deletes their account from Clerk's Account Portal, PTOwl's D1 has no idea until the user next signs in. Adding a Clerk webhook listener fixes this and unlocks several other improvements.

Sketch:

```
POST /api/v1/webhooks/clerk
  ↓ verifyWebhook(svix-id, svix-timestamp, svix-signature, raw body)
  ↓ switch (event.type) {
      'user.updated':  UPDATE users SET email = ?, display_name = ? WHERE firebase_uid = ?
      'user.deleted':  UPDATE users SET status = 'denied' WHERE firebase_uid = ?   (soft-delete; audit log keeps the trail)
      'session.removed': (optional) audit_log row
      'session.revoked': (optional) audit_log row
    }
```

Off-the-shelf primitives only: hono router, `svix` SDK (one new dep ≈ 30kb), our existing D1 binding. Webhook secret stored as `CLERK_WEBHOOK_SECRET` Worker secret.

Once shipped:

- Drops the "we discover user changes lazily on `/auth/me`" pattern.
- Makes account deletion via Clerk Account Portal automatically clean up D1.
- Lets us add a `<UserProfile>` component without writing custom email-update sync code.

---

## 6. Roadmap — three waves, prioritized by leverage

### Wave 1 — full automation parity (1-2 days engineering)

| #   | Item                                                                                                                                              | Effort                         | Why this first                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------ | ---------------------------------------- | ------- | --------------------------------------------------------- |
| 1.1 | Clerk webhook listener (`POST /api/v1/webhooks/clerk`) — handles `user.updated`, `user.deleted`, optionally `session.*`                           | ~4 hrs                         | Keystone. Unblocks 1.2 and several Wave 2 items.       |
| 1.2 | Fold the Clerk-paths PATCH from `finalize-launch.mjs` into `deploy.yml` so every deploy idempotently re-syncs URLs                                | ~30 min                        | Closes the only recurring "click in dashboard" today.  |
| 1.3 | `pnpm clerk:user <list                                                                                                                            | get                            | ban                                                    | delete> [email]` CLI wrapper around BAPI | ~30 min | Founder ops tool. Replaces SQL recipes for the auth half. |
| 1.4 | Move from `<SignIn>` / `<SignUp>` to PR #60's custom forms (long-pending)                                                                         | needs Clerk dashboard click-op | Already on disk; merge when ready                      |
| 1.5 | Add `<UserButton>` to dashboard header for one-click session/profile access                                                                       | ~1 hr                          | Free, instant UX win, removes our custom logout button |
| 1.6 | Document the 5 irreducible one-time dashboard steps in MASTER.md so future-Claude / future-contributors know exactly which clicks are unavoidable | ~30 min                        | Closes the "your side" question once and for all       |

### Wave 2 — user-facing features that move the needle (~1 week)

| #   | Item                                                                                                                                          | Closes benchmark       | Effort                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------- |
| 2.1 | Forgot-password flow (Clerk's `prepareFirstFactor({ strategy: 'reset_password_email_code' })`)                                                | 🔴 #1, 🟡 #3           | ~3 hrs                    |
| 2.2 | Google + Microsoft OAuth providers (one-time provider-credential setup, then `signIn.authenticateWithRedirect({ strategy: 'oauth_google' })`) | 🔴 #2                  | ~2 hrs code, 30 min setup |
| 2.3 | Passkeys enrollment in `/profile` (Clerk hook supports it; UI is straightforward)                                                             | 🟢 #5                  | ~3 hrs                    |
| 2.4 | `<UserProfile>` mount in `/profile` page — gives users password change, email change, MFA, session list out of the box                        | —                      | ~1 hr                     |
| 2.5 | Single-device kick page (Stage L in AUTH-LIFECYCLE) — already designed; needs ~80 lines of React                                              | —                      | ~2 hrs                    |
| 2.6 | Reverification (`useReverification`) before destructive actions (account delete, email change)                                                | 🔴 #15 (WCAG security) | ~2 hrs                    |
| 2.7 | Clerk localization → Spanish + maybe Mandarin (`localization={esES}`) — Clerk ships these for free                                            | 🟢 #30                 | ~30 min                   |
| 2.8 | Plain-language copy audit pass on remaining clinic-side pages                                                                                 | 🟡 #21                 | ~2 hrs                    |
| 2.9 | Caregiver-as-clinic-user pattern using Clerk organizations (`useOrganization`) — one caregiver, multiple patient accounts they manage         | 🟢 #34, 🟡 #36         | ~1 day                    |

### Wave 3 — healthcare-specific, deferred until product-market signal

| #   | Item                                                       | Notes                                                                                                               |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 3.1 | HIPAA upgrade to Clerk Enterprise + BAA                    | Required only if we start storing PHI; today's no-PHI design defers this                                            |
| 3.2 | SOC 2 audit                                                | Cost-prohibitive at <50 clinics; revisit when a clinic contract demands it                                          |
| 3.3 | SMS reminders (Twilio or Clerk SMS)                        | Wired but disabled; revisit when Solo $9 tier launches                                                              |
| 3.4 | Phone-call reminders (third channel)                       | TheraNest pattern; consider after SMS                                                                               |
| 3.5 | Help center site (Docusaurus + Cloudflare Pages or Notion) | Off-the-shelf; spin up when support volume warrants                                                                 |
| 3.6 | Dedicated disability support channel (ASL video, TTY)      | Microsoft Disability Answer Desk pattern. Hard to ship at small scale — partnership with Be My Eyes possibly viable |

---

## 7. Decisions that need human input

None of these are tasks for Claude — they require business / product calls:

1. **OAuth providers — which?** Google is universal; Apple is iOS-first; Microsoft helps for clinic-staff scenarios. Pick at least Google.
2. **Clerk plan upgrade — when?** Free covers email + password + Google OAuth for the entire current roadmap. Pro+ unlocks passkeys + MFA + custom session length. Likely worth $20/mo when we cross 10 active clinics.
3. **HIPAA strategy — stay out or jump in?** Today's "no PHI stored, sports-alias only" design avoids HIPAA scope entirely. The patient portal scope expansion in [AUTH-LIFECYCLE.md §7](AUTH-LIFECYCLE.md#7-patient-portal-scope-expansion) keeps that posture by design. If a future clinic asks for "appointment notes" or "diagnosis tagging," that's the inflection point.
4. **Caregiver-via-organizations or via custom relationships?** Clerk orgs give us free invitation flows, role-based permissions, and an `<OrganizationSwitcher>`. A custom `caregivers` table in D1 gives us more control but duplicates Clerk infrastructure. Worth a 30-minute spike to prototype both.
5. **Help center surface — own it or outsource?** Notion-as-help-site is fastest. Docusaurus on CF Pages gives us full control. Both fit the off-the-shelf rule.

---

## 8. The "no your side" scorecard

After Wave 1 ships, this is the complete list of things the founder has to do in third-party dashboards. The goal is to make this list **stop growing**.

| One-time setup                                                                                                         | Status                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Clerk dashboard → Webhooks → Add endpoint pointed at `/api/v1/webhooks/clerk`, copy signing secret to CF Worker secret | ⏳ Once Wave 1.1 ships                                                                     |
| Cloudflare dashboard → enable Workers Logpush                                                                          | ⏳ Already documented in [MASTER.md §Observability](../MASTER.md)                          |
| Cloudflare dashboard → create R2 bucket `ptowl-backups`                                                                | ⏳ One-time per [d1-daily-snapshot.yml](../.github/workflows/d1-daily-snapshot.yml) header |
| Cloudflare dashboard → fork Upptime → CNAME `status.ptowl.com`                                                         | ⏳ Documented in [MASTER.md](../MASTER.md)                                                 |
| (If Wave 2.2 ships) Google Cloud Console → OAuth 2.0 client ID, paste into Clerk dashboard                             | future                                                                                     |
| (If Wave 3.1 ships) Clerk dashboard → upgrade to Enterprise → sign BAA                                                 | future, business decision                                                                  |

That's it. **Recurring** Clerk dashboard work after Wave 1 ships: **zero.**
