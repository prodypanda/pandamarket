import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { UserRole } from '@pandamarket/types';

vi.mock('../db/pool', () => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  transaction: vi.fn((cb: any) => cb({
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  })),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn((prefix: string) => `pd_${prefix}_test123`),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  childLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('../utils/sentry', () => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock('../services/system-log.service', () => ({
  systemLogService: {
    captureError: vi.fn(),
  },
}));

vi.mock('../config', () => ({
  config: {
    bcryptRounds: 4,
    env: 'test',
    s3: {
      bucketPrivate: 'test-bucket-private',
    },
  },
}));

vi.mock('../utils/s3', () => ({
  presignDownload: vi.fn().mockResolvedValue('https://s3.example.com/signed-download-url?token=abc123'),
}));

vi.mock('../utils/jwt', () => ({
  signAccessToken: vi.fn(() => 'mock_access_token_123'),
  verifyAccessToken: vi.fn((token: string) => {
    if (token === 'storeA_customer') {
      return { sub: 'sfcust_A', role: UserRole.Customer, store_id: 'store_A' };
    }
    if (token === 'storeB_customer') {
      return { sub: 'sfcust_B', role: UserRole.Customer, store_id: 'store_B' };
    }
    if (token === 'unauth_customer') {
      return { sub: 'sfcust_unauth', role: UserRole.Customer, store_id: 'store_A' };
    }
    throw new Error('Invalid token');
  }),
}));

vi.mock('../queues/email-queue', () => ({
  emailQueue: {
    add: vi.fn().mockResolvedValue(true),
  },
}));

import { query } from '../db/pool';
import storefrontAccountRouter from '../api/storefront-account.route';
import { errorHandler } from '../middlewares';

const mockedQuery = vi.mocked(query);

const app = express();
app.use(express.json());
app.use('/api/pd/storefront/account', storefrontAccountRouter);
app.use(errorHandler);

describe('Storefront Digital Downloads & Licenses (GAP-P1-008)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);
  });

  describe('GET /downloads (entitlements)', () => {
    it('rejects unauthenticated access', async () => {
      const res = await request(app)
        .get('/api/pd/storefront/account/downloads');

      expect(res.status).toBe(401);
    });

    it('returns entitlements for authenticated storefront customer', async () => {
      // 1. requireStorefrontCustomer middleware: is_active check
      mockedQuery.mockResolvedValueOnce({
        rows: [{ is_active: true }],
        rowCount: 1,
      } as any);
      // 2. Entitlements query
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            order_id: 'order_1',
            product_id: 'prod_digital_1',
            product_title: 'E-Book Tutorial',
            product_type: 'digital',
            digital_file_key: 'files/ebook.pdf',
            digital_file_name: 'ebook.pdf',
            max_downloads: 5,
            download_expires_hours: 72,
            download_count: 1,
            license_keys: null,
            order_created_at: new Date(),
          },
          {
            order_id: 'order_2',
            product_id: 'prod_serial_1',
            product_title: 'Software License',
            product_type: 'serial',
            digital_file_key: null,
            digital_file_name: null,
            max_downloads: 0,
            download_expires_hours: null,
            download_count: 0,
            license_keys: 'KEY-ABC-123||KEY-DEF-456',
            order_created_at: new Date(),
          },
        ],
        rowCount: 2,
      } as any);

      const res = await request(app)
        .get('/api/pd/storefront/account/downloads')
        .set('Authorization', 'Bearer storeA_customer');

      expect(res.status).toBe(200);
      expect(res.body.entitlements).toHaveLength(2);
      expect(res.body.entitlements[0].product_title).toBe('E-Book Tutorial');
      expect(res.body.entitlements[0].downloads_remaining).toBe(4);
      expect(res.body.entitlements[1].license_keys).toEqual(['KEY-ABC-123', 'KEY-DEF-456']);
    });
  });

  describe('POST /downloads/:productId/:orderId (download)', () => {
    it('rejects download for unpaid order', async () => {
      // 1. requireStorefrontCustomer middleware: is_active check
      mockedQuery.mockResolvedValueOnce({
        rows: [{ is_active: true }],
        rowCount: 1,
      } as any);
      // 2. Order ownership + payment check — no rows (unpaid)
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const res = await request(app)
        .post('/api/pd/storefront/account/downloads/prod_1/order_unpaid')
        .set('Authorization', 'Bearer storeA_customer');

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('not purchased');
    });

    it('rejects cross-store download attempt', async () => {
      // 1. requireStorefrontCustomer middleware: is_active check
      mockedQuery.mockResolvedValueOnce({
        rows: [{ is_active: true }],
        rowCount: 1,
      } as any);
      // 2. Order check passes (order belongs to storeB customer in store_A scope)
      mockedQuery.mockResolvedValueOnce({
        rows: [{ id: 'order_cross' }],
        rowCount: 1,
      } as any);
      // 3. Product query — store_id differs from customer store
      mockedQuery.mockResolvedValueOnce({
        rows: [{
          id: 'prod_cross',
          type: 'digital',
          digital_file_key: 'files/cross.pdf',
          digital_file_name: 'cross.pdf',
          max_downloads: 5,
          download_expires_hours: 72,
          store_id: 'store_B', // different store!
        }],
        rowCount: 1,
      } as any);

      const res = await request(app)
        .post('/api/pd/storefront/account/downloads/prod_cross/order_cross')
        .set('Authorization', 'Bearer storeA_customer');

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Cross-store');
    });

    it('returns signed download URL and audit logs the download', async () => {
      // 1. requireStorefrontCustomer middleware: is_active check
      mockedQuery.mockResolvedValueOnce({
        rows: [{ is_active: true }],
        rowCount: 1,
      } as any);
      // 2. Order ownership + payment check — passes
      mockedQuery.mockResolvedValueOnce({
        rows: [{ id: 'order_paid' }],
        rowCount: 1,
      } as any);
      // 3. Product query
      mockedQuery.mockResolvedValueOnce({
        rows: [{
          id: 'prod_dl',
          type: 'digital',
          digital_file_key: 'files/ebook.pdf',
          digital_file_name: 'ebook.pdf',
          max_downloads: 5,
          download_expires_hours: 48,
          store_id: 'store_A',
        }],
        rowCount: 1,
      } as any);
      // 4. Upsert download record (INSERT ... ON CONFLICT DO NOTHING)
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      // 5. Update download_count + RETURNING
      mockedQuery.mockResolvedValueOnce({
        rows: [{ download_count: 1, id: 'dl_record_1' }],
        rowCount: 1,
      } as any);
      // 6. Audit log INSERT
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
      // 7. License keys query
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const res = await request(app)
        .post('/api/pd/storefront/account/downloads/prod_dl/order_paid')
        .set('Authorization', 'Bearer storeA_customer');

      expect(res.status).toBe(200);
      expect(res.body.data.download_url).toContain('signed-download-url');
      expect(res.body.data.file_name).toBe('ebook.pdf');
      expect(res.body.data.download_count).toBe(1);
      expect(res.body.data.downloads_remaining).toBe(4);
      expect(res.body.data.expires_in_hours).toBe(48);

      // Verify audit log was called (6th query call after middleware)
      const allCalls = mockedQuery.mock.calls;
      const auditCall = allCalls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('pd_download_audit_log'),
      );
      expect(auditCall).toBeDefined();
    });
  });
});
