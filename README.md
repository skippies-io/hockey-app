# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Dev: UI + DB API

Run the DB API server and Vite together (no UI changes needed):

```sh
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/hockey"
export TOURNAMENT_ID="hj-indoor-allstars-2025"
export VITE_PROVIDER="db"
export VITE_DB_API_BASE="http://localhost:8787/api"
npm run dev:full
```

Create a local DB env file once (not committed):

```sh
cat <<'EOF' > .env.db.local
DATABASE_URL=postgres://localhost:5432/hockey
TOURNAMENT_ID=hj-indoor-allstars-2025
EOF
```

If you prefer two terminals:

```sh
# terminal 1
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/hockey"
export TOURNAMENT_ID="hj-indoor-allstars-2025"
npm run server
```

```sh
# terminal 2
export VITE_PROVIDER="db"
export VITE_DB_API_BASE="http://localhost:8787/api"
npm run dev
```

Smoke test examples are listed in `specs/db/ingestion_v1.6.md`.

## Local provider switch

- Default provider is Sheets (Apps Script). If `VITE_PROVIDER` is unset, the UI uses `VITE_API_BASE`.
- DB provider requires Postgres + ingestion, plus `DATABASE_URL` and `TOURNAMENT_ID` for the API server.
- Switch to DB locally:
  - `export VITE_PROVIDER="db"`
  - `export VITE_DB_API_BASE="http://localhost:8787/api"`

## One-command tests

Sheets provider (default):

```sh
npm run test:app:sheets
```

DB provider:

```sh
npm run test:app:db:local
```

## Shipping

Tag a release (e.g., `v1.2.3`) and push the tag to trigger the release workflow:

```sh
git tag vX.Y.Z
git push origin vX.Y.Z
```

Build artifacts are uploaded to GitHub Releases as `dist.zip` (and `specs.zip` when present).

## UI Roadmap (Draft)

- [FixtureCard evolution](docs/ui/fixturecard-evolution.md)
