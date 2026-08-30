import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockDebitRefund, mockEmit, mockGetLimits } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockDebitRefund: vi.fn(),
  mockEmit: vi.fn(),
  mockGetLimits: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  transaction: async (cb: any) => cb({ query: mockQuery }),
  query: mockQuery,
}));

vi.mock('../db/redis', () => ({
  getRedis: () => ({
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  }),
  withRedisTimeout: (p: any) => p,
}));

vi.mock('../services/wallet.service', () => ({
  walletService: {
    debitRefund: mockDebitRefund,
  },
}));

vi.mock('../services/subscription.service', () => ({
  subscriptionService: {
    getLimits: mockGetLimits,
  },
}));

vi.mock('../events/event-bus', () => ({
  eventBus: {
    emit: mockEmit,
  },
  PdEvent: {
    ORDER_REFUNDED: 'pd.order.refunded',
    PAYMENT_REFUNDED: 'pd.payment.refunded',
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { orderService } from '../services/order.service';

/**
 * SQL-pattern-based mock: routes each query to a canned response by matching
 * a signature fragment, so the tests stay robust to statement ordering.
 */
function mockRefundQueries(overrides: {
  refund: Record<string, unknown>;
  debitContext?: { item_subtotal: string; shipping_total: string; plan: string };
  totals?: { total: string; refunded: string };
  restockContext?: { store_total: string; refunded_total: string; fulfillment_status: string | null };
  items?: Array<{ product_id: string; variant_id: string | null; quantity: number; product_type: string }>;
}) {
  mockQuery.mockImplementation(async (sql: string) => {
    const q = String(sql);
    if (q.includes('FOR UPDATE')) return { rows: [overrides.refund] };
    if (q.includes("SET status = 'processed'")) return { rows: [{ ...overrides.refund, status: 'processed' }] };
    if (q.includes('AS item_subtotal')) return { rows: [overrides.debitContext ?? { item_subtotal: '0', shipping_total: '0', plan: 'free' }] };
    if (q.includes('o.total::text')) return { rows: [overrides.totals ?? { total: '0', refunded: '0' }] };
    if (q.includes('AS store_total')) return { rows: [overrides.restockContext ?? { store_total: '0', refunded_total: '0', fulfillment_status: 'delivered' }] };
    if (q.includes('AS product_type')) return { rows: overrides.items ?? [] };
    if (q.includes('SET metadata = $2::jsonb')) return { rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });
}

describe('PLAN-B-19: Automated Refund Execution & Wallet Reversals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLimits.mockResolvedValue({ commission_rate: 0.15 });
  });

  it('debits the commission-aware net share, restocks once, and emits events on a full refund', async () => {
    const refundRow = {
      id: 'ref_123',
      order_id: 'ord_456',
      store_id: 'store_789',
      amount: '75.000',
      currency: 'TND',
      reason_code: 'customer_request',
      status: 'requested',
      metadata: {},
    };

    mockRefundQueries({
      refund: refundRow,
      debitContext: { item_subtotal: '75.000', shipping_total: '0', plan: 'free' },
      totals: { total: '75.000', refunded: '75.000' },
      restockContext: { store_total: '75.000', refunded_total: '75.000', fulfillment_status: 'delivered' },
      items: [{ product_id: 'prod_1', variant_id: null, quantity: 1, product_type: 'physical' }],
    });
    mockDebitRefund.mockResolvedValue(undefined);

    const result = await orderService.processStoreRefund({
      refund_id: 'ref_123',
      reviewed_by: 'admin_usr',
      transaction_reference: 'flouci_ref_999',
    });

    expect(result.status).toBe('processed');

    // Commission-aware debit: wallet was credited 75 − 15% = 63.75, so the
    // 75 TND refund must debit the net share (63.75), not the gross amount.
    expect(mockDebitRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        store_id: 'store_789',
        amount: 63.75,
        order_id: 'ord_456',
      })
    );

    // Order flips to refunded when cumulative refunds reach the order total
    const orderUpdateCall = mockQuery.mock.calls.find(
      (call) => String(call[0]).includes('UPDATE pd_order') && String(call[0]).includes("status = 'refunded'"),
    );
    expect(orderUpdateCall).toBeDefined();

    // Inventory restock runs through the variant-aware helper
    const restockCall = mockQuery.mock.calls.find(
      (call) => String(call[0]).includes('UPDATE pd_product') && String(call[0]).includes('inventory_quantity'),
    );
    expect(restockCall).toBeDefined();

    // The restock-once ledger flag is persisted on the refund row
    const metadataCall = mockQuery.mock.calls.find(
      (call) => String(call[0]).includes('SET metadata = $2::jsonb'),
    );
    expect(metadataCall).toBeDefined();
    const persistedMetadata = String(metadataCall![1][1]);
    expect(persistedMetadata).toContain('"restocked":true');
    // Commission-aware audit trail is persisted too
    expect(persistedMetadata).toContain('commission_aware_debit');

    // Events emitted with the customer-facing (gross) refund amount
    expect(mockEmit).toHaveBeenCalledWith(
      'pd.order.refunded',
      expect.objectContaining({ order_id: 'ord_456', refund_id: 'ref_123', amount: 75 })
    );
    expect(mockEmit).toHaveBeenCalledWith(
      'pd.payment.refunded',
      expect.objectContaining({ order_id: 'ord_456', amount: 75 })
    );
  });

  it('includes shipping in the debit ratio and debits the full amount on 0% commission plans', async () => {
    const refundRow = {
      id: 'ref_200',
      order_id: 'ord_200',
      store_id: 'store_789',
      amount: '107.000',
      currency: 'TND',
      reason_code: 'customer_request',
      status: 'requested',
      metadata: {},
    };

    // Free plan (15%): items 100 + shipping 7 -> gross 107, net 85+7=92
    // Full refund of 107 debits 107 * 92/107 = 92 (net credited amount).
    mockRefundQueries({
      refund: refundRow,
      debitContext: { item_subtotal: '100.000', shipping_total: '7', plan: 'free' },
      totals: { total: '107.000', refunded: '107.000' },
      restockContext: { store_total: '107.000', refunded_total: '107.000', fulfillment_status: 'delivered' },
      items: [],
    });
    mockDebitRefund.mockResolvedValue(undefined);

    await orderService.processStoreRefund({ refund_id: 'ref_200' });

    expect(mockDebitRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 92, order_id: 'ord_200' }),
    );
  });

  it('does not restock when the fulfillment was already cancelled (stock already restored)', async () => {
    const refundRow = {
      id: 'ref_124',
      order_id: 'ord_457',
      store_id: 'store_789',
      amount: '30.000',
      currency: 'TND',
      reason_code: 'customer_request',
      status: 'requested',
      metadata: {},
    };

    mockRefundQueries({
      refund: refundRow,
      debitContext: { item_subtotal: '30.000', shipping_total: '0', plan: 'pro' },
      totals: { total: '100.000', refunded: '30.000' },
      restockContext: { store_total: '30.000', refunded_total: '30.000', fulfillment_status: 'cancelled' },
    });
    mockGetLimits.mockResolvedValue({ commission_rate: 0 });
    mockDebitRefund.mockResolvedValue(undefined);

    await orderService.processStoreRefund({ refund_id: 'ref_124' });

    // 0% commission plan: full amount debited
    expect(mockDebitRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 30, order_id: 'ord_457' }),
    );

    // No restock queries must run
    const restockCall = mockQuery.mock.calls.find(
      (call) => String(call[0]).includes('UPDATE pd_product') && String(call[0]).includes('inventory_quantity'),
    );
    expect(restockCall).toBeUndefined();
  });

  it('does not restock on a partial (amount-only) refund', async () => {
    const refundRow = {
      id: 'ref_125',
      order_id: 'ord_458',
      store_id: 'store_789',
      amount: '10.000',
      currency: 'TND',
      reason_code: 'goodwill',
      status: 'requested',
      metadata: {},
    };

    mockRefundQueries({
      refund: refundRow,
      debitContext: { item_subtotal: '50.000', shipping_total: '7', plan: 'free' },
      totals: { total: '114.000', refunded: '10.000' },
      // Refunded total (10) < store total (57) -> partial, no restock
      restockContext: { store_total: '57.000', refunded_total: '10.000', fulfillment_status: 'delivered' },
    });
    mockDebitRefund.mockResolvedValue(undefined);

    await orderService.processStoreRefund({ refund_id: 'ref_125' });

    const restockCall = mockQuery.mock.calls.find(
      (call) => String(call[0]).includes('UPDATE pd_product') && String(call[0]).includes('inventory_quantity'),
    );
    expect(restockCall).toBeUndefined();
  });

  it('never restocks twice: the restocked metadata flag short-circuits repeat processing', async () => {
    const refundRow = {
      id: 'ref_126',
      order_id: 'ord_459',
      store_id: 'store_789',
      amount: '20.000',
      currency: 'TND',
      reason_code: 'customer_request',
      status: 'requested',
      metadata: { restocked: true, restocked_at: '2026-08-30T00:00:00.000Z' },
    };

    mockRefundQueries({
      refund: refundRow,
      debitContext: { item_subtotal: '20.000', shipping_total: '0', plan: 'pro' },
      totals: { total: '20.000', refunded: '20.000' },
      restockContext: { store_total: '20.000', refunded_total: '20.000', fulfillment_status: 'delivered' },
      items: [{ product_id: 'prod_1', variant_id: null, quantity: 1, product_type: 'physical' }],
    });
    mockGetLimits.mockResolvedValue({ commission_rate: 0 });
    mockDebitRefund.mockResolvedValue(undefined);

    await orderService.processStoreRefund({ refund_id: 'ref_126' });

    const restockCall = mockQuery.mock.calls.find(
      (call) => String(call[0]).includes('UPDATE pd_product') && String(call[0]).includes('inventory_quantity'),
    );
    expect(restockCall).toBeUndefined();
  });
});
