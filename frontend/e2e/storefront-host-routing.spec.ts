import { test, expect } from '@playwright/test';

/**
 * E2E: Storefront Host Routing and Domain Resolution (GAP-P2-034)
 * Validates store resolution via subdomains, custom domains, and path params.
 */
test.describe('Storefront Host Routing', () => {
  test('resolves store storefront via store host path parameter', async ({ page }) => {
    await page.goto('/store/demo.pandamarket.tn');
    await expect(page.locator('main')).toBeVisible();

    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('resolves custom domain host header requests', async ({ page }) => {
    // Set custom host header request
    await page.setExtraHTTPHeaders({
      'x-forwarded-host': 'boutique.custom-domain.tn',
    });

    await page.goto('/store/boutique.custom-domain.tn');
    await expect(page.locator('main')).toBeVisible();
  });
});
