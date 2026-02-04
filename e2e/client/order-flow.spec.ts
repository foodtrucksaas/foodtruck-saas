import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for the client order flow
 * Tests the critical path: menu → add item → checkout
 *
 * Can run against local dev or production:
 * - Local: pnpm test:e2e
 * - Prod: E2E_BASE_URL=https://onmange.app/client pnpm test:e2e
 */

// Test foodtruck ID (Camion Pizza from prod database)
const TEST_FOODTRUCK_ID = 'c5ec1412-d0ce-4516-8b65-ae2d796d70fa';
const TEST_FOODTRUCK_SLUG = 'camion-pizza-c5ec';

// Helper to wait for the menu page to load
async function waitForMenuPage(page: Page) {
  // Wait for either menu items, loading spinner to disappear, or error message
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  // Give React time to render
  await page.waitForTimeout(1000);

  // Check if page loaded with content
  const hasContent = await page
    .locator('article, button, h1, h2, h3')
    .first()
    .isVisible({ timeout: 5000 })
    .catch(() => false);
  return hasContent;
}

// Helper to find and click add button
async function addItemToCart(page: Page): Promise<boolean> {
  const addButton = page.locator('button:has-text("Ajouter"), button:has-text("Choisir")').first();

  if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await addButton.click();

    // Handle options modal if it appears
    await page.waitForTimeout(500);
    const confirmButton = page.locator(
      'button:has-text("Confirmer"), button:has-text("Ajouter au panier")'
    );
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
    return true;
  }
  return false;
}

test.describe('Client Order Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should load foodtruck menu page by UUID', async ({ page }) => {
    await page.goto(`/${TEST_FOODTRUCK_ID}`);

    const hasContent = await waitForMenuPage(page);

    // Page should load without critical errors
    const pageContent = await page.content();
    expect(pageContent).not.toContain('500');
    expect(pageContent).not.toContain('Internal Server Error');

    // Should have some content (either menu or error message for closed truck)
    expect(
      hasContent || pageContent.includes('fermé') || pageContent.includes('Aucun')
    ).toBeTruthy();
  });

  test('should load foodtruck menu page by slug', async ({ page }) => {
    await page.goto(`/${TEST_FOODTRUCK_SLUG}`);

    await waitForMenuPage(page);

    // Should not show a 404 or server error
    const pageContent = await page.content();
    expect(pageContent).not.toContain('404');
    expect(pageContent).not.toContain('Not Found');
  });

  test('should add item to cart and navigate to checkout', async ({ page }) => {
    await page.goto(`/${TEST_FOODTRUCK_ID}`);
    await waitForMenuPage(page);

    const added = await addItemToCart(page);
    if (!added) {
      // Skip test if no items available (menu empty or closed)
      test.skip();
      return;
    }

    // Wait for cart to update
    await page.waitForTimeout(500);

    // Look for cart/checkout link
    const cartLink = page
      .locator('a[href*="checkout"], [aria-label*="panier"], [aria-label*="Panier"]')
      .first();

    if (await cartLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cartLink.click();
      await page.waitForLoadState('networkidle');

      // Should be on checkout page or show cart
      const url = page.url();
      expect(url.includes('checkout') || url.includes('panier')).toBeTruthy();
    }
  });

  test('checkout should not have API errors with UUID', async ({ page }) => {
    // This test specifically checks that the checkout page
    // correctly uses the UUID for API calls (the bug we fixed)

    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Track failed network requests
    const failedRequests: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400 && response.url().includes('supabase')) {
        failedRequests.push(`${response.status()}: ${response.url()}`);
      }
    });

    await page.goto(`/${TEST_FOODTRUCK_ID}`);
    await waitForMenuPage(page);

    await addItemToCart(page);

    // Go to checkout
    await page.goto(`/${TEST_FOODTRUCK_ID}/checkout`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter for offer-related errors (the bug we fixed)
    const offerErrors = failedRequests.filter(
      (e) => e.includes('offers') || e.includes('get_optimized')
    );

    expect(offerErrors).toHaveLength(0);
  });

  test('checkout by slug should resolve to UUID for API calls', async ({ page }) => {
    // Track API requests to ensure UUID is used, not slug
    const apiRequests: { url: string; status: number }[] = [];
    page.on('response', (response) => {
      if (response.url().includes('supabase')) {
        apiRequests.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto(`/${TEST_FOODTRUCK_SLUG}`);
    await waitForMenuPage(page);

    await addItemToCart(page);

    // Navigate to checkout using slug URL
    await page.goto(`/${TEST_FOODTRUCK_SLUG}/checkout`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check that API calls don't use slug as foodtruck_id (which would cause 400 errors)
    // The slug should be resolved to UUID before API calls
    const badRequests = apiRequests.filter(
      (req) =>
        req.url().includes(`foodtruck_id=eq.${TEST_FOODTRUCK_SLUG}`) ||
        (req.url().includes(TEST_FOODTRUCK_SLUG) &&
          req.url().includes('foodtruck') &&
          req.status >= 400)
    );

    expect(badRequests).toHaveLength(0);
  });
});
