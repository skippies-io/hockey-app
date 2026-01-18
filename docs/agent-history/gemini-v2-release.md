# Gemini / Antigravity Session — V2.0 Release & Recovery

**Date:** 18 January 2026  
**Purpose:** Capture authoritative context from the Gemini / Antigravity session that led to the V2.0 release, deployment automation, janitor cleanup, and UI regression recovery.

This document is a _historical artefact_, not a runbook.
It exists to prevent loss of context when switching tools, agents, or models.

---

## 1. High-level outcome

By the end of this session, the project achieved:

- ✅ Release of **v2.0.0** (multi-tournament architecture, dashboard, admin views)
- ✅ Codified CI/CD pipeline (CI + Deploy workflows)
- ✅ Manual but intentional release tagging (`v2.0.0`)
- ✅ Introduction of a **Janitor / Maintenance Agent**
- ✅ First successful reduction of SonarCloud technical debt
- ✅ Recovery from multiple UI + proxy regressions caused by branch drift

---

## 2. Release phase (V2.0)

### What shipped

- Multi-tournament support
- Overview dashboard
- Franchises directory
- Admin views
- Tournament switcher (frontend context + component)
- Database expansion migration

### Deployment model (important)

- CI + Deploy are automated
- **Tagging is manual by design**
- Rationale: avoid accidental production version bumps

Key insight:

> Deployment automation ≠ release/versioning automation.

---

## 3. Janitor / Maintenance Agent (validated pattern)

A dedicated Maintenance Agent was spun up _after_ release.

### What it did successfully

- Removed `console.log` across the codebase
- Enforced ESLint rules to prevent regression
- Later enforced `propTypes` validation across ~22 components
- Reduced SonarCloud issues substantially
- Passed CI without manual intervention

### Why it worked

- One issue class at a time
- Tooling enforcement (ESLint / Sonar)
- No feature or UI changes mixed in

### Rule derived

> Janitor agents must be **monothematic**.  
> Mixing cleanup with features causes instability.

---

## 4. Regression phase (what went wrong)

After release + cleanup, several regressions appeared:

1. Tournament switcher disappeared
2. Large whitespace (“blue gap”) under the header
3. Local `/api/tournaments` returned 500 errors

### Root causes (confirmed)

- Merge conflict overwrote `AppLayout.jsx`
- Local `/api` proxy was accidentally removed during legacy cleanup
- Empty placeholder DOM nodes were still rendered even when “hidden”

These were **not CSS bugs** — they were **DOM existence bugs**.

---

## 5. Recovery actions (what actually fixed it)

### UI

- Restore structured header layout
- Re-add `TournamentSwitcher` explicitly
- Conditionally render filter slot **only when content exists**

Rule established:

> If something should not be visible, **do not render it at all**.

### Plumbing

- Restore `/api` proxy in `vite.config.js`
- Ensure frontend talks to local backend again

Commit pattern:

fix: restore header styling and local api proxy

---

## 6. Test harness introduction (critical but subtle)

During recovery, a **Vitest smoke test** was introduced:

- `src/App.test.jsx`
- Purpose: ensure the app renders and routes do not crash
- This test correctly failed when legacy features were removed
- Tests were updated to reflect reality (not nostalgia)

Current state:

- Tests pass
- React emits `act(...)` warnings (known, non-fatal)

Key insight:

> Tests are **contracts**, not confidence boosters.

---

## 7. Agent interaction lessons (important)

### What caused confusion

- Agents continued working after PRs were merged
- Branch drift created “orphan commits”
- Context was assumed instead of stated

### What fixed it

- Explicit prompts
- Clear branch instructions
- Separating Release / Janitor / Engineering responsibilities

Derived rule:

> Agents must never rely on implicit memory.  
> Context must be versioned and written down.

---

## 8. Durable principles carried forward

1. **Separate agent roles**
   - Release Agent
   - Engineering Agent
   - Janitor Agent

2. **One golden verification command**
   - `npm run verify`

3. **DOM over CSS**
   - Remove elements instead of hiding them

4. **Tests as safety rails**
   - Tests should block invalid deletions
   - Warnings are technical debt, not failures

5. **Manual tagging is intentional**
   - Safety > convenience for production

---

## 9. Status at end of session

- Codebase stable
- CI green
- Deploy automated
- Janitor pattern validated
- Remaining work: tighten FE tests, remove `act(...)` warnings, continue SonarCloud cleanup

This document represents the authoritative summary of the Gemini / Antigravity V2.0 session.
