import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import type { Env } from '../types/env.js';
import { signJWT } from '../crypto/jwt.js';
import { generateSignedCSRFToken } from '../crypto/csrf.js';
import { verifyFirebaseToken } from '../auth/firebase-verify.js';
import { DEFAULT_TEMPLATES } from '@ptowl/shared';

type Variables = {
  user: { id: string; email: string; role: string; tier: string } | null;
};

export const firebaseAuthRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /firebase — Exchange Firebase ID token for a PTOWL JWT session
firebaseAuthRoutes.post('/firebase', async (c) => {
  try {
    const body = await c.req.json<{ idToken?: string; displayName?: string }>();

    if (!body.idToken) {
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Firebase ID token required' } }, 400);
    }

    // Verify the Firebase token
    let firebaseUser;
    try {
      firebaseUser = await verifyFirebaseToken(body.idToken, c.env.FIREBASE_PROJECT_ID);
    } catch (err) {
      console.error('Firebase token verification failed:', err instanceof Error ? err.message : 'Unknown');
      return c.json({ ok: false, error: { code: 'AUTH_FAILED', message: 'Invalid or expired token' } }, 401);
    }

    const identifier = firebaseUser.email || firebaseUser.phone_number;
    if (!identifier) {
      return c.json({ ok: false, error: { code: 'AUTH_FAILED', message: 'No email or phone number in token' } }, 400);
    }

    // Look up user by Firebase UID in oauth_accounts
    const oauthAccount = await c.env.DB.prepare(
      'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?',
    )
      .bind(firebaseUser.firebase.sign_in_provider === 'phone' ? 'phone' : 'google', firebaseUser.uid)
      .first<{ user_id: string }>();

    let userId: string;
    let isNewUser = false;

    if (oauthAccount) {
      // Existing OAuth-linked user
      userId = oauthAccount.user_id;
    } else {
      // Check if a user with this email already exists (link accounts)
      let existingUser = null;
      if (firebaseUser.email) {
        existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
          .bind(firebaseUser.email.toLowerCase())
          .first<{ id: string }>();
      }

      if (existingUser) {
        // Link OAuth account to existing user
        userId = existingUser.id;
        const oauthId = crypto.randomUUID().replace(/-/g, '');
        await c.env.DB.prepare(
          'INSERT OR IGNORE INTO oauth_accounts (id, user_id, provider, provider_user_id, provider_email) VALUES (?, ?, ?, ?, ?)',
        ).bind(
          oauthId,
          userId,
          firebaseUser.firebase.sign_in_provider === 'phone' ? 'phone' : 'google',
          firebaseUser.uid,
          identifier,
        ).run();
      } else {
        // Create new user
        isNewUser = true;
        userId = crypto.randomUUID().replace(/-/g, '');
        const displayName = body.displayName?.trim().slice(0, 50) || firebaseUser.name || identifier.split('@')[0] || '';

        // Random unguessable password hash for OAuth-only users
        const placeholderHash = crypto.randomUUID() + crypto.randomUUID();

        await c.env.DB.prepare(
          'INSERT INTO users (id, email, password_hash, display_name, status, role, tier) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).bind(userId, (firebaseUser.email || `phone:${firebaseUser.phone_number}`).toLowerCase(), placeholderHash, displayName, 'pending', 'user', 'free').run();

        // Create profile
        const profileId = crypto.randomUUID().replace(/-/g, '');
        await c.env.DB.prepare('INSERT INTO profiles (id, user_id) VALUES (?, ?)').bind(profileId, userId).run();

        // Seed default templates
        for (const tmpl of DEFAULT_TEMPLATES) {
          const tmplId = crypto.randomUUID().replace(/-/g, '');
          await c.env.DB.prepare(
            'INSERT INTO templates (id, user_id, hotkey, name, sessions_per_week, duration_weeks, default_time, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ).bind(tmplId, userId, tmpl.hotkey, tmpl.name, tmpl.sessions_per_week, tmpl.duration_weeks, tmpl.default_time, tmpl.hotkey).run();
        }

        // Link OAuth account
        const oauthId = crypto.randomUUID().replace(/-/g, '');
        await c.env.DB.prepare(
          'INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, provider_email) VALUES (?, ?, ?, ?, ?)',
        ).bind(
          oauthId,
          userId,
          firebaseUser.firebase.sign_in_provider === 'phone' ? 'phone' : 'google',
          firebaseUser.uid,
          identifier,
        ).run();

        // Audit log
        await c.env.DB.prepare('INSERT INTO audit_log (id, user_id, action, detail, ip_address) VALUES (?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID().replace(/-/g, ''), userId, 'register_firebase', identifier, c.req.header('cf-connecting-ip') || '')
          .run();
      }
    }

    // Fetch user data
    const user = await c.env.DB.prepare(
      'SELECT id, email, display_name, status, role, tier FROM users WHERE id = ?',
    ).bind(userId).first<{ id: string; email: string; display_name: string; status: string; role: string; tier: string }>();

    if (!user) {
      return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'User not found' } }, 500);
    }

    // Check account status
    if (user.status === 'denied' || user.status === 'suspended') {
      return c.json({ ok: false, error: { code: 'ACCOUNT_DISABLED', message: 'Account has been disabled' } }, 403);
    }

    // Audit log login
    await c.env.DB.prepare('INSERT INTO audit_log (id, user_id, action, detail, ip_address) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID().replace(/-/g, ''), userId, 'login_firebase', identifier, c.req.header('cf-connecting-ip') || '')
      .run();

    // Sign JWT
    const token = await signJWT(
      { sub: user.id, email: user.email, role: user.role, tier: user.tier },
      c.env.JWT_SECRET,
      15 * 60, // 15 min
    );

    // CSRF token
    const csrfToken = await generateSignedCSRFToken(c.env.JWT_SECRET, user.id);

    // Set cookies
    const isProduction = c.env.ENVIRONMENT === 'production';
    setCookie(c, 'token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'Lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
    setCookie(c, 'refresh_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'Lax',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60,
    });

    // Load profile for response
    const profile = await c.env.DB.prepare(
      'SELECT clinic_name, clinic_address, clinic_phone, clinic_email, logo_url FROM profiles WHERE user_id = ?',
    ).bind(userId).first();

    return c.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
          tier: user.tier,
          clinic_name: profile?.clinic_name || '',
          clinic_address: profile?.clinic_address || '',
          clinic_phone: profile?.clinic_phone || '',
          clinic_email: profile?.clinic_email || '',
          logo_url: profile?.logo_url || null,
        },
        csrfToken,
        isNewUser,
      },
    });
  } catch (err) {
    console.error('Firebase auth error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' } }, 500);
  }
});
