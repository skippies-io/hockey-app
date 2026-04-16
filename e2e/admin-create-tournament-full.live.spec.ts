import { test, expect, type Page } from '@playwright/test';

/**
 * Full tournament creation live test — models hj-indoor-2026 structure.
 *
 * Rule: Girls divisions play on Saturday, Boys divisions play on Sunday.
 *
 * Prerequisites:
 *   1. Backend running:  DATABASE_URL=<prod> node server/index.mjs
 *   2. Frontend built:   npm run build:e2e  (served by `npm run preview`)
 *   3. Valid session:    PW_ADMIN_TOKEN=<token>
 *
 * Run:
 *   npm run test:e2e:full
 */

const token = process.env.PW_ADMIN_TOKEN;
const email = process.env.PW_ADMIN_EMAIL || 'admin@example.com';

if (!token) {
  throw new Error('PW_ADMIN_TOKEN is not set.');
}

const SATURDAY = '2026-04-18'; // girls play
const SUNDAY   = '2026-04-19'; // boys play

test('admin creates a full tournament — HJ Indoor 2026 (LIVE)', async ({ page }) => {
  test.setTimeout(360_000); // 6 min: ~110 slow-mo actions at 800ms each

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

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
  await page.getByLabel('Tournament Name').fill('HJ Indoor 2026');
  await page.getByLabel('Season').fill('2026');

  // ── Step 2: Groups & Pools ────────────────────────────────────────────────
  await page.getByRole('button', { name: /^2\s*Groups & Pools/i }).click();
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();

  const groupsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Groups' }) });

  // Fill the nth group (0-based). Each group is a .wizard-block inside the Groups section.
  async function fillGroup(n: number, label: string, format: string, venue: string, playDate: string) {
    const card = groupsSection.locator('.wizard-block').nth(n);
    await card.getByLabel('Division / Age').fill(label);
    await card.getByLabel('Format').selectOption(format);
    await card.getByLabel('Play Date').fill(playDate);
    // The venue checkboxes are inside role=group aria-label="Group Venues"
    await card.getByRole('group', { name: 'Group Venues' }).getByText(venue).click();
  }

  // Group 0 (default slot) — Girls on Saturday, Boys on Sunday
  await fillGroup(0, 'U11 Boys',  'Round-robin', 'Dainfern College',  SUNDAY);

  await page.getByRole('button', { name: 'Add Group' }).click();
  await fillGroup(1, 'U11 Girls', 'Round-robin', 'Beaulieu College', SATURDAY);

  await page.getByRole('button', { name: 'Add Group' }).click();
  await fillGroup(2, 'U13 Boys',  'Round-robin', 'Dainfern College',  SUNDAY);

  await page.getByRole('button', { name: 'Add Group' }).click();
  await fillGroup(3, 'U13 Girls', 'Round-robin', 'Beaulieu College', SATURDAY);

  // ── Step 3: Teams & Fixtures ──────────────────────────────────────────────
  await page.getByRole('button', { name: /^3\s*Teams & Fixtures/i }).click();
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();

  // Fill the nth team row. Rows are indexed globally across all group selects.
  async function addTeam(groupLabel: string, teamName: string, franchise: string) {
    await page.getByRole('button', { name: 'Add Team' }).click();
    const n = (await page.getByRole('combobox', { name: 'Team Group' }).count()) - 1;
    await page.getByRole('combobox', { name: 'Team Group' }).nth(n).selectOption({ label: groupLabel });
    await page.getByLabel('Team Name').nth(n).fill(teamName);
    await page.getByRole('combobox', { name: 'Franchise' }).nth(n).selectOption(franchise);
  }

  // Fill the first pre-existing empty team row (no Add Team needed)
  await page.getByRole('combobox', { name: 'Team Group' }).nth(0).selectOption({ label: 'U11 Boys' });
  await page.getByLabel('Team Name').nth(0).fill('BHA Black');
  await page.getByRole('combobox', { name: 'Franchise' }).nth(0).selectOption('BHA');

  // U11 Boys
  await addTeam('U11 Boys', 'Blue Cranes Pink', 'Blue Cranes');
  await addTeam('U11 Boys', 'PP Blazers', 'Pretoria Panthers');

  // U11 Girls
  await addTeam('U11 Girls', 'BHA', 'BHA');
  await addTeam('U11 Girls', 'Blue Cranes Pink', 'Blue Cranes');
  await addTeam('U11 Girls', 'Knights', 'Knights');

  // U13 Boys
  await addTeam('U13 Boys', 'Dragons', 'Dragons');
  await addTeam('U13 Boys', 'PP Rangers', 'Pretoria Panthers');
  await addTeam('U13 Boys', 'GS Hockey', 'GS Hockey');

  // U13 Girls
  await addTeam('U13 Girls', 'Black Hawks', 'Black Hawks');
  await addTeam('U13 Girls', 'Blue Cranes Purple', 'Blue Cranes');
  await addTeam('U13 Girls', 'Northern Guardians', 'Northern Guardians');

  // ── Generate fixtures ─────────────────────────────────────────────────────
  // The generator block is the first .wizard-block inside the Fixtures section.
  const fixtureSection = page.locator('section', { has: page.getByRole('heading', { name: 'Fixtures' }) });
  const generatorBlock = fixtureSection.locator('.wizard-block').first();

  // Date pre-fills from the group's Play Date — only set time and venue per run.
  async function generate(divisionLabel: string, time: string, venue: string) {
    await generatorBlock.getByLabel('Generator Group').selectOption({ label: divisionLabel });
    await generatorBlock.getByLabel('Pool').selectOption('ALL');
    await generatorBlock.locator('input[type="time"]').fill(time);
    await generatorBlock.getByLabel('Default Venue').selectOption(venue);
    await fixtureSection.getByRole('button', { name: 'Generate Fixtures' }).click();
    await page.waitForTimeout(600);
  }

  // Girls on Saturday
  await generate('U11 Girls', '09:00', 'Beaulieu College');
  await generate('U13 Girls', '10:30', 'Beaulieu College');

  // Boys on Sunday
  await generate('U11 Boys', '09:00', 'Dainfern College');
  await generate('U13 Boys', '10:30', 'Dainfern College');

  // Remove the initial empty fixture row (no team1/team2 — it blocks the Pool field validation)
  await fixtureSection.getByRole('button', { name: /Remove Fixture/i }).first().click();

  // ── Create tournament ─────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Create Tournament' }).click();
  await expect(page.getByText(/Tournament created:/)).toBeVisible({ timeout: 20_000 });

  // ── Verify via API ────────────────────────────────────────────────────────
  const apiRes = await page.request.get('http://localhost:8787/api/tournaments');
  const { data } = await apiRes.json();
  const found = (data as Array<{ name: string }>).find((t) => t.name === 'HJ Indoor 2026');
  expect(found, 'Expected "HJ Indoor 2026" in tournaments API').toBeTruthy();
});
