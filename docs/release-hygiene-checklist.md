# Release Hygiene Checklist

## When to use this checklist

- Are you switching `PROVIDER_MODE` in production? YES/NO
- Are you changing Northflank/Supabase env vars? YES/NO
- Are you creating or pushing a git tag (`vX.Y.Z`)? YES/NO
- Are you merging something that will deploy to production? YES/NO

If YES to any, run this checklist.

## Stop conditions (do not proceed)

- Working tree is dirty or `main` is not synced to `origin/main`.
- `npm run lint` or `npm run build` fails.
- `/health` does not return HTTP 200.
- Required prod env vars are missing or unclear.
- Rollback path is not confirmed.
- Production smoke checks fail or return non-200.

## Preflight (local)

- Clean tree and sync main

```bash
git status -sb
git fetch origin
git switch main
git pull --ff-only
```

- Install deps, lint, build

```bash
npm ci
npm run lint
npm run build
```

- Smoke tests (as applicable)

```bash
npm run smoke:apps
npm run smoke:db:server
```

## Preflight (prod)

- Confirm provider mode and env vars are set
- Confirm rollback path is known

## Release (tag)

```bash
git fetch origin
git switch main
git pull --ff-only
git rev-parse HEAD
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

## Post-release

```bash
export PROD_API_BASE="https://p01--hj-api--wlt9xynp45bk.code.run"
curl -i "$PROD_API_BASE/health"
curl -sS "$PROD_API_BASE/version"
curl -sS "$PROD_API_BASE/api?groups=1"
curl -sS "$PROD_API_BASE/api?sheet=Fixtures&age=U13B" | head -c 200
```

- Post-release verification (parallel fixtures burst)

```bash
echo "$PROD_API_BASE"
npm run fixtures:burst -- --provider db --base "$PROD_API_BASE/api"
```

- Post-release verification (parallel standings burst)

```bash
echo "$PROD_API_BASE"
npm run standings:burst -- --provider db --base "$PROD_API_BASE/api"
```

- Note: curl `http_code=000` means no HTTP response (often empty `PROD_API_BASE` or network/TLS failure).

- Verify running build: `curl -sS "$PROD_API_BASE/version"`
- Note: `HEAD` requests to `/health` and `/api` may return HTTP 200 once merged.
- Monitor logs/errors and note rollout status
- Record the release in `docs/release-audit-trail.md`

## Rollback quick-step

```bash
export PROD_API_BASE="https://p01--hj-api--wlt9xynp45bk.code.run"
curl -i "$PROD_API_BASE/health"
curl -sS "$PROD_API_BASE/api?sheet=Fixtures&age=U13B" | head -c 200
```

- Set `PROVIDER_MODE=apps` (or unset) and restart
- Ensure `APPS_SCRIPT_BASE_URL` is set

## Definition of Done

- Runbook updated (if prod change).
- Release audit trail updated.
- Tag pushed (if a release).
- Follow-ups captured.
