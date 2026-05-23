import { query, transaction } from '../db/pool';
import { PdForbiddenError, PdNotFoundError, PdValidationError } from '../errors';
import { pdId } from '../utils/crypto';

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
    const ticketNumber = `PM-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 900 + 100)}`;

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

    return { ticket, messages: messagesRes.rows };
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

    await query(
      `UPDATE pd_support_ticket
       SET status = 'waiting_admin', updated_at = NOW()
       WHERE id = $1`,
      [input.ticket_id],
    );

    return this.getSellerTicket(input.ticket_id, input.store_id, input.user_id);
  }
}

export const supportTicketService = new SupportTicketService();
