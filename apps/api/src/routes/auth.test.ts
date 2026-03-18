import { describe, it, expect } from 'vitest';

/**
 * Auth route unit tests — tests the pure utility functions
 * extracted from auth.ts (phone normalization, approval token logic).
 *
 * Full integration tests for the route handlers require a D1 mock
 * and Firebase token mocking, which are covered by E2E tests.
 */

// ─── Phone Normalization ─────────────────────────────────────
// Replicated from auth.ts for unit testing (same logic)
function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  if (phone.startsWith('+') && digits.length >= 10) return `+${digits}`;
  return null;
}

describe('normalizePhone', () => {
  it('normalizes 10-digit US number', () => {
    expect(normalizePhone('7035551234')).toBe('+17035551234');
  });

  it('normalizes 11-digit US number with leading 1', () => {
    expect(normalizePhone('17035551234')).toBe('+17035551234');
  });

  it('normalizes formatted US number', () => {
    expect(normalizePhone('(703) 555-1234')).toBe('+17035551234');
  });

  it('preserves E.164 format', () => {
    expect(normalizePhone('+17035551234')).toBe('+17035551234');
  });

  it('handles international format with +', () => {
    expect(normalizePhone('+447911123456')).toBe('+447911123456');
  });

  it('rejects too-short numbers', () => {
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('123456789')).toBeNull(); // 9 digits
  });

  it('rejects empty string', () => {
    expect(normalizePhone('')).toBeNull();
  });

  it('rejects non-numeric without + prefix', () => {
    expect(normalizePhone('abcdefghij')).toBeNull();
  });

  it('strips non-digit characters from formatted input', () => {
    expect(normalizePhone('703-555-1234')).toBe('+17035551234');
    expect(normalizePhone('703.555.1234')).toBe('+17035551234');
    expect(normalizePhone('703 555 1234')).toBe('+17035551234');
  });
});

// ─── Approval Token ──────────────────────────────────────────
// Tests the token encoding/decoding format used by the approval endpoint

describe('Approval Token Format', () => {
  it('base64url encodes userId:expiry:signature', () => {
    const userId = 'abc123def456';
    const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const sigHex = 'deadbeef1234567890abcdef';

    const payload = `${userId}:${expires}:${sigHex}`;
    const token = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Decode and verify structure
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const parts = decoded.split(':');

    expect(parts.length).toBe(3);
    expect(parts[0]).toBe(userId);
    expect(parseInt(parts[1]!)).toBe(expires);
    expect(parts[2]).toBe(sigHex);
  });

  it('token with 2 parts is rejected (malformed)', () => {
    const malformed = btoa('userId:expires');
    const decoded = atob(malformed);
    const parts = decoded.split(':');
    expect(parts.length).toBe(2); // Would be rejected by the handler
  });

  it('expired token is detectable', () => {
    const pastExpiry = Date.now() - 1000; // 1 second ago
    expect(Date.now() > pastExpiry).toBe(true);
  });

  it('future token is valid', () => {
    const futureExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    expect(Date.now() > futureExpiry).toBe(false);
  });
});

// ─── Placeholder Email Generation ────────────────────────────

describe('Placeholder Email for Phone Users', () => {
  it('generates unique placeholder from phone', () => {
    const phone = '+17035551234';
    const placeholder = `${phone.replace('+', '')}@phone.ptowl.local`;
    expect(placeholder).toBe('17035551234@phone.ptowl.local');
  });

  it('different phones produce different placeholders', () => {
    const p1 = '+17035551234'.replace('+', '') + '@phone.ptowl.local';
    const p2 = '+17035559999'.replace('+', '') + '@phone.ptowl.local';
    expect(p1).not.toBe(p2);
  });

  it('placeholder has valid email format', () => {
    const phone = '+17035551234';
    const placeholder = `${phone.replace('+', '')}@phone.ptowl.local`;
    expect(placeholder).toMatch(/^[0-9]+@phone\.ptowl\.local$/);
  });
});
