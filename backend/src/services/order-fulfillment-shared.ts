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
 */

import type { PoolClient } from 'pg';
import { ProductType } from '@pandamarket/types';

/**
 * Recompute pd_order.status from the fulfillment aggregate.
 * MUST run inside the caller's transaction. Idempotent.
 * Canonical rules:
 *  - cancelled/refunded orders are never touched
 *  - zero pending, >=1 delivered, rest terminal   -> 'delivered'
 *  - zero pending, >=1 shipped                    -> 'fulfilled'
 *  - zero pending/shipped/delivered (all canc.)   -> 'cancelled' (reason passed in)
 *  - otherwise (any pending)                      -> leave the order alone
 * Digital-only orders have zero fulfillments -> the sub-select returns no row -> untouched.
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
       SELECT order_id,
              COUNT(*) FILTER (WHERE status = 'pending')   AS pend,
              COUNT(*) FILTER (WHERE status = 'shipped')   AS ship,
              COUNT(*) FILTER (WHERE status = 'delivered') AS del
       FROM pd_fulfillment WHERE order_id = $1 GROUP BY order_id
     ) sub,
     LATERAL (SELECT CASE
                WHEN sub.pend = 0 AND sub.del > 0 THEN 'delivered'
                WHEN sub.pend = 0 AND sub.ship > 0 THEN 'fulfilled'
                WHEN sub.pend = 0 AND sub.del = 0 AND sub.ship = 0 THEN 'cancelled'
                ELSE NULL
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
