# Feature Specification: Hockey App v2 Overview

**Feature Branch**: `001-hockey-v2-overview`  
**Created**: 2025-11-09  
**Status**: Draft  
**Input**: User description: "Hockey App v2 Overview"

---

## Purpose

A **Progressive Web App (PWA)** designed for the Hockey4Juniors association to manage tournaments effectively.  
Primary users include parents, players, coaches, and supporters, who rely on the app to obtain tournament information such as fixtures, match results, standings, and awards.

The app provides quick, reliable access to up-to-date data, including offline support and personalization through follows and digests.

---

## Details

### Home Screen
- Acts as the landing page for all users.  
- Displays a **welcome message** followed by an **Announcements** section.  
- Announcements are managed via the **Google Sheet feed**, allowing the association to publish important updates such as fixture changes or venue notices.  
- Below announcements, users see tournaments grouped as **Past**, **Current**, and **Upcoming**.

### Franchise Page
- Lists all franchises (clubs) with:
  - Short description  
  - Logo  
  - Contact details and location  
  - Franchise manager information  
  - **“Get in touch”** button that opens the user’s default mail app prefilled with the franchise email address.  
- A future feature will enable **lead tracking** to record inquiries initiated through this contact action.

### Tournament Page
- Displays tournament rules (via linked PDF).  
- Shows participating teams, fixtures, results, and awards.  
- Clicking a team opens its **Team Page**, which shows:
  - Team logo, name, and optional strapline  
  - Manager details  
  - Divisions the team participates in  
- Clicking a division lists:
  - Coach and player roster for that division

### Awards
- Awards are handed out per division and **auto-calculated** from Google Sheet data.  
- Categories include:
  - **Top Scorer** (most goals scored)
  - **Top Goalkeeper** (most clean sheets)

---

## User Scenarios & Testing

### User Story 1 — Cross-Age Overview Dashboard (P1)
Parents and players land on a new Overview screen that immediately surfaces followed teams, today's fixtures, and live standings snapshots across all age groups without drilling into each division.

**Independent Test:**  
Load the Overview screen with test data that includes followed and unfollowed teams; verify that fixtures, standings chips, and quick links render without visiting any other route.

**Acceptance Scenarios**
1. **Given** a signed-out parent with at least one followed team, **When** they open the app, **Then** the Overview shows next matches, live scores (if available), and placement badges for each followed team across age groups.  
2. **Given** a user reviewing overall tournament health, **When** they scroll the Overview feed, **Then** they can tap a card (fixtures, standings, or news) and are deep-linked into the appropriate detailed view without manual navigation.

---

### User Story 2 — Personalized Digest & Sharing (P2)
A fan curates a daily digest (followed teams + key age groups), optionally shares a public link with other guardians, and exports the schedule as calendar events.

**Independent Test:**  
Configure a digest with seed data, trigger digest generation, and verify that export/share artifacts match the chosen scope without depending on Overview Story 1.

**Acceptance Scenarios**
1. **Given** a user who toggles specific teams and age groups in the digest builder, **When** they save changes, **Then** the digest preview and generated share link reflect only the selected entities.  
2. **Given** a shared digest URL, **When** an unauthenticated viewer opens it, **Then** they see a read-only snapshot (fixtures, standings) that refreshes automatically without exposing edit controls.

---

### User Story 3 — Data Quality & Offline Confidence (P3)
Tournament volunteers need to monitor stale/missing scores, annotate delays, and ensure families can still read the latest synced data even if venue Wi-Fi drops.

**Independent Test:**  
Simulate missing scores and offline mode; verify that alerts appear and cached data is rendered with explicit freshness timestamps.

**Acceptance Scenarios**
1. **Given** a fixture without a final score 60 minutes after scheduled end, **When** staff open the Overview admin banner, **Then** the system flags the overdue match and provides a shortcut to add context.  
2. **Given** a user who previously loaded the Overview, **When** they reopen the app with no connectivity, **Then** the last synced data is presented with a “Last updated” timestamp and offline badge.

---

### Edge Cases
- Google Sheet / Apps Script feed returns partial data for one age group → Overview should degrade gracefully and mark the affected group as temporarily unavailable.  
- Two teams share identical names across age groups → follow/favorite chips must remain disambiguated (include age ID).  
- Users open shared digest links outside the tournament timeframe → display a friendly “Season finished” state with archive navigation.  
- Offline device reopens after >24h without sync → force a refresh attempt before allowing sharing/export to prevent outdated exports.

---

## Requirements

### Functional Requirements
- **FR-001**: Introduce `/overview` route as default landing, aggregating fixtures, standings, announcements, and follows across age groups.  
- **FR-002**: Overview cards respect “followed teams” and show next two fixtures + latest standings per followed team.  
- **FR-003**: Allow pinning of entire age groups or pools to Overview.  
- **FR-004**: Display a global **data freshness indicator** showing the timestamp of the most recent successful sync from Google Apps Script feed.  
- **FR-005**: Users can create and share read-only digest links containing selected teams/age groups, with tokens expiring after 14 days.  
- **FR-006**: Overview provides “Add to Calendar” export (ICS format, next five fixtures).  
- **FR-007**: Staff can flag fixtures as delayed/cancelled, which decorates corresponding Overview cards and digest exports.  
- **FR-008**: Client caches latest Overview payload for offline viewing with clear “cached” labels.  
- **FR-009**: Notifications delivered **in-app via Notification Center**, with opt-in per followed team.  
- **FR-010**: Shared digest pages require no authentication but respect **[DEFERRED: privacy rules for minors’ information]** before exposing player-sensitive data.  
- **FR-011**: System reconciles fixtures/standings from multiple seasons; Overview defaults to active season with manual season switching.  
- **FR-012**: Home screen includes **Announcements** feed sourced from Google Sheet updates.  
- **FR-013**: Franchise directory lists all franchises with contact button that opens the user’s default mail app; leads to be tracked in future.  
- **FR-014**: Tournament page links to **rules PDF**, displays participating teams, fixtures, results, and awards.  
- **FR-015**: Awards auto-calculated for Top Scorer and Top Goalkeeper from match data in Google Sheet.

---

## Key Entities

- **Association**: Hockey4Juniors  
- **Tournament**: HJ Outdoor Intercity Championship, Indoor Tournament, All-Star Championship  
- **Season**: CCYY format (e.g., 2025)  
- **Franchise**: Avengers, Blue Crane Rebels, Dragons, Gladiators, Jaguars, Knights, Northern Guardians  
- **FranchiseManager**: { name, contactInfo }  
- **Coach**: { name, division }  
- **Player**: { name, division, teamId }  
- **Division**: { name, category, teams[] }  
- **OverviewCard**: { type, entityId, headline, subtext, statusBadge, lastUpdated }  
- **FollowPreference**: { userId, teams[], ageGroups[], season, lastModified }  
- **DigestShareToken**: { token, expiresAt, selectedTeams[], selectedAgeGroups[], createdBy, readOnly }  
- **DataFreshnessSnapshot**: { sourceName, fetchedAt, recordsLoaded, status, issues[] }  
- **FixtureAlert**: { fixtureId, alertType, message, flaggedBy, resolvedAt }

---

## Success Criteria

- **SC-001**: 80% of returning users reach key info (fixture time or standings) within 10s of app launch via Overview.  
- **SC-002**: Shared digest links maintain 99% uptime and reflect live data within 2m of source updates.  
- **SC-003**: ≥70% of active users create or use a digest/follow config.  
- **SC-004**: Data freshness indicator ≤5m behind Google Sheet feed for 95% of syncs.  
- **SC-005**: Offline Overview renders within 3s using cached data.  
- **SC-006**: ≥90% of announcements published via Sheet visible on the Home screen within 60s of save.  

---

## Assumptions

- Google Apps Script JSON feed remains the single source of truth for fixtures, standings, announcements, and awards.  
- No direct write-back required in v2; admin edits occur through Sheet.  
- Notification delivery is **in-app only** for v2; push/email deferred.  
- Privacy rules for minors deferred until governance guidance.  
- Future enhancements may include lead tracking from franchise contact actions and richer analytics dashboards.

---
