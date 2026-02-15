ALTER TABLE venue
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS location_map_url TEXT;

CREATE TABLE IF NOT EXISTS venue_directory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  location_map_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO venue_directory (id, name)
SELECT
  CONCAT(
    REGEXP_REPLACE(LOWER(TRIM(name)), '[^a-z0-9]+', '-', 'g'),
    '-',
    SUBSTRING(MD5(TRIM(name)) FOR 12)
  ) AS id,
  TRIM(name) AS name
FROM (
  SELECT name FROM venue
  UNION
  SELECT venue AS name FROM fixture
) AS src
WHERE name IS NOT NULL AND TRIM(name) <> ''
ON CONFLICT (name) DO NOTHING;
