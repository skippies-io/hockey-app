import type { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

export const TOURNAMENT = { id: 't1', name: 'Winter Cup 2025', season: '2025' };

export const GROUPS = [
  { id: 'U12', label: 'U12 Boys' },
  { id: 'U10', label: 'U10 Mixed' },
];

// Today's date in "D MMM YYYY" format so Overview can show a non-zero today count
const _d = new Date();
const _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TODAY_LABEL = `${_d.getUTCDate()} ${_MONTHS[_d.getUTCMonth()]} ${_d.getUTCFullYear()}`;

export const FIXTURE_ROWS = [
  {
    Date: '15 Mar 2026',
    Time: '09:00',
    Team1: 'Tigers',
    Team2: 'Lions',
    Score1: '3',
    Score2: '1',
    Pool: 'A',
    Venue: 'Pitch 1',
    Status: '',
    ageId: 'U12',
  },
  {
    Date: '15 Mar 2026',
    Time: '10:30',
    Team1: 'Bears',
    Team2: 'Eagles',
    Score1: '',
    Score2: '',
    Pool: 'A',
    Venue: 'Pitch 2',
    Status: '',
    ageId: 'U12',
  },
  {
    Date: TODAY_LABEL,
    Time: '10:00',
    Team1: 'Falcons',
    Team2: 'Hawks',
    Score1: '',
    Score2: '',
    Pool: 'B',
    Venue: 'Pitch 3',
    Status: '',
    ageId: 'U12',
  },
];

export const STANDINGS_ROWS = [
  { Team: 'Tigers', Rank: 1, Points: 9, GP: 3, W: 3, D: 0, L: 0, GF: 9, GA: 2, GD: 7, Pool: 'A', Age: 'U12' },
  { Team: 'Bears',  Rank: 2, Points: 6, GP: 3, W: 2, D: 0, L: 1, GF: 6, GA: 4, GD: 2, Pool: 'A', Age: 'U12' },
  { Team: 'Eagles', Rank: 3, Points: 3, GP: 3, W: 1, D: 0, L: 2, GF: 3, GA: 6, GD: -3, Pool: 'A', Age: 'U12' },
  { Team: 'Lions',  Rank: 4, Points: 0, GP: 3, W: 0, D: 0, L: 3, GF: 2, GA: 8, GD: -6, Pool: 'A', Age: 'U12' },
];

// ---------------------------------------------------------------------------
// Route installer
// ---------------------------------------------------------------------------

/**
 * Install API mocks on the given page. Call this in beforeEach.
 * All calls to http://localhost:8787/** are intercepted and fulfilled
 * with static mock data — no real backend is required.
 */
export async function mockApiRoutes(page: Page): Promise<void> {
  await page.route('**/api/tournaments', (route) =>
    route.fulfill({ json: { ok: true, data: [TOURNAMENT] } })
  );

  // -------------------------------------------------------------------------
  // Admin API mocks (used by Tournament Wizard and admin management pages)
  // -------------------------------------------------------------------------

  await page.route('**/api/admin/venues', (route) =>
    route.fulfill({ json: { ok: true, data: [{ name: 'Venue A' }, { name: 'Venue B' }] } })
  );

  await page.route('**/api/admin/franchises', (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: [
          { id: 'f1', name: 'Gryphons' },
          { id: 'f2', name: 'Dragons' },
        ],
      },
    })
  );

  // NOTE: individual specs may override this route to assert on request payload.
  await page.route('**/api/admin/tournament-wizard', (route) =>
    route.fulfill({ json: { ok: true, tournament_id: 't-new' } })
  );

  await page.route('**/api/meta', (route) =>
    route.fulfill({ json: { ok: true, last_sync_at: '2026-03-15T08:00:00Z' } })
  );

  await page.route('**/api/announcements*', (route) =>
    route.fulfill({ json: { ok: true, data: [] } })
  );

  await page.route(
    (url) => url.pathname === '/api' && url.searchParams.has('groups'),
    (route) => route.fulfill({ json: { ok: true, groups: GROUPS } })
  );

  await page.route(
    (url) => url.pathname === '/api' && url.searchParams.get('sheet') === 'Fixtures',
    (route) => route.fulfill({ json: { ok: true, rows: FIXTURE_ROWS } })
  );

  await page.route(
    (url) => url.pathname === '/api' && url.searchParams.get('sheet') === 'Standings',
    (route) => route.fulfill({ json: { ok: true, rows: STANDINGS_ROWS } })
  );

  await page.route(
    (url) => url.pathname === '/api' && url.searchParams.get('sheet') === 'Franchises',
    (route) => route.fulfill({ json: { ok: true, rows: [] } })
  );
}
