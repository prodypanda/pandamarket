import { urlOrPathSchema } from '../../validators';
import { Request } from 'express';
import { z } from 'zod';

/**
 * Shared schemas, helpers and constants for the admin routers.
 * Extracted verbatim from admin.route.ts during the E15 split — do not edit
 * casually; every admin/* router depends on these symbols.
 */
/**
 * Admin API routes — Super Admin only.
 * Handles KYC verification queue, mandat validation, reports management,
 * vendor management, and platform statistics.
 */


function extractAnalyticsQueryParams(req: Request) {
  return {
    timeRange: req.query.timeRange as any,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    currency: req.query.currency as string | undefined,
    tenantId: req.query.tenantId as string | undefined,
  };
}

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

const blockIpSchema = z.object({
  ip_hash: z.string().min(1).max(128),
  reason: z.string().trim().min(3).max(1000),
});

const userSecurityActivityParamsSchema = z.object({
  id: z.string().min(8).max(100),
});


const assetListQuerySchema = z.object({
  type: z.enum(['image', 'document']).optional(),
  folder: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(60),
});

const registerAssetSchema = z.object({
  url: urlOrPathSchema,
  file_key: z.string().min(1).max(500),
  bucket: z.string().min(1).max(120),
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1).max(100),
  file_size: z.number().int().min(0).nullable().optional(),
  purpose: z.string().min(1).max(40).default('marketplace_asset'),
  metadata: z.record(z.unknown()).optional(),
});

export {
  extractAnalyticsQueryParams,
  adsReviewSchema,
  adsConfigSchema,
  adsAccountStatusSchema,
  adsPlacementSchema,
  adsBulkPricingSchema,
  adsCouponSchema,
  adsCreditSchema,
  adsRefundSchema,
  adsManualRefillListSchema,
  adsManualRefillReviewSchema,
  adsAdjustmentSchema,
  blockIpSchema,
  userSecurityActivityParamsSchema,
  assetListQuerySchema,
  registerAssetSchema,
  urlOrPathSchema,
};