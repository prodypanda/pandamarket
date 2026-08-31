import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SellerOrderDrawer, Order } from '@/components/dashboard/orders/SellerOrderDrawer';

vi.mock('@/lib/api', () => ({
  fetchWithCsrf: vi.fn(),
}));

describe('SellerOrderDrawer Component', () => {
  const mockOrder: Order = {
    id: 'ord_123456789',
    status: 'pending',
    payment_gateway: 'cod',
    payment_status: 'pending',
    payment_reference: 'REF-123',
    subtotal: '50.000',
    shipping_total: '7.000',
    total: '57.000',
    store_subtotal: '50.000',
    store_shipping_total: '7.000',
    store_total: '57.000',
    currency: 'TND',
    fulfillment_status: 'pending',
    created_at: '2026-08-31T12:00:00Z',
    customer_first_name: 'Ahmed',
    customer_last_name: 'Ben Ali',
    customer_email: 'ahmed@example.com',
    customer_phone: '21698765432',
    customer_order_count: 3,
    customer_lifetime_value: '240.000',
    items: [
      {
        id: 'item_1',
        product_id: 'prod_1',
        product_title: 'Casque Audio Sans Fil',
        quantity: 2,
        unit_price: '25.000',
        subtotal: '50.000',
        variant_title: 'Noir Mat',
        variant_sku: 'CASQ-BLK',
      },
    ],
    shipping_address: {
      first_name: 'Ahmed',
      last_name: 'Ben Ali',
      address_line_1: 'Avenue Habib Bourguiba',
      city: 'Tunis',
      postal_code: '1000',
      country: 'Tunisie',
      phone: '21698765432',
    },
  };

  const defaultProps = {
    order: mockOrder,
    isOpen: true,
    onClose: vi.fn(),
    onOrderUpdated: vi.fn(),
    marketplaceName: 'PandaMarket',
    locale: 'fr',
    t: (key: string) => key,
    formatMoney: (val: any) => `${val || '0.000'} TND`,
    formatDateTime: (val: any) => String(val || ''),
    statusLabel: (val: string) => val,
    paymentStatusLabel: (val: string) => val,
    paymentStatusColor: () => 'text-amber-600',
    fulfillmentLabel: (val: any) => String(val || 'En attente'),
    fulfillmentColor: () => 'text-amber-600',
    storeOrderStatus: () => ({ label: 'En attente', color: 'text-amber-600' }),
    buildOrderTimeline: () => [
      { label: 'Commande créée', description: 'Reçue', state: 'done' as const },
      { label: 'Validation', description: 'En cours', state: 'current' as const },
    ],
    canGenerateShippingLabel: () => true,
    canPrepare: () => true,
    canRevertPreparation: () => false,
    canFulfill: () => true,
    canMarkDelivered: () => false,
    canRequestRefund: () => true,
    refundableRemaining: () => 57,
    refundRequestedTotal: () => 0,
    refundStatusColor: () => 'text-emerald-600',
    refundStatusLabel: (val: string) => val,
    refundReasonLabel: (val: string) => val,
    latestShipment: () => null,
    generateShippingLabel: vi.fn(),
    startPreparation: vi.fn(),
    revertPreparation: vi.fn(),
    openFulfillmentModal: vi.fn(),
    markOrderDelivered: vi.fn(),
    openRefundModal: vi.fn(),
    startBuyerChat: vi.fn(),
    printSelectedOrder: vi.fn(),
    getTrackingUrl: () => null,
    MandatReceiptReviewWidget: () => <div data-testid="mandat-widget">Mandat Widget</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders order header, total, and 5 tabs properly', () => {
    render(<SellerOrderDrawer {...defaultProps} />);

    expect(screen.getByText(/dashboardPages\.orders\.orderDetails/i)).toBeInTheDocument();
    expect(screen.getByText('#23456789')).toBeInTheDocument();

    // 5 tabs present
    expect(screen.getByText(/Vue d'ensemble/i)).toBeInTheDocument();
    expect(screen.getByText(/Articles \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Expédition & Transport/i)).toBeInTheDocument();
    expect(screen.getByText(/Radar COD & Diagnostic/i)).toBeInTheDocument();
    expect(screen.getByText(/Facture & Notes/i)).toBeInTheDocument();

    // Facture PDF link
    const pdfLink = screen.getByTitle(/Télécharger la Facture Vendeur PDF/i);
    expect(pdfLink).toHaveAttribute('href', '/api/pd/orders/store/ord_123456789/invoice.pdf');
  });

  it('switches between tabs and shows editing controls in Articles tab', async () => {
    render(<SellerOrderDrawer {...defaultProps} />);

    // Click Articles tab
    const itemsTabButton = screen.getByText(/Articles \(1\)/i);
    fireEvent.click(itemsTabButton);

    // Verify item displayed
    expect(screen.getByText('Casque Audio Sans Fil')).toBeInTheDocument();
    expect(screen.getByText('Noir Mat')).toBeInTheDocument();
    expect(screen.getByText('SKU: CASQ-BLK')).toBeInTheDocument();

    // Verify Add item button is visible when editable
    expect(screen.getByText(/Ajouter un article/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Supprimer cet article/i)).toBeInTheDocument();
  });

  it('switches to COD tab and displays risk score diagnostic', () => {
    render(<SellerOrderDrawer {...defaultProps} />);

    const codTabButton = screen.getByText(/Radar COD & Diagnostic/i);
    fireEvent.click(codTabButton);

    expect(screen.getByText(/dashboardPages\.orders\.codDiagnosticTitle/i)).toBeInTheDocument();
    expect(screen.getByText(/dashboardPages\.orders\.whatsAppOneClick/i)).toBeInTheDocument();
    expect(screen.getByText(/dashboardPages\.orders\.callCustomer/i)).toBeInTheDocument();
  });
});
