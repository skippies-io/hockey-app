## Change type

- [x] Feature
- [ ] Fix
- [ ] Docs/Chore
- [ ] Refactor

## Checklist (definition of done)

- [x] `npm ci`
- [x] `npm run lint`
- [x] `npm run build`
- [ ] Screenshots attached (UI changes)
- [x] Notes added for release / stakeholders (if relevant)

## Release / Production changes

- [x] I ran `docs/release-hygiene-checklist.md` (required if prod/release/cutover)
- [x] This PR changes production env/provider behaviour (Yes)
- [x] Rollback plan included (Revert commit or forward fix)

## Risk

- Risk level: Low
- Rollback plan:
  - [x] Revert commit
  - [ ] Forward fix

## Validation

Describe what you tested and how:

- Steps: Ran full verification suite including end-to-end integration script `scripts/verify-announcements.mjs` and 40/40 Vitest unit tests.
- Expected: All unit tests pass, migration applies, and announcement filtering works as expected (General vs Tournament vs Draft).
- Actual: SUCCESS! All checks passed.

## Snapshot expectations (main merges)

When this is merged to `main`, the Snapshot workflow will publish a build artefact.

- [x] I’m okay with this being captured in the snapshot artefact.
