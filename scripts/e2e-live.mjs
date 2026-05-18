#!/usr/bin/env node
/**
 * scripts/e2e-live.mjs
 *
 * Real-browser end-to-end smoke tests for live ptowl.com. Drives a
 * headless Chromium via Playwright; checks every page renders, the
 * skip-to-main link exists post-React-hydration, no JS errors on
 * load, and critical UI affordances are present.
 *
 * Run:    node scripts/e2e-live.mjs
 * or:     PLAYWRIGHT_BASE_URL=http://localhost:5173 node scripts/e2e-live.mjs
 *
 * Off-the-shelf: Playwright (industry-standard browser automation).
 * Not added to package.json — invoked via npx so it stays out of the
 * runtime dependency graph. Chromium installed once to user cache.
 *
 * Exit codes:
 *   0  — all tests passed
 *   1  — one or more tests failed (details in stdout)
 *
 * What it tests (each page):
 *   • HTTP status 200
 *   • React tree mounts (#root has children after navigation settles)
 *   • Skip-to-main link present (a11y baseline)
 *   • Page title set via usePageTitle
 *   • <main id="main-content"> landmark present
 *   • Zero uncaught JS errors during load
 *   • Specific content markers per page
 */

import { chromium } from 'playwright';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://ptowl.com';
console.log(`PTOwl E2E live tests — base: ${BASE}\n`);

const browser = await chromium.launch();
const context = await browser.newContext({
  // Default viewport for desktop tests
  viewport: { width: 1280, height: 720 },
});

const results = [];
const consoleErrorsByPage = new Map();

function startTracking(page, url) {
  const errors = [];
  consoleErrorsByPage.set(url, errors);
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter known noise that doesn't affect functional behavior:
      //   • Third-party telemetry/CDN flakiness on first paint
      //   • The CSP-blocked Clerk + CF inline scripts (each emits a unique
      //     hash per request, so static allowlisting is impossible. Tracked
      //     as a known limitation; see docs/E2E-TESTS.md).
      //   • net::ERR_FAILED for the CSP-blocked inline scripts.
      //   • 401/404 from /auth/me when the test is unauthenticated (expected).
      if (
        /favicon\.svg/i.test(text) ||
        /clerk-telemetry/i.test(text) ||
        /clerkjs\.dev/i.test(text) ||
        /Refused to execute inline script/i.test(text) ||
        /net::ERR_FAILED/i.test(text) ||
        /Failed to load resource: the server responded with a status of 40\d/i.test(text) ||
        // cloudflareinsights.com/cdn-cgi/rum is CF Web Analytics; their
        // own CDN's CORS for the rum endpoint is inconsistent and we
        // can't control it from our origin. Telemetry-only.
        /cloudflareinsights\.com.*CORS/i.test(text)
      ) {
        return;
      }
      errors.push(`console.error: ${text}`);
    }
  });
}

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err instanceof Error ? err.message : String(err) });
    console.log(`  ✗ ${name}`);
    console.log(`      ${err instanceof Error ? err.message : err}`);
  }
}

async function testPage(label, path, assertions) {
  console.log(`\n=== ${label} (${path}) ===`);
  const page = await context.newPage();
  startTracking(page, path);
  try {
    const url = `${BASE}${path}`;
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await check(`${path} returns 2xx`, async () => {
      const status = response?.status() ?? 0;
      if (status < 200 || status >= 300) throw new Error(`status ${status}`);
    });
    // Wait for React to mount
    await page.waitForFunction(
      () => document.getElementById('root')?.children.length > 0,
      { timeout: 15000 },
    );
    await check(`${path} React tree mounted (#root has children)`, async () => {
      const has = await page.evaluate(() => !!document.querySelector('#root > *'));
      if (!has) throw new Error('#root empty after hydration');
    });
    // Give React + Clerk's iframe time to fully paint. 400ms wasn't enough
    // for routes that mount <SignIn> or <SignUp> — Clerk's iframe loads
    // asynchronously and the parent's React tree finishes hydration in
    // a separate frame. 2000ms is safe for production network conditions.
    await page.waitForTimeout(2000);
    await assertions(page);
    // Console errors snapshot
    const errors = consoleErrorsByPage.get(path) || [];
    await check(`${path} no JS errors during load`, async () => {
      if (errors.length > 0) throw new Error(errors.join('\n      '));
    });
    // Universal Chernobyl-class canary: the rendered HTML of EVERY
    // public page must NEVER contain the literal string
    // 'dashboard.clerk.com'. That was the 2026-05-18 user-screenshot
    // bug — Clerk's raw config error leaked the dashboard URL into
    // the inline form error. The defense in PR #99 catches the known
    // failure mode; this canary catches any FUTURE failure where some
    // other Clerk error path surfaces the URL on any page.
    await check(`${path} does not leak dashboard.clerk.com URL`, async () => {
      const html = await page.content();
      if (/dashboard\.clerk\.com/i.test(html)) {
        const matches = html.match(/.{0,40}dashboard\.clerk\.com.{0,40}/i) || [];
        throw new Error(
          `Found 'dashboard.clerk.com' in rendered HTML — Clerk error leaking? ` +
            `Sample: ${matches[0] || '(context unavailable)'}`,
        );
      }
    });
  } finally {
    await page.close();
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────

await testPage('Landing', '/', async (page) => {
  await check('/ has PTOwl wordmark', async () => {
    const has = await page.locator('text=/PTowl|PTOwl/i').first().isVisible();
    if (!has) throw new Error('wordmark missing');
  });
  // Wireframe plan §4.1 — two CTAs pointing at the betraiders-pattern
  // custom forms. Pre-#91 these pointed at /accounts/signin; this
  // assertion is the Chernobyl-class canary that catches a regression
  // where the landing reverts to the embedded-Clerk flow without us
  // noticing (HTTP 200 on / is not sufficient — content must match).
  await check('/ has Log In CTA pointing at /login', async () => {
    const has = (await page.locator('a[href="/login"]').count()) > 0;
    if (!has) throw new Error('no a[href="/login"] on landing — wireframe regression');
  });
  await check('/ has Sign Up CTA pointing at /signup', async () => {
    const has = (await page.locator('a[href="/signup"]').count()) > 0;
    if (!has) throw new Error('no a[href="/signup"] on landing — wireframe regression');
  });
});

await testPage('About', '/about', async (page) => {
  await check('/about has hero headline', async () => {
    const has = await page.locator('h1').first().isVisible();
    if (!has) throw new Error('h1 missing');
  });
  await check('/about has feature cards', async () => {
    const count = await page.locator('h3').count();
    if (count < 3) throw new Error(`only ${count} h3 elements (expected ≥ 3 feature cards)`);
  });
});

await testPage('Privacy', '/privacy', async (page) => {
  await check('/privacy has h1', async () => {
    const has = await page.locator('h1').first().isVisible();
    if (!has) throw new Error('h1 missing');
  });
});

await testPage('Terms', '/terms', async (page) => {
  await check('/terms has h1', async () => {
    const has = await page.locator('h1').first().isVisible();
    if (!has) throw new Error('h1 missing');
  });
});

await testPage('Security', '/security', async (page) => {
  await check('/security has h1', async () => {
    const has = await page.locator('h1').first().isVisible();
    if (!has) throw new Error('h1 missing');
  });
});

await testPage('Sign in', '/accounts/signin', async (page) => {
  await check('/accounts/signin has main#main-content landmark', async () => {
    const has = await page.locator('main#main-content').count();
    if (has === 0) throw new Error('main#main-content missing');
  });
  await check('/accounts/signin has the broken-browser fallback link', async () => {
    const has = await page.getByText(/sign in directly/i).count();
    if (has === 0) throw new Error('fallback link not rendered');
  });
});

await testPage('Sign up', '/accounts/signup', async (page) => {
  await check('/accounts/signup has main#main-content landmark', async () => {
    const has = await page.locator('main#main-content').count();
    if (has === 0) throw new Error('main#main-content missing');
  });
  await check('/accounts/signup has the broken-browser fallback link', async () => {
    const has = await page.getByText(/sign up directly/i).count();
    if (has === 0) throw new Error('fallback link not rendered');
  });
});

// ── Wireframe-aligned routes (PR #91) ─────────────────────────────────────
// Defense-in-depth: these tests prove the betraiders-pattern custom
// forms actually render the right content, not just return HTTP 200.
// A regression where /login renders blank or shows the wrong copy
// fails here, even if curl reports 200 OK.

// Mode detection: the betraiders-pattern pages (/login, /signup) can
// render in one of two valid states depending on Clerk's auth_config
// (PR #99 added the defensive probe in apps/web/src/lib/clerk-strategy.ts):
//   - FORM mode      — Clerk has email_address enabled; the actual form
//                       renders (email + password + submit + footer link)
//   - MAINTENANCE    — Clerk has email_address disabled; a friendly
//                       AuthCard renders with help@ptowl.com mailto +
//                       cross-link to the other auth page, hiding Clerk's
//                       raw dashboard URL from end-users
// Either mode is a healthy state. The unhealthy state is when neither
// renders, OR when Clerk's raw dashboard URL leaks (caught by the
// universal canary in testPage()). isMaintenanceMode() detects mode by
// presence of the mailto:help@ptowl.com link — only the maintenance
// card includes it.
async function isMaintenanceMode(page) {
  // Starts-with selector: the maintenance CTA's href now carries
  // ?subject=...&body=... query params (PR #110 waitlist/recovery
  // copy), so an exact-match selector misses it. Any anchor whose
  // href begins with mailto:help@ptowl.com counts as the maintenance
  // signal, regardless of trailing query string.
  return (await page.locator('a[href^="mailto:help@ptowl.com"]').count()) > 0;
}

await testPage('Login (wireframe §4.2)', '/login', async (page) => {
  const maint = await isMaintenanceMode(page);
  if (maint) {
    await check('/login maintenance card has the recovery heading', async () => {
      // Matches PR #110's v2 copy: "Sign-in temporarily by request".
      // Also tolerates the prior "Sign-in is being set up" copy in
      // case of edge cache lag.
      const has = await page
        .getByText(/sign-in (temporarily by request|is being set up)/i)
        .count();
      if (has === 0) throw new Error('maintenance heading missing');
    });
    await check('/login maintenance card has help@ptowl.com mailto', async () => {
      const has = await page.locator('a[href^="mailto:help@ptowl.com"]').count();
      if (has === 0) throw new Error('mailto link missing');
    });
    await check('/login maintenance card cross-links to /signup', async () => {
      const has = await page.locator('a[href="/signup"]').count();
      if (has === 0) throw new Error('cross-link to /signup missing');
    });
    await check('/login maintenance card has main#main-content landmark', async () => {
      const has = await page.locator('main#main-content').count();
      if (has === 0) throw new Error('main landmark missing on maintenance card');
    });
  } else {
    await check('/login renders the email field', async () => {
      const has = await page.locator('input[type="email"]').count();
      if (has === 0) throw new Error('email input missing — LoginPage did not render');
    });
    await check('/login renders the password field', async () => {
      const has = await page.locator('input[type="password"]').count();
      if (has === 0) throw new Error('password input missing — LoginPage did not render');
    });
    await check('/login has primary "Log In" submit button', async () => {
      const has = await page.locator('button[type="submit"]:has-text("Log In")').count();
      if (has === 0) throw new Error('Log In submit button missing');
    });
    await check('/login footer links to /signup', async () => {
      const has = await page.locator('a[href="/signup"]').count();
      if (has === 0) throw new Error('footer link to /signup missing');
    });
  }
});

await testPage('Sign up (wireframe §4.3)', '/signup', async (page) => {
  const maint = await isMaintenanceMode(page);
  if (maint) {
    await check('/signup maintenance card has the waitlist heading', async () => {
      // Matches PR #110's v2 copy: "We're growing carefully". Also
      // tolerates the prior "Sign-up is being set up" copy in case
      // of edge cache lag.
      const has = await page
        .getByText(/(we'?re growing carefully|sign-up is being set up)/i)
        .count();
      if (has === 0) throw new Error('maintenance heading missing');
    });
    await check('/signup maintenance card has help@ptowl.com mailto', async () => {
      const has = await page.locator('a[href^="mailto:help@ptowl.com"]').count();
      if (has === 0) throw new Error('mailto link missing');
    });
    await check('/signup maintenance card cross-links to /login', async () => {
      const has = await page.locator('a[href="/login"]').count();
      if (has === 0) throw new Error('cross-link to /login missing');
    });
    await check('/signup maintenance card has main#main-content landmark', async () => {
      const has = await page.locator('main#main-content').count();
      if (has === 0) throw new Error('main landmark missing on maintenance card');
    });
  } else {
    await check('/signup renders the clinic name field', async () => {
      // ClinicNameField is a labeled text input. Match by accessible label.
      const has = await page.getByLabel(/clinic name/i).count();
      if (has === 0) throw new Error('clinic name field missing — SignUpFormPage did not render');
    });
    await check('/signup renders the email field', async () => {
      const has = await page.locator('input[type="email"]').count();
      if (has === 0) throw new Error('email input missing — SignUpFormPage did not render');
    });
    await check('/signup renders the password field', async () => {
      const has = await page.locator('input[type="password"]').count();
      if (has === 0) throw new Error('password input missing — SignUpFormPage did not render');
    });
    await check('/signup has primary "Sign Up" submit button', async () => {
      const has = await page.locator('button[type="submit"]:has-text("Sign Up")').count();
      if (has === 0) throw new Error('Sign Up submit button missing');
    });
    await check('/signup footer links to /login', async () => {
      const has = await page.locator('a[href="/login"]').count();
      if (has === 0) throw new Error('footer link to /login missing');
    });
  }
});

await testPage('Awaiting approval', '/awaiting-approval', async (page) => {
  await check('/awaiting-approval has "Almost there" heading', async () => {
    const has = await page.getByText(/almost there/i).count();
    if (has === 0) throw new Error('heading copy missing');
  });
  await check('/awaiting-approval has Sign out button', async () => {
    const has = await page.getByRole('button', { name: /sign out/i }).count();
    if (has === 0) throw new Error('sign out button missing');
  });
  await check('/awaiting-approval has main#main-content landmark', async () => {
    const has = await page.locator('main#main-content').count();
    if (has === 0) throw new Error('main#main-content missing');
  });
});

await testPage('Admin decide (bad token)', '/admin/decide?token=garbage&decision=approve', async (page) => {
  await check('/admin/decide bad token renders error state', async () => {
    // Wait for the API call to complete + render the error state
    await page.waitForTimeout(2000);
    const errorVisible = (await page.getByText(/couldn.?t record/i).count()) > 0 ||
      (await page.getByText(/expired or already been used/i).count()) > 0 ||
      (await page.getByText(/token invalid/i).count()) > 0;
    if (!errorVisible) throw new Error('error state copy not rendered');
  });
  await check('/admin/decide has back-to-PTOwl link', async () => {
    const has = await page.getByText(/back to ptowl/i).count();
    if (has === 0) throw new Error('back link missing');
  });
});

await testPage('Displaced', '/displaced', async (page) => {
  await check('/displaced has "another device" copy', async () => {
    const has = await page.getByText(/another device/i).count();
    if (has === 0) throw new Error('displaced copy missing');
  });
  await check('/displaced has "Sign in here again" CTA', async () => {
    const has = await page.getByText(/sign in here again/i).count();
    if (has === 0) throw new Error('primary CTA missing');
  });
  await check('/displaced has change-password escape link', async () => {
    const has = await page.getByText(/wasn.?t you/i).count();
    if (has === 0) throw new Error('change-password link missing');
  });
});

await testPage('Patient share — bad token', '/p/0000000000000000000000000000ffff', async (page) => {
  await check('/p/<bad> shows "Schedule not found" error', async () => {
    await page.waitForTimeout(2000); // wait for API to return 404
    const has = await page.getByText(/schedule not found/i).count();
    if (has === 0) throw new Error('not-found message missing');
  });
});

await testPage('Not-found catchall', '/this-route-doesnt-exist', async (page) => {
  await check('catch-all has 404 page rendered', async () => {
    const has = await page.locator('h1').first().isVisible();
    if (!has) throw new Error('NotFoundPage h1 missing');
  });
});

// ── Summary ───────────────────────────────────────────────────────────────

await browser.close();

console.log('\n─────────────────────────────────────────────────────');
const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
console.log(`Total: ${results.length}   Passed: ${passed}   Failed: ${failed.length}`);
if (failed.length > 0) {
  console.log('\nFailures:');
  for (const r of failed) {
    console.log(`  ✗ ${r.name}`);
    console.log(`     ${r.error}`);
  }
  process.exit(1);
}
console.log('\nAll passed. ✓');
process.exit(0);
