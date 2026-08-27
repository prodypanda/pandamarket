import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../config', () => ({
  config: {
    metricsEnabled: true,
    metricsSecret: 'metrics_super_secret_key',
    hubDomain: 'pandamarket.tn',
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { mockIsDomainTlsAllowed } = vi.hoisted(() => ({
  mockIsDomainTlsAllowed: vi.fn(),
}));

vi.mock('../services/domain-verification.service', () => ({
  domainVerificationService: {
    isDomainTlsAllowed: mockIsDomainTlsAllowed,
  },
}));

import { metricsRouter } from '../utils/metrics';
import internalRouter from '../api/internal.route';

describe('PLAN-B-20: Public Metrics Protection & TLS Oracle Fix', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(metricsRouter());
    app.use('/api/pd/internal', internalRouter);
  });

  describe('GET /metrics', () => {
    it('rejects unauthenticated requests with 401 when metricsSecret is configured', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized metrics access');
    });

    it('allows scraping with valid Bearer token', async () => {
      const res = await request(app)
        .get('/metrics')
        .set('Authorization', 'Bearer metrics_super_secret_key');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
    });
  });

  describe('GET /api/pd/internal/tls-allowed', () => {
    it('returns allowed: true without leaking store_id for verified custom domains', async () => {
      mockIsDomainTlsAllowed.mockResolvedValueOnce(true);

      const res = await request(app).get('/api/pd/internal/tls-allowed?domain=custom-merchant.com');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ allowed: true });
      expect(res.body.store_id).toBeUndefined();
    });

    it('returns 404 for unverified domains', async () => {
      mockIsDomainTlsAllowed.mockResolvedValueOnce(false);

      const res = await request(app).get('/api/pd/internal/tls-allowed?domain=malicious-domain.com');

      expect(res.status).toBe(404);
      expect(res.body.allowed).toBe(false);
    });
  });
});
