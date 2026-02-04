import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for FoodTruck SaaS
 *
 * Projects:
 * - client: Client PWA tests (http://localhost:5173)
 * - dashboard: Dashboard tests (http://localhost:5174)
 * - mobile: Mobile viewport tests for PWA
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    // Base configuration
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    // Default timeouts
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    // Client PWA - Desktop Chrome
    {
      name: 'client',
      testDir: './e2e/client',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
      },
    },
    // Client PWA - Mobile Safari (iPhone)
    {
      name: 'client-mobile',
      testDir: './e2e/client',
      use: {
        ...devices['iPhone 14'],
        baseURL: 'http://localhost:5173',
      },
    },
    // Dashboard - Desktop Chrome
    {
      name: 'dashboard',
      testDir: './e2e/dashboard',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5174',
      },
    },
    // Dashboard - Tablet (iPad)
    {
      name: 'dashboard-tablet',
      testDir: './e2e/dashboard',
      use: {
        ...devices['iPad Pro 11'],
        baseURL: 'http://localhost:5174',
      },
    },
  ],
  // Only start dev servers if not running against a remote URL
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: 'pnpm dev:client',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
        {
          command: 'pnpm dev:dashboard',
          url: 'http://localhost:5174',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
      ],
});
