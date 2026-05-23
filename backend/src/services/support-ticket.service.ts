import { query, transaction } from '../db/pool';
import { PdForbiddenError, PdNotFoundError, PdValidationError } from '../errors';
import { pdId } from '../utils/crypto';
import { notificationService } from './notification.service';

export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_seller' | 'waiting_admin' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportTicketCategory = 'general' | 'billing' | 'technical' | 'kyc' | 'orders' | 'returns' | 'custom_template';

interface ListInput {
  store_id: string;
  user_id: string;
  status?: SupportTicketStatus;
  page: number;
  limit: number;
}

interface CreateInput {
  store_id: string;
  user_id: string;
  subject: string;
  description: string;
  category?: SupportTicketCategory;
  priority?: SupportTicketPriority;
}


interface AdminListInput {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  category?: SupportTicketCategory;
  page: number;
  limit: number;
}

interface AdminReplyInput {
  ticket_id: string;
  admin_id: string;
  body: string;
  is_internal?: boolean;
}

interface AdminUpdateInput {
  ticket_id: string;
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  assigned_admin_id?: string | null;
}


interface AttachmentInput {
  ticket_id: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  file_url: string;
  message_id?: string;
}

interface ReplyInput {
  ticket_id: string;
  store_id: string;
  user_id: string;
  body: string;
}

function normalizeText(value: string, field: string, min = 1, max = 1000) {
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new PdValidationError(`${field} must be between ${min} and ${max} characters`);
  }
  return trimmed;
}

export class SupportTicketService {
  async listForSeller(input: ListInput) {
    const offset = (input.page - 1) * input.limit;
    const values: unknown[] = [input.store_id, input.user_id];
    let statusFilter = '';
    if (input.status) {
      values.push(input.status);
      statusFilter = ` AND t.status = $${values.length}`;
    }

    values.push(input.limit, offset);

    const { rows } = await query(
      `SELECT t.id, t.ticket_number, t.subject, t.category, t.priority, t.status, t.created_at, t.updated_at,
              (
                SELECT body FROM pd_support_ticket_message m
                WHERE m.ticket_id = t.id
                ORDER BY m.created_at DESC
                LIMIT 1
              ) AS last_message
       FROM pd_support_ticket t
       WHERE t.store_id = $1 AND t.created_by = $2${statusFilter}
       ORDER BY t.updated_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    const countValues: unknown[] = [input.store_id, input.user_id];
    let countFilter = '';
    if (input.status) {
      countValues.push(input.status);
      countFilter = ` AND status = $${countValues.length}`;
    }
    const countRes = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM pd_support_ticket WHERE store_id = $1 AND created_by = $2${countFilter}`,
      countValues,
    );

    return {
      data: rows,
      meta: {
        page: input.page,
        limit: input.limit,
        total: Number(countRes.rows[0]?.total || 0),
      },
    };
  }

  async createForSeller(input: CreateInput) {
    const subject = normalizeText(input.subject, 'Subject', 3, 255);
    const description = normalizeText(input.description, 'Description', 10, 5000);
    const ticketId = pdId('tkt');
    const messageId = pdId('tmsg');
    const ticketNumber = `PM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${ticketId.slice(-8).toUpperCase()}`;

    return transaction(async (client) => {
      await client.query(
        `INSERT INTO pd_support_ticket (
          id, ticket_number, store_id, created_by, category, priority, status, subject, description
        ) VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8)`,
        [
          ticketId,
          ticketNumber,
          input.store_id,
          input.user_id,
          input.category || 'general',
          input.priority || 'normal',
          subject,
          description,
        ],
      );

      await client.query(
        `INSERT INTO pd_support_ticket_message (id, ticket_id, author_id, body)
         VALUES ($1,$2,$3,$4)`,
        [messageId, ticketId, input.user_id, description],
      );

      const { rows } = await client.query(
        `SELECT id, ticket_number, subject, category, priority, status, created_at, updated_at
         FROM pd_support_ticket WHERE id = $1`,
        [ticketId],
      );

      const adminRows = await client.query<{ id: string }>(
        "SELECT id FROM pd_user WHERE role IN ('admin','super_admin') AND is_active = true",
      );
      for (const admin of adminRows.rows) {
        void notificationService.create({
          user_id: admin.id,
          type: 'support_ticket_created',
          title: 'New support ticket',
          message: `${subject} (${ticketNumber})`,
          data: { ticket_id: ticketId, store_id: input.store_id },
        });
      }

      return { ticket: rows[0] };
    });
  }

  async getSellerTicket(ticket_id: string, store_id: string, user_id: string) {
    const { rows } = await query(
      `SELECT id, ticket_number, store_id, created_by, subject, description, category, priority, status, created_at, updated_at
       FROM pd_support_ticket
       WHERE id = $1`,
      [ticket_id],
    );
    const ticket = rows[0];
    if (!ticket) throw new PdNotFoundError(undefined, 'Support ticket not found');
    if (ticket.store_id !== store_id || ticket.created_by !== user_id) {
      throw new PdForbiddenError(undefined, 'You do not have access to this support ticket');
    }

    const messagesRes = await query(
      `SELECT id, ticket_id, author_id, body, is_internal, created_at, updated_at
       FROM pd_support_ticket_message
       WHERE ticket_id = $1 AND is_internal = false
       ORDER BY created_at ASC`,
      [ticket_id],
    );

    const attachmentsRes = await query(
      `SELECT id, ticket_id, message_id, uploaded_by, file_name, mime_type, file_size_bytes, file_url, created_at
       FROM pd_support_ticket_attachment
       WHERE ticket_id = $1
       ORDER BY created_at ASC`,
      [ticket_id],
    );

    return { ticket, messages: messagesRes.rows, attachments: attachmentsRes.rows };
  }

  async replyAsSeller(input: ReplyInput) {
    const body = normalizeText(input.body, 'Message', 1, 5000);
    const ticket = await this.getSellerTicket(input.ticket_id, input.store_id, input.user_id);
    if (ticket.ticket.status === 'closed') {
      throw new PdValidationError('Closed tickets cannot be updated');
    }

    const messageId = pdId('tmsg');
    await query(
      `INSERT INTO pd_support_ticket_message (id, ticket_id, author_id, body)
       VALUES ($1,$2,$3,$4)`,
      [messageId, input.ticket_id, input.user_id, body],
    );

    const updateRes = await query<{ assigned_admin_id: string | null; ticket_number: string }>(
      `UPDATE pd_support_ticket
       SET status = 'waiting_admin', updated_at = NOW()
       WHERE id = $1
       RETURNING assigned_admin_id, ticket_number`,
      [input.ticket_id],
    );

    const assigned = updateRes.rows[0]?.assigned_admin_id;
    const targets = assigned ? [assigned] : (await query<{ id: string }>("SELECT id FROM pd_user WHERE role IN ('admin','super_admin') AND is_active = true")).rows.map((r) => r.id);
    for (const adminId of targets) {
      void notificationService.create({
        user_id: adminId,
        type: 'support_ticket_reply_seller',
        title: 'Seller replied on support ticket',
        message: `Ticket ${updateRes.rows[0]?.ticket_number || input.ticket_id} has a new seller reply.`,
        data: { ticket_id: input.ticket_id, store_id: input.store_id },
      });
    }

    return this.getSellerTicket(input.ticket_id, input.store_id, input.user_id);
  }

  async listForAdmin(input: AdminListInput) {
    const offset = (input.page - 1) * input.limit;
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (input.status) {
      values.push(input.status);
      conditions.push(`t.status = $${values.length}`);
    }
    if (input.priority) {
      values.push(input.priority);
      conditions.push(`t.priority = $${values.length}`);
    }
    if (input.category) {
      values.push(input.category);
      conditions.push(`t.category = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(input.limit, offset);

    const { rows } = await query(
      `SELECT t.id, t.ticket_number, t.store_id, s.name AS store_name, t.created_by, u.email AS seller_email,
              t.subject, t.category, t.priority, t.status, t.assigned_admin_id, t.created_at, t.updated_at
       FROM pd_support_ticket t
       LEFT JOIN pd_store s ON s.id = t.store_id
       LEFT JOIN pd_user u ON u.id = t.created_by
       ${where}
       ORDER BY t.updated_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    const countValues = values.slice(0, values.length - 2);
    const countRes = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM pd_support_ticket t ${where}`,
      countValues,
    );

    return { data: rows, meta: { page: input.page, limit: input.limit, total: Number(countRes.rows[0]?.total || 0) } };
  }

  async getAdminTicket(ticket_id: string) {
    const { rows } = await query(`SELECT * FROM pd_support_ticket WHERE id = $1`, [ticket_id]);
    const ticket = rows[0];
    if (!ticket) throw new PdNotFoundError(undefined, 'Support ticket not found');

    const messagesRes = await query(
      `SELECT id, ticket_id, author_id, body, is_internal, created_at, updated_at
       FROM pd_support_ticket_message WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [ticket_id],
    );

    const attachmentsRes = await query(
      `SELECT id, ticket_id, message_id, uploaded_by, file_name, mime_type, file_size_bytes, file_url, created_at
       FROM pd_support_ticket_attachment
       WHERE ticket_id = $1
       ORDER BY created_at ASC`,
      [ticket_id],
    );

    return { ticket, messages: messagesRes.rows, attachments: attachmentsRes.rows };
  }

  async replyAsAdmin(input: AdminReplyInput) {
    const body = normalizeText(input.body, 'Message', 1, 5000);
    await this.getAdminTicket(input.ticket_id);

    const messageId = pdId('tmsg');
    await query(
      `INSERT INTO pd_support_ticket_message (id, ticket_id, author_id, body, is_internal)
       VALUES ($1,$2,$3,$4,$5)`,
      [messageId, input.ticket_id, input.admin_id, body, Boolean(input.is_internal)],
    );

    const updateResult = await query<{ created_by: string; ticket_number: string }>(
      `UPDATE pd_support_ticket
       SET status = CASE WHEN $2::boolean THEN status ELSE 'waiting_seller' END,
           first_response_at = COALESCE(first_response_at, NOW()),
           updated_at = NOW()
       WHERE id = $1
       RETURNING created_by, ticket_number`,
      [input.ticket_id, Boolean(input.is_internal)],
    );

    if (!input.is_internal && updateResult.rows[0]?.created_by) {
      void notificationService.create({
        user_id: updateResult.rows[0].created_by,
        type: 'support_ticket_reply_admin',
        title: 'Support replied to your ticket',
        message: `Ticket ${updateResult.rows[0].ticket_number} has a new admin response.`,
        data: { ticket_id: input.ticket_id },
      });
    }

    return this.getAdminTicket(input.ticket_id);
  }

  async updateByAdmin(input: AdminUpdateInput) {
    await this.getAdminTicket(input.ticket_id);

    const updates: string[] = [];
    const values: unknown[] = [];
    if (input.status) {
      values.push(input.status);
      updates.push(`status = $${values.length}`);
      if (input.status === 'resolved') {
        updates.push('resolved_at = COALESCE(resolved_at, NOW())');
        updates.push('closed_at = NULL');
      } else if (input.status === 'closed') {
        updates.push('closed_at = COALESCE(closed_at, NOW())');
        updates.push('resolved_at = COALESCE(resolved_at, NOW())');
      } else {
        updates.push('resolved_at = NULL');
        updates.push('closed_at = NULL');
      }
    }
    if (input.priority) {
      values.push(input.priority);
      updates.push(`priority = $${values.length}`);
    }
    if (input.assigned_admin_id !== undefined) {
      values.push(input.assigned_admin_id);
      updates.push(`assigned_admin_id = $${values.length}`);
    }
    if (!updates.length) throw new PdValidationError('No ticket update fields provided');

    values.push(input.ticket_id);
    await query(`UPDATE pd_support_ticket SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`, values);
    return this.getAdminTicket(input.ticket_id);
  }


  async addSellerAttachment(input: AttachmentInput & { store_id: string; user_id: string }) {
    await this.getSellerTicket(input.ticket_id, input.store_id, input.user_id);
    const attachmentId = pdId('tatt');
    await query(
      `INSERT INTO pd_support_ticket_attachment
       (id, ticket_id, message_id, uploaded_by, file_name, mime_type, file_size_bytes, file_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [attachmentId, input.ticket_id, input.message_id || null, input.user_id, input.file_name, input.mime_type, input.file_size_bytes, input.file_url],
    );
    return { id: attachmentId };
  }

  async addAdminAttachment(input: AttachmentInput & { admin_id: string }) {
    await this.getAdminTicket(input.ticket_id);
    const attachmentId = pdId('tatt');
    await query(
      `INSERT INTO pd_support_ticket_attachment
       (id, ticket_id, message_id, uploaded_by, file_name, mime_type, file_size_bytes, file_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [attachmentId, input.ticket_id, input.message_id || null, input.admin_id, input.file_name, input.mime_type, input.file_size_bytes, input.file_url],
    );
    return { id: attachmentId };
  }


  async updateSellerTicketStatus(input: { ticket_id: string; store_id: string; user_id: string; status: 'closed' | 'open' }) {
    const ticket = await this.getSellerTicket(input.ticket_id, input.store_id, input.user_id);

    if (input.status === 'closed') {
      await query(
        `UPDATE pd_support_ticket
         SET status = 'closed',
             closed_at = COALESCE(closed_at, NOW()),
             updated_at = NOW()
         WHERE id = $1`,
        [input.ticket_id],
      );
      return this.getSellerTicket(input.ticket_id, input.store_id, input.user_id);
    }

    await query(
      `UPDATE pd_support_ticket
       SET status = 'open',
           resolved_at = NULL,
           closed_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [input.ticket_id],
    );

    // notify assigned admin / queue about reopen
    const assignedRows = await query<{ assigned_admin_id: string | null; ticket_number: string }>(
      'SELECT assigned_admin_id, ticket_number FROM pd_support_ticket WHERE id = $1',
      [input.ticket_id],
    );
    const assigned = assignedRows.rows[0]?.assigned_admin_id;
    const targets = assigned
      ? [assigned]
      : (await query<{ id: string }>("SELECT id FROM pd_user WHERE role IN ('admin','super_admin') AND is_active = true")).rows.map((r) => r.id);
    for (const adminId of targets) {
      void notificationService.create({
        user_id: adminId,
        type: 'support_ticket_reopened',
        title: 'Support ticket reopened',
        message: `Ticket ${assignedRows.rows[0]?.ticket_number || input.ticket_id} was reopened by seller.`,
        data: { ticket_id: input.ticket_id, store_id: ticket.ticket.store_id },
      });
    }

    return this.getSellerTicket(input.ticket_id, input.store_id, input.user_id);
  }

}

export const supportTicketService = new SupportTicketService();
