-- Add user_type to users table (clinic = provider, patient = patient)
ALTER TABLE users ADD COLUMN user_type TEXT NOT NULL DEFAULT 'clinic'
  CHECK (user_type IN ('clinic', 'patient'));

-- Patient-to-clinic linking via short codes
CREATE TABLE patient_codes (
  id          TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  code        TEXT NOT NULL UNIQUE,
  created_by  TEXT NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT DEFAULT NULL
);
CREATE INDEX idx_patient_codes_code ON patient_codes(code);

-- Links patients to schedules they've claimed via codes
CREATE TABLE patient_schedules (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  linked_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(patient_id, schedule_id)
);
CREATE INDEX idx_patient_schedules_patient ON patient_schedules(patient_id);
