import { defineConfig, devices } from '@playwright/test';

/**
 * PtOwl E2E Tests — Playwright Configuration
 * Runs against the local dev server or a deployed staging URL.
 *
 * Usage:
 *   pnpm e2e                          # local dev
 *   BASE_URL=https://staging.ptowl.pages.dev pnpm e2e  # staging
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30_000,

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Start dev server automatically for local runs
  ...(process.env.BASE_URL
    ? {}
    : {
        webServer: {
          command: 'pnpm dev:web',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
      }),
});
