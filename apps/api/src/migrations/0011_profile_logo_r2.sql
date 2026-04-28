-- Migration 0011: Add R2 object key for clinic logos
-- New uploads write the binary to the LOGOS R2 bucket and store the
-- object key here. The legacy logo_url column (base64 data URL) is
-- kept for backward compat with existing rows; new code prefers
-- logo_r2_key when present.
--
-- After all logos are migrated to R2, a future migration can drop
-- logo_url. For now we dual-track.
ALTER TABLE profiles ADD COLUMN logo_r2_key TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_logo_r2_key ON profiles(logo_r2_key)
  WHERE logo_r2_key IS NOT NULL;
