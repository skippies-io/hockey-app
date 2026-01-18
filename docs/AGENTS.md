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
