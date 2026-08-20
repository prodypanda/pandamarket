import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductStatus, ProductType, SellerType, StoreStatus } from '@pandamarket/types';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  clientQuery: vi.fn(),
  getSettings: vi.fn(),
  pdId: vi.fn(() => 'pd_quote_test'),
  sha256: vi.fn((value: string) => `hash:${value}`),
}));

vi.mock('../db/pool', () => ({ transaction: mocks.transaction }));
vi.mock('../utils/crypto', () => ({ pdId: mocks.pdId, sha256: mocks.sha256 }));
vi.mock('../services/platform-config.service', () => ({
  platformConfigService: { getSettings: mocks.getSettings },
}));

import { CheckoutQuoteService } from '../services/checkout-quote.service';

const address = {
  first_name: 'Ada',
  last_name: 'Buyer',
  phone: '21699111222',
  address_line_1: '1 Rue Test',
  city: 'Tunis',
  postal_code: '1000',
  country: 'TN',
};

const settings = {
  shipping_enabled: true,
  shipping_remote_zone_cities: '',
  shipping_domestic_zone_cities: 'Tunis',
  shipping_remote_zone_rate_tnd: 12,
  shipping_domestic_zone_rate_tnd: 7,
  shipping_platform_flat_rate_tnd: 7,
  shipping_free_shipping_threshold_tnd: 0,
  tax_mode: 'none',
  default_tax_rate: 0,
  default_currency: 'TND',
} as any;

function productRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod_1',
    store_id: 'store_1',
    title: 'Test product',
    price: '100.000',
    inventory_quantity: 10,
    status: ProductStatus.Published,
    type: ProductType.Physical,
    metadata: {},
    seller_type: SellerType.Retailer,
    store_status: StoreStatus.Verified,
    store_is_verified: true,
    ...overrides,
  };
}

describe('CheckoutQuoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettings.mockResolvedValue(settings);
    mocks.transaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => callback({ query: mocks.clientQuery }));
  });

  it('calculates server shipping, coupon, and per-line discount breakdowns', async () => {
    const service = new CheckoutQuoteService();
    const executor = { query: vi.fn().mockResolvedValue({ rows: [productRow()] }) } as any;
    const lines = await service.resolveLines(executor, [{ product_id: 'prod_1', quantity: 1 }]);
    const totals = await service.calculateTotals(executor, lines, settings, address, 'PANDA10', { rejectInvalidCoupon: true });

    expect(totals.subtotal).toBe(100);
    expect(totals.product_discount_total).toBe(10);
    expect(totals.shipping_total).toBe(7);
    expect(totals.total).toBe(97);
    expect(totals.lines[0].discount_amount).toBe(10);
    expect(totals.breakdown).toMatchObject({
      coupon: { code: 'PANDA10', product_discount: 10 },
      shipping: { total: 7 },
    });
  });

  it('rejects an ineligible coupon instead of silently accepting a client discount', async () => {
    const service = new CheckoutQuoteService();
    const executor = { query: vi.fn().mockResolvedValue({ rows: [productRow({ price: '50.000' })] }) } as any;
    const lines = await service.resolveLines(executor, [{ product_id: 'prod_1', quantity: 1 }]);

    await expect(service.calculateTotals(executor, lines, settings, address, 'SUPER15', { rejectInvalidCoupon: true }))
      .rejects.toThrow('minimum merchandise subtotal');
  });

  it('rejects a changed cart when matching a persisted quote', () => {
    const service = new CheckoutQuoteService();
    const quote = {
      id: 'quote_1',
      quote_version: 1,
      owner_user_id: 'buyer_1',
      owner_storefront_customer_id: null,
      store_id: null,
      items: [{ product_id: 'prod_1', variant_id: null, quantity: 1 }],
      shipping_address: null,
      coupon_code: null,
      currency: 'TND',
      subtotal: 100,
      discount_total: 0,
      shipping_total: 0,
      tax_total: 0,
      total: 100,
      breakdown: {},
      snapshot_hash: 'hash',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      consumed_at: null,
      consumed_order_id: null,
    };

    expect(() => service.assertMatches(quote, {
      owner_user_id: 'buyer_1',
      items: [{ product_id: 'prod_1', quantity: 2 }],
      shipping_address: null,
      totals: {
        subtotal: 100,
        discount_total: 0,
        product_discount_total: 0,
        shipping_discount_total: 0,
        shipping_total: 0,
        tax_total: 0,
        total: 100,
        currency: 'TND',
        shipping_by_store: {},
        lines: [],
        breakdown: {},
        snapshot: {},
      },
    })).toThrow('Cart contents changed');
  });

  it('creates a short-lived persisted quote with a tamper-evident snapshot hash', async () => {
    const service = new CheckoutQuoteService();
    mocks.clientQuery
      .mockResolvedValueOnce({ rows: [productRow()] })
      .mockResolvedValueOnce({ rows: [] });

    const quote = await service.createQuote({
      owner_user_id: 'buyer_1',
      items: [{ product_id: 'prod_1', quantity: 1 }],
      shipping_address: address,
      coupon_code: 'PANDA10',
    });

    expect(quote.id).toBe('pd_quote_test');
    expect(new Date(quote.expires_at).getTime()).toBeGreaterThan(Date.now());
    expect(quote.snapshot_hash).toContain('hash:');
    expect(mocks.clientQuery).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO pd_checkout_quote'), expect.any(Array));
  });
});
