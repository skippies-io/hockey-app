# DB Operations (Local + Production)

## DATABASE_URL

Local example:

```sh
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/hockey"
```

Supabase example (SSL required):

```sh
export DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/postgres?sslmode=require"
```

## Migrations

```sh
npm run db:migrate
```

Check applied migrations:

```sh
npm run db:migrate:check
```

## Ingestion (preview vs commit)

Preview (default, no DB writes):

```sh
npm run db:ingest
```

Commit (writes to DB, requires DATABASE_URL):

```sh
node scripts/ingest.mjs --commit
```
