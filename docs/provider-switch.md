# Provider Mode (API Server)

The DB API server supports two modes via `PROVIDER_MODE`:

- `apps` (default): proxies to Apps Script via `APPS_SCRIPT_BASE_URL`.
- `db`: requires `DATABASE_URL` to be set; serves the DB-backed read models.

Set `PROVIDER_MODE=db` when running the DB API server in production or local DB mode. When `PROVIDER_MODE` is unset or invalid, the server defaults to `apps`.
