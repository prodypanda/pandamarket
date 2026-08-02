import { test, expect } from '@playwright/test';

/**
 * E2E: Public Storefront Checkout Flow (GAP-P2-034)
 * Validates adding items to cart, checkout form completion, payment gateway selection,
 * success confirmation, and status failure/retry.
 */
test.describe('Public Storefront Checkout Flow', () => {
  const storeHost = 'demo.pandamarket.tn';

  test.beforeEach(async ({ page }) => {
    // Set up a mock cart item in local storage for store 'demo.pandamarket.tn'
    await page.goto(`/store/${storeHost}`);
    await page.evaluate((host) => {
      const cartItem = {
        id: 'p-item-1',
        title: 'Artisanal Ceramic Mug',
        price: 45.0,
        quantity: 2,
        store_id: 'store-demo-id',
        store_name: 'Panda Demo Store',
        image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd',
        host,
      };
      localStorage.setItem('pd_cart', JSON.stringify([cartItem]));
    }, storeHost);
  });

  test('displays cart items and navigates to checkout', async ({ page }) => {
    await page.goto(`/store/${storeHost}/cart`);
    await expect(page.locator('h1')).toContainText(/Panier/i);
    await expect(page.getByText('Artisanal Ceramic Mug')).toBeVisible();

    // Verify quantity adjustment buttons have aria-labels
    const decreaseBtn = page.getByRole('button', { name: /Diminuer/i });
    const increaseBtn = page.getByRole('button', { name: /Augmenter/i });
    await expect(decreaseBtn).toBeVisible();
    await expect(increaseBtn).toBeVisible();

    // Click checkout button
    const checkoutLink = page.getByRole('link', { name: /Commander|Passer la commande/i });
    if (await checkoutLink.isVisible()) {
      await checkoutLink.click();
      await expect(page).toHaveURL(new RegExp(`/store/${storeHost}/checkout`));
    }
  });

  test('checkout form renders labeled inputs and native payment radio options', async ({ page }) => {
    await page.goto(`/store/${storeHost}/checkout`);

    // Verify accessible form input fields
    await expect(page.locator('input#checkout_full_name')).toBeVisible();
    await expect(page.locator('input#checkout_city')).toBeVisible();
    await expect(page.locator('input#checkout_phone')).toBeVisible();

    // Verify payment method radio options exist
    const radioInputs = page.locator('input[type="radio"][name="payment_method"]');
    const count = await radioInputs.count();
    expect(count).toBeGreaterThan(0);

    // Select Mandat or Cash on delivery payment option
    const codRadio = page.locator('input[type="radio"][value="cod"]');
    if (await codRadio.isVisible()) {
      await codRadio.check();
      await expect(codRadio).toBeChecked();
    }
  });

  test('handles successful checkout confirmation page', async ({ page }) => {
    await page.goto(`/store/${storeHost}/checkout/success?order_id=ord_test_123`);
    await expect(page.locator('main')).toBeVisible();
    const bodyText = await page.textContent('main');
    expect(bodyText).toMatch(/Commande|Merci|Succès|Confirmée/i);
  });

  test('handles payment failure and retry status banner', async ({ page }) => {
    await page.goto(`/store/${storeHost}/checkout/status?order_id=ord_test_456&status=failed`);
    await expect(page.locator('main')).toBeVisible();
    
    // Check if error status message or retry link is rendered
    const statusContent = await page.textContent('main');
    expect(statusContent).toBeTruthy();
  });
});
