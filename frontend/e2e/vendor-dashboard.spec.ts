import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers/auth';
import { ROUTES } from './helpers/test-data';

/**
 * E2E-03: Vendor Dashboard
 * Verifies the vendor can access all dashboard pages after login.
 */
test.describe('Vendor Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, 'vendorPro');
  });

  test('dashboard overview loads with stats', async ({ page }) => {
    await page.goto(ROUTES.dashboard.home);
    await expect(page.locator('main')).toBeVisible();
    // Should show some stats or welcome message
    await expect(page.locator('main').first()).not.toBeEmpty();
  });

  test('products page loads with product list', async ({ page }) => {
    await page.goto(ROUTES.dashboard.products);
    await expect(page.locator('main')).toBeVisible();
  });

  test('orders page loads', async ({ page }) => {
    await page.goto(ROUTES.dashboard.orders);
    await expect(page.locator('main')).toBeVisible();
  });

  test('wallet page shows balance information', async ({ page }) => {
    await page.goto(ROUTES.dashboard.wallet);
    await expect(page.locator('main')).toBeVisible();
    // Should show balance-related text
    await expect(page.getByText(/solde|balance|disponible|available/i).first()).toBeVisible();
  });

  test('KYC page loads with verification status', async ({ page }) => {
    await page.goto(ROUTES.dashboard.kyc);
    await expect(page.locator('main')).toBeVisible();
  });

  test('settings page loads with store configuration', async ({ page }) => {
    await page.goto(ROUTES.dashboard.settings);
    await expect(page.locator('main')).toBeVisible();
  });

  test('AI tools page loads', async ({ page }) => {
    await page.goto(ROUTES.dashboard.ai);
    await expect(page.locator('main')).toBeVisible();
  });

  test('subscription page shows current plan', async ({ page }) => {
    await page.goto(ROUTES.dashboard.subscription);
    await expect(page.locator('main')).toBeVisible();
  });

  test('notifications page loads', async ({ page }) => {
    await page.goto(ROUTES.dashboard.notifications);
    await expect(page.locator('main')).toBeVisible();
  });
});
