# PTOwl End-to-End Tests

> Real-browser tests that drive headless Chromium against live ptowl.com (or
> an arbitrary URL via `PLAYWRIGHT_BASE_URL`). Catches regressions that
> unit tests + HTTP smoke checks can't see: React hydration failures,
> route-guard misfires, A11y attribute regressions, JS errors at page load.
>
> Source: [scripts/e2e-live.mjs](../scripts/e2e-live.mjs)

---

## How to run

```bash
# One-time: install Chromium for Playwright
npx playwright install chromium

# Run against live production
pnpm test:e2e

# Run against a local dev server
PLAYWRIGHT_BASE_URL=http://localhost:5173 pnpm test:e2e
```

Exits **0** when every test passes, **1** otherwise. Output is human-readable; runs in ~30-60 seconds against production.

## What it tests

Each route gets a battery of checks:

1. HTTP status 200
2. React tree mounted (`#root` has children after navigation settles)
3. Page-specific content markers (h1, button labels, "another device" copy, etc.)
4. A11y baseline (the `<main id="main-content">` landmark exists for skip-to-main)
5. Zero uncaught JS errors during load (with known-CSP-noise filter)

| Route                                          | Specific assertions                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `/`                                            | PTOwl wordmark visible; at least one auth CTA                        |
| `/about`                                       | h1 visible; ≥3 feature cards (h3s)                                   |
| `/privacy`, `/terms`, `/security`              | h1 visible                                                           |
| `/accounts/signin`                             | `main#main-content` landmark; "Sign in directly" fallback link       |
| `/accounts/signup`                             | `main#main-content` landmark; "Sign up directly" fallback link       |
| `/awaiting-approval`                           | "Almost there" copy; Sign out button; main landmark                  |
| `/admin/decide?token=garbage&decision=approve` | Error state renders; "Back to PTOwl" link                            |
| `/displaced`                                   | "another device" copy; "Sign in here again" CTA; "Wasn't you" escape |
| `/p/<fake-token>`                              | "Schedule not found" error renders                                   |
| `/this-route-doesnt-exist`                     | NotFoundPage h1                                                      |

## How this suite was born

Surfaced on 2026-05-16 during an end-to-end testing pass. The HTTP-level
smoke checks ([smoke-clerk-urls.yml](../.github/workflows/smoke-clerk-urls.yml) +
[smoke-monthly-health.yml](../.github/workflows/smoke-monthly-health.yml))
were green, but real-browser testing surfaced four genuine bugs:

| #   | Severity       | Bug                                                                                                                                                                                                                                                                                                              | Fix                                                                                                                |
| --- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | High           | AuthContext aggressively redirected **all** unsigned users away from non-public paths. This made `/accounts/signin`, `/accounts/signup`, and the 404 catch-all unreachable for unsigned users. The fallback link from PR #66 and the main-content landmark from PR #69 were effectively dead on the auth routes. | Removed the blanket redirect; `ClinicRoute` + `NotFoundPage` handle their own cases.                               |
| 2   | Medium         | CSP `font-src` didn't allow `data:` URIs, so Clerk's base64-inlined icon font was blocked on every page. Icons fell back to default fonts.                                                                                                                                                                       | Added `data:` to `font-src` in `apps/web/public/_headers`.                                                         |
| 3   | Low (accepted) | Clerk + Cloudflare bot-management both inject inline scripts with unique-per-request content. CSP `script-src` can't statically allowlist these — static hashes change per request, nonce-based CSP would require code changes throughout.                                                                       | Filtered as known noise in the e2e test. The blocked scripts are telemetry-only; core functionality is unaffected. |
| 4   | Low            | The 404 NotFoundPage never rendered for unsigned users because of bug #1.                                                                                                                                                                                                                                        | Fixed by bug #1's fix.                                                                                             |

The lesson: **HTTP-level testing is insufficient for SPAs**. Anything React-rendered (skip-to-main links, post-redirect routes, hydration-dependent UI) is invisible to curl. Real-browser testing is necessary.

## Known limitations

### CSP inline-script noise

Clerk and Cloudflare's bot management both inject inline scripts with unique-per-request content. Our CSP blocks these (rightly — strict CSP is a security feature). The browser console shows `Refused to execute inline script` errors. **This is filtered in the e2e test** because:

1. The blocked scripts are telemetry / fingerprinting, not core functionality
2. Allowing them requires either `'unsafe-inline'` (significant CSP relaxation) or nonce-based CSP (substantial code change)
3. Clerk's auth flows work correctly despite the CSP rejection

Revisit when:

- Telemetry data becomes valuable (then add nonce-based CSP)
- Or when Clerk's SDK adopts a static-hash strategy for its inline scripts

### Signed-in flows — now covered by `pnpm test:e2e:auth`

Shipped 2026-05-16 in response to the founder reporting that no end-to-end signin success had been verified. Source: [scripts/e2e-auth.mjs](../scripts/e2e-auth.mjs).

How it works:

1. Creates a throwaway test user via Clerk Backend API (`POST /v1/users`)
2. Mints a one-shot sign-in token (`POST /v1/sign_in_tokens`)
3. Drives the browser to `/?__clerk_ticket=<token>` — Clerk's SDK auto-consumes it
4. Asserts the user lands on `/dashboard` (or `/awaiting-approval` if the provision flip ships)
5. Verifies `<UserButton>`, preset templates carousel, and `main#main-content` landmark
6. Cleans up the test user via `DELETE /v1/users/{id}`

**Cross-browser:** runs against Chromium, Firefox, and WebKit (Safari engine) when `BROWSERS=chromium,firefox,webkit`. Surfaces Safari-specific regressions that caused the original blank-page outage.

**Required env:** `CLERK_SECRET_KEY` — same sk*live*... key already used by `sync-clerk-paths.mjs` + `deploy.yml`.

**CI:** [.github/workflows/e2e-auth.yml](../.github/workflows/e2e-auth.yml) runs on every push to main + pull_request, using the GH Actions secret of the same name. When the secret isn't set (forks), the script gracefully exits 77 without failing the workflow.

```bash
# Locally (requires CLERK_SECRET_KEY exported)
pnpm test:e2e:auth

# Cross-browser run
BROWSERS=chromium,firefox,webkit pnpm test:e2e:auth

# Against a local dev server
PLAYWRIGHT_BASE_URL=http://localhost:5173 pnpm test:e2e:auth
```

Still not covered by automated tests:

- The 5-keypress schedule creation flow itself (would need a longer test that types `2 J B Enter`)
- `/profile` editing + save
- Drag-reorder on dashboard
- Sign out + sign back in
- The `/displaced` auto-routing (requires multi-context simulation)

These are queued for follow-up tests as the dashboard surface stabilizes.

### Manual test cases not covered

Some flows require human judgment + cross-browser / device matrix:

- Cross-browser sign-in (Safari, Firefox, Edge, mobile Chrome, iOS Safari)
- Print preview rendering with different `print.css` settings
- Screen-reader walkthrough (VoiceOver, NVDA, JAWS, TalkBack)
- High-contrast + large-text + reduced-motion toggles applied to every page
- Patient share view on a real phone (`/p/<token>`)
- Two-device sign-in (validate `/displaced` auto-routing)
- Email rendering across Gmail / Outlook / Apple Mail / iOS Mail

These are documented in [docs/QA-MATRIX.md §4](QA-MATRIX.md) (5-persona checklist) and stay manual.

## Adding new tests

1. Open `scripts/e2e-live.mjs`
2. Add a `testPage(label, path, async (page) => { … assertions … })` block
3. Use `await check('description', async () => { … throw on failure … })` inside the assertions function

Example:

```js
await testPage('My New Page', '/my-new-page', async (page) => {
  await check('/my-new-page has expected heading', async () => {
    const has = await page.getByText(/welcome/i).count();
    if (has === 0) throw new Error('heading missing');
  });
});
```

The script imports `playwright` from the workspace devDep so no separate setup is needed.

## Future: CI integration

To run on every push, add to a workflow:

```yaml
- name: Install Chromium for Playwright
  run: pnpm exec playwright install --with-deps chromium
- name: Run E2E against just-deployed production
  run: pnpm test:e2e
```

Cost: ~70 sec per run + ~70 MB Chromium download per cold runner. Cache via `actions/cache` for warm runners.

Recommend wiring this into `deploy.yml` as a final post-deploy verification step. Failure should NOT roll back the deploy automatically (production might be fine and the test flaky) but should surface a red badge.
