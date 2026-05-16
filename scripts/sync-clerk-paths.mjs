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
 *   PTOWL_DESIRED_SIGN_IN_URL    (default: https://ptowl.com/accounts/signin)
 *   PTOWL_DESIRED_SIGN_UP_URL    (default: https://ptowl.com/accounts/signup)
 *   PTOWL_DESIRED_AFTER_SIGN_IN  (default: https://ptowl.com/dashboard)
 *   PTOWL_DESIRED_AFTER_SIGN_UP  (default: https://ptowl.com/dashboard)
 *   PTOWL_DESIRED_HOME_URL       (default: https://ptowl.com)
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
  sign_in_url: process.env.PTOWL_DESIRED_SIGN_IN_URL || 'https://ptowl.com/accounts/signin',
  sign_up_url: process.env.PTOWL_DESIRED_SIGN_UP_URL || 'https://ptowl.com/accounts/signup',
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

  console.log('sync-clerk-paths: ✓ instance paths in sync');
  process.exit(0);
} catch (err) {
  console.error(`sync-clerk-paths: network error — ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
