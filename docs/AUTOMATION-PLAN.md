# PTowl automation plan

This is a living document that captures what we're automating, why, and
in what order. It's intentionally plain-English. Service names and
implementation details get added to a section only when we're ready to
build that piece, not before.

## How to use this doc

- Read top to bottom when starting a new session — it's your map.
- When we decide something new, add it under the relevant section AND
  log the decision at the bottom (date + one sentence).
- When we discover a question we can't answer right now, drop it under
  "Open questions" so future sessions don't lose track.
- Keep it scannable. If a section grows past one page, split it.

## What PTowl is, in one paragraph

PTowl is a Cloudflare-hosted SaaS that lets medical/dental providers
create and print patient PT schedules in five keypresses. It runs as
two Cloudflare Workers (a frontend that serves the web app and a
backend API), with patient data stored in Cloudflare's database (D1)
and clinic logos in object storage (R2). Sign-in is handled by Clerk
(Google + email/password drop-in widget). Today the app is in beta
with a small handful of clinics. Brand: green and orange, owl mascot,
sports-legend aliases as a privacy failsafe instead of patient names.

## Operating context (as of May 2026)

- **Scale**: under 10 clinics, under 100 schedules per day.
- **Priority axis**: fastest development of new features. We optimize
  for "easy to add the next thing" over "lowest possible cost" or
  "absolute reliability."
- **Cost posture**: stay on Cloudflare free tiers; this is comfortable
  at our current scale and gives 100x headroom.
- **Team**: solo founder. Whatever we build needs to be maintainable
  by one person who has other things to do.

## Top three things to automate (ranked)

These are what we focus on next. Other ideas are in "Backlog" below
but explicitly deferred.

### 1. Clerk production instance + custom domain (`clerk.ptowl.com`)

**What:** Promote Clerk from its Development instance
(`ethical-dingo-48.clerk.accounts.dev`) to a Production instance
served from `clerk.ptowl.com`. End result: the OAuth popup users
see during Google sign-in shows `clerk.ptowl.com` instead of a
random dev subdomain, and Clerk's transactional emails (verification,
account recovery) come from a `ptowl.com`-aligned sender.

**Why:** Trust signal — clinic owners and HN readers alike read
`ethical-dingo-48.clerk.accounts.dev` as "this is a beta toy." The
custom-domain Clerk instance is the single biggest "this is real
software" signal we can ship without writing any new app code.

**How it works in plain terms:** Clerk dashboard walks you through
"create production instance" → "verify domain." Clerk gives you two
CNAME records (`clerk.ptowl.com` and `clkmail.clerk.ptowl.com`);
paste them into Cloudflare DNS. Clerk verifies, then issues new
production API keys. Update `VITE_CLERK_PUBLISHABLE_KEY` in CF env
vars and the next deploy picks up the new instance.

**State today:** Plan documented in
[CLERK-PRODUCTION-SETUP.md](CLERK-PRODUCTION-SETUP.md). Pending the
~15-min user-side dashboard walk-through. Should land before the
Show HN flip. (Supersedes the earlier "Firebase branded magic-link
sender" plan that was obsoleted by the Phase 4 Firebase→Clerk
migration; nothing in that plan transfers because Clerk handles
its own sender domain natively.)

### 2. Onboarding survey to seeded templates

**What:** First-time users answer ~5 short questions (provider type,
specialty, default sessions per week, weekend hours, intro tone). The
answers seed clinic-specific schedule templates with witty preset names.
A sports-medicine PT gets templates like "Walk It Off, Champ" and
"You're Not Brady, Buddy." A pediatric dentist gets gentler ones.

**Why:** New users currently land on a dashboard with generic templates
they have to customize. The onboarding survey makes the first
interaction feel personal and gives users a head start. It's the
highest UX leverage move on the roadmap.

**How it works in plain terms:** We add a one-time survey screen between
sign-in and the dashboard. We save the answers to the database. We use
a lookup table (or a quick AI prompt to Cloudflare's built-in AI) to map
answers to a set of templates. We seed those templates into the user's
account on first save. The user can still customize them after.

**State today:** Not built. Has been on the wishlist as "Item A" in the
older wireframe consultation plan. This is the biggest of the three
priorities — it requires real new code (a form, an endpoint, a
first-run trigger). The plain-English shape above is final; the
technical shape gets added to this doc when we start building.

### 3. Backups and log retention — already covered by D1's built-in PITR

**What we used to plan:** Build a daily Cron Trigger that snapshots
D1 to R2 and rotates audit_log rows older than 90 days.

**What we discovered:** Cloudflare D1 already does point-in-time
recovery (PITR) automatically on every plan. **Free tier = 7-day
retention; paid tier = 30-day retention.** Restore is a single
`wrangler d1 time-travel restore` command. We don't need to build
backup automation; CF runs it for us.

**Action item, not a build item:** when D1 prod hits real traffic
post-launch, upgrade to the paid plan ($5/mo per database) for the
30-day window. Until then, 7 days is fine.

**Audit-log rotation** is still real (queries get slow if the table
grows unbounded), but at <100 rows/day we have years of headroom
before it matters. Defer until we see real volume.

**State today:** Nothing to build. Just enable the upgrade in
Cloudflare dashboard if/when scale demands.

## Phased roadmap

### Phase 1 (this week) — promote Clerk to production

User-side dashboard work walked through in
[CLERK-PRODUCTION-SETUP.md](CLERK-PRODUCTION-SETUP.md): create
production instance, paste 2 CNAMEs into CF DNS, swap the publishable
key in CF env vars, redeploy. ~15 minutes total. No code.

### Phase 2 (next ~2 weeks) — backups + log retention

Smallest new piece of infrastructure. One scheduled job. Validates that
we know how to wire a Cloudflare scheduled task end-to-end, which
unlocks future automations (reminders, daily digests, etc.) that share
the same shape.

### Phase 3 (after Phase 2 is stable) — onboarding survey

Largest piece. Build the form. Build the seed-on-first-save logic.
Decide whether template mapping uses a static lookup table or
Cloudflare's AI binding (current lean: static table, simpler, free,
predictable). Test with a few real provider types.

## What we are NOT automating right now

These are good ideas — they're just not in the top three. Listed so we
remember why they're deferred.

- **Email reminders to patients (24h + 1h before appointment)** — the
  database has the right data and there's already a placeholder for it,
  but it's blocked on having a real outbound email service set up
  (Resend or similar). Will fold in once Phase 1's branded sender work
  proves the pattern.
- **PII detection on patient initials** — needs a small library to flag
  when a user types "John Smith" instead of "JS". Worth doing, but
  Phase 3's onboarding survey teaches users to use initials, which
  catches most cases without tech.
- **Daily clinic digest emails** — same blocker as patient reminders
  (no outbound transactional email service yet).
- **Failsafe read-only mode if database is down** — interesting
  reliability bet, but our scale doesn't justify it yet. Defer until we
  see real outages.
- **Schedule auto-archival** — nice cleanup, but at <100 schedules/day
  the dashboard isn't getting cluttered. Revisit if a single clinic's
  list passes ~50 active schedules.
- **Payments** — Phase 2 work, deferred entirely.
- **SMS reminders** — same as payments. Out of scope this round.

## Architecture in one diagram (text form)

```
                    Browser
                       │
                       ▼
              ┌──────────────────┐
              │  Frontend Worker │  ──────── Clerk (Google + email/password)
              │  (ptowl.com)     │
              └──────────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   API Worker     │
              │   (ptowl.com/    │
              │    api/*)        │
              └──────────────────┘
                  │       │       │
                  ▼       ▼       ▼
                ┌───┐   ┌───┐   ┌────────────┐
                │D1 │   │R2 │   │Scheduled   │  ← Phase 2 lives here
                │DB │   │   │   │job (Cron)  │
                └───┘   └───┘   └────────────┘
```

Everything lives inside Cloudflare except the Clerk auth dependency.
We don't have Queues, Durable Objects, or Workflows wired up yet, and
at our scale we shouldn't add them — plain Workers + D1 + R2 cover
the current feature set. D1's built-in PITR replaces the previously-
planned scheduled-backup job.

## Open questions

- **What outbound email service do we use** when we start sending
  patient reminders / clinic digests? Candidates: Resend (generous
  free tier, simple), MailChannels (Workers-native, free for now but
  policy has shifted), SendGrid (mature, paid past low free tier).
  Decide before Phase 2 ends.
- **Does the static-lookup vs. AI-binding decision for onboarding
  template mapping change at scale?** Probably not. Revisit if we add
  more than ~30 provider type combinations.
- **Should `help@ptowl.com` go to a shared inbox or just the founder's
  Gmail?** Gmail is fine for beta. Re-evaluate at >50 clinics.

## Decision log

Append-only. Date + one sentence. Newest at the bottom.

- **2026-05-03** — Master plan created. Top 3 priorities: branded
  magic-link sender → backups + log retention → onboarding survey to
  seeded templates. Optimize for development speed at beta scale.
- **2026-05-03** — No Queues / Durable Objects / Workflows in v1. Plain
  Workers + D1 + R2 + scheduled jobs are sufficient through 100
  clinics.
- **2026-05-03** — Defer outbound email automations (patient
  reminders, clinic digests) until an outbound email service is
  selected. Branded sender (Phase 1) is dashboard-only and unblocks
  this decision.
