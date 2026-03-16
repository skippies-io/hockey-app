/**
 * Visual regression tests.
 *
 * Each test renders a page against the static mock API and compares it to a
 * committed baseline screenshot.  Baselines live in e2e/snapshots/ and are
 * keyed by OS + browser so that CI (linux/chromium) and local dev
 * (darwin/chromium) can coexist without false positives.
 *
 * To regenerate baselines:
 *   npm run test:visual:update
 */

import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './support/mock-api';

test.beforeEach(async ({ page }) => {
  await mockApiRoutes(page);
});

test('homepage – overview', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('homepage.png', { fullPage: true });
});

test('fixtures page – U12', async ({ page }) => {
  await page.goto('U12/fixtures');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('fixtures-u12.png', { fullPage: true });
});

test('standings page – U12', async ({ page }) => {
  await page.goto('U12/standings');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('standings-u12.png', { fullPage: true });
});

test('tournament directory', async ({ page }) => {
  await page.goto('tournaments');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('tournaments.png', { fullPage: true });
});

test('feedback page', async ({ page }) => {
  await page.goto('feedback');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('feedback.png', { fullPage: true });
});
