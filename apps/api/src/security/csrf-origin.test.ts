import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { csrf } from 'hono/csrf';

/**
 * Integration test for the CSRF protection used in production.
 *
 * Replaces the 700+ lines of static-analysis tests that the custom
 * signed-token implementation needed.
 *
 * Two-layer defense for our SPA:
 * 1. CORS middleware rejects cross-origin requests outright (covers the
 *    application/json case — preflight is required for JSON, and our CORS
 *    config blocks unknown origins).
 * 2. hono/csrf catches the form-encoded attack vector (HTML forms can submit
 *    cross-origin without CORS preflight; this middleware verifies Origin/
 *    Sec-Fetch-Site for `application/x-www-form-urlencoded`,
 *    `multipart/form-data`, and `text/plain` POSTs).
 */
describe('hono/csrf — origin-based CSRF protection (form content types)', () => {
  function buildApp() {
    const app = new Hono();
    app.use('*', csrf({ origin: 'https://ptowl.com' }));
    app.post('/x', (c) => c.json({ ok: true }));
    app.get('/x', (c) => c.json({ ok: true }));
    return app;
  }

  it('accepts form POST with matching Origin', async () => {
    const app = buildApp();
    const res = await app.request('/x', {
      method: 'POST',
      headers: {
        Origin: 'https://ptowl.com',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    expect(res.status).toBe(200);
  });

  it('rejects form POST from a different origin (CSRF attack pattern)', async () => {
    const app = buildApp();
    const res = await app.request('/x', {
      method: 'POST',
      headers: {
        Origin: 'https://attacker.example',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    expect(res.status).toBe(403);
  });

  it('rejects multipart/form-data POST from a different origin', async () => {
    const app = buildApp();
    const res = await app.request('/x', {
      method: 'POST',
      headers: {
        Origin: 'https://attacker.example',
        'Content-Type': 'multipart/form-data; boundary=---x',
      },
    });
    expect(res.status).toBe(403);
  });

  it('passes safe methods through (GET) without origin check', async () => {
    const app = buildApp();
    const res = await app.request('/x', { method: 'GET' });
    expect(res.status).toBe(200);
  });

  it('accepts JSON POST regardless of origin (CORS handles this layer)', async () => {
    // hono/csrf does not check JSON requests — the browser's CORS preflight
    // already gates these. We rely on the CORS middleware (separate) to reject
    // cross-origin JSON requests at the browser layer.
    const app = buildApp();
    const res = await app.request('/x', {
      method: 'POST',
      headers: {
        Origin: 'https://attacker.example',
        'Content-Type': 'application/json',
      },
    });
    expect(res.status).toBe(200);
  });
});
