import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { verifyUnsubscribeToken } from '../crypto/unsubscribe-token.js';

/**
 * Public unsubscribe endpoints. No auth — token is the bearer.
 *
 * GET /:token        — render an HTML page showing current preferences
 *                       and the "unsubscribe" + "switch to daily digest"
 *                       buttons.
 * POST /:token       — apply the chosen preference: { action: "unsubscribe"
 *                       | "digest" | "resume" }. Updates email_subscriptions
 *                       keyed by the email hash inside the token.
 *
 * The token (HMAC-signed, 90-day expiry) embeds only the email hash
 * — never the plaintext email. So even if someone forwards the link,
 * they can only flip prefs for that one hashed email.
 */

type Variables = { user: null };

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

    return c.html(renderPage('Reminder preferences', '', { token, state }));
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

    const body = await c.req.json<{ action?: 'unsubscribe' | 'digest' | 'resume' }>();
    const action = body.action;
    if (!action || !['unsubscribe', 'digest', 'resume'].includes(action)) {
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

    return c.json({ ok: true, data: { action } });
  } catch (err) {
    console.error('Unsubscribe POST error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to save preferences' } },
      500,
    );
  }
});

function renderPage(
  title: string,
  message: string,
  ctx: { token: string; state: { unsubscribed: boolean; digest: boolean } } | null,
): string {
  const css = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #F5F5F5; margin: 0; min-height: 100vh; display: flex;
           align-items: center; justify-content: center; }
    .card { background: white; border-radius: 16px; padding: 2.5rem;
            max-width: 460px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            box-sizing: border-box; }
    h1 { color: #1B5E20; font-size: 1.5rem; margin: 0 0 0.5rem; }
    p { color: #444; line-height: 1.55; }
    button { display: block; width: 100%; padding: 0.875rem 1rem;
             font-size: 1rem; font-weight: 600; border: none;
             border-radius: 8px; cursor: pointer; margin-top: 0.75rem; }
    .primary { background: #4CAF50; color: white; }
    .secondary { background: #E8F5E9; color: #1B5E20; }
    .danger { background: #FFEBEE; color: #C62828; }
    .muted { color: #888; font-size: 0.85rem; margin-top: 1.5rem; }
    .state { background: #F5F5F5; padding: 0.875rem; border-radius: 8px;
             margin: 1rem 0; font-size: 0.9rem; color: #555; }
    .ok { color: #1B5E20; font-weight: 600; }
  `;

  if (!ctx) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${css}</style></head><body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a href="https://ptowl.com" class="muted">ptowl.com</a></div></body></html>`;
  }

  const stateLabel = ctx.state.unsubscribed
    ? 'You are <span class="ok">unsubscribed</span> from all PTOWL reminders.'
    : ctx.state.digest
      ? 'You currently receive a <span class="ok">daily digest</span> instead of individual reminders.'
      : 'You currently receive <span class="ok">individual reminders</span> 24h and 1h before each appointment.';

  return `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head><body>
<div class="card">
  <h1>${escapeHtml(title)}</h1>
  <div class="state">${stateLabel}</div>
  <p>What would you like to do?</p>
  <button class="primary" data-action="resume">Get individual reminders (default)</button>
  <button class="secondary" data-action="digest">Switch to daily digest (one email/day)</button>
  <button class="danger" data-action="unsubscribe">Unsubscribe from all PTOWL reminders</button>
  <p id="result" class="muted"></p>
  <p class="muted">PTOWL · <a href="https://ptowl.com" style="color:#888">ptowl.com</a></p>
</div>
<script>
  const buttons = document.querySelectorAll('button[data-action]');
  const result = document.getElementById('result');
  buttons.forEach(b => b.addEventListener('click', async () => {
    buttons.forEach(x => x.disabled = true);
    result.textContent = 'Saving…';
    try {
      const res = await fetch(window.location.pathname, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: b.dataset.action })
      });
      const json = await res.json();
      result.textContent = json.ok ? 'Preferences saved. You can close this tab.' : 'Something went wrong. Try again.';
    } catch (e) {
      result.textContent = 'Network error. Try again.';
    }
    buttons.forEach(x => x.disabled = false);
  }));
</script>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
