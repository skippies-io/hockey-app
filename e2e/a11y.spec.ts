import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApiRoutes } from './support/mock-api';

/**
 * Automated accessibility tests using axe-core.
 *
 * Rules applied: WCAG 2.1 AA (axe default).
 * Each test navigates to a page, waits for it to settle, then runs axe
 * and asserts zero violations. Violations are printed in the error message
 * to make failures actionable without digging into the report.
 */

function formatViolations(violations: ReturnType<AxeBuilder['analyze']> extends Promise<infer T> ? T['violations'] : never): string {
  if (!violations.length) return '';
  return violations
    .map((v) => `[${v.impact}] ${v.id}: ${v.description}\n  ${v.nodes.map((n) => n.html).join('\n  ')}`)
    .join('\n\n');
}

test.beforeEach(async ({ page }) => {
  await mockApiRoutes(page);
});

test('homepage has no axe violations', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test('fixtures page has no axe violations', async ({ page }) => {
  await page.goto('U12/fixtures');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test('standings page has no axe violations', async ({ page }) => {
  await page.goto('U12/standings');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test('teams page has no axe violations', async ({ page }) => {
  await page.goto('U12/teams');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test('feedback page has no axe violations', async ({ page }) => {
  await page.goto('feedback');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test('tournaments page has no axe violations', async ({ page }) => {
  await page.goto('tournaments');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});
