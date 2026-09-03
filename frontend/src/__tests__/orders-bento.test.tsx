import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OrdersBentoCockpit, isUrgentCodOrder } from '@/components/dashboard/OrdersBentoCockpit';
import type { Order, OrderMeta } from '@/app/hub/dashboard/orders/page';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    locale: 'fr',
    dir: 'ltr',
  }),
}));

describe('OrdersBentoCockpit Component', () => {
  const mockOrders: Order[] = [
    {
      id: 'ord_aramex_01',
      status: 'processing',
      payment_gateway: 'cod',
      payment_status: 'pending',
      subtotal: '80.000',
      shipping_total: '7.500',
      total: '87.500',
      store_total: '87.500',
      currency: 'TND',
      fulfillment_status: 'fulfilled',
      carrier: 'Aramex Tunisie',
      tracking_number: 'ARAMEX-TN-1001',
      created_at: '2026-09-02T10:00:00Z',
      customer_first_name: 'Sami',
      customer_last_name: 'Trabelsi',
      customer_phone: '21698111222',
      cod_status: 'confirmed',
      cod_risk_score: 15,
      items: [
        {
          id: 'item_1',
          product_title: 'Smartphone Stand',
          quantity: 1,
          unit_price: '80.000',
        },
      ],
      shipping_address: {
        first_name: 'Sami',
        last_name: 'Trabelsi',
        city: 'Tunis',
        postal_code: '1001',
        phone: '21698111222',
      },
    },
    {
      id: 'ord_urgent_cod_02',
      status: 'pending',
      payment_gateway: 'cod',
      payment_status: 'pending',
      subtotal: '120.000',
      shipping_total: '8.000',
      total: '128.000',
      store_total: '128.000',
      currency: 'TND',
      fulfillment_status: 'pending',
      carrier: null,
      created_at: '2026-09-02T11:30:00Z',
      customer_first_name: 'Leila',
      customer_last_name: 'Ben Salem',
      customer_phone: '21650333444',
      cod_status: 'pending',
      cod_risk_score: 85,
      cod_verification: {
        id: 'cod_ver_urgent_02',
        order_id: 'ord_urgent_cod_02',
        store_id: 'store_test_01',
        status: 'pending',
        call_attempts: 1,
        last_call_at: '2026-09-02T11:00:00Z',
        otp_sent_at: null,
        otp_verified_at: null,
        risk_score: 85,
        risk_factors: [
          {
            name: 'high_value_cod',
            impact: 'negative',
            description: 'Commande COD supérieure à 100 TND',
          },
        ],
        notes: null,
        verified_by: null,
        created_at: '2026-09-02T11:30:00Z',
        updated_at: '2026-09-02T11:30:00Z',
      },
      items: [
        {
          id: 'item_2',
          product_title: 'Robe Brodée Soie',
          quantity: 2,
          unit_price: '60.000',
        },
      ],
      shipping_address: {
        first_name: 'Leila',
        last_name: 'Ben Salem',
        city: 'Sousse',
        postal_code: '4000',
        phone: '21650333444',
      },
    },
    {
      id: 'ord_rapid_poste_03',
      status: 'delivered',
      payment_gateway: 'card',
      payment_status: 'captured',
      subtotal: '45.000',
      shipping_total: '6.500',
      total: '51.500',
      store_total: '51.500',
      currency: 'TND',
      fulfillment_status: 'delivered',
      carrier: 'Rapid-Poste (La Poste TN)',
      tracking_number: 'RP-TN-9988',
      created_at: '2026-09-01T08:15:00Z',
      customer_first_name: 'Yassine',
      customer_last_name: 'Gharbi',
      customer_phone: '21622555666',
      items: [
        {
          id: 'item_3',
          product_title: 'Cafetière Tunisienne',
          quantity: 1,
          unit_price: '45.000',
        },
      ],
      shipping_address: {
        first_name: 'Yassine',
        last_name: 'Gharbi',
        city: 'Sfax',
        postal_code: '3000',
      },
    },
  ];

  const mockMeta: OrderMeta = {
    page: 1,
    limit: 20,
    total: 3,
    total_pages: 1,
    summary: {
      total_orders: 3,
      open_orders: 2,
      to_ship: 1,
      shipped: 1,
      delivered: 1,
      cancelled: 0,
      refunded: 0,
      captured_orders: 1,
      captured_revenue: 51.5,
      revenue_today: 87.5,
      revenue_7d: 267.0,
      revenue_30d: 1250.0,
      average_order_value: 89.0,
      refund_rate: 0,
      average_fulfillment_hours: 18,
      fulfillment_sla_rate: 98,
    },
  };

  const createDefaultProps = () => ({
    orders: mockOrders,
    meta: mockMeta,
    loading: false,
    onRefresh: vi.fn(async () => {}),
    onSelectOrder: vi.fn(),
    onFulfillOrder: vi.fn(),
    onGenerateLabel: vi.fn(async () => {}),
    onUpdateCodStatus: vi.fn(async () => {}),
    onSendCodOtp: vi.fn(async () => {}),
    onVerifyCodOtp: vi.fn(async () => {}),
    onPrintOrder: vi.fn(),
    onCancelFulfillment: vi.fn(),
    updatingCodStatus: false,
    sendingCodOtp: false,
    dir: 'ltr' as const,
  });

  it('renders the Bento Cockpit header and all 5 Tunisian courier pipeline options', () => {
    const props = createDefaultProps();
    render(<OrdersBentoCockpit {...props} />);

    expect(screen.getByText('Cockpit Logistique & Expéditions')).toBeInTheDocument();

    const pipelineSection = screen.getByRole('region', { name: /Pipeline des transporteurs/i });
    expect(within(pipelineSection).getByText(/Aramex Express/i)).toBeInTheDocument();
    expect(within(pipelineSection).getByText(/Rapid-Poste/i)).toBeInTheDocument();
    expect(within(pipelineSection).getByText(/Runex/i)).toBeInTheDocument();
    expect(within(pipelineSection).getByText(/First Delivery/i)).toBeInTheDocument();
    expect(within(pipelineSection).getByText(/Prêt à expédier/i)).toBeInTheDocument();
  });

  it('displays the Urgent COD Action card for pending COD orders sorted by risk score', () => {
    const props = createDefaultProps();
    render(<OrdersBentoCockpit {...props} />);

    const urgentSection = screen.getByRole('region', { name: /Validation urgente/i });
    expect(within(urgentSection).getByText('Validation Urgente COD & Anti-Refus')).toBeInTheDocument();
    expect(within(urgentSection).getByText(/1 à traiter/i)).toBeInTheDocument();
    expect(within(urgentSection).getByText('Leila Ben Salem')).toBeInTheDocument();
    expect(within(urgentSection).getByText(/Risque 85\/100/i)).toBeInTheDocument();
    expect(within(urgentSection).getByText('128.000 TND')).toBeInTheDocument();
  });

  it('executes 1-click status transitions on the urgent COD card', async () => {
    const props = createDefaultProps();
    render(<OrdersBentoCockpit {...props} />);

    const urgentSection = screen.getByRole('region', { name: /Validation urgente/i });

    // Click "Confirmer"
    const confirmBtn = within(urgentSection).getByRole('button', { name: /Confirmer/i });
    fireEvent.click(confirmBtn);
    expect(props.onUpdateCodStatus).toHaveBeenCalledWith('ord_urgent_cod_02', 'confirmed');

    // Click "SMS OTP"
    const otpBtn = within(urgentSection).getByRole('button', { name: /SMS OTP/i });
    fireEvent.click(otpBtn);
    expect(props.onSendCodOtp).toHaveBeenCalledWith('ord_urgent_cod_02');

    // Click "Injoignable"
    const unreachableBtn = within(urgentSection).getByRole('button', { name: /Injoignable/i });
    fireEvent.click(unreachableBtn);
    expect(props.onUpdateCodStatus).toHaveBeenCalledWith('ord_urgent_cod_02', 'unreachable', 1, expect.any(String));

    // Click "Refuser"
    const rejectBtn = within(urgentSection).getByRole('button', { name: /Refuser/i });
    fireEvent.click(rejectBtn);
    expect(props.onUpdateCodStatus).toHaveBeenCalledWith('ord_urgent_cod_02', 'rejected', 0, expect.any(String));

    // Verify dialer tel link
    const callLink = within(urgentSection).getByRole('link', { name: /Appeler/i });
    expect(callLink).toHaveAttribute('href', 'tel:21650333444');
  });

  it('filters the visual order stream when a courier card is clicked', () => {
    const props = createDefaultProps();
    render(<OrdersBentoCockpit {...props} />);

    // Click on Aramex card
    const aramexCard = screen.getByRole('button', { name: /Aramex Express/i });
    fireEvent.click(aramexCard);

    // Active filter banner should appear
    const filterBanner = screen.getByText(/Filtre transporteur actif:/i).parentElement;
    expect(within(filterBanner!).getByText('Aramex Tunisie')).toBeInTheDocument();
    expect(screen.getAllByText('Aramex Tunisie')).toHaveLength(2);

    // Sami Trabelsi should be present, but Yassine Gharbi should be filtered out
    expect(screen.getByText('Sami Trabelsi')).toBeInTheDocument();
    expect(screen.queryByText('Yassine Gharbi')).not.toBeInTheDocument();
  });

  it('triggers quick actions from the visual card stream', () => {
    const props = createDefaultProps();
    render(<OrdersBentoCockpit {...props} />);

    // Details button
    const detailButtons = screen.getAllByRole('button', { name: /Détails/i });
    fireEvent.click(detailButtons[0]);
    expect(props.onSelectOrder).toHaveBeenCalledWith(mockOrders[0]);

    // Expédier button (exact match on action button)
    const shipButton = screen.getByRole('button', { name: /^Expédier$/i });
    fireEvent.click(shipButton);
    expect(props.onFulfillOrder).toHaveBeenCalledWith(mockOrders[1]);

    // Facture button
    const invoiceButtons = screen.getAllByTitle('Imprimer Facture');
    fireEvent.click(invoiceButtons[0]);
    expect(props.onPrintOrder).toHaveBeenCalledWith(mockOrders[0], 'invoice');

    // Bordereau button
    const labelButtons = screen.getAllByTitle(/Générer \/ Imprimer Bordereau/i);
    fireEvent.click(labelButtons[0]);
    expect(props.onGenerateLabel).toHaveBeenCalledWith(mockOrders[0]);
  });

  it('renders a reassuring success state when no urgent COD orders exist', () => {
    const props = createDefaultProps();
    // Provide orders where all COD orders are already confirmed
    props.orders = [mockOrders[0], mockOrders[2]];
    render(<OrdersBentoCockpit {...props} />);

    expect(screen.getByText('Toutes les commandes COD sont confirmées !')).toBeInTheDocument();
  });

  it('correctly segregates unassigned orders from non-Tunisian carriers and avoids count mismatches', () => {
    const ordersWithOtherCarrier: Order[] = [
      ...mockOrders,
      {
        id: 'ord_dhl_04',
        status: 'fulfilled',
        payment_gateway: 'cod',
        payment_status: 'pending',
        subtotal: '200.000',
        shipping_total: '15.000',
        total: '215.000',
        store_total: '215.000',
        currency: 'TND',
        fulfillment_status: 'shipped',
        carrier: 'DHL Express',
        tracking_number: 'DHL-TN-9999',
        created_at: '2026-09-02T14:00:00Z',
        customer_first_name: 'Karim',
        customer_last_name: 'Masmoudi',
        customer_phone: '21699887766',
        cod_status: 'confirmed',
        items: [],
      },
    ];

    const props = {
      ...createDefaultProps(),
      orders: ordersWithOtherCarrier,
    };

    render(<OrdersBentoCockpit {...props} />);

    // In mockOrders, exactly 1 order has carrier: null ('ord_urgent_cod_02').
    // Card 5 ('Prêt à expédier') must show 1 colis, NOT 2 colis (DHL must not be counted in unassigned).
    const unassignedCard = screen.getByRole('button', { name: /Prêt à expédier/i });
    expect(unassignedCard).toHaveTextContent('1 colis');

    // Click Card 5
    fireEvent.click(unassignedCard);

    // Filter banner must be active
    expect(screen.getByText(/Prêt à expédier \(Sans transporteur\)/i)).toBeInTheDocument();

    // The stream section should contain the unassigned order, but not the DHL order
    const streamSection = screen.getByRole('region', { name: /Flux visuel interactif/i });
    expect(within(streamSection).getByText('Leila Ben Salem')).toBeInTheDocument();
    expect(within(streamSection).queryByText('Karim Masmoudi')).not.toBeInTheDocument();
    expect(screen.queryByText('Karim Masmoudi')).not.toBeInTheDocument();
  });
});

describe('Urgent COD Filtering Edge Cases', () => {
  const baseOrder: Order = {
    id: 'ord_base_cod',
    status: 'pending',
    payment_gateway: 'cod',
    payment_status: 'pending',
    subtotal: '50.000',
    shipping_total: '7.000',
    total: '57.000',
    currency: 'TND',
    fulfillment_status: 'pending',
    created_at: '2026-09-02T10:00:00Z',
    customer_first_name: 'Foued',
    customer_last_name: 'Mansour',
    customer_phone: '21699887766',
    cod_status: 'pending',
    cod_risk_score: 75,
    items: [],
  };

  it('isUrgentCodOrder helper correctly validates pending COD orders and rejects terminal/inactive states', () => {
    // 1. Valid pending COD order
    expect(isUrgentCodOrder(baseOrder)).toBe(true);

    // 2. Non-COD gateway
    expect(isUrgentCodOrder({ ...baseOrder, payment_gateway: 'card' })).toBe(false);
    expect(isUrgentCodOrder({ ...baseOrder, payment_gateway: 'konnect' })).toBe(false);

    // 3. Delivered (master order status)
    expect(isUrgentCodOrder({ ...baseOrder, status: 'delivered' })).toBe(false);

    // 4. Delivered (fulfillment status)
    expect(isUrgentCodOrder({ ...baseOrder, fulfillment_status: 'delivered' })).toBe(false);

    // 5. Cancelled (master order status)
    expect(isUrgentCodOrder({ ...baseOrder, status: 'cancelled' })).toBe(false);

    // 6. Cancelled (fulfillment status)
    expect(isUrgentCodOrder({ ...baseOrder, fulfillment_status: 'cancelled' })).toBe(false);

    // 7. Refunded (status or payment_status)
    expect(isUrgentCodOrder({ ...baseOrder, status: 'refunded' })).toBe(false);
    expect(isUrgentCodOrder({ ...baseOrder, payment_status: 'refunded' })).toBe(false);

    // 8. Return to origin (RTO)
    expect(isUrgentCodOrder({ ...baseOrder, rto_reason_code: 'refused_at_door' })).toBe(false);
    expect(isUrgentCodOrder({ ...baseOrder, fulfillment_status: 'returned' })).toBe(false);

    // 9. Processed COD statuses (confirmed, otp_verified, rejected, unreachable)
    expect(isUrgentCodOrder({ ...baseOrder, cod_status: 'confirmed' })).toBe(false);
    expect(isUrgentCodOrder({ ...baseOrder, cod_status: 'otp_verified' })).toBe(false);
    expect(isUrgentCodOrder({ ...baseOrder, cod_status: 'rejected' })).toBe(false);
    expect(isUrgentCodOrder({ ...baseOrder, cod_status: 'unreachable' })).toBe(false);
  });

  it('OrdersBentoCockpit urgent deck strictly renders only actionable COD orders and excludes delivered/cancelled orders', () => {
    const mixedOrders: Order[] = [
      {
        ...baseOrder,
        id: 'ord_actionable_01',
        customer_first_name: 'Foued',
        customer_last_name: 'Actionable',
        cod_risk_score: 95,
      },
      {
        ...baseOrder,
        id: 'ord_delivered_master_02',
        customer_first_name: 'Walid',
        customer_last_name: 'Delivered',
        status: 'delivered',
        cod_risk_score: 90,
      },
      {
        ...baseOrder,
        id: 'ord_delivered_fulfillment_03',
        customer_first_name: 'Anis',
        customer_last_name: 'FulfilledDelivered',
        fulfillment_status: 'delivered',
        cod_risk_score: 85,
      },
      {
        ...baseOrder,
        id: 'ord_cancelled_fulfillment_04',
        customer_first_name: 'Karim',
        customer_last_name: 'CancelledFulfillment',
        fulfillment_status: 'cancelled',
        cod_risk_score: 80,
      },
      {
        ...baseOrder,
        id: 'ord_cancelled_master_05',
        customer_first_name: 'Mehdi',
        customer_last_name: 'CancelledMaster',
        status: 'cancelled',
        cod_risk_score: 75,
      },
    ];

    const defaultProps = {
      orders: mixedOrders,
      loading: false,
      onRefresh: vi.fn(async () => {}),
      onSelectOrder: vi.fn(),
      onFulfillOrder: vi.fn(),
      onGenerateLabel: vi.fn(async () => {}),
      onUpdateCodStatus: vi.fn(async () => {}),
      onSendCodOtp: vi.fn(async () => {}),
      onVerifyCodOtp: vi.fn(async () => {}),
      onPrintOrder: vi.fn(),
      onCancelFulfillment: vi.fn(),
      dir: 'ltr' as const,
    };

    render(<OrdersBentoCockpit {...defaultProps} />);

    // Urgent section must only report 1 actionable order
    const urgentSection = screen.getByRole('region', { name: /Validation urgente/i });
    expect(within(urgentSection).getByText('1 à traiter')).toBeInTheDocument();
    expect(within(urgentSection).getByText('Foued Actionable')).toBeInTheDocument();
    expect(within(urgentSection).queryByText('Walid Delivered')).not.toBeInTheDocument();
    expect(within(urgentSection).queryByText('Anis FulfilledDelivered')).not.toBeInTheDocument();
    expect(within(urgentSection).queryByText('Karim CancelledFulfillment')).not.toBeInTheDocument();
    expect(within(urgentSection).queryByText('Mehdi CancelledMaster')).not.toBeInTheDocument();
  });
});
