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
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { syncOrderStatusFromFulfillments } from '../services/order-fulfillment-shared';

/**
 * Multi-vendor order aggregate (audit "Gestion des Commandes Multi-Vendeurs").
 *
 * The statement is a single SQL UPDATE, so these tests assert the SQL contract
 * (the decision ladder and the PostgreSQL-legal shape) rather than re-running
 * the ladder in JS. The behavioural truth table is exercised end-to-end by
 * multi-vendor-status.integration.test.ts against a real PostgreSQL.
 */
describe('Multi-vendor order aggregate — SQL contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('implements the full decision ladder including the two partial states', async () => {
    const executor = { query: vi.fn().mockResolvedValue({ rowCount: 0 }) };
    await syncOrderStatusFromFulfillments(executor as never, 'ord_1', { cancelReason: 'test' });

    const [sql, params] = executor.query.mock.calls[0];

    // Ladder order matters: every-cancelled, all-delivered, partial-delivered,
    // all-shipped, partial-shipped, preparing, then the pending fallback.
    const ladder = [
      "WHEN sub.canc = sub.total THEN 'cancelled'",
      "WHEN sub.del > 0 AND (sub.del + sub.canc) = sub.total THEN 'delivered'",
      "WHEN sub.del > 0 THEN 'partially_delivered'",
      "WHEN sub.ship > 0 AND (sub.ship + sub.canc) = sub.total THEN 'fulfilled'",
      "WHEN sub.ship > 0 THEN 'partially_shipped'",
      "WHEN sub.prep > 0 THEN 'processing'",
    ];
    let cursor = -1;
    for (const branch of ladder) {
      const at = sql.indexOf(branch);
      expect(at, `missing or out-of-order branch: ${branch}`).toBeGreaterThan(cursor);
      cursor = at;
    }

    // The pending fallback preserves payment_required before capture.
    expect(sql).toContain("sub.payment_gateway IN ('cod', 'manual_mandat')");
    expect(sql).toContain("AND sub.payment_status != 'captured' THEN 'payment_required'");
    expect(sql).toContain("ELSE 'pending'");

    // Terminal orders are never resurrected.
    expect(sql).toContain("o.status NOT IN ('cancelled','refunded')");
    expect(params).toEqual(['ord_1', 'test']);
  });

  it('pulls payment columns through the aggregate subquery (a FROM-clause LATERAL cannot reference the UPDATE target)', async () => {
    const executor = { query: vi.fn().mockResolvedValue({ rowCount: 0 }) };
    await syncOrderStatusFromFulfillments(executor as never, 'ord_1');

    const [sql] = executor.query.mock.calls[0];

    // The subquery must join pd_order and expose the payment columns...
    expect(sql).toContain('JOIN pd_order o2 ON o2.id = f.order_id');
    expect(sql).toContain('MAX(o2.payment_gateway)');
    expect(sql).toContain('MAX(o2.payment_status)');

    // ...and the LATERAL must never dereference the UPDATE target alias `o`,
    // which PostgreSQL rejects with "invalid reference to FROM-clause entry".
    const lateralStart = sql.indexOf('LATERAL (SELECT CASE');
    const lateralEnd = sql.indexOf('AS next_status) ns');
    expect(lateralStart).toBeGreaterThan(-1);
    expect(lateralEnd).toBeGreaterThan(lateralStart);
    const lateralBody = sql.slice(lateralStart, lateralEnd);
    expect(lateralBody).not.toMatch(/\bo\.payment_gateway\b/);
    expect(lateralBody).not.toMatch(/\bo\.payment_status\b/);
    expect(lateralBody).not.toMatch(/\bo\.status\b/);
  });

  it('counts cancelled packages so a cancelled sibling never blocks the aggregate', async () => {
    const executor = { query: vi.fn().mockResolvedValue({ rowCount: 0 }) };
    await syncOrderStatusFromFulfillments(executor as never, 'ord_1');
    const [sql] = executor.query.mock.calls[0];
    expect(sql).toContain("COUNT(*) FILTER (WHERE f.status = 'cancelled')  AS canc");
    expect(sql).toContain('COUNT(*)                                      AS total');
  });
});
