# Supabase Production DB (Runbook)

## DATABASE_URL

Local example (SSL required):

```sh
export DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/postgres?sslmode=require"
```

## Commands

Connectivity check:

```sh
psql "$DATABASE_URL" -c "select 1"
```

Migrations:

```sh
npm run db:migrate
```

Ingestion (preview by default):

```sh
npm run db:ingest
```

## Notes

- Do not commit secrets. Production uses Northflank env vars.
