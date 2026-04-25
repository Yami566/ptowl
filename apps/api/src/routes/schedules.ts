import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { requireAuth, requireClinic } from '../middleware/auth.js';
import { validateInitials, validateScheduleParams, generateSchedule } from '@ptowl/shared';
import { TIER_LIMITS } from '@ptowl/shared';
import { encryptEmail } from '../crypto/email-cipher.js';

type Variables = {
  user: { id: string; email: string; role: string; tier: string } | null;
};

export const scheduleRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// All routes require auth
scheduleRoutes.use('*', requireAuth, requireClinic);

// GET / - List user's schedules
scheduleRoutes.get('/', async (c) => {
  try {
    const user = c.get('user')!;
    const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20') || 20));
    const offset = (page - 1) * limit;

    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM schedules WHERE user_id = ?',
    )
      .bind(user.id)
      .first<{ total: number }>();

    const schedules = await c.env.DB.prepare(
      'SELECT id, user_id, template_id, patient_initials, patient_alias, start_date, end_date, sessions_per_week, duration_weeks, provider_name, notes, reminders_enabled, (patient_email_encrypted IS NOT NULL) AS has_patient_email, created_at, updated_at FROM schedules WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    )
      .bind(user.id, limit, offset)
      .all();

    return c.json({
      ok: true,
      data: schedules.results,
      meta: { page, limit, total: countResult?.total || 0 },
    });
  } catch (err) {
    console.error('List schedules error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch schedules' } },
      500,
    );
  }
});

// POST / - Create new schedule
scheduleRoutes.post('/', async (c) => {
  try {
    const user = c.get('user')!;
    const body = await c.req.json<{
      template_id?: string;
      patient_initials: string;
      start_date: string;
      sessions_per_week: number;
      duration_weeks: number;
      provider_name?: string;
      notes?: string;
    }>();

    // Validate initials
    const initialsErr = validateInitials(body.patient_initials);
    if (initialsErr)
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: initialsErr } }, 400);

    // Validate schedule params
    const paramsErr = validateScheduleParams({
      sessions_per_week: body.sessions_per_week,
      duration_weeks: body.duration_weeks,
    });
    if (paramsErr)
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: paramsErr } }, 400);

    // Validate start_date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.start_date) || isNaN(Date.parse(body.start_date))) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid start date format' } },
        400,
      );
    }

    // M8 FIX: Validate template_id format if provided
    if (body.template_id) {
      if (!/^[0-9a-f]{32}$/i.test(body.template_id)) {
        return c.json(
          { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid template ID' } },
          400,
        );
      }
    }

    // Validate provider_name length
    const providerName = (body.provider_name || '')
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 200);
    const notes = (body.notes || '')
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 1000);

    // Tier limit check
    const tier = user.tier as 'free' | 'paid';
    const limits = TIER_LIMITS[tier];
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM schedules WHERE user_id = ?',
    )
      .bind(user.id)
      .first<{ total: number }>();

    if ((countResult?.total || 0) >= limits.maxSchedules) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'TIER_LIMIT',
            message: `Free tier limited to ${limits.maxSchedules} schedules. Upgrade to create more.`,
          },
        },
        403,
      );
    }

    // Generate appointments
    const { appointments, end_date } = generateSchedule({
      start_date: body.start_date,
      sessions_per_week: body.sessions_per_week,
      duration_weeks: body.duration_weeks,
    });

    const initials = body.patient_initials.toUpperCase();

    // Create schedule
    const scheduleId = crypto.randomUUID().replace(/-/g, '');
    await c.env.DB.prepare(
      'INSERT INTO schedules (id, user_id, template_id, patient_initials, patient_alias, start_date, end_date, sessions_per_week, duration_weeks, provider_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        scheduleId,
        user.id,
        body.template_id || null,
        initials,
        '', // alias will be set from separate alias call
        body.start_date,
        end_date,
        body.sessions_per_week,
        body.duration_weeks,
        providerName,
        notes,
      )
      .run();

    // Insert appointments
    for (const appt of appointments) {
      const apptId = crypto.randomUUID().replace(/-/g, '');
      await c.env.DB.prepare(
        'INSERT INTO appointments (id, schedule_id, appointment_date, appointment_time, provider_name, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(
          apptId,
          scheduleId,
          appt.appointment_date,
          appt.appointment_time,
          providerName,
          appt.sort_order,
        )
        .run();
    }

    // Fetch full schedule with appointments
    const schedule = await c.env.DB.prepare(
      'SELECT id, user_id, template_id, patient_initials, patient_alias, start_date, end_date, sessions_per_week, duration_weeks, provider_name, notes, reminders_enabled, (patient_email_encrypted IS NOT NULL) AS has_patient_email, created_at, updated_at FROM schedules WHERE id = ? AND user_id = ?',
    )
      .bind(scheduleId, user.id)
      .first();

    const appts = await c.env.DB.prepare(
      'SELECT id, schedule_id, appointment_date, appointment_time, provider_name, reminder_sent, sort_order, created_at, updated_at FROM appointments WHERE schedule_id = ? ORDER BY sort_order',
    )
      .bind(scheduleId)
      .all();

    return c.json({ ok: true, data: { schedule, appointments: appts.results } }, 201);
  } catch (err) {
    console.error('Create schedule error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create schedule' } },
      500,
    );
  }
});

// POST /from-appointments - Create schedule from client-edited appointments
scheduleRoutes.post('/from-appointments', async (c) => {
  try {
    const user = c.get('user')!;
    const body = await c.req.json<{
      patient_initials: string;
      patient_alias?: string;
      start_date: string;
      end_date: string;
      sessions_per_week: number;
      duration_weeks: number;
      appointments: Array<{
        appointment_date: string;
        appointment_time: string;
        day_of_week: string;
        sort_order: number;
      }>;
      provider_name?: string;
      notes?: string;
    }>();

    // Validate initials
    const initialsErr = validateInitials(body.patient_initials);
    if (initialsErr)
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: initialsErr } }, 400);

    // Validate schedule params
    const paramsErr = validateScheduleParams({
      sessions_per_week: body.sessions_per_week,
      duration_weeks: body.duration_weeks,
    });
    if (paramsErr)
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: paramsErr } }, 400);

    // Validate dates
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(body.start_date) || isNaN(Date.parse(body.start_date))) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid start date format' } },
        400,
      );
    }
    if (!datePattern.test(body.end_date) || isNaN(Date.parse(body.end_date))) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid end date format' } },
        400,
      );
    }

    // Validate appointments array
    if (!Array.isArray(body.appointments) || body.appointments.length === 0) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Appointments array is required' } },
        400,
      );
    }
    if (body.appointments.length > 365) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Too many appointments' } },
        400,
      );
    }

    const timePattern = /^\d{2}:\d{2}$/;
    for (const appt of body.appointments) {
      if (!datePattern.test(appt.appointment_date) || isNaN(Date.parse(appt.appointment_date))) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'INVALID_INPUT',
              message: `Invalid appointment date: ${appt.appointment_date}`,
            },
          },
          400,
        );
      }
      if (!timePattern.test(appt.appointment_time)) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'INVALID_INPUT',
              message: `Invalid appointment time: ${appt.appointment_time}`,
            },
          },
          400,
        );
      }
    }

    // Sanitize text fields
    const providerName = (body.provider_name || '')
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 200);
    const notes = (body.notes || '')
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 1000);
    const patientAlias = (body.patient_alias || '')
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 100);

    // Tier limit check
    const tier = user.tier as 'free' | 'paid';
    const limits = TIER_LIMITS[tier];
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM schedules WHERE user_id = ?',
    )
      .bind(user.id)
      .first<{ total: number }>();

    if ((countResult?.total || 0) >= limits.maxSchedules) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'TIER_LIMIT',
            message: `Free tier limited to ${limits.maxSchedules} schedules. Upgrade to create more.`,
          },
        },
        403,
      );
    }

    const initials = body.patient_initials.toUpperCase();
    const scheduleId = crypto.randomUUID().replace(/-/g, '');

    // Insert schedule
    await c.env.DB.prepare(
      'INSERT INTO schedules (id, user_id, patient_initials, patient_alias, start_date, end_date, sessions_per_week, duration_weeks, provider_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        scheduleId,
        user.id,
        initials,
        patientAlias,
        body.start_date,
        body.end_date,
        body.sessions_per_week,
        body.duration_weeks,
        providerName,
        notes,
      )
      .run();

    // Insert client-edited appointments
    for (const appt of body.appointments) {
      const apptId = crypto.randomUUID().replace(/-/g, '');
      await c.env.DB.prepare(
        'INSERT INTO appointments (id, schedule_id, appointment_date, appointment_time, provider_name, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(
          apptId,
          scheduleId,
          appt.appointment_date,
          appt.appointment_time,
          providerName,
          appt.sort_order,
        )
        .run();
    }

    // Fetch full result
    const schedule = await c.env.DB.prepare(
      'SELECT id, user_id, template_id, patient_initials, patient_alias, start_date, end_date, sessions_per_week, duration_weeks, provider_name, notes, reminders_enabled, (patient_email_encrypted IS NOT NULL) AS has_patient_email, created_at, updated_at FROM schedules WHERE id = ? AND user_id = ?',
    )
      .bind(scheduleId, user.id)
      .first();

    const appts = await c.env.DB.prepare(
      'SELECT id, schedule_id, appointment_date, appointment_time, provider_name, reminder_sent, sort_order, created_at, updated_at FROM appointments WHERE schedule_id = ? ORDER BY sort_order',
    )
      .bind(scheduleId)
      .all();

    return c.json({ ok: true, data: { schedule, appointments: appts.results } }, 201);
  } catch (err) {
    console.error(
      'Create from-appointments error:',
      err instanceof Error ? err.message : 'Unknown error',
    );
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create schedule' } },
      500,
    );
  }
});

// GET /:id - Get schedule with appointments
scheduleRoutes.get('/:id', async (c) => {
  try {
    const user = c.get('user')!;
    const scheduleId = c.req.param('id');
    if (!/^[0-9a-f]{32}$/i.test(scheduleId)) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid schedule ID' } },
        400,
      );
    }

    const schedule = await c.env.DB.prepare(
      'SELECT id, user_id, template_id, patient_initials, patient_alias, start_date, end_date, sessions_per_week, duration_weeks, provider_name, notes, share_token, created_at, updated_at FROM schedules WHERE id = ? AND user_id = ?',
    )
      .bind(scheduleId, user.id)
      .first();

    if (!schedule) {
      return c.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } },
        404,
      );
    }

    const appointments = await c.env.DB.prepare(
      'SELECT id, schedule_id, appointment_date, appointment_time, provider_name, reminder_sent, sort_order, created_at, updated_at FROM appointments WHERE schedule_id = ? ORDER BY sort_order',
    )
      .bind(scheduleId)
      .all();

    return c.json({ ok: true, data: { schedule, appointments: appointments.results } });
  } catch (err) {
    console.error('Get schedule error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch schedule' } },
      500,
    );
  }
});

// PUT /:id/reminders - Set patient email + reminder enable for a schedule.
// Email is AES-GCM encrypted at rest with EMAIL_ENCRYPTION_KEY. Reminders
// fire 24h + 1h before each appointment via the cron+queue+MailChannels
// path; clinics can toggle reminders_enabled to mute without losing email.
scheduleRoutes.put('/:id/reminders', async (c) => {
  try {
    const user = c.get('user')!;
    const scheduleId = c.req.param('id');
    if (!/^[0-9a-f]{32}$/i.test(scheduleId)) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid schedule ID' } },
        400,
      );
    }

    const body = await c.req.json<{
      patient_email?: string | null;
      reminders_enabled?: boolean;
    }>();

    // Verify ownership.
    const existing = await c.env.DB.prepare('SELECT id FROM schedules WHERE id = ? AND user_id = ?')
      .bind(scheduleId, user.id)
      .first();
    if (!existing) {
      return c.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } },
        404,
      );
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (body.patient_email !== undefined) {
      if (body.patient_email && body.patient_email.trim().length > 0) {
        if (!c.env.EMAIL_ENCRYPTION_KEY) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'CONFIG_ERROR',
                message: 'Email reminders are not configured on this server',
              },
            },
            503,
          );
        }
        const email = body.patient_email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
          return c.json(
            { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid email' } },
            400,
          );
        }
        const encrypted = await encryptEmail(email, c.env.EMAIL_ENCRYPTION_KEY);
        updates.push('patient_email_encrypted = ?');
        values.push(encrypted);
      } else {
        // Explicitly clearing the email.
        updates.push('patient_email_encrypted = NULL');
      }
    }

    if (body.reminders_enabled !== undefined) {
      updates.push('reminders_enabled = ?');
      values.push(body.reminders_enabled ? 1 : 0);
    }

    if (updates.length === 0) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'No fields to update' } },
        400,
      );
    }

    updates.push("updated_at = datetime('now')");
    values.push(scheduleId);

    await c.env.DB.prepare(`UPDATE schedules SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return c.json({
      ok: true,
      data: {
        message: 'Reminder preferences updated',
        has_email: body.patient_email ? true : body.patient_email === null ? false : undefined,
        reminders_enabled: body.reminders_enabled,
      },
    });
  } catch (err) {
    console.error('Update reminders error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      {
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update reminder preferences' },
      },
      500,
    );
  }
});

// POST /:id/share - Generate a share token for public .ics link
scheduleRoutes.post('/:id/share', async (c) => {
  try {
    const user = c.get('user')!;
    const scheduleId = c.req.param('id');
    if (!/^[0-9a-f]{32}$/i.test(scheduleId)) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid schedule ID' } },
        400,
      );
    }

    // Verify ownership
    const schedule = await c.env.DB.prepare(
      'SELECT id, share_token FROM schedules WHERE id = ? AND user_id = ?',
    )
      .bind(scheduleId, user.id)
      .first<{ id: string; share_token: string | null }>();

    if (!schedule) {
      return c.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } },
        404,
      );
    }

    // Reuse existing token or generate new one
    let token = schedule.share_token;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, '');
      await c.env.DB.prepare('UPDATE schedules SET share_token = ? WHERE id = ?')
        .bind(token, scheduleId)
        .run();
    }

    return c.json({ ok: true, data: { share_token: token } });
  } catch (err) {
    console.error('Share schedule error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate share link' } },
      500,
    );
  }
});

// DELETE /:id - Delete schedule (cascade deletes appointments)
scheduleRoutes.delete('/:id', async (c) => {
  try {
    const user = c.get('user')!;
    const scheduleId = c.req.param('id');
    if (!/^[0-9a-f]{32}$/i.test(scheduleId)) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid schedule ID' } },
        400,
      );
    }

    // Delete appointments first (in case no CASCADE)
    await c.env.DB.prepare(
      'DELETE FROM appointments WHERE schedule_id = ? AND schedule_id IN (SELECT id FROM schedules WHERE user_id = ?)',
    )
      .bind(scheduleId, user.id)
      .run();

    const result = await c.env.DB.prepare('DELETE FROM schedules WHERE id = ? AND user_id = ?')
      .bind(scheduleId, user.id)
      .run();

    if (!result.meta.changes) {
      return c.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } },
        404,
      );
    }

    return c.json({ ok: true, data: { message: 'Schedule deleted' } });
  } catch (err) {
    console.error('Delete schedule error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete schedule' } },
      500,
    );
  }
});
