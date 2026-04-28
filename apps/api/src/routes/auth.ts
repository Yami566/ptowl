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
// requireAuth middleware (apps/api/src/middleware/auth.ts) verifies
// the Firebase ID token from the Authorization: Bearer header and
// auto-provisions the D1 row on first call. By the time this
// handler runs, c.var.user is the canonical user shape.

authRoutes.get('/me', requireAuth, async (c) => {
  try {
    const user = c.get('user')!;
    const userData = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.phone, u.display_name, u.role, u.tier, u.status,
              u.user_type,
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

// ─── /auth/approve/:token ─────────────────────────────────────
//
// Legacy admin one-click approval link. Every new signup is
// auto-approved (apps/api/src/auth/provision.ts), so this endpoint
// is a no-op safety net for old emails still in inboxes — clicking
// the link finds the user already approved and shows a friendly
// confirmation page. Kept rather than deleted so old emails don't
// 404; will be removed once admin email is decommissioned.

authRoutes.get('/approve/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const parts = decoded.split(':');
    if (parts.length !== 3) {
      return c.html(approvalPage('Invalid Link', 'This approval link is malformed.', false));
    }

    const [userId, expiresStr, sigHex] = parts;
    const expires = parseInt(expiresStr!, 10);
    if (Date.now() > expires) {
      return c.html(
        approvalPage(
          'Link Expired',
          'This approval link has expired. Use the admin panel instead.',
          false,
        ),
      );
    }

    const encoder = new TextEncoder();
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(c.env.JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const payload = `${userId}:${expiresStr}`;
    const expectedSig = Uint8Array.from((sigHex!.match(/.{2}/g) || []).map((h) => parseInt(h, 16)));
    const valid = await crypto.subtle.verify('HMAC', hmacKey, expectedSig, encoder.encode(payload));
    if (!valid) {
      return c.html(approvalPage('Invalid Link', 'This approval link is invalid.', false));
    }

    // No-op UPDATE — every new signup is already 'approved'. The query
    // is kept so this endpoint stays idempotent if approval ever
    // becomes manual again.
    await c.env.DB.prepare(
      "UPDATE users SET status = 'approved', updated_at = datetime('now') WHERE id = ? AND status = 'pending'",
    )
      .bind(userId)
      .run();

    const user = await c.env.DB.prepare('SELECT user_alias, status FROM users WHERE id = ?')
      .bind(userId)
      .first<{ user_alias: string; status: string }>();
    if (!user) {
      return c.html(approvalPage('User Not Found', 'No user matches this link.', false));
    }
    return c.html(
      approvalPage('Approved!', `${user.user_alias || 'User'} can access PtOwl.`, true),
    );
  } catch (err) {
    console.error('Approval error:', err instanceof Error ? err.message : 'Unknown');
    return c.html(approvalPage('Error', 'Something went wrong. Try the admin panel.', false));
  }
});

function approvalPage(title: string, message: string, success: boolean): string {
  const color = success ? '#4CAF50' : '#F44336';
  const icon = success ? '&#10004;' : '&#10006;';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PtOwl - ${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #F5F5F5; }
    .card { background: white; border-radius: 16px; padding: 3rem; text-align: center; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .icon { font-size: 3rem; color: ${color}; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; color: #333; margin-bottom: 0.5rem; }
    p { color: #666; line-height: 1.6; }
    a { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #4CAF50; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://ptowl.com/admin">Open Admin Panel</a>
  </div>
</body>
</html>`;
}
