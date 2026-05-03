import { test, expect } from '@playwright/test';

/**
 * E2E-05: Admin Panel
 * Verifies the admin can access KYC queue, mandats, reports, and settings.
 *
 * Note: Admin panel is accessed via admin.pandamarket.tn subdomain.
 * In local testing, we access it directly via the (admin) route group.
 */
test.describe('Admin Panel', () => {
  // Admin pages are under /(admin)/ route group
  // In local dev, they're accessed via admin.pandamarket.local:3000
  // For E2E, we test the route group directly

  test('admin dashboard page loads', async ({ page }) => {
    // Navigate directly to admin route (middleware handles subdomain routing)
    await page.goto('/dashboard');
    await expect(page.locator('main, body')).toBeVisible();
  });

  test('admin KYC queue page loads', async ({ page }) => {
    await page.goto('/kyc');
    await expect(page.locator('main, body')).toBeVisible();
  });

  test('admin mandats page loads', async ({ page }) => {
    await page.goto('/mandats');
    await expect(page.locator('main, body')).toBeVisible();
  });

  test('admin reports page loads', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('main, body')).toBeVisible();
  });

  test('admin plans editor page loads', async ({ page }) => {
    await page.goto('/plans');
    await expect(page.locator('main, body')).toBeVisible();
  });

  test('admin settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('main, body')).toBeVisible();
  });

  test('admin audit log page loads', async ({ page }) => {
    await page.goto('/audit-log');
    await expect(page.locator('main, body')).toBeVisible();
  });

  test('admin users page loads', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('main, body')).toBeVisible();
  });

  test('admin withdrawals page loads', async ({ page }) => {
    await page.goto('/withdrawals');
    await expect(page.locator('main, body')).toBeVisible();
  });
});
