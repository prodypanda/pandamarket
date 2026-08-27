import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import * as crypto from 'crypto';

const { mockProcessPaymentWebhook } = vi.hoisted(() => ({
  mockProcessPaymentWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/payment.service', () => ({
  paymentService: {
    processPaymentWebhook: mockProcessPaymentWebhook,
  },
}));

vi.mock('../services/mandat.service', () => ({
  mandatService: {},
}));

vi.mock('../services/order.service', () => ({
  orderService: {},
}));

vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn((cb: any) => cb({ query: vi.fn() })),
}));

vi.mock('../config', () => ({
  config: {
    env: 'development', // Even in development, HMAC must NOT be bypassed
    flouci: {
      appSecret: 'test_flouci_secret_key_123',
    },
    konnect: {
      apiKey: 'test_konnect_api_key_456',
    },
  },
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import paymentRouter from '../api/payment.route';
import { errorHandler } from '../middlewares';

const app = express();
app.use(express.json());
app.use('/api/pd/payments', paymentRouter);
app.use(errorHandler);

describe('PLAN-P0-09: Webhook HMAC Signature Verification Unconditional Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Flouci Webhook', () => {
    it('rejects unsigned Flouci webhook in non-production environments with 401', async () => {
      const res = await request(app)
        .post('/api/pd/payments/webhook/flouci')
        .send({ payment_id: 'pay_flouci_1', order_id: 'ord_123' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid signature');
      expect(mockProcessPaymentWebhook).not.toHaveBeenCalled();
    });

    it('rejects Flouci webhook with invalid signature with 401', async () => {
      const res = await request(app)
        .post('/api/pd/payments/webhook/flouci')
        .set('x-flouci-signature', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
        .send({ payment_id: 'pay_flouci_1', order_id: 'ord_123' });

      expect(res.status).toBe(401);
      expect(mockProcessPaymentWebhook).not.toHaveBeenCalled();
    });

    it('accepts Flouci webhook with valid HMAC-SHA256 signature', async () => {
      const payload = { payment_id: 'pay_flouci_1', order_id: 'ord_123' };
      const hmac = crypto
        .createHmac('sha256', 'test_flouci_secret_key_123')
        .update(JSON.stringify(payload))
        .digest('hex');

      const res = await request(app)
        .post('/api/pd/payments/webhook/flouci')
        .set('x-flouci-signature', hmac)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.text).toBe('OK');
      expect(mockProcessPaymentWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          gateway: 'flouci',
          gatewayEventId: 'pay_flouci_1',
          orderId: 'ord_123',
          signatureValid: true,
        }),
      );
    });
  });

  describe('Konnect Webhook', () => {
    it('rejects unsigned Konnect webhook in non-production environments with 401', async () => {
      const res = await request(app)
        .post('/api/pd/payments/webhook/konnect')
        .send({ payment_ref: 'pay_konnect_1', order_id: 'ord_123' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid signature');
      expect(mockProcessPaymentWebhook).not.toHaveBeenCalled();
    });

    it('rejects Konnect webhook with invalid signature with 401', async () => {
      const res = await request(app)
        .post('/api/pd/payments/webhook/konnect')
        .set('x-konnect-signature', 'deadbeefcafebabe0123456789abcdef0123456789abcdef0123456789abcdef')
        .send({ payment_ref: 'pay_konnect_1', order_id: 'ord_123' });

      expect(res.status).toBe(401);
      expect(mockProcessPaymentWebhook).not.toHaveBeenCalled();
    });

    it('accepts Konnect webhook with valid HMAC-SHA256 signature', async () => {
      const payload = { payment_ref: 'pay_konnect_1', order_id: 'ord_123' };
      const hmac = crypto
        .createHmac('sha256', 'test_konnect_api_key_456')
        .update(JSON.stringify(payload))
        .digest('hex');

      const res = await request(app)
        .post('/api/pd/payments/webhook/konnect')
        .set('x-konnect-signature', hmac)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.text).toBe('OK');
      expect(mockProcessPaymentWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          gateway: 'konnect',
          gatewayEventId: 'pay_konnect_1',
          orderId: 'ord_123',
          signatureValid: true,
        }),
      );
    });
  });
});
