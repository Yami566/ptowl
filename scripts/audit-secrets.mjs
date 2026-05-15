#!/usr/bin/env node
/**
 * scripts/audit-secrets.mjs
 *
 * Closes audit item O8 (docs/QA-MATRIX.md §6). Compares the secret
 * inventory declared in MASTER.md against what's actually set on the
 * production Cloudflare Worker (and optionally on the GitHub repo's
 * Actions secrets). Surfaces drift on either side:
 *
 *   • Missing — declared in MASTER.md but not actually set in the
 *     Worker. Reminders silently no-op if EMAIL_API_KEY is missing;
 *     this is the failure mode the script catches before users do.
 *   • Extra — set in the Worker but not declared. Probably fine, but
 *     either delete (rotation residue) or add to MASTER.md.
 *
 * Why hard-code the expected list here rather than parse MASTER.md:
 * MASTER.md is a human-edited markdown table with prose around it.
 * A regex parse would be brittle and add a dependency. The expected
 * list below is small (8 entries) and updated in lockstep when a
 * secret is added; double-bookkeeping is acceptable for that volume.
 *
 * Required env vars:
 *   CLOUDFLARE_API_TOKEN   — Workers Edit scope on the ptowl account.
 *   CLOUDFLARE_ACCOUNT_ID  — 32-char hex from CF dashboard sidebar.
 *   WORKER_SCRIPT_NAME     — optional; defaults to 'ptowl-api'.
 *
 * Run:    node scripts/audit-secrets.mjs
 * Exit:   0 on clean (no drift), 1 on missing or extra secrets.
 *
 * Off-the-shelf classification:
 *   • node:fs / node:process    — 🟡 stdlib
 *   • fetch (global, Node 22+)  — 🟡 stdlib
 *   • Cloudflare API            — 🟢 CF primitive
 * Zero npm dependencies.
 */

const EXPECTED_WORKER_SECRETS = [
  'JWT_SECRET',
  'ADMIN_EMAIL',
  'EMAIL_API_KEY',
  'EMAIL_ENCRYPTION_KEY',
  'TURNSTILE_SECRET_KEY',
  // CLERK_FRONTEND_API_URL lives in wrangler.jsonc vars, not secrets — skip.
  // CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID live in GH Actions, not
  // the Worker — also skip from this list.
];

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(2);
  }
  return v;
}

async function fetchWorkerSecrets(accountId, token, scriptName) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/secrets`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Cloudflare API ${res.status}: ${body.slice(0, 400)}`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(`Cloudflare API returned success=false: ${JSON.stringify(json.errors)}`);
  }
  return (json.result || []).map((row) => row.name);
}

function diff(expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    missing: expected.filter((name) => !actualSet.has(name)),
    extra: actual.filter((name) => !expectedSet.has(name)),
  };
}

async function main() {
  const accountId = need('CLOUDFLARE_ACCOUNT_ID');
  const token = need('CLOUDFLARE_API_TOKEN');
  const scriptName = process.env.WORKER_SCRIPT_NAME || 'ptowl-api';

  console.log(`Auditing secrets on Worker '${scriptName}'…`);
  const actual = await fetchWorkerSecrets(accountId, token, scriptName);
  console.log(`  Worker reports ${actual.length} secret(s): ${actual.join(', ') || '(none)'}`);

  const { missing, extra } = diff(EXPECTED_WORKER_SECRETS, actual);

  let exitCode = 0;
  if (missing.length > 0) {
    console.error(
      `\n❌ MISSING — declared in MASTER.md but not set on the Worker:\n  ${missing.join('\n  ')}`,
    );
    console.error(`\n  Fix: cd apps/api && wrangler secret put <NAME>`);
    exitCode = 1;
  }
  if (extra.length > 0) {
    console.warn(
      `\n⚠ EXTRA — set on the Worker but not declared in MASTER.md:\n  ${extra.join('\n  ')}`,
    );
    console.warn(`\n  Either delete (rotation residue) or add to MASTER.md §Secrets.`);
    exitCode = exitCode || 1;
  }
  if (exitCode === 0) {
    console.log('\n✅ Clean — every declared secret is set, no unexplained extras.');
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(`\nAudit failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
});
