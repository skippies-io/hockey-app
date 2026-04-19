import { test, expect } from '@playwright/test';

/**
 * Full tournament creation smoke test.
 *
 * Scenario: HJ Spring Cup 2026
 *   Venues:    Dainfern College, Beaulieu College, St Stithians
 *   Groups:
 *     - U11 Boys     (Round-robin,  3 teams, Dainfern + Beaulieu, fixtures generated)
 *     - U11 Girls    (Round-robin,  2 teams, Beaulieu, date via Girls Day shortcut)
 *     - U13 Knockout (Knockout,     3 placeholder teams via quick-add, St Stithians)
 *   Franchises: Gryphons, Purple Panthers, Knights, Blue Hawks
 *   Fixtures:   Round-robin generator for U11 Boys → 3 fixtures at Dainfern
 */
test('admin creates a full tournament via the wizard', async ({ page }) => {
  test.setTimeout(120_000); // 50+ interactions at 800ms slow-mo
  const email = process.env.PW_ADMIN_EMAIL || 'admin@example.com';
  const token = process.env.PW_ADMIN_TOKEN || 'sess';
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const tournamentName = 'HJ Spring Cup 2026';
  const season = '2026';
  const tournaments: Array<{ id: string; name: string; season: string }> = [];

  // ── API mocks ─────────────────────────────────────────────────────────────

  await page.route('**/api/tournaments', (route) =>
    route.fulfill({ json: { ok: true, data: tournaments } })
  );
  await page.route('**/api/meta', (route) =>
    route.fulfill({ json: { ok: true, last_sync_at: '2026-03-15T08:00:00Z' } })
  );
  await page.route('**/api/announcements*', (route) =>
    route.fulfill({ json: { ok: true, data: [] } })
  );
  await page.route('**/api/admin/venues', (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: [
          { name: 'Dainfern College' },
          { name: 'Beaulieu College' },
          { name: 'St Stithians' },
        ],
      },
    })
  );
  await page.route('**/api/admin/franchises', (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: [
          { id: 'f1', name: 'Gryphons' },
          { id: 'f2', name: 'Purple Panthers' },
          { id: 'f3', name: 'Knights' },
          { id: 'f4', name: 'Blue Hawks' },
        ],
      },
    })
  );
  await page.route('**/api/admin/franchise-teams*', (route) => {
    const url = new URL(route.request().url());
    const franchise = url.searchParams.get('franchise') ?? '';
    const teams: Record<string, string[]> = {
      'Gryphons':         ['Gryphons Gold', 'Gryphons Green', 'Gryphons Blue'],
      'Purple Panthers':  ['PP Amber', 'PP Navy', 'PP Emerald'],
      'Knights':          ['Knights Orange', 'Knights Silver'],
      'Blue Hawks':       ['Blue Hawks Blue', 'Blue Hawks Red'],
    };
    return route.fulfill({ json: { ok: true, data: teams[franchise] ?? [] } });
  });
  await page.route('**/api/admin/divisions', (route) =>
    route.fulfill({
      json: { ok: true, data: ['U11 Boys', 'U11 Girls', 'U13 Boys', 'U13 Girls'] },
    })
  );
  await page.route('**/api/admin/tournament-exists*', (route) =>
    route.fulfill({ json: { ok: true, exists: false } })
  );
  await page.route('**/api/admin/tournament-wizard', async (route) => {
    const body = route.request().postDataJSON() as any;
    const tournamentId = body?.tournament?.id || `hj-spring-cup-2026`;
    tournaments.push({ id: tournamentId, name: body?.tournament?.name, season: body?.tournament?.season });
    return route.fulfill({ json: { ok: true, tournament_id: tournamentId } });
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
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();

  // ── Navigate to wizard ────────────────────────────────────────────────────

  await page.goto('admin/tournaments/new');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Tournament Setup Wizard' })).toBeVisible();

  // ── Step 0: Tournament details ────────────────────────────────────────────

  await page.getByLabel('Tournament Name').fill(tournamentName);
  await page.getByLabel('Season').fill(season);
  // ID hint should appear
  await expect(page.getByText(/hj-spring-cup-2026/i)).toBeVisible();

  // ── Step 1: Groups & Pools ────────────────────────────────────────────────

  await page.getByRole('button', { name: /^2\s*Groups & Pools/i }).click();
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();

  // Group 1: U11 Boys — Round-robin, Dainfern + Beaulieu
  const groupsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Groups' }) });
  const groupBlocks = () => groupsSection.locator('.wizard-block');
  await groupsSection.getByLabel('Division / Age').first().fill('U11 Boys');
  await groupsSection.getByRole('combobox', { name: 'Format' }).first().selectOption('Round-robin');
  await groupsSection.getByLabel('Play Date').first().fill('2026-06-07');
  await groupBlocks().nth(0).getByRole('checkbox', { name: 'Dainfern College' }).check();
  await groupBlocks().nth(0).getByRole('checkbox', { name: 'Beaulieu College' }).check();

  // Group 2: U11 Girls — Round-robin, Beaulieu (play date set via shortcut)
  await page.getByRole('button', { name: 'Add Group' }).click();
  const divisionInputs = () => groupsSection.getByLabel('Division / Age');
  await divisionInputs().nth(1).fill('U11 Girls');
  await groupsSection.getByRole('combobox', { name: 'Format' }).nth(1).selectOption('Round-robin');
  await groupBlocks().nth(1).getByRole('checkbox', { name: 'Beaulieu College' }).check();

  // Group 3: U13 Knockout — St Stithians
  await page.getByRole('button', { name: 'Add Group' }).click();
  await divisionInputs().nth(2).fill('U13 Knockout');
  await groupsSection.getByRole('combobox', { name: 'Format' }).nth(2).selectOption('Knockout');
  await groupsSection.getByLabel('Play Date').nth(2).fill('2026-06-08');
  await groupBlocks().nth(2).getByRole('checkbox', { name: 'St Stithians' }).check();

  // Sprint 3 feature: Girls Day shortcut → applies 2026-06-07 to U11 Girls
  const shortcutsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Scheduling Shortcuts' }) });
  await shortcutsSection.getByLabel('Girls Day').fill('2026-06-07');
  await shortcutsSection.getByRole('button', { name: /Apply to Girls groups/i }).click();
  // U11 Girls play date should now match
  await expect(groupsSection.getByLabel('Play Date').nth(1)).toHaveValue('2026-06-07');

  // ── Step 2: Teams & Fixtures ──────────────────────────────────────────────

  await page.getByRole('button', { name: /^3\s*Teams & Fixtures/i }).click();
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();

  const teamsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Teams' }) });

  const teamGroupSelects = () => teamsSection.getByRole('combobox', { name: 'Team Group' });
  const franchiseSelects = () => teamsSection.getByRole('combobox', { name: 'Franchise' });
  const teamNameSelects = () => teamsSection.getByRole('combobox', { name: 'Team Name' });

  // U11 Boys team 1 — the default empty row
  await teamGroupSelects().first().selectOption({ label: 'U11 Boys' });
  await franchiseSelects().first().selectOption('Gryphons');
  await expect(teamNameSelects().first()).toBeVisible();
  await teamNameSelects().first().selectOption('Gryphons Gold');

  // U11 Boys team 2
  await teamsSection.getByRole('button', { name: 'Add Team' }).click();
  await teamGroupSelects().nth(1).selectOption({ label: 'U11 Boys' });
  await franchiseSelects().nth(1).selectOption('Knights');
  await expect(teamNameSelects().nth(1)).toBeVisible();
  await teamNameSelects().nth(1).selectOption('Knights Orange');

  // U11 Boys team 3
  await teamsSection.getByRole('button', { name: 'Add Team' }).click();
  await teamGroupSelects().nth(2).selectOption({ label: 'U11 Boys' });
  await franchiseSelects().nth(2).selectOption('Blue Hawks');
  await expect(teamNameSelects().nth(2)).toBeVisible();
  await teamNameSelects().nth(2).selectOption('Blue Hawks Blue');

  // U11 Girls team 1
  await teamsSection.getByRole('button', { name: 'Add Team' }).click();
  await teamGroupSelects().nth(3).selectOption({ label: 'U11 Girls' });
  await franchiseSelects().nth(3).selectOption('Purple Panthers');
  await expect(teamNameSelects().nth(3)).toBeVisible();
  await teamNameSelects().nth(3).selectOption('PP Emerald');

  // U11 Girls team 2
  await teamsSection.getByRole('button', { name: 'Add Team' }).click();
  await teamGroupSelects().nth(4).selectOption({ label: 'U11 Girls' });
  await franchiseSelects().nth(4).selectOption('Gryphons');
  await expect(teamNameSelects().nth(4)).toBeVisible();
  await teamNameSelects().nth(4).selectOption('Gryphons Blue');

  // Sprint 3 feature: placeholder quick-add for U13 Knockout (appended after real teams)
  await teamsSection.getByRole('button', { name: /Add standard placeholders for U13 Knockout/i }).click();
  await expect(page.locator('input[value="SF1 Winner"]')).toBeVisible();
  await expect(page.locator('input[value="SF2 Winner"]')).toBeVisible();
  await expect(page.locator('input[value="SF1 Loser / 3rd Place"]')).toBeVisible();

  // Generate round-robin fixtures for U11 Boys at Dainfern College
  const fixturesSection = page.locator('section', { has: page.getByRole('heading', { name: 'Fixtures' }) });
  await fixturesSection.getByRole('combobox', { name: 'Generator Group' }).selectOption({ label: 'U11 Boys' });
  await fixturesSection.getByLabel('Date').first().fill('2026-06-07');
  await fixturesSection.getByRole('combobox', { name: 'Default Venue' }).selectOption('Dainfern College');
  await fixturesSection.getByRole('button', { name: /Generate Fixtures/i }).click();
  // 3-team round-robin = 3 fixtures
  await expect(page.getByText(/Generated 3 fixtures/i)).toBeVisible();

  // ── Step 3: Review & Submit ───────────────────────────────────────────────

  await page.getByRole('button', { name: 'Review →' }).click();
  await expect(page.getByRole('heading', { name: 'Review Tournament' })).toBeVisible();

  // Tournament summary
  await expect(page.getByText(tournamentName)).toBeVisible();
  await expect(page.getByText(/hj-spring-cup-2026/i)).toBeVisible();

  // No ID conflict warning (mock returns exists:false)
  await expect(page.getByText(/already exists/i)).not.toBeVisible();

  // Confirm & Create should be enabled
  const confirmBtn = page.getByRole('button', { name: 'Confirm & Create' });
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();

  await expect(page.getByText(/Tournament created:/i)).toBeVisible();

  // ── Assert it appears in the public tournament directory ──────────────────

  await page.goto('tournaments');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Tournament Directory')).toBeVisible();
  await expect(page.getByRole('heading', { name: tournamentName })).toBeVisible();
});
