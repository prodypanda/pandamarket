import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middlewares';
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
  asyncHandler(async (req: Request, res: Response) => {
    const buyerId = req.user?.id;
    const isStorefront = Boolean(req.query.storefront === 'true');
    const result = await buyerInterestService.getRecommendations(buyerId, isStorefront);
    res.status(200).json(result);
  }),
);

/**
 * GET /api/pd/marketplace/feed
 * Blended feed with ~30% interest injection and configurable base sorting
 */
router.get(
  '/feed',
  asyncHandler(async (req: Request, res: Response) => {
    const buyerId = req.user?.id;
    const settings = await platformConfigService.getSettings();
    const baseSort = (settings as any).hub_feed_base_sort || 'random';
    const personalizationPct = Math.min(50, Math.max(0, Number((settings as any).hub_feed_personalization_pct ?? 30)));

    let orderBy = 'RANDOM()';
    if (baseSort === 'newest') orderBy = 'p.created_at DESC';
    else if (baseSort === 'alphabetical') orderBy = 'p.title ASC';
    else if (baseSort === 'best_sellers') orderBy = 's.subscribers_count DESC, p.created_at DESC';

    const baseRes = await query<any>(
      `SELECT p.id, p.store_id, s.name AS store_name, p.title, p.price, p.compare_at_price,
              p.interest_tags, p.created_at,
              (SELECT image_url FROM pd_product_image WHERE product_id = p.id ORDER BY position ASC LIMIT 1) AS image_url
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       WHERE p.status = 'published'
       ORDER BY ${orderBy}
       LIMIT 30`
    );

    let finalProducts = baseRes.rows;

    // Inject personalized interest recommendations if logged in and personalization > 0
    if (buyerId && personalizationPct > 0) {
      const recs = await buyerInterestService.getRecommendations(buyerId);
      if (recs.recommended_products.length > 0) {
        const injectCount = Math.round((finalProducts.length * personalizationPct) / 100);
        const injected = recs.recommended_products.slice(0, injectCount);
        const existingIds = new Set(injected.map((p) => p.id));
        const filteredBase = finalProducts.filter((p) => !existingIds.has(p.id));
        finalProducts = [...injected, ...filteredBase];
      }
    }

    res.status(200).json({
      products: finalProducts,
      feed_settings: {
        base_sort: baseSort,
        personalization_pct: personalizationPct,
      },
    });
  }),
);

export default router;
