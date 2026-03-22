import { createMiddleware } from 'hono/factory';
import type { Env } from '../types/env.js';
import { verifyJWT } from '../crypto/jwt.js';
import { verifyCSRFToken } from '../crypto/csrf.js';
import { getCookie } from 'hono/cookie';

type Variables = {
  user: { id: string; email: string; role: string; tier: string; user_type?: string; admin_verified?: boolean } | null;
};

// Auth middleware: verifies JWT from httpOnly cookie
export const requireAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const token = getCookie(c, 'token');
    if (!token) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
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

// CSRF middleware: validates signed X-CSRF-Token header on state-mutating requests
export const requireCSRF = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const method = c.req.method;
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next();
    }

    const csrfToken = c.req.header('X-CSRF-Token');
    if (!csrfToken) {
      return c.json({ ok: false, error: { code: 'CSRF_MISSING', message: 'CSRF token required' } }, 403);
    }

    const user = c.get('user');
    if (!user) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const valid = await verifyCSRFToken(csrfToken, c.env.JWT_SECRET, user.id);
    if (!valid) {
      return c.json({ ok: false, error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token' } }, 403);
    }

    await next();
  },
);

// Admin middleware: requires admin role + email 2FA verification
export const requireAdmin = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const user = c.get('user');
    if (!user || user.role !== 'admin') {
      return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, 403);
    }
    if (!user.admin_verified) {
      return c.json({ ok: false, error: { code: 'ADMIN_2FA_REQUIRED', message: '2FA verification required' } }, 403);
    }
    // H6 FIX: Revalidate admin role against DB (JWT could be stale)
    const dbUser = await c.env.DB.prepare('SELECT role, status FROM users WHERE id = ?')
      .bind(user.id)
      .first<{ role: string; status: string }>();
    if (!dbUser || dbUser.role !== 'admin' || dbUser.status !== 'approved') {
      return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Admin access revoked' } }, 403);
    }
    await next();
  },
);

// Clinic-only middleware: requires user_type === 'clinic'
export const requireClinic = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }
    // Block patients explicitly; legacy users without user_type default to clinic
    if (user.user_type === 'patient') {
      return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } }, 403);
    }
    await next();
  },
);

// Patient-only middleware: requires user_type === 'patient'
export const requirePatient = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }
    if (user.user_type !== 'patient') {
      return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Patient access required' } }, 403);
    }
    await next();
  },
);
