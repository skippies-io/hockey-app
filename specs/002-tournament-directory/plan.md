# Implementation Plan: Tournament Directory & Detail Pages

**Branch**: `002-tournament-directory` | **Date**: 2025-11-09 | **Spec**: `specs/002-tournament-directory/spec.md`
**Input**: Feature specification from `/specs/002-tournament-directory/spec.md`

## Summary
- Ship a `/tournaments` directory that groups events by status, supports search/filter, and matches the card-based style introduced in the Overview redesign.
- Add `/tournaments/:slug` detail pages with tabs for Overview, Fixtures, Standings, and Awards, reusing existing components where possible.
- Extend the Google Apps Script API with `?tournaments=1` and `?tournament=<slug>` endpoints and cache responses (sessionStorage + IndexedDB) to keep the UI responsive and offline-friendly.

## Technical Context
**Language/Version**: React 19 (Vite), Google Apps Script (server)  
**Primary Dependencies**: React Router 7, existing design tokens, idb-keyval (cache), fetch API  
**Storage**: Google Sheets tabs (`Tournaments`, `TournamentResources`, `TournamentDivisions`) surfaced via Apps Script; IndexedDB for cached payloads  
**Testing**: Vitest + React Testing Library (directory filters, tab rendering), Apps Script clasp tests  
**Target Platform**: Installable PWA (desktop + mobile browsers)  
**Project Type**: Single-page web app (Vite SPA) backed by Apps Script  
**Performance Goals**: Directory/detail LCP < 2.5 s on LTE, search/filter response <300 ms  
**Constraints**: Reuse Overview styling, offline tolerant, no new backend outside Apps Script, keep bundle size lean  
**Scale/Scope**: Up to 30+ tournaments per season, dozens of divisions per event

## Constitution Check
- `.specify/memory/constitution.md` contains placeholders; no active mandates. We maintain spec-first planning and measurable outcomes, so no violations.

## Project Structure
```text
specs/002-tournament-directory/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── tournaments-api.md
└── tasks.md (generated later)

src/
├── components/
│   └── tournaments/
│       ├── TournamentCard.jsx
│       ├── TournamentFilters.jsx
│       └── ResourceList.jsx
├── lib/
│   ├── api.js            # add getTournaments/getTournamentDetail
│   └── tournamentStore.js (optional shared idb wrapper)
├── views/
│   └── Tournaments/
│       ├── Directory.jsx
│       └── Detail.jsx
└── App.jsx               # add /tournaments routes
```
**Structure decision**: Single SPA with new `views/Tournaments` module and lightweight components folder to keep directory/detail UI isolated.

## Research Recap
- Apps Script will hydrate directory/detail payloads from new sheets.
- Client caches directory list (sessionStorage + IndexedDB); search/filter remains client-side.
- Detail page CTAs deep-link into existing fixtures/standings/awards routes using query params.

## Architecture & Routing
### Routes
1. `/tournaments`
   - Hero + search input + status chips
   - Cards grouped by lifecycle (Live, Upcoming, Past) based on `startDate`/`endDate`
   - Cards link to `/tournaments/:slug`
2. `/tournaments/:slug`
   - Hero metadata (image, host, dates, venue, contact)
   - Tabs: Overview (resources + divisions), Fixtures, Standings, Awards
   - Tabs reuse existing components. Only Live tournaments auto-refresh fixtures/standings/awards; Upcoming/Past show static views (no polling or HMR).
3. Invalid slug redirects back to `/tournaments` with toast/snackbar

### Component Breakdown
- `TournamentCard`: displays status chip, name, date/venue summary, CTA.
- `TournamentFilters`: search input + chip filters, syncs with `useSearchParams`.
- `Directory.jsx`: orchestrates fetching, caching, grouping, and layout.
- `Detail.jsx`: fetches single tournament, renders hero, tabs, and falls back to 404 state when missing.
- Reuse existing fixtures/standings components by embedding them under tabs with `Routes` or `lazy` wrappers.

## Data Flow & API
1. `getTournaments()` → `GET ${API_BASE}?tournaments=1`
   - Returns grouped object (live/upcoming/past) + freshness metadata and `derivedStatus`.
   - Cache key `hj:tournaments:${season||default}`.
2. `getTournamentDetail(slug)` → `GET ${API_BASE}?tournament=${slug}`
   - Returns hero/resources/divisions/contacts.
3. IndexedDB (`tournamentStore`) caches both list + per-tournament detail for offline support.
4. Directory loads from cache, then revalidates; detail pages attempt cache first, network second.

## UI Layout & Styling
- Mirror Overview’s card style: 16px radius, soft shadows, neutral background.
- Directory hero: large title plus search/filter row. Status group headings (“Live”, “Upcoming”, “Past”) match Overview typography.
- Grid adjusts automatically when groups are missing; maintain 24px spacing between sections.
- Detail hero uses optional background image overlay + metadata list.
- Tabs: simple pill navigation anchored below hero; on mobile, use horizontal scroll.
- Resources and divisions render card lists with consistent spacing (24px vertical rhythm).

## Caching & Offline
- SessionStorage for instant hydration; IndexedDB for persistence between sessions/offline.
- When offline, directory shows cached snapshot and a small “Offline” badge (reuse Overview indicator pattern).
- Detail page attempts to load cached entry; if missing offline, show friendly message with link back to directory.

## Reuse of Existing Components
- Fixtures/Standings/Awards: wrap existing views inside detail tabs, passing `tournament` query param to filter results (component updates needed to respect query param but reuse same layout).
- Buttons, typography, and spacing match Overview CSS tokens to ensure visual consistency.

## Risks & Mitigations
1. **Data integrity**: missing slugs or inconsistent statuses could break grouping. Mitigation: Apps Script validation + fallback “Unknown tournament” placeholders.
2. **Status drift**: manual `status` field might conflict with date-derived lifecycle. Mitigation: UI respects `derivedStatus` and displays manual status only if `statusOverride` flag is set.
3. **Auto-refresh load**: fixtures/standings auto-refresh only for Live tournaments to avoid unnecessary polling. Add guard so upcoming/past tabs stay static.

## Next Steps
1. Produce `tasks.md` via `/speckit.tasks` to break work into Setup, API/data, Directory UI, Detail UI, and Polish phases.
2. After tasks approval, proceed with `/speckit.implement` to build the feature branch.
