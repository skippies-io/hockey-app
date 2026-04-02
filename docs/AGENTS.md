# Agent Brief — hockey-app

This file is the **first document any agent should read** before making changes.
It defines how work happens in this repo and how correctness is verified.

---

## 1. Repo purpose (high level)

hockey-app is a production PWA for viewing tournaments, fixtures, standings,
and related content. It has an active CI/CD pipeline and protected main branch.

Stability and reversibility matter more than speed.

---

## 2. Golden rule: verify before proposing changes

All agents must run the following locally before suggesting a PR-ready change:

```bash
npm run verify
```

### Coverage gate (Sonar / Quality Gate)

This repo is subject to quality gates. **New code coverage is often the blocker**.

Before opening a PR (or when Sonar fails), run:

```bash
npm run test:coverage
```

**Rule:** if a PR introduces new/changed files, add tests so the PR meets the **new code coverage threshold (typically ≥80%)**.

This prevents “green locally, blocked in Sonar” failures.
