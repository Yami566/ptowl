import { Hono } from 'hono';
import { onboardingSurveySchema } from '@ptowl/shared';
import type { Env } from '../types/env.js';
import { requireAuth, requireClinic } from '../middleware/auth.js';

type Variables = {
  user: { id: string; email: string; role: string; tier: string } | null;
};

export const onboardingRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

onboardingRoutes.use('*', requireAuth, requireClinic);

// GET / — has the current user already submitted (or skipped) the survey?
// The dashboard polls this once on mount to decide whether to render the
// first-visit modal.
onboardingRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  try {
    const row = await c.env.DB.prepare(
      'SELECT clinic_type FROM onboarding_surveys WHERE user_id = ? LIMIT 1',
    )
      .bind(user.id)
      .first();
    return c.json({ ok: true, data: { submitted: row !== null } });
  } catch (err) {
    console.error('Onboarding GET error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to read survey state' } },
      500,
    );
  }
});

// POST / — record a survey submission. INSERT OR IGNORE keeps re-submission
// idempotent (the UNIQUE(user_id) constraint silently no-ops on second send).
// 'skipped' is a real clinic_type sentinel used when the user dismisses the
// modal without answering — we still want a row so we don't re-prompt.
onboardingRoutes.post('/', async (c) => {
  const user = c.get('user')!;
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { ok: false, error: { code: 'INVALID_JSON', message: 'Body must be JSON' } },
      400,
    );
  }
  const parsed = onboardingSurveySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid survey payload' } },
      400,
    );
  }
  const { clinic_type, specialty, sessions_per_week_avg, weekend_hours, found_us_via } =
    parsed.data;
  try {
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO onboarding_surveys
        (user_id, clinic_type, specialty, sessions_per_week_avg, weekend_hours, found_us_via)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        user.id,
        clinic_type,
        specialty ?? null,
        sessions_per_week_avg ?? null,
        weekend_hours ? 1 : 0,
        found_us_via ?? null,
      )
      .run();
    return c.json({ ok: true, data: { submitted: true } });
  } catch (err) {
    console.error('Onboarding POST error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to record survey' } },
      500,
    );
  }
});
