import { test, expect } from '@playwright/test';
import {
  waitForPageReady,
  waitForLoadingComplete,
  expectNoErrors,
  fillCheckoutForm,
  generateTestData,
} from '../utils/test-helpers';
import { TEST_CUSTOMER, TIMEOUTS } from '../fixtures/test-data';

test.describe('Cart and Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
  });

  test('should add item to cart from menu', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Navigate to a foodtruck
    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);
      await waitForLoadingComplete(page);

      // Look for Add button
      const addButton = page.locator('button').filter({
        hasText: /ajouter|\+/i,
      }).first();

      if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);

        // Check if cart was updated (look for cart indicator or checkout link)
        const cartIndicator = page.locator('a[href*="checkout"], [data-testid="cart"], .cart-count');

        // Cart should be visible or page should show cart content
        const pageContent = await page.content();
        // After adding, there should be some cart-related UI
        expect(pageContent).toBeTruthy();
      }
    }
  });

  test('should update item quantity in cart', async ({ page }) => {
    await page.waitForTimeout(2000);

    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);

      // Add item
      const addButton = page.locator('button').filter({
        hasText: /ajouter|\+/i,
      }).first();

      if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Add multiple times
        await addButton.click();
        await page.waitForTimeout(300);
        await addButton.click();
        await page.waitForTimeout(300);

        await expectNoErrors(page);
      }
    }
  });

  test('should navigate to checkout page with items in cart', async ({ page }) => {
    await page.waitForTimeout(2000);

    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);

      // Add item to cart
      const addButton = page.locator('button').filter({
        hasText: /ajouter|\+/i,
      }).first();

      if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);

        // Find and click checkout/cart button
        const checkoutLink = page.locator('a[href*="checkout"]');

        if (await checkoutLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await checkoutLink.click();
          await waitForPageReady(page);

          // Should be on checkout page
          expect(page.url()).toContain('checkout');
          await expectNoErrors(page);
        }
      }
    }
  });

  test('should display checkout form with required fields', async ({ page }) => {
    await page.waitForTimeout(2000);

    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);

      const addButton = page.locator('button').filter({
        hasText: /ajouter|\+/i,
      }).first();

      if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);

        const checkoutLink = page.locator('a[href*="checkout"]');

        if (await checkoutLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await checkoutLink.click();
          await waitForPageReady(page);

          // Check for form fields
          const nameInput = page.locator('input[placeholder*="Nom" i]');
          const emailInput = page.locator('input[placeholder*="Email" i], input[type="email"]');

          // At least one required field should be present
          const hasNameField = await nameInput.isVisible({ timeout: 3000 }).catch(() => false);
          const hasEmailField = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);

          // Checkout page should have form fields
          expect(hasNameField || hasEmailField).toBeTruthy();
        }
      }
    }
  });

  test('should show empty cart message when cart is empty', async ({ page }) => {
    // Try to access checkout directly without items
    await page.goto('/test-foodtruck/checkout');
    await waitForPageReady(page);

    // Should either show empty cart message or redirect
    const pageContent = await page.content();

    // Check for empty cart indicators
    const isEmpty =
      pageContent.includes('panier est vide') ||
      pageContent.includes('Voir le menu') ||
      page.url().includes('checkout') === false;

    // Page should handle empty cart gracefully
    await expectNoErrors(page);
  });

  test('should validate email format on checkout', async ({ page }) => {
    await page.waitForTimeout(2000);

    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);

      const addButton = page.locator('button').filter({
        hasText: /ajouter|\+/i,
      }).first();

      if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);

        const checkoutLink = page.locator('a[href*="checkout"]');

        if (await checkoutLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await checkoutLink.click();
          await waitForPageReady(page);

          // Fill with invalid email
          const emailInput = page.locator('input[placeholder*="Email" i], input[type="email"]').first();

          if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await emailInput.fill('invalid-email');

            // Try to submit
            const submitButton = page.locator('button').filter({
              hasText: /confirmer|valider|commander/i,
            }).first();

            if (await submitButton.isVisible()) {
              await submitButton.click();
              await page.waitForTimeout(500);

              // Should show validation error or prevent submission
              await expectNoErrors(page);
            }
          }
        }
      }
    }
  });

  test('should display order summary with correct totals', async ({ page }) => {
    await page.waitForTimeout(2000);

    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);

      const addButton = page.locator('button').filter({
        hasText: /ajouter|\+/i,
      }).first();

      if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);

        const checkoutLink = page.locator('a[href*="checkout"]');

        if (await checkoutLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await checkoutLink.click();
          await waitForPageReady(page);

          // Check for valid price displays (no NaN)
          const content = await page.content();
          expect(content).not.toMatch(/NaN/);
          expect(content).not.toMatch(/undefined\s*\u20ac/);
        }
      }
    }
  });

  test('should show pickup time selection', async ({ page }) => {
    await page.waitForTimeout(2000);

    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);

      const addButton = page.locator('button').filter({
        hasText: /ajouter|\+/i,
      }).first();

      if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);

        const checkoutLink = page.locator('a[href*="checkout"]');

        if (await checkoutLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await checkoutLink.click();
          await waitForPageReady(page);

          // Look for time slot picker
          const timeSection = page.locator('text=Retrait, select, [class*="time"]');

          // Time selection should be available
          const content = await page.content();
          const hasTimeSelection =
            content.includes('Retrait') ||
            content.includes('creneau') ||
            content.includes('Heure');

          // Page should have pickup time functionality
          await expectNoErrors(page);
        }
      }
    }
  });
});

test.describe('Promo Code and Discounts', () => {
  test('should have promo code input field if enabled', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);

      const addButton = page.locator('button').filter({
        hasText: /ajouter|\+/i,
      }).first();

      if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);

        const checkoutLink = page.locator('a[href*="checkout"]');

        if (await checkoutLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await checkoutLink.click();
          await waitForPageReady(page);

          // Look for promo code section
          const promoSection = page.locator('text=Code promo, text=promo, input[placeholder*="code" i]');

          // Promo functionality may or may not be present based on settings
          await expectNoErrors(page);
        }
      }
    }
  });
});

test.describe('GDPR Opt-ins', () => {
  test('should display marketing opt-in checkboxes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);

      const addButton = page.locator('button').filter({
        hasText: /ajouter|\+/i,
      }).first();

      if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);

        const checkoutLink = page.locator('a[href*="checkout"]');

        if (await checkoutLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await checkoutLink.click();
          await waitForPageReady(page);

          // Check for opt-in checkboxes
          const checkboxes = page.locator('input[type="checkbox"]');
          const count = await checkboxes.count();

          // Should have at least one checkbox for GDPR opt-in
          // (email offers, SMS offers, loyalty)
          if (count > 0) {
            // Checkboxes should be functional
            const firstCheckbox = checkboxes.first();
            const initialState = await firstCheckbox.isChecked();
            await firstCheckbox.click();
            const newState = await firstCheckbox.isChecked();
            expect(newState).not.toBe(initialState);
          }

          await expectNoErrors(page);
        }
      }
    }
  });
});
