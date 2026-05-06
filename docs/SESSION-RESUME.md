# PTowl — Session Resume (one-file context for picking back up)

**Last updated:** 2026-05-06 ~01:35 AM (right before the PC restart)

This is the single-file context dump. Read this first when you sit
back down — it's the consolidated state of where PTowl is, what's
live, what's locked, and what's left.

---

## TL;DR

PTowl is **live in production** on `ptowl.com` with the production
Clerk instance on `clerk.ptowl.com`. There are **0 launch blockers**
remaining. Everything code-side is done. Five user-side mechanical
steps remain (none of them are coding work — they're dashboard clicks,
a screencast recording, and outreach emails).

The product is ready to flip the Phase 8 "Show HN" switch whenever
you want. Pick a day per `docs/LAUNCH-DAY.md` and pull the trigger.

---

## What's live in production (verified by curl)

| Surface                                                                                | Status                                                                           |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Live frontend bundle                                                                   | rotated through ~15 hashes today; latest deploy is on `main` at commit `71eaa5c` |
| All public routes (`/`, `/about`, `/privacy`, `/terms`, `/security`, `/api/v1/health`) | HTTP 200                                                                         |
| API health                                                                             | DB connected, ~23ms response                                                     |
| **Clerk production** instance                                                          | Active on **`clerk.ptowl.com`** (DNS verified, SSL issued)                       |
| Clerk widget owl voice                                                                 | "Welcome back, Doctor Hoo." (sign-in) + "Pleased to meet you, Doctor." (sign-up) |
| Patient view                                                                           | Owl-themed alias subtitle live on `/p/:token`                                    |
| TemplateEditor                                                                         | "The roost is empty" empty state live                                            |
| 404 page                                                                               | "Hoo took it?" copy live                                                         |
| ErrorBoundary                                                                          | "Hoo's seen worse" copy live                                                     |
| Dashboard greetings                                                                    | 28 owl-leaning variants across 4 hour buckets                                    |
| Sticker SVG                                                                            | `apps/web/public/sticker-trust-the-owl.svg` shipped                              |
| Edge WAF                                                                               | active — SQLi probes return HTTP 403                                             |
| CSP                                                                                    | allowlists `clerk.ptowl.com` + `accounts.ptowl.com` in 6 directives              |

---

## Master prompt (locked — do not relitigate)

> PTowl is the **Craigslist of clinic scheduling**.
>
> Speed (5 keypresses) + privacy (sports aliases, no PHI stored) +
> price (free during beta, $9/$29 paid later).
>
> Deliberately not pretty — fast, honest, self-serve. Every product
> decision answers: **does this help a clinician finish their schedule
> 10 seconds faster?**

Source of truth: `docs/NORTH-STAR.md` (and `docs/INDEX.md` for nav).

---

## Tonight's wins (May 5–6)

1. **Clerk dev → production migration complete.** Pushed all 5 DNS
   records, flipped the `clerk` row from Proxied to DNS-only, SSL
   issued, baked-in publishable key swapped to `pk_live_Y2xlcmsucHRvd2wuY29tJA`,
   `CLERK_FRONTEND_API_URL` swapped to `https://clerk.ptowl.com`.
2. **Two production bugs fixed** that would have blocked sign-in:
   - CSP didn't allowlist `clerk.ptowl.com` (only `*.clerk.accounts.dev`
     - `*.clerk.com`) → SignIn widget rendered empty. Fix: commit
       `b4ba943` added 6 CSP directives for the custom domain.
   - `AuthWidget` had a `Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)`
     check that returned false on CF Pages where env var was unset →
     "Sign-in is being upgraded" placeholder masked the real widget.
     Fix: commit `6818bf7` removed the check; `main.tsx` baked-in
     fallback is enough.
3. **Heavy owl whimsy** added across the authenticated surface:
   Dashboard greetings (28 variants), Patient view, TemplateEditor
   empty state, 404, ErrorBoundary, Clerk widget welcome strings.
4. **About page expanded** with: pricing preview, "How PTowl compares"
   table (vs Calendly / Cal.com / Jane App / WebPT), what's-coming
   roadmap, founder note, clinician FAQ.
5. **Landing animated 5-keypress demo** + "No credit card, ever during
   beta" trust subtext.
6. **Doc sprawl tamed** with `docs/INDEX.md` navigation hub grouping
   25+ docs by purpose (Strategy / Launch / Operations / Security /
   Reference / History).
7. **Vanity email routing punted** — `mailto:help@ptowl.com` now
   points directly at `nurelimusabay@gmail.com` (commit `268a548`).
   Fewer moving parts, removes a launch blocker.

---

## What's left for you (5 mechanical steps, all dashboard / human work)

None of these are coding tasks. They're all things only you can do.

1. **Run `cf-bootstrap.yml` workflow** once via GitHub Actions UI
   → "Run workflow" → main. ~3 minutes. This turns on Bot Fight Mode,
   Rate Limiting on `/api/*`, Worker Errors notifications, and Web
   Analytics in one shot. (WAF is already on — that's why SQLi
   probes return 403.)

2. **Custom Google OAuth client (Phase C)** — _skipped tonight,
   cosmetic only_. Today the OAuth consent screen reads "Continue
   to Clerk Inc." instead of "Continue to PTowl". Defer until you
   have the energy to navigate Google Cloud Console.

3. **Record 30-second screencast** per `docs/SCREENCAST-SCRIPT.md`.
   Embed in README + Show HN post. The script is pre-written —
   just hit record and follow it.

4. **Pick a launch day** per `docs/LAUNCH-DAY.md`. Tuesday/Wednesday
   morning ET is the recommended window.

5. **Outreach to first 10 clinics** per `docs/BETA-OUTREACH.md`.
   Templates pre-written; you just need to find 10 clinic email
   addresses (or use the `help@ptowl.com` reply chain after Show HN).

---

## Locked decisions (do NOT relitigate next session)

- **5 keypresses** is the brand promise. Not 3, not "around 5". Five.
- **AGPL-3.0** open source under `github.com/Yami566/ptowl` (still private
  repo until launch day; flip public on launch).
- **Audience: recurring-appointment-series family** — PT, OT, SLP,
  chiropractic, mental-health/therapy, dental hygiene, addiction
  recovery. **NOT primary care.** The product doesn't fit one-off
  visits.
- **Free during beta**, monetization gated on **50 active clinics**.
- **First 10 active beta clinics** is the Phase-8 success metric.
- **No-new-code rule** is firm — but RELAXED for owl-voice / UI
  furnishing (you explicitly approved). For functional changes
  (new endpoints, new components with logic), the rule still holds.
- **Voice level**: heavy owl whimsy at brand moments (sign-in, empty
  states, 404, errors). Restrained in functional UI (schedule editor,
  profile, print settings) where work-getting-done flow matters more.

---

## Production stack (current as of 2026-05-06)

- **Frontend:** React 19 + Vite + React Router 7, hosted on Cloudflare
  Workers Static Assets. Auto-deploys via CF Pages git integration on
  push to main (~60s).
- **API:** Hono on Cloudflare Workers. Deploys via
  `.github/workflows/deploy.yml` on push to main (~3-5 min).
- **DB:** D1 (SQLite at edge). Migrations in
  `apps/api/src/migrations/*.sql`. PITR 30 days.
- **Storage:** R2 for clinic logos.
- **Auth:** **Clerk** on `clerk.ptowl.com` (production custom domain).
  Publishable key baked in `apps/web/src/main.tsx` line 23 as
  `pk_live_Y2xlcmsucHRvd2wuY29tJA`. JWKS verified server-side via
  `jose` library.
- **Email (outbound):** still TBD (Phase 9). Today the patient
  magic-link must be manually shared by the provider — Show HN copy
  is honest about this.
- **Calendar feeds:** `ical-generator` + `rrule`.
- **Edge security:** WAF active (free Managed Rules); Bot Fight,
  Rate Limiting, Web Analytics pending the cf-bootstrap run.

---

## Common gotchas (avoid re-discovering — these all bit us tonight)

1. **Custom Clerk domain → CSP must allowlist `clerk.ptowl.com` +
   `accounts.ptowl.com`** in script-src/style-src/font-src/img-src/
   connect-src/frame-src. The default Clerk SDK CSP entries
   (`*.clerk.accounts.dev`, `*.clerk.com`) do NOT match a custom
   domain. (Bug fixed: commit `b4ba943`.)

2. **AuthWidget had a `VITE_CLERK_PUBLISHABLE_KEY` Boolean check**
   that returned false on CF Pages where the env var was unset. This
   caused a "Sign-in is being upgraded" placeholder to render
   instead of the Clerk SignIn widget. Removed entirely; `main.tsx`'s
   baked-in fallback is sufficient. (Bug fixed: commit `6818bf7`.)

3. **CF DNS auto-proxies (orange cloud) the `clerk` CNAME row**
   when the target is a Cloudflare-hosted host (e.g.,
   `frontend-api.clerk.services`). Must be manually toggled to
   DNS-only (gray cloud) for Clerk's verifier to see the raw target.

4. **The `CLOUDFLARE_API_TOKEN` GitHub secret lacks Zone:DNS:Edit
   scope** on ptowl.com. Only Workers + D1 scopes. cf-bootstrap.yml's
   DNS step silently fails as a result. To fully automate future
   DNS changes, add Zone:DNS:Edit to that token.

5. **commitlint rejects multi-type prefixes** like `docs+chore:`.
   Use single types only (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`,
   `test:`, `style:`).

6. **Pushing to main needs explicit "push to main" phrasing** from
   the user — vague approvals like "whatever you'd like" don't trigger
   the rail.

---

## How to resume next session

When you sit back down at the PC:

1. Open this file (`docs/SESSION-RESUME.md`). You're already doing that.
2. Read `docs/INDEX.md` for the doc-tree map if you want broader context.
3. Read `docs/PRODUCTION-GAP-ANALYSIS.md` to confirm the 0-launch-blocker
   state is still true.
4. If you want to ship the Show HN, follow `docs/LAUNCH-DAY.md`.
5. If you want to keep building features, the no-new-code rule is
   negotiable for things you sign off on — open `docs/PRD.md` for the
   feature backlog.

**Important:** if I (Claude) come back fresh next session, my
auto-memory at
`C:\Users\nurel\.claude\projects\c--Users-nurel-OneDrive-Desktop-ptowl-ptowl\memory\project_ptowl.md`
also has this state captured. So I'll pick up smoothly even without
this file. This file is for _you_ to skim quickly — the memory is
for me.

---

## Contact / brand identity (for reference)

- **Email:** `help@ptowl.com` → `nurelimusabay@gmail.com`
- **Phone:** 703-400-9900 (intentionally public — it's the founder's
  own number)
- **Repo:** `github.com/Yami566/ptowl`, AGPL-3.0, currently private
- **Domain:** `ptowl.com` (Cloudflare zone)
- **Auth:** `clerk.ptowl.com`

---

That's the whole picture. Pleasure working with you tonight, captain. 🦉
