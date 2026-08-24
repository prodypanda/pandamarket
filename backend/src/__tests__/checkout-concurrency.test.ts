import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PaymentGateway, ProductStatus, ProductType, StoreStatus, UserRole } from '@pandamarket/types';

const capabilityMocks = vi.hoisted(() => ({
  assertGatewayAvailable: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  transaction: vi.fn((cb: any) => cb({
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  })),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn((prefix: string) => `pd_${prefix}_test123`),
  sha256: vi.fn(() => 'quote-hash'),
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
    getSettingsFresh: vi.fn().mockResolvedValue({
      shipping_enabled: false,
    }),
  },
}));

vi.mock('../services/payment-capability.service', () => ({
  paymentCapabilityService: {
    assertGatewayAvailable: capabilityMocks.assertGatewayAvailable,
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
import { PdConflictError, PdErrorCode } from '../errors';

const mockedQuery = vi.mocked(query);
const mockedTransaction = vi.mocked(transaction);

const app = express();
app.use(express.json());
app.use('/api/pd/orders', orderRouter);
app.use(errorHandler);

const shippingAddress = {
  first_name: 'John',
  last_name: 'Doe',
  phone: '21699999999',
  address_line_1: 'Street 1',
  city: 'Tunis',
  postal_code: '1000',
  country: 'TN',
};

function quoteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'quote_12345678',
    quote_version: 1,
    owner_user_id: null,
    owner_storefront_customer_id: 'sfc_1',
    store_id: 'store_1',
    items: [{
      product_id: 'prod_1',
      variant_id: null,
      store_id: 'store_1',
      title: 'Test T-Shirt',
      unit_price: 50,
      quantity: 1,
      subtotal: 50,
      product_type: ProductType.Physical,
      discount_amount: 5,
      discount_breakdown: { source: 'coupon', code: 'PANDA10' },
    }],
    shipping_address: shippingAddress,
    coupon_code: 'PANDA10',
    currency: 'TND',
    subtotal: '50.000',
    discount_total: '5.000',
    shipping_total: '0.000',
    tax_total: '0.000',
    total: '45.000',
    breakdown: {},
    snapshot_hash: 'quote-hash',
    created_at: new Date(),
    expires_at: new Date(Date.now() + 60_000),
    consumed_at: null,
    consumed_order_id: null,
    ...overrides,
  };
}

function productRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod_1',
    store_id: 'store_1',
    title: 'Test T-Shirt',
    price: '50.000',
    inventory_quantity: 5,
    status: ProductStatus.Published,
    type: ProductType.Physical,
    metadata: {},
    seller_type: 'retailer',
    store_status: StoreStatus.Verified,
    store_is_verified: true,
    ...overrides,
  };
}

describe('Checkout Idempotency & Inventory Concurrency (GAP-P0-004 & GAP-P0-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);
    capabilityMocks.assertGatewayAvailable.mockResolvedValue({
      capability_version: `pcv1_${'a'.repeat(64)}`,
      merchant_account_id: null,
    });
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

    it('returns HTTP 400 before database mutation when Idempotency-Key is too long', async () => {
      const res = await request(app)
        .post('/api/pd/orders/storefront/checkout')
        .set('Idempotency-Key', 'x'.repeat(129))
        .send({
          items: [{ product_id: 'prod_1', quantity: 1 }],
          payment_gateway: PaymentGateway.Cod,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('128 characters or fewer');
      expect(mockedQuery).not.toHaveBeenCalled();
      expect(mockedTransaction).not.toHaveBeenCalled();
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

    it('rejects a key already bound to another storefront customer without exposing that order', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [{
          id: 'ord_private_other_customer',
          customer_id: null,
          storefront_customer_id: 'sfc_other',
          quote_id: 'quote_12345678',
          payment_gateway: PaymentGateway.Cod,
        }],
        rowCount: 1,
      } as any);

      const res = await request(app)
        .post('/api/pd/orders/storefront/checkout')
        .set('Idempotency-Key', 'idem_cross_customer')
        .send({
          quote_id: 'quote_12345678',
          items: [{ product_id: 'prod_1', quantity: 1 }],
          payment_gateway: PaymentGateway.Cod,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toEqual({
        code: PdErrorCode.ORDER_IDEMPOTENCY_CONFLICT,
        message: 'The idempotency key is already associated with a different checkout',
      });
      expect(JSON.stringify(res.body)).not.toContain('ord_private_other_customer');
    });

    it('strips browser-supplied monetary fields before checkout reaches the service', async () => {
      const checkoutSpy = vi.spyOn(orderService, 'checkout').mockResolvedValueOnce({
        order: { id: 'ord_sanitized' } as any,
        replayed: false,
      });

      try {
        const res = await request(app)
          .post('/api/pd/orders/storefront/checkout')
          .set('Idempotency-Key', 'idem_sanitized')
          .send({
            quote_id: 'quote_12345678',
            items: [{
              product_id: 'prod_1',
              quantity: 1,
              unit_price: 0.001,
              subtotal: 0.001,
              discount_amount: 999,
            }],
            payment_gateway: PaymentGateway.Cod,
            shipping_total: 0.001,
            discount_total: 999,
            tax_total: 0,
            total: 0.001,
          });

        expect(res.status).toBe(201);
        const checkoutInput = checkoutSpy.mock.calls[0][0] as Record<string, any>;
        expect(checkoutInput.items).toEqual([{ product_id: 'prod_1', quantity: 1 }]);
        expect(checkoutInput.items[0]).not.toHaveProperty('unit_price');
        expect(checkoutInput).not.toHaveProperty('shipping_total');
        expect(checkoutInput).not.toHaveProperty('discount_total');
        expect(checkoutInput).not.toHaveProperty('tax_total');
        expect(checkoutInput).not.toHaveProperty('total');
      } finally {
        checkoutSpy.mockRestore();
      }
    });

    it('serializes simultaneous identical submissions and replays one committed order', async () => {
      let persistedOrder: Record<string, unknown> | null = null;
      let transactionTail = Promise.resolve();
      let orderInsertCount = 0;
      let inventoryUpdateCount = 0;
      let quoteConsumeCount = 0;

      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      mockedTransaction.mockImplementation(async (callback: any) => {
        const waitForPriorTransaction = transactionTail;
        let releaseTransaction!: () => void;
        transactionTail = new Promise<void>((resolve) => {
          releaseTransaction = resolve;
        });

        const client = {
          query: vi.fn(async (sql: string, params: unknown[] = []) => {
            if (sql.includes('pg_advisory_xact_lock')) {
              await waitForPriorTransaction;
              return { rows: [], rowCount: 1 };
            }
            if (sql.includes('SELECT * FROM pd_order WHERE idempotency_key')) {
              return { rows: persistedOrder ? [persistedOrder] : [], rowCount: persistedOrder ? 1 : 0 };
            }
            if (sql.includes('SELECT * FROM pd_checkout_quote')) {
              return { rows: [quoteRow()], rowCount: 1 };
            }
            if (sql.includes('SELECT id FROM pd_product WHERE id = ANY')) {
              return { rows: [{ id: 'prod_1' }], rowCount: 1 };
            }
            if (sql.includes('SELECT p.id, p.store_id, p.title, p.price')) {
              return { rows: [productRow()], rowCount: 1 };
            }
            if (sql.includes('INSERT INTO pd_order\n')) {
              orderInsertCount += 1;
              persistedOrder = {
                id: params[0],
                customer_id: params[1],
                storefront_customer_id: params[2],
                status: params[3],
                payment_gateway: params[4],
                gross_subtotal: String(params[5]),
                subtotal: String(params[6]),
                discount_total: String(params[7]),
                shipping_total: String(params[8]),
                tax_total: String(params[9]),
                total: String(params[10]),
                currency: params[11],
                shipping_address: shippingAddress,
                idempotency_key: params[13],
                quote_id: params[14],
                quote_version: params[15],
                payment_capability_version: params[16],
                coupon_code: params[17],
              };
              return { rows: [persistedOrder], rowCount: 1 };
            }
            if (sql.includes('INSERT INTO pd_order_item')) {
              return { rows: [], rowCount: 1 };
            }
            if (sql.includes('UPDATE pd_product\n')) {
              inventoryUpdateCount += 1;
              return { rows: [{ inventory_quantity: 4 }], rowCount: 1 };
            }
            if (sql.includes('INSERT INTO pd_fulfillment')) {
              return { rows: [], rowCount: 1 };
            }
            if (sql.includes('UPDATE pd_checkout_quote')) {
              quoteConsumeCount += 1;
              return { rows: [], rowCount: 1 };
            }
            throw new Error(`Unexpected checkout SQL: ${sql}`);
          }),
        };

        try {
          return await callback(client);
        } finally {
          releaseTransaction();
        }
      });

      const submit = () => request(app)
        .post('/api/pd/orders/storefront/checkout')
        .set('Idempotency-Key', 'idem_simultaneous')
        .send({
          quote_id: 'quote_12345678',
          items: [{ product_id: 'prod_1', quantity: 1 }],
          shipping_address: shippingAddress,
          coupon_code: 'PANDA10',
          payment_gateway: PaymentGateway.Cod,
        });

      const responses = await Promise.all([submit(), submit()]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 201]);
      expect(responses[0].body.order.id).toBe(responses[1].body.order.id);
      expect(orderInsertCount).toBe(1);
      expect(inventoryUpdateCount).toBe(1);
      expect(quoteConsumeCount).toBe(1);
      expect(capabilityMocks.assertGatewayAvailable).toHaveBeenCalledTimes(1);
    });
  });

  describe('Guarded Inventory Decrement in OrderService.checkout', () => {
    it('does not insert an order when the selected payment gateway is unavailable', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      const mockClient = { query: vi.fn() };
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'prod_1' }] });
      mockClient.query.mockResolvedValueOnce({
        rows: [{
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
        }],
      });
      mockedTransaction.mockImplementationOnce(async (cb: any) => cb(mockClient));
      capabilityMocks.assertGatewayAvailable.mockRejectedValueOnce(
        new PdConflictError(
          PdErrorCode.PAY_GATEWAY_UNAVAILABLE,
          'Gateway unavailable',
          { gateway: PaymentGateway.Flouci },
        ),
      );

      await expect(orderService.checkout({
        storefront_customer_id: 'sfc_1',
        idempotency_key: 'idem_gateway_unavailable',
        items: [{ product_id: 'prod_1', quantity: 1 }],
        payment_gateway: PaymentGateway.Flouci,
        shipping_address: {
          first_name: 'John',
          last_name: 'Doe',
          phone: '21699999999',
          address_line_1: 'Street 1',
          city: 'Tunis',
          postal_code: '1000',
          country: 'TN',
        },
      })).rejects.toMatchObject({ code: PdErrorCode.PAY_GATEWAY_UNAVAILABLE });

      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pd_order'),
        expect.anything(),
      );
    });

    it('persists catalog totals and uses an atomic guarded inventory decrement despite client money fields', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // idempotency check

      const mockClient = {
        query: vi.fn(),
      };

      // 1-2. Idempotency advisory lock and transaction-local replay check
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 3. Product lock query
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'prod_1' }] });
      // 4. Select product
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

      const result = await orderService.checkout({
        storefront_customer_id: 'sfc_1',
        idempotency_key: 'idem_key_100',
        items: [{
          product_id: 'prod_1',
          quantity: 1,
          unit_price: 0.001,
          subtotal: 0.001,
          discount_amount: 999,
        }],
        payment_gateway: PaymentGateway.Cod,
        shipping_address: shippingAddress,
        shipping_total: 0.001,
        discount_total: 999,
        tax_total: 999,
        total: 0.001,
      } as any);

      expect(result).toMatchObject({ order: { id: 'ord_new_1' }, replayed: false });

      const orderInsert = mockClient.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO pd_order\n'));
      const orderParams = orderInsert?.[1] as unknown[];
      expect(String(orderInsert?.[0])).toContain(
        'ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING',
      );
      expect(orderParams.slice(5, 11)).toEqual([50, 50, 0, 0, 0, 50]);

      const itemInsert = mockClient.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO pd_order_item'));
      const itemParams = itemInsert?.[1] as unknown[];
      expect(itemParams.slice(7, 12)).toEqual([50, 50, 0, '{}', 50]);

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

      // 1-2. Idempotency advisory lock and transaction-local replay check
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 3. Product lock query
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'prod_1' }] });
      // 4. Select product (appeared in stock during read)
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

  describe('Authoritative quote revalidation', () => {
    it('rejects a quote after the database catalog price changes', async () => {
      const mockClient = { query: vi.fn() };
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [quoteRow()] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'prod_1' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [productRow({ price: '120.000' })] });
      mockedTransaction.mockImplementationOnce(async (callback: any) => callback(mockClient));

      await expect(orderService.checkout({
        storefront_customer_id: 'sfc_1',
        store_id: 'store_1',
        idempotency_key: 'idem_stale_price',
        quote_id: 'quote_12345678',
        items: [{ product_id: 'prod_1', quantity: 1 }],
        shipping_address: shippingAddress,
        coupon_code: 'PANDA10',
        payment_gateway: PaymentGateway.Cod,
      })).rejects.toMatchObject({ code: PdErrorCode.ORDER_QUOTE_STALE });

      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pd_order'),
        expect.anything(),
      );
    });

    it('rejects a product deleted after quote issuance before order persistence', async () => {
      const mockClient = { query: vi.fn() };
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [quoteRow()] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockedTransaction.mockImplementationOnce(async (callback: any) => callback(mockClient));

      await expect(orderService.checkout({
        storefront_customer_id: 'sfc_1',
        store_id: 'store_1',
        idempotency_key: 'idem_deleted_product',
        quote_id: 'quote_12345678',
        items: [{ product_id: 'prod_1', quantity: 1 }],
        shipping_address: shippingAddress,
        coupon_code: 'PANDA10',
        payment_gateway: PaymentGateway.Cod,
      })).rejects.toMatchObject({ code: PdErrorCode.PRODUCT_NOT_FOUND });

      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pd_order'),
        expect.anything(),
      );
    });

    it('rejects a client coupon change instead of applying it to an older quote', async () => {
      const mockClient = { query: vi.fn() };
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [quoteRow()] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'prod_1' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [productRow()] });
      mockedTransaction.mockImplementationOnce(async (callback: any) => callback(mockClient));

      await expect(orderService.checkout({
        storefront_customer_id: 'sfc_1',
        store_id: 'store_1',
        idempotency_key: 'idem_changed_coupon',
        quote_id: 'quote_12345678',
        items: [{ product_id: 'prod_1', quantity: 1 }],
        shipping_address: shippingAddress,
        coupon_code: 'FIDELITE5',
        payment_gateway: PaymentGateway.Cod,
      })).rejects.toMatchObject({
        code: PdErrorCode.ORDER_QUOTE_STALE,
        message: 'Coupon changed after the quote was issued',
      });
    });
  });
});
