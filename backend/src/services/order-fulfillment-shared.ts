/**
 * Shared order fulfillment helpers.
 *
 * Used by both order.service.ts and shipping.service.ts so that every
 * fulfillment mutation (manual ship, carrier label creation, carrier
 * tracking sync, store cancellation, RTO) funnels through the same
 * canonical rules:
 *  - pd_order.status is recomputed from the fulfillment aggregate
 *    (fixes the split-brain desync where carrier-driven fulfillment
 *    transitions never propagated to the order);
 *  - stock restoration on cancellation/return reuses the exact same
 *    variant/bundle-aware logic everywhere.
 *
 * Multi-vendor progress states (audit 2026-08-31): the aggregate exposes
 * partially_shipped / partially_delivered so the buyer sees per-parcel
 * progress instead of a frozen 'pending'.
 */

import type { PoolClient } from 'pg';
import { ProductType } from '@pandamarket/types';

/**
 * Recompute pd_order.status from the fulfillment aggregate.
 * MUST run inside the caller's transaction. Idempotent.
 *
 * Canonical rules (T = fulfillments, canc = cancelled, active = T - canc):
 *  1. canc = T                        -> 'cancelled' (reason passed in)
 *  2. del > 0 AND del + canc = T      -> 'delivered'        (all active delivered)
 *  3. del > 0                         -> 'partially_delivered'
 *  4. ship > 0 AND ship + canc = T    -> 'fulfilled'        (all active shipped)
 *  5. ship > 0                        -> 'partially_shipped'
 *  6. prep > 0                        -> 'processing'
 *  7. otherwise (all active pending)  -> 'payment_required' when the order is a
 *                                        COD/mandat order that is not captured,
 *                                        else 'pending'
 *  - cancelled/refunded orders are never touched
 *  - digital-only orders have zero fulfillments -> no row -> untouched
 *
 * SQL note: the payment_gateway/payment_status CASE values are pulled into the
 * `sub` subquery (joining pd_order) because a FROM-clause LATERAL cannot
 * reference the UPDATE target table — referencing `o` there is a PostgreSQL
 * error ("invalid reference to FROM-clause entry"). The naive form proposed in
 * the source audit would 500 on every fulfillment mutation.
 */
export async function syncOrderStatusFromFulfillments(
  executor: Pick<PoolClient, 'query'>,
  orderId: string,
  opts: { cancelReason?: string } = {},
): Promise<void> {
  await executor.query(
    `UPDATE pd_order o
     SET status = ns.next_status,
         updated_at = NOW(),
         cancelled_at = CASE WHEN ns.next_status = 'cancelled' THEN COALESCE(o.cancelled_at, NOW()) ELSE o.cancelled_at END,
         cancelled_reason = CASE WHEN ns.next_status = 'cancelled' THEN COALESCE(o.cancelled_reason, $2) ELSE o.cancelled_reason END
     FROM (
       SELECT f.order_id,
              COUNT(*)                                      AS total,
              COUNT(*) FILTER (WHERE f.status = 'pending')    AS pend,
              COUNT(*) FILTER (WHERE f.status = 'preparing')  AS prep,
              COUNT(*) FILTER (WHERE f.status = 'shipped')    AS ship,
              COUNT(*) FILTER (WHERE f.status = 'delivered')  AS del,
              COUNT(*) FILTER (WHERE f.status = 'cancelled')  AS canc,
              MAX(o2.payment_gateway)                        AS payment_gateway,
              MAX(o2.payment_status)                         AS payment_status
       FROM pd_fulfillment f
       JOIN pd_order o2 ON o2.id = f.order_id
       WHERE f.order_id = $1
       GROUP BY f.order_id
     ) sub,
     LATERAL (SELECT CASE
                -- 1. Every package cancelled
                WHEN sub.canc = sub.total THEN 'cancelled'
                -- 2. All active packages delivered
                WHEN sub.del > 0 AND (sub.del + sub.canc) = sub.total THEN 'delivered'
                -- 3. At least one delivered, others still active
                WHEN sub.del > 0 THEN 'partially_delivered'
                -- 4. All active packages shipped
                WHEN sub.ship > 0 AND (sub.ship + sub.canc) = sub.total THEN 'fulfilled'
                -- 5. At least one shipped, others still awaiting/preparing
                WHEN sub.ship > 0 THEN 'partially_shipped'
                -- 6. At least one preparing, none shipped/delivered
                WHEN sub.prep > 0 THEN 'processing'
                -- 7. All active awaiting (preserve payment_required pre-capture)
                ELSE CASE
                  WHEN sub.payment_gateway IN ('cod', 'manual_mandat')
                       AND sub.payment_status != 'captured' THEN 'payment_required'
                  ELSE 'pending'
                END
              END AS next_status) ns
     WHERE o.id = sub.order_id
       AND o.status NOT IN ('cancelled','refunded')
       AND ns.next_status IS NOT NULL
       AND o.status IS DISTINCT FROM ns.next_status`,
    [orderId, opts.cancelReason ?? null],
  );
}

function usesInventory(type: ProductType): boolean {
  return type === ProductType.Physical;
}

/**
 * Restore (re-increment) inventory for a cancelled/returned order item,
 * handling plain products, variants, and bundle components.
 * MUST run inside the caller's transaction.
 */
export async function restoreOrderItemStock(
  c: Pick<PoolClient, 'query'>,
  item: { product_id: string; variant_id: string | null; quantity: number; product_type?: ProductType },
): Promise<void> {
  const type = item.product_type ?? (await (async () => {
    const { rows } = await c.query<{ type: ProductType }>('SELECT type FROM pd_product WHERE id = $1', [item.product_id]);
    return rows[0]?.type;
  })());

  if (type === ProductType.Bundle) {
    const { rows: bundleItems } = await c.query<{
      product_id: string;
      variant_id: string | null;
      quantity: number;
    }>(
      'SELECT product_id, variant_id, quantity FROM pd_product_bundle_item WHERE bundle_product_id = $1',
      [item.product_id],
    );
    for (const bi of bundleItems) {
      const qtyToRestore = bi.quantity * item.quantity;
      await c.query(
        'UPDATE pd_product SET inventory_quantity = inventory_quantity + $2 WHERE id = $1',
        [bi.product_id, qtyToRestore],
      );
      if (bi.variant_id) {
        await c.query(
          'UPDATE pd_product_variant SET inventory_quantity = inventory_quantity + $2 WHERE id = $1',
          [bi.variant_id, qtyToRestore],
        );
      }
    }
  } else if (type && usesInventory(type)) {
    await c.query(
      'UPDATE pd_product SET inventory_quantity = inventory_quantity + $2 WHERE id = $1',
      [item.product_id, item.quantity],
    );
    if (item.variant_id) {
      await c.query(
        'UPDATE pd_product_variant SET inventory_quantity = inventory_quantity + $2 WHERE id = $1',
        [item.variant_id, item.quantity],
      );
    }
  }
}
