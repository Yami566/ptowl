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

// Pick N evenly distributed weekdays (Mon-Fri)
export function pickWeekdays(count: number): number[] {
  // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
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

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0]!;
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.getUTCDay();
}

export function generateSchedule(params: ScheduleParams): {
  appointments: GeneratedAppointment[];
  end_date: string;
} {
  const { start_date, sessions_per_week, duration_weeks, default_time = '09:00' } = params;

  const targetDays = pickWeekdays(sessions_per_week);
  const appointments: GeneratedAppointment[] = [];

  // Find the first valid weekday on or after start_date
  let currentDate = start_date;
  const endDate = addDays(start_date, duration_weeks * 7);

  let order = 0;
  let checkDate = currentDate;

  while (checkDate < endDate) {
    const dayOfWeek = getDayOfWeek(checkDate);

    if (targetDays.includes(dayOfWeek)) {
      appointments.push({
        appointment_date: checkDate,
        appointment_time: default_time,
        day_of_week: WEEKDAYS[dayOfWeek]!,
        sort_order: order++,
      });
    }

    checkDate = addDays(checkDate, 1);
  }

  const lastAppointment = appointments[appointments.length - 1];
  const actualEndDate = lastAppointment ? lastAppointment.appointment_date : endDate;

  return {
    appointments,
    end_date: actualEndDate,
  };
}

// ── Calendar helpers ──

const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'long' });

export function getMonthsInRange(
  startDate: string,
  endDate: string,
): Array<{ year: number; month: number; label: string }> {
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  const months: Array<{ year: number; month: number; label: string }> = [];

  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth();

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({ year, month, label: `${monthFmt.format(new Date(year, month))} ${year}` });
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return months;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 1)).getUTCDay();
}

// ── Formatters (Intl.DateTimeFormat — zero custom arrays) ──

const dateFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

export function formatDate(dateStr: string): string {
  return dateFmt.format(new Date(dateStr + 'T00:00:00Z'));
}

const timeFmt = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric', minute: '2-digit', hour12: true,
});

export function formatTime(timeStr: string): string {
  if (!timeStr || !timeStr.includes(':')) return timeStr || '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h!) || isNaN(m!)) return timeStr;
  return timeFmt.format(new Date(2000, 0, 1, h!, m!));
}
