// Calendar and date/time formatting helpers used across the web UI.
// Schedule generation lives in `rrule-generator.ts`.

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

const dateFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(dateStr: string): string {
  return dateFmt.format(new Date(dateStr + 'T00:00:00Z'));
}

const timeFmt = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export function formatTime(timeStr: string): string {
  if (!timeStr || !timeStr.includes(':')) return timeStr || '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h!) || isNaN(m!)) return timeStr;
  return timeFmt.format(new Date(2000, 0, 1, h!, m!));
}
