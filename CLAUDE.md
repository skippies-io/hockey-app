# hockey-app — Agent Playbook (entrypoint)

This repo is actively maintained and has CI quality gates.

## Read first (source of truth)
- **Primary brief:** `docs/AGENTS.md`
- **Contribution guide:** `CONTRIBUTING.md`

## Non‑negotiables (high impact)
1) **Verify before proposing changes**
```bash
npm run verify
```

2) **Coverage before opening PRs (Sonar new code coverage gate)**
```bash
npm run test:coverage
```
Make sure new/changed code is covered. If Sonar requires **new_coverage ≥ 80%**, add tests before opening the PR.

## Common commands
- Dev: `npm run dev:full`
- Lint: `npm run lint`
- Tests: `npm test` / `npm run test:watch`
- Coverage: `npm run test:coverage`
- Build: `npm run build`

## Notes
- Keep changes small and reversible.
- Prefer adding tests with code changes.
