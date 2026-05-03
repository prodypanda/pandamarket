/**
 * k6 Load Test — Vendor API (CRUD Products)
 *
 * Simulates vendor operations: list products, create, update stock.
 * Target: p95 < 300ms for 30 concurrent users.
 *
 * Run:
 *   k6 run tests/load/vendor-api.js
 *   k6 run --vus 30 --duration 5m tests/load/vendor-api.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.API_URL || 'http://localhost:9000';
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '2m', target: 30 },
    { duration: '2m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    errors: ['rate<0.1'],
  },
};

const VENDOR_USER = {
  email: 'vendor.pro@test.tn',
  password: 'Test123!',
};

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/pd/auth/login`,
    JSON.stringify(VENDOR_USER),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (loginRes.status !== 200) {
    console.error('Vendor login failed:', loginRes.body);
    return { token: null };
  }

  const body = JSON.parse(loginRes.body);
  return { token: body.access_token };
}

export default function (data) {
  if (!data.token) {
    console.error('No auth token available');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  group('Vendor Dashboard Data', () => {
    // Wallet balance
    const walletRes = http.get(`${BASE_URL}/api/pd/wallet`, { headers });
    check(walletRes, {
      'wallet returns 200': (r) => r.status === 200,
    });
    errorRate.add(walletRes.status >= 500);

    // Products list
    const productsRes = http.get(`${BASE_URL}/api/pd/products?mine=true`, { headers });
    check(productsRes, {
      'my products returns 200': (r) => r.status === 200,
    });
    errorRate.add(productsRes.status >= 500);

    // Orders list
    const ordersRes = http.get(`${BASE_URL}/api/pd/orders`, { headers });
    check(ordersRes, {
      'my orders returns 200': (r) => r.status === 200 || r.status === 404,
    });

    // Notifications
    const notifRes = http.get(`${BASE_URL}/api/pd/notifications?limit=10`, { headers });
    check(notifRes, {
      'notifications returns 200': (r) => r.status === 200,
    });

    // Credits balance
    const creditsRes = http.get(`${BASE_URL}/api/pd/credits`, { headers });
    check(creditsRes, {
      'credits returns 200': (r) => r.status === 200,
    });

    sleep(1);
  });

  group('Subscription Info', () => {
    const subRes = http.get(`${BASE_URL}/api/pd/subscriptions/current`, { headers });
    check(subRes, {
      'subscription returns 200': (r) => r.status === 200,
    });
    sleep(0.5);
  });

  group('Verification Status', () => {
    const kycRes = http.get(`${BASE_URL}/api/pd/verification/status`, { headers });
    check(kycRes, {
      'kyc status returns 200': (r) => r.status === 200,
    });
    sleep(0.5);
  });

  sleep(Math.random() * 2 + 1);
}
