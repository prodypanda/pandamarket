import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PaymentGateway,
  ProductType,
  ShippingMode,
  StoreStatus,
} from '@pandamarket/types';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getSettings: vi.fn(),
  decryptVendorConfig: vi.fn(),
  config: {
    flouci: {
      appToken: 'platform_flouci_token',
      appSecret: 'platform_flouci_secret',
    },
    konnect: {
      apiKey: 'platform_konnect_key',
      receiverWallet: 'platform_konnect_wallet',
    },
    paypal: {
      clientId: 'platform_paypal_client',
      clientSecret: 'platform_paypal_secret',
      mode: 'sandbox' as const,
    },
  },
}));

vi.mock('../db/pool', () => ({ query: mocks.query }));
vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: mocks.getSettings,
    getSettingsFresh: mocks.getSettings,
  },
}));
vi.mock('../plugins/payment', () => ({
  decryptVendorConfig: mocks.decryptVendorConfig,
}));
vi.mock('../config', () => ({ config: mocks.config }));

import { PaymentCapabilityService } from '../services/payment-capability.service';

const address = {
  first_name: 'Amira',
  last_name: 'Buyer',
  phone: '22111222',
  address_line_1: '12 Rue de Tunis',
  city: 'Tunis',
  postal_code: '1000',
  country: 'TN',
};

function settings(overrides: Record<string, unknown> = {}) {
  return {
    shipping_enabled: true,
    shipping_self_managed_enabled: true,
    shipping_platform_unified_enabled: true,
    payment_flouci_enabled: true,
    payment_konnect_enabled: true,
    payment_paypal_enabled: true,
    payment_mandat_enabled: true,
    payment_cod_enabled: true,
    payment_vendor_direct_enabled: true,
    payment_platform_credentials_source: 'environment',
    payment_paypal_mode: 'sandbox',
    payment_paypal_sandbox_client_id: 'settings_paypal_client',
    payment_paypal_sandbox_client_secret: 'settings_paypal_secret',
    payment_paypal_live_client_id: '',
    payment_paypal_live_client_secret: '',
    payment_paypal_currency: 'EUR',
    payment_paypal_fx_rate_tnd_to_target: 0.3,
    mandat_recipient_name: 'PandaMarket',
    mandat_recipient_cin: '12345678',
    mandat_recipient_city: 'Tunis',
    ...overrides,
  } as any;
}

function storeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'store_1',
    status: StoreStatus.Verified,
    is_verified: true,
    subscription_plan: 'pro',
    subscription_expires_at: new Date(Date.now() + 86_400_000),
    payment_config: null,
    shipping_mode: ShippingMode.SelfManaged,
    has_direct_payment: true,
    plan_enabled: true,
    ...overrides,
  };
}

function context(overrides: Record<string, unknown> = {}) {
  return {
    quote_id: 'quote_12345678',
    quote_version: 1,
    currency: 'TND',
    items: [{ store_id: 'store_1', product_type: ProductType.Physical }],
    shipping_address: address,
    ...overrides,
  } as any;
}

function method(result: { methods: Array<{ gateway: PaymentGateway }> }, gateway: PaymentGateway) {
  return result.methods.find((candidate) => candidate.gateway === gateway)!;
}

describe('PaymentCapabilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.config.flouci.appToken = 'platform_flouci_token';
    mocks.config.flouci.appSecret = 'platform_flouci_secret';
    mocks.config.konnect.apiKey = 'platform_konnect_key';
    mocks.config.konnect.receiverWallet = 'platform_konnect_wallet';
    mocks.getSettings.mockResolvedValue(settings());
    mocks.query.mockResolvedValue({ rows: [storeRow()], rowCount: 1 });
    mocks.decryptVendorConfig.mockReturnValue(null);
  });

  it('returns deterministic, buyer-safe capabilities for a ready physical cart', async () => {
    const service = new PaymentCapabilityService();
    const first = await service.assertGatewayAvailable({
      context: context(),
      gateway: PaymentGateway.Flouci,
    });
    const second = await service.assertGatewayAvailable({
      context: context(),
      gateway: PaymentGateway.Flouci,
    });

    expect(first.capability_version).toMatch(/^pcv1_[a-f0-9]{64}$/);
    expect(second.capability_version).toBe(first.capability_version);
    expect(first.vendor_credentials).toBeUndefined();
  });

  it('reports a disabled gateway without exposing configuration values', async () => {
    mocks.getSettings.mockResolvedValue(settings({ payment_flouci_enabled: false }));
    const service = new PaymentCapabilityService();
    const result = await service.getCapabilities({ context: context() });
    const flouci = method(result, PaymentGateway.Flouci);

    expect(flouci).toMatchObject({ available: false, reason_code: 'gateway_disabled' });
    expect(JSON.stringify(flouci)).not.toContain('token');
  });

  it('rejects platform payment when provider credentials are not configured', async () => {
    mocks.config.flouci.appToken = 'sandbox_token';
    mocks.config.flouci.appSecret = 'sandbox_secret';
    const service = new PaymentCapabilityService();

    await expect(service.assertGatewayAvailable({
      context: context(),
      gateway: PaymentGateway.Flouci,
    })).rejects.toMatchObject({
      code: 'PD_PAY_GATEWAY_UNAVAILABLE',
      details: { reason_code: 'provider_unavailable' },
    });
  });

  it('rejects an ineligible seller plan when platform policy requires direct payment', async () => {
    mocks.getSettings.mockResolvedValue(settings({
      payment_platform_credentials_source: 'vendor_direct_only',
    }));
    mocks.query.mockResolvedValue({
      rows: [storeRow({ subscription_plan: 'free', has_direct_payment: false, payment_config: 'encrypted' })],
      rowCount: 1,
    });
    mocks.decryptVendorConfig.mockReturnValue({
      flouci_app_token: 'vendor_token',
      flouci_app_secret: 'vendor_secret',
    });
    const service = new PaymentCapabilityService();

    await expect(service.assertGatewayAvailable({
      context: context(),
      gateway: PaymentGateway.Flouci,
    })).rejects.toMatchObject({
      details: { reason_code: 'direct_payment_unavailable' },
    });
  });

  it('rejects missing seller credentials in vendor-direct-only mode', async () => {
    mocks.getSettings.mockResolvedValue(settings({
      payment_platform_credentials_source: 'vendor_direct_only',
    }));
    const service = new PaymentCapabilityService();

    await expect(service.assertGatewayAvailable({
      context: context(),
      gateway: PaymentGateway.Konnect,
    })).rejects.toMatchObject({
      details: { reason_code: 'direct_credentials_unavailable' },
    });
  });

  it('rejects direct external payment for a multi-store order', async () => {
    mocks.getSettings.mockResolvedValue(settings({
      payment_platform_credentials_source: 'vendor_direct_only',
    }));
    mocks.query.mockResolvedValue({
      rows: [storeRow(), storeRow({ id: 'store_2' })],
      rowCount: 2,
    });
    const service = new PaymentCapabilityService();

    await expect(service.assertGatewayAvailable({
      context: context({
        items: [
          { store_id: 'store_1', product_type: ProductType.Physical },
          { store_id: 'store_2', product_type: ProductType.Physical },
        ],
      }),
      gateway: PaymentGateway.PayPal,
    })).rejects.toMatchObject({
      details: { reason_code: 'multi_store_unsupported' },
    });
  });

  it('rejects COD for a digital-only cart', async () => {
    const service = new PaymentCapabilityService();

    await expect(service.assertGatewayAvailable({
      context: context({
        items: [{ store_id: 'store_1', product_type: ProductType.Digital }],
        shipping_address: null,
      }),
      gateway: PaymentGateway.Cod,
    })).rejects.toMatchObject({
      details: { reason_code: 'physical_items_required' },
    });
  });

  it('rejects currently unsupported physical destinations', async () => {
    const service = new PaymentCapabilityService();

    await expect(service.assertGatewayAvailable({
      context: context({ shipping_address: { ...address, country: 'FR' } }),
      gateway: PaymentGateway.PayPal,
    })).rejects.toMatchObject({
      details: { reason_code: 'destination_unsupported' },
    });
  });

  it('checks shipping mode only for stores that contain physical items', async () => {
    mocks.getSettings.mockResolvedValue(settings({
      shipping_self_managed_enabled: true,
      shipping_platform_unified_enabled: false,
    }));
    mocks.query.mockResolvedValue({
      rows: [
        storeRow({ id: 'store_1', shipping_mode: ShippingMode.SelfManaged }),
        storeRow({ id: 'store_2', shipping_mode: ShippingMode.PlatformUnified }),
      ],
      rowCount: 2,
    });
    const service = new PaymentCapabilityService();

    const result = await service.getCapabilities({
      context: context({
        items: [
          { store_id: 'store_1', product_type: ProductType.Physical },
          { store_id: 'store_2', product_type: ProductType.Digital },
        ],
      }),
    });

    expect(method(result, PaymentGateway.Cod)).toMatchObject({ available: true });
  });

  it('rejects Mandat Minute when recipient instructions are incomplete', async () => {
    mocks.getSettings.mockResolvedValue(settings({ mandat_recipient_cin: '' }));
    const service = new PaymentCapabilityService();

    await expect(service.assertGatewayAvailable({
      context: context(),
      gateway: PaymentGateway.ManualMandat,
    })).rejects.toMatchObject({
      details: { reason_code: 'mandat_unavailable' },
    });
  });

  it('returns a stale conflict when the submitted capability version changed', async () => {
    const service = new PaymentCapabilityService();
    const original = await service.assertGatewayAvailable({
      context: context(),
      gateway: PaymentGateway.Flouci,
    });
    mocks.getSettings.mockResolvedValue(settings({ payment_konnect_enabled: false }));

    await expect(service.assertGatewayAvailable({
      context: context(),
      gateway: PaymentGateway.Flouci,
      expected_version: original.capability_version,
    })).rejects.toMatchObject({ code: 'PD_PAY_CAPABILITY_STALE' });
  });

  it('changes the capability version when PayPal conversion settings change', async () => {
    const service = new PaymentCapabilityService();
    const original = await service.getCapabilities({ context: context() });

    mocks.getSettings.mockResolvedValue(settings({ payment_paypal_fx_rate_tnd_to_target: 0.31 }));
    const changed = await service.getCapabilities({ context: context() });

    expect(changed.capability_version).not.toBe(original.capability_version);
  });

  it('rejects every method when a store becomes suspended or unverified', async () => {
    mocks.query.mockResolvedValue({
      rows: [storeRow({ status: StoreStatus.Suspended, is_verified: false })],
      rowCount: 1,
    });
    const service = new PaymentCapabilityService();

    await expect(service.assertGatewayAvailable({
      context: context(),
      gateway: PaymentGateway.Cod,
    })).rejects.toMatchObject({
      details: { reason_code: 'seller_unavailable' },
    });
  });

  it('selects complete seller credentials only for an entitled single store', async () => {
    mocks.query.mockResolvedValue({
      rows: [storeRow({ payment_config: 'encrypted' })],
      rowCount: 1,
    });
    mocks.decryptVendorConfig.mockReturnValue({
      konnect_api_key: 'vendor_api_key',
      konnect_receiver_wallet: 'vendor_wallet',
    });
    const service = new PaymentCapabilityService();
    const selection = await service.assertGatewayAvailable({
      context: context(),
      gateway: PaymentGateway.Konnect,
    });

    expect(selection.vendor_credentials).toMatchObject({
      konnect_api_key: 'vendor_api_key',
      konnect_receiver_wallet: 'vendor_wallet',
    });
    expect(selection.merchant_account_id).toBe('vendor_wallet');
  });
});
