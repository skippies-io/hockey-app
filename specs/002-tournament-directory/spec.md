# Feature Specification: Tournament Directory & Detail Pages

**Feature Branch**: `002-tournament-directory`  
**Created**: 2025-11-09  
**Status**: Draft  
**Input**: User description: "Tournament Directory & Detail Pages"

## Purpose

Make the Hockey App the single source of truth for every tournament by introducing a browsable directory plus rich detail pages. Families, coaches, and volunteers should be able to discover an event, understand key logistics (dates, venue, divisions, rules) and jump straight into fixtures/standings without guessing which age group to open.

## Scope & Context

- Surface both current and archived tournaments with lifecycle chips derived from `startDate`/`endDate`: **Live**, **Upcoming**, **Past** (Completed renamed to Past for clarity).
- Detail pages consolidate metadata (dates, venue, hosts), resources (rules PDF, live sheets), participating teams, and the divisions they play in.
- Directory content is managed via the existing Google Sheet backend with new tabs: `Tournaments` (core metadata), `TournamentResources`, and `TournamentDivisions`. Apps Script computes lifecycle status server-side so the UI remains in sync.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Tournament Directory Browsing (Priority: P1)

Parents, supporters, or players land on the Tournament Directory to see all events grouped by lifecycle (Live, Upcoming, Past) with hero cards summarizing the basics (name, host, date range, venue city).

**Why this priority**: It is the entry point for every other page. Without a reliable directory, users cannot discover the correct tournament to follow.

**Independent Test**: Visit `/tournaments`, verify cards render for Live/Upcoming/Past events using seeded data, and ensure that clicking any card routes to its detail page without touching other parts of the app.

**Acceptance Scenarios**:

1. **Given** a user opens `/tournaments`, **When** the Google Sheet returns three tournaments with different lifecycle states, **Then** the page renders three cards grouped under Live, Upcoming, and Past headings with date/venue chips.  
2. **Given** a tournament card is displayed, **When** the user activates “View details,” **Then** they are routed to `/tournaments/:slug` without losing the previously selected filter.

---

### User Story 2 - Tournament Detail Overview (Priority: P2)

Once inside a tournament, visitors need a dashboard with hero metadata, organizer contacts, resources (rules PDFs, entry forms), participating divisions, and quick links into fixtures/standings filtered to that event.

**Why this priority**: Gives context and reduces jumping between multiple age-group pages to confirm if a team is actually part of the tournament.

**Independent Test**: Load `/tournaments/indoor-2025`, confirm hero, resource list, division badges, and navigation shortcuts render from mock data without hitting directory logic.

**Acceptance Scenarios**:

1. **Given** a tournament has a linked Rules PDF and “Volunteer Signup” URL, **When** the detail page loads, **Then** both links display under a Resources list with inline icons and open in new tabs.  
2. **Given** a tournament lists divisions and teams, **When** the user clicks “View Fixtures” for U13 Girls, **Then** they are deep-linked to `/U13G/fixtures?tournament=indoor-2025`.

---

### User Story 3 - Search & Filters (Priority: P3)

Power users can search by tournament name, city, or host club plus filter by lifecycle (Live, Upcoming, Past) to locate the right event quickly.

**Why this priority**: Directory lists will grow; search keeps the page usable on mobile and for archived seasons.

**Independent Test**: Seed 10 tournaments, type “Indoor” into the search box, ensure only cards whose name or host contains “Indoor” remain while the lifecycle filter persists.

**Acceptance Scenarios**:

1. **Given** multiple tournaments exist, **When** the user toggles the “Live” lifecycle filter, **Then** only “Live” tournaments remain and the URL query string captures the filter state for sharing.  
2. **Given** the user cleared all lifecycle filters, **When** they search for “Cape Town”, **Then** tournaments hosted in Cape Town remain regardless of lifecycle group.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- Directory receives zero tournaments → show friendly empty state with CTA linking to feedback email.  
- Tournaments missing venue or date fields → card must still render with “TBD” placeholders and not crash filters.  
- Detail page requested with invalid slug → redirect back to `/tournaments` and surface toast “Tournament not found.”  
- Large tournaments spanning >20 divisions → ensure divisions section collapses into accordion to avoid page bloat.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: Introduce `/tournaments` route showing a lifecycle-grouped directory (Live, Upcoming, Past) sourced from new sheet data (fields: slug, name, startDate, endDate, venue, city, hostClub, heroImage, derivedStatus).  
- **FR-002**: Directory MUST support text search (name, host, city) and lifecycle filter chips (Live, Upcoming, Past) while updating the URL query string.  
- **FR-003**: Clicking any tournament card MUST navigate to `/tournaments/:slug` and load detail content without re-fetching the entire directory.  
- **FR-004**: Detail page MUST display hero metadata (dates, venue, host), organizer contacts, summary description, and CTA buttons for “View Fixtures,” “View Standings,” and “Awards” scoped to that tournament.  
- **FR-005**: Resources list MUST render links stored in the Google Sheets (`Tournaments` for base metadata and `TournamentResources` for per-event assets) and open each entry in a new tab with safe rel attributes.  
- **FR-006**: Participating divisions section MUST hydrate from the `TournamentDivisions` sheet (and supporting `Tournaments` metadata) and list each division/team entry with quick links to corresponding fixture/standing routes filtered via query params.  
- **FR-007**: Directory cards MUST gracefully handle missing optional data by displaying “TBD” labels but still offering navigation.  
- **FR-008**: Detail page MUST expose a “Contact Organizer” mailto link using the host club email from the sheet.  
- **FR-009**: API layer MUST provide a consolidated tournaments payload with caching similar to Overview (sessionStorage + IndexedDB) and include derived lifecycle status so cards can group themselves without extra computation.  
- **FR-010**: When an invalid slug is visited, the app MUST redirect to `/tournaments` and show a non-blocking toast or inline notice.  
- **FR-011**: All new routes/components MUST inherit existing responsive design tokens (16px radii, card spacing) for visual consistency.
- **FR-012**: Only Live tournaments auto-refresh fixtures/standings/awards tabs every N seconds; Upcoming/Past tournaments display static snapshots without polling.

### Key Entities *(include if feature involves data)*

- **Tournament**: { slug, name, startDate, endDate, derivedStatus, status (manual override), venueName, city, hostClub, heroImageUrl, description, contactEmail, contactPhone, season }.  
- **TournamentDivision**: { tournamentSlug, divisionId, divisionLabel, teamCount }. Links a tournament to the age/division pages.  
- **TournamentResource**: { tournamentSlug, type (rules, form, doc), label, url }.  
- **TournamentContact**: { tournamentSlug, name, email, phone }. Optional but displayed when provided.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Users can locate a tournament card and open its detail page in under 3 clicks on both desktop and mobile during usability tests.  
- **SC-002**: Directory search returns relevant tournaments (name/host match) within 300 ms after debounce in 95% of tries using seeded datasets of 25+ entries.  
- **SC-003**: At least 80% of beta testers report “Very easy” when asked about finding tournament rules or contacts via the new detail page survey.  
- **SC-004**: No more than 1% of detail page loads result in “Tournament not found” errors once correct slugs are deployed (monitored via analytics).  
- **SC-005**: Directory and detail routes maintain Core Web Vitals LCP < 2.5 s on LTE connections with cached assets.
