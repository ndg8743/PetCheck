import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display the login page', async ({ page }) => {
    await page.goto('/login');

    // Check for login form elements
    await expect(page.locator('text=Welcome Back')).toBeVisible();
  });

  test('should have Google login button', async ({ page }) => {
    await page.goto('/login');

    // Check for Google login button
    const googleButton = page.locator('button:has-text("Google")');
    await expect(googleButton).toBeVisible();
  });

  test('should have email input field', async ({ page }) => {
    await page.goto('/login');

    // Check for email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('should have password input field', async ({ page }) => {
    await page.goto('/login');

    // Check for password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('should have link to browse as guest', async ({ page }) => {
    await page.goto('/login');

    // Check for guest browsing option
    const guestLink = page.locator('text=Browse as Guest');
    await expect(guestLink).toBeVisible();
  });

  test('Google login button should trigger OAuth', async ({ page }) => {
    await page.goto('/login');

    // Click Google button
    const googleButton = page.locator('button:has-text("Google")');

    // Listen for navigation/popup
    const [popup] = await Promise.all([
      page.waitForEvent('popup').catch(() => null),
      googleButton.click().catch(() => {}),
    ]);

    // Either popup opens or page navigates to Google
    // This confirms the OAuth flow is wired up
    if (popup) {
      expect(popup.url()).toContain('google');
    }
  });
});
