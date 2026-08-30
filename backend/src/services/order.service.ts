/**
 * OrderService — checkout, order creation with order-splitting per vendor,
 * fulfillment status updates, cancellation.
 */

import { query, transaction } from '../db/pool';
import type { PoolClient } from 'pg';
import { pdId } from '../utils/crypto';
import {
  PdConflictError,
  PdErrorCode,
  PdForbiddenError,
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
import { platformConfigService, type PlatformSettings } from './platform-config.service';
import { shippingService } from './shipping.service';
import { adsService } from './ads.service';
import { eventBus, PdEvent } from '../events/event-bus';
import { buyerInterestService } from './buyer-interest.service';
import { checkoutQuoteService } from './checkout-quote.service';
import { paymentCapabilityService } from './payment-capability.service';
import { walletService } from './wallet.service';
import { syncOrderStatusFromFulfillments, restoreOrderItemStock } from './order-fulfillment-shared';

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

interface IdempotencyBinding {
  customer_id?: string | null;
  storefront_customer_id?: string | null;
  quote_id?: string | null;
  payment_gateway?: PaymentGateway;
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
  gross_subtotal?: string;
  discount_total?: string;
  tax_total?: string;
  coupon_code?: string | null;
  quote_id?: string | null;
  quote_version?: number | null;
  payment_capability_version?: string | null;
  total: string;
  currency: string;
  shipping_address: IAddress | null;
  created_at: Date;
  updated_at: Date;
}

export interface CheckoutResult {
  order: OrderRow;
  replayed: boolean;
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
  rto_reason_code?: string | null;
  rto_notes?: string | null;
  rto_at?: Date | null;
  cod_status?: string | null;
  cod_risk_score?: number | null;
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

export interface CodVerificationRow {
  id: string;
  order_id: string;
  store_id: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'unreachable' | 'otp_verified';
  call_attempts: number;
  last_call_at: Date | null;
  otp_code?: string | null;
  otp_sent_at: Date | null;
  otp_verified_at: Date | null;
  risk_score: number;
  risk_factors: Array<{ name: string; impact: 'positive' | 'negative' | 'neutral'; description: string }>;
  notes: string | null;
  verified_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CourierSettlementRow {
  id: string;
  store_id: string;
  order_id: string;
  carrier: string;
  tracking_number: string | null;
  collected_amount: string;
  courier_fee: string;
  net_payout: string;
  status: 'pending' | 'settled' | 'disputed';
  settled_at: Date | null;
  settlement_reference: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  customer_name?: string;
  customer_phone?: string;
  delivery_date?: Date | null;
}

export interface StoreOrderDetailRow extends StoreOrderRow {
  items: unknown[];
  seller_note: StoreOrderNoteRow | null;
  refunds: StoreOrderRefundRow[];
  shipments: StoreOrderShipmentRow[];
  delivery_proofs: StoreDeliveryProofRow[];
  rto_reason_code?: string | null;
  rto_notes?: string | null;
  rto_at?: Date | null;
  cod_verification?: CodVerificationRow | null;
  courier_settlement?: CourierSettlementRow | null;
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

export const FLAT_SHIPPING_PER_STORE = 7; // TND — fallback until a live carrier quote is available
export const COMBINED_SHIPPING_REBATE_PER_ADDITIONAL_STORE = 3;

export function numberSetting(settings: PlatformSettings, key: keyof PlatformSettings, fallback: number) {
  const value = Number(settings[key]);
  return Number.isFinite(value) ? value : fallback;
}

export function stringSetting(settings: PlatformSettings, key: keyof PlatformSettings, fallback: string) {
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

export function normalizeCity(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function configuredCities(value: string) {
  return value.split(',').map(normalizeCity).filter(Boolean);
}

export function configuredShippingRate(settings: PlatformSettings, destinationCity?: string | null) {
  const city = normalizeCity(destinationCity);
  const remoteCities = configuredCities(stringSetting(settings, 'shipping_remote_zone_cities', ''));
  const domesticCities = configuredCities(stringSetting(settings, 'shipping_domestic_zone_cities', ''));
  if (city && remoteCities.includes(city)) return numberSetting(settings, 'shipping_remote_zone_rate_tnd', 12);
  if (city && domesticCities.includes(city)) return numberSetting(settings, 'shipping_domestic_zone_rate_tnd', 7);
  return numberSetting(settings, 'shipping_platform_flat_rate_tnd', FLAT_SHIPPING_PER_STORE);
}

export function usesInventory(type: ProductType): boolean {
  return type === ProductType.Physical;
}

export function isWholesaleCapableSeller(sellerType?: SellerType | null): boolean {
  return sellerType === SellerType.Wholesaler || sellerType === SellerType.Hybrid;
}

export function getWholesaleUnitPrice(basePrice: number, quantity: number, sellerType: SellerType | null, metadata: Record<string, unknown> | null): number {
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
    idempotency_key?: string | null;
    quote_id?: string | null;
    payment_capability_version?: string | null;
    coupon_code?: string | null;
    items: CartLine[];
    shipping_address?: IAddress | null;
    payment_gateway: PaymentGateway;
    ads_attribution?: { campaign_id:string; creative_id:string; event_key:string };
  }): Promise<CheckoutResult> {
    if (!opts.items || opts.items.length === 0) {
      throw new PdValidationError('Cart is empty', { code: PdErrorCode.ORDER_EMPTY_CART });
    }
    if (opts.idempotency_key && opts.idempotency_key.length > 128) {
      throw new PdValidationError('Idempotency-Key must be 128 characters or fewer');
    }
    if (opts.idempotency_key) {
      const existing = await this.getByIdempotencyKey(opts.idempotency_key, {
        customer_id: opts.customer_id,
        storefront_customer_id: opts.storefront_customer_id,
        quote_id: opts.quote_id,
        payment_gateway: opts.payment_gateway,
      });
      if (existing) return { order: existing, replayed: true };
    }
    return transaction(async (c) => {
      if (opts.idempotency_key) {
        // Serialize all attempts for the same key before touching quote or
        // inventory rows. This closes the race where two requests both miss
        // the pre-transaction lookup and the loser later observes a consumed
        // quote instead of the committed order.
        await c.query(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          [`pd_checkout:idempotency:${opts.idempotency_key}`],
        );
        const existing = await this.getByIdempotencyKeyWithExecutor(c, opts.idempotency_key);
        if (existing) {
          return { order: this.assertIdempotencyBinding(existing, opts), replayed: true };
        }
      }
      const platformSettings = await platformConfigService.getSettingsFresh(
        c,
        ['finance', 'shipping'],
      );
      let quote = null as Awaited<ReturnType<typeof checkoutQuoteService.lockForCheckout>> | null;
      if (opts.quote_id) {
        try {
          quote = await checkoutQuoteService.lockForCheckout(
            c,
            opts.quote_id,
            opts.customer_id,
            opts.storefront_customer_id,
          );
        } catch (err) {
          // A concurrent request with the same idempotency key may have
          // committed the order while this transaction waited on the quote
          // row. Replay that committed order instead of surfacing the quote's
          // consumed-state conflict.
          const details = err instanceof PdConflictError ? err.details : undefined;
          if (
            opts.idempotency_key
            && err instanceof PdConflictError
            && err.code === PdErrorCode.ORDER_QUOTE_STALE
            && typeof details?.order_id === 'string'
          ) {
            const existing = await this.getByIdempotencyKeyWithExecutor(c, opts.idempotency_key);
            if (existing?.id === details.order_id) {
              return { order: this.assertIdempotencyBinding(existing, opts), replayed: true };
            }
          }
          throw err;
        }
      }

      // Lock affected products and variants in deterministic ascending ID order to prevent deadlocks
      const uniqueProductIds = Array.from(new Set(opts.items.map((it) => it.product_id))).sort();
      if (uniqueProductIds.length > 0) {
        await c.query(
          `SELECT id FROM pd_product WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`,
          [uniqueProductIds],
        );
      }
      const uniqueVariantIds = Array.from(
        new Set(opts.items.map((it) => it.variant_id).filter((v): v is string => Boolean(v))),
      ).sort();
      if (uniqueVariantIds.length > 0) {
        await c.query(
          `SELECT id FROM pd_product_variant WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`,
          [uniqueVariantIds],
        );
      }

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
          throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Product does not belong to this storefront', {
            product_id: line.product_id,
            store_id: opts.store_id,
          });
        }
        if (product.type === ProductType.Bundle) {
          const { rows: bundleItems } = await c.query<{
            product_id: string;
            variant_id: string | null;
            quantity: number;
            comp_title: string;
            comp_stock: number;
            var_stock: number | null;
          }>(
            `SELECT bi.product_id, bi.variant_id, bi.quantity,
                    bp.title AS comp_title, bp.inventory_quantity AS comp_stock,
                    bpv.inventory_quantity AS var_stock
             FROM pd_product_bundle_item bi
             JOIN pd_product bp ON bp.id = bi.product_id
             LEFT JOIN pd_product_variant bpv ON bpv.id = bi.variant_id
             WHERE bi.bundle_product_id = $1`,
            [product.id],
          );

          if (bundleItems.length === 0) {
            throw new PdValidationError('Pack promo indisponible (aucun composant configuré)', {
              product_id: product.id,
            });
          }

          for (const bi of bundleItems) {
            const requiredQty = bi.quantity * line.quantity;
            const availableStock = bi.var_stock !== null && bi.var_stock !== undefined ? bi.var_stock : bi.comp_stock;
            if (availableStock < requiredQty) {
              throw new PdValidationError(`Stock insuffisant pour le composant du pack: ${bi.comp_title}`, {
                code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
                product_id: bi.product_id,
                available: availableStock,
              });
            }
          }
        } else if (usesInventory(product.type) && product.inventory_quantity < line.quantity) {
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
      if (shippableStoreIds.length > 0 && !opts.shipping_address) {
        throw new PdValidationError('Shipping address is required for physical products');
      }
      const quoteTotals = await checkoutQuoteService.calculateTotals(
        c,
        prepared,
        platformSettings,
        opts.shipping_address,
        quote?.coupon_code ?? opts.coupon_code,
      );
      if (quote) {
        checkoutQuoteService.assertMatches(quote, {
          owner_user_id: opts.customer_id,
          owner_storefront_customer_id: opts.storefront_customer_id,
          store_id: opts.store_id,
          items: opts.items,
          shipping_address: opts.shipping_address,
          coupon_code: opts.coupon_code,
          totals: quoteTotals,
        });
      }
      const grossSubtotal = quoteTotals.subtotal;
      const subtotal = roundTnd(grossSubtotal - quoteTotals.product_discount_total);
      const shippingTotal = quoteTotals.shipping_total;
      const taxTotal = quoteTotals.tax_total;
      const total = quoteTotals.total;

      const paymentSelection = await paymentCapabilityService.assertGatewayAvailable({
        executor: c,
        lock_stores: true,
        settings: platformSettings,
        gateway: opts.payment_gateway,
        expected_version: opts.payment_capability_version,
        context: {
          quote_id: quote?.id ?? null,
          quote_version: quote?.quote_version ?? null,
          currency: quoteTotals.currency,
          items: prepared.map((item) => ({
            store_id: item.store_id,
            product_type: item.product_type,
          })),
          shipping_address: opts.shipping_address ?? null,
        },
      });

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
            (id, customer_id, storefront_customer_id, status, payment_gateway, gross_subtotal,
             subtotal, discount_total, shipping_total, tax_total, total, currency, shipping_address,
             idempotency_key, quote_id, quote_version, payment_capability_version, coupon_code,
             discount_breakdown, quote_snapshot)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
           ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
           RETURNING *`,
          [
            orderId,
            customerId,
            storefrontCustomerId,
            initialStatus,
            opts.payment_gateway,
            grossSubtotal,
            subtotal,
            quoteTotals.discount_total,
            shippingTotal,
            taxTotal,
            total,
            quoteTotals.currency,
            opts.shipping_address ? JSON.stringify(opts.shipping_address) : null,
            opts.idempotency_key ?? null,
            quote?.id ?? null,
            quote?.quote_version ?? null,
            paymentSelection.capability_version,
            quote?.coupon_code ?? opts.coupon_code?.trim().toUpperCase() ?? null,
            JSON.stringify(quoteTotals.breakdown),
            JSON.stringify(quoteTotals.snapshot),
          ],
      );

      if (!orderRows[0] && opts.idempotency_key) {
        const existing = await this.getByIdempotencyKeyWithExecutor(c, opts.idempotency_key);
        if (existing) {
          return { order: this.assertIdempotencyBinding(existing, opts), replayed: true };
        }
        throw new PdConflictError(
          PdErrorCode.ORDER_IDEMPOTENCY_CONFLICT,
          'The idempotency key is already associated with another checkout',
        );
      }

      // ----- Create order items -----
      for (const [itemIndex, item] of prepared.entries()) {
        const pricedLine = quoteTotals.lines[itemIndex];
        const itemDiscount = roundTnd(pricedLine?.discount_amount || 0);
        const netItemSubtotal = roundTnd(item.subtotal - itemDiscount);
        await c.query(
          `INSERT INTO pd_order_item
            (id, order_id, product_id, variant_id, store_id, title, quantity, unit_price,
             gross_subtotal, discount_amount, discount_breakdown, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            pdId('oitem'),
            orderId,
            item.product_id,
            item.variant_id,
            item.store_id,
            item.title,
            item.quantity,
            roundTnd(netItemSubtotal / item.quantity),
            item.subtotal,
            itemDiscount,
            JSON.stringify(pricedLine?.discount_breakdown || {}),
            netItemSubtotal,
          ],
        );
        // Guarded atomic stock decrement
        if (item.product_type === ProductType.Bundle) {
          const { rows: bundleItems } = await c.query<{
            product_id: string;
            variant_id: string | null;
            quantity: number;
          }>(
            'SELECT product_id, variant_id, quantity FROM pd_product_bundle_item WHERE bundle_product_id = $1',
            [item.product_id],
          );

          for (const bi of bundleItems) {
            const requiredQty = bi.quantity * item.quantity;
            const { rows: updatedComp } = await c.query<{ inventory_quantity: number }>(
              `UPDATE pd_product
               SET inventory_quantity = inventory_quantity - $2
               WHERE id = $1 AND inventory_quantity >= $2
               RETURNING inventory_quantity`,
              [bi.product_id, requiredQty],
            );
            if (!updatedComp[0]) {
              throw new PdValidationError('Insufficient stock for bundle component', {
                code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
                product_id: bi.product_id,
              });
            }

            if (bi.variant_id) {
              const { rows: updatedCompVar } = await c.query<{ inventory_quantity: number }>(
                `UPDATE pd_product_variant
                 SET inventory_quantity = inventory_quantity - $2
                 WHERE id = $1 AND inventory_quantity >= $2
                 RETURNING inventory_quantity`,
                [bi.variant_id, requiredQty],
              );
              if (!updatedCompVar[0]) {
                throw new PdValidationError('Insufficient stock for bundle component variant', {
                  code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
                  product_id: bi.product_id,
                  variant_id: bi.variant_id,
                });
              }
            }
          }
        } else if (usesInventory(item.product_type)) {
          const { rows: updatedProduct } = await c.query<{ inventory_quantity: number }>(
            `UPDATE pd_product
             SET inventory_quantity = inventory_quantity - $2
             WHERE id = $1 AND inventory_quantity >= $2
             RETURNING inventory_quantity`,
            [item.product_id, item.quantity],
          );
          if (!updatedProduct[0]) {
            throw new PdValidationError('Insufficient stock', {
              code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
              product_id: item.product_id,
            });
          }
          if (item.variant_id) {
            const { rows: updatedVariant } = await c.query<{ inventory_quantity: number }>(
              `UPDATE pd_product_variant
               SET inventory_quantity = inventory_quantity - $2
               WHERE id = $1 AND inventory_quantity >= $2
               RETURNING inventory_quantity`,
              [item.variant_id, item.quantity],
            );
            if (!updatedVariant[0]) {
              throw new PdValidationError('Insufficient stock for variant', {
                code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
                product_id: item.product_id,
                variant_id: item.variant_id,
              });
            }
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

      // ----- Attribute an eligible sponsored interaction -----
      if (opts.ads_attribution) {
        const hit=await adsService.findAttribution(c,{eventKey:opts.ads_attribution.event_key,campaignId:opts.ads_attribution.campaign_id,creativeId:opts.ads_attribution.creative_id});
        if(hit&&(!hit.product_id||prepared.some(item=>item.product_id===hit.product_id))){
          await c.query(`INSERT INTO pd_ads_conversion (id,campaign_id,event_id,order_id,revenue,attribution_type)
            VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (campaign_id,order_id) DO NOTHING`,
            [pdId('adcnv'),hit.campaign_id,hit.event_id,orderId,total,hit.event_type==='click'?'click':'view']);
        }
      }

      // ----- Create one fulfillment per store -----
      for (const sid of fulfillmentStoreIds) {
        await c.query(
          `INSERT INTO pd_fulfillment (id, order_id, store_id, shipping_total)
           VALUES ($1, $2, $3, $4)`,
          [pdId('ful'), orderId, sid, quoteTotals.shipping_by_store[sid] || 0],
        );
      }

      if (quote) {
        await checkoutQuoteService.consume(c, quote.id, orderId);
      }

      logger.info(
        { order_id: orderId, customer_id: customerId, storefront_customer_id: storefrontCustomerId, total, stores: storeIds.length },
        'Order created',
      );
      if (customerId) {
        buyerInterestService.syncBuyerProfile(customerId).catch(() => {});
      }
      return { order: orderRows[0], replayed: false };
    });
  }

  private assertIdempotencyBinding(order: OrderRow, binding: IdempotencyBinding): OrderRow {
    if (!Object.keys(binding).length) return order;
    const sameCustomer = (order.customer_id ?? null) === (binding.customer_id ?? null);
    const sameStorefrontCustomer = (order.storefront_customer_id ?? null) === (binding.storefront_customer_id ?? null);
    const sameQuote = (order.quote_id ?? null) === (binding.quote_id ?? null);
    const sameGateway = !binding.payment_gateway || order.payment_gateway === binding.payment_gateway;
    if (!sameCustomer || !sameStorefrontCustomer || !sameQuote || !sameGateway) {
      throw new PdConflictError(
        PdErrorCode.ORDER_IDEMPOTENCY_CONFLICT,
        'The idempotency key is already associated with a different checkout',
      );
    }
    return order;
  }

  private async getByIdempotencyKeyWithExecutor(executor: PoolClient, key: string): Promise<OrderRow | null> {
    const { rows } = await executor.query<OrderRow>(
      `SELECT * FROM pd_order WHERE idempotency_key = $1`,
      [key],
    );
    return rows[0] ?? null;
  }

  async getByIdempotencyKey(key: string, binding?: IdempotencyBinding): Promise<OrderRow | null> {
    const { rows } = await query<OrderRow>(
      `SELECT * FROM pd_order WHERE idempotency_key = $1`,
      [key],
    );
    return rows[0] ? this.assertIdempotencyBinding(rows[0], binding || {}) : null;
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
              f.rto_reason_code,
              f.rto_notes,
              f.rto_at,
              cv.status AS cod_status,
              cv.risk_score AS cod_risk_score,
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
             'variant_title', v.title,
             'bundle_items', (
               SELECT json_agg(
                 json_build_object(
                   'product_id', bi.product_id,
                   'product_title', bp.title,
                   'variant_title', bpv.title,
                   'quantity', bi.quantity
                 )
                 ORDER BY bi.position ASC
               )
               FROM pd_product_bundle_item bi
               JOIN pd_product bp ON bp.id = bi.product_id
               LEFT JOIN pd_product_variant bpv ON bpv.id = bi.variant_id
               WHERE bi.bundle_product_id = p.id
             )
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
         WHERE i.order_id = o.id AND i.store_id = $2
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
       LEFT JOIN pd_cod_verification cv ON cv.order_id = o.id AND cv.store_id = $1
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
   * Recompute pd_order.status from the fulfillment aggregate.
   * MUST run inside the caller's transaction. Idempotent.
   * Canonical rules (implemented in order-status-sync.ts, shared with the
   * shipping layer):
   *  - cancelled/refunded orders are never touched
   *  - zero pending, >=1 delivered, rest terminal   -> 'delivered'
   *  - zero pending, >=1 shipped                    -> 'fulfilled'
   *  - zero pending/shipped/delivered (all canc.)   -> 'cancelled' (reason passed in)
   *  - otherwise (any pending)                      -> leave the order alone
   * Digital-only orders have zero fulfillments -> the sub-select returns no row -> untouched.
   */
  async syncOrderStatusFromFulfillments(
    c: Pick<PoolClient, 'query'>,
    orderId: string,
    opts: { cancelReason?: string } = {},
  ): Promise<void> {
    await syncOrderStatusFromFulfillments(c, orderId, opts);
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
    let shippedCarrier: string | null = null;
    let shippedTracking: string | null = null;
    await transaction(async (c) => {
      const { rows: shippedRows, rowCount } = await c.query<{
        carrier: string | null;
        tracking_number: string | null;
      }>(
        `UPDATE pd_fulfillment
         SET status = 'shipped',
             carrier = COALESCE($3, carrier),
             tracking_number = COALESCE($4, tracking_number),
             shipped_at = NOW()
         WHERE order_id = $1 AND store_id = $2 AND status = 'pending'
         RETURNING carrier, tracking_number`,
        [opts.order_id, opts.store_id, opts.carrier ?? null, opts.tracking_number ?? null],
      );
      if (!rowCount) {
        throw new PdConflictError(
          PdErrorCode.ORDER_ALREADY_FULFILLED,
          'Fulfillment not found or already shipped',
        );
      }
      shippedCarrier = shippedRows[0]?.carrier ?? null;
      shippedTracking = shippedRows[0]?.tracking_number ?? null;
      // Recompute the order aggregate from all fulfillments (same transaction)
      await this.syncOrderStatusFromFulfillments(c, opts.order_id);
    });
    // Post-commit: notify the buyer that their package is on the way.
    // The guarded UPDATE above guarantees exactly one emission per fulfillment.
    try {
      eventBus.emit(PdEvent.ORDER_FULFILLED, {
        order_id: opts.order_id,
        carrier: shippedCarrier,
        tracking_number: shippedTracking,
      });
    } catch (err) {
      logger.error({ err, ...opts }, 'ORDER_FULFILLED emission failed');
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

      // Recompute the order aggregate from all fulfillments (same transaction)
      await this.syncOrderStatusFromFulfillments(c, opts.order_id);
      // COD is considered paid only after every store fulfillment is delivered.
      await c.query(
        `UPDATE pd_order SET payment_status='captured',
            updated_at=NOW()
         WHERE id = $1 AND payment_gateway=$2 AND payment_status != 'captured'
           AND status NOT IN ('cancelled','refunded')
           AND EXISTS (SELECT 1 FROM pd_fulfillment WHERE order_id = $1 AND status = 'delivered')
           AND NOT EXISTS (SELECT 1 FROM pd_fulfillment WHERE order_id = $1 AND status IN ('pending','shipped'))`,
        [opts.order_id, PaymentGateway.Cod],
      );
    });
    // COD is considered paid only after every store fulfillment is delivered.
    await adsService.recognizeOrderConversion(opts.order_id);
    const deliveredOrder = await this.getById(opts.order_id);
    if (deliveredOrder && deliveredOrder.payment_gateway === PaymentGateway.Cod && deliveredOrder.payment_status === 'captured') {
      await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
        order_id: opts.order_id,
        gateway: PaymentGateway.Cod,
        amount: parseFloat(deliveredOrder.total),
        currency: 'TND',
        source: 'cod_delivery',
      });
    }
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
        await restoreOrderItemStock(c, it);
      }

      // Recompute the order aggregate from all fulfillments (same transaction)
      await this.syncOrderStatusFromFulfillments(c, opts.order_id, { cancelReason: opts.reason });
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


  /**
   * Process and execute a requested refund in an atomic transaction.
   * Transitions refund status from 'requested' -> 'processed'.
   * 1. Debits merchant wallet via walletService.debitRefund
   * 2. Checks cumulative refunds vs order total to update order/payment status
   * 3. Emits PdEvent.ORDER_REFUNDED and PAYMENT_REFUNDED
   */
  async processStoreRefund(opts: {
    refund_id: string;
    reviewed_by?: string;
    transaction_reference?: string;
  }): Promise<StoreOrderRefundRow> {
    return transaction(async (c) => {
      const { rows: refundRows } = await c.query<StoreOrderRefundRow>(
        'SELECT * FROM pd_store_order_refund WHERE id = $1 FOR UPDATE',
        [opts.refund_id],
      );
      const refund = refundRows[0];
      if (!refund) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Refund request not found');

      if (refund.status === 'processed') {
        return refund;
      }
      if (refund.status === 'rejected') {
        throw new PdValidationError('Cannot process a rejected refund request');
      }

      const refundAmount = roundTnd(parseFloat(String(refund.amount)));

      // 1. Update refund status
      const currentMeta = typeof refund.metadata === 'object' && refund.metadata ? refund.metadata : {};
      const updatedMetadata = {
        ...currentMeta,
        processed_at: new Date().toISOString(),
        processed_by: opts.reviewed_by || 'system',
        transaction_reference: opts.transaction_reference || null,
      };

      const { rows: updatedRefundRows } = await c.query<StoreOrderRefundRow>(
        `UPDATE pd_store_order_refund
         SET status = 'processed',
             metadata = $2::jsonb,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [refund.id, JSON.stringify(updatedMetadata)],
      );

      // 2. Debit vendor wallet
      await walletService.debitRefund({
        store_id: refund.store_id,
        amount: refundAmount,
        order_id: refund.order_id,
        description: `Refund for order ${refund.order_id}`,
        client: c,
      });

      // 3. Check order total vs cumulative processed refunds
      const { rows: totals } = await c.query<{ total: string; refunded: string }>(
        `SELECT o.total::text,
                COALESCE(SUM(r.amount), 0)::text AS refunded
         FROM pd_order o
         LEFT JOIN pd_store_order_refund r ON r.order_id = o.id AND r.status = 'processed'
         WHERE o.id = $1
         GROUP BY o.id`,
        [refund.order_id],
      );

      if (totals[0]) {
        const orderTotal = roundTnd(parseFloat(totals[0].total));
        const totalRefunded = roundTnd(parseFloat(totals[0].refunded));
        if (totalRefunded >= orderTotal) {
          await c.query(
            `UPDATE pd_order
             SET status = 'refunded',
                 payment_status = 'refunded',
                 updated_at = NOW()
             WHERE id = $1`,
            [refund.order_id],
          );
        }
      }

      // 3b. Restock product inventory for store items in this refunded order
      await c.query(
        `UPDATE pd_product p
         SET inventory_quantity = p.inventory_quantity + oi.quantity,
             updated_at = NOW()
         FROM pd_order_item oi
         WHERE oi.order_id = $1 AND oi.store_id = $2 AND oi.product_id = p.id`,
        [refund.order_id, refund.store_id],
      );

      // 4. Emit events
      eventBus.emit(PdEvent.ORDER_REFUNDED, {
        order_id: refund.order_id,
        refund_id: refund.id,
        store_id: refund.store_id,
        amount: refundAmount,
      });
      eventBus.emit(PdEvent.PAYMENT_REFUNDED, {
        order_id: refund.order_id,
        amount: refundAmount,
      });

      logger.info(
        { refund_id: refund.id, order_id: refund.order_id, amount: refundAmount },
        'Refund processed successfully',
      );

      return updatedRefundRows[0];
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
      // Guard on fulfillment reality, not just the order-level status:
      // a shipped/delivered fulfillment may coexist with a stale
      // pending/payment_required order status (e.g. carrier-label path).
      const { rows: startedRows } = await c.query<{ started: string }>(
        `SELECT COUNT(*) FILTER (WHERE status IN ('shipped','delivered'))::text AS started
         FROM pd_fulfillment
         WHERE order_id = $1`,
        [orderId],
      );
      if (Number(startedRows[0]?.started ?? 0) > 0) {
        throw new PdValidationError('Cannot cancel an order with shipped or delivered items', {
          code: PdErrorCode.ORDER_CANNOT_CANCEL,
          status: order.status,
        });
      }
      await c.query(
        `UPDATE pd_order SET status = 'cancelled', cancelled_at = NOW(), cancelled_reason = $2
         WHERE id = $1`,
        [orderId, reason],
      );
      // Cancel any pending fulfillments atomically with the order
      await c.query(
        `UPDATE pd_fulfillment SET status = 'cancelled', updated_at = NOW()
         WHERE order_id = $1 AND status = 'pending'`,
        [orderId],
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
        await restoreOrderItemStock(c, it);
        if (it.product_type === ProductType.Serial && order.payment_status !== PaymentStatus.Captured) {
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
   * Cancel an order created for payment only when no provider session can be
   * captured. The row lock and active-attempt guard make compensation safe
   * against a concurrent webhook or a second payment initialization request.
   */
  async cancelUnstartedPaymentOrder(
    orderId: string,
    reason: string,
    failedAttemptId?: string,
  ): Promise<'cancelled' | 'already_paid' | 'active_attempt' | 'not_found'> {
    const result = await transaction(async (c) => {
      const { rows: orderRows } = await c.query<{
        status: OrderStatus;
        payment_status: PaymentStatus;
        payment_reference: string | null;
      }>(
        `SELECT status, payment_status, payment_reference
         FROM pd_order
         WHERE id = $1
         FOR UPDATE`,
        [orderId],
      );
      const order = orderRows[0];
      if (!order) return 'not_found' as const;
      if (order.payment_status === PaymentStatus.Captured) return 'already_paid' as const;
      if (order.status === OrderStatus.Cancelled) return 'cancelled' as const;

      if (![OrderStatus.PaymentRequired, OrderStatus.Pending].includes(order.status)) {
        return 'active_attempt' as const;
      }

      // A stale order status must not allow compensation to undo a shipment.
      // Fulfillment state is authoritative for whether inventory can still be
      // returned to available stock.
      const { rows: fulfillmentRows } = await c.query<{ started: string }>(
        `SELECT COUNT(*) FILTER (WHERE status IN ('shipped', 'delivered'))::text AS started
         FROM pd_fulfillment
         WHERE order_id = $1`,
        [orderId],
      );
      if (Number(fulfillmentRows[0]?.started || 0) > 0) {
        return 'active_attempt' as const;
      }

      let failedReference: string | null = null;
      if (failedAttemptId) {
        const { rows: failedAttemptRows } = await c.query<{ gateway_reference: string; status: string }>(
          `SELECT gateway_reference, status
           FROM pd_payment_attempt
           WHERE id = $1 AND order_id = $2`,
          [failedAttemptId, orderId],
        );
        if (failedAttemptRows[0]?.status === 'initialization_failed') {
          failedReference = failedAttemptRows[0].gateway_reference;
        }
      }
      if (order.payment_reference && order.payment_reference !== failedReference) {
        return 'active_attempt' as const;
      }

      const { rowCount: activeAttemptCount } = await c.query(
        `SELECT 1
         FROM pd_payment_attempt
         WHERE order_id = $1
           AND status IN ('initializing', 'initialization_unknown', 'initialized', 'captured')
           AND ($2::text IS NULL OR id <> $2)
         LIMIT 1`,
        [orderId, failedAttemptId ?? null],
      );
      if (activeAttemptCount) return 'active_attempt' as const;

      await c.query(
        `UPDATE pd_order
         SET status = 'cancelled', cancelled_at = NOW(), cancelled_reason = $2
         WHERE id = $1 AND payment_status != 'captured' AND status != 'cancelled'`,
        [orderId, reason],
      );
      if (failedReference && order.payment_reference === failedReference) {
        await c.query(
          `UPDATE pd_order SET payment_reference = NULL WHERE id = $1 AND payment_reference = $2`,
          [orderId, failedReference],
        );
      }
      await c.query(
        `UPDATE pd_fulfillment
         SET status = 'cancelled', updated_at = NOW()
         WHERE order_id = $1 AND status = 'pending'`,
        [orderId],
      );

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
        [orderId],
      );
      for (const item of items) {
        await restoreOrderItemStock(c, item);
        if (item.product_type === ProductType.Serial) {
          await c.query(
            `UPDATE pd_license_key
             SET order_id = NULL, assigned_at = NULL
             WHERE product_id = $1 AND order_id = $2 AND is_used = false`,
            [item.product_id, orderId],
          );
        }
      }
      return 'cancelled' as const;
    });

    logger.info({ order_id: orderId, reason, result }, 'Unstarted payment order compensation evaluated');
    return result;
  }

  /**
   * Mark an order as paid (called after payment capture).
   * Triggers the payment-captured event for downstream wallet credit.
   */
  async markPaid(orderId: string, gateway: PaymentGateway, reference: string): Promise<OrderRow> {
    return transaction((client) => this.markPaidInTransaction(client, orderId, gateway, reference));
  }

  async markPaidInTransaction(
    client: Pick<PoolClient, 'query'>,
    orderId: string,
    gateway: PaymentGateway,
    reference: string,
  ): Promise<OrderRow> {
    const { rows } = await client.query<OrderRow>(
      `UPDATE pd_order
       SET payment_status = 'captured',
           payment_gateway = $2,
           payment_reference = $3,
           status = CASE
             WHEN status IN ('cancelled', 'refunded') THEN status
             WHEN NOT EXISTS (
               SELECT 1 FROM pd_fulfillment
               WHERE order_id = $1 AND status = 'pending'
             ) AND EXISTS (
               SELECT 1 FROM pd_fulfillment
               WHERE order_id = $1 AND status = 'delivered'
             ) THEN 'delivered'
             WHEN NOT EXISTS (
               SELECT 1 FROM pd_fulfillment
               WHERE order_id = $1 AND status = 'pending'
             ) AND EXISTS (
               SELECT 1 FROM pd_fulfillment
               WHERE order_id = $1 AND status = 'shipped'
             ) THEN 'fulfilled'
             WHEN NOT EXISTS (
               SELECT 1 FROM pd_fulfillment
               WHERE order_id = $1
             ) THEN 'fulfilled'
             WHEN status = 'payment_required' THEN 'pending'
             ELSE status
           END
       WHERE id = $1 AND payment_status != 'captured' AND status NOT IN ('cancelled', 'refunded')
       RETURNING *`,
      [orderId, gateway, reference],
    );
    if (rows[0]) {
      if (rows[0].customer_id) {
        buyerInterestService.syncBuyerProfile(rows[0].customer_id).catch(() => {});
      }
      return rows[0];
    }

    const { rows: currentRows } = await client.query<OrderRow>(
      'SELECT * FROM pd_order WHERE id = $1 FOR UPDATE',
      [orderId],
    );
    const current = currentRows[0];
    if (
      current
      && current.payment_status === PaymentStatus.Captured
      && current.payment_gateway === gateway
      && current.payment_reference === reference
    ) {
      return current;
    }
    throw new PdConflictError(
      PdErrorCode.PAY_ALREADY_CAPTURED,
      current ? 'Order cannot accept this payment capture' : 'Order not found',
      current
        ? { order_id: orderId, status: current.status, payment_status: current.payment_status }
        : { order_id: orderId },
    );
  }

  // -----------------------------------------------------------------------
  // COD RISK SCORING & PRE-VALIDATION ENGINE
  // -----------------------------------------------------------------------
  calculateCodRisk(params: {
    phone?: string | null;
    address?: IAddress | null;
    total: number;
    customerOrderCount?: number;
    customerLifetimeValue?: number;
    paymentGateway?: string;
  }): { riskScore: number; riskLevel: 'low' | 'medium' | 'high'; factors: Array<{ name: string; impact: 'positive' | 'negative' | 'neutral'; description: string }> } {
    let trustPoints = 50;
    const factors: Array<{ name: string; impact: 'positive' | 'negative' | 'neutral'; description: string }> = [];

    // 1. Phone number validation (Tunisian mobile formats 2x, 4x, 5x, 7x, 9x)
    const rawPhone = (params.phone || params.address?.phone || '').replace(/\s+/g, '');
    const tnPhoneRegex = /^(?:(\+216|00216)?)?(2|3|4|5|7|9)\d{7}$/;
    if (!rawPhone) {
      trustPoints -= 35;
      factors.push({ name: 'Numéro de téléphone absent', impact: 'negative', description: 'Aucun numéro de téléphone fourni pour la livraison' });
    } else if (tnPhoneRegex.test(rawPhone)) {
      trustPoints += 25;
      factors.push({ name: 'Numéro Tunisien Valide', impact: 'positive', description: `Format mobile valide (${rawPhone})` });
    } else if (/^\d{8}$/.test(rawPhone)) {
      trustPoints += 15;
      factors.push({ name: 'Numéro 8 chiffres', impact: 'positive', description: 'Format standard 8 chiffres' });
    } else {
      trustPoints -= 25;
      factors.push({ name: 'Numéro Suspect / Invalide', impact: 'negative', description: 'Le format du numéro ne correspond pas aux préfixes tunisiens' });
    }

    // 2. Address completeness
    const addr = params.address;
    const line1 = addr?.address_line_1 || '';
    const city = addr?.city || '';
    const postalCode = addr?.postal_code || '';

    if (line1.length >= 10 && city.length >= 2) {
      trustPoints += 20;
      factors.push({ name: 'Adresse Détaillée', impact: 'positive', description: 'Rue et ville complètes' });
    } else if (line1.length > 0) {
      trustPoints += 5;
      factors.push({ name: 'Adresse Partielle', impact: 'neutral', description: 'Adresse courte ou peu détaillée' });
    } else {
      trustPoints -= 20;
      factors.push({ name: 'Adresse Manquante', impact: 'negative', description: 'Adresse postale non renseignée' });
    }

    if (postalCode && /^\d{4}$/.test(postalCode.trim())) {
      trustPoints += 10;
      factors.push({ name: 'Code Postal Conforme', impact: 'positive', description: `Code postal 4 chiffres (${postalCode})` });
    }

    // 3. Buyer order history & reliability
    const orderCount = params.customerOrderCount || 0;
    if (orderCount >= 3) {
      trustPoints += 30;
      factors.push({ name: 'Client Fidèle & Régulier', impact: 'positive', description: `${orderCount} commandes passées avec succès` });
    } else if (orderCount === 1 || orderCount === 2) {
      trustPoints += 15;
      factors.push({ name: 'Client Récurrent', impact: 'positive', description: 'Historique d\'achat positif' });
    } else {
      factors.push({ name: 'Nouveau Client', impact: 'neutral', description: 'Première commande sur la boutique' });
    }

    // 4. Order value threshold for COD
    if (params.total > 300) {
      trustPoints -= 20;
      factors.push({ name: 'Panier COD Élevé', impact: 'negative', description: `Montant supérieur à 300 TND (${params.total.toFixed(3)} TND)` });
    } else if (params.total > 150) {
      trustPoints -= 10;
      factors.push({ name: 'Panier COD Moyen-Haut', impact: 'neutral', description: `Montant entre 150 et 300 TND (${params.total.toFixed(3)} TND)` });
    } else {
      trustPoints += 10;
      factors.push({ name: 'Panier COD Standard', impact: 'positive', description: 'Montant dans la moyenne standard' });
    }

    // Clamp score
    const riskScore = Math.max(0, Math.min(100, 100 - trustPoints));
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskScore > 60) riskLevel = 'high';
    else if (riskScore > 25) riskLevel = 'medium';

    return { riskScore, riskLevel, factors };
  }

  async getOrCreateCodVerification(orderId: string, storeId: string): Promise<CodVerificationRow> {
    const { rows } = await query<CodVerificationRow>(
      `SELECT * FROM pd_cod_verification WHERE order_id = $1 AND store_id = $2`,
      [orderId, storeId],
    );
    if (rows[0]) return rows[0];

    // Compute automatic risk score from order data
    const orderDetail = await this.getStoreOrderDetail(orderId, storeId);
    const riskAnalysis = this.calculateCodRisk({
      phone: orderDetail.customer_phone,
      address: orderDetail.shipping_address,
      total: parseFloat(orderDetail.store_total) || 0,
      customerOrderCount: parseInt(orderDetail.customer_order_count || '0', 10),
      customerLifetimeValue: parseFloat(orderDetail.customer_lifetime_value || '0'),
      paymentGateway: orderDetail.payment_gateway,
    });

    const newId = pdId('codv');
    const { rows: created } = await query<CodVerificationRow>(
      `INSERT INTO pd_cod_verification
        (id, order_id, store_id, status, risk_score, risk_factors, created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', $4, $5, NOW(), NOW())
       RETURNING *`,
      [newId, orderId, storeId, riskAnalysis.riskScore, JSON.stringify(riskAnalysis.factors)],
    );
    return created[0];
  }

  async updateCodVerification(params: {
    orderId: string;
    storeId: string;
    status: 'pending' | 'confirmed' | 'rejected' | 'unreachable' | 'otp_verified';
    callAttemptsDelta?: number;
    notes?: string;
    verifiedBy?: string;
  }): Promise<CodVerificationRow> {
    const existing = await this.getOrCreateCodVerification(params.orderId, params.storeId);
    const callAttempts = existing.call_attempts + (params.callAttemptsDelta || 0);

    const { rows } = await query<CodVerificationRow>(
      `UPDATE pd_cod_verification
       SET status = $3,
           call_attempts = $4,
           last_call_at = CASE WHEN $5::boolean THEN NOW() ELSE last_call_at END,
           notes = COALESCE($6, notes),
           verified_by = COALESCE($7, verified_by),
           updated_at = NOW()
       WHERE order_id = $1 AND store_id = $2
       RETURNING *`,
      [
        params.orderId,
        params.storeId,
        params.status,
        callAttempts,
        Boolean(params.callAttemptsDelta && params.callAttemptsDelta > 0),
        params.notes ?? null,
        params.verifiedBy ?? null,
      ],
    );
    return rows[0];
  }

  async sendCodOtp(orderId: string, storeId: string): Promise<{ success: boolean; message: string }> {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await this.getOrCreateCodVerification(orderId, storeId);

    await query(
      `UPDATE pd_cod_verification
       SET otp_code = $3,
           otp_sent_at = NOW(),
           updated_at = NOW()
       WHERE order_id = $1 AND store_id = $2`,
      [orderId, storeId, otpCode],
    );

    logger.info({ order_id: orderId, otp_code: otpCode }, 'Generated COD verification OTP');
    return { success: true, message: `Code OTP de vérification généré : ${otpCode}` };
  }

  async verifyCodOtp(orderId: string, storeId: string, code: string): Promise<CodVerificationRow> {
    const { rows } = await query<CodVerificationRow>(
      `SELECT * FROM pd_cod_verification WHERE order_id = $1 AND store_id = $2`,
      [orderId, storeId],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.ORDER_NOT_FOUND, 'Vérification COD introuvable');

    if (rows[0].otp_code !== code.trim()) {
      throw new PdValidationError('Code OTP invalide');
    }

    const { rows: updated } = await query<CodVerificationRow>(
      `UPDATE pd_cod_verification
       SET status = 'otp_verified',
           otp_verified_at = NOW(),
           risk_score = 0,
           updated_at = NOW()
       WHERE order_id = $1 AND store_id = $2
       RETURNING *`,
      [orderId, storeId],
    );
    return updated[0];
  }

  // -----------------------------------------------------------------------
  // RTO (RETURN TO ORIGIN) MANAGEMENT & REASON CODES
  // -----------------------------------------------------------------------
  async markStoreFulfillmentRto(params: {
    orderId: string;
    storeId: string;
    reasonCode: 'client_refused' | 'unreachable' | 'wrong_address' | 'fake_order' | 'delayed_delivery' | 'damaged_in_transit' | 'customer_cancelled';
    notes?: string;
  }): Promise<void> {
    await transaction(async (c) => {
      // 1. Update fulfillment status (guarded: RTO only valid on a shipped fulfillment)
      const { rowCount } = await c.query(
        `UPDATE pd_fulfillment
         SET status = 'cancelled',
             rto_reason_code = $3,
             rto_notes = $4,
             rto_at = NOW(),
             updated_at = NOW()
         WHERE order_id = $1 AND store_id = $2 AND status = 'shipped'`,
        [params.orderId, params.storeId, params.reasonCode, params.notes || null],
      );
      if (!rowCount) {
        throw new PdConflictError(
          PdErrorCode.ORDER_ALREADY_FULFILLED,
          'Fulfillment not found, not shipped, or already returned',
        );
      }

      // 2. Update shipment if exists
      await c.query(
        `UPDATE pd_shipment
         SET status = 'returned',
             updated_at = NOW()
         WHERE order_id = $1 AND store_id = $2`,
        [params.orderId, params.storeId],
      );

      // 3. Mark COD verification: rejected only for customer-fault reasons,
      //    neutral for carrier-side issues
      const customerFaultReasons = ['client_refused', 'unreachable', 'wrong_address', 'fake_order', 'customer_cancelled'];
      const verificationStatus = customerFaultReasons.includes(params.reasonCode) ? 'rejected' : 'unreachable';
      await c.query(
        `INSERT INTO pd_cod_verification (id, order_id, store_id, status, notes, updated_at)
         VALUES ($1, $2, $3, $5, $4, NOW())
         ON CONFLICT (order_id, store_id) DO UPDATE
         SET status = $5,
             notes = COALESCE($4, pd_cod_verification.notes),
             updated_at = NOW()`,
        [pdId('codv'), params.orderId, params.storeId, `RTO: ${params.reasonCode} - ${params.notes || ''}`, verificationStatus],
      );

      // 4. Restock inventory (variant/bundle aware)
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
        [params.orderId, params.storeId],
      );
      for (const item of items) {
        await restoreOrderItemStock(c, item);
        // Free serial license keys reserved by this order for returned items
        if (item.product_type === ProductType.Serial) {
          await c.query(
            `UPDATE pd_license_key
             SET order_id = NULL, assigned_at = NULL, is_used = false
             WHERE product_id = $1 AND order_id = $2 AND is_used = false`,
            [item.product_id, params.orderId],
          );
        }
      }

      // 5. Flag the courier settlement for reconciliation
      await c.query(
        `UPDATE pd_courier_settlement
         SET status = 'disputed', updated_at = NOW()
         WHERE order_id = $1 AND store_id = $2`,
        [params.orderId, params.storeId],
      );

      // 6. Recompute the order aggregate from all fulfillments
      await this.syncOrderStatusFromFulfillments(c, params.orderId, {
        cancelReason: `RTO: ${params.reasonCode}`,
      });
    });

    logger.info({ order_id: params.orderId, store_id: params.storeId, reason: params.reasonCode }, 'Marked fulfillment as RTO and restocked');
  }

  // -----------------------------------------------------------------------
  // COURIER SETTLEMENT LEDGER
  // -----------------------------------------------------------------------
  async listCourierSettlements(
    storeId: string,
    opts: { page?: number; limit?: number; carrier?: string; status?: string } = {},
  ): Promise<{
    settlements: CourierSettlementRow[];
    summary: {
      total_collected: number;
      total_courier_fees: number;
      total_net_payout: number;
      pending_payout: number;
      settled_payout: number;
      settled_count: number;
      pending_count: number;
    };
    total: number;
  }> {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, opts.limit || 50);
    const offset = (page - 1) * limit;

    const params: unknown[] = [storeId];
    let where = 'WHERE cs.store_id = $1';

    if (opts.carrier && opts.carrier !== 'all') {
      params.push(opts.carrier);
      where += ` AND cs.carrier = $${params.length}`;
    }
    if (opts.status && opts.status !== 'all') {
      params.push(opts.status);
      where += ` AND cs.status = $${params.length}`;
    }

    const { rows: settlements } = await query<CourierSettlementRow>(
      `SELECT cs.*,
              COALESCE(u.first_name || ' ' || u.last_name, sc.first_name || ' ' || sc.last_name, 'Client') AS customer_name,
              COALESCE(u.phone, sc.phone, o.shipping_address->>'phone', '') AS customer_phone,
              f.delivered_at AS delivery_date
       FROM pd_courier_settlement cs
       JOIN pd_order o ON o.id = cs.order_id
       LEFT JOIN pd_user u ON u.id = o.customer_id
       LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
       LEFT JOIN pd_fulfillment f ON f.order_id = cs.order_id AND f.store_id = cs.store_id
       ${where}
       ORDER BY cs.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_courier_settlement cs ${where}`,
      params,
    );

    const { rows: summaryRows } = await query<{
      total_collected: string;
      total_courier_fees: string;
      total_net_payout: string;
      pending_payout: string;
      settled_payout: string;
      settled_count: string;
      pending_count: string;
    }>(
      `SELECT
         COALESCE(SUM(collected_amount), 0)::text AS total_collected,
         COALESCE(SUM(courier_fee), 0)::text AS total_courier_fees,
         COALESCE(SUM(net_payout), 0)::text AS total_net_payout,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN net_payout ELSE 0 END), 0)::text AS pending_payout,
         COALESCE(SUM(CASE WHEN status = 'settled' THEN net_payout ELSE 0 END), 0)::text AS settled_payout,
         COUNT(CASE WHEN status = 'settled' THEN 1 END)::text AS settled_count,
         COUNT(CASE WHEN status = 'pending' THEN 1 END)::text AS pending_count
       FROM pd_courier_settlement
       WHERE store_id = $1`,
      [storeId],
    );

    const sum = summaryRows[0] || {
      total_collected: '0',
      total_courier_fees: '0',
      total_net_payout: '0',
      pending_payout: '0',
      settled_payout: '0',
      settled_count: '0',
      pending_count: '0',
    };

    return {
      settlements,
      total: parseInt(countRows[0]?.count || '0', 10),
      summary: {
        total_collected: parseFloat(sum.total_collected) || 0,
        total_courier_fees: parseFloat(sum.total_courier_fees) || 0,
        total_net_payout: parseFloat(sum.total_net_payout) || 0,
        pending_payout: parseFloat(sum.pending_payout) || 0,
        settled_payout: parseFloat(sum.settled_payout) || 0,
        settled_count: parseInt(sum.settled_count, 10) || 0,
        pending_count: parseInt(sum.pending_count, 10) || 0,
      },
    };
  }

  async upsertCourierSettlement(params: {
    orderId: string;
    storeId: string;
    carrier: string;
    trackingNumber?: string;
    collectedAmount: number;
    courierFee: number;
    status?: 'pending' | 'settled' | 'disputed';
    settlementReference?: string;
    notes?: string;
  }): Promise<CourierSettlementRow> {
    const netPayout = Math.max(0, params.collectedAmount - params.courierFee);
    const id = pdId('cstl');

    const { rows } = await query<CourierSettlementRow>(
      `INSERT INTO pd_courier_settlement
        (id, store_id, order_id, carrier, tracking_number, collected_amount, courier_fee, net_payout, status, settled_at, settlement_reference, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'pending'), CASE WHEN $9 = 'settled' THEN NOW() ELSE NULL END, $10, $11, NOW(), NOW())
       ON CONFLICT (order_id, store_id) DO UPDATE
       SET carrier = EXCLUDED.carrier,
           tracking_number = COALESCE(EXCLUDED.tracking_number, pd_courier_settlement.tracking_number),
           collected_amount = EXCLUDED.collected_amount,
           courier_fee = EXCLUDED.courier_fee,
           net_payout = EXCLUDED.net_payout,
           status = COALESCE($9, pd_courier_settlement.status),
           settled_at = CASE WHEN $9 = 'settled' THEN NOW() ELSE pd_courier_settlement.settled_at END,
           settlement_reference = COALESCE(EXCLUDED.settlement_reference, pd_courier_settlement.settlement_reference),
           notes = COALESCE(EXCLUDED.notes, pd_courier_settlement.notes),
           updated_at = NOW()
       RETURNING *`,
      [
        id,
        params.storeId,
        params.orderId,
        params.carrier,
        params.trackingNumber || null,
        params.collectedAmount,
        params.courierFee,
        netPayout,
        params.status || 'pending',
        params.settlementReference || null,
        params.notes || null,
      ],
    );
    return rows[0];
  }

}

export const orderService = new OrderService();
