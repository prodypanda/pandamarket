/**
 * Store Subscription Service — Feature 20 (R1)
 *
 * Requirements:
 * - Subscriptions & Unsubscriptions lifecycle
 * - Anti-bot purchase verification logic (>=1 completed orders: paid, delivered, shipped, processing, fulfilled)
 * - Verified vs regular subscriber counts on store
 * - Subscription status and notification preference toggling
 * - Buyer followed stores feed with latest products
 */

import { query, transaction } from '../db/pool';
import { PdValidationError, PdNotFoundError, PdForbiddenError } from '../errors';
import { pdId } from '../utils/crypto';
import { socketGateway } from '../realtime/socket-gateway';
import { buyerInterestService } from './buyer-interest.service';

export interface StoreSubscription {
  id: string;
  buyer_id: string;
  store_id: string;
  notify_price_drops: boolean;
  notify_new_products: boolean;
  is_verified_buyer: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StoreSubscriberStats {
  store_id: string;
  subscribers_count: number;
  verified_subscribers_count: number;
}

export interface BuyerSubscriptionItem {
  subscription_id: string;
  store_id: string;
  store_name: string;
  store_subdomain: string;
  store_logo_url: string;
  notify_price_drops: boolean;
  notify_new_products: boolean;
  is_verified_buyer: boolean;
  unread_updates_count: number;
  latest_products: Array<{ id: string; title: string; price: number; compare_at_price?: number }>;
  subscribed_at: Date;
}

export class StoreSubscriptionService {
  /**
   * Anti-bot verified buyer check: buyer has >= 1 completed order (paid, delivered, shipped, processing, fulfilled)
   */
  public async isBuyerVerified(buyerId: string): Promise<boolean> {
    if (!buyerId || typeof buyerId !== 'string' || buyerId.trim() === '') {
      return false;
    }

    const res = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count 
       FROM pd_order 
       WHERE customer_id = $1 
         AND (payment_status = 'captured' OR status IN ('processing', 'partially_shipped', 'fulfilled', 'partially_delivered', 'delivered'))`,
      [buyerId.trim()]
    );

    return parseInt(res.rows[0]?.count || '0', 10) > 0;
  }

  /**
   * Subscribe a buyer to a store
   */
  public async subscribe(
    buyerId: string,
    storeId: string,
    options?: { notify_price_drops?: boolean; notify_new_products?: boolean }
  ): Promise<{
    success: boolean;
    is_subscribed: boolean;
    is_verified_buyer: boolean;
    subscribers_count: number;
    verified_subscribers_count: number;
  }> {
    if (!buyerId || typeof buyerId !== 'string' || buyerId.trim() === '') {
      throw new PdValidationError('Invalid or missing buyer_id');
    }
    if (!storeId || typeof storeId !== 'string' || storeId.trim() === '') {
      throw new PdValidationError('Invalid or missing store_id');
    }

    const cleanBuyerId = buyerId.trim();
    const cleanStoreId = storeId.trim();

    // Check store existence and ownership
    const storeRes = await query<{ id: string; owner_id: string; subscribers_count: number; verified_subscribers_count: number }>(
      'SELECT id, owner_id, subscribers_count, verified_subscribers_count FROM pd_store WHERE id = $1',
      [cleanStoreId]
    );

    if (storeRes.rows.length === 0) {
      throw new PdNotFoundError(`Store with id '${cleanStoreId}' not found`);
    }

    const store = storeRes.rows[0];
    if (store.owner_id === cleanBuyerId) {
      throw new PdForbiddenError('Sellers cannot subscribe to their own store');
    }

    // Check existing subscription (Idempotency)
    const existingSubRes = await query<StoreSubscription>(
      'SELECT * FROM pd_store_subscription WHERE buyer_id = $1 AND store_id = $2',
      [cleanBuyerId, cleanStoreId]
    );

    if (existingSubRes.rows.length > 0) {
      const existing = existingSubRes.rows[0];
      return {
        success: true,
        is_subscribed: true,
        is_verified_buyer: existing.is_verified_buyer,
        subscribers_count: store.subscribers_count,
        verified_subscribers_count: store.verified_subscribers_count,
      };
    }

    const isVerified = await this.isBuyerVerified(cleanBuyerId);
    const subId = pdId('sub');
    const notifyPriceDrops = options?.notify_price_drops ?? true;
    const notifyNewProducts = options?.notify_new_products ?? true;

    // Use transaction to ensure atomic subscription insert and counter increment
    const updateResult = await transaction(async (client) => {
      await client.query(
        `INSERT INTO pd_store_subscription (id, buyer_id, store_id, notify_price_drops, notify_new_products, is_verified_buyer, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (buyer_id, store_id) DO NOTHING`,
        [subId, cleanBuyerId, cleanStoreId, notifyPriceDrops, notifyNewProducts, isVerified]
      );

      const res = await client.query<{ subscribers_count: number; verified_subscribers_count: number }>(
        `UPDATE pd_store 
         SET subscribers_count = subscribers_count + 1,
             verified_subscribers_count = verified_subscribers_count + ($1::int)
         WHERE id = $2
         RETURNING subscribers_count, verified_subscribers_count`,
        [isVerified ? 1 : 0, cleanStoreId]
      );

      return res.rows[0];
    });

    const finalSubCount = updateResult ? updateResult.subscribers_count : store.subscribers_count + 1;
    const finalVerifiedCount = updateResult ? updateResult.verified_subscribers_count : store.verified_subscribers_count + (isVerified ? 1 : 0);

    // Asynchronously synchronize buyer interest profile and broadcast real-time follower counter
    buyerInterestService.syncBuyerProfile(cleanBuyerId).catch(() => {});
    socketGateway.emitToAll('store:subscribers_updated', {
      store_id: cleanStoreId,
      subscribers_count: finalSubCount,
      verified_subscribers_count: finalVerifiedCount,
    });

    return {
      success: true,
      is_subscribed: true,
      is_verified_buyer: isVerified,
      subscribers_count: finalSubCount,
      verified_subscribers_count: finalVerifiedCount,
    };
  }

  /**
   * Unsubscribe a buyer from a store
   */
  public async unsubscribe(
    buyerId: string,
    storeId: string
  ): Promise<{
    success: boolean;
    is_subscribed: boolean;
    subscribers_count: number;
    verified_subscribers_count: number;
  }> {
    if (!buyerId || typeof buyerId !== 'string' || buyerId.trim() === '') {
      throw new PdValidationError('Invalid or missing buyer_id');
    }
    if (!storeId || typeof storeId !== 'string' || storeId.trim() === '') {
      throw new PdValidationError('Invalid or missing store_id');
    }

    const cleanBuyerId = buyerId.trim();
    const cleanStoreId = storeId.trim();

    const storeRes = await query<{ id: string; subscribers_count: number; verified_subscribers_count: number }>(
      'SELECT id, subscribers_count, verified_subscribers_count FROM pd_store WHERE id = $1',
      [cleanStoreId]
    );

    if (storeRes.rows.length === 0) {
      throw new PdNotFoundError(`Store with id '${cleanStoreId}' not found`);
    }

    const store = storeRes.rows[0];

    const existingSubRes = await query<StoreSubscription>(
      'SELECT * FROM pd_store_subscription WHERE buyer_id = $1 AND store_id = $2',
      [cleanBuyerId, cleanStoreId]
    );

    if (existingSubRes.rows.length === 0) {
      // Idempotent: not subscribed, return existing counts clamped
      return {
        success: true,
        is_subscribed: false,
        subscribers_count: Math.max(0, store.subscribers_count),
        verified_subscribers_count: Math.max(0, store.verified_subscribers_count),
      };
    }

    const existing = existingSubRes.rows[0];

    const updateResult = await transaction(async (client) => {
      await client.query(
        'DELETE FROM pd_store_subscription WHERE buyer_id = $1 AND store_id = $2',
        [cleanBuyerId, cleanStoreId]
      );

      const res = await client.query<{ subscribers_count: number; verified_subscribers_count: number }>(
        `UPDATE pd_store 
         SET subscribers_count = GREATEST(0, subscribers_count - 1),
             verified_subscribers_count = GREATEST(0, verified_subscribers_count - ($1::int))
         WHERE id = $2
         RETURNING subscribers_count, verified_subscribers_count`,
        [existing.is_verified_buyer ? 1 : 0, cleanStoreId]
      );

      return res.rows[0];
    });

    const finalSubCount = updateResult ? updateResult.subscribers_count : Math.max(0, store.subscribers_count - 1);
    const finalVerifiedCount = updateResult
      ? updateResult.verified_subscribers_count
      : Math.max(0, store.verified_subscribers_count - (existing.is_verified_buyer ? 1 : 0));

    // Asynchronously synchronize buyer interest profile and broadcast real-time follower counter
    buyerInterestService.syncBuyerProfile(cleanBuyerId).catch(() => {});
    socketGateway.emitToAll('store:subscribers_updated', {
      store_id: cleanStoreId,
      subscribers_count: finalSubCount,
      verified_subscribers_count: finalVerifiedCount,
    });

    return {
      success: true,
      is_subscribed: false,
      subscribers_count: finalSubCount,
      verified_subscribers_count: finalVerifiedCount,
    };
  }

  /**
   * Get subscription status for a buyer (or anonymous visitor)
   */
  public async getSubscriptionStatus(
    buyerId: string | null | undefined,
    storeId: string
  ): Promise<{
    is_subscribed: boolean;
    is_verified_buyer: boolean;
    notify_price_drops: boolean;
    notify_new_products: boolean;
    subscribers_count: number;
    verified_subscribers_count: number;
  }> {
    if (!storeId || typeof storeId !== 'string' || storeId.trim() === '') {
      throw new PdValidationError('Invalid or missing store_id');
    }

    const cleanStoreId = storeId.trim();

    const storeRes = await query<{ id: string; subscribers_count: number; verified_subscribers_count: number }>(
      'SELECT id, subscribers_count, verified_subscribers_count FROM pd_store WHERE id = $1',
      [cleanStoreId]
    );

    if (storeRes.rows.length === 0) {
      throw new PdNotFoundError(`Store with id '${cleanStoreId}' not found`);
    }

    const store = storeRes.rows[0];

    if (!buyerId || typeof buyerId !== 'string' || buyerId.trim() === '') {
      return {
        is_subscribed: false,
        is_verified_buyer: false,
        notify_price_drops: true,
        notify_new_products: true,
        subscribers_count: store.subscribers_count,
        verified_subscribers_count: store.verified_subscribers_count,
      };
    }

    const cleanBuyerId = buyerId.trim();

    const subRes = await query<StoreSubscription>(
      'SELECT * FROM pd_store_subscription WHERE buyer_id = $1 AND store_id = $2',
      [cleanBuyerId, cleanStoreId]
    );

    if (subRes.rows.length === 0) {
      return {
        is_subscribed: false,
        is_verified_buyer: false,
        notify_price_drops: true,
        notify_new_products: true,
        subscribers_count: store.subscribers_count,
        verified_subscribers_count: store.verified_subscribers_count,
      };
    }

    const sub = subRes.rows[0];

    return {
      is_subscribed: true,
      is_verified_buyer: sub.is_verified_buyer,
      notify_price_drops: sub.notify_price_drops,
      notify_new_products: sub.notify_new_products,
      subscribers_count: store.subscribers_count,
      verified_subscribers_count: store.verified_subscribers_count,
    };
  }

  /**
   * Update notification preferences for an active subscription
   */
  public async updatePreferences(
    buyerId: string,
    storeId: string,
    prefs: { notify_price_drops?: boolean; notify_new_products?: boolean }
  ): Promise<StoreSubscription> {
    if (!buyerId || !storeId) {
      throw new PdValidationError('Missing buyer_id or store_id');
    }

    const cleanBuyerId = buyerId.trim();
    const cleanStoreId = storeId.trim();

    const res = await query<StoreSubscription>(
      `UPDATE pd_store_subscription 
       SET notify_price_drops = COALESCE($1, notify_price_drops),
           notify_new_products = COALESCE($2, notify_new_products),
           updated_at = NOW()
       WHERE buyer_id = $3 AND store_id = $4
       RETURNING *`,
      [
        prefs.notify_price_drops !== undefined ? prefs.notify_price_drops : null,
        prefs.notify_new_products !== undefined ? prefs.notify_new_products : null,
        cleanBuyerId,
        cleanStoreId,
      ]
    );

    if (res.rows.length === 0) {
      throw new PdNotFoundError('Subscription not found');
    }

    return res.rows[0];
  }

  /**
   * Get list of followed stores for a buyer
   */
  public async getBuyerSubscriptions(
    buyerId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{
    subscriptions: BuyerSubscriptionItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    if (!buyerId || typeof buyerId !== 'string' || buyerId.trim() === '') {
      throw new PdValidationError('buyer_id is required');
    }

    const cleanBuyerId = buyerId.trim();
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const offset = (page - 1) * limit;

    const countRes = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM pd_store_subscription WHERE buyer_id = $1',
      [cleanBuyerId]
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);
    const total_pages = Math.ceil(total / limit) || 1;

    const subsRes = await query<{
      subscription_id: string;
      store_id: string;
      notify_price_drops: boolean;
      notify_new_products: boolean;
      is_verified_buyer: boolean;
      subscribed_at: Date;
      store_name: string;
      store_subdomain: string;
      store_settings: Record<string, unknown> | null;
      subscribers_count: number;
      verified_subscribers_count: number;
    }>(
      `SELECT s.id AS subscription_id,
              s.store_id,
              s.notify_price_drops,
              s.notify_new_products,
              s.is_verified_buyer,
              s.created_at AS subscribed_at,
              st.name AS store_name,
              st.subdomain AS store_subdomain,
              st.settings AS store_settings,
              st.subscribers_count,
              st.verified_subscribers_count
       FROM pd_store_subscription s
       JOIN pd_store st ON st.id = s.store_id
       WHERE s.buyer_id = $1
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [cleanBuyerId, limit, offset]
    );

    const subscriptions: BuyerSubscriptionItem[] = await Promise.all(
      subsRes.rows.map(async (row) => {
        const settings = row.store_settings || {};
        const logoUrl =
          (settings.logo_url as string) ||
          (settings.logo_light_url as string) ||
          (settings.logo_dark_url as string) ||
          '';

        // Fetch up to 5 latest published products from this store
        const prodRes = await query<{
          id: string;
          title: string;
          price: string | number;
          compare_at_price: string | number | null;
        }>(
          `SELECT id, title, price, compare_at_price
           FROM pd_product
           WHERE store_id = $1 AND status = 'published'
           ORDER BY created_at DESC
           LIMIT 5`,
          [row.store_id]
        );

        const latestProducts = prodRes.rows.map((p) => ({
          id: p.id,
          title: p.title,
          price: Number(p.price) || 0,
          ...(p.compare_at_price !== undefined && p.compare_at_price !== null
            ? { compare_at_price: Number(p.compare_at_price) }
            : {}),
        }));

        return {
          subscription_id: row.subscription_id,
          store_id: row.store_id,
          store_name: row.store_name,
          store_subdomain: row.store_subdomain,
          store_logo_url: logoUrl,
          notify_price_drops: row.notify_price_drops,
          notify_new_products: row.notify_new_products,
          is_verified_buyer: row.is_verified_buyer,
          unread_updates_count: latestProducts.length,
          latest_products: latestProducts,
          subscribed_at: row.subscribed_at,
        };
      })
    );

    return {
      subscriptions,
      total,
      page,
      limit,
      total_pages,
    };
  }
}

export const storeSubscriptionService = new StoreSubscriptionService();
