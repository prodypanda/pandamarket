/**
 * ReportService — fraud signaling.
 * A customer can report a vendor (optionally tied to a specific order).
 */

import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import {
  PdConflictError,
  PdErrorCode,
  PdNotFoundError,
  PdValidationError,
} from '../errors';
import { ReportStatus } from '@pandamarket/types';
import { logger } from '../utils/logger';

export interface ReportRow {
  id: string;
  reporter_id: string;
  store_id: string;
  order_id: string | null;
  reason: string;
  evidence_urls: string[];
  status: ReportStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: Date | null;
  created_at: Date;
}

export class ReportService {
  async create(opts: {
    reporter_id: string;
    store_id: string;
    order_id?: string;
    reason: string;
    evidence_urls?: string[];
  }): Promise<ReportRow> {
    if (!opts.reason || opts.reason.trim().length < 10) {
      throw new PdValidationError('Reason must be at least 10 characters');
    }
    try {
      const id = pdId('report');
      const { rows } = await query<ReportRow>(
        `INSERT INTO pd_reports
          (id, reporter_id, store_id, order_id, reason, evidence_urls)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          id,
          opts.reporter_id,
          opts.store_id,
          opts.order_id ?? null,
          opts.reason,
          JSON.stringify(opts.evidence_urls ?? []),
        ],
      );
      logger.info({ report_id: id, store_id: opts.store_id }, 'Report created');
      return rows[0];
    } catch (err) {
      // unique_violation = duplicate report (same reporter + store + order)
      if ((err as { code?: string }).code === '23505') {
        throw new PdConflictError(
          PdErrorCode.REPORT_DUPLICATE,
          'You have already reported this vendor for this order',
        );
      }
      throw err;
    }
  }

  async getById(id: string): Promise<ReportRow> {
    const { rows } = await query<ReportRow>('SELECT * FROM pd_reports WHERE id = $1', [id]);
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.REPORT_NOT_FOUND, 'Report not found');
    return rows[0];
  }

  async list(opts: { status?: ReportStatus; page?: number; limit?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    let where = '';
    if (opts.status) {
      params.push(opts.status);
      where = 'WHERE status = $1';
    }
    params.push(limit, offset);
    const { rows } = await query<ReportRow>(
      `SELECT * FROM pd_reports ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const cntParams = opts.status ? [opts.status] : [];
    const { rows: cnt } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_reports ${where}`,
      cntParams,
    );
    const total = parseInt(cnt[0].count, 10);
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  async updateStatus(
    id: string,
    status: ReportStatus,
    adminId: string,
    notes?: string,
  ): Promise<ReportRow> {
    const isResolved = status === ReportStatus.Resolved || status === ReportStatus.Dismissed;
    const { rows } = await query<ReportRow>(
      `UPDATE pd_reports
       SET status = $2,
           admin_notes = COALESCE($3, admin_notes),
           resolved_by = CASE WHEN $4::boolean THEN $5 ELSE NULL END,
           resolved_at = CASE WHEN $4::boolean THEN NOW() ELSE NULL END
       WHERE id = $1 RETURNING *`,
      [id, status, notes ?? null, isResolved, adminId],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.REPORT_NOT_FOUND, 'Report not found');
    return rows[0];
  }
}

export const reportService = new ReportService();
