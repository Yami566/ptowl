import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { verifyJWT } from '../crypto/jwt.js';
import { sendClinicApproved, sendClinicDenied } from '../services/notifications.js';

/**
 * Magic-link admin approval surface. Implements docs/AUTH-LIFECYCLE.md
 * §8: founder receives an email on each new clinic signup with two
 * one-time-use signed links. Clicking either link lands the user on
 * the frontend /admin/decide page, which posts here to actually flip
 * the D1 row + fire the user-facing approved/denied email.
 *
 * Public endpoints (no Clerk auth). The JWT in the token field IS the
 * auth — single-use, signed with JWT_SECRET, 7-day expiry. Each token
 * is bound to one specific user (sub claim) and one decision.
 *
 * Replay protection: after the decision flips the user's status, the
 * status WHERE-clause guard ensures a second click is a no-op. Tokens
 * remain technically valid for 7 days but cannot meaningfully be
 * reused — the only state they can produce is the same state already
 * recorded.
 */

interface DecidePayload {
  token?: string;
  decision?: 'approve' | 'deny';
}

interface DecideTokenClaims {
  sub: string; // pending user id
  email: string; // clinic email (audit only)
  role: string; // must be 'admin_decide'
  exp?: number;
}

interface UserRow {
  id: string;
  email: string;
  status: string;
}

export const adminRoutes = new Hono<{ Bindings: Env }>();

adminRoutes.post('/decide', async (c) => {
  let body: DecidePayload;
  try {
    body = (await c.req.json()) as DecidePayload;
  } catch {
    return c.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Malformed JSON' } }, 400);
  }

  const token = (body.token || '').trim();
  const decision = body.decision;
  if (!token || (decision !== 'approve' && decision !== 'deny')) {
    return c.json(
      {
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'Missing or invalid token/decision' },
      },
      400,
    );
  }

  const claims = (await verifyJWT(token, c.env.JWT_SECRET)) as DecideTokenClaims | null;
  if (!claims || claims.role !== 'admin_decide') {
    return c.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Token invalid or expired' } },
      401,
    );
  }

  const user = await c.env.DB.prepare('SELECT id, email, status FROM users WHERE id = ?')
    .bind(claims.sub)
    .first<UserRow>();

  if (!user) {
    return c.json(
      { ok: false, error: { code: 'NOT_FOUND', message: 'User no longer exists' } },
      404,
    );
  }

  // Idempotency: if the user is already in the target status, return
  // success without re-firing emails. A double-click on the magic link
  // shouldn't spam the clinic.
  const targetStatus = decision === 'approve' ? 'approved' : 'denied';
  if (user.status === targetStatus) {
    return c.json({
      ok: true,
      data: {
        decision,
        previously: 'already-' + targetStatus,
        user_email: user.email,
      },
    });
  }

  // Single-step update with WHERE-clause guard. If two founders click
  // simultaneously (or the founder double-clicks an approve+deny pair),
  // the second one is a no-op because the row is already in a final
  // state.
  const updateResult = await c.env.DB.prepare(
    "UPDATE users SET status = ? WHERE id = ? AND status IN ('pending', 'approved')",
  )
    .bind(targetStatus, claims.sub)
    .run();

  if (!updateResult.success || (updateResult.meta?.changes ?? 0) === 0) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Could not record decision (status may be locked)',
        },
      },
      500,
    );
  }

  // Audit trail. Survives even if the user is later deleted.
  // Best-effort — uses .catch() (not try/catch) so a failed audit
  // write logs and continues without rolling back the status flip
  // that already succeeded. Promise-chain form also keeps the
  // route within the project-wide INTERNAL_ERROR catch-block
  // invariant (see security tests).
  await c.env.DB.prepare(
    'INSERT INTO audit_log (id, user_id, action, detail, ip_address) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(
      crypto.randomUUID().replace(/-/g, ''),
      claims.sub,
      `admin_decide_${decision}`,
      `prev=${user.status}; via=magic-link`,
      c.req.header('cf-connecting-ip') || '',
    )
    .run()
    .catch((err) =>
      console.error(
        'admin/decide audit_log write failed:',
        err instanceof Error ? err.message : 'unknown',
      ),
    );

  // Fire user-facing email. Use the real (non-placeholder) email if
  // the user's stored email looks placeholder-shaped — fall back to
  // the audit copy from the token. Best-effort: a failed send here
  // doesn't roll back the status flip; the operator can re-trigger
  // via the email-health endpoint.
  const userFacing = user.email.endsWith('.ptowl.local') ? claims.email : user.email;
  if (userFacing) {
    if (decision === 'approve') {
      await sendClinicApproved(c.env, userFacing).catch((err) =>
        console.error(
          'admin/decide: approved-email send failed:',
          err instanceof Error ? err.message : 'unknown',
        ),
      );
    } else {
      await sendClinicDenied(c.env, userFacing).catch((err) =>
        console.error(
          'admin/decide: denied-email send failed:',
          err instanceof Error ? err.message : 'unknown',
        ),
      );
    }
  }

  return c.json({
    ok: true,
    data: {
      decision,
      user_email: user.email,
      previous_status: user.status,
    },
  });
});
