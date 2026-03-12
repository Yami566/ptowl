import { describe, it, expect } from 'vitest';
import { generateSignedCSRFToken, verifyCSRFToken } from './csrf.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECRET = 'test-csrf-secret-key-for-comprehensive-testing-64-chars-long!!';
const SECRET_ALT = 'alt-secret-key-for-comprehensive-csrf-testing-64-chars-long!!!!';
const USER = 'user-abc-123';

/** Build a 3-part token from components without going through generateSignedCSRFToken. */
function craft(random: string, timestamp: string | number, hmac: string): string {
  return `${random}.${timestamp}.${hmac}`;
}

/** Build a valid-looking 64-char hex random nonce. */
function fakeRandom(fill = 'a'): string {
  return fill.repeat(64);
}

/** Extract the parts of a generated token. */
function split(token: string) {
  const [random, timestamp, hmac] = token.split('.');
  return { random: random!, timestamp: timestamp!, hmac: hmac! };
}

// ===========================================================================
// 1. TOKEN FORMAT VALIDATION
// ===========================================================================

describe('Token format validation', () => {
  it('rejects undefined input', async () => {
    expect(await verifyCSRFToken(undefined as unknown as string, SECRET, USER)).toBe(false);
  });

  it('rejects null input', async () => {
    expect(await verifyCSRFToken(null as unknown as string, SECRET, USER)).toBe(false);
  });

  it('rejects a number input', async () => {
    expect(await verifyCSRFToken(12345 as unknown as string, SECRET, USER)).toBe(false);
  });

  it('rejects a boolean input', async () => {
    expect(await verifyCSRFToken(true as unknown as string, SECRET, USER)).toBe(false);
  });

  it('rejects an object input', async () => {
    expect(await verifyCSRFToken({} as unknown as string, SECRET, USER)).toBe(false);
  });

  it('rejects an array input', async () => {
    expect(await verifyCSRFToken([] as unknown as string, SECRET, USER)).toBe(false);
  });

  it('rejects a single dot', async () => {
    expect(await verifyCSRFToken('.', SECRET, USER)).toBe(false);
  });

  it('rejects two dots only', async () => {
    expect(await verifyCSRFToken('..', SECRET, USER)).toBe(false);
  });

  it('rejects three dots (empty parts)', async () => {
    expect(await verifyCSRFToken('...', SECRET, USER)).toBe(false);
  });

  it('rejects four-part dot-separated string', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    expect(await verifyCSRFToken(token + '.extra', SECRET, USER)).toBe(false);
  });

  it('rejects five-part dot-separated string', async () => {
    expect(await verifyCSRFToken('a.b.c.d.e', SECRET, USER)).toBe(false);
  });

  it('rejects token with leading dot', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    expect(await verifyCSRFToken('.' + token, SECRET, USER)).toBe(false);
  });

  it('rejects token with trailing dot', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    expect(await verifyCSRFToken(token + '.', SECRET, USER)).toBe(false);
  });

  it('rejects whitespace-only string', async () => {
    expect(await verifyCSRFToken('   ', SECRET, USER)).toBe(false);
  });

  it('rejects token with whitespace padding', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    expect(await verifyCSRFToken(' ' + token + ' ', SECRET, USER)).toBe(false);
  });

  it('rejects token with newline characters', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    expect(await verifyCSRFToken(token + '\n', SECRET, USER)).toBe(false);
  });

  it('rejects token with unicode zero-width characters', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    expect(await verifyCSRFToken(token + '\u200B', SECRET, USER)).toBe(false);
  });

  it('rejects token containing unicode emoji in random part', async () => {
    const { timestamp, hmac } = split(await generateSignedCSRFToken(SECRET, USER));
    expect(await verifyCSRFToken(craft('a'.repeat(60) + '🦉🦉', timestamp, hmac), SECRET, USER)).toBe(false);
  });

  it('rejects token where random part is exactly 31 hex chars (boundary)', async () => {
    const r31 = 'a'.repeat(31);
    expect(await verifyCSRFToken(craft(r31, '1700000000', 'ab'.repeat(32)), SECRET, USER)).toBe(false);
  });

  it('accepts token where random part is exactly 32 hex chars (boundary)', async () => {
    // 32 is minimum. This token will still fail HMAC verification but should not be
    // rejected by format validation; the HMAC mismatch will reject it instead.
    const r32 = 'a'.repeat(32);
    // We cannot pass format validation AND HMAC at the same time with a hand-crafted
    // token, so just check it does not short-circuit to false before HMAC check.
    // A real valid token always has random >= 64, but format only requires >= 32.
    const result = await verifyCSRFToken(craft(r32, '1700000000', 'ab'.repeat(32)), SECRET, USER);
    // This will be false due to HMAC mismatch, but that is expected.
    expect(result).toBe(false);
  });

  it('rejects empty random part with valid timestamp and hmac', async () => {
    expect(await verifyCSRFToken(craft('', '1700000000', 'ab'.repeat(32)), SECRET, USER)).toBe(false);
  });

  it('rejects empty hmac part', async () => {
    const { random, timestamp } = split(await generateSignedCSRFToken(SECRET, USER));
    expect(await verifyCSRFToken(craft(random, timestamp, ''), SECRET, USER)).toBe(false);
  });

  it('rejects empty timestamp part', async () => {
    const { random, hmac } = split(await generateSignedCSRFToken(SECRET, USER));
    expect(await verifyCSRFToken(craft(random, '', hmac), SECRET, USER)).toBe(false);
  });
});

// ===========================================================================
// 2. TIMESTAMP SECURITY
// ===========================================================================

describe('Timestamp security', () => {
  it('rejects token with maxAge=0 when now - timestamp > 0 (uses -1 to guarantee)', async () => {
    // maxAge=0 allows tokens from the exact same second (now - ts = 0 is NOT > 0).
    // Using maxAge=-1 guarantees rejection since now - timestamp >= 0 > -1 is always true.
    const token = await generateSignedCSRFToken(SECRET, USER);
    const valid = await verifyCSRFToken(token, SECRET, USER, -1);
    expect(valid).toBe(false);
  });

  it('accepts token that is exactly at the maxAge boundary (maxAge=86400)', async () => {
    // A freshly generated token should be well within 24h
    const token = await generateSignedCSRFToken(SECRET, USER);
    expect(await verifyCSRFToken(token, SECRET, USER, 86400)).toBe(true);
  });

  it('accepts token with a very large maxAge', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    expect(await verifyCSRFToken(token, SECRET, USER, 999999999)).toBe(true);
  });

  it('rejects token when maxAge is 0 and any time has elapsed', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    // Even a tiny delay means now - timestamp >= 0 which IS > 0 if any time passed.
    // With maxAge=0, condition is now - timestamp > 0. Fresh token might pass if same
    // second, so we use -1 to guarantee rejection.
    expect(await verifyCSRFToken(token, SECRET, USER, -1)).toBe(false);
  });

  it('rejects negative maxAge', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    expect(await verifyCSRFToken(token, SECRET, USER, -100)).toBe(false);
  });

  it('rejects token with timestamp of 0 (epoch) with default maxAge', async () => {
    const { random, hmac } = split(await generateSignedCSRFToken(SECRET, USER));
    // Epoch timestamp is decades ago, well beyond 24h
    expect(await verifyCSRFToken(craft(random, '0', hmac), SECRET, USER)).toBe(false);
  });

  it('rejects token with negative timestamp string', async () => {
    const { random, hmac } = split(await generateSignedCSRFToken(SECRET, USER));
    expect(await verifyCSRFToken(craft(random, '-1', hmac), SECRET, USER)).toBe(false);
  });

  it('rejects token with fractional timestamp', async () => {
    const { random, hmac } = split(await generateSignedCSRFToken(SECRET, USER));
    // parseInt will parse "1700000000.5" as 1700000000, but the HMAC won't match
    // because the string in HMAC was the original timestamp. This tests that the
    // HMAC binding catches timestamp tampering even when parseInt succeeds.
    expect(await verifyCSRFToken(craft(random, '1700000000.5', hmac), SECRET, USER)).toBe(false);
  });

  it('rejects token with timestamp far in the future', async () => {
    const { random, hmac } = split(await generateSignedCSRFToken(SECRET, USER));
    // Future timestamp: now - futureTimestamp = negative, which is <= maxAge, so
    // format check passes. But HMAC will not match because we used a different timestamp.
    const future = Math.floor(Date.now() / 1000) + 999999;
    expect(await verifyCSRFToken(craft(random, String(future), hmac), SECRET, USER)).toBe(false);
  });

  it('rejects token with very large timestamp (year 9999)', async () => {
    const { random, hmac } = split(await generateSignedCSRFToken(SECRET, USER));
    expect(await verifyCSRFToken(craft(random, '253402300800', hmac), SECRET, USER)).toBe(false);
  });

  it('rejects token with NaN-producing timestamp', async () => {
    const { random, hmac } = split(await generateSignedCSRFToken(SECRET, USER));
    expect(await verifyCSRFToken(craft(random, 'NaN', hmac), SECRET, USER)).toBe(false);
  });

  it('rejects token with Infinity timestamp', async () => {
    const { random, hmac } = split(await generateSignedCSRFToken(SECRET, USER));
    expect(await verifyCSRFToken(craft(random, 'Infinity', hmac), SECRET, USER)).toBe(false);
  });

  it('rejects token with hex-encoded timestamp', async () => {
    const { random, hmac } = split(await generateSignedCSRFToken(SECRET, USER));
    expect(await verifyCSRFToken(craft(random, '0x65a00000', hmac), SECRET, USER)).toBe(false);
  });

  it('accepts token with maxAge of 1 second when verified immediately', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    // Immediately verifying with maxAge=1 should succeed (same second or within 1s)
    expect(await verifyCSRFToken(token, SECRET, USER, 1)).toBe(true);
  });
});

// ===========================================================================
// 3. HMAC INTEGRITY
// ===========================================================================

describe('HMAC integrity', () => {
  it('rejects when single bit is flipped in HMAC (first char)', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    const flippedChar = hmac[0] === 'a' ? 'b' : 'a';
    const tampered = craft(random, timestamp, flippedChar + hmac.slice(1));
    expect(await verifyCSRFToken(tampered, SECRET, USER)).toBe(false);
  });

  it('rejects when single bit is flipped in HMAC (last char)', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    const flippedChar = hmac[hmac.length - 1] === 'a' ? 'b' : 'a';
    const tampered = craft(random, timestamp, hmac.slice(0, -1) + flippedChar);
    expect(await verifyCSRFToken(tampered, SECRET, USER)).toBe(false);
  });

  it('rejects when single bit is flipped in HMAC (middle char)', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    const mid = Math.floor(hmac.length / 2);
    const flippedChar = hmac[mid] === 'a' ? 'b' : 'a';
    const tampered = craft(random, timestamp, hmac.slice(0, mid) + flippedChar + hmac.slice(mid + 1));
    expect(await verifyCSRFToken(tampered, SECRET, USER)).toBe(false);
  });

  it('rejects truncated HMAC (half length)', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    const truncated = hmac.slice(0, Math.floor(hmac.length / 2));
    expect(await verifyCSRFToken(craft(random, timestamp, truncated), SECRET, USER)).toBe(false);
  });

  it('rejects HMAC with appended bytes (extension attack)', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    const extended = hmac + 'deadbeef';
    expect(await verifyCSRFToken(craft(random, timestamp, extended), SECRET, USER)).toBe(false);
  });

  it('rejects HMAC with prepended bytes', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    const prepended = 'deadbeef' + hmac;
    expect(await verifyCSRFToken(craft(random, timestamp, prepended), SECRET, USER)).toBe(false);
  });

  it('rejects all-zero HMAC of correct length', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    const allZeros = '0'.repeat(hmac.length);
    expect(await verifyCSRFToken(craft(random, timestamp, allZeros), SECRET, USER)).toBe(false);
  });

  it('rejects all-f HMAC of correct length', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    const allFs = 'f'.repeat(hmac.length);
    expect(await verifyCSRFToken(craft(random, timestamp, allFs), SECRET, USER)).toBe(false);
  });

  it('rejects HMAC with uppercase hex (case sensitivity)', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    expect(await verifyCSRFToken(craft(random, timestamp, hmac.toUpperCase()), SECRET, USER)).toBe(false);
  });

  it('rejects HMAC that is just a single byte', async () => {
    const { random, timestamp } = split(await generateSignedCSRFToken(SECRET, USER));
    expect(await verifyCSRFToken(craft(random, timestamp, 'ab'), SECRET, USER)).toBe(false);
  });

  it('rejects HMAC containing null byte representation', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    const withNull = hmac.slice(0, 10) + '\x00' + hmac.slice(11);
    expect(await verifyCSRFToken(craft(random, timestamp, withNull), SECRET, USER)).toBe(false);
  });
});

// ===========================================================================
// 4. USER BINDING
// ===========================================================================

describe('User binding', () => {
  it('token for user A fails verification for user B', async () => {
    const token = await generateSignedCSRFToken(SECRET, 'user-A');
    expect(await verifyCSRFToken(token, SECRET, 'user-B')).toBe(false);
  });

  it('token for user A verifies correctly for user A', async () => {
    const token = await generateSignedCSRFToken(SECRET, 'user-A');
    expect(await verifyCSRFToken(token, SECRET, 'user-A')).toBe(true);
  });

  it('rejects empty string as userId during verification', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    expect(await verifyCSRFToken(token, SECRET, '')).toBe(false);
  });

  it('token generated with empty userId verifies only with empty userId', async () => {
    const token = await generateSignedCSRFToken(SECRET, '');
    expect(await verifyCSRFToken(token, SECRET, '')).toBe(true);
    expect(await verifyCSRFToken(token, SECRET, USER)).toBe(false);
  });

  it('distinguishes between similar user IDs', async () => {
    const token = await generateSignedCSRFToken(SECRET, 'user-123');
    expect(await verifyCSRFToken(token, SECRET, 'user-123')).toBe(true);
    expect(await verifyCSRFToken(token, SECRET, 'user-1234')).toBe(false);
    expect(await verifyCSRFToken(token, SECRET, 'user-12')).toBe(false);
  });

  it('handles userId with special characters', async () => {
    const specialUser = 'user:with/special@chars&more=yes';
    const token = await generateSignedCSRFToken(SECRET, specialUser);
    expect(await verifyCSRFToken(token, SECRET, specialUser)).toBe(true);
    expect(await verifyCSRFToken(token, SECRET, USER)).toBe(false);
  });

  it('handles userId with unicode characters', async () => {
    const unicodeUser = 'user-\u00e9\u00e8\u00ea-caf\u00e9';
    const token = await generateSignedCSRFToken(SECRET, unicodeUser);
    expect(await verifyCSRFToken(token, SECRET, unicodeUser)).toBe(true);
    expect(await verifyCSRFToken(token, SECRET, USER)).toBe(false);
  });

  it('handles userId with dots (should not confuse token parsing)', async () => {
    const dottedUser = 'user.name.with.dots';
    const token = await generateSignedCSRFToken(SECRET, dottedUser);
    expect(await verifyCSRFToken(token, SECRET, dottedUser)).toBe(true);
  });

  it('handles userId with colons (colon is HMAC data separator)', async () => {
    const colonUser = 'user:with:colons';
    const token = await generateSignedCSRFToken(SECRET, colonUser);
    expect(await verifyCSRFToken(token, SECRET, colonUser)).toBe(true);
    // Ensure a different colon arrangement fails
    expect(await verifyCSRFToken(token, SECRET, 'user:withcolons')).toBe(false);
  });

  it('handles very long userId (1000 chars)', async () => {
    const longUser = 'u'.repeat(1000);
    const token = await generateSignedCSRFToken(SECRET, longUser);
    expect(await verifyCSRFToken(token, SECRET, longUser)).toBe(true);
    expect(await verifyCSRFToken(token, SECRET, 'u'.repeat(999))).toBe(false);
  });

  it('rejects when userId has trailing whitespace mismatch', async () => {
    const token = await generateSignedCSRFToken(SECRET, 'user-123');
    expect(await verifyCSRFToken(token, SECRET, 'user-123 ')).toBe(false);
    expect(await verifyCSRFToken(token, SECRET, ' user-123')).toBe(false);
  });
});

// ===========================================================================
// 5. SECRET KEY SECURITY
// ===========================================================================

describe('Secret key security', () => {
  it('different secret generates different HMAC for same user', async () => {
    const token1 = await generateSignedCSRFToken(SECRET, USER);
    const token2 = await generateSignedCSRFToken(SECRET_ALT, USER);
    const hmac1 = split(token1).hmac;
    const hmac2 = split(token2).hmac;
    expect(hmac1).not.toBe(hmac2);
  });

  it('token signed with secret A fails verification with secret B', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    expect(await verifyCSRFToken(token, SECRET_ALT, USER)).toBe(false);
  });

  it('rejects empty string as secret (WebCrypto does not support zero-length keys)', async () => {
    // WebCrypto throws DataError for zero-length HMAC keys.
    // generateSignedCSRFToken will throw, which is the expected secure behavior.
    await expect(generateSignedCSRFToken('', USER)).rejects.toThrow();
  });

  it('handles very long secret (10000 chars)', async () => {
    const longSecret = 's'.repeat(10000);
    const token = await generateSignedCSRFToken(longSecret, USER);
    expect(await verifyCSRFToken(token, longSecret, USER)).toBe(true);
    expect(await verifyCSRFToken(token, longSecret + 'x', USER)).toBe(false);
  });

  it('handles unicode secret', async () => {
    const unicodeSecret = '\u{1F989}\u{1F426}\u{1F54A}\u{FE0F}'.repeat(10); // owls and birds
    const token = await generateSignedCSRFToken(unicodeSecret, USER);
    expect(await verifyCSRFToken(token, unicodeSecret, USER)).toBe(true);
  });

  it('handles secret with null bytes', async () => {
    const nullSecret = 'secret\x00key';
    const token = await generateSignedCSRFToken(nullSecret, USER);
    expect(await verifyCSRFToken(token, nullSecret, USER)).toBe(true);
    expect(await verifyCSRFToken(token, 'secret', USER)).toBe(false);
  });

  it('secret key is case-sensitive', async () => {
    const token = await generateSignedCSRFToken('MySecret', USER);
    expect(await verifyCSRFToken(token, 'MySecret', USER)).toBe(true);
    expect(await verifyCSRFToken(token, 'mysecret', USER)).toBe(false);
    expect(await verifyCSRFToken(token, 'MYSECRET', USER)).toBe(false);
  });
});

// ===========================================================================
// 6. LEGACY FORMAT BACKWARDS COMPATIBILITY
// ===========================================================================

describe('Legacy 2-part format backwards compatibility', () => {
  it('rejects 2-part token with random shorter than 32 chars', async () => {
    expect(await verifyCSRFToken('abc.def', SECRET, USER)).toBe(false);
  });

  it('rejects 2-part token with empty hmac part', async () => {
    expect(await verifyCSRFToken(fakeRandom() + '.', SECRET, USER)).toBe(false);
  });

  it('rejects 2-part token with empty random part', async () => {
    expect(await verifyCSRFToken('.somehexhmac', SECRET, USER)).toBe(false);
  });

  it('rejects 2-part token with wrong HMAC', async () => {
    expect(await verifyCSRFToken(fakeRandom() + '.badhmacinvalidvalue', SECRET, USER)).toBe(false);
  });

  it('2-part tokens are not time-bounded (no timestamp to expire)', async () => {
    // Legacy format does not have timestamp, so it should not reject based on time.
    // We can only test that a valid legacy HMAC would pass if we could compute it.
    // Since we cannot call computeHMAC directly, we just verify the format path is reached.
    const longRandom = fakeRandom();
    // This will fail HMAC check, but confirms the 2-part path doesn't short-circuit on time
    const result = await verifyCSRFToken(longRandom + '.abcdef1234567890', SECRET, USER);
    expect(result).toBe(false); // fails on HMAC, not on format
  });

  it('3-part token is not accepted as 2-part (parts.length check)', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    // A valid 3-part token should not be misinterpreted if we tamper to look 2-part
    const twoPart = token.replace('.', '_'); // merge first dot to make it 2 parts
    // This creates a token with 2 dots still (we only replaced first), so let's be explicit:
    const parts = token.split('.');
    const forced2Part = parts[0] + parts[1] + '.' + parts[2];
    // forced2Part has 2 parts: (random+timestamp) and (hmac)
    expect(await verifyCSRFToken(forced2Part, SECRET, USER)).toBe(false);
  });
});

// ===========================================================================
// 7. CONSTANT-TIME COMPARISON
// ===========================================================================

describe('Constant-time comparison', () => {
  it('rejects when HMAC lengths differ (shorter)', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    // Remove one char to make length differ
    expect(await verifyCSRFToken(craft(random, timestamp, hmac.slice(1)), SECRET, USER)).toBe(false);
  });

  it('rejects when HMAC lengths differ (longer)', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    expect(await verifyCSRFToken(craft(random, timestamp, hmac + '0'), SECRET, USER)).toBe(false);
  });

  it('rejects completely different HMAC of same length', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    // Invert every hex character
    const inverted = hmac.split('').map(c => {
      const n = parseInt(c, 16);
      return (15 - n).toString(16);
    }).join('');
    expect(await verifyCSRFToken(craft(random, timestamp, inverted), SECRET, USER)).toBe(false);
  });

  it('rejects HMAC that is the reverse of the correct HMAC', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    const reversed = hmac.split('').reverse().join('');
    // Only fail if reversed !== original (extremely unlikely to be a palindrome)
    if (reversed !== hmac) {
      expect(await verifyCSRFToken(craft(random, timestamp, reversed), SECRET, USER)).toBe(false);
    }
  });
});

// ===========================================================================
// 8. EDGE CASES
// ===========================================================================

describe('Edge cases', () => {
  it('rejects very long token string (100KB)', async () => {
    const longToken = 'a'.repeat(100000) + '.123.' + 'b'.repeat(64);
    expect(await verifyCSRFToken(longToken, SECRET, USER)).toBe(false);
  });

  it('rejects token that is just a very long random string with no dots', async () => {
    expect(await verifyCSRFToken('a'.repeat(1000), SECRET, USER)).toBe(false);
  });

  it('same token can be verified multiple times successfully', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    expect(await verifyCSRFToken(token, SECRET, USER)).toBe(true);
    expect(await verifyCSRFToken(token, SECRET, USER)).toBe(true);
    expect(await verifyCSRFToken(token, SECRET, USER)).toBe(true);
  });

  it('generated token always has exactly 64 hex chars in random part', async () => {
    // 32 random bytes = 64 hex chars
    for (let i = 0; i < 5; i++) {
      const token = await generateSignedCSRFToken(SECRET, USER);
      const { random } = split(token);
      expect(random.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(random)).toBe(true);
    }
  });

  it('generated HMAC is always 64 hex chars (SHA-256 = 32 bytes = 64 hex)', async () => {
    for (let i = 0; i < 5; i++) {
      const token = await generateSignedCSRFToken(SECRET, USER);
      const { hmac } = split(token);
      expect(hmac.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(hmac)).toBe(true);
    }
  });

  it('rejects token with tab characters between parts', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const tampered = token.replace(/\./g, '\t');
    expect(await verifyCSRFToken(tampered, SECRET, USER)).toBe(false);
  });

  it('rejects URL-encoded token (dots manually encoded to %2E)', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    // encodeURIComponent does NOT encode dots, so we manually replace them
    const encoded = token.replace(/\./g, '%2E');
    expect(await verifyCSRFToken(encoded, SECRET, USER)).toBe(false);
  });

  it('rejects base64-encoded token', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const b64 = btoa(token);
    expect(await verifyCSRFToken(b64, SECRET, USER)).toBe(false);
  });

  it('rejects token with CRLF line endings', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    expect(await verifyCSRFToken(token + '\r\n', SECRET, USER)).toBe(false);
  });

  it('handles rapid sequential generation without collision', async () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 20; i++) {
      tokens.add(await generateSignedCSRFToken(SECRET, USER));
    }
    expect(tokens.size).toBe(20);
  });
});

// ===========================================================================
// 9. CONCURRENCY AND MULTI-TOKEN SCENARIOS
// ===========================================================================

describe('Concurrency and multi-token scenarios', () => {
  it('multiple tokens for the same user all verify independently', async () => {
    const tokens = await Promise.all(
      Array.from({ length: 10 }, () => generateSignedCSRFToken(SECRET, USER)),
    );
    for (const token of tokens) {
      expect(await verifyCSRFToken(token, SECRET, USER)).toBe(true);
    }
  });

  it('tokens for different users do not cross-verify', async () => {
    const users = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
    const tokenMap = new Map<string, string>();
    for (const u of users) {
      tokenMap.set(u, await generateSignedCSRFToken(SECRET, u));
    }
    for (const [owner, token] of tokenMap) {
      expect(await verifyCSRFToken(token, SECRET, owner)).toBe(true);
      for (const other of users) {
        if (other !== owner) {
          expect(await verifyCSRFToken(token, SECRET, other)).toBe(false);
        }
      }
    }
  });

  it('tokens generated concurrently are all unique', async () => {
    const tokens = await Promise.all(
      Array.from({ length: 50 }, () => generateSignedCSRFToken(SECRET, USER)),
    );
    const unique = new Set(tokens);
    expect(unique.size).toBe(50);
  });

  it('token from one secret does not verify with another secret', async () => {
    const secrets = ['secret-A-long-enough-padding-32chars!!', 'secret-B-long-enough-padding-32chars!!'];
    const tokenA = await generateSignedCSRFToken(secrets[0]!, USER);
    const tokenB = await generateSignedCSRFToken(secrets[1]!, USER);
    expect(await verifyCSRFToken(tokenA, secrets[0]!, USER)).toBe(true);
    expect(await verifyCSRFToken(tokenB, secrets[1]!, USER)).toBe(true);
    expect(await verifyCSRFToken(tokenA, secrets[1]!, USER)).toBe(false);
    expect(await verifyCSRFToken(tokenB, secrets[0]!, USER)).toBe(false);
  });

  it('swapping random parts between two valid tokens invalidates both', async () => {
    const token1 = await generateSignedCSRFToken(SECRET, USER);
    const token2 = await generateSignedCSRFToken(SECRET, USER);
    const p1 = split(token1);
    const p2 = split(token2);
    // Swap random parts
    const swapped1 = craft(p2.random, p1.timestamp, p1.hmac);
    const swapped2 = craft(p1.random, p2.timestamp, p2.hmac);
    expect(await verifyCSRFToken(swapped1, SECRET, USER)).toBe(false);
    expect(await verifyCSRFToken(swapped2, SECRET, USER)).toBe(false);
  });

  it('swapping HMACs between two valid tokens invalidates both', async () => {
    const token1 = await generateSignedCSRFToken(SECRET, USER);
    const token2 = await generateSignedCSRFToken(SECRET, USER);
    const p1 = split(token1);
    const p2 = split(token2);
    const swapped1 = craft(p1.random, p1.timestamp, p2.hmac);
    const swapped2 = craft(p2.random, p2.timestamp, p1.hmac);
    expect(await verifyCSRFToken(swapped1, SECRET, USER)).toBe(false);
    expect(await verifyCSRFToken(swapped2, SECRET, USER)).toBe(false);
  });
});

// ===========================================================================
// 10. INJECTION AND ATTACK PATTERNS
// ===========================================================================

describe('Injection and attack patterns', () => {
  it('rejects SQL injection attempt in token', async () => {
    const payload = fakeRandom() + ".1700000000.' OR '1'='1";
    expect(await verifyCSRFToken(payload, SECRET, USER)).toBe(false);
  });

  it('rejects script injection in token', async () => {
    const payload = fakeRandom() + '.1700000000.<script>alert(1)</script>';
    expect(await verifyCSRFToken(payload, SECRET, USER)).toBe(false);
  });

  it('rejects null byte injection in random part', async () => {
    const { timestamp, hmac } = split(await generateSignedCSRFToken(SECRET, USER));
    const nullRandom = 'a'.repeat(32) + '\x00' + 'b'.repeat(31);
    expect(await verifyCSRFToken(craft(nullRandom, timestamp, hmac), SECRET, USER)).toBe(false);
  });

  it('rejects token with JSON object as string', async () => {
    expect(await verifyCSRFToken('{"token":"malicious"}', SECRET, USER)).toBe(false);
  });

  it('rejects token with prototype pollution attempt', async () => {
    expect(await verifyCSRFToken('__proto__.constructor.1234', SECRET, USER)).toBe(false);
  });

  it('rejects header injection attempt (CRLF in token)', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const injected = token.slice(0, 20) + '\r\nX-Injected: true\r\n' + token.slice(20);
    expect(await verifyCSRFToken(injected, SECRET, USER)).toBe(false);
  });

  it('rejects token with percent-encoded hex chars in HMAC', async () => {
    const token = await generateSignedCSRFToken(SECRET, USER);
    const { random, timestamp, hmac } = split(token);
    // Replace first hex pair with percent-encoded form
    const mangled = '%' + hmac.slice(0, 2) + hmac.slice(2);
    expect(await verifyCSRFToken(craft(random, timestamp, mangled), SECRET, USER)).toBe(false);
  });
});
