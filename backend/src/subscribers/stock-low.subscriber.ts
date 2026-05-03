/**
 * Stock-low alert subscriber.
 *
 * Listens for order fulfillment events and checks if any product's
 * inventory has fallen below the low-stock threshold (default: 5 units).
 * When triggered, emits a `pd.stock.low` event which:
 *   1. Creates an in-app notification for the vendor
 *   2. Triggers outgoing webhooks (if configured)
 *   3. Queues a stock-low email notification
 */

import { eventBus, PdEvent } from '../events/event-bus';
import { query } from '../db/pool';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

const LOW_STOCK_THRESHOLD = 5;

export function registerStockLowSubscriber(): void {
  // Check stock levels after an order is placed
  eventBus.on(PdEvent.ORDER_PLACED, async (payload: {
    order_id: string;
    items: Array<{ product_id: string; store_id: string; quantity: number }>;
  }) => {
    try {
      for (const item of payload.items) {
        const { rows } = await query<{
          id: string;
          title: string;
          inventory_quantity: number;
          store_id: string;
        }>(
          `SELECT id, title, inventory_quantity, store_id
           FROM pd_product
           WHERE id = $1`,
          [item.product_id],
        );

        const product = rows[0];
        if (!product) continue;

        if (product.inventory_quantity <= LOW_STOCK_THRESHOLD && product.inventory_quantity >= 0) {
          logger.info(
            {
              product_id: product.id,
              store_id: product.store_id,
              quantity: product.inventory_quantity,
            },
            'Stock low alert triggered',
          );

          // Emit stock.low event (picked up by webhook subscriber)
          eventBus.emit(PdEvent.STOCK_LOW, {
            product_id: product.id,
            product_title: product.title,
            store_id: product.store_id,
            quantity: product.inventory_quantity,
            threshold: LOW_STOCK_THRESHOLD,
          });

          // Get the store owner for notification
          const { rows: storeRows } = await query<{ owner_id: string }>(
            'SELECT owner_id FROM pd_store WHERE id = $1',
            [product.store_id],
          );

          if (storeRows[0]) {
            await notificationService.create({
              user_id: storeRows[0].owner_id,
              type: 'stock_low',
              title: '⚠️ Stock faible',
              message: `Le produit "${product.title}" n'a plus que ${product.inventory_quantity} unité(s) en stock.`,
              data: {
                product_id: product.id,
                product_title: product.title,
                quantity: product.inventory_quantity,
                threshold: LOW_STOCK_THRESHOLD,
              },
            });
          }
        }
      }
    } catch (err) {
      logger.error({ err, order_id: payload.order_id }, 'Stock-low subscriber failed');
    }
  });

  logger.info('Stock-low subscriber registered');
}
