import { describe, it, expect } from 'vitest';
import { generateSignedCSRFToken, verifyCSRFToken } from './csrf.js';

const TEST_SECRET = 'test-csrf-secret-key-for-testing-purposes-64chars-long-enough-now';
const TEST_USER_ID = 'user-abc-123';

describe('generateSignedCSRFToken', () => {
  it('produces a token with 3 dot-separated parts (random.timestamp.hmac)', async () => {
    const token = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    expect(token).toContain('.');
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
  });

  it('includes a valid unix timestamp in the middle part', async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    const after = Math.floor(Date.now() / 1000);
    const timestamp = parseInt(token.split('.')[1]!, 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('generates different tokens each call (random component)', async () => {
    const t1 = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    const t2 = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    expect(t1).not.toBe(t2);
  });

  it('random component is at least 32 hex chars', async () => {
    const token = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    const random = token.split('.')[0]!;
    expect(random.length).toBeGreaterThanOrEqual(32);
    expect(/^[0-9a-f]+$/.test(random)).toBe(true);
  });

  it('hmac component is hex string', async () => {
    const token = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    const hmac = token.split('.')[2]!;
    expect(hmac.length).toBeGreaterThan(0);
    expect(/^[0-9a-f]+$/.test(hmac)).toBe(true);
  });
});

describe('verifyCSRFToken', () => {
  it('accepts valid token for correct userId', async () => {
    const token = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    const valid = await verifyCSRFToken(token, TEST_SECRET, TEST_USER_ID);
    expect(valid).toBe(true);
  });

  it('rejects valid token for wrong userId', async () => {
    const token = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    const valid = await verifyCSRFToken(token, TEST_SECRET, 'different-user-456');
    expect(valid).toBe(false);
  });

  it('rejects tampered random portion', async () => {
    const token = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    const [random, timestamp, hmac] = token.split('.');
    // Flip a character in the random portion
    const tampered = 'x' + random!.slice(1) + '.' + timestamp + '.' + hmac;
    const valid = await verifyCSRFToken(tampered, TEST_SECRET, TEST_USER_ID);
    expect(valid).toBe(false);
  });

  it('rejects tampered timestamp', async () => {
    const token = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    const [random, , hmac] = token.split('.');
    const tampered = random + '.9999999999.' + hmac;
    const valid = await verifyCSRFToken(tampered, TEST_SECRET, TEST_USER_ID);
    expect(valid).toBe(false);
  });

  it('rejects tampered HMAC', async () => {
    const token = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    const [random, timestamp, hmac] = token.split('.');
    const tampered = random + '.' + timestamp + '.' + 'f'.repeat(hmac!.length);
    const valid = await verifyCSRFToken(tampered, TEST_SECRET, TEST_USER_ID);
    expect(valid).toBe(false);
  });

  it('rejects expired token (beyond maxAge)', async () => {
    const token = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    // Manually construct a token with a very old timestamp to guarantee expiration
    const [random, , hmac] = token.split('.');
    const oldTimestamp = Math.floor(Date.now() / 1000) - 100000; // 100K seconds ago
    // Since the HMAC won't match this manufactured timestamp, we test the expiration
    // path by using maxAge=-1 which ensures now - timestamp > -1 is always true...
    // Actually, let's just verify that a recently generated token is rejected with maxAge=-1
    const valid = await verifyCSRFToken(token, TEST_SECRET, TEST_USER_ID, -1);
    expect(valid).toBe(false);
  });

  it('rejects empty string', async () => {
    const valid = await verifyCSRFToken('', TEST_SECRET, TEST_USER_ID);
    expect(valid).toBe(false);
  });

  it('rejects token without dot separator', async () => {
    const valid = await verifyCSRFToken('abcdef123456', TEST_SECRET, TEST_USER_ID);
    expect(valid).toBe(false);
  });

  it('rejects token with wrong secret', async () => {
    const token = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    const valid = await verifyCSRFToken(token, 'wrong-secret-key-that-is-also-64-chars-long-for-testing-abcdefgh', TEST_USER_ID);
    expect(valid).toBe(false);
  });

  it('rejects non-numeric timestamp', async () => {
    const token = await generateSignedCSRFToken(TEST_SECRET, TEST_USER_ID);
    const [random, , hmac] = token.split('.');
    const tampered = random + '.notanumber.' + hmac;
    const valid = await verifyCSRFToken(tampered, TEST_SECRET, TEST_USER_ID);
    expect(valid).toBe(false);
  });

  it('rejects token with short random component', async () => {
    // random must be at least 32 chars
    const valid = await verifyCSRFToken('abc.123.def', TEST_SECRET, TEST_USER_ID);
    expect(valid).toBe(false);
  });
});
