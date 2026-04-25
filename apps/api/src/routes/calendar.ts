import { Hono } from 'hono';
import ical, { ICalCalendarMethod, ICalEventStatus, ICalAlarmType } from 'ical-generator';
import type { Env } from '../types/env.js';

type Variables = {
  user: { id: string; email: string; role: string; tier: string } | null;
};

export const calendarRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const DEFAULT_DURATION_MINUTES = 60;

// GET /:token.ics — Public endpoint, no auth required
// Serves an .ics file that patients can add to Apple Calendar, Google Calendar, etc.
calendarRoutes.get('/:token.ics', async (c) => {
  try {
    const token = c.req.param('token');

    if (!token || !/^[0-9a-f]{32}$/i.test(token)) {
      return c.text('Not found', 404);
    }

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

    const appointments = await c.env.DB.prepare(
      'SELECT appointment_date, appointment_time, sort_order FROM appointments WHERE schedule_id = ? ORDER BY sort_order',
    )
      .bind(schedule.id)
      .all<{ appointment_date: string; appointment_time: string; sort_order: number }>();

    const profile = await c.env.DB.prepare(
      'SELECT p.clinic_name FROM profiles p INNER JOIN schedules s ON p.user_id = s.user_id WHERE s.id = ?',
    )
      .bind(schedule.id)
      .first<{ clinic_name: string }>();

    const clinicName = profile?.clinic_name || 'PT Appointment';
    const label = schedule.patient_alias || schedule.patient_initials;

    const cal = ical({
      prodId: { company: 'PTOWL', product: 'Schedule', language: 'EN' },
      method: ICalCalendarMethod.PUBLISH,
      name: `PT Schedule - ${label}`,
    });

    for (const appt of appointments.results) {
      const [y, m, d] = appt.appointment_date.split('-').map(Number) as [number, number, number];
      const [h, min] = appt.appointment_time.split(':').map(Number) as [number, number];
      const start = new Date(y, m - 1, d, h, min);
      const end = new Date(y, m - 1, d, h, min + DEFAULT_DURATION_MINUTES);

      const event = cal.createEvent({
        id: `${appt.appointment_date}-${appt.appointment_time}-${schedule.patient_initials}@ptowl.com`,
        start,
        end,
        floating: true,
        summary: `${clinicName} - ${label}`,
        description: `Physical therapy appointment for ${label}`,
        status: ICalEventStatus.CONFIRMED,
      });

      event.createAlarm({
        type: ICalAlarmType.display,
        trigger: 60 * 60, // 1 hour before
        description: 'PT appointment in 1 hour',
      });
    }

    return new Response(cal.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="schedule-${schedule.patient_initials.toLowerCase()}.ics"`,
        // Per-token URL is unguessable and effectively private; safe to cache at edge.
        // 1h is short enough that schedule edits propagate quickly.
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (err) {
    console.error('Calendar export error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate calendar' } },
      500,
    );
  }
});
