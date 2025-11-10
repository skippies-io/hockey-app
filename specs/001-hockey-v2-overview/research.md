# Phase 0 Research — Hockey App v2 Overview

## Decision 1: Overview feed assembly
- **Decision**: Keep Google Apps Script as the single public API but add a new `overview` query that hydrates fixtures, standings, announcements, awards, and follow metadata server-side before shipping a consolidated payload.
- **Rationale**: Avoids multiple round-trips from the PWA, ensures consistent caching headers, and keeps business rules (score overdue detection, award auto-calculation) close to the data source already managed by tournament staff.
- **Alternatives considered**:
  1. *Pure client aggregation*: Fetch every sheet separately and compose in React. Rejected because it amplifies latency, increases offline bundle size, and makes stale data checks harder.
  2. *Net-new Node service*: Would give richer control but exceeds scope; maintaining a second backend outside Apps Script adds deployment overhead for volunteers.

## Decision 2: Offline + freshness model
- **Decision**: Layer IndexedDB (via `idb-keyval`) on top of the existing sessionStorage caching so the Overview payload, digest configs, and announcements persist across browser restarts and offline windows beyond 24h. Freshness is tracked with `<5 min` SLA and surfaced via the UI indicator.
- **Rationale**: Current sessionStorage cache is tab-scoped; IndexedDB enables the “open with no connectivity” story in User Story 3 and provides enough quota for multi-age snapshots.
- **Alternatives considered**:
  1. *Service Worker cache-only*: Simple but difficult to invalidate partial records; IndexedDB lets us expire by age group and keep metadata for the freshness indicator.
  2. *LocalStorage*: Easier API but synchronous and limited to ~5 MB; binary ICS blobs or multiple seasons would hit limits quickly.

## Decision 3: Digest sharing + ICS export
- **Decision**: Store digest definitions in a dedicated Google Sheet tab keyed by share token. ICS exports are generated client-side using the `ics` npm package and rely on the same consolidated Overview payload to populate events.
- **Rationale**: Re-using Apps Script storage avoids another persistence layer, gives tournament staff direct visibility, and allows easy expiration (script purges rows older than 14 days). Client-side ICS avoids pushing calendar files through the backend and keeps privacy-sensitive user selections local.
- **Alternatives considered**:
  1. *Server-side ICS generation*: More control but requires file hosting and adds binary response handling to Apps Script.
  2. *No persisted digests*: Would force users to rebuild configuration every visit and block the sharing requirement.

## Open Items
- Privacy policy for minors on shared digests is still **DEFERRED** per spec; planning assumes tokens expose team-level data only until governance guidance arrives.
- Staff workflow for marking fixtures delayed/cancelled will be prototyped inside Apps Script admin UI; UX details to be refined during implementation.
