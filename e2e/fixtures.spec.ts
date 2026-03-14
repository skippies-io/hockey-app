import { test, expect } from '@playwright/test';
import { mockApiRoutes, FIXTURE_ROWS } from './support/mock-api';

test.beforeEach(async ({ page }) => {
  await mockApiRoutes(page);
});

test('fixtures page renders team names', async ({ page }) => {
  await page.goto('U12/fixtures');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.fixtures-page')).toBeVisible();
  await expect(page.getByText('Tigers')).toBeVisible();
  await expect(page.getByText('Lions')).toBeVisible();
  await expect(page.getByText('Bears')).toBeVisible();
  await expect(page.getByText('Eagles')).toBeVisible();
});

test('fixtures page shows date group header', async ({ page }) => {
  await page.goto('U12/fixtures');
  await page.waitForLoadState('networkidle');
  const dateTitle = FIXTURE_ROWS[0].Date;
  await expect(page.locator('.fixtures-date-title').getByText(dateTitle, { exact: false })).toBeVisible();
});

test('fixture card shows score for played match', async ({ page }) => {
  await page.goto('U12/fixtures');
  await page.waitForLoadState('networkidle');
  // Tigers 3 – 1 Lions should both appear
  await expect(page.locator('.fixture-team-score').getByText('3', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.fixture-team-score').getByText('1', { exact: true }).first()).toBeVisible();
});

test('fixture cards render with venue information', async ({ page }) => {
  await page.goto('U12/fixtures');
  await page.waitForLoadState('networkidle');
  // Fixture cards should render venue info from mock data
  await expect(page.getByText('Pitch 1', { exact: false })).toBeVisible();
});

test('fixtures page shows empty state when no rows returned', async ({ page }) => {
  // Override fixtures route to return empty
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === '8787' && url.pathname === '/api' && url.searchParams.get('sheet') === 'Fixtures',
    (route) => route.fulfill({ json: { ok: true, rows: [] } })
  );
  await page.goto('U12/fixtures');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.fixtures-empty-title')).toBeVisible();
});
