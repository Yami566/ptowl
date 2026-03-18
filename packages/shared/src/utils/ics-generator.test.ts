import { describe, it, expect } from 'vitest';
import { generateICS, type ICSAppointment } from './ics-generator.js';

describe('generateICS', () => {
  const sampleAppointments: ICSAppointment[] = [
    { appointment_date: '2026-04-01', appointment_time: '09:00' },
    { appointment_date: '2026-04-03', appointment_time: '10:30' },
  ];

  it('generates valid iCalendar format', () => {
    const ics = generateICS({
      appointments: sampleAppointments,
      patientAlias: 'Allen Iverson',
      patientInitials: 'AI',
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//PTOWL//Schedule//EN');
  });

  it('creates one VEVENT per appointment', () => {
    const ics = generateICS({
      appointments: sampleAppointments,
      patientAlias: 'AI',
      patientInitials: 'AI',
    });

    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(2);
  });

  it('formats DTSTART correctly from date and time', () => {
    const ics = generateICS({
      appointments: [{ appointment_date: '2026-04-01', appointment_time: '09:00' }],
      patientAlias: 'Test',
      patientInitials: 'TE',
    });

    expect(ics).toContain('DTSTART:20260401T090000');
  });

  it('calculates DTEND with 60-minute default duration', () => {
    const ics = generateICS({
      appointments: [{ appointment_date: '2026-04-01', appointment_time: '09:00' }],
      patientAlias: 'Test',
      patientInitials: 'TE',
    });

    expect(ics).toContain('DTEND:20260401T100000');
  });

  it('respects custom duration', () => {
    const ics = generateICS({
      appointments: [{ appointment_date: '2026-04-01', appointment_time: '09:00' }],
      patientAlias: 'Test',
      patientInitials: 'TE',
      durationMinutes: 30,
    });

    expect(ics).toContain('DTEND:20260401T093000');
  });

  it('includes patient alias in summary and description', () => {
    const ics = generateICS({
      appointments: [{ appointment_date: '2026-04-01', appointment_time: '09:00' }],
      patientAlias: 'Allen Iverson',
      patientInitials: 'AI',
      clinicName: 'PT Clinic',
    });

    expect(ics).toContain('Allen Iverson');
    expect(ics).toContain('PT Clinic');
  });

  it('falls back to initials when alias is empty', () => {
    const ics = generateICS({
      appointments: [{ appointment_date: '2026-04-01', appointment_time: '09:00' }],
      patientAlias: '',
      patientInitials: 'AI',
    });

    expect(ics).toContain('AI');
  });

  it('includes VALARM for reminder', () => {
    const ics = generateICS({
      appointments: [{ appointment_date: '2026-04-01', appointment_time: '09:00' }],
      patientAlias: 'Test',
      patientInitials: 'TE',
    });

    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT1H');
    expect(ics).toContain('END:VALARM');
  });

  it('escapes special ICS characters', () => {
    const ics = generateICS({
      appointments: [{ appointment_date: '2026-04-01', appointment_time: '09:00' }],
      patientAlias: 'Test, Name; Special',
      patientInitials: 'TN',
    });

    // Commas and semicolons should be escaped
    expect(ics).toContain('Test\\, Name\\; Special');
  });

  it('uses CRLF line endings per RFC 5545', () => {
    const ics = generateICS({
      appointments: [{ appointment_date: '2026-04-01', appointment_time: '09:00' }],
      patientAlias: 'Test',
      patientInitials: 'TE',
    });

    expect(ics).toContain('\r\n');
  });

  it('generates unique UIDs per appointment', () => {
    const ics = generateICS({
      appointments: sampleAppointments,
      patientAlias: 'Test',
      patientInitials: 'AI',
    });

    const uids = (ics.match(/UID:(.+)/g) || []);
    const uniqueUids = new Set(uids);
    expect(uniqueUids.size).toBe(2);
  });

  it('handles empty appointments array', () => {
    const ics = generateICS({
      appointments: [],
      patientAlias: 'Test',
      patientInitials: 'TE',
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});
