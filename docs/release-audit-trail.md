# Release Audit Trail

This document records what shipped to users and what is planned next.
It is meant to be a lightweight, release-friendly summary for quick reference.

## Shipped (most recent first)
- 2025-12-25 — commit c2a4412 — Team Profile fixture cards can expand to show details.
  - User-visible change: Tap on a Team Profile fixture card to reveal venue/pool/round/notes.
- 2025-12-25 — commit 11449f2 — Column-3 alignment tightened for FixtureCard result pill/scores.
  - User-visible change: Result pill and scores share a more consistent right edge.
- 2025-12-25 — commit 051e27a — FixtureCard layout shifted to a 4x3 grid (date/time + scores).
  - User-visible change: Fixture cards follow a clearer grid for date/time, teams, and scores.
- 2025-12-25 — commit ecc1ca9 — Result pill aligned to the score column.
  - User-visible change: W/D/L pill sits in the score column area.
- 2025-12-25 — commit 249178a — Result pill moved to header and tokenized styling applied.
  - User-visible change: W/D/L pill appears in the fixture card header with semantic colors.
- 2025-12-25 — PR #8 — Group and sort Team Profile fixtures by state.
  - User-visible change: Team Profile fixtures are grouped into Live/Recent/Upcoming and sorted.

## In Progress
- chore/wip-playwright (commit 3334040) — WIP Playwright scaffolding; not shipped.

## Next (Backlog)
- Align column-3 pill polish (deferred).
- Live pulse indicator (deferred).
- Tap-to-expand details: shipped (commit c2a4412 on main).
