# Provider Mode (API Server)

The DB API server supports two modes via `PROVIDER_MODE`:

- `apps` (default): no database required; endpoints return a 503 with a clear message.
- `db`: requires `DATABASE_URL` to be set; serves the DB-backed read models.

Set `PROVIDER_MODE=db` when running the DB API server in production or local DB mode. When `PROVIDER_MODE` is unset or invalid, the server defaults to `apps`.
