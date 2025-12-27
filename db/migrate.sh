#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

for file in db/migrations/*.sql; do
  [ -e "$file" ] || continue
  fname=$(basename "$file")
  applied=$(psql "$DATABASE_URL" -tA -c "SELECT 1 FROM schema_migrations WHERE filename='${fname}'")
  if [ "$applied" = "1" ]; then
    continue
  fi
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations (filename) VALUES ('${fname}')"
  echo "Applied ${fname}"
done
