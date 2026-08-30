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
import { calculateCommission, calculateVendorNet, roundTnd } from '../utils/money';
import { subscriptionService } from '../services/subscription.service';
import { platformConfigService } from '../services/platform-config.service';
import { ProductType } from '@pandamarket/types';
import { incrementBusinessMetric } from '../utils/metrics';
import { marketplaceAnalyticsEventService } from '../services/marketplace-analytics-event.service';
import { whatsAppOrderNotificationService } from '../services/whatsapp-order-notification.service';

/**
 * Map a payment gateway identifier to the matching platform-config retention key.
 * Returns undefined for unknown gateways (falls back to wallet default).
 */
function gatewayToRetentionKey(gateway?: string): 'retention_days_flouci' | 'retention_days_konnect' | 'retention_days_mandat' | 'retention_days_cod' | undefined {
  if (!gateway) return undefined;
  const g = gateway.toLowerCase();
  if (g.includes('flouci')) return 'retention_days_flouci';
  if (g.includes('konnect')) return 'retention_days_konnect';
  if (g.includes('mandat')) return 'retention_days_mandat';
  if (g === 'cod' || g === 'cash_on_delivery' || g.includes('cod')) return 'retention_days_cod';
  return undefined;
}

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
      await onPaymentCaptured(payload.order_id, payload.gateway);
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

/**
 * Resolve the tenant-aware customer-facing URL for an order.
 * - Marketplace orders (customer_id): {marketplace base}/hub/orders
 * - Storefront orders: the store's own host (custom domain, else
 *   {subdomain}.{marketplace root domain}) + /account/orders
 * Never hardcodes a domain: the marketplace base comes from FRONTEND_URL
 * or the platform setting marketplace_public_url.
 */
function buildOrderUrl(
  marketplaceBase: string,
  storefrontStore: { subdomain: string | null; custom_domain: string | null } | null,
): string {
  const base = (marketplaceBase || 'https://garbage.team').replace(/\/+$/, '');
  if (!storefrontStore) return `${base}/hub/orders`;
  if (storefrontStore.custom_domain) {
    return `https://${storefrontStore.custom_domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/account/orders`;
  }
  if (storefrontStore.subdomain) {
    try {
      const root = new URL(base).hostname.replace(/^www\./, '');
      return `https://${storefrontStore.subdomain}.${root}/account/orders`;
    } catch {
      // Fall through to the path-based storefront route if the base is unparsable
    }
  }
  return `${base}/store/${storefrontStore.subdomain ?? ''}/account/orders`;
}

function resolveMarketplaceBase(settings: { marketplace_public_url?: unknown }): string {
  const raw = process.env.FRONTEND_URL || settings.marketplace_public_url;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return 'https://garbage.team';
}

async function onOrderPlaced(orderId: string): Promise<void> {
  const { rows } = await query<{
    id: string;
    customer_id: string | null;
    storefront_customer_id: string | null;
    storefront_store_id: string | null;
    store_subdomain: string | null;
    store_custom_domain: string | null;
    total: string;
    customer_email: string | null;
    customer_name: string;
    customer_phone: string;
  }>(
    `SELECT o.id, o.customer_id, o.storefront_customer_id, sc.store_id AS storefront_store_id,
            s.subdomain AS store_subdomain, s.custom_domain AS store_custom_domain, o.total::text,
            COALESCE(u.email, sc.email) AS customer_email,
            COALESCE(u.full_name, sc.full_name, 'Client') AS customer_name,
            COALESCE(u.phone, sc.phone, o.shipping_address->>'phone', '') AS customer_phone
     FROM pd_order o
     LEFT JOIN pd_user u ON u.id = o.customer_id
     LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
     LEFT JOIN pd_store s ON s.id = sc.store_id
     WHERE o.id = $1`,
    [orderId],
  );
  const order = rows[0];
  if (!order) return;

  const settings = await platformConfigService.getSettings();
  const marketplaceBase = resolveMarketplaceBase(settings);
  const orderUrl = buildOrderUrl(
    marketplaceBase,
    order.storefront_store_id
      ? { subdomain: order.store_subdomain, custom_domain: order.store_custom_domain }
      : null,
  );

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
      variables: {
        order_id: order.id,
        total: order.total,
        order_url: orderUrl,
      },
      scope: order.storefront_store_id ? 'store' : 'marketplace',
      store_id: order.storefront_store_id,
    });
  }

  // Dispatch WhatsApp order confirmation if customer phone exists
  if (order.customer_phone) {
    try {
      const { rows: itemRows } = await query<{ title: string; quantity: number }>(
        `SELECT COALESCE(p.title, i.product_id) AS title, i.quantity
         FROM pd_order_item i
         LEFT JOIN pd_product p ON p.id = i.product_id
         WHERE i.order_id = $1`,
        [order.id],
      );
      await whatsAppOrderNotificationService.sendOrderConfirmationWhatsApp({
        orderId: order.id,
        phone: order.customer_phone,
        customerName: order.customer_name,
        items: itemRows,
        totalTnd: parseFloat(order.total) || 0,
        trackingUrl: orderUrl,
      });
    } catch (err) {
      logger.warn({ err, orderId: order.id }, 'Could not dispatch WhatsApp order confirmation');
    }
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

async function onPaymentCaptured(orderId: string, gateway?: string): Promise<void> {
  await assignSerialLicenseKeys(orderId);

  // Idempotency check: skip duplicate credit if wallet transaction already exists
  const { rows: existingTx } = await query<{ id: string }>(
    `SELECT id FROM pd_wallet_transaction WHERE order_id = $1 AND type = 'sale' LIMIT 1`,
    [orderId],
  );
  if (existingTx.length > 0) {
    logger.warn({ orderId }, '[onPaymentCaptured] Wallet already credited for order, skipping duplicate credit');
    return;
  }

  // Resolve per-payment-method retention days from platform config
  let retentionDays: number | undefined;
  const retentionKey = gatewayToRetentionKey(gateway);
  if (retentionKey) {
    const settings = await platformConfigService.getSettings();
    const raw = settings[retentionKey];
    if (typeof raw === 'number' && raw > 0) retentionDays = raw;
  }

  // Per-store totals: commission applies to the item subtotal only; the
  // shipping fee collected from the buyer is credited 100% to the merchant
  // who pays the carrier (owner decision 2026-08-30).
  const { rows: storeRows } = await query<{
    store_id: string;
    owner_id: string;
    owner_email: string;
    plan: string;
    item_subtotal: string;
    shipping_total: string;
  }>(
    `SELECT i.store_id, s.owner_id, u.email AS owner_email,
            s.subscription_plan AS plan,
            SUM(i.subtotal)::text AS item_subtotal,
            COALESCE(MAX(f.shipping_total), 0)::text AS shipping_total
     FROM pd_order_item i
     JOIN pd_store s ON s.id = i.store_id
     JOIN pd_user u ON u.id = s.owner_id
     LEFT JOIN pd_fulfillment f ON f.order_id = $1 AND f.store_id = i.store_id
     WHERE i.order_id = $1
     GROUP BY i.store_id, s.owner_id, u.email, s.subscription_plan`,
    [orderId],
  );

  for (const row of storeRows) {
    const itemSubtotal = parseFloat(row.item_subtotal);
    const shippingTotal = parseFloat(row.shipping_total);
    const limits = await subscriptionService.getLimits(row.plan);
    const commission = calculateCommission(itemSubtotal, limits.commission_rate);
    const netItems = calculateVendorNet(itemSubtotal, limits.commission_rate);
    const net = roundTnd(netItems + shippingTotal);

    if (net > 0) {
      await walletService.creditPending({
        store_id: row.store_id,
        amount: net,
        order_id: orderId,
        retention_days: retentionDays,
        description:
          commission > 0
            ? `Sale (${itemSubtotal} TND) + shipping (${shippingTotal} TND) − commission (${commission} TND)`
            : `Sale (${itemSubtotal} TND) + shipping (${shippingTotal} TND)`,
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
    storefront_store_id: string | null;
    customer_email: string | null;
    total: string;
  }>(
    `SELECT o.customer_id, o.storefront_customer_id, sc.store_id AS storefront_store_id,
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
        scope: c.storefront_store_id ? 'store' : 'marketplace',
        store_id: c.storefront_store_id,
      });
    }

    // Emit server-confirmed purchase analytics event
    await marketplaceAnalyticsEventService.insertMarketplaceEvent({
      event_type: 'checkout_payment_completed',
      order_id: orderId,
      store_id: c.storefront_store_id || null,
      metadata: {
        server_confirmed: true,
        amount: c.total,
      },
    });
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
    storefront_store_id: string | null;
    store_subdomain: string | null;
    store_custom_domain: string | null;
    customer_email: string | null;
    customer_name: string;
    customer_phone: string;
  }>(
    `SELECT o.customer_id, o.storefront_customer_id, sc.store_id AS storefront_store_id,
            s.subdomain AS store_subdomain, s.custom_domain AS store_custom_domain,
            COALESCE(u.email, sc.email) AS customer_email,
            COALESCE(u.full_name, sc.full_name, 'Client') AS customer_name,
            COALESCE(u.phone, sc.phone, o.shipping_address->>'phone', '') AS customer_phone
       FROM pd_order o
       LEFT JOIN pd_user u ON u.id = o.customer_id
       LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
       LEFT JOIN pd_store s ON s.id = sc.store_id
      WHERE o.id = $1`,
    [payload.order_id],
  );
  const c = rows[0];
  if (!c) return;
  const settings = await platformConfigService.getSettings();
  const marketplaceBase = resolveMarketplaceBase(settings);
  const orderUrl = buildOrderUrl(
    marketplaceBase,
    c.storefront_store_id
      ? { subdomain: c.store_subdomain, custom_domain: c.store_custom_domain }
      : null,
  );
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

  // Dispatch WhatsApp shipment update if customer phone exists
  if (c.customer_phone) {
    try {
      await whatsAppOrderNotificationService.sendOrderShippedWhatsApp({
        orderId: payload.order_id,
        phone: c.customer_phone,
        customerName: c.customer_name,
        carrierName: payload.carrier || 'Livraison Express',
        trackingNumber: payload.tracking_number || 'N/A',
        trackingUrl: orderUrl,
      });
    } catch (err) {
      logger.warn({ err, orderId: payload.order_id }, 'Could not dispatch WhatsApp shipping notification');
    }
  }
}
