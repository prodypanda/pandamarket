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

    // Format followed_stores list for carousel
    const followed_stores = result.subscriptions.map((s) => ({
      id: s.store_id,
      name: s.store_name,
      subdomain: s.store_subdomain,
      logo_url: s.store_logo_url || null,
      unread_updates_count: s.unread_updates_count || 0,
      is_verified: s.is_verified_buyer,
    }));

    // Fetch timeline products directly from all followed stores
    const followedStoreIds = result.subscriptions.map((s) => s.store_id);
    let timeline_products: any[] = [];

    if (followedStoreIds.length > 0) {
      const prodRes = await query<any>(
        `SELECT p.id, p.store_id, s.name AS store_name, p.title, p.price, NULL::numeric AS compare_at_price,
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
