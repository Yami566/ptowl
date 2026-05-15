# PTOwl Authentication Lifecycle

> Reference doc for the entire auth surface on `ptowl.com` — wireframes, decisions,
> stages, email policy, timezone strategy, and the lean PR roadmap that gets us
> from today's state to the full feature set.
>
> Companion to:
>
> - [VISION.md](VISION.md) — what & for whom (locked product decisions)
> - [BUILD.md](BUILD.md) — code layout
> - [RUN.md](RUN.md) — ops runbook
> - [../MASTER.md](../MASTER.md) — operational state + secrets + resume playbook

---

## 1. Context

The current auth surface (`/accounts/signin` with Clerk's embedded `<SignIn>`) renders blank on Safari / Firefox / Edge in some configurations. Three days of UI polish shipped on top of a foundation users could not actually log in through.

The fix is a custom email + password form using Clerk's lower-level `useSignIn` / `useSignUp` hooks (same pattern as the user's working `betraiders.net` build). The auth rebuild is on branch `feat/auth-rebuild-betraiders-pattern` (PR #60).

In parallel, a broken-browser escape hatch is now live on production: `/accounts/signin` shows a "Sign in directly →" link below the embedded widget pointing at `clerk.ptowl.com/sign-in`. Safari/FF/Edge users have a working route through until PR #60 lands.

---

## 2. Off-the-shelf bounds

The project rule: no new code outside what's already in the platform stack. The allowed primitives:

| Tier               | What it means                                                        | Examples                                                                                                |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 🟢 Clerk           | Auth primitives from Clerk SDK + Backend API                         | `useSignIn`, `useSignUp`, `useAuth`, `useClerk`, `<UserButton>`                                         |
| 🟢 Cloudflare      | Infra from CF                                                        | D1, R2, Workers, Web Analytics, Turnstile, Workers AI                                                   |
| 🟡 Standard        | Well-documented React + browser APIs from training-material baseline | `useState`, `useEffect`, `react-router-dom`, native HTML forms, `Intl.DateTimeFormat`, `window.print()` |
| 🔴 Custom — REMOVE | Bespoke logic outside the above                                      | Hand-rolled JWT, custom session storage, custom password hashing                                        |

Every new file added to apps/web or apps/api must classify into 🟢 or 🟡. 🔴 items get pulled before merge.

---

## 3. Session model — single device, stay-logged-in

Clerk's `/v1/environment` reports `single_session_mode: true`. One account, one active device. If the user signs in on Device B, Device A's session is invalidated on next API call.

| Behavior                           | Configuration                                  | Where                      |
| ---------------------------------- | ---------------------------------------------- | -------------------------- |
| One device at a time               | Single session mode ON                         | Clerk dashboard → Sessions |
| Stay logged in                     | 7-day session token lifetime (default)         | Clerk dashboard → Sessions |
| "Keep me logged in" checkbox in UI | Cosmetic — Clerk's lifetime is the upper bound | Form UI only               |
| Displaced device kick              | Auto on next `/auth/me` fetch returns 401      | Frontend Stage L (Phase 4) |

Off-the-shelf. No new logic needed.

---

## 4. Auth A-Z stages

Every state a PTOwl user can be in. Some stages are live, some pending PR #60+, some deferred to Phase 4+.

| Stage | Name                                  | Surface                                           | Status                       |
| ----- | ------------------------------------- | ------------------------------------------------- | ---------------------------- |
| A     | Discovery (off-site)                  | Marketing — separate workstream                   | —                            |
| B     | Landing                               | `LandingPage.tsx` + `AuthWidget.tsx`              | ✅ Live                      |
| C     | CTA decision (Log In / Sign Up)       | `AuthWidget.tsx`                                  | ✅ Live                      |
| D     | Sign Up form                          | `SignUpPage.tsx` (clinic name + email + password) | 🟡 PR #60                    |
| E     | Email verification                    | Skipped — admin approval is the gate              | —                            |
| F     | Awaiting approval                     | `AwaitingApprovalPage.tsx`                        | ⏳ PR B                      |
| G     | Admin approval                        | Magic-link email + D1 SQL fallback                | ⏳ PR B                      |
| H     | First login                           | `LoginPage.tsx` (useSignIn flow)                  | 🟡 PR #60                    |
| I     | First-time onboarding                 | `PracticeTypePage.tsx` → `ProfilePage.tsx`        | ⏳ PR G + I                  |
| J     | Active dashboard                      | `DashboardPage.tsx`                               | ✅ Live                      |
| K     | Session persistence                   | Clerk session token + cookie                      | ✅ Live                      |
| L     | Single-device boundary                | Clerk single_session_mode                         | ✅ Live (no UI for kick yet) |
| M-N   | Forgot password                       | Clerk's `prepareFirstFactor` 5-screen flow        | ⏳ Phase 4                   |
| O     | Email change                          | Clerk user-profile API                            | ⏳ Phase 4                   |
| P     | Returning user                        | Auto-resume session if valid                      | ✅ Live                      |
| Q     | Logout (explicit)                     | Dashboard menu → Sign out                         | ✅ Live                      |
| R     | Logout (session expired)              | Auto-redirect to `/login`                         | ✅ Live                      |
| S     | Re-authentication (sensitive actions) | Modal with password re-entry                      | ⏳ Phase 4                   |
| T     | Timezone handling                     | See §6 below                                      | ⏳ PR I                      |
| U-V   | MFA enrollment + audit log            | —                                                 | ⏳ Phase 4+                  |
| W     | Account deletion                      | Profile → Danger zone                             | ⏳ Phase 4                   |
| X-Y   | Admin user list + ban                 | D1 SQL today; admin UI later                      | ⏳ Phase 5                   |
| Z     | Clerk outage graceful degradation     | Static "auth temporarily unavailable" page        | ⏳ Phase 4                   |

---

## 5. Email surface — 5 templates, that's it

Inbox-respect-first policy. No marketing, no surveys, no reminders to patients (those have their own opt-in system in `apps/api/src/services/reminders.ts`).

### Email 1 — Patient welcome

Sent once, on patient self-signup.

```
From: PTOwl <noreply@ptowl.com>
To: <patient_email>
Subject: 🦉 Welcome to PTOwl

We'll only email you about cancellations.
Nothing else.

— PTOwl team
```

### Email 2 — Appointment cancellation

Sent when clinic cancels.

```
From: PTOwl <noreply@ptowl.com>
To: <patient_email>
Subject: Appointment cancelled — <clinic_name>

<clinic_name> cancelled this appointment:

  <day_of_week> <date>, <time>

<if reason is set>
Reason: <clinic_typed_reason>
</if>

For questions, contact:
  <clinic_name>
  <clinic_phone>

View your updated schedule:
  ptowl.com/p/<token>

— PTOwl team
```

### Email 3 — Founder approval needed

Sent to founder on every new clinic signup. Includes two magic-link buttons (approve / deny).

```
From: PTOwl <noreply@ptowl.com>
To: nurelimusabay@gmail.com
Subject: 🦉 New PTOwl signup awaiting approval

A new clinic just signed up for PTOwl:

  Email:        <clinic_email>
  Clinic name:  <clinic_name>
  Signed up:    <utc_timestamp>

Approve or deny with one click. Each link works once
and expires in 7 days.

  [Approve this account]
  [Deny this account]

— PTOwl team
```

### Email 4 — Clinic approved

Sent on approve.

```
Subject: Your PTOwl account is approved

You're in. Sign in at ptowl.com/login.

— PTOwl team
```

### Email 5 — Clinic denied

Sent on deny.

```
Subject: PTOwl account update

We can't approve this account at the moment.
Reply if you think this is a mistake.

— PTOwl team
```

### Implementation

All five fire through MailChannels via the existing `EMAIL_API_KEY` secret. A new `apps/api/src/services/notifications.ts` wraps each template with an env-gate:

```ts
if (env.ENVIRONMENT !== 'production') {
  console.log(`[skip-email] would send ${type} to ${to}`);
  return { skipped: true };
}
```

Dev users get D1 rows + can be approved via SQL but no real emails go out.

### Retry queue

If MailChannels returns 5xx or network errors, the send writes to `pending_notifications` in D1 with a `created_at` timestamp. A daily cron in `apps/api/src/services/notification-retry.ts` re-sends up to 50 pending at a time. Items older than 7 days are marked `failed` for manual review.

---

## 6. Timezone strategy — clinic-local is canonical

| Layer                     | Timezone used                                                     | Why                                                 |
| ------------------------- | ----------------------------------------------------------------- | --------------------------------------------------- |
| D1 storage                | Clinic-local time + `clinic_timezone` column on schedule          | Single source of truth                              |
| Clinic dashboard          | Clinic-local                                                      | Clinic sees their own clock                         |
| Patient `/p/<token>` view | Patient-local (browser tz) + clinic-local on muted secondary line | No ambiguity for cross-tz patients                  |
| Emailed `.ics` file       | UTC body + `TZID=America/Chicago`                                 | Standard RFC 5545; calendar apps convert at display |
| Reminders cron            | UTC vs precomputed `appointment_start_utc`                        | DST-safe                                            |

Libraries: `Intl.DateTimeFormat` (browser native), `ical-generator` (already installed), `date-fns-tz` (add when needed for write-path).

Wireframe for cross-tz patient view:

```
Wed Sept 11
  10:00 AM   ← your time (Phoenix)
  11:00 AM   ← Hooville PT time (Chicago)
```

When both clocks match, the second line is suppressed.

---

## 7. Patient portal (scope expansion)

VISION.md originally said "Patient login — No, magic-link only." That decision was reversed when the user revealed PTOwl's actual mission: help disabled patients track multiple schedules from multiple providers.

| Before                              | After                                                                |
| ----------------------------------- | -------------------------------------------------------------------- |
| Only clinics have accounts          | Two account types: clinic + patient                                  |
| Patients view via `/p/<token>` only | `/p/<token>` still works; patient can ALSO upgrade to a real account |
| One dashboard                       | Two dashboards                                                       |
| Accessibility was "nice to have"    | **ADA-compliant from day one**                                       |

### Patient signup is bottom-up only

- Clinic generates `/p/<token>` share link → emails / SMS / prints to patient
- Patient visits `/p/<token>` (anonymous view, works today) → sees a banner "Save these dates to your PTOwl account"
- Patient clicks → `/signup/patient?from=<token>` → form with email + password + name
- Token from `?from=...` auto-approves the signup. Cold signups (no token) require admin approval.

This preserves the privacy posture (no PHI stored — patient view is a viewer for already-private data) while letting one patient aggregate schedules from multiple clinics.

### ADA accessibility — primary design goal

Every wireframe must satisfy:

| WCAG principle | How PTOwl complies                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| Perceivable    | Semantic HTML (`<label>`, `<button>`, `<nav>`); color never the only signal; alt text on images          |
| Operable       | All actions reachable by Tab; focus visible; `min-height: 44px` touch targets; no hover-only affordances |
| Understandable | Plain English (≤grade-8 readability); error messages explain what to do                                  |
| Robust         | ARIA labels where needed; VoiceOver tested; landmark roles in place                                      |

### Five test personas

Every PR's QA matrix runs through:

1. Adult patient, Chrome desktop (baseline)
2. Pediatric parent (deferred)
3. Geriatric user with large-text mode toggled on
4. Motor-impaired keyboard-only Tab through
5. Visually impaired with macOS VoiceOver

---

## 8. Founder approval — magic-link email (PR B)

The founder approves new clinics in one click from any inbox. Implementation:

- `GET /api/v1/admin/decide?token=<signed-jwt>&decision=approve|deny`
- Token is a one-time-use JWT (uses existing `JWT_SECRET`) carrying `{ pending_user_id, decision_options, expires_at: now + 7d }`
- Clicking flips D1 status + fires the user-facing approval/denial email + returns a confirmation page at `/admin/decide`
- Token invalidated after one use

Off-the-shelf: `jose` library is already in `apps/api/package.json` for JWT signing. No new infra.

SQL fallback (always available): `UPDATE users SET status='approved' WHERE email='doctor@clinic.com';` — documented in [ADMIN-CHEATSHEET.md](ADMIN-CHEATSHEET.md) §2.

---

## 9. Auto-print + auto-email pipeline (PR H)

Three pathways for delivering schedules to patients:

| Pathway                         | Trigger                                                                                         | Output                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| A. Clinic auto-print            | End of 5-keypress flow (keypress 5 = Enter when `patient_email` not set, or `2` for save+print) | `window.print()` opens browser dialog                           |
| B. Auto-email patient           | Same trigger if `patient_email` is set, or `3` to force                                         | MailChannels sends HTML email with `.ics` attachment            |
| C. Patient self-print on mobile | Patient opens share link → tap "Print"                                                          | Native print dialog (AirPrint on iOS, native picker on Android) |

All three reuse existing primitives: `window.print()`, `print.css`, `ical-generator`, MailChannels. Zero new deps.

---

## 10. Onboarding questionnaire (PR G — Stage I.1)

Between admin approval and `/welcome`, new clinics see a single-question screen:

```
What kind of practice do you run?

  [Physical Therapy           ▼]

  Continue →

  Skip — I'll build my own templates
```

Dropdown options: PT, OT, SLP, Chiropractic, Mental Health, Dental Hygiene, Orthodontics, Acupuncture, Massage Therapy, Personal Training, Other.

JSON-driven preset map at `apps/web/src/data/practice-presets.json`. Each occupation maps to 2-3 starter templates with sensible defaults (sessions per week, duration, default time). Founder can edit the JSON without touching code.

---

## 11. Audit findings — what's left

From the §49 big-picture sweep against the live codebase. Severity: Critical / Medium / Polish. Most have been shipped during this session — remaining items below.

### UI / a11y

| #   | Severity | Item                                      | Status                                                           |
| --- | -------- | ----------------------------------------- | ---------------------------------------------------------------- |
| U1  | Critical | Delete-template button aria-label         | ✅ Already labeled (false positive)                              |
| U2  | Medium   | Schedule-not-found error state            | ✅ PR #62                                                        |
| U3  | Medium   | Decorative emojis aria-hidden             | ✅ PR #64                                                        |
| U4  | Medium   | Login/Signup `aria-busy`                  | ⏳ Ships with PR #60                                             |
| U5  | Medium   | Drag handle aria-label                    | ✅ Already labeled                                               |
| U6  | Medium   | Status badges no longer color-only        | ✅ PR #62                                                        |
| U7  | Medium   | ProfilePage field-level validation errors | ⏳ Deferred — needs server-side error routing                    |
| U8  | Medium   | Mobile 44px touch targets                 | ✅ PR #65                                                        |
| U9  | Polish   | Extract inline styles to CSS modules      | ⏳ Deferred — bigger refactor                                    |
| U10 | Polish   | Landmark `main-content` id on all pages   | ✅ PR #63 + PR #69 (Landing/About/SignIn/SignUp/PatientSchedule) |

### DevOps

| #   | Severity | Item                                       | Status                          |
| --- | -------- | ------------------------------------------ | ------------------------------- |
| O1  | SPF      | Clerk URL drift detection                  | ✅ PR #61 — daily smoke test    |
| O2  | SPF      | CF API token D1 scope pre-deploy check     | ✅ PR #68                       |
| O3  | SPF      | MailChannels rotation health endpoint      | ⏳ ~20 min                      |
| O4  | Gap      | Cron failure visibility (Logpush)          | ⏳ User-side CF dashboard click |
| O5  | Gap      | Status page (Upptime fork)                 | ⏳ User-side, ~15 min           |
| O6  | Gap      | `.env.example` for new contributors        | ✅ PR #61                       |
| O7  | Gap      | D1 monthly snapshot before secret rotation | ⏳ ~15 min                      |
| O8  | Gap      | Secrets inventory audit script             | ⏳ ~5 min                       |

### Auth surface

| Item                                                          | Status                                         |
| ------------------------------------------------------------- | ---------------------------------------------- |
| Broken-browser escape hatch on `/accounts/signin` + `/signup` | ✅ PR #66                                      |
| Custom email + password forms (`useSignIn` / `useSignUp`)     | 🟡 PR #60 — awaiting Clerk dashboard click-ops |
| Admin approval gate + magic-link emails                       | ⏳ PR B                                        |
| Awaiting-approval page                                        | ⏳ PR B                                        |
| Patient signup fork picker                                    | ⏳ PR D                                        |
| Patient dashboard (multi-clinic schedule view)                | ⏳ PR E                                        |
| Onboarding questionnaire                                      | ⏳ PR G                                        |
| Schedule edit/cancel + patient cancellation email             | ⏳ PR I                                        |
| Auto-print + auto-email schedule                              | ⏳ PR H                                        |

---

## 12. Lean PR roadmap (post-Round-9, reordered by leverage)

Reordered by risk × leverage, not feature dependency. Items lower in the list are deferred to Phase 4+.

1. ✅ **PR #61** — Observability foundation (smoke test, env example, runbook)
2. ✅ **PR #62** — Schedule a11y (error state, status glyphs)
3. ✅ **PR #63** — Landmark wrappers on Landing + About
4. ✅ **PR #64** — Decorative emoji aria-hidden
5. ✅ **PR #65** — Mobile 44px touch targets
6. ✅ **PR #66** — Broken-browser escape hatch on signin/signup
7. ✅ **PR #67** — This plan archive
8. 🟡 **PR #60** — Custom login/signup forms (in flight, gated on Clerk click-ops)
9. ⏳ **PR B** — Admin approval gate + magic-link emails
10. ⏳ **PR D + E** — Patient portal (signup fork + dashboard)
11. ⏳ **PR F** — ADA accessibility cross-cut (large-text, high-contrast toggles)
12. ⏳ **PR G** — Onboarding questionnaire
13. ⏳ **PR H** — Auto-print + auto-email pipeline
14. ⏳ **PR I** — Schedule lifecycle (edit/cancel + retry queue + timezone)

### Deferred to Phase 4+

- Forgot-password flow (Stages M-N)
- Displaced-device page (Stage L)
- Re-auth modal (Stage S)
- Account deletion (Stage W)
- Clerk outage graceful degradation (Stage Z)
- Admin UI (`/admin/pending` page replacing SQL recipes)
- Pediatric guardian-child linking
- Google OAuth resurfaced as secondary
- GDPR data export
- MFA enrollment + prompt

---

## 13. Resume-from-zero — adding a feature

The plan's modular design makes feature addition mechanical. To add e.g. a "remember-this-browser device list" page:

1. **Page** — copy `LoginPage.tsx` shape, edit body
2. **Hook** — drop `useDeviceList.ts` next to `useLogin.ts`, wrap a Clerk SDK call
3. **Route** — one line in `App.tsx`

Total: ~30-50 lines, all composition. Every new page reuses `AuthCard`, `SubmitButton`, `AuthInlineError`.

---

## 14. Load-bearing invariants

Five rules that hold the product together. Break any and the whole thing slips.

1. **No new code outside the off-the-shelf tier** (§2)
2. **Five email templates, no more** (§5)
3. **Clinic-local time is canonical, patient view converts** (§6)
4. **No PHI stored** — patient portal is a viewer, never a clinical repository
5. **ADA-first design** — every PR runs through the 5-persona test list

---

## 15. Where each kind of thing lives

| Question                               | Open this                                                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "How does login work end-to-end?"      | [apps/web/src/hooks/auth/useLogin.ts](../apps/web/src/hooks/auth/useLogin.ts) (post PR #60)                                                                         |
| "How is a schedule created?"           | [apps/web/src/components/schedule/ScheduleWizard.tsx](../apps/web/src/components/schedule/ScheduleWizard.tsx)                                                       |
| "Patient view?"                        | [apps/web/src/pages/PatientSchedulePage.tsx](../apps/web/src/pages/PatientSchedulePage.tsx) + [apps/api/src/routes/calendar.ts](../apps/api/src/routes/calendar.ts) |
| "Reminders cron?"                      | [apps/api/src/services/reminders.ts](../apps/api/src/services/reminders.ts) + [apps/api/wrangler.jsonc](../apps/api/wrangler.jsonc)                                 |
| "How do I approve a clinic right now?" | [ADMIN-CHEATSHEET.md §2](ADMIN-CHEATSHEET.md)                                                                                                                       |
| "Production secrets?"                  | [../MASTER.md §Secrets](../MASTER.md)                                                                                                                               |
| "What's next?"                         | This file §12                                                                                                                                                       |
| "Site is down — what now?"             | [../MASTER.md §If something broke](../MASTER.md)                                                                                                                    |

---

## 16. What keeps PTOwl up while the user is offline

| Layer    | Provider          | Failure mode   | Mitigation                          |
| -------- | ----------------- | -------------- | ----------------------------------- |
| Frontend | Cloudflare Pages  | Bad deploy     | PR review + cross-browser test gate |
| API      | Cloudflare Worker | Missing secret | O2 token-scope check (pending)      |
| Database | D1                | Bad migration  | 7-day Time Travel rollback          |
| Auth     | Clerk             | Their outage   | Stage Z fallback page (Phase 4)     |
| Email    | MailChannels      | Their outage   | PR I retry queue                    |
| Cron     | Workers Cron      | Silent failure | O4 Logpush (user-side, pending)     |

Production keeps serving users for months without intervention. The only active hand needed is **founder approval** of new clinic signups — and PR B's magic-link email turns that into a one-click action from any inbox.

---

## 17. Rollback per phase

Every PR is independently revertable:

```sh
# 1. Roll back the merge commit
git revert <pr-merge-sha>

# 2. Or roll back the Worker deploy directly
cd apps/api && wrangler rollback

# 3. D1 schema rolls back via Time Travel
# CF dashboard → D1 → ptowl-db → Time Travel → restore to <timestamp>
```

Phase isolation means each shipped PR can be reverted without touching neighbors. No phase depends on a future phase.
