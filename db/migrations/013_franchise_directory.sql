-- Global franchise directory for admin-managed reusable franchises
BEGIN;

CREATE TABLE IF NOT EXISTS franchise_directory (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  manager_name TEXT,
  manager_photo_url TEXT,
  description TEXT,
  contact_phone TEXT,
  location_map_url TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_franchise_directory_name
  ON franchise_directory (name);

-- Keep updated_at current
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_franchise_directory'
  ) THEN
    CREATE OR REPLACE FUNCTION set_updated_at_franchise_directory()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_franchise_directory_updated_at'
  ) THEN
    CREATE TRIGGER trg_franchise_directory_updated_at
    BEFORE UPDATE ON franchise_directory
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_franchise_directory();
  END IF;
END $$;

COMMIT;
