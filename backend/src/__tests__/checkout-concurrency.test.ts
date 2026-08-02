import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PaymentGateway, ProductStatus, ProductType, StoreStatus, UserRole } from '@pandamarket/types';

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

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: vi.fn().mockResolvedValue({
      shipping_enabled: false,
    }),
  },
}));

vi.mock('../middlewares', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../middlewares')>();
  return {
    ...actual,
    requireAuth: (req: any, _res: any, next: any) => {
      req.user = { id: 'usr_buyer_1', role: UserRole.Customer };
      next();
    },
    requireStorefrontCustomer: (req: any, _res: any, next: any) => {
      req.storefrontCustomer = { id: 'sfc_1', store_id: 'store_1' };
      next();
    },
  };
});

import { query, transaction } from '../db/pool';
import { orderService } from '../services/order.service';
import orderRouter from '../api/order.route';
import { errorHandler } from '../middlewares';

const mockedQuery = vi.mocked(query);
const mockedTransaction = vi.mocked(transaction);

const app = express();
app.use(express.json());
app.use('/api/pd/orders', orderRouter);
app.use(errorHandler);

describe('Checkout Idempotency & Inventory Concurrency (GAP-P0-004 & GAP-P0-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);
  });

  describe('POST /api/pd/orders/storefront/checkout Idempotency-Key Header', () => {
    it('returns HTTP 400 when Idempotency-Key header is missing', async () => {
      const res = await request(app)
        .post('/api/pd/orders/storefront/checkout')
        .send({
          items: [{ product_id: 'prod_1', quantity: 1 }],
          payment_gateway: PaymentGateway.Cod,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Idempotency-Key header is required');
    });

    it('returns existing order when duplicate Idempotency-Key is provided', async () => {
      const existingOrder = {
        id: 'ord_existing_123',
        customer_id: null,
        storefront_customer_id: 'sfc_1',
        total: '50.000',
        payment_gateway: PaymentGateway.Cod,
        idempotency_key: 'idem_key_xyz',
      };

      mockedQuery.mockResolvedValueOnce({
        rows: [existingOrder],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const res = await request(app)
        .post('/api/pd/orders/storefront/checkout')
        .set('Idempotency-Key', 'idem_key_xyz')
        .send({
          items: [{ product_id: 'prod_1', quantity: 1 }],
          payment_gateway: PaymentGateway.Cod,
        });

      expect(res.status).toBe(200);
      expect(res.body.order).toEqual(existingOrder);
    });
  });

  describe('Guarded Inventory Decrement in OrderService.checkout', () => {
    it('uses atomic guarded UPDATE with inventory_quantity >= requested_quantity', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // idempotency check

      const mockClient = {
        query: vi.fn(),
      };

      // 1. Lock query
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'prod_1' }] });
      // 2. Select product
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'prod_1',
            store_id: 'store_1',
            title: 'Test T-Shirt',
            price: '50.000',
            inventory_quantity: 1,
            status: ProductStatus.Published,
            type: ProductType.Physical,
            metadata: {},
            seller_type: 'retailer',
            store_status: StoreStatus.Verified,
            store_is_verified: true,
          },
        ],
      });
      // 3. Insert order
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'ord_new_1',
            total: '50.000',
          },
        ],
      });
      // 4. Insert order item
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 5. Guarded UPDATE product inventory (returns 1 updated row)
      mockClient.query.mockResolvedValueOnce({ rows: [{ inventory_quantity: 0 }] });

      mockedTransaction.mockImplementationOnce(async (cb: any) => cb(mockClient));

      const order = await orderService.checkout({
        storefront_customer_id: 'sfc_1',
        idempotency_key: 'idem_key_100',
        items: [{ product_id: 'prod_1', quantity: 1 }],
        payment_gateway: PaymentGateway.Cod,
        shipping_address: {
          first_name: 'John',
          last_name: 'Doe',
          phone: '21699999999',
          address_line_1: 'Street 1',
          city: 'Tunis',
          postal_code: '1000',
          country: 'TN',
        },
      });

      expect(order.id).toBe('ord_new_1');

      // Verify the guarded UPDATE was called with inventory_quantity >= $2
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND inventory_quantity >= $2'),
        ['prod_1', 1],
      );
    });

    it('throws OUT_OF_STOCK error if guarded UPDATE returns 0 rows due to concurrent stock depletion', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // idempotency check

      const mockClient = {
        query: vi.fn(),
      };

      // 1. Lock query
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'prod_1' }] });
      // 2. Select product (appeared in stock during read)
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'prod_1',
            store_id: 'store_1',
            title: 'Test T-Shirt',
            price: '50.000',
            inventory_quantity: 1,
            status: ProductStatus.Published,
            type: ProductType.Physical,
            metadata: {},
            seller_type: 'retailer',
            store_status: StoreStatus.Verified,
            store_is_verified: true,
          },
        ],
      });
      // 3. Insert order
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'ord_new_1' }] });
      // 4. Insert order item
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 5. Guarded UPDATE product inventory returns 0 rows (concurrent checkout took the last item)
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      mockedTransaction.mockImplementationOnce(async (cb: any) => cb(mockClient));

      await expect(
        orderService.checkout({
          storefront_customer_id: 'sfc_1',
          idempotency_key: 'idem_key_101',
          items: [{ product_id: 'prod_1', quantity: 1 }],
          payment_gateway: PaymentGateway.Cod,
          shipping_address: {
            first_name: 'Jane',
            last_name: 'Doe',
            phone: '21699999999',
            address_line_1: 'Street 2',
            city: 'Tunis',
            postal_code: '1000',
            country: 'TN',
          },
        }),
      ).rejects.toThrow('Insufficient stock');
    });
  });
});
