import { createMiddleware } from 'hono/factory';
import type { Env } from '../types/env.js';
import { verifyClerkSessionToken } from '../auth/clerk-verify.js';
import { resolveOrProvisionUser, type AuthUser } from '../auth/provision.js';

type Variables = {
  user: AuthUser | null;
};

/**
 * requireAuth — verifies a Clerk session JWT from the
 * `Authorization: Bearer ...` header on every request.
 *
 * On success, `c.get('user')` returns the D1 user row. On first
 * authenticated request, the row is auto-provisioned by
 * resolveOrProvisionUser using `claims.sub` (Clerk user ID like
 * `user_xxxxxxx`) stored in the `firebase_uid` column (legacy name,
 * kept until a follow-up migration renames it to `external_id`).
 *
 * Replaces the prior Firebase ID token verifier; Firebase users
 * provisioned before this commit will be re-onboarded as new Clerk
 * users on first sign-in. At <10 active clinics this is acceptable.
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

    const sessionToken = authHeader.slice('Bearer '.length).trim();
    const claims = await verifyClerkSessionToken(sessionToken, c.env.CLERK_FRONTEND_API_URL);
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

    // Distinct error code for accounts awaiting founder approval.
    // Frontend (AuthContext) routes these users to /awaiting-approval
    // instead of bouncing to the landing page, so they understand
    // why they cannot reach the dashboard yet.
    if (user.status === 'pending') {
      return c.json(
        {
          ok: false,
          error: { code: 'PENDING_APPROVAL', message: 'Account awaiting approval' },
        },
        403,
      );
    }

    c.set('user', user);
    await next();
  },
);

/**
 * requireClinic — identical to requireAuth now that the patient portal
 * and admin console are gone (every authenticated user is a clinic).
 * Kept as a separate name for symmetry with the routes that mount it.
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
