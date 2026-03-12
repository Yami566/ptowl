import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  initialsSchema,
  displayNameSchema,
  scheduleParamsSchema,
  loginRequestSchema,
  registerRequestSchema,
  createScheduleRequestSchema,
} from './schemas.js';

// ── emailSchema ──

describe('emailSchema', () => {
  it('parses and normalizes valid email', () => {
    expect(emailSchema.parse('  User@Example.COM  ')).toBe('user@example.com');
  });

  it('rejects empty string', () => {
    expect(() => emailSchema.parse('')).toThrow('Email is required');
  });

  it('rejects email without @', () => {
    expect(() => emailSchema.parse('userexample.com')).toThrow('Invalid email format');
  });

  it('rejects oversized email', () => {
    expect(() => emailSchema.parse('a'.repeat(246) + '@test.com')).toThrow('Email too long');
  });
});

// ── passwordSchema ──

describe('passwordSchema', () => {
  it('accepts valid password', () => {
    expect(passwordSchema.parse('Password1')).toBe('Password1');
  });

  it('rejects short password', () => {
    expect(() => passwordSchema.parse('Pass1')).toThrow('Password must be at least 8 characters');
  });

  it('rejects password without uppercase', () => {
    expect(() => passwordSchema.parse('password1')).toThrow('Password must contain an uppercase letter');
  });

  it('rejects password without lowercase', () => {
    expect(() => passwordSchema.parse('PASSWORD1')).toThrow('Password must contain a lowercase letter');
  });

  it('rejects password without digit', () => {
    expect(() => passwordSchema.parse('Password')).toThrow('Password must contain a digit');
  });

  it('rejects oversized password', () => {
    const longPass = 'Aa1' + 'x'.repeat(126);
    expect(() => passwordSchema.parse(longPass)).toThrow('Password too long');
  });
});

// ── initialsSchema ──

describe('initialsSchema', () => {
  it('accepts 2 uppercase letters', () => {
    expect(initialsSchema.parse('AB')).toBe('AB');
  });

  it('rejects single letter', () => {
    expect(() => initialsSchema.parse('A')).toThrow('Initials must be exactly 2 letters');
  });

  it('rejects digits', () => {
    expect(() => initialsSchema.parse('12')).toThrow('Initials must be exactly 2 letters');
  });

  it('rejects empty string', () => {
    expect(() => initialsSchema.parse('')).toThrow('Initials are required');
  });
});

// ── displayNameSchema ──

describe('displayNameSchema', () => {
  it('accepts valid name', () => {
    expect(displayNameSchema.parse('Dr. Smith')).toBe('Dr. Smith');
  });

  it('accepts empty string (optional field)', () => {
    expect(displayNameSchema.parse('')).toBe('');
  });

  it('rejects name exceeding 50 characters', () => {
    expect(() => displayNameSchema.parse('a'.repeat(51))).toThrow('Name must be 50 characters or less');
  });
});

// ── scheduleParamsSchema ──

describe('scheduleParamsSchema', () => {
  it('accepts valid params', () => {
    const result = scheduleParamsSchema.parse({ sessions_per_week: 3, duration_weeks: 8 });
    expect(result).toEqual({ sessions_per_week: 3, duration_weeks: 8 });
  });

  it('rejects sessions_per_week of 0', () => {
    expect(() => scheduleParamsSchema.parse({ sessions_per_week: 0, duration_weeks: 4 })).toThrow();
  });

  it('rejects sessions_per_week of 8', () => {
    expect(() => scheduleParamsSchema.parse({ sessions_per_week: 8, duration_weeks: 4 })).toThrow();
  });

  it('rejects non-integer sessions_per_week', () => {
    expect(() => scheduleParamsSchema.parse({ sessions_per_week: 2.5, duration_weeks: 4 })).toThrow();
  });

  it('rejects duration_weeks of 0', () => {
    expect(() => scheduleParamsSchema.parse({ sessions_per_week: 3, duration_weeks: 0 })).toThrow();
  });

  it('rejects duration_weeks of 53', () => {
    expect(() => scheduleParamsSchema.parse({ sessions_per_week: 3, duration_weeks: 53 })).toThrow();
  });
});

// ── Compound request schemas ──

describe('loginRequestSchema', () => {
  it('parses valid login', () => {
    const result = loginRequestSchema.parse({ email: 'User@Test.COM', password: 'secret123' });
    expect(result.email).toBe('user@test.com');
    expect(result.password).toBe('secret123');
  });

  it('rejects missing email', () => {
    expect(() => loginRequestSchema.parse({ password: 'secret123' })).toThrow();
  });

  it('rejects missing password', () => {
    expect(() => loginRequestSchema.parse({ email: 'user@test.com' })).toThrow();
  });
});

describe('registerRequestSchema', () => {
  it('parses valid registration', () => {
    const result = registerRequestSchema.parse({
      email: 'User@Test.COM',
      password: 'Password1',
      display_name: 'Dr. Smith',
    });
    expect(result.email).toBe('user@test.com');
  });

  it('rejects weak password', () => {
    expect(() => registerRequestSchema.parse({
      email: 'user@test.com',
      password: 'weak',
    })).toThrow();
  });
});

describe('createScheduleRequestSchema', () => {
  it('parses valid schedule request', () => {
    const result = createScheduleRequestSchema.parse({
      patient_initials: 'AB',
      start_date: '2026-03-09',
      sessions_per_week: 3,
      duration_weeks: 8,
    });
    expect(result.patient_initials).toBe('AB');
    expect(result.start_date).toBe('2026-03-09');
  });

  it('rejects invalid date format', () => {
    expect(() => createScheduleRequestSchema.parse({
      patient_initials: 'AB',
      start_date: '03/09/2026',
      sessions_per_week: 3,
      duration_weeks: 8,
    })).toThrow('Invalid date format');
  });

  it('rejects invalid initials', () => {
    expect(() => createScheduleRequestSchema.parse({
      patient_initials: '123',
      start_date: '2026-03-09',
      sessions_per_week: 3,
      duration_weeks: 8,
    })).toThrow();
  });
});
