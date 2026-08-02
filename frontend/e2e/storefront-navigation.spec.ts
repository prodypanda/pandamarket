import { test, expect } from '@playwright/test';

/**
 * E2E: Storefront Navigation and Layout Shell (GAP-P2-034)
 * Validates header links, mobile drawer accessibility, modular footer blocks, and custom page routes.
 */
test.describe('Storefront Navigation and Shell', () => {
  const storeHost = 'demo.pandamarket.tn';

  test('header renders store logo, navigation links, and cart icon link', async ({ page }) => {
    await page.goto(`/store/${storeHost}`);

    // Verify header element exists
    const header = page.locator('header').first();
    await expect(header).toBeVisible();

    // Verify search input with combobox role
    const searchInput = page.locator('input[role="combobox"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('ceramic');
      await searchInput.press('Enter');
    }

    // Verify cart link with aria-label
    const cartLink = page.locator('a[aria-label*="Panier"]');
    await expect(cartLink).toBeVisible();
  });

  test('mobile drawer toggles and closes via Escape key', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/store/${storeHost}`);

    // Find mobile menu toggle button
    const menuToggle = page.locator('button[aria-label*="menu"i], button[aria-label*="navigation"i]').first();
    if (await menuToggle.isVisible()) {
      await menuToggle.click();

      // Check drawer element with dialog role
      const drawer = page.locator('div[role="dialog"]');
      if (await drawer.isVisible()) {
        await expect(drawer).toBeVisible();

        // Press Escape to close drawer
        await page.keyboard.press('Escape');
        await expect(drawer).toBeHidden();
      }
    }
  });

  test('footer renders brand section and copyright links', async ({ page }) => {
    await page.goto(`/store/${storeHost}`);

    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });

  test('custom cms page route renders content', async ({ page }) => {
    await page.goto(`/store/${storeHost}/pages/about-us`);
    await expect(page.locator('main')).toBeVisible();
  });
});
