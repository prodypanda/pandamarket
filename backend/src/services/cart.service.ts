import { couponService } from './coupon.service';
/**
 * CartService — Server-side Cart Synchronization, Multi-Vendor Combined Shipping & Gamified Retention Leads.
 */

import { randomBytes } from 'node:crypto';
import { query } from '../db/pool';
import { PdValidationError } from '../errors';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { roundTnd } from '../utils/money';
import { platformConfigService } from './platform-config.service';

export interface CartItemData {
  id: string;
  product_id: string;
  variant_id?: string;
  store_id: string;
  store_name: string;
  store_subdomain?: string;
  title: string;
  price: number;
  quantity: number;
  image_url?: string;
  category?: string;
  marketplace_category_slug?: string;
  slug?: string;
  unit_price?: number;
  wholesale_pricing?: {
    min_quantity: number;
    price_tiers: Array<{ min_quantity: number; unit_price: number }>;
  };
}

export interface SyncCartParams {
  user_id?: string | null;
  session_token?: string;
  items: CartItemData[];
  coupon_code?: string;
  customer_email?: string;
  customer_phone?: string;
}

export interface GamifiedLeadParams {
  store_id?: string;
  phone?: string;
  email?: string;
  game_type: 'spin_wheel' | 'scratch_card';
  device_fingerprint?: string;
}

export interface GamifiedPrizeDefinition {
  prize_won: string;
  discount_value: number;
}

/**
 * Server-authoritative prize catalog (audit P0-1): clients must never decide
 * which prize they win, what the coupon code is, or what it is worth.
 * Values are intentionally small until a real coupon system (with redemption
 * limits) replaces the hardcoded checkout coupon literals.
 */
const GAMIFIED_PRIZE_CATALOG: ReadonlyArray<GamifiedPrizeDefinition> = [
  { prize_won: '5 TND off your next order', discount_value: 5 },
  { prize_won: '3 TND off your next order', discount_value: 3 },
  { prize_won: '2 TND off your next order', discount_value: 2 },
  { prize_won: 'A little something on your next order', discount_value: 0 },
];

// Ambiguous characters (0/O, 1/I/L) excluded for human-typed codes.
const COUPON_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function drawGamifiedPrize(): GamifiedPrizeDefinition & { coupon_code: string } {
  const prize = GAMIFIED_PRIZE_CATALOG[Math.floor(Math.random() * GAMIFIED_PRIZE_CATALOG.length)];
  const bytes = randomBytes(6);
  let suffix = '';
  for (let i = 0; i < bytes.length; i += 1) {
    suffix += COUPON_ALPHABET[bytes[i] % COUPON_ALPHABET.length];
  }
  return { ...prize, coupon_code: `SPIN-${suffix}` };
}

export class CartService {
  /**
   * Sync and persist a cart to database with multi-vendor combined shipping calculations.
   */
  async syncCart(params: SyncCartParams) {
    const sessionToken = params.session_token || pdId('sess');
    const items = params.items || [];

    // Calculate subtotal
    let subtotal = 0;
    const storeMap = new Map<string, { store_name: string; items: CartItemData[] }>();

    for (const item of items) {
      const price = Number(item.unit_price ?? item.price) || 0;
      const qty = Math.max(1, Number(item.quantity) || 1);
      subtotal += price * qty;

      if (!storeMap.has(item.store_id)) {
        storeMap.set(item.store_id, { store_name: item.store_name || 'Boutique', items: [] });
      }
      storeMap.get(item.store_id)!.items.push(item);
    }

    // Read authoritative shipping rates & thresholds from platform settings
    const settings = await platformConfigService.getSettings().catch(() => null);
    const standardShippingRate = settings?.shipping_domestic_zone_rate_tnd
      ? Number(settings.shipping_domestic_zone_rate_tnd)
      : 7.000;
    const combinedShippingRebate = 3.000;

    // Calculate Multi-Vendor Shipping & Combined Shipping Discounts
    const storeCount = storeMap.size;
    const standardShipping = roundTnd(storeCount * standardShippingRate);
    let combinedDiscount = 0;

    if (storeCount >= 2) {
      combinedDiscount = roundTnd((storeCount - 1) * combinedShippingRebate);
    }

    let shippingTotal = Math.max(0, roundTnd(standardShipping - combinedDiscount));

    // Evaluate Free Shipping threshold from Platform Settings
    const freeShippingThreshold = settings?.shipping_free_shipping_threshold_tnd
      ? Number(settings.shipping_free_shipping_threshold_tnd)
      : null;
    if (freeShippingThreshold && freeShippingThreshold > 0 && subtotal >= freeShippingThreshold) {
      shippingTotal = 0;
    }

    // Evaluate Promo Coupon Code
    let discountAmount = 0;
    const coupon = (params.coupon_code || '').trim().toUpperCase();

    if (coupon) {
      const storeIds = Array.from(storeMap.keys());
      const dynResult = await couponService.validateCoupon(coupon, {
        subtotal,
        storeIds,
        shippingTotal,
      });

      if (dynResult.valid) {
        if (dynResult.freeShipping) {
          discountAmount = shippingTotal;
          shippingTotal = 0;
        } else {
          discountAmount = dynResult.discountAmount;
        }
      } else if (coupon === 'CHANCE5DT') {
        discountAmount = Math.min(subtotal, 5.000);
      } else if (coupon === 'LIVRAISON_ZERO') {
        discountAmount = shippingTotal;
        shippingTotal = 0;
      } else if (coupon === 'PANDA10') {
        discountAmount = Math.round(subtotal * 0.1 * 1000) / 1000;
      } else if (coupon === 'SUPER15') {
        if (subtotal >= 80.000) {
          discountAmount = 15.000;
        }
      } else if (coupon === 'FIDELITE5') {
        discountAmount = Math.round(subtotal * 0.05 * 1000) / 1000;
      } else if (storeIds.length > 0) {
        const broadcastRes = await query<{
          store_id: string;
          discount_type: 'percentage' | 'fixed';
          discount_value: number | string;
        }>(
          `SELECT store_id, discount_type, discount_value 
           FROM pd_seller_broadcast 
           WHERE UPPER(coupon_code) = $1 
             AND store_id = ANY($2::text[])
             AND (sent_at >= NOW() - INTERVAL '30 days')
           ORDER BY sent_at DESC LIMIT 1`,
          [coupon, storeIds]
        );

        if (broadcastRes.rows.length > 0) {
          const row = broadcastRes.rows[0];
          const storeInfo = storeMap.get(row.store_id);
          if (storeInfo) {
            const storeSubtotal = storeInfo.items.reduce(
              (sum, it) => sum + (Number(it.unit_price ?? it.price) || 0) * Math.max(1, Number(it.quantity) || 1),
              0
            );
            const val = Number(row.discount_value) || 0;
            if (row.discount_type === 'percentage') {
              discountAmount = Math.round(storeSubtotal * (val / 100) * 1000) / 1000;
            } else {
              discountAmount = Math.min(storeSubtotal, val);
            }
          }
        }
      }
    }

    const finalTotal = Math.max(0, subtotal - discountAmount) + shippingTotal;
    const cartId = params.user_id ? `cart_u_${params.user_id}` : `cart_s_${sessionToken}`;

    // Upsert into pd_cart
    await query(
      `INSERT INTO pd_cart
        (id, user_id, session_token, items, coupon_code, discount_amount, subtotal, shipping_total, customer_email, customer_phone, is_abandoned, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, NOW())
       ON CONFLICT (id) DO UPDATE
       SET user_id = COALESCE(EXCLUDED.user_id, pd_cart.user_id),
           items = EXCLUDED.items,
           coupon_code = EXCLUDED.coupon_code,
           discount_amount = EXCLUDED.discount_amount,
           subtotal = EXCLUDED.subtotal,
           shipping_total = EXCLUDED.shipping_total,
           customer_email = COALESCE(EXCLUDED.customer_email, pd_cart.customer_email),
           customer_phone = COALESCE(EXCLUDED.customer_phone, pd_cart.customer_phone),
           is_abandoned = false,
           updated_at = NOW()`,
      [
        cartId,
        params.user_id || null,
        sessionToken,
        JSON.stringify(items),
        coupon || null,
        discountAmount,
        subtotal,
        shippingTotal,
        params.customer_email || null,
        params.customer_phone || null,
      ],
    );

    return {
      cart_id: cartId,
      session_token: sessionToken,
      items,
      item_count: items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0),
      store_count: storeCount,
      subtotal,
      discount_amount: discountAmount,
      shipping_total: shippingTotal,
      combined_shipping_savings: combinedDiscount,
      total: finalTotal,
      coupon_code: coupon || null,
    };
  }

  /**
   * Retrieve cart by user_id or session_token.
   */
  async getCart(userId?: string | null, sessionToken?: string | null) {
    if (!userId && !sessionToken) return null;

    const { rows } = await query<{
      id: string;
      user_id: string | null;
      session_token: string;
      items: CartItemData[];
      coupon_code: string | null;
      discount_amount: number;
      subtotal: number;
      shipping_total: number;
    }>(
      `SELECT * FROM pd_cart
       WHERE (user_id IS NOT NULL AND user_id = $1)
          OR (session_token IS NOT NULL AND session_token = $2)
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId || null, sessionToken || null],
    );

    if (!rows[0]) return null;

    const c = rows[0];
    const items = Array.isArray(c.items) ? c.items : [];
    const subtotal = Number(c.subtotal) || 0;
    const discount = Number(c.discount_amount) || 0;
    const shipping = Number(c.shipping_total) || 0;

    return {
      cart_id: c.id,
      session_token: c.session_token,
      items,
      item_count: items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0),
      subtotal,
      discount_amount: discount,
      shipping_total: shipping,
      total: Math.max(0, subtotal - discount) + shipping,
      coupon_code: c.coupon_code,
    };
  }

  /**
   * Record a gamified retention lead (Spin the Wheel / Scratch Card).
   *
   * Audit P0-1 hardening:
   * - The prize is drawn server-side; client-supplied prize fields are ignored.
   * - The 24h frequency cap (per phone OR per device fingerprint) now blocks
   *   the insertion instead of only logging it, and also covers submissions
   *   without a phone number.
   */
  async recordGamifiedLead(params: GamifiedLeadParams) {
    const id = pdId('lead');

    if (params.store_id) {
      const { rows: storeRows } = await query<{ id: string }>(
        `SELECT id FROM pd_store WHERE id = $1 LIMIT 1`,
        [params.store_id],
      );
      if (!storeRows.length) {
        throw new PdValidationError('Unknown store for reward lead');
      }
    }

    const identifiers: Array<{ column: 'phone' | 'device_fingerprint'; value: string }> = [];
    if (params.phone) {
      identifiers.push({ column: 'phone', value: params.phone });
    }
    if (params.device_fingerprint) {
      identifiers.push({ column: 'device_fingerprint', value: params.device_fingerprint });
    }

    for (const identifier of identifiers) {
      const sql =
        identifier.column === 'phone'
          ? `SELECT COUNT(*)::int AS count FROM pd_gamified_lead
             WHERE phone = $1 AND created_at > NOW() - INTERVAL '24 hours'`
          : `SELECT COUNT(*)::int AS count FROM pd_gamified_lead
             WHERE device_fingerprint = $1 AND created_at > NOW() - INTERVAL '24 hours'`;
      const { rows } = await query<{ count: number }>(sql, [identifier.value]);
      if ((rows[0]?.count ?? 0) > 0) {
        logger.info({ scope: identifier.column }, 'Gamified reward rate limited');
        throw new PdValidationError('Reward already claimed in the last 24 hours.');
      }
    }

    const prize = drawGamifiedPrize();

    await query(
      `INSERT INTO pd_gamified_lead
        (id, store_id, phone, email, consent_given, game_type, prize_won, coupon_code, discount_value, device_fingerprint, created_at)
       VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, $8, $9, NOW())`,
      [
        id,
        params.store_id || null,
        params.phone || null,
        params.email || null,
        params.game_type,
        prize.prize_won,
        prize.coupon_code,
        prize.discount_value,
        params.device_fingerprint || null,
      ],
    );

    return {
      success: true,
      lead_id: id,
      coupon_code: prize.coupon_code,
      prize_won: prize.prize_won,
      discount_value: prize.discount_value,
    };
  }

  /**
   * Get captured retention leads for vendor dashboard.
   *
   * Audit P0-2 fix: vendors are strictly scoped to their own store's leads
   * (the previous `OR store_id IS NULL` branch leaked every tenant's leads to
   * every seller). Platform admins may list all leads. Callers with no store
   * and no admin role get an empty result — never an unscoped SELECT.
   */
  async getStoreGamifiedLeads(storeId: string | null | undefined, isAdmin = false) {
    if (isAdmin) {
      const { rows } = await query(
        `SELECT * FROM pd_gamified_lead ORDER BY created_at DESC LIMIT 100`,
      );
      return rows;
    }

    if (!storeId) {
      return [];
    }

    const { rows } = await query(
      `SELECT * FROM pd_gamified_lead WHERE store_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [storeId],
    );
    return rows;
  }
}

export const cartService = new CartService();
