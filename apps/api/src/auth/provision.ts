import type { Env } from '../types/env.js';
import type { FirebaseClaims } from './firebase-verify.js';
import { DEFAULT_TEMPLATES, getTeamAliasName } from '@ptowl/shared';

export interface AuthUser {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  tier: string;
  status: string;
}

interface UserRow {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  tier: string;
  status: string;
  firebase_uid: string | null;
}

/**
 * Resolve a Firebase-authenticated request to a D1 user row, creating
 * one on first call. Lookup order:
 *
 *   1. SELECT WHERE firebase_uid = ?   (steady-state: every request
 *                                       after the user has been linked)
 *   2. SELECT WHERE phone = ?          (legacy users registered before
 *                                       the firebase_uid column existed
 *                                       — link them on first call)
 *   3. SELECT WHERE email = ?          (Firebase user signed in with
 *                                       Google/email-link who already
 *                                       has an account under the same
 *                                       email — link them on first call)
 *   4. INSERT new row                  (genuine first-time signup —
 *                                       phone, Google, email-link, or
 *                                       Apple, all share this path).
 */
export async function resolveOrProvisionUser(
  env: Env,
  claims: FirebaseClaims,
  ip: string,
): Promise<AuthUser | null> {
  // 1. Steady-state lookup
  const byUid = await env.DB.prepare(
    'SELECT id, email, phone, role, tier, status, firebase_uid FROM users WHERE firebase_uid = ?',
  )
    .bind(claims.sub)
    .first<UserRow>();
  if (byUid) return toAuthUser(byUid);

  // 2. Legacy phone-link
  if (claims.phone_number) {
    const byPhone = await env.DB.prepare(
      'SELECT id, email, phone, role, tier, status, firebase_uid FROM users WHERE phone = ?',
    )
      .bind(claims.phone_number)
      .first<UserRow>();
    if (byPhone) {
      await env.DB.prepare('UPDATE users SET firebase_uid = ? WHERE id = ?')
        .bind(claims.sub, byPhone.id)
        .run();
      return toAuthUser(byPhone);
    }
  }

  // 3. Email-link (skip placeholder emails so a phone user doesn't
  // accidentally collide with a separate Google identity).
  if (claims.email && !claims.email.endsWith('@phone.ptowl.local')) {
    const byEmail = await env.DB.prepare(
      'SELECT id, email, phone, role, tier, status, firebase_uid FROM users WHERE email = ?',
    )
      .bind(claims.email)
      .first<UserRow>();
    if (byEmail) {
      await env.DB.prepare('UPDATE users SET firebase_uid = ? WHERE id = ?')
        .bind(claims.sub, byEmail.id)
        .run();
      return toAuthUser(byEmail);
    }
  }

  // 4. First-time signup. Provision the full clinic shape.
  const phone = claims.phone_number || null;
  const userId = crypto.randomUUID().replace(/-/g, '');
  // Prefer the real email when Firebase gave us one (Google / email-link
  // / Apple). Fall back to a synthetic placeholder for phone-only users.
  const realEmail =
    claims.email && !claims.email.endsWith('@phone.ptowl.local') ? claims.email : null;
  const placeholderEmail =
    realEmail ||
    (phone ? `${phone.replace('+', '')}@phone.ptowl.local` : `${claims.sub}@firebase.ptowl.local`);
  const placeholderHash = crypto.randomUUID() + crypto.randomUUID();
  const teamAlias = phone ? getTeamAliasName(phone) : 'New Clinic';

  await env.DB.prepare(
    `INSERT INTO users
       (id, firebase_uid, email, password_hash, phone, display_name,
        status, role, tier, user_alias, user_type)
     VALUES (?, ?, ?, ?, ?, ?, 'approved', 'user', 'free', ?, 'clinic')`,
  )
    .bind(userId, claims.sub, placeholderEmail, placeholderHash, phone, '', teamAlias)
    .run();

  // Profile + default templates (mirror the legacy /firebase route).
  const profileId = crypto.randomUUID().replace(/-/g, '');
  await env.DB.prepare('INSERT INTO profiles (id, user_id) VALUES (?, ?)')
    .bind(profileId, userId)
    .run();

  for (const tmpl of DEFAULT_TEMPLATES) {
    const tmplId = crypto.randomUUID().replace(/-/g, '');
    await env.DB.prepare(
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

  await env.DB.prepare(
    'INSERT INTO audit_log (id, user_id, action, detail, ip_address) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(crypto.randomUUID().replace(/-/g, ''), userId, 'signup_firebase', phone || claims.sub, ip)
    .run();

  return {
    id: userId,
    email: placeholderEmail,
    phone,
    role: 'user',
    tier: 'free',
    status: 'approved',
  };
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    role: row.role,
    tier: row.tier,
    status: row.status,
  };
}
