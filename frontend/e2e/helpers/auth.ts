import { Page, expect } from '@playwright/test';
import { TEST_USERS, API_BASE } from './test-data';

type UserKey = keyof typeof TEST_USERS;

/**
 * Login via the UI login form.
 */
export async function loginViaUI(page: Page, userKey: UserKey): Promise<void> {
  const user = TEST_USERS[userKey];
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password|mot de passe/i).fill(user.password);
  await page.getByRole('button', { name: /se connecter|login|sign in/i }).click();
  // Wait for redirect away from login page
  await expect(page).not.toHaveURL(/\/login/);
}

/**
 * Login via API and set cookies/tokens for faster test setup.
 */
export async function loginViaAPI(page: Page, userKey: UserKey): Promise<string> {
  const user = TEST_USERS[userKey];
  const response = await page.request.post(`${API_BASE}/api/pd/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const accessToken = body.access_token;

  // Store the token in localStorage for the frontend to pick up
  await page.goto('/');
  await page.evaluate((token) => {
    localStorage.setItem('pd_access_token', token);
  }, accessToken);

  return accessToken;
}
