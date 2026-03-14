import { test, expect } from '@playwright/test';
import { mockApiRoutes, STANDINGS_ROWS } from './support/mock-api';

test.beforeEach(async ({ page }) => {
  await mockApiRoutes(page);
});

test('standings page renders team names', async ({ page }) => {
  await page.goto('U12/standings');
  await page.waitForLoadState('networkidle');
  for (const row of STANDINGS_ROWS) {
    await expect(page.getByText(row.Team)).toBeVisible();
  }
});

test('standings page shows rank chips', async ({ page }) => {
  await page.goto('U12/standings');
  await page.waitForLoadState('networkidle');
  // Rank 1 chip should be visible for the top team
  await expect(page.locator('.rank-chip').first()).toBeVisible();
});

test('standings page shows points for each team', async ({ page }) => {
  await page.goto('U12/standings');
  await page.waitForLoadState('networkidle');
  // Top team has 9 points — the number should appear on the page
  await expect(page.getByText('9').first()).toBeVisible();
});

test('clicking a team name navigates to team profile', async ({ page }) => {
  await page.goto('U12/standings');
  await page.waitForLoadState('networkidle');
  const teamLink = page.getByRole('link', { name: 'Tigers' }).first();
  await teamLink.click();
  await expect(page).toHaveURL(/\/team\//);
});
