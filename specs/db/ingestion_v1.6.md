# Ingestion v1.6 (Preview First)

## Overview

This pipeline ingests v1.6 read-model data into Postgres. The default mode is preview-only: it fetches data, normalizes to the frozen v1 contracts, validates, and writes a report without touching the database.

---

## Preview (no DB writes)

```sh
node scripts/ingest.mjs \
  --fixtures-sheet-id 1TT9CHE-L_HmrXuuVGGJy1_p4PYkw-IXkhcTt84UdUEU \
  --teams-sheet-id 1BFHC_NmY7CIlTvMopE-9BftnSzOA2AJpQ37tqnXZnTs
```

Optional: use Apps Script API if available.

```sh
node scripts/ingest.mjs --api-base "$VITE_API_BASE"
```

You can also pass the API base as `--api-base="$VITE_API_BASE"`. Use `--debug-args` to print the parsed args and resolved provider choice before ingestion continues.

---

## Commit (DB writes)

```sh
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/hockey"
node scripts/ingest.mjs --commit
```

---

## DB API server (UI provider)

Run the DB-backed API server and point the UI at it (no UI component changes required).

```sh
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/hockey"
export TOURNAMENT_ID="hj-indoor-allstars-2025"
node server/index.mjs
```

Then set the UI env vars:

```sh
export VITE_PROVIDER="db"
export VITE_DB_API_BASE="http://localhost:8787/api"
```

---

## Reports

- Written to `reports/ingestion/` by default.
- Includes counts, duplicates, validation errors, and group summaries.

---

## Notes

- Fixtures and standings are normalized to the v1 contracts.
- `Score1`/`Score2` are stored as integers; empty scores map to NULL.
- Placeholder teams are auto-created when fixtures reference unknown teams.

---

## Smoke tests (DB API)

```sh
curl "http://localhost:8787/api?groups=1"
curl "http://localhost:8787/api?sheet=Fixtures&age=U13B"
curl "http://localhost:8787/api?sheet=Standings&age=U13B"
python -c "import json,urllib.request; data=json.load(urllib.request.urlopen('http://localhost:8787/api?sheet=Standings&age=U13B')); row=data['rows'][0] if data['rows'] else {}; print({k:type(row.get(k)).__name__ for k in ['Rank','Points','GF','GA','GD','GP','W','D','L']})"
```
