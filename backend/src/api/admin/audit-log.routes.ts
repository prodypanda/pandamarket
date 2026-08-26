import { query } from '../../db/pool';
import { asyncHandler, validate } from '../../middlewares';
import { systemLogService } from '../../services/system-log.service';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

/** Audit Log Viewer — extracted from admin.route.ts (E15 split). */
const router = Router();

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
        ? ['customer']
        : log_type === 'seller'
          ? ['vendor']
          : ['admin', 'super_admin'];

    // Fully parameterized: dynamic interval via $1::int and role list via ANY($2).
    const { rowCount } = await query(
      `DELETE FROM pd_audit_log WHERE created_at < NOW() - ($1::int * INTERVAL '1 day') AND actor_role = ANY($2)`,
      [older_than_days, roleFilter],
    );

    res.status(200).json({ deleted: rowCount });
  }),
);
export default router;