-- Migration 0015 — Add firebase_uid column to users.
--
-- Stage A of HOTFIX 2 (see /root/.claude/plans/i-want-to-reduce-witty-lemur.md)
-- swaps the custom JWT-cookie session for direct Firebase ID token
-- verification on every API request. Each request carries an
-- Authorization: Bearer <firebase-id-token> header; the middleware
-- verifies it against Google's JWKS (apps/api/src/auth/firebase-verify.ts)
-- and resolves it to a D1 user via firebase_uid.
--
-- Existing users (e.g. 703-400-9900) are linked on their first
-- Bearer-authenticated request: the middleware looks up by firebase_uid
-- first, falls back to phone, and UPDATEs firebase_uid in place. After
-- everyone has signed in once, the phone-fallback path becomes dead
-- code that we'll drop in a future cleanup migration.
--
-- The unique index doubles as a uniqueness constraint — Firebase issues
-- one UID per identity, so no two D1 rows should ever share one.
ALTER TABLE users ADD COLUMN firebase_uid TEXT DEFAULT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
