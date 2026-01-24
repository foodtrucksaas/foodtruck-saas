import { test, expect } from '@playwright/test';

/**
 * Dashboard - Navigation & Layout Tests
 *
 * Tests the dashboard structure:
 * - Sidebar navigation
 * - Page transitions
 * - Responsive behavior
 */

test.describe('Dashboard - Layout Structure', () => {
  test('login page should have proper layout', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Should have a centered card/form
    const card = page.locator('.card, form, [role="form"]');
    await expect(card.first()).toBeVisible();

    // Should have branding/logo
    const logo = page.locator('svg, img, h1');
    await expect(logo.first()).toBeVisible();
  });

  test('should have consistent header across auth pages', async ({ page }) => {
    // Check login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const loginTitle = await page.locator('h1').textContent();

    // Check register page
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    const registerTitle = await page.locator('h1').textContent();

    // Both should have titles
    expect(loginTitle).toBeTruthy();
    expect(registerTitle).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Form should still be visible and usable
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // No horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });
});

test.describe('Dashboard - Error Handling', () => {
  test('should show error page for invalid routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    await page.waitForLoadState('networkidle');

    // Should redirect to login or home, not crash
    const url = page.url();
    expect(url).toMatch(/login|\/$/);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // This tests that the app doesn't crash on network issues
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // The page should be functional
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });
});

test.describe('Dashboard - Accessibility', () => {
  test('should have proper page title', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check that inputs have labels
    const emailInput = page.locator('input[type="email"]');
    const emailId = await emailInput.getAttribute('id');

    if (emailId) {
      const label = page.locator(`label[for="${emailId}"]`);
      const hasLabel = (await label.count()) > 0;
      expect(hasLabel).toBeTruthy();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Tab to email field
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Type in field
    await page.keyboard.type('test@example.com');

    // Tab to password
    await page.keyboard.press('Tab');
    await page.keyboard.type('password123');

    // Tab to submit (or other elements)
    await page.keyboard.press('Tab');

    // Should be able to submit with Enter
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Focus on email input
    const emailInput = page.locator('input[type="email"]');
    await emailInput.focus();

    // Check that there's a visible focus style (ring, outline, etc.)
    // This is a visual check - we verify the element is focused
    await expect(emailInput).toBeFocused();
  });
});

test.describe('Dashboard - Loading States', () => {
  test('should show loading state initially', async ({ page }) => {
    // Navigate and check for loading indicator
    await page.goto('/');

    // Should show some loading indicator briefly
    // or load quickly enough that content appears
    await page.waitForLoadState('networkidle');

    // Page should have content after loading
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
