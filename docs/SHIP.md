# PTowl — Ship

Launch-day playbook for PTowl. The flip-the-repo, submit-Show-HN,
work-the-comment-thread, run-the-cross-posts, then-do-beta-outreach
sequence — in one place, executable, with all the tactical copy
pre-written.

Companion docs in the four-doc library:

- [VISION.md](VISION.md) — why this exists
- [BUILD.md](BUILD.md) — how it's put together
- [SHIP.md](SHIP.md) — **this file** — how it goes public
- [RUN.md](RUN.md) — how it stays alive

Last updated: 2026-05-06.

---

## TL;DR

Launch on a Tuesday or Wednesday at 9-10 AM Eastern Time. Flip the
GitHub repo to public, submit Show HN, then sit in the comment thread
for 6 hours. After the HN post stabilizes, cross-post to
r/physicaltherapy, r/dentistry, r/selfhosted, r/cloudflare, and
Twitter/X. The Phase-8 success metric is **10 active beta clinics** —
"active" means 3 schedules created in 7 days plus at least one patient
view. HN is a flash, not a flywheel; the real outreach is personal-
network DMs and walk-in visits to local clinics.

---

## T-24h → T+24h checklist

Sequential, time-boxed. Skip nothing.

### T-24h: pre-flight

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
- [ ] Record the screencast (see "Screencast" section below) and embed
      in README

If any checkbox above isn't ticked, **don't launch tomorrow.** Push by
1 day and finish. Launching with bugs costs the goodwill.

### T-1h: the warmup

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
  - This file — comment-defense answers, ready to copy-paste
- [ ] **Re-read** the "11 comment defenses" section below — three
      minutes. The defenses should be in your head, not just on paper.

### T-0: the flip

#### Step 1 — Flip the repo to public (~30 sec)

1. github.com/Yami566/ptowl → Settings → Danger Zone → Change visibility
   → Public
2. Confirm the prompt
3. Verify by opening `https://github.com/Yami566/ptowl` in incognito —
   should load without auth

#### Step 2 — Submit Show HN (~2 min)

1. https://news.ycombinator.com/submit
2. Title: paste from the "Show HN — submission post" section below
3. URL: `https://ptowl.com`
4. Text: paste the body from the "Show HN — submission post" section
5. Submit
6. **DO NOT post the URL anywhere else for the first 30 minutes.**
   HN's anti-gaming heuristic flags any submission whose URL is being
   shared on other sites simultaneously. Let HN organic traffic do its
   thing first.

#### Step 3 — Confirm post is visible (~30 sec)

1. Click your username at top-right → "submissions" → your post should
   be at the top
2. Note the post URL (will be `news.ycombinator.com/item?id=XXXXXXXX`)

#### Step 4 — First comment is yours (~3 min, important)

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
3. Whether the "5 keypresses" benchmark holds up against actual PT/OT/
   SLP/chiro/mental-health/dental-hygiene workflow you've seen
4. Anything about the AGPL-3.0 license choice for clinic SaaS

### T+0 to T+6h: the comment-thread shift

This is where Show HN posts succeed or fail. **Be present.**

What to do:

- [ ] Refresh your post every 5 minutes for the first hour
- [ ] Reply to **every** comment within 15 minutes during peak. Even a
      "good question, will get back to you in 1h" is better than silence
- [ ] Use the "11 comment defenses" section below as your answer
      template — but rephrase in your own voice; don't paste verbatim
- [ ] Upvote thoughtful critiques (not just praise). HN community
      recognizes founders who reward criticism
- [ ] If a thread gets technical, link to specific files in the repo:
      `apps/api/src/routes/schedules.ts:533` style

What NOT to do:

- **Don't argue.** If someone's wrong, factually correct them once.
  If they double down, "agreed to disagree, thanks for the take" and
  move on
- **Don't ask for upvotes** anywhere
- **Don't @ anyone famous** ("hey @pmarca what do you think?")
- **Don't post the link to Twitter/Reddit/Slack within the first
  2 hours.** Wait until the HN post has stabilized in the rankings
- **Don't leave** the thread for more than 30 minutes during the first
  4 hours

Signals of going well:

- Front-page within 1 hour
- Comment count > 20 within 2 hours
- Multiple top-level comments asking detailed product questions

Signals of going meh:

- Stuck on /show page (no /front page placement) at 1 hour
- Most comments are "this is just Calendly" or generic dismissals
- No clinical professionals comment

If meh, don't try to push. Show HN is a lottery. Re-submit in 4-6
weeks with what you've learned.

### T+1h (post-launch): cross-posts

Only after HN has settled (front page or stable on /show), post to
the secondary channels using the templates in the "Cross-post
templates" section below.

- [ ] r/physicaltherapy — paste the template
- [ ] r/dentistry — paste the template
- [ ] r/selfhosted — paste the template
- [ ] r/cloudflare — paste the template
- [ ] Twitter/X — paste the short version

**Stagger by ~30 minutes between Reddit posts** so it doesn't look like
a campaign. Reddit moderation is sharper than HN's; mass-posting gets
your account flagged.

### T+6h: the wind-down

- [ ] Last comment-thread sweep — any unanswered questions?
- [ ] Save the HN post URL, top comment, and any criticism worth
      remembering
- [ ] Note unique signups in the dashboard (CF Web Analytics if
      enabled, otherwise just the user count)
- [ ] **Email every signup that day** within 24 hours: "Saw you signed
      up — anything I can help with? What brought you here?"

### T+24h: the next-day debrief

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
on the small group of people who DID sign up. Each one is more valuable
than 10 from a viral spike.

### "What could break" cheat sheet

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

## Show HN — submission post (lead, scrubbed)

### Title (80 char max on HN)

> Show HN: PTowl — schedule recurring patient appointments in 5 keypresses

If "PT" or "patient" reads as ambiguous, alt title:

> Show HN: PTowl — recurring patient schedule generator for clinics

### URL

`https://ptowl.com`

### Body (HN supports plain text + bare URLs; no markdown)

```text
Hi HN — I'm an independent solo founder who got tired of watching therapy clinics waste 30 minutes a day building patient schedules in Word. So I made PTowl: 5 keypresses, print-ready, sports-alias privacy failsafe instead of real names. Free during beta.

What it does

You're a PT, OT, SLP, chiropractor, mental-health therapist, or dental hygienist. Patient walks in. They need a 6-week recurring schedule, 3x/week, mornings. Today you open Word, hand-type a table, save as PDF, print, hand it to them. ~30 minutes if it's busy.

With PTowl, you press: 2-J-S-Enter (preset 2, patient initials JS, confirm). Out comes a clean print-ready schedule with the patient's sports alias ("Brady" instead of "JS") on top, the 18 appointment dates underneath, ICS file for their phone calendar, and a magic-link URL you can text them so they see it on their phone without an app.

The 5-keypress promise is the whole pitch. I rebuilt it from scratch maybe 6 times to actually keep that promise.

Who it's for

Therapy clinics that book recurring patient series — PT, OT, SLP, chiro, mental-health, dental hygiene recalls. Not primary-care intake. Not Calendly-style patient-initiated booking. Provider-driven bulk recurring scheduling for clinics that today print schedules on paper.

Stack

- React 19 + Vite (frontend, ~660KB bundle)
- Cloudflare Workers + Hono (API)
- Cloudflare D1 (SQLite at the edge)
- Cloudflare R2 (clinic logos)
- Clerk (auth, drop-in widget) on a custom domain (clerk.ptowl.com)
- ical-generator + rrule (calendar feeds)

Whole thing is ~$0/month at <10k MAU. Cloudflare free tier + Clerk free tier carry it.

The privacy gimmick

PTowl never stores patient names. Provider types initials, system maps to a sports legend ("JS" → "Brady", "AS" → "Pelé", 676 alias pairs). Schedules display + print the alias. Provider knows JS = Jane Smith; system has no idea. Not HIPAA-compliant (deliberately — that's a different product), but it's a real-world workable privacy failsafe for the "I just need to print a schedule" use case.

What's not built yet

- SMS reminders with 2-way reply (Twilio-shaped)
- Multi-provider clinics (one account, many therapists)
- AI-assisted schedule drafting (cf-ai is bound; haven't wired the prompt)
- Pricing/payments (no monetization yet, free during beta)

Feedback wanted on

- The 5-keypress flow on tablet vs desktop. Tested fine on Mac/Windows; mobile keyboards are weird.
- The sports-alias mapping. Some are obvious (Brady, Pelé, Serena). Some are deeply random. Open to feedback that improves the mapping.
- Whether dental hygiene + mental-health practices actually want this. Built originally for PT; adjacent therapy folks keep asking when they can use it.

Live: https://ptowl.com
```

---

## Show HN — 11 comment defenses

These tend to come up on Show HN posts. Have honest answers ready,
don't be defensive. Each answer is one HN comment — short enough to
type fast in the launch-day rush. Rephrase in your own voice; don't
paste verbatim.

### 1. "Why isn't this HIPAA compliant?"

On purpose. Real HIPAA compliance is a different product (2-3x the
build cost, ongoing audit fees, BAAs with every vendor). PTowl is for
the clinics that print schedules on paper anyway; the privacy floor is
"real names never enter our servers." Sports aliases enforce that
floor in code. We say this explicitly on the security page rather than
hand-waving.

### 2. "Why Cloudflare specifically?"

Free tier carries the whole stack through ~10K MAU. D1 + Workers + R2

- Clerk means one-vendor hosting for database, runtime, storage, auth.
  Reduces the "weekend project" self-host cost to literally $0. Also:
  the AGPL repo has a one-click Deploy-to-Cloudflare button — anyone
  can fork and run their own instance in 15 minutes.

### 3. "Why Clerk over Auth0/Supabase/build-it-yourself?"

Drop-in widget meant we didn't have to build sign-in UI. Free tier
10K MAU. Auth via Clerk on a custom domain (clerk.ptowl.com). The
tradeoff is a vendor dependency, but auth is the LAST thing a solo
founder should hand-roll.

### 4. "Why AGPL not MIT?"

To discourage drive-by SaaS rip-offs while keeping the code open for
community contribution + self-host use. Anyone running modified PTowl
as a network service must share their changes. Permissive enough for
individual contributors, protective enough that "PTowl Pro by
Competitors-Inc.com" can't legally exist as closed-source. If AGPL is
incompatible with your situation, we'll do a commercial license — open
an issue.

### 5. "Where's the AI / ML?"

Not yet. Cloudflare AI binding is wired up in wrangler.jsonc but I
haven't shipped the prompt-to-schedule feature. Top of roadmap; what
AI feature would actually help a clinician vs. just being demo theater
is the question I'd love answers to.

### 6. "Have any clinics actually used this?"

Less than 10 active beta clinics today. Pre-validated the "5
keypresses to print" UX with one PT in person; everything else is
hypothesis. Goal for the next 30 days: get to 10 active clinics. Will
update launch numbers honestly.

### 7. "Why don't I just use Calendly / Cal.com?"

Calendly is patient-initiated booking — patient picks a slot from a
public URL. PTowl is provider-initiated bulk-recurring scheduling —
the provider generates a 12-week schedule for a specific patient based
on a treatment plan. Different product entirely. We'd actually pair
with Calendly if a clinic uses it for new-patient intake.

### 8. "Why text-based 'sports aliases' for de-identification? Just encrypt the names."

Encryption protects against data exfil; it doesn't protect against
your front-desk reading a printed schedule out loud. The alias is a
SOCIAL privacy mechanism: the printed schedule says "Brady" not "John
Smith", so when it's left on a clipboard, in a fax, or visible during
a hallway conversation, the patient's identity isn't exposed by
default. It's honest-to-paper privacy, which is what clinics actually
need.

### 9. "What happens at scale?"

D1 free tier covers ~5GB and ~5M reads/day. We can handle thousands
of clinics on free Cloudflare. The only thing that scales linearly
with usage is outbound email (Phase 9 — not shipped yet). At 50
active clinics, we wire LemonSqueezy + MailChannels.

### 10. "How do I trust your privacy claims when I can't audit them?"

You can. Repo is on GitHub under AGPL-3.0:
github.com/Yami566/ptowl. The auth verification, schedule writes, and
patient-data handling are all in apps/api/src/. Privacy policy at
ptowl.com/privacy is also in source. No "trust me bro" surface — the
"no real names" claim is a checkbox you can verify by grepping for
`patient_name` (you won't find it).

### 11. "Who are you?"

Solo founder, technical background, building this because therapy-
clinic friends complained about how slow scheduling was. Reachable at
help@ptowl.com (mailto routes directly to my inbox during beta). I'll
be in this thread for the next 6 hours.

---

## Cross-post templates

Pre-canned copy for the major secondary channels. Tone matches each
forum's culture; don't re-use HN copy verbatim.

### r/physicaltherapy (post ~2 hours after HN)

```
title: I made a free scheduling tool for PT clinics — 5 keypresses to a printed schedule [open source]

body:
Hi r/physicaltherapy — solo dev who got tired of watching PT friends
spend 30 min/day building patient schedules in Word and Excel.

Made PTowl: 5 keypresses to a print-ready schedule. Free during beta.
Open source under AGPL.

What it does: pick a preset (post-op knee rehab, sports injury rehab,
balance & fall prevention, etc.), type the patient's two-letter
initials, hit Enter. Out comes the 12-week schedule with 18-24
appointment dates, ready to print or text to the patient as a magic
link they open on their phone.

Privacy gimmick: real names never enter the system. We map initials
to a sports alias ("JS" → "Brady"), so the printed schedule says
Brady. Not HIPAA-compliant (deliberately — that's a different
product), but it's honest privacy for the printed-schedule use case.

Free during beta. Looking for ~10 PTs willing to actually use it
weekly and tell me what's broken. https://ptowl.com — sign in,
generate a schedule, hit me up at help@ptowl.com.
```

### r/dentistry (post ~3 hours after HN)

```
title: PTowl — 5-keypress recurring schedule generator for dental hygiene + recall

body:
Built originally for PT clinics, but works for any provider booking
multi-week recurring patient series — including dental hygiene recalls.

Pick a preset, type initials, hit Enter — schedule done. Print or
text the patient a link that opens on their phone.

Free during beta, AGPL open source, no PHI stored (we map initials
to sports aliases so printed schedules don't leak patient names).

https://ptowl.com — would love hygienists to try it and tell me
what's missing. help@ptowl.com is the founder's inbox.
```

### r/selfhosted

```
title: PTowl — open-source clinic scheduling on Cloudflare Workers (AGPL, $0/mo at 10K MAU)

body:
Self-hostable clinic scheduling tool. Solo dev project, AGPL-3.0.

Stack: React 19 + Vite frontend → Cloudflare Workers Static Assets.
Hono on Cloudflare Workers for the API. D1 for the database (SQLite
at the edge). R2 for clinic logo storage. Clerk for auth. ical-
generator + rrule for the calendar feed. Whole stack runs on free
tier through ~10K MAU.

Repo: github.com/Yami566/ptowl
One-click deploy: there's a Deploy-to-Cloudflare button in the README.
Walkthrough: docs/HOW-TO-DEPLOY.md

The interesting design choice: real patient names never hit the
database. Clinic types two-letter initials, server maps to a sports-
figure alias. Honest paper-trail privacy without HIPAA overhead.
```

### r/cloudflare

```
title: Show-and-tell: clinic scheduling SaaS on D1 + Workers + R2 + Clerk

body:
Built a SaaS entirely on the Cloudflare free tier: PTowl. Solo
project, ships next week.

What's interesting from a Cloudflare angle:
- Frontend deploys via Workers Static Assets (newer than Pages, same
  unified runtime). Wrangler.jsonc with `assets.directory: "./dist"`.
- API deploys to Workers (Hono framework).
- Database is D1 with point-in-time recovery (saved my bacon during
  a migration once — wrangler d1 time-travel restore is magic).
- Edge security via WAF Free Managed Ruleset + Bot Fight Mode + Rate
  Limiting on /api/*. All set up via the Cloudflare API in a
  one-shot GitHub Actions workflow (cf-bootstrap.yml in the repo).
- Logos in R2.
- Cron Triggers for the reminder pipeline.

Whole thing is AGPL: github.com/Yami566/ptowl.
Live: ptowl.com
```

### Twitter / X

```
Just shipped Show HN: PTowl — clinic scheduling tool.

5 keypresses to a printed patient schedule.
Privacy by sports-alias (real names never stored).
Built on Cloudflare. Free during beta.

https://ptowl.com
```

---

## Screencast (30 seconds)

**Goal:** A 30-second screencast that lives in the README, shows the
5-keypress promise from blank-state to printed schedule + patient
magic-link share, and earns the HN reader's attention before they
scroll past.

**Total target length:** 28-32 seconds. Anything longer loses the HN
reader; anything shorter doesn't finish the story.

### Tools (any of these work)

| Tool                         | Platform          | Output                    |
| ---------------------------- | ----------------- | ------------------------- |
| **Loom** (free tier)         | Mac/Windows       | MP4, easy embed/share URL |
| **OBS Studio** (free)        | Mac/Windows/Linux | MP4 + full control        |
| **macOS Cmd-Shift-5**        | Mac               | MOV, no install           |
| **Windows Game Bar (Win+G)** | Windows           | MP4, no install           |

**Recommendation:** macOS Cmd-Shift-5 → "Record Selected Portion" →
drag a 1280×720 box around your browser window. Drag-to-select is
faster than configuring a tool.

### Pre-recording setup (5 minutes once)

1. **Browser**: fresh Chrome window, no extensions visible, **incognito**
   so no autofill / saved-state weirdness. Window sized to **1280×720**
   (use a tool like Window Resizer extension, or eyeball it).
2. **Screen**: hide bookmarks bar (`Cmd-Shift-B`). Close all other tabs.
3. **Login state**: sign in to ptowl.com beforehand → land on
   `/dashboard`. The screencast starts on the dashboard, not the
   sign-in page (cuts ~10s of friction).
4. **No real patient data**: use a fake initial pair like "JS" or "AB"
   that maps to a recognizable sports figure (LeBron, Brady, etc.).
5. **Fake clinic name**: if your profile shows a real clinic, swap to
   "Sample Clinic" before recording so the schedule print preview
   doesn't expose you.

### The script (exact keypress sequence + voiceover)

> Time markers assume a relaxed pace. If you're nervous, slow down —
> the keys are the star, not your voice. **Voiceover is OPTIONAL** —
> a silent recording with a subtitle overlay works just as well.

#### 00:00–00:03 — Open with the dashboard, blank-ish state

**Action:** Camera on the dashboard. Show the row of preset cards.
Cursor still.

**Voiceover (optional):**

> "PTowl. Recurring patient schedules in 5 keypresses. Here's the
> whole product."

#### 00:03–00:05 — Press `2` (preset selected)

**Action:** Press the `2` key. The Sports Injury Rehab card
highlights. Initials modal opens.

**Voiceover:**

> "Two — that's the preset."

#### 00:05–00:07 — Type `J`, `S` (patient initials)

**Action:** Type `JS`. The modal shows "Brady" appearing as the
auto-generated alias (sports-figure mapping in action).

**Voiceover:**

> "JS — that's the patient's initials. PTowl maps them to a sports
> alias. No real names ever stored."

#### 00:07–00:09 — Press `Enter` (generate)

**Action:** Press `Enter`. Schedule preview opens with all
appointments populated.

**Voiceover:**

> "Enter. Schedule done. Five keypresses."

#### 00:09–00:14 — Show the populated schedule

**Action:** Pause for ~5 seconds with the schedule visible. Optional:
hover over the table view briefly, then the calendar view. Don't
click yet.

**Voiceover:**

> "Twelve weeks of appointments. Auto-generated. The patient sees
> 'Brady,' you know it's JS."

#### 00:14–00:18 — Click `Share → Send to patient`

**Action:** Click the Share button. Select "Send to patient" from
the dropdown. The /p/<token> URL is minted and copied to clipboard
(or share-sheet opens on mobile).

**Voiceover:**

> "Share to patient — text it, email it, whatever channel you use."

#### 00:18–00:25 — Switch to a phone view (or a narrow browser window)

**Action:** Open the /p/<token> URL in a NEW tab sized like a phone
(or actually paste into your real phone, AirDrop the URL, and
screen-record the phone if you want max polish). Show the patient's
mobile view rendering — sports alias header, clean appointment list,
"Add to my calendar" button visible.

**Voiceover:**

> "Patient sees this on their phone. Add to calendar with one tap."

#### 00:25–00:30 — Click `Add to my calendar`

**Action:** Tap "Add to my calendar". The .ics download triggers (on
mobile, it'll prompt to add to default calendar app). Optional: switch
to the calendar app to show the appointments populated.

**Voiceover:**

> "Done. Five keypresses for the provider, one tap for the patient.
> That's PTowl. Open source under AGPL-3.0. Free during beta."

#### 00:30 — End

Hard cut. Don't fade. Don't add an outro card. The HN reader is
already gone or hooked.

### Post-production (5 minutes)

1. **Trim** to under 32 seconds total.
2. **Add subtitle overlays** for each keypress: a small caption at
   the bottom showing `[2]`, `[J]`, `[S]`, `[Enter]`, `[Share]`,
   `[Add to Calendar]` as they happen. This makes the silent version
   land. Most recording tools (Loom, OBS, macOS Cmd-Shift-5) let you
   add captions in post.
3. **Optimize file size**:
   - Target: <5 MB
   - 1280×720, 30fps, H.264, ~2 Mbps bitrate
   - Tools: HandBrake (free, GUI), `ffmpeg -crf 28 -preset slow`, or
     Loom's auto-optimization
4. **Convert to MP4** if not already.

### Where the file lives

Save as **`apps/web/public/screencast.mp4`** so it's served from
ptowl.com directly. Reference in the README:

```markdown
## How it works (30-second video)

[![PTowl 30-second demo](apps/web/public/og-image.png)](apps/web/public/screencast.mp4)
```

For HN-friendlier embedding, also upload to YouTube as **unlisted**
and swap the README link to the YouTube URL. HN posts with YouTube
embeds get noticeably more click-through than self-hosted MP4s, even
if the video is identical.

### Shot-by-shot recording card (press record, follow this)

**The card.** Each row is one shot. Total target: 30 seconds. Read the
voiceover line as you do the action; voiceover length is roughly
calibrated to the time slot. If you're new to recording, do shot 1
through shot 7 in order without stopping — single take is fine.
Mistakes are forgivable; pacing is what matters.

| #   | Time            | What's on screen                                                                                | What you do                                                                             | Voiceover                                                                                     |
| --- | --------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | `00:00 – 00:03` | Dashboard, signed in, **empty schedule list**                                                   | Just hold still                                                                         | "Most clinic schedules take thirty clicks."                                                   |
| 2   | `00:03 – 00:06` | Same dashboard                                                                                  | Press **`2`** on the keyboard                                                           | "PTowl takes five keypresses."                                                                |
| 3   | `00:06 – 00:11` | Initials modal pops open ("Sports PT" preset selected)                                          | Type **`J`** then **`S`** (auto-submits on the second letter)                           | "Two letters. Real names never enter the system — PTowl maps them to a sports-figure alias."  |
| 4   | `00:11 – 00:18` | Schedule preview overlay slides in: 12 sessions on a calendar grid, "Walt Frazier" alias at top | Don't click — let the calendar render visibly                                           | "Twelve weeks of sessions, generated. No more clicking through a calendar to place each one." |
| 5   | `00:18 – 00:23` | Schedule still visible                                                                          | Click **`Print`** button (top-right of the schedule view); browser print dialog appears | "Print, hand it over."                                                                        |
| 6   | `00:23 – 00:28` | Close the print dialog (Cancel); back on the schedule                                           | Click **`Share ▾`** → click **`Copy patient link`**                                     | "Or share the magic link — patient sees their alias on top, never their real name."           |
| 7   | `00:28 – 00:30` | Navigate back to ptowl.com homepage                                                             | Just land on the homepage                                                               | "Free during beta. ptowl dot com."                                                            |

**Single-take rules of thumb:**

- Don't narrate every click ("now I'm going to click this") — let the
  action speak.
- If you stumble on a word, keep going. The cut point is at the END
  of the take, not mid-shot.
- The voiceover lines above total ~85 spoken syllables → ~25 seconds
  at a normal speaking pace. The remaining 5s is breathing room
  between shots.
- Don't worry about background noise unless it's a fire alarm. HN
  forgives.
- Record with **headphones in** so the laptop's built-in mic doesn't
  pick up speaker feedback if you're playing music.

**Common mistakes to avoid (mistakes burn 2-3s of your 30):**

- ❌ Showing the sign-in flow at the start. Already-signed-in
  dashboard is the cold open. Cuts ~10s of friction.
- ❌ Using a real patient name. Use `JS` initials (or your own).
- ❌ Logo splash card at the start. Wastes 3s the HN reader doesn't
  have. Open cold on the dashboard.
- ❌ Recording at 1920×1080 in full-screen. 1280×720 windowed is
  sharper at HN-thumbnail resolution and embeds cleanly on YouTube.
- ❌ Background music. Voiceover only. HN audience watches with sound
  ON for instructional clips; music distracts.

**After the take:**

1. Trim head + tail in the recording tool (Cmd-Shift-5's built-in
   trimmer on macOS, OBS clip editor, etc.).
2. Export as MP4, H.264, 1280×720, target file size <8MB
   (HandBrake or `ffmpeg -crf 28` does this in one pass).
3. Save to `apps/web/public/screencast.mp4`.
4. ALSO upload to YouTube as **unlisted** — HN preview embeds
   YouTube cleanly, MP4-from-domain works but is jankier.
5. Update README to reference whichever URL renders better
   (YouTube unlisted is usually the answer).

### What NOT to do

- **Don't add a logo splash card at the start.** Wastes 3 seconds the
  HN reader doesn't have.
- **Don't show the sign-in flow.** Already-signed-in dashboard is
  the start state. Sign-in is interesting to clinicians, not to HN
  readers.
- **Don't narrate the privacy story.** "No real names stored" is one
  line in the voiceover; longer is preachy.
- **Don't show pricing.** It's free during beta; pricing is post-launch.
- **Don't film yourself.** Solo-founder face-cams work for some
  founders; PTowl's reading is product-first.
- **Don't use a phone for the desktop portion.** PTowl on desktop
  IS the desktop product. Filming a phone screen as the whole demo
  undersells the keyboard advantage.

### A "B-version" if the script feels too rigid

If the above feels too produced, the **silent loop alternative** also
works:

- Just record the 5-keypress sequence + share + patient view
- No voiceover, no captions
- Set the README embed to autoplay+loop+muted
- Total runtime ~10 seconds

This is closer to Cal.com's landing-page demo style. It's less of a
"story" but it loops — visitors see it more than once if they linger.

Pick whichever feels less stressful to record. Both work.

### Definition of done

- File saved at `apps/web/public/screencast.mp4` (committed) AND/OR
  uploaded to YouTube unlisted with link in README
- Total length 10-30 seconds
- File size under 5 MB
- Plays cleanly in Chrome, Safari, and Firefox
- Visible in the README on github.com/Yami566/ptowl after the public
  repo flip

---

## Beta outreach — 5-channel playbook

**Goal:** First 10 active beta clinics actually using PTowl weekly.
Not signups — clinics that come back next week and the week after.

**Bias:** Personal channels first. Cold outreach second. Hacker News
last (it's a flash, not a flywheel).

### Unblock list (read this first)

Before sending anything:

1. The product is live, the demo loops on the landing, and
   `help@ptowl.com` delivers to your Gmail.
2. You have a 30-second screencast (or you're OK without one for the
   first batch — see "Screencast" section above).
3. You're prepared to answer **every reply within 4 hours**. The first
   10 clinics are won by responsiveness, not by polish.
4. You've got 30 minutes per week per clinic for the first month — to
   email follow-ups, fix small things they ask for, and notice when
   they stop using it.

If any of those isn't true, don't send the emails yet. Sending and
then ghosting is worse than not sending.

### Channel 1 — Personal network (warmest, highest hit rate)

**Who:** Anyone you know personally who is or knows a PT, OT, SLP,
chiro, mental-health therapist, or dental hygienist. College friend's
spouse. Your own former PT. Your dentist's hygienist.

**Goal:** ~5 introductions. From those, ~2 active beta clinics.

**Template — text/iMessage version (most personal, highest reply
rate):**

```
Hey [name] — random ask. I built a free
scheduling tool for [PT/OT/dental/etc.] clinics
and I'm trying to get like 5 real clinics to
beat on it for a month. Would [their PT/spouse/
friend] be open to a 15-min demo? Free forever
during beta, and I personally fix anything they
say is broken. https://ptowl.com
```

Send this 1-on-1, not as a group text. Personalize the bracketed
pieces. ~30 seconds per send.

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

### Channel 2 — Walk-in to local clinics (second-warmest)

**Who:** PT/OT/dental/chiro clinics within driving distance of where
you live. Especially small/independent ones, not chain locations.

**Goal:** Walk into 5 of them this week. Demo on a laptop. Leave a
business card.

**Script for the front desk (verbatim):**

> "Hi — quick question. Is the office manager or owner around? I'm
> not selling anything. I built a free tool for therapy clinics and
> I'm trying to get a few local ones to test it for me. Two-minute
> demo if they have time, or I can leave a card."

If owner is in: open laptop, demo the 5-keypress flow + the patient
magic link on your phone. ~3 minutes total. Hand over card with
help@ptowl.com.

If owner is out: leave a card with handwritten "free during beta —
built for clinics like yours, would love your feedback" on the back.

**Don't try to sign them up on the spot.** You're planting seeds.
Follow up by email in 3 days.

### Channel 3 — Reddit (cold but warm-ish)

After Show HN OR independently. Templates already in the
"Cross-post templates" section above for these subreddits:

- r/physicaltherapy
- r/dentistry (post in r/dentalhygiene if there's a more active sub
  for hygienists specifically)
- r/OccupationalTherapy
- r/slp
- r/Chiropractic
- r/therapists (mental-health)
- r/SoloPractice
- r/selfhosted (tech-adjacent angle)

**Cadence:** one post per subreddit per week max. Don't burn the
channel.

### Channel 4 — Facebook groups (slowest, can be highest yield)

PT clinic owners have active Facebook groups. SimplePractice grew
this way. Examples:

- "Physical Therapy Professionals" (~30k members)
- "New Grad Physical Therapist" (~50k members)
- "Cash-Based Practice for PTs" (smaller, higher engagement)
- "Chiropractic Office Managers"

**Don't post a launch announcement.** Lurk for a week, comment on
threads where someone complains about scheduling, drop PTowl as a
friendly aside ("Hey, I made something that might help — DM me if
you want a free beta account").

This is slower but the lead quality is _much_ higher. People who DM
you after seeing you helpful in a thread are 5x more likely to
convert than cold-form fills.

### Channel 5 — APTA / state-association angles

If you live near a state PTA chapter that meets monthly, ask if they
have "new tools" segments at meetings. Especially for student-PT
chapters — new grads are more likely to try something new.

This is a slower-burn play. Don't expect immediate clinics. But
these chapters become the channel that compounds at month 6+.

### What to NOT do

- **Don't email APTA HQ asking for an endorsement.** They'll redirect
  you 4 times, then ignore you. Big-org outreach when you have <10
  clinics is wasted time.
- **Don't run paid ads.** Conversion math doesn't work below 50
  active clinics. Save the money.
- **Don't list on AppSumo / Product Hunt / similar deal sites.**
  Brings the wrong audience (deal-seekers, not clinics). Hurts the
  brand.
- **Don't promise features you haven't built.** "We'll add X next
  week" is a debt you'll pay with interest. It's OK to say "not yet,
  what about a workaround?"
- **Don't follow up more than 2 times.** If they don't reply after 2
  emails, they're not interested. Move on.

### Tracking spreadsheet schema

A simple spreadsheet (Google Sheets, Notion, even a markdown table)
with:

| Date sent | Channel | Recipient | Replied? | Demo'd? | Active 7d? | Active 30d? | Notes |
| --------- | ------- | --------- | -------- | ------- | ---------- | ----------- | ----- |

After 50 outreach attempts, you'll see:

- Which channel converts best for you specifically
- What objection comes up most (use it to update the comment-defenses
  section above)
- Whether the product is solving a real problem (if no one comes back
  week 2, the product is broken)

### 90-day decision frame

**90 days of consistent outreach** is the trial period. If at day 90
you have:

- **10+ active clinics:** you've validated the product. Time to
  think about Phase 9 (auto-email, AI, monetization gating).
- **3-9 active clinics:** keep going. The product works for _some_
  slice of your audience. Find more like the ones who stuck.
- **0-2 active clinics:** the product or the audience is wrong.
  Don't push harder — re-examine. Are you reaching the right people?
  Is there a feature that would actually help (and is it possible to
  build under the no-new-code rule)?

You only need 10. That's it. You don't need to go viral. You don't
need HN to put you on the front page. **Ten clinics that come back
next week and the week after** is the entire game right now.

---

## Phase-8 success metric

**10 active beta clinics.**

A clinic is **active** if they:

- Generated at least 3 schedules in a 7-day window, AND
- One of those schedules was opened by a patient (the magic-link view
  shows in CF Web Analytics if it's enabled; otherwise checked via D1)

Not "they signed up". Not "they generated one schedule and bounced".
**They came back.**

### D1 query to compute it

Run this against the production D1 to see how many clinics are active
this week:

```sql
-- "Active" = >=3 schedules created in the last 7 days
-- AND >=1 patient view on any of those schedules.
WITH recent_schedules AS (
  SELECT
    s.clinic_id,
    s.id AS schedule_id,
    s.created_at,
    s.share_token
  FROM schedules s
  WHERE s.created_at >= datetime('now', '-7 days')
),
clinics_with_3plus AS (
  SELECT clinic_id
  FROM recent_schedules
  GROUP BY clinic_id
  HAVING COUNT(*) >= 3
),
clinics_with_patient_view AS (
  SELECT DISTINCT rs.clinic_id
  FROM recent_schedules rs
  JOIN patient_views pv ON pv.share_token = rs.share_token
  WHERE pv.viewed_at >= datetime('now', '-7 days')
)
SELECT COUNT(*) AS active_clinics
FROM clinics_with_3plus c3
WHERE c3.clinic_id IN (SELECT clinic_id FROM clinics_with_patient_view);
```

Run via Wrangler from `apps/api/`:

```bash
wrangler d1 execute ptowl-prod --remote --file=./scripts/active-clinics.sql
```

If the schema doesn't yet have a `patient_views` table, the
patient-view check falls back to "share_token has been resolved at
least once," which is logged in Workers Analytics. Use whichever
data source you have.

### Why this metric and not "signups"

Signups are a vanity number. A clinic that signs up, generates one
schedule on Tuesday, and never returns is a loss disguised as a win.
Three schedules in a week + at least one patient view is the
smallest signal that says: **a real provider used the tool for a
real patient, the patient saw it, and the provider trusted it
enough to do it again.** That's the loop the product needs to prove.

### When to celebrate

Hit 10 active clinics for two consecutive weeks → Phase 8 closed.
Move on to Phase 9: monetization gating, SMS reminders, multi-
provider clinics, AI-assisted drafting. Not before.

---

## Things to remember

- You built and shipped a real product as a solo founder.
- The repo is open-source under AGPL-3.0 (revealed at launch, not
  marketed before).
- HN goodwill is earned by responsiveness in the comment thread, not
  by the post copy.
- The first paying clinic is one comment thread or one walk-in away.
- Then close the laptop and eat dinner. The work continues tomorrow.
