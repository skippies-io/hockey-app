# Contract: Standings Read Model (v1)

**Purpose**: UI compatibility for v1.6 standings, teams list, and follow filters.

---

## Schema (JSON-ish)

Top-level:
- `rows` (array, required)
  - `Team` (string, optional)
  - `team` (string, optional)
  - `Rank` (number|string, optional)
  - `Points` (number|string, required)
  - `GF` (number|string, required)
  - `GA` (number|string, required)
  - `GD` (number|string, required)
  - `GP` (number|string, optional)
  - `P` (number|string, optional)
  - `W` (number|string, required)
  - `D` (number|string, required)
  - `L` (number|string, required)
  - `Pool` (string, optional)
  - `Group` (string, optional)
  - `Age` (string, optional)
  - `age` (string, optional)
  - `ageId` (string, optional)

---

## Invariants and Normalization

- `Team` (or `team`) is required for UI rendering and follow keys.
- `Points`, `GF`, `GA`, `GD`, `W`, `D`, `L` must parse to numbers; UI coerces via `+value` and defaults to 0.
- `GP` may be missing; UI falls back to `P`.
- `Rank` may be missing; UI falls back to row order.
- `Pool` is used for grouping; if missing, `Group` is used as fallback.

---

## Provider/Client Notes

- `Rank` is optional; UI calculates from index when missing.
- `GP` vs `P` fallback is client-side (`GP ?? P ?? 0`).
- `ageId`/`age`/`Age` are used to derive age buckets for "all ages".
- `Group` is a fallback for `Pool` when present in provider data.
- `__ageId` is client-derived when merging multiple ages; not required from provider.

---

## Example Rows

```json
{
  "rows": [
    {
      "Team": "Blue Crane Rebels",
      "Rank": 1,
      "Points": 9,
      "GF": 10,
      "GA": 2,
      "GD": 8,
      "GP": 3,
      "W": 3,
      "D": 0,
      "L": 0,
      "Pool": "A",
      "ageId": "U13B"
    },
    {
      "team": "Knights",
      "Points": "6",
      "GF": "7",
      "GA": "4",
      "GD": "3",
      "P": "3",
      "W": "2",
      "D": "0",
      "L": "1",
      "Group": "B",
      "Age": "U15G"
    }
  ]
}
```
