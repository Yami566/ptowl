import { describe, it, expect, vi, afterEach } from 'vitest';
import { signJWT, verifyJWT, verifyJWTAllowExpired } from './jwt.js';

const TEST_SECRET = 'test-jwt-secret-key-for-vitest-testing-64-chars-long-enough-now';
const TEST_PAYLOAD = { sub: 'user-123', email: 'test@example.com', role: 'user', tier: 'free' };

describe('signJWT', () => {
  it('produces three-part dot-separated token', async () => {
    const token = await signJWT(TEST_PAYLOAD, TEST_SECRET);
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
  });

  it('header is HS256 JWT', async () => {
    const token = await signJWT(TEST_PAYLOAD, TEST_SECRET);
    const header = token.split('.')[0]!;
    // Base64url decode
    const padded = header + '='.repeat((4 - (header.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
    expect(decoded.alg).toBe('HS256');
    expect(decoded.typ).toBe('JWT');
  });

  it('payload contains sub, email, role, tier, iat, exp', async () => {
    const token = await signJWT(TEST_PAYLOAD, TEST_SECRET);
    const body = token.split('.')[1]!;
    const padded = body + '='.repeat((4 - (body.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
    expect(decoded.sub).toBe('user-123');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.role).toBe('user');
    expect(decoded.tier).toBe('free');
    expect(typeof decoded.iat).toBe('number');
    expect(typeof decoded.exp).toBe('number');
  });

  it('exp is iat + expiresInSeconds', async () => {
    const token = await signJWT(TEST_PAYLOAD, TEST_SECRET, 300); // 5 min
    const body = token.split('.')[1]!;
    const padded = body + '='.repeat((4 - (body.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
    expect(decoded.exp - decoded.iat).toBe(300);
  });
});

describe('verifyJWT', () => {
  it('accepts non-expired token', async () => {
    const token = await signJWT(TEST_PAYLOAD, TEST_SECRET, 3600);
    const payload = await verifyJWT(token, TEST_SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('user-123');
    expect(payload!.email).toBe('test@example.com');
  });

  it('rejects expired token', async () => {
    // Sign with 1-second expiry, then advance time
    const token = await signJWT(TEST_PAYLOAD, TEST_SECRET, 1);
    // Manually advance time by 2 seconds
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 2000);
    const payload = await verifyJWT(token, TEST_SECRET);
    expect(payload).toBeNull();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects token with wrong secret', async () => {
    const token = await signJWT(TEST_PAYLOAD, TEST_SECRET, 3600);
    const payload = await verifyJWT(token, 'wrong-secret-key-completely-different-64-chars-long-also-testing');
    expect(payload).toBeNull();
  });

  it('rejects tampered payload', async () => {
    const token = await signJWT(TEST_PAYLOAD, TEST_SECRET, 3600);
    const parts = token.split('.');
    // Tamper with payload (change a character)
    const tampered = parts[0] + '.' + parts[1]!.slice(0, -2) + 'XX' + '.' + parts[2];
    const payload = await verifyJWT(tampered, TEST_SECRET);
    expect(payload).toBeNull();
  });

  it('rejects tampered signature', async () => {
    const token = await signJWT(TEST_PAYLOAD, TEST_SECRET, 3600);
    const parts = token.split('.');
    const tampered = parts[0] + '.' + parts[1] + '.' + parts[2]!.slice(0, -2) + 'XX';
    const payload = await verifyJWT(tampered, TEST_SECRET);
    expect(payload).toBeNull();
  });

  it('rejects malformed token (less than 3 parts)', async () => {
    const payload = await verifyJWT('header.payload', TEST_SECRET);
    expect(payload).toBeNull();
  });

  it('rejects empty string', async () => {
    const payload = await verifyJWT('', TEST_SECRET);
    expect(payload).toBeNull();
  });
});

describe('verifyJWTAllowExpired', () => {
  it('accepts recently expired token', async () => {
    const token = await signJWT(TEST_PAYLOAD, TEST_SECRET, 1);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5000); // 5 seconds past expiry
    const payload = await verifyJWTAllowExpired(token, TEST_SECRET, 604800);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('user-123');
    vi.useRealTimers();
  });

  it('rejects token older than maxAgeSeconds from issue time', async () => {
    const token = await signJWT(TEST_PAYLOAD, TEST_SECRET, 1);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days later
    const payload = await verifyJWTAllowExpired(token, TEST_SECRET, 604800); // 7-day max
    expect(payload).toBeNull();
    vi.useRealTimers();
  });

  it('still verifies signature on expired tokens', async () => {
    const token = await signJWT(TEST_PAYLOAD, TEST_SECRET, 1);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5000);
    // Use wrong secret
    const payload = await verifyJWTAllowExpired(token, 'wrong-secret-key-entirely-diff-64-chars-long-padding-for-testing', 604800);
    expect(payload).toBeNull();
    vi.useRealTimers();
  });
});
