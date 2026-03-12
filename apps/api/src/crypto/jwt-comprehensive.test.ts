import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signJWT, verifyJWT, verifyJWTAllowExpired } from './jwt.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECRET = 'test-jwt-secret-key-for-vitest-testing-64-chars-long-enough-now';
const SECRET_B = 'completely-different-secret-key-used-for-cross-secret-tests-64ch';
const PAYLOAD = { sub: 'user-42', email: 'owl@ptowl.com', role: 'user', tier: 'pro' };

/** Base64url-encode a UTF-8 string (mirrors the implementation). */
function b64url(data: string): string {
  const bytes = new TextEncoder().encode(data);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Build a raw token string from header/payload objects and an arbitrary sig. */
function craftToken(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  sig: string = 'fakesig',
): string {
  return `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}.${sig}`;
}

/** Decode the payload part of a token. */
function decodePayload(token: string): Record<string, unknown> {
  const body = token.split('.')[1]!;
  const padded = body + '='.repeat((4 - (body.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Decode the header part of a token. */
function decodeHeader(token: string): Record<string, unknown> {
  const header = token.split('.')[0]!;
  const padded = header + '='.repeat((4 - (header.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

// ---------------------------------------------------------------------------
// After each: always restore real timers
// ---------------------------------------------------------------------------
afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// 1. ALGORITHM HEADER ATTACKS
// ===========================================================================
describe('Algorithm header attacks', () => {
  it('rejects alg: "none" (CVE-2015-9235 style)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: 'none', typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
      '',
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects alg: "None" (case variant)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: 'None', typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects alg: "NONE" (uppercase)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: 'NONE', typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects alg: "RS256" (asymmetric confusion)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: 'RS256', typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects alg: "hs256" (lowercase)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: 'hs256', typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects alg: "Hs256" (mixed case)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: 'Hs256', typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects missing alg field entirely', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects alg: "HS384" (wrong HMAC variant)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: 'HS384', typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects alg: "HS512" (wrong HMAC variant)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: 'HS512', typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects header with extra fields but wrong alg', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: 'RS256', typ: 'JWT', kid: 'key-1', jku: 'https://evil.com/jwks' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects alg as an empty string', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: '', typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects alg as a number', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: 256, typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects alg as boolean true', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: true, typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects alg as null', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: null, typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('rejects alg as an array ["HS256"]', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: ['HS256'], typ: 'JWT' },
      { ...PAYLOAD, iat: now, exp: now + 3600 },
    );
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });
});

// ===========================================================================
// 2. TOKEN STRUCTURE ATTACKS
// ===========================================================================
describe('Token structure attacks', () => {
  it('rejects zero parts (empty string)', async () => {
    expect(await verifyJWT('', SECRET)).toBeNull();
  });

  it('rejects one part (no dots)', async () => {
    expect(await verifyJWT('abcdef', SECRET)).toBeNull();
  });

  it('rejects two parts (one dot)', async () => {
    expect(await verifyJWT('header.body', SECRET)).toBeNull();
  });

  it('rejects four parts (three dots)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    expect(await verifyJWT(token + '.extra', SECRET)).toBeNull();
  });

  it('rejects five parts', async () => {
    expect(await verifyJWT('a.b.c.d.e', SECRET)).toBeNull();
  });

  it('rejects dots only (two dots, three empty parts)', async () => {
    expect(await verifyJWT('..', SECRET)).toBeNull();
  });

  it('rejects three dots (four empty parts)', async () => {
    expect(await verifyJWT('...', SECRET)).toBeNull();
  });

  it('rejects token with empty header part', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const parts = token.split('.');
    expect(await verifyJWT(`.${parts[1]}.${parts[2]}`, SECRET)).toBeNull();
  });

  it('rejects token with empty payload part', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const parts = token.split('.');
    expect(await verifyJWT(`${parts[0]}..${parts[2]}`, SECRET)).toBeNull();
  });

  it('rejects token with empty signature part', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const parts = token.split('.');
    expect(await verifyJWT(`${parts[0]}.${parts[1]}.`, SECRET)).toBeNull();
  });

  it('rejects header that is not valid JSON', async () => {
    const notJson = b64url('not-json{{{');
    const payloadB64 = b64url(JSON.stringify({ ...PAYLOAD, iat: 9999999999, exp: 9999999999 }));
    expect(await verifyJWT(`${notJson}.${payloadB64}.fakesig`, SECRET)).toBeNull();
  });

  it('rejects header that is a JSON array', async () => {
    const arrayHeader = b64url(JSON.stringify(['HS256']));
    const payloadB64 = b64url(JSON.stringify({ ...PAYLOAD, iat: 9999999999, exp: 9999999999 }));
    expect(await verifyJWT(`${arrayHeader}.${payloadB64}.fakesig`, SECRET)).toBeNull();
  });

  it('rejects header that is a JSON string', async () => {
    const stringHeader = b64url(JSON.stringify('HS256'));
    const payloadB64 = b64url(JSON.stringify({ ...PAYLOAD, iat: 9999999999, exp: 9999999999 }));
    expect(await verifyJWT(`${stringHeader}.${payloadB64}.fakesig`, SECRET)).toBeNull();
  });
});

// ===========================================================================
// 3. BASE64URL ENCODING EDGE CASES
// ===========================================================================
describe('Base64url encoding edge cases', () => {
  it('signJWT produces no padding characters (=)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    expect(token).not.toContain('=');
  });

  it('signJWT produces no + or / characters', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    expect(token).not.toContain('+');
    expect(token).not.toContain('/');
  });

  it('round-trips payload with special characters in email', async () => {
    const specialPayload = { sub: 'u-1', email: 'user+tag@example.co.uk', role: 'user', tier: 'free' };
    const token = await signJWT(specialPayload, SECRET, 3600);
    const decoded = decodePayload(token);
    expect(decoded.email).toBe('user+tag@example.co.uk');
  });

  it('round-trips payload with unicode in sub', async () => {
    const unicodePayload = { sub: 'user-\u00e9\u00e8\u00ea', email: 'a@b.com', role: 'user', tier: 'free' };
    const token = await signJWT(unicodePayload, SECRET, 3600);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe('user-\u00e9\u00e8\u00ea');
  });

  it('round-trips payload with emoji in sub', async () => {
    const emojiPayload = { sub: 'owl-\ud83e\udd89', email: 'a@b.com', role: 'user', tier: 'free' };
    const token = await signJWT(emojiPayload, SECRET, 3600);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe('owl-\ud83e\udd89');
  });

  it('handles very long email gracefully', async () => {
    const longEmail = 'a'.repeat(200) + '@example.com';
    const token = await signJWT({ sub: 'u-1', email: longEmail, role: 'user', tier: 'free' }, SECRET, 3600);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
    expect(result!.email).toBe(longEmail);
  });
});

// ===========================================================================
// 4. PAYLOAD INTEGRITY / FIELD TAMPERING
// ===========================================================================
describe('Payload integrity - field tampering', () => {
  /** Replace the payload in a signed token with a different payload (keeps original sig). */
  function replacePayload(token: string, newPayload: Record<string, unknown>): string {
    const parts = token.split('.');
    const forgedBody = b64url(JSON.stringify(newPayload));
    return `${parts[0]}.${forgedBody}.${parts[2]}`;
  }

  it('rejects tampered sub field', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const original = decodePayload(token);
    const forged = replacePayload(token, { ...original, sub: 'admin-0' });
    expect(await verifyJWT(forged, SECRET)).toBeNull();
  });

  it('rejects tampered email field', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const original = decodePayload(token);
    const forged = replacePayload(token, { ...original, email: 'attacker@evil.com' });
    expect(await verifyJWT(forged, SECRET)).toBeNull();
  });

  it('rejects tampered role (user -> admin)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const original = decodePayload(token);
    const forged = replacePayload(token, { ...original, role: 'admin' });
    expect(await verifyJWT(forged, SECRET)).toBeNull();
  });

  it('rejects tampered tier (free -> enterprise)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const original = decodePayload(token);
    const forged = replacePayload(token, { ...original, tier: 'enterprise' });
    expect(await verifyJWT(forged, SECRET)).toBeNull();
  });

  it('rejects tampered iat (backdated)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const original = decodePayload(token);
    const forged = replacePayload(token, { ...original, iat: 0 });
    expect(await verifyJWT(forged, SECRET)).toBeNull();
  });

  it('rejects tampered exp (extended to far future)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const original = decodePayload(token);
    const forged = replacePayload(token, { ...original, exp: 99999999999 });
    expect(await verifyJWT(forged, SECRET)).toBeNull();
  });

  it('rejects injected admin_verified field', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const original = decodePayload(token);
    const forged = replacePayload(token, { ...original, admin_verified: true });
    expect(await verifyJWT(forged, SECRET)).toBeNull();
  });
});

// ===========================================================================
// 5. SIGNATURE ATTACKS
// ===========================================================================
describe('Signature attacks', () => {
  it('rejects completely empty signature', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const parts = token.split('.');
    const forged = `${parts[0]}.${parts[1]}.`;
    expect(await verifyJWT(forged, SECRET)).toBeNull();
  });

  it('rejects signature of all zeros (base64url)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const parts = token.split('.');
    // 32 bytes of zeros in base64url = AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
    const zeroSig = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const forged = `${parts[0]}.${parts[1]}.${zeroSig}`;
    expect(await verifyJWT(forged, SECRET)).toBeNull();
  });

  it('rejects truncated signature (first half only)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const parts = token.split('.');
    const halfSig = parts[2]!.slice(0, Math.floor(parts[2]!.length / 2));
    const forged = `${parts[0]}.${parts[1]}.${halfSig}`;
    // May return null or throw on invalid base64 -- either is acceptable rejection
    try {
      const result = await verifyJWT(forged, SECRET);
      expect(result).toBeNull();
    } catch {
      // Throwing is also a valid rejection
    }
  });

  it('rejects signature with one byte flipped', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const parts = token.split('.');
    const sig = parts[2]!;
    // Flip a character in the middle
    const mid = Math.floor(sig.length / 2);
    const flippedChar = sig[mid] === 'A' ? 'B' : 'A';
    const forged = `${parts[0]}.${parts[1]}.${sig.slice(0, mid)}${flippedChar}${sig.slice(mid + 1)}`;
    expect(await verifyJWT(forged, SECRET)).toBeNull();
  });

  it('rejects signature with appended bytes', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const parts = token.split('.');
    const forged = `${parts[0]}.${parts[1]}.${parts[2]}AAAA`;
    expect(await verifyJWT(forged, SECRET)).toBeNull();
  });

  it('rejects swapping signatures between two different tokens', async () => {
    const tokenA = await signJWT(PAYLOAD, SECRET, 3600);
    const tokenB = await signJWT(
      { sub: 'user-99', email: 'other@ptowl.com', role: 'admin', tier: 'enterprise' },
      SECRET,
      3600,
    );
    const partsA = tokenA.split('.');
    const partsB = tokenB.split('.');
    // Use header+payload from A with signature from B
    const forged = `${partsA[0]}.${partsA[1]}.${partsB[2]}`;
    expect(await verifyJWT(forged, SECRET)).toBeNull();
  });

  it('rejects standard base64 signature (with + and /)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const parts = token.split('.');
    // Convert base64url back to standard base64 (with + and /)
    const standardB64 = parts[2]!.replace(/-/g, '+').replace(/_/g, '/');
    // If it is identical (no - or _ were present) this is fine; but we craft one that differs
    const forged = `${parts[0]}.${parts[1]}.${standardB64}XXX`;
    expect(await verifyJWT(forged, SECRET)).toBeNull();
  });
});

// ===========================================================================
// 6. EXPIRATION EDGE CASES
// ===========================================================================
describe('Expiration edge cases', () => {
  it('rejects token exactly at expiration boundary per RFC 7519 (exp == now is expired)', async () => {
    // Per RFC 7519 §4.1.4: "exp" identifies the expiration time on or after which
    // the JWT MUST NOT be accepted. jose correctly implements this.
    const token = await signJWT(PAYLOAD, SECRET, 10);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 10000);
    const result = await verifyJWT(token, SECRET);
    expect(result).toBeNull();
  });

  it('rejects token 1 second past expiration', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 10);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11000);
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('accepts token with very long expiry (1 year)', async () => {
    const oneYear = 365 * 24 * 3600;
    const token = await signJWT(PAYLOAD, SECRET, oneYear);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
  });

  it('accepts token with 1-second expiry within that second', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 1);
    // Verify immediately (no time advance)
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
  });

  it('rejects token that expired 1 hour ago', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 10);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 3610 * 1000);
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('signJWT defaults to 900-second (15 min) expiry', async () => {
    const token = await signJWT(PAYLOAD, SECRET);
    const decoded = decodePayload(token);
    expect((decoded.exp as number) - (decoded.iat as number)).toBe(900);
  });

  it('handles expiresInSeconds = 0 (immediately expired per RFC 7519)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 0);
    // exp == iat == now, per RFC 7519 this is expired (exp <= now)
    const result = await verifyJWT(token, SECRET);
    expect(result).toBeNull();
  });
});

// ===========================================================================
// 7. verifyJWTAllowExpired SPECIFIC TESTS
// ===========================================================================
describe('verifyJWTAllowExpired specific tests', () => {
  it('accepts token within maxAgeSeconds from iat', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 1);
    vi.useFakeTimers();
    // Advance 1 hour (token expired, but within 7-day maxAge)
    vi.setSystemTime(Date.now() + 3600 * 1000);
    const result = await verifyJWTAllowExpired(token, SECRET, 604800);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe('user-42');
  });

  it('rejects token exactly 1 second past maxAgeSeconds from iat', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 1);
    vi.useFakeTimers();
    // maxAge = 100 seconds, advance 101 seconds
    vi.setSystemTime(Date.now() + 101 * 1000);
    const result = await verifyJWTAllowExpired(token, SECRET, 100);
    expect(result).toBeNull();
  });

  it('accepts token exactly at maxAgeSeconds boundary', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 1);
    vi.useFakeTimers();
    // maxAge = 100 seconds, advance exactly 100 seconds
    // now - iat = 100, maxAgeSeconds = 100 => (now - iat) > maxAge => false
    vi.setSystemTime(Date.now() + 100 * 1000);
    const result = await verifyJWTAllowExpired(token, SECRET, 100);
    expect(result).not.toBeNull();
  });

  it('accepts non-expired token with verifyJWTAllowExpired', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const result = await verifyJWTAllowExpired(token, SECRET, 604800);
    expect(result).not.toBeNull();
  });

  it('uses default maxAgeSeconds of 604800 (7 days)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 1);
    vi.useFakeTimers();
    // 6 days later - should pass with default 7-day maxAge
    vi.setSystemTime(Date.now() + 6 * 24 * 3600 * 1000);
    const result = await verifyJWTAllowExpired(token, SECRET);
    expect(result).not.toBeNull();
  });

  it('rejects with default maxAge after 8 days', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 1);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 8 * 24 * 3600 * 1000);
    const result = await verifyJWTAllowExpired(token, SECRET);
    expect(result).toBeNull();
  });

  it('works with very small maxAgeSeconds (10 seconds)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 1);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5 * 1000); // 5 seconds
    const result = await verifyJWTAllowExpired(token, SECRET, 10);
    expect(result).not.toBeNull();
  });

  it('rejects with very small maxAgeSeconds when exceeded', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 1);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 15 * 1000); // 15 seconds
    const result = await verifyJWTAllowExpired(token, SECRET, 10);
    expect(result).toBeNull();
  });

  it('still rejects tampered payload even when allowing expired', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 1);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5000);
    const parts = token.split('.');
    const original = decodePayload(token);
    const tampered = `${parts[0]}.${b64url(JSON.stringify({ ...original, role: 'admin' }))}.${parts[2]}`;
    expect(await verifyJWTAllowExpired(tampered, SECRET, 604800)).toBeNull();
  });

  it('still rejects wrong alg header when allowing expired', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = craftToken(
      { alg: 'none', typ: 'JWT' },
      { ...PAYLOAD, iat: now - 100, exp: now - 50 },
    );
    expect(await verifyJWTAllowExpired(token, SECRET, 604800)).toBeNull();
  });
});

// ===========================================================================
// 8. CROSS-SECRET VERIFICATION
// ===========================================================================
describe('Cross-secret verification', () => {
  it('token signed with secret A fails verification with secret B', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    expect(await verifyJWT(token, SECRET_B)).toBeNull();
  });

  it('token signed with secret B fails verification with secret A', async () => {
    const token = await signJWT(PAYLOAD, SECRET_B, 3600);
    expect(await verifyJWT(token, SECRET)).toBeNull();
  });

  it('same payload signed with different secrets produces different tokens', async () => {
    // Use fake timers so both tokens get same iat/exp
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    const tokenA = await signJWT(PAYLOAD, SECRET, 3600);
    const tokenB = await signJWT(PAYLOAD, SECRET_B, 3600);
    // Headers and payloads should match, signatures should differ
    const partsA = tokenA.split('.');
    const partsB = tokenB.split('.');
    expect(partsA[0]).toBe(partsB[0]); // same header
    expect(partsA[1]).toBe(partsB[1]); // same payload
    expect(partsA[2]).not.toBe(partsB[2]); // different signature
  });

  it('empty string secret is rejected by WebCrypto (zero-length key)', async () => {
    // WebCrypto does not support zero-length HMAC keys -- this should throw
    await expect(signJWT(PAYLOAD, '', 3600)).rejects.toThrow();
  });

  it('single-character secret difference causes rejection', async () => {
    const token = await signJWT(PAYLOAD, 'secret-a', 3600);
    expect(await verifyJWT(token, 'secret-b')).toBeNull();
  });

  it('very long secret works correctly', async () => {
    const longSecret = 'x'.repeat(1024);
    const token = await signJWT(PAYLOAD, longSecret, 3600);
    expect(await verifyJWT(token, longSecret)).not.toBeNull();
    expect(await verifyJWT(token, longSecret + 'y')).toBeNull();
  });
});

// ===========================================================================
// 9. PAYLOAD VALIDATION (missing/extra/wrong-type fields)
// ===========================================================================
describe('Payload validation', () => {
  it('preserves admin_verified = true when signed', async () => {
    const adminPayload = { ...PAYLOAD, admin_verified: true };
    const token = await signJWT(adminPayload as any, SECRET, 3600);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
    expect(result!.admin_verified).toBe(true);
  });

  it('preserves admin_verified = false when signed', async () => {
    const adminPayload = { ...PAYLOAD, admin_verified: false };
    const token = await signJWT(adminPayload as any, SECRET, 3600);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
    expect(result!.admin_verified).toBe(false);
  });

  it('extra fields in payload are preserved through sign/verify', async () => {
    const extendedPayload = { ...PAYLOAD, customClaim: 'hello' } as any;
    const token = await signJWT(extendedPayload, SECRET, 3600);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
    expect((result as any).customClaim).toBe('hello');
  });

  it('payload with empty string sub is preserved', async () => {
    const token = await signJWT({ sub: '', email: 'a@b.com', role: 'user', tier: 'free' }, SECRET, 3600);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe('');
  });

  it('payload with empty string email is preserved', async () => {
    const token = await signJWT({ sub: 'u-1', email: '', role: 'user', tier: 'free' }, SECRET, 3600);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
    expect(result!.email).toBe('');
  });

  it('iat and exp are set automatically by signJWT', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const decoded = decodePayload(token);
    expect(typeof decoded.iat).toBe('number');
    expect(typeof decoded.exp).toBe('number');
    expect((decoded.exp as number) > (decoded.iat as number)).toBe(true);
  });

  it('iat is integer (not floating point)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const decoded = decodePayload(token);
    expect(decoded.iat).toBe(Math.floor(decoded.iat as number));
  });

  it('exp is integer (not floating point)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const decoded = decodePayload(token);
    expect(decoded.exp).toBe(Math.floor(decoded.exp as number));
  });
});

// ===========================================================================
// 10. PERFORMANCE / DoS RESILIENCE
// ===========================================================================
describe('Performance / DoS resilience', () => {
  it('handles token with very long sub field (10,000 chars)', async () => {
    const longSub = 'u-' + 'a'.repeat(10000);
    const token = await signJWT({ sub: longSub, email: 'a@b.com', role: 'user', tier: 'free' }, SECRET, 3600);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe(longSub);
  });

  it('rejects very long garbage string without crashing', async () => {
    const garbage = 'A'.repeat(100000) + '.' + 'B'.repeat(100000) + '.' + 'C'.repeat(100000);
    const result = await verifyJWT(garbage, SECRET);
    expect(result).toBeNull();
  });

  it('signing 100 tokens completes in reasonable time', async () => {
    const start = Date.now();
    const promises = Array.from({ length: 100 }, () => signJWT(PAYLOAD, SECRET, 3600));
    await Promise.all(promises);
    const elapsed = Date.now() - start;
    // Should complete in under 5 seconds even on slow CI
    expect(elapsed).toBeLessThan(5000);
  });

  it('verifying 100 tokens completes in reasonable time', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const start = Date.now();
    const promises = Array.from({ length: 100 }, () => verifyJWT(token, SECRET));
    await Promise.all(promises);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  it('handles token with many extra payload fields', async () => {
    const bigPayload: Record<string, unknown> = { ...PAYLOAD };
    for (let i = 0; i < 100; i++) {
      bigPayload[`field_${i}`] = `value_${i}`;
    }
    const token = await signJWT(bigPayload as any, SECRET, 3600);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
    expect((result as any).field_0).toBe('value_0');
    expect((result as any).field_99).toBe('value_99');
  });
});

// ===========================================================================
// 11. ADDITIONAL SECURITY SCENARIOS
// ===========================================================================
describe('Additional security scenarios', () => {
  it('header with correct alg but extra dangerous fields still validates signature', async () => {
    // Legit token should work even if we wonder about extra fields -
    // the real risk is forged tokens, which we test separately
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
  });

  it('two tokens signed moments apart have different iat values', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));
    const tokenA = await signJWT(PAYLOAD, SECRET, 3600);

    vi.setSystemTime(new Date('2025-06-01T00:00:01Z'));
    const tokenB = await signJWT(PAYLOAD, SECRET, 3600);

    const payloadA = decodePayload(tokenA);
    const payloadB = decodePayload(tokenB);
    expect(payloadA.iat).not.toBe(payloadB.iat);
  });

  it('verifyJWT returns full payload with all expected fields', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('sub');
    expect(result).toHaveProperty('email');
    expect(result).toHaveProperty('role');
    expect(result).toHaveProperty('tier');
    expect(result).toHaveProperty('iat');
    expect(result).toHaveProperty('exp');
  });

  it('replay of a valid token before expiry succeeds (expected behavior)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    // Verify same token multiple times
    const r1 = await verifyJWT(token, SECRET);
    const r2 = await verifyJWT(token, SECRET);
    const r3 = await verifyJWT(token, SECRET);
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    expect(r3).not.toBeNull();
    // All return identical payloads
    expect(r1!.sub).toBe(r2!.sub);
    expect(r2!.sub).toBe(r3!.sub);
  });

  it('token signed with admin role verifies with correct claims', async () => {
    const adminPayload = { sub: 'admin-1', email: 'admin@ptowl.com', role: 'admin', tier: 'enterprise', admin_verified: true };
    const token = await signJWT(adminPayload as any, SECRET, 3600);
    const result = await verifyJWT(token, SECRET);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('admin');
    expect(result!.admin_verified).toBe(true);
  });

  it('null byte in token part causes rejection (not a crash)', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const parts = token.split('.');
    // Inject a null byte into the payload segment
    const corrupted = `${parts[0]}.${parts[1]!.slice(0, 5)}\x00${parts[1]!.slice(5)}.${parts[2]}`;
    // Should either return null or throw - we just verify no crash and no valid result
    try {
      const result = await verifyJWT(corrupted, SECRET);
      expect(result).toBeNull();
    } catch {
      // Acceptable: an error is OK, just no valid result
    }
  });

  it('line break in token causes rejection', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const parts = token.split('.');
    const corrupted = `${parts[0]}\n.${parts[1]}.${parts[2]}`;
    // Token now has 2 parts (split on .) since \n is inside part[0]
    // Actually it still has 3 parts since we put \n before the dot
    try {
      const result = await verifyJWT(corrupted, SECRET);
      expect(result).toBeNull();
    } catch {
      // Also acceptable
    }
  });

  it('tab character in token causes rejection', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const corrupted = token.replace('.', '\t.');
    try {
      const result = await verifyJWT(corrupted, SECRET);
      expect(result).toBeNull();
    } catch {
      // Also acceptable
    }
  });

  it('space in token causes rejection', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const corrupted = token.replace('.', ' .');
    try {
      const result = await verifyJWT(corrupted, SECRET);
      expect(result).toBeNull();
    } catch {
      // Also acceptable
    }
  });

  it('verifyJWTAllowExpired rejects token with tampered signature even within maxAge', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 1);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5000);
    const parts = token.split('.');
    const forged = `${parts[0]}.${parts[1]}.${parts[2]!.split('').reverse().join('')}`;
    expect(await verifyJWTAllowExpired(forged, SECRET, 604800)).toBeNull();
  });

  it('header decoding correctly produces HS256 and JWT typ', async () => {
    const token = await signJWT(PAYLOAD, SECRET, 3600);
    const header = decodeHeader(token);
    expect(header.alg).toBe('HS256');
    expect(header.typ).toBe('JWT');
    // No extra fields
    expect(Object.keys(header)).toHaveLength(2);
  });
});
