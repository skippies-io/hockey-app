## Change type

- [ ] Feature
- [ ] Fix
- [ ] Docs/Chore
- [ ] Refactor

## Checklist (definition of done)

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Screenshots attached (UI changes)
- [ ] Notes added for release / stakeholders (if relevant)

## Release / Production changes

- [ ] I ran `docs/release-hygiene-checklist.md` (required if prod/release/cutover)
- [ ] This PR changes production env/provider behaviour (yes/no)
- [ ] Rollback plan included (env toggle + restart)

## Risk

- Risk level: Low / Medium / High
- Rollback plan:
  - [ ] Revert commit
  - [ ] Forward fix

## Validation

Describe what you tested and how:

- Steps:
- Expected:
- Actual:

## Snapshot expectations (main merges)

When this is merged to `main`, the Snapshot workflow will publish a build artifact.

- [ ] I’m okay with this being captured in the snapshot artifact.
