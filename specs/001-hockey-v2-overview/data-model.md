# Data Model — Hockey App v2 Overview

## Entities

### OverviewCard
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Stable hash of `type+entityId+timestamp` for reconciliation. |
| `type` | enum(`fixture`,`standing`,`announcement`,`award`,`alert`) | Determines renderer and required fields. |
| `entityId` | string | References team, fixture, pool, or announcement row id. |
| `headline` | string | Primary text (team name, match-up, award title). |
| `subtext` | string | Secondary info such as kickoff time, pool rank, or announcement body. |
| `statusBadge` | enum(`live`,`final`,`delayed`,`offline`,`info`) | Communicates live status and alerting. |
| `ageId` | string | U-code to disambiguate duplicates (edge case 2). |
| `lastUpdated` | ISO timestamp | Mirrors DataFreshnessSnapshot for fast UI diffing. |
| `metrics` | object | Optional numbers (points, goals, streak). |
| `links` | object | Deep-link targets to detailed routes. |

### FollowPreference
| Field | Type | Notes |
|-------|------|-------|
| `userKey` | string | Anonymous ID stored in localStorage. |
| `teams` | string[] | `ageId:teamName` composite keys. |
| `ageGroups` | string[] | Age IDs pinned for non-team coverage. |
| `season` | string | Defaults to active season, allows archives. |
| `digestConfigId` | string | Optional pointer to last-used digest template. |
| `updatedAt` | ISO timestamp | For syncing to Apps Script if opt-in sync is added later. |

### DigestShareToken
| Field | Type | Notes |
|-------|------|-------|
| `token` | string | Random 16-char slug shown in share URL. |
| `ownerUserKey` | string | Reference to creator key; used for revocation. |
| `expiresAt` | ISO timestamp | Script job purges expired rows nightly. |
| `selectedTeams` | string[] | Same composite key as FollowPreference. |
| `selectedAgeGroups` | string[] | Age IDs. |
| `createdAt` | ISO timestamp | Displayed in digest footer. |
| `title` | string | User-provided label ("Saturday Digest"). |

### DataFreshnessSnapshot
| Field | Type | Notes |
|-------|------|-------|
| `source` | enum(`fixtures`,`standings`,`announcements`,`awards`) | Data origin. |
| `fetchedAt` | ISO timestamp | When Apps Script pulled latest rows. |
| `recordsLoaded` | number | Count of rows ingested for quick sanity checks. |
| `status` | enum(`ok`,`stale`,`error`) | Drives freshness indicator color. |
| `issues` | string[] | Human-readable warnings (e.g., "U13B missing scores"). |

### FixtureAlert
| Field | Type | Notes |
|-------|------|-------|
| `fixtureId` | string | Sheet row id or composed `age-date-time` key. |
| `alertType` | enum(`overdue-score`,`delay`,`cancellation`) | Matches UI badges. |
| `message` | string | Optional manual note from staff. |
| `flaggedBy` | string | Staff initials. |
| `flaggedAt` | ISO timestamp | Audit trail. |
| `resolvedAt` | ISO timestamp | Null until cleared. |

### Announcement
| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Row id from sheet. |
| `title` | string | Short headline. |
| `body` | string | Markdown/HTML-lite string. |
| `severity` | enum(`info`,`warning`,`critical`) | Styling on Home + Overview. |
| `visibleUntil` | ISO timestamp | Hide automatically after event date. |

## Relationships & Rules
- `OverviewCard.entityId` joins to `Fixture`, `Standing`, `Announcement`, or `FixtureAlert` sources; UI uses `type` to resolve.
- `FollowPreference` is purely client-side but seeds digest builder defaults; when a digest is saved, selections are copied into `DigestShareToken`.
- `DataFreshnessSnapshot` records exist per source and per season; Overview shows the worst status in the UI banner and stores the full array for diagnostics.
- `FixtureAlert` entries reference fixtures derived from the same Apps Script sheet; alerts should be injected into the Overview feed as `OverviewCard` items with `type="alert"`.
- `Announcement.visibleUntil` ties to season context so archived seasons can still replay historic notices when browsing past tournaments.
