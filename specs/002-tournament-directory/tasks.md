# Tasks: Tournament Directory & Detail Pages

## Phase 1 – Setup & Infrastructure
- [ ] **T001 [P]** Create `src/views/Tournaments/` and `src/components/tournaments/` folders with stub exports to prevent import errors.
- [ ] **T002 [P]** Update `.env.example` / README with any new Apps Script params (none expected, verify existing `VITE_API_BASE` still valid).
- [ ] **T003** Confirm `quickstart.md` instructions for new sheets/endpoints; add screenshots or clarifications if missing.

## Phase 2 – Data Layer & API
- [ ] **T010** Extend `src/lib/api.js` with `getTournaments()` (calls `?tournaments=1`) and `getTournamentDetail(slug)` (calls `?tournament=<slug>`), mapping to the new schema (startDate, endDate, derivedStatus) and exposing lifecycle info to callers.
- [ ] **T011 [P]** Add tournament-specific caching helpers (extend `overviewStore` or create `tournamentStore`) to store directory list + detail payloads in sessionStorage + IndexedDB, tagging entries with derived status and season.
- [ ] **T012** Implement lifecycle grouping fallback (Live, Upcoming, Past) on the client side that derives status using `startDate`/`endDate` whenever API data is missing or stale; include unit tests for the helper.
- [ ] **T013 [P]** Document Apps Script validation (unique slug, valid start/end dates) and ensure instructions exist for redeploying the script with lifecycle logic.

## Phase 3 – User Story 1: Directory Browsing (P1)
- [ ] **T101** Add `/tournaments` route to `src/App.jsx` and create `Directory.jsx` scaffold with layout container matching Overview styling.
- [ ] **T102** Build directory hero section (title, copy, search input) with responsive alignment to existing Overview aesthetics.
- [ ] **T103 [P]** Implement `TournamentFilters` component (search input + Live/Upcoming/Past chips) syncing state via `useSearchParams`; chips should map to derived status groups.
- [ ] **T104** Implement `TournamentCard` showing status chip, date range (formatted), venue/city, host club, CTA to detail page, and fallback “TBD” labels.
- [ ] **T105** Wire `Directory.jsx` to fetch/cache tournaments, group them into Live/Upcoming/Past sections with headings, using responsive grids (1 column mobile → 3 columns desktop) and empty-state messaging when groups are empty.
- [ ] **T106** Add client-side search with 300 ms debounce filtering by name/host/city; ensure query params persist on reload and filters combine with status chips.
- [ ] **T107** QA checklist for `/tournaments`: verify grouping accuracy (based on start/end date), search/filter combinations, empty states, and styling consistency with Overview.

## Phase 4 – User Story 2: Detail Pages (P2)
- [ ] **T201** Add `/tournaments/:slug` route to `src/App.jsx` pointing to new `Detail.jsx` view; include loader/spinner and offline states.
- [ ] **T202** Build detail hero (optional hero image, lifecycle chip, date range, venue, host, contact info) with placeholders when data missing; chip text should reflect Live/Upcoming/Past logic.
- [ ] **T203** Implement tab navigation (Overview, Fixtures, Standings, Awards). Use React Router nested routes or internal tab state consistent with existing styling.
- [ ] **T204** Overview tab: render description copy, resource list (link icons), organizer contacts, and divisions grid with quick links to fixtures/standings (append `?tournament=<slug>`).
- [ ] **T205 [P]** Reuse existing Fixtures, Standings, and Awards components under tabs. Ensure they accept optional `tournament` filter via query params and only auto-refresh (poll or re-fetch) when the tournament is categorized as Live; Upcoming/Past tabs render static snapshots.
- [ ] **T206** Handle invalid slugs by redirecting to `/tournaments` with toast/inline notice stating “Tournament not found.”
- [ ] **T207** QA detail page: hero rendering, resources without links, missing hero image, Live auto-refresh behavior vs. static Upcoming/Past, 404 redirect.

## Phase 5 – User Story 3: Search & Filter UX (P3)
- [ ] **T301** Refine mobile layout for filters (collapsible drawer or stacked layout) ensuring chips/search don’t overflow small screens.
- [ ] **T302** Persist last-used filters (search text + status chips) in localStorage/sessionStorage so returning users retain preferences.
- [ ] **T303** Fire analytics events for filter changes and card clicks (similar to Overview event tracking).
- [ ] **T304** Accessibility pass: ensure filter controls are keyboard accessible, cards have aria labels, and tabs/time-based info are announced correctly.

## Phase 6 – Caching & Offline Enhancements
- [ ] **T401** Integrate directory cache with existing refresh button (clear sessionStorage + IndexedDB). Show offline badge when serving cached data.
- [ ] **T402 [P]** Add unit tests for lifecycle grouping helper (start/end date logic) and search/filter reducer using Vitest.
- [ ] **T403 [P]** Add RTL tests covering Directory card grouping, Detail hero, and tab switching (live vs. static behavior).
- [ ] **T404** Manual offline QA: load directory/detail, go offline, reload, ensure cached snapshot renders and Live-only refresh doesn’t run while offline.

## Phase 7 – Docs & Final Verification
- [ ] **T501** Update `specs/002-tournament-directory/quickstart.md` with final instructions, screenshots, and live/past filter guidance.
- [ ] **T502** Ensure `tournaments-api.md` matches the implemented payload (live/upcoming/past groups, derivedStatus). Update contracts if output differs.
- [ ] **T503** Final regression: `npm run lint`, `npm run build`, manual smoke on `/overview`, `/tournaments`, `/tournaments/:slug` (Live & Past examples).
