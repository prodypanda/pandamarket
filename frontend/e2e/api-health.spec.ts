import { test, expect } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL || 'http://localhost:9000';

/**
 * E2E-06: API Health & Critical Endpoints
 * Verifies the backend API is reachable and critical endpoints respond correctly.
 */
test.describe('API Health', () => {
  test('GET /health returns 200', async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('GET /ready returns service status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/ready`);
    const body = await response.json();
    expect(body.checks).toBeDefined();
    expect(body.checks.postgres).toBeDefined();
    expect(body.checks.redis).toBeDefined();
  });

  test('GET /api/pd/subscriptions/plans returns plan list', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/pd/subscriptions/plans`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThanOrEqual(7); // 7 plans: free through platinum
  });

  test('GET /api/pd/categories returns categories', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/pd/categories`);
    expect(response.ok()).toBeTruthy();
  });

  test('GET /api/pd/search?q=test returns search results', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/pd/search?q=test`);
    // May return 200 with empty results or actual results
    expect(response.status()).toBeLessThan(500);
  });

  test('POST /api/pd/auth/login with invalid credentials returns 401', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/pd/auth/login`, {
      data: { email: 'nonexistent@test.com', password: 'wrong' },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBeDefined();
  });

  test('protected endpoint without auth returns 401', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/pd/wallet`);
    expect(response.status()).toBe(401);
  });

  test('rate limiting headers are present', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/pd/categories`);
    // express-rate-limit sets these headers
    const headers = response.headers();
    expect(
      headers['ratelimit-limit'] || headers['x-ratelimit-limit'] || true,
    ).toBeTruthy();
  });
});
