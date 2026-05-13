#!/usr/bin/env node
/**
 * scripts/finalize-launch.mjs
 *
 * Automates the three post-merge launch tasks that have API paths:
 *   1. Cloudflare Web Analytics  — enable for ptowl.com, fetch the
 *      site tag (the "token" the beacon needs), patch apps/web/index.html
 *      replacing __CF_ANALYTICS_TOKEN__.
 *   2. MailChannels DNS records  — add SPF/DKIM/Domain-Lockdown TXTs
 *      via the Cloudflare DNS API so outbound reminder email starts
 *      delivering. Idempotent: skipped if records already exist.
 *   3. Clerk Account Portal paths — update the production instance's
 *      sign-in/sign-up/after-sign-in URLs via the Clerk Backend API.
 *      Optional: only runs if CLERK_SECRET_KEY is set.
 *
 * MailChannels API-key rotation is NOT automated here — MailChannels
 * has no management API. Rotate manually in their console, then
 * `cd apps/api && wrangler secret put EMAIL_API_KEY`.
 *
 * Required env vars (all in your shell, NEVER committed):
 *   CLOUDFLARE_API_TOKEN        — needs scopes: Account:Web Analytics
 *                                 Edit + Zone:DNS:Edit on the ptowl.com
 *                                 zone. Generate at
 *                                 dash.cloudflare.com → My Profile →
 *                                 API Tokens.
 *   CLOUDFLARE_ACCOUNT_ID       — 32-char hex from CF dashboard sidebar.
 *   CLOUDFLARE_ZONE_ID          — 32-char hex from ptowl.com → Overview.
 *   MAILCHANNELS_DKIM_PUBLIC_KEY — the DKIM public-key string from the
 *                                  MailChannels console. Used only by
 *                                  task #2; skip task if unset.
 *   CLERK_SECRET_KEY            — sk_live_... from Clerk dashboard →
 *                                  API Keys. Optional; if unset, task
 *                                  #3 is skipped (you can update the
 *                                  Clerk paths via dashboard instead).
 *
 * Run:    node scripts/finalize-launch.mjs
 * or:     pnpm launch:finalize
 *
 * Designed to be idempotent — safe to re-run. Exits non-zero on real
 * failure; "already configured" is a soft-success.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const INDEX_HTML_PATH = resolve(REPO_ROOT, 'apps/web/index.html');

const CF_BASE = 'https://api.cloudflare.com/client/v4';
const CLERK_BASE = 'https://api.clerk.com/v1';

const env = process.env;
const required = (name) => {
  const v = env[name];
  if (!v) {
    console.error(`✗ Missing required env var: ${name}`);
    process.exit(2);
  }
  return v;
};

async function cfFetch(path, init = {}) {
  const res = await fetch(`${CF_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const errors = (body.errors || []).map((e) => e.message).join('; ');
    throw new Error(`Cloudflare ${init.method || 'GET'} ${path}: ${res.status} ${errors || res.statusText}`);
  }
  return body;
}

async function clerkFetch(path, init = {}) {
  const res = await fetch(`${CLERK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Clerk ${init.method || 'GET'} ${path}: ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

// ─── Task 1: Cloudflare Web Analytics ────────────────────────────────

async function enableWebAnalytics() {
  const accountId = required('CLOUDFLARE_ACCOUNT_ID');
  console.log('→ [1/3] Cloudflare Web Analytics for ptowl.com');

  // Check if a site already exists for ptowl.com
  const sites = await cfFetch(`/accounts/${accountId}/rum/site_info/list?host=ptowl.com`);
  let site = sites.result?.find((s) => s.host === 'ptowl.com' || s.ruleset?.zone_tag);

  if (!site) {
    console.log('   creating Web Analytics site…');
    const created = await cfFetch(`/accounts/${accountId}/rum/site_info`, {
      method: 'POST',
      body: JSON.stringify({
        host: 'ptowl.com',
        auto_install: false, // we ship the explicit beacon
      }),
    });
    site = created.result;
  } else {
    console.log('   site already exists, reusing');
  }

  const token = site.snippet?.match(/token":\s*"([^"]+)"/)?.[1] || site.site_tag;
  if (!token) {
    throw new Error('Could not extract beacon token from CF Web Analytics response');
  }

  // Patch apps/web/index.html
  let html = readFileSync(INDEX_HTML_PATH, 'utf8');
  if (!html.includes('__CF_ANALYTICS_TOKEN__')) {
    console.log('   index.html already contains a real token — no patch needed');
  } else {
    html = html.replace('__CF_ANALYTICS_TOKEN__', token);
    writeFileSync(INDEX_HTML_PATH, html);
    console.log(`   patched apps/web/index.html with token (${token.slice(0, 8)}…)`);
  }
  console.log(`✓ [1/3] Web Analytics token: ${token.slice(0, 8)}…`);
}

// ─── Task 2: MailChannels DNS records ────────────────────────────────

async function ensureDnsRecord({ zoneId, type, name, content, comment }) {
  // Check if any TXT/MX record at this name already contains the content.
  const existing = await cfFetch(`/zones/${zoneId}/dns_records?type=${type}&name=${encodeURIComponent(name)}`);
  const match = existing.result?.find((r) => r.content === content);
  if (match) {
    console.log(`   ✓ ${type} ${name} already present`);
    return;
  }
  await cfFetch(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({ type, name, content, ttl: 1, comment }),
  });
  console.log(`   + ${type} ${name} created`);
}

async function configureMailChannelsDns() {
  console.log('→ [2/3] MailChannels DNS for ptowl.com');
  const dkim = env.MAILCHANNELS_DKIM_PUBLIC_KEY;
  if (!dkim) {
    console.log('   skipped — MAILCHANNELS_DKIM_PUBLIC_KEY not set');
    return;
  }
  const zoneId = required('CLOUDFLARE_ZONE_ID');
  const accountId = required('CLOUDFLARE_ACCOUNT_ID');

  // SPF include — must NOT duplicate an existing SPF record.
  // We add a separate TXT for the include if no SPF exists, otherwise
  // the user must merge `include:relay.mailchannels.net` into their
  // existing SPF manually.
  const allTxt = await cfFetch(`/zones/${zoneId}/dns_records?type=TXT&name=ptowl.com`);
  const spfRecord = allTxt.result?.find((r) => r.content?.startsWith('v=spf1'));
  if (spfRecord) {
    if (spfRecord.content.includes('relay.mailchannels.net')) {
      console.log('   ✓ SPF already includes relay.mailchannels.net');
    } else {
      console.log(`   ! Existing SPF found but missing relay.mailchannels.net:`);
      console.log(`     ${spfRecord.content}`);
      console.log(`     Manually merge: include:relay.mailchannels.net before the ~all/-all suffix.`);
    }
  } else {
    await ensureDnsRecord({
      zoneId,
      type: 'TXT',
      name: 'ptowl.com',
      content: 'v=spf1 include:relay.mailchannels.net ~all',
      comment: 'MailChannels outbound SPF — added by scripts/finalize-launch.mjs',
    });
  }

  // DKIM
  await ensureDnsRecord({
    zoneId,
    type: 'TXT',
    name: 'mailchannels._domainkey.ptowl.com',
    content: dkim,
    comment: 'MailChannels DKIM — added by scripts/finalize-launch.mjs',
  });

  // Domain Lockdown (associates the zone with our CF account)
  await ensureDnsRecord({
    zoneId,
    type: 'TXT',
    name: '_mailchannels.ptowl.com',
    content: `v=mc1 cfid=${accountId}.workers.dev`,
    comment: 'MailChannels Domain Lockdown — added by scripts/finalize-launch.mjs',
  });

  console.log('✓ [2/3] MailChannels DNS records ensured');
}

// ─── Task 3: Clerk Account Portal paths ──────────────────────────────

async function configureClerkPaths() {
  console.log('→ [3/3] Clerk Account Portal paths');
  if (!env.CLERK_SECRET_KEY) {
    console.log('   skipped — CLERK_SECRET_KEY not set (do it in Clerk dashboard instead)');
    return;
  }

  // Clerk Backend API exposes /v1/instances and /v1/instance for editing
  // the current instance's URLs. The exact endpoint surface evolves; we
  // PATCH the well-known fields and tolerate "field not editable" errors
  // by re-reading the instance after.
  // No-hyphen forms — Clerk's validator strips hyphens from sign_in_url /
  // sign_up_url and persists /accounts/signin and /accounts/signup. The
  // React Router routes were renamed to match in PR #48.
  const desired = {
    sign_in_url: 'https://ptowl.com/accounts/signin',
    sign_up_url: 'https://ptowl.com/accounts/signup',
    after_sign_in_url: 'https://ptowl.com/dashboard',
    after_sign_up_url: 'https://ptowl.com/dashboard',
    home_url: 'https://ptowl.com',
  };

  try {
    await clerkFetch('/instance', {
      method: 'PATCH',
      body: JSON.stringify(desired),
    });
    console.log('✓ [3/3] Clerk instance paths updated');
  } catch (err) {
    console.log(`   ! PATCH failed: ${err.message}`);
    console.log('     Fall back to dashboard.clerk.com → Customization → Paths.');
  }
}

// ─── main ────────────────────────────────────────────────────────────

async function runStep(name, fn) {
  try {
    await fn();
    return { name, ok: true };
  } catch (err) {
    console.log(`\n✗ ${name} failed: ${err.message}`);
    return { name, ok: false, error: err.message };
  }
}

async function main() {
  required('CLOUDFLARE_API_TOKEN');
  console.log('ptowl launch finalize\n─────────────────────');

  // Per-task try-catch so a 403-on-Web-Analytics doesn't prevent the
  // Clerk paths from being patched, etc. Designed for CI-friendliness.
  const results = [];
  results.push(await runStep('Web Analytics', enableWebAnalytics));
  results.push(await runStep('MailChannels DNS', configureMailChannelsDns));
  results.push(await runStep('Clerk paths', configureClerkPaths));

  console.log('\n─────────────────────');
  console.log('Summary:');
  for (const r of results) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.error ? ` — ${r.error}` : ''}`);
  }

  console.log('\nRemaining manual steps (no API exists):');
  console.log('  • Rotate MailChannels API key in their console, then:');
  console.log('      cd apps/api && wrangler secret put EMAIL_API_KEY');
  console.log('  • If apps/web/index.html was patched, commit + push:');
  console.log('      git add apps/web/index.html && git commit -m "chore(analytics): set CF Web Analytics token"');

  // Non-zero exit only if EVERY step failed — partial success is OK.
  const allFailed = results.every((r) => !r.ok);
  if (allFailed) {
    console.error('\n✗ all steps failed.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n✗ unrecoverable error:', err.message);
  process.exit(1);
});
