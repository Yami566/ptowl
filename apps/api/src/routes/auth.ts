import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import type { Env } from '../types/env.js';
import { signJWT, verifyJWTAllowExpired } from '../crypto/jwt.js';
import { generateSignedCSRFToken } from '../crypto/csrf.js';
import { requireAuth } from '../middleware/auth.js';

// All user authentication (register, login, password reset) now goes through Firebase.
// Frontend → Firebase SDK → Firebase ID token → /auth/firebase endpoint → PTOWL JWT session.
// This file only contains session management routes that still need to exist:
// - POST /logout  (clear cookie)
// - GET  /me      (fetch current user)
// - POST /refresh (renew JWT from signed-but-expired token)

type Variables = {
  user: { id: string; email: string; role: string; tier: string } | null;
};

export const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /logout
authRoutes.post('/logout', requireAuth, async (c) => {
  deleteCookie(c, 'token', { path: '/' });
  return c.json({ ok: true, data: { message: 'Logged out' } });
});

// GET /me
authRoutes.get('/me', requireAuth, async (c) => {
  try {
    const user = c.get('user')!;

    const userData = await c.env.DB.prepare(
      'SELECT u.id, u.email, u.display_name, u.role, u.tier, u.status, p.clinic_name, p.clinic_address, p.clinic_phone, p.clinic_email, p.logo_url FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?',
    )
      .bind(user.id)
      .first();

    if (!userData) {
      return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }

    return c.json({ ok: true, data: userData });
  } catch (err) {
    console.error('Get user error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user' } }, 500);
  }
});

// POST /refresh - Refresh JWT token (signature-verified, allows recently expired tokens)
authRoutes.post('/refresh', async (c) => {
  try {
    const token = getCookie(c, 'token');
    if (!token) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'No token' } }, 401);
    }

    // Verify signature but allow expired tokens (max 7 days old)
    const payload = await verifyJWTAllowExpired(token, c.env.JWT_SECRET, 604800);
    if (!payload) {
      deleteCookie(c, 'token', { path: '/' });
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
    }

    // Verify the user still exists and is approved
    const user = await c.env.DB.prepare('SELECT id, email, role, tier, status FROM users WHERE id = ?')
      .bind(payload.sub)
      .first<{ id: string; email: string; role: string; tier: string; status: string }>();

    if (!user || user.status !== 'approved') {
      deleteCookie(c, 'token', { path: '/' });
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } }, 401);
    }

    // Issue new JWT
    const newJwt = await signJWT(
      { sub: user.id, email: user.email, role: user.role, tier: user.tier },
      c.env.JWT_SECRET,
      900,
    );

    const csrfToken = await generateSignedCSRFToken(c.env.JWT_SECRET, user.id);

    const isProduction = c.env.ENVIRONMENT === 'production';
    setCookie(c, 'token', newJwt, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'Strict' : 'Lax',
      path: '/',
      maxAge: 604800, // 7 days — matches refresh window
    });

    return c.json({ ok: true, data: { csrfToken } });
  } catch (err) {
    console.error('Refresh error:', err instanceof Error ? err.message : 'Unknown error');
    deleteCookie(c, 'token', { path: '/' });
    return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } }, 401);
  }
});
