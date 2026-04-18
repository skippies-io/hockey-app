BEGIN;

ALTER TABLE franchise_directory
  ADD COLUMN IF NOT EXISTS manager_bio TEXT;

ALTER TABLE franchise_directory
  ADD COLUMN IF NOT EXISTS home_venue_id TEXT
    REFERENCES venue_directory(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_franchise_directory_home_venue
  ON franchise_directory (home_venue_id);

COMMIT;
