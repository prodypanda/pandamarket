/**
 * Admin API routes — Super Admin only.
 * Handles KYC verification queue, mandat validation, reports management,
 * vendor management, and platform statistics.
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PdValidationError } from '../errors';
import { resolveDataPath } from '../utils/data-dir';
import { pdId } from '../utils/crypto';
import { asyncHandler, requireAuth, requireAdmin, validate } from '../middlewares';
import { invalidateMaintenanceCache } from '../middlewares/maintenance.middleware';
import { kycService } from '../services/kyc.service';
import { mandatService } from '../services/mandat.service';
import { reportService } from '../services/report.service';
import { storeService } from '../services/store.service';
import { authService } from '../services/auth.service';
import { accountSecurityService } from '../services/account-security.service';
import { systemLogService } from '../services/system-log.service';
import { productService } from '../services/product.service';
import { categoryService } from '../services/category.service';
import { fileAssetService } from '../services/file-asset.service';
import { subscriptionService } from '../services/subscription.service';
import { query, transaction } from '../db/pool';
import {
  VerificationStatus,
  MandatStatus,
  ReportPriority,
  ReportMessageVisibility,
  ReportSource,
  ReportStatus,
  ReportTargetType,
  SubscriptionPlan,
  SubscriptionType,
  SellerType,
  StoreStatus,
  AiJobType,
} from '@pandamarket/types';
import { logger } from '../utils/logger';
import { smtpConfigService } from '../services/smtp-config.service';
import { creditsService } from '../services/credits.service';
import { aiConfigService } from '../services/ai-config.service';
import type { AiProvider } from '../services/ai-config.service';
import {
  platformConfigService,
  type PlatformSettingKey,
  type PlatformSettingSection,
  type PlatformSettingValue,
} from '../services/platform-config.service';
import { PdErrorCode, PdNotFoundError } from '../errors';
import { normalizePlanId } from '../utils/plan-id';
import { adsService } from '../services/ads.service';
import { adsRefillService } from '../services/ads-refill.service';

const router = Router();

// All admin routes require authentication + admin role
router.use(requireAuth, requireAdmin);

const adsReviewSchema = z
  .object({
    decision: z.enum(['approved', 'rejected', 'changes_requested']),
    reason: z.string().trim().max(2000).optional(),
  })
  .refine((value) => value.decision === 'approved' || Boolean(value.reason), {
    message: 'A reason is required when an ad is not approved',
    path: ['reason'],
  });
const adsConfigSchema = z
  .object({
    ads_enabled: z.boolean().optional(),
    ads_moderation_required: z.boolean().optional(),
    ads_min_refill_tnd: z.number().min(1).max(100000).optional(),
    ads_max_refill_tnd: z.number().min(1).max(1000000).optional(),
    ads_min_daily_budget_tnd: z.number().min(0.001).max(100000).optional(),
    ads_max_campaign_days: z.number().int().min(1).max(365).optional(),
    ads_frequency_cap_daily: z.number().int().min(1).max(100).optional(),
    ads_click_attribution_days: z.number().int().min(1).max(90).optional(),
    ads_view_attribution_days: z.number().int().min(1).max(30).optional(),
    ads_sponsored_products_enabled: z.boolean().optional(),
    ads_sponsored_brands_enabled: z.boolean().optional(),
    ads_sponsored_content_enabled: z.boolean().optional(),
    ads_prohibited_terms: z.string().trim().max(5000).optional(),
    ads_creative_image_required: z.boolean().optional(),
    ads_max_creative_description_length: z.number().int().min(50).max(5000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0)
  .refine(
    (v) =>
      v.ads_min_refill_tnd === undefined ||
      v.ads_max_refill_tnd === undefined ||
      v.ads_max_refill_tnd >= v.ads_min_refill_tnd,
    { message: 'Maximum refill must be at least the minimum refill', path: ['ads_max_refill_tnd'] },
  );
const adsAccountStatusSchema = z.object({ status: z.enum(['active', 'suspended']) });
const adsPlacementSchema = z
  .object({
    enabled: z.boolean().optional(),
    default_price: z.number().min(0).max(100000).optional(),
    default_pricing_model: z.enum(['cpc', 'cpm', 'fixed_daily']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0);
const adsBulkPricingSchema = z.object({
  pricing_model: z.enum(['cpc', 'cpm', 'fixed_daily']),
  default_price: z.number().positive().max(100000),
  placement_ids: z.array(z.string().min(1)).max(100).optional(),
});
const adsCouponSchema = z.object({
  code: z.string().trim().min(4).max(40),
  amount: z.number().positive().max(1000000),
  max_redemptions: z.number().int().min(1).max(100000),
  expires_at: z.string().datetime().optional(),
  enabled: z.boolean().optional(),
});
const adsCreditSchema = z.object({
  store_id: z.string().min(8).max(100),
  amount: z.number().positive().max(1000000),
  reason: z.string().trim().min(3).max(500),
  idempotency_key: z.string().min(8).max(160),
});
const adsRefundSchema = z.object({ reason: z.string().trim().min(3).max(500) });
const adsManualRefillListSchema = z.object({
  status: z.enum(['pending_review', 'captured', 'rejected']).optional().default('pending_review'),
});
const adsManualRefillReviewSchema = z
  .object({
    decision: z.enum(['approved', 'rejected']),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine((value) => value.decision === 'approved' || Boolean(value.reason), {
    message: 'A rejection reason is required',
    path: ['reason'],
  });
const adsAdjustmentSchema = z.object({
  store_id: z.string().min(8).max(100),
  amount: z
    .number()
    .finite()
    .refine((value) => value !== 0),
  reason: z.string().trim().min(3).max(500),
  idempotency_key: z.string().trim().min(8).max(160),
});

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

const userSecurityActivityParamsSchema = z.object({
  id: z.string().min(8).max(100),
});

router.get(
  '/users/:id/security-activity',
  validate(userSecurityActivityParamsSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const activity = await accountSecurityService.listAdminUserSecurityActivity(req.params.id);
    res.status(200).json({ data: activity, ...activity });
  }),
);

const assetListQuerySchema = z.object({
  type: z.enum(['image', 'document']).optional(),
  folder: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(60),
});

const registerAssetSchema = z.object({
  url: z.string().url(),
  file_key: z.string().min(1).max(500),
  bucket: z.string().min(1).max(120),
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1).max(100),
  file_size: z.number().int().min(0).nullable().optional(),
  purpose: z.string().min(1).max(40).default('marketplace_asset'),
  metadata: z.record(z.unknown()).optional(),
});

router.get(
  '/assets',
  validate(assetListQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const queryParams = req.query as unknown as {
      type?: 'image' | 'document';
      folder?: string;
      limit: number;
    };
    const assets = await fileAssetService.listAssets({
      scope: 'platform',
      type: queryParams.type,
      folder: queryParams.folder,
      limit: queryParams.limit,
    });
    res.status(200).json({ data: assets });
  }),
);

router.post(
  '/assets',
  validate(registerAssetSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const asset = await fileAssetService.registerAsset({
      scope: 'platform',
      purpose: req.body.purpose,
      url: req.body.url,
      file_key: req.body.file_key,
      bucket: req.body.bucket,
      filename: req.body.filename,
      content_type: req.body.content_type,
      file_size: req.body.file_size ?? null,
      owner_user_id: req.user!.id,
      store_id: null,
      metadata: req.body.metadata,
    });
    res.status(201).json({ asset });
  }),
);

// =====================================================
// Marketplace Categories
// =====================================================

const categorySchema = z.object({
  name: z.string().min(2).max(120),
  name_fr: z.string().max(255).nullable().optional(),
  name_ar: z.string().max(255).nullable().optional(),
  name_en: z.string().max(255).nullable().optional(),
  parent_id: z.string().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  description_fr: z.string().max(1000).nullable().optional(),
  description_ar: z.string().max(1000).nullable().optional(),
  description_en: z.string().max(1000).nullable().optional(),
  short_description: z.string().max(255).nullable().optional(),
  long_description: z.string().max(5000).nullable().optional(),
  image_url: z.string().nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
  banner_url: z.string().nullable().optional(),
  seo_title: z.string().max(255).nullable().optional(),
  seo_description: z.string().max(2000).nullable().optional(),
  position: z.number().int().optional(),
  show_in_megamenu: z.boolean().optional(),
});

const updateCategorySchema = categorySchema.partial().extend({
  is_active: z.boolean().optional(),
});

router.get(
  '/marketplace-categories',
  asyncHandler(async (req: Request, res: Response) => {
    const isTree = req.query.tree === 'true';
    const categories = (await categoryService.listMarketplaceCategories({ tree: isTree })).map(
      (category) => ({
        ...category,
        product_count: parseInt(category.product_count || '0', 10),
      }),
    );
    res.status(200).json({ data: categories });
  }),
);

router.post(
  '/marketplace-categories',
  validate(categorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.createMarketplaceCategory(req.body);
    res.status(201).json({ category });
  }),
);

const handleUpdateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.updateMarketplaceCategory(req.params.id, req.body);
  res.status(200).json({ category });
});

const reorderCategoriesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      position: z.number().int(),
      parent_id: z.string().nullable().optional(),
    }),
  ),
});

router.put(
  '/marketplace-categories/reorder',
  validate(reorderCategoriesSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await categoryService.reorderMarketplaceCategories(req.body.items);
    res.status(200).json({ success: true });
  }),
);

router.put('/marketplace-categories/:id', validate(updateCategorySchema), handleUpdateCategory);
router.patch('/marketplace-categories/:id', validate(updateCategorySchema), handleUpdateCategory);

router.get(
  '/marketplace-categories/:id/delete-impact',
  asyncHandler(async (req: Request, res: Response) => {
    const impact = await categoryService.getMarketplaceDeleteImpact(req.params.id);
    res.status(200).json(impact);
  }),
);

router.delete(
  '/marketplace-categories/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const confirm = req.query.confirm === 'true';
    const result = await categoryService.deleteMarketplaceCategory(req.params.id, confirm);
    res.status(200).json({ success: true, ...result });
  }),
);

// =====================================================
// KYC Verification Queue
// =====================================================

const kycStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/verifications/pending',
  validate(kycStatusSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query as unknown as {
      status: VerificationStatus;
      page: number;
      limit: number;
    };
    const result = await kycService.listByStatus(status, { page, limit });
    res.status(200).json(result);
  }),
);

const approveKycSchema = z.object({
  notes: z.string().max(1000).optional(),
});

router.put(
  '/verifications/:id/approve',
  validate(approveKycSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await kycService.approve(req.params.id, req.user!.id, req.body.notes);
    logger.info({ verification_id: req.params.id, admin_id: req.user!.id }, 'Admin approved KYC');
    res.status(200).json({ success: true, message: 'Verification approved' });
  }),
);

const rejectKycSchema = z.object({
  rejection_reason: z.string().min(1).max(500),
});

router.put(
  '/verifications/:id/reject',
  validate(rejectKycSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await kycService.reject(req.params.id, req.user!.id, req.body.rejection_reason);
    logger.info({ verification_id: req.params.id, admin_id: req.user!.id }, 'Admin rejected KYC');
    res.status(200).json({ success: true, message: 'Verification rejected' });
  }),
);

// =====================================================
// Mandat Minute Validation Queue
// =====================================================

const mandatListSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/mandats/pending',
  validate(mandatListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query as unknown as {
      status: MandatStatus;
      page: number;
      limit: number;
    };
    const result = await mandatService.listByStatus(status, { page, limit });
    res.status(200).json(result);
  }),
);

router.put(
  '/mandats/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    await mandatService.approve(req.params.id, req.user!.id);
    logger.info({ proof_id: req.params.id, admin_id: req.user!.id }, 'Admin approved mandat');
    res.status(200).json({ success: true, message: 'Mandat approved' });
  }),
);

const rejectMandatSchema = z.object({
  rejection_reason: z.string().min(1).max(500),
});

router.put(
  '/mandats/:id/reject',
  validate(rejectMandatSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await mandatService.reject(req.params.id, req.user!.id, req.body.rejection_reason);
    logger.info({ proof_id: req.params.id, admin_id: req.user!.id }, 'Admin rejected mandat');
    res.status(200).json({ success: true, message: 'Mandat rejected' });
  }),
);

// =====================================================
// Reports Management
// =====================================================

const reportListSchema = z.object({
  status: z
    .enum(['open', 'investigating', 'awaiting_buyer', 'awaiting_seller', 'resolved', 'dismissed'])
    .optional(),
  target_type: z.enum(['seller', 'buyer']).optional(),
  source: z.enum(['buyer', 'admin']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  search: z.string().max(120).optional(),
  store_id: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/reports',
  validate(reportListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, target_type, source, priority, search, store_id, page, limit } =
      req.query as unknown as {
        status?: ReportStatus;
        target_type?: ReportTargetType;
        source?: ReportSource;
        priority?: ReportPriority;
        search?: string;
        store_id?: string;
        page: number;
        limit: number;
      };
    const result = await reportService.list({
      status,
      targetType: target_type,
      source,
      priority,
      search,
      storeId: store_id,
      page,
      limit,
    });
    res.status(200).json(result);
  }),
);

const reportTargetListSchema = z.object({
  type: z.enum(['seller', 'buyer']),
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get(
  '/reports/targets',
  validate(reportTargetListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, search, limit } = req.query as unknown as {
      type: ReportTargetType;
      search?: string;
      limit: number;
    };
    const data = await reportService.listTargets(type, search, limit);
    res.status(200).json({ data });
  }),
);

const createAdminReportSchema = z.object({
  target_type: z.enum(['seller', 'buyer']),
  store_id: z.string().optional(),
  target_user_id: z.string().optional(),
  order_id: z.string().optional(),
  category: z.string().max(40).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  reason: z.string().min(10).max(2000),
  evidence_urls: z.array(z.string().url()).max(10).optional(),
  admin_notes: z.string().max(2000).optional(),
});

router.post(
  '/reports',
  validate(createAdminReportSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const report = await reportService.create({
      reporter_id: req.user!.id,
      source: ReportSource.Admin,
      target_type: req.body.target_type,
      store_id: req.body.store_id,
      target_user_id: req.body.target_user_id,
      order_id: req.body.order_id,
      category: req.body.category,
      priority: req.body.priority,
      reason: req.body.reason,
      evidence_urls: req.body.evidence_urls,
      admin_notes: req.body.admin_notes,
    });
    res.status(201).json({ report });
  }),
);

const updateReportSchema = z.object({
  status: z.enum([
    'open',
    'investigating',
    'awaiting_buyer',
    'awaiting_seller',
    'resolved',
    'dismissed',
  ]),
  admin_notes: z.string().max(2000).optional(),
});

const reportAttachmentInputSchema = z
  .object({
    file_url: z.string().url().optional(),
    file_key: z.string().min(1).max(1024).optional(),
    file_name: z.string().min(1).max(255),
    content_type: z.string().min(1).max(120),
    file_size: z
      .number()
      .int()
      .min(0)
      .max(20 * 1024 * 1024)
      .optional(),
  })
  .refine((value) => value.file_url || value.file_key, {
    message: 'Either file_url or file_key is required',
  });

const createReportMessageSchema = z.object({
  visibility: z.enum(['buyer_admin', 'seller_admin', 'all_parties', 'admin_internal']),
  body: z.string().min(1).max(5000),
  attachments: z.array(reportAttachmentInputSchema).max(10).optional(),
});

router.get(
  '/reports/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await reportService.getAdminCase(req.params.id);
    res.status(200).json(data);
  }),
);

router.post(
  '/reports/:id/messages',
  validate(createReportMessageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await reportService.addAdminMessage(
      req.params.id,
      { id: req.user!.id, role: req.user!.role },
      req.body.body,
      req.body.visibility as ReportMessageVisibility,
      req.body.attachments,
    );
    res.status(201).json(data);
  }),
);

router.put(
  '/reports/:id/status',
  validate(updateReportSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const report = await reportService.updateStatus(
      req.params.id,
      req.body.status,
      req.user!.id,
      req.body.admin_notes,
    );
    res.status(200).json({ report });
  }),
);

const buyerEnforcementSchema = z.object({
  reason: z.string().max(500).optional(),
});

router.put(
  '/buyers/:id/suspend',
  validate(buyerEnforcementSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string; role: string; is_active: boolean }>(
      `UPDATE pd_user
       SET is_active = false,
           updated_at = NOW()
       WHERE id = $1 AND role = $2
       RETURNING id, email, role, is_active`,
      [req.params.id, 'customer'],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Buyer not found');
    }
    logger.warn(
      { buyer_id: req.params.id, admin_id: req.user!.id, reason: req.body.reason },
      'Admin suspended buyer',
    );
    res.status(200).json({ success: true, user: rows[0] });
  }),
);

router.put(
  '/buyers/:id/reactivate',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string; role: string; is_active: boolean }>(
      `UPDATE pd_user
       SET is_active = true,
           updated_at = NOW()
       WHERE id = $1 AND role = $2
       RETURNING id, email, role, is_active`,
      [req.params.id, 'customer'],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Buyer not found');
    }
    logger.info({ buyer_id: req.params.id, admin_id: req.user!.id }, 'Admin reactivated buyer');
    res.status(200).json({ success: true, user: rows[0] });
  }),
);

// =====================================================
// Product Approval Queue (unverified vendors)
// =====================================================

const productListSchema = z.object({
  status: z
    .enum(['pending_approval', 'published', 'rejected'])
    .optional()
    .default('pending_approval'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/products/pending',
  validate(productListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query as unknown as {
      status: string;
      page: number;
      limit: number;
    };
    const offset = (page - 1) * limit;
    const { rows } = await query<{
      id: string;
      title: string;
      status: string;
      store_id: string;
      store_name: string;
      created_at: Date;
    }>(
      `SELECT p.id, p.title, p.status, p.store_id, s.name AS store_name, p.created_at
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       WHERE p.status = $1
       ORDER BY p.created_at ASC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    );
    const { rows: countRows } = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM pd_product WHERE status = $1',
      [status],
    );
    const total = parseInt(countRows[0].count, 10);
    res
      .status(200)
      .json({ data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } });
  }),
);

router.put(
  '/products/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.approve(req.params.id);
    logger.info({ product_id: req.params.id, admin_id: req.user!.id }, 'Admin approved product');
    res.status(200).json({ success: true, product });
  }),
);

const rejectProductSchema = z.object({
  reason: z.string().min(1).max(500),
});

router.put(
  '/products/:id/reject',
  validate(rejectProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.reject(req.params.id, req.body.reason);
    logger.info({ product_id: req.params.id, admin_id: req.user!.id }, 'Admin rejected product');
    res.status(200).json({ success: true, product });
  }),
);

// =====================================================
// Vendor Management
// =====================================================

const vendorListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  owner_id: z.string().max(80).optional(),
  status: z.nativeEnum(StoreStatus).optional(),
  verified_only: z.coerce.boolean().optional(),
  seller_type: z.nativeEnum(SellerType).optional(),
  pending_seller_type_request: z.coerce.boolean().optional(),
});

const vendorAccountListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  multi_store_only: z.coerce.boolean().optional(),
});

const buyerListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  email_verified: z.enum(['true', 'false']).optional(),
  has_orders: z.enum(['true', 'false']).optional(),
});

const updateVendorSellerTypeSchema = z.object({
  seller_type: z.nativeEnum(SellerType),
});

const rejectSellerTypeRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});

const vendorOwnerActionSchema = z.object({
  reason: z.string().max(500).optional(),
});

const updateVendorSubscriptionSchema = z.object({
  subscription_plan: z.string().transform((value) => normalizePlanId(value)),
  subscription_type: z.nativeEnum(SubscriptionType).default(SubscriptionType.Commission),
  subscription_expires_at: z.string().datetime().nullable().optional(),
});

router.get(
  '/vendor-accounts',
  validate(vendorAccountListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, multi_store_only } = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
      multi_store_only?: boolean;
    };
    const result = await storeService.listVendorAccountsForAdmin({
      page,
      limit,
      search,
      multiStoreOnly: multi_store_only,
    });
    res.status(200).json(result);
  }),
);

router.put(
  '/vendor-accounts/:id/suspend',
  validate(vendorOwnerActionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null }>(
      `UPDATE pd_user
       SET is_active = false,
           updated_at = NOW()
       WHERE id = $1
         AND role = $2
       RETURNING id, email`,
      [req.params.id, 'vendor'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Vendor account not found');
    await authService.logout(rows[0].id);
    logger.warn(
      { owner_id: rows[0].id, admin_id: req.user!.id, reason: req.body.reason },
      'Admin suspended vendor account',
    );
    res.status(200).json({ success: true, owner: rows[0] });
  }),
);

router.put(
  '/vendor-accounts/:id/reactivate',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null }>(
      `UPDATE pd_user
       SET is_active = true,
           updated_at = NOW()
       WHERE id = $1
         AND role = $2
       RETURNING id, email`,
      [req.params.id, 'vendor'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Vendor account not found');
    logger.info(
      { owner_id: rows[0].id, admin_id: req.user!.id },
      'Admin reactivated vendor account',
    );
    res.status(200).json({ success: true, owner: rows[0] });
  }),
);

router.put(
  '/vendor-accounts/:id/reset-2fa',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null }>(
      'SELECT id, email FROM pd_user WHERE id = $1 AND role = $2',
      [req.params.id, 'vendor'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Vendor account not found');
    await authService.resetTwoFactorForUser(rows[0].id);
    logger.warn({ owner_id: rows[0].id, admin_id: req.user!.id }, 'Admin reset vendor account 2FA');
    res.status(200).json({ success: true, owner: rows[0] });
  }),
);

router.get(
  '/buyers',
  validate(buyerListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, status, email_verified, has_orders } = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
      status?: 'active' | 'inactive';
      email_verified?: 'true' | 'false';
      has_orders?: 'true' | 'false';
    };
    const result = await storeService.listBuyersForAdmin({
      page,
      limit,
      search,
      status,
      emailVerified: email_verified === undefined ? undefined : email_verified === 'true',
      hasOrders: has_orders === undefined ? undefined : has_orders === 'true',
    });
    res.status(200).json(result);
  }),
);

router.put(
  '/buyers/:id/suspend',
  validate(vendorOwnerActionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null }>(
      `UPDATE pd_user
       SET is_active = false,
           updated_at = NOW()
       WHERE id = $1
         AND role = $2
       RETURNING id, email`,
      [req.params.id, 'customer'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Buyer account not found');
    await authService.logout(rows[0].id);
    logger.warn(
      { buyer_id: rows[0].id, admin_id: req.user!.id, reason: req.body.reason },
      'Admin suspended buyer account',
    );
    res.status(200).json({ success: true, buyer: rows[0] });
  }),
);

router.put(
  '/buyers/:id/reactivate',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null }>(
      `UPDATE pd_user
       SET is_active = true,
           updated_at = NOW()
       WHERE id = $1
         AND role = $2
       RETURNING id, email`,
      [req.params.id, 'customer'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Buyer account not found');
    logger.info(
      { buyer_id: rows[0].id, admin_id: req.user!.id },
      'Admin reactivated buyer account',
    );
    res.status(200).json({ success: true, buyer: rows[0] });
  }),
);

router.put(
  '/buyers/:id/reset-2fa',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null }>(
      'SELECT id, email FROM pd_user WHERE id = $1 AND role = $2',
      [req.params.id, 'customer'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Buyer account not found');
    await authService.resetTwoFactorForUser(rows[0].id);
    logger.warn({ buyer_id: rows[0].id, admin_id: req.user!.id }, 'Admin reset buyer account 2FA');
    res.status(200).json({ success: true, buyer: rows[0] });
  }),
);

router.put(
  '/buyers/:id/email-verification',
  validate(z.object({ email_verified: z.boolean() })),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null; email_verified: boolean }>(
      `UPDATE pd_user
       SET email_verified = $2,
           updated_at = NOW()
       WHERE id = $1
         AND role = $3
       RETURNING id, email, email_verified`,
      [req.params.id, req.body.email_verified, 'customer'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Buyer account not found');
    logger.info(
      { buyer_id: rows[0].id, admin_id: req.user!.id, email_verified: rows[0].email_verified },
      'Admin updated buyer email verification',
    );
    res.status(200).json({ success: true, buyer: rows[0] });
  }),
);

router.get(
  '/vendors',
  validate(vendorListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page,
      limit,
      search,
      owner_id,
      status,
      verified_only,
      seller_type,
      pending_seller_type_request,
    } = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
      owner_id?: string;
      status?: StoreStatus;
      verified_only?: boolean;
      seller_type?: SellerType;
      pending_seller_type_request?: boolean;
    };
    const result = await storeService.listForAdmin({
      page,
      limit,
      search,
      ownerId: owner_id,
      status,
      verifiedOnly: verified_only,
      sellerType: seller_type,
      pendingSellerTypeRequest: pending_seller_type_request,
    });
    res.status(200).json(result);
  }),
);

router.put(
  '/vendors/:id/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.verify(req.params.id);
    logger.info({ store_id: req.params.id, admin_id: req.user!.id }, 'Admin verified store');
    res.status(200).json({ success: true, store });
  }),
);

router.put(
  '/vendors/:id/reactivate',
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.reactivate(req.params.id);
    logger.info({ store_id: req.params.id, admin_id: req.user!.id }, 'Admin reactivated store');
    res.status(200).json({ success: true, store });
  }),
);

router.put(
  '/vendors/:id/seller-type',
  validate(updateVendorSellerTypeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.updateSellerType(req.params.id, req.body.seller_type);
    logger.info(
      { store_id: req.params.id, admin_id: req.user!.id, seller_type: req.body.seller_type },
      'Admin updated seller type',
    );
    res.status(200).json({ success: true, store });
  }),
);

router.put(
  '/vendors/:id/seller-type-request/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.approveSellerTypeChange(req.params.id);
    logger.info(
      { store_id: req.params.id, admin_id: req.user!.id, seller_type: store.seller_type },
      'Admin approved seller type change',
    );
    res.status(200).json({ success: true, store });
  }),
);

router.put(
  '/vendors/:id/seller-type-request/reject',
  validate(rejectSellerTypeRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.rejectSellerTypeChange(req.params.id, req.body.reason);
    logger.info(
      { store_id: req.params.id, admin_id: req.user!.id },
      'Admin rejected seller type change',
    );
    res.status(200).json({ success: true, store });
  }),
);

router.put(
  '/vendors/:id/suspend',
  asyncHandler(async (req: Request, res: Response) => {
    const reason = req.body.reason || 'Suspended by admin';
    await storeService.suspend(req.params.id, reason);
    logger.info({ store_id: req.params.id, admin_id: req.user!.id }, 'Admin suspended store');
    res.status(200).json({ success: true, message: 'Store suspended' });
  }),
);

router.put(
  '/vendors/:id/owner/suspend',
  validate(vendorOwnerActionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ owner_id: string; owner_email: string | null }>(
      `UPDATE pd_user u
       SET is_active = false,
           updated_at = NOW()
       FROM pd_store s
       WHERE s.id = $1
         AND s.owner_id = u.id
       RETURNING u.id AS owner_id, u.email AS owner_email`,
      [req.params.id],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Vendor owner not found');
    await authService.logout(rows[0].owner_id);
    logger.warn(
      {
        store_id: req.params.id,
        owner_id: rows[0].owner_id,
        admin_id: req.user!.id,
        reason: req.body.reason,
      },
      'Admin suspended vendor owner',
    );
    res.status(200).json({ success: true, owner: rows[0] });
  }),
);

router.put(
  '/vendors/:id/owner/reactivate',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ owner_id: string; owner_email: string | null }>(
      `UPDATE pd_user u
       SET is_active = true,
           updated_at = NOW()
       FROM pd_store s
       WHERE s.id = $1
         AND s.owner_id = u.id
       RETURNING u.id AS owner_id, u.email AS owner_email`,
      [req.params.id],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Vendor owner not found');
    logger.info(
      { store_id: req.params.id, owner_id: rows[0].owner_id, admin_id: req.user!.id },
      'Admin reactivated vendor owner',
    );
    res.status(200).json({ success: true, owner: rows[0] });
  }),
);

router.put(
  '/vendors/:id/owner/reset-2fa',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ owner_id: string; owner_email: string | null }>(
      `SELECT s.owner_id, u.email AS owner_email
       FROM pd_store s
       JOIN pd_user u ON u.id = s.owner_id
       WHERE s.id = $1`,
      [req.params.id],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Vendor owner not found');
    await authService.resetTwoFactorForUser(rows[0].owner_id);
    logger.warn(
      { store_id: req.params.id, owner_id: rows[0].owner_id, admin_id: req.user!.id },
      'Admin reset vendor owner 2FA',
    );
    res.status(200).json({ success: true, owner: rows[0] });
  }),
);

router.put(
  '/vendors/:id/subscription',
  validate(updateVendorSubscriptionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await subscriptionService.getLimits(req.body.subscription_plan);
    const store = await storeService.updateSubscription(
      req.params.id,
      req.body.subscription_plan,
      req.body.subscription_type,
      req.body.subscription_expires_at,
    );
    logger.info(
      { store_id: req.params.id, admin_id: req.user!.id, plan: req.body.subscription_plan },
      'Admin updated vendor subscription',
    );
    res.status(200).json({ success: true, store });
  }),
);

router.delete(
  '/vendors/:id/payment-config',
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.clearPaymentConfig(req.params.id);
    logger.warn(
      { store_id: req.params.id, admin_id: req.user!.id },
      'Admin cleared vendor payment config',
    );
    res.status(200).json({ success: true, store });
  }),
);

router.delete(
  '/vendors/:id/custom-domain',
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.clearCustomDomain(req.params.id);
    logger.warn(
      { store_id: req.params.id, admin_id: req.user!.id },
      'Admin cleared vendor custom domain',
    );
    res.status(200).json({ success: true, store });
  }),
);

// =====================================================
// Platform Statistics
// =====================================================

router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const [stores, orders, revenue, pendingKyc, pendingMandats, openReports] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM pd_store'),
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM pd_order'),
      query<{ total: string }>(
        "SELECT COALESCE(SUM(total::numeric), 0)::text AS total FROM pd_order WHERE payment_status = 'captured'",
      ),
      query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM pd_verification_documents WHERE status = 'pending'",
      ),
      query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM pd_mandat_proofs WHERE status = 'pending'",
      ),
      query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM pd_reports WHERE status IN ('open', 'investigating')",
      ),
    ]);

    res.status(200).json({
      total_stores: parseInt(stores.rows[0].count, 10),
      total_orders: parseInt(orders.rows[0].count, 10),
      total_revenue: parseFloat(revenue.rows[0].total),
      pending_kyc: parseInt(pendingKyc.rows[0].count, 10),
      pending_mandats: parseInt(pendingMandats.rows[0].count, 10),
      open_reports: parseInt(openReports.rows[0].count, 10),
    });
  }),
);

const updatePlanSchema = z.object({
  max_products: z.coerce.number().int().min(-1),
  max_images_per_product: z.coerce.number().int().min(1),
  max_page_builder_pages: z.coerce.number().int().min(-1),
  has_ai_seo: z.boolean(),
  has_image_compression: z.boolean(),
  has_custom_domain: z.boolean(),
  has_page_builder: z.boolean(),
  has_direct_payment: z.boolean(),
  has_white_label: z.boolean(),
  has_own_ai_provider: z.boolean().optional().default(false),
  commission_rate: z.coerce.number().min(0).max(100),
  ai_tokens_included: z.coerce.number().int().min(-1),
  yearly_price: z.coerce.number().min(0),
  is_enabled: z.boolean().optional().default(true),
});

const createPlanSchema = updatePlanSchema.extend({
  plan_id: z.string().transform((value) => normalizePlanId(value)),
});

const deletePlanSchema = z.object({
  replacement_plan_id: z
    .string()
    .optional()
    .transform((value) => (value ? normalizePlanId(value) : undefined)),
});

router.get(
  '/plans',
  asyncHandler(async (_req: Request, res: Response) => {
    const { rows } = await query(
      `SELECT l.*,
              COUNT(s.id)::int AS stores_count,
              COUNT(s.id) FILTER (WHERE COALESCE(s.is_verified, false) = true)::int AS verified_stores_count,
              COUNT(s.id) FILTER (WHERE s.status = 'suspended')::int AS suspended_stores_count
       FROM pd_subscription_limits l
       LEFT JOIN pd_store s ON s.subscription_plan = l.plan_id
       GROUP BY l.plan_id
       ORDER BY CASE l.plan_id
         WHEN 'free' THEN 1
         WHEN 'starter' THEN 2
         WHEN 'regular' THEN 3
         WHEN 'agency' THEN 4
         WHEN 'pro' THEN 5
         WHEN 'golden' THEN 6
         WHEN 'platinum' THEN 7
         ELSE 99
       END`,
    );
    res.status(200).json({ data: rows, plans: rows });
  }),
);

router.post(
  '/plans',
  validate(createPlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const planId = req.body.plan_id;
    const commissionRate =
      Number(req.body.commission_rate) > 1
        ? Number(req.body.commission_rate) / 100
        : Number(req.body.commission_rate);
    const { rows } = await query(
      `INSERT INTO pd_subscription_limits (
         plan_id,
         max_products,
         max_images_per_product,
         max_page_builder_pages,
         has_ai_seo,
         has_image_compression,
         has_custom_domain,
         has_page_builder,
         has_direct_payment,
         has_white_label,
         has_own_ai_provider,
         commission_rate,
         ai_tokens_included,
         yearly_price,
         is_enabled
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        planId,
        req.body.max_products,
        req.body.max_images_per_product,
        req.body.max_page_builder_pages,
        req.body.has_ai_seo,
        req.body.has_image_compression,
        req.body.has_custom_domain,
        req.body.has_page_builder,
        req.body.has_direct_payment,
        req.body.has_white_label,
        req.body.has_own_ai_provider,
        commissionRate,
        req.body.ai_tokens_included,
        req.body.yearly_price,
        req.body.is_enabled,
      ],
    );

    subscriptionService.invalidateCache();
    logger.info({ admin_id: req.user!.id, plan_id: planId }, 'Admin created subscription plan');
    res.status(201).json({ data: rows[0], plan: rows[0] });
  }),
);

router.put(
  '/plans/:planId',
  validate(updatePlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const planId = normalizePlanId(req.params.planId);
    const commissionRate =
      Number(req.body.commission_rate) > 1
        ? Number(req.body.commission_rate) / 100
        : Number(req.body.commission_rate);
    const { rows } = await query(
      `UPDATE pd_subscription_limits
       SET max_products = $2,
           max_images_per_product = $3,
           max_page_builder_pages = $4,
           has_ai_seo = $5,
           has_image_compression = $6,
           has_custom_domain = $7,
           has_page_builder = $8,
           has_direct_payment = $9,
           has_white_label = $10,
           has_own_ai_provider = $11,
           commission_rate = $12,
           ai_tokens_included = $13,
           yearly_price = $14,
           is_enabled = $15,
           updated_at = NOW()
       WHERE plan_id = $1
       RETURNING *`,
      [
        planId,
        req.body.max_products,
        req.body.max_images_per_product,
        req.body.max_page_builder_pages,
        req.body.has_ai_seo,
        req.body.has_image_compression,
        req.body.has_custom_domain,
        req.body.has_page_builder,
        req.body.has_direct_payment,
        req.body.has_white_label,
        req.body.has_own_ai_provider,
        commissionRate,
        req.body.ai_tokens_included,
        req.body.yearly_price,
        req.body.is_enabled,
      ],
    );

    if (!rows[0]) {
      res.status(404).json({ error: { message: 'Plan not found' } });
      return;
    }

    subscriptionService.invalidateCache();
    const syncedWallets = await creditsService.syncForPlan(planId, req.body.ai_tokens_included);
    logger.info(
      { admin_id: req.user!.id, plan_id: planId, synced_wallets: syncedWallets },
      'Admin updated subscription plan',
    );
    res.status(200).json({ data: rows[0], plan: rows[0] });
  }),
);

router.delete(
  '/plans/:planId',
  validate(deletePlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const planId = normalizePlanId(req.params.planId);
    if (planId === SubscriptionPlan.Free) {
      res.status(400).json({ error: { message: 'The free plan cannot be deleted' } });
      return;
    }

    const replacementPlanId = req.body.replacement_plan_id;
    if (replacementPlanId === planId) {
      res
        .status(400)
        .json({ error: { message: 'Replacement plan must be different from the deleted plan' } });
      return;
    }

    const result = await transaction(async (client) => {
      const existingPlan = await client.query<{ plan_id: string }>(
        'SELECT plan_id FROM pd_subscription_limits WHERE plan_id = $1 FOR UPDATE',
        [planId],
      );
      if (!existingPlan.rows[0]) {
        return { status: 'not_found' as const };
      }

      const storeCountResult = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM pd_store WHERE subscription_plan = $1',
        [planId],
      );
      const storeCount = parseInt(storeCountResult.rows[0]?.count ?? '0', 10);
      if (storeCount > 0 && !replacementPlanId) {
        return { status: 'replacement_required' as const, storeCount };
      }

      if (replacementPlanId) {
        const replacementPlan = await client.query<{ plan_id: string; ai_tokens_included: number }>(
          'SELECT plan_id, ai_tokens_included FROM pd_subscription_limits WHERE plan_id = $1',
          [replacementPlanId],
        );
        if (!replacementPlan.rows[0]) {
          return { status: 'replacement_not_found' as const };
        }
        const movedStores = await client.query<{ id: string }>(
          `UPDATE pd_store
           SET subscription_plan = $2,
               subscription_type = CASE WHEN $2 = $3 THEN $4 ELSE $5 END,
               subscription_expires_at = CASE WHEN $2 = $3 THEN NULL ELSE subscription_expires_at END,
               updated_at = NOW()
           WHERE subscription_plan = $1
           RETURNING id`,
          [
            planId,
            replacementPlanId,
            SubscriptionPlan.Free,
            SubscriptionType.Commission,
            SubscriptionType.Yearly,
          ],
        );
        if (movedStores.rows.length > 0) {
          await client.query(
            `UPDATE pd_vendor_credits
             SET ai_tokens = $2,
                 last_refill = NOW()
             WHERE store_id = ANY($1::text[])`,
            [movedStores.rows.map((store) => store.id), replacementPlan.rows[0].ai_tokens_included],
          );
        }
      }

      await client.query('DELETE FROM pd_subscription_limits WHERE plan_id = $1', [planId]);
      return { status: 'deleted' as const, storeCount, replacementPlanId };
    });

    if (result.status === 'not_found') {
      res.status(404).json({ error: { message: 'Plan not found' } });
      return;
    }
    if (result.status === 'replacement_required') {
      res.status(409).json({
        error: {
          message: 'This plan has stores attached. Select a replacement plan before deleting it.',
          details: { stores_count: result.storeCount },
        },
      });
      return;
    }
    if (result.status === 'replacement_not_found') {
      res.status(400).json({ error: { message: 'Replacement plan not found' } });
      return;
    }

    subscriptionService.invalidateCache();
    logger.warn(
      {
        admin_id: req.user!.id,
        plan_id: planId,
        replacement_plan_id: result.replacementPlanId ?? null,
        stores_count: result.storeCount,
      },
      'Admin deleted subscription plan',
    );
    res.status(200).json({ success: true, ...result });
  }),
);

// =====================================================
// Withdrawal / Payout Queue
// =====================================================

const withdrawalListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
});

/**
 * GET /api/pd/admin/withdrawals
 * List payout transactions across all vendors.
 */
router.get(
  '/withdrawals',
  validate(withdrawalListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, type } = req.query as unknown as {
      page: number;
      limit: number;
      type?: string;
    };
    const offset = (page - 1) * limit;
    const txType = type || 'payout';

    const { rows } = await query<{
      id: string;
      wallet_id: string;
      type: string;
      amount: string;
      balance_after: string;
      description: string | null;
      created_at: Date;
      store_id: string;
      store_name: string;
    }>(
      `SELECT t.id, t.wallet_id, t.type, t.amount::text, t.balance_after::text,
              t.description, t.created_at, w.store_id, s.name AS store_name
       FROM pd_wallet_transaction t
       JOIN pd_vendor_wallet w ON w.id = t.wallet_id
       JOIN pd_store s ON s.id = w.store_id
       WHERE t.type = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [txType, limit, offset],
    );

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_wallet_transaction WHERE type = $1`,
      [txType],
    );
    const total = parseInt(countRows[0].count, 10);

    res.status(200).json({
      data: rows.map((r) => ({
        ...r,
        amount: parseFloat(r.amount),
        balance_after: parseFloat(r.balance_after),
        created_at: r.created_at.toISOString(),
      })),
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  }),
);

// =====================================================
// Global Platform Settings
// =====================================================

const publicLinkSettingSchema = z.coerce
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value === '' || /^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value),
    'Must be a relative path or http(s) URL',
  );

const hexColorSettingSchema = z.coerce
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color like #B91C1C');
const ga4MeasurementIdSchema = z.coerce
  .string()
  .trim()
  .regex(/^(|G-[A-Z0-9]{4,20})$/, 'Must be blank or a GA4 measurement ID like G-XXXXXXXXXX');
const gtmContainerIdSchema = z.coerce
  .string()
  .trim()
  .regex(/^(|GTM-[A-Z0-9]{4,20})$/, 'Must be blank or a GTM container ID like GTM-XXXXXXX');
const metaPixelIdSchema = z.coerce
  .string()
  .trim()
  .regex(/^(|\d{5,30})$/, 'Must be blank or a numeric Meta Pixel ID');
const searchConsoleVerificationSchema = z.coerce
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{0,255}$/, 'Must contain only letters, numbers, underscores, or hyphens');
const cloudflareIdentifierSchema = z.coerce
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{0,128}$/, 'Must contain only letters, numbers, underscores, or hyphens');

const hubHomepageBlocksSchema = z.coerce
  .string()
  .trim()
  .max(40000)
  .refine((value) => {
    if (value === '') return true;
    try {
      const parsed = JSON.parse(value);
      return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }, 'Must be blank or a JSON object describing homepage blocks');

const globalSettingsSchema = z.object({
  marketplace_name: z.coerce.string().min(1).max(120).optional(),
  marketplace_tagline: z.coerce.string().max(255).optional(),
  marketplace_logo_url: z.coerce.string().max(2048).optional(),
  marketplace_logo_light_url: z.coerce.string().max(2048).optional(),
  marketplace_logo_dark_url: z.coerce.string().max(2048).optional(),
  marketplace_favicon_url: publicLinkSettingSchema.optional(),
  marketplace_og_image_url: publicLinkSettingSchema.optional(),
  marketplace_public_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_theme: z.enum(['panda', 'aliexpress', 'aliexpress2']).optional(),
  marketplace_primary_color: hexColorSettingSchema.optional(),
  marketplace_secondary_color: hexColorSettingSchema.optional(),
  marketplace_default_locale: z.enum(['fr', 'en', 'ar']).optional(),
  marketplace_supported_locales: z.coerce.string().trim().max(40).optional(),
  marketplace_rtl_enabled: z.boolean().optional(),
  marketplace_support_email: z.union([z.coerce.string().email(), z.literal('')]).optional(),
  marketplace_support_phone: z.coerce.string().max(40).optional(),
  marketplace_support_whatsapp: z.coerce.string().max(80).optional(),
  marketplace_address: z.coerce.string().max(255).optional(),
  marketplace_city: z.coerce.string().max(100).optional(),
  marketplace_country: z.coerce.string().max(100).optional(),
  marketplace_business_hours: z.coerce.string().max(255).optional(),
  marketplace_facebook_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_instagram_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_x_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_tiktok_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_youtube_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_linkedin_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_whatsapp_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_telegram_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_pinterest_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_snapchat_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_help_url: publicLinkSettingSchema.optional(),
  marketplace_terms_url: publicLinkSettingSchema.optional(),
  marketplace_privacy_url: publicLinkSettingSchema.optional(),
  marketplace_refund_url: publicLinkSettingSchema.optional(),
  marketplace_cookie_policy_url: publicLinkSettingSchema.optional(),
  marketplace_contact_url: publicLinkSettingSchema.optional(),
  catalog_featured_category_slugs: z.coerce.string().trim().max(1000).optional(),
  catalog_default_sort: z
    .enum(['newest', 'oldest', 'price_asc', 'price_desc', 'title_asc'])
    .optional(),
  hub_homepage_layout: z
    .enum(['theme_default', 'classic', 'deals', 'premium_deals', 'alibaba', 'amazon'])
    .optional(),
  hub_megamenu_style: z
    .enum(['standard', 'visual_rich', 'ultra_rich', 'ultra_rich_deep'])
    .optional(),
  hub_megamenu_lazy_loading: z.boolean().optional(),
  hub_category_page_style: z.enum(['v1_classic', 'v2_modern_showcase']).optional(),
  hub_homepage_banner_title: z.coerce.string().trim().max(160).optional(),
  hub_homepage_banner_subtitle: z.coerce.string().trim().max(320).optional(),
  hub_homepage_banner_cta_label: z.coerce.string().trim().max(80).optional(),
  hub_homepage_banner_cta_url: publicLinkSettingSchema.optional(),
  hub_homepage_banner_image_url: publicLinkSettingSchema.optional(),
  hub_homepage_blocks: hubHomepageBlocksSchema.optional(),
  hub_hero_show_category_sidebar: z.boolean().optional(),
  hub_hero_show_carousel: z.boolean().optional(),
  hub_hero_show_seller_rail: z.boolean().optional(),
  hub_hero_category_sidebar_max_items: z.coerce.number().int().min(1).max(30).optional(),
  hub_hero_carousel_max_categories: z.coerce.number().int().min(1).max(10).optional(),
  hub_hero_carousel_slides: z.coerce.string().max(10000).optional(),
  hub_hero_carousel_source_mode: z
    .enum(['hybrid', 'custom_only', 'auto_categories_only'])
    .optional(),
  hub_hero_carousel_autoplay: z.boolean().optional(),
  hub_hero_carousel_interval: z.coerce.number().int().min(2000).max(30000).optional(),
  hub_hero_carousel_transition: z.enum(['slide', 'fade', 'zoom']).optional(),
  hub_hero_carousel_dots_style: z.enum(['pill', 'circle', 'numbers', 'hidden']).optional(),
  hub_hero_carousel_show_arrows: z.boolean().optional(),
  hub_hero_seller_rail_title: z.coerce.string().trim().max(160).optional(),
  hub_hero_seller_rail_subtitle: z.coerce.string().trim().max(320).optional(),
  hub_hero_seller_rail_cta_label: z.coerce.string().trim().max(80).optional(),
  hub_hero_seller_rail_cta_url: publicLinkSettingSchema.optional(),
  hub_hero_seller_rail_badge_text: z.coerce.string().trim().max(80).optional(),
  analytics_ga4_enabled: z.boolean().optional(),
  analytics_ga4_measurement_id: ga4MeasurementIdSchema.optional(),
  analytics_gtm_enabled: z.boolean().optional(),
  analytics_gtm_container_id: gtmContainerIdSchema.optional(),
  analytics_meta_pixel_enabled: z.boolean().optional(),
  analytics_meta_pixel_id: metaPixelIdSchema.optional(),
  search_console_verification: searchConsoleVerificationSchema.optional(),
  cloudflare_integration_enabled: z.boolean().optional(),
  cloudflare_account_id: cloudflareIdentifierSchema.optional(),
  cloudflare_zone_id: cloudflareIdentifierSchema.optional(),
  cloudflare_custom_hostnames_enabled: z.boolean().optional(),
  chat_bubble_enabled: z.boolean().optional(),
  chat_bubble_position: z.enum(['bottom-right', 'bottom-left']).optional(),
  marketplace_enabled: z.boolean().optional(),
  vendor_registration_enabled: z.boolean().optional(),
  buyer_registration_enabled: z.boolean().optional(),
  product_moderation_required: z.boolean().optional(),
  product_auto_publish_verified: z.boolean().optional(),
  seller_type_change_auto_approval: z.boolean().optional(),
  reviews_enabled: z.boolean().optional(),
  review_auto_publish: z.boolean().optional(),
  wishlist_enabled: z.boolean().optional(),
  ai_tools_enabled: z.boolean().optional(),
  page_builder_enabled: z.boolean().optional(),
  plugins_marketplace_enabled: z.boolean().optional(),
  email_marketing_enabled: z.boolean().optional(),
  cart_enabled: z.boolean().optional(),
  shipping_enabled: z.boolean().optional(),
  shipping_self_managed_enabled: z.boolean().optional(),
  shipping_platform_unified_enabled: z.boolean().optional(),
  shipping_default_provider: z.enum(['auto', 'aramex', 'laposte', 'platform']).optional(),
  shipping_aramex_enabled: z.boolean().optional(),
  shipping_laposte_enabled: z.boolean().optional(),
  shipping_platform_fallback_enabled: z.boolean().optional(),
  shipping_default_origin_city: z.coerce.string().trim().min(1).max(100).optional(),
  shipping_default_origin_country: z.coerce.string().trim().min(2).max(2).optional(),
  shipping_domestic_zone_cities: z.coerce.string().trim().max(2000).optional(),
  shipping_remote_zone_cities: z.coerce.string().trim().max(2000).optional(),
  shipping_platform_flat_rate_tnd: z.coerce.number().min(0).max(1000).optional(),
  shipping_domestic_zone_rate_tnd: z.coerce.number().min(0).max(1000).optional(),
  shipping_remote_zone_rate_tnd: z.coerce.number().min(0).max(1000).optional(),
  shipping_free_shipping_threshold_tnd: z.coerce.number().min(0).max(100000).optional(),
  order_splitting_enabled: z.boolean().optional(),
  tax_mode: z.enum(['none', 'included', 'exclusive']).optional(),
  default_tax_rate: z.coerce.number().min(0).max(100).optional(),
  price_rounding_mode: z
    .enum(['none', 'nearest_0_001', 'nearest_0_010', 'nearest_0_100'])
    .optional(),
  auto_cancel_unpaid_enabled: z.boolean().optional(),
  auto_cancel_unpaid_minutes: z.coerce.number().int().min(5).max(10080).optional(),
  retention_days_flouci: z.coerce.number().int().min(1).max(90).optional(),
  retention_days_konnect: z.coerce.number().int().min(1).max(90).optional(),
  retention_days_mandat: z.coerce.number().int().min(1).max(90).optional(),
  retention_days_cod: z.coerce.number().int().min(1).max(90).optional(),
  payout_schedule: z.enum(['manual', 'daily', 'weekly', 'biweekly', 'monthly']).optional(),
  min_withdrawal_tnd: z.coerce.number().min(1).optional(),
  platform_commission_rate: z.coerce.number().min(0).max(100).optional(),
  default_currency: z.string().min(3).max(3).optional(),
  payment_sandbox_mode: z.boolean().optional(),
  payment_flouci_enabled: z.boolean().optional(),
  payment_konnect_enabled: z.boolean().optional(),
  payment_paypal_enabled: z.boolean().optional(),
  payment_paypal_mode: z.enum(['sandbox', 'live']).optional(),
  payment_paypal_sandbox_client_id: z.coerce.string().max(500).optional(),
  payment_paypal_sandbox_client_secret: z.coerce.string().max(500).optional(),
  payment_paypal_sandbox_webhook_id: z.coerce.string().max(500).optional(),
  payment_paypal_live_client_id: z.coerce.string().max(500).optional(),
  payment_paypal_live_client_secret: z.coerce.string().max(500).optional(),
  payment_paypal_live_webhook_id: z.coerce.string().max(500).optional(),
  payment_paypal_currency: z.coerce.string().max(10).optional(),
  payment_paypal_fx_rate_tnd_to_target: z.coerce.number().min(0.0001).max(1000).optional(),
  payment_mandat_enabled: z.boolean().optional(),
  payment_cod_enabled: z.boolean().optional(),
  payment_vendor_direct_enabled: z.boolean().optional(),
  payment_platform_credentials_source: z
    .enum(['environment', 'platform_config', 'vendor_direct_only'])
    .optional(),
  mandat_recipient_name: z.coerce.string().max(200).optional(),
  mandat_recipient_cin: z.coerce.string().max(20).optional(),
  mandat_recipient_city: z.coerce.string().max(100).optional(),
  mandat_proof_email: z.coerce.string().email().optional(),
  max_upload_size_mb: z.coerce.number().int().min(1).max(100).optional(),
  max_product_images: z.coerce.number().int().min(1).max(50).optional(),
  max_products_per_store_free: z.coerce.number().int().min(1).max(10000).optional(),
  default_low_stock_threshold: z.coerce.number().int().min(0).max(1000).optional(),
  chat_message_rate_limit_per_minute: z.coerce.number().int().min(1).max(300).optional(),
  chat_max_images_per_message: z.coerce.number().int().min(1).max(10).optional(),
  chat_max_image_size_mb: z.coerce.number().int().min(1).max(25).optional(),
  chat_max_message_length: z.coerce.number().int().min(1).max(5000).optional(),
  notifications_in_app_enabled: z.boolean().optional(),
  notifications_realtime_enabled: z.boolean().optional(),
  notifications_email_enabled: z.boolean().optional(),
  notifications_sms_enabled: z.boolean().optional(),
  notifications_sms_provider: z.enum(['environment', 'console', 'twilio', 'infobip']).optional(),
  notifications_sms_sender_name: z.coerce.string().trim().min(1).max(30).optional(),
  security_login_max_attempts: z.coerce.number().int().min(3).max(20).optional(),
  security_login_lockout_minutes: z.coerce.number().int().min(1).max(1440).optional(),
  security_password_min_length: z.coerce.number().int().min(8).max(72).optional(),
  security_password_require_uppercase: z.boolean().optional(),
  security_password_require_lowercase: z.boolean().optional(),
  security_password_require_number: z.boolean().optional(),
  security_password_require_symbol: z.boolean().optional(),
  security_2fa_required_roles: z.coerce.string().trim().max(120).optional(),
  security_custom_domains_enabled: z.boolean().optional(),
  security_custom_domain_allowed_suffixes: z.coerce.string().trim().max(1000).optional(),
  security_custom_domain_blocked_suffixes: z.coerce.string().trim().max(1000).optional(),
  maintenance_enabled: z.boolean().optional(),
  maintenance_title: z.coerce.string().max(200).optional(),
  maintenance_message: z.coerce.string().max(2000).optional(),
  maintenance_illustration_url: publicLinkSettingSchema.optional(),
  maintenance_eta: z.coerce.string().max(100).optional(),
  maintenance_allowed_ips: z.coerce.string().max(2000).optional(),
  maintenance_block_storefronts: z.boolean().optional(),
});

const marketplaceSettingsSchema = globalSettingsSchema
  .pick({
    marketplace_name: true,
    marketplace_tagline: true,
    marketplace_logo_url: true,
    marketplace_logo_light_url: true,
    marketplace_logo_dark_url: true,
    marketplace_favicon_url: true,
    marketplace_og_image_url: true,
    marketplace_public_url: true,
    marketplace_theme: true,
    marketplace_primary_color: true,
    marketplace_secondary_color: true,
    marketplace_default_locale: true,
    marketplace_supported_locales: true,
    marketplace_rtl_enabled: true,
    marketplace_support_email: true,
    marketplace_support_phone: true,
    marketplace_support_whatsapp: true,
    marketplace_address: true,
    marketplace_city: true,
    marketplace_country: true,
    marketplace_business_hours: true,
    marketplace_facebook_url: true,
    marketplace_instagram_url: true,
    marketplace_x_url: true,
    marketplace_tiktok_url: true,
    marketplace_youtube_url: true,
    marketplace_linkedin_url: true,
    marketplace_whatsapp_url: true,
    marketplace_telegram_url: true,
    marketplace_pinterest_url: true,
    marketplace_snapchat_url: true,
    marketplace_help_url: true,
    marketplace_terms_url: true,
    marketplace_privacy_url: true,
    marketplace_refund_url: true,
    marketplace_cookie_policy_url: true,
    marketplace_contact_url: true,
    catalog_featured_category_slugs: true,
    catalog_default_sort: true,
    hub_homepage_layout: true,
    hub_megamenu_style: true,
    hub_megamenu_lazy_loading: true,
    hub_category_page_style: true,
    hub_homepage_banner_title: true,
    hub_homepage_banner_subtitle: true,
    hub_homepage_banner_cta_label: true,
    hub_homepage_banner_cta_url: true,
    hub_homepage_banner_image_url: true,
    hub_homepage_blocks: true,
    hub_hero_show_category_sidebar: true,
    hub_hero_show_carousel: true,
    hub_hero_show_seller_rail: true,
    hub_hero_category_sidebar_max_items: true,
    hub_hero_carousel_max_categories: true,
    hub_hero_carousel_slides: true,
    hub_hero_carousel_source_mode: true,
    hub_hero_carousel_autoplay: true,
    hub_hero_carousel_interval: true,
    hub_hero_carousel_transition: true,
    hub_hero_carousel_dots_style: true,
    hub_hero_carousel_show_arrows: true,
    hub_hero_seller_rail_title: true,
    hub_hero_seller_rail_subtitle: true,
    hub_hero_seller_rail_cta_label: true,
    hub_hero_seller_rail_cta_url: true,
    hub_hero_seller_rail_badge_text: true,
  })
  .strict();

const commerceSettingsSchema = globalSettingsSchema
  .pick({
    marketplace_enabled: true,
    vendor_registration_enabled: true,
    buyer_registration_enabled: true,
    product_moderation_required: true,
    product_auto_publish_verified: true,
    seller_type_change_auto_approval: true,
    reviews_enabled: true,
    review_auto_publish: true,
    wishlist_enabled: true,
    ai_tools_enabled: true,
    page_builder_enabled: true,
    plugins_marketplace_enabled: true,
    email_marketing_enabled: true,
    cart_enabled: true,
    shipping_enabled: true,
    shipping_self_managed_enabled: true,
    shipping_platform_unified_enabled: true,
    shipping_default_provider: true,
    shipping_aramex_enabled: true,
    shipping_laposte_enabled: true,
    shipping_platform_fallback_enabled: true,
    shipping_default_origin_city: true,
    shipping_default_origin_country: true,
    shipping_domestic_zone_cities: true,
    shipping_remote_zone_cities: true,
    shipping_platform_flat_rate_tnd: true,
    shipping_domestic_zone_rate_tnd: true,
    shipping_remote_zone_rate_tnd: true,
    shipping_free_shipping_threshold_tnd: true,
    order_splitting_enabled: true,
    tax_mode: true,
    default_tax_rate: true,
    price_rounding_mode: true,
    auto_cancel_unpaid_enabled: true,
    auto_cancel_unpaid_minutes: true,
  })
  .strict();

const financeSettingsSchema = globalSettingsSchema
  .pick({
    retention_days_flouci: true,
    retention_days_konnect: true,
    retention_days_mandat: true,
    retention_days_cod: true,
    payout_schedule: true,
    min_withdrawal_tnd: true,
    platform_commission_rate: true,
    default_currency: true,
    payment_sandbox_mode: true,
    payment_flouci_enabled: true,
    payment_konnect_enabled: true,
    payment_paypal_enabled: true,
    payment_paypal_mode: true,
    payment_paypal_sandbox_client_id: true,
    payment_paypal_sandbox_client_secret: true,
    payment_paypal_sandbox_webhook_id: true,
    payment_paypal_live_client_id: true,
    payment_paypal_live_client_secret: true,
    payment_paypal_live_webhook_id: true,
    payment_paypal_currency: true,
    payment_paypal_fx_rate_tnd_to_target: true,
    payment_mandat_enabled: true,
    payment_cod_enabled: true,
    payment_vendor_direct_enabled: true,
    payment_platform_credentials_source: true,
    mandat_recipient_name: true,
    mandat_recipient_cin: true,
    mandat_recipient_city: true,
    mandat_proof_email: true,
  })
  .strict();

const operationsSettingsSchema = globalSettingsSchema
  .pick({
    chat_bubble_enabled: true,
    chat_bubble_position: true,
    max_upload_size_mb: true,
    max_product_images: true,
    max_products_per_store_free: true,
    default_low_stock_threshold: true,
    chat_message_rate_limit_per_minute: true,
    chat_max_images_per_message: true,
    chat_max_image_size_mb: true,
    chat_max_message_length: true,
    notifications_in_app_enabled: true,
    notifications_realtime_enabled: true,
    notifications_email_enabled: true,
    notifications_sms_enabled: true,
    notifications_sms_provider: true,
    notifications_sms_sender_name: true,
    security_login_max_attempts: true,
    security_login_lockout_minutes: true,
    security_password_min_length: true,
    security_password_require_uppercase: true,
    security_password_require_lowercase: true,
    security_password_require_number: true,
    security_password_require_symbol: true,
    security_2fa_required_roles: true,
    security_custom_domains_enabled: true,
    security_custom_domain_allowed_suffixes: true,
    security_custom_domain_blocked_suffixes: true,
    maintenance_enabled: true,
    maintenance_title: true,
    maintenance_message: true,
    maintenance_illustration_url: true,
    maintenance_eta: true,
    maintenance_allowed_ips: true,
    maintenance_block_storefronts: true,
  })
  .strict();

const integrationsSettingsSchema = globalSettingsSchema
  .pick({
    analytics_ga4_enabled: true,
    analytics_ga4_measurement_id: true,
    analytics_gtm_enabled: true,
    analytics_gtm_container_id: true,
    analytics_meta_pixel_enabled: true,
    analytics_meta_pixel_id: true,
    search_console_verification: true,
    cloudflare_integration_enabled: true,
    cloudflare_account_id: true,
    cloudflare_zone_id: true,
    cloudflare_custom_hostnames_enabled: true,
  })
  .strict();

const shippingSettingsSchema = globalSettingsSchema
  .pick({
    shipping_enabled: true,
    shipping_self_managed_enabled: true,
    shipping_platform_unified_enabled: true,
    shipping_default_provider: true,
    shipping_aramex_enabled: true,
    shipping_laposte_enabled: true,
    shipping_platform_fallback_enabled: true,
    shipping_default_origin_city: true,
    shipping_default_origin_country: true,
    shipping_domestic_zone_cities: true,
    shipping_remote_zone_cities: true,
    shipping_platform_flat_rate_tnd: true,
    shipping_domestic_zone_rate_tnd: true,
    shipping_remote_zone_rate_tnd: true,
    shipping_free_shipping_threshold_tnd: true,
  })
  .strict();

const securitySettingsSchema = globalSettingsSchema
  .pick({
    security_login_max_attempts: true,
    security_login_lockout_minutes: true,
    security_password_min_length: true,
    security_password_require_uppercase: true,
    security_password_require_lowercase: true,
    security_password_require_number: true,
    security_password_require_symbol: true,
    security_2fa_required_roles: true,
    security_custom_domains_enabled: true,
    security_custom_domain_allowed_suffixes: true,
    security_custom_domain_blocked_suffixes: true,
  })
  .strict();

const settingsSectionParamSchema = z.object({
  section: z.enum([
    'marketplace',
    'commerce',
    'finance',
    'shipping',
    'security',
    'operations',
    'integrations',
  ]),
});

const settingsSectionSchemas: Record<PlatformSettingSection, z.ZodTypeAny> = {
  marketplace: marketplaceSettingsSchema,
  commerce: commerceSettingsSchema,
  finance: financeSettingsSchema,
  shipping: shippingSettingsSchema,
  security: securitySettingsSchema,
  operations: operationsSettingsSchema,
  integrations: integrationsSettingsSchema,
};

/**
 * GET /admin/settings — Retrieve current platform settings.
 * Settings are stored in pd_platform_config (key-value).
 * Falls back to defaults from config.ts if not set.
 */
router.get(
  '/settings',
  asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json(await platformConfigService.getGroupedSettings());
  }),
);

/**
 * PUT /admin/settings — Update platform settings.
 * Upserts each key-value pair into pd_platform_config.
 */
router.put(
  '/settings',
  validate(globalSettingsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const updatedKeys = await platformConfigService.updateSettings(
      req.body as Partial<Record<PlatformSettingKey, PlatformSettingValue>>,
      req.user!.id,
    );

    logger.info({ admin_id: req.user!.id, keys: updatedKeys }, 'Admin updated platform settings');

    if (updatedKeys.some((key) => key.startsWith('maintenance_'))) {
      invalidateMaintenanceCache();
    }

    res.status(200).json({
      success: true,
      message: 'Settings updated',
      updated_keys: updatedKeys,
      ...(await platformConfigService.getGroupedSettings()),
    });
  }),
);

router.put(
  '/settings/:section',
  validate(settingsSectionParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { section } = req.params as { section: PlatformSettingSection };
    const parsedResult = settingsSectionSchemas[section].safeParse(req.body);
    if (!parsedResult.success) {
      res.status(400).json({
        error: {
          code: 'PD_VALIDATION_ERROR',
          message: 'Invalid settings payload',
          details: parsedResult.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
      return;
    }
    const parsed = parsedResult.data as Partial<Record<PlatformSettingKey, PlatformSettingValue>>;
    const updatedKeys = await platformConfigService.updateSectionSettings(
      section,
      parsed,
      req.user!.id,
    );

    logger.info(
      { admin_id: req.user!.id, section, keys: updatedKeys },
      'Admin updated platform settings section',
    );

    if (updatedKeys.some((key) => key.startsWith('maintenance_'))) {
      invalidateMaintenanceCache();
    }

    res.status(200).json({
      success: true,
      message: 'Settings section updated',
      section,
      updated_keys: updatedKeys,
      ...(await platformConfigService.getGroupedSettings()),
    });
  }),
);

// =====================================================
// Audit Log Viewer
// =====================================================

const auditLogListSchema = z.object({
  log_type: z.enum(['admin', 'seller', 'buyer']).optional().default('admin'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.string().trim().max(160).optional(),
  resource_type: z.string().trim().max(80).optional(),
  actor_role: z.string().trim().max(40).optional(),
  method: z.string().trim().max(12).optional(),
  status_code: z.coerce.number().int().min(100).max(599).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().max(200).optional(),
});

const auditLogSummarySchema = auditLogListSchema.omit({ page: true, limit: true });

type AuditLogFilters = {
  log_type?: 'admin' | 'seller' | 'buyer';
  action?: string;
  resource_type?: string;
  actor_role?: string;
  method?: string;
  status_code?: number;
  from?: Date;
  to?: Date;
  search?: string;
};

function buildAuditLogWhere(filters: AuditLogFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  const statusExpr =
    "CASE WHEN a.metadata->>'status_code' ~ '^[0-9]+$' THEN (a.metadata->>'status_code')::int ELSE NULL END";
  const methodExpr = "UPPER(COALESCE(a.metadata->>'method', split_part(a.action, ' ', 1)))";

  if (filters.log_type === 'buyer') {
    conditions.push(`a.actor_role = 'customer'`);
  } else if (filters.log_type === 'seller') {
    conditions.push(`a.actor_role = 'vendor'`);
  } else {
    conditions.push(`a.actor_role IN ('admin', 'super_admin')`);
  }

  if (filters.action) {
    conditions.push(`a.action = $${paramIdx++}`);
    params.push(filters.action);
  }
  if (filters.resource_type) {
    conditions.push(`a.resource_type = $${paramIdx++}`);
    params.push(filters.resource_type);
  }
  if (filters.actor_role) {
    conditions.push(`a.actor_role = $${paramIdx++}`);
    params.push(filters.actor_role);
  }
  if (filters.method) {
    conditions.push(`${methodExpr} = $${paramIdx++}`);
    params.push(filters.method.toUpperCase());
  }
  if (filters.status_code) {
    conditions.push(`${statusExpr} = $${paramIdx++}`);
    params.push(filters.status_code);
  }
  if (filters.from) {
    conditions.push(`a.created_at >= $${paramIdx++}`);
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`a.created_at <= $${paramIdx++}`);
    params.push(filters.to);
  }
  if (filters.search) {
    conditions.push(`(
      a.action ILIKE $${paramIdx}
      OR a.resource_type ILIKE $${paramIdx}
      OR a.resource_id ILIKE $${paramIdx}
      OR a.actor_id ILIKE $${paramIdx}
      OR a.actor_role ILIKE $${paramIdx}
      OR u.email ILIKE $${paramIdx}
      OR a.ip::text ILIKE $${paramIdx}
      OR a.metadata::text ILIKE $${paramIdx}
    )`);
    params.push(`%${filters.search}%`);
    paramIdx++;
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
    nextParamIdx: paramIdx,
    statusExpr,
    methodExpr,
  };
}

const systemLogListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).optional(),
  event_type: z.string().max(80).optional(),
  source: z.string().max(80).optional(),
  status_code: z.coerce.number().int().min(100).max(599).optional(),
  request_id: z.string().max(64).optional(),
  has_stack: z.coerce.boolean().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().max(200).optional(),
});

const systemLogCreateSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  source: z.string().trim().min(1).max(80).default('admin'),
  event_type: z.string().trim().min(1).max(80).default('admin_manual_log'),
  message: z.string().trim().min(3).max(4000),
  path: z.string().trim().max(2000).optional(),
  status_code: z.number().int().min(100).max(599).nullable().optional(),
  error_name: z.string().trim().max(120).optional(),
  error_code: z.string().trim().max(120).optional(),
  stack: z.string().trim().max(12000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const systemLogClearFilterSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).optional(),
  event_type: z.string().max(80).optional(),
  source: z.string().max(80).optional(),
  status_code: z.number().int().min(100).max(599).optional(),
  request_id: z.string().max(64).optional(),
  has_stack: z.boolean().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().max(200).optional(),
});

const systemLogClearSchema = z
  .object({
    confirm: z.literal('CLEAR LOGS'),
    ids: z.array(z.string().min(1).max(64)).max(1000).optional(),
    older_than_days: z.number().int().min(1).max(3650).optional(),
    clear_all: z.boolean().optional(),
    filters: systemLogClearFilterSchema.optional(),
  })
  .refine(
    (value) =>
      value.clear_all === true ||
      Boolean(value.older_than_days) ||
      Boolean(value.ids?.length) ||
      Boolean(
        value.filters &&
        Object.values(value.filters).some(
          (filterValue) => filterValue !== undefined && filterValue !== '',
        ),
      ),
    { message: 'Provide logs to clear, an age limit, filters, or clear_all=true' },
  );

const systemLogParamSchema = z.object({
  id: z.string().min(1).max(64),
});

router.get(
  '/system-logs/summary',
  asyncHandler(async (_req: Request, res: Response) => {
    const summary = await systemLogService.summary();
    res.status(200).json({ summary });
  }),
);

router.get(
  '/system-logs',
  validate(systemLogListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page,
      limit,
      level,
      event_type,
      source,
      status_code,
      request_id,
      has_stack,
      from,
      to,
      search,
    } = req.query as unknown as {
      page: number;
      limit: number;
      level?: string;
      event_type?: string;
      source?: string;
      status_code?: number;
      request_id?: string;
      has_stack?: boolean;
      from?: Date;
      to?: Date;
      search?: string;
    };
    const result = await systemLogService.list({
      page,
      limit,
      level,
      eventType: event_type,
      source,
      statusCode: status_code,
      requestId: request_id,
      hasStack: has_stack,
      from,
      to,
      search,
    });
    res.status(200).json({
      data: result.data.map((entry) => ({
        ...entry,
        created_at: entry.created_at.toISOString(),
      })),
      meta: result.meta,
    });
  }),
);

router.post(
  '/system-logs',
  validate(systemLogCreateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof systemLogCreateSchema>;
    const log = await systemLogService.create({
      level: body.level,
      source: body.source,
      event_type: body.event_type,
      message: body.message,
      request_id: req.requestId,
      method: 'ADMIN',
      path: body.path || req.originalUrl,
      status_code: body.status_code ?? null,
      user_id: req.user?.id ?? null,
      user_role: req.user?.role ?? null,
      ip: req.ip ?? null,
      user_agent: req.headers['user-agent'] ?? null,
      error_name: body.error_name || null,
      error_code: body.error_code || null,
      stack: body.stack || null,
      metadata: {
        ...(body.metadata ?? {}),
        created_by: 'superadmin_dashboard',
      },
    });
    res.status(201).json({
      data: {
        ...log,
        created_at: log.created_at.toISOString(),
      },
    });
  }),
);

router.post(
  '/system-logs/clear',
  validate(systemLogClearSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof systemLogClearSchema>;
    const deleted = await systemLogService.clear({
      ids: body.ids,
      olderThanDays: body.older_than_days,
      clearAll: body.clear_all,
      level: body.filters?.level,
      eventType: body.filters?.event_type,
      source: body.filters?.source,
      statusCode: body.filters?.status_code,
      requestId: body.filters?.request_id,
      hasStack: body.filters?.has_stack,
      from: body.filters?.from,
      to: body.filters?.to,
      search: body.filters?.search,
    });
    res.status(200).json({ deleted });
  }),
);

router.delete(
  '/system-logs/:id',
  validate(systemLogParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const deleted = await systemLogService.deleteById(id);
    res.status(200).json({ deleted });
  }),
);

router.get(
  '/audit-log/summary',
  validate(auditLogSummarySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as unknown as AuditLogFilters;
    const { whereClause, params, statusExpr, methodExpr } = buildAuditLogWhere(filters);

    const { rows: summaryRows } = await query<{
      total: string;
      last_24h: string;
      failed: string;
      actors: string;
      writes: string;
    }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE a.created_at >= NOW() - INTERVAL '24 hours')::text AS last_24h,
              COUNT(*) FILTER (WHERE ${statusExpr} >= 400)::text AS failed,
              COUNT(DISTINCT a.actor_id)::text AS actors,
              COUNT(*) FILTER (WHERE ${methodExpr} IN ('POST', 'PUT', 'PATCH', 'DELETE'))::text AS writes
       FROM pd_audit_log a
       LEFT JOIN pd_user u ON u.id = a.actor_id
       ${whereClause}`,
      params,
    );

    const { rows: actionRows } = await query<{ action: string; count: string }>(
      `SELECT a.action, COUNT(*)::text AS count
       FROM pd_audit_log a
       LEFT JOIN pd_user u ON u.id = a.actor_id
       ${whereClause}
       GROUP BY a.action
       ORDER BY COUNT(*) DESC, a.action ASC
       LIMIT 50`,
      params,
    );

    const { rows: resourceRows } = await query<{ resource_type: string | null; count: string }>(
      `SELECT a.resource_type, COUNT(*)::text AS count
       FROM pd_audit_log a
       LEFT JOIN pd_user u ON u.id = a.actor_id
       ${whereClause}
       GROUP BY a.resource_type
       ORDER BY COUNT(*) DESC, a.resource_type ASC
       LIMIT 50`,
      params,
    );

    res.status(200).json({
      summary: summaryRows[0] ?? {
        total: '0',
        last_24h: '0',
        failed: '0',
        actors: '0',
        writes: '0',
      },
      actions: actionRows,
      resources: resourceRows,
    });
  }),
);

router.get(
  '/audit-log',
  validate(auditLogListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, ...filters } = req.query as unknown as {
      page: number;
      limit: number;
    } & AuditLogFilters;
    const { whereClause, params, nextParamIdx, statusExpr, methodExpr } =
      buildAuditLogWhere(filters);
    const limitParamIdx = nextParamIdx;
    const offsetParamIdx = nextParamIdx + 1;
    const offset = (page - 1) * limit;

    const { rows } = await query<{
      id: string;
      actor_id: string | null;
      actor_email: string | null;
      actor_role: string | null;
      action: string;
      resource_type: string | null;
      resource_id: string | null;
      method: string | null;
      status_code: number | null;
      duration_ms: number | null;
      path: string | null;
      ip: string | null;
      user_agent: string | null;
      metadata: Record<string, unknown> | null;
      created_at: Date;
    }>(
      `SELECT a.id,
              a.actor_id,
              u.email AS actor_email,
              a.actor_role,
              a.action,
              a.resource_type,
              a.resource_id,
              ${methodExpr} AS method,
              ${statusExpr} AS status_code,
              CASE WHEN a.metadata->>'duration_ms' ~ '^\\d+$' THEN (a.metadata->>'duration_ms')::int ELSE NULL END AS duration_ms,
              COALESCE(a.metadata->>'path', a.action) AS path,
              a.ip::text AS ip,
              a.user_agent,
              a.metadata,
              a.created_at
       FROM pd_audit_log a
       LEFT JOIN pd_user u ON u.id = a.actor_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
      [...params, limit, offset],
    );

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_audit_log a
       LEFT JOIN pd_user u ON u.id = a.actor_id
       ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0]?.count ?? '0', 10);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.status(200).json({
      data: rows.map((r) => ({
        ...r,
        actor_email: r.actor_email ?? null,
        metadata: r.metadata ?? {},
        created_at: r.created_at.toISOString(),
      })),
      meta: { page, limit, total, total_pages: totalPages, totalPages },
    });
  }),
);

const auditLogPurgeSchema = z.object({
  log_type: z.enum(['admin', 'seller', 'buyer']).optional().default('admin'),
  older_than_days: z.number().int().min(1).max(3650),
});

router.get(
  '/audit-log/export',
  validate(auditLogSummarySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as unknown as AuditLogFilters;
    const { whereClause, params, statusExpr, methodExpr } = buildAuditLogWhere(filters);

    const { rows } = await query<{
      id: string;
      actor_email: string | null;
      actor_role: string | null;
      action: string;
      resource_type: string | null;
      method: string | null;
      status_code: number | null;
      ip: string | null;
      created_at: Date;
    }>(
      `SELECT a.id,
              u.email AS actor_email,
              a.actor_role,
              a.action,
              a.resource_type,
              ${methodExpr} AS method,
              ${statusExpr} AS status_code,
              a.ip::text AS ip,
              a.created_at
       FROM pd_audit_log a
       LEFT JOIN pd_user u ON u.id = a.actor_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT 10000`,
      params,
    );

    const csvHeader =
      'id,actor_email,actor_role,action,resource_type,method,status_code,ip,created_at\\n';
    const csvRows = rows
      .map((r) =>
        [
          r.id,
          `"${(r.actor_email || '').replace(/"/g, '""')}"`,
          r.actor_role || '',
          `"${(r.action || '').replace(/"/g, '""')}"`,
          r.resource_type || '',
          r.method || '',
          r.status_code || '',
          r.ip || '',
          r.created_at.toISOString(),
        ].join(','),
      )
      .join('\\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${Date.now()}.csv"`);
    res.send(csvHeader + csvRows);
  }),
);

router.delete(
  '/audit-log/purge',
  validate(auditLogPurgeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { older_than_days, log_type } = req.body as z.infer<typeof auditLogPurgeSchema>;
    const roleFilter =
      log_type === 'buyer'
        ? "'customer'"
        : log_type === 'seller'
          ? "'vendor'"
          : "'admin', 'super_admin'";

    const { rowCount } = await query(
      `DELETE FROM pd_audit_log WHERE created_at < NOW() - INTERVAL '${older_than_days} days' AND actor_role IN (${roleFilter})`,
    );

    res.status(200).json({ deleted: rowCount });
  }),
);

// =====================================================
// AI Cost Dashboard
// =====================================================

const aiStatsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const [summary, topConsumers, dailyUsage, byType, byStatus, recentFailures, creditWallets] =
    await Promise.all([
      query<{
        total_jobs: string;
        total_tokens_consumed: string;
        jobs_today: string;
        tokens_today: string;
        compression_jobs: string;
        seo_jobs: string;
        page_copy_jobs: string;
        failed_jobs: string;
        processing_jobs: string;
        queued_jobs: string;
      }>(
        `SELECT COUNT(*)::text AS total_jobs,
              COALESCE(SUM(tokens_consumed), 0)::text AS total_tokens_consumed,
              COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::text AS jobs_today,
              COALESCE(SUM(tokens_consumed) FILTER (WHERE created_at >= CURRENT_DATE), 0)::text AS tokens_today,
              COUNT(*) FILTER (WHERE type = 'image_compression')::text AS compression_jobs,
              COUNT(*) FILTER (WHERE type = 'seo_generation')::text AS seo_jobs,
              COUNT(*) FILTER (WHERE type = 'page_copy')::text AS page_copy_jobs,
              COUNT(*) FILTER (WHERE status = 'failed')::text AS failed_jobs,
              COUNT(*) FILTER (WHERE status = 'processing')::text AS processing_jobs,
              COUNT(*) FILTER (WHERE status = 'queued')::text AS queued_jobs
       FROM pd_ai_jobs`,
      ),
      query<{ store_id: string; store_name: string; tokens_used: string; job_count: string }>(
        `SELECT j.store_id,
              s.name AS store_name,
              COALESCE(SUM(j.tokens_consumed), 0)::text AS tokens_used,
              COUNT(*)::text AS job_count
       FROM pd_ai_jobs j
       JOIN pd_store s ON s.id = j.store_id
       GROUP BY j.store_id, s.name
       ORDER BY SUM(j.tokens_consumed) DESC
       LIMIT 10`,
      ),
      query<{ date: string; tokens: string; jobs: string }>(
        `SELECT DATE(created_at)::text AS date,
              COALESCE(SUM(tokens_consumed), 0)::text AS tokens,
              COUNT(*)::text AS jobs
       FROM pd_ai_jobs
       WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      ),
      query<{ type: string; count: string; tokens: string }>(
        `SELECT type,
              COUNT(*)::text AS count,
              COALESCE(SUM(tokens_consumed), 0)::text AS tokens
       FROM pd_ai_jobs
       GROUP BY type
       ORDER BY count DESC`,
      ),
      query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text AS count
       FROM pd_ai_jobs
       GROUP BY status
       ORDER BY count DESC`,
      ),
      query<{
        id: string;
        store_id: string;
        store_name: string;
        type: string;
        error_message: string | null;
        created_at: Date;
        completed_at: Date | null;
      }>(
        `SELECT j.id, j.store_id, s.name AS store_name, j.type, j.error_message, j.created_at, j.completed_at
       FROM pd_ai_jobs j
       JOIN pd_store s ON s.id = j.store_id
       WHERE j.status = 'failed'
       ORDER BY COALESCE(j.completed_at, j.created_at) DESC
       LIMIT 8`,
      ),
      query<{
        active_wallets: string;
        unlimited_wallets: string;
        finite_tokens_remaining: string;
        tokens_used: string;
      }>(
        `SELECT COUNT(*)::text AS active_wallets,
              COUNT(*) FILTER (WHERE ai_tokens = -1)::text AS unlimited_wallets,
              COALESCE(SUM(ai_tokens) FILTER (WHERE ai_tokens >= 0), 0)::text AS finite_tokens_remaining,
              COALESCE(SUM(tokens_used), 0)::text AS tokens_used
       FROM pd_vendor_credits`,
      ),
    ]);

  const row = summary.rows[0];
  const totalTokens = parseInt(row.total_tokens_consumed, 10);

  res.status(200).json({
    total_jobs: parseInt(row.total_jobs, 10),
    total_tokens_consumed: totalTokens,
    total_tokens: totalTokens,
    jobs_today: parseInt(row.jobs_today, 10),
    tokens_today: parseInt(row.tokens_today, 10),
    compression_jobs: parseInt(row.compression_jobs, 10),
    seo_jobs: parseInt(row.seo_jobs, 10),
    page_copy_jobs: parseInt(row.page_copy_jobs, 10),
    failed_jobs: parseInt(row.failed_jobs, 10),
    processing_jobs: parseInt(row.processing_jobs, 10),
    queued_jobs: parseInt(row.queued_jobs, 10),
    estimated_cost_tnd: totalTokens * 0.005,
    credits: creditWallets.rows[0]
      ? {
          active_wallets: parseInt(creditWallets.rows[0].active_wallets, 10),
          unlimited_wallets: parseInt(creditWallets.rows[0].unlimited_wallets, 10),
          finite_tokens_remaining: parseInt(creditWallets.rows[0].finite_tokens_remaining, 10),
          tokens_used: parseInt(creditWallets.rows[0].tokens_used, 10),
        }
      : {
          active_wallets: 0,
          unlimited_wallets: 0,
          finite_tokens_remaining: 0,
          tokens_used: 0,
        },
    by_type: byType.rows.map((r) => ({
      type: r.type,
      count: parseInt(r.count, 10),
      tokens: parseInt(r.tokens, 10),
    })),
    by_status: byStatus.rows.map((r) => ({
      status: r.status,
      count: parseInt(r.count, 10),
    })),
    recent_failures: recentFailures.rows.map((r) => ({
      id: r.id,
      store_id: r.store_id,
      store_name: r.store_name,
      type: r.type,
      error_message: r.error_message,
      created_at: r.created_at,
      completed_at: r.completed_at,
    })),
    top_consumers: topConsumers.rows.map((r) => ({
      store_id: r.store_id,
      store_name: r.store_name,
      tokens_used: parseInt(r.tokens_used, 10),
      total_tokens: parseInt(r.tokens_used, 10),
      job_count: parseInt(r.job_count, 10),
    })),
    daily_usage: dailyUsage.rows.map((r) => ({
      date: r.date,
      tokens: parseInt(r.tokens, 10),
      jobs: parseInt(r.jobs, 10),
      count: parseInt(r.jobs, 10),
    })),
  });
});

router.get('/ai-costs', aiStatsHandler);
router.get('/ai-stats', aiStatsHandler);

const aiProviderConfigSchema = z.object({
  provider: z.enum(['gemini', 'openai', 'claude', 'custom']),
  label: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(160),
  base_url: z.string().trim().max(2048).optional().nullable(),
  api_key: z.string().trim().max(4096).optional(),
  is_enabled: z.boolean().default(true),
  is_default: z.boolean().default(false),
  priority: z.coerce.number().int().min(1).max(9999).default(100),
});

const aiProviderParamSchema = z.object({
  id: z.string().min(1).max(64),
});

const aiPricingSchema = z.object({
  prices: z
    .array(
      z.object({
        job_type: z.nativeEnum(AiJobType),
        tokens_required: z.coerce.number().int().min(0).max(10000),
      }),
    )
    .min(1)
    .max(20),
});

router.get(
  '/ai-config',
  asyncHandler(async (_req: Request, res: Response) => {
    const [providers, pricing] = await Promise.all([
      aiConfigService.listProviders(),
      aiConfigService.listPricing(),
    ]);
    res.status(200).json({ providers, pricing });
  }),
);

router.post(
  '/ai-providers',
  validate(aiProviderConfigSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const provider = await aiConfigService.createProvider({
      provider: req.body.provider as AiProvider,
      label: req.body.label,
      model: req.body.model,
      base_url: req.body.base_url || null,
      api_key: req.body.api_key || undefined,
      is_enabled: req.body.is_enabled,
      is_default: req.body.is_default,
      priority: req.body.priority,
    });
    res.status(201).json({ provider });
  }),
);

router.put(
  '/ai-providers/:id',
  validate(aiProviderParamSchema, 'params'),
  validate(aiProviderConfigSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const provider = await aiConfigService.updateProvider(req.params.id, {
      provider: req.body.provider as AiProvider,
      label: req.body.label,
      model: req.body.model,
      base_url: req.body.base_url || null,
      api_key: req.body.api_key || undefined,
      is_enabled: req.body.is_enabled,
      is_default: req.body.is_default,
      priority: req.body.priority,
    });
    res.status(200).json({ provider });
  }),
);

router.delete(
  '/ai-providers/:id',
  validate(aiProviderParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    await aiConfigService.deleteProvider(req.params.id);
    res.status(200).json({ success: true });
  }),
);

router.put(
  '/ai-pricing',
  validate(aiPricingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const pricing = await aiConfigService.updatePricing(req.body.prices);
    res.status(200).json({ pricing });
  }),
);

// =====================================================
// SMTP Email Configuration
// =====================================================

const smtpConfigSchema = z.object({
  smtp_host: z.string().min(1).max(255),
  smtp_port: z.coerce.number().int().min(1).max(65535),
  smtp_user: z.string().max(255).default(''),
  smtp_pass: z.string().max(500).optional().default(''), // empty = keep existing
  smtp_secure: z.boolean().default(false),
  smtp_from_name: z.string().min(1).max(200).default('PandaMarket'),
  smtp_from_email: z.string().email().max(255).default('noreply@pandamarket.tn'),
  smtp_enabled: z.boolean().default(false),
});

/**
 * GET /admin/smtp-config — Retrieve current SMTP configuration.
 * Password is never returned — only a boolean indicating if it's set.
 */
router.get(
  '/smtp-config',
  asyncHandler(async (_req: Request, res: Response) => {
    const config = await smtpConfigService.getPublicConfig();
    res.status(200).json({ data: config });
  }),
);

/**
 * PUT /admin/smtp-config — Save SMTP configuration.
 * Password is encrypted at rest using AES-256-GCM.
 * If smtp_pass is empty, the existing password is preserved.
 */
router.put(
  '/smtp-config',
  validate(smtpConfigSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await smtpConfigService.saveConfig(req.body, req.user!.id);
    logger.info({ admin_id: req.user!.id }, 'Admin updated SMTP configuration');
    res.status(200).json({ success: true, message: 'SMTP configuration saved' });
  }),
);

const smtpTestSchema = z.object({
  smtp_host: z.string().min(1).max(255).optional(),
  smtp_port: z.coerce.number().int().min(1).max(65535).optional(),
  smtp_user: z.string().max(255).optional(),
  smtp_pass: z.string().max(500).optional(),
  smtp_secure: z.boolean().optional(),
  smtp_from_name: z.string().max(200).optional(),
  smtp_from_email: z.string().email().max(255).optional(),
  recipient_email: z.string().email().max(255).optional(),
});

/**
 * POST /admin/smtp-config/test — Test SMTP connection.
 * Optionally sends a test email to the specified recipient.
 * Can test with unsaved config (pass overrides in body) or saved config (empty body).
 */
router.post(
  '/smtp-config/test',
  validate(smtpTestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { recipient_email, ...overrides } = req.body;

    // If overrides have a host, use them; otherwise test saved config
    const hasOverrides = overrides.smtp_host && overrides.smtp_host.length > 0;

    const result = await smtpConfigService.testConnection(
      hasOverrides
        ? {
            smtp_host: overrides.smtp_host,
            smtp_port: overrides.smtp_port ?? 587,
            smtp_user: overrides.smtp_user ?? '',
            smtp_pass: overrides.smtp_pass,
            smtp_secure: overrides.smtp_secure ?? false,
            smtp_from_name: overrides.smtp_from_name ?? 'PandaMarket',
            smtp_from_email: overrides.smtp_from_email ?? 'noreply@pandamarket.tn',
          }
        : undefined,
      recipient_email,
    );

    res.status(result.success ? 200 : 422).json(result);
  }),
);

/**
 * GET /admin/platform-media — List platform media assets stored in database pd_file_blobs
 * Query: ?folder=all|categories|branding|banners|general&search=...
 */
router.get(
  '/platform-media',
  asyncHandler(async (req: Request, res: Response) => {
    const folderFilter = typeof req.query.folder === 'string' ? req.query.folder.trim() : 'all';
    const searchQuery =
      typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    const sql = `
      SELECT b.key, b.bucket, b.content_type, OCTET_LENGTH(b.data) as size, b.created_at, b.data, a.filename as asset_filename
      FROM pd_file_blobs b
      LEFT JOIN pd_file_asset a ON (a.file_key = b.key OR a.url LIKE '%' || b.key)
      WHERE b.bucket = 'pd-product-images'
      ORDER BY b.created_at DESC
    `;

    const result = await query(sql);

    const items = await Promise.all(
      result.rows.map(async (row: any) => {
        const rawKey = row.key as string;
        const pathParts = rawKey.split('/');

        let folder = 'general';
        if (
          pathParts.length >= 3 &&
          ['categories', 'branding', 'banners', 'general'].includes(pathParts[2])
        ) {
          folder = pathParts[2];
        } else if (
          rawKey.toLowerCase().includes('category') ||
          rawKey.toLowerCase().includes('cat_') ||
          rawKey.toLowerCase().includes('marketplace/pd_user_')
        ) {
          folder = 'categories';
        } else if (
          rawKey.toLowerCase().includes('logo') ||
          rawKey.toLowerCase().includes('favicon') ||
          rawKey.toLowerCase().includes('brand')
        ) {
          folder = 'branding';
        } else if (
          rawKey.toLowerCase().includes('banner') ||
          rawKey.toLowerCase().includes('hero') ||
          rawKey.toLowerCase().includes('slide')
        ) {
          folder = 'banners';
        }

        const filename = row.asset_filename || pathParts[pathParts.length - 1] || rawKey;
        const url = `/${rawKey}`;
        let width: number | null = null;
        let height: number | null = null;

        if (row.data && row.content_type?.startsWith('image/')) {
          try {
            const meta = await sharp(row.data).metadata();
            width = meta.width ?? null;
            height = meta.height ?? null;
          } catch {
            // Ignore sharp metadata error
          }
        }

        return {
          key: rawKey,
          url,
          filename,
          folder,
          content_type: row.content_type || 'image/jpeg',
          size: parseInt(row.size, 10) || 0,
          width,
          height,
          dimensions: width && height ? `${width} × ${height} px` : null,
          created_at: row.created_at,
        };
      }),
    );

    const filtered = items.filter((item: any) => {
      if (folderFilter !== 'all' && item.folder !== folderFilter) return false;
      if (
        searchQuery &&
        !item.filename.toLowerCase().includes(searchQuery) &&
        !item.key.toLowerCase().includes(searchQuery)
      )
        return false;
      return true;
    });

    res.status(200).json({
      success: true,
      data: filtered,
      summary: {
        total: items.length,
        categories: items.filter((i: any) => i.folder === 'categories').length,
        branding: items.filter((i: any) => i.folder === 'branding').length,
        banners: items.filter((i: any) => i.folder === 'banners').length,
        general: items.filter((i: any) => i.folder === 'general').length,
      },
    });
  }),
);

const renameMediaSchema = z.object({
  key: z.string().min(1),
  new_filename: z.string().min(1).max(255),
});

/**
 * PATCH /admin/platform-media/rename — Rename a platform picture while preserving original file extension
 */
router.patch(
  '/platform-media/rename',
  validate(renameMediaSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { key, new_filename } = req.body;

    const findResult = await query('SELECT key, content_type FROM pd_file_blobs WHERE key = $1', [
      key,
    ]);
    if (findResult.rows.length === 0) {
      throw new PdValidationError('Media asset not found in database');
    }

    const rawKey = findResult.rows[0].key as string;
    const pathParts = rawKey.split('/');
    const originalFilename = pathParts[pathParts.length - 1] || rawKey;
    const extMatch = originalFilename.match(/\.([a-zA-Z0-9]+)$/);
    const originalExt = extMatch ? extMatch[1].toLowerCase() : '';

    let cleanName = new_filename.trim().replace(/[/\\]/g, '');
    if (originalExt) {
      cleanName = cleanName.replace(new RegExp(`\\.${originalExt}$`, 'i'), '');
      cleanName = cleanName.replace(/\.[a-zA-Z0-9]+$/, '');
      cleanName = `${cleanName}.${originalExt}`;
    }

    await query(
      `INSERT INTO pd_file_asset (id, scope, purpose, url, file_key, bucket, filename, content_type, file_size)
       VALUES ($1, 'platform', 'marketplace_asset', $2, $3, 'pd-product-images', $4, $5, 0)
       ON CONFLICT (file_key) DO UPDATE SET filename = EXCLUDED.filename, updated_at = NOW()`,
      [pdId('asset'), `/${key}`, key, cleanName, findResult.rows[0].content_type || 'image/jpeg'],
    );

    logger.info(
      { admin_id: req.user!.id, key, new_filename: cleanName },
      'Admin renamed platform media picture',
    );

    res.status(200).json({
      success: true,
      key,
      new_filename: cleanName,
    });
  }),
);

/**
 * DELETE /admin/platform-media — Delete a platform media asset from database pd_file_blobs and local cache
 * Body or Query: { key: string }
 */
router.delete(
  '/platform-media',
  asyncHandler(async (req: Request, res: Response) => {
    const key = (req.body.key || req.query.key || '') as string;
    if (!key) {
      throw new PdValidationError('Asset key is required');
    }

    await query('DELETE FROM pd_file_blobs WHERE key = $1', [key]);
    await query(
      'DELETE FROM pd_file_asset WHERE file_key = $1 OR file_key LIKE $2 OR url LIKE $2',
      [key, `%${key}%`],
    );

    try {
      const diskPath = path.join(resolveDataPath(), key);
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
    } catch {
      // Ignore disk delete error
    }

    logger.info({ admin_id: req.user!.id, key }, 'Admin deleted platform media asset');

    res.status(200).json({
      success: true,
      message: 'Platform media asset deleted successfully',
    });
  }),
);

const optimizeMediaSchema = z.object({
  key: z.string().min(1),
  quality: z.number().int().min(30).max(100).optional().default(80),
  maxWidth: z.number().int().min(100).max(3840).optional().default(1600),
  format: z.enum(['webp', 'jpeg', 'png', 'original']).optional().default('webp'),
});

/**
 * POST /admin/platform-media/optimize — Compress and optimize a single platform picture asset
 */
router.post(
  '/platform-media/optimize',
  validate(optimizeMediaSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { key, quality, maxWidth, format } = req.body;

    const findResult = await query('SELECT data, content_type FROM pd_file_blobs WHERE key = $1', [
      key,
    ]);
    if (findResult.rows.length === 0) {
      throw new PdValidationError('Media asset not found in database');
    }

    const row = findResult.rows[0];
    const originalBuffer = row.data as Buffer;
    const originalSize = originalBuffer ? originalBuffer.length : 0;

    if (!originalBuffer || originalSize === 0) {
      throw new PdValidationError('Media file is empty');
    }

    let pipeline = sharp(originalBuffer);
    const metadata = await pipeline.metadata();

    if (metadata.width && metadata.width > maxWidth) {
      pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
    }

    let targetContentType = row.content_type || 'image/jpeg';
    let targetFormat = format;
    if (targetFormat === 'original') {
      if (row.content_type === 'image/png') targetFormat = 'png';
      else if (row.content_type === 'image/webp') targetFormat = 'webp';
      else targetFormat = 'jpeg';
    }

    if (targetFormat === 'webp') {
      pipeline = pipeline.webp({ quality, effort: 4 });
      targetContentType = 'image/webp';
    } else if (targetFormat === 'jpeg') {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      targetContentType = 'image/jpeg';
    } else if (targetFormat === 'png') {
      pipeline = pipeline.png({ quality, compressionLevel: 8 });
      targetContentType = 'image/png';
    }

    const compressedBuffer = await pipeline.toBuffer();
    const newSize = compressedBuffer.length;
    const savedBytes = Math.max(0, originalSize - newSize);
    const savedPercentage = originalSize > 0 ? ((savedBytes / originalSize) * 100).toFixed(1) : '0';

    await query(
      'UPDATE pd_file_blobs SET data = $1, content_type = $2, created_at = NOW() WHERE key = $3',
      [compressedBuffer, targetContentType, key],
    );

    await query(
      `UPDATE pd_file_asset
       SET file_size = $1, content_type = $2, updated_at = NOW()
       WHERE file_key = $3 OR file_key LIKE $4 OR url LIKE $4`,
      [newSize, targetContentType, key, `%${key}%`],
    );

    try {
      const diskPath = path.join(resolveDataPath(), key);
      if (fs.existsSync(diskPath)) {
        fs.writeFileSync(diskPath, compressedBuffer);
      }
    } catch {
      // Ignore disk sync error
    }

    logger.info(
      { admin_id: req.user!.id, key, originalSize, newSize, savedBytes, savedPercentage },
      'Admin compressed platform media picture',
    );

    res.status(200).json({
      success: true,
      key,
      original_size: originalSize,
      new_size: newSize,
      saved_bytes: savedBytes,
      saved_percentage: savedPercentage,
      content_type: targetContentType,
    });
  }),
);

/**
 * POST /admin/platform-media/optimize-all — Bulk optimize all pictures in a folder
 */
router.post(
  '/platform-media/optimize-all',
  asyncHandler(async (req: Request, res: Response) => {
    const folderFilter = (req.body.folder || 'all') as string;
    const quality = req.body.quality || 80;
    const maxWidth = req.body.maxWidth || 1600;

    const findResult = await query(
      "SELECT key, data, content_type FROM pd_file_blobs WHERE bucket = 'pd-product-images' ORDER BY created_at DESC",
    );

    let totalOriginal = 0;
    let totalNew = 0;
    let processedCount = 0;

    for (const row of findResult.rows) {
      const rawKey = row.key as string;
      const pathParts = rawKey.split('/');

      let folder = 'general';
      if (
        pathParts.length >= 3 &&
        ['categories', 'branding', 'banners', 'general'].includes(pathParts[2])
      ) {
        folder = pathParts[2];
      } else if (
        rawKey.toLowerCase().includes('category') ||
        rawKey.toLowerCase().includes('cat_') ||
        rawKey.toLowerCase().includes('marketplace/pd_user_')
      ) {
        folder = 'categories';
      } else if (
        rawKey.toLowerCase().includes('logo') ||
        rawKey.toLowerCase().includes('favicon') ||
        rawKey.toLowerCase().includes('brand')
      ) {
        folder = 'branding';
      } else if (
        rawKey.toLowerCase().includes('banner') ||
        rawKey.toLowerCase().includes('hero') ||
        rawKey.toLowerCase().includes('slide')
      ) {
        folder = 'banners';
      }

      if (folderFilter !== 'all' && folder !== folderFilter) continue;

      const originalBuffer = row.data as Buffer;
      if (!originalBuffer || originalBuffer.length === 0) continue;

      const originalSize = originalBuffer.length;

      try {
        let pipeline = sharp(originalBuffer);
        const metadata = await pipeline.metadata();

        if (metadata.width && metadata.width > maxWidth) {
          pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
        }

        const compressedBuffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();
        const newSize = compressedBuffer.length;

        if (newSize < originalSize) {
          await query('UPDATE pd_file_blobs SET data = $1, content_type = $2 WHERE key = $3', [
            compressedBuffer,
            'image/webp',
            rawKey,
          ]);

          await query(
            `UPDATE pd_file_asset
             SET file_size = $1, content_type = $2, updated_at = NOW()
             WHERE file_key = $3 OR file_key LIKE $4 OR url LIKE $4`,
            [newSize, 'image/webp', rawKey, `%${rawKey}%`],
          );

          try {
            const diskPath = path.join(resolveDataPath(), rawKey);
            if (fs.existsSync(diskPath)) {
              fs.writeFileSync(diskPath, compressedBuffer);
            }
          } catch {}

          totalOriginal += originalSize;
          totalNew += newSize;
          processedCount++;
        }
      } catch (err) {
        logger.warn({ key: rawKey, err }, 'Failed to optimize picture during bulk operation');
      }
    }

    const totalSavedBytes = Math.max(0, totalOriginal - totalNew);
    const totalSavedPercentage =
      totalOriginal > 0 ? ((totalSavedBytes / totalOriginal) * 100).toFixed(1) : '0';

    res.status(200).json({
      success: true,
      processed_count: processedCount,
      total_original_size: totalOriginal,
      total_new_size: totalNew,
      total_saved_bytes: totalSavedBytes,
      total_saved_percentage: totalSavedPercentage,
    });
  }),
);

// ───────────────────────────────────────────────────────────
// Admin Notes / Reminders / Drafts (v2)
// ───────────────────────────────────────────────────────────
import { adminNotesService } from '../services/admin-notes.service';

const noteTypeSchema = z.enum(['note', 'reminder', 'draft']);
const notePrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
const noteStatusSchema = z.enum(['active', 'archived', 'trashed']);
const noteContentFormatSchema = z.enum(['plain', 'markdown']);

const createNoteSchema = z.object({
  type: noteTypeSchema,
  title: z.string().min(1).max(500),
  content: z.string().max(50000).optional(),
  content_format: noteContentFormatSchema.optional(),
  color: z.string().max(20).optional(),
  priority: notePrioritySchema.optional(),
  is_pinned: z.boolean().optional(),
  reminder_at: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  due_at: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

const updateNoteSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(50000).optional(),
  content_format: noteContentFormatSchema.optional(),
  type: noteTypeSchema.optional(),
  color: z.string().max(20).optional(),
  priority: notePrioritySchema.optional(),
  is_pinned: z.boolean().optional(),
  is_completed: z.boolean().optional(),
  reminder_at: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  due_at: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

const noteListSchema = z.object({
  type: noteTypeSchema.optional(),
  status: noteStatusSchema.optional(),
  priority: notePrioritySchema.optional(),
  pinned: z.coerce.boolean().optional(),
  completed: z.coerce.boolean().optional(),
  overdue: z.coerce.boolean().optional(),
  upcoming: z.coerce.boolean().optional(),
  upcoming_within_hours: z.coerce.number().int().min(1).max(168).optional(),
  search: z.string().max(200).optional(),
  tag: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const bulkNoteIdsSchema = z.object({
  ids: z.array(z.string().max(64)).min(1).max(200),
});

const bulkCompleteSchema = z.object({
  ids: z.array(z.string().max(64)).min(1).max(200),
  completed: z.boolean(),
});

const checklistItemSchema = z.object({
  content: z.string().min(1).max(1000),
  sort_order: z.number().int().min(0).optional(),
});

const checklistItemUpdateSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  is_done: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

const attachmentSchema = z.object({
  file_key: z.string().min(1).max(1024),
  bucket: z.string().min(1).max(128),
  filename: z.string().min(1).max(500),
  content_type: z.string().max(128).default('application/octet-stream'),
  file_size: z
    .number()
    .int()
    .min(0)
    .max(110 * 1024 * 1024),
  scope: z.string().max(20).optional(),
});

// List notes (supports all v2 filters)
router.get(
  '/notes',
  requireAuth,
  requireAdmin,
  validate(noteListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as {
      type?: string;
      status?: 'active' | 'archived' | 'trashed';
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      pinned?: boolean;
      completed?: boolean;
      overdue?: boolean;
      upcoming?: boolean;
      upcoming_within_hours?: number;
      search?: string;
      tag?: string;
      page?: number;
      limit?: number;
    };
    const result = await adminNotesService.list(req.user!.id, {
      type: q.type,
      status: q.status,
      priority: q.priority,
      pinned: typeof q.pinned === 'string' ? q.pinned === 'true' : q.pinned,
      completed: typeof q.completed === 'string' ? q.completed === 'true' : q.completed,
      overdue: typeof q.overdue === 'string' ? q.overdue === 'true' : q.overdue,
      upcoming: typeof q.upcoming === 'string' ? q.upcoming === 'true' : q.upcoming,
      upcoming_within_hours: q.upcoming_within_hours,
      search: q.search,
      tag: q.tag,
      page: q.page,
      limit: q.limit,
    });
    res.status(200).json(result);
  }),
);

// Dashboard statistics
router.get(
  '/notes/stats',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await adminNotesService.stats(req.user!.id);
    res.status(200).json({ data: stats });
  }),
);

// Export (CSV / JSON)
router.get(
  '/notes/export',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const format = req.query.format === 'json' ? 'json' : 'csv';
    const { contentType, body, filename } = await adminNotesService.exportNotes(
      req.user!.id,
      format,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(body);
  }),
);

// Bulk operations
router.post(
  '/notes/bulk/archive',
  requireAuth,
  requireAdmin,
  validate(bulkNoteIdsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await adminNotesService.bulkArchive(req.body.ids, req.user!.id);
    res.status(200).json({ affected: count });
  }),
);

router.post(
  '/notes/bulk/trash',
  requireAuth,
  requireAdmin,
  validate(bulkNoteIdsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await adminNotesService.bulkTrash(req.body.ids, req.user!.id);
    res.status(200).json({ affected: count });
  }),
);

router.post(
  '/notes/bulk/restore',
  requireAuth,
  requireAdmin,
  validate(bulkNoteIdsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await adminNotesService.bulkRestore(req.body.ids, req.user!.id);
    res.status(200).json({ affected: count });
  }),
);

router.post(
  '/notes/bulk/delete',
  requireAuth,
  requireAdmin,
  validate(bulkNoteIdsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await adminNotesService.bulkDelete(req.body.ids, req.user!.id);
    res.status(200).json({ affected: count });
  }),
);

router.post(
  '/notes/bulk/complete',
  requireAuth,
  requireAdmin,
  validate(bulkCompleteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await adminNotesService.bulkComplete(
      req.body.ids,
      req.user!.id,
      req.body.completed,
    );
    res.status(200).json({ affected: count });
  }),
);

router.delete(
  '/notes/trash/empty',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const count = await adminNotesService.emptyTrash(req.user!.id);
    res.status(200).json({ affected: count });
  }),
);

// Create note
router.post(
  '/notes',
  requireAuth,
  requireAdmin,
  validate(createNoteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.create({
      admin_id: req.user!.id,
      ...req.body,
    });
    res.status(201).json({ data: note });
  }),
);

// Get single note (with checklist + attachments)
router.get(
  '/notes/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.getById(req.params.id, req.user!.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

// Update note
router.put(
  '/notes/:id',
  requireAuth,
  requireAdmin,
  validate(updateNoteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.update(req.params.id, req.user!.id, req.body);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

// Lifecycle: archive / trash / restore
router.patch(
  '/notes/:id/archive',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.archive(req.params.id, req.user!.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

router.patch(
  '/notes/:id/trash',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.trash(req.params.id, req.user!.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

router.patch(
  '/notes/:id/restore',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.restore(req.params.id, req.user!.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

// Permanently delete (only from trash)
router.delete(
  '/notes/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await adminNotesService.delete(req.params.id, req.user!.id);
    if (!deleted) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ success: true });
  }),
);

// Toggle pin
router.patch(
  '/notes/:id/pin',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.togglePin(req.params.id, req.user!.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

// Toggle complete
router.patch(
  '/notes/:id/complete',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.toggleComplete(req.params.id, req.user!.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

// Checklist items
router.post(
  '/notes/:id/checklist',
  requireAuth,
  requireAdmin,
  validate(checklistItemSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const item = await adminNotesService.addChecklistItem(
      req.params.id,
      req.user!.id,
      req.body.content,
      req.body.sort_order ?? 0,
    );
    if (!item) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(201).json({ data: item });
  }),
);

router.patch(
  '/notes/:id/checklist/:itemId',
  requireAuth,
  requireAdmin,
  validate(checklistItemUpdateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const item = await adminNotesService.updateChecklistItem(
      req.params.id,
      req.params.itemId,
      req.user!.id,
      req.body,
    );
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.status(200).json({ data: item });
  }),
);

router.delete(
  '/notes/:id/checklist/:itemId',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await adminNotesService.removeChecklistItem(
      req.params.id,
      req.params.itemId,
      req.user!.id,
    );
    if (!ok) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.status(200).json({ success: true });
  }),
);

// Attachments
router.post(
  '/notes/:id/attachments',
  requireAuth,
  requireAdmin,
  validate(attachmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const att = await adminNotesService.addAttachment(req.params.id, req.user!.id, req.body);
    if (!att) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(201).json({ data: att });
  }),
);

router.delete(
  '/notes/:id/attachments/:attachmentId',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await adminNotesService.removeAttachment(
      req.params.id,
      req.params.attachmentId,
      req.user!.id,
    );
    if (!ok) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }
    res.status(200).json({ success: true });
  }),
);

// Activity log
router.get(
  '/notes/:id/activity',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const activities = await adminNotesService.listActivity(req.params.id, req.user!.id);
    res.status(200).json({ data: activities });
  }),
);

// ==========================================================
// Platform Subscription Orders & Manual Mandat Approval
// ==========================================================

const reviewSubscriptionOrderSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().optional(),
});

const cancelSubscriptionOrderSchema = z.object({
  reason: z.string().optional(),
});

const bulkSubscriptionOrderSchema = z.object({
  intent_ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(['approve', 'reject', 'cancel', 'delete']),
  reason: z.string().optional(),
});

router.get(
  '/subscription-orders/stats',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const { subscriptionPaymentService } = await import('../services/subscription-payment.service');
    const stats = await subscriptionPaymentService.getExpandedStats();
    res.status(200).json({ stats });
  }),
);

router.get(
  '/subscription-orders/:intentId/activity',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { subscriptionPaymentService } = await import('../services/subscription-payment.service');
    const logs = await subscriptionPaymentService.getActivityLogs(req.params.intentId);
    res.status(200).json({ activity_logs: logs });
  }),
);

router.post(
  '/subscription-orders/cleanup',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const { subscriptionPaymentService } = await import('../services/subscription-payment.service');
    const expired = await subscriptionPaymentService.cleanupStaleIntents();
    res.status(200).json({ success: true, count: expired.length, expired });
  }),
);

router.get(
  '/subscription-orders',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string;
    const gateway = req.query.gateway as string;
    const targetPlan = req.query.target_plan as string;
    const search = req.query.search as string;
    const fromDate = req.query.from_date as string;
    const toDate = req.query.to_date as string;
    const minAmount = req.query.min_amount ? Number(req.query.min_amount) : undefined;
    const maxAmount = req.query.max_amount ? Number(req.query.max_amount) : undefined;
    const sortBy = (req.query.sort_by as string) || 'created_at';
    const sortOrder = ((req.query.sort_order as string) || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const allowedSortFields: Record<string, string> = {
      created_at: 'i.created_at',
      amount: 'i.amount',
      store_name: 's.name',
      status: 'i.status',
      target_plan: 'i.target_plan',
    };
    const sortColumn = allowedSortFields[sortBy] || 'i.created_at';

    let whereClause = ' WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      params.push(status);
      whereClause += ` AND i.status = $${params.length}`;
    }
    if (gateway && gateway !== 'all') {
      params.push(gateway);
      whereClause += ` AND i.gateway = $${params.length}`;
    }
    if (targetPlan && targetPlan !== 'all') {
      params.push(targetPlan);
      whereClause += ` AND i.target_plan = $${params.length}`;
    }
    if (fromDate) {
      params.push(fromDate);
      whereClause += ` AND i.created_at >= $${params.length}::timestamptz`;
    }
    if (toDate) {
      params.push(toDate);
      whereClause += ` AND i.created_at <= $${params.length}::timestamptz`;
    }
    if (minAmount !== undefined && !isNaN(minAmount)) {
      params.push(minAmount);
      whereClause += ` AND i.amount >= $${params.length}`;
    }
    if (maxAmount !== undefined && !isNaN(maxAmount)) {
      params.push(maxAmount);
      whereClause += ` AND i.amount <= $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      whereClause += ` AND (s.name ILIKE $${params.length} OR s.subdomain ILIKE $${params.length} OR u.email ILIKE $${params.length} OR i.id ILIKE $${params.length})`;
    }

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM pd_subscription_intent i
      JOIN pd_store s ON s.id = i.store_id
      JOIN pd_user u ON u.id = i.user_id
      ${whereClause}
    `;
    const { rows: countRows } = await query(countSql, params);
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT i.*,
             s.name AS store_name,
             s.subdomain AS store_subdomain,
             u.email AS seller_email,
             r.email AS reviewer_email
      FROM pd_subscription_intent i
      JOIN pd_store s ON s.id = i.store_id
      JOIN pd_user u ON u.id = i.user_id
      LEFT JOIN pd_user r ON r.id = i.reviewed_by
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const { rows } = await query(dataSql, [...params, limit, offset]);

    res.status(200).json({
      subscription_orders: rows,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    });
  }),
);

router.post(
  '/subscription-orders/:intentId/review',
  requireAuth,
  requireAdmin,
  validate(reviewSubscriptionOrderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { subscriptionPaymentService } = await import('../services/subscription-payment.service');
    const result = await subscriptionPaymentService.reviewManual(
      req.params.intentId,
      req.user!.id,
      req.body.decision,
      req.body.reason,
    );
    res.status(200).json({ success: true, intent: result });
  }),
);

router.post(
  '/subscription-orders/:intentId/cancel',
  requireAuth,
  requireAdmin,
  validate(cancelSubscriptionOrderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { subscriptionPaymentService } = await import('../services/subscription-payment.service');
    const result = await subscriptionPaymentService.cancelByAdmin(
      req.params.intentId,
      req.user!.id,
      req.body.reason,
    );
    res.status(200).json({ success: true, intent: result });
  }),
);

router.delete(
  '/subscription-orders/:intentId',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { subscriptionPaymentService } = await import('../services/subscription-payment.service');
    const result = await subscriptionPaymentService.deleteByAdmin(req.params.intentId, req.user!.id);
    res.status(200).json({ success: true, intent: result });
  }),
);

router.post(
  '/subscription-orders/bulk',
  requireAuth,
  requireAdmin,
  validate(bulkSubscriptionOrderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { subscriptionPaymentService } = await import('../services/subscription-payment.service');
    const { intent_ids, action, reason } = req.body;
    let result: any;
    if (action === 'approve') {
      result = await subscriptionPaymentService.bulkReview(intent_ids, req.user!.id, 'approved');
    } else if (action === 'reject') {
      result = await subscriptionPaymentService.bulkReview(intent_ids, req.user!.id, 'rejected', reason);
    } else if (action === 'cancel') {
      result = await subscriptionPaymentService.bulkCancel(intent_ids, req.user!.id, reason);
    } else {
      result = await subscriptionPaymentService.bulkDelete(intent_ids, req.user!.id);
    }
    res.status(200).json({ success: true, ...result });
  }),
);

export default router;
