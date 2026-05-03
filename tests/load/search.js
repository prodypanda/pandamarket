/**
 * k6 Load Test — Search Endpoint
 *
 * Tests the Meilisearch-backed search endpoint under load.
 * Target: p95 < 100ms for 100 concurrent users.
 *
 * Run:
 *   k6 run tests/load/search.js
 *   k6 run --vus 100 --duration 5m tests/load/search.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.API_URL || 'http://localhost:9000';

// Custom metrics
const errorRate = new Rate('errors');
const searchDuration = new Trend('search_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Hold at 100 users
    { duration: '1m', target: 50 },    // Ramp down to 50
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],  // 95th percentile < 200ms
    errors: ['rate<0.05'],                            // Error rate < 5%
    search_duration: ['p(95)<100'],                   // Search-specific: p95 < 100ms
  },
};

const SEARCH_QUERIES = [
  'chaussures',
  'téléphone',
  'robe',
  'laptop',
  'montre',
  'sac',
  'parfum',
  'casque',
  'clavier',
  'souris',
  'écran',
  'tablette',
  'chemise',
  'pantalon',
  'bijoux',
];

export default function () {
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

  // Search endpoint
  const searchRes = http.get(`${BASE_URL}/api/pd/search?q=${encodeURIComponent(query)}&limit=20`);
  searchDuration.add(searchRes.timings.duration);

  check(searchRes, {
    'search returns 200': (r) => r.status === 200,
    'search returns results array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.hits || body.results || body);
      } catch {
        return false;
      }
    },
    'search responds under 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(searchRes.status !== 200);

  // Suggest endpoint (autocomplete)
  const suggestRes = http.get(`${BASE_URL}/api/pd/search/suggest?q=${encodeURIComponent(query.slice(0, 3))}`);

  check(suggestRes, {
    'suggest returns 200': (r) => r.status === 200,
    'suggest responds under 100ms': (r) => r.timings.duration < 100,
  });

  errorRate.add(suggestRes.status !== 200);

  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s think time
}
