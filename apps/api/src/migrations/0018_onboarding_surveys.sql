-- Migration 0018 — Onboarding survey table.
--
-- Compartmentalized analytics: this table is never joined with templates,
-- schedules, or any product-facing data. Its sole purpose is to collect
-- self-reported clinic preferences on first sign-in so that future
-- features (e.g., AI-generated templates) can be informed by the
-- distribution of clinic types using PTowl.
--
-- UNIQUE(user_id) + ON CONFLICT IGNORE on the route side ensures one
-- survey per user. ON DELETE CASCADE means a deleted user's survey
-- row is wiped automatically; survey data is not retained beyond the
-- account.
--
-- Columns:
--   id                     — random hex per row.
--   user_id                — FK to users.id, UNIQUE so re-submission
--                            is a no-op.
--   clinic_type            — 'PT' | 'OT' | 'SLP' | 'Chiro' | 'Mental'
--                            | 'Dental' | 'Other' | 'skipped'. The
--                            'skipped' sentinel suppresses re-prompt
--                            without committing real data.
--   specialty              — free text, optional. Capped at 100 chars
--                            on the API.
--   sessions_per_week_avg  — integer 1-7, optional.
--   weekend_hours          — 0/1 boolean, defaults 0.
--   found_us_via           — 'HN' | 'Reddit' | 'Word of mouth' |
--                            'Search' | 'Social' | 'Other'. Optional.
--   raw_payload            — JSON blob held open for future questions
--                            we add without needing another migration.
--   submitted_at           — UTC ISO timestamp at row creation.

CREATE TABLE IF NOT EXISTS onboarding_surveys (
  id                    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id               TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  clinic_type           TEXT NOT NULL,
  specialty             TEXT,
  sessions_per_week_avg INTEGER,
  weekend_hours         INTEGER NOT NULL DEFAULT 0,
  found_us_via          TEXT,
  raw_payload           TEXT,
  submitted_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_onboarding_surveys_clinic_type ON onboarding_surveys(clinic_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_surveys_found_us_via ON onboarding_surveys(found_us_via);
