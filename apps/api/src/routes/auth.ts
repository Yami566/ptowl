import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthUser } from '../auth/provision.js';

type Variables = {
  user: AuthUser | null;
};

export const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── /auth/me ─────────────────────────────────────────────────
//
// Returns the authenticated user joined with their profile. The
// requireAuth middleware verifies the Firebase ID token from the
// Authorization: Bearer header and auto-provisions the D1 row on
// first call. By the time this handler runs, c.var.user is the
// canonical user shape.

authRoutes.get('/me', requireAuth, async (c) => {
  try {
    const user = c.get('user')!;
    const userData = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.phone, u.display_name, u.role, u.tier,
              p.clinic_name, p.clinic_address, p.clinic_phone, p.clinic_email, p.logo_url
         FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
        WHERE u.id = ?`,
    )
      .bind(user.id)
      .first();

    if (!userData) {
      return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }
    return c.json({ ok: true, data: userData });
  } catch (err) {
    console.error('Get user error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user' } },
      500,
    );
  }
});
