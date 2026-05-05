# PTowl north star

This is the long-arc vision document. Companion to:

- [docs/AUTOMATION-PLAN.md](AUTOMATION-PLAN.md) — operational automation
  in plain English, evolves session-by-session.
- [docs/PRODUCTION-LAUNCH-RUNBOOK.md](PRODUCTION-LAUNCH-RUNBOOK.md) —
  Cloudflare/Firebase/GitHub dashboard hardening checklist.
- [docs/CLERK-PRODUCTION-SETUP.md](CLERK-PRODUCTION-SETUP.md) — promote
  Clerk dev → production instance.

The north-star doc is the "where are we going" map. The other docs are
the "how do we get the next mile" maps.

Last updated: 2026-05-04.

---

## The 6-month vision

PTowl becomes **the default open-source tool that PT and dental clinics
reach for when they want to print patient schedules.** Not because it's
the cheapest. Because it's the best UX in a niche where every other
tool is either bloated EHR garbage or a Google Sheet.

Open source under **AGPL-3.0** — anyone can use it; anyone running it
as a SaaS must share their changes back. Public launch coordinated
with a polished marketing surface + a Show HN post.

The strategic theme: **every working clinic creates 3 owl-fan healthcare
providers** through word-of-mouth, because PTowl saves them 30 minutes a
day in a niche where no software has cracked it.

## Operating context

- **Stage:** Beta with handful of test clinics. <100 schedules/day.
- **Stack:** Cloudflare Workers (front + API), D1, R2; Clerk auth; Vite
  - React 19 + React Router 7; jose for JWT verification.
- **Team:** Solo founder.
- **Budget:** Whatever it takes within reason. Strong preference for
  reusing existing tools / libraries before adding new SaaS.
- **Code freedom:** Bold but reviewable. Prefer existing libraries and
  patterns over hand-rolled custom code.

## What's already shipped (as of 2026-05-04)

- ✅ 5-keypress schedule generation (the brand promise)
- ✅ Sports-alias privacy failsafe (676 aliases mapped to initials)
- ✅ Print-ready schedules with iCal export
- ✅ Animated owl + city brand SVG (custom-drawn, segmented)
- ✅ **Auth migration Firebase → Clerk complete** (Phases 1-4 done;
  zero Firebase code remains in repo or bundle, ~250 lines deleted,
  bundle 27% smaller)
- ✅ **Patient-facing magic-link schedule view** at `/p/:token`
  (Phase 5; mobile-first, reuses existing share_token, no new auth)
- ✅ **Share menu integration** — provider's "Send to patient"
  button mints/copies the patient URL via native share or clipboard
- ✅ **Open-source artifacts** — AGPL-3.0 LICENSE, CONTRIBUTING.md,
  CODE_OF_CONDUCT.md, SECURITY.md (Phase 6; repo stays private until
  Phase 8 launch flip)
- ✅ **Marketing surface** — About page "Open source, on purpose."
  section, Show HN draft at docs/SHOW-HN.md (Phase 7)
- ✅ Cloudflare edge security: WAF, Bot Fight Mode, Rate Limiting on
  /api/\*, Worker Errors notification, Web Analytics — all shipped
  via the cf-bootstrap.yml workflow_dispatch
- ✅ CI/CD pipeline auto-deploys on every push to main (CI + Deploy
  - CF Workers Builds, all on Node 22 + wrangler v4)
- ✅ Documented automation plan (AUTOMATION-PLAN.md), production
  launch runbook (PRODUCTION-LAUNCH-RUNBOOK.md), Clerk production
  cutover (CLERK-PRODUCTION-SETUP.md), Show HN draft (SHOW-HN.md)

## What's next (in order)

### Phases 1-7 — ✅ COMPLETE (May 2026)

Auth migration, Firebase removal, patient magic-link view, AGPL +
community files, Show HN marketing draft. See "What's already
shipped" above for the detailed list.

### Phase 8 — Coordinated launch (calendar-day decision, user-driven)

The actual public flip. All in one calendar day so the first wave of
visitors hits a polished surface:

- Morning: flip GitHub repo from private to public.
- Same morning: post to Hacker News with the prepared SHOW-HN.md.
- Same morning: post to relevant subreddits (r/physicaltherapy,
  r/dentistry, r/selfhosted) — use the same hook.
- Monitor for the next 12-24 hours. Respond to comments. Track CF
  Web Analytics for traffic spikes.
- Two days after launch: assemble feedback. Decide what's next.

Pre-launch checklist + Show HN post body live in
[docs/SHOW-HN.md](SHOW-HN.md). Ready when the founder is.

---

### Historical phase notes (for context only — phases 4-7 are done)

#### Phase 4 — Firebase cleanup ✅ DONE (commit 2623879)

Remove Firebase code now that Clerk is live. Net deletion of ~250
lines + 2 npm dependencies. Improves bundle size, reduces confusion
in the public-facing repo, makes the Clerk migration the canonical
auth story.

Files to delete:

- [`apps/web/src/firebase.ts`](../apps/web/src/firebase.ts)
- [`apps/api/src/auth/firebase-verify.ts`](../apps/api/src/auth/firebase-verify.ts)

Dependencies to remove from [`apps/web/package.json`](../apps/web/package.json):

- `firebase`
- `firebaseui`

Dependencies to remove from [`apps/web/src/components/auth/FirebaseAuthUI.tsx`](../apps/web/src/components/auth/FirebaseAuthUI.tsx):

- All Firebase compat imports (already done in Phase 3)
- The component name itself stays for now; rename to `AuthWidget.tsx`
  in a later commit so the Phase 4 diff is purely subtractive.

Wrangler config to clean up:

- Remove `FIREBASE_PROJECT_ID` from [`apps/api/wrangler.jsonc`](../apps/api/wrangler.jsonc)
- Remove from [`apps/api/src/types/env.ts`](../apps/api/src/types/env.ts)

After Phase 4 ships, the repo has zero Firebase references.

### Phase 5 — Patient-facing magic-link schedule view

The single feature the founder is most excited about, and the right
strategic bet:

**Patient experience:** Provider creates a schedule. Patient gets an
email with a magic link. Patient taps link on their phone, lands on a
mobile-friendly page showing their schedule, with a big "Add to
calendar" button. No login, no app to install, no PHI collected
beyond what providers already type. They can also tap "Confirm" or
"Reschedule" — and we surface that signal back to the provider's
dashboard.

**Why now:** It's the highest-leverage feature for word-of-mouth.
Every patient who gets this experience tells their PT/dentist about
PTowl. And it doesn't require new auth infrastructure — we already
have a share-token system. The patient page is just an
unauthenticated route gated by a signed token.

**Implementation sketch (no new auth, mostly reuse):**

- New route: `/patient/:scheduleId/:token` — public.
- Worker endpoint: `/api/v1/public/schedule/:id?token=...` —
  validates the HMAC of `(scheduleId + secret)` matches token,
  returns schedule + appointments.
- Reuse existing iCal generator for the "Add to calendar" button.
- Confirm/Reschedule buttons → tiny POST endpoints that update an
  `appointments.patient_response` column (new column, lightweight
  D1 migration).
- Email delivery: when the schedule is created with `patient_email`
  set (already optional today), automatically send the magic-link
  email. Outbound email service decision deferred (see Open Questions
  below).

**Mobile-first design:** The page MUST look gorgeous on a phone
because that's where 95% of clicks happen. Sports-alias header,
date list, big tappable confirm. Owl mascot in the corner.

### Phase 6 — Open-source the repo

Add the artifacts that turn a private repo into a community-ready
project. None of this is code; all in `/` or `/.github/`:

- [`LICENSE`](../LICENSE) — AGPL-3.0 full text from
  https://www.gnu.org/licenses/agpl-3.0.txt
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — how to clone, install
  deps via pnpm, run local dev, where the architecture lives
- [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) — Contributor
  Covenant 2.1
- [`SECURITY.md`](../SECURITY.md) — how to report security issues
  (private email, not public GitHub issue)
- Beef up [`README.md`](../README.md) — front-and-center value prop,
  screenshot, "Deploy to Cloudflare" button if Cloudflare offers one
  for Workers, link to docs, AGPL badge

Repo stays private through this phase. We polish in private.

### Phase 7 — Marketing surface for launch

The public face. Three pieces:

1. **Landing page polish** — already strong (owl scene + 5 keypress
   promise). Tighten copy, add a 30-second demo gif/video, add a
   "Star us on GitHub" pill that's hidden until repo is public.
2. **About page beef-up** — currently good. Add a section called
   "Why we open-sourced this" with the AGPL choice rationale, and
   the "default tool" thesis.
3. **Show HN draft** — write the post copy in `docs/SHOW-HN.md`.
   Title: "Show HN: PTowl — open-source PT/dental schedule generator
   in 5 keypresses." Hook with the print-and-go animation. Show the
   sports-alias privacy gimmick. Link to a public live demo (the
   landing page itself + a screencast).

### Phase 8 — Coordinated launch

The actual flip. All in one calendar day so the first wave of
visitors hits a polished surface:

- Morning: flip GitHub repo from private to public.
- Same morning: post to Hacker News with the prepared SHOW-HN.md.
- Same morning: post to relevant subreddits (r/physicaltherapy,
  r/dentistry, r/selfhosted) — use the same hook.
- Monitor for the next 12-24 hours. Respond to comments. Track CF
  Web Analytics for traffic spikes.
- Two days after launch: assemble feedback. Decide what's next.

## Backlog (post-launch, in priority order)

### Compounding automation

- **Daily D1 → R2 backups** via Cron Trigger. Already in the
  AUTOMATION-PLAN doc.
- **Outbound email service decision** (Resend / MailChannels /
  SendGrid). Required for patient magic-link delivery (Phase 5).
- **Clerk production instance promotion** — flip from
  `ethical-dingo-48.clerk.accounts.dev` to `clerk.ptowl.com`. Steps
  fully documented in CLERK-PRODUCTION-SETUP.md.
- **Branded magic-link sender** — `link@ptowl.com` instead of
  Clerk's default. DKIM/SPF DNS records via cf-bootstrap.yml.

### Higher-leverage features

- **AI-assisted schedule creation** — provider types
  "ankle sprain 6 weeks" → Cloudflare AI binding (already in
  wrangler.jsonc) drafts a template + reminder copy. Saves 2 min per
  schedule. Magical first-impression for press / Show HN.
- **SMS reminders + 2-way reply** — Twilio webhook → Worker. Patient
  gets reminder, replies "C" to confirm or "R" to reschedule.
  ~$0.01/SMS. Real retention impact.
- **Multi-provider clinics** — add team members to one clinic
  account, share templates, audit log per provider. Unlocks the
  "Clinic" tier of pricing if/when we monetize.
- **Insurance auth tracker** — track auth status per patient
  (pending/approved/denied/expired). Auto-remind 7 days before auth
  expires. Visit count (X of N visits used).

### Brand polish

- Real owl illustrations (paid artist, ~$300)
- Sound effects on print success (optional, off by default)
- Dark mode pass (codebase already has dark-theme.css)
- Real demo video for Show HN (screencast + voiceover)
- "Deploy to Cloudflare" 1-click button on README

### Monetization (deferred)

- Free tier: 5 active patients, watermark on print
- Pro: $19/mo, unlimited patients, no watermark
- Clinic: $79/mo, multi-provider + audit log
- LemonSqueezy webhook → tier flag in D1 → soft-gate features
- Don't ship until we have ~50 active beta clinics begging for it

## Things we deliberately won't do

- **Become a HIPAA-secure system.** Sports aliases are the privacy
  failsafe. Anyone needing real PHI handling should buy an EHR.
- **Build a mobile app.** PWA is enough. Apple Developer fees + App
  Store hassle aren't worth it at our scale.
- **Add patient login.** The magic-link approach is the design. Login
  walls add friction that kills the no-show prevention thesis.
- **Sell our own SMS service.** Use Twilio. They're better at it.
- **Self-host email.** Use a real outbound email service. Same
  reasoning.

## Open questions

Tracked here so future-us doesn't lose them:

- **Outbound email service: Resend vs. MailChannels vs. SendGrid?**
  Decide before Phase 5 ends so patient magic-link emails actually
  send. Lean: Resend ($20/mo for 50K emails — clean dev experience).
- **Public Clerk production cutover timing?** Currently deferred.
  Could happen any session. Trigger: when we want `clerk.ptowl.com`
  to show in OAuth popups for the Show HN launch.
- **Demo video format?** Loom vs. screen recording + voiceover vs.
  hand-edited After Effects polish? Affects how much time we spend
  on Phase 7.
- **PII detection on patient initials inputs?** Old plan had this as
  Item B. Worth doing pre-launch since open-source means random
  people will try to type real names. Library: `compromise` or a
  regex on `^[A-Z][a-z]+\s+[A-Z][a-z]+$`.
- **Custom Google OAuth client for Clerk production?** Required when
  we promote Clerk to production. ~5 min in Google Cloud Console.

## Decision log

Append-only. Date + one sentence. Newest at the bottom.

- **2026-05-03** — North-star doc created. Long-term vision: open-
  source default tool for PT/dental schedule generation.
- **2026-05-03** — Chose AGPL-3.0 over MIT/Apache to discourage
  drive-by SaaS rip-offs while keeping community adoption open.
- **2026-05-03** — Public launch deferred until coordinated Show HN
  moment — repo stays private through Phases 4-7.
- **2026-05-03** — Patient-facing magic-link schedule view picked as
  the next feature to build (Phase 5) — highest UX leverage,
  reuses existing share-token system, perfect Show HN demo.
- **2026-05-03** — Clerk production cutover deferred to a focused
  follow-up session — dev instance is fine for build-out work, the
  brand polish of `clerk.ptowl.com` matters most at launch time.
