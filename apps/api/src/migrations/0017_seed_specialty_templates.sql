-- Migration 0017 — Backfill the 6 specialty default templates for every
-- existing user so the post-Clerk audience refresh (PT, OT, SLP, Chiro,
-- Mental Health, Dental Hygiene) reaches users who signed up before the
-- DEFAULT_TEMPLATES constant was changed.
--
-- Behavior: for each user × hotkey-in-2..7, INSERT the specialty default
-- ONLY IF that user does not already have a template at that hotkey.
-- This preserves any user-customized templates already occupying those
-- slots while filling in any gaps. Existing user-named templates at the
-- same hotkey win; the seed runs only on empty slots.
--
-- Idempotent: re-running this migration is safe — the WHERE NOT EXISTS
-- guard makes every INSERT a no-op on second run.
--
-- New users go through provision.ts which already loops DEFAULT_TEMPLATES
-- (now updated to the 6 specialty entries) on first sign-in, so they
-- never need this backfill.

INSERT INTO templates (id, user_id, hotkey, name, sessions_per_week, duration_weeks, default_time, sort_order)
SELECT
  lower(hex(randomblob(16))),
  u.id,
  2,
  'Sports PT',
  3,
  6,
  '09:00',
  0
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM templates t WHERE t.user_id = u.id AND t.hotkey = 2
);

INSERT INTO templates (id, user_id, hotkey, name, sessions_per_week, duration_weeks, default_time, sort_order)
SELECT
  lower(hex(randomblob(16))),
  u.id,
  3,
  'OT Peds',
  2,
  8,
  '10:00',
  1
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM templates t WHERE t.user_id = u.id AND t.hotkey = 3
);

INSERT INTO templates (id, user_id, hotkey, name, sessions_per_week, duration_weeks, default_time, sort_order)
SELECT
  lower(hex(randomblob(16))),
  u.id,
  4,
  'Chiropractic',
  3,
  4,
  '08:00',
  2
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM templates t WHERE t.user_id = u.id AND t.hotkey = 4
);

INSERT INTO templates (id, user_id, hotkey, name, sessions_per_week, duration_weeks, default_time, sort_order)
SELECT
  lower(hex(randomblob(16))),
  u.id,
  5,
  'SLP',
  2,
  12,
  '14:00',
  3
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM templates t WHERE t.user_id = u.id AND t.hotkey = 5
);

INSERT INTO templates (id, user_id, hotkey, name, sessions_per_week, duration_weeks, default_time, sort_order)
SELECT
  lower(hex(randomblob(16))),
  u.id,
  6,
  'Mental Health',
  1,
  16,
  '11:00',
  4
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM templates t WHERE t.user_id = u.id AND t.hotkey = 6
);

INSERT INTO templates (id, user_id, hotkey, name, sessions_per_week, duration_weeks, default_time, sort_order)
SELECT
  lower(hex(randomblob(16))),
  u.id,
  7,
  'Dental Hygiene',
  1,
  26,
  '09:00',
  5
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM templates t WHERE t.user_id = u.id AND t.hotkey = 7
);
