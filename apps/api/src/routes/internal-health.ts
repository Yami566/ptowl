import { Hono } from 'hono';
import type { Env } from '../types/env.js';

/**
 * Operator-gated production health endpoints. Distinct from the public
 * `/api/v1/health` (which is read-only and returns DB connectivity) —
 * these endpoints exercise outbound integrations that cost money or
 * trigger side effects, so they require knowledge of ADMIN_EMAIL as
 * a shared secret.
 *
 * The shared-secret model is intentional. These endpoints are called
 * once a month (post-rotation) by the founder from a shell or a
 * curl command — not by a real user flow. They need to authenticate
 * without going through Clerk. Comparing against ADMIN_EMAIL (set
 * via `wrangler secret put`) is enough gating for that profile.
 *
 * Constant-time comparison so a leaked ADMIN_EMAIL can't be brute-
 * forced via response-timing analysis.
 */

export const internalHealthRoutes = new Hono<{ Bindings: Env }>();

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function checkAdminToken(c: { req: { header: (n: string) => string | undefined }; env: Env }) {
  const token = c.req.header('X-Admin-Token') || '';
  return constantTimeEqual(token, c.env.ADMIN_EMAIL);
}

/**
 * POST /api/v1/internal/health/email
 *
 * Sends a test email to ADMIN_EMAIL via the configured MailChannels
 * relay. Used after rotating EMAIL_API_KEY to confirm the new key
 * works before any patient-facing reminder cron fires with a stale
 * key and silently drops mail.
 *
 * Returns the MailChannels response status verbatim so the operator
 * can see if a 401 / 403 / 5xx leaked back, distinguishing key
 * problems from network problems.
 */
internalHealthRoutes.post('/email', async (c) => {
  if (!checkAdminToken(c)) {
    return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Bad admin token' } }, 401);
  }

  const recipient = c.env.ADMIN_EMAIL;
  const subject = `🦉 PTOwl email-health smoke (${new Date().toISOString()})`;
  const body = `This is the PTOwl email-health smoke endpoint.\n\nIf you're reading this, EMAIL_API_KEY is healthy and MailChannels is reachable from the prod Worker.\n\nNo action needed.\n\n— PTOwl ops`;

  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': c.env.EMAIL_API_KEY },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipient }] }],
        from: { email: 'noreply@ptowl.com', name: 'PTOWL ops' },
        subject,
        content: [{ type: 'text/plain', value: body }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return c.json(
        {
          ok: false,
          error: {
            code: 'MAILCHANNELS_REJECTED',
            message: `MailChannels returned ${response.status}`,
            upstream_status: response.status,
            upstream_body: errText.slice(0, 500),
          },
        },
        502,
      );
    }

    return c.json({
      ok: true,
      data: {
        sent_to: recipient,
        timestamp: new Date().toISOString(),
        upstream_status: response.status,
      },
    });
  } catch (err) {
    // Log diagnostic detail to Workers Logs (visible in CF dashboard).
    // Response stays generic to match the route-wide INTERNAL_ERROR
    // pattern enforced by security tests in src/security/.
    console.error(
      'Email health endpoint network failure:',
      err instanceof Error ? err.message : 'unknown',
    );
    return c.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Network or upstream failure (see Worker logs)',
        },
      },
      503,
    );
  }
});
