import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatTime,
  getMonthsInRange,
  getDaysInMonth,
  getFirstDayOfMonth,
} from './schedule-generator.js';
import { generateSchedule } from './rrule-generator.js';

// ── generateSchedule ──

describe('generateSchedule', () => {
  it('returns correct count for 3x/wk over 4 weeks (12 appointments)', () => {
    const result = generateSchedule({
      start_date: '2025-01-06',
      sessions_per_week: 3,
      duration_weeks: 4,
    });
    expect(result.appointments).toHaveLength(12);
  });

  it('returns only Mon/Wed/Fri for 3x/wk', () => {
    const result = generateSchedule({
      start_date: '2025-01-06',
      sessions_per_week: 3,
      duration_weeks: 2,
    });
    const days = result.appointments.map((a) => a.day_of_week);
    for (const day of days) {
      expect(['Monday', 'Wednesday', 'Friday']).toContain(day);
    }
  });

  it('returns only Mondays for 1x/wk', () => {
    const result = generateSchedule({
      start_date: '2025-01-06',
      sessions_per_week: 1,
      duration_weeks: 4,
    });
    expect(result.appointments).toHaveLength(4);
    for (const appt of result.appointments) {
      expect(appt.day_of_week).toBe('Monday');
    }
  });

  it('returns Mon-Fri for 5x/wk', () => {
    const result = generateSchedule({
      start_date: '2025-01-06',
      sessions_per_week: 5,
      duration_weeks: 1,
    });
    expect(result.appointments).toHaveLength(5);
    const days = result.appointments.map((a) => a.day_of_week);
    expect(days).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  });

  it('returns all 7 days for 7x/wk', () => {
    const result = generateSchedule({
      start_date: '2025-01-05',
      sessions_per_week: 7,
      duration_weeks: 1,
    });
    expect(result.appointments).toHaveLength(7);
    const days = new Set(result.appointments.map((a) => a.day_of_week));
    expect(days.size).toBe(7);
  });

  it('returns Mon+Thu for 2x/wk', () => {
    const result = generateSchedule({
      start_date: '2025-01-06',
      sessions_per_week: 2,
      duration_weeks: 2,
    });
    const days = result.appointments.map((a) => a.day_of_week);
    for (const day of days) {
      expect(['Monday', 'Thursday']).toContain(day);
    }
  });

  it('uses default time of 09:00 when not specified', () => {
    const result = generateSchedule({
      start_date: '2025-01-06',
      sessions_per_week: 1,
      duration_weeks: 1,
    });
    expect(result.appointments[0]?.appointment_time).toBe('09:00');
  });

  it('uses custom default_time when provided', () => {
    const result = generateSchedule({
      start_date: '2025-01-06',
      sessions_per_week: 1,
      duration_weeks: 1,
      default_time: '14:30',
    });
    expect(result.appointments[0]?.appointment_time).toBe('14:30');
  });

  it('returns sorted appointments by date', () => {
    const result = generateSchedule({
      start_date: '2025-01-06',
      sessions_per_week: 3,
      duration_weeks: 4,
    });
    for (let i = 1; i < result.appointments.length; i++) {
      expect(
        result.appointments[i]!.appointment_date >= result.appointments[i - 1]!.appointment_date,
      ).toBe(true);
    }
  });

  it('has sequential sort_order starting at 0', () => {
    const result = generateSchedule({
      start_date: '2025-01-06',
      sessions_per_week: 3,
      duration_weeks: 2,
    });
    result.appointments.forEach((appt, i) => {
      expect(appt.sort_order).toBe(i);
    });
  });

  it('calculates correct end_date as last appointment date', () => {
    const result = generateSchedule({
      start_date: '2025-01-06',
      sessions_per_week: 3,
      duration_weeks: 1,
    });
    const lastAppt = result.appointments[result.appointments.length - 1];
    expect(result.end_date).toBe(lastAppt?.appointment_date);
  });

  it('handles single week with single session', () => {
    const result = generateSchedule({
      start_date: '2025-01-06',
      sessions_per_week: 1,
      duration_weeks: 1,
    });
    expect(result.appointments).toHaveLength(1);
    expect(result.appointments[0]?.appointment_date).toBe('2025-01-06');
  });

  it('handles maximum duration (52 weeks)', () => {
    const result = generateSchedule({
      start_date: '2025-01-06',
      sessions_per_week: 1,
      duration_weeks: 52,
    });
    expect(result.appointments).toHaveLength(52);
  });
});

// ── formatDate ──

describe('formatDate', () => {
  it('formats 2025-01-13 correctly', () => {
    expect(formatDate('2025-01-13')).toBe('Mon, Jan 13, 2025');
  });

  it('formats a Sunday correctly', () => {
    expect(formatDate('2025-01-12')).toBe('Sun, Jan 12, 2025');
  });

  it('formats December 31st correctly', () => {
    expect(formatDate('2025-12-31')).toBe('Wed, Dec 31, 2025');
  });

  it('formats Feb 29 on leap year correctly', () => {
    expect(formatDate('2024-02-29')).toBe('Thu, Feb 29, 2024');
  });
});

// ── formatTime ──

describe('formatTime', () => {
  it('formats 09:00 to 9:00 AM', () => {
    expect(formatTime('09:00')).toBe('9:00 AM');
  });

  it('formats 14:30 to 2:30 PM', () => {
    expect(formatTime('14:30')).toBe('2:30 PM');
  });

  it('formats 00:00 to 12:00 AM (midnight)', () => {
    expect(formatTime('00:00')).toBe('12:00 AM');
  });

  it('formats 12:00 to 12:00 PM (noon)', () => {
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('returns empty string for empty input', () => {
    expect(formatTime('')).toBe('');
  });

  it('returns original string for invalid format', () => {
    expect(formatTime('invalid')).toBe('invalid');
  });
});

// ── getMonthsInRange ──

describe('getMonthsInRange', () => {
  it('returns single month for same-month range', () => {
    const result = getMonthsInRange('2025-03-01', '2025-03-31');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ year: 2025, month: 2, label: 'March 2025' });
  });

  it('returns correct months for multi-month range', () => {
    const result = getMonthsInRange('2025-01-15', '2025-04-10');
    expect(result).toHaveLength(4);
    expect(result[0]?.label).toBe('January 2025');
    expect(result[3]?.label).toBe('April 2025');
  });

  it('handles year boundary', () => {
    const result = getMonthsInRange('2025-11-01', '2026-02-28');
    expect(result).toHaveLength(4);
    expect(result[0]?.label).toBe('November 2025');
    expect(result[3]?.label).toBe('February 2026');
  });

  it('returns single month when start and end are same day', () => {
    const result = getMonthsInRange('2025-06-15', '2025-06-15');
    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe('June 2025');
  });
});

// ── getDaysInMonth ──

describe('getDaysInMonth', () => {
  it('returns 31 for January', () => {
    expect(getDaysInMonth(2025, 0)).toBe(31);
  });

  it('returns 28 for February in non-leap year', () => {
    expect(getDaysInMonth(2025, 1)).toBe(28);
  });

  it('returns 29 for February in leap year', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29);
  });

  it('returns 30 for April', () => {
    expect(getDaysInMonth(2025, 3)).toBe(30);
  });

  it('returns 30 for September', () => {
    expect(getDaysInMonth(2025, 8)).toBe(30);
  });

  it('returns 31 for December', () => {
    expect(getDaysInMonth(2025, 11)).toBe(31);
  });
});

// ── getFirstDayOfMonth ──

describe('getFirstDayOfMonth', () => {
  it('returns correct day for Jan 2025 (Wednesday = 3)', () => {
    expect(getFirstDayOfMonth(2025, 0)).toBe(3);
  });

  it('returns correct day for March 2025 (Saturday = 6)', () => {
    expect(getFirstDayOfMonth(2025, 2)).toBe(6);
  });

  it('returns 0-6 range', () => {
    for (let month = 0; month < 12; month++) {
      const day = getFirstDayOfMonth(2025, month);
      expect(day).toBeGreaterThanOrEqual(0);
      expect(day).toBeLessThanOrEqual(6);
    }
  });
});
