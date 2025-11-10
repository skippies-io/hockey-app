# Tasks: Hockey App v2 Overview

**Input**: Design documents from `/specs/001-hockey-v2-overview/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 [P] Install `idb-keyval` and `ics` packages plus TypeScript types (if needed) via `package.json`; document usage in `specs/001-hockey-v2-overview/quickstart.md`.
- [ ] T002 [P] Create `.env.example` entries for `VITE_API_BASE`, `VITE_APP_VERSION`, and any Apps Script secrets needed for digest/alerts; update README if environment steps change.
- [ ] T003 Establish coding scaffolding for new overview modules: add `src/views/Overview/` and `src/components/overview/` directories with placeholder exports to avoid broken imports in later phases.

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T010 Update Google Apps Script (`code.gs_backup` → deployed script) to expose `?overview=1`, `?digest=`, `?digests=1`, and `?alerts=1` handlers as defined in `contracts/overview-api.md`, including 14-day token expiry logic.
- [ ] T011 [P] Add sheet tab creation/migration steps for `OverviewDigests` + `FixtureAlerts` in deployment notes (e.g., `specs/.../quickstart.md`) so staff can seed data.
- [ ] T012 Extend `src/lib/api.js` with `getOverview`, `createDigest`, `getDigest`, and `flagFixtureAlert` helpers that call the new Apps Script endpoints and normalize results into the data-model shapes.
- [ ] T013 Implement `src/lib/storage/overviewStore.js` using `idb-keyval` to cache overview payloads, digest configs, and freshness metadata per season, including helpers for offline reads and TTL enforcement.
- [ ] T014 [P] Define shared types/constants (`src/lib/overviewTypes.js`) for `OverviewCard`, `DataFreshnessSnapshot`, and alert enums so UI + API stay consistent.
- [ ] T015 Wire a global freshness/notifications context (e.g., `src/lib/overviewContext.jsx`) that exposes cached data, online/offline flags, and follow preferences to consuming views.

**Checkpoint**: Overview data layer, storage, and Apps Script endpoints exist; UI work can start.

---

## Phase 3: User Story 1 — Cross-Age Overview Dashboard (P1)

**Goal**: Deliver the `/overview` landing page that aggregates cards (fixtures, standings, announcements, awards) across age groups using follow/pin context.
**Independent Test**: Load `/overview` with seeded data, toggle follows/pins, and verify that all cards render, deep-link correctly, and respect the freshness indicator without visiting other routes.

### Implementation

- [ ] T101 Add `/overview` route in `src/App.jsx`, set `/` to redirect once feature flag is ready, and create `src/views/Overview/Overview.jsx` skeleton with sections for Followed Teams, Pinned Age Groups, Announcements, Awards, and Alerts.
- [ ] T102 [P][US1] Build reusable card components in `src/components/overview/` (FixtureCard, StandingCard, AnnouncementCard, AwardCard, AlertCard) mapped to `OverviewCard.type`.
- [ ] T103 [P][US1] Implement Overview feed composition hooks (`useOverviewFeed` in `src/views/Overview/useOverviewFeed.js`) that merge API payload + IndexedDB cache + follow preferences, with stale-while-revalidate behavior.
- [ ] T104 [US1] Add global data freshness indicator and offline banner inside `Overview.jsx`, deriving colors and timestamps from `DataFreshnessSnapshot` per spec success criteria.
- [ ] T105 [US1] Surface announcements + awards under Overview, including severity styling and auto-hide logic per `visibleUntil`.
- [ ] T106 [US1] Connect follow/unfollow + age pinning controls within Overview to existing `useFollows` (or extend) so cards update immediately.
- [ ] T107 [US1] Add deep-link actions (e.g., buttons linking to `/:ageId/fixtures`, `/:ageId/standings`, `/team/:name`) and ensure router navigation works from every card type.
- [ ] T108 [US1] Write UI tests (Vitest/RTL) covering card rendering permutations, offline fallback, and freshness indicator messaging using mocked stores.
- [ ] T109 Manual QA checklist: verify Overview loads in <10s, respects follow state, handles missing pools, and logs analytics events for card impressions.
- [ ] T110 [US1] Implement the Season Switcher dropdown and API integration (pass `season` param, update cache keys, ensure state restores on `/overview?season=YYYY`).

**Checkpoint**: Overview page fully renders and is independently demoable.

---

## Phase 4: User Story 2 — Personalized Digest & Sharing (P2)

**Goal**: Allow users to curate digests, generate share links, and export fixtures to calendar files.
**Independent Test**: Create a digest with specific teams/age groups, copy the share link, open it in an incognito window, and import the ICS export into a calendar client to confirm correct fixtures.

### Implementation

- [ ] T201 Implement Digest Builder UI (modal or route) in `src/views/Overview/DigestBuilder.jsx` with selectors for followed teams, all age groups, and naming the digest.
- [ ] T202 [P][US2] Connect builder save action to `createDigest` API helper, handle token expiry messaging, and store latest selection in `FollowPreference`.
- [ ] T203 [US2] Create `/digest/:token` route + view rendering read-only cards via `getDigest`, hiding edit controls and showing expiration countdown.
- [ ] T204 [US2] Add share/link copy component (e.g., `src/components/overview/DigestSharePanel.jsx`) with clipboard + QR options.
- [ ] T205 [P][US2] Integrate `ics` package to export next five fixtures from current digest selection; provide UI affordance on Overview and digest pages and ensure downloads work offline using cached data.
- [ ] T206 [US2] Enforce anonymous-by-default responses in the digest Apps Script endpoint (strip player/coach names, photos, contact info before returning JSON).
- [ ] T207 [US2] Update local preference storage so digest selections sync with Overview (pins/follows) for personalization continuity.
- [ ] T208 [US2] Add automated tests covering digest creation, token expiry handling, ICS generation, and anonymization (assert no PII fields in `/digest/:token` payloads).
- [ ] T209 Manual QA: share link accessibility (unauthenticated view), ICS import in Google/Apple Calendar, anonymization spot-checks, and token expiry removal after 14 days.

**Checkpoint**: Digest + sharing flows function independently of Overview feed.

---

## Phase 5: User Story 3 — Data Quality & Offline Confidence (P3)

**Goal**: Flag stale/missing scores, surface staff annotations, and guarantee offline readability with freshness context.
**Independent Test**: Simulate overdue fixtures + manual alerts, toggle offline mode, and confirm Overview displays alerts, cached data with timestamps, and prevents stale exports until refreshed.

### Implementation

- [ ] T301 Enhance Apps Script cron/job logic to mark fixtures as `overdue-score` (schedule time + 60 min with no score) and emit alert records consumed by `getOverview`.
- [ ] T302 [US3] Build alert banner components within Overview showing overdue/delayed/cancelled fixtures, including admin note display.
- [ ] T303 [US3] Add staff UI stub or admin-only script instructions for posting alerts (documented in quickstart + possibly a simple HTML sidebar in Apps Script) and ensure secrets/config are stored safely.
- [ ] T304 [P][US3] Implement offline replay pipeline: cache latest cards + digests in IndexedDB, register service worker message handlers to warm cache, and gate share/export actions when freshness >24h.
- [ ] T305 [US3] Extend in-app notification center (new component under `src/components/Notifications/`) to log data-quality events and per-team score finals (aligns with FR-009 in spec).
- [ ] T306 [US3] Add automated tests for overdue detection logic (server-side unit test or simulated script), plus client tests verifying offline banner and alert rendering.
- [ ] T307 Manual QA: airplane-mode flow (Overview loads cached data with timestamp), alert lifecycle (flag→resolve), and notification opt-in per team.

**Checkpoint**: Data quality safeguards and offline experience meet SC-004/SC-005.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T401 Update documentation (`specs/.../quickstart.md`, README) with final instructions for overview route, digest seeding, and offline testing tips.
- [ ] T402 [P] Add analytics events for digest create/share, ICS exports, alert acknowledgements (likely in `src/lib/analytics.js`).
- [ ] T403 [P] Run accessibility pass on Overview and digest pages (focus order, screen-reader labels, high-contrast badges) and fix issues in relevant JSX files.
- [ ] T404 Performance tuning: audit bundle (code-splitting Overview route, memoizing card lists) to keep initial load under targets.
- [ ] T405 Final regression sweep: run `npm run lint`, `npm run build`, and manual spec-level checklist before handoff.

---

## Dependencies & Execution Order

1. Complete Phase 1 Setup.
2. Finish Phase 2 foundational data/API work before starting any user story.
3. Execute User Stories 1–3; they can proceed in parallel once Phase 2 is done but should land in priority order for MVP readiness.
4. Only start Phase 6 polish after core stories stabilize.

---
