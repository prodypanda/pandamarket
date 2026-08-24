import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PaymentGateway } from '@pandamarket/types';

const mocks = vi.hoisted(() => ({
  initPayment: vi.fn(),
  getById: vi.fn(),
  hasStoreItems: vi.fn(),
  dbQuery: vi.fn(),
}));

vi.mock('../services/payment.service', () => ({
  paymentService: { initPayment: mocks.initPayment },
}));
vi.mock('../services/order.service', () => ({
  orderService: {
    getById: mocks.getById,
    hasStoreItems: mocks.hasStoreItems,
  },
}));
vi.mock('../services/mandat.service', () => ({
  mandatService: { uploadProof: vi.fn() },
}));
vi.mock('../db/pool', () => ({
  query: mocks.dbQuery,
}));
vi.mock('../config', () => ({
  config: {
    env: 'test',
    flouci: { appSecret: 'test-secret' },
    konnect: { apiKey: 'test-key' },
  },
}));
vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../middlewares', () => ({
  asyncHandler: (handler: any) => (req: any, res: any, next: any) => Promise.resolve(handler(req, res, next)).catch(next),
  validate: () => (_req: any, _res: any, next: any) => next(),
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'buyer_1' };
    next();
  },
  requireStorefrontCustomer: (req: any, _res: any, next: any) => {
    req.storefrontCustomer = { id: 'storefront_buyer_1', store_id: 'store_1' };
    next();
  },
}));

import paymentRouter from '../api/payment.route';

const app = express();
app.use(express.json());
app.use('/api/pd/payments', paymentRouter);
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err?.httpStatus || 500).json({
    error: { code: err?.code || 'PD_INTERNAL_ERROR', message: err?.message || 'Internal error' },
  });
});

const order = {
  id: 'order_1',
  customer_id: 'buyer_1',
  storefront_customer_id: 'storefront_buyer_1',
  total: '85.000',
  currency: 'TND',
  payment_gateway: PaymentGateway.Flouci,
  payment_status: 'pending',
  status: 'pending',
};

const providerResult = {
  redirect_url: 'https://pay.example.test/session_1',
  gateway_reference: 'provider_ref_1',
  metadata: { provider: 'test' },
};

describe('payment initialization HTTP contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getById.mockResolvedValue(order);
    mocks.hasStoreItems.mockResolvedValue(true);
    mocks.dbQuery.mockResolvedValue({ rows: [{ email: 'buyer@example.test' }], rowCount: 1 });
    mocks.initPayment.mockResolvedValue(providerResult);
  });

  it('propagates the same idempotency key for duplicate Hub submits', async () => {
    const body = {
      order_id: order.id,
      gateway: PaymentGateway.Flouci,
      return_origin: 'https://shop.example.test',
    };
    const headers = { 'Idempotency-Key': 'route-payment-key-1' };

    const first = await request(app).post('/api/pd/payments/init').set(headers).send(body);
    const replay = await request(app).post('/api/pd/payments/init').set(headers).send(body);

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(first.body).toMatchObject({ checkout_url: providerResult.redirect_url, gateway_reference: providerResult.gateway_reference });
    expect(mocks.initPayment).toHaveBeenCalledTimes(2);
    expect(mocks.initPayment.mock.calls.map((call) => call[4])).toEqual([
      'route-payment-key-1',
      'route-payment-key-1',
    ]);
  });

  it('propagates the same idempotency key for duplicate storefront submits', async () => {
    const body = {
      order_id: order.id,
      store_id: 'store_1',
      gateway: PaymentGateway.Flouci,
      return_origin: 'https://store.example.test',
    };
    const headers = { 'X-Idempotency-Key': 'route-storefront-key-1' };

    const first = await request(app).post('/api/pd/payments/storefront/init').set(headers).send(body);
    const replay = await request(app).post('/api/pd/payments/storefront/init').set(headers).send(body);

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(mocks.initPayment).toHaveBeenCalledTimes(2);
    expect(mocks.initPayment.mock.calls.map((call) => call[4])).toEqual([
      'route-storefront-key-1',
      'route-storefront-key-1',
    ]);
  });

  it('rejects payment initialization without a bounded idempotency key', async () => {
    const response = await request(app)
      .post('/api/pd/payments/init')
      .send({ order_id: order.id, gateway: PaymentGateway.Flouci });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('Idempotency-Key');
    expect(mocks.initPayment).not.toHaveBeenCalled();
  });
});
