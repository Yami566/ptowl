import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import type { Env } from '../types/env.js';
import { requireAuth, requireAdmin, requireCSRF } from '../middleware/auth.js';
import { signJWT } from '../crypto/jwt.js';
import { generateSignedCSRFToken } from '../crypto/csrf.js';
import { notifyUserApproved, notifyUserDenied, sendAdminVerificationCode } from '../services/email.js';

type Variables = {
  user: { id: string; email: string; role: string; tier: string; admin_verified?: boolean } | null;
};

export const adminRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Admin login is now handled by the normal phone auth flow.
// Admins log in like any user, then verify via email 2FA to access admin panel.

// POST /send-code - Generate and email a 6-digit verification code
adminRoutes.post('/send-code', requireAuth, async (c) => {
  try {
    const user = c.get('user')!;
    if (user.role !== 'admin') {
      return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
    }

    // Rate limit: max 3 codes per 5 minutes per user
    const recentCodes = await c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM admin_verification_codes
       WHERE user_id = ? AND created_at > datetime('now', '-5 minutes')`,
    )
      .bind(user.id)
      .first<{ cnt: number }>();

    if (recentCodes && recentCodes.cnt >= 3) {
      return c.json(
        { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many codes requested. Wait a few minutes.' } },
        429,
      );
    }

    // Invalidate any existing unused codes
    await c.env.DB.prepare(
      `UPDATE admin_verification_codes SET used_at = datetime('now')
       WHERE user_id = ? AND used_at IS NULL`,
    )
      .bind(user.id)
      .run();

    // Generate 6-digit code
    const codeArray = crypto.getRandomValues(new Uint8Array(4));
    const codeNum = ((codeArray[0]! << 16) | (codeArray[1]! << 8) | codeArray[2]!) % 1_000_000;
    const code = String(codeNum).padStart(6, '0');

    // Hash the code for storage (SHA-256)
    const codeBytes = new TextEncoder().encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', codeBytes);
    const codeHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Store hashed code with 5-minute expiry
    await c.env.DB.prepare(
      `INSERT INTO admin_verification_codes (id, user_id, code_hash, expires_at)
       VALUES (?, ?, ?, datetime('now', '+5 minutes'))`,
    )
      .bind(crypto.randomUUID().replace(/-/g, ''), user.id, codeHash)
      .run();

    // Send code to ADMIN_EMAIL (configured at infrastructure level)
    const adminEmail = c.env.ADMIN_EMAIL || '';
    c.executionCtx.waitUntil(
      sendAdminVerificationCode(c.env.EMAIL_API_KEY || '', adminEmail, code),
    );

    // Audit log
    await c.env.DB.prepare('INSERT INTO audit_log (id, user_id, action, detail, ip_address) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID().replace(/-/g, ''), user.id, 'admin_code_sent', adminEmail, c.req.header('cf-connecting-ip') || '')
      .run();

    return c.json({ ok: true, data: { message: 'Verification code sent' } });
  } catch (err) {
    console.error('Send code error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to send code' } }, 500);
  }
});

// POST /verify-code - Validate 6-digit code and grant admin session
adminRoutes.post('/verify-code', requireAuth, async (c) => {
  try {
    const user = c.get('user')!;
    if (user.role !== 'admin') {
      return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
    }

    const body = await c.req.json<{ code?: string }>();

    if (!body.code || body.code.length !== 6 || !/^\d{6}$/.test(body.code)) {
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Enter a 6-digit code' } }, 400);
    }

    // Hash the submitted code
    const codeBytes = new TextEncoder().encode(body.code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', codeBytes);
    const codeHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Look up valid code (not used, not expired)
    const record = await c.env.DB.prepare(
      `SELECT id FROM admin_verification_codes
       WHERE user_id = ? AND code_hash = ? AND used_at IS NULL
       AND expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 1`,
    )
      .bind(user.id, codeHash)
      .first<{ id: string }>();

    if (!record) {
      // Log failed attempt
      await c.env.DB.prepare('INSERT INTO audit_log (id, user_id, action, detail, ip_address) VALUES (?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID().replace(/-/g, ''), user.id, 'admin_code_failed', user.email, c.req.header('cf-connecting-ip') || '')
        .run();
      return c.json({ ok: false, error: { code: 'INVALID_CODE', message: 'Invalid or expired code. Request a new one.' } }, 400);
    }

    // Mark code as used
    await c.env.DB.prepare(
      `UPDATE admin_verification_codes SET used_at = datetime('now') WHERE id = ?`,
    )
      .bind(record.id)
      .run();

    // Issue full admin JWT with admin_verified flag
    const jwt = await signJWT(
      { sub: user.id, email: user.email, role: user.role, tier: user.tier, admin_verified: true },
      c.env.JWT_SECRET,
      1800, // 30 minutes
    );

    const csrfToken = await generateSignedCSRFToken(c.env.JWT_SECRET, user.id);

    const isProduction = c.env.ENVIRONMENT === 'production';
    setCookie(c, 'token', jwt, { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'Strict' : 'Lax', path: '/', maxAge: 1800 });

    // Audit log
    await c.env.DB.prepare('INSERT INTO audit_log (id, user_id, action, detail, ip_address) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID().replace(/-/g, ''), user.id, 'admin_verified', user.email, c.req.header('cf-connecting-ip') || '')
      .run();

    return c.json({ ok: true, data: { csrfToken } });
  } catch (err) {
    console.error('Verify code error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Verification failed' } }, 500);
  }
});

// GET /users - List all users (admin only)
adminRoutes.get('/users', requireAuth, requireAdmin, async (c) => {
  try {
    const users = await c.env.DB.prepare(
      'SELECT id, email, phone, display_name, user_alias, status, role, tier, user_type, created_at FROM users ORDER BY created_at DESC',
    ).all();

    return c.json({ ok: true, data: users.results });
  } catch (err) {
    console.error('List users error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' } }, 500);
  }
});

// POST /users/:id/approve - Approve user (CSRF required)
adminRoutes.post('/users/:id/approve', requireAuth, requireAdmin, requireCSRF, async (c) => {
  try {
    const userId = c.req.param('id');
    if (!/^[0-9a-f]{32}$/i.test(userId)) {
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid user ID' } }, 400);
    }

    const result = await c.env.DB.prepare(
      "UPDATE users SET status = 'approved', updated_at = datetime('now') WHERE id = ? AND status = 'pending'",
    )
      .bind(userId)
      .run();

    if (!result.meta.changes) {
      return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found or not pending' } }, 404);
    }

    const admin = c.get('user')!;
    await c.env.DB.prepare('INSERT INTO audit_log (id, user_id, action, detail) VALUES (?, ?, ?, ?)')
      .bind(crypto.randomUUID().replace(/-/g, ''), admin.id, 'approve_user', userId)
      .run();

    // Notify user their account was approved (fire-and-forget)
    const approvedUser = await c.env.DB.prepare('SELECT email, display_name FROM users WHERE id = ?')
      .bind(userId)
      .first<{ email: string; display_name: string }>();
    if (approvedUser) {
      c.executionCtx.waitUntil(
        notifyUserApproved(c.env.EMAIL_API_KEY || '', approvedUser.email, approvedUser.display_name),
      );
    }

    return c.json({ ok: true, data: { message: 'User approved' } });
  } catch (err) {
    console.error('Approve user error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to approve user' } }, 500);
  }
});

// POST /users/:id/deny - Deny user (CSRF required)
adminRoutes.post('/users/:id/deny', requireAuth, requireAdmin, requireCSRF, async (c) => {
  try {
    const userId = c.req.param('id');
    if (!/^[0-9a-f]{32}$/i.test(userId)) {
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid user ID' } }, 400);
    }

    const result = await c.env.DB.prepare(
      "UPDATE users SET status = 'denied', updated_at = datetime('now') WHERE id = ? AND status = 'pending'",
    )
      .bind(userId)
      .run();

    if (!result.meta.changes) {
      return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found or not pending' } }, 404);
    }

    const admin = c.get('user')!;
    await c.env.DB.prepare('INSERT INTO audit_log (id, user_id, action, detail) VALUES (?, ?, ?, ?)')
      .bind(crypto.randomUUID().replace(/-/g, ''), admin.id, 'deny_user', userId)
      .run();

    // Notify user their account was denied (fire-and-forget)
    const deniedUser = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?')
      .bind(userId)
      .first<{ email: string }>();
    if (deniedUser) {
      c.executionCtx.waitUntil(
        notifyUserDenied(c.env.EMAIL_API_KEY || '', deniedUser.email),
      );
    }

    return c.json({ ok: true, data: { message: 'User denied' } });
  } catch (err) {
    console.error('Deny user error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to deny user' } }, 500);
  }
});
