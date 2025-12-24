# FixtureCard Evolution (Design Spec)

## Current state
- Fixtures page: fixtures are grouped by date and rendered as FixtureCard rows; the group header is the primary date display and cards do not repeat the date.
- Team Profile page: FixtureCard can show the date per card; time and venue are displayed on one line; teams and scores stay unchanged.

## Proposed UX
- Sections: Live, Recent, Upcoming (order: Live, Recent, Upcoming).
- Live: show a pulse indicator on the status pill; section appears only if live fixtures exist.
- Recent: last completed fixtures, newest first.
- Upcoming: future fixtures, soonest first.
- Result pill: W/D/L pill shown on Team Profile cards (team perspective only).
- Tap-to-expand: tapping a card reveals a compact detail view (venue, round, pool, and any available notes).

## Data assumptions
Minimum fixture fields:
- `id` or a stable composite key
- `date` (ISO string or normalized date label)
- `time` (optional; may be empty)
- `homeTeam`, `awayTeam`
- `homeScore`, `awayScore` (optional until played)
- `status` flags: `live`, `final`, `upcoming` (or equivalent)

Fallback strategy:
- Missing `date`: classify as UNKNOWN and render without section ordering.
- Missing `time`: show `TBD`.
- Missing `score`: show `TBD` for both scores and skip W/D/L pill.
- Missing `status`: infer from presence of valid scores (played) else treat as UPCOMING.

## State algorithm (pseudocode)
```
for each fixture:
  if status == "live":
    state = LIVE
  else if hasValidScore(homeScore) or hasValidScore(awayScore):
    state = RECENT
  else if date exists:
    state = UPCOMING
  else:
    state = UNKNOWN
```

## Result pill algorithm (pseudocode)
```
if not in Team Profile:
  no result pill

if scores missing:
  no result pill

ourScore = homeScore if team is home else awayScore
oppScore = awayScore if team is home else homeScore

if ourScore > oppScore: pill = "W"
if ourScore == oppScore: pill = "D"
if ourScore < oppScore: pill = "L"
```

## Interaction spec
- Tap targets: cards and star/follow buttons must have >= 40px tap targets.
- Expand/collapse: tap card to expand; tap again (or close affordance) to collapse.
- Accessibility: preserve focus order, use `aria-expanded` on the card container, and ensure the expanded details are reachable by keyboard.
- Live pulse indicator: purely visual; status text remains readable and announced by screen readers.

## Non-goals
- No animation library.
- No real-time updates.
- No new endpoints.
