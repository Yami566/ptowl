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
    name: 'Post-Op Knee Rehab',
    sessions_per_week: 3,
    duration_weeks: 8,
    default_time: '09:00',
  },
  {
    hotkey: 3,
    name: 'Shoulder Recovery',
    sessions_per_week: 3,
    duration_weeks: 6,
    default_time: '09:00',
  },
  {
    hotkey: 4,
    name: 'Low Back Pain Program',
    sessions_per_week: 2,
    duration_weeks: 4,
    default_time: '10:00',
  },
  {
    hotkey: 5,
    name: 'Sports Injury Rehab',
    sessions_per_week: 3,
    duration_weeks: 4,
    default_time: '10:00',
  },
  {
    hotkey: 6,
    name: 'Balance & Fall Prevention',
    sessions_per_week: 2,
    duration_weeks: 12,
    default_time: '11:00',
  },
];
