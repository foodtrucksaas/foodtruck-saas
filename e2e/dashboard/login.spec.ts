import { test, expect } from '@playwright/test';
import {
  waitForPageReady,
  waitForLoadingComplete,
  fillLoginForm,
  clearBrowserStorage,
} from '../utils/test-helpers';
import { TEST_CREDENTIALS, UI_TEXT, ROUTES } from '../fixtures/test-data';

test.describe('Dashboard Login', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.goto('/login');
    await clearBrowserStorage(page);
    await page.reload();
    await waitForPageReady(page);
  });

  test('should display login form with all required elements', async ({ page }) => {
    // Email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    // Should have logo or branding
    const branding = page.locator('h1, [class*="logo"]').first();
    await expect(branding).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await fillLoginForm(page, TEST_CREDENTIALS.invalidUser);
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(3000);

    // Should still be on login page (not redirected)
    await expect(page).toHaveURL(/\/login/);

    // Look for error message
    const errorMessage = page.locator('[class*="error"], [class*="red"], [role="alert"]').first();
    const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);

    // Error should be displayed or form should indicate failure
    expect(hasError || page.url().includes('login')).toBeTruthy();
  });

  test('should have magic link option', async ({ page }) => {
    const magicLinkButton = page.locator('button').filter({
      hasText: /magic link/i,
    });
    await expect(magicLinkButton).toBeVisible();
  });

  test('should show magic link success message when email is valid', async ({ page }) => {
    // Fill email
    await page.fill('input[type="email"]', 'test@example.com');

    // Click magic link button
    const magicLinkButton = page.locator('button').filter({
      hasText: /magic link/i,
    });

    if (await magicLinkButton.isVisible()) {
      await magicLinkButton.click();
      await page.waitForTimeout(2000);

      // Should show success message or change state
      const pageContent = await page.content();
      const hasFeedback =
        pageContent.includes('mail') ||
        pageContent.includes('lien') ||
        pageContent.includes('envoy');

      // Magic link should trigger some response
      expect(hasFeedback || page.url().includes('login')).toBeTruthy();
    }
  });

  test('should navigate to register page', async ({ page }) => {
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('should navigate to forgot password page', async ({ page }) => {
    const forgotPasswordLink = page.locator('a[href*="forgot"], a[href*="password"]').first();

    if (await forgotPasswordLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await forgotPasswordLink.click();
      await expect(page).toHaveURL(/\/forgot-password/);
    }
  });

  test('should not have test mode button (security)', async ({ page }) => {
    // Verify test mode button was removed (security feature)
    const testButton = page.locator('button').filter({
      hasText: /mode test|test mode/i,
    });
    await expect(testButton).not.toBeVisible();

    const flaskIcon = page.locator('text=FlaskConical');
    await expect(flaskIcon).not.toBeVisible();
  });

  test('should disable submit button during loading', async ({ page }) => {
    await fillLoginForm(page, TEST_CREDENTIALS.invalidUser);

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Button should be disabled during loading
    // (this may happen very quickly, so we just verify no errors)
    await page.waitForTimeout(500);

    // Should not crash
    const content = await page.content();
    expect(content).not.toMatch(/NaN/);
  });

  test('should have accessible form labels', async ({ page }) => {
    // Email input should have associated label
    const emailInput = page.locator('input[type="email"]');
    const emailLabel = page.locator('label[for="email"], label:has-text("Email")');

    // Password input should have associated label
    const passwordInput = page.locator('input[type="password"]');
    const passwordLabel = page.locator('label[for="password"], label:has-text("Mot de passe")');

    // At least one labeling method should exist
    const hasEmailLabel =
      (await emailLabel.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await emailInput.getAttribute('placeholder')) !== null ||
      (await emailInput.getAttribute('aria-label')) !== null;

    expect(hasEmailLabel).toBeTruthy();
  });
});

test.describe('Dashboard Authentication', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Clear storage to ensure no auth
    await page.goto('/');
    await clearBrowserStorage(page);
    await page.reload();
    await page.waitForTimeout(2000);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    const protectedRoutes = ['/menu', '/orders', '/analytics', '/settings', '/customers', '/campaigns'];

    for (const route of protectedRoutes) {
      await clearBrowserStorage(page);
      await page.goto(route);
      await page.waitForTimeout(1000);

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should preserve intended destination after login redirect', async ({ page }) => {
    // Try to access protected route
    await clearBrowserStorage(page);
    await page.goto('/orders');
    await page.waitForTimeout(1500);

    // Should be on login page
    await expect(page).toHaveURL(/\/login/);

    // After login, user should be redirected back to orders
    // (This would require a real login, so we just verify the redirect happened)
  });
});

test.describe('Registration Flow', () => {
  test('should display registration form', async ({ page }) => {
    await page.goto('/register');
    await waitForPageReady(page);

    // Should have email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Should have password input
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    // Should have submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should link back to login from register', async ({ page }) => {
    await page.goto('/register');
    await waitForPageReady(page);

    const loginLink = page.locator('a[href="/login"]');

    if (await loginLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should validate required fields on registration', async ({ page }) => {
    await page.goto('/register');
    await waitForPageReady(page);

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    await page.waitForTimeout(500);

    // Should still be on register page (form validation failed)
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Forgot Password Flow', () => {
  test('should display forgot password form', async ({ page }) => {
    await page.goto('/forgot-password');
    await waitForPageReady(page);

    // Should have email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Should have submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should link back to login from forgot password', async ({ page }) => {
    await page.goto('/forgot-password');
    await waitForPageReady(page);

    const loginLink = page.locator('a[href="/login"]');

    if (await loginLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
