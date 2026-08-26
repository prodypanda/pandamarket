import { query } from '../../db/pool';
import { PdErrorCode, PdNotFoundError } from '../../errors';
import { asyncHandler, validate } from '../../middlewares';
import { aiConfigService, type AiProvider } from '../../services/ai-config.service';
import { AiJobType } from '@pandamarket/types';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

/** AI Cost Dashboard — extracted from admin.route.ts (E15 split). */
const router = Router();

const aiStatsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const [summary, topConsumers, dailyUsage, byType, byStatus, recentFailures, recentActivity, creditWallets] =
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
        id: string;
        store_id: string;
        store_name: string;
        user_id: string | null;
        type: string;
        status: string;
        tokens_consumed: number;
        error_message: string | null;
        duration_seconds: number | null;
        created_at: Date;
        started_at: Date | null;
        completed_at: Date | null;
        input_meta: Record<string, unknown>;
        output: Record<string, unknown> | null;
      }>(
        `SELECT j.id, j.store_id, s.name AS store_name, j.user_id, j.type, j.status,
              COALESCE(j.tokens_consumed, 0) AS tokens_consumed,
              j.error_message,
              ROUND(EXTRACT(EPOCH FROM (COALESCE(j.completed_at, NOW()) - COALESCE(j.started_at, j.created_at)))::numeric, 2) AS duration_seconds,
              j.created_at, j.started_at, j.completed_at,
              j.input_meta, j.output
       FROM pd_ai_jobs j
       JOIN pd_store s ON s.id = j.store_id
       ORDER BY j.created_at DESC
       LIMIT 20`,
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
    recent_activity: recentActivity.rows.map((r) => ({
      id: r.id,
      store_id: r.store_id,
      store_name: r.store_name,
      user_id: r.user_id,
      type: r.type,
      status: r.status,
      tokens_consumed: Number(r.tokens_consumed) || 0,
      error_message: r.error_message,
      duration_seconds: r.duration_seconds !== null ? Number(r.duration_seconds) : null,
      created_at: r.created_at,
      started_at: r.started_at,
      completed_at: r.completed_at,
      input_meta: r.input_meta || {},
      output: r.output || null,
      provider_label: (r.output as any)?.provider || (r.input_meta as any)?.provider || null,
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

// Superadmin: Paginated AI Request History & Audit Log
const adminAiJobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  status: z.enum(['all', 'completed', 'failed', 'processing', 'queued']).default('all'),
  type: z.string().trim().max(60).optional(),
  store_id: z.string().trim().max(64).optional(),
  sort_by: z.enum(['created_at', 'tokens_consumed', 'duration_seconds', 'store_name']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

router.get(
  '/ai-jobs',
  validate(adminAiJobsQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;
    const search = ((req.query.search as string) || '').trim();
    const status = (req.query.status as string) || 'all';
    const type = ((req.query.type as string) || '').trim();
    const storeId = ((req.query.store_id as string) || '').trim();
    const sortBy = (req.query.sort_by as string) || 'created_at';
    const sortOrder = (req.query.sort_order as string) === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];

    if (status && status !== 'all') {
      values.push(status);
      conditions.push(`j.status = $${values.length}`);
    }

    if (type && type !== 'all') {
      values.push(type);
      conditions.push(`j.type = $${values.length}`);
    }

    if (storeId && storeId !== 'all') {
      values.push(storeId);
      conditions.push(`j.store_id = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      const idx = values.length;
      conditions.push(
        `(s.name ILIKE $${idx} OR j.id ILIKE $${idx} OR j.error_message ILIKE $${idx} OR j.type ILIKE $${idx} OR (j.input_meta)::text ILIKE $${idx} OR (j.output)::text ILIKE $${idx})`,
      );
    }

    const whereClause = conditions.join(' AND ');

    let orderExpr = 'j.created_at';
    if (sortBy === 'tokens_consumed') orderExpr = 'j.tokens_consumed';
    else if (sortBy === 'duration_seconds') orderExpr = 'duration_seconds';
    else if (sortBy === 'store_name') orderExpr = 's.name';

    const dataQueryValues = [...values, limit, offset];
    const dataSql = `
      SELECT j.id,
             j.store_id,
             s.name AS store_name,
             j.user_id,
             u.email AS user_email,
             TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS user_name,
             j.type,
             j.status,
             j.input_url,
             j.input_meta,
             j.output,
             COALESCE(j.tokens_consumed, 0) AS tokens_consumed,
             j.error_message,
             j.bullmq_job_id,
             ROUND(EXTRACT(EPOCH FROM (COALESCE(j.completed_at, NOW()) - COALESCE(j.started_at, j.created_at)))::numeric, 2) AS duration_seconds,
             j.created_at,
             j.started_at,
             j.completed_at
      FROM pd_ai_jobs j
      JOIN pd_store s ON s.id = j.store_id
      LEFT JOIN pd_user u ON u.id = j.user_id
      WHERE ${whereClause}
      ORDER BY ${orderExpr} ${sortOrder} NULLS LAST
      LIMIT $${dataQueryValues.length - 1} OFFSET $${dataQueryValues.length}
    `;

    const countSql = `
      SELECT COUNT(*)::text AS total,
             COUNT(*) FILTER (WHERE j.status = 'completed')::text AS completed_count,
             COUNT(*) FILTER (WHERE j.status = 'failed')::text AS failed_count,
             COUNT(*) FILTER (WHERE j.status IN ('processing', 'queued'))::text AS active_count,
             COALESCE(SUM(j.tokens_consumed), 0)::text AS total_tokens,
             ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(j.completed_at, NOW()) - COALESCE(j.started_at, j.created_at))))::numeric, 2)::text AS avg_duration_seconds
      FROM pd_ai_jobs j
      JOIN pd_store s ON s.id = j.store_id
      WHERE ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      query<{
        id: string;
        store_id: string;
        store_name: string;
        user_id: string | null;
        user_email: string | null;
        user_name: string | null;
        type: string;
        status: string;
        input_url: string | null;
        input_meta: Record<string, unknown>;
        output: Record<string, unknown> | null;
        tokens_consumed: number;
        error_message: string | null;
        bullmq_job_id: string | null;
        duration_seconds: number | null;
        created_at: Date;
        started_at: Date | null;
        completed_at: Date | null;
      }>(dataSql, dataQueryValues),
      query<{
        total: string;
        completed_count: string;
        failed_count: string;
        active_count: string;
        total_tokens: string;
        avg_duration_seconds: string | null;
      }>(countSql, values),
    ]);

    const total = parseInt(countResult.rows[0]?.total || '0', 10);
    const completedCount = parseInt(countResult.rows[0]?.completed_count || '0', 10);
    const failedCount = parseInt(countResult.rows[0]?.failed_count || '0', 10);
    const activeCount = parseInt(countResult.rows[0]?.active_count || '0', 10);
    const totalTokens = parseInt(countResult.rows[0]?.total_tokens || '0', 10);
    const avgDuration = countResult.rows[0]?.avg_duration_seconds ? parseFloat(countResult.rows[0].avg_duration_seconds) : 0;

    const data = dataResult.rows.map((row) => ({
      id: row.id,
      store_id: row.store_id,
      store_name: row.store_name,
      user_id: row.user_id,
      user_email: row.user_email || null,
      user_name: row.user_name?.trim() || row.user_email || null,
      type: row.type,
      status: row.status,
      input_url: row.input_url,
      input_meta: row.input_meta || {},
      output: row.output || null,
      tokens_consumed: Number(row.tokens_consumed) || 0,
      error_message: row.error_message,
      bullmq_job_id: row.bullmq_job_id,
      duration_seconds: row.duration_seconds !== null ? Number(row.duration_seconds) : null,
      provider_label: (row.output as any)?.provider || (row.input_meta as any)?.provider || null,
      created_at: row.created_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
    }));

    res.status(200).json({
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
      summary: {
        total,
        completed_count: completedCount,
        failed_count: failedCount,
        active_count: activeCount,
        total_tokens: totalTokens,
        avg_duration_seconds: avgDuration,
      },
    });
  }),
);

// Superadmin: Single AI Job Details
router.get(
  '/ai-jobs/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rows } = await query<{
      id: string;
      store_id: string;
      store_name: string;
      user_id: string | null;
      user_email: string | null;
      user_name: string | null;
      type: string;
      status: string;
      input_url: string | null;
      input_meta: Record<string, unknown>;
      output: Record<string, unknown> | null;
      tokens_consumed: number;
      error_message: string | null;
      bullmq_job_id: string | null;
      duration_seconds: number | null;
      created_at: Date;
      started_at: Date | null;
      completed_at: Date | null;
    }>(
      `SELECT j.id,
              j.store_id,
              s.name AS store_name,
              j.user_id,
              u.email AS user_email,
              TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS user_name,
              j.type,
              j.status,
              j.input_url,
              j.input_meta,
              j.output,
              COALESCE(j.tokens_consumed, 0) AS tokens_consumed,
              j.error_message,
              j.bullmq_job_id,
              ROUND(EXTRACT(EPOCH FROM (COALESCE(j.completed_at, NOW()) - COALESCE(j.started_at, j.created_at)))::numeric, 2) AS duration_seconds,
              j.created_at,
              j.started_at,
              j.completed_at
       FROM pd_ai_jobs j
       JOIN pd_store s ON s.id = j.store_id
       LEFT JOIN pd_user u ON u.id = j.user_id
       WHERE j.id = $1`,
      [id],
    );

    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'AI job not found');
    }

    const row = rows[0];
    res.status(200).json({
      data: {
        id: row.id,
        store_id: row.store_id,
        store_name: row.store_name,
        user_id: row.user_id,
        user_email: row.user_email || null,
        user_name: row.user_name?.trim() || row.user_email || null,
        type: row.type,
        status: row.status,
        input_url: row.input_url,
        input_meta: row.input_meta || {},
        output: row.output || null,
        tokens_consumed: Number(row.tokens_consumed) || 0,
        error_message: row.error_message,
        bullmq_job_id: row.bullmq_job_id,
        duration_seconds: row.duration_seconds !== null ? Number(row.duration_seconds) : null,
        provider_label: (row.output as any)?.provider || (row.input_meta as any)?.provider || null,
        created_at: row.created_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
      },
    });
  }),
);

const aiProviderConfigSchema = z.object({
  provider: z.enum(['gemini', 'openai', 'claude', 'custom', 'replicate']),
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
export default router;