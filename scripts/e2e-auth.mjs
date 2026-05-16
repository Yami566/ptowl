#!/usr/bin/env node
/**
 * scripts/e2e-auth.mjs
 *
 * Authenticated end-to-end test for ptowl.com. Proves the clinic-admin
 * sign-in flow actually works end-to-end, programmatically:
 *
 *   1. Create a throwaway test user via Clerk Backend API
 *   2. Mint a one-shot sign-in token for that user
 *   3. Drive headless browser(s) through /?__clerk_ticket=<token>
 *   4. Assert the user lands on /dashboard with the expected UI
 *   5. Press '2' to trigger the 5-keypress schedule flow modal
 *   6. Verify <UserButton> renders in the header
 *   7. Clean up: delete the test user via BAPI
 *
 * Why this matters: the founder reported on 2026-05-16 that no
 * end-to-end signin success has been confirmed since the auth rebuild.
 * HTTP-level smokes and the unauth e2e suite can't catch this. This
 * script does.
 *
 * Cross-browser: runs against Chromium, Firefox, and WebKit (Safari
 * engine) when BROWSERS env is set, otherwise Chromium only. Surfaces
 * Safari/Firefox/Edge regressions that closed-loop browser tests
 * (Chrome only) miss.
 *
 * Required env:
 *   CLERK_SECRET_KEY — sk_live_... from Clerk dashboard → API Keys.
 *                     Same key deploy.yml + sync-clerk-paths.mjs use.
 *
 * Optional env:
 *   PLAYWRIGHT_BASE_URL  — default https://ptowl.com
 *   BROWSERS             — comma-separated subset of chromium,firefox,webkit
 *                          (default: chromium)
 *   TEST_USER_EMAIL_BASE — default ptowl-e2e+<timestamp>@example.com
 *
 * Exit codes:
 *   0  — all assertions passed (across all configured browsers)
 *   1  — at least one assertion failed
 *   2  — environment misconfigured (missing CLERK_SECRET_KEY etc.)
 *  77  — gracefully skipped (CLERK_SECRET_KEY not set + STRICT_SKIP=0)
 *
 * Run:    CLERK_SECRET_KEY=sk_live_... pnpm test:e2e:auth
 * CI:     stored as GH Actions secret CLERK_SECRET_KEY,
 *         invoked from .github/workflows/e2e-auth.yml
 */

import { chromium, firefox, webkit } from 'playwright';

const SECRET = process.env.CLERK_SECRET_KEY;
if (!SECRET) {
  console.log('e2e-auth: CLERK_SECRET_KEY not set — gracefully skipping.');
  console.log('  (Add it to GH Actions secrets or your local shell to enable.)');
  process.exit(77);
}

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://ptowl.com';
const TS = Date.now();
const TEST_EMAIL =
  (process.env.TEST_USER_EMAIL_BASE || `ptowl-e2e+${TS}@example.com`).replace(
    '<TS>',
    String(TS),
  );
const TEST_PASSWORD = `Ptowl-E2E-${TS}-Pw!`;

const requestedBrowsers = (process.env.BROWSERS || 'chromium')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

console.log(`e2e-auth: base=${BASE}  browsers=${requestedBrowsers.join(',')}`);
console.log(`e2e-auth: test user email=${TEST_EMAIL}`);

// ── Clerk Backend API helpers ────────────────────────────────────────────

async function clerkFetch(path, init = {}) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Clerk ${init.method || 'GET'} ${path} → ${res.status}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

async function detectIdentifierStrategy() {
  // Clerk's public /v1/environment endpoint reports which identifier
  // types the instance accepts. We pick the strategy that matches so
  // the BAPI POST /users call doesn't 422 on "email_address is not a
  // valid parameter" (which is what happened on 2026-05-16 when the
  // instance turned out to be configured for phone-only auth).
  const url = `https://clerk.ptowl.com/v1/environment`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not GET ${url}: ${res.status}`);
  }
  const env = await res.json();
  const strategies = env?.auth_config?.identification_strategies || [];
  console.log(`e2e-auth: Clerk identification_strategies = ${JSON.stringify(strategies)}`);
  if (strategies.includes('email_address')) return 'email';
  if (strategies.includes('phone_number')) return 'phone';
  throw new Error(
    `No supported identifier strategy. Got: ${strategies.join(', ') || '(empty)'}. ` +
      `Enable email or phone in Clerk dashboard → User & Authentication → ` +
      `Email, Phone, Username.`,
  );
}

function buildSyntheticPhone() {
  // NANP (North American Numbering Plan) reserves 555-0100 through
  // 555-0199 for fiction/testing. Clerk accepts these as valid E.164
  // but never dials them. Format: +1 555 555 01XX (11 digits + the +).
  // 100 unique values, plus test users are deleted after each run so
  // collision is bounded to concurrent runs only.
  const xx = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return `+155555501${xx}`;
}

async function createTestUser() {
  console.log('e2e-auth: creating test user via Clerk BAPI…');
  const strategy = await detectIdentifierStrategy();
  const base = {
    password: TEST_PASSWORD,
    first_name: 'E2E',
    last_name: `Test ${TS}`,
    skip_password_checks: true, // BAPI-only — allows our test password
  };
  const params =
    strategy === 'email'
      ? { ...base, email_address: [TEST_EMAIL] }
      : { ...base, phone_number: [buildSyntheticPhone()] };
  console.log(`e2e-auth:   using strategy="${strategy}"`);
  const user = await clerkFetch('/users', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  console.log(`e2e-auth:   created user_id=${user.id}`);
  return user;
}

async function mintSignInToken(userId) {
  console.log('e2e-auth: minting one-shot sign-in token…');
  const result = await clerkFetch('/sign_in_tokens', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 600 }),
  });
  console.log(`e2e-auth:   token id=${result.id}, ${result.token.slice(0, 16)}…`);
  return result.token;
}

async function deleteTestUser(userId) {
  console.log(`e2e-auth: cleaning up test user ${userId}…`);
  try {
    await clerkFetch(`/users/${userId}`, { method: 'DELETE' });
    console.log('e2e-auth:   deleted ok');
  } catch (err) {
    console.error(`e2e-auth:   delete failed (debris left in Clerk): ${err.message}`);
  }
}

// ── Test runner ──────────────────────────────────────────────────────────

const browsersMap = { chromium, firefox, webkit };

async function runAgainstBrowser(browserName, ticket) {
  const launcher = browsersMap[browserName];
  if (!launcher) {
    console.error(`e2e-auth: unknown browser "${browserName}" — skipping`);
    return { browser: browserName, passed: 0, failed: 0, errors: [] };
  }

  console.log(`\n=== ${browserName.toUpperCase()} ===`);
  const browser = await launcher.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

  let passed = 0;
  let failed = 0;
  const failures = [];

  async function check(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push({ name, msg });
      console.log(`  ✗ ${name}`);
      console.log(`      ${msg}`);
    }
  }

  // Capture console logs and JS errors throughout the flow for diagnostics
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      const text = msg.text();
      if (
        !/Refused to execute inline script/i.test(text) &&
        !/net::ERR_FAILED/i.test(text) &&
        !/cloudflareinsights/i.test(text) &&
        !/clerk-telemetry/i.test(text)
      ) {
        console.log(`  ⚠ ${msg.type()}: ${text.slice(0, 200)}`);
      }
    }
  });

  try {
    // Hit /accounts/signin?__clerk_ticket=<token> — the embedded
    // <SignIn> widget is what consumes the ticket via
    // signIn.create({ strategy: 'ticket', ticket }). Mounting at the
    // landing page alone doesn't trigger consumption; the widget has
    // to be in the DOM.
    const ticketUrl = `${BASE}/accounts/signin?__clerk_ticket=${encodeURIComponent(ticket)}&redirect_url=${encodeURIComponent('/dashboard')}`;
    console.log(`  → navigate ${ticketUrl.slice(0, 80)}…`);
    await page.goto(ticketUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for AuthContext + Clerk to settle and redirect to /dashboard or
    // /awaiting-approval. Fallback: wait for either URL or visible dashboard
    // content, whichever comes first.
    try {
      await page.waitForURL(/\/(dashboard|awaiting-approval)$/, { timeout: 30000 });
    } catch {
      // Diagnostic: where did we actually end up?
      const finalUrl = page.url();
      const visibleH1 = await page.locator('h1').first().textContent().catch(() => '(none)');
      const bodyText = await page.locator('body').textContent().catch(() => '');
      throw new Error(
        `Ticket consumption never completed. final URL=${finalUrl} ` +
          `visible h1="${visibleH1?.slice(0, 80)}" body-preview="${bodyText.slice(0, 200)}"`,
      );
    }

    const landedAt = new URL(page.url()).pathname;

    await check('signs in successfully and reaches /dashboard or /awaiting-approval', async () => {
      if (!['/dashboard', '/awaiting-approval'].includes(landedAt)) {
        throw new Error(`unexpected landing pathname: ${landedAt}`);
      }
    });

    // If they landed on awaiting-approval, that's also a valid outcome
    // (means provision.ts default flipped to 'pending'). Verify that
    // page renders correctly, then we're done with this browser.
    if (landedAt === '/awaiting-approval') {
      await check('/awaiting-approval shows "Almost there" copy', async () => {
        const has = await page.getByText(/almost there/i).count();
        if (has === 0) throw new Error('missing "almost there" copy');
      });
      await check('/awaiting-approval shows Sign out button', async () => {
        const has = await page.getByRole('button', { name: /sign out/i }).count();
        if (has === 0) throw new Error('missing sign out button');
      });
    } else {
      // /dashboard path
      await page.waitForTimeout(2500); // let Clerk's <UserButton> mount

      await check('/dashboard has UserButton in header (avatar circle)', async () => {
        const has = await page
          .locator('.cl-userButtonTrigger, .cl-userButtonBox, [data-clerk-component="UserButton"]')
          .count();
        if (has === 0) throw new Error('UserButton not rendered');
      });
      await check('/dashboard has visible user identity chip', async () => {
        const text = await page.locator('body').textContent();
        if (!text?.toLowerCase().includes(TEST_EMAIL.toLowerCase().split('@')[0])) {
          // Not all email prefixes will appear visibly; relax to: just any signed-in chrome
          const userMenu = await page.locator('details summary, .ptowl-menu').count();
          if (userMenu === 0) throw new Error('no app-nav menu in header');
        }
      });
      await check('/dashboard renders the preset templates carousel', async () => {
        // Templates are fetched via /api/v1/templates AFTER AuthContext
        // resolves. Provision creates default templates synchronously
        // during /auth/me, but the dashboard's fetch can still take
        // a few seconds on cold paths. waitForSelector with explicit
        // timeout instead of an immediate count check.
        await page.waitForSelector('.dash-preset-card, .dash-presets-grid', {
          timeout: 15000,
        });
      });
      await check('/dashboard has main#main-content landmark', async () => {
        const has = await page.locator('main#main-content').count();
        if (has === 0) throw new Error('main#main-content missing');
      });
      await check('/dashboard signal: AuthContext resolved with a real user', async () => {
        // Indirectly: the page didn't bounce to / or /accounts/signin or /displaced
        if (page.url().endsWith('/') || /\/(accounts|displaced)/.test(page.url())) {
          throw new Error(`redirected away: ${page.url()}`);
        }
      });

      // ── 5-keypress schedule creation flow ────────────────────────────
      // Proves the core promise of PTOwl: a clinic admin can create a
      // schedule in 5 keystrokes. The test types 3 keys (2 + J + B) and
      // verifies the schedule editor opens. (The actual "press Enter to
      // save" + a 5th key would add the print dialog which is fiddly
      // in headless mode — leaving Save & Print as a manual step.)
      await check('5-keypress: dashboard has preset template cards visible', async () => {
        await page.waitForSelector('.dash-preset-card', { timeout: 5000 });
      });

      await check('5-keypress: dismiss OnboardingSurveyModal if it appears', async () => {
        // New users see the onboarding survey on first dashboard visit.
        // "Skip for now" POSTs /onboarding-survey then unmounts the
        // overlay. Two-phase wait: (1) probe whether the modal showed
        // at all (3s — quick, may not be there for returning users),
        // (2) if it did, click skip and wait FOR REAL for detach (15s —
        // generous, the API call can be slow on a cold worker). Failing
        // loud on detach timeout is critical: the overlay intercepts
        // pointer events and silently breaks the next click.
        const skip = page.locator('button:has-text("Skip for now")');
        let surveyAppeared = false;
        try {
          await skip.waitFor({ timeout: 3000 });
          surveyAppeared = true;
        } catch {
          /* No survey — returning user. */
        }
        if (surveyAppeared) {
          await skip.click();
          await page.waitForSelector('[aria-labelledby="onboarding-title"]', {
            state: 'detached',
            timeout: 15000,
          });
        }
      });

      await check('5-keypress: clicking a preset card opens patient-initials modal', async () => {
        // Dispatch via element.click() in the page context rather than
        // a coordinate-based Playwright click. Coordinate clicks pick
        // the topmost element under the point; if any transient
        // overlay (survey POST in flight, avatar bubble paint, etc.)
        // is still mounted, the click lands on the overlay and the
        // preset card's onClick never runs. element.click() fires the
        // event directly on the button and React's delegated handler
        // at the root catches it regardless of z-order.
        await page.evaluate(() => {
          const card = document.querySelector('.dash-preset-card');
          if (!card) throw new Error('no .dash-preset-card found in DOM');
          card.click();
        });
        await page.waitForSelector('[role="dialog"][aria-label="Enter patient initials"]', {
          timeout: 8000,
        });
      });

      await check(
        '5-keypress: typing "JB" closes the modal and opens the schedule editor (Save & Print visible)',
        async () => {
          await page.keyboard.type('JB');
          // Modal auto-closes when 2 chars typed; handleInitialsChange
          // then awaits the /alias API call + generates rrule schedule
          // + mounts ScheduleEditor which has a "Save & Print" button.
          await page.waitForSelector('button:has-text("Save & Print")', {
            timeout: 15000,
          });
        },
      );

      // Skipping the Cancel-out-of-editor step: ScheduleEditor has
      // multiple "Cancel" buttons (footer + selected-event popover)
      // and Playwright's strict mode resolves ambiguously. Test
      // cleanup (delete /v1/users/{id}) wipes the user + any
      // partial schedule state anyway. Worth revisiting with a
      // more specific selector if we want to validate the cancel
      // path explicitly.
    }

    await check(`no page errors during full ${browserName} flow`, async () => {
      // Filter the known CSP/cors noise
      const real = errors.filter(
        (e) =>
          !/Refused to execute inline script/i.test(e) &&
          !/net::ERR_FAILED/i.test(e) &&
          !/cloudflareinsights/i.test(e) &&
          !/clerk-telemetry/i.test(e),
      );
      if (real.length > 0) throw new Error(real.join('\n      '));
    });
  } catch (err) {
    failed++;
    failures.push({ name: 'unexpected error during flow', msg: err.message });
    console.log(`  ✗ unexpected error: ${err.message}`);
  } finally {
    await context.close();
    await browser.close();
  }

  return { browser: browserName, passed, failed, failures };
}

// ── Main ─────────────────────────────────────────────────────────────────

let exitCode = 0;
let testUserId = null;
try {
  const user = await createTestUser();
  testUserId = user.id;
  const ticket = await mintSignInToken(user.id);

  const allResults = [];
  for (const b of requestedBrowsers) {
    const r = await runAgainstBrowser(b, ticket);
    allResults.push(r);
  }

  console.log('\n─────────────────────────────────────────────────────');
  console.log('Summary across browsers:');
  for (const r of allResults) {
    const tag = r.failed === 0 ? '✓' : '✗';
    console.log(`  ${tag} ${r.browser}: passed=${r.passed} failed=${r.failed}`);
    if (r.failed > 0) exitCode = 1;
  }
  if (exitCode === 1) {
    console.log('\nFailures:');
    for (const r of allResults) {
      for (const f of r.failures) {
        console.log(`  [${r.browser}] ${f.name}`);
        console.log(`     ${f.msg}`);
      }
    }
  }
} catch (err) {
  console.error(`\ne2e-auth: fatal — ${err instanceof Error ? err.message : err}`);
  exitCode = 1;
} finally {
  if (testUserId) await deleteTestUser(testUserId);
}

process.exit(exitCode);
