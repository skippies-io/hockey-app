# Contract: Groups Read Model (v1)

**Purpose**: UI compatibility for v1.6 group selection and routing.

---

## Schema (JSON-ish)

Top-level:
- `groups` (array, required)
  - `id` (string, required)
  - `label` (string, required)

---

## Invariants and Normalization

- `groups` is an array; order may be arbitrary but UI sorts by age number then division letter.
- `id` is a non-empty string used in routes and API queries.
- `label` is a non-empty string used in UI labels.

---

## Provider/Client Notes

- Client normalizes to `{ id, label }` and applies sort order.
- No additional client-derived fields.

---

## Example Rows

```json
{
  "groups": [
    { "id": "U13B", "label": "U13 Boys" },
    { "id": "U13G", "label": "U13 Girls" }
  ]
}
```
