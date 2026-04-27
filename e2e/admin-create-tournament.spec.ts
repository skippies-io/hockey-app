import { test, expect } from '@playwright/test';

/**
 * Full tournament creation smoke test — TournamentNewWizard v2 (5-step).
 *
 * Scenario: HJ Spring Cup 2026
 *   Step 1 (Tournament Details): name, dates, Beaulieu College venue, U9 Mixed division
 *   Step 2 (Franchises):        BHA + Black Hawks
 *   Step 3 (Teams & Pools):     one team per franchise in U9 Mixed
 *   Step 4 (Rules):             accept auto-selected format
 *   Step 5 (Fixtures):          auto-generate + place one fixture
 */
test('admin creates a full tournament via the wizard', async ({ page }) => {
  test.setTimeout(180_000);
  const email = process.env.PW_ADMIN_EMAIL || 'admin@example.com';
  const token = process.env.PW_ADMIN_TOKEN || 'sess';
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const tournamentName = 'HJ Spring Cup 2026';
  const tournaments: Array<{ id: string; name: string; season: string }> = [];

  // ── API mocks ─────────────────────────────────────────────────────────────

  await page.route('**/api?*', (route) =>
    route.fulfill({ json: { ok: true, groups: [], rows: [], data: [] } })
  );
  await page.route('**/api/admin/**', (route) =>
    route.fulfill({ json: { ok: true, data: [] } })
  );
  await page.route('**/api/tournaments', (route) =>
    route.fulfill({ json: { ok: true, data: tournaments } })
  );
  await page.route('**/api/meta', (route) =>
    route.fulfill({ json: { ok: true, last_sync_at: '2026-03-15T08:00:00Z' } })
  );
  await page.route('**/api/announcements*', (route) =>
    route.fulfill({ json: { ok: true, data: [] } })
  );
  await page.route('**/api/admin/tournament-wizard', async (route) => {
    const body = route.request().postDataJSON() as any;
    const tournamentId = body?.tournament?.id || 'hj-spring-cup-2026';
    tournaments.push({ id: tournamentId, name: body?.tournament?.name, season: body?.tournament?.season });
    return route.fulfill({ json: { ok: true, tournament_id: tournamentId }, status: 201 });
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  await page.goto('admin');
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(/\/admin\/login/);

  await page.evaluate(
    ({ token, email, expiresAt }) => {
      localStorage.setItem('hj_admin_session_token', token);
      localStorage.setItem('hj_admin_email', email);
      localStorage.setItem('hj_admin_session_expires_at', expiresAt);
    },
    { token, email, expiresAt }
  );

  await page.goto('admin');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();

  // ── Navigate to wizard ────────────────────────────────────────────────────

  await page.goto('admin/tournaments/new');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('heading', { name: 'Create a new tournament' })).toBeVisible();

  // ── Step 1: Tournament Details ────────────────────────────────────────────

  await page.getByLabel('Name').fill(tournamentName);
  await page.getByLabel('Start date').fill('2026-06-07');
  await page.getByLabel('End date').fill('2026-06-08');

  // Select a venue (pill button)
  await page.getByRole('button', { name: 'Beaulieu College' }).click();

  // Enable one division
  await page.getByRole('checkbox', { name: 'U9 Mixed' }).check();

  await page.getByRole('button', { name: 'Next →' }).click();

  // ── Step 2: Franchises ────────────────────────────────────────────────────

  await expect(page.getByText('Step 2 of 5')).toBeVisible();

  // Select two franchises from the directory cards
  await page.getByRole('listitem').filter({ hasText: 'BHA' }).first().click();
  await page.getByRole('listitem').filter({ hasText: 'Black Hawks' }).first().click();

  await page.getByRole('button', { name: 'Next →' }).click();

  // ── Step 3: Teams & Pools ─────────────────────────────────────────────────

  await expect(page.getByText('Step 3 of 5')).toBeVisible();

  // Accept default team slots and proceed
  await page.getByRole('button', { name: 'Next →' }).click();

  // ── Step 4: Rules ─────────────────────────────────────────────────────────

  await expect(page.getByText('Step 4 of 5')).toBeVisible();

  await page.getByRole('button', { name: 'Next →' }).click();

  // ── Step 5: Fixtures ──────────────────────────────────────────────────────

  await expect(page.getByText('Step 5 of 5')).toBeVisible();

  // Auto-generate fixtures then place one
  await page.getByRole('button', { name: 'Auto-generate fixtures' }).click();

  const firstFixture = page.getByRole('button', { name: /BHA|Black Hawks/ }).first();
  await firstFixture.click();

  const firstSlot = page.getByRole('button', { name: 'click to place' }).first();
  await firstSlot.click();

  // Submit
  await page.getByRole('button', { name: 'Create Tournament →' }).click();

  // ── Success screen ────────────────────────────────────────────────────────

  await expect(page.getByRole('heading', { name: 'Tournament Created!' })).toBeVisible();
  await expect(page.getByText(tournamentName)).toBeVisible();

  // ── Assert it appears in the public tournament directory ──────────────────

  await page.goto('tournaments');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByText('Tournament Directory')).toBeVisible();
  await expect(page.getByRole('heading', { name: tournamentName })).toBeVisible();
});
