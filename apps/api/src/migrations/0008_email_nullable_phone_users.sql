-- Migration 0008: Make email nullable for phone-only users
-- The legacy schema requires email NOT NULL UNIQUE, but phone auth users
-- don't have real emails. This migration:
-- 1. Drops the UNIQUE constraint on email (SQLite requires table rebuild)
-- 2. Adds a unique index that only covers non-placeholder emails
-- 3. Keeps phone unique index from 0007

-- SQLite doesn't support ALTER COLUMN, so we rebuild the table
-- Step 1: Create new table without the NOT NULL UNIQUE on email
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  email TEXT DEFAULT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  phone TEXT,
  display_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  role TEXT NOT NULL DEFAULT 'user',
  tier TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 2: Copy data
INSERT INTO users_new SELECT id, email, password_hash, phone, display_name, status, role, tier, created_at, updated_at FROM users;

-- Step 3: Drop old table
DROP TABLE users;

-- Step 4: Rename new table
ALTER TABLE users_new RENAME TO users;

-- Step 5: Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL AND email NOT LIKE '%@phone.ptowl.local';
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);
