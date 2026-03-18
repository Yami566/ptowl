-- Migration 0009: Add user_alias column for PII-safe admin notifications
-- Stores a championship team alias (e.g., "Kansas City Chiefs") instead of real clinic/user info
ALTER TABLE users ADD COLUMN user_alias TEXT DEFAULT '';
