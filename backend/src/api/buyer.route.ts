/**
 * Buyer API Routes — Feature 20 (R1 & R3)
 *
 * Endpoints:
 * - GET /api/pd/buyer/subscriptions — List stores followed by the authenticated buyer + timeline products
 */

import { Router, Request, Response } from 'express';
import { requireAuth, asyncHandler } from '../middlewares';
import { storeSubscriptionService } from '../services/store-subscription.service';
import { query } from '../db/pool';

const router = Router();

/**
 * GET /api/pd/buyer/subscriptions
 * List followed stores and aggregated timeline products for the authenticated buyer
 */
router.get(
  '/subscriptions',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await storeSubscriptionService.getBuyerSubscriptions(req.user!.id, {
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 20 : limit,
    });

    // Fetch timeline products and active broadcasts from followed stores
    const followedStoreIds = result.subscriptions.map((s) => s.store_id);

    // Fetch active broadcasts in the last 7 days for flash drops & stories
    const activeBroadcastsByStore = new Map<string, { title: string; coupon_code: string; discount_value: any; discount_type: string }>();
    if (followedStoreIds.length > 0) {
      try {
        const bRes = await query<{
          store_id: string;
          title: string;
          coupon_code: string;
          discount_value: any;
          discount_type: string;
        }>(
          `SELECT DISTINCT ON (store_id) store_id, title, coupon_code, discount_value, discount_type
           FROM pd_seller_broadcast
           WHERE store_id = ANY($1::text[]) AND sent_at >= NOW() - INTERVAL '7 days'
           ORDER BY store_id, sent_at DESC`,
          [followedStoreIds]
        );
        for (const b of bRes.rows) {
          activeBroadcastsByStore.set(b.store_id, b);
        }
      } catch {
        // ignore
      }
    }

    // Format followed_stores list for carousel
    const followed_stores = result.subscriptions.map((s) => {
      const b = activeBroadcastsByStore.get(s.store_id);
      let active_flash_drop: { title: string; discount: string } | null = null;

      if (b) {
        const discountStr = b.discount_value
          ? (b.discount_type === 'fixed' ? `${b.discount_value} DT` : `${b.discount_value}%`)
          : (b.coupon_code || 'VIP');
        active_flash_drop = {
          title: b.title || 'Flash Drop',
          discount: discountStr,
        };
      } else if (s.latest_products && s.latest_products.some((p: any) => p.compare_at_price && p.compare_at_price > p.price)) {
        const promoProd = s.latest_products.find((p: any) => p.compare_at_price && p.compare_at_price > p.price);
        const pct = Math.round(((promoProd.compare_at_price - promoProd.price) / promoProd.compare_at_price) * 100);
        active_flash_drop = {
          title: promoProd.title,
          discount: `-${pct}%`,
        };
      }

      const has_active_story = s.unread_updates_count > 0 || !!active_flash_drop || (s.latest_products && s.latest_products.length > 0);

      return {
        id: s.store_id,
        name: s.store_name,
        subdomain: s.store_subdomain,
        logo_url: s.store_logo_url || null,
        unread_updates_count: s.unread_updates_count || 0,
        is_verified: s.is_verified_buyer,
        has_active_story,
        active_flash_drop,
      };
    });
    let timeline_products: any[] = [];

    if (followedStoreIds.length > 0) {
      const prodRes = await query<any>(
        `SELECT p.id, p.store_id, s.name AS store_name, p.title, p.price, p.compare_at_price,
                p.interest_tags, p.created_at, p.updated_at,
                COALESCE(
                  (SELECT url FROM pd_product_image WHERE product_id = p.id ORDER BY position ASC LIMIT 1),
                  p.thumbnail
                ) AS image_url
         FROM pd_product p
         JOIN pd_store s ON s.id = p.store_id
         WHERE p.store_id = ANY($1::text[]) AND p.status = 'published'
         ORDER BY p.updated_at DESC
         LIMIT 40`,
        [followedStoreIds]
      );

      timeline_products = prodRes.rows.map((p) => {
        const price = Number(p.price);
        const originalPrice = p.compare_at_price ? Number(p.compare_at_price) : undefined;
        let discountPct: number | undefined;
        if (originalPrice && originalPrice > price) {
          discountPct = Math.round(((originalPrice - price) / originalPrice) * 100);
        }

        const isNew = new Date(p.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

        return {
          id: p.id,
          store_id: p.store_id,
          store_name: p.store_name,
          title: p.title,
          price,
          original_price: originalPrice,
          discount_percentage: discountPct,
          is_new_arrival: isNew,
          published_at: p.created_at,
          image_url: p.image_url || null,
          interest_tags: p.interest_tags || [],
        };
      });
    }

    res.status(200).json({
      ...result,
      followed_stores,
      timeline_products,
    });
  })
);

export default router;
