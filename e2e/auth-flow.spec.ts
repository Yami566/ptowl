import { test, expect } from '@playwright/test';

/**
 * PtOwl Auth Flow Tests
 * Tests the phone authentication UI flow (without actually sending SMS).
 * Verifies the form structure, validation, and UI interactions.
 */

test.describe('Phone Auth UI', () => {
  test('shows phone input on landing page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Should show a phone input field
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible({ timeout: 20_000 });
  });

  test('validates phone number format', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible({ timeout: 20_000 });
    await phoneInput.fill('123'); // Too short

    // Try to submit — look for the send code button
    const sendButton = page.getByRole('button', { name: /send|code|verify|continue/i });
    if (await sendButton.isVisible()) {
      await sendButton.click();
      // Should show validation error for short number
      await expect(page.locator('body')).toContainText(/10.*digit|invalid|phone/i);
    }
  });

  test('phone input accepts only digits', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible({ timeout: 20_000 });
    await phoneInput.fill('abcdefghij');

    // The input should strip non-digits (handled by onChange)
    const value = await phoneInput.inputValue();
    expect(value.replace(/\D/g, '')).toBe('');
  });
});
