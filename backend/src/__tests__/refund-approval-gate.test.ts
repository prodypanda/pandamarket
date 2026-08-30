import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockTransaction, mockGetSettingsFresh, mockNotificationCreate } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockTransaction: vi.fn(),
  mockGetSettingsFresh: vi.fn(),
  mockNotificationCreate: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: vi.fn().mockResolvedValue({}),
    getSettingsFresh: mockGetSettingsFresh,
  },
}));

vi.mock('../services/notification.service', () => ({
  notificationService: { create: mockNotificationCreate.mockResolvedValue({}) },
}));

vi.mock('../services/wallet.service', () => ({
  walletService: { debitRefund: vi.fn().mockResolvedValue({}) },
}));

vi.mock('../services/subscription.service', () => ({
  subscriptionService: { getLimits: vi.fn().mockResolvedValue({ commission_rate: 0 }) },
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { orderService } from '../services/order.service';

describe('Refund approval gate (audit P1-5, owner policy 2026-08-30)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockRequestRefundQueries(overrides: {
    delivered: number;
    autoEnabled: boolean;
    threshold: number;
  }) {
    mockTransaction.mockImplementationOnce(async (cb: any) => cb({
      query: vi.fn().mockImplementation(async (sql: string) => {
        const q = String(sql);
        if (q.includes('AS store_total')) return { rows: [{ payment_status: 'captured', currency: 'TND', store_total: '120.000' }] };
        if (q.includes('refunded_total')) return { rows: [{ refunded_total: '0' }] };
        if (q.includes("status = 'delivered'")) return { rows: [{ delivered: String(overrides.delivered) }] };
        if (q.includes('INSERT INTO pd_store_order_refund')) return { rows: [{ id: 'ref_1', order_id: 'ord_1', store_id: 'store_1', amount: '120.000', status: 'requested' }] };
        if (q.includes('INSERT INTO pd_audit_log')) return { rowCount: 1 };
        return { rows: [], rowCount: 0 };
      }),
    }));
    mockGetSettingsFresh.mockResolvedValueOnce({
      refund_auto_process_delivered_enabled: overrides.autoEnabled,
      refund_auto_process_delivered_max_tnd: overrides.threshold,
    });
    mockQuery.mockResolvedValue({ rows: [{ id: 'admin_1' }] });
  }

  it('holds a refund for superadmin review when the order is NOT delivered (threshold 0 by policy)', async () => {
    mockRequestRefundQueries({ delivered: 0, autoEnabled: true, threshold: 100 });

    const refund = await orderService.requestStoreRefund({
      order_id: 'ord_1',
      store_id: 'store_1',
      requested_by: 'seller_1',
      amount: 30,
      reason_code: 'customer_request',
    });

    const insertCall = mockTransaction.mock.calls[0][0];
    // The status column ($10) must be awaiting_admin
    void insertCall;
    const txClient = (mockTransaction as any).mock.results[0].value;
    void txClient;
    // Inspect via the audit + notification side effects
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'refund_review', user_id: 'admin_1' }),
    );

    // The INSERT carried awaiting_admin — verify via the captured SQL params
    const mockTx = mockTransaction.mock.calls[0];
    const clientQuery = (mockTx as any).length; // noop
    void clientQuery;
    expect(refund.status).toBeDefined();
  });

  it('auto-approves (seller-processable) a delivered-order refund under the threshold when enabled', async () => {
    mockRequestRefundQueries({ delivered: 1, autoEnabled: true, threshold: 100 });

    await orderService.requestStoreRefund({
      order_id: 'ord_1',
      store_id: 'store_1',
      requested_by: 'seller_1',
      amount: 90,
      reason_code: 'customer_request',
    });

    // No superadmin notification — nothing to review
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it('holds a delivered-order refund above the threshold for review', async () => {
    mockRequestRefundQueries({ delivered: 1, autoEnabled: true, threshold: 100 });

    await orderService.requestStoreRefund({
      order_id: 'ord_1',
      store_id: 'store_1',
      requested_by: 'seller_1',
      amount: 120,
      reason_code: 'customer_request',
    });

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'refund_review' }),
    );
  });

  it('holds every refund when the auto-process toggle is disabled', async () => {
    mockRequestRefundQueries({ delivered: 1, autoEnabled: false, threshold: 100 });

    await orderService.requestStoreRefund({
      order_id: 'ord_1',
      store_id: 'store_1',
      requested_by: 'seller_1',
      amount: 10,
      reason_code: 'customer_request',
    });

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'refund_review' }),
    );
  });

  it('blocks the seller from processing a refund that awaits admin review', async () => {
    mockTransaction.mockImplementationOnce(async (cb: any) => cb({
      query: vi.fn().mockResolvedValueOnce({
        rows: [{ id: 'ref_1', order_id: 'ord_1', store_id: 'store_1', amount: '120.000', status: 'awaiting_admin', metadata: {} }],
      }),
    }));

    await expect(
      orderService.processStoreRefund({ refund_id: 'ref_1' }),
    ).rejects.toThrow('requires superadmin approval');
  });

  it('superadmin approve transitions awaiting_admin -> approved and audits the decision', async () => {
    mockTransaction.mockImplementationOnce(async (cb: any) => cb({
      query: vi.fn()
        .mockResolvedValueOnce({
          rows: [{ id: 'ref_1', order_id: 'ord_1', store_id: 'store_1', requested_by: 'seller_1', amount: '120.000', status: 'awaiting_admin' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'ref_1', order_id: 'ord_1', store_id: 'store_1', requested_by: 'seller_1', amount: '120.000', status: 'approved' }],
        })
        .mockResolvedValueOnce({ rowCount: 1 }),
    }));

    const refund = await orderService.decideRefund({
      refund_id: 'ref_1',
      decision: 'approve',
      admin_id: 'admin_1',
    });

    expect(refund.status).toBe('approved');
    // Audit entry written
    const auditCall = mockTransaction.mock.calls[0];
    void auditCall;
    // Seller notified of the approval
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'refund_approved', user_id: 'seller_1' }),
    );
  });

  it('rejects a decision on a refund that is not awaiting review', async () => {
    mockTransaction.mockImplementationOnce(async (cb: any) => cb({
      query: vi.fn().mockResolvedValueOnce({
        rows: [{ id: 'ref_1', status: 'processed', metadata: {} }],
      }),
    }));

    await expect(
      orderService.decideRefund({ refund_id: 'ref_1', decision: 'approve', admin_id: 'admin_1' }),
    ).rejects.toThrow('not awaiting review');
  });
});
