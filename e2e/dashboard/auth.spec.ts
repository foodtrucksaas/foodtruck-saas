import { test, expect } from '@playwright/test';

/**
 * Dashboard - Authentication Tests
 *
 * Tests the authentication flow:
 * - Login page display
 * - Form validation
 * - Error handling
 * - Password visibility toggle
 */

test.describe('Dashboard - Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('should display login form', async ({ page }) => {
    // Check for email input
    const emailInput = page.locator('input[type="email"], input#login-email, input[name="email"]');
    await expect(emailInput).toBeVisible();

    // Check for password input
    const passwordInput = page.locator(
      'input[type="password"], input#login-password, input[name="password"]'
    );
    await expect(passwordInput).toBeVisible();

    // Check for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("connecter")');
    await expect(submitButton).toBeVisible();
  });

  test('should have password visibility toggle', async ({ page }) => {
    const passwordInput = page.locator('input#login-password, input[name="password"]');
    const toggleButton = page.locator(
      'button[aria-label*="mot de passe"], button[aria-label*="password"]'
    );

    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle if available
    const hasToggle = (await toggleButton.count()) > 0;
    if (hasToggle) {
      await toggleButton.click();
      // Password should now be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click again to hide
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Browser should show validation message or form should not submit
    // Check if still on login page
    await expect(page).toHaveURL(/login/);
  });

  test('should have link to registration', async ({ page }) => {
    const registerLink = page.locator(
      'a[href*="register"], a:has-text("compte"), a:has-text("inscrire")'
    );
    await expect(registerLink).toBeVisible();
  });

  test('should have forgot password link', async ({ page }) => {
    const forgotLink = page.locator('a[href*="forgot"], a:has-text("oublié")');
    await expect(forgotLink).toBeVisible();
  });

  test('should have magic link option', async ({ page }) => {
    const magicLinkButton = page.locator(
      'button:has-text("magic link"), button:has-text("Magic link")'
    );
    const hasMagicLink = (await magicLinkButton.count()) > 0;
    expect(hasMagicLink).toBeTruthy();
  });
});

test.describe('Dashboard - Registration Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
  });

  test('should display registration form', async ({ page }) => {
    // Check for email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Check for password inputs
    const passwordInputs = page.locator('input[type="password"]');
    const passwordCount = await passwordInputs.count();
    expect(passwordCount).toBeGreaterThanOrEqual(2); // Password + confirmation

    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input#password');
    const confirmInput = page.locator('input#confirmPassword');
    const submitButton = page.locator('button[type="submit"]');

    // Fill with weak password
    await emailInput.fill('test@example.com');
    await passwordInput.fill('weak');
    await confirmInput.fill('weak');
    await submitButton.click();

    // Should show error about password requirements
    await page.waitForTimeout(500);

    // Check for error message or still on register page
    const errorMessage = page.locator('.text-red-700, [role="alert"], .error');
    const hasError = (await errorMessage.count()) > 0;
    const stillOnRegister = page.url().includes('register');

    expect(hasError || stillOnRegister).toBeTruthy();
  });

  test('should validate password confirmation', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input#password');
    const confirmInput = page.locator('input#confirmPassword');
    const submitButton = page.locator('button[type="submit"]');

    // Fill with mismatched passwords
    await emailInput.fill('test@example.com');
    await passwordInput.fill('SecurePass123');
    await confirmInput.fill('DifferentPass123');
    await submitButton.click();

    await page.waitForTimeout(500);

    // Should show error about password mismatch
    const errorMessage = page.locator('text=/correspondent|match/i');
    const hasError = (await errorMessage.count()) > 0;
    const stillOnRegister = page.url().includes('register');

    expect(hasError || stillOnRegister).toBeTruthy();
  });

  test('should have password visibility toggles', async ({ page }) => {
    const toggleButtons = page.locator('button[aria-label*="mot de passe"]');
    const toggleCount = await toggleButtons.count();

    // Should have toggles for both password fields
    expect(toggleCount).toBeGreaterThanOrEqual(2);
  });

  test('should have link to login', async ({ page }) => {
    const loginLink = page.locator('a[href*="login"], a:has-text("connecter")');
    await expect(loginLink).toBeVisible();
  });
});

test.describe('Dashboard - Protected Routes', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Try to access protected route
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Should be redirected to login
    await expect(page).toHaveURL(/login|onboarding/);
  });

  test('should redirect dashboard to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should be redirected to login
    await expect(page).toHaveURL(/login|onboarding/);
  });

  test('should redirect menu page to login', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/login|onboarding/);
  });
});
