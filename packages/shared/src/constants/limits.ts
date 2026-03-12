export const TIER_LIMITS = {
  free: {
    maxSchedules: 3,
    maxCustomTemplates: 2,
    canUseLogo: false,
    canUseCalendarView: true,
    canUseReminders: true,
  },
  paid: {
    maxSchedules: Infinity,
    maxCustomTemplates: Infinity,
    canUseLogo: true,
    canUseCalendarView: true,
    canUseReminders: true,
  },
} as const;

export type Tier = keyof typeof TIER_LIMITS;
