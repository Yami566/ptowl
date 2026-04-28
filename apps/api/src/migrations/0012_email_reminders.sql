-- Migration 0012: Email reminders for patient appointments
--
-- Decisions (iteration 4):
--   - Email source: prefer linked-patient users.email, fall back to
--     schedules.patient_email_encrypted (clinic-entered, AES-GCM at rest)
--   - Schedule timing: 24h before AND 1h before each appointment
--   - Unsubscribe scope: per email address (global), keyed by SHA-256 hash
--   - Frequency cap: digest mode (one daily email batching the day's reminders)
--   - Privacy: AES-GCM encryption at rest for clinic-entered emails

-- Encrypted clinic-entered email per schedule. NULL means no email
-- supplied at schedule-create time (might still send if patient has
-- linked their account with a real email).
ALTER TABLE schedules ADD COLUMN patient_email_encrypted TEXT DEFAULT NULL;
ALTER TABLE schedules ADD COLUMN reminders_enabled INTEGER NOT NULL DEFAULT 1;

-- Per-appointment idempotency markers. NULL = not yet sent. Filled
-- with the timestamp when the reminder was successfully enqueued.
ALTER TABLE appointments ADD COLUMN reminder_24h_sent_at TEXT DEFAULT NULL;
ALTER TABLE appointments ADD COLUMN reminder_1h_sent_at TEXT DEFAULT NULL;

-- Global-per-email subscription preferences. Lookup key is SHA-256
-- hash of normalized email so the table never holds the plaintext.
CREATE TABLE email_subscriptions (
  email_hash       TEXT PRIMARY KEY,                -- 64-char hex SHA-256
  unsubscribed     INTEGER NOT NULL DEFAULT 0,      -- 1 = block all reminders
  digest_mode      INTEGER NOT NULL DEFAULT 0,      -- 1 = batch as daily digest
  last_seen_email  TEXT,                            -- AES-GCM encrypted, for re-send
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index drives the cron's "find due reminders" query: appointments
-- whose appointment_date is within the upcoming reminder window AND
-- whose corresponding marker is still NULL.
CREATE INDEX idx_appointments_reminder_24h
  ON appointments(appointment_date) WHERE reminder_24h_sent_at IS NULL;
CREATE INDEX idx_appointments_reminder_1h
  ON appointments(appointment_date) WHERE reminder_1h_sent_at IS NULL;
