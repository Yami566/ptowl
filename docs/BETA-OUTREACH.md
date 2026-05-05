# PTowl beta-outreach playbook

**Goal:** First 10 active beta clinics actually using PTowl weekly. Not signups —
clinics that come back next week and the week after.

**Bias:** Personal channels first. Cold outreach second. Hacker News last
(it's a flash, not a flywheel).

---

## The unblock list (read this first)

Before sending anything:

1. The product is live, the demo loops on the landing, and `help@ptowl.com`
   delivers to your Gmail. ✅
2. You have a 30-second screencast (or you're OK without one for the first
   batch — see [SCREENCAST-SCRIPT.md](SCREENCAST-SCRIPT.md)).
3. You're prepared to answer **every reply within 4 hours**. The first 10
   clinics are won by responsiveness, not by polish.
4. You've got 30 minutes per week per clinic for the first month — to
   email follow-ups, fix small things they ask for, and notice when they
   stop using it.

If any of those isn't true, don't send the emails yet. Sending and then
ghosting is worse than not sending.

---

## Channel order (do them in this order)

### 1. Your own network (warmest, highest hit rate)

**Who:** Anyone you know personally who is or knows a PT, OT, SLP, chiro,
mental-health therapist, or dental hygienist. College friend's spouse. Your
own former PT. Your dentist's hygienist.

**Goal:** ~5 introductions. From those, ~2 active beta clinics.

**Template — text/iMessage version (most personal, highest reply rate):**

```
Hey [name] — random ask. I built a free
scheduling tool for [PT/OT/dental/etc.] clinics
and I'm trying to get like 5 real clinics to
beat on it for a month. Would [their PT/spouse/
friend] be open to a 15-min demo? Free forever
during beta, and I personally fix anything they
say is broken. https://ptowl.com
```

Send this 1-on-1, not as a group text. Personalize the bracketed pieces.
~30 seconds per send.

**Template — email version:**

```
Subject: Free scheduling tool for [PT clinics / OT therapists / hygienists] — would [name] try it?

Hi [name],

Hope you're well. Quick ask.

I built a tool called PTowl for therapy clinics — generates a 12-week
patient appointment schedule in 5 keypresses, prints clean, texts the
patient a magic link that opens on their phone. Free forever during
beta. Open source.

I'm trying to get 5-10 real clinics actually using it weekly so I can
make sure it solves the right problems. Wondering if [spouse/friend/
contact] would be open to a 15-minute demo by phone or video?

Whatever they ask for in return, I'll do — fix things, add features,
buy them a coffee.

ptowl.com if they want to poke at it first. No signup required to
see the demo on the landing page.

Thanks,
[your name]
```

### 2. Local clinics (walk-in, second-warmest)

**Who:** PT/OT/dental/chiro clinics within driving distance of where you
live. Especially small/independent ones, not chain locations.

**Goal:** Walk into 5 of them this week. Demo on a laptop. Leave a
business card.

**Script for the front desk (verbatim):**

> "Hi — quick question. Is the office manager or owner around? I'm not
> selling anything. I built a free tool for therapy clinics and I'm
> trying to get a few local ones to test it for me. Two-minute demo if
> they have time, or I can leave a card."

If owner is in: open laptop, demo the 5-keypress flow + the patient magic
link on your phone. ~3 minutes total. Hand over card with help@ptowl.com.

If owner is out: leave a card with handwritten "free during beta — built
for clinics like yours, would love your feedback" on the back.

**Don't try to sign them up on the spot.** You're planting seeds. Follow
up by email in 3 days.

### 3. Reddit communities (cold but warm-ish)

After Show HN OR independently. Templates already in
[SHOW-HN.md](SHOW-HN.md) for these subreddits:

- r/physicaltherapy
- r/dentistry (post in r/dentalhygiene if there's a more active sub for
  hygienists specifically)
- r/OccupationalTherapy
- r/slp
- r/Chiropractic
- r/therapists (mental-health)
- r/SoloPractice
- r/selfhosted (tech-adjacent angle)

**Cadence:** one post per subreddit per week max. Don't burn the channel.

### 4. Facebook groups (slowest, can be highest yield)

PT clinic owners have active Facebook groups. SimplePractice grew this
way. Examples:

- "Physical Therapy Professionals" (~30k members)
- "New Grad Physical Therapist" (~50k members)
- "Cash-Based Practice for PTs" (~smaller, higher engagement)
- "Chiropractic Office Managers"

**Don't post a launch announcement.** Lurk for a week, comment on
threads where someone complains about scheduling, drop PTowl as a
friendly aside ("Hey, I made something that might help — DM me if you
want a free beta account").

This is slower but the lead quality is _much_ higher. People who DM you
after seeing you helpful in a thread are 5x more likely to convert than
cold-form fills.

### 5. APTA / state-association angles

If you live near a state PTA chapter that meets monthly, ask if they have
"new tools" segments at meetings. Especially for student-PT chapters —
new grads are more likely to try something new.

This is a slower-burn play. Don't expect immediate clinics. But these
chapters become the channel that compounds at month 6+.

---

## What to NOT do

- ❌ **Don't email APTA HQ asking for an endorsement.** They'll redirect
  you 4 times, then ignore you. Big-org outreach when you have <10
  clinics is wasted time.
- ❌ **Don't run paid ads.** Conversion math doesn't work below 50 active
  clinics. Save the money.
- ❌ **Don't list on AppSumo / Product Hunt / similar deal sites.** Brings
  the wrong audience (deal-seekers, not clinics). Hurts the brand.
- ❌ **Don't promise features you haven't built.** "We'll add X next week"
  is a debt you'll pay with interest. It's OK to say "not yet, what
  about a workaround?"
- ❌ **Don't follow up more than 2 times.** If they don't reply after 2
  emails, they're not interested. Move on.

---

## What to track per outreach

A simple spreadsheet (Google Sheets, Notion, even a markdown table) with:

| Date sent | Channel | Recipient | Replied? | Demo'd? | Active 7d? | Active 30d? | Notes |
| --------- | ------- | --------- | -------- | ------- | ---------- | ----------- | ----- |

After 50 outreach attempts, you'll see:

- Which channel converts best for you specifically
- What objection comes up most (use it to update [SHOW-HN.md](SHOW-HN.md)
  defenses)
- Whether the product is solving a real problem (if no one comes back week
  2, the product is broken — go back to [PRODUCTION-GAP-ANALYSIS.md](PRODUCTION-GAP-ANALYSIS.md))

---

## What "active" means

A clinic is **active** if they:

- Generated at least 3 schedules in a 7-day window, AND
- One of those schedules was opened by a patient (the magic-link view
  shows in your CF Web Analytics if it's enabled)

Not "they signed up". Not "they generated one schedule and bounced".
**They came back.**

The first 10 active clinics is the success metric in
[PTOWL-NORTH-STAR.md](PTOWL-NORTH-STAR.md). Not 10 signups, not 10 demos.
10 clinics that come back.

---

## When to call it

**90 days of consistent outreach** is the trial period. If at day 90 you
have:

- 10+ active clinics: 🎉 you've validated the product. Time to think
  about Phase 9 (auto-email, AI, monetization gating).
- 3-9 active clinics: keep going. The product works for _some_ slice
  of your audience. Find more like the ones who stuck.
- 0-2 active clinics: the product or the audience is wrong. Don't
  push harder — re-examine. Are you reaching the right people? Is
  there a feature that would actually help (and is it possible to
  build under the no-new-code rule)?

---

## A closing reminder

You only need 10. That's it. You don't need to go viral. You don't need
HN to put you on the front page. **Ten clinics that come back next week
and the week after** is the entire game right now.

Personal outreach to people you know is the highest-yield channel by 5x
over anything else. Start there. The rest is gravy.

ptowl.com works. The product is fast. Clinics save 30 minutes a day.
Now go ask people you know if they want it.
