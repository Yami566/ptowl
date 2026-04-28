import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import type { Env } from '../types/env.js';
import { signJWT, verifyJWTAllowExpired } from '../crypto/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { notifyAdminNewRegistration } from '../services/email.js';
import { DEFAULT_TEMPLATES, getTeamAliasName } from '@ptowl/shared';

// Session duration: 14 days (in seconds)
const SESSION_MAX_AGE = 14 * 24 * 60 * 60; // 1_209_600

// Google's public key endpoint for Firebase ID token verification
const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

type Variables = {
  user: { id: string; email: string; role: string; tier: string } | null;
};

export const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Firebase ID Token Verification ────────────────────────────

interface FirebaseTokenPayload {
  sub: string;
  phone_number?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

/**
 * Verify a Firebase ID token using Google's public JWKS.
 * Returns the decoded payload if valid, null otherwise.
 */
async function verifyFirebaseToken(
  idToken: string,
  projectId: string,
): Promise<FirebaseTokenPayload | null> {
  try {
    // Decode header to get kid
    const [headerB64] = idToken.split('.');
    if (!headerB64) return null;
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    const kid = header.kid;
    if (!kid) return null;

    // Fetch Google's public keys
    const jwksResponse = await fetch(FIREBASE_JWKS_URL);
    if (!jwksResponse.ok) return null;
    const jwks = (await jwksResponse.json()) as {
      keys: Array<{ kid: string; n: string; e: string; kty: string; alg: string }>;
    };
    const jwk = jwks.keys.find((k: { kid: string }) => k.kid === kid);
    if (!jwk) return null;

    // Import the public key
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    // Verify signature
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;

    const signatureInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = Uint8Array.from(atob(parts[2]!.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
      c.charCodeAt(0),
    );

    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signatureInput);
    if (!valid) return null;

    // Decode and validate payload
    const payload = JSON.parse(
      atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')),
    ) as FirebaseTokenPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    if (payload.iat > now + 60) return null; // allow 60s clock skew
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (payload.aud !== projectId) return null;
    if (!payload.sub) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Normalize a phone number to E.164 format (+1XXXXXXXXXX for US).
 */
function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  // Already in E.164 with country code
  if (phone.startsWith('+') && digits.length >= 10) return `+${digits}`;
  return null;
}

// ─── Firebase Phone Auth ────────────────────────────────────

// POST /firebase — Exchange Firebase ID token for session
authRoutes.post('/firebase', async (c) => {
  try {
    const body = await c.req.json<{
      idToken?: string;
      rememberMe?: boolean;
      user_type?: 'clinic' | 'patient';
    }>();
    if (!body.idToken) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'ID token required' } },
        400,
      );
    }
    const rememberMe = body.rememberMe !== false; // default true for backwards compat

    // Verify the Firebase ID token
    const payload = await verifyFirebaseToken(body.idToken, c.env.FIREBASE_PROJECT_ID);
    if (!payload) {
      return c.json(
        { ok: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } },
        401,
      );
    }

    // Extract phone number from Firebase token
    const rawPhone = payload.phone_number;
    if (!rawPhone) {
      return c.json(
        { ok: false, error: { code: 'INVALID_TOKEN', message: 'No phone number in token' } },
        400,
      );
    }

    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid phone number' } },
        400,
      );
    }

    const userType = body.user_type === 'patient' ? 'patient' : 'clinic';

    // Look up user by phone
    let user = await c.env.DB.prepare(
      'SELECT id, email, phone, display_name, status, role, tier, user_type FROM users WHERE phone = ?',
    )
      .bind(phone)
      .first<{
        id: string;
        email: string;
        phone: string;
        display_name: string;
        status: string;
        role: string;
        tier: string;
        user_type: string;
      }>();

    let isNewUser = false;

    if (!user) {
      // New user — create account
      isNewUser = true;
      const userId = crypto.randomUUID().replace(/-/g, '');
      const placeholderHash = crypto.randomUUID() + crypto.randomUUID();
      const placeholderEmail = `${phone.replace('+', '')}@phone.ptowl.local`;

      // Assign a championship team alias for PII-safe admin notifications
      const teamAlias = getTeamAliasName(phone);

      // Auto-approve every new signup. The legacy admin-approval gate
      // stranded new clinics on /pending until an admin clicked the
      // approval email, which made the dashboard appear broken on first
      // login. Admin still gets the new-registration notification below
      // for visibility — the "approve" link is a harmless no-op.
      const initialStatus = 'approved';

      await c.env.DB.prepare(
        'INSERT INTO users (id, email, password_hash, phone, display_name, status, role, tier, user_alias, user_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          userId,
          placeholderEmail,
          placeholderHash,
          phone,
          '',
          initialStatus,
          'user',
          'free',
          teamAlias,
          userType,
        )
        .run();

      // Clinic users get a profile and default templates; patients don't need them
      if (userType !== 'patient') {
        const profileId = crypto.randomUUID().replace(/-/g, '');
        await c.env.DB.prepare('INSERT INTO profiles (id, user_id) VALUES (?, ?)')
          .bind(profileId, userId)
          .run();

        for (const tmpl of DEFAULT_TEMPLATES) {
          const tmplId = crypto.randomUUID().replace(/-/g, '');
          await c.env.DB.prepare(
            'INSERT INTO templates (id, user_id, hotkey, name, sessions_per_week, duration_weeks, default_time, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          )
            .bind(
              tmplId,
              userId,
              tmpl.hotkey,
              tmpl.name,
              tmpl.sessions_per_week,
              tmpl.duration_weeks,
              tmpl.default_time,
              tmpl.hotkey,
            )
            .run();
        }
      }

      // Audit log
      await c.env.DB.prepare(
        'INSERT INTO audit_log (id, user_id, action, detail, ip_address) VALUES (?, ?, ?, ?, ?)',
      )
        .bind(
          crypto.randomUUID().replace(/-/g, ''),
          userId,
          'register_phone',
          phone,
          c.req.header('cf-connecting-ip') || '',
        )
        .run();

      // Only notify admin and generate approval link for clinic providers
      if (userType !== 'patient') {
        const approvalPayload = `${userId}:${Date.now() + 7 * 24 * 60 * 60 * 1000}`;
        const encoder = new TextEncoder();
        const hmacKey = await crypto.subtle.importKey(
          'raw',
          encoder.encode(c.env.JWT_SECRET),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign'],
        );
        const sig = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(approvalPayload));
        const sigHex = Array.from(new Uint8Array(sig))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        const approvalToken = btoa(`${approvalPayload}:${sigHex}`)
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        const approvalUrl = `${c.env.FRONTEND_URL}/api/v1/auth/approve/${approvalToken}`;

        notifyAdminNewRegistration(
          c.env.ADMIN_EMAIL || '',
          c.env.EMAIL_API_KEY || '',
          teamAlias,
          approvalUrl,
        );
      }

      // Re-fetch user
      user = await c.env.DB.prepare(
        'SELECT id, email, phone, display_name, status, role, tier, user_type FROM users WHERE id = ?',
      )
        .bind(userId)
        .first();
    }

    if (!user) {
      return c.json(
        { ok: false, error: { code: 'INTERNAL_ERROR', message: 'User not found' } },
        500,
      );
    }

    // Check account status
    if (user.status === 'denied' || user.status === 'suspended') {
      return c.json(
        { ok: false, error: { code: 'ACCOUNT_DISABLED', message: 'Account has been disabled' } },
        403,
      );
    }

    // Audit log login
    if (!isNewUser) {
      await c.env.DB.prepare(
        'INSERT INTO audit_log (id, user_id, action, detail, ip_address) VALUES (?, ?, ?, ?, ?)',
      )
        .bind(
          crypto.randomUUID().replace(/-/g, ''),
          user.id,
          'login_phone',
          phone,
          c.req.header('cf-connecting-ip') || '',
        )
        .run();
    }

    // Sign JWT (15 min token, refreshable for 14 days)
    const token = await signJWT(
      {
        sub: user.id,
        email: user.email || '',
        role: user.role,
        tier: user.tier,
        user_type: user.user_type || 'clinic',
      },
      c.env.JWT_SECRET,
      15 * 60,
    );

    // Set cookie — persistent (14 days) or session-only based on rememberMe
    const isProduction = c.env.ENVIRONMENT === 'production';
    setCookie(c, 'token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'Strict' : 'Lax',
      path: '/',
      maxAge: SESSION_MAX_AGE, // Always persist for 14 days (auto-login on return)
    });

    // Load profile
    const profile = await c.env.DB.prepare(
      'SELECT clinic_name, clinic_address, clinic_phone, clinic_email, logo_url FROM profiles WHERE user_id = ?',
    )
      .bind(user.id)
      .first();

    return c.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email || '',
          phone: user.phone,
          display_name: user.display_name,
          status: user.status,
          role: user.role,
          tier: user.tier,
          user_type: user.user_type || 'clinic',
          clinic_name: profile?.clinic_name || '',
          clinic_address: profile?.clinic_address || '',
          clinic_phone: profile?.clinic_phone || '',
          clinic_email: profile?.clinic_email || '',
          logo_url: profile?.logo_url || null,
        },
        isNewUser,
      },
    });
  } catch (err) {
    console.error('Firebase auth error:', err instanceof Error ? err.message : 'Unknown');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' } },
      500,
    );
  }
});

// ─── Session Management ──────────────────────────────────────

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
      'SELECT u.id, u.email, u.phone, u.display_name, u.role, u.tier, u.status, u.user_type, p.clinic_name, p.clinic_address, p.clinic_phone, p.clinic_email, p.logo_url FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?',
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

// POST /refresh — Renew JWT from signed-but-expired token (14-day window)
authRoutes.post('/refresh', async (c) => {
  try {
    const token = getCookie(c, 'token');
    if (!token) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'No token' } }, 401);
    }

    // Verify signature but allow expired tokens (max 14 days old)
    const payload = await verifyJWTAllowExpired(token, c.env.JWT_SECRET, SESSION_MAX_AGE);
    if (!payload) {
      deleteCookie(c, 'token', { path: '/' });
      return c.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } },
        401,
      );
    }

    // Verify the user still exists and is approved
    const user = await c.env.DB.prepare(
      'SELECT id, email, role, tier, status, user_type FROM users WHERE id = ?',
    )
      .bind(payload.sub)
      .first<{
        id: string;
        email: string;
        role: string;
        tier: string;
        status: string;
        user_type: string;
      }>();

    if (!user || user.status === 'denied' || user.status === 'suspended') {
      deleteCookie(c, 'token', { path: '/' });
      return c.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } },
        401,
      );
    }

    // Issue new JWT
    const newJwt = await signJWT(
      {
        sub: user.id,
        email: user.email || '',
        role: user.role,
        tier: user.tier,
        user_type: user.user_type || 'clinic',
      },
      c.env.JWT_SECRET,
      900,
    );

    const isProduction = c.env.ENVIRONMENT === 'production';
    setCookie(c, 'token', newJwt, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'Strict' : 'Lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return c.json({ ok: true, data: { refreshed: true } });
  } catch (err) {
    console.error('Refresh error:', err instanceof Error ? err.message : 'Unknown error');
    deleteCookie(c, 'token', { path: '/' });
    return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } }, 401);
  }
});

// ─── One-Click Approval ─────────────────────────────────────

// GET /approve/:token — Admin clicks this link from email to approve a user
authRoutes.get('/approve/:token', async (c) => {
  try {
    const token = c.req.param('token');

    // Decode the base64url token
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const parts = decoded.split(':');
    if (parts.length !== 3) {
      return c.html(approvalPage('Invalid Link', 'This approval link is malformed.', false));
    }

    const [userId, expiresStr, sigHex] = parts;

    // Verify expiry
    const expires = parseInt(expiresStr!, 10);
    if (Date.now() > expires) {
      return c.html(
        approvalPage(
          'Link Expired',
          'This approval link has expired. Please use the admin panel.',
          false,
        ),
      );
    }

    // Verify HMAC signature
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

    // Approve the user
    const result = await c.env.DB.prepare(
      "UPDATE users SET status = 'approved', updated_at = datetime('now') WHERE id = ? AND status = 'pending'",
    )
      .bind(userId)
      .run();

    if (!result.meta.changes) {
      // User might already be approved
      const existing = await c.env.DB.prepare('SELECT status, user_alias FROM users WHERE id = ?')
        .bind(userId)
        .first<{ status: string; user_alias: string }>();
      if (existing?.status === 'approved') {
        return c.html(
          approvalPage(
            'Already Approved',
            `${existing.user_alias || 'This user'} was already approved.`,
            true,
          ),
        );
      }
      return c.html(
        approvalPage('User Not Found', 'Could not find a pending user with this ID.', false),
      );
    }

    // Get the alias for the confirmation
    const user = await c.env.DB.prepare('SELECT user_alias FROM users WHERE id = ?')
      .bind(userId)
      .first<{ user_alias: string }>();

    // Audit log
    await c.env.DB.prepare(
      'INSERT INTO audit_log (id, user_id, action, detail, ip_address) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(
        crypto.randomUUID().replace(/-/g, ''),
        userId!,
        'approve_user_link',
        'One-click approval',
        c.req.header('cf-connecting-ip') || '',
      )
      .run();

    return c.html(
      approvalPage(
        'Approved!',
        `${user?.user_alias || 'User'} has been approved and can now access PtOwl.`,
        true,
      ),
    );
  } catch (err) {
    console.error('Approval error:', err instanceof Error ? err.message : 'Unknown');
    return c.html(
      approvalPage('Error', 'Something went wrong. Try the admin panel instead.', false),
    );
  }
});

/** Simple HTML page for approval link responses (renders nicely on mobile) */
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
