-- Add 'auth0' as valid OAuth provider
-- SQLite doesn't support ALTER CHECK, so recreate the table

CREATE TABLE oauth_accounts_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('google', 'phone', 'apple', 'auth0')),
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_user_id)
);

INSERT INTO oauth_accounts_new SELECT * FROM oauth_accounts;
DROP TABLE oauth_accounts;
ALTER TABLE oauth_accounts_new RENAME TO oauth_accounts;

CREATE INDEX idx_oauth_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_provider_uid ON oauth_accounts(provider, provider_user_id);
