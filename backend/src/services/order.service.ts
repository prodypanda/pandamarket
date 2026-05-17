/**
 * OrderService — checkout, order creation with order-splitting per vendor,
 * fulfillment status updates, cancellation.
 */

import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import {
  PdConflictError,
  PdErrorCode,
  PdNotFoundError,
  PdValidationError,
} from '../errors';
import {
  IAddress,
  OrderStatus,
  PaymentGateway,
  PaymentStatus,
  ProductStatus,
  ProductType,
  SellerType,
  StoreStatus,
} from '@pandamarket/types';
import { roundTnd } from '../utils/money';
import { logger } from '../utils/logger';
import { config } from '../config';
import { platformConfigService, type PlatformSettings } from './platform-config.service';
import { shippingService } from './shipping.service';

interface CartLine {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

interface PreparedItem {
  product_id: string;
  variant_id: string | null;
  store_id: string;
  title: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  product_type: ProductType;
}

export interface OrderRow {
  id: string;
  customer_id: string | null;
  storefront_customer_id: string | null;
  status: OrderStatus;
  payment_gateway: PaymentGateway;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  subtotal: string;
  shipping_total: string;
  total: string;
  currency: string;
  shipping_address: IAddress | null;
  created_at: Date;
  updated_at: Date;
}

export interface StoreOrderRow extends OrderRow {
  store_subtotal: string;
  store_shipping_total: string;
  store_total: string;
  fulfillment_id: string | null;
  fulfillment_status: string | null;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
  customer_email: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_phone: string | null;
  store_name: string | null;
  store_subdomain: string | null;
  store_custom_domain: string | null;
  store_settings: Record<string, unknown> | null;
  open_report_count?: string;
  customer_order_count?: string;
  customer_lifetime_value?: string;
  customer_last_order_at?: Date | null;
}

export interface StoreOrderNoteRow {
  id: string;
  order_id: string;
  store_id: string;
  body: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface StoreOrderRefundRow {
  id: string;
  order_id: string;
  store_id: string;
  requested_by: string | null;
  amount: string;
  currency: string;
  reason_code: string;
  reason: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface StoreOrderShipmentRow {
  id: string;
  order_id: string;
  fulfillment_id: string | null;
  store_id: string;
  provider: string;
  tracking_number: string;
  label_url: string | null;
  status: string;
  estimated_delivery: Date | null;
  delivered_at: Date | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface StoreDeliveryProofRow {
  id: string;
  order_id: string;
  fulfillment_id: string | null;
  store_id: string;
  shipment_id: string | null;
  captured_by: string | null;
  proof_url: string | null;
  received_by: string | null;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface StoreOrderDetailRow extends StoreOrderRow {
  items: unknown[];
  seller_note: StoreOrderNoteRow | null;
  refunds: StoreOrderRefundRow[];
  shipments: StoreOrderShipmentRow[];
  delivery_proofs: StoreDeliveryProofRow[];
}

export interface StoreOrderSummary {
  total_orders: number;
  open_orders: number;
  to_ship: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
  captured_orders: number;
  captured_revenue: number;
  revenue_today: number;
  revenue_7d: number;
  revenue_30d: number;
  average_order_value: number;
  refund_rate: number;
  average_fulfillment_hours: number;
  fulfillment_sla_rate: number;
}

const FLAT_SHIPPING_PER_STORE = 7; // TND — placeholder until Aramex integration

function numberSetting(settings: PlatformSettings, key: keyof PlatformSettings, fallback: number) {
  const value = Number(settings[key]);
  return Number.isFinite(value) ? value : fallback;
}

function stringSetting(settings: PlatformSettings, key: keyof PlatformSettings, fallback: string) {
  const value = settings[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function storeStringSetting(settings: Record<string, unknown> | null | undefined, key: string) {
  const value = settings?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function countryCode(value?: string | null) {
  const trimmed = (value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : 'TN';
}

function normalizeCity(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function configuredCities(value: string) {
  return value.split(',').map(normalizeCity).filter(Boolean);
}

function configuredShippingRate(settings: PlatformSettings, destinationCity?: string | null) {
  const city = normalizeCity(destinationCity);
  const remoteCities = configuredCities(stringSetting(settings, 'shipping_remote_zone_cities', ''));
  const domesticCities = configuredCities(stringSetting(settings, 'shipping_domestic_zone_cities', ''));
  if (city && remoteCities.includes(city)) return numberSetting(settings, 'shipping_remote_zone_rate_tnd', 12);
  if (city && domesticCities.includes(city)) return numberSetting(settings, 'shipping_domestic_zone_rate_tnd', 7);
  return numberSetting(settings, 'shipping_platform_flat_rate_tnd', FLAT_SHIPPING_PER_STORE);
}

function usesInventory(type: ProductType): boolean {
  return type === ProductType.Physical;
}

function isWholesaleCapableSeller(sellerType?: SellerType | null): boolean {
  return sellerType === SellerType.Wholesaler || sellerType === SellerType.Hybrid;
}

function getWholesaleUnitPrice(basePrice: number, quantity: number, sellerType: SellerType | null, metadata: Record<string, unknown> | null): number {
  if (!isWholesaleCapableSeller(sellerType)) {
    return basePrice;
  }

  const wholesalePricing = metadata?.wholesale_pricing as {
    enabled?: unknown;
    min_quantity?: unknown;
    price_tiers?: unknown;
  } | undefined;
  if (!wholesalePricing?.enabled || !Array.isArray(wholesalePricing.price_tiers)) {
    return basePrice;
  }

  const minQuantity = Number(wholesalePricing.min_quantity);
  if (sellerType === SellerType.Wholesaler && Number.isInteger(minQuantity) && minQuantity > 1 && quantity < minQuantity) {
    throw new PdValidationError(`Minimum quantity for this wholesale product is ${minQuantity}`);
  }

  const tiers = wholesalePricing.price_tiers
    .map((tier) => {
      const item = tier as { min_quantity?: unknown; unit_price?: unknown };
      return {
        min_quantity: Number(item.min_quantity),
        unit_price: Number(item.unit_price),
      };
    })
    .filter((tier) => Number.isInteger(tier.min_quantity) && tier.min_quantity > 0 && Number.isFinite(tier.unit_price) && tier.unit_price >= 0)
    .sort((a, b) => a.min_quantity - b.min_quantity);

  const activeTier = tiers.filter((tier) => quantity >= tier.min_quantity).at(-1);
  return activeTier ? activeTier.unit_price : basePrice;
}

export class OrderService {
  /**
   * Create an order from a cart. Splits items per store into separate fulfillments.
   */
  async checkout(opts: {
    customer_id?: string | null;
    storefront_customer_id?: string | null;
    store_id?: string | null;
    items: CartLine[];
    shipping_address?: IAddress | null;
    payment_gateway: PaymentGateway;
  }): Promise<OrderRow> {
    if (!opts.items || opts.items.length === 0) {
      throw new PdValidationError('Cart is empty', { code: PdErrorCode.ORDER_EMPTY_CART });
    }
    const platformSettings = await platformConfigService.getSettings();

    return transaction(async (c) => {
      // ----- Resolve products + check stock -----
      const prepared: PreparedItem[] = [];
      for (const line of opts.items) {
        if (line.quantity <= 0) {
          throw new PdValidationError('Quantity must be positive');
        }
        const { rows: prodRows } = await c.query<{
          id: string;
          store_id: string;
          title: string;
          price: string;
          inventory_quantity: number;
          status: ProductStatus;
          type: ProductType;
          metadata: Record<string, unknown> | null;
          seller_type: SellerType | null;
          store_status: StoreStatus | null;
          store_is_verified: boolean | null;
        }>(
          `SELECT p.id, p.store_id, p.title, p.price, p.inventory_quantity, p.status, p.type, p.metadata,
                  s.seller_type,
                  s.status AS store_status,
                  s.is_verified AS store_is_verified
           FROM pd_product p
           JOIN pd_store s ON s.id = p.store_id
           WHERE p.id = $1`,
          [line.product_id],
        );
        const product = prodRows[0];
        if (!product) {
          throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found', {
            product_id: line.product_id,
          });
        }
        if (
          product.status !== ProductStatus.Published ||
          product.store_status !== StoreStatus.Verified ||
          product.store_is_verified !== true
        ) {
          throw new PdValidationError('Product is not available', {
            product_id: line.product_id,
          });
        }
        if (opts.store_id && product.store_id !== opts.store_id) {
          throw new PdValidationError('Product does not belong to this storefront', {
            product_id: line.product_id,
            store_id: opts.store_id,
          });
        }
        if (usesInventory(product.type) && product.inventory_quantity < line.quantity) {
          throw new PdValidationError('Insufficient stock', {
            code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
            product_id: line.product_id,
            available: product.inventory_quantity,
          });
        }
        if (product.type === ProductType.Serial) {
          const { rows: licenseRows } = await c.query<{ available: string }>(
            `SELECT COUNT(*)::text AS available
             FROM pd_license_key
             WHERE product_id = $1 AND order_id IS NULL AND is_used = false`,
            [line.product_id],
          );
          const available = parseInt(licenseRows[0]?.available ?? '0', 10);
          if (available < line.quantity) {
            throw new PdValidationError('Insufficient license keys for serial product', {
              code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
              product_id: line.product_id,
              available,
            });
          }
        }

        let unitPrice = parseFloat(product.price);
        let title = product.title;
        if (line.variant_id) {
          const { rows: varRows } = await c.query<{
            id: string;
            title: string;
            price: string;
            inventory_quantity: number;
            product_id: string;
          }>(
            'SELECT id, title, price, inventory_quantity, product_id FROM pd_product_variant WHERE id = $1',
            [line.variant_id],
          );
          const variant = varRows[0];
          if (!variant || variant.product_id !== product.id) {
            throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Variant not found');
          }
          if (usesInventory(product.type) && variant.inventory_quantity < line.quantity) {
            throw new PdValidationError('Insufficient stock for variant', {
              code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
            });
          }
          unitPrice = parseFloat(variant.price);
          title = `${product.title} — ${variant.title}`;
        }
        unitPrice = getWholesaleUnitPrice(unitPrice, line.quantity, product.seller_type, product.metadata);
        prepared.push({
          product_id: product.id,
          variant_id: line.variant_id ?? null,
          store_id: product.store_id,
          title,
          unit_price: unitPrice,
          quantity: line.quantity,
          subtotal: roundTnd(unitPrice * line.quantity),
          product_type: product.type,
        });
      }

      // ----- Compute totals (one fulfillment per distinct store) -----
      const storeIds = Array.from(new Set(prepared.map((p) => p.store_id)));
      const shippableStoreIds = Array.from(new Set(prepared.filter((p) => p.product_type === ProductType.Physical).map((p) => p.store_id)));
      const fulfillmentStoreIds = shippableStoreIds;
      const subtotal = roundTnd(prepared.reduce((s, it) => s + it.subtotal, 0));
      const shippingPerStore = platformSettings.shipping_enabled
        ? configuredShippingRate(platformSettings, opts.shipping_address?.city)
        : 0;
      const freeShippingThreshold = numberSetting(platformSettings, 'shipping_free_shipping_threshold_tnd', 0);
      const shippingTotal = roundTnd(freeShippingThreshold > 0 && subtotal >= freeShippingThreshold ? 0 : shippableStoreIds.length * shippingPerStore);
      const total = roundTnd(subtotal + shippingTotal);
      if (shippableStoreIds.length > 0 && !opts.shipping_address) {
        throw new PdValidationError('Shipping address is required for physical products');
      }
      if (opts.payment_gateway === PaymentGateway.Cod && shippableStoreIds.length === 0) {
        throw new PdValidationError('Cash on delivery is only available for physical products');
      }

      // ----- Create order -----
      const orderId = pdId('order');
      const initialStatus =
        opts.payment_gateway === PaymentGateway.ManualMandat ||
        opts.payment_gateway === PaymentGateway.Cod
          ? OrderStatus.PaymentRequired
          : OrderStatus.Pending;

      const customerId = opts.customer_id ?? null;
      const storefrontCustomerId = opts.storefront_customer_id ?? null;
      if (!customerId && !storefrontCustomerId) {
        throw new PdValidationError('Customer is required');
      }

      const { rows: orderRows } = await c.query<OrderRow>(
        `INSERT INTO pd_order
          (id, customer_id, storefront_customer_id, status, payment_gateway, subtotal,
           shipping_total, total, currency, shipping_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          orderId,
          customerId,
          storefrontCustomerId,
          initialStatus,
          opts.payment_gateway,
          subtotal,
          shippingTotal,
          total,
          config.defaultCurrency,
          opts.shipping_address ? JSON.stringify(opts.shipping_address) : null,
        ],
      );

      // ----- Create order items -----
      for (const item of prepared) {
        await c.query(
          `INSERT INTO pd_order_item
            (id, order_id, product_id, variant_id, store_id, title, quantity, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            pdId('oitem'),
            orderId,
            item.product_id,
            item.variant_id,
            item.store_id,
            item.title,
            item.quantity,
            item.unit_price,
            item.subtotal,
          ],
        );
        // Decrement stock
        if (usesInventory(item.product_type)) {
          await c.query(
            `UPDATE pd_product
             SET inventory_quantity = inventory_quantity - $2
             WHERE id = $1`,
            [item.product_id, item.quantity],
          );
          if (item.variant_id) {
            await c.query(
              `UPDATE pd_product_variant
               SET inventory_quantity = inventory_quantity - $2
               WHERE id = $1`,
              [item.variant_id, item.quantity],
            );
          }
        } else if (item.product_type === ProductType.Serial) {
          const { rowCount } = await c.query(
            `UPDATE pd_license_key
             SET order_id = $1,
                 assigned_at = NOW()
             WHERE id IN (
               SELECT id FROM pd_license_key
               WHERE product_id = $2 AND store_id = $3 AND order_id IS NULL AND is_used = false
               ORDER BY created_at ASC
               LIMIT $4
               FOR UPDATE SKIP LOCKED
             )`,
            [orderId, item.product_id, item.store_id, item.quantity],
          );
          if ((rowCount ?? 0) < item.quantity) {
            throw new PdValidationError('Insufficient license keys for serial product', {
              code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
              product_id: item.product_id,
              available: rowCount ?? 0,
            });
          }
        }
      }

      // ----- Create one fulfillment per store -----
      for (const sid of fulfillmentStoreIds) {
        await c.query(
          `INSERT INTO pd_fulfillment (id, order_id, store_id, shipping_total)
           VALUES ($1, $2, $3, $4)`,
          [pdId('ful'), orderId, sid, shippableStoreIds.includes(sid) && shippingTotal > 0 ? shippingPerStore : 0],
        );
      }

      logger.info(
        { order_id: orderId, customer_id: customerId, storefront_customer_id: storefrontCustomerId, total, stores: storeIds.length },
        'Order created',
      );
      return orderRows[0];
    });
  }

  async getById(id: string): Promise<OrderRow> {
    const { rows } = await query<OrderRow>('SELECT * FROM pd_order WHERE id = $1', [id]);
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.ORDER_NOT_FOUND, 'Order not found');
    return rows[0];
  }

  async getStoreOrderDetail(orderId: string, storeId: string): Promise<StoreOrderDetailRow> {
    const { rows } = await query<StoreOrderDetailRow>(
      `SELECT o.*,
              COALESCE(store_totals.store_subtotal, 0)::text AS store_subtotal,
              COALESCE(f.shipping_total, 0)::text AS store_shipping_total,
              (COALESCE(store_totals.store_subtotal, 0) + COALESCE(f.shipping_total, 0))::text AS store_total,
              f.id AS fulfillment_id,
              f.status AS fulfillment_status,
              f.carrier,
              f.tracking_number,
              f.shipped_at,
              f.delivered_at,
              COALESCE(u.email, sc.email) AS customer_email,
              COALESCE(u.first_name, sc.first_name) AS customer_first_name,
              COALESCE(u.last_name, sc.last_name) AS customer_last_name,
              COALESCE(u.phone, sc.phone) AS customer_phone,
              s.name AS store_name,
              s.subdomain AS store_subdomain,
              s.custom_domain AS store_custom_domain,
              s.settings AS store_settings,
              COALESCE(customer_stats.customer_order_count, '0') AS customer_order_count,
              COALESCE(customer_stats.customer_lifetime_value, '0') AS customer_lifetime_value,
              customer_stats.customer_last_order_at,
              COALESCE(items.items, '[]'::json) AS items,
              CASE WHEN note.id IS NULL THEN NULL ELSE json_build_object(
                'id', note.id,
                'order_id', note.order_id,
                'store_id', note.store_id,
                'body', note.body,
                'created_by', note.created_by,
                'updated_by', note.updated_by,
                'created_at', note.created_at,
                'updated_at', note.updated_at
              ) END AS seller_note,
              COALESCE(refunds.refunds, '[]'::json) AS refunds,
              COALESCE(shipments.shipments, '[]'::json) AS shipments,
              COALESCE(delivery_proofs.delivery_proofs, '[]'::json) AS delivery_proofs
       FROM pd_order o
       LEFT JOIN pd_user u ON u.id = o.customer_id
       LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
       LEFT JOIN pd_store s ON s.id = $2
       LEFT JOIN pd_fulfillment f ON f.order_id = o.id AND f.store_id = $2
       LEFT JOIN pd_store_order_note note ON note.order_id = o.id AND note.store_id = $2
       LEFT JOIN LATERAL (
         SELECT json_agg(r ORDER BY r.created_at DESC) AS refunds
         FROM pd_store_order_refund r
         WHERE r.order_id = o.id AND r.store_id = $2
       ) refunds ON true
       LEFT JOIN LATERAL (
         SELECT json_agg(sh ORDER BY sh.created_at DESC) AS shipments
         FROM pd_shipment sh
         WHERE sh.order_id = o.id AND sh.store_id = $2
       ) shipments ON true
       LEFT JOIN LATERAL (
         SELECT json_agg(dp ORDER BY dp.created_at DESC) AS delivery_proofs
         FROM pd_store_delivery_proof dp
         WHERE dp.order_id = o.id AND dp.store_id = $2
       ) delivery_proofs ON true
       LEFT JOIN LATERAL (
         SELECT
           COUNT(DISTINCT co.id)::text AS customer_order_count,
           COALESCE(SUM(
             CASE WHEN co.payment_status = 'captured'
               THEN COALESCE(co_store_totals.store_subtotal, 0) + COALESCE(cf.shipping_total, 0)
               ELSE 0
             END
           ), 0)::text AS customer_lifetime_value,
           MAX(co.created_at) AS customer_last_order_at
         FROM pd_order co
         LEFT JOIN pd_fulfillment cf ON cf.order_id = co.id AND cf.store_id = $2
         LEFT JOIN LATERAL (
           SELECT COALESCE(SUM(ci.subtotal), 0) AS store_subtotal
           FROM pd_order_item ci
           WHERE ci.order_id = co.id AND ci.store_id = $2
         ) co_store_totals ON true
         WHERE EXISTS (SELECT 1 FROM pd_order_item coi WHERE coi.order_id = co.id AND coi.store_id = $2)
           AND (
             (o.customer_id IS NOT NULL AND co.customer_id = o.customer_id)
             OR (o.storefront_customer_id IS NOT NULL AND co.storefront_customer_id = o.storefront_customer_id)
           )
       ) customer_stats ON true
       LEFT JOIN LATERAL (
         SELECT COALESCE(SUM(i.subtotal), 0) AS store_subtotal
         FROM pd_order_item i
         WHERE i.order_id = o.id AND i.store_id = $2
       ) store_totals ON true
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id', i.id,
             'product_id', i.product_id,
             'variant_id', i.variant_id,
             'product_title', i.title,
             'quantity', i.quantity,
             'unit_price', i.unit_price,
             'subtotal', i.subtotal,
             'product_type', p.type,
             'thumbnail', p.thumbnail,
             'slug', p.slug,
             'variant_sku', v.sku,
             'variant_title', v.title
           )
           ORDER BY i.created_at ASC
         ) AS items
         FROM pd_order_item i
         LEFT JOIN pd_product p ON p.id = i.product_id
         LEFT JOIN pd_product_variant v ON v.id = i.variant_id
         WHERE i.order_id = o.id AND i.store_id = $2
       ) items ON true
       WHERE o.id = $1
         AND EXISTS (SELECT 1 FROM pd_order_item oi WHERE oi.order_id = o.id AND oi.store_id = $2)
       LIMIT 1`,
      [orderId, storeId],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.ORDER_NOT_FOUND, 'Order not found');
    return rows[0];
  }

  async upsertStoreOrderNote(opts: {
    order_id: string;
    store_id: string;
    user_id: string;
    body: string;
  }): Promise<StoreOrderNoteRow> {
    const hasItems = await this.hasStoreItems(opts.order_id, opts.store_id);
    if (!hasItems) {
      throw new PdNotFoundError(PdErrorCode.ORDER_NOT_FOUND, 'Order not found');
    }

    const { rows } = await query<StoreOrderNoteRow>(
      `INSERT INTO pd_store_order_note (id, order_id, store_id, body, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $5)
       ON CONFLICT (order_id, store_id)
       DO UPDATE SET body = EXCLUDED.body,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = NOW()
       RETURNING *`,
      [pdId('ordnote'), opts.order_id, opts.store_id, opts.body, opts.user_id],
    );

    return rows[0];
  }

  async createStoreShipment(opts: {
    order_id: string;
    store_id: string;
    provider?: 'aramex' | 'laposte';
  }): Promise<StoreOrderShipmentRow> {
    const { rows: orderRows } = await query<{
      id: string;
      payment_gateway: PaymentGateway;
      shipping_address: IAddress | null;
      store_total: string;
      fulfillment_id: string | null;
      fulfillment_status: string | null;
      store_name: string | null;
      store_settings: Record<string, unknown> | null;
      customer_email: string | null;
      customer_phone: string | null;
    }>(
      `SELECT o.id,
              o.payment_gateway,
              o.shipping_address,
              (COALESCE(store_totals.store_subtotal, 0) + COALESCE(f.shipping_total, 0))::text AS store_total,
              f.id AS fulfillment_id,
              f.status AS fulfillment_status,
              s.name AS store_name,
              s.settings AS store_settings,
              COALESCE(u.email, sc.email) AS customer_email,
              COALESCE(u.phone, sc.phone) AS customer_phone
       FROM pd_order o
       LEFT JOIN pd_user u ON u.id = o.customer_id
       LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
       LEFT JOIN pd_store s ON s.id = $2
       LEFT JOIN pd_fulfillment f ON f.order_id = o.id AND f.store_id = $2
       LEFT JOIN LATERAL (
         SELECT COALESCE(SUM(i.subtotal), 0) AS store_subtotal
         FROM pd_order_item i
         WHERE i.order_id = o.id AND i.store_id = $2
       ) store_totals ON true
       WHERE o.id = $1
         AND EXISTS (SELECT 1 FROM pd_order_item oi WHERE oi.order_id = o.id AND oi.store_id = $2)
       LIMIT 1`,
      [opts.order_id, opts.store_id],
    );
    const order = orderRows[0];
    if (!order) throw new PdNotFoundError(PdErrorCode.ORDER_NOT_FOUND, 'Order not found');
    if (!order.fulfillment_id) {
      throw new PdValidationError('This order has no shippable fulfillment for your store');
    }
    if (order.fulfillment_status === 'cancelled' || order.fulfillment_status === 'delivered') {
      throw new PdValidationError('Shipment labels cannot be generated for this fulfillment status', {
        fulfillment_status: order.fulfillment_status,
      });
    }

    const { rows: existingShipments } = await query<StoreOrderShipmentRow>(
      `SELECT *
       FROM pd_shipment
       WHERE order_id = $1 AND store_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [opts.order_id, opts.store_id],
    );
    if (existingShipments[0]) return existingShipments[0];

    const shippingAddress = order.shipping_address;
    if (!shippingAddress?.address_line_1 || !shippingAddress.city) {
      throw new PdValidationError('A complete delivery address is required to generate a shipment label');
    }
    const recipientPhone = (shippingAddress.phone || order.customer_phone || '').trim();
    if (!recipientPhone) {
      throw new PdValidationError('A customer phone number is required to generate a shipment label');
    }

    const { rows: itemRows } = await query<{
      title: string;
      quantity: number;
      weight_grams: number | null;
    }>(
      `SELECT i.title, i.quantity, p.weight_grams
       FROM pd_order_item i
       JOIN pd_product p ON p.id = i.product_id
       WHERE i.order_id = $1
         AND i.store_id = $2
         AND p.type = $3
       ORDER BY i.created_at ASC`,
      [opts.order_id, opts.store_id, ProductType.Physical],
    );
    if (itemRows.length === 0) {
      throw new PdValidationError('This order has no physical items to ship');
    }

    const platformSettings = await platformConfigService.getSettings();
    const storeSettings = order.store_settings;
    const senderName = storeStringSetting(storeSettings, 'store_name') || order.store_name || String(platformSettings.marketplace_name);
    const senderPhone = storeStringSetting(storeSettings, 'phone') || stringSetting(platformSettings, 'marketplace_support_phone', '');
    const senderAddressLine = storeStringSetting(storeSettings, 'address') || stringSetting(platformSettings, 'marketplace_address', '');
    const senderCity = storeStringSetting(storeSettings, 'city') || stringSetting(platformSettings, 'shipping_default_origin_city', 'Tunis');
    if (!senderPhone || !senderAddressLine) {
      throw new PdValidationError('Store sender phone and address are required to generate a shipment label');
    }

    const quantity = itemRows.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const weightKg = Math.max(
      0.1,
      itemRows.reduce((sum, item) => {
        const itemWeight = Number(item.weight_grams || 500);
        return sum + Math.max(itemWeight, 50) * Number(item.quantity || 0);
      }, 0) / 1000,
    );
    const description = itemRows.map((item) => item.title).slice(0, 3).join(', ') || 'PandaMarket order';
    const recipientName = [shippingAddress.first_name, shippingAddress.last_name].filter(Boolean).join(' ').trim() || order.customer_email || 'Customer';

    const shipment = await shippingService.createShipment({
      order_id: opts.order_id,
      fulfillment_id: order.fulfillment_id,
      store_id: opts.store_id,
      sender: {
        name: senderName,
        phone: senderPhone,
        address: {
          first_name: senderName,
          last_name: senderName,
          phone: senderPhone,
          address_line_1: senderAddressLine,
          city: senderCity,
          postal_code: storeStringSetting(storeSettings, 'postal_code') || '0000',
          country: countryCode(storeStringSetting(storeSettings, 'country') || stringSetting(platformSettings, 'shipping_default_origin_country', 'TN')),
        },
      },
      recipient: {
        name: recipientName,
        phone: recipientPhone,
        email: order.customer_email || undefined,
        address: {
          first_name: shippingAddress.first_name || recipientName,
          last_name: shippingAddress.last_name || recipientName,
          phone: recipientPhone,
          address_line_1: shippingAddress.address_line_1,
          address_line_2: shippingAddress.address_line_2 || undefined,
          city: shippingAddress.city,
          postal_code: shippingAddress.postal_code || '0000',
          country: countryCode(shippingAddress.country),
        },
      },
      parcels: [{ weight_kg: Math.round(weightKg * 1000) / 1000, description, quantity }],
      provider: opts.provider,
      cod_amount: order.payment_gateway === PaymentGateway.Cod ? roundTnd(parseFloat(order.store_total)) : undefined,
    });

    await query(
      `UPDATE pd_fulfillment
       SET carrier = $2,
           tracking_number = $3,
           updated_at = NOW()
       WHERE id = $1 AND store_id = $4`,
      [order.fulfillment_id, shipment.provider, shipment.tracking_number, opts.store_id],
    );

    const { rows } = await query<StoreOrderShipmentRow>('SELECT * FROM pd_shipment WHERE id = $1', [shipment.id]);
    return rows[0];
  }

  /**
   * Check if an order contains items from a specific store (for vendor tenant isolation).
   */
  async hasStoreItems(orderId: string, storeId: string): Promise<boolean> {
    const { rows } = await query<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM pd_order_item WHERE order_id = $1 AND store_id = $2
      ) AS exists`,
      [orderId, storeId],
    );
    return rows[0]?.exists ?? false;
  }

  async listByCustomer(
    customerId: string,
    opts: { page?: number; limit?: number; status?: OrderStatus } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const params: unknown[] = [customerId];
    let where = 'customer_id = $1';
    if (opts.status) {
      params.push(opts.status);
      where += ` AND status = $${params.length}`;
    }
    params.push(limit, offset);
    const { rows } = await query<OrderRow & { items: unknown[] }>(
      `SELECT o.*, COALESCE(items.items, '[]'::json) AS items
       FROM pd_order o
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'product_id', i.product_id,
             'product_title', i.title,
             'quantity', i.quantity,
             'unit_price', i.unit_price,
             'subtotal', i.subtotal,
             'store_id', i.store_id,
             'store_name', s.name,
             'product_type', p.type,
             'has_digital_file', p.digital_file_key IS NOT NULL
           )
           ORDER BY i.created_at ASC
         ) AS items
         FROM pd_order_item i
         LEFT JOIN pd_store s ON s.id = i.store_id
         LEFT JOIN pd_product p ON p.id = i.product_id
         WHERE i.order_id = o.id
       ) items ON true
       WHERE ${where.replaceAll('customer_id', 'o.customer_id').replaceAll('status', 'o.status')}
       ORDER BY o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const countParams = opts.status ? [customerId, opts.status] : [customerId];
    const { rows: cnt } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_order WHERE ${where}`,
      countParams,
    );
    const total = parseInt(cnt[0].count, 10);
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  async listByStorefrontCustomer(
    storefrontCustomerId: string,
    storeId: string,
    opts: { page?: number; limit?: number; status?: OrderStatus } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const params: unknown[] = [storefrontCustomerId, storeId];
    let where = 'o.storefront_customer_id = $1 AND EXISTS (SELECT 1 FROM pd_order_item oi WHERE oi.order_id = o.id AND oi.store_id = $2)';
    if (opts.status) {
      params.push(opts.status);
      where += ` AND o.status = $${params.length}`;
    }
    params.push(limit, offset);
    const { rows } = await query<OrderRow & { items: unknown[] }>(
      `SELECT o.*, COALESCE(items.items, '[]'::json) AS items
       FROM pd_order o
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'product_id', i.product_id,
             'product_title', i.title,
             'quantity', i.quantity,
             'unit_price', i.unit_price,
             'subtotal', i.subtotal,
             'store_id', i.store_id,
             'store_name', s.name,
             'product_type', p.type,
             'has_digital_file', p.digital_file_key IS NOT NULL
           )
           ORDER BY i.created_at ASC
         ) AS items
         FROM pd_order_item i
         LEFT JOIN pd_store s ON s.id = i.store_id
         LEFT JOIN pd_product p ON p.id = i.product_id
         WHERE i.order_id = o.id
       ) items ON true
       WHERE ${where}
       ORDER BY o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const countParams = opts.status ? [storefrontCustomerId, storeId, opts.status] : [storefrontCustomerId, storeId];
    const countWhere = opts.status
      ? 'o.storefront_customer_id = $1 AND EXISTS (SELECT 1 FROM pd_order_item oi WHERE oi.order_id = o.id AND oi.store_id = $2) AND o.status = $3'
      : 'o.storefront_customer_id = $1 AND EXISTS (SELECT 1 FROM pd_order_item oi WHERE oi.order_id = o.id AND oi.store_id = $2)';
    const { rows: cnt } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_order o WHERE ${countWhere}`,
      countParams,
    );
    const total = parseInt(cnt[0].count, 10);
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }
  /**
   * List orders that contain at least one item from the given store.
   */
  async listByStore(
    storeId: string,
    opts: {
      page?: number;
      limit?: number;
      status?: OrderStatus;
      paymentGateway?: PaymentGateway;
      paymentStatus?: PaymentStatus;
      fulfillmentStatus?: 'pending' | 'shipped' | 'delivered' | 'cancelled';
      dateFrom?: string;
      dateTo?: string;
      customer?: string;
      product?: string;
      country?: string;
      channel?: 'marketplace' | 'storefront';
      hasDispute?: boolean;
      search?: string;
    } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const params: unknown[] = [storeId];
    let where = 'EXISTS (SELECT 1 FROM pd_order_item i WHERE i.order_id = o.id AND i.store_id = $1)';
    const search = opts.search?.trim();
    if (opts.status) {
      params.push(opts.status);
      where += ` AND o.status = $${params.length}`;
    }
    if (opts.paymentGateway) {
      params.push(opts.paymentGateway);
      where += ` AND o.payment_gateway = $${params.length}`;
    }
    if (opts.paymentStatus) {
      params.push(opts.paymentStatus);
      where += ` AND o.payment_status = $${params.length}`;
    }
    if (opts.fulfillmentStatus) {
      params.push(opts.fulfillmentStatus);
      where += ` AND f.status = $${params.length}`;
    }
    if (opts.dateFrom) {
      params.push(opts.dateFrom);
      where += ` AND o.created_at >= $${params.length}::date`;
    }
    if (opts.dateTo) {
      params.push(opts.dateTo);
      where += ` AND o.created_at < ($${params.length}::date + INTERVAL '1 day')`;
    }
    if (opts.customer?.trim()) {
      params.push(`%${opts.customer.trim().toLowerCase()}%`);
      where += ` AND (
        LOWER(COALESCE(o.customer_id, '')) LIKE $${params.length}
        OR LOWER(COALESCE(o.storefront_customer_id, '')) LIKE $${params.length}
        OR LOWER(COALESCE(u.email, sc.email, '')) LIKE $${params.length}
        OR LOWER(COALESCE(u.first_name, sc.first_name, '')) LIKE $${params.length}
        OR LOWER(COALESCE(u.last_name, sc.last_name, '')) LIKE $${params.length}
        OR LOWER(COALESCE(u.phone, sc.phone, '')) LIKE $${params.length}
      )`;
    }
    if (opts.product?.trim()) {
      params.push(`%${opts.product.trim().toLowerCase()}%`);
      where += ` AND EXISTS (
        SELECT 1
        FROM pd_order_item pi
        LEFT JOIN pd_product pp ON pp.id = pi.product_id
        LEFT JOIN pd_product_variant pv ON pv.id = pi.variant_id
        WHERE pi.order_id = o.id
          AND pi.store_id = $1
          AND (
            LOWER(pi.product_id) LIKE $${params.length}
            OR LOWER(pi.title) LIKE $${params.length}
            OR LOWER(COALESCE(pp.slug, '')) LIKE $${params.length}
            OR LOWER(COALESCE(pv.sku, '')) LIKE $${params.length}
          )
      )`;
    }
    if (opts.country?.trim()) {
      params.push(opts.country.trim().toLowerCase());
      where += ` AND LOWER(COALESCE(o.shipping_address->>'country', '')) = $${params.length}`;
    }
    if (opts.channel === 'marketplace') {
      where += ' AND o.customer_id IS NOT NULL';
    } else if (opts.channel === 'storefront') {
      where += ' AND o.storefront_customer_id IS NOT NULL';
    }
    if (opts.hasDispute) {
      where += ` AND EXISTS (
        SELECT 1
        FROM pd_reports dr
        WHERE dr.order_id = o.id
          AND dr.store_id = $1
          AND dr.status IN ('open', 'investigating', 'awaiting_buyer', 'awaiting_seller')
      )`;
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      where += ` AND (
        LOWER(o.id) LIKE $${params.length}
        OR LOWER(COALESCE(o.customer_id, '')) LIKE $${params.length}
        OR LOWER(COALESCE(o.storefront_customer_id, '')) LIKE $${params.length}
        OR LOWER(o.payment_gateway::text) LIKE $${params.length}
        OR LOWER(COALESCE(u.email, sc.email, '')) LIKE $${params.length}
        OR LOWER(COALESCE(u.first_name, sc.first_name, '')) LIKE $${params.length}
        OR LOWER(COALESCE(u.last_name, sc.last_name, '')) LIKE $${params.length}
        OR LOWER(COALESCE(f.tracking_number, '')) LIKE $${params.length}
      )`;
    }
    params.push(limit, offset);
    const { rows } = await query<StoreOrderRow>(
      `SELECT o.*,
              COALESCE(store_totals.store_subtotal, 0)::text AS store_subtotal,
              COALESCE(f.shipping_total, 0)::text AS store_shipping_total,
              (COALESCE(store_totals.store_subtotal, 0) + COALESCE(f.shipping_total, 0))::text AS store_total,
              f.id AS fulfillment_id,
              f.status AS fulfillment_status,
              f.carrier,
              f.tracking_number,
              f.shipped_at,
              f.delivered_at,
              COALESCE(u.email, sc.email) AS customer_email,
              COALESCE(u.first_name, sc.first_name) AS customer_first_name,
              COALESCE(u.last_name, sc.last_name) AS customer_last_name,
              COALESCE(u.phone, sc.phone) AS customer_phone
              ,
              COALESCE(reports.open_report_count, 0)::text AS open_report_count
       FROM pd_order o
       LEFT JOIN pd_user u ON u.id = o.customer_id
       LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
       LEFT JOIN pd_fulfillment f ON f.order_id = o.id AND f.store_id = $1
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS open_report_count
         FROM pd_reports r
         WHERE r.order_id = o.id
           AND r.store_id = $1
           AND r.status IN ('open', 'investigating', 'awaiting_buyer', 'awaiting_seller')
       ) reports ON true
       LEFT JOIN LATERAL (
         SELECT COALESCE(SUM(i.subtotal), 0) AS store_subtotal
         FROM pd_order_item i
         WHERE i.order_id = o.id AND i.store_id = $1
       ) store_totals ON true
       WHERE ${where}
       ORDER BY o.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const countParams = params.slice(0, -2);
    const { rows: cnt } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM pd_order o
       LEFT JOIN pd_user u ON u.id = o.customer_id
       LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
       LEFT JOIN pd_fulfillment f ON f.order_id = o.id AND f.store_id = $1
       WHERE ${where}`,
      countParams,
    );
    const { rows: summaryRows } = await query<{
      total_orders: string;
      open_orders: string;
      to_ship: string;
      shipped: string;
      delivered: string;
      cancelled: string;
      refunded: string;
      captured_orders: string;
      captured_revenue: string;
      revenue_today: string;
      revenue_7d: string;
      revenue_30d: string;
      average_order_value: string;
      refund_rate: string;
      average_fulfillment_hours: string;
      fulfillment_sla_rate: string;
    }>(
      `SELECT
         COUNT(*)::text AS total_orders,
         COUNT(*) FILTER (WHERE o.status IN ('payment_required', 'pending', 'processing'))::text AS open_orders,
         COUNT(*) FILTER (WHERE f.status = 'pending')::text AS to_ship,
         COUNT(*) FILTER (WHERE f.status = 'shipped')::text AS shipped,
         COUNT(*) FILTER (WHERE f.status = 'delivered')::text AS delivered,
         COUNT(*) FILTER (WHERE o.status = 'cancelled' OR f.status = 'cancelled')::text AS cancelled,
         COUNT(*) FILTER (WHERE o.status = 'refunded' OR o.payment_status = 'refunded')::text AS refunded,
         COUNT(*) FILTER (WHERE o.payment_status = 'captured')::text AS captured_orders,
         COALESCE(SUM(CASE WHEN o.payment_status = 'captured' THEN COALESCE(store_totals.store_subtotal, 0) + COALESCE(f.shipping_total, 0) ELSE 0 END), 0)::text AS captured_revenue,
         COALESCE(SUM(CASE WHEN o.payment_status = 'captured' AND o.created_at >= CURRENT_DATE THEN COALESCE(store_totals.store_subtotal, 0) + COALESCE(f.shipping_total, 0) ELSE 0 END), 0)::text AS revenue_today,
         COALESCE(SUM(CASE WHEN o.payment_status = 'captured' AND o.created_at >= NOW() - INTERVAL '7 days' THEN COALESCE(store_totals.store_subtotal, 0) + COALESCE(f.shipping_total, 0) ELSE 0 END), 0)::text AS revenue_7d,
         COALESCE(SUM(CASE WHEN o.payment_status = 'captured' AND o.created_at >= NOW() - INTERVAL '30 days' THEN COALESCE(store_totals.store_subtotal, 0) + COALESCE(f.shipping_total, 0) ELSE 0 END), 0)::text AS revenue_30d,
         COALESCE(AVG(CASE WHEN o.payment_status = 'captured' THEN COALESCE(store_totals.store_subtotal, 0) + COALESCE(f.shipping_total, 0) END), 0)::text AS average_order_value,
         CASE WHEN COUNT(*) = 0 THEN 0
              ELSE (
                COUNT(*) FILTER (
                  WHERE o.status = 'refunded'
                     OR o.payment_status = 'refunded'
                     OR refund_stats.refund_count > 0
                )::numeric / COUNT(*)::numeric
              ) * 100
         END::text AS refund_rate,
         COALESCE(AVG(EXTRACT(EPOCH FROM (f.shipped_at - o.created_at)) / 3600) FILTER (WHERE f.shipped_at IS NOT NULL), 0)::text AS average_fulfillment_hours,
         CASE WHEN COUNT(*) FILTER (WHERE f.shipped_at IS NOT NULL) = 0 THEN 0
              ELSE (
                COUNT(*) FILTER (
                  WHERE f.shipped_at IS NOT NULL
                    AND f.shipped_at <= o.created_at + INTERVAL '48 hours'
                )::numeric / COUNT(*) FILTER (WHERE f.shipped_at IS NOT NULL)::numeric
              ) * 100
         END::text AS fulfillment_sla_rate
       FROM pd_order o
       LEFT JOIN pd_user u ON u.id = o.customer_id
       LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
       LEFT JOIN pd_fulfillment f ON f.order_id = o.id AND f.store_id = $1
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS refund_count
         FROM pd_store_order_refund sr
         WHERE sr.order_id = o.id
           AND sr.store_id = $1
           AND sr.status IN ('requested', 'approved', 'processed')
       ) refund_stats ON true
       LEFT JOIN LATERAL (
         SELECT COALESCE(SUM(i.subtotal), 0) AS store_subtotal
         FROM pd_order_item i
         WHERE i.order_id = o.id AND i.store_id = $1
       ) store_totals ON true
       WHERE ${where}`,
      countParams,
    );
    const total = parseInt(cnt[0].count, 10);
    const summaryRow = summaryRows[0];
    const summary: StoreOrderSummary = {
      total_orders: parseInt(summaryRow.total_orders, 10),
      open_orders: parseInt(summaryRow.open_orders, 10),
      to_ship: parseInt(summaryRow.to_ship, 10),
      shipped: parseInt(summaryRow.shipped, 10),
      delivered: parseInt(summaryRow.delivered, 10),
      cancelled: parseInt(summaryRow.cancelled, 10),
      refunded: parseInt(summaryRow.refunded, 10),
      captured_orders: parseInt(summaryRow.captured_orders, 10),
      captured_revenue: parseFloat(summaryRow.captured_revenue),
      revenue_today: parseFloat(summaryRow.revenue_today),
      revenue_7d: parseFloat(summaryRow.revenue_7d),
      revenue_30d: parseFloat(summaryRow.revenue_30d),
      average_order_value: parseFloat(summaryRow.average_order_value),
      refund_rate: parseFloat(summaryRow.refund_rate),
      average_fulfillment_hours: parseFloat(summaryRow.average_fulfillment_hours),
      fulfillment_sla_rate: parseFloat(summaryRow.fulfillment_sla_rate),
    };
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit), summary } };
  }

  /**
   * Mark a fulfillment (this store's portion of an order) as shipped.
   */
  async fulfill(opts: {
    order_id: string;
    store_id: string;
    carrier?: string;
    tracking_number?: string;
  }): Promise<void> {
    const { rowCount } = await query(
      `UPDATE pd_fulfillment
       SET status = 'shipped', carrier = $3, tracking_number = $4, shipped_at = NOW()
       WHERE order_id = $1 AND store_id = $2 AND status = 'pending'`,
      [opts.order_id, opts.store_id, opts.carrier ?? null, opts.tracking_number ?? null],
    );
    if (!rowCount) {
      throw new PdConflictError(
        PdErrorCode.ORDER_ALREADY_FULFILLED,
        'Fulfillment not found or already shipped',
      );
    }
    // If all fulfillments for this order are shipped, mark the order as fulfilled
    const { rows } = await query<{ pending: string }>(
      `SELECT COUNT(*)::text AS pending
       FROM pd_fulfillment WHERE order_id = $1 AND status = 'pending'`,
      [opts.order_id],
    );
    if (rows[0].pending === '0') {
      await query(
        `UPDATE pd_order SET status = 'fulfilled' WHERE id = $1 AND status NOT IN ('cancelled','refunded')`,
        [opts.order_id],
      );
    }
    logger.info(opts, 'Fulfillment shipped');
  }

  async markStoreFulfillmentDelivered(opts: {
    order_id: string;
    store_id: string;
    delivered_by?: string;
    proof_url?: string | null;
    received_by?: string | null;
    note?: string | null;
  }): Promise<void> {
    const proofUrl = opts.proof_url?.trim() || null;
    const receivedBy = opts.received_by?.trim() || null;
    const note = opts.note?.trim() || null;
    await transaction(async (c) => {
      const { rows: fulfillmentRows, rowCount } = await c.query<{
        id: string;
        tracking_number: string | null;
        carrier: string | null;
      }>(
        `UPDATE pd_fulfillment
         SET status = 'delivered',
             delivered_at = NOW(),
             updated_at = NOW()
         WHERE order_id = $1 AND store_id = $2 AND status = 'shipped'
         RETURNING id, tracking_number, carrier`,
        [opts.order_id, opts.store_id],
      );
      if (!rowCount) {
        throw new PdConflictError(
          PdErrorCode.ORDER_ALREADY_FULFILLED,
          'Fulfillment not found or not shipped',
        );
      }

      const fulfillment = fulfillmentRows[0];
      const proofMetadata = {
        delivery_proof: {
          proof_url: proofUrl,
          received_by: receivedBy,
          note,
          captured_by: opts.delivered_by ?? null,
          captured_at: new Date().toISOString(),
        },
      };
      const { rows: shipmentRows } = await c.query<{ id: string }>(
        `SELECT id
         FROM pd_shipment
         WHERE order_id = $1 AND store_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [opts.order_id, opts.store_id],
      );
      const shipmentId = shipmentRows[0]?.id ?? null;
      if (shipmentId) {
        await c.query(
          `UPDATE pd_shipment
           SET status = 'delivered',
               delivered_at = NOW(),
               metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
               updated_at = NOW()
           WHERE id = $1`,
          [shipmentId, JSON.stringify(proofMetadata)],
        );
      }

      if (proofUrl || receivedBy || note) {
        await c.query<StoreDeliveryProofRow>(
          `INSERT INTO pd_store_delivery_proof
            (id, order_id, fulfillment_id, store_id, shipment_id, captured_by, proof_url, received_by, note, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
          [
            pdId('delproof'),
            opts.order_id,
            fulfillment.id,
            opts.store_id,
            shipmentId,
            opts.delivered_by ?? null,
            proofUrl,
            receivedBy,
            note,
            JSON.stringify({
              carrier: fulfillment.carrier,
              tracking_number: fulfillment.tracking_number,
              source: 'seller_dashboard',
            }),
          ],
        );
      }

      const { rows } = await c.query<{ active: string; delivered: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('pending', 'shipped'))::text AS active,
           COUNT(*) FILTER (WHERE status = 'delivered')::text AS delivered
         FROM pd_fulfillment
         WHERE order_id = $1`,
        [opts.order_id],
      );
      if (rows[0].active === '0' && rows[0].delivered !== '0') {
        await c.query(
          `UPDATE pd_order SET status = 'delivered' WHERE id = $1 AND status NOT IN ('cancelled','refunded')`,
          [opts.order_id],
        );
      }
    });
    logger.info(opts, 'Fulfillment delivered');
  }

  async cancelStoreFulfillment(opts: {
    order_id: string;
    store_id: string;
    reason: string;
  }): Promise<void> {
    await transaction(async (c) => {
      const { rowCount } = await c.query(
        `UPDATE pd_fulfillment
         SET status = 'cancelled',
             updated_at = NOW()
         WHERE order_id = $1 AND store_id = $2 AND status = 'pending'`,
        [opts.order_id, opts.store_id],
      );
      if (!rowCount) {
        throw new PdConflictError(
          PdErrorCode.ORDER_ALREADY_FULFILLED,
          'Fulfillment not found or cannot be cancelled',
        );
      }

      const { rows: items } = await c.query<{
        product_id: string;
        variant_id: string | null;
        quantity: number;
        product_type: ProductType;
      }>(
        `SELECT i.product_id, i.variant_id, i.quantity, p.type AS product_type
         FROM pd_order_item i
         JOIN pd_product p ON p.id = i.product_id
         WHERE i.order_id = $1 AND i.store_id = $2`,
        [opts.order_id, opts.store_id],
      );
      for (const it of items) {
        if (usesInventory(it.product_type)) {
          await c.query(
            `UPDATE pd_product SET inventory_quantity = inventory_quantity + $2 WHERE id = $1`,
            [it.product_id, it.quantity],
          );
          if (it.variant_id) {
            await c.query(
              `UPDATE pd_product_variant SET inventory_quantity = inventory_quantity + $2 WHERE id = $1`,
              [it.variant_id, it.quantity],
            );
          }
        }
      }

      const { rows } = await c.query<{
        pending: string;
        shipped: string;
        delivered: string;
        active: string;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
           COUNT(*) FILTER (WHERE status = 'shipped')::text AS shipped,
           COUNT(*) FILTER (WHERE status = 'delivered')::text AS delivered,
           COUNT(*) FILTER (WHERE status IN ('pending', 'shipped', 'delivered'))::text AS active
         FROM pd_fulfillment
         WHERE order_id = $1`,
        [opts.order_id],
      );
      const counts = rows[0];
      if (counts.active === '0') {
        await c.query(
          `UPDATE pd_order
           SET status = 'cancelled',
               cancelled_at = NOW(),
               cancelled_reason = $2
           WHERE id = $1 AND status NOT IN ('cancelled','refunded')`,
          [opts.order_id, opts.reason],
        );
      } else if (counts.pending === '0' && counts.shipped === '0' && counts.delivered !== '0') {
        await c.query(
          `UPDATE pd_order SET status = 'delivered' WHERE id = $1 AND status NOT IN ('cancelled','refunded')`,
          [opts.order_id],
        );
      } else if (counts.pending === '0' && counts.shipped !== '0') {
        await c.query(
          `UPDATE pd_order SET status = 'fulfilled' WHERE id = $1 AND status NOT IN ('cancelled','refunded')`,
          [opts.order_id],
        );
      }
    });
    logger.info(opts, 'Store fulfillment cancelled');
  }

  async requestStoreRefund(opts: {
    order_id: string;
    store_id: string;
    requested_by: string;
    amount: number;
    reason_code: string;
    reason?: string | null;
  }): Promise<StoreOrderRefundRow> {
    const amount = roundTnd(opts.amount);
    if (amount <= 0) {
      throw new PdValidationError('Refund amount must be positive');
    }

    return transaction(async (c) => {
      const { rows: orderRows } = await c.query<{
        payment_status: PaymentStatus;
        currency: string;
        store_total: string;
      }>(
        `SELECT o.payment_status,
                o.currency,
                (COALESCE(store_totals.store_subtotal, 0) + COALESCE(f.shipping_total, 0))::text AS store_total
         FROM pd_order o
         LEFT JOIN pd_fulfillment f ON f.order_id = o.id AND f.store_id = $2
         LEFT JOIN LATERAL (
           SELECT COALESCE(SUM(i.subtotal), 0) AS store_subtotal
           FROM pd_order_item i
           WHERE i.order_id = o.id AND i.store_id = $2
         ) store_totals ON true
         WHERE o.id = $1
           AND EXISTS (SELECT 1 FROM pd_order_item oi WHERE oi.order_id = o.id AND oi.store_id = $2)
         LIMIT 1`,
        [opts.order_id, opts.store_id],
      );
      const order = orderRows[0];
      if (!order) throw new PdNotFoundError(PdErrorCode.ORDER_NOT_FOUND, 'Order not found');
      if (order.payment_status !== PaymentStatus.Captured) {
        throw new PdValidationError('Only captured payments can be refunded', {
          payment_status: order.payment_status,
        });
      }

      const { rows: refundRows } = await c.query<{ refunded_total: string }>(
        `SELECT COALESCE(SUM(amount), 0)::text AS refunded_total
         FROM pd_store_order_refund
         WHERE order_id = $1
           AND store_id = $2
           AND status IN ('requested', 'approved', 'processed')`,
        [opts.order_id, opts.store_id],
      );
      const storeTotal = roundTnd(parseFloat(order.store_total));
      const refundedTotal = roundTnd(parseFloat(refundRows[0]?.refunded_total ?? '0'));
      const remaining = roundTnd(storeTotal - refundedTotal);
      if (amount > remaining) {
        throw new PdValidationError('Refund amount exceeds remaining refundable total', {
          requested: amount,
          remaining,
          store_total: storeTotal,
          already_requested_or_refunded: refundedTotal,
        });
      }

      const { rows } = await c.query<StoreOrderRefundRow>(
        `INSERT INTO pd_store_order_refund
          (id, order_id, store_id, requested_by, amount, currency, reason_code, reason, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
         RETURNING *`,
        [
          pdId('refund'),
          opts.order_id,
          opts.store_id,
          opts.requested_by,
          amount,
          order.currency || 'TND',
          opts.reason_code,
          opts.reason?.trim() || null,
          JSON.stringify({ source: 'seller_dashboard' }),
        ],
      );
      return rows[0];
    });
  }

  async cancel(orderId: string, reason: string): Promise<void> {
    const order = await this.getById(orderId);
    if (order.status === OrderStatus.Cancelled) {
      throw new PdConflictError(PdErrorCode.ORDER_ALREADY_CANCELLED, 'Order already cancelled');
    }
    if ([OrderStatus.Fulfilled, OrderStatus.Delivered].includes(order.status)) {
      throw new PdValidationError('Cannot cancel a shipped/delivered order', {
        code: PdErrorCode.ORDER_CANNOT_CANCEL,
        status: order.status,
      });
    }
    await transaction(async (c) => {
      await c.query(
        `UPDATE pd_order SET status = 'cancelled', cancelled_at = NOW(), cancelled_reason = $2
         WHERE id = $1`,
        [orderId, reason],
      );
      // Restock items
      const { rows: items } = await c.query<{
        product_id: string;
        variant_id: string | null;
        quantity: number;
        product_type: ProductType;
      }>(
        `SELECT i.product_id, i.variant_id, i.quantity, p.type AS product_type
         FROM pd_order_item i
         JOIN pd_product p ON p.id = i.product_id
         WHERE i.order_id = $1`,
        [
        orderId,
      ]);
      for (const it of items) {
        if (usesInventory(it.product_type)) {
          await c.query(
            `UPDATE pd_product SET inventory_quantity = inventory_quantity + $2 WHERE id = $1`,
            [it.product_id, it.quantity],
          );
          if (it.variant_id) {
            await c.query(
              `UPDATE pd_product_variant SET inventory_quantity = inventory_quantity + $2 WHERE id = $1`,
              [it.variant_id, it.quantity],
            );
          }
        } else if (it.product_type === ProductType.Serial && order.payment_status !== PaymentStatus.Captured) {
          await c.query(
            `UPDATE pd_license_key
             SET order_id = NULL,
                 assigned_at = NULL
             WHERE product_id = $1 AND order_id = $2 AND is_used = false`,
            [it.product_id, orderId],
          );
        }
      }
    });
    logger.info({ order_id: orderId, reason }, 'Order cancelled');
  }

  /**
   * Mark an order as paid (called after payment capture).
   * Triggers the payment-captured event for downstream wallet credit.
   */
  async markPaid(orderId: string, gateway: PaymentGateway, reference: string): Promise<OrderRow> {
    const { rows } = await query<OrderRow>(
      `UPDATE pd_order
       SET payment_status = 'captured',
           payment_gateway = $2,
           payment_reference = $3,
           status = CASE
             WHEN status IN ('cancelled', 'refunded') THEN status
             WHEN NOT EXISTS (
               SELECT 1 FROM pd_fulfillment
               WHERE order_id = $1 AND status = 'pending'
             ) THEN 'fulfilled'
             WHEN status = 'payment_required' THEN 'pending'
             ELSE status
           END
       WHERE id = $1 AND payment_status != 'captured'
       RETURNING *`,
      [orderId, gateway, reference],
    );
    if (!rows[0]) {
      throw new PdConflictError(
        PdErrorCode.PAY_ALREADY_CAPTURED,
        'Order not found or already paid',
      );
    }
    return rows[0];
  }
}

export const orderService = new OrderService();
