import { RRule } from 'rrule';
import type { GeneratedAppointment, ScheduleParams } from './schedule-generator.js';
import { pickWeekdays } from './schedule-generator.js';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Map JS day-of-week numbers to rrule weekday objects
const RRULE_WEEKDAYS = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];

export function generateScheduleWithRRule(params: ScheduleParams): {
  appointments: GeneratedAppointment[];
  end_date: string;
  rruleString: string;
} {
  const { start_date, sessions_per_week, duration_weeks, default_time = '09:00' } = params;

  // Parse time
  const [hours, minutes] = default_time.split(':').map(Number) as [number, number];

  // Parse start date as UTC
  const [y, m, d] = start_date.split('-').map(Number) as [number, number, number];
  const dtstart = new Date(Date.UTC(y, m - 1, d, hours, minutes, 0));

  // Compute until date
  const untilDate = new Date(Date.UTC(y, m - 1, d + duration_weeks * 7, 0, 0, 0));

  // Map sessions_per_week to rrule weekdays
  const targetDays = pickWeekdays(sessions_per_week);
  const byweekday = targetDays.map((dow) => RRULE_WEEKDAYS[dow]!);

  const rule = new RRule({
    freq: RRule.WEEKLY,
    dtstart,
    until: untilDate,
    byweekday,
    tzid: 'UTC',
  });

  const occurrences = rule.all();

  const appointments: GeneratedAppointment[] = occurrences.map((date, i) => ({
    appointment_date: formatISODate(date),
    appointment_time: default_time,
    day_of_week: WEEKDAYS[date.getUTCDay()]!,
    sort_order: i,
  }));

  const lastAppt = appointments[appointments.length - 1];
  const end_date = lastAppt ? lastAppt.appointment_date : start_date;

  return {
    appointments,
    end_date,
    rruleString: rule.toString(),
  };
}

function formatISODate(date: Date): string {
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
