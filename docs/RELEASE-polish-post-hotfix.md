# Release: post-hotfix polish

Branch: `polish/post-hotfix-cleanup` · 5 commits · target `main`

PR-create URL (paste branch name into the GitHub UI):
<https://github.com/Yami566/ptowl/pull/new/polish/post-hotfix-cleanup>

---

## PR description (paste this into GitHub)

> Comprehensive UX polish, dead-code cleanup, and security tightening on the
> post-FirebaseUI surface. Decisions captured during a page-by-page wireframe
> consultation; full plan in `~/.claude/plans/hey-welcome-back-can-nifty-treasure.md`.
>
> ### Commits
> 1. `chore(db): add migration 0016 to drop dead tables` — drops
>    oauth_accounts, password_reset_tokens, admin_totp,
>    admin_verification_codes, admin_audit_log, sessions. All from removed
>    admin console / patient portal / legacy auth. `IF EXISTS` so idempotent.
> 2. `chore: remove dead code from removed admin/patient-portal/customize-hub`
>    — deletes LoginPage, CustomizePage, OnboardingChecklist, the `/customize`
>    route + Command Palette entry, and the `/admin` reference in
>    `_middleware.ts`. Updates security tests that asserted on the removed files.
> 3. `refactor(web): post-hotfix UX polish across all pages` — every page
>    touched. Native `<details>` Profile dropdown standardizes navigation;
>    Landing gets the new "Stop scheduling. Start treating." headline +
>    "Free beta · Powered by Claude" badge + footer additions; Dashboard gets
>    28 day-of-week-rotated greeting variants + Active/Upcoming/Past status
>    chips on saved schedules; Schedule promotes the sports alias as the H2
>    and groups Share + Add-to-Calendar in a `<details>` dropdown; Profile
>    adds Logo URL field + Beta-access plan label + Account section with
>    deletion mailto + bottom Sign-out; 404 + ErrorBoundary lifted with owl
>    branding + multi-CTA recovery; About + Privacy + Terms + Security
>    rewritten for honesty (we do collect initials and an optional encrypted
>    reminder email — and we are explicitly NOT HIPAA-compliant).
> 4. `docs: align README + brainstorm with locked product positioning` —
>    drops the never-wired Tawk.to row, collapses the split admin/patient
>    auth rows into a single FirebaseUI line, locks 5 keypresses + the
>    medical+dental positioning + free beta in brainstorm.md.
> 5. `chore(security): drop broken Pages edge middleware` — removes
>    `apps/web/functions/_middleware.ts`, which verified an HS256 cookie no
>    API route sets post-FirebaseUI. `<ClinicRoute>` (client) + Firebase ID
>    token verification (API) are the surviving auth layers.
>
> ### Action items after merge
> - Remove the now-unused `JWT_SECRET` from Cloudflare Pages env (Workers &
>   Pages → ptowl → Settings → Environment Variables).
> - Capture a real printed-schedule screenshot and replace the FullCalendar
>   demo on the landing page (placeholder note left in the plan file).
>
> ### Deferred to a follow-up PR (couldn't run pnpm install locally)
> - Sentry SDK (`@sentry/react` + `@sentry/cloudflare`) for prod error tracking
> - Library-based confirm modal (`react-confirm-alert`) replacing native
>   `confirm()` in TemplateEditor + Dashboard preset delete
> - `match-sorter` search filter on the Saved Schedules list
> - `react-konami-code` to revive the alien easter egg as a Konami sequence
>
> CI runs typecheck, lint, tests, and build on every commit. The deploy
> workflow is gated on push to `main` only — merge this PR and prod deploys
> automatically (`deploy.yml` runs D1 migration 0016 against `ptowl-db` then
> pushes API + Pages).

---

## Post-merge production smoke-test checklist

Run through these after the deploy workflow turns green. Most should take
< 30 seconds each.

### 1. Anonymous flow

- [ ] Visit <https://ptowl.com/> in a fresh window.
- [ ] H1 reads "Stop scheduling. Start treating."
- [ ] Below the auth card, badge reads "Free beta · Powered by Claude".
- [ ] Footer shows About / Privacy / Terms / Security / **Status** /
      **Help**, plus "Powered by Claude · Free during beta".
- [ ] Footer "Help" opens `mailto:help@ptowl.com`.
- [ ] FirebaseUI shows your enabled providers (Google + others).
- [ ] Click "About" — page loads, headline says "Built to make healthcare
      more simple and fun.", how-it-works H2 says "5 keypresses. Sometimes
      4 if you're fast.", Privacy by Design card mentions "Real names never
      enter our system."
- [ ] Click "Privacy" — Last updated reads **April 29, 2026**, sign-in line
      says "Google, Apple, email magic link, or SMS", section 1 itemizes
      what you collect (provider phone/email, clinic info, initials,
      optional encrypted email), section 1a explains the deletion mailto
      with the 30-day SLA.
- [ ] Click "Terms" / "Security" — same updated date + same auth language.
- [ ] Visit `https://ptowl.com/nope` (anything that 404s) — owl logo, 404
      copy with the 270° vision joke, two CTAs `[Back to Dashboard]` +
      `[Home]`. Hover the owl — wrapper has a transition (subtle).

### 2. Sign-in flow

- [ ] Sign in via FirebaseUI. Land on `/dashboard`.

### 3. Dashboard

- [ ] Greeting reads as expected for the current hour bucket (morning /
      afternoon / evening / late). Reload twice — same line both times
      (deterministic by day-of-week).
- [ ] No OnboardingChecklist anywhere.
- [ ] No 30-day activity heatmap, no "N patients", no "N-day streak"
      badges.
- [ ] Header has only Owl + **Profile ▾** dropdown.
- [ ] Open Profile ▾ — items: Profile & Clinic Info / Edit Templates /
      Print Settings / **Sign out** (red, separated). All four navigate
      correctly.
- [ ] Quick Presets row works. Press `1` → wizard opens. Press `2`–`6`
      → preset modal opens (when templates exist).
- [ ] Saved Schedules cards each show one of three status chips:
      `ACTIVE` (green), `UPCOMING` (orange), or `PAST` (gray).
- [ ] If no schedules yet: empty state says "five keypresses".

### 4. Schedule view

- [ ] Open any saved schedule. H2 leads with the sports alias; small mono
      `(JS)` initials caption sits beside it.
- [ ] Header buttons: `[Calendar/Table View]` `[Print]` `[Share ▾]`
      `[Back]` `[Profile ▾]`. **No Logout button.**
- [ ] Click `Share ▾` → menu has `Send link` + `Add to calendar`.
- [ ] Stats bar shows Completed / Today / Remaining / Next — **no Total**.

### 5. Customize / Templates / Print Settings

- [ ] `https://ptowl.com/customize` → 404 (the hub is gone).
- [ ] `https://ptowl.com/customize/templates` → editor loads. Subtitle
      says "Customize your schedule templates. Changes only affect new
      schedules." (no "6").
- [ ] If you delete all templates, empty state shows owl + "You've removed
      all templates." with a `mailto:help@ptowl.com` link.
- [ ] `https://ptowl.com/customize/print` → no Save button at the bottom;
      autosave note visible; `[Reset to Defaults]` and `[Print Preview]`
      remain. Toggle a checkbox, navigate away, come back — setting
      persisted.

### 6. Profile

- [ ] `Plan: Beta access` (replaces Tier / Free).
- [ ] `Logo URL` input present. Paste any image URL — small preview
      appears below.
- [ ] Save → toast "Profile saved!".
- [ ] At the bottom: `Account` card with `mailto:help@ptowl.com?subject=Delete%20my%20PTowl%20account`
      link and a `Sign out` button.
- [ ] Header has only `Dashboard` back button (no Logout).

### 7. Force an error

- [ ] Open devtools, throw inside any component (e.g. paste `throw new Error('test')`
      via React DevTools, or break a network request that's required to
      render).
- [ ] ErrorBoundary shows owl emoji, "The owl flew off course. Something
      broke.", and three CTAs: `[Refresh page]` `[Home]` `[Send help
      request]`. Click Send help request — `mailto:` opens with the
      captured error message in the body.

### 8. Mobile (375px viewport)

- [ ] Headers don't overflow. Profile ▾ + Share ▾ open below the button,
      not off-screen.
- [ ] Quick Presets grid scrolls horizontally on narrow widths.

### 9. Cloudflare side cleanup (dashboard, no code)

- [ ] **Workers & Pages → ptowl → Settings → Environment Variables**: remove
      `JWT_SECRET` from production AND preview (no longer used by anything).
- [ ] **Workers & Pages → ptowl → Analytics & Logs → Web Analytics**: confirm
      "Enabled" — beacon auto-injects on every Pages request (privacy-first,
      no script tag, no GDPR banner needed).
- [ ] Optional: **Workers & Pages → ptowl-api → Logs → Logpush** — create
      a Logpush job pointing at an R2 bucket if you want long-tail Worker
      logs for debugging. Free tier ample for this volume.

### 10. D1 sanity

- [ ] After the deploy workflow finishes, `wrangler d1 execute ptowl-db --remote
      --command "SELECT name FROM sqlite_master WHERE type='table';"` should
      show no `oauth_accounts`, `password_reset_tokens`, `admin_totp`,
      `admin_verification_codes`, `admin_audit_log`, or `sessions` tables.

---

## Follow-up PR plan: Sentry + confirm modal + search filter

Once you have Node + pnpm working locally:

1. `pnpm add @sentry/react @sentry/cloudflare match-sorter react-confirm-alert`
2. Wire `Sentry.init({...})` in `apps/web/src/main.tsx` near the top, and the
   Cloudflare integration in `apps/api/src/index.ts`. Use two new secrets:
   `SENTRY_DSN_WEB` (Pages env) and `SENTRY_DSN_API` (Workers secret).
3. In `apps/web/src/pages/TemplateEditorPage.tsx` and the preset-delete
   handler in `apps/web/src/pages/DashboardPage.tsx`, replace
   `confirm(...)` with `confirmAlert({ title, message, buttons: [...] })`
   from `react-confirm-alert`.
4. In `apps/web/src/pages/DashboardPage.tsx`, add an `<input>` above the
   Saved Schedules list and pipe `schedules` through `matchSorter` from
   `match-sorter` keyed on `patient_alias` + `patient_initials`.
5. Optional: add `react-konami-code` and revive the alien easter egg on
   the Landing page with a Konami sequence trigger.
6. Commit per feature, push, open follow-up PR.

The plan file at `~/.claude/plans/hey-welcome-back-can-nifty-treasure.md`
has the exact rationale and decisions for each.
