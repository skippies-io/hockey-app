# V2 Scope Expansion Requirements

**Status**: Draft
**Context**: Pivot from "Google Sheets as Truth" to "Postgres as Truth".
**Goals**: Multi-Tournament viewing, Admin Console (Internal), and Tech Desk (Live Scoring).

## 1. Core Architecture Shift
- **New Source of Truth**: Postgres Database.
- **Legacy Role**: Google Sheets contracts/ingestion logic may remain for historical import but are no longer the active master for V2 operations.
- **Implication**: The "v2" Admin Console will write directly to the DB.

## 2. Feature Requirements

### 2.1 Multi-Tournament Capability (User Facing)
- **Goal**: Users can browse past tournaments if the current one isn't relevant.
- **Logic**:
    - Default: Show "Active" tournament.
    - Fallback: Allow selection from closed tournaments.
- **Data**: `tournament` table already supports multiple entries via `id`.

### 2.2 The Admin Console (Internal Tool)
- **Goal**: Secure management area (`/admin`).
- **Scope**: CRUD operations for:
    - Tournaments
    - Teams
    - Fixtures
    - Announcements (NEW)
- **Methodology**: UI should mirror the DB schema ("Reverse Engineered" UI).

### 2.3 The Tech Desk (Ops View)
- **Goal**: Specialized view (`/tech-desk/:matchId`) for match officials.
- **Workflows**:
    - **Scorer**: Enters live scores, logs goal scorers.
    - **Coach**: Performs "Digital Sign-off" (Checkbox/PIN) to lock the result.
- **Constraint**: Execution-only interface. Simplified, high-contrast.

## 3. Schema Requirements

### 3.1 New Entity: Announcements
- **Table**: `announcements`
- **Fields**:
    - `id` (PK, UUID/Text)
    - `tournament_id` (FK -> tournament)
    - `title` (Text)
    - `body` (Text)
    - `severity` (Enum/Text: 'info', 'warning', 'alert')
    - `expires_at` (Timestamp)
    - `created_at` (Timestamp)

### 3.2 Tech Desk Enhancements
- **Target Table**: `result` (or extension thereof)
- **New Fields**:
    - `goal_scorers`: JSONB (List of `{ teamId, playerId, time? }`)
    - `is_signed_off`: Boolean (Default false)
    - `coach_signature`: JSONB/Text (Metadata about the sign-off, e.g., `{ name, time, pin_hash? }`)
    - `match_events`: JSONB (Optional, for future extensibility of cards/events)

## 4. Migration Plan
- Create `db/migrations/003_v2_expansion.sql`.
- Create `announcements` table.
- Alter `result` table to add Tech Desk fields.
- Ensure strict RLS policies (or maintenance of existing policies) if needed.
