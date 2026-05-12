/**
 * Order lifecycle subscribers.
 * - On payment captured: credit vendor wallets (commission applied), notify vendor + customer.
 * - On order placed: notify customer + each vendor.
 * - On order fulfilled: notify customer.
 */

import { eventBus, PdEvent } from '../events/event-bus';
import { logger } from '../utils/logger';
import { query, transaction } from '../db/pool';
import { walletService } from '../services/wallet.service';
import { notificationService } from '../services/notification.service';
import { emailQueue } from '../queues/email-queue';
import { socketGateway } from '../realtime/socket-gateway';
import { calculateCommission, calculateVendorNet } from '../utils/money';
import { subscriptionService } from '../services/subscription.service';
import { ProductType } from '@pandamarket/types';
import { incrementBusinessMetric } from '../utils/metrics';

export function registerOrderSubscribers(): void {
  eventBus.on(PdEvent.ORDER_PLACED, async (payload: { order_id: string }) => {
    try {
      incrementBusinessMetric('orders_created');
      await onOrderPlaced(payload.order_id);
    } catch (err) {
      logger.error({ err, payload }, 'order.placed subscriber failed');
    }
  });

  eventBus.on(PdEvent.PAYMENT_CAPTURED, async (payload: { order_id: string; gateway: string }) => {
    try {
      incrementBusinessMetric('payments_captured', { gateway: payload.gateway });
      await onPaymentCaptured(payload.order_id);
    } catch (err) {
      logger.error({ err, payload }, 'payment.captured subscriber failed');
    }
  });

  eventBus.on(PdEvent.ORDER_FULFILLED, async (payload: { order_id: string; carrier?: string; tracking_number?: string }) => {
    try {
      await onOrderFulfilled(payload);
    } catch (err) {
      logger.error({ err, payload }, 'order.fulfilled subscriber failed');
    }
  });
}

// -----------------------------------------------------------------

async function onOrderPlaced(orderId: string): Promise<void> {
  const { rows } = await query<{
    id: string;
    customer_id: string | null;
    storefront_customer_id: string | null;
    total: string;
    customer_email: string | null;
  }>(
    `SELECT o.id, o.customer_id, o.storefront_customer_id, o.total::text,
            COALESCE(u.email, sc.email) AS customer_email
     FROM pd_order o
     LEFT JOIN pd_user u ON u.id = o.customer_id
     LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
     WHERE o.id = $1`,
    [orderId],
  );
  const order = rows[0];
  if (!order) return;

  // In-app notification + email to customer
  if (order.customer_id) {
    await notificationService.create({
      user_id: order.customer_id,
      type: 'order_placed',
      title: 'Commande confirmée',
      message: `Votre commande #${order.id.slice(-8)} a bien été enregistrée.`,
      data: { order_id: order.id },
    });
  }
  if (order.customer_email) {
    await emailQueue.add('order_confirmed', {
      to: order.customer_email,
      template: 'order_confirmed',
      variables: { order_id: order.id, total: order.total },
    });
  }

  // Notify each vendor (one email per distinct store in the order)
  const { rows: storeRows } = await query<{
    store_id: string;
    owner_id: string;
    owner_email: string;
    store_total: string;
  }>(
    `SELECT i.store_id, s.owner_id, u.email AS owner_email,
            SUM(i.subtotal)::text AS store_total
     FROM pd_order_item i
     JOIN pd_store s ON s.id = i.store_id
     JOIN pd_user u ON u.id = s.owner_id
     WHERE i.order_id = $1
     GROUP BY i.store_id, s.owner_id, u.email`,
    [orderId],
  );
  for (const row of storeRows) {
    await notificationService.create({
      user_id: row.owner_id,
      type: 'new_order',
      title: '🛍️ Nouvelle commande',
      message: `Vous avez reçu une commande de ${row.store_total} TND`,
      data: { store_id: row.store_id, order_id: order.id, total: row.store_total },
    });
    socketGateway.emitToStore(row.store_id, 'new_order', {
      order_id: order.id,
      total: row.store_total,
    });
    await emailQueue.add('new_order_vendor', {
      to: row.owner_email,
      template: 'new_order_vendor',
      variables: { order_id: order.id, total: row.store_total, store_name: '' },
    });
  }
}

async function onPaymentCaptured(orderId: string): Promise<void> {
  await assignSerialLicenseKeys(orderId);

  // Per-store totals (excluding shipping for commission calc — keep it simple here)
  const { rows: storeRows } = await query<{
    store_id: string;
    owner_id: string;
    owner_email: string;
    plan: string;
    store_total: string;
  }>(
    `SELECT i.store_id, s.owner_id, u.email AS owner_email,
            s.subscription_plan AS plan,
            SUM(i.subtotal)::text AS store_total
     FROM pd_order_item i
     JOIN pd_store s ON s.id = i.store_id
     JOIN pd_user u ON u.id = s.owner_id
     WHERE i.order_id = $1
     GROUP BY i.store_id, s.owner_id, u.email, s.subscription_plan`,
    [orderId],
  );

  for (const row of storeRows) {
    const total = parseFloat(row.store_total);
    const limits = await subscriptionService.getLimits(row.plan);
    const commission = calculateCommission(total, limits.commission_rate);
    const net = calculateVendorNet(total, limits.commission_rate);

    if (net > 0) {
      await walletService.creditPending({
        store_id: row.store_id,
        amount: net,
        order_id: orderId,
        description:
          commission > 0
            ? `Sale (${total} TND) − commission (${commission} TND)`
            : `Sale (${total} TND)`,
      });
    }

    await notificationService.create({
      user_id: row.owner_id,
      type: 'payment_captured',
      title: 'Paiement reçu',
      message: `Vous avez reçu un paiement de ${net} TND.`,
      data: { store_id: row.store_id, order_id: orderId, amount: net, commission },
    });
    socketGateway.emitToStore(row.store_id, 'payment_received', {
      order_id: orderId,
      amount: net,
      commission,
    });
    await emailQueue.add('payment_captured', {
      to: row.owner_email,
      template: 'payment_captured',
      variables: { order_id: orderId, amount: net, method: 'PandaMarket' },
    });
  }

  // Notify the customer too
  const { rows: orderRows } = await query<{
    customer_id: string | null;
    storefront_customer_id: string | null;
    customer_email: string | null;
    total: string;
  }>(
    `SELECT o.customer_id, o.storefront_customer_id,
            COALESCE(u.email, sc.email) AS customer_email,
            o.total::text
       FROM pd_order o
       LEFT JOIN pd_user u ON u.id = o.customer_id
       LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
      WHERE o.id = $1`,
    [orderId],
  );
  const c = orderRows[0];
  if (c) {
    if (c.customer_id) {
      await notificationService.create({
        user_id: c.customer_id,
        type: 'payment_captured',
        title: 'Paiement confirmé',
        message: `Votre paiement de ${c.total} TND a bien été reçu.`,
        data: { order_id: orderId, amount: c.total },
      });
    }
    if (c.customer_email) {
      await emailQueue.add('payment_captured_customer', {
        to: c.customer_email,
        template: 'payment_captured',
        variables: { order_id: orderId, amount: c.total, method: 'PandaMarket' },
      });
    }
  }
}

async function assignSerialLicenseKeys(orderId: string): Promise<void> {
  await transaction(async (c) => {
    const { rows: serialItems } = await c.query<{
      product_id: string;
      store_id: string;
      quantity: number;
    }>(
      `SELECT i.product_id, i.store_id, SUM(i.quantity)::int AS quantity
       FROM pd_order_item i
       JOIN pd_product p ON p.id = i.product_id
       WHERE i.order_id = $1 AND p.type = $2
       GROUP BY i.product_id, i.store_id`,
      [orderId, ProductType.Serial],
    );

    for (const item of serialItems) {
      await c.query(
        `UPDATE pd_license_key
         SET is_used = true,
             assigned_at = COALESCE(assigned_at, NOW())
         WHERE order_id = $1 AND product_id = $2 AND is_used = false`,
        [orderId, item.product_id],
      );

      const { rows: existingRows } = await c.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM pd_license_key
         WHERE order_id = $1 AND product_id = $2`,
        [orderId, item.product_id],
      );
      const remaining = item.quantity - parseInt(existingRows[0]?.count ?? '0', 10);
      if (remaining <= 0) continue;

      const { rowCount } = await c.query(
        `UPDATE pd_license_key
         SET order_id = $1,
             assigned_at = NOW(),
             is_used = true
         WHERE id IN (
           SELECT id FROM pd_license_key
           WHERE product_id = $2 AND store_id = $3 AND order_id IS NULL AND is_used = false
           ORDER BY created_at ASC
           LIMIT $4
           FOR UPDATE SKIP LOCKED
         )`,
        [orderId, item.product_id, item.store_id, remaining],
      );

      if ((rowCount ?? 0) < remaining) {
        logger.error(
          { order_id: orderId, product_id: item.product_id, requested: remaining, assigned: rowCount ?? 0 },
          'Not enough serial license keys to fulfill order',
        );
      }
    }
  });
}

async function onOrderFulfilled(payload: {
  order_id: string;
  carrier?: string;
  tracking_number?: string;
}): Promise<void> {
  const { rows } = await query<{
    customer_id: string | null;
    storefront_customer_id: string | null;
    customer_email: string | null;
  }>(
    `SELECT o.customer_id, o.storefront_customer_id,
            COALESCE(u.email, sc.email) AS customer_email
       FROM pd_order o
       LEFT JOIN pd_user u ON u.id = o.customer_id
       LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
      WHERE o.id = $1`,
    [payload.order_id],
  );
  const c = rows[0];
  if (!c) return;
  if (c.customer_id) {
    await notificationService.create({
      user_id: c.customer_id,
      type: 'order_fulfilled',
      title: 'Commande expédiée',
      message: `Votre commande #${payload.order_id.slice(-8)} est en route.`,
      data: payload,
    });
  }
  if (c.customer_email) {
    await emailQueue.add('order_shipped', {
      to: c.customer_email,
      template: 'order_shipped',
      variables: {
        order_id: payload.order_id,
        carrier: payload.carrier ?? '',
        tracking_number: payload.tracking_number ?? '',
      },
    });
  }
}
