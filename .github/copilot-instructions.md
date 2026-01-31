# Copilot / Agent instructions — hockey-app

Purpose: give an AI coding agent immediate, actionable context so it can be productive without extra human hand-holding.

## Big picture (what the app is)
- React single-page app built with Vite (React + HMR). Entry: `src/main.jsx` → `src/App.jsx`.
- Router: **BrowserRouter** (React Router v7) with routes like `/:ageId/{fixtures|standings|teams}` and `/:ageId/team/:teamName`.
- **Backend**: Node.js API with a PostgreSQL (Supabase) database (`server/index.mjs`).
- **Multi-Tournament Architecture**: `TournamentContext` provides `activeTournamentId` and `availableTournaments`.
- Static site deployed to **GitHub Pages** via `.github/workflows/deploy.yml` that runs `npm run build` and publishes `dist/`.

## Data Model (PostgreSQL)
Core tables in the schema:
- **tournament**: The top-level entity (id, name, theme).
- **groups**: Acts as age divisions/categories (linked to tournament).
- **team**: Participating teams (linked to tournament and group).
- **fixture**: Matches/Games (date, time, venue, linked to teams).
- **result**: Scores for a fixture (score1, score2).

## Key workflows / commands
- Development (HMR): `npm run dev:full` (runs both Vite + Node server); Node >= 20.
- Production build: `npm run build` → outputs `dist/`.
- Preview a production build locally: `npm run preview`.
- Lint: `npm run lint` (ESLint configured in `eslint.config.js`).
- Test: `npm test` (Vitest with jsdom).

## Important environment variables
- Vite exposes env vars as `import.meta.env.VITE_*`.
  - `VITE_PROVIDER` — `"db"` for database mode (default in V2).
  - `VITE_DB_API_BASE` — API base URL for database provider (e.g., `http://localhost:8787/api`).
  - `VITE_SUPABASE_URL` — Supabase Project URL.
  - `VITE_SUPABASE_ANON_KEY` — Supabase Anon Public Key.
  - `VITE_APP_VERSION` (used in cache keys; default `v1`). In CI, `.env.production` sets it to `${GITHUB_SHA}`.
- **Server** (Node.js):
  - `DATABASE_URL` — PostgreSQL connection string (loaded from `.env.db.local` for local dev).
  - `TOURNAMENT_ID` — Fallback tournament ID if not specified in requests.

## Project-specific patterns & conventions
- **PropTypes Enforcement**: All components must have PropTypes defined. Use `import PropTypes from 'prop-types'`.
- **Design System**: Strict adherence to `src/styles/hj-tokens.css` for all styling. Use CSS variables like `--hj-color-brand`, `--hj-space-4`, etc. No hardcoded colors or spacing.
- **Tournament Context**: Components should use `useTournament()` hook to access `activeTournamentId` and `activeTournament`.
- Storage key naming: localStorage/sessionStorage keys start with `hj_` (e.g., `hj_active_tournament`).
- Cross-tab notification: follows writes dispatch `window.dispatchEvent(new Event('hj:follows'))`.
- Error and retry conventions:
  - `fetchJSON` throws `Error('HTTP <status>')` or API-supplied `data.error`.
  - Keep UI-level catch blocks simple (message string).
- **Caching**: The Node.js API server implements in-memory caching for fixtures and standings to reduce DB load.
- **Announcements 2.0**:
  - Uses `is_published` boolean filter.
  - Contextual filtering via `tournament_id` (null = General, value = Specific Tournament).

## Files & code patterns to inspect when changing behavior
- `src/lib/api.js` — API client, caching, SWR behavior.
- `src/context/TournamentContext.jsx` — Multi-tournament state management.
- `src/components/AppLayout.jsx` — Main layout, header, tournament switcher integration.
- `src/views/*` and `src/components/*` — Follow small, focused components pattern.
- `server/index.mjs` — Node.js API server, database queries, caching.
- `server/admin.mjs` — Admin API routes (announcements CRUD).

## Conventions for routes & URLs
- Age-first routing: routes expect `/:ageId/fixtures` etc.
- Use `teamProfilePath(ageId, teamName)` (in `src/lib/routes.js`) to build safe team links.

## Build/deploy gotchas & checks for PRs
- Ensure `VITE_DB_API_BASE` is set for local development.
- `DATABASE_URL` must be configured for server to connect to PostgreSQL.
- Run `npm test` before committing — all tests must pass.
- When changing public assets (images, manifest), update `public/` and verify `npm run build`.

## Helpful examples (copyable)
- Clearing client cache at runtime: call `refreshAll()` from `src/lib/api.js`.
- Access active tournament: `const { activeTournament } = useTournament()`.

## Good first tasks for contributors
- Add unit tests for new components.
- Expand Admin Console CRUD (Tournaments, Teams, Fixtures).
- Implement Tech Desk features for live match reporting.

---
If anything above is unclear or you'd like more detail, tell me what to expand and I'll iterate. ✅
