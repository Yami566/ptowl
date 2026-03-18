# PTOWL Business Requirements Document (BRD)

**Document Version:** 1.0
**Last Updated:** 2026-03-16
**Author:** PTOWL Development Team
**Status:** Approved

---

## 1. Executive Summary

PTOWL is a focused scheduling tool for Physical Therapists (PTs), doctors, and clinic staff. It generates complete PT appointment schedules in 3 keypresses — faster than any competing product on the market. The product is live at ptowl.com with active user onboarding.

PTOWL is **not** an EMR, a billing system, or bloatware. It does one thing — schedule generation — and does it 100x faster than the nearest competitor.

---

## 2. Problem Statement

### The Pain

Physical therapists lose **5+ hours per week** to scheduling inefficiency. 57% of PTs cite documentation and scheduling as their **#1 cause of burnout**. The current software landscape forces PTs to choose between:

1. **Expensive, bloated EMR systems** ($39-500/month) that include scheduling as an afterthought buried under features they don't need
2. **Manual methods** (Excel templates, paper, whiteboards) that are error-prone and produce no appointment reminders
3. **Nothing** — 17% of healthcare workers already use unauthorized "shadow" tools because their clinic software is too slow

### The Gap

| Price Range | What Exists |
|-------------|------------|
| $0 | Excel templates on Etsy ($3-15 one-time) |
| **$3-30/mo** | **NOBODY — this is PTOWL** |
| $39-54/mo | Jane App, SimplePractice, TheraPlatform |
| $79-200/mo | SPRY, WebPT, Prompt EMR |
| $200-500/mo | Enterprise EMRs (Raintree, Net Health) |

There is **no scheduling-only tool** between free Excel templates and $39+/month full EMR systems. PTOWL fills this gap.

### Market Evidence

- PT software market: **$26.35B** (2024), growing rapidly
- Small clinics (4-9 therapists): **39.81%** of market revenue
- **47%** of PT practices switch EMR within 3 years
- Average failed EMR switch costs **$89,247**
- **43%** of practices switch EMR 3+ times
- No-shows cost ~$200 each; 2 daily no-shows = **$50K/year loss**
- **73%** of PT patients miss at least one appointment
- Appointment reminders cut no-show rates **in half within 2 weeks**

---

## 3. Target User Persona

### Primary: Individual PT / Small Clinic Doctor

**Profile:**
- Buys tools with their own money (below the "ask my boss" threshold)
- Works at a clinic that may already have an EMR but finds it too slow for scheduling
- Values speed over features — wants to create a schedule and get back to patients
- May be a solo/cash-pay practitioner who buys their own entire tech stack

**Behavior:**
- 17% of healthcare workers already use unauthorized personal tools because clinic software is too slow
- 45% of shadow-tool users do it for "faster workflow"
- PTs already buy scheduling templates on Etsy ($3-15 one-time purchases)
- Below-the-radar purchase: $3/month doesn't require approval from clinic management

**Shadow IT Play:** PTs use PTOWL even if their clinic has another system. It's fast enough to justify running alongside a $200/month EMR.

---

## 4. Business Goals

### Primary Goal
Establish PTOWL as the fastest PT schedule generator on the market, capturing the underserved $3-30/month price segment.

### Secondary Goals
1. Build a sustainable SaaS business with positive unit economics from day one
2. Achieve product-market fit through individual PT adoption (bottom-up growth)
3. Create stickiness through patient data + schedules + workflow speed
4. Enable bottom-up clinic conversion: when 3+ PTs at a clinic use PTOWL individually, offer a team plan

### Non-Goals
- Competing with full EMR systems (billing, documentation, insurance)
- Building a marketplace or platform
- Enterprise sales or top-down selling

---

## 5. Success Metrics

### Year 1 Targets

| Metric | Target |
|--------|--------|
| Paying users | 500 |
| Annual revenue | $15,000 |
| Monthly churn rate | <5% |
| No-show reduction (users with reminders) | 30%+ |
| NPS score | 50+ |

### North Star Metric

**Time from "I need a schedule" to "Schedule done"**

Current: ~3 keypresses (seconds). Competitors: 5-15 minutes.

Maintain **100x speed advantage**.

### Revenue Projections

| Users | Monthly Revenue | Annual Net (after fees) |
|-------|----------------|------------------------|
| 100 | $300 | ~$2,368 |
| 500 | $1,500 | ~$11,840 |
| 1,000 | $3,000 | ~$23,680 |
| 5,000 | $15,000 | ~$118,400 |
| 10,000 | $30,000 | ~$236,800 |

---

## 6. Revenue Model

### Digital License Keys (LemonSqueezy)

Inspired by Windows activation keys and Steam game purchases. No free tier. No trials. No contracts.

| Plan | Price | Billing | Effective Fee |
|------|-------|---------|---------------|
| Monthly | $3/mo | Recurring | ~21.7% ($0.65) |
| Annual | $30/year | Recurring | ~8.3% ($2.50) |

**Annual billing is the primary push** — saves the user $6/year and reduces our fee percentage from 21.7% to 8.3%.

### License Key Flow
```
1. PT visits ptowl.com → clicks "Get PTOWL"
2. LemonSqueezy checkout handles payment + taxes
3. License key auto-generated (e.g., PTOWL-XXXX-XXXX-XXXX)
4. Key emailed to PT immediately
5. PT goes to ptowl.com/activate → enters key
6. Cloudflare Worker validates key via LS API → creates account
7. Full product unlocked
8. Subscription lapses → key auto-expires → app locks (read-only)
```

### Why LemonSqueezy

- Merchant of Record (handles ALL global taxes: sales tax, VAT, GST)
- Built-in license key generation + validation API
- Subscription billing (monthly + annual)
- No monthly platform fee (only per-transaction)
- Owned by Stripe (long-term stability)
- Proven Cloudflare Workers webhook integration

### Unit Economics

**Per-User Monthly ($3/mo):**

| Line Item | Cost |
|-----------|------|
| Revenue | $3.00 |
| LemonSqueezy fee (5% + $0.50) | -$0.65 |
| SMS reminders (~30% opt-in) | -$0.36 |
| Email reminders (Resend) | $0.00 |
| Cloudflare Workers/D1 | $0.00* |
| **Net margin** | **$1.99 (66%)** |

**Per-User Annual ($30/yr):**

| Line Item | Cost |
|-----------|------|
| Revenue | $30.00 |
| LemonSqueezy fee (5% + $0.50) | -$2.00 |
| SMS reminders (12 months) | -$4.32 |
| Email reminders | ~$0.00 |
| Cloudflare infrastructure | $0.00* |
| **Net margin** | **$23.68 (79%)** |

*Cloudflare free tier: 100K Worker requests/day, 5GB D1 storage. Scales to ~1,000+ users before hitting paid tiers.

---

## 7. Competitive Landscape

### Top Competitors

**WebPT** ($99-400/mo/provider) — Market leader
- Major outages quarterly, declining speed
- A la carte pricing (real cost 3-5x advertised)
- Appointment reminders cost $200+/mo extra
- 47% of clinics switch EMR within 3 years

**SimplePractice** ($29-99/mo) — Acquired by Vista Equity (PE) in 2024
- Users fear price hikes post-acquisition
- "Extremely unreliable, constant connect issues" (4-6x/week)
- Telehealth quality dropped after price increases

**Jane App** ($54/mo) — Highest rated (4.8/5)
- No native mobile app
- Weak US insurance billing integration
- Still 18x more expensive than PTOWL

**SPRY** ($79-300/mo) — Rising disruptor
- AI-powered, modern UI
- Still 26x more expensive than PTOWL
- Full EMR (complex for scheduling-only needs)

### PTOWL Differentiators

1. **3-keypress workflow** — No competitor has anything close
2. **$3/mo** — 16-100x cheaper than every competitor
3. **Sports alias PII protection** — 676 sports figure aliases, unique to PTOWL
4. **SMS + email reminders included** — Competitors charge $100-300/mo extra
5. **License key model** — Buy it like a game, not a contract
6. **No lock-in** — Month-to-month, cancel anytime
7. **Scheduling-only** — Not bloatware EMR. Does one thing perfectly
8. **7-layer security** — WAF, CORS, CSP, rate limiting, auth, authz, validation

---

## 8. Constraints

### Technical Constraints
- **Cloudflare free tier** — Must stay within 100K Worker requests/day and 5GB D1 storage until revenue justifies paid tier
- **No server-side PDF generation** — Cloudflare Workers lack Node.js fs/canvas APIs; PDF must be client-side
- **D1 SQLite limitations** — No stored procedures, no triggers, limited concurrent write throughput
- **In-memory rate limiting** — Per-Worker-isolate, not globally coordinated

### Business Constraints
- **Solo developer** — One person building, maintaining, and supporting
- **$0 infrastructure budget** (currently) — Everything must run on free tiers until revenue covers costs
- **No VC funding** — Bootstrapped, must be profitable from early users
- **HIPAA adjacent** — Not a covered entity (no PHI stored), but must maintain privacy-first design

### Design Constraints
- **Privacy-first** — No real patient names stored; sports alias system (676 initials mapped to sports figures)
- **Speed-first** — Core workflow must complete in 3 keypresses or fewer
- **No feature bloat** — Every feature must justify its existence against the mission of "fastest PT scheduling"

---

## 9. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| $3/mo too cheap to sustain | Medium | High | Push annual billing ($30/yr). Margins work at 500+ users. |
| SMS costs eat margins | Medium | Medium | Email + ICS default. SMS opt-in only. |
| LemonSqueezy fees too high | Low | Medium | Annual billing reduces to 8.3%. Migrate to Stripe DIY at >5K users. |
| Competitors undercut on price | Low | Low | Speed (3-keypress) is structural advantage, not price. |
| Low conversion rate | Medium | High | No free tier = only paying users = focused product-market fit signal. |
| HIPAA compliance questions | Medium | Medium | Sports aliases = no PHI stored. Clear Terms of Service. Legal review planned. |
| User churn | Medium | Medium | Monthly value prop: reminders + speed. Stickiness from patient data + schedules. |
| Cloudflare outage | Low | High | Global CDN infrastructure, 99.99% historical uptime. |
| Data loss | Low | Critical | Automated D1 backups (planned), migration version control in git. |

---

## 10. Launch Strategy

### Pre-Launch Checklist
1. Finish Phase 2 features (LemonSqueezy licensing, reminders, waitlist, stats)
2. Create landing page on ptowl.com
3. Set up LemonSqueezy store with $3/mo and $30/year plans
4. Register 10DLC for SMS
5. Test full purchase → activate → use flow end-to-end

### Launch Channels
1. **Reddit** (r/physicaltherapy, r/physiotherapy) — authentic posts
2. **PT Facebook groups** and professional forums
3. **Product Hunt** launch
4. **Direct outreach** to cash-based PT practices
5. **"Built for PTs"** narrative — authentic, practitioner-focused messaging

### Growth Levers
1. **Word-of-mouth** — PTs tell other PTs about the $3 tool
2. **Shadow IT adoption** — "My clinic uses WebPT but I use PTOWL"
3. **Referral program** — Free month for referrals
4. **Content marketing** — Scheduling tips, productivity content
5. **Bottom-up conversion** — 3 PTs buy Solo → clinic buys team plan

---

## 11. Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| Product Owner | Solo developer/founder | Full product vision and execution |
| End Users (PTs) | Primary customers | Fast, reliable scheduling tool |
| Clinic Administrators | Secondary customers | Efficient staff scheduling |
| Patients | Indirect beneficiaries | Reliable appointment reminders, fewer no-shows |

---

## 12. Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | — | 2026-03-16 | Approved |

---

*This document is maintained alongside the codebase and updated as business requirements evolve.*
