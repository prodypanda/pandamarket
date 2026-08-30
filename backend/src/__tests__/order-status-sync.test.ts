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
import { syncOrderStatusFromFulfillments } from '../services/order-fulfillment-shared';
import { eventBus, PdEvent } from '../events/event-bus';

const SYNC_SQL_SIGNATURE = 'FROM pd_fulfillment WHERE order_id = $1 GROUP BY order_id';

describe('Order status state machine centralization (P0 desync fixes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncOrderStatusFromFulfillments (shared helper)', () => {
    it('computes the order aggregate from fulfillment counts with canonical rules', async () => {
      const executor = { query: vi.fn().mockResolvedValue({ rowCount: 0 }) };
      await syncOrderStatusFromFulfillments(executor as never, 'ord_1', { cancelReason: 'test' });

      const [sql, params] = executor.query.mock.calls[0];
      expect(sql).toContain('UPDATE pd_order');
      expect(sql).toContain(SYNC_SQL_SIGNATURE);
      expect(sql).toContain("WHEN sub.pend = 0 AND sub.del > 0 THEN 'delivered'");
      expect(sql).toContain("WHEN sub.pend = 0 AND sub.ship > 0 THEN 'fulfilled'");
      // preparing-only aggregate derives the order-level 'processing' state
      expect(sql).toContain("sub.prep > 0 THEN 'processing'");
      expect(sql).toContain("sub.prep = 0 THEN 'cancelled'");
      expect(sql).toContain("o.status NOT IN ('cancelled','refunded')");
      expect(params).toEqual(['ord_1', 'test']);
    });
  });

  describe('markStoreFulfillmentPreparing() — persisted preparation state', () => {
    it('transitions pending -> preparing and recomputes the order aggregate', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rowCount: 1 })
          .mockResolvedValueOnce({ rowCount: 0 }),
      };
      mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

      await orderService.markStoreFulfillmentPreparing({
        order_id: 'ord_1',
        store_id: 'store_1',
        user_id: 'user_1',
      });

      const [prepareSql, prepareParams] = mockClient.query.mock.calls[0];
      expect(prepareSql).toContain("SET status = 'preparing'");
      expect(prepareSql).toContain("AND status = 'pending'");
      expect(prepareParams).toEqual(['ord_1', 'store_1']);

      const [syncSql] = mockClient.query.mock.calls[1];
      expect(syncSql).toContain(SYNC_SQL_SIGNATURE);
    });

    it('rejects when the fulfillment is no longer awaiting preparation', async () => {
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rowCount: 0 }) };
      mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

      await expect(
        orderService.markStoreFulfillmentPreparing({ order_id: 'ord_1', store_id: 'store_1' }),
      ).rejects.toThrow('Fulfillment not found or not awaiting preparation');

      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('fulfill() — manual ship path', () => {
    it('runs in a transaction, COALESCEs carrier/tracking, recomputes the order, and emits ORDER_FULFILLED', async () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      const mockClient = {
        query: vi.fn()
          // 1. guarded fulfillment UPDATE with RETURNING
          .mockResolvedValueOnce({
            rows: [{ carrier: 'Aramex', tracking_number: 'TRK_001' }],
            rowCount: 1,
          })
          // 2. syncOrderStatusFromFulfillments
          .mockResolvedValueOnce({ rowCount: 0 }),
      };
      mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

      await orderService.fulfill({
        order_id: 'ord_1',
        store_id: 'store_1',
        carrier: 'Aramex',
        tracking_number: 'TRK_001',
      });

      expect(mockTransaction).toHaveBeenCalledTimes(1);

      const [fulfillSql, fulfillParams] = mockClient.query.mock.calls[0];
      expect(fulfillSql).toContain("SET status = 'shipped'");
      expect(fulfillSql).toContain('carrier = COALESCE($3, carrier)');
      expect(fulfillSql).toContain('tracking_number = COALESCE($4, tracking_number)');
      // Both awaiting-shipment states may transition to shipped
      expect(fulfillSql).toContain("AND status IN ('pending','preparing')");
      expect(fulfillParams).toEqual(['ord_1', 'store_1', 'Aramex', 'TRK_001']);

      const [syncSql] = mockClient.query.mock.calls[1];
      expect(syncSql).toContain(SYNC_SQL_SIGNATURE);

      // Post-commit buyer notification with the persisted carrier/tracking
      expect(emitSpy).toHaveBeenCalledWith(PdEvent.ORDER_FULFILLED, {
        order_id: 'ord_1',
        carrier: 'Aramex',
        tracking_number: 'TRK_001',
      });
    });

    it('does not emit ORDER_FULFILLED when the fulfillment is not pending (already shipped)', async () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 }),
      };
      mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

      await expect(
        orderService.fulfill({ order_id: 'ord_1', store_id: 'store_1' }),
      ).rejects.toThrow('Fulfillment not found or already shipped');

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(emitSpy).not.toHaveBeenCalledWith(PdEvent.ORDER_FULFILLED, expect.anything());
    });
  });

  describe('cancel() — whole-order cancellation guard', () => {
    it('refuses to cancel an order whose fulfillment is already shipped/delivered', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'ord_1', status: 'pending', payment_status: 'pending' }],
      });
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [{ started: '1' }] }),
      };
      mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

      await expect(orderService.cancel('ord_1', 'buyer changed mind')).rejects.toThrow(
        'Cannot cancel an order with shipped or delivered items',
      );

      const [guardSql] = mockClient.query.mock.calls[0];
      expect(guardSql).toContain("status IN ('shipped','delivered')");
      // No order UPDATE must run after the guard fires
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    it('cancels pending fulfillments atomically when the order cancel is allowed', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'ord_1', status: 'pending', payment_status: 'pending' }],
      });
      const mockClient = {
        query: vi.fn()
          // guard: no started fulfillments
          .mockResolvedValueOnce({ rows: [{ started: '0' }] })
          // order cancelled
          .mockResolvedValueOnce({ rowCount: 1 })
          // fulfillments cancelled
          .mockResolvedValueOnce({ rowCount: 1 })
          // items select
          .mockResolvedValueOnce({ rows: [] }),
      };
      mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

      await orderService.cancel('ord_1', 'buyer changed mind');

      const [fulfillmentCancelSql] = mockClient.query.mock.calls[2];
      expect(fulfillmentCancelSql).toContain('UPDATE pd_fulfillment');
      expect(fulfillmentCancelSql).toContain("SET status = 'cancelled'");
    });
  });

  describe('markStoreFulfillmentRto() — RTO hardening', () => {
    it('rejects RTO on a fulfillment that is not shipped', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rowCount: 0 }),
      };
      mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

      await expect(
        orderService.markStoreFulfillmentRto({
          orderId: 'ord_1',
          storeId: 'store_1',
          reasonCode: 'client_refused',
        }),
      ).rejects.toThrow('Fulfillment not found, not shipped, or already returned');

      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    it('runs the full RTO pipeline: guard, shipment, verification, restock, settlement dispute, order recompute', async () => {
      const mockClient = {
        query: vi.fn()
          // 1. guarded fulfillment update
          .mockResolvedValueOnce({ rowCount: 1 })
          // 2. shipment -> returned
          .mockResolvedValueOnce({ rowCount: 1 })
          // 3. cod verification upsert
          .mockResolvedValueOnce({ rowCount: 1 })
          // 4. items select (one serial item to exercise license freeing)
          .mockResolvedValueOnce({
            rows: [
              {
                product_id: 'prod_1',
                variant_id: null,
                quantity: 2,
                product_type: 'serial',
              },
            ],
          })
          // 5. serial key freeing
          .mockResolvedValueOnce({ rowCount: 2 })
          // 6. courier settlement -> disputed
          .mockResolvedValueOnce({ rowCount: 1 })
          // 7. syncOrderStatusFromFulfillments
          .mockResolvedValueOnce({ rowCount: 0 }),
      };
      mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

      await orderService.markStoreFulfillmentRto({
        orderId: 'ord_1',
        storeId: 'store_1',
        reasonCode: 'client_refused',
        notes: 'client refused at door',
      });

      const allSql = mockClient.query.mock.calls.map((call) => String(call[0]));
      // Guard: only shipped fulfillments can be RTO'd
      expect(allSql[0]).toContain("AND status = 'shipped'");
      // Settlement flagged for reconciliation
      expect(allSql.some((sql) => sql.includes('pd_courier_settlement') && sql.includes('disputed'))).toBe(true);
      // Serial keys freed
      expect(allSql.some((sql) => sql.includes('pd_license_key') && sql.includes('is_used = false'))).toBe(true);
      // Order aggregate recomputed
      expect(allSql[allSql.length - 1]).toContain(SYNC_SQL_SIGNATURE);
    });
  });

  describe('markPaidInTransaction() — tightened fulfilled jump', () => {
    it('requires a shipped/delivered fulfillment before jumping to fulfilled, keeps digital-only completion', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({
          rows: [
            {
              id: 'ord_1',
              status: 'pending',
              payment_status: 'captured',
              customer_id: 'user_1',
            },
          ],
        }),
      };

      await orderService.markPaidInTransaction(
        mockClient as never,
        'ord_1',
        'paypal' as never,
        'PAY-123',
      );

      const [sql] = mockClient.query.mock.calls[0];
      // delivered only when a delivered fulfillment exists
      expect(sql).toContain("AND status = 'delivered'");
      // fulfilled only when a shipped fulfillment exists
      expect(sql).toContain("AND status = 'shipped'");
      // digital-only orders (zero fulfillments) keep auto-complete
      expect(sql).toMatch(/WHEN NOT EXISTS \(\s*SELECT 1 FROM pd_fulfillment\s*WHERE order_id = \$1\s*\) THEN 'fulfilled'/);
      expect(sql).toContain("payment_status != 'captured'");
    });
  });
});
