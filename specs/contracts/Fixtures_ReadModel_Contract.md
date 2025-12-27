# Contract: Fixtures Read Model

**Status**: Draft  
**Purpose**: UI compatibility for current Apps Script fixtures output.

---

## Canonical Provider Output (v1.6)

Required fields (case-sensitive):
- `rows` (array)
  - `Date` (string)
  - `Time` (string)
  - `Team1` (string)
  - `Team2` (string)
  - `Score1` (number|string "")
  - `Score2` (number|string "")
  - `Pool` (string)
  - `Venue` (string)
  - `Round` (string)
  - `Status` (string)
  - `Age` (string) or `ageId` (string) or `age` (string)

---

## JSON Shape (required fields)

```json
{
  "rows": [
    {
      "Date": "2025-03-02",
      "Time": "09:00",
      "Team1": "Blue Crane Rebels",
      "Team2": "Dragons",
      "Score1": "",
      "Score2": "",
      "Pool": "A",
      "Venue": "Main Turf",
      "Round": "Round 1",
      "Status": "Final"
    }
  ]
}
```

---

## Type Notes

- `Date` is a non-empty string.
- `Time` is a string; may be `"TBD"` or empty.
- `Team1` and `Team2` are non-empty strings.
- `Score1` and `Score2` are numbers or empty strings only.
- `Pool`, `Venue`, `Round`, `Status`, `Age`, `age`, `ageId` are strings when present.

---

## Normalization Rules (provider MUST apply)

- Always emit `Pool` (may be empty string), never substitute `Group` for `Pool` in the canonical output.
- Emit `Score1`/`Score2` as numbers or empty strings only.
- Emit `Time` as a string; use `"TBD"` or `""` when unknown.
- Use consistent casing for all keys as listed above.

---

## Invariants

- `Pool` may be empty.
- `Time` may be `"TBD"` or empty.
- `Score1`/`Score2` may be empty until a result is recorded.

---

## Non-contract / UI-derived fields

- `__ageId` (client-derived when merging multiple ages).

---

## Compatibility Notes

- UI can fall back to `Group` when `Pool` is empty, but provider must emit `Pool`.
- UI derives age from `Age`/`ageId`/`age`; provider must supply at least one.

---

## Examples

```json
{
  "rows": [
    {
      "Date": "2025-03-02",
      "Time": "09:00",
      "Team1": "Blue Crane Rebels",
      "Team2": "Dragons",
      "Score1": 2,
      "Score2": 1,
      "Pool": "A",
      "Venue": "Main Turf",
      "Round": "Round 1",
      "Status": "Final",
      "ageId": "U13B"
    },
    {
      "Date": "2025-03-03",
      "Time": "TBD",
      "Team1": "Gladiators",
      "Team2": "Knights",
      "Score1": "",
      "Score2": "",
      "Group": "B",
      "Venue": "Secondary",
      "Round": "Round 1",
      "Status": "TBC",
      "Age": "U15G"
    }
  ]
}
```
