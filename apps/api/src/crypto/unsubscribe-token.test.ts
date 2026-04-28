import { describe, it, expect } from 'vitest';
import { signUnsubscribeToken, verifyUnsubscribeToken } from './unsubscribe-token.js';

const SECRET = 'test-secret-must-be-long-enough-for-hmac-256-' + 'x'.repeat(20);
const HASH = 'a'.repeat(64); // valid 64-char hex

describe('unsubscribe token round-trip', () => {
  it('verifies a freshly-signed token', async () => {
    const token = await signUnsubscribeToken(HASH, SECRET);
    const result = await verifyUnsubscribeToken(token, SECRET);
    expect(result).toBe(HASH);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signUnsubscribeToken(HASH, SECRET);
    expect(await verifyUnsubscribeToken(token, 'different-secret')).toBeNull();
  });

  it('rejects malformed tokens', async () => {
    expect(await verifyUnsubscribeToken('not-a-token', SECRET)).toBeNull();
    expect(await verifyUnsubscribeToken('', SECRET)).toBeNull();
    expect(await verifyUnsubscribeToken('a:b', SECRET)).toBeNull();
  });

  it('rejects tampered email hash', async () => {
    const token = await signUnsubscribeToken(HASH, SECRET);
    // decode, swap one byte in the hash, re-encode
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const tampered = decoded.replace(HASH, 'b' + HASH.slice(1));
    const tamperedToken = btoa(tampered).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(await verifyUnsubscribeToken(tamperedToken, SECRET)).toBeNull();
  });

  it('rejects when emailHash is not 64-hex', async () => {
    const decoded = `nothex:${Date.now() + 86400000}:abc`;
    const token = btoa(decoded).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(await verifyUnsubscribeToken(token, SECRET)).toBeNull();
  });

  it('rejects expired tokens', async () => {
    // Build an expired token directly: pretend we signed 91 days ago
    const expired = Date.now() - 1000;
    const payload = `${HASH}:${expired}`;
    const sigKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', sigKey, new TextEncoder().encode(payload));
    const sigHex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const token = btoa(`${payload}:${sigHex}`)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(await verifyUnsubscribeToken(token, SECRET)).toBeNull();
  });

  it('uses constant-time comparison (different but same-length sigs)', async () => {
    // We can't directly test timing, but we can confirm a same-length-but-wrong sig is rejected.
    const token = await signUnsubscribeToken(HASH, SECRET);
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const parts = decoded.split(':');
    const wrongSig = 'f'.repeat(parts[2]!.length);
    const fakeToken = btoa(`${parts[0]}:${parts[1]}:${wrongSig}`)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(await verifyUnsubscribeToken(fakeToken, SECRET)).toBeNull();
  });
});
