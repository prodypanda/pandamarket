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
      query: vi.fn()
        // 1. SELECT refund request
        .mockResolvedValueOnce({
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
        })
        // 2. UPDATE refund to processed
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'ref_123',
              order_id: 'ord_456',
              store_id: 'store_789',
              amount: '45.000',
              status: 'processed',
            },
          ],
        })
        // 3. SELECT cumulative order total vs refunds
        .mockResolvedValueOnce({
          rows: [{ total: '45.000', refunded: '45.000' }],
        })
        // 4. UPDATE order status to refunded
        .mockResolvedValueOnce({ rowCount: 1 })
        // 5. UPDATE product inventory restock
        .mockResolvedValueOnce({ rowCount: 1 }),
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

    // Verify inventory restock query
    const restockQuery = mockClient.query.mock.calls[4];
    expect(restockQuery[0]).toContain('UPDATE pd_product');
    expect(restockQuery[0]).toContain('inventory_quantity = p.inventory_quantity + oi.quantity');

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
