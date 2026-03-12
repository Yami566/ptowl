-- Admin email verification codes (replaces TOTP)
CREATE TABLE IF NOT EXISTS admin_verification_codes (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_codes_user ON admin_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_codes_expires ON admin_verification_codes(expires_at);
