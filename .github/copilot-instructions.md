# Copilot / Agent instructions — hockey-app

Purpose: give an AI coding agent immediate, actionable context so it can be productive without extra human hand-holding.

## Big picture (what the app is)
- Small React single-page app built with Vite (React + HMR). Entry: `src/main.jsx` → `src/App.jsx`.
- Router: **HashRouter** (see `src/main.jsx`) and route patterns use `/AGE/{fixtures|standings|teams}` and `/AGE/team/:teamName` (helper: `src/lib/routes.js`).
- API backend: a Google Apps Script endpoint (set in env as `VITE_API_BASE`). See `.env` and `.env.production`.
- Static site deployed to **GitHub Pages** via `.github/workflows/pages.yml` that runs `npm run build` and publishes `dist/`.

## Key workflows / commands
- Development (HMR): `npm run dev` (Vite); Node >= 20 (see workflow).
- Production build: `npm run build` → outputs `dist/`.
- Preview a production build locally: `npm run preview`.
- Lint: `npm run lint` (ESLint configured in `eslint.config.js`).
- No test runner present; add tests explicitly if you add CI steps.

## Important environment variables
- Vite exposes env vars as `import.meta.env.VITE_*`.
  - `VITE_API_BASE` (required) — API base URL; `src/lib/api.js` will throw `Missing VITE_API_BASE` if absent.
  - `VITE_APP_VERSION` (used in cache keys; default `v1`). In CI, `.env.production` sets it to `${GITHUB_SHA}`.

## Project-specific patterns & conventions (practical rules)
- Storage key naming: most localStorage/sessionStorage keys start with `hj_` and include a `v#` suffix to mark breaking changes.
  - Follows storage: `src/lib/follows.js` uses `KEY = "hj_followed_teams_v2"`.
  - Preferences keys include a view suffix and version, e.g. `hj_show_followed_<view>_v1` (`src/lib/preferences.js`).
  - API cache format: `hj:cache:${APP_VER}:${url}` (see `src/lib/api.js`) with 60s stale-while-revalidate behavior.
- When changing storage shapes, increment the `v#` suffix in the key constants and add a short migration note in the commit.
- Cross-tab notification: follows writes dispatch `window.dispatchEvent(new Event('hj:follows'))` — listen for `'hj:follows'` and `'storage'` to pick up changes (`useFollows()` hook).
- Error and retry conventions:
  - `fetchJSON` throws `Error('HTTP <status>')` or API-supplied `data.error`.
  - Keep UI-level catch blocks simple (message string) — many components expect a string `err.message`.

## Files & code patterns to inspect when changing behavior
- `src/lib/api.js` — API client, caching, SWR behavior, `refreshAll()` helper.
- `src/lib/follows.js` — follow toggle semantics, storage key, cross-tab events, `useFollows()` hook.
- `src/lib/preferences.js` — preference hook shape and localStorage keys.
- `src/main.jsx` — router setup (HashRouter) and commented-out service worker registration (service worker file exists under `public/sw.js`).
- `src/components/AppLayout.jsx` — age selector, tabs and the `FilterSlotContext` slot pattern for filter UI.
- `src/views/*` and `src/components/*` — follow the small, focused components pattern used throughout.

## Conventions for routes & URLs
- Age-first routing: routes expect `/U13/fixtures` etc. If an unknown age is used, components redirect to a fallback group defined in `src/config.js`.
- Use `teamProfilePath(ageId, teamName)` (in `src/lib/routes.js`) to build safe team links (URL encodes values).

## Build/deploy gotchas & checks for PRs
- Ensure `VITE_API_BASE` is set in any environment used by a reviewer or CI who wants to run pages preview or a local build.
- `VITE_APP_VERSION` is used to version API cache keys; CI sets it via `GITHUB_SHA` in `.env.production`.
- When changing public assets (images, manifest, sw), update `public/` and verify `npm run build` output and `vite preview` locally.

## Helpful examples (copyable)
- Clearing client cache at runtime: call `refreshAll()` from `src/lib/api.js` to remove `hj:cache:` keys.
- Toggle follow programmatically: `toggleFollow(makeTeamFollowKey('U13B','Some Team'))` — keys are `'<age>:<teamName>'`.

## Good first tasks for contributors
- Add unit tests for `src/lib/api.js` caching and error cases.
- Add typed definitions or migrate to TypeScript incrementally (project uses JS + @types for dev).

---
If anything above is unclear or you'd like more detail in any area (example PR templates, test commands, or contributing guidelines), tell me what to expand and I'll iterate. ✅
