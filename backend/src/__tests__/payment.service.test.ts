/**
 * Unit tests for PaymentService.
 * Tests payment initialization, webhook processing, idempotency,
 * and escrow vs direct mode routing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn(() => 'test-event-id'),
  sha256: vi.fn(() => 'f'.repeat(64)),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../config', () => ({
  config: {
    hubDomain: 'pandamarket.tn',
    defaultCurrency: 'TND',
    env: 'test',
  },
}));

vi.mock('../services/order.service', () => ({
  orderService: {
    getById: vi.fn(),
    markPaid: vi.fn(),
    markPaidInTransaction: vi.fn(),
    cancelUnstartedPaymentOrder: vi.fn(),
  },
}));

const reconciliationQueueMocks = vi.hoisted(() => ({
  enqueuePaymentCompensation: vi.fn().mockResolvedValue(undefined),
  enqueuePaymentReconciliation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../queues/payment-reconciliation-queue', () => reconciliationQueueMocks);

vi.mock('../plugins/payment', () => ({
  getPaymentProvider: vi.fn(),
  decryptVendorConfig: vi.fn(),
}));

vi.mock('../services/store.service', () => ({
  storeService: {
    getById: vi.fn(),
  },
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: vi.fn().mockResolvedValue({
      payment_vendor_direct_enabled: false,
      payment_platform_credentials_source: 'environment',
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

vi.mock('../services/ads.service', () => ({
  adsService: {
    recognizeOrderConversion: vi.fn().mockResolvedValue(undefined),
  },
}));

import { query, transaction } from '../db/pool';
import { PaymentService } from '../services/payment.service';
import { orderService } from '../services/order.service';
import { getPaymentProvider, decryptVendorConfig } from '../plugins/payment';
import { storeService } from '../services/store.service';
import { PaymentGateway } from '@pandamarket/types';
import { PdError, PdErrorCode } from '../errors';

const mockQuery = vi.mocked(query);
const mockTransaction = vi.mocked(transaction);
const mockGetProvider = vi.mocked(getPaymentProvider);
const mockOrderService = vi.mocked(orderService);
const mockStoreService = vi.mocked(storeService);
const mockDecryptConfig = vi.mocked(decryptVendorConfig);

describe('PaymentService', () => {
  let paymentService: PaymentService;

  function mockSuccessfulInitPersistence() {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    const reservationQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{
        id: 'pd_order_123',
        customer_id: 'pd_user_456',
        total: '85.000',
        currency: 'TND',
        status: 'pending',
        payment_gateway: PaymentGateway.Flouci,
        payment_status: 'pending',
        payment_reference: null,
        subtotal: '78.000',
        shipping_total: '7.000',
        shipping_address: null,
      }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const finalizeQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{
        id: 'pd_order_123',
        status: 'pending',
        payment_status: 'pending',
        payment_reference: null,
      }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{
          id: 'test-event-id',
          order_id: 'pd_order_123',
          gateway: PaymentGateway.Flouci,
          gateway_reference: 'pending_test-event-id',
          expected_amount_minor: '85000',
          expected_currency: 'TND',
          merchant_account_id: null,
          status: 'initializing',
          idempotency_key: 'payment-init-key',
          request_fingerprint: 'f'.repeat(64),
          capability_version: `pcv1_${'a'.repeat(64)}`,
          quote_id: null,
          quote_version: null,
          provider_response: null,
          provider_state: 'not_created',
          reconciliation_status: 'none',
          compensation_status: 'not_required',
          provider_expected_amount_minor: null,
          provider_expected_currency: null,
          failure_code: null,
          failure_message: null,
        }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [{ id: 'pd_order_123' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockTransaction
      .mockImplementationOnce(async (cb: any) => cb({ query: reservationQuery }))
      .mockImplementationOnce(async (cb: any) => cb({ query: finalizeQuery }));
    return { reservationQuery, finalizeQuery };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset();
    mockTransaction.mockReset();
    capabilityMocks.assertOrderGatewayAvailable.mockResolvedValue({
      capability_version: `pcv1_${'a'.repeat(64)}`,
      merchant_account_id: null,
    });
    mockStoreService.getById.mockResolvedValue({ payment_config: null } as any);
    mockDecryptConfig.mockReturnValue(null);
    mockOrderService.markPaidInTransaction.mockResolvedValue({ id: 'pd_order_123' } as any);
    mockOrderService.cancelUnstartedPaymentOrder.mockResolvedValue('cancelled' as any);
    paymentService = new PaymentService();
  });

  describe('initPayment()', () => {
    const mockOrder = {
      id: 'pd_order_123',
      customer_id: 'pd_user_456',
      total: '85.000',
      currency: 'TND',
      status: 'pending',
      payment_gateway: PaymentGateway.Flouci,
      payment_status: 'pending',
      payment_reference: null,
      subtotal: '78.000',
      shipping_total: '7.000',
      shipping_address: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should initialize payment with platform credentials (escrow mode)', async () => {
      const mockProvider = {
        init: vi.fn().mockResolvedValue({
          redirect_url: 'https://flouci.com/pay/abc',
          gateway_reference: 'flouci_ref_123',
          metadata: {},
        }),
        verify: vi.fn(),
      };
      mockGetProvider.mockReturnValue(mockProvider);

      mockSuccessfulInitPersistence();

      const result = await paymentService.initPayment(
        mockOrder,
        PaymentGateway.Flouci,
        'customer@test.tn',
        undefined,
        'payment-init-key',
      );

      expect(result.redirect_url).toBe('https://flouci.com/pay/abc');
      expect(result.gateway_reference).toBe('flouci_ref_123');
      expect(mockProvider.init).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: 'pd_order_123',
          amount: 85,
          currency: 'TND',
          vendor_credentials: undefined,
        }),
      );
    });

    it('should initialize payment with vendor credentials (direct mode)', async () => {
      const mockProvider = {
        init: vi.fn().mockResolvedValue({
          redirect_url: 'https://flouci.com/pay/vendor',
          gateway_reference: 'vendor_ref_456',
          metadata: {},
        }),
        verify: vi.fn(),
      };
      mockGetProvider.mockReturnValue(mockProvider);

      capabilityMocks.assertOrderGatewayAvailable.mockResolvedValueOnce({
        capability_version: `pcv1_${'b'.repeat(64)}`,
        merchant_account_id: 'vendor_token',
        vendor_credentials: {
          flouci_app_token: 'vendor_token',
          flouci_app_secret: 'vendor_secret',
        },
      });
      mockSuccessfulInitPersistence();

      const result = await paymentService.initPayment(
        mockOrder,
        PaymentGateway.Flouci,
        'customer@test.tn',
        undefined,
        'payment-init-key',
      );

      expect(result.redirect_url).toBe('https://flouci.com/pay/vendor');
      expect(mockProvider.init).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor_credentials: {
            flouci_app_token: 'vendor_token',
            flouci_app_secret: 'vendor_secret',
          },
        }),
      );
    });

    it('replays the stored provider session without rechecking capability or calling the provider', async () => {
      const storedResult = {
        redirect_url: 'https://flouci.com/pay/replayed',
        gateway_reference: 'flouci_ref_replayed',
        metadata: { provider: 'flouci' },
      };
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      const reservationQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{
          ...mockOrder,
          payment_reference: storedResult.gateway_reference,
        }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{
          id: 'pa_replay',
          order_id: mockOrder.id,
          gateway: PaymentGateway.Flouci,
          gateway_reference: storedResult.gateway_reference,
          expected_amount_minor: '85000',
          expected_currency: 'TND',
          merchant_account_id: null,
          status: 'initialized',
          idempotency_key: 'payment-replay-key',
          request_fingerprint: 'f'.repeat(64),
          capability_version: `pcv1_${'a'.repeat(64)}`,
          quote_id: null,
          quote_version: null,
          provider_response: storedResult,
          provider_state: 'created',
          reconciliation_status: 'none',
          compensation_status: 'not_required',
          provider_expected_amount_minor: '85000',
          provider_expected_currency: 'TND',
          failure_code: null,
          failure_message: null,
        }], rowCount: 1 });
      mockTransaction.mockImplementationOnce(async (cb: any) => cb({ query: reservationQuery }));
      const provider = { init: vi.fn(), verify: vi.fn() };
      mockGetProvider.mockReturnValue(provider);

      await expect(paymentService.initPayment(
        mockOrder,
        PaymentGateway.Flouci,
        'customer@test.tn',
        undefined,
        'payment-replay-key',
      )).resolves.toEqual(storedResult);

      expect(capabilityMocks.assertOrderGatewayAvailable).not.toHaveBeenCalled();
      expect(provider.init).not.toHaveBeenCalled();
      expect(mockTransaction).toHaveBeenCalledOnce();
    });

    it('rejects reuse of an idempotency key when the bound payment details changed', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pa_conflict',
          order_id: mockOrder.id,
          gateway: PaymentGateway.Flouci,
          gateway_reference: 'flouci_ref_existing',
          expected_amount_minor: '85000',
          expected_currency: 'TND',
          merchant_account_id: null,
          status: 'initialized',
          idempotency_key: 'payment-conflict-key',
          request_fingerprint: 'e'.repeat(64),
          capability_version: `pcv1_${'a'.repeat(64)}`,
          quote_id: null,
          quote_version: null,
          provider_response: {
            redirect_url: 'https://flouci.com/pay/existing',
            gateway_reference: 'flouci_ref_existing',
          },
          failure_code: null,
          failure_message: null,
        }],
        rowCount: 1,
      } as any);

      await expect(paymentService.initPayment(
        { ...mockOrder, total: '86.000' },
        PaymentGateway.Flouci,
        'customer@test.tn',
        undefined,
        'payment-conflict-key',
      )).rejects.toMatchObject({ code: PdErrorCode.PAY_IDEMPOTENCY_CONFLICT });

      expect(capabilityMocks.assertOrderGatewayAvailable).not.toHaveBeenCalled();
    });

    it('returns an in-progress conflict for a duplicate request that is still initializing', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pa_initializing',
          order_id: mockOrder.id,
          gateway: PaymentGateway.Flouci,
          gateway_reference: 'pending_pa_initializing',
          expected_amount_minor: '85000',
          expected_currency: 'TND',
          merchant_account_id: null,
          status: 'initializing',
          idempotency_key: 'payment-progress-key',
          request_fingerprint: 'f'.repeat(64),
          capability_version: `pcv1_${'a'.repeat(64)}`,
          quote_id: null,
          quote_version: null,
          provider_response: null,
          failure_code: null,
          failure_message: null,
        }],
        rowCount: 1,
      } as any);

      await expect(paymentService.initPayment(
        mockOrder,
        PaymentGateway.Flouci,
        'customer@test.tn',
        undefined,
        'payment-progress-key',
      )).rejects.toMatchObject({ code: PdErrorCode.PAY_INIT_IN_PROGRESS });
    });

    it('requires reconciliation when an initialized attempt has no replay payload', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pa_missing_replay',
          order_id: mockOrder.id,
          gateway: PaymentGateway.Flouci,
          gateway_reference: 'flouci_ref_missing_replay',
          expected_amount_minor: '85000',
          expected_currency: 'TND',
          merchant_account_id: null,
          status: 'initialized',
          idempotency_key: 'payment-missing-replay-key',
          request_fingerprint: 'f'.repeat(64),
          capability_version: `pcv1_${'a'.repeat(64)}`,
          quote_id: null,
          quote_version: null,
          provider_response: null,
          failure_code: null,
          failure_message: null,
        }],
        rowCount: 1,
      } as any);

      await expect(paymentService.initPayment(
        mockOrder,
        PaymentGateway.Flouci,
        'customer@test.tn',
        undefined,
        'payment-missing-replay-key',
      )).rejects.toMatchObject({ code: PdErrorCode.PAY_RECONCILIATION_PENDING });
    });

    it('records provider initialization failures against the reserved attempt', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      const reservationQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{
          id: 'pd_order_123',
          customer_id: 'pd_user_456',
          total: '85.000',
          currency: 'TND',
          status: 'pending',
          payment_gateway: PaymentGateway.Flouci,
          payment_status: 'pending',
          payment_reference: null,
          subtotal: '78.000',
          shipping_total: '7.000',
          shipping_address: null,
        }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockTransaction.mockImplementationOnce(async (cb: any) => cb({ query: reservationQuery }));
      const providerError = new PdError(
        PdErrorCode.PAY_INIT_FAILED,
        'Provider unavailable',
        502,
      );
      const provider = {
        init: vi.fn().mockRejectedValue(providerError),
        verify: vi.fn(),
      };
      mockGetProvider.mockReturnValue(provider);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await expect(paymentService.initPayment(
        mockOrder,
        PaymentGateway.Flouci,
        'customer@test.tn',
        undefined,
        'payment-failure-key',
      )).rejects.toBe(providerError);

      expect(mockQuery.mock.calls.some(([sql, params]) =>
        String(sql).includes("status = $2")
        && Array.isArray(params)
        && params.includes('test-event-id')
        && params.includes(PdErrorCode.PAY_INIT_FAILED)
        && params.includes('Provider unavailable')),
      ).toBe(true);
    });
  });

  describe('processPaymentWebhook()', () => {
    const attemptRow = {
      id: 'pd_pa_1',
      order_id: 'pd_order_123',
      gateway: PaymentGateway.Flouci,
      gateway_reference: 'flouci_payment_abc',
      expected_amount_minor: '85000',
      expected_currency: 'TND',
      merchant_account_id: null,
      status: 'initialized',
    };

    it('should process a new webhook event and capture payment', async () => {
      // 1. Resolve payment attempt by (gateway, gateway_reference)
      mockQuery.mockResolvedValueOnce({ rows: [attemptRow], rowCount: 1 } as any);
      // 2. INSERT into pd_payment_event succeeds (not a duplicate)
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      // getStoreIdsForOrder
      mockOrderService.getById.mockResolvedValue({
        id: 'pd_order_123',
        total: '85.000',
      } as any);
      // 3. getStoreIdsForOrder query
      mockQuery.mockResolvedValueOnce({ rows: [{ store_id: 'pd_store_1' }], rowCount: 1 } as any);
      mockStoreService.getById.mockResolvedValue({
        id: 'pd_store_1',
        payment_config: null,
      } as any);

      // Provider verify returns captured
      const mockProvider = {
        init: vi.fn(),
        verify: vi.fn().mockResolvedValue({ status: 'captured', amount: 85 }),
      };
      mockGetProvider.mockReturnValue(mockProvider);

      // 4. Transactional capture: lock order, capture attempt, capture order.
      const clientQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'pd_order_123' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockTransaction.mockImplementation(async (cb: any) => cb({ query: clientQuery }));

      // 5. UPDATE pd_payment_event status to processed
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await paymentService.processPaymentWebhook({
        gateway: PaymentGateway.Flouci,
        gatewayEventId: 'flouci_payment_abc',
        orderId: 'pd_order_123',
        rawPayload: { payment_id: 'flouci_payment_abc' },
        signatureValid: true,
      });

      expect(result).toBe(true);
      expect(mockOrderService.markPaidInTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.any(Function) }),
        'pd_order_123',
        PaymentGateway.Flouci,
        'flouci_payment_abc',
      );
    });

    it('should detect and skip duplicate webhook events', async () => {
      // 1. Resolve payment attempt by (gateway, gateway_reference)
      mockQuery.mockResolvedValueOnce({ rows: [attemptRow], rowCount: 1 } as any);
      // 2. INSERT into pd_payment_event fails with unique_violation
      const uniqueError = new Error('duplicate key') as Error & { code: string };
      uniqueError.code = '23505';
      mockQuery.mockRejectedValueOnce(uniqueError);

      // 3. Best-effort UPDATE to mark as duplicate
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await paymentService.processPaymentWebhook({
        gateway: PaymentGateway.Flouci,
        gatewayEventId: 'flouci_payment_abc',
        orderId: 'pd_order_123',
        signatureValid: true,
      });

      expect(result).toBe(false);
      expect(mockOrderService.markPaid).not.toHaveBeenCalled();
    });

    it('should handle already-captured orders gracefully', async () => {
      // 1. Resolve payment attempt by (gateway, gateway_reference)
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...attemptRow, gateway: PaymentGateway.Konnect, gateway_reference: 'konnect_ref_xyz' }],
        rowCount: 1,
      } as any);
      // 2. INSERT succeeds
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      // Provider verify returns captured
      mockOrderService.getById.mockResolvedValue({ id: 'pd_order_123' } as any);
      // 3. getStoreIdsForOrder query
      mockQuery.mockResolvedValueOnce({ rows: [{ store_id: 'pd_store_1' }], rowCount: 1 } as any);
      mockStoreService.getById.mockResolvedValue({ id: 'pd_store_1', payment_config: null } as any);

      const mockProvider = {
        init: vi.fn(),
        verify: vi.fn().mockResolvedValue({ status: 'captured', amount: 85 }),
      };
      mockGetProvider.mockReturnValue(mockProvider);

      // 4. Transactional capture: lock order, capture attempt, capture order.
      const clientQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'pd_order_123' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockTransaction.mockImplementation(async (cb: any) => cb({ query: clientQuery }));

      // markPaidInTransaction throws PAY_ALREADY_CAPTURED
      const { PdConflictError, PdErrorCode } = await import('../errors');
      mockOrderService.markPaidInTransaction.mockRejectedValue(
        new PdConflictError(PdErrorCode.PAY_ALREADY_CAPTURED, 'Already paid'),
      );

      // 5. UPDATE event as duplicate
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await paymentService.processPaymentWebhook({
        gateway: PaymentGateway.Konnect,
        gatewayEventId: 'konnect_ref_xyz',
        orderId: 'pd_order_123',
        signatureValid: true,
      });

      expect(result).toBe(false);
    });
  });
});
