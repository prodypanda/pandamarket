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
  },
}));

vi.mock('../services/store.service', () => ({
  storeService: {
    getById: vi.fn(),
  },
}));

vi.mock('../plugins/payment', () => ({
  getPaymentProvider: vi.fn(),
  decryptVendorConfig: vi.fn(),
}));

const mockPlatformSettings = vi.hoisted(() => ({
  getSettings: vi.fn(),
}));
vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: mockPlatformSettings.getSettings,
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
import { storeService } from '../services/store.service';
import { getPaymentProvider, decryptVendorConfig } from '../plugins/payment';
import { PaymentGateway } from '@pandamarket/types';

const mockQuery = vi.mocked(query);
const mockTransaction = vi.mocked(transaction);
const mockGetProvider = vi.mocked(getPaymentProvider);
const mockDecryptConfig = vi.mocked(decryptVendorConfig);
const mockOrderService = vi.mocked(orderService);
const mockStoreService = vi.mocked(storeService);

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish persistent platform settings mock
    mockPlatformSettings.getSettings.mockResolvedValue({
      payment_flouci_enabled: true,
      payment_konnect_enabled: true,
      payment_paypal_enabled: true,
      payment_mandat_enabled: true,
      payment_cod_enabled: true,
      payment_vendor_direct_enabled: false,
      payment_platform_credentials_source: 'platform',
    });
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

      // Single-store order with no payment config (escrow mode)
      mockQuery.mockResolvedValueOnce({ rows: [{ store_id: 'pd_store_1' }], rowCount: 1 } as any);
      mockStoreService.getById.mockResolvedValue({
        id: 'pd_store_1',
        payment_config: null,
      } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // UPDATE order

      const result = await paymentService.initPayment(
        mockOrder,
        PaymentGateway.Flouci,
        'customer@test.tn',
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

      // Enable vendor direct payment for this test
      mockPlatformSettings.getSettings.mockResolvedValueOnce({
        payment_flouci_enabled: true,
        payment_konnect_enabled: true,
        payment_paypal_enabled: true,
        payment_mandat_enabled: true,
        payment_cod_enabled: true,
        payment_vendor_direct_enabled: true,
        payment_platform_credentials_source: 'platform',
      });

      // Single-store order with payment config (direct mode)
      mockQuery.mockResolvedValueOnce({ rows: [{ store_id: 'pd_store_pro' }], rowCount: 1 } as any);
      mockStoreService.getById.mockResolvedValue({
        id: 'pd_store_pro',
        payment_config: 'encrypted_config_data',
      } as any);
      mockDecryptConfig.mockReturnValue({
        flouci_app_token: 'vendor_token',
        flouci_app_secret: 'vendor_secret',
      });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // UPDATE order

      const result = await paymentService.initPayment(
        mockOrder,
        PaymentGateway.Flouci,
        'customer@test.tn',
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

      // 4. Transactional CAS on pd_payment_attempt (initialized -> captured)
      const clientQuery = vi.fn().mockResolvedValue({ rowCount: 1 });
      mockTransaction.mockImplementation(async (cb: any) => cb({ query: clientQuery }));

      // markPaid succeeds
      mockOrderService.markPaid.mockResolvedValue({ id: 'pd_order_123' } as any);

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
      expect(mockOrderService.markPaid).toHaveBeenCalledWith(
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

      // 4. Transactional CAS on pd_payment_attempt (initialized -> captured)
      const clientQuery = vi.fn().mockResolvedValue({ rowCount: 1 });
      mockTransaction.mockImplementation(async (cb: any) => cb({ query: clientQuery }));

      // markPaid throws PAY_ALREADY_CAPTURED
      const { PdConflictError, PdErrorCode } = await import('../errors');
      mockOrderService.markPaid.mockRejectedValue(
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
