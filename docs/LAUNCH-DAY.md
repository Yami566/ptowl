# PTowl launch-day playbook

**Purpose:** sequential, time-boxed checklist for the day you flip the
repo public and submit Show HN. Removes decision-fatigue at the moment
that needs your full attention on comments, not on logistics.

**Last updated:** 2026-05-05

---

## Pick the day (decide ahead of time)

- **Best:** Tuesday or Wednesday morning, **9-10 AM Eastern Time** (US
  business hours start; HN traffic peaks). Avoid Friday afternoons,
  weekends, and any major US holiday.
- **Avoid:** the day of a major tech-news event (Apple keynote, AWS
  re:Invent, etc.) — your story will get drowned.
- **Confirm 24 hours before:** no calendar conflicts on launch day,
  ~6 hours of focused desk time available for comment-thread duty.

---

## T-minus 24 hours: pre-flight

Done? · Step

- [ ] Run [docs/PRODUCTION-LAUNCH-RUNBOOK.md](PRODUCTION-LAUNCH-RUNBOOK.md)
      sections 1-3 (CF dashboard hardening) — **5 min, dashboard only**
- [ ] Run [docs/CLERK-PRODUCTION-SETUP.md](CLERK-PRODUCTION-SETUP.md)
      end-to-end (custom `clerk.ptowl.com` domain) — **15 min, dashboard only**
- [ ] Verify ptowl.com loads cleanly in:
  - [ ] Chrome incognito (desktop)
  - [ ] Safari incognito (iPhone, real device)
  - [ ] Firefox private (desktop)
- [ ] Sign in flow works in production Clerk instance (Google + email)
- [ ] Create a schedule via preset (5 keypresses)
- [ ] Schedule preview opens cleanly, print preview matches
- [ ] Click Share → "Send to patient" → /p/<token> URL is minted
- [ ] Open the /p/<token> URL on your phone — mobile view renders
- [ ] "Add to calendar" downloads .ics that opens in your phone's calendar
- [ ] Hit a non-existent path (`/nonexistent-route`) — owl 404 renders
- [ ] DevTools Console — no red errors on landing or dashboard
- [ ] Send a test email to `help@ptowl.com` from a different address —
      confirm it arrives in your Gmail (mailto target points there
      directly per the May-5 fix)
- [ ] Run cf-bootstrap workflow at least once (security toggles ON)
- [ ] Record the screencast per [docs/SCREENCAST-SCRIPT.md](SCREENCAST-SCRIPT.md)
      and embed in README

If ANY checkbox above isn't ✅, **don't launch tomorrow.** Push by 1 day
and finish. Launching with bugs costs you the goodwill.

---

## T-minus 1 hour: the warmup

- [ ] **Eat.** Don't launch hungry. Coffee/water within reach.
- [ ] **Phone on Do Not Disturb** except for SMS from a small pre-cleared
      list (partner, co-founder if any). HN comment threads need
      undivided attention.
- [ ] **Open these tabs and leave them open all day:**
  - https://news.ycombinator.com/show
  - https://news.ycombinator.com/newest
  - https://github.com/Yami566/ptowl (your repo)
  - https://ptowl.com (your live site)
  - https://dash.cloudflare.com (CF dashboard, in case anything hits)
  - Your Gmail
  - [docs/SHOW-HN.md](SHOW-HN.md) — the comment-defense answers, ready
    to copy-paste
- [ ] **Re-read** the "Common HN comments to prep for" section in
      SHOW-HN.md — three minutes. The defenses should be in your head,
      not just on paper.

---

## T-zero: the flip

### Step 1 — Flip the repo to public (~30 sec)

1. github.com/Yami566/ptowl → Settings → Danger Zone → Change visibility
   → Public
2. Confirm the prompt
3. Verify by opening `https://github.com/Yami566/ptowl` in incognito —
   should load without auth

### Step 2 — Submit Show HN (~2 min)

1. https://news.ycombinator.com/submit
2. **Title** (paste from SHOW-HN.md):
   ```
   Show HN: PTowl – Open-source PT/dental schedule generator in 5 keypresses
   ```
3. **URL:** `https://ptowl.com`
4. **Text:** paste the body from SHOW-HN.md
5. **Submit**
6. **DO NOT post the URL anywhere else for the first 30 minutes.**
   HN's anti-gaming heuristic flags any submission whose URL is being
   shared on other sites simultaneously. Let HN organic traffic do its
   thing first.

### Step 3 — Confirm post is visible (~30 sec)

1. Click your username at top-right → "submissions" → your post should
   be at the top
2. Note the post URL (will be `news.ycombinator.com/item?id=XXXXXXXX`)

### Step 4 — First comment is yours (~3 min, important)

Within 5 minutes of submission, post a thoughtful first comment. Not
"thanks for reading," but a substantive one — typically:

> "Two things I'd especially love feedback on: (1) **_, (2) _**."

This signals to readers that you're present and seeking input. HN
front-page algorithm rewards posts where the OP comments early.

Pre-canned candidates for the "two things" — pick whichever feels
genuine that day:

1. The sports-alias privacy mechanism — does it feel honest or weird?
2. The "free during beta, no monetization until 50 active clinics"
   approach — do you find it credible or naive?
3. Whether the "5 keypresses" benchmark holds up against actual PT
   workflow you've seen
4. Anything about the AGPL-3.0 license choice for clinic SaaS

---

## T+0 to T+6h: the comment-thread shift

This is where Show HN posts succeed or fail. **Be present.**

### What to do

- [ ] Refresh your post every 5 minutes for the first hour
- [ ] Reply to **every** comment within 15 minutes during peak. Even a
      "good question, will get back to you in 1h" is better than silence
- [ ] Use SHOW-HN.md "Common HN comments to prep for" as your answer
      template — but rephrase in your own voice; don't paste the
      doc verbatim
- [ ] Upvote thoughtful critiques (not just praise). HN community
      recognizes founders who reward criticism
- [ ] If a thread gets technical, link to specific files in the repo:
      `apps/api/src/routes/schedules.ts:533` style

### What NOT to do

- ❌ **Don't argue.** If someone's wrong, factually correct them once.
  If they double down, "agreed to disagree, thanks for the take" and
  move on
- ❌ **Don't ask for upvotes** anywhere
- ❌ **Don't @ anyone famous** ("hey @pmarca what do you think?")
- ❌ **Don't post the link to Twitter/Reddit/Slack within the first
  2 hours.** Wait until the HN post has stabilized in the rankings
- ❌ **Don't leave** the thread for more than 30 minutes during the
  first 4 hours

### Signals of going well

- Front-page within 1 hour
- Comment count > 20 within 2 hours
- Multiple top-level comments asking detailed product questions

### Signals of going meh

- Stuck on /show page (no /front page placement) at 1 hour
- Most comments are "this is just Calendly" or generic dismissals
- No clinical professionals comment

If meh, don't try to push. Show HN is a lottery. Re-submit in
4-6 weeks with what you've learned.

---

## T+2h: cross-posts

Only after HN has settled (front page or stable on /show), post to
the secondary channels using the templates in SHOW-HN.md.

- [ ] r/physicaltherapy — paste the template
- [ ] r/dentistry — paste the template
- [ ] r/selfhosted — paste the template
- [ ] r/cloudflare — paste the template
- [ ] Twitter/X — paste the short version

**Stagger by ~30 minutes between Reddit posts** so it doesn't look like
a campaign. Reddit moderation is sharper than HN's; mass-posting gets
your account flagged.

---

## T+6h: the wind-down

- [ ] Last comment-thread sweep — any unanswered questions?
- [ ] Save the HN post URL, top comment, and any criticism worth
      remembering
- [ ] Note unique signups in the dashboard (CF Web Analytics if
      enabled, otherwise just the user count)
- [ ] **Email every signup that day** within 24 hours: "Saw you signed
      up — anything I can help with? What brought you here?"

---

## T+24h: the next-day debrief

Write down (in a private note, not yet a doc):

1. **Top 3 critiques** that landed. Make a list. Don't fix them yet.
2. **Top 3 misunderstandings** of the product. These often signal a
   landing-page problem, not a product problem.
3. **Total signups** in 24h.
4. **Active users** in 24h (created at least one schedule).
5. **Mood check.** If you're crushed, that's normal. Show HN is brutal
   for half of submissions and you might be in that half. The 10
   active clinics goal is _unrelated_ to whether HN went well.

If signups < 50 in 24h, it didn't catch fire — totally normal, focus
on the small group of people who DID sign up. Each one is more
valuable than 10 from a viral spike.

---

## The "what could break" cheat sheet

For each of these symptoms during the launch, the one thing to check:

| Symptom                               | First check                                                              |
| ------------------------------------- | ------------------------------------------------------------------------ |
| ptowl.com 5xx                         | Cloudflare Workers logs (real-time tail)                                 |
| Sign-in fails / Clerk widget hangs    | Clerk dashboard → Sessions tab; verify `clerk.ptowl.com` resolves        |
| API responses slow                    | Workers Analytics → CPU time / errors                                    |
| Patient `/p/<token>` says "not found" | Verify share_token exists in D1                                          |
| Build fails                           | GitHub Actions → click failed run → expand step                          |
| Need to rollback                      | `wrangler rollback` from `apps/api/`                                     |
| Need to rollback the frontend         | CF Workers Builds → Deployments → previous → Promote                     |
| help@ptowl.com email doesn't arrive   | Verify mailto target → should be `nurelimusabay@gmail.com` per May-5 fix |

---

## Things to celebrate, briefly

- You built and shipped a real product as a solo founder
- The repo is open-source under AGPL-3.0
- You'll get 1-3 thoughtful comments from people you've never met
  who care about your problem
- The first paying clinic is one comment thread away

Then close the laptop and eat dinner. The work continues tomorrow.
