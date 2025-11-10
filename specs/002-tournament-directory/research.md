# Phase 0 Research — Tournament Directory & Detail Pages

## Decision 1: Sheet schema + Apps Script payloads
- **Decision**: Add `Tournaments`, `TournamentResources`, and `TournamentDivisions` tabs in the existing Google Sheet. Apps Script exposes two endpoints:
  - `?tournaments=1` → list for directory (lightweight, no heavy joins)
  - `?tournament=<slug>` → hydrated detail (hero metadata, resources, divisions, contacts)
- **Rationale**: Keeps tournament admins in familiar tooling, leverages existing Apps Script deployment, and minimizes frontend fan-out (two hits max).
- **Alternatives considered**:
  1. *Direct client access to sheets via query params* — rejected because each card would require multiple fetches and complicate offline caching.
  2. *Net-new REST microservice* — overkill for static-ish tournament data; Apps Script already powers the rest of the app.

## Decision 2: Caching & search strategy
- **Decision**: Reuse sessionStorage + IndexedDB (idb-keyval) snapshot model from Overview. Directory list loads from cache first, then hydrates and persists to IndexedDB for offline use. Search/filter implemented client-side with simple string includes + status chips.
- **Rationale**: Directory payload is small (<50 tournaments). Client filtering avoids extra backend complexity and keeps response time <300 ms per SC-002.
- **Alternatives considered**:
  1. *Fuse.js fuzzy search* — nice-to-have but adds bundle weight; simple `.toLowerCase().includes()` meets requirements.
  2. *Server-side query parameters* — would require Sheet filtering logic and multiple deployments for minor tweaks.

## Decision 3: Detail page deep links
- **Decision**: Provide CTA buttons on detail page that link to existing fixtures/standings routes with query string `?tournament=<slug>`. The receiving pages will treat the parameter as a filter hint but degrade gracefully if unsupported.
- **Rationale**: No need for brand-new fixtures UI; leverage existing infrastructure and gradually add tournament context.
- **Alternatives considered**:
  1. *Duplicate fixtures/standings UI within the detail page* — redundant code and higher maintenance cost.
  2. *Server-driven deep links per team* — unnecessary until we have per-team tournament stats.

## Outstanding Questions
- Confirm whether hero images will be hosted on GitHub Pages, Google Drive, or optional; plan assumes optional image field with placeholder fallback.
- Decide whether organizers can be contacted via phone (sheet has phone column) or email only; UI will show whichever fields exist but copy needs final approval.
