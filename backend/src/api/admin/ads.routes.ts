import { query } from '../../db/pool';
import { asyncHandler, validate } from '../../middlewares';
import { adsRefillService } from '../../services/ads-refill.service';
import { adsService } from '../../services/ads.service';
import { platformConfigService } from '../../services/platform-config.service';
import { adsAccountStatusSchema, adsAdjustmentSchema, adsBulkPricingSchema, adsConfigSchema, adsCouponSchema, adsCreditSchema, adsManualRefillListSchema, adsManualRefillReviewSchema, adsPlacementSchema, adsRefundSchema, adsReviewSchema } from './_shared';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

/** Admin Ads management routes — extracted from the admin.route.ts header (E15). */

const router = Router();


router.get(
  '/ads',
  asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json(
      await adsService.adminOverview({
        from: req.query.from as string,
        to: req.query.to as string,
        granularity: req.query.granularity as any,
      }),
    );
  }),
);
router.get(
  '/ads/config',
  asyncHandler(async (_req: Request, res: Response) => {
    const s = await platformConfigService.getSettings();
    res.json({
      config: {
        ads_enabled: s.ads_enabled,
        ads_moderation_required: s.ads_moderation_required,
        ads_min_refill_tnd: s.ads_min_refill_tnd,
        ads_max_refill_tnd: s.ads_max_refill_tnd,
        ads_min_daily_budget_tnd: s.ads_min_daily_budget_tnd,
        ads_max_campaign_days: s.ads_max_campaign_days,
        ads_frequency_cap_daily: s.ads_frequency_cap_daily,
        ads_click_attribution_days: s.ads_click_attribution_days,
        ads_view_attribution_days: s.ads_view_attribution_days,
        ads_sponsored_products_enabled: s.ads_sponsored_products_enabled,
        ads_sponsored_brands_enabled: s.ads_sponsored_brands_enabled,
        ads_sponsored_content_enabled: s.ads_sponsored_content_enabled,
        ads_prohibited_terms: s.ads_prohibited_terms,
        ads_creative_image_required: s.ads_creative_image_required,
        ads_max_creative_description_length: s.ads_max_creative_description_length,
      },
    });
  }),
);
router.patch(
  '/ads/config',
  validate(adsConfigSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await platformConfigService.updateSettings(req.body, req.user!.id);
    const s = await platformConfigService.getSettings();
    res.json({
      config: {
        ads_enabled: s.ads_enabled,
        ads_moderation_required: s.ads_moderation_required,
        ads_min_refill_tnd: s.ads_min_refill_tnd,
        ads_max_refill_tnd: s.ads_max_refill_tnd,
        ads_min_daily_budget_tnd: s.ads_min_daily_budget_tnd,
        ads_max_campaign_days: s.ads_max_campaign_days,
        ads_frequency_cap_daily: s.ads_frequency_cap_daily,
        ads_click_attribution_days: s.ads_click_attribution_days,
        ads_view_attribution_days: s.ads_view_attribution_days,
        ads_sponsored_products_enabled: s.ads_sponsored_products_enabled,
        ads_sponsored_brands_enabled: s.ads_sponsored_brands_enabled,
        ads_sponsored_content_enabled: s.ads_sponsored_content_enabled,
        ads_prohibited_terms: s.ads_prohibited_terms,
        ads_creative_image_required: s.ads_creative_image_required,
        ads_max_creative_description_length: s.ads_max_creative_description_length,
      },
    });
  }),
);
router.post(
  '/ads/campaigns/:id/review',
  validate(adsReviewSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const campaign = await adsService.reviewCampaign(
      req.params.id,
      req.user!.id,
      req.body.decision,
      req.body.reason,
    );
    res.status(200).json({ campaign });
  }),
);
router.post(
  '/ads/campaigns/:id/suspend',
  asyncHandler(async (req: Request, res: Response) => {
    const campaign = await adsService.adminSuspendCampaign(
      req.params.id,
      req.user!.id,
      req.body?.reason,
    );
    res.status(200).json({ campaign });
  }),
);
router.post(
  '/ads/accounts/adjust',
  validate(adsAdjustmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await adsService.adjustAccount(
      req.body.store_id,
      req.body.amount,
      req.user!.id,
      req.body.reason,
      req.body.idempotency_key,
    );
    res.status(200).json(result);
  }),
);
router.get(
  '/ads/coupons',
  asyncHandler(async (_req: Request, res: Response) =>
    res.json({ coupons: await adsService.listCoupons() }),
  ),
);
router.post(
  '/ads/coupons',
  validate(adsCouponSchema),
  asyncHandler(async (req: Request, res: Response) =>
    res
      .status(201)
      .json({
        coupon: await adsService.createCoupon(
          {
            code: req.body.code,
            amount: req.body.amount,
            maxRedemptions: req.body.max_redemptions,
            expiresAt: req.body.expires_at,
            enabled: req.body.enabled,
          },
          req.user!.id,
        ),
      }),
  ),
);
router.post(
  '/ads/credits',
  validate(adsCreditSchema),
  asyncHandler(async (req: Request, res: Response) =>
    res
      .status(201)
      .json({
        transaction: await adsService.grantPromotionalCredit(
          req.body.store_id,
          req.body.amount,
          req.user!.id,
          req.body.reason,
          req.body.idempotency_key,
        ),
      }),
  ),
);
router.post(
  '/ads/transactions/:id/refund',
  validate(adsRefundSchema),
  asyncHandler(async (req: Request, res: Response) =>
    res.json({
      transaction: await adsService.refundTransaction(req.params.id, req.user!.id, req.body.reason),
    }),
  ),
);
router.patch(
  '/ads/accounts/:storeId/status',
  validate(adsAccountStatusSchema),
  asyncHandler(async (req: Request, res: Response) =>
    res.json({ account: await adsService.setAccountStatus(req.params.storeId, req.body.status) }),
  ),
);
router.get(
  '/ads/placements',
  asyncHandler(async (_req: Request, res: Response) =>
    res.json({ placements: await adsService.listAdminPlacements() }),
  ),
);
router.get(
  '/ads/transactions',
  asyncHandler(async (req: Request, res: Response) =>
    res.json({
      transactions: await adsService.listAdminTransactions(Number(req.query.limit) || 100),
    }),
  ),
);
router.get(
  '/ads/manual-refills',
  validate(adsManualRefillListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) =>
    res.json({
      refills: await adsRefillService.listManualForAdmin(
        String(req.query.status || 'pending_review'),
      ),
    }),
  ),
);
router.post(
  '/ads/manual-refills/:id/review',
  validate(adsManualRefillReviewSchema),
  asyncHandler(async (req: Request, res: Response) =>
    res.json({
      refill: await adsRefillService.reviewManual(
        req.params.id,
        req.user!.id,
        req.body.decision,
        req.body.reason,
      ),
    }),
  ),
);
router.patch(
  '/ads/placements/bulk-pricing',
  validate(adsBulkPricingSchema),
  asyncHandler(async (req: Request, res: Response) =>
    res.json({
      placements: await adsService.bulkUpdatePlacementPricing(
        req.body.pricing_model,
        req.body.default_price,
        req.body.placement_ids,
      ),
    }),
  ),
);
router.patch(
  '/ads/placements/:id',
  validate(adsPlacementSchema),
  asyncHandler(async (req: Request, res: Response) =>
    res.json({
      placement: await adsService.updatePlacement(req.params.id, {
        enabled: req.body.enabled,
        defaultPrice: req.body.default_price,
        defaultPricingModel: req.body.default_pricing_model,
      }),
    }),
  ),
);

const blockIpSchema = z.object({
  ip_hash: z.string().min(1).max(128),
  reason: z.string().trim().min(3).max(1000),
});
router.get(
  '/ads/fraud/blocked-ips',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await query(
      'SELECT ip_hash, reason, blocked_at FROM pd_ads_blocked_ip ORDER BY blocked_at DESC LIMIT 100',
    );
    res.json({ blocked_ips: result.rows });
  }),
);
router.post(
  '/ads/fraud/block-ip',
  validate(blockIpSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
      `INSERT INTO pd_ads_blocked_ip (ip_hash, reason) VALUES ($1, $2)
     ON CONFLICT (ip_hash) DO UPDATE SET reason = EXCLUDED.reason, blocked_at = NOW() RETURNING *`,
      [req.body.ip_hash, req.body.reason],
    );
    res.status(201).json({ blocked: result.rows[0] });
  }),
);
router.delete(
  '/ads/fraud/blocked-ips/:ipHash',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
      'DELETE FROM pd_ads_blocked_ip WHERE ip_hash = $1 RETURNING ip_hash',
      [req.params.ipHash],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: { message: 'Blocked IP not found' } });
      return;
    }
    res.json({ unblocked: req.params.ipHash });
  }),
);

export default router;
