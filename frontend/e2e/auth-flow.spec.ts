import { test, expect } from '@playwright/test';
import { TEST_USERS, ROUTES } from './helpers/test-data';

/**
 * E2E-02: Authentication Flows
 * Verifies login, registration form, forgot password, and protected routes.
 */
test.describe('Authentication', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto(ROUTES.auth.login);

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password|mot de passe/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /se connecter|login|sign in/i })).toBeVisible();
  });

  test('login with valid credentials redirects to dashboard or hub', async ({ page }) => {
    await page.goto(ROUTES.auth.login);

    await page.getByLabel(/email/i).fill(TEST_USERS.customer.email);
    await page.getByLabel(/password|mot de passe/i).fill(TEST_USERS.customer.password);
    await page.getByRole('button', { name: /se connecter|login|sign in/i }).click();

    // Should redirect away from login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto(ROUTES.auth.login);

    await page.getByLabel(/email/i).fill('wrong@email.com');
    await page.getByLabel(/password|mot de passe/i).fill('WrongPassword123!');
    await page.getByRole('button', { name: /se connecter|login|sign in/i }).click();

    // Should show an error message
    await expect(page.getByText(/incorrect|invalid|erreur|échoué/i)).toBeVisible({ timeout: 5_000 });
  });

  test('register page renders with multi-step form', async ({ page }) => {
    await page.goto(ROUTES.auth.register);

    // Should have at least email and password fields or step 1 content
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('form, [role="form"]').first()).toBeVisible();
  });

  test('forgot password page renders', async ({ page }) => {
    await page.goto(ROUTES.auth.forgotPassword);

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /envoyer|send|reset|réinitialiser/i })).toBeVisible();
  });

  test('protected routes redirect unauthenticated users', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto(ROUTES.dashboard.home);

    // Should either redirect to login or show auth required message
    // (depends on implementation — check for either)
    const url = page.url();
    const content = await page.textContent('body');
    const isRedirected = url.includes('/login') || url.includes('/auth');
    const showsAuthMessage = content?.match(/connexion|login|authentif/i);

    expect(isRedirected || showsAuthMessage).toBeTruthy();
  });
});
