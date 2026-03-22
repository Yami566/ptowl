import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { requireAuth, requireCSRF, requireClinic } from '../middleware/auth.js';

type Variables = {
  user: { id: string; email: string; role: string; tier: string } | null;
};

export const templateRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

templateRoutes.use('*', requireAuth, requireClinic);

// GET / - List user's templates
templateRoutes.get('/', async (c) => {
  try {
    const user = c.get('user')!;
    const templates = await c.env.DB.prepare(
      'SELECT id, user_id, hotkey, name, sessions_per_week, duration_weeks, default_time, is_active, sort_order, created_at, updated_at FROM templates WHERE user_id = ? ORDER BY hotkey',
    )
      .bind(user.id)
      .all();

    return c.json({ ok: true, data: templates.results });
  } catch (err) {
    console.error('List templates error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch templates' } }, 500);
  }
});

// PUT /:id - Update template
templateRoutes.put('/:id', requireCSRF, async (c) => {
  try {
    const user = c.get('user')!;
    const templateId = c.req.param('id');

    // Validate template ID format (32-char hex from randomblob)
    if (!/^[0-9a-f]{32}$/i.test(templateId)) {
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid template ID' } }, 400);
    }

    const body = await c.req.json<{
      name?: string;
      sessions_per_week?: number;
      duration_weeks?: number;
      default_time?: string;
      is_active?: number;
    }>();

    // Verify template belongs to user
    const existing = await c.env.DB.prepare('SELECT id, user_id, hotkey, name, sessions_per_week, duration_weeks, default_time, is_active, sort_order, created_at, updated_at FROM templates WHERE id = ? AND user_id = ?')
      .bind(templateId, user.id)
      .first();

    if (!existing) {
      return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Template not found' } }, 404);
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.length > 100) {
        return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Name too long (max 100 chars)' } }, 400);
      }
      // Sanitize: strip HTML tags to prevent stored XSS in non-React contexts (emails, PDFs)
      const sanitizedName = body.name.replace(/<[^>]*>/g, '').trim();
      if (sanitizedName.length === 0) {
        return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Name cannot be empty' } }, 400);
      }
      updates.push('name = ?');
      values.push(sanitizedName);
    }
    if (body.sessions_per_week !== undefined) {
      if (!Number.isInteger(body.sessions_per_week) || body.sessions_per_week < 1 || body.sessions_per_week > 7) {
        return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Sessions per week must be 1-7' } }, 400);
      }
      updates.push('sessions_per_week = ?');
      values.push(body.sessions_per_week);
    }
    if (body.duration_weeks !== undefined) {
      if (!Number.isInteger(body.duration_weeks) || body.duration_weeks < 1 || body.duration_weeks > 52) {
        return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Duration must be 1-52 weeks' } }, 400);
      }
      updates.push('duration_weeks = ?');
      values.push(body.duration_weeks);
    }
    if (body.default_time !== undefined) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.default_time)) {
        return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid time format (HH:MM, 00:00-23:59)' } }, 400);
      }
      updates.push('default_time = ?');
      values.push(body.default_time);
    }
    if (body.is_active !== undefined) {
      if (body.is_active !== 0 && body.is_active !== 1) {
        return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'is_active must be 0 or 1' } }, 400);
      }
      updates.push('is_active = ?');
      values.push(body.is_active);
    }

    if (updates.length === 0) {
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'No fields to update' } }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(templateId, user.id);

    await c.env.DB.prepare(`UPDATE templates SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run();

    const updated = await c.env.DB.prepare('SELECT id, user_id, hotkey, name, sessions_per_week, duration_weeks, default_time, is_active, sort_order, created_at, updated_at FROM templates WHERE id = ? AND user_id = ?')
      .bind(templateId, user.id)
      .first();

    return c.json({ ok: true, data: updated });
  } catch (err) {
    console.error('Update template error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update template' } }, 500);
  }
});
