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

test('admin can create a tournament via the wizard (LIVE — writes to prod DB)', async ({ page }) => {
  test.setTimeout(90_000); // slowMo 800ms × ~20 actions + network = needs headroom
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const uniqueName = `PW Live ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })} ${Date.now().toString().slice(-4)}`;
  const season = '2026';

  // No API mocks — all requests hit the real backend at localhost:8787.

  // 1) Navigate to admin (should redirect to login if not authed)
  await page.goto('admin');
  await page.waitForLoadState('domcontentloaded');

  // 2) Seed the real session token into localStorage
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

  // 3) Open the wizard
  await page.goto('admin/tournaments');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Tournament Setup Wizard' })).toBeVisible();

  // Step 1: Tournament details
  await page.getByLabel('Tournament Name').fill(uniqueName);
  await page.getByLabel('Season').fill(season);

  // Step 2: Division
  await page.getByRole('button', { name: /^2\s*Groups & Pools/i }).click();
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();
  await page.getByLabel('Division / Age').first().fill('U11 Boys');

  // Step 3: Teams
  await page.getByRole('button', { name: /^3\s*Teams & Fixtures/i }).click();
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();

  const teamsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Teams' }) });
  await teamsSection.getByRole('combobox', { name: 'Team Group' }).first().selectOption({ label: 'U11 Boys' });
  await teamsSection.getByLabel('Team Name').first().fill('PP Amber');
  // Pick the first franchise available in the dropdown
  await teamsSection.getByRole('combobox', { name: 'Franchise' }).first().selectOption({ index: 1 });

  // Remove any auto-added fixture rows (partially filled → fail validation)
  let fixtureBtns = page.getByRole('button', { name: /Remove Fixture/i });
  let nFixtures = await fixtureBtns.count();
  while (nFixtures > 0) {
    await fixtureBtns.first().click();
    nFixtures = await page.getByRole('button', { name: /Remove Fixture/i }).count();
  }

  // Create tournament — this POSTs to the real backend and inserts into the DB
  await page.getByRole('button', { name: 'Create Tournament' }).click();
  await expect(page.getByText(/Tournament created:/)).toBeVisible({ timeout: 15_000 });

  // 4) Verify the tournament appears in the public API (bypasses browser cache)
  const apiRes = await page.request.get('http://localhost:8787/api/tournaments');
  const { data } = await apiRes.json();
  const found = (data as Array<{ name: string }>).find((t) => t.name === uniqueName);
  expect(found, `Expected "${uniqueName}" in tournaments API response`).toBeTruthy();
});
