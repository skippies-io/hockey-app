import { test, expect } from '@playwright/test';

/**
 * Live smoke test — hits the real backend and writes to the production DB.
 *
 * Prerequisites:
 *   1. Backend running:  DATABASE_URL=<prod> node server/index.mjs
 *   2. Frontend built:   npm run build:e2e  (then served by `npm run preview`)
 *   3. Valid session:    PW_ADMIN_TOKEN=<token from DevTools > localStorage > hj_admin_session_token>
 *
 * Run:
 *   npm run test:e2e:live
 */

const token = process.env.PW_ADMIN_TOKEN;
const email = process.env.PW_ADMIN_EMAIL || 'admin@example.com';

if (!token) {
  throw new Error(
    'PW_ADMIN_TOKEN is not set.\n' +
    'Log into the admin panel, open DevTools → Application → Local Storage,\n' +
    'copy the value of hj_admin_session_token, and set it as the env var.'
  );
}

const PLAY_DATE = '2026-05-03';

test('admin can create a tournament via the wizard (LIVE — writes to prod DB)', async ({ page }) => {
  test.setTimeout(180_000);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const uniqueName = `PW Live ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })} ${Date.now().toString().slice(-4)}`;
  const season = '2026';

  // ── Auth ──────────────────────────────────────────────────────────────────
  await page.goto('admin');
  await page.waitForLoadState('domcontentloaded');
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

  // ── Open wizard ───────────────────────────────────────────────────────────
  await page.goto('admin/tournaments');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Tournament Setup Wizard' })).toBeVisible();

  // ── Step 1: Tournament details ────────────────────────────────────────────
  await page.getByLabel('Tournament Name').fill(uniqueName);
  await page.getByLabel('Season').fill(season);

  // ── Step 2: Groups & Pools ────────────────────────────────────────────────
  await page.getByRole('button', { name: /^2\s*Groups & Pools/i }).click();
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();

  const groupsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Groups' }) });

  async function fillGroup(n: number, label: string, format: string, venue: string, playDate: string) {
    const card = groupsSection.locator('.wizard-block').nth(n);
    await card.getByLabel('Division / Age').fill(label);
    await card.getByLabel('Format').selectOption(format);
    await card.getByLabel('Play Date').fill(playDate);
    await card.getByRole('group', { name: 'Group Venues' }).getByText(venue).click();
  }

  await fillGroup(0, 'U11 Boys',  'Round-robin', 'Dainfern College',  PLAY_DATE);
  await page.getByRole('button', { name: 'Add Group' }).click();
  await fillGroup(1, 'U11 Girls', 'Round-robin', 'Beaulieu College', PLAY_DATE);

  // ── Step 3: Teams & Fixtures ──────────────────────────────────────────────
  await page.getByRole('button', { name: /^3\s*Teams & Fixtures/i }).click();
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();

  async function addTeam(groupLabel: string, teamName: string, franchise: string) {
    await page.getByRole('button', { name: 'Add Team' }).click();
    const n = (await page.getByRole('combobox', { name: 'Team Group' }).count()) - 1;
    await page.getByRole('combobox', { name: 'Team Group' }).nth(n).selectOption({ label: groupLabel });
    await page.getByLabel('Team Name').nth(n).fill(teamName);
    await page.getByRole('combobox', { name: 'Franchise' }).nth(n).selectOption(franchise);
  }

  // Fill the first pre-existing empty team row
  await page.getByRole('combobox', { name: 'Team Group' }).nth(0).selectOption({ label: 'U11 Boys' });
  await page.getByLabel('Team Name').nth(0).fill('BHA Black');
  await page.getByRole('combobox', { name: 'Franchise' }).nth(0).selectOption('BHA');

  // U11 Boys — 3 teams minimum for round-robin
  await addTeam('U11 Boys', 'Blue Cranes Pink', 'Blue Cranes');
  await addTeam('U11 Boys', 'PP Blazers', 'Pretoria Panthers');

  // U11 Girls
  await addTeam('U11 Girls', 'BHA', 'BHA');
  await addTeam('U11 Girls', 'Blue Cranes Pink', 'Blue Cranes');
  await addTeam('U11 Girls', 'Knights', 'Knights');

  // ── Generate fixtures ─────────────────────────────────────────────────────
  const fixtureSection = page.locator('section', { has: page.getByRole('heading', { name: 'Fixtures' }) });
  const generatorBlock = fixtureSection.locator('.wizard-block').first();

  async function generate(divisionLabel: string, time: string, venue: string) {
    await generatorBlock.getByLabel('Generator Group').selectOption({ label: divisionLabel });
    await generatorBlock.getByLabel('Pool').selectOption('ALL');
    await generatorBlock.locator('input[type="time"]').fill(time);
    await generatorBlock.getByLabel('Default Venue').selectOption(venue);
    await fixtureSection.getByRole('button', { name: 'Generate Fixtures' }).click();
    await page.waitForTimeout(600);
  }

  await generate('U11 Boys',  '09:00', 'Dainfern College');
  await generate('U11 Girls', '10:30', 'Beaulieu College');

  // Remove the initial empty fixture row (no teams → blocks Pool validation)
  await fixtureSection.getByRole('button', { name: /Remove Fixture/i }).first().click();

  // ── Review & Submit ───────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Review →' }).click();
  await expect(page.getByRole('button', { name: 'Confirm & Create' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm & Create' }).click();
  await expect(page.getByText(/Tournament created:/)).toBeVisible({ timeout: 20_000 });

  // ── Verify: tournament appears in API ─────────────────────────────────────
  const apiRes = await page.request.get('http://localhost:8787/api/tournaments');
  const { data } = await apiRes.json();
  const found = (data as Array<{ id: string; name: string }>).find((t) => t.name === uniqueName);
  expect(found, `Expected "${uniqueName}" in tournaments API response`).toBeTruthy();

  // ── Verify: fixtures were created across both divisions ───────────────────
  const fixturesRes = await page.request.get(
    `http://localhost:8787/api/fixtures?tournamentId=${encodeURIComponent(found!.id)}&age=all`
  );
  const fixturesJson = await fixturesRes.json();
  const rows = fixturesJson.rows as Array<{ Age?: string; age?: string }>;
  expect(rows?.length, 'Expected fixtures to be created').toBeGreaterThan(0);

  const ages = new Set(rows.map((r) => r.Age || r.age || '').filter(Boolean));
  expect(ages.size, 'Expected fixtures from multiple divisions (U11 Boys + U11 Girls)').toBeGreaterThanOrEqual(2);
});
