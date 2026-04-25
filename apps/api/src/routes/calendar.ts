import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { generateICS } from '@ptowl/shared';

type Variables = {
  user: { id: string; email: string; role: string; tier: string } | null;
};

export const calendarRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /:token.ics — Public endpoint, no auth required
// Serves an .ics file that patients can add to Apple Calendar, Google Calendar, etc.
calendarRoutes.get('/:token.ics', async (c) => {
  try {
    const token = c.req.param('token');

    // Validate token format (32-char hex)
    if (!token || !/^[0-9a-f]{32}$/i.test(token)) {
      return c.text('Not found', 404);
    }

    // Look up schedule by share_token
    const schedule = await c.env.DB.prepare(
      'SELECT id, patient_initials, patient_alias, start_date, end_date, sessions_per_week, duration_weeks FROM schedules WHERE share_token = ?',
    )
      .bind(token)
      .first<{
        id: string;
        patient_initials: string;
        patient_alias: string;
        start_date: string;
        end_date: string;
        sessions_per_week: number;
        duration_weeks: number;
      }>();

    if (!schedule) {
      return c.text('Not found', 404);
    }

    // Fetch appointments
    const appointments = await c.env.DB.prepare(
      'SELECT appointment_date, appointment_time, sort_order FROM appointments WHERE schedule_id = ? ORDER BY sort_order',
    )
      .bind(schedule.id)
      .all<{ appointment_date: string; appointment_time: string; sort_order: number }>();

    // Fetch clinic name from profile (via schedule's user)
    const profile = await c.env.DB.prepare(
      'SELECT p.clinic_name FROM profiles p INNER JOIN schedules s ON p.user_id = s.user_id WHERE s.id = ?',
    )
      .bind(schedule.id)
      .first<{ clinic_name: string }>();

    const icsContent = generateICS({
      appointments: appointments.results,
      patientAlias: schedule.patient_alias,
      patientInitials: schedule.patient_initials,
      clinicName: profile?.clinic_name || 'PT Appointment',
    });

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="schedule-${schedule.patient_initials.toLowerCase()}.ics"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('Calendar export error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate calendar' } }, 500);
  }
});
