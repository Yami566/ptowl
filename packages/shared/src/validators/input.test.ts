import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateInitials,
  validateDisplayName,
  validateScheduleParams,
} from './input.js';

// ── validateEmail ──

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBeNull();
  });

  it('accepts email with dots and plus', () => {
    expect(validateEmail('first.last+tag@domain.co')).toBeNull();
  });

  it('rejects empty string', () => {
    expect(validateEmail('')).toBe('Email is required');
  });

  it('rejects email without @', () => {
    expect(validateEmail('userexample.com')).toBe('Invalid email format');
  });

  it('rejects email without domain', () => {
    expect(validateEmail('user@')).toBe('Invalid email format');
  });

  it('rejects email without TLD', () => {
    expect(validateEmail('user@domain')).toBe('Invalid email format');
  });

  it('rejects email with single char TLD', () => {
    expect(validateEmail('user@domain.c')).toBe('Invalid email format');
  });

  it('rejects email exceeding 254 characters', () => {
    const longEmail = 'a'.repeat(246) + '@test.com'; // 255 chars total
    expect(validateEmail(longEmail)).toBe('Email too long');
  });

  it('trims and lowercases email', () => {
    // Valid email with spaces and uppercase — should return null (valid)
    expect(validateEmail('  User@Example.COM  ')).toBeNull();
  });
});

// ── validatePassword ──

describe('validatePassword', () => {
  it('accepts valid password with uppercase, lowercase, digit', () => {
    expect(validatePassword('Password1')).toBeNull();
  });

  it('rejects empty password', () => {
    expect(validatePassword('')).toBe('Password is required');
  });

  it('rejects password shorter than 8 chars', () => {
    expect(validatePassword('Pass1')).toBe('Password must be at least 8 characters');
  });

  it('rejects password without uppercase letter', () => {
    expect(validatePassword('password1')).toBe('Password must contain an uppercase letter');
  });

  it('rejects password without lowercase letter', () => {
    expect(validatePassword('PASSWORD1')).toBe('Password must contain a lowercase letter');
  });

  it('rejects password without digit', () => {
    expect(validatePassword('Password')).toBe('Password must contain a digit');
  });

  it('rejects password exceeding 128 characters', () => {
    const longPass = 'Aa1' + 'x'.repeat(126);
    expect(validatePassword(longPass)).toBe('Password too long');
  });

  it('accepts complex password with special chars', () => {
    expect(validatePassword('@!Test1234Complex@!')).toBeNull();
  });
});

// ── validateInitials ──

describe('validateInitials', () => {
  it('accepts 2 uppercase letters', () => {
    expect(validateInitials('AB')).toBeNull();
  });

  it('accepts 2 lowercase letters', () => {
    expect(validateInitials('ab')).toBeNull();
  });

  it('accepts mixed case letters', () => {
    expect(validateInitials('aB')).toBeNull();
  });

  it('rejects single letter', () => {
    expect(validateInitials('A')).toBe('Initials must be exactly 2 letters');
  });

  it('rejects 3 letters', () => {
    expect(validateInitials('ABC')).toBe('Initials must be exactly 2 letters');
  });

  it('rejects digits', () => {
    expect(validateInitials('12')).toBe('Initials must be exactly 2 letters');
  });

  it('rejects empty string', () => {
    expect(validateInitials('')).toBe('Initials are required');
  });

  it('rejects special characters', () => {
    expect(validateInitials('A!')).toBe('Initials must be exactly 2 letters');
  });

  it('rejects XSS attempt', () => {
    expect(validateInitials('<script>')).toBe('Initials must be exactly 2 letters');
  });
});

// ── validateDisplayName ──

describe('validateDisplayName', () => {
  it('accepts valid name', () => {
    expect(validateDisplayName('Dr. Smith')).toBeNull();
  });

  it('accepts empty string (optional field)', () => {
    expect(validateDisplayName('')).toBeNull();
  });

  it('accepts exactly 50 characters', () => {
    expect(validateDisplayName('a'.repeat(50))).toBeNull();
  });

  it('rejects name exceeding 50 characters', () => {
    expect(validateDisplayName('a'.repeat(51))).toBe('Name must be 50 characters or less');
  });
});

// ── validateScheduleParams ──

describe('validateScheduleParams', () => {
  it('accepts valid params', () => {
    expect(validateScheduleParams({ sessions_per_week: 3, duration_weeks: 8 })).toBeNull();
  });

  it('accepts minimum values (1, 1)', () => {
    expect(validateScheduleParams({ sessions_per_week: 1, duration_weeks: 1 })).toBeNull();
  });

  it('accepts maximum values (7, 52)', () => {
    expect(validateScheduleParams({ sessions_per_week: 7, duration_weeks: 52 })).toBeNull();
  });

  it('rejects sessions_per_week of 0', () => {
    expect(validateScheduleParams({ sessions_per_week: 0, duration_weeks: 4 })).toBe('Sessions per week must be 1-7');
  });

  it('rejects sessions_per_week of 8', () => {
    expect(validateScheduleParams({ sessions_per_week: 8, duration_weeks: 4 })).toBe('Sessions per week must be 1-7');
  });

  it('rejects duration_weeks of 0', () => {
    expect(validateScheduleParams({ sessions_per_week: 3, duration_weeks: 0 })).toBe('Duration must be 1-52 weeks');
  });

  it('rejects duration_weeks of 53', () => {
    expect(validateScheduleParams({ sessions_per_week: 3, duration_weeks: 53 })).toBe('Duration must be 1-52 weeks');
  });

  it('rejects non-integer sessions_per_week', () => {
    expect(validateScheduleParams({ sessions_per_week: 2.5, duration_weeks: 4 })).toBe('Sessions per week must be 1-7');
  });

  it('rejects non-integer duration_weeks', () => {
    expect(validateScheduleParams({ sessions_per_week: 3, duration_weeks: 4.5 })).toBe('Duration must be 1-52 weeks');
  });

  it('rejects negative values', () => {
    expect(validateScheduleParams({ sessions_per_week: -1, duration_weeks: 4 })).toBe('Sessions per week must be 1-7');
  });
});
