# Contract: Groups Read Model

**Status**: Draft  
**Purpose**: UI compatibility for current Apps Script group output.

---

## Canonical Provider Output (v1.6)

Required fields (case-sensitive):
- `groups` (array)
  - `id` (string)
  - `label` (string)

---

## JSON Shape (required fields)

```json
{
  "groups": [
    { "id": "U13B", "label": "U13 Boys" }
  ]
}
```

---

## Type Notes

- `groups` is an array of objects.
- `id` is a non-empty string.
- `label` is a non-empty string.

---

## Normalization Rules (provider MUST apply)

- Always emit `groups` (may be empty).
- Always emit `id` and `label` as non-empty strings.

---

## Invariants

- `groups` may be empty but must be present.
- `id` values are used for routing and must be unique.

---

## Non-contract / UI-derived fields

- None.

---

## Compatibility Notes

- UI sorts by age number then division letter, but provider order is not relied on.

---

## Examples

```json
{
  "groups": [
    { "id": "U11B", "label": "U11 Boys" },
    { "id": "U11G", "label": "U11 Girls" }
  ]
}
```
