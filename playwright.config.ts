/**
 * Playwright E2E configuration.
 *
 * These tests are intentionally minimal — they cover the most critical
 * authentication, authorization and multi-owner flows. They require a running
 * database and a seed; they are NOT run by default in `npm run test` (which is
 * vitest unit tests). Run with `npm run test:e2e`.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // tests touch the same seeded DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});