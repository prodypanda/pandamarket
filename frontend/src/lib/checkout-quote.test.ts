import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithCsrf } from './api';
import {
  checkoutQuoteTotalsMatch,
  createCheckoutIdempotencyKey,
  isCheckoutAddressComplete,
  normalizeCheckoutAddress,
  requestCheckoutQuote,
  submitCheckoutOrder,
  toCheckoutItems,
  type CheckoutQuote,
} from './checkout-quote';

vi.mock('./api', () => ({ fetchWithCsrf: vi.fn() }));

const mockedFetchWithCsrf = vi.mocked(fetchWithCsrf);

const quote: CheckoutQuote = {
  id: 'quote_12345678',
  quote_version: 1,
  store_id: null,
  items: [],
  shipping_address: null,
  coupon_code: 'PANDA10',
  currency: 'TND',
  subtotal: 100,
  discount_total: 10,
  shipping_total: 7,
  tax_total: 0,
  total: 97,
  breakdown: {},
  payment_capabilities: {
    quote_id: 'quote_12345678',
    quote_version: 1,
    capability_version: `pcv1_${'a'.repeat(64)}`,
    currency: 'TND',
    methods: [
      { gateway: 'flouci', available: true, requires_redirect: true },
      { gateway: 'cod', available: false, reason_code: 'physical_items_required', requires_redirect: false },
    ],
  },
  expires_at: '2026-08-20T12:15:00.000Z',
  consumed_at: null,
  consumed_order_id: null,
};

beforeEach(() => {
  mockedFetchWithCsrf.mockReset();
});

describe('checkout quote client', () => {
  it('requests a Hub quote with identifiers and quantities but no browser prices', async () => {
    mockedFetchWithCsrf.mockResolvedValue(new Response(JSON.stringify({ data: quote }), { status: 201 }));

    await requestCheckoutQuote({
      scope: 'hub',
      items: toCheckoutItems([{ product_id: 'prod_1', variant_id: 'var_1', quantity: 2 }]),
      shippingAddress: null,
      couponCode: 'PANDA10',
    });

    expect(mockedFetchWithCsrf).toHaveBeenCalledWith('/api/pd/cart/quote', expect.objectContaining({ method: 'POST' }));
    const init = mockedFetchWithCsrf.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      items: [{ product_id: 'prod_1', variant_id: 'var_1', quantity: 2 }],
      shipping_address: null,
      coupon_code: 'PANDA10',
    });
    expect(JSON.stringify(body)).not.toContain('price');
  });

  it('uses the tenant quote endpoint for storefront checkout', async () => {
    mockedFetchWithCsrf.mockResolvedValue(new Response(JSON.stringify({ data: quote }), { status: 201 }));

    await requestCheckoutQuote({
      scope: 'storefront',
      items: [{ product_id: 'prod_1', quantity: 1 }],
      shippingAddress: null,
    });

    expect(mockedFetchWithCsrf).toHaveBeenCalledWith(
      '/api/pd/cart/storefront/quote',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('rejects a quote response with an incomplete payment capability contract', async () => {
    mockedFetchWithCsrf.mockResolvedValue(new Response(JSON.stringify({
      data: {
        ...quote,
        payment_capabilities: { ...quote.payment_capabilities, methods: [] },
      },
    }), { status: 201 }));

    await expect(requestCheckoutQuote({
      scope: 'hub',
      items: [{ product_id: 'prod_1', quantity: 1 }],
      shippingAddress: null,
    })).rejects.toThrow('checkout quote response was incomplete');
  });

  it('submits the authoritative quote and reuses the supplied idempotency key', async () => {
    mockedFetchWithCsrf.mockResolvedValue(new Response(JSON.stringify({ order: { id: 'order_1' } }), { status: 201 }));
    const idempotencyKey = 'checkout_storefront_stable-key';

    await submitCheckoutOrder({
      scope: 'storefront',
      idempotencyKey,
      quoteId: quote.id,
      items: [{ product_id: 'prod_1', quantity: 1 }],
      shippingAddress: null,
      paymentGateway: 'flouci',
      paymentCapabilityVersion: quote.payment_capabilities.capability_version,
      couponCode: quote.coupon_code,
    });

    const [endpoint, init] = mockedFetchWithCsrf.mock.calls[0];
    expect(endpoint).toBe('/api/pd/orders/storefront/checkout');
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe(idempotencyKey);
    expect(JSON.parse(String(init?.body))).toEqual(expect.objectContaining({
      quote_id: quote.id,
      coupon_code: 'PANDA10',
      payment_gateway: 'flouci',
      payment_capability_version: quote.payment_capabilities.capability_version,
    }));
  });

  it('preserves machine-readable quote errors', async () => {
    mockedFetchWithCsrf.mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'PD_ORDER_QUOTE_STALE', message: 'Quote changed' },
    }), { status: 409 }));

    await expect(requestCheckoutQuote({
      scope: 'hub',
      items: [{ product_id: 'prod_1', quantity: 1 }],
      shippingAddress: null,
    })).rejects.toMatchObject({
      status: 409,
      code: 'PD_ORDER_QUOTE_STALE',
      message: 'Quote changed',
    });
  });

  it('normalizes names and requires every server-required physical address field', () => {
    const address = {
      full_name: '  Amira Ben Salah ',
      address_line: '  12 Rue de Tunis ',
      city: ' Tunis ',
      postal_code: ' 1000 ',
      phone: ' 22111222 ',
    };

    expect(normalizeCheckoutAddress(address)).toEqual({
      first_name: 'Amira',
      last_name: 'Ben Salah',
      address_line_1: '12 Rue de Tunis',
      city: 'Tunis',
      postal_code: '1000',
      phone: '22111222',
      country: 'TN',
    });
    expect(isCheckoutAddressComplete(address)).toBe(true);
    expect(isCheckoutAddressComplete({ ...address, postal_code: '' })).toBe(false);
  });

  it('detects any payable quote change before confirmation', () => {
    expect(checkoutQuoteTotalsMatch(quote, { ...quote })).toBe(true);
    expect(checkoutQuoteTotalsMatch(quote, { ...quote, shipping_total: 9, total: 99 })).toBe(false);
    expect(checkoutQuoteTotalsMatch(quote, {
      ...quote,
      payment_capabilities: {
        ...quote.payment_capabilities,
        capability_version: `pcv1_${'b'.repeat(64)}`,
      },
    })).toBe(false);
    expect(checkoutQuoteTotalsMatch(null, quote)).toBe(false);
    expect(createCheckoutIdempotencyKey('hub')).toMatch(/^checkout_hub_/);
  });
});
