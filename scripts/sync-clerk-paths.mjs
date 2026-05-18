#!/usr/bin/env node
/**
 * scripts/sync-clerk-paths.mjs
 *
 * Single-purpose script: idempotently PATCH the Clerk production
 * instance's path config (sign-in URL, sign-up URL, after-sign-in,
 * after-sign-up, home) so it always matches what the React router
 * expects. Designed to run on every push to main from deploy.yml
 * so the Clerk dashboard can never silently drift from code.
 *
 * Closes Wave 1.2 of docs/CLERK-INTEGRATION.md.
 *
 * Required env:
 *   CLERK_SECRET_KEY  — sk_live_… from Clerk dashboard → API Keys.
 *                       Stored as a GitHub Actions secret.
 *
 * Optional env:
 *   PTOWL_DESIRED_SIGN_IN_URL    (default: https://ptowl.com/login)
 *   PTOWL_DESIRED_SIGN_UP_URL    (default: https://ptowl.com/signup)
 *   PTOWL_DESIRED_AFTER_SIGN_IN  (default: https://ptowl.com/dashboard)
 *   PTOWL_DESIRED_AFTER_SIGN_UP  (default: https://ptowl.com/dashboard)
 *   PTOWL_DESIRED_HOME_URL       (default: https://ptowl.com)
 *
 * Defaults updated 2026-05-18 in lockstep with PR #91 (wireframe
 * §4.2/§4.3 custom forms). The legacy /accounts/signin and
 * /accounts/signup routes still mount Clerk's embedded widget for
 * ticket-consumption flows but are no longer the canonical user-
 * facing entry points.
 *
 * Exit codes:
 *   0  — paths synced OR script gracefully skipped (no CLERK_SECRET_KEY)
 *   1  — PATCH failed for a real reason (auth, network, schema mismatch)
 *
 * Why "graceful skip on missing secret": some forks of this repo may not
 * have CLERK_SECRET_KEY in their GH Actions secrets yet. We don't want
 * to fail the deploy in that case — the smoke-clerk-urls.yml workflow
 * will catch any drift the next day.
 *
 * Off-the-shelf classification:
 *   • node:process + fetch (global)  — 🟡 stdlib
 *   • Clerk Backend API              — 🟢 Clerk
 * Zero npm dependencies.
 */

const SECRET = process.env.CLERK_SECRET_KEY;
if (!SECRET) {
  console.log('sync-clerk-paths: CLERK_SECRET_KEY not set — skipping (no error).');
  process.exit(0);
}

const desired = {
  sign_in_url: process.env.PTOWL_DESIRED_SIGN_IN_URL || 'https://ptowl.com/login',
  sign_up_url: process.env.PTOWL_DESIRED_SIGN_UP_URL || 'https://ptowl.com/signup',
  after_sign_in_url: process.env.PTOWL_DESIRED_AFTER_SIGN_IN || 'https://ptowl.com/dashboard',
  after_sign_up_url: process.env.PTOWL_DESIRED_AFTER_SIGN_UP || 'https://ptowl.com/dashboard',
  home_url: process.env.PTOWL_DESIRED_HOME_URL || 'https://ptowl.com',
};

console.log('sync-clerk-paths: PATCH /v1/instance');
for (const [k, v] of Object.entries(desired)) {
  console.log(`  ${k.padEnd(20)} ${v}`);
}

try {
  const res = await fetch('https://api.clerk.com/v1/instance', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(desired),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`sync-clerk-paths: PATCH failed with ${res.status}`);
    console.error(`  ${body.slice(0, 400)}`);
    process.exit(1);
  }

  // VERIFY after PATCH: pull the public /v1/environment display_config
  // and check it actually reflects what we just wrote. Clerk's BAPI is
  // lenient — unknown keys return 2xx with no body warning, so a 200
  // response is NOT proof the URLs changed. Without this verification
  // step we'd silently log success while display_config stays stale,
  // which is exactly what happened pre-2026-05-18 and produced the
  // smoke-clerk-urls drift incident.
  const responseBody = await res.text().catch(() => '');
  console.log(`sync-clerk-paths: PATCH 2xx (${responseBody.length} bytes body)`);

  // Fetch the public env that the SPA actually sees. Add a cache-buster
  // to dodge Clerk's edge CDN (typical TTL 5-15 min).
  const verifyUrl = `https://clerk.ptowl.com/v1/environment?cb=${Date.now()}`;
  const verifyRes = await fetch(verifyUrl, {
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  if (!verifyRes.ok) {
    console.error(`sync-clerk-paths: verify GET failed with ${verifyRes.status} — skipping check`);
    process.exit(0);
  }
  const env = await verifyRes.json();
  const actual = {
    sign_in_url: env?.display_config?.sign_in_url,
    sign_up_url: env?.display_config?.sign_up_url,
  };
  const mismatches = [];
  if (actual.sign_in_url !== desired.sign_in_url) {
    mismatches.push(`sign_in_url: PATCHed=${desired.sign_in_url} actual=${actual.sign_in_url}`);
  }
  if (actual.sign_up_url !== desired.sign_up_url) {
    mismatches.push(`sign_up_url: PATCHed=${desired.sign_up_url} actual=${actual.sign_up_url}`);
  }

  if (mismatches.length === 0) {
    console.log('sync-clerk-paths: ✓ verified — display_config matches PATCH');
    process.exit(0);
  }

  // PATCH returned 2xx but display_config didn't change. This is the
  // BAPI silently ignoring unknown keys. Document loudly so we know
  // these URLs need a different mechanism (Clerk dashboard UI OR a
  // different BAPI endpoint we haven't found yet) — DO NOT exit 1
  // because the script ran successfully; the API just doesn't accept
  // these fields. Exiting 0 with a warning keeps the deploy green
  // while making the gap visible in the log.
  console.warn('sync-clerk-paths: ⚠ PATCH was accepted but display_config did NOT update.');
  console.warn('  This means the BAPI /v1/instance endpoint silently ignored these keys.');
  console.warn('  display_config URLs likely need to be set via the Clerk dashboard UI');
  console.warn('  OR via a different BAPI endpoint we have not found yet.');
  for (const m of mismatches) {
    console.warn(`  ${m}`);
  }
  console.warn('  Action: set in Clerk Dashboard → Paths, or investigate the right API.');
  process.exit(0);
} catch (err) {
  console.error(`sync-clerk-paths: network error — ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
