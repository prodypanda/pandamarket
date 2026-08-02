import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PaymentGateway, ProductStatus, ProductType, StoreStatus, UserRole } from '@pandamarket/types';

vi.mock('../db/pool', () => ({
  query: vi.fn(),
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

vi.mock('../utils/jwt', () => ({
  verifyAccessToken: vi.fn().mockImplementation((token: string) => {
    if (token === 'storeA_token') {
      return { sub: 'sfc_storeA_buyer', role: UserRole.Customer, store_id: 'store_A' };
    }
    if (token === 'storeB_token') {
      return { sub: 'sfc_storeB_buyer', role: UserRole.Customer, store_id: 'store_B' };
    }
    throw new Error('Invalid token');
  }),
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: vi.fn().mockResolvedValue({
      shipping_enabled: false,
    }),
  },
}));

import { query, transaction } from '../db/pool';
import orderRouter from '../api/order.route';
import { errorHandler } from '../middlewares';

const mockedQuery = vi.mocked(query);
const mockedTransaction = vi.mocked(transaction);

const app = express();
app.use(express.json());
app.use('/api/pd/orders', orderRouter);
app.use(errorHandler);

describe('Storefront Tenant Isolation (GAP-P1-001)', () => {
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

  it('rejects cross-store checkout with HTTP 403 when Store A customer attempts to buy Store B product', async () => {
    const mockClient = {
      query: vi.fn(),
    };

    // 1. Lock query
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'prod_storeB_1' }] });
    // 2. Select product (product belongs to store_B)
    mockClient.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'prod_storeB_1',
          store_id: 'store_B',
          title: 'Store B Exclusive Product',
          price: '100.000',
          inventory_quantity: 10,
          status: ProductStatus.Published,
          type: ProductType.Physical,
          metadata: {},
          seller_type: 'retailer',
          store_status: StoreStatus.Verified,
          store_is_verified: true,
        },
      ],
    });

    mockedTransaction.mockImplementationOnce(async (cb: any) => cb(mockClient));

    const res = await request(app)
      .post('/api/pd/orders/storefront/checkout')
      .set('Authorization', 'Bearer storeA_token')
      .set('Idempotency-Key', 'idem_cross_store_1')
      .send({
        items: [{ product_id: 'prod_storeB_1', quantity: 1 }],
        payment_gateway: PaymentGateway.Cod,
        shipping_address: {
          first_name: 'Alice',
          last_name: 'Smith',
          phone: '21698765432',
          address_line_1: 'Street A',
          city: 'Tunis',
          postal_code: '1000',
        },
      });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('Product does not belong to this storefront');
  });

  it('returns HTTP 404 when Store A customer attempts to view Store B order detail', async () => {
    // DB returns order belonging to Store B
    responseQueue.push({
      rows: [
        {
          id: 'ord_storeB_999',
          customer_id: null,
          storefront_customer_id: 'sfc_storeA_buyer',
          total: '50.000',
        },
      ],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    }); // getById

    // hasStoreItems check returns false for store_A
    responseQueue.push({
      rows: [],
      rowCount: 0,
      command: 'SELECT',
      oid: 0,
      fields: [],
    }); // hasStoreItems

    const res = await request(app)
      .get('/api/pd/orders/storefront/ord_storeB_999')
      .set('Authorization', 'Bearer storeA_token');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Order not found');
  });

  it('filters storefront order list items to only current store items in listByStorefrontCustomer', async () => {
    responseQueue.push({
      rows: [
        {
          id: 'ord_multi_1',
          storefront_customer_id: 'sfc_storeA_buyer',
          total: '150.000',
          items: [
            {
              product_id: 'prod_storeA_1',
              product_title: 'Store A Item',
              quantity: 1,
              unit_price: '50.000',
              subtotal: '50.000',
              store_id: 'store_A',
            },
          ],
        },
      ],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    }); // list query

    responseQueue.push({
      rows: [{ count: '1' }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    }); // count query

    const res = await request(app)
      .get('/api/pd/orders/storefront/me')
      .set('Authorization', 'Bearer storeA_token');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].items[0].store_id).toBe('store_A');
  });
});
