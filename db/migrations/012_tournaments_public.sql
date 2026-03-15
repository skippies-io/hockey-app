-- FR-001: Public tournament directory
-- Add is_active flag (controls visibility in public directory)
-- and logo_url for optional tournament branding
ALTER TABLE tournament
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS logo_url  TEXT;

-- Index for the common "show only active" query
CREATE INDEX IF NOT EXISTS idx_tournament_is_active ON tournament (is_active);
