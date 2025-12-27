# Contract: Standings Read Model

**Status**: Draft  
**Purpose**: UI compatibility for current Apps Script standings output.

---

## Canonical Provider Output (v1.6)

Required fields (case-sensitive):
- `rows` (array)
  - `Team` (string)
  - `Points` (number)
  - `GF` (number)
  - `GA` (number)
  - `GD` (number)
  - `W` (number)
  - `D` (number)
  - `L` (number)
  - `GP` (number)
  - `Pool` (string)
  - `Age` (string) or `ageId` (string) or `age` (string)

---

## JSON Shape (required fields)

```json
{
  "rows": [
    {
      "Team": "Blue Crane Rebels",
      "Points": 9,
      "GF": 10,
      "GA": 2,
      "GD": 8,
      "W": 3,
      "D": 0,
      "L": 0
    }
  ]
}
```

---

## Type Notes

- `Team` is a string (canonical field).
- `Rank` is a number when present.
- `Points`, `GF`, `GA`, `GD`, `W`, `D`, `L`, `GP` are numbers.
- `Pool`, `Age`, `age`, `ageId` are strings when present.

---

## Normalization Rules (provider MUST apply)

- Always emit `Team` (never `team`).
- Emit numeric fields as numbers, not numeric strings.
- Always emit `GP` as a number; do not rely on `P` fallback.
- Always emit `Pool` (may be empty string), never substitute `Group` for `Pool` in the canonical output.
- Use consistent casing for all keys as listed above.

---

## Invariants

- `Pool` may be empty.
- `Rank` may be missing; UI uses row order.

---

## Non-contract / UI-derived fields

- `__ageId` (client-derived when merging multiple ages).

---

## Compatibility Notes

- UI can fall back to `team`, `P`, or `Group`, but provider must emit canonical fields.

---

## Examples

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
      "Team": "Knights",
      "Points": 6,
      "GF": 7,
      "GA": 4,
      "GD": 3,
      "GP": 3,
      "W": 2,
      "D": 0,
      "L": 1,
      "Pool": "B",
      "Age": "U15G"
    }
  ]
}
```
