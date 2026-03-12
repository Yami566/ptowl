import { z } from 'zod';

// ── Atomic field schemas ──

export const emailSchema = z
  .string({ message: 'Email is required' })
  .min(1, 'Email is required')
  .max(254, 'Email too long')
  .transform((v) => v.trim().toLowerCase())
  .pipe(
    z.string().regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, 'Invalid email format'),
  );

export const passwordSchema = z
  .string({ message: 'Password is required' })
  .min(1, 'Password is required')
  .max(128, 'Password too long')
  .refine((v) => v.length >= 8, 'Password must be at least 8 characters')
  .refine((v) => /[A-Z]/.test(v), 'Password must contain an uppercase letter')
  .refine((v) => /[a-z]/.test(v), 'Password must contain a lowercase letter')
  .refine((v) => /[0-9]/.test(v), 'Password must contain a digit');

export const initialsSchema = z
  .string({ message: 'Initials are required' })
  .min(1, 'Initials are required')
  .regex(/^[A-Za-z]{2}$/, 'Initials must be exactly 2 letters');

export const displayNameSchema = z
  .string()
  .max(50, 'Name must be 50 characters or less');

export const scheduleParamsSchema = z.object({
  sessions_per_week: z
    .number()
    .int('Sessions per week must be 1-7')
    .min(1, 'Sessions per week must be 1-7')
    .max(7, 'Sessions per week must be 1-7'),
  duration_weeks: z
    .number()
    .int('Duration must be 1-52 weeks')
    .min(1, 'Duration must be 1-52 weeks')
    .max(52, 'Duration must be 1-52 weeks'),
});

// ── Compound request schemas (for API routes) ──

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  display_name: displayNameSchema.optional(),
});

export const createScheduleRequestSchema = z.object({
  template_id: z.string().optional(),
  patient_initials: initialsSchema,
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  sessions_per_week: z.number().int().min(1).max(7),
  duration_weeks: z.number().int().min(1).max(52),
  notes: z.string().max(500).optional(),
});

// ── Type inference exports ──
// Prefixed with "Zod" to avoid conflicts with existing types in types/index.ts

export type ZodEmailInput = z.input<typeof emailSchema>;
export type ZodPasswordInput = z.input<typeof passwordSchema>;
export type ZodInitialsInput = z.input<typeof initialsSchema>;
export type ZodDisplayNameInput = z.input<typeof displayNameSchema>;
export type ZodScheduleParamsInput = z.input<typeof scheduleParamsSchema>;
export type ZodLoginRequest = z.infer<typeof loginRequestSchema>;
export type ZodRegisterRequest = z.infer<typeof registerRequestSchema>;
export type ZodCreateScheduleRequest = z.infer<typeof createScheduleRequestSchema>;
