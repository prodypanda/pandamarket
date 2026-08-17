import { Router, Request, Response } from 'express';
import { asyncHandler, optionalAuth } from '../middlewares';
import { platformConfigService } from '../services/platform-config.service';
import { buyerInterestService } from '../services/buyer-interest.service';
import { getRequestIp, isMaintenanceAllowedIp } from '../middlewares/maintenance.middleware';
import { query } from '../db/pool';

const router = Router();

router.get(
  '/settings',
  asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ data: await platformConfigService.getPublicSettings() });
  }),
);

router.get(
  '/maintenance',
  asyncHandler(async (req: Request, res: Response) => {
    const settings = await platformConfigService.getSettings();
    const maintenanceEnabled = Boolean(settings.maintenance_enabled);
    const clientAllowed = isMaintenanceAllowedIp(getRequestIp(req), String(settings.maintenance_allowed_ips || ''));
    res.status(200).json({
      data: {
        maintenance_enabled: maintenanceEnabled,
        maintenance_active_for_request: maintenanceEnabled && !clientAllowed,
        maintenance_title: String(settings.maintenance_title || ''),
        maintenance_message: String(settings.maintenance_message || ''),
        maintenance_illustration_url: String(settings.maintenance_illustration_url || ''),
        maintenance_eta: String(settings.maintenance_eta || ''),
        maintenance_block_storefronts: Boolean(settings.maintenance_block_storefronts),
        marketplace_name: String(settings.marketplace_name || ''),
        marketplace_logo_url: String(settings.marketplace_logo_url || ''),
        marketplace_logo_light_url: String(settings.marketplace_logo_light_url || ''),
        marketplace_logo_dark_url: String(settings.marketplace_logo_dark_url || ''),
        marketplace_public_url: String(settings.marketplace_public_url || ''),
      },
    });
  }),
);

/**
 * GET /api/pd/marketplace/recommendations/buyer-interests
 * Cross-seller recommendations and similar stores matching buyer interest tags
 */
router.get(
  '/recommendations/buyer-interests',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const buyerId = req.user?.id;
    const isStorefront = Boolean(req.query.storefront === 'true');
    const result = await buyerInterestService.getRecommendations(buyerId, isStorefront);
    res.status(200).json(result);
  }),
);

export function applyDiversityPenalty<T extends { store_id?: string }>(
  products: T[],
  maxItemsPerStore: number = 3,
  diversityEnabled: boolean = true
): T[] {
  if (!products.length || !diversityEnabled || maxItemsPerStore <= 0) return products;

  const result: T[] = [];
  const overflow: T[] = [];
  const storeCounts: Record<string, number> = {};

  for (const product of products) {
    const storeId = product.store_id || 'unknown';
    const count = storeCounts[storeId] || 0;
    if (count >= maxItemsPerStore) {
      overflow.push(product);
    } else {
      storeCounts[storeId] = count + 1;
      result.push(product);
    }
  }

  return [...result, ...overflow];
}

function interleaveFeed<T>(baseItems: T[], injectedItems: T[]): T[] {
  if (!injectedItems.length) return baseItems;
  if (!baseItems.length) return injectedItems;

  const result: T[] = [];
  const baseLen = baseItems.length;
  const injLen = injectedItems.length;
  const interval = Math.max(2, Math.floor(baseLen / injLen));

  let baseIdx = 0;
  let injIdx = 0;

  while (baseIdx < baseLen || injIdx < injLen) {
    for (let i = 0; i < interval && baseIdx < baseLen; i++) {
      result.push(baseItems[baseIdx++]);
    }
    if (injIdx < injLen) {
      result.push(injectedItems[injIdx++]);
    }
  }
  return result;
}

/**
 * GET /api/pd/marketplace/feed
 * Blended feed with configurable interest injection ratio, diversity penalty, and base catalog sorting
 */
router.get(
  '/feed',
  asyncHandler(async (req: Request, res: Response) => {
    const buyerId = req.user?.id;
    const settings = await platformConfigService.getSettings();
    const querySort = req.query.sort as string | undefined;
    const baseSort = querySort || (settings as any).hub_feed_base_sort || 'random';
    const personalizationPct = Math.min(50, Math.max(0, Number((settings as any).hub_feed_personalization_pct ?? 30)));
    const diversityEnabled = (settings as any).hub_feed_diversity_enabled !== false;
    const maxItemsPerStore = Math.min(10, Math.max(1, Number((settings as any).hub_feed_max_items_per_store ?? 3)));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const categorySlug = req.query.category as string | undefined;
    const searchQuery = req.query.q as string | undefined;

    let orderBy = 'RANDOM()';
    if (baseSort === 'newest') orderBy = 'p.created_at DESC';
    else if (baseSort === 'alphabetical') orderBy = 'LOWER(p.title) ASC, p.created_at DESC';
    else if (baseSort === 'best_sellers') orderBy = 'COALESCE(s.subscribers_count, 0) DESC, p.created_at DESC';
    else if (baseSort === 'price_asc') orderBy = 'p.price ASC, p.created_at DESC';
    else if (baseSort === 'price_desc') orderBy = 'p.price DESC, p.created_at DESC';

    const conditions: string[] = [`p.status = 'published'`];
    const params: any[] = [];

    if (categorySlug) {
      params.push(categorySlug);
      conditions.push(`(mc.slug = $${params.length} OR p.category ILIKE $${params.length})`);
    }

    if (searchQuery) {
      params.push(`%${searchQuery.trim()}%`);
      conditions.push(`(p.title ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    params.push(limit);
    const limitPlaceholder = `$${params.length}`;

    const baseRes = await query<any>(
      `SELECT p.id, p.store_id, s.name AS store_name, s.subdomain AS store_subdomain,
              COALESCE(s.is_verified, false) AS store_is_verified,
              s.seller_type AS store_seller_type,
              COALESCE(pr.average_rating, 4.8)::real AS store_score,
              p.title, p.slug, p.price, p.compare_at_price,
              p.interest_tags, p.created_at, p.category, mc.slug AS marketplace_category_slug,
              COALESCE(pr.average_rating, 0)::real AS average_rating, COALESCE(pr.review_count, 0)::int AS review_count,
              COALESCE(p.thumbnail, (SELECT url FROM pd_product_image WHERE product_id = p.id ORDER BY position ASC LIMIT 1)) AS thumbnail,
              COALESCE(p.thumbnail, (SELECT url FROM pd_product_image WHERE product_id = p.id ORDER BY position ASC LIMIT 1)) AS image_url
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       LEFT JOIN pd_product_rating pr ON pr.product_id = p.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT ${limitPlaceholder}`,
      params
    );

    let finalProducts = baseRes.rows;

    // Inject personalized interest recommendations if buyer profile exists and personalization > 0
    if (buyerId && personalizationPct > 0) {
      const recs = await buyerInterestService.getRecommendations(buyerId);
      if (recs.recommended_products.length > 0) {
        const injectCount = Math.min(
          recs.recommended_products.length,
          Math.max(1, Math.round((finalProducts.length * personalizationPct) / 100))
        );
        const injected = recs.recommended_products.slice(0, injectCount);
        const existingIds = new Set(injected.map((p) => p.id));
        const filteredBase = finalProducts.filter((p) => !existingIds.has(p.id));
        finalProducts = interleaveFeed(filteredBase, injected);
      }
    }

    // Apply Diversity Penalty (Anti-Filter Bubble) to avoid vendor clustering
    if (diversityEnabled) {
      finalProducts = applyDiversityPenalty(finalProducts, maxItemsPerStore, true);
    }

    res.status(200).json({
      products: finalProducts,
      feed_settings: {
        base_sort: baseSort,
        personalization_pct: personalizationPct,
        diversity_enabled: diversityEnabled,
        max_items_per_store: maxItemsPerStore,
        total_items: finalProducts.length,
      },
    });
  }),
);

export default router;
