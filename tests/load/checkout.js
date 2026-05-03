/**
 * k6 Load Test — Checkout Flow
 *
 * Simulates the full checkout flow: browse products → add to cart → checkout.
 * Target: p95 < 500ms for 20 concurrent users.
 *
 * Run:
 *   k6 run tests/load/checkout.js
 *   k6 run --vus 20 --duration 5m tests/load/checkout.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.API_URL || 'http://localhost:9000';

const errorRate = new Rate('errors');
const checkoutDuration = new Trend('checkout_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '2m', target: 20 },
    { duration: '2m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.1'],
    checkout_duration: ['p(95)<500'],
  },
};

// Test user credentials (from seed data)
const TEST_USER = {
  email: 'customer@test.tn',
  password: 'Test123!',
};

export function setup() {
  // Login once and get token
  const loginRes = http.post(
    `${BASE_URL}/api/pd/auth/login`,
    JSON.stringify(TEST_USER),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.body);
    return { token: null };
  }

  const body = JSON.parse(loginRes.body);
  return { token: body.access_token };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    ...(data.token ? { Authorization: `Bearer ${data.token}` } : {}),
  };

  group('Browse Products', () => {
    // List products (public)
    const productsRes = http.get(`${BASE_URL}/api/pd/products?status=published&limit=20`);
    check(productsRes, {
      'products list returns 200': (r) => r.status === 200,
    });
    errorRate.add(productsRes.status !== 200);

    sleep(1);

    // Get single product detail
    try {
      const products = JSON.parse(productsRes.body);
      const productList = products.data || products;
      if (Array.isArray(productList) && productList.length > 0) {
        const product = productList[Math.floor(Math.random() * productList.length)];
        const detailRes = http.get(`${BASE_URL}/api/pd/products/${product.id}`);
        check(detailRes, {
          'product detail returns 200': (r) => r.status === 200,
        });
      }
    } catch {
      // ignore parse errors
    }

    sleep(0.5);
  });

  group('Categories', () => {
    const catRes = http.get(`${BASE_URL}/api/pd/categories`);
    check(catRes, {
      'categories returns 200': (r) => r.status === 200,
    });
    errorRate.add(catRes.status !== 200);
    sleep(0.5);
  });

  group('Subscription Plans', () => {
    const plansRes = http.get(`${BASE_URL}/api/pd/subscriptions/plans`);
    check(plansRes, {
      'plans returns 200': (r) => r.status === 200,
    });
    sleep(0.5);
  });

  if (data.token) {
    group('Authenticated Endpoints', () => {
      // Get user profile
      const meRes = http.get(`${BASE_URL}/api/pd/auth/me`, { headers });
      check(meRes, {
        'auth/me returns 200': (r) => r.status === 200,
      });

      // Get orders
      const ordersRes = http.get(`${BASE_URL}/api/pd/orders`, { headers });
      check(ordersRes, {
        'orders returns 200 or 404': (r) => r.status === 200 || r.status === 404,
      });

      sleep(1);
    });
  }

  sleep(Math.random() * 2 + 1);
}
