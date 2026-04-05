-- Global venue directory for admin-managed reusable venues
BEGIN;

CREATE TABLE IF NOT EXISTS venue_directory (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venue_directory_name
  ON venue_directory (name);

-- Keep updated_at current
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_venue_directory'
  ) THEN
    CREATE OR REPLACE FUNCTION set_updated_at_venue_directory()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_venue_directory_updated_at'
  ) THEN
    CREATE TRIGGER trg_venue_directory_updated_at
    BEFORE UPDATE ON venue_directory
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_venue_directory();
  END IF;
END $$;

COMMIT;
