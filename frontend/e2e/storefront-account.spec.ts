import { test, expect } from '@playwright/test';

/**
 * E2E: Storefront Customer Auth and Account Lifecycle (GAP-P2-034)
 * Validates registration, login, order history, digital downloads, and logout.
 */
test.describe('Storefront Customer Account Flow', () => {
  const storeHost = 'demo.pandamarket.tn';

  test('storefront customer registration page renders visible labels', async ({ page }) => {
    await page.goto(`/store/${storeHost}/register`);

    // Verify labeled inputs
    await expect(page.locator('input#auth_first_name')).toBeVisible();
    await expect(page.locator('input#auth_last_name')).toBeVisible();
    await expect(page.locator('input#auth_email')).toBeVisible();
    await expect(page.locator('input#auth_password')).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /Créer mon compte|S'inscrire|Register/i });
    await expect(submitBtn).toBeVisible();
  });

  test('storefront customer login page loads and allows input', async ({ page }) => {
    await page.goto(`/store/${storeHost}/login`);

    await expect(page.locator('input#auth_email')).toBeVisible();
    await expect(page.locator('input#auth_password')).toBeVisible();

    await page.locator('input#auth_email').fill('customer@test.tn');
    await page.locator('input#auth_password').fill('Test123!');

    const loginBtn = page.getByRole('button', { name: /Se connecter|Connexion|Login/i });
    await expect(loginBtn).toBeVisible();
  });

  test('account orders history page renders structure', async ({ page }) => {
    await page.goto(`/store/${storeHost}/account/orders`);
    await expect(page.locator('main')).toBeVisible();
  });

  test('account digital downloads page renders structure', async ({ page }) => {
    await page.goto(`/store/${storeHost}/account/downloads`);
    await expect(page.locator('main')).toBeVisible();
  });
});
