import { describe, it, expect } from 'vitest';
import { isValidTimezone, clinicLocalToUTC } from './timezone.js';

describe('isValidTimezone', () => {
  it('accepts well-known IANA tz names', () => {
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('America/Los_Angeles')).toBe(true);
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('Europe/London')).toBe(true);
  });

  it('rejects garbage', () => {
    expect(isValidTimezone('NOT_A_TZ')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone('a'.repeat(100))).toBe(false);
  });
});

describe('clinicLocalToUTC', () => {
  it('returns the same moment for UTC', () => {
    const result = clinicLocalToUTC('2026-04-25', '09:00', 'UTC');
    expect(result.toISOString()).toBe('2026-04-25T09:00:00.000Z');
  });

  it('converts EST/EDT correctly (winter — EST = UTC-5)', () => {
    // Jan 15 is winter; EST = UTC-5; 9:00 AM EST = 14:00 UTC.
    const result = clinicLocalToUTC('2026-01-15', '09:00', 'America/New_York');
    expect(result.toISOString()).toBe('2026-01-15T14:00:00.000Z');
  });

  it('converts EDT correctly (summer — EDT = UTC-4)', () => {
    // July 15 is summer; EDT = UTC-4; 9:00 AM EDT = 13:00 UTC.
    const result = clinicLocalToUTC('2026-07-15', '09:00', 'America/New_York');
    expect(result.toISOString()).toBe('2026-07-15T13:00:00.000Z');
  });

  it('converts PST/PDT correctly', () => {
    // Jan 15 is winter; PST = UTC-8; 9:00 AM PST = 17:00 UTC.
    const result = clinicLocalToUTC('2026-01-15', '09:00', 'America/Los_Angeles');
    expect(result.toISOString()).toBe('2026-01-15T17:00:00.000Z');
  });

  it('falls back to UTC for invalid tz', () => {
    const result = clinicLocalToUTC('2026-04-25', '09:00', 'Not/A_Real_Tz');
    expect(result.toISOString()).toBe('2026-04-25T09:00:00.000Z');
  });
});
