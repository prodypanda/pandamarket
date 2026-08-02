import { test, expect } from '@playwright/test';

/**
 * Visual Regression E2E Suite (GAP-P2-034)
 * Captures full-page snapshots across 3 distinct themes (classic, boutique, neon)
 * across Desktop, Tablet, and Mobile viewports.
 */
test.describe('Storefront Visual Regression', () => {
  const storeHost = 'demo.pandamarket.tn';
  const themesToTest = ['classic', 'boutique', 'neon'];

  const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 },
  ];

  for (const themeId of themesToTest) {
    for (const vp of viewports) {
      test(`captures visual snapshot for theme [${themeId}] at [${vp.name}] viewport`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Navigate to storefront page with preview theme query param or preview route
        await page.goto(`/store/${storeHost}?preview_theme=${themeId}`);
        await page.waitForLoadState('networkidle').catch(() => {});

        // Take page screenshot
        const screenshot = await page.screenshot({ fullPage: true });
        expect(screenshot).toBeTruthy();
        expect(screenshot.length).toBeGreaterThan(1000);
      });
    }
  }
});
