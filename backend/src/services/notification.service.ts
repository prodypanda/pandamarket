/**
 * NotificationService — in-app notifications (table-backed) + WebSocket emit.
 * Email delivery is queued via the BullMQ email worker.
 */

import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import { PdNotFoundError, PdErrorCode } from '../errors';
import { INotification } from '@pandamarket/types';
import { logger } from '../utils/logger';
import { socketGateway } from '../realtime/socket-gateway';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: Date;
}

function toPublic(r: NotificationRow): INotification {
  return {
    id: r.id,
    user_id: r.user_id,
    type: r.type,
    title: r.title,
    message: r.message,
    data: r.data ?? {},
    is_read: r.is_read,
    created_at: r.created_at.toISOString(),
  };
}

export class NotificationService {
  /**
   * Create an in-app notification and push it via WebSocket if the user is online.
   */
  async create(opts: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<INotification> {
    const id = pdId('notif');
    const { rows } = await query<NotificationRow>(
      `INSERT INTO pd_notifications (id, user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, opts.user_id, opts.type, opts.title, opts.message, JSON.stringify(opts.data ?? {})],
    );
    const notif = toPublic(rows[0]);
    socketGateway.emitToUser(opts.user_id, 'notification', notif);
    logger.debug({ user_id: opts.user_id, type: opts.type }, 'Notification created');
    return notif;
  }

  async list(userId: string, opts: { page?: number; limit?: number; unread?: boolean } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    let where = 'user_id = $1';
    const params: unknown[] = [userId];
    if (opts.unread) where += ' AND is_read = false';
    params.push(limit, offset);
    const { rows } = await query<NotificationRow>(
      `SELECT * FROM pd_notifications
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: cnt } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_notifications WHERE ${where}`,
      params.slice(0, -2),
    );
    const total = parseInt(cnt[0].count, 10);
    return {
      data: rows.map(toPublic),
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  async unreadCount(userId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM pd_notifications
       WHERE user_id = $1 AND is_read = false`,
      [userId],
    );
    return parseInt(rows[0].count, 10);
  }

  async markRead(notifId: string, userId: string): Promise<void> {
    const { rowCount } = await query(
      `UPDATE pd_notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [notifId, userId],
    );
    if (!rowCount) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Notification not found');
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await query(
      `UPDATE pd_notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [userId],
    );
  }

  async delete(notifId: string, userId: string): Promise<void> {
    const { rowCount } = await query(
      `DELETE FROM pd_notifications WHERE id = $1 AND user_id = $2`,
      [notifId, userId],
    );
    if (!rowCount) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Notification not found');
    }
  }
}

export const notificationService = new NotificationService();
