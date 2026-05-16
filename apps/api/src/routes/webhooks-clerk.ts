import { Hono } from 'hono';
import type { Env } from '../types/env.js';

/**
 * Clerk webhook listener — Wave 1.1 keystone of docs/CLERK-INTEGRATION.md.
 *
 * Replaces the lazy-sync pattern (rediscover user changes on next
 * `/auth/me`) with push-based eventual consistency: when a user
 * updates their email in Clerk's Account Portal or deletes their
 * own account, our D1 row reflects it within seconds.
 *
 * Verification is manual HMAC-SHA256 via SubtleCrypto rather than the
 * `svix` npm package — saves a dependency. Algorithm matches Svix's
 * "v1" scheme (the only scheme Clerk emits today):
 *
 *   1. Concat: `<svix-id>.<svix-timestamp>.<raw-body>`
 *   2. HMAC-SHA256 with the secret (whsec_<base64> — base64-decode the
 *      part after the prefix)
 *   3. Base64-encode the digest
 *   4. svix-signature header is `v1,<sig>` (possibly comma-separated
 *      list when the secret was rotated). Match any.
 *   5. Reject if svix-timestamp is older than 5 minutes (replay window).
 *
 * Off-the-shelf classification:
 *   • Hono router               — 🟢 Cloudflare
 *   • crypto.subtle (Web Crypto) — 🟡 stdlib (already used for AES-GCM,
 *                                              PBKDF2, HMAC unsubscribe)
 *   • Clerk webhook spec         — 🟢 Clerk (we're a consumer only)
 *
 * Zero new npm deps.
 *
 * One-time operator setup (the only step Clerk's BAPI doesn't expose):
 *   1. Clerk dashboard → Webhooks → Add endpoint
 *   2. URL: `https://ptowl.com/api/v1/webhooks/clerk`
 *   3. Subscribe at least: user.updated, user.deleted
 *   4. Copy the Signing Secret (starts with `whsec_`)
 *   5. `cd apps/api && wrangler secret put CLERK_WEBHOOK_SECRET`
 *
 * Until step 5 is done, this endpoint returns 503 with a clear error
 * message — so a misfired webhook from Clerk won't 500 the worker.
 */

const REPLAY_WINDOW_SECONDS = 5 * 60; // Svix default

export const clerkWebhookRoutes = new Hono<{ Bindings: Env }>();

clerkWebhookRoutes.post('/', async (c) => {
  const secret = c.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    // Endpoint isn't fully wired yet. Return 503 so Clerk surfaces
    // the issue in its dashboard's webhook delivery log instead of
    // silently swallowing events.
    return c.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Webhook secret not configured — wrangler secret put CLERK_WEBHOOK_SECRET',
        },
      },
      503,
    );
  }

  const svixId = c.req.header('svix-id') || '';
  const svixTimestamp = c.req.header('svix-timestamp') || '';
  const svixSignature = c.req.header('svix-signature') || '';
  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json(
      { ok: false, error: { code: 'BAD_REQUEST', message: 'Missing Svix headers' } },
      400,
    );
  }

  // Replay-window check.
  const nowSec = Math.floor(Date.now() / 1000);
  const tsSec = Number.parseInt(svixTimestamp, 10);
  if (!Number.isFinite(tsSec) || Math.abs(nowSec - tsSec) > REPLAY_WINDOW_SECONDS) {
    return c.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Timestamp outside replay window' } },
      401,
    );
  }

  const rawBody = await c.req.text();
  const expected = `${svixId}.${svixTimestamp}.${rawBody}`;

  // whsec_<base64> — strip prefix, base64-decode.
  const secretBytes = decodeWhsecSecret(secret);
  if (!secretBytes) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Webhook secret has wrong format (expected whsec_<base64>)',
        },
      },
      503,
    );
  }

  const verified = await verifySvixSignature(secretBytes, expected, svixSignature);
  if (!verified) {
    return c.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Bad Svix signature' } },
      401,
    );
  }

  // Parse + dispatch. Unknown events ack with 200 so Clerk doesn't
  // retry forever; we just log for visibility.
  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Body is not JSON' } }, 400);
  }

  const type = event.type || 'unknown';
  switch (type) {
    case 'user.updated':
      await handleUserUpdated(c.env, event.data as ClerkUser);
      break;
    case 'user.deleted':
      await handleUserDeleted(c.env, event.data as ClerkUserDeletedPayload);
      break;
    case 'session.removed':
    case 'session.revoked':
    case 'session.ended':
      await handleSessionEnded(c.env, type, event.data as ClerkSessionPayload);
      break;
    default:
      console.log(`clerk-webhook: ack unhandled event type "${type}" (svix-id ${svixId})`);
  }

  return c.json({ ok: true, data: { handled: type } });
});

// ── HMAC verification helpers ───────────────────────────────────────────

function decodeWhsecSecret(secret: string): Uint8Array | null {
  if (!secret.startsWith('whsec_')) return null;
  const b64 = secret.slice('whsec_'.length);
  try {
    // atob is available in CF Workers + browsers; not in Node ≤16 but
    // we run on Node 22+ for the API tests too.
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function verifySvixSignature(
  secretBytes: Uint8Array,
  signedPayload: string,
  signatureHeader: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expectedB64 = arrayBufferToBase64(sigBuf);

  // Header is space-separated list of "<scheme>,<sig>" pairs:
  //   "v1,abc... v1,def..."
  // We accept any v1 entry that matches in constant time.
  const tokens = signatureHeader.split(/\s+/).filter(Boolean);
  let anyMatch = false;
  for (const tok of tokens) {
    const [scheme, sig] = tok.split(',') as [string?, string?];
    if (scheme !== 'v1' || !sig) continue;
    if (constantTimeEqual(sig, expectedB64)) anyMatch = true;
  }
  return anyMatch;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ── Event handlers ──────────────────────────────────────────────────────

interface ClerkEmailAddress {
  id?: string;
  email_address?: string;
}

interface ClerkUser {
  id?: string;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmailAddress[];
  first_name?: string | null;
  last_name?: string | null;
}

interface ClerkUserDeletedPayload {
  id?: string;
  deleted?: boolean;
}

interface ClerkSessionPayload {
  id?: string;
  user_id?: string;
  status?: string;
}

function pickPrimaryEmail(user: ClerkUser): string | null {
  const primary = user.email_addresses?.find((e) => e.id === user.primary_email_address_id);
  return primary?.email_address || user.email_addresses?.[0]?.email_address || null;
}

async function handleUserUpdated(env: Env, payload: ClerkUser): Promise<void> {
  const clerkId = payload.id;
  if (!clerkId) return;
  const email = pickPrimaryEmail(payload);
  const displayName = [payload.first_name, payload.last_name].filter(Boolean).join(' ').trim();

  // Only update fields we know — preserve everything else in D1 (status,
  // tier, role, clinic_* fields that PTOwl owns).
  // .catch on the promise so a write failure doesn't 500 the webhook;
  // Clerk would retry indefinitely and we'd loop on the same error.
  await env.DB.prepare(
    `UPDATE users
       SET email = COALESCE(?, email),
           display_name = COALESCE(?, display_name)
     WHERE firebase_uid = ?`,
  )
    .bind(email, displayName || null, clerkId)
    .run()
    .catch((err) =>
      console.error(
        'clerk-webhook user.updated DB write failed:',
        err instanceof Error ? err.message : 'unknown',
      ),
    );
}

async function handleUserDeleted(env: Env, payload: ClerkUserDeletedPayload): Promise<void> {
  const clerkId = payload.id;
  if (!clerkId) return;
  // Soft-delete only. The audit_log row from the original signup stays
  // in place for forensics. Status='denied' makes the existing middleware
  // reject the user with ACCOUNT_DISABLED if they somehow re-appear with
  // the same Clerk id.
  await env.DB.prepare(`UPDATE users SET status = 'denied' WHERE firebase_uid = ?`)
    .bind(clerkId)
    .run()
    .catch((err) =>
      console.error(
        'clerk-webhook user.deleted DB write failed:',
        err instanceof Error ? err.message : 'unknown',
      ),
    );

  // Audit trail. Soft-delete via webhook is distinct from the
  // admin-decide-deny path — keep them legible in the log.
  await env.DB.prepare(
    'INSERT INTO audit_log (id, user_id, action, detail, ip_address) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(
      crypto.randomUUID().replace(/-/g, ''),
      clerkId,
      'clerk_user_deleted_webhook',
      `via Clerk Account Portal`,
      '',
    )
    .run()
    .catch((err) =>
      console.error(
        'clerk-webhook user.deleted audit write failed:',
        err instanceof Error ? err.message : 'unknown',
      ),
    );
}

async function handleSessionEnded(
  env: Env,
  eventType: string,
  payload: ClerkSessionPayload,
): Promise<void> {
  // Best-effort audit row. No D1 user-state change — Clerk owns sessions.
  const userId = payload.user_id;
  if (!userId) return;
  await env.DB.prepare(
    'INSERT INTO audit_log (id, user_id, action, detail, ip_address) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(
      crypto.randomUUID().replace(/-/g, ''),
      userId,
      `clerk_${eventType.replace('.', '_')}`,
      `session ${payload.id || '(unknown)'}, status=${payload.status || '(unknown)'}`,
      '',
    )
    .run()
    .catch((err) =>
      console.error(
        `clerk-webhook ${eventType} audit write failed:`,
        err instanceof Error ? err.message : 'unknown',
      ),
    );
}
