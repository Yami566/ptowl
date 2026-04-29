# PTOWL Product Strategy

## Last Updated: 2026-03-09

---

## 1. What PTOWL Is

**The fastest schedule assistant on earth.**

5 keypresses. Schedule done. Move on with your day.

PTOWL is a focused scheduling tool for medical and dental providers — physical
therapists, doctors, chiropractors, dentists, orthodontists, and clinic staff. It is
NOT an EMR. NOT a billing system. NOT bloatware. It does one thing and does it
faster than anything else on the market. Currently free during beta.

---

## 2. Target Buyer

**Individual PTs and doctors** who buy it with their own money.

- Below the "ask my boss" threshold ($3/mo = price of half a coffee)
- Shadow IT play: PTs use it even if their clinic has another system
- 17% of healthcare workers already use unauthorized personal tools because their
  clinic's software is too slow (Healthcare Brew, Dec 2025 survey)
- Solo/cash-pay practices buy their own stack entirely

---

## 3. Pricing Model: Digital License Keys

### Inspired by: Windows activation keys, Steam game purchases

No free tier. No trials. No contracts. Buy a license key, unlock the full product.

| Plan     | Price    | Billing        | Effective LS Fee |
|----------|----------|----------------|------------------|
| Monthly  | $3/mo    | Recurring      | ~21.7% ($0.65)   |
| Annual   | $30/year | Recurring      | ~8.3% ($2.50)    |

**Annual billing is the primary push** (save $6/year + lower fees for us).

### How It Works

```
1. PT visits ptowl.com -> clicks "Get PTOWL"
2. LemonSqueezy checkout handles payment + taxes
3. License key auto-generated (e.g., PTOWL-XXXX-XXXX-XXXX)
4. Key emailed to PT immediately
5. PT goes to ptowl.com/activate -> enters key
6. Our Cloudflare Worker validates key via LS API -> creates account
7. Full product unlocked
8. Subscription lapses -> key auto-expires -> app locks (read-only)
```

### Payment Platform: LemonSqueezy

- Merchant of Record (handles ALL global taxes: sales tax, VAT, GST)
- Built-in license key generation + validation API
- Subscription billing (monthly + annual)
- No monthly platform fee (only per-transaction)
- Owned by Stripe (long-term stability)
- Proven Cloudflare Workers webhook integration
- API endpoints: activate, validate, deactivate

### Why Not Others

| Platform     | Why Not                                          |
|--------------|--------------------------------------------------|
| Gumroad      | 20% effective fee at $3/mo, basic license system |
| Paddle       | No built-in license keys (need separate system)  |
| Keygen.sh    | $49+/mo just for licensing, overkill             |
| Stripe DIY   | Cheapest fees but must handle taxes ourselves    |
| Whop         | Creator-focused, less suited for healthcare SaaS |
| Cryptolens   | $99+/mo, designed for desktop software           |
| AppSumo      | Lifetime deals only, no recurring revenue        |

---

## 4. Unit Economics

### Per-User Monthly (at $3/mo)

| Line Item                        | Cost       |
|----------------------------------|------------|
| Revenue                          | $3.00      |
| LemonSqueezy fee (5% + $0.50)   | -$0.65     |
| SMS reminders (~30% opt-in)      | -$0.36     |
| Email reminders (Resend free)    | $0.00      |
| Cloudflare Workers/D1            | $0.00*     |
| **Net margin**                   | **~$1.99** |

### Per-User Annual (at $30/year)

| Line Item                        | Cost        |
|----------------------------------|-------------|
| Revenue                          | $30.00      |
| LemonSqueezy fee (5% + $0.50)   | -$2.00      |
| SMS reminders (12 mo x $0.36)   | -$4.32      |
| Email reminders (Resend)         | ~$0.00      |
| Cloudflare infrastructure        | $0.00*      |
| **Net margin**                   | **~$23.68** |

*Cloudflare free tier: 100K Worker requests/day, 5GB D1 storage, 5M rows.
Scales to ~1,000+ users before hitting paid tiers.

### Revenue Projections

| Users  | Monthly Rev | Annual Net (after fees) |
|--------|-------------|-------------------------|
| 100    | $300        | ~$2,368                 |
| 500    | $1,500      | ~$11,840                |
| 1,000  | $3,000      | ~$23,680                |
| 5,000  | $15,000     | ~$118,400               |
| 10,000 | $30,000     | ~$236,800               |

---

## 5. Competitive Landscape

### The Gap PTOWL Fills

| Price Range   | What Exists                              |
|---------------|------------------------------------------|
| $0            | Excel templates on Etsy ($3-15 one-time) |
| $3-30/mo      | **NOBODY (this is PTOWL)**               |
| $39-54/mo     | Jane App, SimplePractice, TheraPlatform  |
| $79-200/mo    | SPRY, WebPT, Prompt EMR                  |
| $200-500/mo   | Enterprise EMRs (Raintree, Net Health)   |

### Top Competitors and Their Weaknesses

**WebPT** ($99-400/mo/provider) - Market leader
- Major outages quarterly, declining speed
- A la carte pricing (real cost 3-5x advertised)
- Appointment reminders cost $200+/mo extra
- 47% of clinics switch EMR within 3 years

**SimplePractice** ($29-99/mo) - Acquired by Vista Equity (PE) in 2024
- Users fear price hikes post-acquisition
- "Extremely unreliable, constant connect issues" (4-6x/week)
- Telehealth quality dropped after price increases

**Jane App** ($54/mo) - Highest rated (4.8/5)
- No native mobile app
- Weak US insurance billing integration
- Still 18x more expensive than PTOWL

**SPRY** ($79-300/mo) - Rising disruptor
- AI-powered, modern UI
- Still 26x more expensive than PTOWL
- Full EMR (complex for scheduling-only needs)

### PTOWL Differentiators

1. **5-keypress workflow** - No competitor has anything close
2. **$3/mo** - 16-100x cheaper than every competitor
3. **Sports alias PII protection** - 676 sports figure aliases, unique to PTOWL
4. **SMS + email reminders INCLUDED** - Competitors charge $100-300/mo extra
5. **License key model** - Buy it like a game, not a contract
6. **No lock-in** - Month-to-month, cancel anytime
7. **Scheduling-only** - Not bloatware EMR. Does one thing perfectly
8. **7-layer security** - WAF, CORS, CSP, rate limiting, auth, authz, validation
9. **Turnstile bot protection** - Cloudflare-grade bot defense

---

## 6. Feature Roadmap

### Phase 1: Core (COMPLETE)

- [x] 6 sports-themed schedule templates with hotkeys 1-6
- [x] 5-keypress workflow (select template -> set date -> generate)
- [x] Sports alias system (676 initials mapped to sports figures)
- [x] Calendar view with popup overlays
- [x] Print/export schedules
- [x] Admin dashboard (user approval, role management)
- [x] Full auth system (PBKDF2-SHA256, JWT, signed CSRF, TOTP 2FA)
- [x] Cloudflare Turnstile bot protection
- [x] 331 passing tests
- [x] Responsive design + accessibility
- [x] Owl logo with 270deg head rotation hover

### Phase 2: Monetization + Reminders (NEXT)

- [ ] LemonSqueezy integration (license keys, checkout, webhooks)
- [ ] License key activation flow (activate page, validation, account creation)
- [ ] Subscription management (view plan, upgrade, cancel)
- [ ] Email appointment reminders (Resend)
- [ ] ICS calendar file generation (auto-add to Google/Outlook/Apple)
- [ ] SMS appointment reminders (Telnyx, opt-in)
- [ ] 10DLC registration for US A2P SMS
- [ ] Waitlist: simple notify on cancellation
- [ ] No-show tracking: basic stats dashboard card
- [ ] Landing page / marketing site
- [ ] Deploy to production (Cloudflare Pages + Workers)

### Phase 3: Growth

- [ ] Waitlist auto-fill with priority queue + timeout
- [ ] Full analytics page (trends, export CSV, patient reliability scores)
- [ ] AI schedule suggestions (optimal time slots based on patterns)
- [ ] Multi-provider calendar view (for clinic owners)
- [ ] Patient self-service booking portal
- [ ] Zapier/webhook integrations
- [ ] Mobile PWA optimization
- [ ] Referral program (refer a PT, get a free month)

---

## 7. Tech Stack for Phase 2

### Payments + Licensing

| Component          | Service        | Why                                    |
|--------------------|----------------|----------------------------------------|
| Payments           | LemonSqueezy   | MoR, tax handling, license keys, subs  |
| License validation | LS API + D1    | Validate on login, cache in D1         |
| Webhook handler    | Cloudflare Worker | Receive LS events, provision accounts |

### Reminders

| Component       | Service    | Cost               | Why                          |
|-----------------|------------|--------------------|------------------------------|
| Email sending   | Resend     | Free (3K/mo)       | Official CF Workers support  |
| SMS sending     | Telnyx     | $0.008/SMS         | Cheapest US SMS provider     |
| Calendar files  | ics (npm)  | $0 (generated)     | Auto-add to patient calendar |
| Scheduling      | CF Cron    | $0 (Workers cron)  | Trigger reminders 24h before |

### Infrastructure (unchanged)

| Component  | Service              | Cost     |
|------------|----------------------|----------|
| Frontend   | Cloudflare Pages     | Free     |
| API        | Cloudflare Workers   | Free*    |
| Database   | Cloudflare D1        | Free*    |
| DNS/CDN    | Cloudflare           | Free     |
| Bot defense| Cloudflare Turnstile | Free     |

*Free tier supports ~1,000+ active users before paid tiers kick in.

---

## 8. Brand Strategy

**Vibe: Professional with personality**

- Product itself: Clean, clinical, fast, trustworthy
- Marketing/onboarding: Sports humor, owl personality, fun template names
- The owl mascot has personality (270deg head rotation on hover)
- Template names are memorable and funny:
  - "Walk It Off, Champ"
  - "You're Not Tom Brady, Buddy"
  - "HOLY S***, Are You ALrIgHt?!"
- Sports alias system adds character while solving a real PII problem
- Color system: Green (safe/OK) + Orange (attention/action)

### Taglines (candidates)

- "3 keys. Schedule done. Go home on time."
- "The $3 scheduling tool that does what $300 tools can't."
- "Stop scheduling. Start treating."
- "Your schedule shouldn't take longer than your coffee order."

---

## 9. Market Data

### Key Statistics

- PT software market: $26.35B (2024), growing rapidly
- Small clinics (4-9 therapists): 39.81% of market revenue
- 47% of PT practices switch EMR within 3 years
- Average failed EMR switch costs $89,247
- 43% of practices switch EMR 3+ times
- PTs lose 5+ hours/week to scheduling inefficiency
- 57% cite documentation/scheduling as #1 burnout cause
- No-shows cost ~$200 each; 2 daily no-shows = $50K/year loss
- 73% of PT patients miss at least one appointment
- Appointment reminders cut no-show rates in half within 2 weeks

### Individual Purchase Behavior

- 17% of healthcare workers use unauthorized "shadow" tools
- 45% do it because of "faster workflow"
- PTs already buy scheduling templates on Etsy ($3-15)
- Physical timer products (TimeQube) sell on Amazon for PT use
- Cash-based PT market is growing and buys individual tools

---

## 10. Launch Strategy

### Pre-Launch

1. Finish Phase 2 features (licensing, reminders, waitlist, stats)
2. Create landing page on ptowl.com
3. Set up LemonSqueezy store with $3/mo and $30/year plans
4. Register 10DLC for SMS
5. Deploy to Cloudflare (Pages + Workers + D1)
6. Test full purchase -> activate -> use flow end-to-end

### Launch Channels

1. Reddit (r/physicaltherapy, r/physiotherapy) - authentic posts
2. PT Facebook groups and forums
3. Product Hunt launch
4. Direct outreach to cash-based PT practices
5. "Built by a PT, for PTs" narrative (if applicable)

### Growth Levers

1. Word-of-mouth (PTs tell other PTs about the $3 tool)
2. "My clinic uses WebPT but I use PTOWL" organic adoption
3. Referral program (free month for referrals)
4. Content marketing (scheduling tips, productivity content)
5. Bottom-up clinic conversion (3 PTs buy Solo -> clinic buys team plan)

---

## 11. Risk Mitigation

| Risk                          | Mitigation                                    |
|-------------------------------|-----------------------------------------------|
| $3/mo is too cheap to sustain | Push annual ($30/yr). Margins work at scale.   |
| SMS costs eat margins         | Email + ICS default. SMS opt-in only.         |
| LemonSqueezy fees too high    | Annual billing (8.3% vs 21.7%). Migrate to    |
|                               | Stripe DIY if >5K users.                      |
| Competitors undercut          | Speed (5-keypress) is structural, not price.  |
| Low conversion                | No free tier = only paying users = focused.    |
| HIPAA compliance questions    | Sports aliases = no PHI stored. Clear ToS.     |
| Churn                         | Monthly value prop is reminders + speed.       |
|                               | Stickiness from patient data + schedules.      |

---

## 12. Success Metrics

### Year 1 Targets

| Metric              | Target       |
|---------------------|-------------|
| Paying users        | 500          |
| Annual revenue      | $15,000      |
| Churn rate          | <5% monthly  |
| No-show reduction   | 30%+ for users using reminders |
| NPS score           | 50+          |

### North Star Metric

**Time from "I need a schedule" to "Schedule done"** — currently ~5 keypresses
(seconds). Competitors: 5-15 minutes. Maintain 100x speed advantage.
