import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PaymentGateway } from '@pandamarket/types';

vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn((cb: any) => cb({
    query: vi.fn().mockResolvedValue({ rowCount: 1 }),
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
      payment_flouci_enabled: true,
      payment_konnect_enabled: true,
      payment_paypal_enabled: true,
      payment_mandat_enabled: true,
      payment_cod_enabled: true,
      payment_vendor_direct_enabled: false,
    }),
  },
}));

const capabilityMocks = vi.hoisted(() => ({
  assertOrderGatewayAvailable: vi.fn(),
}));
vi.mock('../services/payment-capability.service', () => ({
  paymentCapabilityService: {
    assertOrderGatewayAvailable: capabilityMocks.assertOrderGatewayAvailable,
  },
}));

vi.mock('../services/order.service', () => ({
    orderService: {
      getById: vi.fn().mockResolvedValue({
        id: 'ord_123',
        total: '85.000',
        currency: 'TND',
        payment_gateway: PaymentGateway.Flouci,
        payment_status: 'pending',
      }),
    markPaid: vi.fn().mockResolvedValue({
      id: 'ord_123',
      payment_status: 'captured',
    }),
  },
}));

vi.mock('../services/ads.service', () => ({
  adsService: {
    recognizeOrderConversion: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../plugins/payment', () => ({
  getPaymentProvider: vi.fn().mockReturnValue({
    gateway: PaymentGateway.Flouci,
    init: vi.fn().mockResolvedValue({
      redirect_url: 'https://flouci.example.com/pay/ref_flouci_123',
      gateway_reference: 'ref_flouci_123',
    }),
    verify: vi.fn().mockResolvedValue({
      status: 'captured',
      amount: 85.0,
    }),
  }),
  decryptVendorConfig: vi.fn(),
  paypalProvider: {
    verifyWebhookSignature: vi.fn().mockResolvedValue(false),
  },
}));

import { query, transaction } from '../db/pool';
import { paymentService } from '../services/payment.service';
import { orderService } from '../services/order.service';
import { getPaymentProvider, paypalProvider } from '../plugins/payment';
import paymentRouter from '../api/payment.route';
import { errorHandler } from '../middlewares';
import { PdValidationError } from '../errors';

const mockedQuery = vi.mocked(query);
const mockedTransaction = vi.mocked(transaction);
const mockedOrderService = vi.mocked(orderService);
const mockedGetPaymentProvider = vi.mocked(getPaymentProvider);
const mockedPaypalProvider = vi.mocked(paypalProvider);

const app = express();
app.use(express.json());
app.use('/api/pd/payments', paymentRouter);
app.use(errorHandler);

describe('Payment Attempt Binding & Webhook Security (GAP-P0-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capabilityMocks.assertOrderGatewayAvailable.mockResolvedValue({
      capability_version: `pcv1_${'a'.repeat(64)}`,
      merchant_account_id: null,
    });
  });

  describe('PaymentService.initPayment', () => {
    it('creates a payment attempt in pd_payment_attempt with expected amount in minor units', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      }); // update order payment_reference
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      }); // insert payment attempt

      const order = {
        id: 'ord_123',
        total: '85.000',
        currency: 'TND',
        payment_gateway: PaymentGateway.Flouci,
      } as any;

      const result = await paymentService.initPayment(order, PaymentGateway.Flouci, 'buyer@example.com');

      expect(result.gateway_reference).toBe('ref_flouci_123');
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pd_payment_attempt'),
        expect.arrayContaining(['ord_123', PaymentGateway.Flouci, 'ref_flouci_123', '85000', 'TND']),
      );
    });
  });

  describe('PaymentService.processPaymentWebhook', () => {
    it('rejects capture if payment attempt is not found for the gateway reference', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      }); // SELECT attempt

      await expect(
        paymentService.processPaymentWebhook({
          gateway: PaymentGateway.Flouci,
          gatewayEventId: 'unmatched_ref_999',
        }),
      ).rejects.toThrow(PdValidationError);

      expect(mockedOrderService.markPaid).not.toHaveBeenCalled();
    });

    it('rejects capture on underpayment (verified amount minor < expected amount minor)', async () => {
      // 1. Attempt query return expected_amount_minor: 85000 TND
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'pa_123',
            order_id: 'ord_123',
            gateway: PaymentGateway.Flouci,
            gateway_reference: 'ref_flouci_123',
            expected_amount_minor: '85000',
            expected_currency: 'TND',
            merchant_account_id: null,
            status: 'initialized',
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // 2. Insert event
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Mock provider returning underpayment amount: 10.000 TND (10000 millimes < 85000)
      mockedGetPaymentProvider.mockReturnValueOnce({
        gateway: PaymentGateway.Flouci,
        init: vi.fn(),
        verify: vi.fn().mockResolvedValue({
          status: 'captured',
          amount: 10.0,
        }),
      });

      // Event status update to failed
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await expect(
        paymentService.processPaymentWebhook({
          gateway: PaymentGateway.Flouci,
          gatewayEventId: 'ref_flouci_123',
        }),
      ).rejects.toThrow('underpayment detected');

      expect(mockedOrderService.markPaid).not.toHaveBeenCalled();
    });

    it('rejects webhook capture when signatureValid is explicitly false', async () => {
      await expect(
        paymentService.processPaymentWebhook({
          gateway: PaymentGateway.Flouci,
          gatewayEventId: 'ref_flouci_123',
          signatureValid: false,
        }),
      ).rejects.toThrow('Invalid payment webhook signature');
    });

    it('handles duplicate delivery when payment attempt is already captured', async () => {
      // Attempt lookup returns initialized row
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'pa_123',
            order_id: 'ord_123',
            gateway: PaymentGateway.Flouci,
            gateway_reference: 'ref_flouci_123',
            expected_amount_minor: '85000',
            expected_currency: 'TND',
            merchant_account_id: null,
            status: 'initialized',
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Event insert succeeds
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Transaction compare-and-set returns rowCount = 0 (attempt was already captured concurrently)
      mockedTransaction.mockImplementationOnce(async (cb: any) =>
        cb({
          query: vi.fn().mockResolvedValue({ rowCount: 0 }),
        }),
      );

      // Event status update to duplicate
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      const result = await paymentService.processPaymentWebhook({
        gateway: PaymentGateway.Flouci,
        gatewayEventId: 'ref_flouci_123',
      });

      expect(result).toBe(false);
      expect(mockedOrderService.markPaid).not.toHaveBeenCalled();
    });

    it('successfully processes valid capture, updates attempt to captured, and marks order paid', async () => {
      // Attempt lookup
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'pa_123',
            order_id: 'ord_123',
            gateway: PaymentGateway.Flouci,
            gateway_reference: 'ref_flouci_123',
            expected_amount_minor: '85000',
            expected_currency: 'TND',
            merchant_account_id: null,
            status: 'initialized',
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Event insert
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Transaction compare-and-set succeeds (rowCount = 1)
      mockedTransaction.mockImplementationOnce(async (cb: any) =>
        cb({
          query: vi.fn().mockResolvedValue({ rowCount: 1 }),
        }),
      );

      // Event processed update
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      const result = await paymentService.processPaymentWebhook({
        gateway: PaymentGateway.Flouci,
        gatewayEventId: 'ref_flouci_123',
        signatureValid: true,
      });

      expect(result).toBe(true);
      expect(mockedOrderService.markPaid).toHaveBeenCalledWith('ord_123', PaymentGateway.Flouci, 'ref_flouci_123');
    });
  });

  describe('PayPal Webhook Route (/api/pd/payments/webhook/paypal)', () => {
    it('returns HTTP 401 when PayPal signature verification fails', async () => {
      mockedPaypalProvider.verifyWebhookSignature.mockResolvedValueOnce(false);

      const res = await request(app)
        .post('/api/pd/payments/webhook/paypal')
        .send({
          paypal_order_id: 'PAYPAL_ORD_999',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid signature');
    });
  });
});
