import { test, expect } from '@playwright/test';

test.describe('Dashboard Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error toast or message
    await page.waitForTimeout(2000);

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should have magic link option', async ({ page }) => {
    const magicLinkButton = page.locator('button:has-text("magic link")');
    await expect(magicLinkButton).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('should not have test mode button (security)', async ({ page }) => {
    // Verify test mode button was removed
    const testButton = page.locator('button:has-text("Mode test")');
    await expect(testButton).not.toBeVisible();

    const flaskIcon = page.locator('text=FlaskConical');
    await expect(flaskIcon).not.toBeVisible();
  });
});

test.describe('Dashboard Authentication', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('http://localhost:5174/');
    await page.waitForTimeout(1000);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    const protectedRoutes = ['/menu', '/orders', '/analytics', '/settings'];

    for (const route of protectedRoutes) {
      await page.goto(`http://localhost:5174${route}`);
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
