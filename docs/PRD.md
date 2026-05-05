# PTOWL Product Requirements Document (PRD)

**Document Version:** 2.0
**Last Updated:** 2026-05-05
**Author:** PTOWL Development Team
**Status:** Approved (post-Phase-7, pre-Phase-8 launch)

> Sync notes for v2.0: Phase 4 Clerk migration replaced Firebase Auth.
> Phase 5 patient magic-link view (`/p/:token`) shipped. Phase 6
> open-sourced under AGPL-3.0. Phase 7 marketing surface ready
> (SHOW-HN.md draft + open-source about page). Admin console + admin
> 2FA + pending-approval workflow were deleted in the post-hotfix
> cleanup; references removed from this doc accordingly.

---

## 1. Product Overview

**Product Name:** PTOWL
**URL:** https://ptowl.com
**Tagline:** "5 keypresses. Schedule done. Go home on time."

PTOWL is a web-based patient schedule generator that creates complete
recurring appointment schedules in 5 keypresses. It serves individual
medical and dental providers (PT, OT, dentists, sports medicine,
chiropractors) and small clinic staff who need fast, reliable
scheduling without the overhead of a full EMR system. Patients
receive a magic-link URL they can open on their phone to view the
schedule and add it to their calendar.

---

## 2. Feature Inventory

### 2.1 Features — As Built [LIVE]

#### Authentication & Authorization

| Feature                            | Status  | Details                                              |
| ---------------------------------- | ------- | ---------------------------------------------------- |
| Clerk drop-in sign-in widget       | [BUILT] | Google OAuth + email/password, hosted by Clerk       |
| Clerk session JWT verification     | [BUILT] | API verifies Clerk JWTs against Clerk JWKS per req   |
| Auto-provisioning on first sign-in | [BUILT] | First authed call creates D1 user row                |
| Logout (Clerk session clear)       | [BUILT] | Standard Clerk sign-out flow                         |
| CSRF protection                    | [BUILT] | hono/csrf origin-based check + strict CORS allowlist |

#### Dashboard

| Feature                           | Status  | Details                                               |
| --------------------------------- | ------- | ----------------------------------------------------- |
| Template cards (hotkeys 2-6)      | [BUILT] | 5 preset templates displayed as selectable cards      |
| Custom Wizard card (hotkey 1)     | [BUILT] | Opens 6-step keyboard-driven schedule wizard          |
| Saved schedules list              | [BUILT] | Paginated list of user's created schedules (20/page)  |
| Saved Schedules search + chips    | [BUILT] | Filter by alias/initials; Active/Upcoming/Past chips  |
| Schedule preview overlay          | [BUILT] | Overlay with table + calendar views                   |
| Keyboard hotkey shortcuts         | [BUILT] | Press 1-6 to select template, enter initials, confirm |
| Owl logo                          | [BUILT] | Animated owl mascot                                   |
| First-visit ScheduleWizard splash | [BUILT] | localStorage-gated auto-open on first dashboard load  |

#### Schedule Generation

| Feature                      | Status  | Details                                                                                  |
| ---------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| 5-keypress workflow          | [BUILT] | Select preset (1) → 2-letter initials (2-3) → Enter (4) → confirm (5)                    |
| 6-step custom wizard         | [BUILT] | Template, patient, dates, frequency, time, review                                        |
| 5 preset templates           | [BUILT] | Post-Op Knee, Shoulder Recovery, Low Back Pain, Sports Injury, Balance & Fall Prevention |
| Sports alias PII protection  | [BUILT] | 676 initials → sports figures (e.g., "LJ" → "LeBron James")                              |
| Appointment date generation  | [BUILT] | Auto-generates dates based on frequency + duration + excluded weekends                   |
| Table view                   | [BUILT] | Weekly appointment table with date, time, provider, reminder columns                     |
| Calendar view (FullCalendar) | [BUILT] | Interactive calendar with appointment overlays                                           |
| Print preview                | [BUILT] | Browser window.print() with print-optimized CSS                                          |
| Print settings               | [BUILT] | localStorage: default view, show header, notes, reminder column                          |
| Custom template CRUD         | [BUILT] | Create / update / delete templates via /customize/templates                              |
| Schedule delete (UI)         | [BUILT] | Delete button in schedule overlay; confirms via library modal                            |

#### Patient-facing magic-link view (Phase 5)

| Feature                          | Status  | Details                                                     |
| -------------------------------- | ------- | ----------------------------------------------------------- |
| Share menu — patient link        | [BUILT] | "Send to patient" mints `/p/<token>` URL + copy/share-sheet |
| Patient view (`/p/:token`)       | [BUILT] | Mobile-first read-only schedule view with sports alias      |
| iCal feed (`/p/:token.ics`)      | [BUILT] | Calendar feed for "Add to my calendar" on patient device    |
| Calendar JSON (`/p/:token.json`) | [BUILT] | Used by patient view to render the schedule                 |

#### Profile & Settings

| Feature                       | Status  | Details                                                 |
| ----------------------------- | ------- | ------------------------------------------------------- |
| View profile (email, tier)    | [BUILT] | Shows user info; tier reads "Beta access"               |
| Edit clinic info              | [BUILT] | Clinic name, address, phone, email                      |
| Logo URL field                | [BUILT] | Self-hosted logo URL (no in-app file upload)            |
| Account deletion (mailto)     | [BUILT] | "Delete my data" link → mailto:help@ptowl.com           |
| Print settings (auto-persist) | [BUILT] | No save button; settings persist via localStorage       |
| Profile dropdown navigation   | [BUILT] | `<details>` menu — Profile · Templates · Print · Logout |

#### Legal & Compliance Pages

| Feature                       | Status  | Details                                            |
| ----------------------------- | ------- | -------------------------------------------------- |
| Privacy Policy (/privacy)     | [BUILT] | Full privacy policy; reflects Clerk auth + AGPL    |
| Terms of Service (/terms)     | [BUILT] | Full terms page                                    |
| Security Overview (/security) | [BUILT] | Public-facing security architecture overview       |
| About (/about)                | [BUILT] | Long-form marketing copy + open-source positioning |

#### Open-source distribution (Phase 6)

| Feature                      | Status  | Details                                              |
| ---------------------------- | ------- | ---------------------------------------------------- |
| AGPL-3.0 LICENSE in repo     | [BUILT] | Strong copyleft for SaaS protection                  |
| README — Run your own PTowl  | [BUILT] | Deploy-to-Cloudflare button + self-host walkthrough  |
| HOW-TO-DEPLOY.md walkthrough | [BUILT] | 9-step recipe for community deployments              |
| GitHub repo metadata         | [BUILT] | Description, homepage, 15 topics for discoverability |
| .github/FUNDING.yml stub     | [BUILT] | Sponsor button skeleton; uncomment to enable         |

#### Infrastructure & Security

| Feature                     | Status  | Details                                                 |
| --------------------------- | ------- | ------------------------------------------------------- |
| Edge security headers       | [BUILT] | CSP, HSTS (2yr + preload), X-Frame DENY, nosniff, etc.  |
| Cloudflare Turnstile        | [BUILT] | Bot protection on auth-adjacent endpoints               |
| Rate limiting (per IP)      | [BUILT] | Sliding window: 3-20 req/min per endpoint               |
| Email AES-256-GCM at rest   | [BUILT] | Patient reminder emails encrypted with key in Worker    |
| CI/CD (GitHub Actions)      | [BUILT] | Auto typecheck + test + build + wrangler deploy on main |
| Cloudflare Pages git deploy | [BUILT] | Frontend auto-builds + deploys on push to main          |
| Automated test suite        | [BUILT] | Shared + API + Web typecheck + unit tests gate deploy   |

---

### 2.2 Features — Planned [ROADMAP]

#### Phase 8: Coordinated Public Launch (next)

| Feature                        | Status    | Priority | Details                                                   |
| ------------------------------ | --------- | -------- | --------------------------------------------------------- |
| Show HN submission             | [PLANNED] | Critical | SHOW-HN.md draft ready; user picks the day                |
| Repo flip to public            | [PLANNED] | Critical | Toggle visibility on GitHub when ready                    |
| Clerk production promotion     | [PLANNED] | Critical | Custom clerk.ptowl.com domain (CLERK-PRODUCTION-SETUP.md) |
| Cloudflare edge hardening      | [PLANNED] | High     | cf-bootstrap.yml: WAF, Bot Fight, rate limit, alerts      |
| 30-second screencast in README | [PLANNED] | High     | Captures the 5-keypress flow + patient magic-link         |

#### Phase 9: Email + Reminders

| Feature                        | Status    | Priority | Details                                              |
| ------------------------------ | --------- | -------- | ---------------------------------------------------- |
| Outbound email service         | [PLANNED] | High     | Pick MailChannels vs. Resend; wire fetch helper      |
| Auto-email patient magic-link  | [PLANNED] | High     | When provider sets patient_email, auto-send the link |
| Daily digest reminder cron     | [PLANNED] | Medium   | Wire the cron the digest-mode toggle currently fakes |
| 24h / 1h appointment reminders | [PLANNED] | Medium   | Fan out from cron once outbound email is wired       |

#### Phase 10: AI + Multi-provider

| Feature                       | Status    | Details                                             |
| ----------------------------- | --------- | --------------------------------------------------- |
| AI-assisted schedule drafting | [PLANNED] | Cloudflare AI binding wired; prompt-to-schedule TBD |
| Multi-provider clinic mode    | [PLANNED] | One account → many therapists, shared templates     |
| SMS reminders                 | [FUTURE]  | Telnyx or similar; 10DLC reg required               |
| LemonSqueezy monetization     | [FUTURE]  | Gated on 50 active beta clinics                     |
| Patient self-booking          | [FUTURE]  | Patient-facing booking portal                       |

---

## 3. User Flows

### 3.1 New User Sign-Up Flow

```
1. User visits ptowl.com
2. Clerk sign-in widget renders inline on the landing page
3. User clicks "Continue with Google" or "Sign up with email"
4. Clerk handles OAuth/credential flow end-to-end
5. After sign-in, user lands on /dashboard
6. First-visit splash auto-opens the ScheduleWizard
7. (No admin approval gate; no manual provisioning.)
```

### 3.2 Schedule Creation Flow (5-keypress)

```
1. User presses hotkey 2-6 on dashboard (selects preset)
2. Modal appears → user types 2-letter patient initials (e.g., "LJ")
3. System maps "LJ" → "LeBron James" (sports alias)
4. User presses Enter to confirm
5. Schedule generated: dates calculated, appointments created in D1
6. Preview overlay opens with table view
7. User can switch to calendar view, print, share, or close
```

### 3.3 Custom Schedule Flow (Hotkey 1)

```
1. User presses hotkey 1 → Custom Wizard opens
2. Step 1: Select or name a template
3. Step 2: Enter patient initials
4. Step 3: Choose start date
5. Step 4: Set frequency (sessions/week) and duration (weeks)
6. Step 5: Set default appointment time
7. Step 6: Review and confirm
8. Schedule generated and preview opens
```

### 3.4 Patient Magic-Link Flow (Phase 5)

```
1. Provider opens an existing schedule
2. Clicks Share menu → "Send to patient"
3. App mints a /p/<token> URL and copies to clipboard
   (or invokes native share-sheet on mobile)
4. Provider sends the link to the patient via their usual channel
   (text, iMessage, email — patient receives a tap-able URL)
5. Patient opens /p/<token> on their phone — mobile-first view
   with appointment list + sports alias header
6. Patient taps "Add to my calendar" → /p/<token>.ics downloads
   into their calendar app
```

---

## 4. UX Conventions

### Color System

| Color               | CSS Variable | Usage                    |
| ------------------- | ------------ | ------------------------ |
| Green (#1B5E20)     | --green-dark | Primary brand accent     |
| Orange (#e76f51)    | --orange-500 | Attention, action needed |
| Gray (#6c757d)      | --gray-500   | Neutral, secondary text  |
| White (#ffffff)     | --white      | Backgrounds              |
| Off-white (#f8fafc) | --off-white  | Section backgrounds      |

### Interaction Patterns

- **Keyboard-first**: Hotkeys 1-6 for template selection, Enter to confirm
- **Inline styles**: `Record<string, React.CSSProperties>` pattern in pages
- **Loading states**: `LoadingOverlay` component with message prop
- **Error display**: Inline error messages below form fields
- **Modals**: Focus-trapped overlays with Escape to close
- **Print**: Dedicated print CSS with hidden UI elements
- **Profile dropdown**: native `<details>/<summary>` for menu (no JS lib)

### Branding

- Owl mascot ("PTowl — your Patience Trainer")
- Product feel: Clean, clinical, fast, trustworthy
- Marketing feel: Sports humor, owl personality, memorable template names
- Font: Outfit (display) + JetBrains Mono (system surfaces)

---

## 5. Tier Definitions

PTowl is in **free public beta**. Tier gates are documented for the
post-launch monetization phase but not enforced in code today.

### Free Beta Tier (Current — All Users)

| Capability                | Limit                        |
| ------------------------- | ---------------------------- |
| Templates                 | 5 presets + unlimited custom |
| Schedules                 | Unlimited                    |
| Appointments per schedule | Unlimited                    |
| Print preview             | Yes                          |
| Calendar view             | Yes                          |
| Logo (URL)                | Yes                          |
| Patient magic-link share  | Yes                          |

### Future paid tiers (post-launch, gated on 50 active beta clinics)

Pricing canonical source: [BUSINESS-PLAN-CANVAS.md](BUSINESS-PLAN-CANVAS.md).
Free beta currently does not enforce any tier gate.

---

## 6. Non-Functional Requirements

### 6.1 Security

- **Authentication**: Clerk (Google OAuth + email/password)
- **Session management**: Clerk-issued session JWTs verified per request
- **CSRF protection**: hono/csrf middleware (origin/referer check on
  form-encoded POSTs) layered with strict CORS allowlist
- **Input validation**: Zod schemas on all API inputs (shared package)
- **Rate limiting**: Per-IP sliding window on auth endpoints (3-20 req/min)
- **Headers**: CSP, HSTS (2yr + preload), X-Frame-Options DENY,
  nosniff, Permissions-Policy
- **Bot protection**: Cloudflare Turnstile on auth-adjacent endpoints
- **Patient email at rest**: AES-256-GCM with key held only by Worker
- **PII protection**: Sports alias system — no real patient names stored

### 6.2 Performance

- **Page load**: <2 seconds on 3G (code splitting + lazy loading)
- **API response**: <200ms P95 for read operations
- **Schedule generation**: <500ms including DB writes
- **Bundle size**: Critical path (landing + dashboard) in main bundle;
  legal / customize / patient routes lazy-loaded

### 6.3 Accessibility (WCAG 2.1 AA Target)

- Skip-to-main-content link
- ARIA labels on interactive elements
- Focus traps in modal overlays
- Keyboard navigation for all workflows
- Color contrast ratios meeting AA standards
- Screen reader compatible form labels and error messages

### 6.4 Browser Support

- Chrome 90+ (primary)
- Firefox 90+
- Safari 15+
- Edge 90+
- Mobile: iOS Safari 15+, Chrome for Android

### 6.5 Availability

- Target: 99.9% uptime (Cloudflare infrastructure)
- Graceful degradation: email failures don't block sign-in
- D1 point-in-time recovery: 7 days on free tier (automatic)
- No single points of failure (Cloudflare global edge network)

---

## 7. Routes & Pages

| Route                | Page                | Auth Required | Description                         |
| -------------------- | ------------------- | ------------- | ----------------------------------- |
| /                    | LandingPage         | No            | Landing + Clerk sign-in widget      |
| /dashboard           | DashboardPage       | Yes           | Main hub: presets + saved schedules |
| /schedule/:id        | SchedulePage        | Yes           | Individual schedule view            |
| /customize/templates | TemplateEditorPage  | Yes           | Edit template properties            |
| /customize/print     | PrintSettingsPage   | Yes           | Print preferences                   |
| /profile             | ProfilePage         | Yes           | User profile + clinic info          |
| /about               | AboutPage           | No            | Long-form marketing + about         |
| /privacy             | PrivacyPolicyPage   | No            | Privacy policy                      |
| /terms               | TermsOfServicePage  | No            | Terms of service                    |
| /security            | SecurityPage        | No            | Security overview                   |
| /p/:token            | PatientSchedulePage | No (token)    | Mobile-first patient view           |
| \*                   | NotFoundPage        | No            | Owl 404 page                        |

---

## 8. API Endpoints

| Method | Path                        | Auth  | Description                                   |
| ------ | --------------------------- | ----- | --------------------------------------------- |
| GET    | /api/v1/health              | None  | Health check                                  |
| GET    | /api/v1/me                  | User  | Get current user + profile                    |
| GET    | /api/v1/schedules           | User  | List schedules (paginated)                    |
| POST   | /api/v1/schedules           | User  | Create schedule + appointments                |
| GET    | /api/v1/schedules/:id       | User  | Get schedule with appointments                |
| DELETE | /api/v1/schedules/:id       | User  | Delete schedule + appointments                |
| POST   | /api/v1/schedules/:id/share | User  | Mint patient magic-link `/p/:token`           |
| GET    | /api/v1/templates           | User  | List user's templates                         |
| POST   | /api/v1/templates           | User  | Create custom template                        |
| PUT    | /api/v1/templates/:id       | User  | Update template properties                    |
| DELETE | /api/v1/templates/:id       | User  | Delete template                               |
| PATCH  | /api/v1/appointments/:id    | User  | Update appointment (time, provider, reminder) |
| GET    | /api/v1/profile             | User  | Get clinic profile                            |
| PUT    | /api/v1/profile             | User  | Update clinic info                            |
| GET    | /api/v1/alias               | User  | Get sports alias for initials                 |
| GET    | /p/:token                   | Token | Patient-facing schedule page (HTML)           |
| GET    | /p/:token.json              | Token | Patient schedule data                         |
| GET    | /p/:token.ics               | Token | Patient calendar feed                         |

---

_This document is maintained alongside the codebase and updated as
product requirements evolve. Pricing details live in
[BUSINESS-PLAN-CANVAS.md](BUSINESS-PLAN-CANVAS.md). Vision lives in
[PTOWL-NORTH-STAR.md](PTOWL-NORTH-STAR.md). Launch readiness lives
in [PRODUCTION-LAUNCH-RUNBOOK.md](PRODUCTION-LAUNCH-RUNBOOK.md)._
