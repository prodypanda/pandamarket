/**
 * Webhook subscriber — listens for key platform events and enqueues
 * webhook dispatch jobs for any vendor that has active subscriptions.
 *
 * Events forwarded to webhooks:
 *   - pd.order.placed
 *   - pd.order.fulfilled
 *   - pd.order.cancelled
 *   - pd.order.delivered
 *   - pd.payment.captured
 *   - pd.product.created
 *   - pd.product.published
 *   - pd.stock.low
 */

import { eventBus, PdEvent } from '../events/event-bus';
import { webhookQueue } from '../queues/webhook-queue';
import { logger } from '../utils/logger';
import { query } from '../db/pool';

/**
 * Helper: enqueue a webhook job for each store involved in the event.
 */
async function enqueueWebhook(
  eventType: string,
  storeIds: string[],
  payload: Record<string, unknown>,
): Promise<void> {
  for (const store_id of storeIds) {
    try {
      await webhookQueue.add(eventType, { event_type: eventType, store_id, payload });
    } catch (err) {
      logger.error(
        { event_type: eventType, store_id, err: (err as Error).message },
        'Failed to enqueue webhook job',
      );
    }
  }
}

/**
 * Resolve store IDs from an order (one per distinct store in the order items).
 */
async function storeIdsFromOrder(orderId: string): Promise<string[]> {
  const { rows } = await query<{ store_id: string }>(
    `SELECT DISTINCT store_id FROM pd_order_item WHERE order_id = $1`,
    [orderId],
  );
  return rows.map((r) => r.store_id);
}

export function registerWebhookSubscribers(): void {
  // Order events
  eventBus.on(PdEvent.ORDER_PLACED, async (payload: { order_id: string }) => {
    try {
      const storeIds = await storeIdsFromOrder(payload.order_id);
      await enqueueWebhook(PdEvent.ORDER_PLACED, storeIds, payload);
    } catch (err) {
      logger.error({ err, payload }, 'webhook subscriber: order.placed failed');
    }
  });

  eventBus.on(PdEvent.ORDER_FULFILLED, async (payload: { order_id: string }) => {
    try {
      const storeIds = await storeIdsFromOrder(payload.order_id);
      await enqueueWebhook(PdEvent.ORDER_FULFILLED, storeIds, payload);
    } catch (err) {
      logger.error({ err, payload }, 'webhook subscriber: order.fulfilled failed');
    }
  });

  eventBus.on(PdEvent.ORDER_CANCELLED, async (payload: { order_id: string }) => {
    try {
      const storeIds = await storeIdsFromOrder(payload.order_id);
      await enqueueWebhook(PdEvent.ORDER_CANCELLED, storeIds, payload);
    } catch (err) {
      logger.error({ err, payload }, 'webhook subscriber: order.cancelled failed');
    }
  });

  eventBus.on(PdEvent.ORDER_DELIVERED, async (payload: { order_id: string }) => {
    try {
      const storeIds = await storeIdsFromOrder(payload.order_id);
      await enqueueWebhook(PdEvent.ORDER_DELIVERED, storeIds, payload);
    } catch (err) {
      logger.error({ err, payload }, 'webhook subscriber: order.delivered failed');
    }
  });

  // Payment events
  eventBus.on(PdEvent.PAYMENT_CAPTURED, async (payload: { order_id: string }) => {
    try {
      const storeIds = await storeIdsFromOrder(payload.order_id);
      await enqueueWebhook(PdEvent.PAYMENT_CAPTURED, storeIds, payload);
    } catch (err) {
      logger.error({ err, payload }, 'webhook subscriber: payment.captured failed');
    }
  });

  // Product events
  eventBus.on(
    PdEvent.PRODUCT_CREATED,
    async (payload: { product_id: string; store_id: string }) => {
      try {
        await enqueueWebhook(PdEvent.PRODUCT_CREATED, [payload.store_id], payload);
      } catch (err) {
        logger.error({ err, payload }, 'webhook subscriber: product.created failed');
      }
    },
  );

  eventBus.on(
    PdEvent.PRODUCT_PUBLISHED,
    async (payload: { product_id: string; store_id: string }) => {
      try {
        await enqueueWebhook(PdEvent.PRODUCT_PUBLISHED, [payload.store_id], payload);
      } catch (err) {
        logger.error({ err, payload }, 'webhook subscriber: product.published failed');
      }
    },
  );

  // Stock events
  eventBus.on(
    PdEvent.STOCK_LOW,
    async (payload: { product_id: string; store_id: string; quantity: number }) => {
      try {
        await enqueueWebhook(PdEvent.STOCK_LOW, [payload.store_id], payload);
      } catch (err) {
        logger.error({ err, payload }, 'webhook subscriber: stock.low failed');
      }
    },
  );

  logger.info('Webhook subscribers registered');
}
