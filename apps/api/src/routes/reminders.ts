import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { verifyUnsubscribeToken } from '../crypto/unsubscribe-token.js';

/**
 * Public unsubscribe endpoints. No auth — token is the bearer.
 *
 * GET /:token       Render an HTML preferences page. Three buttons,
 *                   each is its own form-encoded POST submission. No
 *                   inline JS, so the strict CSP (no 'unsafe-inline'
 *                   in scriptSrc) doesn't block anything.
 * POST /:token      Apply the chosen preference. Accepts both
 *                   application/x-www-form-urlencoded (from the buttons
 *                   below) and application/json (for programmatic
 *                   callers). On success, redirect back to GET with
 *                   ?saved=<action> so the rendered page reflects new
 *                   state.
 *
 * The token (HMAC-signed, 90-day expiry) embeds only the email hash
 * — never the plaintext email. So even if someone forwards the link,
 * they can only flip prefs for that one hashed email.
 */

type Variables = { user: null };
type Action = 'unsubscribe' | 'digest' | 'resume';

export const remindersRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

remindersRoutes.get('/unsubscribe/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const emailHash = await verifyUnsubscribeToken(token, c.env.JWT_SECRET);
    if (!emailHash) {
      return c.html(
        renderPage('Invalid link', 'This unsubscribe link is invalid or expired.', null),
      );
    }

    const row = await c.env.DB.prepare(
      'SELECT unsubscribed, digest_mode FROM email_subscriptions WHERE email_hash = ?',
    )
      .bind(emailHash)
      .first<{ unsubscribed: number; digest_mode: number }>();

    const state = {
      unsubscribed: row?.unsubscribed === 1,
      digest: row?.digest_mode === 1,
    };

    const savedAction = c.req.query('saved');
    const flashMessage = savedAction ? 'Preferences saved. You can close this tab.' : '';

    return c.html(renderPage('Reminder preferences', '', { token, state, flashMessage }));
  } catch (err) {
    console.error('Unsubscribe page error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load preferences' } },
      500,
    );
  }
});

remindersRoutes.post('/unsubscribe/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const emailHash = await verifyUnsubscribeToken(token, c.env.JWT_SECRET);
    if (!emailHash) {
      return c.json(
        { ok: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired link' } },
        400,
      );
    }

    // Accept both form-encoded (button submission) and JSON (API callers).
    const contentType = c.req.header('content-type') || '';
    let action: string | undefined;
    if (contentType.includes('application/json')) {
      const body = await c.req.json<{ action?: string }>();
      action = body.action;
    } else {
      const form = await c.req.parseBody();
      action = typeof form.action === 'string' ? form.action : undefined;
    }

    if (!action || !isValidAction(action)) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid action' } },
        400,
      );
    }

    const unsubscribed = action === 'unsubscribe' ? 1 : 0;
    const digestMode = action === 'digest' ? 1 : 0;

    await c.env.DB.prepare(
      `INSERT INTO email_subscriptions (email_hash, unsubscribed, digest_mode, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(email_hash) DO UPDATE SET
         unsubscribed = excluded.unsubscribed,
         digest_mode = excluded.digest_mode,
         updated_at = datetime('now')`,
    )
      .bind(emailHash, unsubscribed, digestMode)
      .run();

    // For form submissions: 303 See Other → GET with ?saved=action.
    // For JSON callers: return JSON.
    if (contentType.includes('application/json')) {
      return c.json({ ok: true, data: { action } });
    }
    return c.redirect(`./${token}?saved=${encodeURIComponent(action)}`, 303);
  } catch (err) {
    console.error('Unsubscribe POST error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to save preferences' } },
      500,
    );
  }
});

function isValidAction(s: string): s is Action {
  return s === 'unsubscribe' || s === 'digest' || s === 'resume';
}

function renderPage(
  title: string,
  message: string,
  ctx: {
    token: string;
    state: { unsubscribed: boolean; digest: boolean };
    flashMessage: string;
  } | null,
): string {
  const css = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #F5F5F5; margin: 0; min-height: 100vh; display: flex;
           align-items: center; justify-content: center; padding: 1rem; }
    .card { background: white; border-radius: 16px; padding: 2.5rem;
            max-width: 460px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            box-sizing: border-box; }
    h1 { color: #1B5E20; font-size: 1.5rem; margin: 0 0 0.5rem; }
    p { color: #444; line-height: 1.55; }
    form { margin: 0; }
    button { display: block; width: 100%; padding: 0.875rem 1rem;
             font-size: 1rem; font-weight: 600; border: none;
             border-radius: 8px; cursor: pointer; margin-top: 0.75rem; }
    button:focus { outline: 2px solid #1B5E20; outline-offset: 2px; }
    .primary { background: #4CAF50; color: white; }
    .secondary { background: #E8F5E9; color: #1B5E20; }
    .danger { background: #FFEBEE; color: #C62828; }
    .muted { color: #888; font-size: 0.85rem; margin-top: 1.5rem; }
    .flash { background: #E8F5E9; color: #1B5E20; padding: 0.75rem 1rem;
             border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; }
    .state { background: #F5F5F5; padding: 0.875rem; border-radius: 8px;
             margin: 1rem 0; font-size: 0.9rem; color: #555; }
    .ok { color: #1B5E20; font-weight: 600; }
  `;

  if (!ctx) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${css}</style></head><body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a href="https://ptowl.com" class="muted">ptowl.com</a></div></body></html>`;
  }

  const stateLabel = ctx.state.unsubscribed
    ? 'You are <span class="ok">unsubscribed</span> from all PTOWL reminders.'
    : ctx.state.digest
      ? 'You opted into a <span class="ok">daily digest</span>. Daily digest is not yet active — please click <strong>Get individual reminders</strong> below to keep receiving reminders for now.'
      : 'You currently receive <span class="ok">individual reminders</span> 24h and 1h before each appointment.';

  const flashHtml = ctx.flashMessage
    ? `<div class="flash" role="status">${escapeHtml(ctx.flashMessage)}</div>`
    : '';

  // No inline JS — three forms, three submit buttons. CSP-safe.
  // Each form posts back to the same URL; the POST handler upserts
  // email_subscriptions and 303-redirects to GET with ?saved=action.
  return `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head><body>
<main class="card">
  <h1>${escapeHtml(title)}</h1>
  ${flashHtml}
  <div class="state" role="status" aria-live="polite">${stateLabel}</div>
  <p>What would you like to do?</p>
  <form method="post" action="">
    <button class="primary" type="submit" name="action" value="resume" aria-label="Get individual reminders 24 hours and 1 hour before each appointment">Get individual reminders (default)</button>
  </form>
  <!-- Daily-digest button intentionally hidden until the digest cron is
       implemented (RED-TEAM-FINDINGS.md LOW-4). The POST handler still
       accepts action=digest so existing in-flight links don't 400, but
       the UI no longer offers it as a choice. Restore this form when
       PRD.md Phase 9 (Email + Reminders) ships the cron. -->
  <form method="post" action="">
    <button class="danger" type="submit" name="action" value="unsubscribe" aria-label="Unsubscribe from all PTOWL reminders">Unsubscribe from all PTOWL reminders</button>
  </form>
  <p class="muted">PTOWL · <a href="https://ptowl.com" style="color:#888">ptowl.com</a></p>
</main>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
