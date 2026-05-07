# PTowl — Vision

> The strategy doc. The "why we're building this" doc. The "no, we're not
> pivoting to primary care" doc. Every locked decision lives here.
> Build / Ship / Run answer "how"; this answers "what" and "for whom".

**Last updated:** 2026-05-06

---

## TL;DR

PTowl is a Cloudflare-hosted scheduling tool for therapy clinics that book
**recurring appointment series** — PT, OT, SLP, chiro, mental-health, dental
hygiene, addiction recovery. The brand promise is **5 keypresses** to a
printed schedule, with **sports-alias privacy** (no PHI stored) and
**deliberate ugliness** (Craigslist, not Linear). Free during beta until 50
active clinics; **Solo $9/mo, Clinic $29/mo per provider** after that. The
Phase 8 success metric is 10 active beta clinics generating schedules
weekly. Not signups. Active usage.

---

## Master prompt (locked)

This paragraph drives every product decision. It is not edited
casually.

> **PTowl is the Craigslist of clinic scheduling.** We compete on speed
> (5 keypresses), privacy (sports aliases, no PHI stored), and price
> (free during beta, $9-$29 paid later). The product is **deliberately
> not pretty** — it is fast, honest, and self-serve. Our market is
> overworked clinic staff at therapy practices (PT, OT, SLP, chiropractic,
> mental-health/therapy, dental hygiene), not enterprises. We win when
> one clinician shows another in the break room, not when a CMO sees a
> deck. Every product decision answers one question: **does this help
> that clinician finish their schedule 10 seconds faster?** If not, we
> don't ship it.

**Why "Craigslist" and not "Linear" or "Notion":** Craigslist is worth
billions because it serves its market deeply, simply, reliably — at a
visual fidelity that would embarrass a junior designer. PTowl's market
is closer to Craigslist's than Linear's. Polish above a baseline doesn't
earn the 10th clinic. Speed, reliability, and trust earn it.

**The one-line litmus test for every PR:** Does this help a clinician
finish their schedule 10 seconds faster? If not, push back.

---

## Audience

PTowl serves the **recurring-appointment-series family**. Every supported
specialty books the same shape: a patient comes 2-3x/week for 6-12 weeks
and the schedule for the whole arc is the artifact.

| Specialty                  | Recurring-series shape              | Privacy sensitivity |
| -------------------------- | ----------------------------------- | ------------------- |
| Physical therapy (primary) | 2-3x/week × 6-12 weeks              | High (HIPAA)        |
| Occupational therapy       | 2-3x/week × 6-12 weeks              | High (HIPAA)        |
| Speech-language pathology  | 1-2x/week × 12+ weeks (school year) | Very high (FERPA)   |
| Chiropractic               | 2-3x/week × 6-12 weeks              | High                |
| Mental health / counseling | 1x/week ongoing                     | Highest (stigma)    |
| Dental hygiene             | 2x/year cleanings; perio recall     | High                |
| Addiction recovery         | Daily/weekly group + individual     | Very high           |

**Explicitly NOT served:**

- Primary care (mostly one-off visits — wrong shape)
- Specialists doing one-time consults (cardiology, dermatology)
- ER / urgent care
- Surgery scheduling
- Patient-initiated booking (Calendly already does that; we don't)

If "all medical providers" feels broader than this, resist. Saying yes
to primary care dilutes the message for the audience that actually
converts.

**Early-adopter profile:** sports-PT solo practitioner, $90-$150/hr cash,
already lukewarm on their EMR's scheduler, books 6-12 patients/day,
keyboard-fluent.

---

## The problem PTowl exists to fix

Three pains, in plain English:

1. **Slow scheduling.** Generating a 12-appointment recurring series in
   an EMR takes 2-5 minutes per patient: dropdowns, modals, page reloads.
   PTs do this 8-25 times a day. PTowl does it in 5 keypresses, in seconds.
2. **Patient no-shows.** No-show rates in outpatient PT run 10-25%. Each
   no-show costs the clinic $80-$200 in unfilled slot revenue. Reminders
   and a clean patient-facing schedule view cut no-shows roughly in half
   within two weeks.
3. **HIPAA scope creep.** EMR vendors push every clinic into a Business
   Associate Agreement and a 200-page compliance manual just to print
   a calendar. PTowl never stores PHI — initials are mapped to sports
   aliases (676-entry dictionary) at the application boundary. No BAA
   needed because there's nothing to associate.

**Existing alternatives clinics use today:** WebPT, Jane App,
ClinicSource, Acuity, SimplePractice, paper calendars, "schedule on a
sticky note then type into the EMR later." None of them compete on
speed.

---

## Locked decisions (do not relitigate)

These are settled. Re-opening any of them requires founder review and
a new dated entry in the decision log at the bottom of this file.

| Decision                       | Value / status                                           |
| ------------------------------ | -------------------------------------------------------- |
| Brand promise                  | **5 keypresses** (not 3, not "around 5")                 |
| Audience                       | Recurring-appointment-series family (see above table)    |
| Audience exclusion             | Primary care, ER, surgery, patient-initiated booking     |
| Beta pricing                   | **Free** for everyone until 50 active clinics            |
| Paid tier 1                    | **Solo $9/mo** — unlimited patients, 1 provider          |
| Paid tier 2                    | **Clinic $29/mo per provider** — multi-provider          |
| Existing-free-user grandfather | Advance notice before paid tiers ship                    |
| Pricing gate                   | Don't ship paid tiers until 50 active beta clinics       |
| License (repo)                 | **AGPL-3.0** — repo stays AGPL                           |
| License (marketing)            | OSS positioning **deleted from /about** (commit 42d763d) |
| Auth                           | **Clerk** — Firebase removed, zero references in repo    |
| Privacy posture                | **NOT HIPAA**, explicit, best-in-class clarity           |
| PHI handling                   | None stored — sports aliases at the app boundary         |
| Stack                          | Cloudflare Workers + D1 + R2; React 19 + RR7; Vite       |
| Mobile app                     | **No.** PWA only. Capacitor wiring already deleted.      |
| Patient login                  | **No.** Magic-link only via `/p/<token>`                 |
| HIPAA-secure system            | **No.** Anyone needing PHI handling buys an EHR.         |
| Self-hosted SMS                | **No.** Use Twilio.                                      |
| Self-hosted email              | **No.** Use a real outbound email service.               |
| Phase 8 success metric         | **10 active beta clinics** generating schedules          |

**The AGPL-but-not-marketed posture:** the repo is AGPL-3.0 and stays
that way for legal/governance reasons (discourages drive-by SaaS
rip-offs). The user-facing site does not advertise this — the
self-host / fork-the-repo / "open source on purpose" framing was
deliberately deleted from the public site. Don't reintroduce OSS
marketing tropes in user-facing copy. The license is a fact, not a
pitch.

---

## Pricing

Canonical source: [docs/BUSINESS-PLAN-CANVAS.md](BUSINESS-PLAN-CANVAS.md).
Reproduced here for convenience. **Edit there first.**

| Tier                 | Price               | Includes                                                     | Target                      |
| -------------------- | ------------------- | ------------------------------------------------------------ | --------------------------- |
| **Free** (beta)      | $0/mo               | Unlimited patients, all features, no enforcement             | Every user during beta      |
| **Free** (post-beta) | $0/mo               | Up to 3 active patients, all features                        | Solo provider trying it out |
| **Solo**             | $9/mo               | Unlimited patients, 1 provider, email reminders, custom logo | Solo provider going daily   |
| **Clinic**           | $29/mo per provider | Multi-provider dashboard, analytics, priority support        | Multi-provider clinics      |
| Future               | $0.05/patient/mo    | White-label embed                                            | OEM partners (deferred)     |

**Pricing position rationale:**

- The **Solo $9/mo** deliberately undercuts every generic scheduler
  (Calendly $12, Acuity $20+, Cal.com $15) and positions PTowl as
  "the schedule you'd already pay $30/mo for, except $9."
- The **Clinic $29/mo per provider** scales linearly so multi-clinic
  adoption doesn't punish growth.
- Both tiers sit **well below full EHR systems** ($99-$399/mo). PTowl
  doesn't replace them; it complements or runs alongside.
- **Margins:** ~95% gross at scale because the marginal Cloudflare
  cost of an additional clinic is dollars per year, not per month.

**Pricing is gated.** No paid tier ships until **50 active beta
clinics** validate the free experience. Until then every user is on
the free beta and tier gates are not enforced in code. Existing free
users get advance notice before any paid tier flips on.

**Year-1 target:** 200 paid users at blended $14/mo = ~$33,600 ARR.
**Year-2 target:** 1,000 paid users at blended $16/mo = ~$192,000 ARR.

**Payment processor:** LemonSqueezy (Merchant of Record, automatic
sales tax + VAT, 5% + $0.50/tx). Decision deferred until paid tiers
actually ship; Stripe is the alternative if per-clinic pricing math
demands more flexibility. See [BUSINESS-PLAN-CANVAS.md] §6 and
[MARKET-ANALYSIS.md] §3.

---

## Market position

PTowl is not trying to be a category leader in any existing category.
It's a wedge: scheduling-only, scheduling-first, in a market where
every alternative is either an EHR with scheduling buried inside or a
generic Calendly clone with no specialty workflow.

### Honest comparison vs. real competitors

| Competitor         | Pricing        | Where they win                                      | Where PTowl wins                                          | Where PTowl doesn't fit                              |
| ------------------ | -------------- | --------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| **WebPT**          | $99-$399/mo    | Full EMR, billing, documentation, insurance         | 5 keypresses vs 12-20 clicks; 10-30x cheaper; no contract | Clinics that need full EMR + billing + insurance     |
| **Jane App**       | CAD $54-$79/mo | Highest-rated PT software (4.8/5); EHR + scheduling | Faster scheduling-only flow; no Canadian-billing focus    | Clinics already happy with Jane                      |
| **SimplePractice** | $29-$99/mo     | Mental-health-first EHR, billing, telehealth        | Faster scheduling; sports-alias privacy on print          | Therapists who need full clinical notes + billing    |
| **Calendly**       | $0-$20/mo      | Patient-initiated booking, polished UI              | Recurring-series workflow; specialty-aware templates      | Use cases where the patient should pick the time     |
| **Cal.com**        | $0-$30/mo      | Open-source, polished, dev-friendly                 | Therapy-clinic ergonomics; no-PHI privacy posture         | Generic 1:1 booking, dev tools, sales calls          |
| **Acuity**         | $20-$45/mo     | Strong patient-facing booking                       | Provider-driven recurring-series creation                 | Patient-initiated booking heavy practices            |
| **ChiroTouch**     | $99-$299/mo    | Legacy chiropractic EHR                             | Modern web stack; 10x cheaper; not desktop-only           | Existing ChiroTouch shops with deep workflow lock-in |
| **Paper / Excel**  | $0             | Free, no learning curve                             | Reminders, share-link, ICS export, sports-alias privacy   | Practices that genuinely have no software budget     |

**The wedge:** every competitor is either too expensive, too generic,
or too coupled to a billing/EHR product that the clinic doesn't want.
PTowl is the only tool a clinician can adopt **alongside** their
existing EMR without asking IT.

### Where PTowl genuinely doesn't compete

- **Patient-initiated booking.** Calendly does this. PTowl doesn't.
- **Insurance billing / claims.** Buy an EHR.
- **Clinical documentation / SOAP notes.** Buy an EHR.
- **HIPAA-as-a-feature.** PTowl is HIPAA-honest, not HIPAA-certified.
  Anyone needing real PHI handling should buy an EHR.

---

## Phase 8 success metric

**10 active beta clinics generating schedules weekly.** Not signups.
Active usage.

**Why "active"** — signups are vanity. A clinic that signs up and
never returns proves nothing. A clinic generating 5+ schedules a
week proves the product is actually saving them time.

**Why "10"** — 10 is enough to hear distinct voices in feedback (one
clinic's outlier complaint isn't a roadmap), and small enough that
the founder can manually reach out to every one when something
breaks. Past 10, automation matters more than any single conversation.

**Why "clinics" not "users"** — a single PT trying it out is a weak
signal; a clinic that integrates PTowl into their weekly Monday
schedule-generation ritual is a strong one. The clinic is the unit
of conversion, even when the buyer is one therapist.

**The 50-clinic gate sits past Phase 8.** That's the threshold for
flipping paid tiers on. Phases between 10 and 50 are a feedback-and-
iteration period: ship features the first 10 ask for, get to 50, then
flip the price switch.

---

## What's coming after Phase 8

Honest roadmap. Each item flagged with rough sequencing or "deferred."

### Compounding automation (post-launch, near-term)

- **Outbound email service decision** — Resend, MailChannels, or SendGrid.
  Required for patient magic-link delivery. Lean: Resend ($20/mo for
  50K emails). **Deferred — Phase 9.**
- **Branded magic-link sender** — `link@ptowl.com` instead of Clerk's
  default. DKIM/SPF DNS records via cf-bootstrap workflow.
- **Daily D1 → R2 backups** via Cron Trigger. Already documented; just
  needs to ship.
- **Status page** — `status.ptowl.com` via Upptime fork. ~10 minutes
  user-side.

### Higher-leverage features (post-50-clinic)

- **AI-assisted schedule creation** — provider types "ankle sprain
  6 weeks" → Cloudflare AI binding (already in `wrangler.jsonc`)
  drafts a template + reminder copy. Saves ~2 minutes per schedule.
  Magical first-impression for press. **Deferred** to after
  the first 50 active clinics validate the manual flow.
- **SMS reminders + 2-way reply** — Twilio webhook → Worker. Patient
  gets reminder, replies "C" to confirm or "R" to reschedule.
  ~$0.01/SMS. Real retention impact. **Deferred — Phase 10+.**
- **Multi-provider clinics** — add team members to one clinic account,
  share templates, audit log per provider. **Unlocks the Clinic tier.**
  Sequenced just before paid-tier flip.
- **Insurance auth tracker** — track auth status per patient
  (pending/approved/denied/expired), auto-remind 7 days before expiry,
  visit count (X of N visits used). **Deferred — Phase 11+.**
- **Clinic-type questionnaire on first login** — seeds templates with
  appropriate preset names per provider type ("Walk It Off, Champ"
  for sports PT, "30-Min Adjustment" for chiro). Net-new code; **deferred**.
- **Sample data on first login** — auto-seed a "Welcome, here's a fake
  schedule for SAMPLE PATIENT" so the dashboard isn't empty. Net-new
  code; **deferred**.

### Vertical expansion (medium-term)

Driven by [docs/MARKET-ANALYSIS.md](MARKET-ANALYSIS.md). Order of
expansion is based on alignment with the recurring-series shape, not
TAM size.

| Vertical                       | Sequencing             | Notes                                    |
| ------------------------------ | ---------------------- | ---------------------------------------- |
| PT (current primary)           | Now                    | Anchor specialty                         |
| OT / SLP                       | 60-90 days post-launch | Identical workflow, zero adaptation      |
| Chiropractic                   | 6-12 months            | Same recurring shape; legacy competitors |
| Mental health                  | 6-12 months            | Highest privacy value (sports aliases)   |
| School-based SLP/OT            | 6-12 months            | **Greenfield** — no competitor exists    |
| Dental hygiene                 | 12-24 months           | 2x/year recall; different cadence        |
| IEP meeting scheduling         | 12-24 months           | Greenfield, FERPA                        |
| Home health                    | 24+ months             | Needs route-optimization layer           |
| Tutoring / Trades (HVAC, etc.) | 24+ months             | Out of healthcare; different motion      |

**The strategy:** anchor in PT, expand to OT/SLP/chiro/mental-health on
the **same exact codebase** because they share the recurring-series
shape, then evaluate adjacent markets after 1,000+ paid users prove the
core motion.

### Brand polish (when convenient)

- Real owl illustrations (paid artist, ~$300)
- Dark mode pass (codebase already has `dark-theme.css`)
- Real demo video (screencast + voiceover) for press
- Sound effects on print success (optional, off by default)

### Things we deliberately won't do

These are settled "no"s. Re-opening requires founder review.

- **Become a HIPAA-secure system.** Sports aliases are the privacy
  failsafe. Anyone needing real PHI handling should buy an EHR.
- **Build a mobile app.** PWA is enough. Apple Developer fees + App
  Store hassle aren't worth it at our scale. Capacitor wiring was
  removed in Stage 5b.
- **Add patient login.** The magic-link approach is the design. Login
  walls add friction that kills the no-show prevention thesis.
- **Sell our own SMS service.** Use Twilio. They're better at it.
- **Self-host email.** Use a real outbound email service.
- **Infinite-scroll / feed UX.** Wrong shape for a tool. Schedules
  aren't browseable.
- **Social-graph features.** Wrong market. Clinics don't follow each
  other.
- **Recommendations algorithm.** Templates are static; nothing to
  recommend.
- **Heavy testimonial section before testimonials exist.** Fakes feel
  obvious; "free during beta" is more credible.
- **Pricing page before 50 active clinics.** Spending product cycles
  on a feature gating no revenue is the definition of premature
  optimization.
- **A/B testing infrastructure.** Not enough traffic for the math to
  work yet.

---

## Readiness gap (vs production-quality competitor)

Source: [docs/PRODUCTION-GAP-ANALYSIS.md](PRODUCTION-GAP-ANALYSIS.md).

The gap analysis used a deliberate framing: there are **four valid
definitions** of "complete," only one of which is the right one for
PTowl.

| Archetype      | What "complete" looks like                            | Right answer for PTowl?         |
| -------------- | ----------------------------------------------------- | ------------------------------- |
| Facebook       | Endless feed, social graph, messenger, marketplace    | **No.** Wrong shape entirely.   |
| homes.com      | Catalog + filters + maps + alerts                     | **No.** PTowl isn't a catalog.  |
| YouTube        | Recommendations, channels, comments, algorithm-driven | **No.** Nothing to recommend.   |
| **Craigslist** | Plain HTML, locale-scoped, brutally minimal           | **Yes.** This is the right bar. |

**PTowl's own bar:** a clinic can sign up, generate 10 weekly schedules,
print them, and text patients the magic link — all without writing a
support email.

### Severity rollup vs. that bar

| Severity              | Count | Examples                                                                                                                                                       |
| --------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Launch-blocker        | 0     | (last one — `help@ptowl.com` mailto routing — resolved May 5)                                                                                                  |
| Should-fix            | ~10   | Lighthouse score, mobile spot-check, status page, analytics verification, web chat re-add, account deletion + export, MailChannels outbound email, sw.js audit |
| Nice-to-have          | ~12   | Founder bio, install prompt, language toggle, real testimonials                                                                                                |
| Intentionally skipped | ~10   | Cookie banner, currency, monetization, social-share counters, referral, A/B test                                                                               |

### Honest answer to "is PTowl complete?"

- **By PTowl's own bar** (sign up → 10 schedules → print → text patient
  → no support email): the product is essentially complete today.
  Edge infra (WAF, rate limiting, CSP, HSTS) complete. Auth (Clerk)
  complete. Docs complete. Demo surface complete. Zero
  launch-blockers remaining.
- **By the maximalist bar** (Facebook/YouTube/homes.com level):
  PTowl will never reach that bar **and shouldn't try.** The market
  doesn't reward that polish at the price therapy clinics will pay.
- **By the Craigslist bar** (does it serve its market deeply, simply,
  reliably?): ~95% there.

### What we have that competitors have

- Auth (Clerk; Google + email/password + MFA)
- Edge security (WAF, Bot Fight Mode, Rate Limiting, CSP, HSTS)
- Backups (D1 PITR — 7d free, 30d paid)
- Privacy/Terms pages, subprocessor list
- Comprehensive SEO meta + sitemap + robots.txt + OG tags
- Code-splitting, CDN, responsive layout, touch targets ≥44px
- Print-ready schedules + ICS export
- Sports-alias privacy (676-entry dictionary)
- Patient magic-link share flow

### What we don't have (and don't need yet)

- Pricing page (intentionally absent until 50 active clinics)
- Live chat (Tawk.to was removed for CSP; Cloudflare Zaraz re-add is
  on the Phase 9 list)
- Re-engagement email digests (gated on outbound email decision)
- Self-serve account deletion + data export (mailto path is fine for
  first-50-clinics scale)
- Status page (Upptime fork, ~10 min user-side, deferred)
- Real testimonials, customer counts, press mentions (will follow
  real launches naturally — don't fake)
- Analytics measurement (CF Web Analytics, partial — needs
  verification post-launch)

---

## Unfair advantages

Why PTowl is hard to copy, even if a competitor saw the playbook today.

1. **Privacy-by-design is structural.** EMR vendors can't pivot to
   "no PHI stored" without restructuring their entire data model and
   BAA stack. They've spent years building infrastructure that
   legally **requires** them to store PHI. PTowl chose not to, and
   that choice is now a moat.
2. **Speed-as-a-feature is structural.** "5 keypresses" forces every
   UX decision through a single filter. Competitors that bolt on a
   "fast mode" always feel like a workaround because their main flow
   was built for completeness, not speed.
3. **Cloudflare cost structure.** At scale, the marginal cost of an
   additional clinic is dollars per **year**, not dollars per **month**.
   PTowl can undercut every incumbent's pricing and still hit ~95%
   gross margin.
4. **Open-source-friendly stack.** `rrule`, `ical-generator`,
   `hono/csrf`, `jose`, Clerk SDK. Tiny custom-code surface keeps
   engineering velocity high even at solo-founder scale.
5. **Sports-alias dictionary as trade secret.** The 676-entry mapping
   is the real competitive moat. The pattern is obvious; the curated
   list is not. Maintained as trade secret per IP review.

---

## Distribution channels

How the first 100 clinics will hear about PTowl. Order of priority.

**Immediate (first 30 days post-launch):**

1. Reddit — r/physicaltherapy, r/OccupationalTherapy, r/slp,
   r/dentistry. 15-second demo video. Authentic, not promotional.
2. PT Facebook groups — "New Grad Physical Therapist" (50K+),
   "Physical Therapy Professionals" (30K+).
3. Walk into 5 local PT/OT clinics and demo live.

**Short-term (60-90 days):**

4. LinkedIn posts targeting PT clinic owners.
5. YouTube 60-second demo videos. SEO target: "PT scheduling software."
6. State PT association chapter meetings.

**Medium-term (6-12 months):**

7. APTA CSM conference innovation showcase (~$2K-$5K booth).
8. Integration partnerships with WebPT / Jane App / SimplePractice.
9. Content SEO — "HIPAA compliant scheduling," "PT schedule templates."

**The pattern from comparable companies:** SimplePractice (founder was
a therapist; posted in therapist Facebook groups), Jane App
(founder's spouse was a physiotherapist; first users were local BC
clinics), Cliniko (cold-emailed Australian allied health
practitioners; partnered with Australian Physiotherapy Association).
**Personal industry connection → local network → niche online
communities → professional association partnerships.**

---

## Key metrics

The four numbers that decide whether PTowl is working.

| Metric             | Definition                                                      | Target                       |
| ------------------ | --------------------------------------------------------------- | ---------------------------- |
| **Activation**     | % of new sign-ups who create their first schedule within 7 days | ≥ 60%                        |
| **Trial-to-paid**  | % of free-tier users who hit the 3-patient limit and convert    | ≥ 8% (post-50-clinic gate)   |
| **Reminders sent** | Total emails/month — proxy for active usage                     | Trending up monthly          |
| **No-show rate Δ** | Per-clinic, before vs after PTowl                               | ≥ −15% (claim ceiling: −30%) |
| **NPS**            | Quarterly survey                                                | ≥ 40                         |

**Pitch claim:** "PTowl cuts no-shows by 30%." We don't have proof yet.
First 10 customers get a free quarter in exchange for measured no-show
data and a quote. Until we have signed-off case studies, the public
claim is "−15%."

---

## Risks and assumptions to validate

Open questions the strategy depends on. Tracked here so future-us
doesn't lose them.

1. **Will solo PTs pay $9/mo?** Probably yes — their per-hour rate is
   $90-$150. Validate with 10 paid pilots at $9/mo after the 50-clinic
   gate flips.
2. **Does "no PHI stored" matter to the buyer?** Yes for owners
   reading the privacy policy; less salient for the day-to-day
   scheduler. **Lead with speed; close with privacy.**
3. **No-show reduction claim.** No proof yet. First 10 customers get
   a free quarter for measured data + quote.
4. **Outbound email service.** Resend vs. MailChannels vs. SendGrid?
   Lean: Resend. Decide before patient magic-link emails actually need
   to send (Phase 9).
5. **Public Clerk production cutover timing.** Currently deferred.
   Trigger: when we want `clerk.ptowl.com` (not the dev instance) in
   OAuth popups for the production launch.
6. **PII detection on patient initials inputs.** Worth doing because
   random people will try to type real names. Library: `compromise`
   or a regex on `^[A-Z][a-z]+\s+[A-Z][a-z]+$`.
7. **LemonSqueezy vs. Stripe.** LemonSqueezy is the lean answer
   (Merchant of Record handles taxes). Stripe is more flexible if
   per-clinic pricing math gets weird. Decide when paid tiers ship.

---

## Decision log

Append-only. Date + one sentence. Newest at the bottom.

- **2026-05-03** — North-star doc created. Long-term vision: default
  tool for therapy-clinic schedule generation.
- **2026-05-03** — Chose AGPL-3.0 over MIT/Apache to discourage
  drive-by SaaS rip-offs while keeping community adoption open.
- **2026-05-03** — Public launch deferred until coordinated rollout
  moment.
- **2026-05-03** — Patient-facing magic-link schedule view picked as
  the next feature to build (Phase 5).
- **2026-05-03** — Clerk production cutover deferred to a focused
  follow-up session.
- **2026-05-05** — `help@ptowl.com` `mailto:` targets repointed to
  founder's Gmail directly; vanity routing deferred as cosmetic.
  Last launch-blocker resolved.
- **2026-05-05** — OSS-positioning copy ("self-host / fork the repo
  / open-source on purpose") deleted from public /about page (commit
  42d763d). Repo stays AGPL; we just don't market it.
- **2026-05-06** — Pricing canonicalized at Free / Solo $9 / Clinic
  $29 per provider. The earlier $3/$30 license-key model from
  brainstorm.md is officially superseded.
- **2026-05-06** — Doc library collapsed from ~25 markdown files to
  4 thematic docs (Vision / Build / Ship / Run) + README. This file
  is the Vision doc.

---

_End of Vision. Build / Ship / Run answer "how"; this file is the
"what" and "for whom"._
