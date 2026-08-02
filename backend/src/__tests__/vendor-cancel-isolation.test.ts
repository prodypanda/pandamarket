import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { OrderStatus, PaymentGateway, PaymentStatus, ProductType, UserRole } from '@pandamarket/types';

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

let mockUserRole = UserRole.Vendor;
let mockUserStoreId: string | null = 'store_vendor_A';
let mockUserId = 'usr_vendor_A';

vi.mock('../middlewares', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../middlewares')>();
  return {
    ...actual,
    requireAuth: (req: any, _res: any, next: any) => {
      req.user = { id: mockUserId, role: mockUserRole, store_id: mockUserStoreId };
      next();
    },
    requireStore: (req: any, res: any, next: any) => {
      if (!mockUserStoreId) {
        res.status(403).json({ error: { message: 'Store required' } });
        return;
      }
      req.user = { id: mockUserId, role: mockUserRole, store_id: mockUserStoreId };
      next();
    },
  };
});

vi.mock('../services/order.service', () => ({
  orderService: {
    getById: vi.fn().mockResolvedValue({
      id: 'ord_multivendor_123',
      customer_id: 'usr_customer_1',
      status: OrderStatus.Pending,
      payment_gateway: PaymentGateway.Cod,
      payment_status: PaymentStatus.Pending,
    }),
    hasStoreItems: vi.fn().mockImplementation(async (orderId: string, storeId: string) => {
      return storeId === 'store_vendor_A' || storeId === 'store_vendor_B';
    }),
    cancelStoreFulfillment: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    requestStoreRefund: vi.fn().mockResolvedValue({
      id: 'refund_123',
      order_id: 'ord_multivendor_123',
      store_id: 'store_vendor_A',
      amount: 25.0,
      currency: 'TND',
    }),
  },
}));

import { orderService } from '../services/order.service';
import orderRouter from '../api/order.route';
import { errorHandler } from '../middlewares';

const mockedOrderService = vi.mocked(orderService);

const app = express();
app.use(express.json());
app.use('/api/pd/orders', orderRouter);
app.use(errorHandler);

describe('Multi-Vendor Order Cancellation Isolation (GAP-P0-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = UserRole.Vendor;
    mockUserStoreId = 'store_vendor_A';
    mockUserId = 'usr_vendor_A';
  });

  it('routes vendor cancellation request to cancelStoreFulfillment (store-scoped) instead of global cancel', async () => {
    const res = await request(app)
      .put('/api/pd/orders/ord_multivendor_123/cancel')
      .send({ reason: 'Out of stock for Vendor A' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Store fulfillment cancelled');

    // Assert cancelStoreFulfillment was called with vendor A's store_id
    expect(mockedOrderService.cancelStoreFulfillment).toHaveBeenCalledWith({
      order_id: 'ord_multivendor_123',
      store_id: 'store_vendor_A',
      reason: 'Out of stock for Vendor A',
    });

    // Assert global whole-order cancel was NOT called
    expect(mockedOrderService.cancel).not.toHaveBeenCalled();
  });

  it('allows customer or admin to call global whole-order cancel', async () => {
    mockUserRole = UserRole.Customer;
    mockUserId = 'usr_customer_1';
    mockUserStoreId = null;

    const res = await request(app)
      .put('/api/pd/orders/ord_multivendor_123/cancel')
      .send({ reason: 'Customer changed mind' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Order cancelled');

    // Assert global cancel was called for customer
    expect(mockedOrderService.cancel).toHaveBeenCalledWith(
      'ord_multivendor_123',
      'Customer changed mind',
    );
    expect(mockedOrderService.cancelStoreFulfillment).not.toHaveBeenCalled();
  });

  it('vendor explicit fulfillment cancel route only affects store-scoped fulfillment', async () => {
    const res = await request(app)
      .post('/api/pd/orders/ord_multivendor_123/fulfillment/cancel')
      .send({ reason: 'Item damaged prior to dispatch' });

    expect(res.status).toBe(200);
    expect(mockedOrderService.cancelStoreFulfillment).toHaveBeenCalledWith({
      order_id: 'ord_multivendor_123',
      store_id: 'store_vendor_A',
      reason: 'Item damaged prior to dispatch',
    });
    expect(mockedOrderService.cancel).not.toHaveBeenCalled();
  });

  it('rejects cancellation request from unrelated vendor who owns no items in order', async () => {
    mockUserStoreId = 'store_vendor_C_unrelated';
    mockedOrderService.hasStoreItems.mockResolvedValueOnce(false);

    const res = await request(app)
      .put('/api/pd/orders/ord_multivendor_123/cancel')
      .send({ reason: 'Unrelated vendor trying to cancel' });

    expect(res.status).toBe(404);
    expect(mockedOrderService.cancelStoreFulfillment).not.toHaveBeenCalled();
    expect(mockedOrderService.cancel).not.toHaveBeenCalled();
  });
});
