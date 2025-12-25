# Contract: Truth Snapshot

**Status**: Draft  
**Related**: [Journey](../journeys/admin/TF-01_truth_snapshot.md), [Acceptance](../acceptance/TF-01_truth_snapshot.feature.md)

---

## Definition

A **Truth Snapshot** is a frozen, versioned reference copy of tournament truth used for safe deployments, reproducible tests, and drift prevention.

---

## Snapshot Contents

### Required fields

- `snapshot_id` — unique, immutable identifier for this snapshot
- `schema_version` — contract version (semver)
- `created_at` — ISO-8601 timestamp
- `source` — `{ system, endpoint?, commit_sha? }`
- `tournament` — `{ id, name, season, timezone? }`
- `structure`
  - `divisions[]` — `{ id, name }`
  - `pools[]` — `{ id, division_id, name }`
  - `pool_memberships[]` — `{ pool_id, team_id }`
- `teams[]` — `{ id, name, division_id }`
- `fixtures[]` — `{ id, division_id, pool_id?, home_team_id, away_team_id, scheduled_at }`
- `state` — lifecycle state: `DRAFT` | `PUBLISHED` | `LOCKED`

### Optional fields

- `results[]` — `{ fixture_id, home_score, away_score, status, recorded_at }`
- `standings[]` — computed table per division/pool
- `notes?` — freeform metadata for traceability
- `fixture_meta?` — `{ venue? }` (optional, trace-only; does not affect validation)

---

## Invariants

- **Stable IDs**: `tournament.id`, `division.id`, `pool.id`, `team.id` never change once PUBLISHED or LOCKED.
- **Referential integrity**: every `fixtures[].home_team_id` / `away_team_id` exists in `teams[]`; every `pool_memberships[].team_id` exists in `teams[]`.
- **Standings are computed**: `standings[]` must be derived from fixtures/results only; no manual overrides or guesses.
- **No guessing rule**: if results are missing, standings must omit or mark as partial; never infer scores.

---

## Lifecycle States

- **DRAFT**: internal snapshot, fully editable.
- **PUBLISHED**: externally visible; only evolving fields may change.
- **LOCKED**: immutable, terminal state.

### Allowed changes by state

- **DRAFT**: any field may change.
- **PUBLISHED**: only allowed-to-evolve fields may change.
- **LOCKED**: no changes allowed; validation must reject any mutation.

### Allowed transitions

- `DRAFT -> PUBLISHED`
- `PUBLISHED -> LOCKED`

No reverse transitions are allowed.

---

## Allowed to Evolve vs Immutable

### Allowed to evolve (DRAFT/PUBLISHED)

- Fixture `scheduled_at` (time changes)
- Optional fixture metadata such as `fixture_meta.venue` (if present)
- Results and computed standings
- Optional metadata (`notes`, trace details)

### Immutable once PUBLISHED (and always immutable when LOCKED)

- Team IDs, division IDs, pool IDs, tournament ID
- Pool membership and team-to-division assignment
- Tie-break rules referenced by the snapshot
- Schema version for the snapshot

LOCKED snapshots cannot change any field, including those listed as allowed-to-evolve in PUBLISHED.

---

## Versioning

- `snapshot_id`: unique per snapshot; never reused.
- `schema_version`: semver for this contract; changes require a new snapshot.
- `created_at`: immutable creation timestamp.
- `source`: capture `system` and optional `endpoint` and `commit_sha` for traceability.

---

## Minimal Snapshot Example

```json
{
  "snapshot_id": "snap_2025_03_01_001",
  "schema_version": "1.0.0",
  "created_at": "2025-03-01T10:30:00Z",
  "state": "DRAFT",
  "source": {
    "system": "SOURCE_SYSTEM",
    "endpoint": "SOURCE_ENDPOINT",
    "commit_sha": "OPTIONAL_COMMIT_SHA"
  },
  "tournament": {
    "id": "tourn_2025_outdoor",
    "name": "Outdoor Intercity Championship",
    "season": "2025",
    "timezone": "Africa/Johannesburg"
  },
  "structure": {
    "divisions": [{ "id": "div_u13", "name": "U13" }],
    "pools": [{ "id": "pool_a", "division_id": "div_u13", "name": "Pool A" }],
    "pool_memberships": [
      { "pool_id": "pool_a", "team_id": "team_rebels_u13" },
      { "pool_id": "pool_a", "team_id": "team_dragons_u13" }
    ]
  },
  "teams": [
    {
      "id": "team_rebels_u13",
      "name": "Blue Crane Rebels",
      "division_id": "div_u13"
    },
    { "id": "team_dragons_u13", "name": "Dragons", "division_id": "div_u13" }
  ],
  "fixtures": [
    {
      "id": "fix_001",
      "division_id": "div_u13",
      "pool_id": "pool_a",
      "home_team_id": "team_rebels_u13",
      "away_team_id": "team_dragons_u13",
      "scheduled_at": "2025-03-02T09:00:00Z"
    }
  ]
}
```
