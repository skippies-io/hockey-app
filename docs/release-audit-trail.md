# Release Audit Trail

This document records what shipped to users and what is planned next.
It is meant to be a lightweight, release-friendly summary for quick reference.

## Shipped (most recent first)
- 2026-01-30 — tag v2.1.0 — Announcements 2.0: filtering, draft support, and enhanced banner.
  - User-visible change: Contextual announcement filtering via `tournament_id`.
  - User-visible change: "Draft" vs "Published" toggle for admin management.
  - User-visible change: Enhanced `AnnouncementBanner` with character limits and better responsive layout.
- 2025-12-29 — tag v1.6.0 — DB-backed read models + API provider switch.
  - User-visible change: v1.6 DB schema/migrations and ingestion for read models.
  - User-visible change: Minimal DB-backed `/api` server compatible with Apps Script endpoints.
  - User-visible change: Provider switching via env (defaults to Sheets).
  - User-visible change: One-command smoke/app tests (`test:app:sheets`, `test:app:db:local`).
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
