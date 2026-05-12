import type { Request } from 'express';
import { query } from '../db/pool';
import { PdError } from '../errors';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';

export type SystemLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface SystemLogRow {
  id: string;
  level: SystemLogLevel;
  source: string;
  event_type: string;
  message: string;
  request_id: string | null;
  method: string | null;
  path: string | null;
  status_code: number | null;
  user_id: string | null;
  user_role: string | null;
  ip: string | null;
  user_agent: string | null;
  error_name: string | null;
  error_code: string | null;
  stack: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface CreateSystemLogInput {
  level: SystemLogLevel;
  source?: string;
  event_type?: string;
  message: string;
  request_id?: string | null;
  method?: string | null;
  path?: string | null;
  status_code?: number | null;
  user_id?: string | null;
  user_role?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  error_name?: string | null;
  error_code?: string | null;
  stack?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SystemLogFilterOptions {
  level?: string;
  eventType?: string;
  source?: string;
  statusCode?: number;
  requestId?: string;
  hasStack?: boolean;
  from?: Date;
  to?: Date;
  search?: string;
}

export interface ClearSystemLogOptions extends SystemLogFilterOptions {
  ids?: string[];
  olderThanDays?: number;
  clearAll?: boolean;
}

const REDACT_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'secret',
  'api_key',
  'flouci_app_secret',
  'konnect_api_key',
]);

function clampText(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function redactMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => redactMetadata(entry));
  if (!value || typeof value !== 'object') return value;

  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    redacted[key] = REDACT_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redactMetadata(entry);
  }
  return redacted;
}

function cleanMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!metadata) return {};
  return redactMetadata(metadata) as Record<string, unknown>;
}

function buildWhere(opts: SystemLogFilterOptions) {
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (opts.level) {
    params.push(opts.level);
    conditions.push(`level = $${params.length}`);
  }
  if (opts.eventType) {
    params.push(opts.eventType);
    conditions.push(`event_type = $${params.length}`);
  }
  if (opts.source) {
    params.push(opts.source);
    conditions.push(`source = $${params.length}`);
  }
  if (opts.statusCode) {
    params.push(opts.statusCode);
    conditions.push(`status_code = $${params.length}`);
  }
  if (opts.requestId) {
    params.push(opts.requestId);
    conditions.push(`request_id = $${params.length}`);
  }
  if (opts.hasStack !== undefined) {
    conditions.push(opts.hasStack ? 'stack IS NOT NULL' : 'stack IS NULL');
  }
  if (opts.from) {
    params.push(opts.from);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (opts.to) {
    params.push(opts.to);
    conditions.push(`created_at <= $${params.length}`);
  }
  if (opts.search?.trim()) {
    params.push(`%${opts.search.trim()}%`);
    conditions.push(`(
      message ILIKE $${params.length}
      OR source ILIKE $${params.length}
      OR event_type ILIKE $${params.length}
      OR COALESCE(method, '') ILIKE $${params.length}
      OR COALESCE(path, '') ILIKE $${params.length}
      OR COALESCE(request_id, '') ILIKE $${params.length}
      OR COALESCE(error_code, '') ILIKE $${params.length}
      OR COALESCE(error_name, '') ILIKE $${params.length}
      OR COALESCE(user_id, '') ILIKE $${params.length}
    )`);
  }

  return {
    conditions,
    params,
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
  };
}

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown server error';
}

function errorName(err: unknown) {
  return err instanceof Error ? err.name : typeof err;
}

function errorCode(err: unknown) {
  if (err instanceof PdError) return err.code;
  const code = (err as { code?: unknown })?.code;
  return typeof code === 'string' ? code : null;
}

function errorStack(err: unknown) {
  return err instanceof Error ? err.stack ?? null : null;
}

export class SystemLogService {
  async create(input: CreateSystemLogInput): Promise<SystemLogRow> {
    const id = pdId('syslog');
    const metadata = cleanMetadata(input.metadata);
    const { rows } = await query<SystemLogRow>(
      `INSERT INTO pd_system_log
        (id, level, source, event_type, message, request_id, method, path, status_code,
         user_id, user_role, ip, user_agent, error_name, error_code, stack, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
               $10, $11, $12, $13, $14, $15, $16, $17::jsonb)
       RETURNING *`,
      [
        id,
        input.level,
        clampText(input.source, 80) ?? 'backend',
        clampText(input.event_type, 80) ?? 'server_error',
        clampText(input.message, 4000) ?? 'System event',
        clampText(input.request_id, 64),
        clampText(input.method, 12),
        clampText(input.path, 2000),
        input.status_code ?? null,
        clampText(input.user_id, 64),
        clampText(input.user_role, 40),
        clampText(input.ip, 80),
        clampText(input.user_agent, 2000),
        clampText(input.error_name, 120),
        clampText(input.error_code, 120),
        clampText(input.stack, 12000),
        JSON.stringify(metadata),
      ],
    );
    return rows[0];
  }

  captureError(err: unknown, req?: Request, statusCode = 500, metadata: Record<string, unknown> = {}): void {
    void this.create({
      level: statusCode >= 500 ? 'error' : 'warn',
      source: 'backend',
      event_type: statusCode >= 500 ? 'server_error' : 'request_error',
      message: errorMessage(err),
      request_id: req?.requestId ?? null,
      method: req?.method ?? null,
      path: req?.originalUrl ?? null,
      status_code: statusCode,
      user_id: req?.user?.id ?? null,
      user_role: req?.user?.role ?? null,
      ip: req?.ip ?? null,
      user_agent: req?.headers['user-agent'] ?? null,
      error_name: errorName(err),
      error_code: errorCode(err),
      stack: errorStack(err),
      metadata,
    }).catch((logErr) => {
      logger.warn({ err: logErr }, 'Failed to persist system log');
    });
  }

  async list(opts: SystemLogFilterOptions & { page?: number; limit?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 50);
    const offset = (page - 1) * limit;
    const { params, where } = buildWhere(opts);
    params.push(limit, offset);
    const { rows } = await query<SystemLogRow>(
      `SELECT *
       FROM pd_system_log
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_system_log ${where}`,
      params.slice(0, -2),
    );
    const total = parseInt(countRows[0].count, 10);
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  async deleteById(id: string): Promise<number> {
    const result = await query('DELETE FROM pd_system_log WHERE id = $1', [id]);
    return result.rowCount ?? 0;
  }

  async clear(opts: ClearSystemLogOptions): Promise<number> {
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (opts.ids && opts.ids.length > 0) {
      params.push(opts.ids);
      conditions.push(`id = ANY($${params.length}::varchar[])`);
    }
    if (opts.olderThanDays) {
      params.push(opts.olderThanDays);
      conditions.push(`created_at < NOW() - ($${params.length}::int * INTERVAL '1 day')`);
    }

    const filtered = buildWhere(opts);
    if (filtered.conditions.length > 0) {
      const offset = params.length;
      conditions.push(
        ...filtered.conditions.map((condition) =>
          condition.replace(/\$(\d+)/g, (_match, index: string) => `$${Number(index) + offset}`),
        ),
      );
      params.push(...filtered.params);
    }

    if (!opts.clearAll && conditions.length === 0) {
      return 0;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(`DELETE FROM pd_system_log ${where}`, params);
    return result.rowCount ?? 0;
  }

  async summary() {
    const { rows } = await query<{
      total: string;
      info: string;
      errors: string;
      warnings: string;
      fatal: string;
      last_hour: string;
      last_24h: string;
      unresolved_500s: string;
      manual_logs: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE level = 'info')::text AS info,
         COUNT(*) FILTER (WHERE level = 'error')::text AS errors,
         COUNT(*) FILTER (WHERE level = 'warn')::text AS warnings,
         COUNT(*) FILTER (WHERE level = 'fatal')::text AS fatal,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour')::text AS last_hour,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::text AS last_24h,
         COUNT(*) FILTER (WHERE status_code >= 500 AND created_at >= NOW() - INTERVAL '24 hours')::text AS unresolved_500s,
         COUNT(*) FILTER (WHERE event_type = 'admin_manual_log')::text AS manual_logs
       FROM pd_system_log`,
    );
    const row = rows[0];
    return {
      total: parseInt(row.total, 10),
      info: parseInt(row.info, 10),
      errors: parseInt(row.errors, 10),
      warnings: parseInt(row.warnings, 10),
      fatal: parseInt(row.fatal, 10),
      last_hour: parseInt(row.last_hour, 10),
      last_24h: parseInt(row.last_24h, 10),
      unresolved_500s: parseInt(row.unresolved_500s, 10),
      manual_logs: parseInt(row.manual_logs, 10),
    };
  }
}

export const systemLogService = new SystemLogService();
