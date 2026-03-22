import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { requireAuth, requirePatient, requireCSRF } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import { linkCodeSchema } from '@ptowl/shared';

type Variables = {
  user: { id: string; email: string; role: string; tier: string; user_type?: string } | null;
};

export const patientRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// All patient routes require auth + patient user_type
patientRoutes.use('*', requireAuth, requirePatient);

// GET /schedules — List all schedules linked to this patient
patientRoutes.get('/schedules', async (c) => {
  const user = c.get('user')!;

  const rows = await c.env.DB.prepare(`
    SELECT s.id, s.patient_initials, s.patient_alias, s.start_date, s.end_date,
           s.sessions_per_week, s.duration_weeks, s.notes, s.view_preference,
           ps.linked_at, p.clinic_name, p.clinic_phone
    FROM patient_schedules ps
    JOIN schedules s ON s.id = ps.schedule_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE ps.patient_id = ?
    ORDER BY s.start_date DESC
  `).bind(user.id).all();

  return c.json({ ok: true, data: rows.results });
});

// GET /schedules/:id — Get a single linked schedule with its appointments
patientRoutes.get('/schedules/:id', async (c) => {
  const user = c.get('user')!;
  const scheduleId = c.req.param('id');

  if (!/^[0-9a-f]{32}$/i.test(scheduleId)) {
    return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid schedule ID' } }, 400);
  }

  // Verify patient has access to this schedule
  const link = await c.env.DB.prepare(
    'SELECT id FROM patient_schedules WHERE patient_id = ? AND schedule_id = ?',
  ).bind(user.id, scheduleId).first();

  if (!link) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } }, 404);
  }

  const schedule = await c.env.DB.prepare(`
    SELECT s.*, p.clinic_name, p.clinic_phone, p.clinic_email
    FROM schedules s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE s.id = ?
  `).bind(scheduleId).first();

  const appointments = await c.env.DB.prepare(
    'SELECT * FROM appointments WHERE schedule_id = ? ORDER BY appointment_date, sort_order',
  ).bind(scheduleId).all();

  return c.json({
    ok: true,
    data: {
      schedule,
      appointments: appointments.results,
    },
  });
});

// POST /link — Link a schedule to this patient via code
patientRoutes.post('/link', requireCSRF, zValidator('json', linkCodeSchema, (result, c) => {
  if (!result.success) {
    return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: result.error.issues[0]?.message || 'Code is required' } }, 400);
  }
}), async (c) => {
  const user = c.get('user')!;
  const { code } = c.req.valid('json');

  // Normalize: strip prefix, uppercase
  const rawCode = code.toUpperCase().replace(/^PTOWL-/, '');
  const fullCode = `PTOWL-${rawCode}`;

  // Look up the code
  const patientCode = await c.env.DB.prepare(
    'SELECT id, schedule_id, expires_at FROM patient_codes WHERE code = ?',
  ).bind(fullCode).first<{ id: string; schedule_id: string; expires_at: string | null }>();

  if (!patientCode) {
    return c.json({ ok: false, error: { code: 'INVALID_CODE', message: 'Invalid code' } }, 404);
  }

  // Check expiry
  if (patientCode.expires_at && new Date(patientCode.expires_at) < new Date()) {
    return c.json({ ok: false, error: { code: 'CODE_EXPIRED', message: 'This code has expired' } }, 410);
  }

  // Check if already linked
  const existing = await c.env.DB.prepare(
    'SELECT id FROM patient_schedules WHERE patient_id = ? AND schedule_id = ?',
  ).bind(user.id, patientCode.schedule_id).first();

  if (existing) {
    return c.json({ ok: false, error: { code: 'ALREADY_LINKED', message: 'Schedule already linked' } }, 409);
  }

  // Create the link
  const linkId = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare(
    'INSERT INTO patient_schedules (id, patient_id, schedule_id) VALUES (?, ?, ?)',
  ).bind(linkId, user.id, patientCode.schedule_id).run();

  return c.json({ ok: true, data: { id: linkId, schedule_id: patientCode.schedule_id } });
});

// DELETE /unlink/:scheduleId — Remove a linked schedule
patientRoutes.delete('/unlink/:scheduleId', requireCSRF, async (c) => {
  const user = c.get('user')!;
  const scheduleId = c.req.param('scheduleId');

  if (!/^[0-9a-f]{32}$/i.test(scheduleId)) {
    return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid schedule ID' } }, 400);
  }

  const result = await c.env.DB.prepare(
    'DELETE FROM patient_schedules WHERE patient_id = ? AND schedule_id = ?',
  ).bind(user.id, scheduleId).run();

  if (!result.meta.changes) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Link not found' } }, 404);
  }

  return c.json({ ok: true, data: { message: 'Schedule unlinked' } });
});
