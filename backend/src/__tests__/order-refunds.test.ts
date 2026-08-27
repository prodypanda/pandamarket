import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockDebitRefund, mockEmit } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockDebitRefund: vi.fn(),
  mockEmit: vi.fn(),
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

describe('PLAN-B-19: Automated Refund Execution & Wallet Reversals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes a requested refund, debits vendor wallet, updates order status and emits events', async () => {
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

    const updatedRefundRow = {
      ...refundRow,
      status: 'processed',
    };

    // 1. Select refund for update
    mockQuery.mockResolvedValueOnce({ rows: [refundRow] });
    // 2. Update refund status to processed
    mockQuery.mockResolvedValueOnce({ rows: [updatedRefundRow] });
    // 3. Select order totals and cumulative refunded sum
    mockQuery.mockResolvedValueOnce({
      rows: [{ total: '75.000', refunded: '75.000' }],
    });
    // 4. Update pd_order status to refunded
    mockQuery.mockResolvedValueOnce({ rows: [] });

    mockDebitRefund.mockResolvedValueOnce(undefined);

    const result = await orderService.processStoreRefund({
      refund_id: 'ref_123',
      reviewed_by: 'admin_usr',
      transaction_reference: 'flouci_ref_999',
    });

    expect(result.status).toBe('processed');

    // Verify walletService.debitRefund was called
    expect(mockDebitRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        store_id: 'store_789',
        amount: 75,
        order_id: 'ord_456',
      })
    );

    // Verify order update SQL was executed
    expect(mockQuery.mock.calls[3][0]).toContain('UPDATE pd_order');
    expect(mockQuery.mock.calls[3][0]).toContain("status = 'refunded'");

    // Verify events were emitted
    expect(mockEmit).toHaveBeenCalledWith(
      'pd.order.refunded',
      expect.objectContaining({
        order_id: 'ord_456',
        refund_id: 'ref_123',
        amount: 75,
      })
    );
    expect(mockEmit).toHaveBeenCalledWith(
      'pd.payment.refunded',
      expect.objectContaining({
        order_id: 'ord_456',
        amount: 75,
      })
    );
  });
});
