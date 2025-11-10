# Data Model — Tournament Directory & Detail Pages

## Tournaments
| Field | Type | Description |
|-------|------|-------------|
| `slug` | string | Unique identifier used in URLs (`/tournaments/:slug`). Lowercase, hyphenated. |
| `name` | string | Public tournament name. |
| `startDate`, `endDate` | ISO strings | Primary source for lifecycle checks; used for grouping and date badges. |
| `derivedStatus` | enum(`live`,`upcoming`,`past`) | Computed from dates; overrides manual status fields. |
| `status` | enum(`upcoming`,`live`,`completed`) | Legacy/manual status; still stored for admin override but UI relies on `derivedStatus`. |
| `venueName` | string | Facility name (e.g., "Bellville Velodrome"). |
| `city` | string | Displayed alongside venue. |
| `hostClub` | string | Organizer, shown on cards + detail hero. |
| `heroImageUrl` | string (optional) | Background image on detail hero. |
| `description` | string (markdown-lite) | Detail overview text. |
| `contactEmail`, `contactPhone` | string (optional) | Used for Contact Organizer CTA. |
| `season` | string | Allows filtering/archive by season/year. |

## TournamentResources
| Field | Type | Description |
|-------|------|-------------|
| `tournamentSlug` | string | Foreign key to `Tournaments.slug`. |
| `type` | enum(`rules`,`form`,`doc`,`link`) | Determines icon. |
| `label` | string | Link text shown to user. |
| `url` | string | Destination; must include protocol. |
|
## TournamentDivisions
| Field | Type | Description |
|-------|------|-------------|
| `tournamentSlug` | string | Foreign key. |
| `divisionId` | string | Age-group ID already used elsewhere (`U13G`, `U11B`). |
| `divisionLabel` | string | Friendly label ("U13 Girls Tier A"). |
| `teamCount` | number | Optional count for display. |
| `primaryTeamNames` | string[] | Optional top teams to highlight. |

## Derived structures (frontend)
- **DirectoryCard**: { slug, name, derivedStatus, dateLabel, venueLabel, host, heroImageUrl }
- **TournamentDetail**: { hero, resources[], divisions[], contacts[], ctas[] }

### Relationships
- `Tournament` 1—* `TournamentResource`
- `Tournament` 1—* `TournamentDivision`
- `TournamentDivision.divisionId` maps to existing fixtures/standings routes.
