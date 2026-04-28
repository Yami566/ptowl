import { createMiddleware } from 'hono/factory';
import type { Env } from '../types/env.js';
import { verifyFirebaseIdToken } from '../auth/firebase-verify.js';
import { resolveOrProvisionUser, type AuthUser } from '../auth/provision.js';

type Variables = {
  user: AuthUser | null;
};

/**
 * requireAuth — verifies a Firebase ID token from the
 * `Authorization: Bearer ...` header on every request.
 *
 * On success, `c.get('user')` returns the D1 user row. On first
 * authenticated request (legacy user or genuine signup), the row is
 * auto-provisioned — see resolveOrProvisionUser.
 *
 * Replaces the previous JWT-cookie + /auth/refresh + /auth/firebase
 * dance (HOTFIX 2 stage A). Firebase's client SDK auto-refreshes the
 * ID token, so there's nothing to manage server-side.
 */
export const requireAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        401,
      );
    }

    const idToken = authHeader.slice('Bearer '.length).trim();
    const claims = await verifyFirebaseIdToken(idToken, c.env.FIREBASE_PROJECT_ID);
    if (!claims) {
      return c.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
        401,
      );
    }

    const ip = c.req.header('cf-connecting-ip') || '';
    const user = await resolveOrProvisionUser(c.env, claims, ip);
    if (!user) {
      return c.json(
        { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Could not resolve user' } },
        500,
      );
    }

    if (user.status === 'denied' || user.status === 'suspended') {
      return c.json(
        { ok: false, error: { code: 'ACCOUNT_DISABLED', message: 'Account has been disabled' } },
        403,
      );
    }

    c.set('user', user);
    await next();
  },
);

/**
 * requireAdmin — gated behind requireAuth. Re-checks the role against
 * the current D1 row so a downgrade takes effect immediately, rather
 * than waiting for a token to expire (Firebase ID tokens last 1h).
 *
 * The previous email-OTP verification bit was removed — Stage B
 * (HOTFIX 2) puts /admin behind Cloudflare Access, where the OTP step
 * happens at the edge before the request ever reaches the Worker.
 */
export const requireAdmin = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        401,
      );
    }
    const dbUser = await c.env.DB.prepare('SELECT role, status FROM users WHERE id = ?')
      .bind(user.id)
      .first<{ role: string; status: string }>();
    if (!dbUser || dbUser.role !== 'admin' || dbUser.status !== 'approved') {
      return c.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        403,
      );
    }
    await next();
  },
);

/**
 * requireClinic — kept as a separate middleware for symmetry with the
 * routes that mount it; identical to requireAuth now that the patient
 * portal is gone (every authenticated user is a clinic).
 */
export const requireClinic = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        401,
      );
    }
    await next();
  },
);
