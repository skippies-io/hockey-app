# CI Supply-Chain Policy: GitHub Actions

## Policy
All GitHub Actions referenced in `.github/workflows/` **must be pinned to full commit SHAs**.

Action tags such as `@v1`, `@v4`, or `@latest` are **not allowed**.

This policy is enforced automatically by CI.

---

## Why this exists

GitHub Action tags are mutable. If an upstream action is compromised or changes unexpectedly,
a tag can silently point to new code without any change in this repository.

Pinning to a full commit SHA ensures:
- deterministic builds
- protection against upstream supply-chain attacks
- reproducible CI behaviour
- compliance with SonarCloud security hotspot rules

---

## How this is enforced

1. **Guardrail workflow**
   - PRs fail if any workflow contains `uses: owner/repo@vX`
   - File: `.github/workflows/guardrail-no-action-tags.yml`

2. **SonarCloud quality gate**
   - Flags unpinned actions as security hotspots

3. **Dependabot**
   - Proposes updates to newer SHAs
   - Updates are reviewed and merged like any other change

---

## How to update an action safely

### Preferred (automatic)
- Merge the Dependabot PR that bumps the action SHA
- CI and SonarCloud will validate the update

### Manual (if needed)
Resolve the SHA for a tag:
```bash
git ls-remote https://github.com/OWNER/REPO.git refs/tags/vX
```

Then update the workflow:

```
uses: OWNER/REPO@<full-40-char-sha>
```

---

## Scope

This policy applies to:

- `.github/workflows/*.yml`
- all CI, deploy, release, and Pages workflows

It does not apply to application dependencies (npm, pip, etc.).

---

## Intent

Security > convenience.

This is a deliberate trade-off to keep the CI/CD pipeline predictable,
auditable, and safe.
