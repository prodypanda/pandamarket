/**
 * Unit tests for all 4 payment providers.
 * Tests: initialization, verification, error handling, edge cases.
 *
 * Providers tested:
 * - FlouciProvider (online payment, TND → millimes conversion)
 * - KonnectProvider (online payment, TND → millimes conversion)
 * - ManualMandatProvider (offline, DB-based verification)
 * - CodProvider (cash on delivery, always pending)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('../db/pool', () => ({
  query: vi.fn(),
}));

vi.mock('../config', () => ({
  config: {
    flouci: {
      appToken: 'platform_flouci_token',
      appSecret: 'platform_flouci_secret',
      baseUrl: 'https://developers.flouci.com/api',
    },
    konnect: {
      apiKey: 'platform_konnect_key',
      receiverWallet: 'platform_wallet_id',
      baseUrl: 'https://api.konnect.network/api/v2',
    },
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../utils/money', () => ({
  tndToMillimes: vi.fn((tnd: number) => Math.round(tnd * 1000)),
  millimesToTnd: vi.fn((m: number) => m / 1000),
}));

vi.mock('../errors', () => {
  class PdError extends Error {
    code: string;
    httpStatus: number;
    details: unknown;
    constructor(code: string, message: string, httpStatus: number, details?: unknown) {
      super(message);
      this.code = code;
      this.httpStatus = httpStatus;
      this.details = details;
    }
  }
  return {
    PdError,
    PdErrorCode: {
      PAY_INIT_FAILED: 'PD_PAY_INIT_FAILED',
      PAY_VERIFICATION_FAILED: 'PD_PAY_VERIFICATION_FAILED',
    },
  };
});

import axios from 'axios';
import { query } from '../db/pool';
import { PaymentInitContext } from '../plugins/payment/payment-provider.interface';
import { PaymentGateway, MandatStatus } from '@pandamarket/types';

const mockAxios = vi.mocked(axios);
const mockQuery = vi.mocked(query);

// ─── Shared test context ─────────────────────────────────────────────

const baseCtx: PaymentInitContext = {
  order_id: 'pd_order_test123',
  amount: 85.0,
  currency: 'TND',
  customer_email: 'customer@test.tn',
  success_url: 'https://pandamarket.tn/checkout/success',
  fail_url: 'https://pandamarket.tn/checkout/fail',
};

// =====================================================================
// 1. FLOUCI PROVIDER
// =====================================================================

describe('FlouciProvider', () => {
  let FlouciProvider: any;
  let provider: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../plugins/payment/flouci.provider');
    FlouciProvider = mod.FlouciProvider;
    provider = new FlouciProvider();
  });

  it('should have gateway set to Flouci', () => {
    expect(provider.gateway).toBe(PaymentGateway.Flouci);
  });

  describe('init()', () => {
    it('should initialize payment with platform credentials (escrow mode)', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: {
          result: {
            link: 'https://flouci.com/pay/abc123',
            payment_id: 'flouci_pay_abc123',
          },
        },
      });

      const result = await provider.init(baseCtx);

      expect(result.redirect_url).toBe('https://flouci.com/pay/abc123');
      expect(result.gateway_reference).toBe('flouci_pay_abc123');
      expect(result.metadata).toEqual({ provider: 'flouci' });

      // Verify axios was called with platform credentials
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://developers.flouci.com/api/generate_payment',
        expect.objectContaining({
          app_token: 'platform_flouci_token',
          app_secret: 'platform_flouci_secret',
          amount: 85000, // 85 TND → 85000 millimes
          developer_tracking_id: 'pd_order_test123',
        }),
        expect.objectContaining({ timeout: 10_000 }),
      );
    });

    it('should use vendor credentials when provided (direct mode)', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: {
          result: {
            link: 'https://flouci.com/pay/vendor_xyz',
            payment_id: 'flouci_vendor_xyz',
          },
        },
      });

      const ctxWithVendor: PaymentInitContext = {
        ...baseCtx,
        vendor_credentials: {
          flouci_app_token: 'vendor_token_123',
          flouci_app_secret: 'vendor_secret_456',
        },
      };

      const result = await provider.init(ctxWithVendor);

      expect(result.redirect_url).toBe('https://flouci.com/pay/vendor_xyz');
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          app_token: 'vendor_token_123',
          app_secret: 'vendor_secret_456',
        }),
        expect.any(Object),
      );
    });

    it('should throw PdError when Flouci returns no link', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { result: {} },
      });

      await expect(provider.init(baseCtx)).rejects.toThrow('Failed to initialise Flouci payment');
    });

    it('should throw PdError when Flouci API is unreachable', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(provider.init(baseCtx)).rejects.toThrow('Failed to initialise Flouci payment');
    });

    it('should convert TND amount to millimes', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { result: { link: 'https://flouci.com/pay/x', payment_id: 'x' } },
      });

      await provider.init({ ...baseCtx, amount: 100.5 });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ amount: 100500 }),
        expect.any(Object),
      );
    });
  });

  describe('verify()', () => {
    it('should return captured for successful payment', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          result: { status: 'SUCCESS', amount: 85000, success: true },
        },
      });

      const result = await provider.verify('flouci_ref_123');

      expect(result.status).toBe('captured');
      expect(result.amount).toBe(85);
      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://developers.flouci.com/api/verify_payment/flouci_ref_123',
        expect.objectContaining({
          headers: { apppublic: 'platform_flouci_token', appsecret: 'platform_flouci_secret' },
        }),
      );
    });

    it('should return failed for unsuccessful payment', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: { result: { status: 'FAILED', amount: 0, success: false } },
      });

      const result = await provider.verify('flouci_ref_456');

      expect(result.status).toBe('failed');
    });

    it('should use vendor credentials for verification when provided', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: { result: { status: 'SUCCESS', amount: 50000, success: true } },
      });

      await provider.verify('ref_123', {
        flouci_app_token: 'vendor_tok',
        flouci_app_secret: 'vendor_sec',
      });

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { apppublic: 'vendor_tok', appsecret: 'vendor_sec' },
        }),
      );
    });

    it('should throw PdError when verification API fails', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('timeout'));

      await expect(provider.verify('bad_ref')).rejects.toThrow('Failed to verify Flouci payment');
    });
  });
});

// =====================================================================
// 2. KONNECT PROVIDER
// =====================================================================

describe('KonnectProvider', () => {
  let KonnectProvider: any;
  let provider: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../plugins/payment/konnect.provider');
    KonnectProvider = mod.KonnectProvider;
    provider = new KonnectProvider();
  });

  it('should have gateway set to Konnect', () => {
    expect(provider.gateway).toBe(PaymentGateway.Konnect);
  });

  describe('init()', () => {
    it('should initialize payment with platform credentials', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: {
          payUrl: 'https://pay.konnect.network/xyz',
          paymentRef: 'konnect_ref_xyz',
        },
      });

      const result = await provider.init(baseCtx);

      expect(result.redirect_url).toBe('https://pay.konnect.network/xyz');
      expect(result.gateway_reference).toBe('konnect_ref_xyz');
      expect(result.metadata).toEqual({ provider: 'konnect' });

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.konnect.network/api/v2/payments/init-payment',
        expect.objectContaining({
          receiverWalletId: 'platform_wallet_id',
          amount: 85000, // millimes
          token: 'TND',
          type: 'immediate',
          orderId: 'pd_order_test123',
          email: 'customer@test.tn',
        }),
        expect.objectContaining({
          headers: { 'x-api-key': 'platform_konnect_key' },
        }),
      );
    });

    it('should use vendor credentials when provided', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { payUrl: 'https://pay.konnect.network/v', paymentRef: 'v_ref' },
      });

      await provider.init({
        ...baseCtx,
        vendor_credentials: {
          konnect_api_key: 'vendor_konnect_key',
          konnect_receiver_wallet: 'vendor_wallet',
        },
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ receiverWalletId: 'vendor_wallet' }),
        expect.objectContaining({ headers: { 'x-api-key': 'vendor_konnect_key' } }),
      );
    });

    it('should throw PdError when Konnect returns no payUrl', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: {} });

      await expect(provider.init(baseCtx)).rejects.toThrow('Failed to initialise Konnect payment');
    });

    it('should throw PdError on network error', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network Error'));

      await expect(provider.init(baseCtx)).rejects.toThrow('Failed to initialise Konnect payment');
    });
  });

  describe('verify()', () => {
    it('should return captured for completed payment', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: { payment: { status: 'completed', amount: 85000 } },
      });

      const result = await provider.verify('konnect_ref_123');

      expect(result.status).toBe('captured');
      expect(result.amount).toBe(85); // millimes → TND
    });

    it('should return pending for pending payment', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: { payment: { status: 'pending', amount: 85000 } },
      });

      const result = await provider.verify('konnect_ref_pending');

      expect(result.status).toBe('pending');
    });

    it('should return failed for failed payment', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: { payment: { status: 'failed', amount: 0 } },
      });

      const result = await provider.verify('konnect_ref_failed');

      expect(result.status).toBe('failed');
    });

    it('should use vendor credentials for verification', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: { payment: { status: 'completed', amount: 50000 } },
      });

      await provider.verify('ref', { konnect_api_key: 'vendor_key' });

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: { 'x-api-key': 'vendor_key' } }),
      );
    });

    it('should throw PdError on verification failure', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('timeout'));

      await expect(provider.verify('bad')).rejects.toThrow('Failed to verify Konnect payment');
    });
  });
});

// =====================================================================
// 3. MANUAL MANDAT PROVIDER
// =====================================================================

describe('ManualMandatProvider', () => {
  let ManualMandatProvider: any;
  let provider: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../plugins/payment/manual-mandat.provider');
    ManualMandatProvider = mod.ManualMandatProvider;
    provider = new ManualMandatProvider();
  });

  it('should have gateway set to ManualMandat', () => {
    expect(provider.gateway).toBe(PaymentGateway.ManualMandat);
  });

  describe('init()', () => {
    it('should return redirect to mandat upload page', async () => {
      const result = await provider.init(baseCtx);

      expect(result.redirect_url).toBe('/orders/pd_order_test123/mandat-upload');
      expect(result.gateway_reference).toBe('pd_order_test123');
      expect(result.metadata).toEqual(
        expect.objectContaining({
          instructions: expect.objectContaining({
            recipient: 'PandaMarket SARL',
            city: 'Tunis',
            amount: 85.0,
          }),
        }),
      );
    });

    it('should include order reference in instructions', async () => {
      const result = await provider.init(baseCtx);

      expect(result.metadata?.instructions).toHaveProperty('reference');
      expect((result.metadata?.instructions as any).reference).toContain('PD-ORDER-');
    });

    it('should not make any external API calls', async () => {
      await provider.init(baseCtx);

      expect(mockAxios.post).not.toHaveBeenCalled();
      expect(mockAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('verify()', () => {
    it('should return captured when mandat proof is approved', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ status: MandatStatus.Approved, amount_expected: '85.000' }],
        rowCount: 1,
      } as any);

      const result = await provider.verify('pd_order_test123');

      expect(result.status).toBe('captured');
      expect(result.amount).toBe(85);
    });

    it('should return pending when mandat proof is pending', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ status: MandatStatus.Pending, amount_expected: '85.000' }],
        rowCount: 1,
      } as any);

      const result = await provider.verify('pd_order_test123');

      expect(result.status).toBe('pending');
    });

    it('should return failed when mandat proof is rejected', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ status: MandatStatus.Rejected, amount_expected: '85.000' }],
        rowCount: 1,
      } as any);

      const result = await provider.verify('pd_order_test123');

      expect(result.status).toBe('failed');
    });

    it('should return pending when no proof exists', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await provider.verify('pd_order_no_proof');

      expect(result.status).toBe('pending');
    });

    it('should query the most recent proof for the order', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ status: MandatStatus.Approved, amount_expected: '100.000' }],
        rowCount: 1,
      } as any);

      await provider.verify('pd_order_xyz');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('pd_mandat_proofs'),
        ['pd_order_xyz'],
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC LIMIT 1'),
        expect.any(Array),
      );
    });
  });
});

// =====================================================================
// 4. COD PROVIDER
// =====================================================================

describe('CodProvider', () => {
  let CodProvider: any;
  let provider: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../plugins/payment/cod.provider');
    CodProvider = mod.CodProvider;
    provider = new CodProvider();
  });

  it('should have gateway set to Cod', () => {
    expect(provider.gateway).toBe(PaymentGateway.Cod);
  });

  describe('init()', () => {
    it('should return redirect to order confirmation page', async () => {
      const result = await provider.init(baseCtx);

      expect(result.redirect_url).toBe('/orders/pd_order_test123/confirmation');
      expect(result.gateway_reference).toBe('pd_order_test123');
      expect(result.metadata).toEqual({ mode: 'cod' });
    });

    it('should not make any external API calls', async () => {
      await provider.init(baseCtx);

      expect(mockAxios.post).not.toHaveBeenCalled();
      expect(mockAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('verify()', () => {
    it('should always return pending (COD captures happen out-of-band)', async () => {
      const result = await provider.verify();

      expect(result.status).toBe('pending');
    });

    it('should not query the database', async () => {
      await provider.verify();

      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});

// =====================================================================
// 5. PROVIDER REGISTRY
// =====================================================================

describe('Payment Provider Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the correct provider for each gateway', async () => {
    // Reset module cache to get fresh imports
    vi.resetModules();

    // Re-mock dependencies needed by the registry
    vi.doMock('../utils/crypto', () => ({
      decrypt: vi.fn((s: string) => s),
    }));
    vi.doMock('../errors', () => ({
      PdValidationError: class extends Error {
        constructor(msg: string) { super(msg); }
      },
      PdErrorCode: { PAY_INVALID_GATEWAY: 'PD_PAY_INVALID_GATEWAY' },
    }));

    const { getPaymentProvider } = await import('../plugins/payment/index');

    const flouci = getPaymentProvider(PaymentGateway.Flouci);
    expect(flouci.gateway).toBe(PaymentGateway.Flouci);

    const konnect = getPaymentProvider(PaymentGateway.Konnect);
    expect(konnect.gateway).toBe(PaymentGateway.Konnect);

    const mandat = getPaymentProvider(PaymentGateway.ManualMandat);
    expect(mandat.gateway).toBe(PaymentGateway.ManualMandat);

    const cod = getPaymentProvider(PaymentGateway.Cod);
    expect(cod.gateway).toBe(PaymentGateway.Cod);
  });

  it('should throw for invalid gateway', async () => {
    vi.resetModules();
    vi.doMock('../utils/crypto', () => ({ decrypt: vi.fn() }));
    vi.doMock('../errors', () => ({
      PdValidationError: class extends Error {
        constructor(msg: string) { super(msg); }
      },
      PdErrorCode: { PAY_INVALID_GATEWAY: 'PD_PAY_INVALID_GATEWAY' },
    }));

    const { getPaymentProvider } = await import('../plugins/payment/index');

    expect(() => getPaymentProvider('invalid_gateway' as any)).toThrow();
  });

  it('should decrypt vendor config correctly', async () => {
    vi.resetModules();
    vi.doMock('../utils/crypto', () => ({
      decrypt: vi.fn(() => JSON.stringify({ flouci_app_token: 'tok', flouci_app_secret: 'sec' })),
    }));
    vi.doMock('../errors', () => ({
      PdValidationError: class extends Error { constructor(msg: string) { super(msg); } },
      PdErrorCode: { PAY_INVALID_GATEWAY: 'PD_PAY_INVALID_GATEWAY' },
    }));

    const { decryptVendorConfig } = await import('../plugins/payment/index');

    const result = decryptVendorConfig('encrypted_data');
    expect(result).toEqual({ flouci_app_token: 'tok', flouci_app_secret: 'sec' });
  });

  it('should return null for null config (escrow mode)', async () => {
    vi.resetModules();
    vi.doMock('../utils/crypto', () => ({ decrypt: vi.fn() }));
    vi.doMock('../errors', () => ({
      PdValidationError: class extends Error { constructor(msg: string) { super(msg); } },
      PdErrorCode: { PAY_INVALID_GATEWAY: 'PD_PAY_INVALID_GATEWAY' },
    }));

    const { decryptVendorConfig } = await import('../plugins/payment/index');

    expect(decryptVendorConfig(null)).toBeNull();
  });

  it('should return null for corrupted encrypted config', async () => {
    vi.resetModules();
    vi.doMock('../utils/crypto', () => ({
      decrypt: vi.fn(() => { throw new Error('decrypt failed'); }),
    }));
    vi.doMock('../errors', () => ({
      PdValidationError: class extends Error { constructor(msg: string) { super(msg); } },
      PdErrorCode: { PAY_INVALID_GATEWAY: 'PD_PAY_INVALID_GATEWAY' },
    }));

    const { decryptVendorConfig } = await import('../plugins/payment/index');

    expect(decryptVendorConfig('corrupted_data')).toBeNull();
  });
});
