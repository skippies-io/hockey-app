CREATE TABLE IF NOT EXISTS venue (
  tournament_id TEXT NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,
  source_row_hash TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tournament_id, id),
  UNIQUE (tournament_id, name)
);

CREATE INDEX IF NOT EXISTS idx_venue_tournament
  ON venue (tournament_id);

CREATE TABLE IF NOT EXISTS group_venue (
  tournament_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  venue_id TEXT NOT NULL,
  PRIMARY KEY (tournament_id, group_id, venue_id),
  FOREIGN KEY (tournament_id, group_id)
    REFERENCES groups(tournament_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tournament_id, venue_id)
    REFERENCES venue(tournament_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS time_slot (
  tournament_id TEXT NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  venue_id TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tournament_id, id),
  FOREIGN KEY (tournament_id, venue_id)
    REFERENCES venue(tournament_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_time_slot_tournament
  ON time_slot (tournament_id);
