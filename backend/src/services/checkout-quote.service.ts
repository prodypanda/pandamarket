import { couponService } from './coupon.service';
/**
 * Server-authoritative checkout quotes.
 *
 * A quote is a short-lived, database-backed snapshot of the catalog lines,
 * promotion decision, shipping decision, tax decision, and total that the
 * server is willing to honour. The browser may display it, but it can never
 * choose any of the monetary values persisted to an order.
 */

import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { transaction } from '../db/pool';
import { pdId, sha256 } from '../utils/crypto';
import { PdConflictError, PdErrorCode, PdForbiddenError, PdNotFoundError, PdValidationError } from '../errors';
import {
  IAddress,
  ProductStatus,
  ProductType,
  SellerType,
  StoreStatus,
} from '@pandamarket/types';
import { roundTnd } from '../utils/money';
import { platformConfigService, type PlatformSettings } from './platform-config.service';

export const CURRENT_CHECKOUT_QUOTE_VERSION = 1;
export const SUPPORTED_CHECKOUT_QUOTE_VERSIONS = [CURRENT_CHECKOUT_QUOTE_VERSION] as const;

// Quote v1 deliberately uses SHA-256 as a deterministic commerce-snapshot
// digest, not as authentication against a privileged database writer. Direct
// database mutation is outside the checkout trust boundary and is controlled
// through database access, audit, and backup policy. If that threat model
// changes, introduce a new quote version with a key ID and HMAC rotation plan;
// retrofitting keyed hashing onto v1 would invalidate outstanding quotes.

const QUOTE_TTL_MS = 15 * 60 * 1000;
const FALLBACK_SHIPPING_RATE = 7;
const COMBINED_SHIPPING_REBATE = 3;

type SqlExecutor = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
};

export interface QuoteItemInput {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
}

export interface QuoteLine {
  product_id: string;
  variant_id: string | null;
  store_id: string;
  title: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  product_type: ProductType;
  discount_amount?: number;
  discount_breakdown?: Record<string, unknown>;
}

export interface QuoteTotals {
  subtotal: number;
  discount_total: number;
  product_discount_total: number;
  shipping_discount_total: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  currency: string;
  shipping_by_store: Record<string, number>;
  lines: QuoteLine[];
  breakdown: Record<string, unknown>;
  snapshot: Record<string, unknown>;
}

export interface CheckoutQuote {
  id: string;
  quote_version: number;
  owner_user_id: string | null;
  owner_storefront_customer_id: string | null;
  store_id: string | null;
  items: QuoteLine[];
  shipping_address: IAddress | null;
  coupon_code: string | null;
  currency: string;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  breakdown: Record<string, unknown>;
  snapshot_hash: string;
  issued_at: string;
  expires_at: string;
  consumed_at: string | null;
  consumed_order_id: string | null;
}

interface QuoteRow {
  id: string;
  quote_version: number;
  owner_user_id: string | null;
  owner_storefront_customer_id: string | null;
  store_id: string | null;
  items: QuoteLine[];
  shipping_address: IAddress | null;
  coupon_code: string | null;
  currency: string;
  subtotal: string | number;
  discount_total: string | number;
  shipping_total: string | number;
  tax_total: string | number;
  total: string | number;
  breakdown: Record<string, unknown>;
  snapshot_hash: string;
  created_at: Date | string;
  expires_at: Date | string;
  consumed_at: Date | string | null;
  consumed_order_id: string | null;
}

function asNumber(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function normalizeCity(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function settingNumber(settings: PlatformSettings, key: keyof PlatformSettings, fallback: number): number {
  const value = Number(settings[key]);
  return Number.isFinite(value) ? value : fallback;
}

function settingString(settings: PlatformSettings, key: keyof PlatformSettings, fallback: string): string {
  const value = settings[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function configuredRate(settings: PlatformSettings, city?: string | null): number {
  const normalized = normalizeCity(city);
  const remoteCities = settingString(settings, 'shipping_remote_zone_cities', '')
    .split(',')
    .map(normalizeCity)
    .filter(Boolean);
  const domesticCities = settingString(settings, 'shipping_domestic_zone_cities', '')
    .split(',')
    .map(normalizeCity)
    .filter(Boolean);
  if (normalized && remoteCities.includes(normalized)) {
    return settingNumber(settings, 'shipping_remote_zone_rate_tnd', 12);
  }
  if (normalized && domesticCities.includes(normalized)) {
    return settingNumber(settings, 'shipping_domestic_zone_rate_tnd', FALLBACK_SHIPPING_RATE);
  }
  return settingNumber(settings, 'shipping_platform_flat_rate_tnd', FALLBACK_SHIPPING_RATE);
}

function usesInventory(type: ProductType): boolean {
  return type === ProductType.Physical;
}

function isWholesaleCapable(sellerType: SellerType | null): boolean {
  return sellerType === SellerType.Wholesaler || sellerType === SellerType.Hybrid;
}

function wholesalePrice(
  basePrice: number,
  quantity: number,
  sellerType: SellerType | null,
  metadata: Record<string, unknown> | null,
): number {
  if (!isWholesaleCapable(sellerType)) return basePrice;
  const wholesale = metadata?.wholesale_pricing as {
    enabled?: unknown;
    min_quantity?: unknown;
    price_tiers?: unknown;
  } | undefined;
  if (!wholesale?.enabled || !Array.isArray(wholesale.price_tiers)) return basePrice;

  const minQuantity = Number(wholesale.min_quantity);
  if (sellerType === SellerType.Wholesaler && Number.isInteger(minQuantity) && minQuantity > 1 && quantity < minQuantity) {
    throw new PdValidationError(`Minimum quantity for this wholesale product is ${minQuantity}`);
  }

  const tiers = wholesale.price_tiers
    .map((raw) => {
      const tier = raw as { min_quantity?: unknown; unit_price?: unknown };
      return { min_quantity: Number(tier.min_quantity), unit_price: Number(tier.unit_price) };
    })
    .filter((tier) => Number.isInteger(tier.min_quantity) && tier.min_quantity > 0 && Number.isFinite(tier.unit_price) && tier.unit_price >= 0)
    .sort((a, b) => a.min_quantity - b.min_quantity);
  return tiers.filter((tier) => quantity >= tier.min_quantity).at(-1)?.unit_price ?? basePrice;
}

function canonicalAddress(address: IAddress | null | undefined): string {
  if (!address) return 'null';
  return JSON.stringify({
    first_name: address.first_name.trim(),
    last_name: address.last_name.trim(),
    phone: address.phone.trim(),
    address_line_1: address.address_line_1.trim(),
    address_line_2: address.address_line_2?.trim() || undefined,
    city: address.city.trim(),
    postal_code: address.postal_code.trim(),
    country: address.country.trim().toUpperCase(),
  });
}

function canonicalItems(items: Array<{ product_id: string; variant_id?: string | null; quantity: number }>): string {
  return JSON.stringify(
    items
      .map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: Number(item.quantity),
      }))
      .sort((a, b) => `${a.product_id}:${a.variant_id || ''}`.localeCompare(`${b.product_id}:${b.variant_id || ''}`)),
  );
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
}

function quoteHashPayload(input: {
  quote_version: number;
  owner_user_id: string | null;
  owner_storefront_customer_id: string | null;
  store_id: string | null;
  items: QuoteLine[];
  shipping_address: IAddress | null;
  coupon_code: string | null;
  currency: string;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  breakdown: Record<string, unknown>;
}): string {
  return stableJson({
    quote_version: input.quote_version,
    owner_user_id: input.owner_user_id,
    owner_storefront_customer_id: input.owner_storefront_customer_id,
    store_id: input.store_id,
    items: input.items,
    shipping_address: input.shipping_address,
    coupon_code: input.coupon_code,
    currency: input.currency,
    subtotal: input.subtotal,
    discount_total: input.discount_total,
    shipping_total: input.shipping_total,
    tax_total: input.tax_total,
    total: input.total,
    breakdown: input.breakdown,
  });
}

function distributeDiscount(
  lines: QuoteLine[],
  amount: number,
  eligibleStoreId: string | null,
  details: Record<string, unknown>,
): QuoteLine[] {
  const eligibleIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => !eligibleStoreId || line.store_id === eligibleStoreId)
    .map(({ index }) => index);
  if (amount <= 0 || eligibleIndexes.length === 0) {
    return lines.map((line) => ({ ...line, discount_amount: 0, discount_breakdown: {} }));
  }
  const eligibleIndexSet = new Set(eligibleIndexes);
  const base = eligibleIndexes.reduce((sum, index) => sum + lines[index].subtotal, 0);
  let assigned = 0;
  return lines.map((line, index) => {
    if (!eligibleIndexSet.has(index)) return { ...line, discount_amount: 0, discount_breakdown: {} };
    const discount = index === eligibleIndexes.at(-1)
      ? roundTnd(amount - assigned)
      : roundTnd(base > 0 ? amount * (line.subtotal / base) : 0);
    assigned = roundTnd(assigned + discount);
    return {
      ...line,
      discount_amount: Math.max(0, discount),
      discount_breakdown: discount > 0 ? details : {},
    };
  });
}

function toQuote(row: QuoteRow): CheckoutQuote {
  return {
    id: row.id,
    quote_version: Number(row.quote_version),
    owner_user_id: row.owner_user_id,
    owner_storefront_customer_id: row.owner_storefront_customer_id,
    store_id: row.store_id,
    items: Array.isArray(row.items) ? row.items : [],
    shipping_address: row.shipping_address,
    coupon_code: row.coupon_code,
    currency: row.currency,
    subtotal: asNumber(row.subtotal),
    discount_total: asNumber(row.discount_total),
    shipping_total: asNumber(row.shipping_total),
    tax_total: asNumber(row.tax_total),
    total: asNumber(row.total),
    breakdown: row.breakdown || {},
    snapshot_hash: row.snapshot_hash,
    issued_at: new Date(row.created_at).toISOString(),
    expires_at: new Date(row.expires_at).toISOString(),
    consumed_at: row.consumed_at ? new Date(row.consumed_at).toISOString() : null,
    consumed_order_id: row.consumed_order_id,
  };
}

export class CheckoutQuoteService {
  assertSupportedVersion(quoteVersion: number, quoteId?: string): void {
    if (!SUPPORTED_CHECKOUT_QUOTE_VERSIONS.includes(
      quoteVersion as (typeof SUPPORTED_CHECKOUT_QUOTE_VERSIONS)[number],
    )) {
      throw new PdConflictError(
        PdErrorCode.ORDER_QUOTE_VERSION_UNSUPPORTED,
        'Checkout quote version is not supported',
        {
          ...(quoteId ? { quote_id: quoteId } : {}),
          quote_version: quoteVersion,
          supported_versions: [...SUPPORTED_CHECKOUT_QUOTE_VERSIONS],
        },
      );
    }
  }

  async resolveLines(executor: SqlExecutor, items: QuoteItemInput[], storeId?: string | null): Promise<QuoteLine[]> {
    if (!items.length) throw new PdValidationError('Cart is empty', { code: PdErrorCode.ORDER_EMPTY_CART });
    const lines: QuoteLine[] = [];

    for (const input of items) {
      const quantity = Number(input.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) throw new PdValidationError('Quantity must be a positive integer');

      const { rows: products } = await executor.query<{
        id: string;
        store_id: string;
        title: string;
        price: string | number;
        inventory_quantity: number;
        status: ProductStatus;
        type: ProductType;
        metadata: Record<string, unknown> | null;
        seller_type: SellerType | null;
        store_status: StoreStatus | null;
        store_is_verified: boolean | null;
      }>(
        `SELECT p.id, p.store_id, p.title, p.price, p.inventory_quantity, p.status, p.type, p.metadata,
                s.seller_type, s.status AS store_status, s.is_verified AS store_is_verified
         FROM pd_product p
         JOIN pd_store s ON s.id = p.store_id
         WHERE p.id = $1`,
        [input.product_id],
      );
      const product = products[0];
      if (!product) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found', { product_id: input.product_id });
      if (product.status !== ProductStatus.Published || product.store_status !== StoreStatus.Verified || product.store_is_verified !== true) {
        throw new PdValidationError('Product is not available', { product_id: input.product_id });
      }
      if (storeId && product.store_id !== storeId) {
        throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Product does not belong to this storefront', { product_id: input.product_id, store_id: storeId });
      }

      if (product.type === ProductType.Bundle) {
        const { rows: components } = await executor.query<{ quantity: number; comp_stock: number; var_stock: number | null; comp_title: string }>(
          `SELECT bi.quantity, bp.inventory_quantity AS comp_stock, bpv.inventory_quantity AS var_stock, bp.title AS comp_title
           FROM pd_product_bundle_item bi
           JOIN pd_product bp ON bp.id = bi.product_id
           LEFT JOIN pd_product_variant bpv ON bpv.id = bi.variant_id
           WHERE bi.bundle_product_id = $1`,
          [product.id],
        );
        if (!components.length) throw new PdValidationError('Pack promo indisponible (aucun composant configuré)', { product_id: product.id });
        for (const component of components) {
          const available = component.var_stock ?? component.comp_stock;
          if (available < component.quantity * quantity) {
            throw new PdValidationError(`Stock insuffisant pour le composant du pack: ${component.comp_title}`, {
              code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
              product_id: product.id,
            });
          }
        }
      } else if (usesInventory(product.type) && product.inventory_quantity < quantity) {
        throw new PdValidationError('Insufficient stock', {
          code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
          product_id: product.id,
          available: product.inventory_quantity,
        });
      } else if (product.type === ProductType.Serial) {
        const { rows: licenses } = await executor.query<{ available: string }>(
          `SELECT COUNT(*)::text AS available
           FROM pd_license_key
           WHERE product_id = $1 AND order_id IS NULL AND is_used = false`,
          [product.id],
        );
        const available = Number.parseInt(licenses[0]?.available || '0', 10);
        if (available < quantity) {
          throw new PdValidationError('Insufficient license keys for serial product', {
            code: PdErrorCode.PRODUCT_OUT_OF_STOCK,
            product_id: product.id,
            available,
          });
        }
      }

      let unitPrice = asNumber(product.price);
      let title = product.title;
      const variantId: string | null = input.variant_id || null;
      if (variantId) {
        const { rows: variants } = await executor.query<{
          id: string;
          title: string;
          price: string | number;
          inventory_quantity: number;
          product_id: string;
        }>('SELECT id, title, price, inventory_quantity, product_id FROM pd_product_variant WHERE id = $1', [variantId]);
        const variant = variants[0];
        if (!variant || variant.product_id !== product.id) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Variant not found');
        if (usesInventory(product.type) && variant.inventory_quantity < quantity) {
          throw new PdValidationError('Insufficient stock for variant', { code: PdErrorCode.PRODUCT_OUT_OF_STOCK });
        }
        unitPrice = asNumber(variant.price);
        title = `${product.title} — ${variant.title}`;
      }
      unitPrice = wholesalePrice(unitPrice, quantity, product.seller_type, product.metadata);
      lines.push({
        product_id: product.id,
        variant_id: variantId,
        store_id: product.store_id,
        title,
        unit_price: roundTnd(unitPrice),
        quantity,
        subtotal: roundTnd(unitPrice * quantity),
        product_type: product.type,
      });
    }
    return lines;
  }

  async calculateTotals(
    executor: SqlExecutor,
    lines: QuoteLine[],
    settings: PlatformSettings,
    shippingAddress: IAddress | null | undefined,
    rawCouponCode?: string | null,
    options: { rejectInvalidCoupon?: boolean } = {},
  ): Promise<QuoteTotals> {
    const subtotal = roundTnd(lines.reduce((sum, line) => sum + line.subtotal, 0));
    const shippableStoreIds = Array.from(new Set(lines.filter((line) => line.product_type === ProductType.Physical).map((line) => line.store_id)));
    const storeIds = Array.from(new Set(lines.map((line) => line.store_id)));
    const shippingRate = settings.shipping_enabled ? configuredRate(settings, shippingAddress?.city) : 0;
    const grossShipping = roundTnd(shippableStoreIds.length * shippingRate);
    const combinedRebate = shippableStoreIds.length >= 2
      ? roundTnd((shippableStoreIds.length - 1) * COMBINED_SHIPPING_REBATE)
      : 0;
    const afterCombined = Math.max(0, roundTnd(grossShipping - combinedRebate));
    const freeShippingThreshold = settingNumber(settings, 'shipping_free_shipping_threshold_tnd', 0);
    const freeShippingDiscount = freeShippingThreshold > 0 && subtotal >= freeShippingThreshold ? afterCombined : 0;
    let shippingTotal = Math.max(0, roundTnd(afterCombined - freeShippingDiscount));

    const couponCode = (rawCouponCode || '').trim().toUpperCase() || null;
    let productDiscount = 0;
    let couponShippingDiscount = 0;
    let couponType: string | null = null;
    let couponScope: string | null = null;
    let couponStoreId: string | null = null;
    let couponRecognized = false;

    const dynCoupon = couponCode
      ? await couponService.validateCoupon(couponCode, {
          subtotal,
          storeIds,
          shippingTotal,
        })
      : null;

    if (dynCoupon && dynCoupon.valid) {
      couponRecognized = true;
      couponType = dynCoupon.discountType;
      couponScope = dynCoupon.freeShipping ? 'shipping' : 'order';
      if (dynCoupon.freeShipping) {
        couponShippingDiscount = shippingTotal;
        shippingTotal = 0;
      } else {
        productDiscount = roundTnd(dynCoupon.discountAmount);
      }
    } else if (couponCode === 'CHANCE5DT') {
      couponRecognized = true;
      productDiscount = Math.min(subtotal, 5);
      couponType = 'fixed';
      couponScope = 'order';
    } else if (couponCode === 'LIVRAISON_ZERO') {
      couponRecognized = shippingTotal > 0;
      couponShippingDiscount = shippingTotal;
      shippingTotal = 0;
      couponType = 'free_shipping';
      couponScope = 'shipping';
    } else if (couponCode === 'PANDA10') {
      couponRecognized = true;
      productDiscount = roundTnd(subtotal * 0.1);
      couponType = 'percentage';
      couponScope = 'order';
    } else if (couponCode === 'SUPER15') {
      couponRecognized = subtotal >= 80;
      if (couponRecognized) productDiscount = Math.min(subtotal, 15);
      couponType = 'fixed';
      couponScope = 'order';
    } else if (couponCode === 'FIDELITE5') {
      couponRecognized = true;
      productDiscount = roundTnd(subtotal * 0.05);
      couponType = 'percentage';
      couponScope = 'order';
    } else if (couponCode && storeIds.length > 0) {
      const { rows: broadcasts } = await executor.query<{
        store_id: string;
        discount_type: 'percentage' | 'fixed';
        discount_value: string | number;
      }>(
        `SELECT store_id, discount_type, discount_value
         FROM pd_seller_broadcast
         WHERE UPPER(coupon_code) = $1
           AND store_id = ANY($2::text[])
           AND sent_at >= NOW() - INTERVAL '30 days'
         ORDER BY sent_at DESC
         LIMIT 1`,
        [couponCode, storeIds],
      );
      const broadcast = broadcasts[0];
      if (broadcast) {
        couponRecognized = true;
        couponStoreId = broadcast.store_id;
        const storeSubtotal = lines
          .filter((line) => line.store_id === broadcast.store_id)
          .reduce((sum, line) => sum + line.subtotal, 0);
        const value = Math.max(0, asNumber(broadcast.discount_value));
        productDiscount = broadcast.discount_type === 'percentage'
          ? roundTnd(storeSubtotal * (value / 100))
          : Math.min(storeSubtotal, value);
        couponType = broadcast.discount_type;
        couponScope = `store:${broadcast.store_id}`;
      }
    }

    if (couponCode && options.rejectInvalidCoupon && !couponRecognized) {
      throw new PdValidationError(
        couponCode === 'SUPER15'
          ? 'This coupon requires a minimum merchandise subtotal of 80 TND'
          : 'Coupon is invalid or not eligible for this cart',
        { coupon_code: couponCode },
      );
    }

    productDiscount = Math.min(subtotal, Math.max(0, roundTnd(productDiscount)));
    couponShippingDiscount = Math.min(afterCombined, Math.max(0, roundTnd(couponShippingDiscount)));
    const discountedLines = distributeDiscount(lines, productDiscount, couponStoreId, {
      source: 'coupon',
      code: couponCode,
      type: couponType,
      scope: couponScope,
    });
    const taxMode = String(settings.tax_mode || 'none');
    const taxRate = Math.max(0, settingNumber(settings, 'default_tax_rate', 0));
    const taxableSubtotal = roundTnd(Math.max(0, subtotal - productDiscount));
    const taxTotal = taxMode === 'exclusive'
      ? roundTnd(taxableSubtotal * (taxRate / 100))
      : taxMode === 'included' && taxRate > 0
        ? roundTnd(taxableSubtotal - taxableSubtotal / (1 + taxRate / 100))
        : 0;
    const discountTotal = roundTnd(productDiscount + combinedRebate + freeShippingDiscount + couponShippingDiscount);
    const total = roundTnd(Math.max(0, subtotal - productDiscount) + shippingTotal + (taxMode === 'exclusive' ? taxTotal : 0));

    const shippingByStore: Record<string, number> = {};
    if (shippableStoreIds.length > 0 && shippingTotal > 0) {
      const perStore = shippingTotal / shippableStoreIds.length;
      let assigned = 0;
      for (const [index, storeId] of shippableStoreIds.entries()) {
        const amount = index === shippableStoreIds.length - 1 ? roundTnd(shippingTotal - assigned) : roundTnd(perStore);
        shippingByStore[storeId] = amount;
        assigned = roundTnd(assigned + amount);
      }
    }

    const breakdown: Record<string, unknown> = {
      items: discountedLines.map((line) => ({
        product_id: line.product_id,
        variant_id: line.variant_id,
        store_id: line.store_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        subtotal: line.subtotal,
        discount_amount: line.discount_amount || 0,
      })),
      coupon: couponCode
        ? { code: couponCode, type: couponType, scope: couponScope, product_discount: productDiscount, shipping_discount: couponShippingDiscount }
        : null,
      shipping: {
        gross: grossShipping,
        combined_store_rebate: combinedRebate,
        free_shipping_discount: freeShippingDiscount,
        coupon_discount: couponShippingDiscount,
        total: shippingTotal,
        by_store: shippingByStore,
      },
      tax: { mode: taxMode, rate: taxRate, total: taxTotal },
    };
    const snapshot: Record<string, unknown> = {
      items: discountedLines.map((line) => ({
        product_id: line.product_id,
        variant_id: line.variant_id,
        store_id: line.store_id,
        title: line.title,
        product_type: line.product_type,
        quantity: line.quantity,
        unit_price: line.unit_price,
        subtotal: line.subtotal,
        discount_amount: line.discount_amount || 0,
      })),
      subtotal,
      discount_total: discountTotal,
      shipping_total: shippingTotal,
      tax_total: taxTotal,
      total,
      currency: settingString(settings, 'default_currency', 'TND'),
      coupon_code: couponCode,
      shipping_address: shippingAddress || null,
    };

    return {
      subtotal,
      discount_total: discountTotal,
      product_discount_total: productDiscount,
      shipping_discount_total: roundTnd(combinedRebate + freeShippingDiscount + couponShippingDiscount),
      shipping_total: shippingTotal,
      tax_total: taxTotal,
      total,
      currency: String(snapshot.currency),
      shipping_by_store: shippingByStore,
      lines: discountedLines,
      breakdown,
      snapshot,
    };
  }

  async createQuote(opts: {
    owner_user_id?: string | null;
    owner_storefront_customer_id?: string | null;
    store_id?: string | null;
    items: QuoteItemInput[];
    shipping_address?: IAddress | null;
    coupon_code?: string | null;
  }): Promise<CheckoutQuote> {
    if (!opts.owner_user_id && !opts.owner_storefront_customer_id) throw new PdValidationError('Customer is required');
    const settings = await platformConfigService.getSettings();
    return transaction(async (c) => {
      const lines = await this.resolveLines(c, opts.items, opts.store_id);
      if (lines.some((line) => line.product_type === ProductType.Physical) && !opts.shipping_address) {
        throw new PdValidationError('Shipping address is required for physical products');
      }
      const totals = await this.calculateTotals(
        c,
        lines,
        settings,
        opts.shipping_address,
        opts.coupon_code,
        { rejectInvalidCoupon: true },
      );
      const id = pdId('quote');
      const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);
      const ownerUserId = opts.owner_user_id || null;
      const ownerStorefrontCustomerId = opts.owner_storefront_customer_id || null;
      const storeId = opts.store_id || null;
      const couponCode = (opts.coupon_code || '').trim().toUpperCase() || null;
      const snapshotHash = sha256(quoteHashPayload({
        quote_version: CURRENT_CHECKOUT_QUOTE_VERSION,
        owner_user_id: ownerUserId,
        owner_storefront_customer_id: ownerStorefrontCustomerId,
        store_id: storeId,
        items: totals.lines,
        shipping_address: opts.shipping_address || null,
        coupon_code: couponCode,
        currency: totals.currency,
        subtotal: totals.subtotal,
        discount_total: totals.discount_total,
        shipping_total: totals.shipping_total,
        tax_total: totals.tax_total,
        total: totals.total,
        breakdown: totals.breakdown,
      }));
      const { rows: persistedRows } = await c.query<{
        created_at: Date | string;
        expires_at: Date | string;
      }>(
        `INSERT INTO pd_checkout_quote
          (id, quote_version, owner_user_id, owner_storefront_customer_id, store_id, items,
           shipping_address, coupon_code, currency, subtotal, discount_total, shipping_total,
           tax_total, total, breakdown, snapshot_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING created_at, expires_at`,
        [
          id,
          CURRENT_CHECKOUT_QUOTE_VERSION,
          ownerUserId,
          ownerStorefrontCustomerId,
          storeId,
          JSON.stringify(totals.lines),
          opts.shipping_address ? JSON.stringify(opts.shipping_address) : null,
          couponCode,
          totals.currency,
          totals.subtotal,
          totals.discount_total,
          totals.shipping_total,
          totals.tax_total,
          totals.total,
          JSON.stringify(totals.breakdown),
          snapshotHash,
          expiresAt,
        ],
      );
      const persisted = persistedRows[0];
      if (!persisted) {
        throw new PdConflictError(
          PdErrorCode.ORDER_QUOTE_STALE,
          'Checkout quote could not be persisted',
          { quote_id: id },
        );
      }
      return {
        id,
        quote_version: CURRENT_CHECKOUT_QUOTE_VERSION,
        owner_user_id: ownerUserId,
        owner_storefront_customer_id: ownerStorefrontCustomerId,
        store_id: storeId,
        items: totals.lines,
        shipping_address: opts.shipping_address || null,
        coupon_code: couponCode,
        currency: totals.currency,
        subtotal: totals.subtotal,
        discount_total: totals.discount_total,
        shipping_total: totals.shipping_total,
        tax_total: totals.tax_total,
        total: totals.total,
        breakdown: totals.breakdown,
        snapshot_hash: snapshotHash,
        issued_at: new Date(persisted.created_at).toISOString(),
        expires_at: new Date(persisted.expires_at).toISOString(),
        consumed_at: null,
        consumed_order_id: null,
      };
    });
  }

  async lockForCheckout(
    executor: PoolClient,
    quoteId: string,
    ownerUserId?: string | null,
    ownerStorefrontCustomerId?: string | null,
  ): Promise<CheckoutQuote> {
    const { rows } = await executor.query<QuoteRow>(
      `SELECT * FROM pd_checkout_quote
       WHERE id = $1
         AND (($2::text IS NOT NULL AND owner_user_id = $2)
           OR ($3::text IS NOT NULL AND owner_storefront_customer_id = $3))
       FOR UPDATE`,
      [quoteId, ownerUserId || null, ownerStorefrontCustomerId || null],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.ORDER_QUOTE_NOT_FOUND, 'Checkout quote not found');
    const quote = toQuote(rows[0]);
    this.assertSupportedVersion(quote.quote_version, quote.id);
    const expectedHash = sha256(quoteHashPayload({
      quote_version: quote.quote_version,
      owner_user_id: quote.owner_user_id,
      owner_storefront_customer_id: quote.owner_storefront_customer_id,
      store_id: quote.store_id,
      items: quote.items,
      shipping_address: quote.shipping_address,
      coupon_code: quote.coupon_code,
      currency: quote.currency,
      subtotal: quote.subtotal,
      discount_total: quote.discount_total,
      shipping_total: quote.shipping_total,
      tax_total: quote.tax_total,
      total: quote.total,
      breakdown: quote.breakdown,
    }));
    if (expectedHash !== quote.snapshot_hash) {
      throw new PdConflictError(PdErrorCode.ORDER_QUOTE_STALE, 'Checkout quote integrity check failed', { quote_id: quote.id });
    }
    if (quote.consumed_at) {
      throw new PdConflictError(PdErrorCode.ORDER_QUOTE_STALE, 'Checkout quote has already been consumed', {
        quote_id: quote.id,
        order_id: quote.consumed_order_id,
      });
    }
    if (new Date(quote.expires_at).getTime() <= Date.now()) {
      throw new PdConflictError(PdErrorCode.ORDER_QUOTE_EXPIRED, 'Checkout quote has expired', { quote_id: quote.id });
    }
    return quote;
  }

  assertMatches(
    quote: CheckoutQuote,
    opts: {
      owner_user_id?: string | null;
      owner_storefront_customer_id?: string | null;
      store_id?: string | null;
      items: QuoteItemInput[];
      shipping_address?: IAddress | null;
      coupon_code?: string | null;
      totals: QuoteTotals;
    },
  ): void {
    this.assertSupportedVersion(quote.quote_version, quote.id);
    if (quote.owner_user_id !== (opts.owner_user_id || null) || quote.owner_storefront_customer_id !== (opts.owner_storefront_customer_id || null)) {
      throw new PdConflictError(PdErrorCode.ORDER_QUOTE_STALE, 'Checkout quote owner does not match the current session');
    }
    if (quote.store_id !== (opts.store_id || null)) {
      throw new PdConflictError(PdErrorCode.ORDER_QUOTE_STALE, 'Checkout quote storefront does not match the current session');
    }
    if (canonicalItems(quote.items) !== canonicalItems(opts.items)) {
      throw new PdConflictError(PdErrorCode.ORDER_QUOTE_STALE, 'Cart contents changed after the quote was issued', { quote_id: quote.id });
    }
    if (canonicalAddress(quote.shipping_address) !== canonicalAddress(opts.shipping_address)) {
      throw new PdConflictError(PdErrorCode.ORDER_QUOTE_STALE, 'Shipping address changed after the quote was issued', { quote_id: quote.id });
    }
    const expectedCoupon = (quote.coupon_code || '').trim().toUpperCase() || null;
    const actualCoupon = (opts.coupon_code || '').trim().toUpperCase() || null;
    if (expectedCoupon !== actualCoupon) {
      throw new PdConflictError(PdErrorCode.ORDER_QUOTE_STALE, 'Coupon changed after the quote was issued', { quote_id: quote.id });
    }
    const expected = [quote.subtotal, quote.discount_total, quote.shipping_total, quote.tax_total, quote.total];
    const actual = [opts.totals.subtotal, opts.totals.discount_total, opts.totals.shipping_total, opts.totals.tax_total, opts.totals.total];
    if (expected.some((value, index) => Math.abs(value - actual[index]) > 0.001) || quote.currency !== opts.totals.currency) {
      throw new PdConflictError(PdErrorCode.ORDER_QUOTE_STALE, 'Catalog, promotion, shipping, or tax rules changed after the quote was issued', { quote_id: quote.id });
    }
  }

  async consume(executor: PoolClient, quoteId: string, orderId: string): Promise<void> {
    const result = await executor.query(
      `UPDATE pd_checkout_quote
       SET consumed_at = NOW(), consumed_order_id = $2, updated_at = NOW()
       WHERE id = $1 AND consumed_at IS NULL`,
      [quoteId, orderId],
    );
    if ((result.rowCount || 0) !== 1) {
      throw new PdConflictError(PdErrorCode.ORDER_QUOTE_STALE, 'Checkout quote could not be consumed', { quote_id: quoteId });
    }
  }
}

export const checkoutQuoteService = new CheckoutQuoteService();
