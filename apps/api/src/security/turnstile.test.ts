import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstile } from './turnstile.js';

describe('Turnstile Verification', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns success when no secret key is configured (test/dev bypass)', async () => {
    const result = await verifyTurnstile('some-token', '');
    expect(result.success).toBe(true);
    expect(result.errorCodes).toEqual([]);
  });

  it('returns failure when token is empty', async () => {
    const result = await verifyTurnstile('', 'some-secret');
    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain('missing-input-response');
  });

  it('calls Cloudflare siteverify API with correct parameters', async () => {
    let capturedBody: URLSearchParams | undefined;
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as unknown as URLSearchParams;
      return new Response(JSON.stringify({ success: true, 'error-codes': [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await verifyTurnstile('test-token', 'test-secret', '1.2.3.4');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' }),
    );

    // Verify form data contains expected parameters (URLSearchParams → .toString())
    const bodyStr = capturedBody?.toString() || '';
    expect(bodyStr).toContain('secret=test-secret');
    expect(bodyStr).toContain('response=test-token');
    expect(bodyStr).toContain('remoteip=1.2.3.4');
  });

  it('returns success: true when Cloudflare verifies token', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 }),
    );

    const result = await verifyTurnstile('valid-token', 'secret');
    expect(result.success).toBe(true);
  });

  it('returns success: false when Cloudflare rejects token', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 }),
    );

    const result = await verifyTurnstile('bad-token', 'secret');
    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain('invalid-input-response');
  });

  it('handles API error (non-200 response) gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    const result = await verifyTurnstile('token', 'secret');
    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain('api-error');
  });

  it('handles network error gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    const result = await verifyTurnstile('token', 'secret');
    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain('network-error');
  });

  it('omits remoteIp when not provided', async () => {
    let capturedBody: URLSearchParams | undefined;
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as unknown as URLSearchParams;
      return new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 });
    });

    await verifyTurnstile('token', 'secret');
    const bodyStr = capturedBody?.toString() || '';
    expect(bodyStr).not.toContain('remoteip');
  });
});
