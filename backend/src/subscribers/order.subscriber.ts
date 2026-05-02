/**
 * Order lifecycle subscribers.
 * - On payment captured: credit vendor wallets (commission applied), notify vendor + customer.
 * - On order placed: notify customer + each vendor.
 * - On order fulfilled: notify customer.
 */

import { eventBus, PdEvent } from '../events/event-bus';
import { logger } from '../utils/logger';
import { query } from '../db/pool';
import { walletService } from '../services/wallet.service';
import { notificationService } from '../services/notification.service';
import { emailQueue } from '../queues/email-queue';
import { socketGateway } from '../realtime/socket-gateway';
import { calculateCommission, calculateVendorNet } from '../utils/money';
import { subscriptionService } from '../services/subscription.service';
import { SubscriptionPlan } from '@pandamarket/types';

export function registerOrderSubscribers(): void {
  eventBus.on(PdEvent.ORDER_PLACED, async (payload: { order_id: string }) => {
    try {
      await onOrderPlaced(payload.order_id);
    } catch (err) {
      logger.error({ err, payload }, 'order.placed subscriber failed');
    }
  });

  eventBus.on(PdEvent.PAYMENT_CAPTURED, async (payload: { order_id: string; gateway: string }) => {
    try {
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
    customer_id: string;
    total: string;
    customer_email: string;
  }>(
    `SELECT o.id, o.customer_id, o.total::text, u.email AS customer_email
     FROM pd_order o JOIN pd_user u ON u.id = o.customer_id
     WHERE o.id = $1`,
    [orderId],
  );
  const order = rows[0];
  if (!order) return;

  // In-app notification + email to customer
  await notificationService.create({
    user_id: order.customer_id,
    type: 'order_placed',
    title: 'Commande confirmée',
    message: `Votre commande #${order.id.slice(-8)} a bien été enregistrée.`,
    data: { order_id: order.id },
  });
  await emailQueue.add('order_confirmed', {
    to: order.customer_email,
    template: 'order_confirmed',
    variables: { order_id: order.id, total: order.total },
  });

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
      data: { order_id: order.id, total: row.store_total },
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
  // Per-store totals (excluding shipping for commission calc — keep it simple here)
  const { rows: storeRows } = await query<{
    store_id: string;
    owner_id: string;
    owner_email: string;
    plan: SubscriptionPlan;
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
      data: { order_id: orderId, amount: net, commission },
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
    customer_id: string;
    customer_email: string;
    total: string;
  }>(
    `SELECT o.customer_id, u.email AS customer_email, o.total::text
       FROM pd_order o JOIN pd_user u ON u.id = o.customer_id
      WHERE o.id = $1`,
    [orderId],
  );
  const c = orderRows[0];
  if (c) {
    await notificationService.create({
      user_id: c.customer_id,
      type: 'payment_captured',
      title: 'Paiement confirmé',
      message: `Votre paiement de ${c.total} TND a bien été reçu.`,
      data: { order_id: orderId, amount: c.total },
    });
    await emailQueue.add('payment_captured_customer', {
      to: c.customer_email,
      template: 'payment_captured',
      variables: { order_id: orderId, amount: c.total, method: 'PandaMarket' },
    });
  }
}

async function onOrderFulfilled(payload: {
  order_id: string;
  carrier?: string;
  tracking_number?: string;
}): Promise<void> {
  const { rows } = await query<{
    customer_id: string;
    customer_email: string;
  }>(
    `SELECT o.customer_id, u.email AS customer_email
       FROM pd_order o JOIN pd_user u ON u.id = o.customer_id
      WHERE o.id = $1`,
    [payload.order_id],
  );
  const c = rows[0];
  if (!c) return;
  await notificationService.create({
    user_id: c.customer_id,
    type: 'order_fulfilled',
    title: 'Commande expédiée',
    message: `Votre commande #${payload.order_id.slice(-8)} est en route.`,
    data: payload,
  });
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
