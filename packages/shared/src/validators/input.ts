import {
  emailSchema,
  passwordSchema,
  initialsSchema,
  displayNameSchema,
  scheduleParamsSchema,
} from './schemas.js';

/** Returns first error message or null if valid */
function firstError(result: { success: boolean; error?: { issues: Array<{ message: string }> } }): string | null {
  if (result.success) return null;
  return result.error?.issues[0]?.message ?? 'Validation failed';
}

export function validateEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return 'Email is required';
  return firstError(emailSchema.safeParse(email));
}

export function validatePassword(password: string): string | null {
  if (!password || typeof password !== 'string') return 'Password is required';
  return firstError(passwordSchema.safeParse(password));
}

export function validateInitials(initials: string): string | null {
  if (!initials || typeof initials !== 'string') return 'Initials are required';
  return firstError(initialsSchema.safeParse(initials));
}

export function validateDisplayName(name: string): string | null {
  if (typeof name !== 'string') return 'Invalid name';
  return firstError(displayNameSchema.safeParse(name));
}

export function validateScheduleParams(params: {
  sessions_per_week: number;
  duration_weeks: number;
}): string | null {
  return firstError(scheduleParamsSchema.safeParse(params));
}
