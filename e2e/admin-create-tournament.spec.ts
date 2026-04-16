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

  await page.route('**/api/admin/divisions', (route) => {
    return route.fulfill({
      json: { ok: true, data: ['U11 Boys', 'U11 Girls', 'U13 Boys', 'U13 Girls'] },
    });
  });

  await page.route('**/api/admin/tournament-wizard', async (route) => {
    const body = route.request().postDataJSON() as any;
    const tournamentId = body?.tournament?.id || `hj-${uniqueName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${season}`;

    tournaments.push({
      id: tournamentId,
      name: body?.tournament?.name || uniqueName,
      season: body?.tournament?.season || season,
    });

    return route.fulfill({ json: { ok: true, tournament_id: tournamentId } });
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

  // Step 1: Tournament details (ID is auto-generated — no field to fill)
  await page.getByLabel('Tournament Name').fill(uniqueName);
  await page.getByLabel('Season').fill(season);

  // Step 2: Groups & Pools
  await page.getByRole('button', { name: /^2\s*Groups & Pools/i }).click();
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();
  // Division/Age replaces the old "Label" field; Group ID is auto-derived.
  await page.getByLabel('Division / Age').first().fill('U11 Boys');
  // Venues are optional; leave empty.

  // Step 3: Teams & Fixtures
  await page.getByRole('button', { name: /^3\s*Teams & Fixtures/i }).click();
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();

  const teamsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Teams' }) });
  // Group select shows the division label; its value is the auto-derived ID (U11B).
  await teamsSection.getByRole('combobox', { name: 'Team Group' }).first().selectOption({ label: 'U11 Boys' });
  await teamsSection.getByLabel('Team Name').first().fill('PP Amber');
  // Franchise is now a <select> dropdown populated from the API.
  await teamsSection.getByRole('combobox', { name: 'Franchise' }).first().selectOption('Gryphons');
  // Pool is no longer on teams — it lives only on fixtures.

  // Advance to review step then submit
  await page.getByRole('button', { name: 'Review →' }).click();
  await expect(page.getByRole('button', { name: 'Confirm & Create' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm & Create' }).click();
  await expect(page.getByText(/Tournament created:/)).toBeVisible();

  // ---------------------------
  // 4) Assert it appears in list (public tournament directory)
  // ---------------------------

  await page.goto('tournaments');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('Tournament Directory')).toBeVisible();
  await expect(page.getByRole('heading', { name: uniqueName })).toBeVisible();
});
