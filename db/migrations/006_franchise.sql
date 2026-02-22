CREATE TABLE IF NOT EXISTS franchise (
  tournament_id TEXT NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  manager_name TEXT,
  manager_photo_url TEXT,
  description TEXT,
  contact_phone TEXT,
  location_map_url TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,
  source_row_hash TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tournament_id, id),
  UNIQUE (tournament_id, name)
);

CREATE INDEX IF NOT EXISTS idx_franchise_tournament
  ON franchise (tournament_id);

ALTER TABLE team
  ADD COLUMN IF NOT EXISTS franchise_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'team_franchise_fk'
  ) THEN
    ALTER TABLE team
      ADD CONSTRAINT team_franchise_fk
      FOREIGN KEY (tournament_id, franchise_id)
      REFERENCES franchise(tournament_id, id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_team_franchise
  ON team (tournament_id, franchise_id);
