# Implementation Plan: Hockey App v2 Overview

**Branch**: `001-hockey-v2-overview` | **Date**: 2025-11-09 | **Spec**: `specs/001-hockey-v2-overview/spec.md`
**Input**: Feature specification from `/specs/001-hockey-v2-overview/spec.md`

## Summary

- Ship a richer `/overview` landing experience that aggregates fixtures, standings, announcements, awards, and follow signals across every age group so families find answers in under 10 seconds.
- Layer personalization (followed teams, pinned age groups, digest builder, share links, ICS export) on top of the existing Google Apps Script data source without adding a brand-new backend stack.
- Raise data trust by detecting stale/missing scores, showing a freshness indicator, caching payloads in IndexedDB for offline replay, and giving staff a lightweight alert workflow surfaced directly in the Overview feed.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: React 19 (Vite), Google Apps Script (server side)  
**Primary Dependencies**: React Router 7, `idb-keyval` (offline cache), `ics` (calendar export), existing analytics + follows libs  
**Storage**: Google Sheets via Apps Script, client IndexedDB for cached Overview payloads, sessionStorage for SWR cache  
**Testing**: Vitest + React Testing Library for UI logic (to be added), Apps Script clasp tests for new queries  
**Target Platform**: Installable PWA on modern Chromium/Safari/Firefox + responsive web  
**Project Type**: Single-page web app with lightweight serverless backend (Apps Script)  
**Performance Goals**: Overview renders meaningful cards <1 s after data arrives (overall <10 s from cold boot); ICS export <1 s for ≤10 fixtures  
**Constraints**: Offline capable, ≤5 min freshness lag, minimized network fan-out (single consolidated endpoint), privacy guardrails for digest links  
**Scale/Scope**: Hundreds of teams across ~10 age groups; peak weekend traffic in low thousands of MAU; data volume manageable within Google Sheets limits

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `.specify/memory/constitution.md` currently contains placeholder sections with no enforceable principles. In absence of explicit rules, we uphold standard SDD expectations: spec-driven workflow, measurable criteria, and non-destructive planning.
- No conflicts detected between the feature goals and the (empty) constitution, so planning proceeds with emphasis on testability + offline resilience noted in the spec itself.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── components/          # Standings, Fixtures, InstallPrompt, future Overview widgets
├── views/               # Route-level pages (Welcome, Team, Feedback, new Overview)
├── lib/                 # api.js, analytics, follows, future overview data helpers
├── styles/              # Global styles + tokens
├── assets/              # Static images/logos
├── config.js            # FALLBACK_GROUPS + constants
└── App.jsx / main.jsx   # Router + layout

public/
├── hj_logo.jpg
└── manifest + icons

code.gs_backup           # Reference for Apps Script deployment
specs/001-hockey-v2-overview/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── overview-api.md
```

**Structure Decision**: Single Vite PWA project. All new UI lives under `src/views/Overview` + supporting components/utilities. Server-side behavior is delivered through the existing Google Apps Script (`code.gs`); no separate backend folder is introduced.

## Complexity Tracking

No constitution violations were identified, so no complexity waivers are required.

## Phase 0 — Research Highlights
- See `research.md` for full notes. Key outcomes:
  1. Consolidated Overview payload will be generated in Apps Script (`?overview=1`) to minimize client round-trips and centralize stale-score detection.
  2. IndexedDB (via `idb-keyval`) complements the existing sessionStorage SWR cache so the Overview + digests can render when reopening offline and still honor the `<5 min` freshness SLA.
  3. Digest definitions persist in a new Google Sheet tab; share tokens expire after 14 days. ICS files are generated client-side with the `ics` package using the Overview payload, avoiding extra backend complexity.

Outstanding: none — privacy policy, caching approach, and digest workflow are defined for v2.

## Phase 1 — Design & Contracts

### Overview experience
**Decision:** `/overview` is the canonical home experience for v2.  
The legacy standalone Home page is retired; a dedicated “News & Updates” module can still land in v3 if long-form announcements are needed outside the Overview feed.
1. **Routing & layout**
   - Add `/overview` route in `App.jsx` that becomes the default landing (redirect `/` once feature flag flips).
   - Build `src/views/Overview/Overview.jsx` composed of feed sections (Followed Teams, Pinned Age Groups, Announcements, Awards, Alerts).
2. **Cards grid**
   - Normalize API payloads into `OverviewCard` models (see `data-model.md`) and map to visual components under `src/components/overview/`.
   - Provide skeleton/loading + offline states that reference `DataFreshnessSnapshot`.
3. **Interactions**
   - Deep-link cards to existing routes (`/:ageId/standings`, `/:ageId/fixtures`, `/team/:name`) using `links.deep`.
   - Provide quick actions: follow/unfollow, add to digest, add to calendar.

### Announcements module
- Introduce a lightweight **Announcements** section near the top of the Overview feed.
- Data source: `Announcements` tab in the Google Sheet, exposed via the consolidated Apps Script `?overview=1` payload.
- Each announcement includes: `id`, `title`, `message`, `postedAt`, `expiresAt`, `priority`.
- Display announcements as stacked cards under the welcome header; auto-hide expired items.
- Include announcements in freshness/offline handling so they behave like other `OverviewCard` types (cached in IndexedDB, annotated with timestamp metadata).

### Season Switching
- Introduce a small **Season Switcher** dropdown in the Overview header that lists all seasons returned by the API.
- Selecting a season triggers a reload of the Overview payload using `getOverview({ season })`.
- Cache keys and freshness metadata include the season identifier (`overview-2025`, `overview-2024`, etc.).
- Update routing so `/overview?season=YYYY` or `/overview/:season` restores state on reload.

### Data sources & caching
1. **API client**
   - Extend `src/lib/api.js` with `getOverview({ season, userKey })`, `createDigest(payload)`, `getDigest(token)`, and `flagFixtureAlert`.
   - Reuse query-style endpoints defined in `contracts/overview-api.md`.
2. **Caching strategy**
   - Introduce `src/lib/storage/overviewStore.ts` (or `.js`) that wraps IndexedDB via `idb-keyval` for cards + freshness metadata keyed by season.
   - Service worker (InstallPrompt already present) listens for `CACHE_OVERVIEW`/`CLEAR_CACHE` messages to prime data for offline use.
3. **Data freshness indicator**
   - Display global badge (green/orange/red) based on the worst `freshness.status`; include `Last updated {relative time}` per spec success criteria.

### Digest & sharing flow
1. **Digest builder UI**
   - Modal/page listing followed teams + all age groups with toggles.
   - Persist latest selection locally in `FollowPreference` and send to Apps Script via `createDigest`.
2. **Share links**
   - After saving, show public URL + copy button. Opening `/digest/:token` uses the read-only payload (`GET ?digest=token`) with the same card renderers minus edit actions.
   - Tokens auto-expire after 14 days; UI surfaces countdown and disables share once expired.
4. **Privacy filter**
   - Shared digest endpoints enforce the *Anonymous-by-Default* rule.
   - Apps Script strips all personally identifiable fields (`playerName`, `coachName`, `photoURL`, `contactInfo`) before returning the public JSON.
   - Add automated test to confirm no PII fields appear in `/digest/:token` responses.
3. **ICS export**
   - Use `ics` npm package to build `.ics` file from the next five fixtures in the current digest/Overview selection.

### Data quality & alerts
1. **Overdue detection**
   - Apps Script marks fixtures as `overdue-score` when schedule time + 60 min < now and no score posted; these appear as alert cards.
2. **Manual staff annotations**
   - Admin control panel (within Apps Script UI) posts to `POST ?alerts=1`; Overview merges results from the `alerts` array.
3. **Offline replay**
   - When offline, render cached cards with an “Offline • Last updated …” banner and disable refresh-only actions (share/save) until connectivity returns.

### Contracts & docs
- `contracts/overview-api.md` captures endpoints for Overview payloads, digest CRUD, and staff alerts.
- `data-model.md` formalizes entities to keep UI/client/business logic aligned.
- `quickstart.md` documents environment setup, sample data preparation, and debugging tips for the new flows.

## Risks & Open Questions
- **Privacy**: Policy confirmed — digests follow *Anonymous-by-Default* model (no player/coach names, photos, or contact details). Future versions may support opt-in name display with guardian consent.
- **Apps Script limits**: Consolidated Overview query must stay within 6 MB payload limit; may require trimming historical fixtures or paging if tournaments expand.
- **Notifications**: In-app notification center relies on future UI work (list + badges). Implementation will scope to local event log until a push channel is defined.

- **Deferred Modules (Post-v2)**:  
  - Franchise directory + contact tracking (FR-013)  
  - Tournament page + rules PDF (FR-014)
  > These items are out-of-scope for v2 to maintain a focused release on the Overview, Digest, and Offline experiences. They will be revisited in v3 once the PWA infrastructure stabilizes.

## Next Steps
1. Finalize the Season Switcher UX/API contract so `/overview` can hop between archived seasons without cache collisions.
2. Validate consolidated Apps Script payload sizes (fixtures + standings + announcements) under peak tournament data to ensure we stay below the 6 MB response limit.
3. Proceed with `/speckit.tasks` (already generated) to coordinate implementation of routing/UI, data layer, digest/ICS, and alert/offline workstreams.
