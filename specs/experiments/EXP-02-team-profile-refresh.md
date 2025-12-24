# EXP-02 — Team Profile refresh (summary card + fixture date format)

## Intent
Polish the Team Profile page with a refreshed summary card and ensure fixture dates display as `dd MMM yyyy` (e.g., `06 Dec 2025`).

## In scope
1) Summary card design refresh (Team Profile top card):
- Cleaner hierarchy: team name prominent
- Age label as a subtle badge/pill
- Stats row (W/D/L/GF/GA/GD) readable, aligned, and scannable
- Keep favourite/star control and align it neatly with the title row
- Reuse existing Card styles + hj tokens (no new deps)

2) Date formatting consistency:
- Fixture dates shown on Team Profile must display as `dd MMM yyyy` (e.g., `06 Dec 2025`)
- Prefer updating the shared formatter in `src/components/FixtureCard.jsx` so the app is consistent
- Avoid locale ambiguity; ensure stable output format

## Out of scope
- Data source / API changes
- Major layout refactor
- New dependencies

## Acceptance checks
- Team Profile summary card looks cleaner on mobile (spacing + typography)
- Team Profile fixture dates render as `dd MMM yyyy`
- `npm run lint` and `npm run build` pass
