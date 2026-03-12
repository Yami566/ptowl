-- PTOWL Database Schema - Migration 0001
-- ==========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'denied', 'suspended')),
  role          TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'admin')),
  tier          TEXT NOT NULL DEFAULT 'free'
                CHECK (tier IN ('free', 'paid')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Profiles table (clinic info)
CREATE TABLE IF NOT EXISTS profiles (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id        TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  clinic_name    TEXT NOT NULL DEFAULT '',
  clinic_address TEXT NOT NULL DEFAULT '',
  clinic_phone   TEXT NOT NULL DEFAULT '',
  clinic_email   TEXT NOT NULL DEFAULT '',
  logo_url       TEXT DEFAULT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hotkey            INTEGER NOT NULL CHECK (hotkey BETWEEN 1 AND 9),
  name              TEXT NOT NULL,
  sessions_per_week INTEGER NOT NULL DEFAULT 2,
  duration_weeks    INTEGER NOT NULL DEFAULT 2,
  default_time      TEXT DEFAULT '09:00',
  is_active         INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, hotkey)
);
CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id       TEXT REFERENCES templates(id) ON DELETE SET NULL,
  patient_initials  TEXT NOT NULL DEFAULT '',
  patient_alias     TEXT NOT NULL DEFAULT '',
  start_date        TEXT NOT NULL,
  end_date          TEXT NOT NULL,
  sessions_per_week INTEGER NOT NULL,
  duration_weeks    INTEGER NOT NULL,
  provider_name     TEXT NOT NULL DEFAULT '',
  notes             TEXT DEFAULT '',
  view_preference   TEXT NOT NULL DEFAULT 'table'
                    CHECK (view_preference IN ('table', 'calendar')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_schedules_user ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_created ON schedules(created_at);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  schedule_id      TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL DEFAULT '09:00',
  provider_name    TEXT DEFAULT '',
  reminder_sent    INTEGER NOT NULL DEFAULT 0,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appointments_schedule ON appointments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

-- Admin TOTP secrets
CREATE TABLE IF NOT EXISTS admin_totp (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id     TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  totp_secret TEXT NOT NULL,
  backup_codes TEXT NOT NULL DEFAULT '[]',
  is_setup    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions (for token revocation)
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT,
  action     TEXT NOT NULL,
  detail     TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
