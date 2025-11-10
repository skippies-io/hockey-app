# Quickstart — Hockey App v2 Overview

## 1. Prerequisites
- Node.js 20.x (matches Vite 5+ requirements)
- npm 10+
- Access to the Google Apps Script deployment that backs `VITE_API_BASE`
- Modern browser with PWA install + Notification API enabled for local testing

## 2. Install & Run
```bash
npm install
cp .env.example .env.local   # create if missing
# set VITE_API_BASE="https://script.google.com/macros/s/.../exec"
# optional: VITE_APP_VERSION="v2-overview"

npm run dev         # start Vite on http://localhost:5173
npm run lint        # eslint
npm run build       # production bundle
```

## 3. Seed Data for Overview Workflows
1. In Google Sheets, add sample rows to `Announcements`, `Fixtures`, `Standings`, `Awards`, and the new `OverviewDigests` tab (columns: token, owner, expiresAt, selectedTeams, selectedAgeGroups, title).
2. Create a `FixtureAlerts` tab (fixtureId, alertType, message, flaggedBy, season) so staff tooling can flag delays/cancellations.
3. Redeploy the Apps Script so the `overview`, `digests`, `digest`, and `alerts` endpoints are live.
4. Update `src/lib/api.js` if the query parameters change (e.g., add new filters).

## 4. Testing the New Features
- **Overview page**: Navigate to `/overview?season=2025` once the route is wired. Toggle `Offline` in DevTools to verify cached rendering.
- **Digest Builder**: Use the UI to pick teams/age groups, save, copy the share link, and open it in an incognito window.
- **ICS Export**: Trigger “Add to Calendar” and import the generated `.ics` file into Apple Calendar/Google Calendar for validation.
- **Announcements feed**: Add a row to the `Announcements` sheet and confirm it appears in `/overview` with correct severity before its `expiresAt` timestamp.
- **Notifications**: Open the in-app notification center, enable a followed team alert, and use dev tools to dispatch a mock WebSocket/in-app event.

## 5. Debug Tips
- Run `npm run lint -- --fix` before committing to stay aligned with ESLint config.
- `localStorage.getItem("hj:user")` shows the anonymous key used for FollowPreference state.
- If your workspace is missing dependencies, run `npm install idb-keyval ics` to pull the new packages required by IndexedDB caching and ICS export.
- Use `navigator.serviceWorker.ready.then(reg => reg.active.postMessage({ type: "CLEAR_CACHE" }))` to flush IndexedDB/CacheStorage during offline testing.
