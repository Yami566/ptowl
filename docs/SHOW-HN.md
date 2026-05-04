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
don't be defensive:

- **"Why isn't this HIPAA compliant?"** — On purpose. Real HIPAA
  compliance is a different product (2-3x the build cost, ongoing
  audit fees). PTowl is for the clinics that print schedules on
  paper anyway; the privacy floor is "real names never enter our
  servers." Sports aliases enforce that floor in code.

- **"Why Cloudflare specifically?"** — Free tier carries us through
  10K MAU. D1 + Workers + R2 means one-vendor hosting for the
  database, runtime, and storage. Reduces the "weekend project" cost
  to literally $0 for a self-hoster.

- **"Why Clerk over Auth0/Supabase?"** — Drop-in widget that didn't
  require us to build sign-in UI. Free tier 10K MAU. Tested it
  against Firebase Auth (which we used originally) — Clerk's
  developer experience and dashboard UX won.

- **"Why AGPL not MIT?"** — To discourage drive-by SaaS rip-offs
  while keeping the code open for community contribution + self-host
  use. Anyone running ptowl-derived code as a service must share
  their changes. Permissive enough for individual contributors,
  protective enough that "PTowl Pro by competitors-inc.com" can't
  legally exist as closed-source.

- **"Where's the AI / ML?"** — Not yet. Cloudflare AI binding is
  wired up but I haven't shipped the prompt-to-schedule feature.
  Top-of-roadmap; feedback on what providers actually want from AI
  here would help.

- **"Have any clinics actually used this?"** — Less than 10
  active beta clinics today. Pre-validated the "5 keypresses to
  print" UX with one PT in person; everything else is hypothesis.
  Will update launch numbers in 30 days.

## Stretch — videos / GIFs

Day-of ideal: a 30-second GIF embedded in the README that shows
keypresses 1→5 producing a printed schedule. ~2-3 MB after
optimization. Captured via OBS or similar.

If we don't get to it, screenshot triplet from the checklist above
is enough — HN doesn't punish text-only Show HNs that link to a
working demo.
