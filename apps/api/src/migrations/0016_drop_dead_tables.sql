-- Migration 0016 — Drop dead tables left over from removed features.
--
-- The HOTFIX 2 + HOTFIX 3 commits removed the admin console, the patient
-- portal, and the custom JWT-cookie auth wrapper in favor of FirebaseUI
-- multi-provider sign-in + direct Firebase ID-token verification on the
-- API (apps/api/src/auth/firebase-verify.ts). The schema still carries
-- tables that nothing reads or writes anymore. This migration drops them
-- so future schema reads are honest about what state the app actually
-- depends on.
--
-- Tables being dropped:
--   oauth_accounts          — Auth0 / OAuth provider linking (removed when
--                             we moved off Auth0 to phone, then to Firebase)
--   password_reset_tokens   — only the bespoke email/password flow used it;
--                             FirebaseUI handles email-link sign-in itself
--   admin_totp              — TOTP enrollment for the removed admin console
--   admin_verification_codes — admin email-verification codes (same)
--   admin_audit_log         — admin-only audit log (same; user audit_log
--                             survives in 0001_initial.sql as `audit_log`)
--   sessions                — server-side session table from the legacy
--                             JWT-cookie wrapper. Firebase ID tokens are
--                             verified statelessly against Google's JWKS,
--                             so no server-side session row is created
--                             on sign-in any more.
--
-- IF EXISTS guards keep this idempotent across environments where some
-- of these tables may already have been dropped manually.

DROP TABLE IF EXISTS oauth_accounts;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS admin_totp;
DROP TABLE IF EXISTS admin_verification_codes;
DROP TABLE IF EXISTS admin_audit_log;
DROP TABLE IF EXISTS sessions;
