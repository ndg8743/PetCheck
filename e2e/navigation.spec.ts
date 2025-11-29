import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate from home to login', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Sign Up")');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should navigate from home to drugs (guest)', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Continue as Guest")');
    await expect(page).toHaveURL(/\/drugs/);
  });

  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/unknown-page-12345');
    await expect(page.locator('text=404')).toBeVisible();
  });

  test('public pages should be accessible without login', async ({ page }) => {
    // Drug search
    await page.goto('/drugs');
    await expect(page.locator('body')).not.toContainText('Access Denied');

    // Recalls
    await page.goto('/recalls');
    await expect(page.locator('body')).not.toContainText('Access Denied');

    // Interactions
    await page.goto('/interactions');
    await expect(page.locator('body')).not.toContainText('Access Denied');

    // Vets
    await page.goto('/vets');
    await expect(page.locator('body')).not.toContainText('Access Denied');
  });

  test('protected pages should redirect to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/pets');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/);
  });
});
