import { createMiddleware } from 'hono/factory';
import type { Env } from '../types/env.js';
import { verifyJWT } from '../crypto/jwt.js';
import { getCookie } from 'hono/cookie';

type Variables = {
  user: {
    id: string;
    email: string;
    role: string;
    tier: string;
    user_type?: string;
    admin_verified?: boolean;
  } | null;
};

// Auth middleware: verifies JWT from httpOnly cookie
export const requireAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const token = getCookie(c, 'token');
    if (!token) {
      return c.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        401,
      );
    }

    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
        401,
      );
    }

    c.set('user', {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tier: payload.tier,
      user_type: (payload as Record<string, unknown>).user_type as string | undefined,
      admin_verified: payload.admin_verified,
    });

    await next();
  },
);

// Admin middleware: requires admin role + email 2FA verification
export const requireAdmin = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const user = c.get('user');
    if (!user || user.role !== 'admin') {
      return c.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        403,
      );
    }
    if (!user.admin_verified) {
      return c.json(
        { ok: false, error: { code: 'ADMIN_2FA_REQUIRED', message: '2FA verification required' } },
        403,
      );
    }
    // H6 FIX: Revalidate admin role against DB (JWT could be stale)
    const dbUser = await c.env.DB.prepare('SELECT role, status FROM users WHERE id = ?')
      .bind(user.id)
      .first<{ role: string; status: string }>();
    if (!dbUser || dbUser.role !== 'admin' || dbUser.status !== 'approved') {
      return c.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Admin access revoked' } },
        403,
      );
    }
    await next();
  },
);

// Clinic-only middleware: requires an authenticated user. The legacy
// patient_type='patient' branch was dropped along with the patient
// portal — every authenticated user is a clinic.
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
