import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests run against a `vite preview` build.
 * API calls to http://localhost:8787 are intercepted by page.route() in each test.
 * Build the app first with VITE_DB_API_BASE=http://localhost:8787/api (the default dev value).
 *
 * Visual regression snapshots live in e2e/snapshots/ and are keyed by
 * OS + browser (e.g. homepage-chromium-linux.png).
 *
 * To regenerate baselines:
 *   npm run test:visual:update
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  snapshotDir: 'e2e/snapshots',
  expect: {
    toHaveScreenshot: {
      // Allow up to 2% pixel difference to tolerate minor font/AA variation
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: 'http://localhost:4173/hockey-app/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/visual\.spec\.ts/, /\.live\.spec\.ts/],
    },
    {
      name: 'watch',
      use: { ...devices['Desktop Chrome'], channel: 'msedge', headless: false, launchOptions: { slowMo: 800 } },
      testIgnore: /visual\.spec\.ts/,
    },
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /visual\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/hockey-app/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
