# Deployment Protocol

## Purpose and scope

This protocol covers **Hockey App UI deployments to GitHub Pages**, with a protected `main` branch and required CI checks. It does not replace API runbooks in `docs/`.

## Preconditions (guardrails)

- `main` is clean and synced to `origin/main`.
- Work happens on a feature/chore branch, never directly on `main`.
- CI must pass (lint, test, build, and SonarCloud).
- No secrets or production credentials in commits.

## Branch naming rule

Use intent-driven prefixes:

- `feat/` `fix/` `chore/` `refactor/` `docs/` `spike/`

Examples:

- `chore/deploy-tests`
- `docs/deployment-protocol`

## Workflow

1. Start clean on `main`.
   - If `main` is **dirty**, move the work to a branch:

   ```bash
   git status -sb
   git switch -c chore/<short-topic>
   ```

   - Otherwise sync `main`:

   ```bash
   git fetch origin
   git switch main
   git pull --ff-only
   ```

2. Create or switch to a branch for the change.

   ```bash
   git switch -c feat/<short-topic>
   # or
   git switch <existing-branch>
   ```

3. Run local checks (match CI).

   ```bash
   npm ci --ignore-scripts
   npm rebuild esbuild
   npm run lint
   npm test
   npm run build
   ```

4. Commit with clear scope.

   ```bash
   git add -A
   git commit -m "<type>: <summary>"
   ```

5. Push and open a PR.

   ```bash
   git push -u origin <branch>
   gh pr create --fill
   ```

6. Wait for checks and review results.

   ```bash
   gh pr checks --watch
   ```

   Ensure CI and SonarCloud are green before merging.

7. Merge via the repo’s allowed method.

   - Use the merge option enabled by repository settings.
   - Do not bypass required checks or force-push to `main`.

8. Sync local `main` to the deployed commit.

   ```bash
   git fetch origin
   git switch main
   git reset --hard origin/main
   ```

9. Post-deploy verification (GitHub Pages).

   - Open the site and confirm core flows work (landing page, schedule/standings load, client-side routing on refresh).
   - Validate the latest bundle is served (cache-safe):

   ```bash
   curl -I --compressed "https://<your-pages-site>/"
   curl -I --compressed "https://<your-pages-site>/assets/<current-hash>.js"
   ```

## Success checks

- PR checks are green (CI + SonarCloud).
- Pages site serves the new build and expected UI behavior.
- `main` is synced locally to `origin/main`.

## If something goes wrong

- **Stale bundle symptoms:** UI does not reflect changes, but `main` is updated.
- First checks:
  - Hard refresh (Shift+Reload) and test in a private window.
  - Compare the `dist/assets/*` hash from the merged commit to the asset requested in DevTools.
  - Inspect cache headers with `curl -I --compressed` (look for `cache-control` and `etag`).
- If assets are stale, wait for Pages cache propagation, then re-test.

