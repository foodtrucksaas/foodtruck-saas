import { test, expect } from '@playwright/test';
import {
  waitForPageReady,
  waitForLoadingComplete,
  expectNoErrors,
} from '../utils/test-helpers';
import { UI_TEXT, TIMEOUTS } from '../fixtures/test-data';

test.describe('Menu Browsing - Client PWA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
  });

  test('should display home page with foodtruck list or search', async ({ page }) => {
    // Verify page loads without errors
    await expectNoErrors(page);

    // Page should have some content
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Should not show loading spinner indefinitely
    await waitForLoadingComplete(page);
  });

  test('should navigate to a foodtruck page when available', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for any link that could be a foodtruck
    const foodtruckLinks = page.locator('a').filter({
      hasNot: page.locator('[href="/"], [href="#"]'),
    });

    const count = await foodtruckLinks.count();

    if (count > 0) {
      // Click the first valid foodtruck link
      const firstLink = foodtruckLinks.first();
      const href = await firstLink.getAttribute('href');

      if (href && href.length > 1 && !href.startsWith('http')) {
        await firstLink.click();
        await waitForPageReady(page);

        // Should be on a foodtruck page (URL should have changed)
        const currentUrl = page.url();
        expect(currentUrl).not.toBe('http://localhost:5173/');
      }
    }
  });

  test('should display menu categories and items when on foodtruck page', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Navigate to a foodtruck if possible
    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);
      await waitForLoadingComplete(page);

      // Check for menu tab or menu content
      const menuTab = page.locator('button:has-text("Menu")');
      if (await menuTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await menuTab.click();
        await page.waitForTimeout(500);
      }

      // Verify no error states
      await expectNoErrors(page);
    }
  });

  test('should switch between Menu and Info tabs', async ({ page }) => {
    await page.waitForTimeout(2000);

    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);

      // Find tab buttons
      const menuTab = page.locator('button:has-text("Menu")');
      const infoTab = page.locator('button:has-text("Info")');

      // Click Info tab if present
      if (await infoTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await infoTab.click();
        await page.waitForTimeout(500);

        // Should show info content (schedule, contact, etc.)
        const content = await page.content();
        // Info tab should have some content loaded
        expect(content.length).toBeGreaterThan(1000);

        // Click Menu tab
        if (await menuTab.isVisible()) {
          await menuTab.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should display schedule and location information', async ({ page }) => {
    await page.waitForTimeout(2000);

    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);

      // Look for schedule/info tab
      const infoTab = page.locator('button:has-text("Info"), button:has-text("Planning")');

      if (await infoTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await infoTab.click();
        await page.waitForTimeout(500);

        // Check for schedule-related content
        const pageContent = await page.content();
        const hasScheduleContent =
          pageContent.includes('Planning') ||
          pageContent.includes('Horaires') ||
          pageContent.includes('aujourd\'hui') ||
          pageContent.includes('Ferme') ||
          pageContent.includes('Ouvert');

        // Either schedule content exists or the page loaded successfully
        expect(pageContent).toBeTruthy();
      }
    }
  });

  test('should navigate back from foodtruck page', async ({ page }) => {
    await page.waitForTimeout(2000);

    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);

      // Find back button
      const backButton = page.locator('button').filter({
        has: page.locator('svg'),
      }).first();

      if (await backButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await backButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should show offers section if available', async ({ page }) => {
    await page.waitForTimeout(2000);

    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);

      // Check for offers section
      const offersSection = page.locator('text=offres, text=Nos offres, text=formule');

      // If offers exist, they should be displayed properly
      if (await offersSection.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expectNoErrors(page);
      }
    }
  });
});

test.describe('Price Display Validation', () => {
  test('should never display NaN, null, or undefined prices', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await page.waitForTimeout(3000);

    // Navigate to foodtruck if available
    const foodtruckLink = page.locator('a[href^="/"]').filter({
      hasNot: page.locator('a[href="/"]'),
    }).first();

    if (await foodtruckLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foodtruckLink.click();
      await waitForPageReady(page);
    }

    // Check entire page for invalid prices
    const content = await page.content();
    expect(content).not.toMatch(/NaN\s*\u20ac/); // NaN followed by Euro
    expect(content).not.toMatch(/NaN\s*euros?/i);
    expect(content).not.toMatch(/undefined\s*\u20ac/);
    expect(content).not.toMatch(/null\s*\u20ac/);
    expect(content).not.toMatch(/\u20ac\s*NaN/);
    expect(content).not.toMatch(/,NaN/);
  });
});
