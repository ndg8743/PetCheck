import { test, expect } from '@playwright/test';

test.describe('Drug Search Page', () => {
  test('should load the drug search page', async ({ page }) => {
    await page.goto('/drugs');

    // Check for search input
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  test('should display search results for a query', async ({ page }) => {
    await page.goto('/drugs?q=apoquel');

    // Wait for mock data to load
    await page.waitForTimeout(1000);

    // Check for results (mock data includes Apoquel)
    await expect(page.locator('text=Apoquel').first()).toBeVisible();
  });

  test('should have filter dropdowns', async ({ page }) => {
    await page.goto('/drugs');

    // Check for filter selects
    const selects = page.locator('select');
    await expect(selects.first()).toBeVisible();
  });

  test('should navigate to drug detail when clicking a result', async ({ page }) => {
    await page.goto('/drugs?q=test');

    // Wait for results
    await page.waitForTimeout(1000);

    // Check if there are any clickable drug cards
    const drugCards = page.locator('[role="button"]');
    if (await drugCards.count() > 0) {
      await drugCards.first().click();
      // Should navigate to drug detail page
      await expect(page).toHaveURL(/\/drugs\/\d+/);
    }
  });
});
