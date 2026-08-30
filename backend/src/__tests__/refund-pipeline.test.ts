import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockTransaction } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../services/wallet.service', () => ({
  walletService: {
    debitRefund: vi.fn().mockResolvedValue({ balance: 150, total_earned: 500 }),
  },
}));

vi.mock('../services/subscription.service', () => ({
  subscriptionService: {
    getLimits: vi.fn().mockResolvedValue({ commission_rate: 0 }),
  },
}));

import { orderService } from '../services/order.service';
import { walletService } from '../services/wallet.service';
import { eventBus, PdEvent } from '../events/event-bus';

describe('PLAN-M-06: Automated Payment Gateway Refund Processor & Commission Reversal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes store refund, debits merchant wallet, restocks inventory and emits events', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emit');

    const mockClient = {
      query: vi.fn().mockImplementation(async (sql: string) => {
        const q = String(sql);
        // 1. SELECT refund request FOR UPDATE
        if (q.includes('FOR UPDATE')) {
          return {
            rows: [
              {
                id: 'ref_123',
                order_id: 'ord_456',
                store_id: 'store_789',
                amount: '45.000',
                status: 'requested',
                metadata: {},
              },
            ],
          };
        }
        // 2. UPDATE refund to processed
        if (q.includes("SET status = 'processed'")) {
          return {
            rows: [
              {
                id: 'ref_123',
                order_id: 'ord_456',
                store_id: 'store_789',
                amount: '45.000',
                status: 'processed',
              },
            ],
          };
        }
        // 3. Debit context (0% commission plan -> full amount debited)
        if (q.includes('AS item_subtotal')) {
          return { rows: [{ item_subtotal: '45.000', shipping_total: '0', plan: 'pro' }] };
        }
        // 4. Cumulative order total vs refunds
        if (q.includes('o.total::text')) {
          return { rows: [{ total: '45.000', refunded: '45.000' }] };
        }
        // 5. UPDATE order status to refunded
        if (q.includes("status = 'refunded'")) {
          return { rowCount: 1 };
        }
        // 6. Restock context: full store refund on a delivered fulfillment
        if (q.includes('AS store_total')) {
          return { rows: [{ store_total: '45.000', refunded_total: '45.000', fulfillment_status: 'delivered' }] };
        }
        // 7. Items to restock
        if (q.includes('AS product_type')) {
          return { rows: [{ product_id: 'prod_9', variant_id: null, quantity: 1, product_type: 'physical' }] };
        }
        // 8. Persist enriched metadata
        if (q.includes('SET metadata = $2::jsonb')) {
          return { rowCount: 1 };
        }
        // 9. restoreOrderItemStock product increment
        if (q.includes('UPDATE pd_product')) {
          return { rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }),
    };

    mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

    const result = await orderService.processStoreRefund({
      refund_id: 'ref_123',
      reviewed_by: 'admin_user_1',
      transaction_reference: 'GW_REFUND_9988',
    });

    expect(result.status).toBe('processed');
    expect(walletService.debitRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        store_id: 'store_789',
        amount: 45.0,
        order_id: 'ord_456',
      }),
    );

    // Verify inventory restock query (variant-aware helper)
    const restockQuery = mockClient.query.mock.calls.find(
      (call) => String(call[0]).includes('UPDATE pd_product') && String(call[0]).includes('inventory_quantity'),
    );
    expect(restockQuery).toBeDefined();

    // Verify event emissions
    expect(emitSpy).toHaveBeenCalledWith(PdEvent.ORDER_REFUNDED, expect.objectContaining({
      order_id: 'ord_456',
      refund_id: 'ref_123',
      amount: 45.0,
    }));
    expect(emitSpy).toHaveBeenCalledWith(PdEvent.PAYMENT_REFUNDED, expect.objectContaining({
      order_id: 'ord_456',
      amount: 45.0,
    }));
  });
});
