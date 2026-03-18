-- Add share_token column for public .ics calendar links
ALTER TABLE schedules ADD COLUMN share_token TEXT DEFAULT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_share_token ON schedules(share_token);
