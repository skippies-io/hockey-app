-- Releases: 2.0 (Announcements V2)
BEGIN;

-- 1. Make tournament_id nullable (for General announcements)
ALTER TABLE announcements ALTER COLUMN tournament_id DROP NOT NULL;

-- 2. Add is_published
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Add validity check for severity
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_severity_check;
ALTER TABLE announcements ADD CONSTRAINT announcements_severity_check CHECK (severity IN ('info', 'alert', 'success', 'warning'));

COMMIT;
