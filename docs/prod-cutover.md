# Production Cutover Runbook (Apps Script -> Supabase DB)

## Context and Goals

- Move the HJ Hockey App API from Apps Script (Sheets provider) to Supabase Postgres (DB provider).
- Zero schema changes and no destructive operations.
- Fast rollback (single env toggle).
- Do not use `NODE_TLS_REJECT_UNAUTHORIZED` in production.

## Preflight Checklist

- `/health` returns 200.
- `PROVIDER_MODE=db` is intended for the cutover window.
- Required env vars are present in Northflank.

## Northflank Environment Variables

- `PROVIDER_MODE=db`
- `DATABASE_URL` (Supabase pooler connection string; code strips query params for node-postgres)
- `APPS_SCRIPT_BASE_URL` (only needed for rollback to apps mode)
- `PG_TLS_INSECURE=1` (TEMPORARY: required due to `SELF_SIGNED_CERT_IN_CHAIN`; follow up with CA-based verification)

## Deployment Steps

1) Set env vars in Northflank.
2) Redeploy or restart the service.

## Validation Commands (Expected 200)

```sh
curl -sS "https://p01--hj-api--wlt9xynp45bk.code.run/health"
curl -sS "https://p01--hj-api--wlt9xynp45bk.code.run/api?groups=1"
curl -sS "https://p01--hj-api--wlt9xynp45bk.code.run/api?sheet=Fixtures&age=U13B"
curl -sS "https://p01--hj-api--wlt9xynp45bk.code.run/api?sheet=Standings&age=U13B"
```

## Parity Expectations

- Rows present for groups, fixtures, and standings.
- Shapes include `Age`/`ageId`.
- Fixtures include `Status`.

## Monitoring (First 15 Minutes)

- Error rate spikes.
- Latency regression.
- Logs for TLS handshake or DB connection errors.

## Rollback Plan (Single Step)

- Set `PROVIDER_MODE=apps` (or unset) and restart.
- Ensure `APPS_SCRIPT_BASE_URL` is set.

## Post-Cutover Follow-Ups

- Remove `PG_TLS_INSECURE` from prod by adding proper CA chain handling.
- Add a DB connectivity health signal when `PROVIDER_MODE=db` (optional).
- Add a docs note about zsh quoting for curl URLs with `?`.
