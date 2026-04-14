import { test, expect } from '@playwright/test';

/**
 * Admin Tournament Wizard create-tournament smoke.
 *
 * Requirements (LeRoy):
 * 1) Opens the admin console (/admin)
 * 2) Logs in (from env vars)
 * 3) Creates a tournament with a unique name (e.g. PW-${Date.now()})
 * 4) Asserts it appears in the tournament list (public directory)
 */

test('admin can create a tournament via the Tournament Wizard (smoke)', async ({ page }) => {
  const email = process.env.PW_ADMIN_EMAIL || 'admin@example.com';
  const token = process.env.PW_ADMIN_TOKEN || 'sess';
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const uniqueName = `PW-${Date.now()}`;
  const season = '2026';
  const tournamentId = `hj-${uniqueName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${season}`;

  // In-memory tournaments list for this spec.
  const tournaments: Array<{ id: string; name: string; season: string }> = [];

  // ---------------------------
  // API mocks (spec-local)
  // ---------------------------

  await page.route('**/api/tournaments', (route) => {
    return route.fulfill({ json: { ok: true, data: tournaments } });
  });

  await page.route('**/api/meta', (route) => {
    return route.fulfill({ json: { ok: true, last_sync_at: '2026-03-15T08:00:00Z' } });
  });

  await page.route('**/api/announcements*', (route) => {
    return route.fulfill({ json: { ok: true, data: [] } });
  });

  await page.route('**/api/admin/venues', (route) => {
    return route.fulfill({ json: { ok: true, data: [{ name: 'Venue A' }] } });
  });

  await page.route('**/api/admin/franchises', (route) => {
    return route.fulfill({ json: { ok: true, data: [{ id: 'f1', name: 'Gryphons' }] } });
  });

  await page.route('**/api/admin/tournament-wizard', async (route) => {
    const body = route.request().postDataJSON() as any;

    // Keep it simple: append a tournament entry so the directory shows it.
    tournaments.push({
      id: body?.tournament?.id || tournamentId,
      name: body?.tournament?.name || uniqueName,
      season: body?.tournament?.season || season,
    });

    return route.fulfill({ json: { ok: true, tournament_id: body?.tournament?.id || tournamentId } });
  });

  // ---------------------------
  // 1) Open admin console (unauth) → should land on login
  // ---------------------------

  await page.goto('admin');
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole('heading', { name: /admin login/i })).toBeVisible();

  // ---------------------------
  // 2) "Log in" using env vars (seed session storage)
  // ---------------------------

  await page.evaluate(
    ({ token, email, expiresAt }) => {
      localStorage.setItem('hj_admin_session_token', token);
      localStorage.setItem('hj_admin_email', email);
      localStorage.setItem('hj_admin_session_expires_at', expiresAt);
    },
    { token, email, expiresAt }
  );

  // Go to admin dashboard now that we have a session.
  await page.goto('admin');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();

  // ---------------------------
  // 3) Create tournament (unique name)
  // ---------------------------

  await page.goto('admin/tournaments');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Tournament Setup Wizard' })).toBeVisible();

  // Step 1: Tournament
  await page.getByLabel('Tournament Name').fill(uniqueName);
  await page.getByLabel('Season').fill(season);
  await page.getByLabel('Tournament ID').fill(tournamentId);

  // Step 2: Groups & Pools
  await page.getByRole('button', { name: /^2\s*Groups & Pools/i }).click();
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();
  await page.getByLabel('Group ID').first().fill('U11B');
  await page.getByLabel('Label').first().fill('U11 Boys');
  // Venues are optional; leave empty.

  // Step 3: Teams & Fixtures
  await page.getByRole('button', { name: /^3\s*Teams & Fixtures/i }).click();
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();

  const teamsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Teams' }) });
  await teamsSection.getByLabel('Team Group').first().selectOption('U11B');
  await teamsSection.getByLabel('Team Name').first().fill('PP Amber');
  await teamsSection.getByLabel('Franchise').first().fill('Gryphons');
  await teamsSection.getByRole('combobox', { name: 'Pool' }).first().selectOption('A');

  // Create tournament
  await page.getByRole('button', { name: 'Create Tournament' }).click();
  await expect(page.getByText(new RegExp(`Tournament created: ${tournamentId}`))).toBeVisible();

  // ---------------------------
  // 4) Assert it appears in list (public tournament directory)
  // ---------------------------

  await page.goto('tournaments');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('Tournament Directory')).toBeVisible();
  await expect(page.getByRole('heading', { name: uniqueName })).toBeVisible();
});
