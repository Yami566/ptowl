# Show HN draft — PTowl

Working draft of the Hacker News submission. Copy is what gets posted
to news.ycombinator.com/submit. Companion notes describe the
visual/screencast assets we still need to assemble.

Last updated: 2026-05-04. Will be revised right before launch day.

---

## Title (80 char max on HN)

> Show HN: PTowl – Open-source PT/dental schedule generator in 5 keypresses

If "PT" reads as ambiguous (it sometimes does on HN), alt title:

> Show HN: PTowl – Open-source patient schedule generator for clinics

---

## URL

`https://ptowl.com`

---

## Body (HN supports plain text + bare URLs; no markdown)

```text
Hi HN — I'm a solo dev who got tired of watching PTs and dentists waste 30 minutes a day building patient schedules in Word. So I made PTowl: 5 keypresses, print-ready, sports-alias privacy failsafe instead of real names. Free during beta.

What it does

You're a PT or dentist. Patient walks in. They need a 6-week recurring schedule, 3x/week, mornings. Today you open Word, hand-type a table, save as PDF, print, hand it to them. ~30 minutes if it's busy.

With PTowl, you press: 2-J-S-Enter (preset 2, patient initials JS, confirm). Out comes a clean print-ready schedule with the patient's sports alias ("Brady" instead of "JS") on top, the 18 appointment dates underneath, ICS file for their phone calendar, and a magic-link URL you can text them so they see it on their phone without an app.

The 5-keypress promise is the whole pitch. I rebuilt it from scratch maybe 6 times to actually keep that promise.

Why open source

I built this for one PT clinic and realized every clinic in the US would benefit. Then realized every dentist would too. Then realized I'm a solo dev who can't market to 100k healthcare practices.

So: AGPL-3.0. Anyone can fork, run, modify. Anyone running it as a SaaS has to share their changes. Self-hosters welcome. The full Cloudflare deployment recipe is in the README — Workers + D1 + R2 + Clerk auth, all on free tiers up to ~10k users.

Stack

- React 19 + Vite (frontend, ~660KB bundle, no FirebaseUI bloat)
- Cloudflare Workers + Hono (API)
- Cloudflare D1 (SQLite at the edge)
- Cloudflare R2 (clinic logos)
- Clerk (auth, drop-in widget)
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
- The sports-alias mapping. Some are obvious (Brady, Pelé, Serena). Some are deeply random (KX → "Kobe Bryant" for Kobe→Bryant, kind of). Open to PRs that improve the mapping.
- Whether dental clinics actually want this. I built for PT first; dentist friends keep asking when they can use it.

Repo: https://github.com/Yami566/ptowl
Live: https://ptowl.com
```

---

## Pre-launch checklist (the day-of)

In rough order:

- [ ] Replace `https://github.com/Yami566/ptowl` link above with the
      actual public-org URL if we move the repo to an org.
- [ ] Update HN body's stack list if anything changed in the last 24h.
- [ ] Verify the live demo at ptowl.com loads cleanly in:
  - Incognito Chrome desktop
  - Incognito Safari iOS
  - Incognito Firefox desktop
- [ ] Verify a fresh Clerk signup works (production instance, not dev).
- [ ] Verify the patient-view URL (`/p/<token>`) renders on phone.
- [ ] Confirm all docs link correctly from README.
- [ ] Generate a 30-second screencast of the 5-keypress flow + patient
      magic link. Embed in README.
- [ ] Take 3 screenshots:
  1. Dashboard with the keyboard shortcut hint visible
  2. A printed schedule (the "what your patients get" hero)
  3. The patient-facing `/p/<token>` page on a phone-shaped frame

## Post-submission ops

- Monitor https://news.ycombinator.com/show for first hour. New
  posts with traction get visibility; respond to comments fast.
- Post the same/abbreviated story to:
  - r/physicaltherapy (separate post, ~2 hours after HN to not look
    like a campaign)
  - r/dentistry (same delay)
  - r/selfhosted (open-source angle)
  - r/cloudflare (technical angle, stack matters there)
- Share in the founder's network (DMs, not mass posts).
- Don't @ anyone famous on social media; let it find an audience
  organically. Hard pitches feel desperate on HN.

## Common HN comments to prep for

These tend to come up on Show HN posts. Have honest answers ready,
don't be defensive. Each answer is one HN comment — short enough to
type fast in the launch-day rush.

- **"Why isn't this HIPAA compliant?"** — On purpose. Real HIPAA
  compliance is a different product (2-3x the build cost, ongoing
  audit fees, BAAs with every vendor). PTowl is for the clinics that
  print schedules on paper anyway; the privacy floor is "real names
  never enter our servers." Sports aliases enforce that floor in
  code. We say this explicitly on the security page rather than
  hand-waving.

- **"Why Cloudflare specifically?"** — Free tier carries the whole
  stack through ~10K MAU. D1 + Workers + R2 + Clerk means one-vendor
  hosting for database, runtime, storage, auth. Reduces the "weekend
  project" self-host cost to literally $0. Also: the AGPL repo has
  a one-click Deploy-to-Cloudflare button — anyone can fork and run
  their own instance in 15 minutes.

- **"Why Clerk over Auth0/Supabase/build-it-yourself?"** — Drop-in
  widget meant we didn't have to build sign-in UI. Free tier 10K MAU.
  We migrated from Firebase Auth in May 2026; Clerk's dashboard,
  webhook tooling, and JWT verification path were a clear win
  (~250 lines of glue code deleted). The tradeoff is a vendor
  dependency, but auth is the LAST thing a solo founder should hand-
  roll.

- **"Why AGPL not MIT?"** — To discourage drive-by SaaS rip-offs
  while keeping the code open for community contribution + self-host
  use. Anyone running modified PTowl as a network service must share
  their changes. Permissive enough for individual contributors,
  protective enough that "PTowl Pro by Competitors-Inc.com" can't
  legally exist as closed-source. If AGPL is incompatible with your
  situation, we'll do a commercial license — open an issue.

- **"Where's the AI / ML?"** — Not yet. Cloudflare AI binding is
  wired up in wrangler.jsonc but I haven't shipped the prompt-to-
  schedule feature. Top of roadmap; what AI feature would actually
  help a PT vs. just being demo theater is the question I'd love
  answers to.

- **"Have any clinics actually used this?"** — Less than 10 active
  beta clinics today. Pre-validated the "5 keypresses to print" UX
  with one PT in person; everything else is hypothesis. Goal for
  the next 30 days: get to 10 active clinics. Will update launch
  numbers honestly.

- **"Why don't I just use Calendly / Cal.com?"** — Calendly is
  patient-initiated booking — patient picks a slot from a public URL.
  PTowl is provider-initiated bulk-recurring scheduling — the PT
  generates a 12-week schedule for a specific patient based on a
  treatment plan. Different product entirely. We'd actually pair
  with Calendly if a clinic uses it for new-patient intake.

- **"Why text-based 'sports aliases' for de-identification? Just
  encrypt the names."** — Encryption protects against data exfil;
  it doesn't protect against your front-desk reading a printed
  schedule out loud. The alias is a SOCIAL privacy mechanism: the
  printed schedule says "Brady" not "John Smith", so when it's left
  on a clipboard, in a fax, or visible during a hallway conversation,
  the patient's identity isn't exposed by default. It's
  honest-to-paper privacy, which is what clinics actually need.

- **"What happens at scale?"** — D1 free tier covers ~5GB and
  ~5M reads/day. We can handle thousands of clinics on free
  Cloudflare. The only thing that scales linearly with usage is
  outbound email (Phase 9 — not shipped yet). At 50 active clinics,
  we wire LemonSqueezy + MailChannels.

- **"How do I trust your privacy claims when I can't audit them?"**
  — You can. Repo is on GitHub under AGPL-3.0:
  github.com/Yami566/ptowl. The auth verification, schedule writes,
  and patient-data handling are all in apps/api/src/. Privacy
  policy at ptowl.com/privacy is also in source. No "trust me bro"
  surface — the "no real names" claim is a checkbox you can verify
  by grepping for `patient_name` (you won't find it).

- **"Who are you?"** — Solo founder, technical background, building
  this because PT/dental friends complained about how slow scheduling
  was. Reachable at help@ptowl.com (mailto routes directly to my
  inbox during beta). I'll be in this thread for the next 6 hours.

## Cross-post templates (paste-ready)

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
Just shipped Show HN: PTowl — open-source clinic scheduling tool.

5 keypresses to a printed patient schedule.
Privacy by sports-alias (real names never stored).
Built on Cloudflare. Free during beta.

https://ptowl.com
https://github.com/Yami566/ptowl
```

## Stretch — videos / GIFs

Day-of ideal: a 30-second GIF embedded in the README that shows
keypresses 1→5 producing a printed schedule. ~2-3 MB after
optimization. Captured via OBS or similar.

If we don't get to it, screenshot triplet from the checklist above
is enough — HN doesn't punish text-only Show HNs that link to a
working demo.
