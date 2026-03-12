import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { requireAuth, requireCSRF } from '../middleware/auth.js';

type Variables = {
  user: { id: string; email: string; role: string; tier: string } | null;
};

export const appointmentRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

appointmentRoutes.use('*', requireAuth);

// PATCH /:id - Toggle reminder_sent or edit fields
appointmentRoutes.patch('/:id', requireCSRF, async (c) => {
  try {
    const user = c.get('user')!;
    const appointmentId = c.req.param('id');

    // Validate appointment ID format (32-char hex from randomblob)
    if (!/^[0-9a-f]{32}$/i.test(appointmentId)) {
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid appointment ID' } }, 400);
    }

    const body = await c.req.json<{
      reminder_sent?: number;
      appointment_time?: string;
      provider_name?: string;
    }>();

    // Verify appointment belongs to user's schedule
    const appt = await c.env.DB.prepare(
      `SELECT a.id, a.schedule_id FROM appointments a
       JOIN schedules s ON s.id = a.schedule_id
       WHERE a.id = ? AND s.user_id = ?`,
    )
      .bind(appointmentId, user.id)
      .first();

    if (!appt) {
      return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' } }, 404);
    }

    // Build update
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.reminder_sent !== undefined) {
      updates.push('reminder_sent = ?');
      values.push(body.reminder_sent ? 1 : 0);
    }
    if (body.appointment_time) {
      // Validate time format HH:MM with semantic hour/minute ranges
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.appointment_time)) {
        return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid time format (HH:MM, 00:00-23:59)' } }, 400);
      }
      updates.push('appointment_time = ?');
      values.push(body.appointment_time);
    }
    if (body.provider_name !== undefined) {
      updates.push('provider_name = ?');
      values.push(body.provider_name.replace(/<[^>]*>/g, '').trim().slice(0, 200));
    }

    if (updates.length === 0) {
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'No fields to update' } }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(appointmentId);

    await c.env.DB.prepare(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await c.env.DB.prepare('SELECT id, schedule_id, appointment_date, appointment_time, provider_name, reminder_sent, sort_order, created_at, updated_at FROM appointments WHERE id = ?').bind(appointmentId).first();
    return c.json({ ok: true, data: updated });
  } catch (err) {
    console.error('Update appointment error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update appointment' } }, 500);
  }
});
