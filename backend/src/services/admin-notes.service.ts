/**
 * Admin Notes / Reminders / Drafts service.
 * CRUD operations for the superadmin personal workspace.
 */

import { query } from '../db/pool';

export interface AdminNote {
  id: string;
  admin_id: string;
  type: 'note' | 'reminder' | 'draft';
  title: string;
  content: string;
  color: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  is_completed: boolean;
  reminder_at: string | null;
  due_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateNoteInput {
  admin_id: string;
  type: 'note' | 'reminder' | 'draft';
  title: string;
  content?: string;
  color?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned?: boolean;
  reminder_at?: string | null;
  due_at?: string | null;
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  type?: 'note' | 'reminder' | 'draft';
  color?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned?: boolean;
  is_completed?: boolean;
  reminder_at?: string | null;
  due_at?: string | null;
  tags?: string[];
}

class AdminNotesService {
  async list(
    adminId: string,
    opts: { type?: string; page?: number; limit?: number } = {},
  ): Promise<{ data: AdminNote[]; total: number; page: number; limit: number }> {
    const page = opts.page || 1;
    const limit = Math.min(opts.limit || 50, 100);
    const offset = (page - 1) * limit;

    const conditions = ['admin_id = $1'];
    const params: unknown[] = [adminId];
    let paramIdx = 2;

    if (opts.type) {
      conditions.push(`type = $${paramIdx}`);
      params.push(opts.type);
      paramIdx++;
    }

    const where = conditions.join(' AND ');

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM admin_notes WHERE ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await query<AdminNote>(
      `SELECT * FROM admin_notes WHERE ${where}
       ORDER BY is_pinned DESC, updated_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset],
    );

    return { data: dataResult.rows, total, page, limit };
  }

  async getById(id: string, adminId: string): Promise<AdminNote | null> {
    const result = await query<AdminNote>(
      'SELECT * FROM admin_notes WHERE id = $1 AND admin_id = $2',
      [id, adminId],
    );
    return result.rows[0] || null;
  }

  async create(input: CreateNoteInput): Promise<AdminNote> {
    const result = await query<AdminNote>(
      `INSERT INTO admin_notes (admin_id, type, title, content, color, priority, is_pinned, reminder_at, due_at, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        input.admin_id,
        input.type,
        input.title,
        input.content || '',
        input.color || 'default',
        input.priority || 'normal',
        input.is_pinned || false,
        input.reminder_at || null,
        input.due_at || null,
        input.tags || [],
      ],
    );
    return result.rows[0];
  }

  async update(id: string, adminId: string, input: UpdateNoteInput): Promise<AdminNote | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    const fields: Array<[keyof UpdateNoteInput, unknown]> = [
      ['title', input.title],
      ['content', input.content],
      ['type', input.type],
      ['color', input.color],
      ['priority', input.priority],
      ['is_pinned', input.is_pinned],
      ['is_completed', input.is_completed],
      ['reminder_at', input.reminder_at],
      ['due_at', input.due_at],
      ['tags', input.tags],
    ];

    for (const [key, value] of fields) {
      if (value !== undefined) {
        setClauses.push(`${key} = $${paramIdx}`);
        params.push(value);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) return this.getById(id, adminId);

    setClauses.push(`updated_at = NOW()`);

    const result = await query<AdminNote>(
      `UPDATE admin_notes SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND admin_id = $${paramIdx + 1}
       RETURNING *`,
      [...params, id, adminId],
    );
    return result.rows[0] || null;
  }

  async delete(id: string, adminId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM admin_notes WHERE id = $1 AND admin_id = $2',
      [id, adminId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async togglePin(id: string, adminId: string): Promise<AdminNote | null> {
    const result = await query<AdminNote>(
      `UPDATE admin_notes SET is_pinned = NOT is_pinned, updated_at = NOW()
       WHERE id = $1 AND admin_id = $2
       RETURNING *`,
      [id, adminId],
    );
    return result.rows[0] || null;
  }

  async toggleComplete(id: string, adminId: string): Promise<AdminNote | null> {
    const result = await query<AdminNote>(
      `UPDATE admin_notes SET is_completed = NOT is_completed, updated_at = NOW()
       WHERE id = $1 AND admin_id = $2
       RETURNING *`,
      [id, adminId],
    );
    return result.rows[0] || null;
  }
}

export const adminNotesService = new AdminNotesService();
