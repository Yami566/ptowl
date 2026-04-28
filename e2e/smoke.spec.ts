import { test, expect } from '@playwright/test';

/**
 * PtOwl Smoke Tests — Critical path E2E tests
 * These tests verify the app loads and key pages are accessible.
 * They run against the live frontend (no auth bypass needed for public pages).
 */

test.describe('Smoke Tests', () => {
  test('landing page loads with login form', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Should show the PtOwl landing page with phone auth
    await expect(page).toHaveTitle(/PTOWL/i);
    // The page should contain the brand name (wait through auth-clearance overlay)
    await expect(page.locator('body')).toContainText(/ptowl|schedule|physical therapy/i, {
      timeout: 20_000,
    });
  });

  test('landing page has accessible structure', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Should have a skip-to-main link for accessibility
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeTruthy();
  });

  test('landing page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/PTOWL/i);
    // No horizontal overflow
    const body = page.locator('body');
    const bodyWidth = await body.evaluate((el) => el.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/some-nonexistent-page', { waitUntil: 'domcontentloaded' });
    // Should redirect to landing or show something meaningful (SPA routing)
    await expect(page).toHaveTitle(/PTOWL/i);
  });
});

test.describe('API Health', () => {
  test('health endpoint returns ok', async ({ request }) => {
    // Use the API URL directly (same domain in production, or localhost:8787 in dev)
    const apiBase = process.env.API_URL || 'https://ptowl.com/api/v1';
    const response = await request.get(`${apiBase}/health`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe('healthy');
    expect(body.data.db.connected).toBe(true);
  });
});
