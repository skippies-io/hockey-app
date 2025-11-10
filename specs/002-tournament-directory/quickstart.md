# Quickstart — Tournament Directory & Detail Pages

## 1. Prerequisites
- Node.js 20.x, npm 10+
- Access to the Hockey App Google Sheet + Apps Script deployment
- Optional: Apps Script clasp CLI for local script edits

## 2. Install & Run
```bash
npm install     # reuses existing deps; if missing run `npm install idb-keyval ics`
npm run dev     # http://localhost:5173
npm run lint    # eslint .
```

## 3. Seed the Google Sheet
1. Add a **Tournaments** tab with columns: `slug`, `name`, `status`, `startDate`, `endDate`, `venueName`, `city`, `hostClub`, `heroImageUrl`, `description`, `contactEmail`, `contactPhone`, `season`.
2. Add **TournamentResources**: `tournamentSlug`, `type`, `label`, `url`.
3. Add **TournamentDivisions**: `tournamentSlug`, `divisionId`, `divisionLabel`, `teamCount`, `primaryTeamNames` (comma separated).
4. Populate at least one tournament per status for testing.

## 4. Apps Script updates
- Extend `code.gs` with handlers:
  - `doGet(e)` case `e.parameter.tournaments` → return directory list grouped by status + freshness metadata.
  - `doGet(e)` case `e.parameter.tournament` → return hydrated detail including resources/divisions.
- Add lightweight validation (unique slug, required dates) to avoid corrupt payloads.
- Deploy the script (test + production) and copy the URL into `VITE_API_BASE` if it changed.

## 5. Local testing checklist
- Visit `/tournaments` → verify grouped cards, search, status filters, empty state.
- Toggle filters + search → ensure query string updates and persists on reload.
- Click a card → detail hero, resources, divisions, and deep-link CTAs render.
- Load invalid slug (e.g., `/tournaments/unknown`) → confirm redirect + inline notice.
- Test offline mode: load directory once, go offline, reload → cached snapshot should render.

## 6. Debug tips
- `sessionStorage` keys `hj:cache:*tournaments*` show cached payloads; call `refreshAll()` helper to clear.
- Use React DevTools to inspect filter state and confirm query params remain synced via `useSearchParams`.
- Apps Script logs (Executions dashboard) help diagnose sheet parsing errors.
