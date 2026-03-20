import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { requireAuth, requireCSRF, requireClinic } from '../middleware/auth.js';

type Variables = {
  user: { id: string; email: string; role: string; tier: string; user_type?: string } | null;
};

export const codeRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// All code routes require auth + clinic user_type
codeRoutes.use('*', requireAuth, requireCSRF, requireClinic);

/**
 * Generate a random 4-character alphanumeric code (uppercase).
 * Prefixed with "PTOWL-" for display.
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 to avoid confusion
  let code = '';
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 4; i++) {
    code += chars[bytes[i]! % chars.length];
  }
  return `PTOWL-${code}`;
}

// POST /codes/:scheduleId — Generate a patient code for a schedule
codeRoutes.post('/:scheduleId', async (c) => {
  const user = c.get('user')!;
  const scheduleId = c.req.param('scheduleId');

  // Verify the schedule belongs to this user
  const schedule = await c.env.DB.prepare(
    'SELECT id FROM schedules WHERE id = ? AND user_id = ?',
  ).bind(scheduleId, user.id).first();

  if (!schedule) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } }, 404);
  }

  // Check if a code already exists for this schedule
  const existing = await c.env.DB.prepare(
    'SELECT id, code, created_at, expires_at FROM patient_codes WHERE schedule_id = ?',
  ).bind(scheduleId).first<{ id: string; code: string; created_at: string; expires_at: string | null }>();

  if (existing) {
    return c.json({ ok: true, data: existing });
  }

  // Generate a unique code (retry on collision)
  let code = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateCode();
    const collision = await c.env.DB.prepare(
      'SELECT id FROM patient_codes WHERE code = ?',
    ).bind(code).first();
    if (!collision) break;
    if (attempt === 4) {
      return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Could not generate unique code' } }, 500);
    }
  }

  const id = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare(
    'INSERT INTO patient_codes (id, schedule_id, code, created_by) VALUES (?, ?, ?, ?)',
  ).bind(id, scheduleId, code, user.id).run();

  return c.json({
    ok: true,
    data: { id, code, schedule_id: scheduleId, created_at: new Date().toISOString(), expires_at: null },
  });
});

// GET /codes/:scheduleId — Get existing code for a schedule
codeRoutes.get('/:scheduleId', async (c) => {
  const user = c.get('user')!;
  const scheduleId = c.req.param('scheduleId');

  // Verify the schedule belongs to this user
  const schedule = await c.env.DB.prepare(
    'SELECT id FROM schedules WHERE id = ? AND user_id = ?',
  ).bind(scheduleId, user.id).first();

  if (!schedule) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } }, 404);
  }

  const code = await c.env.DB.prepare(
    'SELECT id, code, created_at, expires_at FROM patient_codes WHERE schedule_id = ?',
  ).bind(scheduleId).first();

  if (!code) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'No code exists for this schedule' } }, 404);
  }

  return c.json({ ok: true, data: code });
});
