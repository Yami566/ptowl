import { SPORTS_ALIASES } from '@ptowl/shared';

// ── Types ──

export interface WizardResult {
  sessionsPerWeek: number;
  durationWeeks: number;
  startDate: string;
  patientInitials: string;
  patientAlias: string;
  appointmentTime: string; // HH:MM
}

export interface StepOption {
  key: string;
  label: string;
  description: string;
}

export interface DurationOption {
  key: string;
  weeks: number;
  label: string;
}

// ── Frequency ──

export const FREQUENCIES: StepOption[] = [
  { key: '1', label: '1 time per week', description: 'Maintenance' },
  { key: '2', label: '2 times per week', description: 'Standard rehab' },
  { key: '3', label: '3 times per week', description: 'Active recovery' },
  { key: '4', label: '4 times per week', description: 'Intensive' },
  { key: '5', label: '5 times per week', description: 'Daily (Mon-Fri)' },
];

export const FREQUENCY_VALUES: Record<string, number> = {
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
};

// ── Duration ──

export const DURATION_WEEKS: DurationOption[] = [
  { key: '1', weeks: 2, label: '2 weeks' },
  { key: '2', weeks: 4, label: '4 weeks' },
  { key: '3', weeks: 6, label: '6 weeks' },
  { key: '4', weeks: 8, label: '8 weeks' },
  { key: '5', weeks: 12, label: '12 weeks' },
];

export const DURATION_MONTHS: DurationOption[] = [
  { key: '1', weeks: 4, label: '1 month (4 weeks)' },
  { key: '2', weeks: 8, label: '2 months (8 weeks)' },
  { key: '3', weeks: 12, label: '3 months (12 weeks)' },
  { key: '4', weeks: 24, label: '6 months (24 weeks)' },
];

export const DURATION_DESCRIPTIONS: Record<number, string> = {
  2: 'Short-term / evaluation',
  4: 'Standard course',
  6: 'Extended recovery',
  8: 'Post-surgical / complex',
  12: 'Long-term rehab',
  24: 'Chronic condition',
};

// ── Time Slots ──

export interface TimeOption {
  key: string;
  time: string;
  label: string;
}

export const TIME_SLOTS: TimeOption[] = [
  { key: '1', time: '07:00', label: '7:00 AM' },
  { key: '2', time: '08:00', label: '8:00 AM' },
  { key: '3', time: '09:00', label: '9:00 AM' },
  { key: '4', time: '10:00', label: '10:00 AM' },
  { key: '5', time: '11:00', label: '11:00 AM' },
  { key: '6', time: '12:00', label: '12:00 PM' },
  { key: '7', time: '13:00', label: '1:00 PM' },
  { key: '8', time: '14:00', label: '2:00 PM' },
  { key: '9', time: '15:00', label: '3:00 PM' },
  { key: '0', time: '16:00', label: '4:00 PM' },
];

// ── Helpers ──

const shortDateFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
export function formatShortDate(date: Date): string {
  return shortDateFmt.format(date);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getNextMonday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntilMon = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilMon);
  return next;
}

export function lookupAlias(initials: string): string {
  const key = initials.toUpperCase();
  const aliases = SPORTS_ALIASES[key];
  if (!aliases || aliases.length === 0) {
    return `${key[0]}. ${key[1]}player`;
  }
  return aliases[0]!;
}
