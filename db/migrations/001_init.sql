CREATE TABLE IF NOT EXISTS tournament (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,
  source_row_hash TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
  tournament_id TEXT NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  label TEXT NOT NULL,
  format TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,
  source_row_hash TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tournament_id, id)
);

CREATE TABLE IF NOT EXISTS team (
  tournament_id TEXT NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_placeholder BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,
  source_row_hash TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tournament_id, id),
  FOREIGN KEY (tournament_id, group_id)
    REFERENCES groups(tournament_id, id) ON DELETE RESTRICT,
  UNIQUE (tournament_id, group_id, name)
);

CREATE TABLE IF NOT EXISTS fixture (
  tournament_id TEXT NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  venue TEXT,
  round TEXT,
  pool TEXT,
  team1_id TEXT NOT NULL,
  team2_id TEXT NOT NULL,
  fixture_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,
  source_row_hash TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tournament_id, id),
  FOREIGN KEY (tournament_id, group_id)
    REFERENCES groups(tournament_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tournament_id, team1_id)
    REFERENCES team(tournament_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tournament_id, team2_id)
    REFERENCES team(tournament_id, id) ON DELETE RESTRICT,
  UNIQUE (tournament_id, fixture_key)
);

CREATE TABLE IF NOT EXISTS result (
  tournament_id TEXT NOT NULL,
  fixture_id TEXT NOT NULL,
  score1 INTEGER,
  score2 INTEGER,
  status TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,
  source_row_hash TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tournament_id, fixture_id),
  FOREIGN KEY (tournament_id, fixture_id)
    REFERENCES fixture(tournament_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_groups_tournament
  ON groups (tournament_id);

CREATE INDEX IF NOT EXISTS idx_team_group
  ON team (tournament_id, group_id);

CREATE INDEX IF NOT EXISTS idx_team_name
  ON team (tournament_id, name);

CREATE INDEX IF NOT EXISTS idx_fixture_group_date
  ON fixture (tournament_id, group_id, date);

CREATE INDEX IF NOT EXISTS idx_fixture_team1
  ON fixture (tournament_id, team1_id);

CREATE INDEX IF NOT EXISTS idx_fixture_team2
  ON fixture (tournament_id, team2_id);

CREATE INDEX IF NOT EXISTS idx_result_status
  ON result (tournament_id, status);

CREATE OR REPLACE VIEW v1_standings AS
WITH played AS (
  SELECT
    f.tournament_id,
    f.group_id,
    f.pool,
    f.team1_id AS team_id,
    r.score1 AS gf,
    r.score2 AS ga,
    CASE WHEN r.score1 > r.score2 THEN 1 ELSE 0 END AS w,
    CASE WHEN r.score1 = r.score2 THEN 1 ELSE 0 END AS d,
    CASE WHEN r.score1 < r.score2 THEN 1 ELSE 0 END AS l
  FROM fixture f
  JOIN result r
    ON r.tournament_id = f.tournament_id
   AND r.fixture_id = f.id
  WHERE r.score1 IS NOT NULL AND r.score2 IS NOT NULL

  UNION ALL

  SELECT
    f.tournament_id,
    f.group_id,
    f.pool,
    f.team2_id AS team_id,
    r.score2 AS gf,
    r.score1 AS ga,
    CASE WHEN r.score2 > r.score1 THEN 1 ELSE 0 END AS w,
    CASE WHEN r.score2 = r.score1 THEN 1 ELSE 0 END AS d,
    CASE WHEN r.score2 < r.score1 THEN 1 ELSE 0 END AS l
  FROM fixture f
  JOIN result r
    ON r.tournament_id = f.tournament_id
   AND r.fixture_id = f.id
  WHERE r.score1 IS NOT NULL AND r.score2 IS NOT NULL
),
agg AS (
  SELECT
    tournament_id,
    group_id,
    pool,
    team_id,
    COUNT(*) AS gp,
    SUM(w) AS w,
    SUM(d) AS d,
    SUM(l) AS l,
    SUM(gf) AS gf,
    SUM(ga) AS ga
  FROM played
  GROUP BY tournament_id, group_id, pool, team_id
),
final AS (
  SELECT
    a.tournament_id,
    a.group_id,
    a.pool,
    t.name AS "Team",
    a.gp AS "GP",
    a.w AS "W",
    a.d AS "D",
    a.l AS "L",
    a.gf AS "GF",
    a.ga AS "GA",
    (a.gf - a.ga) AS "GD",
    (a.w * 3 + a.d) AS "Points"
  FROM agg a
  JOIN team t
    ON t.tournament_id = a.tournament_id
   AND t.id = a.team_id
)
SELECT
  f.tournament_id,
  f.group_id,
  g.id AS "Age",
  f.pool AS "Pool",
  f."Team",
  f."GP",
  f."W",
  f."D",
  f."L",
  f."GF",
  f."GA",
  f."GD",
  f."Points",
  ROW_NUMBER() OVER (
    PARTITION BY f.tournament_id, f.group_id, f.pool
    ORDER BY f."Points" DESC, f."GD" DESC, f."GF" DESC, f."Team" ASC
  ) AS "Rank"
FROM final f
JOIN groups g
  ON g.tournament_id = f.tournament_id
 AND g.id = f.group_id;
