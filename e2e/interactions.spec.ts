import { test, expect } from '@playwright/test';

test.describe('Interaction Checker Page', () => {
  test('should load the interaction checker page', async ({ page }) => {
    await page.goto('/interactions');

    // Check for page heading
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should have drug input fields', async ({ page }) => {
    await page.goto('/interactions');

    // Check for input fields
    const inputs = page.locator('input[type="text"]');
    await expect(inputs.first()).toBeVisible();
  });

  test('should have species selector', async ({ page }) => {
    await page.goto('/interactions');

    // Check for species selection (buttons or select)
    const speciesSection = page.locator('text=Dog, text=Cat, button:has-text("Dog")');
    // At least one species option should be visible
    await expect(page.locator('body')).toContainText(/dog|cat|species/i);
  });

  test('should have check interactions button', async ({ page }) => {
    await page.goto('/interactions');

    // Check for submit button
    const checkButton = page.locator('button:has-text("Check")');
    await expect(checkButton).toBeVisible();
  });
});
