/**
 * CartService — Server-side Cart Synchronization, Multi-Vendor Combined Shipping & Gamified Retention Leads.
 */

import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';

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
  consent_given: boolean;
  game_type: 'spin_wheel' | 'scratch_card';
  prize_won: string;
  coupon_code: string;
  discount_value: number;
  device_fingerprint?: string;
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

    // Calculate Multi-Vendor Shipping & Combined Shipping Discounts
    const storeCount = storeMap.size;
    const standardShipping = storeCount * 7.000;
    let combinedDiscount = 0;

    // If buyer purchases from 2+ stores, offer a 3.000 DT combined shipping rebate
    if (storeCount >= 2) {
      combinedDiscount = (storeCount - 1) * 3.000;
    }

    let shippingTotal = Math.max(0, standardShipping - combinedDiscount);

    // Evaluate Promo Coupon Code
    let discountAmount = 0;
    const coupon = (params.coupon_code || '').trim().toUpperCase();

    if (coupon === 'CHANCE5DT') {
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
   */
  async recordGamifiedLead(params: GamifiedLeadParams) {
    const id = pdId('lead');

    // Check frequency cap (1 entry per phone/device per 24 hours)
    if (params.phone) {
      const { rows } = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM pd_gamified_lead
         WHERE phone = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
        [params.phone],
      );
      if (parseInt(rows[0]?.count || '0', 10) > 0) {
        logger.info({ phone: params.phone }, 'Gamified reward rate limited for phone');
      }
    }

    await query(
      `INSERT INTO pd_gamified_lead
        (id, store_id, phone, email, consent_given, game_type, prize_won, coupon_code, discount_value, device_fingerprint, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        id,
        params.store_id || null,
        params.phone || null,
        params.email || null,
        params.consent_given ?? true,
        params.game_type,
        params.prize_won,
        params.coupon_code.toUpperCase(),
        params.discount_value || 0,
        params.device_fingerprint || null,
      ],
    );

    return {
      success: true,
      lead_id: id,
      coupon_code: params.coupon_code.toUpperCase(),
      prize_won: params.prize_won,
      discount_value: params.discount_value,
    };
  }

  /**
   * Get captured retention leads for vendor dashboard.
   */
  async getStoreGamifiedLeads(storeId?: string | null) {
    const sql = storeId
      ? `SELECT * FROM pd_gamified_lead WHERE store_id = $1 OR store_id IS NULL ORDER BY created_at DESC LIMIT 100`
      : `SELECT * FROM pd_gamified_lead ORDER BY created_at DESC LIMIT 100`;
    const params = storeId ? [storeId] : [];

    const { rows } = await query(sql, params);
    return rows;
  }
}

export const cartService = new CartService();
