import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Email service tests — validates notification templates,
 * HTML escaping, and graceful degradation.
 *
 * Tests mock the fetch API to avoid hitting the real MailChannels endpoint.
 */

const MAILCHANNELS_URL = 'https://api.mailchannels.net/tx/v1/send';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  notifyAdminNewRegistration,
  notifyUserApproved,
  notifyUserDenied,
  sendAdminVerificationCode,
} from './email.js';

beforeEach(() => {
  mockFetch.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

/**
 * Helper: extract MailChannels payload (which uses personalizations[].to[].email
 * for recipients and content[].value for HTML).
 */
function getMcPayload(call: unknown[]): {
  url: string;
  to: string;
  subject: string;
  html: string;
  apiKeyHeader: string | undefined;
} {
  const [url, options] = call as [string, { headers: Record<string, string>; body: string }];
  const body = JSON.parse(options.body);
  return {
    url,
    to: body.personalizations[0].to[0].email,
    subject: body.subject,
    html: body.content[0].value,
    apiKeyHeader: options.headers['X-API-Key'],
  };
}

describe('notifyAdminNewRegistration', () => {
  it('skips when API key is missing', async () => {
    await notifyAdminNewRegistration(
      'admin@test.com',
      '',
      'Kansas City Chiefs',
      'https://example.com/approve/token',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends email with team alias and approval link', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await notifyAdminNewRegistration(
      'admin@test.com',
      'test-api-key',
      'Tampa Bay Buccaneers',
      'https://ptowl.com/api/v1/auth/approve/abc123',
    );

    expect(mockFetch).toHaveBeenCalledOnce();
    const payload = getMcPayload(mockFetch.mock.calls[0]!);
    expect(payload.url).toBe(MAILCHANNELS_URL);
    expect(payload.apiKeyHeader).toBe('test-api-key');
    expect(payload.to).toBe('admin@test.com');
    expect(payload.subject).toContain('Tampa Bay Buccaneers');
    expect(payload.html).toContain('Tampa Bay Buccaneers');
    expect(payload.html).toContain('https://ptowl.com/api/v1/auth/approve/abc123');
    expect(payload.html).toContain('Approve');
    // Should NOT contain any real user info (PII protection)
    expect(payload.html).not.toContain('phone');
    expect(payload.html).not.toContain('+1');
  });

  it('escapes HTML in team alias to prevent XSS', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await notifyAdminNewRegistration(
      'admin@test.com',
      'test-api-key',
      '<script>alert("xss")</script>',
      'https://ptowl.com/approve/token',
    );

    const payload = getMcPayload(mockFetch.mock.calls[0]!);
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).toContain('&lt;script&gt;');
  });

  it('handles fetch failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await notifyAdminNewRegistration('admin@test.com', 'key', 'Team', 'https://example.com');
  });

  it('handles network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    await notifyAdminNewRegistration('admin@test.com', 'key', 'Team', 'https://example.com');
  });
});

describe('notifyUserApproved', () => {
  it('skips when API key is missing', async () => {
    await notifyUserApproved('', 'user@test.com', 'John');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends approval email with login link', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await notifyUserApproved('test-key', 'user@test.com', 'Jane');

    const payload = getMcPayload(mockFetch.mock.calls[0]!);
    expect(payload.to).toBe('user@test.com');
    expect(payload.subject).toContain('approved');
    expect(payload.html).toContain('Jane');
    expect(payload.html).toContain('ptowl.com');
  });

  it('uses fallback name when display name is empty', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await notifyUserApproved('test-key', 'user@test.com', '');

    const payload = getMcPayload(mockFetch.mock.calls[0]!);
    expect(payload.html).toContain('there');
  });
});

describe('notifyUserDenied', () => {
  it('skips when API key is missing', async () => {
    await notifyUserDenied('', 'user@test.com');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends denial email', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await notifyUserDenied('test-key', 'user@test.com');

    const payload = getMcPayload(mockFetch.mock.calls[0]!);
    expect(payload.to).toBe('user@test.com');
    expect(payload.html).toContain('not approved');
  });
});

describe('sendAdminVerificationCode', () => {
  it('skips when API key is missing', async () => {
    await sendAdminVerificationCode('', 'admin@test.com', '123456');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends code email with escaped code', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await sendAdminVerificationCode('test-key', 'admin@test.com', '789012');

    const payload = getMcPayload(mockFetch.mock.calls[0]!);
    expect(payload.to).toBe('admin@test.com');
    expect(payload.html).toContain('789012');
    expect(payload.subject).toContain('verification code');
  });

  it('escapes HTML in verification code', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await sendAdminVerificationCode('test-key', 'admin@test.com', '<img src=x>');

    const payload = getMcPayload(mockFetch.mock.calls[0]!);
    expect(payload.html).not.toContain('<img');
    expect(payload.html).toContain('&lt;img');
  });
});
