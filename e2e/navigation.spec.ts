import { test, expect } from '@playwright/test';
import { mockApiRoutes, TOURNAMENT } from './support/mock-api';

test.beforeEach(async ({ page }) => {
  await mockApiRoutes(page);
});

test('homepage loads and shows tournament name', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: TOURNAMENT.name, level: 1 })).toBeVisible();
});

test('skip-nav link is present and points to #main-content', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const skip = page.getByText('Skip to main content');
  await expect(skip).toBeAttached();
  await expect(skip).toHaveAttribute('href', '#main-content');
});

test('main navigation renders with correct links', async ({ page }) => {
  await page.goto('U12/fixtures');
  await page.waitForLoadState('networkidle');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Fixtures' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Standings' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Teams' })).toBeVisible();
});

test('active nav link carries aria-current="page"', async ({ page }) => {
  await page.goto('U12/standings');
  await page.waitForLoadState('networkidle');
  const standingsLink = page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Standings' });
  await expect(standingsLink).toHaveAttribute('aria-current', 'page');
});

test('navigating between pages via the pill nav works', async ({ page }) => {
  // The pill nav is only visible on age-scoped pages (not on the overview/welcome page)
  await page.goto('U12/standings');
  await page.waitForLoadState('networkidle');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('link', { name: 'Fixtures' }).click();
  await expect(page).toHaveURL(/\/fixtures/);
  await expect(page.locator('.fixtures-page')).toBeVisible();
});

test('tournament directory page loads', async ({ page }) => {
  await page.goto('tournaments');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Tournament Directory')).toBeVisible();
  await expect(page.getByRole('heading', { name: TOURNAMENT.name })).toBeVisible();
});

test('feedback page renders', async ({ page }) => {
  await page.goto('feedback');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button', { name: /send feedback/i })).toBeVisible();
});
