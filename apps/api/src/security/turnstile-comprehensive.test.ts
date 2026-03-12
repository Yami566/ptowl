import { describe, it, expect, vi, afterEach } from 'vitest';
import { verifyTurnstile } from './turnstile.js';

/**
 * Comprehensive Turnstile verification tests (50+ additional tests).
 *
 * Categories:
 *  1. Production fail-closed behavior
 *  2. Dev/test bypass behavior
 *  3. Token validation
 *  4. API response handling
 *  5. Network resilience
 *  6. API URL verification
 *  7. Remote IP handling
 *  8. Environment parameter edge cases
 *  9. Error code propagation
 * 10. Response structure validation
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Helper: mock fetch to return a JSON body with a given status. */
function mockFetchJSON(body: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

/** Helper: mock fetch to return a raw string body with a given status. */
function mockFetchRaw(body: string, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(body, { status }),
  );
}

/** Helper: mock fetch to reject with an error. */
function mockFetchReject(error: unknown) {
  globalThis.fetch = vi.fn().mockRejectedValue(error);
}

/** Helper: capture the URLSearchParams body sent to fetch. */
function mockFetchCapture(): { getCapturedBody: () => string } {
  let capturedBody: URLSearchParams | undefined;
  globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
    capturedBody = init.body as unknown as URLSearchParams;
    return new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 });
  });
  return {
    getCapturedBody: () => capturedBody?.toString() || '',
  };
}

describe('Turnstile Comprehensive Tests', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Production fail-closed behavior
  // ---------------------------------------------------------------------------
  describe('1. Production fail-closed behavior', () => {
    it('fails closed when secret key is empty string in production', async () => {
      const result = await verifyTurnstile('valid-token', '', undefined, 'production');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('missing-secret-key');
    });

    it('fails closed when secret key is undefined-cast-to-string in production', async () => {
      const result = await verifyTurnstile('valid-token', undefined as unknown as string, undefined, 'production');
      expect(result.success).toBe(false);
    });

    it('fails closed when secret key is null-cast-to-string in production', async () => {
      const result = await verifyTurnstile('valid-token', null as unknown as string, undefined, 'production');
      expect(result.success).toBe(false);
    });

    it('logs a critical error message when secret key missing in production', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await verifyTurnstile('token', '', undefined, 'production');
      expect(consoleSpy).toHaveBeenCalledWith('CRITICAL: TURNSTILE_SECRET_KEY missing in production');
    });

    it('does not call fetch when secret key is missing in production', async () => {
      globalThis.fetch = vi.fn();
      await verifyTurnstile('token', '', undefined, 'production');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('returns exactly one error code when secret key is missing in production', async () => {
      const result = await verifyTurnstile('token', '', undefined, 'production');
      expect(result.errorCodes).toHaveLength(1);
      expect(result.errorCodes[0]).toBe('missing-secret-key');
    });

    it('still validates correctly in production when secret key IS present', async () => {
      mockFetchJSON({ success: true, 'error-codes': [] });
      const result = await verifyTurnstile('token', 'real-secret', undefined, 'production');
      expect(result.success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it('returns missing-input-response in production when secret exists but token is empty', async () => {
      const result = await verifyTurnstile('', 'real-secret', undefined, 'production');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('missing-input-response');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Dev/test bypass behavior
  // ---------------------------------------------------------------------------
  describe('2. Dev/test bypass behavior', () => {
    it('bypasses when secret key is empty and environment is undefined', async () => {
      const result = await verifyTurnstile('any-token', '');
      expect(result.success).toBe(true);
      expect(result.errorCodes).toEqual([]);
    });

    it('bypasses when secret key is empty and environment is "development"', async () => {
      const result = await verifyTurnstile('any-token', '', undefined, 'development');
      expect(result.success).toBe(true);
    });

    it('bypasses when secret key is empty and environment is "test"', async () => {
      const result = await verifyTurnstile('any-token', '', undefined, 'test');
      expect(result.success).toBe(true);
    });

    it('bypasses when secret key is empty and environment is "staging"', async () => {
      const result = await verifyTurnstile('any-token', '', undefined, 'staging');
      expect(result.success).toBe(true);
    });

    it('does not call fetch during bypass', async () => {
      globalThis.fetch = vi.fn();
      await verifyTurnstile('token', '');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('bypass returns empty errorCodes array, not undefined', async () => {
      const result = await verifyTurnstile('token', '');
      expect(Array.isArray(result.errorCodes)).toBe(true);
      expect(result.errorCodes).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Token validation
  // ---------------------------------------------------------------------------
  describe('3. Token validation', () => {
    it('rejects empty string token', async () => {
      const result = await verifyTurnstile('', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('missing-input-response');
    });

    it('rejects null token cast to string', async () => {
      const result = await verifyTurnstile(null as unknown as string, 'secret');
      expect(result.success).toBe(false);
    });

    it('rejects undefined token cast to string', async () => {
      const result = await verifyTurnstile(undefined as unknown as string, 'secret');
      expect(result.success).toBe(false);
    });

    it('sends a very long token (10KB) to the API without crashing', async () => {
      mockFetchJSON({ success: false, 'error-codes': ['invalid-input-response'] });
      const longToken = 'a'.repeat(10_000);
      const result = await verifyTurnstile(longToken, 'secret');
      expect(result.success).toBe(false);
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it('sends a token with special characters to the API', async () => {
      const capture = mockFetchCapture();
      const specialToken = '<script>alert(1)</script>&secret=injected';
      await verifyTurnstile(specialToken, 'secret');
      const body = capture.getCapturedBody();
      // URLSearchParams encodes special characters
      expect(body).toContain('response=');
      expect(body).not.toContain('<script>');
    });

    it('sends a token with unicode characters to the API', async () => {
      const capture = mockFetchCapture();
      await verifyTurnstile('\u{1F989}\u{1F426}', 'secret');
      const body = capture.getCapturedBody();
      expect(body).toContain('response=');
    });

    it('sends a whitespace-only token to the API', async () => {
      mockFetchJSON({ success: false, 'error-codes': ['invalid-input-response'] });
      const result = await verifyTurnstile('   ', 'secret');
      // Whitespace-only is truthy, so it reaches the fetch
      expect(globalThis.fetch).toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('sends a token with newlines/tabs to the API', async () => {
      const capture = mockFetchCapture();
      await verifyTurnstile('token\nwith\tnewlines', 'secret');
      const body = capture.getCapturedBody();
      expect(body).toContain('response=');
    });

    it('does not call fetch when token is missing', async () => {
      globalThis.fetch = vi.fn();
      await verifyTurnstile('', 'secret');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. API response handling
  // ---------------------------------------------------------------------------
  describe('4. API response handling', () => {
    it('handles single error code in response', async () => {
      mockFetchJSON({ success: false, 'error-codes': ['timeout-or-duplicate'] });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.errorCodes).toEqual(['timeout-or-duplicate']);
    });

    it('handles multiple error codes in response', async () => {
      mockFetchJSON({
        success: false,
        'error-codes': ['missing-input-secret', 'invalid-input-response', 'bad-request'],
      });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.errorCodes).toHaveLength(3);
      expect(result.errorCodes).toContain('missing-input-secret');
      expect(result.errorCodes).toContain('invalid-input-response');
      expect(result.errorCodes).toContain('bad-request');
    });

    it('handles malformed JSON response by catching parse error', async () => {
      mockFetchRaw('not valid json{{{');
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('network-error');
    });

    it('handles empty response body as parse error', async () => {
      mockFetchRaw('');
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('network-error');
    });

    it('handles HTTP 400 as api-error', async () => {
      mockFetchRaw('Bad Request', 400);
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('api-error');
    });

    it('handles HTTP 401 as api-error', async () => {
      mockFetchRaw('Unauthorized', 401);
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('api-error');
    });

    it('handles HTTP 403 as api-error', async () => {
      mockFetchRaw('Forbidden', 403);
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('api-error');
    });

    it('handles HTTP 429 (rate limited) as api-error', async () => {
      mockFetchRaw('Too Many Requests', 429);
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('api-error');
    });

    it('handles HTTP 503 (service unavailable) as api-error', async () => {
      mockFetchRaw('Service Unavailable', 503);
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('api-error');
    });

    it('handles partial JSON response (missing error-codes) by defaulting to empty array', async () => {
      mockFetchJSON({ success: true });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(true);
      expect(result.errorCodes).toEqual([]);
    });

    it('preserves extra fields in API response without breaking', async () => {
      mockFetchJSON({
        success: true,
        'error-codes': [],
        challenge_ts: '2026-03-09T12:00:00Z',
        hostname: 'ptowl.com',
        action: 'login',
        cdata: 'custom-data',
        extra_field: 'should-be-ignored',
      });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(true);
      expect(result.errorCodes).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Network resilience
  // ---------------------------------------------------------------------------
  describe('5. Network resilience', () => {
    it('handles timeout error (AbortError)', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      mockFetchReject(abortError);
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('network-error');
    });

    it('handles DNS resolution failure', async () => {
      mockFetchReject(new TypeError('Failed to fetch'));
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('network-error');
    });

    it('handles connection refused error', async () => {
      mockFetchReject(new Error('ECONNREFUSED'));
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('network-error');
    });

    it('handles TLS/SSL handshake error', async () => {
      mockFetchReject(new Error('SSL_ERROR_HANDSHAKE_FAILURE'));
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('network-error');
    });

    it('handles connection reset error', async () => {
      mockFetchReject(new Error('ECONNRESET'));
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('network-error');
    });

    it('handles socket hang up error', async () => {
      mockFetchReject(new Error('socket hang up'));
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('network-error');
    });

    it('handles non-Error thrown objects', async () => {
      mockFetchReject('string error');
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('network-error');
    });

    it('handles null thrown value', async () => {
      mockFetchReject(null);
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain('network-error');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. API URL verification
  // ---------------------------------------------------------------------------
  describe('6. API URL verification', () => {
    it('calls the exact Cloudflare siteverify URL', async () => {
      mockFetchJSON({ success: true, 'error-codes': [] });
      await verifyTurnstile('token', 'secret');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        SITEVERIFY_URL,
        expect.anything(),
      );
    });

    it('uses POST method', async () => {
      mockFetchJSON({ success: true, 'error-codes': [] });
      await verifyTurnstile('token', 'secret');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('sends body as URLSearchParams (form-encoded)', async () => {
      let capturedInit: RequestInit | undefined;
      globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        capturedInit = init;
        return new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 });
      });
      await verifyTurnstile('token', 'secret');
      expect(capturedInit?.body).toBeInstanceOf(URLSearchParams);
    });

    it('includes secret parameter in form data', async () => {
      const capture = mockFetchCapture();
      await verifyTurnstile('token', 'my-secret-key');
      expect(capture.getCapturedBody()).toContain('secret=my-secret-key');
    });

    it('includes response parameter in form data', async () => {
      const capture = mockFetchCapture();
      await verifyTurnstile('my-turnstile-token', 'secret');
      expect(capture.getCapturedBody()).toContain('response=my-turnstile-token');
    });

    it('calls fetch exactly once per invocation', async () => {
      mockFetchJSON({ success: true, 'error-codes': [] });
      await verifyTurnstile('token', 'secret');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Remote IP handling
  // ---------------------------------------------------------------------------
  describe('7. Remote IP handling', () => {
    it('includes IPv4 address in form data', async () => {
      const capture = mockFetchCapture();
      await verifyTurnstile('token', 'secret', '192.168.1.1');
      expect(capture.getCapturedBody()).toContain('remoteip=192.168.1.1');
    });

    it('includes IPv6 address in form data', async () => {
      const capture = mockFetchCapture();
      await verifyTurnstile('token', 'secret', '2001:0db8:85a3:0000:0000:8a2e:0370:7334');
      const body = capture.getCapturedBody();
      expect(body).toContain('remoteip=');
      expect(body).toContain('2001');
    });

    it('includes IPv6 loopback (::1) in form data', async () => {
      const capture = mockFetchCapture();
      await verifyTurnstile('token', 'secret', '::1');
      expect(capture.getCapturedBody()).toContain('remoteip=');
    });

    it('includes IPv4 loopback (127.0.0.1) in form data', async () => {
      const capture = mockFetchCapture();
      await verifyTurnstile('token', 'secret', '127.0.0.1');
      expect(capture.getCapturedBody()).toContain('remoteip=127.0.0.1');
    });

    it('includes private IP (10.x) in form data', async () => {
      const capture = mockFetchCapture();
      await verifyTurnstile('token', 'secret', '10.0.0.1');
      expect(capture.getCapturedBody()).toContain('remoteip=10.0.0.1');
    });

    it('omits remoteip when remoteIp is undefined', async () => {
      const capture = mockFetchCapture();
      await verifyTurnstile('token', 'secret', undefined);
      expect(capture.getCapturedBody()).not.toContain('remoteip');
    });

    it('omits remoteip when remoteIp is empty string (falsy)', async () => {
      const capture = mockFetchCapture();
      await verifyTurnstile('token', 'secret', '');
      expect(capture.getCapturedBody()).not.toContain('remoteip');
    });

    it('includes remoteip when a public IP is provided', async () => {
      const capture = mockFetchCapture();
      await verifyTurnstile('token', 'secret', '8.8.8.8');
      expect(capture.getCapturedBody()).toContain('remoteip=8.8.8.8');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Environment parameter edge cases
  // ---------------------------------------------------------------------------
  describe('8. Environment parameter edge cases', () => {
    it('treats undefined environment as non-production (bypass when no secret)', async () => {
      const result = await verifyTurnstile('token', '', undefined, undefined);
      expect(result.success).toBe(true);
    });

    it('treats null-cast environment as non-production', async () => {
      const result = await verifyTurnstile('token', '', undefined, null as unknown as string);
      expect(result.success).toBe(true);
    });

    it('treats empty string environment as non-production', async () => {
      const result = await verifyTurnstile('token', '', undefined, '');
      expect(result.success).toBe(true);
    });

    it('only "production" exact match triggers fail-closed', async () => {
      const result = await verifyTurnstile('token', '', undefined, 'Production');
      // Uppercase P should NOT match 'production'
      expect(result.success).toBe(true);
    });

    it('"PRODUCTION" (all caps) does not trigger fail-closed', async () => {
      const result = await verifyTurnstile('token', '', undefined, 'PRODUCTION');
      expect(result.success).toBe(true);
    });

    it('"prod" does not trigger fail-closed', async () => {
      const result = await verifyTurnstile('token', '', undefined, 'prod');
      expect(result.success).toBe(true);
    });

    it('environment parameter does not affect behavior when secret key is present', async () => {
      mockFetchJSON({ success: true, 'error-codes': [] });
      const result = await verifyTurnstile('token', 'valid-secret', undefined, 'production');
      expect(result.success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it('environment with whitespace is not treated as production', async () => {
      const result = await verifyTurnstile('token', '', undefined, ' production ');
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Error code propagation
  // ---------------------------------------------------------------------------
  describe('9. Error code propagation', () => {
    it('propagates empty error-codes array from API', async () => {
      mockFetchJSON({ success: false, 'error-codes': [] });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(false);
      expect(result.errorCodes).toEqual([]);
    });

    it('propagates single known error code', async () => {
      mockFetchJSON({ success: false, 'error-codes': ['missing-input-secret'] });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.errorCodes).toEqual(['missing-input-secret']);
    });

    it('propagates internal-error code from API', async () => {
      mockFetchJSON({ success: false, 'error-codes': ['internal-error'] });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.errorCodes).toContain('internal-error');
    });

    it('propagates unknown/custom error codes from API', async () => {
      mockFetchJSON({ success: false, 'error-codes': ['custom-unknown-error'] });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.errorCodes).toContain('custom-unknown-error');
    });

    it('propagates timeout-or-duplicate error code', async () => {
      mockFetchJSON({ success: false, 'error-codes': ['timeout-or-duplicate'] });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.errorCodes).toContain('timeout-or-duplicate');
    });

    it('defaults to empty array when error-codes field is missing from response', async () => {
      mockFetchJSON({ success: false });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.errorCodes).toEqual([]);
    });

    it('defaults to empty array when error-codes is null in response', async () => {
      mockFetchJSON({ success: true, 'error-codes': null });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.errorCodes).toEqual([]);
    });

    it('preserves order of multiple error codes', async () => {
      const codes = ['missing-input-secret', 'invalid-input-response', 'timeout-or-duplicate'];
      mockFetchJSON({ success: false, 'error-codes': codes });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.errorCodes).toEqual(codes);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Response structure validation
  // ---------------------------------------------------------------------------
  describe('10. Response structure validation', () => {
    it('handles response where success is missing (undefined coerces to falsy)', async () => {
      mockFetchJSON({ 'error-codes': [] });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBeFalsy();
    });

    it('handles response where success is null', async () => {
      mockFetchJSON({ success: null, 'error-codes': [] });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBeNull();
    });

    it('handles response where success is a string "true"', async () => {
      mockFetchJSON({ success: 'true', 'error-codes': [] });
      const result = await verifyTurnstile('token', 'secret');
      // String "true" is truthy
      expect(result.success).toBeTruthy();
    });

    it('handles response where success is a string "false"', async () => {
      mockFetchJSON({ success: 'false', 'error-codes': [] });
      const result = await verifyTurnstile('token', 'secret');
      // String "false" is truthy (non-empty string)
      expect(result.success).toBeTruthy();
    });

    it('handles response where success is 0 (falsy number)', async () => {
      mockFetchJSON({ success: 0, 'error-codes': [] });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBeFalsy();
    });

    it('handles response where success is 1 (truthy number)', async () => {
      mockFetchJSON({ success: 1, 'error-codes': [] });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBeTruthy();
    });

    it('handles response with extra unexpected fields gracefully', async () => {
      mockFetchJSON({
        success: true,
        'error-codes': [],
        metadata: { region: 'us-east-1' },
        score: 0.95,
        version: '2.0',
      });
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBe(true);
      expect(result.errorCodes).toEqual([]);
      // Verify only the expected properties exist on the result
      expect(Object.keys(result)).toContain('success');
      expect(Object.keys(result)).toContain('errorCodes');
    });

    it('returns exactly { success, errorCodes } shape', async () => {
      mockFetchJSON({ success: true, 'error-codes': [] });
      const result = await verifyTurnstile('token', 'secret');
      expect(Object.keys(result).sort()).toEqual(['errorCodes', 'success']);
    });

    it('handles response that is a JSON array instead of object', async () => {
      mockFetchJSON([{ success: true }]);
      const result = await verifyTurnstile('token', 'secret');
      // Array does not have .success, so it would be undefined (falsy)
      expect(result.success).toBeFalsy();
    });

    it('handles response that is a JSON string primitive', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response('"just a string"', { status: 200 }),
      );
      const result = await verifyTurnstile('token', 'secret');
      // A string does not have .success property
      expect(result.success).toBeFalsy();
    });

    it('handles response that is a JSON number primitive', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response('42', { status: 200 }),
      );
      const result = await verifyTurnstile('token', 'secret');
      expect(result.success).toBeFalsy();
    });

    it('handles response that is JSON null', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response('null', { status: 200 }),
      );
      const result = await verifyTurnstile('token', 'secret');
      // null does not have properties, so accessing .success throws -> caught
      expect(result.success).toBe(false);
    });
  });
});
