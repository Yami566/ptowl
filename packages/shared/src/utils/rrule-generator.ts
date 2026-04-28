import { RRule } from 'rrule';

export interface GeneratedAppointment {
  appointment_date: string; // ISO YYYY-MM-DD
  appointment_time: string; // HH:MM
  day_of_week: string; // "Monday", "Tuesday", etc.
  sort_order: number;
}

export interface ScheduleParams {
  start_date: string; // ISO YYYY-MM-DD
  sessions_per_week: number; // 1-7
  duration_weeks: number; // 1-52
  default_time?: string; // HH:MM, defaults to "09:00"
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// JS day-of-week (0=Sun..6=Sat) → rrule weekday objects
const RRULE_WEEKDAYS = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];

// Pick N evenly distributed weekdays (Mon-Fri biased) for the given session cadence.
export function pickWeekdays(count: number): number[] {
  const distributions: Record<number, number[]> = {
    1: [1], // Monday
    2: [1, 4], // Mon, Thu
    3: [1, 3, 5], // Mon, Wed, Fri
    4: [1, 2, 4, 5], // Mon, Tue, Thu, Fri
    5: [1, 2, 3, 4, 5], // Mon-Fri
    6: [1, 2, 3, 4, 5, 6], // Mon-Sat
    7: [0, 1, 2, 3, 4, 5, 6], // Every day
  };
  return distributions[count] || distributions[3]!;
}

export function generateScheduleWithRRule(params: ScheduleParams): {
  appointments: GeneratedAppointment[];
  end_date: string;
  rruleString: string;
} {
  const { start_date, sessions_per_week, duration_weeks, default_time = '09:00' } = params;

  const [hours, minutes] = default_time.split(':').map(Number) as [number, number];
  const [y, m, d] = start_date.split('-').map(Number) as [number, number, number];

  const dtstart = new Date(Date.UTC(y, m - 1, d, hours, minutes, 0));
  const untilDate = new Date(Date.UTC(y, m - 1, d + duration_weeks * 7, 0, 0, 0));

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

// Backward-compatible alias — same shape as the legacy generator (rruleString is a free extra).
export const generateSchedule = generateScheduleWithRRule;

function formatISODate(date: Date): string {
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
