# Patient Owl — Market Analysis & Expansion Strategy

**Prepared:** March 22, 2026
**Product:** Hotkey-driven scheduling system with proprietary de-identification methodology
**Current vertical:** Physical Therapy clinic scheduling
**Legal entity:** Moose Bay & Company LLC (Virginia)

---

## Executive Summary

Patient Owl's core innovation — **5 keypresses to a complete schedule** — solves a universal problem: recurring appointment scheduling is slow, mouse-heavy, and overbuilt in every existing tool. Combined with a proprietary de-identification methodology (sports aliases replacing real patient names), the product occupies a unique position at the intersection of speed and privacy.

This analysis identifies **12+ industries** where the hotkey scheduling pattern applies, ranks them by market fit, and recommends a go-to-market strategy starting with allied health therapy (PT/OT/SLP) and expanding into education, legal, and trades.

---

## Section 1: Industry Expansion Opportunities

### Tier 1 — Best Fit (highest alignment with 5-keypress model)

#### Physical Therapy / Occupational Therapy / Speech-Language Pathology
- **Market:** ~$5.4B OT + ~$4.2B SLP + PT market. ~300,000+ practitioners combined.
- **Current pain:** EHR-driven scheduling (WebPT, Jane App) requires 12-20 clicks per appointment. No bulk template system exists.
- **Hotkey advantage:** Identical workflow to PT. Zero adaptation needed.
- **De-identification value:** HIGH — especially pediatric OT/SLP (COPPA + HIPAA), school-based settings (FERPA).
- **Competitors:** WebPT ($99-$399/mo), Jane App (CAD $54-$79/mo), SimplePractice ($29-$99/mo) — all EHR-first, scheduling is secondary.

#### Mental Health / Counseling
- **Market:** ~$28B US mental health services. ~700,000 licensed therapists.
- **Current pain:** SimplePractice and TherapyNotes require clicking through each client individually.
- **De-identification value:** HIGHEST — mental health carries extreme stigma. Sports aliases on printed schedules prevent casual disclosure.
- **Competitors:** SimplePractice ($29-$99/mo), TherapyNotes ($49/mo) — billing/notes focused, not scheduling-optimized.

#### School-Based Therapy Scheduling (GREENFIELD)
- **Market:** ~7.5 million students with IEPs. ~95,000 school districts.
- **Current pain:** School-based SLPs and OTs use PAPER and EXCEL. No purpose-built digital scheduling tool exists.
- **Hotkey advantage:** A school SLP could generate an entire week of pull-out schedules in under 30 seconds.
- **De-identification value:** VERY HIGH — FERPA protections for student names.
- **Competitors:** None. This is a greenfield market.

#### Chiropractic
- **Market:** ~$19.5B US chiropractic market. ~70,000 practitioners.
- **Current pain:** ChiroTouch (legacy desktop) and Jane App (Canadian-focused).
- **Hotkey advantage:** Same bulk recurring pattern as PT (2-3x/week for 6-12 weeks).
- **Competitors:** ChiroTouch ($99-$299/mo, legacy), Jane App (CAD $54-$79/mo), Noterro ($25-$45/mo).

### Tier 2 — Good Fit (needs slight adaptation)

#### Tutoring Centers
- **Market:** ~$8B US tutoring market. ~12,000 centers + massive independent market.
- **Hotkey advantage:** Template "Math-2x-AfterSchool" with student initials generates the whole term in seconds.
- **De-identification value:** High — FERPA applies to school-contracted tutoring.
- **Competitors:** TutorCruncher ($25-$89/mo), Teachworks ($15-$75/mo) — billing-first, scheduling secondary.

#### IEP Meeting Scheduling
- **Market:** ~7.5 million students with IEPs.
- **Hotkey advantage:** VERY HIGH — no bulk IEP meeting scheduler exists. Template "IEP-Annual-Review" with student initials pre-slots meetings across a 2-week window.
- **Competitors:** SpedTrack ($5-$15/student/year), Frontline — compliance platforms, not scheduling tools.

#### Probation Check-ins
- **Market:** ~$2B criminal justice software. ~4 million people on probation in the US.
- **Hotkey advantage:** Template "Standard-Probation-Monthly" with offender initials.
- **De-identification value:** VERY HIGH — probation status is extremely sensitive.
- **Competitors:** Tyler Technologies Supervision ($100K+/year), Equivant — enterprise, terrible UX.

#### Home Health Visits
- **Market:** ~$120B US home health market. ~33,000 agencies.
- **Hotkey advantage:** High for time scheduling (needs route optimization layer separately).
- **De-identification value:** VERY HIGH — printed visit schedules carried in the community are major HIPAA exposure.
- **Competitors:** Axxess ($150-$500/mo), WellSky (enterprise).

#### HVAC / Pest Control / Cleaning Services
- **Market:** ~$125B combined (HVAC $28B, pest $23B, cleaning $74B).
- **Hotkey advantage:** Template "Spring-AC-Tuneup" or "Quarterly-Residential" bulk-generates an entire season.
- **Competitors:** ServiceTitan ($250+/mo, expensive), Jobber ($39-$259/mo), Housecall Pro ($59-$199/mo) — all overkill for scheduling-only.

### Tier 3 — Weaker Fit

| Vertical | Why Weaker Fit |
|---|---|
| Corporate 1:1s | Google Calendar handles this fine |
| Salon/Beauty | Client-initiated online booking is the norm |
| DMV | Citizen-initiated; bottleneck is capacity not tool speed |
| Group Fitness | Set-and-forget templates already work in existing tools |

---

## Section 2: Competitive Landscape

| Vertical | Top Competitors | Their Pricing | Their Weakness | Patient Owl Advantage |
|---|---|---|---|---|
| PT/OT/SLP | WebPT, Jane App, SimplePractice | $29-$399/mo | Scheduling buried inside EHR. 12-20 clicks per appointment. | Scheduling-first. 5 keypresses vs. 20 clicks. |
| Mental Health | SimplePractice, TherapyNotes | $29-$99/mo | No de-identification for printed schedules. | Sports aliases uniquely protect mental health privacy. |
| School Therapy | Paper/Excel | Free | No digital tool exists. | First mover in a greenfield market. |
| Chiropractic | ChiroTouch, Jane App | $54-$299/mo | Legacy desktop or Canadian-focused. | Same hotkey advantage as PT. |
| Tutoring | TutorCruncher, Teachworks | $15-$89/mo | Billing-first, scheduling secondary. | Template-based term scheduling. |
| Home Health | Axxess, WellSky | $150-$500/mo | Enterprise pricing. | Aliases on route sheets. Lower price. |
| Trades | ServiceTitan, Jobber | $39-$500+/mo | Overkill and expensive. | Lean scheduling-only at a fraction of cost. |

---

## Section 3: Monetization Strategy

### Payment Platform: LemonSqueezy (Recommended)

| Platform | Fees | Tax Handling | Best For |
|---|---|---|---|
| **LemonSqueezy** | 5% + $0.50/tx | Automatic (all US states + global VAT) | Solo founders, simplicity |
| Stripe | 2.9% + $0.30/tx | Manual (add Stripe Tax) | Maximum flexibility |
| Paddle | 5% + $0.50/tx | Automatic (merchant of record) | EU-heavy SaaS |

**Why LemonSqueezy:** Handles sales tax automatically, simple dashboard, built-in subscription management, popular in indie SaaS community, webhook-friendly for Cloudflare Workers.

### Pricing Model: Flat Monthly Per-Clinic

| Tier | Price | Includes | Target |
|---|---|---|---|
| **Free** | $0/mo | 1 therapist, 5 schedules/month, basic features | Solo therapist trying it out |
| **Pro** | $29/mo | 5 therapists, unlimited schedules, aliases, ICS export | Small clinic (1-3 therapists) |
| **Clinic** | $59/mo | 15 therapists, Pro + priority support, custom templates | Mid-size clinic |
| **Enterprise** | $99/mo | Unlimited therapists, SSO, audit log, API access | Multi-location practices |

**Pricing position:** Below full EHR systems ($99-$399/mo) but above generic schedulers ($8-$49/mo). Patient Owl complements EHRs rather than competing with them.

---

## Section 4: Go-To-Market Strategy

### How Similar Products Got Their First 100 Users

- **SimplePractice:** Founder was a therapist. Posted in therapist Facebook groups and forums. Offered generous free tier.
- **Jane App:** Founded by a physiotherapist's spouse. First users were local clinics in British Columbia. Grew through PT associations.
- **Cliniko:** Cold-emailed Australian allied health practitioners. Partnered with Australian Physiotherapy Association.

**Common pattern:** Personal industry connection → local network → niche online communities → professional association partnerships.

### Recommended Channels (Priority Order)

**Immediate (first 30 days):**
1. Reddit: r/physicaltherapy, r/OccupationalTherapy, r/slp — 15-second demo video
2. PT Facebook Groups: "New Grad Physical Therapist" (50K+), "Physical Therapy Professionals" (30K+)
3. Walk into 5 local PT/OT clinics and demo live

**Short-term (60-90 days):**
4. LinkedIn posts targeting PT clinic owners
5. YouTube 60-second demo videos (SEO: "PT scheduling software")
6. State PT association chapter meetings

**Medium-term (6-12 months):**
7. APTA CSM conference innovation showcase ($2,000-$5,000 booth)
8. Integration partnerships with WebPT/Jane App
9. Content SEO: "HIPAA compliant scheduling," "PT schedule templates"

### App Store Presence

Not critical for initial traction (core workflow is desktop/keyboard), but important for:
- Patient-facing schedule viewing on mobile
- Credibility signal for clinic buyers
- Future two-sided platform vision

---

## Section 5: IP Strategy

### Hotkey Scheduling Pattern
**Not recommended for patent.** Alice v. CLS Bank (2014) makes "abstract idea on a computer" patents very difficult. Keyboard shortcuts for software have existed since the 1980s.

### Sports Alias De-Identification Methodology
**Recommended approach: Trade Secret** (already decided in architecture review)

| Factor | Patent | Trade Secret |
|---|---|---|
| Cost | $15K-$30K + maintenance | $0 |
| Protection duration | 20 years | Indefinite |
| Risk of rejection | High (Alice) | N/A |
| What it protects | The method | The specific data (676-entry mapping) |

The specific mapping data (676 entries, annually updated) is the real competitive moat. Keep as trade secret with appropriate clauses in any contractor/employee agreements.

**Optional:** File a provisional patent ($1,500-$3,000) for "Patent Pending" marketing value. Let it lapse after 12 months if not pursuing full patent.

---

## Section 6: Strategic Roadmap

### Immediate (Next 30 Days)
1. Launch free tier with LemonSqueezy billing for Pro at $29/mo
2. Post demo videos on Reddit and PT Facebook groups
3. Demo at 5 local PT/OT clinics

### Short-Term (60-90 Days)
4. Expand templates to OT and SLP workflows
5. Apply to APTA CSM 2027 innovation showcase
6. Add school-based SLP scheduling as a use case (greenfield market)

### Medium-Term (6-12 Months)
7. Pursue chiropractic vertical
8. Build IEP meeting scheduling module
9. Evaluate mental health vertical

### Long-Term (12-24 Months)
10. Full patient portal (two-sided platform with Cal.com booking)
11. Integration partnerships with WebPT, Jane App, SimplePractice
12. Trades verticals (HVAC, pest control, cleaning)

---

## Key Takeaways

1. **The 5-keypress pattern is a genuine differentiator** — no scheduling tool in any industry offers sub-5-second full schedule generation.

2. **Sports alias de-identification is uniquely valuable** in mental health, school-based therapy, home health, and probation.

3. **School-based SLP/OT scheduling is a greenfield market** — no competitor exists.

4. **$29/mo per-clinic** is the right starting price — below EHR pricing, above generic schedulers.

5. **First 100 users will come from Reddit, Facebook groups, and local clinic demos** — not paid ads or app stores.

---

*Market data from Bureau of Labor Statistics, IBISWorld, and Grand View Research (through early 2025). Competitor pricing reflects publicly listed prices and may have changed.*
