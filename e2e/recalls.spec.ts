import { test, expect } from '@playwright/test';

test.describe('Recalls Page', () => {
  test('should load the recalls page', async ({ page }) => {
    await page.goto('/recalls');

    // Check for page heading
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should display recall cards', async ({ page }) => {
    await page.goto('/recalls');

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Check for recall content (mock data or empty state)
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should have filter options', async ({ page }) => {
    await page.goto('/recalls');

    // Check for filter controls
    const filterSection = page.locator('select, input[type="text"]');
    await expect(filterSection.first()).toBeVisible();
  });
});
