# EXP-03 — Fixture card consistency + compact meta row

## Intent
Make fixture cards render consistently across Fixtures and Team Profile views, and improve information density by placing time + venue on one row.

## In scope
1) Date consistency
- Fixtures page groups by date; the date header should remain the primary date display.
- In grouped views (Fixtures page), FixtureCard should not show the date inside each card.
- In non-grouped views (Team Profile), FixtureCard may show the date, but it should use a modest header style consistent with grouped date sizing.

2) Compact meta row
- Fixture time and venue should appear on the same row, separated by a symbol (prefer `•`).
- Example: `15:30 • Rodean School`

## Out of scope
- Data fetching changes
- Changing grouping behavior on Fixtures page
- Any redesign of team rows / scores

## Acceptance checks
- Fixtures page: group date header remains; cards do not repeat date; time+venue appear on one line.
- Team Profile: fixture cards show date (if enabled) in a consistent, non-dominant size; time+venue appear on one line.
- Lint + build pass.
