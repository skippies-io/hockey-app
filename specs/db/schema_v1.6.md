# Postgres Schema v1.6 (Truth Read Models)

## Goals

- Store canonical provider output for v1 read-model contracts.
- Support fixtures + results ingestion and computed standings.
- Preserve auditability for traceability and replays.

---

## Tables

### tournament

- **Columns**: `id` (PK), `name`, `season`, `created_at`, `source`, `source_row_hash`, `ingested_at`
- **Primary key**: `id`
- **Notes**: one row per tournament feed.

### groups (division/age group)

- **Columns**: `tournament_id` (FK), `id`, `label`, `format`, `created_at`, `source`, `source_row_hash`, `ingested_at`
- **Primary key**: `(tournament_id, id)`
- **Foreign keys**: `tournament_id -> tournament(id)`
- **Notes**: `id` matches v1 groups contract.

### team

- **Columns**: `tournament_id` (FK), `id`, `group_id` (FK), `name`, `is_placeholder`, `created_at`, `source`, `source_row_hash`, `ingested_at`
- **Primary key**: `(tournament_id, id)`
- **Foreign keys**: `(tournament_id, group_id) -> groups(tournament_id, id)`
- **Notes**: `is_placeholder` flags derived/placeholder teams.

### fixture

- **Columns**: `tournament_id` (FK), `id`, `group_id` (FK), `date`, `time`, `venue`, `round`, `pool`, `team1_id` (FK), `team2_id` (FK), `fixture_key`, `created_at`, `source`, `source_row_hash`, `ingested_at`
- **Primary key**: `(tournament_id, id)`
- **Unique constraints**: `(tournament_id, fixture_key)`
- **Foreign keys**:
  - `(tournament_id, group_id) -> groups(tournament_id, id)`
  - `(tournament_id, team1_id) -> team(tournament_id, id)`
  - `(tournament_id, team2_id) -> team(tournament_id, id)`
- **Notes**: `time` is text to preserve `"TBD"` and raw provider values.

### result

- **Columns**: `tournament_id` (FK), `fixture_id` (FK), `score1`, `score2`, `status`, `updated_at`, `source`, `source_row_hash`, `ingested_at`
- **Primary key**: `(tournament_id, fixture_id)`
- **Foreign keys**: `(tournament_id, fixture_id) -> fixture(tournament_id, id)`
- **Notes**: `score1`/`score2` remain nullable; provider outputs numbers or empty string, ingestion maps `""` to NULL.

---

## Indexes

- `groups(tournament_id)`
- `team(tournament_id, group_id)`
- `team(tournament_id, name)`
- `fixture(tournament_id, group_id, date)`
- `fixture(tournament_id, team1_id)`
- `fixture(tournament_id, team2_id)`
- `result(tournament_id, status)`

---

## What Is Stored vs Computed

- **Stored**: canonical provider rows for groups, teams, fixtures, results.
- **Computed**: standings are derived from `fixture` + `result` using a SQL view (`v1_standings`).

---

## Computed Standings (View)

- **View**: `v1_standings`
- **Emits**: `Team`, `Rank`, `Points`, `GF`, `GA`, `GD`, `GP`, `W`, `D`, `L`, `Pool`, `Age`
- **Logic**: sums per team over completed fixtures (scores present), assigns rank by Points/GD/GF/team name.

---

## Auditability Fields

- `source`: string identifier for provider (e.g., `SheetsProvider`, `DbProvider`).
- `source_row_hash`: stable hash of raw provider row for change detection.
- `ingested_at`: timestamp for ingestion time.

---

## Local Migrations

Prereqs: `psql` and a local Postgres instance.

Example (local):

```sh
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/hockey"
./db/migrate.sh
```

Optional Docker example:

```sh
docker run --rm -e POSTGRES_PASSWORD=postgres -p 5432:5432 --name hockey-db postgres:16
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres"
./db/migrate.sh
```
