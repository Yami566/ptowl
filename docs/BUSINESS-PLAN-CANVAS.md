# PTowl — Lean Canvas

**Version 1.0 · April 25, 2026 · One-page strategic snapshot**

> The fastest schedule assistant on earth. Until the aliens come.

---

## 1 · Problem

What pain are we addressing?

1. **Slow PT scheduling.** Generating a 12-appointment recurring PT
   schedule in an EMR takes 2–5 minutes per patient: dropdowns,
   modals, page reloads. PTs do this 8–25 times/day.
2. **Patient no-shows.** No-show rates in outpatient PT run 10–25%.
   Each no-show costs the clinic $80–$200 in unfilled slot revenue.
3. **HIPAA scope creep.** EMR vendors push every clinic into a Business
   Associate Agreement and a 200-page compliance manual just to print
   a calendar. Tools that never store PHI have been an unmet category.

**Existing alternatives:** WebPT, Jane App, ClinicSource, Acuity,
SimplePractice, paper calendars, "schedule on a sticky note then
type into the EMR later."

## 2 · Customer segments

- **Solo physical therapists** — chiro / sports / pediatric / pelvic-floor.
  ~150,000 in the US. Cash-pay or small-clinic, decide their own tools.
- **Small clinic offices (2–10 providers)** — front-desk / scheduler
  is the daily user; owner is the buyer.
- **Patients of those providers** — secondary user; receives the
  schedule via share link, calendar feed, and 24h/1h email reminders.

**Early adopter profile:** sports-PT solo-practitioner, $90–$150/hr cash,
already lukewarm on their EMR's scheduler, books 6–12 patients/day,
keyboard-fluent.

## 3 · Unique value proposition

> "Print a 12-week PT schedule in 3 keypresses. No PHI ever stored.
> No EMR contract. Free for the first three patients."

**High-level concept:** "Calendly meets a print job, for the
keyboard-driven clinician."

## 4 · Solution

- **3-keypress wizard** (template → initials → confirm) generates the
  full 12-week schedule.
- **De-identification by design.** Patient identity stored only as
  two-letter initials, mapped client-side to a sports-figure alias.
  Real names never reach the server.
- **Print + share + calendar feed** (.ics) for every schedule.
- **Encrypted appointment-reminder emails** at 24h and 1h before each
  appointment — opt-in per schedule, one-click unsubscribe.
- **Patient portal** via short share codes (PTOWL-XXXX); no patient
  account required.

## 5 · Channels

- **SEO** for long-tail terms: "fast PT schedule generator," "print PT
  appointment list," "non-EMR PT scheduling."
- **Direct outreach to APTA private-practice section members** (cold
  email + LinkedIn from the founder).
- **Reddit r/physicaltherapy + r/ptschool** organic posts and
  self-deprecating thumbnails.
- **Word of mouth via PT clinic owners' Facebook groups** (Tribe of
  Mentors, Healthcare Business Group).
- **Conference exhibits** — APTA CSM, PPS — Year 2.

## 6 · Revenue streams

| Tier                    | Price               | Includes                                                     | Margin            |
| ----------------------- | ------------------- | ------------------------------------------------------------ | ----------------- |
| **Free**                | $0/mo               | Up to 3 active patients, all features                        | n/a (acquisition) |
| **Solo**                | $9/mo               | Unlimited patients, 1 provider, email reminders, custom logo | ~95%              |
| **Clinic**              | $29/mo per provider | Multi-provider dashboard, analytics, priority support        | ~95%              |
| **Future: White-label** | $0.05/patient/mo    | Embed PTowl into other PT-SaaS                               | bundled           |

**Year-1 target:** 200 paid users at blended $14/mo = $33,600 ARR.
**Year-2 target:** 1,000 paid users at blended $16/mo = $192,000 ARR.

## 7 · Cost structure

| Line                                | Year 1       | Notes                            |
| ----------------------------------- | ------------ | -------------------------------- |
| Cloudflare (Workers Paid + R2 + D1) | $60–$240     | Scales with traffic, mostly flat |
| Clerk (auth)                        | $0           | Free up to 10K MAU, scales after |
| MailChannels (transactional)        | $60          | $5/mo + low overage              |
| Domain + DNS                        | $20          | renewal                          |
| Tawk.to live chat                   | $0           | free tier                        |
| LegalZoom + state filings           | $400         | one-time                         |
| Founder time                        | sweat        | 1 founder, 20 hrs/wk             |
| **Total cash**                      | **~$800/yr** | break-even at ~5 paid users      |

## 8 · Key metrics

- **Activation** — % of new sign-ups who create their first schedule
  within 7 days. Target: ≥ 60%.
- **Trial-to-paid** — % of free-tier users who hit the 3-patient limit
  and convert. Target: ≥ 8%.
- **Reminders sent** — total emails/month. Proxy for active usage.
- **No-show rate change** — measured per-clinic, before vs after.
  Pitch claim: "−30% no-shows." Target: prove ≥ −15% in case studies.
- **Net Promoter Score** — quarterly survey, target ≥ 40.

## 9 · Unfair advantage

- **Privacy-by-design** is hard to copy. EMR vendors can't pivot
  without restructuring their data model + BAA stack.
- **Speed-as-a-feature** — 3 keypresses is a brand promise that
  forces every UX decision. Competitors that bolt-on "fast mode"
  always feel like a workaround.
- **Cloudflare cost structure** — at scale, the marginal cost of an
  additional clinic is dollars per year, not dollars per month. We
  can undercut every incumbent's pricing and still hit 90%+ gross
  margin.
- **Open-source-friendly stack** — `rrule`, `ical-generator`,
  `hono/csrf`, `jose`, `react-email`(future). Shipping confidently
  on a tiny custom-code surface keeps engineering velocity high
  even at sub-founder team size.

---

## Risks & assumptions to validate next

1. **Will solo PTs pay $9/mo?** — probably yes; their per-hour rate
   is $90–$150. Validate with 10 paid pilots at $9/mo.
2. **Does "no PHI" actually matter to the buyer?** — yes for owners
   reading the privacy policy; less salient for the day-to-day
   scheduler. Lead with speed; close with privacy.
3. **No-show reduction claim** — we don't have proof yet. First
   10 customers get a free quarter in exchange for measured no-show
   data and a quote.
4. **Is the share-code patient flow worth the complexity?** — patients
   currently can either get the .ics link OR claim a code to log in.
   Two paths is one too many. Decide at the year-1 review.

## Decisions deferred to founder review

- LemonSqueezy vs. Stripe for billing (LemonSqueezy is on the PRD
  roadmap; Stripe is more flexible for clinic pricing).
- Apple App Store / Play Store distribution — currently NOT pursued
  (Capacitor wiring removed in Stage 5b). Reopen if 2 distinct
  customers explicitly ask for native apps.
- Investor financing path — bootstrap to $250k ARR vs. raise a $500k
  pre-seed at $4M cap. Recommend bootstrap.
