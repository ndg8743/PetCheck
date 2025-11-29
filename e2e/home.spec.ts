import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the home page with hero section', async ({ page }) => {
    await page.goto('/');

    // Check for PetCheck branding
    await expect(page.locator('text=PetCheck')).toBeVisible();

    // Check for hero text
    await expect(page.locator('text=FDA-Powered Veterinary Drug Safety Database')).toBeVisible();
  });

  test('should have working navigation buttons', async ({ page }) => {
    await page.goto('/');

    // Check for Sign Up / Login button
    const loginButton = page.locator('button:has-text("Sign Up")');
    await expect(loginButton).toBeVisible();

    // Check for Continue as Guest button
    const guestButton = page.locator('button:has-text("Continue as Guest")');
    await expect(guestButton).toBeVisible();
  });

  test('should navigate to drug search as guest', async ({ page }) => {
    await page.goto('/');

    // Click Continue as Guest
    await page.click('button:has-text("Continue as Guest")');

    // Should be on drugs page
    await expect(page).toHaveURL(/\/drugs/);
  });

  test('should display recent recalls section', async ({ page }) => {
    await page.goto('/');

    // Check for Recent Recalls heading
    await expect(page.locator('text=Recent Recalls')).toBeVisible();
  });

  test('should display features section', async ({ page }) => {
    await page.goto('/');

    // Check for feature cards
    await expect(page.locator('text=Drug Safety Search')).toBeVisible();
    await expect(page.locator('text=Pet Profiles')).toBeVisible();
    await expect(page.locator('text=Interaction Checker')).toBeVisible();
  });
});
