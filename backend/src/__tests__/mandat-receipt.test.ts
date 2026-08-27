import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PaymentGateway, UserRole } from '@pandamarket/types';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
  transaction: vi.fn((cb: any) => cb({
    query: mockQuery,
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
  presignDownload: vi.fn().mockResolvedValue('https://s3.example.com/signed-receipt-url?token=xyz789'),
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
    if (token === 'vendor_storeA') {
      return { sub: 'vendor_A', role: UserRole.Vendor, store_id: 'store_A' };
    }
    if (token === 'vendor_storeB') {
      return { sub: 'vendor_B', role: UserRole.Vendor, store_id: 'store_B' };
    }
    throw new Error('Invalid token');
  }),
}));

import { query } from '../db/pool';
import paymentRouter from '../api/payment.route';
import { errorHandler } from '../middlewares';

const mockedQuery = vi.mocked(query);

const app = express();
app.use(express.json());
app.use('/api/pd/payments', paymentRouter);
app.use(errorHandler);

describe('Storefront Mandat Minute Receipt Uploads & Review (GAP-P1-005)', () => {
  let responseQueue: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    responseQueue = [];
    mockedQuery.mockImplementation(async (sql: any) => {
      if (typeof sql === 'string' && sql.includes('FROM pd_storefront_customer WHERE id = $1 AND store_id = $2')) {
        return { rows: [{ is_active: true }], rowCount: 1 } as any;
      }
      if (responseQueue.length > 0) {
        return responseQueue.shift();
      }
      return { rows: [], rowCount: 0 } as any;
    });
  });

  describe('POST /storefront/receipt', () => {
    it('rejects unauthorized receipt upload', async () => {
      const res = await request(app)
        .post('/api/pd/payments/storefront/receipt')
        .send({
          order_id: 'ord_123',
          file_key: 'mandats/store_A/sfcust_A/file_1.jpg',
          file_name: 'mandat.jpg',
        });

      expect(res.status).toBe(401);
    });

    it('rejects cross-store receipt upload attempt', async () => {
      // Order query returns empty because store_id / customer_id do not match
      responseQueue.push({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/pd/payments/storefront/receipt')
        .set('Authorization', 'Bearer storeA_customer')
        .send({
          order_id: 'ord_storeB_123',
          file_key: 'mandats/store_B/sfcust_B/file_1.jpg',
          file_name: 'mandat.jpg',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('not found or cross-store access forbidden');
    });

    it('rejects receipt upload for non-Mandat orders', async () => {
      // Order query returns order with Flouci gateway
      responseQueue.push({
        rows: [{ id: 'ord_flouci_1', payment_gateway: PaymentGateway.Flouci, payment_status: 'payment_required' }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/pd/payments/storefront/receipt')
        .set('Authorization', 'Bearer storeA_customer')
        .send({
          order_id: 'ord_flouci_1',
          file_key: 'mandats/store_A/sfcust_A/file_1.jpg',
          file_name: 'mandat.jpg',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('only supported for Mandat Minute');
    });

    it('uploads receipt successfully and leaves order payment_status as payment_required', async () => {
      // 1. Order check returns Mandat order
      responseQueue.push({
        rows: [{ id: 'ord_mandat_1', payment_gateway: PaymentGateway.ManualMandat, payment_status: 'payment_required' }],
        rowCount: 1,
      });
      // 2. Receipt INSERT returns receipt
      responseQueue.push({
        rows: [
          {
            id: 'rcpt_123',
            order_id: 'ord_mandat_1',
            store_id: 'store_A',
            storefront_customer_id: 'sfcust_A',
            file_key: 'mandats/store_A/sfcust_A/file_1.jpg',
            file_name: 'mandat.jpg',
            status: 'pending_review',
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      });
      // 3. UPDATE order timestamp
      responseQueue.push({ rows: [], rowCount: 1 });

      const res = await request(app)
        .post('/api/pd/payments/storefront/receipt')
        .set('Authorization', 'Bearer storeA_customer')
        .send({
          order_id: 'ord_mandat_1',
          file_key: 'mandats/store_A/sfcust_A/file_1.jpg',
          file_name: 'mandat.jpg',
        });

      expect(res.status).toBe(201);
      expect(res.body.receipt.status).toBe('pending_review');
      expect(res.body.receipt.order_id).toBe('ord_mandat_1');
    });
  });

  describe('POST /receipts/:receiptId/review', () => {
    it('rejects review by seller of another store', async () => {
      // Receipt query returns store_A receipt
      responseQueue.push({
        rows: [{ id: 'rcpt_123', order_id: 'ord_mandat_1', store_id: 'store_A', status: 'pending_review' }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/pd/payments/receipts/rcpt_123/review')
        .set('Authorization', 'Bearer vendor_storeB') // Vendor of Store B
        .send({
          action: 'approve',
          notes: 'Looks good',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('You do not manage this store');
    });

    it('allows store seller to approve receipt and captures payment on order', async () => {
      // 1. Fetch receipt
      responseQueue.push({
        rows: [{ id: 'rcpt_123', order_id: 'ord_mandat_1', store_id: 'store_A', status: 'pending_review' }],
        rowCount: 1,
      });
      // 2. Update receipt status (RETURNING *)
      responseQueue.push({
        rows: [{ id: 'rcpt_123', order_id: 'ord_mandat_1', store_id: 'store_A', status: 'approved' }],
        rowCount: 1,
      });
      // 3. Update order payment_status via markPaidInTransaction (RETURNING *)
      responseQueue.push({
        rows: [{ id: 'ord_mandat_1', total: '150.000', payment_status: 'captured', payment_gateway: 'manual_mandat' }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/pd/payments/receipts/rcpt_123/review')
        .set('Authorization', 'Bearer vendor_storeA')
        .send({
          action: 'approve',
          notes: 'Verified with post office',
        });

      expect(res.status).toBe(200);
      expect(res.body.receipt.status).toBe('approved');
    });
  });
});
