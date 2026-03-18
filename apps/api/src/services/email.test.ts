import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Email service tests — validates notification templates,
 * HTML escaping, and graceful degradation.
 *
 * These tests mock the fetch API to avoid hitting the real Resend API.
 */

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
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

describe('notifyAdminNewRegistration', () => {
  it('skips when API key is missing', async () => {
    await notifyAdminNewRegistration('admin@test.com', '', 'Kansas City Chiefs', 'https://example.com/approve/token');
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
    const [url, options] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');

    const body = JSON.parse(options.body);
    expect(body.to).toBe('admin@test.com');
    expect(body.subject).toContain('Tampa Bay Buccaneers');
    expect(body.html).toContain('Tampa Bay Buccaneers');
    expect(body.html).toContain('https://ptowl.com/api/v1/auth/approve/abc123');
    expect(body.html).toContain('Approve');
    // Should NOT contain any real user info (PII protection)
    expect(body.html).not.toContain('phone');
    expect(body.html).not.toContain('+1');
  });

  it('escapes HTML in team alias to prevent XSS', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await notifyAdminNewRegistration(
      'admin@test.com',
      'test-api-key',
      '<script>alert("xss")</script>',
      'https://ptowl.com/approve/token',
    );

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.html).not.toContain('<script>');
    expect(body.html).toContain('&lt;script&gt;');
  });

  it('handles fetch failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    // Should not throw
    await notifyAdminNewRegistration('admin@test.com', 'key', 'Team', 'https://example.com');
  });

  it('handles network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Should not throw
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

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.to).toBe('user@test.com');
    expect(body.subject).toContain('approved');
    expect(body.html).toContain('Jane');
    expect(body.html).toContain('ptowl.com');
  });

  it('uses fallback name when display name is empty', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await notifyUserApproved('test-key', 'user@test.com', '');

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.html).toContain('there');
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

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.to).toBe('user@test.com');
    expect(body.html).toContain('not approved');
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

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.to).toBe('admin@test.com');
    expect(body.html).toContain('789012');
    expect(body.subject).toContain('verification code');
  });

  it('escapes HTML in verification code', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await sendAdminVerificationCode('test-key', 'admin@test.com', '<img src=x>');

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.html).not.toContain('<img');
    expect(body.html).toContain('&lt;img');
  });
});
