# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# hockey-app — Agent Playbook (entrypoint)

hockey-app is a production PWA for viewing hockey tournaments, fixtures, standings, and team info. It has an active CI/CD pipeline and a protected main branch.

## Read first (source of truth)
- **Primary brief:** `docs/AGENTS.md`
- **Contribution guide:** `CONTRIBUTING.md`
- **Design tokens:** `src/styles/hj-tokens.css` (use CSS vars, never hardcode colors/spacing)
- **Agent conventions:** `.github/copilot-instructions.md` (patterns, naming, component rules)

## Stack
- **Frontend:** React 19 + Vite SPA, React Router v7, deployed to GitHub Pages
- **Backend:** Node.js API server (`server/index.mjs`, port 8787)
- **Database:** PostgreSQL via Supabase (RLS enforced; no direct client DB access)
- **Tests:** Vitest (unit/component) + Playwright (E2E + visual regression)
- **Quality:** ESLint + SonarCloud gates

## Architecture

```
src/
  components/   # Reusable UI (PropTypes required on all)
  views/        # Page-level components (fixtures, standings, teams, admin…)
  lib/          # Utilities: api.js (fetchJSON), routes.js, date.js
  context/      # TournamentContext — useTournament() hook for activeTournamentId
  styles/       # hj-tokens.css — design system CSS variables

server/
  index.mjs     # API entry (rate limiting, ETag caching, 60s in-memory cache)
  admin.mjs     # Admin endpoints (Bearer token auth)
  auth.mjs / auth-routes.mjs  # Magic link session auth

db/
  migrations/   # Numbered SQL migrations (apply sequentially)
  verify/       # RLS + privilege verification scripts

e2e/            # Playwright tests + visual regression snapshots
specs/          # SpecKit contracts + truth fixture snapshots
scripts/        # Dev tooling (dev-full.mjs, ingest.mjs, smoke.mjs)
```

## Provider modes
The app runs in two modes, controlled by env vars:

**DB mode (local dev with Postgres):**
```bash
export VITE_PROVIDER=db
export VITE_DB_API_BASE=http://localhost:8787/api
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/hockey
export TOURNAMENT_ID=hj-indoor-allstars-2025
npm run dev:full
```

**Apps Script mode (default / staging):**
```bash
export APPS_SCRIPT_BASE_URL=https://...
npm run dev:full
```

## Non‑negotiables (high impact)
1) **Verify before proposing changes**
```bash
npm run verify
```
2) **Full SonarCloud scan locally before opening any PR**
```bash
npm run test:coverage
```
- New code coverage **≥ 80%**
- Code duplication **≤ 3%**
- Reliability Rating on new code **≥ A** (zero new bugs)
- No new blocker or critical issues
- Quality gate must be green before proceeding

  If any threshold is not met, fix the issues first — do not open the PR.

3) **Open PR with auto-merge if all checks are green**
```bash
gh pr create --fill
gh pr merge --auto --squash
```
- Auto-merge is only enabled after CI, SonarCloud, and all required checks pass.
- Do not force-merge or bypass required checks.

## Common commands
- Dev (full stack): `npm run dev:full`
- Frontend only: `npm run dev`
- Backend only: `npm run server`
- Lint: `npm run lint`
- Tests: `npm test` / `npm run test:watch`
- Single test file: `npx vitest run src/path/to/file.test.jsx`
- Coverage: `npm run test:coverage`
- E2E: `npm run test:e2e`
- Visual regression: `npm run test:visual`
- Build: `npm run build`

## Key conventions
- `useTournament()` — access `activeTournamentId` and `activeTournament` in components
- Storage keys use `hj_*` prefix (e.g. `hj_active_tournament`)
- Cross-tab events: `window.dispatchEvent(new Event('hj:follows'))`
- `fetchJSON` in `src/lib/api.js` — throws `Error('HTTP <status>')` on failure
- All CSS values via design tokens (`--hj-color-brand`, `--hj-space-4`, etc.)
- PropTypes required on every component

## Notes
- Keep changes small and reversible.
- Prefer adding tests with code changes.
