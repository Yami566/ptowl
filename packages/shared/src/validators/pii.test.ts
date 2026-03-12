import { describe, it, expect } from 'vitest';
import { detectPII, hasPII } from './pii.js';

// ── SSN Detection ──

describe('SSN detection', () => {
  it('catches SSN with dashes: 123-45-6789', () => {
    const matches = detectPII('Patient SSN: 123-45-6789');
    expect(matches.some((m) => m.type === 'ssn')).toBe(true);
  });

  it('catches SSN with dots: 123.45.6789', () => {
    const matches = detectPII('ID 123.45.6789 provided');
    expect(matches.some((m) => m.type === 'ssn')).toBe(true);
  });

  it('catches SSN with spaces: 123 45 6789', () => {
    const matches = detectPII('SSN is 123 45 6789');
    expect(matches.some((m) => m.type === 'ssn')).toBe(true);
  });

  it('catches SSN without separators: 123456789', () => {
    const matches = detectPII('Number 123456789 on file');
    expect(matches.some((m) => m.type === 'ssn')).toBe(true);
  });
});

// ── Phone Detection ──

describe('phone detection', () => {
  it('catches phone with parens: (555) 123-4567', () => {
    const matches = detectPII('Call (555) 123-4567');
    expect(matches.some((m) => m.type === 'phone')).toBe(true);
  });

  it('catches phone with dashes: 555-123-4567', () => {
    const matches = detectPII('Phone: 555-123-4567');
    expect(matches.some((m) => m.type === 'phone')).toBe(true);
  });

  it('catches phone with country code: +1 555 123 4567', () => {
    const matches = detectPII('Mobile +1 555 123 4567');
    expect(matches.some((m) => m.type === 'phone')).toBe(true);
  });
});

// ── Email Detection ──

describe('email detection', () => {
  it('catches standard email', () => {
    const matches = detectPII('Contact: patient@gmail.com');
    expect(matches.some((m) => m.type === 'email')).toBe(true);
  });

  it('catches email with subdomain', () => {
    const matches = detectPII('Email: user@mail.hospital.org');
    expect(matches.some((m) => m.type === 'email')).toBe(true);
  });
});

// ── DOB Detection ──

describe('DOB detection', () => {
  it('catches MM/DD/YYYY format', () => {
    const matches = detectPII('DOB: 01/15/1990');
    expect(matches.some((m) => m.type === 'dob')).toBe(true);
  });

  it('catches MM-DD-YYYY format', () => {
    const matches = detectPII('Born: 12-25-2000');
    expect(matches.some((m) => m.type === 'dob')).toBe(true);
  });
});

// ── MRN Detection ──

describe('MRN detection', () => {
  it('catches MRN with colon', () => {
    const matches = detectPII('MRN: 12345678');
    expect(matches.some((m) => m.type === 'mrn')).toBe(true);
  });

  it('catches MRN with hash', () => {
    const matches = detectPII('mrn#67890123');
    expect(matches.some((m) => m.type === 'mrn')).toBe(true);
  });

  it('catches Medical Record prefix', () => {
    const matches = detectPII('Medical Record: 98765');
    expect(matches.some((m) => m.type === 'mrn')).toBe(true);
  });
});

// ── Insurance Detection ──

describe('insurance detection', () => {
  it('catches policy number', () => {
    const matches = detectPII('policy: ABC123456');
    expect(matches.some((m) => m.type === 'insurance')).toBe(true);
  });

  it('catches insurance number', () => {
    const matches = detectPII('insurance#XYZ987654');
    expect(matches.some((m) => m.type === 'insurance')).toBe(true);
  });

  it('catches member ID', () => {
    const matches = detectPII('member: H12345678');
    expect(matches.some((m) => m.type === 'insurance')).toBe(true);
  });
});

// ── hasPII ──

describe('hasPII', () => {
  it('returns true when PII present', () => {
    expect(hasPII('SSN: 123-45-6789')).toBe(true);
  });

  it('returns false for clean text', () => {
    expect(hasPII('Patient AB - 3x/wk for 4 weeks')).toBe(false);
  });

  it('returns false for schedule-type content', () => {
    expect(hasPII('Monday 9:00 AM - Dr. Smith - Room 204')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasPII('')).toBe(false);
  });
});

// ── detectPII return structure ──

describe('detectPII return structure', () => {
  it('returns proper match objects', () => {
    const matches = detectPII('Call 555-123-4567 or email test@example.com');
    expect(matches.length).toBeGreaterThanOrEqual(2);
    for (const m of matches) {
      expect(m).toHaveProperty('type');
      expect(m).toHaveProperty('pattern');
      expect(m).toHaveProperty('match');
      expect(m).toHaveProperty('index');
      expect(typeof m.index).toBe('number');
    }
  });

  it('returns empty array for safe text', () => {
    const matches = detectPII('Schedule for JB');
    expect(matches).toEqual([]);
  });
});
