# Contract: Fixtures Read Model (v1)

**Purpose**: UI compatibility for v1.6 fixtures, team profile fixtures, and follow filters.

---

## Schema (JSON-ish)

Top-level:
- `rows` (array, required)
  - `Date` (string, required)
  - `Time` (string, optional)
  - `Team1` (string, required)
  - `Team2` (string, required)
  - `Score1` (string|number, optional)
  - `Score2` (string|number, optional)
  - `Pool` (string, optional)
  - `Group` (string, optional)
  - `Venue` (string, optional)
  - `Round` (string, optional)
  - `Status` (string, optional)
  - `Age` (string, optional)
  - `age` (string, optional)
  - `ageId` (string, optional)

---

## Invariants and Normalization

- `Date` is a non-empty string; client uses it for grouping and date filtering.
- `Time` may be missing; UI treats missing/empty as "TBD".
- `Team1` and `Team2` are non-empty strings.
- `Score1`/`Score2` may be empty or missing; UI treats empty as no score.
- `Pool` is used for display; if missing, `Group` is used as fallback.
- Status is normalized client-side to `live|postponed|cancelled|tbc|final|upcoming`.

---

## Provider/Client Notes

- `Status` is provider-derived; client lowercases and defaults to `final` when scores present, otherwise `upcoming`.
- `ageId`/`age`/`Age` are used to derive age buckets for "all ages".
- `Group` is a fallback for `Pool` when present in provider data.
- `__ageId` is client-derived when merging multiple ages; not required from provider.

---

## Example Rows

```json
{
  "rows": [
    {
      "Date": "2025-03-02",
      "Time": "09:00",
      "Team1": "Blue Crane Rebels",
      "Team2": "Dragons",
      "Score1": "2",
      "Score2": "1",
      "Pool": "A",
      "Venue": "Main Turf",
      "Round": "Round 1",
      "Status": "Final",
      "ageId": "U13B"
    },
    {
      "Date": "2025-03-03",
      "Time": "",
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
