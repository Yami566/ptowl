#!/usr/bin/env node
/**
 * scripts/clerk-user.mjs
 *
 * Founder ops CLI for the Clerk Backend API. Closes Wave 1.3 of
 * docs/CLERK-INTEGRATION.md — replaces the "log into Clerk dashboard
 * to find/ban/delete a user" flow with one-liner shell commands.
 *
 * Usage:
 *
 *   pnpm clerk:user list
 *   pnpm clerk:user get <email>
 *   pnpm clerk:user ban <email>
 *   pnpm clerk:user unban <email>
 *   pnpm clerk:user delete <email>     (asks for "yes" confirmation)
 *   pnpm clerk:user sessions <email>   (active sessions for a user)
 *
 * Required env:
 *   CLERK_SECRET_KEY    sk_live_… from Clerk dashboard → API Keys.
 *                        Same key the deploy.yml workflow uses.
 *
 * Off-the-shelf:
 *   • node fetch + process.argv      — 🟡 stdlib
 *   • Clerk Backend API /v1/users    — 🟢 Clerk
 *   • readline for confirmation       — 🟡 stdlib
 *
 * Zero npm dependencies. Run with `node scripts/clerk-user.mjs <cmd>`
 * or via the npm script `pnpm clerk:user <cmd>`.
 */

import readline from 'node:readline/promises';
import { stdin, stdout, exit, argv, env } from 'node:process';

const SECRET = env.CLERK_SECRET_KEY;
if (!SECRET) {
  console.error('CLERK_SECRET_KEY env var is required.');
  console.error('Get it from https://dashboard.clerk.com → API Keys.');
  exit(2);
}

const BASE = 'https://api.clerk.com/v1';

async function clerkFetch(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Clerk ${init.method || 'GET'} ${path} → ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function findUserByEmail(email) {
  const normalized = email.toLowerCase().trim();
  // Clerk's users endpoint supports email_address[] filter.
  const users = await clerkFetch(
    `/users?email_address[]=${encodeURIComponent(normalized)}&limit=10`,
  );
  // Clerk returns an array directly (not a paginated object) for this endpoint.
  const list = Array.isArray(users) ? users : users.data || [];
  if (list.length === 0) return null;
  // Tie-break by exact-match on primary email.
  for (const u of list) {
    const primary = u.email_addresses?.find((e) => e.id === u.primary_email_address_id);
    if (primary?.email_address?.toLowerCase() === normalized) return u;
  }
  return list[0];
}

function summarizeUser(u) {
  const primary = u.email_addresses?.find((e) => e.id === u.primary_email_address_id);
  return {
    id: u.id,
    primary_email: primary?.email_address || '(none)',
    first_name: u.first_name || '',
    last_name: u.last_name || '',
    banned: u.banned || false,
    locked: u.locked || false,
    created_at: u.created_at ? new Date(u.created_at).toISOString() : '',
    last_sign_in_at: u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString() : '(never)',
  };
}

async function confirm(prompt) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`${prompt} `);
    return answer.trim().toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

async function cmdList() {
  const users = await clerkFetch('/users?limit=100&order_by=-created_at');
  const list = Array.isArray(users) ? users : users.data || [];
  if (list.length === 0) {
    console.log('No users.');
    return;
  }
  console.log(`Found ${list.length} user(s) (most recent first):\n`);
  for (const u of list) {
    const s = summarizeUser(u);
    const flags = [s.banned && 'BANNED', s.locked && 'LOCKED'].filter(Boolean).join(' ');
    console.log(
      `  ${s.primary_email.padEnd(40)} ${s.id.padEnd(32)} ${s.created_at}${flags ? '  ' + flags : ''}`,
    );
  }
}

async function cmdGet(email) {
  const u = await findUserByEmail(email);
  if (!u) {
    console.error(`No user found with email: ${email}`);
    exit(1);
  }
  console.log(JSON.stringify(summarizeUser(u), null, 2));
}

async function cmdBan(email) {
  const u = await findUserByEmail(email);
  if (!u) {
    console.error(`No user found with email: ${email}`);
    exit(1);
  }
  if (u.banned) {
    console.log(`Already banned: ${email} (${u.id})`);
    return;
  }
  await clerkFetch(`/users/${u.id}/ban`, { method: 'POST' });
  console.log(`✓ Banned ${email} (${u.id})`);
}

async function cmdUnban(email) {
  const u = await findUserByEmail(email);
  if (!u) {
    console.error(`No user found with email: ${email}`);
    exit(1);
  }
  if (!u.banned) {
    console.log(`Not currently banned: ${email}`);
    return;
  }
  await clerkFetch(`/users/${u.id}/unban`, { method: 'POST' });
  console.log(`✓ Unbanned ${email} (${u.id})`);
}

async function cmdDelete(email) {
  const u = await findUserByEmail(email);
  if (!u) {
    console.error(`No user found with email: ${email}`);
    exit(1);
  }
  const summary = summarizeUser(u);
  console.log('About to permanently delete:');
  console.log(JSON.stringify(summary, null, 2));
  const ok = await confirm('\nThis cannot be undone. Type "yes" to confirm:');
  if (!ok) {
    console.log('Aborted.');
    exit(0);
  }
  await clerkFetch(`/users/${u.id}`, { method: 'DELETE' });
  console.log(`✓ Deleted ${email} (${u.id})`);
  console.log('Reminder: the D1 row is still in place; clean up with the SQL recipe in');
  console.log('docs/ADMIN-CHEATSHEET.md if needed.');
}

async function cmdSessions(email) {
  const u = await findUserByEmail(email);
  if (!u) {
    console.error(`No user found with email: ${email}`);
    exit(1);
  }
  const sessions = await clerkFetch(`/sessions?user_id=${u.id}`);
  const list = Array.isArray(sessions) ? sessions : sessions.data || [];
  if (list.length === 0) {
    console.log(`No active sessions for ${email}.`);
    return;
  }
  console.log(`${list.length} session(s) for ${email}:\n`);
  for (const s of list) {
    console.log(
      `  ${s.id}  status=${s.status}  created=${new Date(s.created_at).toISOString()}  last_active=${new Date(s.last_active_at).toISOString()}`,
    );
  }
}

function usage() {
  console.log(`Usage:
  pnpm clerk:user list
  pnpm clerk:user get <email>
  pnpm clerk:user ban <email>
  pnpm clerk:user unban <email>
  pnpm clerk:user delete <email>     (asks for "yes" confirmation)
  pnpm clerk:user sessions <email>
`);
}

async function main() {
  const [cmd, ...rest] = argv.slice(2);
  if (!cmd) {
    usage();
    exit(1);
  }
  try {
    switch (cmd) {
      case 'list':
        await cmdList();
        break;
      case 'get':
        if (!rest[0]) {
          console.error('Missing <email>');
          usage();
          exit(1);
        }
        await cmdGet(rest[0]);
        break;
      case 'ban':
        if (!rest[0]) {
          console.error('Missing <email>');
          usage();
          exit(1);
        }
        await cmdBan(rest[0]);
        break;
      case 'unban':
        if (!rest[0]) {
          console.error('Missing <email>');
          usage();
          exit(1);
        }
        await cmdUnban(rest[0]);
        break;
      case 'delete':
        if (!rest[0]) {
          console.error('Missing <email>');
          usage();
          exit(1);
        }
        await cmdDelete(rest[0]);
        break;
      case 'sessions':
        if (!rest[0]) {
          console.error('Missing <email>');
          usage();
          exit(1);
        }
        await cmdSessions(rest[0]);
        break;
      default:
        console.error(`Unknown command: ${cmd}\n`);
        usage();
        exit(1);
    }
  } catch (err) {
    console.error(`\n${err instanceof Error ? err.message : err}`);
    exit(1);
  }
}

main();
