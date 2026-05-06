/**
 * Admin API routes — Super Admin only.
 * Handles KYC verification queue, mandat validation, reports management,
 * vendor management, and platform statistics.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  asyncHandler,
  requireAuth,
  requireAdmin,
  validate,
} from '../middlewares';
import { auditLog } from '../middlewares/audit-log.middleware';
import { kycService } from '../services/kyc.service';
import { mandatService } from '../services/mandat.service';
import { reportService } from '../services/report.service';
import { storeService } from '../services/store.service';
import { productService } from '../services/product.service';
import { categoryService } from '../services/category.service';
import { fileAssetService } from '../services/file-asset.service';
import { query } from '../db/pool';
import { VerificationStatus, MandatStatus, ReportStatus } from '@pandamarket/types';
import { logger } from '../utils/logger';
import { smtpConfigService } from '../services/smtp-config.service';

const router = Router();

// All admin routes require authentication + admin role + audit logging
router.use(requireAuth, requireAdmin, auditLog);

const assetListQuerySchema = z.object({
  type: z.enum(['image', 'document']).optional(),
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
    const queryParams = req.query as unknown as { type?: 'image' | 'document'; limit: number };
    const assets = await fileAssetService.listAssets({
      scope: 'platform',
      type: queryParams.type,
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
  description: z.string().max(1000).optional(),
  short_description: z.string().max(255).optional(),
  long_description: z.string().max(5000).optional(),
  image_url: z.string().url().nullable().optional(),
  position: z.number().int().optional(),
});

const updateCategorySchema = categorySchema.partial().extend({
  is_active: z.boolean().optional(),
});

router.get(
  '/marketplace-categories',
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = (await categoryService.listMarketplaceCategories()).map((category) => ({
      ...category,
      product_count: parseInt(category.product_count || '0', 10),
    }));
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

router.put(
  '/marketplace-categories/:id',
  validate(updateCategorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.updateMarketplaceCategory(req.params.id, req.body);
    res.status(200).json({ category });
  }),
);

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
    const { status, page, limit } = req.query as unknown as { status: VerificationStatus; page: number; limit: number };
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
    const { status, page, limit } = req.query as unknown as { status: MandatStatus; page: number; limit: number };
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
  status: z.enum(['open', 'investigating', 'resolved', 'dismissed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/reports',
  validate(reportListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query as unknown as { status?: ReportStatus; page: number; limit: number };
    const result = await reportService.list({ status, page, limit });
    res.status(200).json(result);
  }),
);

const updateReportSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved', 'dismissed']),
  admin_notes: z.string().max(2000).optional(),
});

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

// =====================================================
// Product Approval Queue (unverified vendors)
// =====================================================

const productListSchema = z.object({
  status: z.enum(['pending_approval', 'published', 'rejected']).optional().default('pending_approval'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/products/pending',
  validate(productListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query as unknown as { status: string; page: number; limit: number };
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
    res.status(200).json({ data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } });
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
  verified_only: z.coerce.boolean().optional(),
});

router.get(
  '/vendors',
  validate(vendorListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, verified_only } = req.query as unknown as { page: number; limit: number; verified_only?: boolean };
    const result = await storeService.list({ page, limit, verifiedOnly: verified_only });
    res.status(200).json(result);
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

const globalSettingsSchema = z.object({
  marketplace_name: z.coerce.string().min(1).max(120).optional(),
  marketplace_tagline: z.coerce.string().max(255).optional(),
  marketplace_logo_url: z.coerce.string().max(2048).optional(),
  marketplace_theme: z.enum(['panda', 'aliexpress']).optional(),
  marketplace_support_email: z.union([z.coerce.string().email(), z.literal('')]).optional(),
  marketplace_support_phone: z.coerce.string().max(40).optional(),
  marketplace_enabled: z.boolean().optional(),
  vendor_registration_enabled: z.boolean().optional(),
  buyer_registration_enabled: z.boolean().optional(),
  product_moderation_required: z.boolean().optional(),
  product_auto_publish_verified: z.boolean().optional(),
  reviews_enabled: z.boolean().optional(),
  review_auto_publish: z.boolean().optional(),
  wishlist_enabled: z.boolean().optional(),
  cart_enabled: z.boolean().optional(),
  shipping_enabled: z.boolean().optional(),
  order_splitting_enabled: z.boolean().optional(),
  retention_days_flouci: z.coerce.number().int().min(1).max(90).optional(),
  retention_days_konnect: z.coerce.number().int().min(1).max(90).optional(),
  retention_days_mandat: z.coerce.number().int().min(1).max(90).optional(),
  retention_days_cod: z.coerce.number().int().min(1).max(90).optional(),
  min_withdrawal_tnd: z.coerce.number().min(1).optional(),
  platform_commission_rate: z.coerce.number().min(0).max(100).optional(),
  default_currency: z.string().min(3).max(3).optional(),
  mandat_recipient_name: z.coerce.string().max(200).optional(),
  mandat_recipient_cin: z.coerce.string().max(20).optional(),
  mandat_recipient_city: z.coerce.string().max(100).optional(),
  max_upload_size_mb: z.coerce.number().int().min(1).max(100).optional(),
  max_product_images: z.coerce.number().int().min(1).max(50).optional(),
  max_products_per_store_free: z.coerce.number().int().min(1).max(10000).optional(),
  default_low_stock_threshold: z.coerce.number().int().min(0).max(1000).optional(),
});

const booleanGlobalSettingKeys = new Set([
  'marketplace_enabled',
  'vendor_registration_enabled',
  'buyer_registration_enabled',
  'product_moderation_required',
  'product_auto_publish_verified',
  'reviews_enabled',
  'review_auto_publish',
  'wishlist_enabled',
  'cart_enabled',
  'shipping_enabled',
  'order_splitting_enabled',
]);

const numericGlobalSettingKeys = new Set([
  'retention_days_flouci',
  'retention_days_konnect',
  'retention_days_mandat',
  'retention_days_cod',
  'min_withdrawal_tnd',
  'platform_commission_rate',
  'max_upload_size_mb',
  'max_product_images',
  'max_products_per_store_free',
  'default_low_stock_threshold',
]);

/**
 * GET /admin/settings — Retrieve current platform settings.
 * Settings are stored in pd_platform_config (key-value).
 * Falls back to defaults from config.ts if not set.
 */
router.get(
  '/settings',
  asyncHandler(async (_req: Request, res: Response) => {
    const { rows } = await query<{ key: string; value: string }>(
      `SELECT key, value FROM pd_platform_config ORDER BY key`,
    );

    const settings: Record<string, string | number | boolean> = {};
    for (const row of rows) {
      if (booleanGlobalSettingKeys.has(row.key)) settings[row.key] = row.value === 'true';
      else if (numericGlobalSettingKeys.has(row.key)) {
        const numericValue = Number(row.value);
        settings[row.key] = Number.isFinite(numericValue) ? numericValue : row.value;
      } else settings[row.key] = row.value;
    }

    res.status(200).json({ data: settings });
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
    const entries = Object.entries(req.body).filter(([, v]) => v !== undefined);

    for (const [key, value] of entries) {
      await query(
        `INSERT INTO pd_platform_config (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
        [key, String(value), req.user!.id],
      );
    }

    logger.info(
      { admin_id: req.user!.id, keys: entries.map(([k]) => k) },
      'Admin updated platform settings',
    );

    res.status(200).json({ success: true, message: 'Settings updated' });
  }),
);

// =====================================================
// Audit Log Viewer
// =====================================================

const auditLogListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.string().optional(),
  search: z.string().optional(),
});

router.get(
  '/audit-log',
  validate(auditLogListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, action, search } = req.query as unknown as {
      page: number;
      limit: number;
      action?: string;
      search?: string;
    };
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (action) {
      conditions.push(`a.action = $${paramIdx++}`);
      params.push(action);
    }
    if (search) {
      conditions.push(`(a.resource_type ILIKE $${paramIdx} OR a.resource_id ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query<{
      id: string;
      admin_id: string;
      admin_email: string;
      action: string;
      resource_type: string;
      resource_id: string;
      details: Record<string, unknown> | null;
      ip_address: string | null;
      created_at: Date;
    }>(
      `SELECT a.id, a.admin_id, u.email AS admin_email, a.action,
              a.resource_type, a.resource_id, a.details, a.ip_address, a.created_at
       FROM pd_audit_log a
       LEFT JOIN pd_user u ON u.id = a.admin_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      [...params, limit, offset],
    );

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_audit_log a
       LEFT JOIN pd_user u ON u.id = a.admin_id
       ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    res.status(200).json({
      data: rows.map((r) => ({
        ...r,
        created_at: r.created_at.toISOString(),
      })),
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  }),
);

// =====================================================
// AI Cost Dashboard
// =====================================================

router.get(
  '/ai-costs',
  asyncHandler(async (_req: Request, res: Response) => {
    const [totalJobs, totalTokens, byType, topConsumers, recentJobs] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM pd_ai_job'),
      query<{ total: string }>(
        "SELECT COALESCE(SUM(tokens_used), 0)::text AS total FROM pd_ai_job WHERE status = 'completed'",
      ),
      query<{ type: string; count: string; tokens: string }>(
        `SELECT type, COUNT(*)::text AS count, COALESCE(SUM(tokens_used), 0)::text AS tokens
         FROM pd_ai_job GROUP BY type ORDER BY count DESC`,
      ),
      query<{ store_id: string; store_name: string; total_tokens: string; job_count: string }>(
        `SELECT j.store_id, s.name AS store_name,
                SUM(j.tokens_used)::text AS total_tokens,
                COUNT(*)::text AS job_count
         FROM pd_ai_job j
         JOIN pd_store s ON s.id = j.store_id
         WHERE j.status = 'completed'
         GROUP BY j.store_id, s.name
         ORDER BY SUM(j.tokens_used) DESC
         LIMIT 10`,
      ),
      query<{ date: string; count: string; tokens: string }>(
        `SELECT DATE(created_at)::text AS date,
                COUNT(*)::text AS count,
                COALESCE(SUM(tokens_used), 0)::text AS tokens
         FROM pd_ai_job
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
      ),
    ]);

    res.status(200).json({
      total_jobs: parseInt(totalJobs.rows[0].count, 10),
      total_tokens: parseInt(totalTokens.rows[0].total, 10),
      estimated_cost_tnd: parseFloat(totalTokens.rows[0].total) * 0.005,
      by_type: byType.rows.map((r) => ({
        type: r.type,
        count: parseInt(r.count, 10),
        tokens: parseInt(r.tokens, 10),
      })),
      top_consumers: topConsumers.rows.map((r) => ({
        store_id: r.store_id,
        store_name: r.store_name,
        total_tokens: parseInt(r.total_tokens, 10),
        job_count: parseInt(r.job_count, 10),
      })),
      daily_usage: recentJobs.rows.map((r) => ({
        date: r.date,
        count: parseInt(r.count, 10),
        tokens: parseInt(r.tokens, 10),
      })),
    });
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

export default router;
