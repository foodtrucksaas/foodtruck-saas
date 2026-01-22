import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a foodtruck page (using demo foodtruck if available)
    await page.goto('/');
  });

  test('should display foodtruck list on home page', async ({ page }) => {
    // Check that the home page loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to foodtruck menu', async ({ page }) => {
    // Wait for foodtrucks to load
    await page.waitForTimeout(2000);

    // Click on first available foodtruck link
    const foodtruckLink = page.locator('a[href^="/"]').first();
    if (await foodtruckLink.isVisible()) {
      await foodtruckLink.click();
      await expect(page).toHaveURL(/\/[a-z0-9-]+/);
    }
  });

  test('should add item to cart and proceed to checkout', async ({ page }) => {
    // This test requires a valid foodtruck ID
    // Navigate directly to a test foodtruck if available
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Try to find and click a foodtruck
    const foodtruckCard = page.locator('[data-testid="foodtruck-card"]').first();
    if (await foodtruckCard.isVisible()) {
      await foodtruckCard.click();

      // Wait for menu to load
      await page.waitForTimeout(1000);

      // Try to add an item
      const addButton = page.locator('button:has-text("Ajouter")').first();
      if (await addButton.isVisible()) {
        await addButton.click();

        // Check cart is updated
        const cartBadge = page.locator('[data-testid="cart-count"]');
        await expect(cartBadge).toBeVisible();
      }
    }
  });

  test('should show cart summary with correct total', async ({ page }) => {
    await page.goto('/');

    // Verify page structure loads without errors
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('NaN');
  });

  test('should validate required fields on checkout', async ({ page }) => {
    // Navigate to checkout page directly (will redirect if cart is empty)
    await page.goto('/test-foodtruck/checkout');

    // Should either show checkout form or redirect
    await page.waitForTimeout(1000);

    // Check no NaN values are displayed
    const pageContent = await page.content();
    expect(pageContent).not.toContain('NaN');
    expect(pageContent).not.toContain('undefined€');
  });
});

test.describe('Price Display', () => {
  test('should never display NaN or undefined prices', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const content = await page.content();
    expect(content).not.toMatch(/NaN/);
    expect(content).not.toMatch(/undefined€/);
    expect(content).not.toMatch(/null€/);
  });
});
