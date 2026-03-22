import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { requireAuth, requireClinic } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import { aliasRequestSchema, SPORTS_ALIASES } from '@ptowl/shared';

type Variables = {
  user: { id: string; email: string; role: string; tier: string } | null;
};

export const aliasRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

aliasRoutes.use('*', requireAuth, requireClinic);

// POST / - Generate sports alias from initials
aliasRoutes.post('/', zValidator('json', aliasRequestSchema, (result, c) => {
  if (!result.success) {
    return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: result.error.issues[0]?.message || 'Invalid input' } }, 400);
  }
}), async (c) => {
  try {
    const user = c.get('user')!;
    const { initials: rawInitials } = c.req.valid('json');

    const initials = rawInitials.toUpperCase();
    const aliases = SPORTS_ALIASES[initials] || [`${initials[0]}. ${initials[1]}player`];

    // Deterministic but varied: hash user_id + initials + current hour to pick index
    const encoder = new TextEncoder();
    const hashData = encoder.encode(`${user.id}:${initials}:${Math.floor(Date.now() / 3600000)}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', hashData);
    const hashArray = new Uint8Array(hashBuffer);
    const index = hashArray[0]! % aliases.length;

    const alias = aliases[index]!;

    return c.json({ ok: true, data: { initials, alias } });
  } catch (err) {
    console.error('Alias lookup error:', err);
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate alias' } }, 500);
  }
});
