import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('order_id=ord_test123'),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../hooks/useMarketplaceTheme', () => ({
  useMarketplaceTheme: () => ({
    settings: { marketplace_name: 'PandaMarket' },
    classes: {
      panel: 'panel-class',
      primarySoft: 'primary-soft',
      primaryText: 'primary-text',
      primaryGradient: 'primary-gradient',
      pageSoft: 'page-soft',
    },
  }),
}));

vi.mock('../components/hub/HubNavbar', () => ({
  HubNavbar: () => <nav data-testid="navbar" />,
}));

vi.mock('../components/hub/HubFooter', () => ({
  HubFooter: () => <footer data-testid="footer" />,
}));

const { mockFetchWithCsrf } = vi.hoisted(() => ({
  mockFetchWithCsrf: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  fetchWithCsrf: mockFetchWithCsrf,
}));

import CheckoutSuccessPage from '../app/hub/checkout/success/page';

describe('PLAN-B-10: Checkout Success Payment Verification & Working CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders payment failed view when payment_status is failed', async () => {
    mockFetchWithCsrf.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        order: { id: 'ord_test123', payment_status: 'failed' },
      }),
    });

    render(<CheckoutSuccessPage />);

    await waitFor(() => {
      expect(screen.getByText('Échec du paiement')).toBeDefined();
    });

    expect(screen.getByText('Retourner au panier')).toBeDefined();
    const orderLink = screen.getByText('Voir la commande').closest('a');
    expect(orderLink?.getAttribute('href')).toBe('/hub/orders?highlight=ord_test123');
  });

  it('renders payment pending view when payment_status is payment_required (e.g. Mandat)', async () => {
    mockFetchWithCsrf.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        order: { id: 'ord_test123', payment_status: 'payment_required' },
      }),
    });

    render(<CheckoutSuccessPage />);

    await waitFor(() => {
      expect(screen.getByText('Paiement en attente')).toBeDefined();
    });

    const trackLink = screen.getByText('Suivre ma commande').closest('a');
    expect(trackLink?.getAttribute('href')).toBe('/hub/orders?highlight=ord_test123');
  });

  it('renders payment confirmed view with working order link when payment_status is captured', async () => {
    mockFetchWithCsrf.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        order: { id: 'ord_test123', payment_status: 'captured' },
      }),
    });

    render(<CheckoutSuccessPage />);

    await waitFor(() => {
      expect(screen.getByText('Paiement Confirmé !')).toBeDefined();
    });

    const ctaLink = screen.getByText('Voir ma commande').closest('a');
    expect(ctaLink).not.toBeNull();
    expect(ctaLink?.getAttribute('href')).toBe('/hub/orders?highlight=ord_test123');
  });

  it('renders order-not-found view when the order id is unknown (never success)', async () => {
    mockFetchWithCsrf.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: 'Order not found' } }),
    });

    render(<CheckoutSuccessPage />);

    await waitFor(() => {
      expect(screen.getByText('Commande introuvable')).toBeDefined();
    });

    expect(screen.queryByText('Paiement Confirmé !')).toBeNull();
    const ordersLink = screen.getByText('Mes commandes').closest('a');
    expect(ordersLink?.getAttribute('href')).toBe('/hub/orders');
  });

  it('renders order-not-found view when the fetch rejects (never success)', async () => {
    mockFetchWithCsrf.mockRejectedValueOnce(new Error('network down'));

    render(<CheckoutSuccessPage />);

    await waitFor(() => {
      expect(screen.getByText('Commande introuvable')).toBeDefined();
    });
    expect(screen.queryByText('Paiement Confirmé !')).toBeNull();
  });
});
