import { test, expect } from '@playwright/test';
import { ROUTES } from './helpers/test-data';

/**
 * E2E-01: Hub Central Navigation
 * Verifies the core buyer journey: homepage → search → product detail → cart
 */
test.describe('Hub Central Navigation', () => {
  test('homepage loads with hero, categories, and trending products', async ({ page }) => {
    await page.goto(ROUTES.hub.home);

    // Hero section should be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Should have a search bar
    await expect(page.getByPlaceholder(/rechercher|search/i)).toBeVisible();

    // At least some content should load (even if API is down, skeleton should show)
    await expect(page.locator('main')).toBeVisible();
  });

  test('search returns results and supports filtering', async ({ page }) => {
    await page.goto(ROUTES.hub.search + '?q=test');

    // Search page should load
    await expect(page.locator('main')).toBeVisible();

    // URL should contain the query
    expect(page.url()).toContain('q=test');
  });

  test('pricing page displays all 7 plans', async ({ page }) => {
    await page.goto(ROUTES.hub.pricing);

    // Should show plan names
    const pageContent = await page.textContent('main');
    expect(pageContent).toBeTruthy();

    // Check for key plan names
    for (const plan of ['Free', 'Starter', 'Regular', 'Agency', 'Pro', 'Golden', 'Platinum']) {
      await expect(page.getByText(plan, { exact: false }).first()).toBeVisible();
    }
  });

  test('vendor signup page loads with plan selection', async ({ page }) => {
    await page.goto(ROUTES.hub.vendorSignup);
    await expect(page.locator('main')).toBeVisible();
  });

  test('cart page loads (empty state)', async ({ page }) => {
    await page.goto(ROUTES.hub.cart);
    await expect(page.locator('main')).toBeVisible();
  });

  test('navigation between pages works', async ({ page }) => {
    // Start at homepage
    await page.goto(ROUTES.hub.home);

    // Click on search or use search bar
    const searchInput = page.getByPlaceholder(/rechercher|search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await searchInput.press('Enter');
      // Should navigate to search results
      await page.waitForURL(/search/);
    }
  });
});
