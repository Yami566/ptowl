/**
 * Generate an iCalendar (.ics) file from appointments.
 * Follows RFC 5545 — compatible with Apple Calendar, Google Calendar, Outlook.
 */

export interface ICSAppointment {
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM
  day_of_week?: string;
  sort_order?: number;
}

export interface ICSParams {
  appointments: ICSAppointment[];
  patientAlias: string;
  patientInitials: string;
  clinicName?: string;
  durationMinutes?: number; // default 60
}

export function generateICS(params: ICSParams): string {
  const {
    appointments,
    patientAlias,
    patientInitials,
    clinicName = 'PT Appointment',
    durationMinutes = 60,
  } = params;

  const label = patientAlias || patientInitials;
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PTOWL//Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:PT Schedule - ${escapeICS(label)}`,
  ];

  for (const appt of appointments) {
    const uid = `${appt.appointment_date}-${appt.appointment_time}-${patientInitials}@ptowl.com`;
    const dtstart = toICSDateTime(appt.appointment_date, appt.appointment_time);
    const dtend = toICSDateTimeOffset(appt.appointment_date, appt.appointment_time, durationMinutes);
    const summary = `${escapeICS(clinicName)} - ${escapeICS(label)}`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${nowICS()}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:Physical therapy appointment for ${escapeICS(label)}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      'DESCRIPTION:PT appointment in 1 hour',
      'END:VALARM',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function toICSDateTime(date: string, time: string): string {
  // YYYY-MM-DD + HH:MM → YYYYMMDDTHHMMSS
  const d = date.replace(/-/g, '');
  const t = time.replace(/:/g, '') + '00';
  return `${d}T${t}`;
}

function toICSDateTimeOffset(date: string, time: string, addMinutes: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [h, min] = time.split(':').map(Number) as [number, number];
  const dt = new Date(y, m - 1, d, h, min + addMinutes);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const nn = String(dt.getMinutes()).padStart(2, '0');
  return `${yy}${mm}${dd}T${hh}${nn}00`;
}

function nowICS(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const h = String(now.getUTCHours()).padStart(2, '0');
  const n = String(now.getUTCMinutes()).padStart(2, '0');
  const s = String(now.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${h}${n}${s}Z`;
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
