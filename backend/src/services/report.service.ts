import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import {
  PdConflictError,
  PdErrorCode,
  PdNotFoundError,
  PdValidationError,
} from '../errors';
import {
  ReportEventType,
  ReportMessageVisibility,
  ReportPriority,
  ReportSource,
  ReportStatus,
  ReportTargetType,
  UserRole,
} from '@pandamarket/types';
import { logger } from '../utils/logger';

export interface ReportRow {
  id: string;
  reporter_id: string;
  reporter_email?: string | null;
  reporter_role?: string | null;
  source: ReportSource;
  target_type: ReportTargetType;
  target_user_id: string | null;
  target_user_email?: string | null;
  target_user_role?: string | null;
  target_user_is_active?: boolean | null;
  store_id: string | null;
  store_name?: string | null;
  store_subdomain?: string | null;
  store_status?: string | null;
  order_id: string | null;
  category: string;
  priority: ReportPriority;
  reason: string;
  evidence_urls: string[];
  status: ReportStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolver_email?: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface ReportSummary {
  total: number;
  open: number;
  investigating: number;
  resolved: number;
  dismissed: number;
  seller_reports: number;
  buyer_reports: number;
  high_priority: number;
}

export interface ReportTargetRow {
  id: string;
  label: string;
  email: string | null;
  secondary: string | null;
  status: string | null;
}

export interface ReportAttachmentInput {
  file_url?: string | null;
  file_key?: string | null;
  file_name: string;
  content_type: string;
  file_size?: number | null;
}

export interface ReportMessageRow {
  id: string;
  report_id: string;
  author_id: string | null;
  author_email?: string | null;
  author_role: string;
  visibility: ReportMessageVisibility;
  body: string;
  created_at: Date;
  updated_at: Date | null;
}

export interface ReportAttachmentRow {
  id: string;
  report_id: string;
  message_id: string | null;
  uploaded_by: string | null;
  uploader_email?: string | null;
  visibility: ReportMessageVisibility;
  file_url: string | null;
  file_key: string | null;
  file_name: string;
  content_type: string;
  file_size: string | number | null;
  created_at: Date;
}

export interface ReportEventRow {
  id: string;
  report_id: string;
  actor_id: string | null;
  actor_email?: string | null;
  event_type: ReportEventType;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface ReportCaseDetails {
  report: ReportRow;
  messages: ReportMessageRow[];
  attachments: ReportAttachmentRow[];
  events: ReportEventRow[];
}

interface ReportActorContext {
  id: string;
  role: UserRole;
  store_id?: string | null;
}

const REPORT_SELECT = `
  SELECT
    r.*,
    reporter.email AS reporter_email,
    reporter.role AS reporter_role,
    target.email AS target_user_email,
    target.role AS target_user_role,
    target.is_active AS target_user_is_active,
    s.name AS store_name,
    s.subdomain AS store_subdomain,
    s.status AS store_status,
    resolver.email AS resolver_email
  FROM pd_reports r
  LEFT JOIN pd_user reporter ON reporter.id = r.reporter_id
  LEFT JOIN pd_user target ON target.id = r.target_user_id
  LEFT JOIN pd_store s ON s.id = r.store_id
  LEFT JOIN pd_user resolver ON resolver.id = r.resolved_by
`;

const REPORT_FROM = `
  FROM pd_reports r
  LEFT JOIN pd_user reporter ON reporter.id = r.reporter_id
  LEFT JOIN pd_user target ON target.id = r.target_user_id
  LEFT JOIN pd_store s ON s.id = r.store_id
  LEFT JOIN pd_user resolver ON resolver.id = r.resolved_by
`;

function ensureReason(reason: string) {
  if (!reason || reason.trim().length < 10) {
    throw new PdValidationError('Reason must be at least 10 characters');
  }
  return reason.trim();
}

function ensureMessageBody(body: string) {
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > 5000) {
    throw new PdValidationError('Message must be between 1 and 5000 characters');
  }
  return trimmed;
}

function isAdminRole(role: UserRole) {
  return role === UserRole.Admin || role === UserRole.SuperAdmin;
}

function visibleForAudience(audience: 'buyer' | 'seller' | 'admin'): ReportMessageVisibility[] {
  if (audience === 'buyer') return [ReportMessageVisibility.BuyerAdmin, ReportMessageVisibility.AllParties];
  if (audience === 'seller') return [ReportMessageVisibility.SellerAdmin, ReportMessageVisibility.AllParties];
  return [
    ReportMessageVisibility.BuyerAdmin,
    ReportMessageVisibility.SellerAdmin,
    ReportMessageVisibility.AllParties,
    ReportMessageVisibility.AdminInternal,
  ];
}

export class ReportService {
  private async resolveSellerTarget(storeId?: string | null) {
    if (!storeId) {
      throw new PdValidationError('Seller reports require a store');
    }
    const { rows } = await query<{ id: string; owner_id: string; name: string }>(
      'SELECT id, owner_id, name FROM pd_store WHERE id = $1',
      [storeId],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    return { store_id: rows[0].id, target_user_id: rows[0].owner_id };
  }

  private async resolveBuyerTarget(targetUserId?: string | null) {
    if (!targetUserId) {
      throw new PdValidationError('Buyer reports require a target user');
    }
    const { rows } = await query<{ id: string; role: UserRole }>(
      'SELECT id, role FROM pd_user WHERE id = $1',
      [targetUserId],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Buyer not found');
    }
    if (rows[0].role !== UserRole.Customer) {
      throw new PdValidationError('Target user must be a buyer');
    }
    return { store_id: null, target_user_id: rows[0].id };
  }

  private async validateBuyerSellerOrder(reporterId: string, storeId: string, orderId?: string | null) {
    if (!orderId) return;
    const { rows } = await query<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1
        FROM pd_order o
        JOIN pd_order_item oi ON oi.order_id = o.id
        WHERE o.id = $1
          AND o.customer_id = $2
          AND oi.store_id = $3
      ) AS exists`,
      [orderId, reporterId, storeId],
    );
    if (!rows[0]?.exists) {
      throw new PdValidationError('Order does not belong to this buyer and seller');
    }
  }

  private async validateAdminOrder(targetType: ReportTargetType, targetUserId: string | null, storeId: string | null, orderId?: string | null) {
    if (!orderId) return;
    const params: unknown[] = [orderId];
    let where = 'o.id = $1';
    if (targetType === ReportTargetType.Seller && storeId) {
      params.push(storeId);
      where += ` AND EXISTS (SELECT 1 FROM pd_order_item oi WHERE oi.order_id = o.id AND oi.store_id = $${params.length})`;
    }
    if (targetType === ReportTargetType.Buyer && targetUserId) {
      params.push(targetUserId);
      where += ` AND o.customer_id = $${params.length}`;
    }
    const { rows } = await query<{ exists: boolean }>(`SELECT EXISTS(SELECT 1 FROM pd_order o WHERE ${where}) AS exists`, params);
    if (!rows[0]?.exists) {
      throw new PdValidationError('Order does not match the selected report target');
    }
  }

  private async ensureBuyerReportNotDuplicate(reporterId: string, storeId: string, orderId?: string | null) {
    const { rows } = await query<{ id: string }>(
      `SELECT id
       FROM pd_reports
       WHERE reporter_id = $1
         AND source = $2
         AND target_type = $3
         AND store_id = $4
         AND (order_id IS NOT DISTINCT FROM $5::varchar)
         AND status = ANY($6::text[])
       LIMIT 1`,
      [
        reporterId,
        ReportSource.Buyer,
        ReportTargetType.Seller,
        storeId,
        orderId ?? null,
        [ReportStatus.Open, ReportStatus.Investigating, ReportStatus.AwaitingBuyer, ReportStatus.AwaitingSeller],
      ],
    );
    if (rows[0]) {
      throw new PdConflictError(
        PdErrorCode.REPORT_DUPLICATE,
        'You already have an active report for this seller',
      );
    }
  }

  async create(opts: {
    reporter_id: string;
    source: ReportSource;
    target_type: ReportTargetType;
    store_id?: string | null;
    target_user_id?: string | null;
    order_id?: string | null;
    category?: string;
    priority?: ReportPriority;
    reason: string;
    evidence_urls?: string[];
    admin_notes?: string | null;
  }): Promise<ReportRow> {
    const reason = ensureReason(opts.reason);
    const target = opts.target_type === ReportTargetType.Seller
      ? await this.resolveSellerTarget(opts.store_id)
      : await this.resolveBuyerTarget(opts.target_user_id);

    if (opts.source === ReportSource.Buyer) {
      if (opts.target_type !== ReportTargetType.Seller || !target.store_id) {
        throw new PdValidationError('Buyers can only report sellers');
      }
      await this.validateBuyerSellerOrder(opts.reporter_id, target.store_id, opts.order_id);
      await this.ensureBuyerReportNotDuplicate(opts.reporter_id, target.store_id, opts.order_id);
    } else {
      await this.validateAdminOrder(opts.target_type, target.target_user_id, target.store_id, opts.order_id);
    }

    try {
      const id = pdId('report');
      const { rows } = await query<ReportRow>(
        `INSERT INTO pd_reports
          (id, reporter_id, source, target_type, target_user_id, store_id, order_id, category, priority, reason, evidence_urls, admin_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          id,
          opts.reporter_id,
          opts.source,
          opts.target_type,
          target.target_user_id,
          target.store_id,
          opts.order_id ?? null,
          opts.category ?? 'other',
          opts.priority ?? ReportPriority.Medium,
          reason,
          JSON.stringify(opts.evidence_urls ?? []),
          opts.admin_notes ?? null,
        ],
      );
      logger.info({ report_id: id, target_type: opts.target_type, source: opts.source }, 'Report created');
      await this.createEvent(id, opts.reporter_id, ReportEventType.CaseCreated, {
        source: opts.source,
        target_type: opts.target_type,
      });
      return rows[0];
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new PdConflictError(
          PdErrorCode.REPORT_DUPLICATE,
          'A matching report already exists',
        );
      }
      throw err;
    }
  }

  async createBuyerSellerReport(opts: {
    reporter_id: string;
    store_id: string;
    order_id?: string;
    reason: string;
    evidence_urls?: string[];
    category?: string;
  }): Promise<ReportRow> {
    return this.create({
      reporter_id: opts.reporter_id,
      source: ReportSource.Buyer,
      target_type: ReportTargetType.Seller,
      store_id: opts.store_id,
      order_id: opts.order_id,
      reason: opts.reason,
      evidence_urls: opts.evidence_urls,
      category: opts.category,
      priority: ReportPriority.Medium,
    });
  }

  async getById(id: string): Promise<ReportRow> {
    const { rows } = await query<ReportRow>(`${REPORT_SELECT} WHERE r.id = $1`, [id]);
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.REPORT_NOT_FOUND, 'Report not found');
    return rows[0];
  }

  async list(opts: {
    status?: ReportStatus;
    targetType?: ReportTargetType;
    source?: ReportSource;
    priority?: ReportPriority;
    search?: string;
    reporterId?: string;
    storeId?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (opts.status) {
      params.push(opts.status);
      conditions.push(`r.status = $${params.length}`);
    }
    if (opts.targetType) {
      params.push(opts.targetType);
      conditions.push(`r.target_type = $${params.length}`);
    }
    if (opts.source) {
      params.push(opts.source);
      conditions.push(`r.source = $${params.length}`);
    }
    if (opts.priority) {
      params.push(opts.priority);
      conditions.push(`r.priority = $${params.length}`);
    }
    if (opts.reporterId) {
      params.push(opts.reporterId);
      conditions.push(`r.reporter_id = $${params.length}`);
    }
    if (opts.storeId) {
      params.push(opts.storeId);
      conditions.push(`r.store_id = $${params.length}`);
    }
    if (opts.search?.trim()) {
      params.push(`%${opts.search.trim()}%`);
      conditions.push(`(
        r.id ILIKE $${params.length}
        OR r.reason ILIKE $${params.length}
        OR COALESCE(r.order_id, '') ILIKE $${params.length}
        OR COALESCE(reporter.email, '') ILIKE $${params.length}
        OR COALESCE(target.email, '') ILIKE $${params.length}
        OR COALESCE(s.name, '') ILIKE $${params.length}
        OR COALESCE(s.subdomain, '') ILIKE $${params.length}
      )`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const { rows } = await query<ReportRow>(
      `${REPORT_SELECT}
       ${where}
       ORDER BY
         CASE r.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const countParams = params.slice(0, -2);
    const { rows: cnt } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       ${REPORT_FROM}
       ${where}`,
      countParams,
    );
    const { rows: summaryRows } = await query<{
      total: string;
      open: string;
      investigating: string;
      resolved: string;
      dismissed: string;
      seller_reports: string;
      buyer_reports: string;
      high_priority: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE r.status = 'open')::text AS open,
         COUNT(*) FILTER (WHERE r.status = 'investigating')::text AS investigating,
         COUNT(*) FILTER (WHERE r.status = 'resolved')::text AS resolved,
         COUNT(*) FILTER (WHERE r.status = 'dismissed')::text AS dismissed,
         COUNT(*) FILTER (WHERE r.target_type = 'seller')::text AS seller_reports,
         COUNT(*) FILTER (WHERE r.target_type = 'buyer')::text AS buyer_reports,
         COUNT(*) FILTER (WHERE r.priority IN ('high', 'critical'))::text AS high_priority
       ${REPORT_FROM}
       ${where}`,
      countParams,
    );
    const total = parseInt(cnt[0].count, 10);
    const summaryRow = summaryRows[0];
    const summary: ReportSummary = {
      total: parseInt(summaryRow.total, 10),
      open: parseInt(summaryRow.open, 10),
      investigating: parseInt(summaryRow.investigating, 10),
      resolved: parseInt(summaryRow.resolved, 10),
      dismissed: parseInt(summaryRow.dismissed, 10),
      seller_reports: parseInt(summaryRow.seller_reports, 10),
      buyer_reports: parseInt(summaryRow.buyer_reports, 10),
      high_priority: parseInt(summaryRow.high_priority, 10),
    };
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit), summary } };
  }

  async listByStore(
    storeId: string,
    opts: { status?: ReportStatus; page?: number; limit?: number } = {},
  ) {
    return this.list({ storeId, status: opts.status, page: opts.page, limit: opts.limit, targetType: ReportTargetType.Seller });
  }

  async listByReporter(
    reporterId: string,
    opts: { status?: ReportStatus; page?: number; limit?: number } = {},
  ) {
    return this.list({ reporterId, status: opts.status, page: opts.page, limit: opts.limit, source: ReportSource.Buyer });
  }

  private async createEvent(
    reportId: string,
    actorId: string | null,
    eventType: ReportEventType,
    metadata: Record<string, unknown> = {},
  ) {
    await query(
      `INSERT INTO pd_report_events (id, report_id, actor_id, event_type, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [pdId('report_event'), reportId, actorId, eventType, JSON.stringify(metadata)],
    );
  }

  private async listMessages(reportId: string, audience: 'buyer' | 'seller' | 'admin') {
    const visible = visibleForAudience(audience);
    const { rows } = await query<ReportMessageRow>(
      `SELECT m.*, u.email AS author_email
       FROM pd_report_messages m
       LEFT JOIN pd_user u ON u.id = m.author_id
       WHERE m.report_id = $1
         AND m.visibility = ANY($2::text[])
       ORDER BY m.created_at ASC`,
      [reportId, visible],
    );
    return rows;
  }

  private async listAttachments(reportId: string, audience: 'buyer' | 'seller' | 'admin') {
    const visible = visibleForAudience(audience);
    const { rows } = await query<ReportAttachmentRow>(
      `SELECT a.*, u.email AS uploader_email
       FROM pd_report_attachments a
       LEFT JOIN pd_user u ON u.id = a.uploaded_by
       WHERE a.report_id = $1
         AND a.visibility = ANY($2::text[])
       ORDER BY a.created_at ASC`,
      [reportId, visible],
    );
    return rows;
  }

  private async listEvents(reportId: string) {
    const { rows } = await query<ReportEventRow>(
      `SELECT e.*, u.email AS actor_email
       FROM pd_report_events e
       LEFT JOIN pd_user u ON u.id = e.actor_id
       WHERE e.report_id = $1
       ORDER BY e.created_at ASC`,
      [reportId],
    );
    return rows;
  }

  private async getCaseDetails(report: ReportRow, audience: 'buyer' | 'seller' | 'admin'): Promise<ReportCaseDetails> {
    const [messages, attachments, events] = await Promise.all([
      this.listMessages(report.id, audience),
      this.listAttachments(report.id, audience),
      this.listEvents(report.id),
    ]);
    return { report, messages, attachments, events };
  }

  private async insertMessage(opts: {
    reportId: string;
    authorId: string;
    authorRole: UserRole;
    visibility: ReportMessageVisibility;
    body: string;
    attachments?: ReportAttachmentInput[];
  }) {
    const body = ensureMessageBody(opts.body);
    const messageId = pdId('report_msg');
    await query(
      `INSERT INTO pd_report_messages (id, report_id, author_id, author_role, visibility, body)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [messageId, opts.reportId, opts.authorId, opts.authorRole, opts.visibility, body],
    );
    if (opts.attachments?.length) {
      for (const attachment of opts.attachments) {
        await query(
          `INSERT INTO pd_report_attachments
             (id, report_id, message_id, uploaded_by, visibility, file_url, file_key, file_name, content_type, file_size)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            pdId('report_file'),
            opts.reportId,
            messageId,
            opts.authorId,
            opts.visibility,
            attachment.file_url ?? null,
            attachment.file_key ?? null,
            attachment.file_name,
            attachment.content_type,
            attachment.file_size ?? null,
          ],
        );
      }
    }
    await this.createEvent(opts.reportId, opts.authorId, ReportEventType.MessageAdded, {
      message_id: messageId,
      visibility: opts.visibility,
    });
    if (opts.attachments?.length) {
      await this.createEvent(opts.reportId, opts.authorId, ReportEventType.AttachmentAdded, {
        message_id: messageId,
        count: opts.attachments.length,
        visibility: opts.visibility,
      });
    }
    return messageId;
  }

  async getBuyerCase(id: string, buyerId: string) {
    const report = await this.getById(id);
    if (report.reporter_id !== buyerId) {
      throw new PdNotFoundError(PdErrorCode.REPORT_NOT_FOUND, 'Report not found');
    }
    return this.getCaseDetails(report, 'buyer');
  }

  async getStoreCase(id: string, storeId: string) {
    const report = await this.getById(id);
    if (report.store_id !== storeId || report.target_type !== ReportTargetType.Seller) {
      throw new PdNotFoundError(PdErrorCode.REPORT_NOT_FOUND, 'Report not found');
    }
    return this.getCaseDetails(report, 'seller');
  }

  async getAdminCase(id: string) {
    const report = await this.getById(id);
    return this.getCaseDetails(report, 'admin');
  }

  async addBuyerMessage(reportId: string, buyerId: string, body: string, attachments?: ReportAttachmentInput[]) {
    await this.getBuyerCase(reportId, buyerId);
    await this.insertMessage({
      reportId,
      authorId: buyerId,
      authorRole: UserRole.Customer,
      visibility: ReportMessageVisibility.BuyerAdmin,
      body,
      attachments,
    });
    return this.getBuyerCase(reportId, buyerId);
  }

  async addSellerMessage(reportId: string, actor: ReportActorContext, body: string, attachments?: ReportAttachmentInput[]) {
    if (!actor.store_id) {
      throw new PdNotFoundError(PdErrorCode.REPORT_NOT_FOUND, 'Report not found');
    }
    await this.getStoreCase(reportId, actor.store_id);
    await this.insertMessage({
      reportId,
      authorId: actor.id,
      authorRole: actor.role,
      visibility: ReportMessageVisibility.SellerAdmin,
      body,
      attachments,
    });
    return this.getStoreCase(reportId, actor.store_id);
  }

  async addAdminMessage(reportId: string, actor: ReportActorContext, body: string, visibility: ReportMessageVisibility, attachments?: ReportAttachmentInput[]) {
    await this.getAdminCase(reportId);
    await this.insertMessage({
      reportId,
      authorId: actor.id,
      authorRole: actor.role,
      visibility,
      body,
      attachments,
    });
    return this.getAdminCase(reportId);
  }

  async canAccessAttachmentKey(actor: ReportActorContext, key: string): Promise<boolean> {
    const { rows } = await query<{
      reporter_id: string;
      store_id: string | null;
      target_type: ReportTargetType;
      visibility: ReportMessageVisibility;
    }>(
      `SELECT r.reporter_id, r.store_id, r.target_type, a.visibility
       FROM pd_report_attachments a
       JOIN pd_reports r ON r.id = a.report_id
       WHERE a.file_key = $1
       LIMIT 1`,
      [key],
    );
    const attachment = rows[0];
    if (!attachment) return false;
    if (isAdminRole(actor.role)) return true;
    if (
      actor.role === UserRole.Customer &&
      attachment.reporter_id === actor.id &&
      [ReportMessageVisibility.BuyerAdmin, ReportMessageVisibility.AllParties].includes(attachment.visibility)
    ) {
      return true;
    }
    return Boolean(
      actor.role === UserRole.Vendor &&
      actor.store_id &&
      attachment.store_id === actor.store_id &&
      attachment.target_type === ReportTargetType.Seller &&
      [ReportMessageVisibility.SellerAdmin, ReportMessageVisibility.AllParties].includes(attachment.visibility),
    );
  }

  async listTargets(type: ReportTargetType, search?: string, limit = 20): Promise<ReportTargetRow[]> {
    const normalizedLimit = Math.min(50, Math.max(1, limit));
    const searchTerm = `%${(search ?? '').trim()}%`;
    if (type === ReportTargetType.Seller) {
      const { rows } = await query<ReportTargetRow>(
        `SELECT
           s.id,
           s.name AS label,
           u.email,
           s.subdomain AS secondary,
           s.status
         FROM pd_store s
         LEFT JOIN pd_user u ON u.id = s.owner_id
         WHERE $1 = '%%'
            OR s.name ILIKE $1
            OR s.subdomain ILIKE $1
            OR COALESCE(u.email, '') ILIKE $1
         ORDER BY s.created_at DESC
         LIMIT $2`,
        [searchTerm, normalizedLimit],
      );
      return rows;
    }
    const { rows } = await query<ReportTargetRow>(
      `SELECT
         u.id,
         COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email) AS label,
         u.email,
         u.phone AS secondary,
         CASE WHEN u.is_active THEN 'active' ELSE 'inactive' END AS status
       FROM pd_user u
       WHERE u.role = $1
         AND (
           $2 = '%%'
           OR u.id ILIKE $2
           OR u.email ILIKE $2
           OR COALESCE(u.first_name, '') ILIKE $2
           OR COALESCE(u.last_name, '') ILIKE $2
           OR COALESCE(u.phone, '') ILIKE $2
         )
       ORDER BY u.created_at DESC
       LIMIT $3`,
      [UserRole.Customer, searchTerm, normalizedLimit],
    );
    return rows;
  }

  async updateStatus(
    id: string,
    status: ReportStatus,
    adminId: string,
    notes?: string,
  ): Promise<ReportRow> {
    const isResolved = status === ReportStatus.Resolved || status === ReportStatus.Dismissed;
    const hasNotes = typeof notes === 'string';
    const { rows } = await query<ReportRow>(
      `UPDATE pd_reports
       SET status = $2,
           admin_notes = CASE WHEN $3::boolean THEN $4 ELSE admin_notes END,
           resolved_by = CASE WHEN $5::boolean THEN $6 ELSE NULL END,
           resolved_at = CASE WHEN $5::boolean THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, status, hasNotes, notes ?? null, isResolved, adminId],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.REPORT_NOT_FOUND, 'Report not found');
    await this.createEvent(id, adminId, ReportEventType.StatusChanged, { status });
    if (hasNotes) {
      await this.createEvent(id, adminId, ReportEventType.NoteUpdated, {});
    }
    return this.getById(id);
  }
}

export const reportService = new ReportService();
