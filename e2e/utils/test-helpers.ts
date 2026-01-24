import { Page, expect, Locator } from '@playwright/test';

/**
 * Test helper utilities for FoodTruck SaaS E2E tests
 */

// Client App URLs
export const CLIENT_URL = 'http://localhost:5173';
export const DASHBOARD_URL = 'http://localhost:5174';

/**
 * Wait for the page to be fully loaded and stable
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Check if an element contains valid price (not NaN, undefined, or null)
 */
export async function expectValidPrice(locator: Locator): Promise<void> {
  const text = await locator.textContent();
  expect(text).toBeTruthy();
  expect(text).not.toMatch(/NaN/);
  expect(text).not.toMatch(/undefined/);
  expect(text).not.toMatch(/null/);
}

/**
 * Check that page doesn't display any error states
 */
export async function expectNoErrors(page: Page): Promise<void> {
  const content = await page.content();
  expect(content).not.toMatch(/NaN/);
  expect(content).not.toMatch(/undefined\s*\u20ac/); // undefined followed by Euro sign
  expect(content).not.toMatch(/null\s*\u20ac/);
}

/**
 * Fill checkout form with test data
 */
export async function fillCheckoutForm(
  page: Page,
  data: {
    name: string;
    email: string;
    phone?: string;
  }
): Promise<void> {
  await page.fill('input[placeholder*="Nom"]', data.name);
  await page.fill('input[placeholder*="Email"]', data.email);
  if (data.phone) {
    await page.fill('input[placeholder*="phone" i], input[placeholder*="telephone" i]', data.phone);
  }
}

/**
 * Fill dashboard login form
 */
export async function fillLoginForm(
  page: Page,
  credentials: { email: string; password: string }
): Promise<void> {
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
}

/**
 * Wait for toast notification to appear
 */
export async function waitForToast(page: Page, text?: string): Promise<Locator> {
  const toastSelector = '[role="alert"], [data-testid="toast"], .toast, [class*="toast"]';
  const toast = page.locator(toastSelector).first();
  await expect(toast).toBeVisible({ timeout: 10000 });
  if (text) {
    await expect(toast).toContainText(text);
  }
  return toast;
}

/**
 * Wait for loading spinner to disappear
 */
export async function waitForLoadingComplete(page: Page): Promise<void> {
  const spinnerSelectors = [
    '.animate-spin',
    '[data-testid="loading"]',
    '[class*="spinner"]',
    '[class*="loading"]',
  ];

  for (const selector of spinnerSelectors) {
    const spinner = page.locator(selector).first();
    if (await spinner.isVisible({ timeout: 1000 }).catch(() => false)) {
      await spinner.waitFor({ state: 'hidden', timeout: 30000 });
    }
  }
}

/**
 * Click add button for a menu item
 */
export async function addMenuItemToCart(
  page: Page,
  options?: { itemIndex?: number; quantity?: number }
): Promise<void> {
  const { itemIndex = 0, quantity = 1 } = options || {};

  const addButton = page.locator('button:has-text("Ajouter"), button:has-text("+")').nth(itemIndex);

  for (let i = 0; i < quantity; i++) {
    await addButton.click();
    await page.waitForTimeout(300); // Small delay between clicks
  }
}

/**
 * Navigate to a foodtruck page
 */
export async function navigateToFoodtruck(
  page: Page,
  foodtruckId?: string
): Promise<boolean> {
  if (foodtruckId) {
    await page.goto(`/${foodtruckId}`);
    return true;
  }

  // Navigate to home and find first available foodtruck
  await page.goto('/');
  await waitForLoadingComplete(page);

  const foodtruckLink = page.locator('a[href^="/"]').filter({
    hasNot: page.locator('a[href="/"]'),
  }).first();

  if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await foodtruckLink.click();
    await waitForPageReady(page);
    return true;
  }

  return false;
}

/**
 * Get the current cart item count from the cart badge/button
 */
export async function getCartItemCount(page: Page): Promise<number> {
  const cartBadge = page.locator('[data-testid="cart-count"], .cart-count, [class*="badge"]').first();

  if (!await cartBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
    return 0;
  }

  const text = await cartBadge.textContent();
  const count = parseInt(text || '0', 10);
  return isNaN(count) ? 0 : count;
}

/**
 * Generate unique test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  return {
    email: `test+${timestamp}@example.com`,
    name: `Test User ${timestamp}`,
    phone: `+33612345${String(timestamp).slice(-4)}`,
  };
}

/**
 * Mock Supabase auth for dashboard tests
 */
export async function mockDashboardAuth(
  page: Page,
  userData?: { id: string; email: string }
): Promise<void> {
  const user = userData || {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  await page.evaluate((user) => {
    localStorage.setItem(
      'sb-localhost-auth-token',
      JSON.stringify({
        currentSession: {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh',
          user: {
            id: user.id,
            email: user.email,
            role: 'authenticated',
          },
        },
        expiresAt: Date.now() + 3600000,
      })
    );
  }, user);
}

/**
 * Clear all local storage and session storage
 */
export async function clearBrowserStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await page.screenshot({
    path: `playwright-report/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Verify element accessibility
 */
export async function verifyAccessibility(
  locator: Locator,
  options?: { role?: string; name?: string }
): Promise<void> {
  await expect(locator).toBeVisible();

  if (options?.role) {
    const role = await locator.getAttribute('role');
    expect(role).toBe(options.role);
  }

  if (options?.name) {
    await expect(locator).toHaveAccessibleName(options.name);
  }
}
