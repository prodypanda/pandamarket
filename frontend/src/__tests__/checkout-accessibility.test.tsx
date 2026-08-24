import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckoutQuote } from '@/lib/checkout-quote';

const mocks = vi.hoisted(() => ({
  quote: null as CheckoutQuote | null,
  quoteLoading: false,
  refreshQuote: vi.fn(),
  fetchWithCsrf: vi.fn(),
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock('@/lib/api', () => ({ fetchWithCsrf: mocks.fetchWithCsrf }));
vi.mock('@/hooks/useCheckoutQuote', () => ({
  useCheckoutQuote: () => ({
    quote: mocks.quote,
    error: null,
    isLoading: mocks.quoteLoading,
    refresh: mocks.refreshQuote,
  }),
}));
vi.mock('@/lib/marketplace-analytics', () => ({
  trackCheckoutStarted: vi.fn(),
  trackCheckoutPaymentStarted: vi.fn(),
  trackCheckoutPaymentCompleted: vi.fn(),
  trackCheckoutFailed: vi.fn(),
  trackCheckoutAddressSubmitted: vi.fn(),
}));
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    items: [{
      id: 'cart_1',
      product_id: 'product_1',
      title: 'Test product',
      price: 25,
      quantity: 1,
      store_id: 'store_1',
      store_name: 'Test store',
      product_type: 'physical',
      image_url: null,
    }],
    couponCode: null,
    clearCart: vi.fn(),
    removeStoreItems: vi.fn(),
  }),
}));
vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string) => ({
      'checkout.title': 'Checkout',
      'checkout.address.title': 'Shipping address',
      'checkout.address.firstName': 'Full name',
      'checkout.address.address': 'Address',
      'checkout.address.city': 'City',
      'checkout.address.postalCode': 'Postal code',
      'checkout.address.phone': 'Phone',
      'checkout.payment.title': 'Payment method',
      'checkout.confirm': 'Confirm and pay',
      'checkout.processing': 'Processing',
      'checkout.payment.flouci': 'Flouci',
      'checkout.payment.konnect': 'Konnect',
      'checkout.payment.mandat': 'Mandat Minute',
      'checkout.payment.mandatInstructions': 'Mandat instructions',
      'checkout.payment.cod': 'Cash on delivery',
      'checkout.payment.codInstructions': 'COD instructions',
      'cart.total': 'Total',
      'cart.title': 'Cart',
      'cart.shipping': 'Shipping',
      'cart.empty': 'Cart empty',
      'cart.emptySubtitle': 'Cart empty',
      'cart.continueShopping': 'Continue shopping',
      'common.currency': 'TND',
      'errors.networkError': 'Network error',
    }[key] || key),
  }),
}));
vi.mock('@/hooks/useMarketplaceTheme', () => ({
  useMarketplaceTheme: () => ({
    settings: { marketplace_name: 'PandaMarket' },
    classes: {
      pageSoft: '',
      header: '',
      panel: '',
      primaryText: '',
      primaryGradient: '',
      primaryBorder: '',
      primarySoft: '',
      focus: '',
    },
    isAliExpress: false,
  }),
}));
vi.mock('@/components/hub/HubNavbar', () => ({ HubNavbar: () => null }));
vi.mock('@/components/hub/HubFooter', () => ({ HubFooter: () => null }));
vi.mock('@/components/MarketplaceBrand', () => ({ MarketplaceBrand: () => null }));
vi.mock('@/lib/store-hosts', () => ({ isMarketplaceHost: () => false }));
vi.mock('@/lib/storefront-url', () => ({ getHubAbsoluteUrl: (path: string) => path }));
vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  useParams: () => ({ storeHost: 'shop.example.test' }),
}));

import HubCheckoutPage from '../app/hub/checkout/page';
import StoreCheckoutPage from '../app/store/[storeHost]/checkout/page';

const quoteFor = (available: boolean): CheckoutQuote => ({
  id: 'quote_1',
  quote_version: 1,
  issued_at: '2026-08-20T12:00:00.000Z',
  store_id: available ? 'store_1' : null,
  items: [{
    product_id: 'product_1',
    variant_id: null,
    store_id: 'store_1',
    title: 'Test product',
    unit_price: 25,
    quantity: 1,
    subtotal: 25,
    product_type: 'physical',
  }],
  shipping_address: null,
  coupon_code: null,
  currency: 'TND',
  subtotal: 25,
  discount_total: 0,
  shipping_total: 7,
  tax_total: 0,
  total: 32,
  breakdown: {},
  payment_capabilities: {
    quote_id: 'quote_1',
    quote_version: 1,
    capability_version: `pcv1_${'a'.repeat(64)}`,
    currency: 'TND',
    methods: [
      { gateway: 'flouci', available, requires_redirect: true, buyer_message: available ? undefined : 'Unavailable' },
      { gateway: 'cod', available: false, requires_redirect: false, buyer_message: 'Unavailable' },
    ],
  },
  expires_at: '2099-01-01T00:00:00.000Z',
  consumed_at: null,
  consumed_order_id: null,
});

const tenantStoreResponse = {
  store: {
    id: 'store_1',
    name: 'Test store',
    theme_id: 'classic',
    status: 'verified',
    is_verified: true,
  },
};

function resetHarness() {
  mocks.quote = quoteFor(true);
  mocks.quoteLoading = false;
  mocks.refreshQuote.mockReset();
  mocks.router.push.mockReset();
  mocks.router.replace.mockReset();
  mocks.fetchWithCsrf.mockReset();
  mocks.fetchWithCsrf.mockImplementation((input: string) => {
    if (input.includes('/stores/by-host/')) return Promise.resolve(new Response(JSON.stringify(tenantStoreResponse), { status: 200 }));
    if (input.includes('/marketplace/settings')) return Promise.resolve(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    if (input.includes('/storefront/auth/me')) return Promise.resolve(new Response('{}', { status: 200 }));
    return Promise.resolve(new Response('{}', { status: 200 }));
  });
}

beforeEach(() => {
  resetHarness();
  vi.clearAllMocks();
  resetHarness();
});

describe('checkout accessibility contract', () => {
  it.each([
    ['Hub', HubCheckoutPage, 'hub_checkout_full_name'],
    ['tenant storefront', StoreCheckoutPage, 'checkout_full_name'],
  ])('moves focus to the first invalid address field on %s', async (_name, Page, firstFieldId) => {
    render(<Page />);
    if (Page === StoreCheckoutPage) {
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument());
    }

    const form = screen.getByRole('form');
    const prefix = Page === HubCheckoutPage ? 'hub_checkout' : 'checkout';
    fireEvent.change(document.getElementById(`${prefix}_address_line`) as HTMLInputElement, { target: { value: 'Keep this address' } });
    fireEvent.submit(form);

    await waitFor(() => {
      const firstField = document.getElementById(firstFieldId) as HTMLInputElement;
      expect(firstField).toHaveAttribute('aria-invalid', 'true');
      expect(firstField).toHaveAttribute('aria-describedby', `${firstFieldId}_error`);
      expect(firstField).toHaveFocus();
    });
    expect(document.getElementById(`${prefix}_address_line`)).toHaveValue('Keep this address');
    expect(screen.getAllByText(/This field is required\.|Ce champ est obligatoire\./).length).toBeGreaterThan(0);
  });

  it.each([
    ['Hub', HubCheckoutPage, 'hub_checkout_full_name'],
    ['tenant storefront', StoreCheckoutPage, 'checkout_full_name'],
  ])('handles a browser native invalid event with the same error and focus contract on %s', async (_name, Page, firstFieldId) => {
    render(<Page />);
    if (Page === StoreCheckoutPage) {
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument());
    }

    const firstField = document.getElementById(firstFieldId) as HTMLInputElement;
    fireEvent.invalid(firstField);

    await waitFor(() => {
      expect(firstField).toHaveAttribute('aria-invalid', 'true');
      expect(firstField).toHaveFocus();
    });
  });

  it.each([
    ['Hub', HubCheckoutPage, 'hub_checkout_payment_error'],
    ['tenant storefront', StoreCheckoutPage, 'checkout_payment_error'],
  ])('focuses the payment group and exposes its error on %s', async (_name, Page, errorId) => {
    mocks.quote = quoteFor(false);
    render(<Page />);
    if (Page === StoreCheckoutPage) {
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument());
    }

    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-describedby', errorId);

    const fields: Record<string, string> = {
      full_name: 'Amira Ben Salah',
      address_line: '12 Rue de Tunis',
      city: 'Tunis',
      postal_code: '1000',
      phone: '22111222',
    };
    Object.entries(fields).forEach(([name, value]) => {
      const prefix = Page === HubCheckoutPage ? 'hub_checkout' : 'checkout';
      fireEvent.change(document.getElementById(`${prefix}_${name}`) as HTMLInputElement, { target: { value } });
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      const group = screen.getByRole('radiogroup');
      expect(group).toHaveAttribute('aria-invalid', 'true');
      expect(group).toHaveAttribute('aria-describedby', errorId);
      expect(group).toHaveFocus();
    });
    expect(document.getElementById(errorId)).toHaveAttribute('role', 'alert');
  });

  it.each([
    ['Hub', HubCheckoutPage],
    ['tenant storefront', StoreCheckoutPage],
  ])('exposes busy state and disables confirmation while loading on %s', async (_name, Page) => {
    mocks.quote = null;
    mocks.quoteLoading = true;
    render(<Page />);
    if (Page === StoreCheckoutPage) {
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument());
    }
    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /confirm|confirmer|calcul|total/i })).toBeDisabled();
  });

  it.each([
    ['Hub', HubCheckoutPage],
    ['tenant storefront', StoreCheckoutPage],
  ])('keeps payment radios keyboard and screen-reader addressable on %s', async (_name, Page) => {
    render(<Page />);
    if (Page === StoreCheckoutPage) {
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument());
    }

    const radios = screen.getAllByRole('radio');
    const availableRadio = radios.find((radio) => radio.getAttribute('value') === 'flouci') as HTMLInputElement;
    const unavailableRadio = radios.find((radio) => radio.getAttribute('value') === 'cod') as HTMLInputElement;
    expect(availableRadio).toBeChecked();
    expect(availableRadio).not.toBeDisabled();
    expect(availableRadio).toHaveAttribute('name', 'payment_gateway');
    expect(availableRadio).toHaveAttribute('aria-describedby');
    expect(unavailableRadio).toBeDisabled();
  });
});
