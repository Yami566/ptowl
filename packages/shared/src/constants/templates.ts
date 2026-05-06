export interface DefaultTemplate {
  hotkey: number;
  name: string;
  sessions_per_week: number;
  duration_weeks: number;
  default_time: string;
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    hotkey: 2,
    name: 'Sports PT',
    sessions_per_week: 3,
    duration_weeks: 6,
    default_time: '09:00',
  },
  {
    hotkey: 3,
    name: 'OT Peds',
    sessions_per_week: 2,
    duration_weeks: 8,
    default_time: '10:00',
  },
  {
    hotkey: 4,
    name: 'Chiropractic',
    sessions_per_week: 3,
    duration_weeks: 4,
    default_time: '08:00',
  },
  {
    hotkey: 5,
    name: 'SLP',
    sessions_per_week: 2,
    duration_weeks: 12,
    default_time: '14:00',
  },
  {
    hotkey: 6,
    name: 'Mental Health',
    sessions_per_week: 1,
    duration_weeks: 16,
    default_time: '11:00',
  },
  {
    hotkey: 7,
    name: 'Dental Hygiene',
    sessions_per_week: 1,
    duration_weeks: 26,
    default_time: '09:00',
  },
];
