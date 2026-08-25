/**
 * Admin Notes / Reminders / Drafts service (v2).
 *
 * Extends the personal superadmin workspace with:
 * - archive / trash lifecycle with restore
 * - bulk operations (archive, trash, restore, delete, complete)
 * - markdown content format
 * - per-note checklist items
 * - per-note file attachments (references existing blob storage)
 * - immutable activity log per note
 * - dashboard statistics (counts, overdue, upcoming reminders, completion rate)
 * - CSV / JSON export
 */

import { query } from '../db/pool';
import { pdId } from '../utils/crypto';

export type NoteType = 'note' | 'reminder' | 'draft';
export type NotePriority = 'low' | 'normal' | 'high' | 'urgent';
export type NoteStatus = 'active' | 'archived' | 'trashed';
export type NoteContentFormat = 'plain' | 'markdown';

export interface ChecklistItem {
  id: string;
  note_id: string;
  content: string;
  is_done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NoteAttachment {
  id: string;
  note_id: string;
  admin_id: string;
  file_key: string;
  bucket: string;
  filename: string;
  content_type: string;
  file_size: string | number;
  scope: string;
  created_at: string;
}

export interface AdminNoteFolder {
  id: string;
  admin_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NoteActivity {
  id: string;
  note_id: string;
  admin_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminNote {
  id: string;
  admin_id: string;
  folder_id: string | null;
  sort_order: number;
  type: NoteType;
  title: string;
  content: string;
  content_format: NoteContentFormat;
  color: string;
  priority: NotePriority;
  is_pinned: boolean;
  is_completed: boolean;
  reminder_at: string | null;
  due_at: string | null;
  tags: string[];
  status: NoteStatus;
  archived_at: string | null;
  trashed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminNoteDetail extends AdminNote {
  checklist: ChecklistItem[];
  attachments: NoteAttachment[];
}

export interface CreateNoteInput {
  admin_id: string;
  folder_id?: string | null;
  sort_order?: number;
  type: NoteType;
  title: string;
  content?: string;
  content_format?: NoteContentFormat;
  color?: string;
  priority?: NotePriority;
  is_pinned?: boolean;
  reminder_at?: string | null;
  due_at?: string | null;
  tags?: string[];
}

export interface UpdateNoteInput {
  folder_id?: string | null;
  sort_order?: number;
  title?: string;
  content?: string;
  content_format?: NoteContentFormat;
  type?: NoteType;
  color?: string;
  priority?: NotePriority;
  is_pinned?: boolean;
  is_completed?: boolean;
  reminder_at?: string | null;
  due_at?: string | null;
  tags?: string[];
}

export interface ListNotesOptions {
  folder_id?: string | null;
  type?: string;
  status?: NoteStatus;
  priority?: NotePriority;
  pinned?: boolean;
  completed?: boolean;
  overdue?: boolean;
  upcoming?: boolean;
  upcoming_within_hours?: number;
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

export interface NoteStats {
  total: number;
  active: number;
  archived: number;
  trashed: number;
  completed: number;
  pinned: number;
  overdue_reminders: number;
  upcoming_reminders: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
}

class AdminNotesService {
  // ─── LIST ──────────────────────────────────────────────────────────

  async list(
    adminId: string,
    opts: ListNotesOptions = {},
  ): Promise<{ data: AdminNote[]; total: number; page: number; limit: number }> {
    const page = opts.page || 1;
    const limit = Math.min(opts.limit || 50, 100);
    const offset = (page - 1) * limit;

    const conditions = ['admin_id = $1'];
    const params: unknown[] = [adminId];
    let idx = 2;

    if (opts.type) {
      conditions.push(`type = $${idx++}`);
      params.push(opts.type);
    }
    if (opts.status) {
      conditions.push(`status = $${idx++}`);
      params.push(opts.status);
    } else {
      conditions.push(`status = 'active'`);
    }
    if (opts.priority) {
      conditions.push(`priority = $${idx++}`);
      params.push(opts.priority);
    }
    if (opts.pinned !== undefined) {
      conditions.push(`is_pinned = $${idx++}`);
      params.push(opts.pinned);
    }
    if (opts.completed !== undefined) {
      conditions.push(`is_completed = $${idx++}`);
      params.push(opts.completed);
    }
    if (opts.overdue) {
      conditions.push(`reminder_at IS NOT NULL AND reminder_at < NOW() AND is_completed = FALSE`);
    }
    if (opts.upcoming) {
      const within = opts.upcoming_within_hours ?? 48;
      conditions.push(
        `reminder_at IS NOT NULL AND reminder_at > NOW() AND reminder_at <= (NOW() + ($${idx}::numeric * INTERVAL '1 hour')) AND is_completed = FALSE`,
      );
      params.push(within);
      idx++;
    }
    if (opts.tag) {
      conditions.push(`$${idx++} = ANY(tags)`);
      params.push(opts.tag);
    }
    if (opts.search) {
      conditions.push(`(title ILIKE $${idx} OR content ILIKE $${idx} OR $${idx + 1} = ANY(tags))`);
      params.push(`%${opts.search}%`, opts.search.toLowerCase());
      idx += 2;
    }

    if (opts.folder_id !== undefined) {
      if (
        opts.folder_id === null ||
        opts.folder_id === 'null' ||
        opts.folder_id === 'none' ||
        opts.folder_id === 'unorganized'
      ) {
        conditions.push(`folder_id IS NULL`);
      } else {
        conditions.push(`folder_id = $${idx++}`);
        params.push(opts.folder_id);
      }
    }

    const where = conditions.join(' AND ');

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM admin_notes WHERE ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await query<AdminNote>(
      `SELECT * FROM admin_notes WHERE ${where}
       ORDER BY is_pinned DESC,
                sort_order ASC,
                (reminder_at IS NOT NULL AND reminder_at >= NOW()) DESC,
                CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
                updated_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    );

    return { data: dataResult.rows, total, page, limit };
  }

  // ─── GET SINGLE ────────────────────────────────────────────────────

  async getById(id: string, adminId: string): Promise<AdminNoteDetail | null> {
    const noteRes = await query<AdminNote>(
      'SELECT * FROM admin_notes WHERE id = $1 AND admin_id = $2',
      [id, adminId],
    );
    if (!noteRes.rows[0]) return null;
    const note = noteRes.rows[0];

    const [checklistRes, attachmentsRes] = await Promise.all([
      query<ChecklistItem>(
        'SELECT * FROM admin_note_checklist_items WHERE note_id = $1 ORDER BY sort_order, created_at',
        [id],
      ),
      query<NoteAttachment>(
        'SELECT * FROM admin_note_attachments WHERE note_id = $1 ORDER BY created_at',
        [id],
      ),
    ]);

    return {
      ...note,
      checklist: checklistRes.rows,
      attachments: attachmentsRes.rows,
    };
  }

  // ─── CREATE ────────────────────────────────────────────────────────

  async create(input: CreateNoteInput): Promise<AdminNote> {
    const result = await query<AdminNote>(
      `INSERT INTO admin_notes (admin_id, type, title, content, content_format, color, priority, is_pinned, reminder_at, due_at, tags, folder_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        input.admin_id,
        input.type,
        input.title,
        input.content || '',
        input.content_format || 'plain',
        input.color || 'default',
        input.priority || 'normal',
        input.is_pinned || false,
        input.reminder_at || null,
        input.due_at || null,
        input.tags || [],
        input.folder_id ?? null,
        input.sort_order ?? 0,
      ],
    );
    const note = result.rows[0];
    await this.logActivity(note.id, note.admin_id, 'created', {
      title: note.title,
      type: note.type,
    });
    return note;
  }

  // ─── UPDATE ────────────────────────────────────────────────────────

  async update(id: string, adminId: string, input: UpdateNoteInput): Promise<AdminNote | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const fields: Array<[keyof UpdateNoteInput, unknown]> = [
      ['title', input.title],
      ['content', input.content],
      ['content_format', input.content_format],
      ['type', input.type],
      ['color', input.color],
      ['priority', input.priority],
      ['is_pinned', input.is_pinned],
      ['is_completed', input.is_completed],
      ['reminder_at', input.reminder_at],
      ['due_at', input.due_at],
      ['tags', input.tags],
      ['folder_id', input.folder_id],
      ['sort_order', input.sort_order],
    ];

    const changes: Record<string, unknown> = {};
    for (const [key, value] of fields) {
      if (value !== undefined) {
        setClauses.push(`${key} = $${idx++}`);
        params.push(value);
        changes[key] = value;
      }
    }

    // Sync completed_at when toggling completion
    if (input.is_completed !== undefined) {
      setClauses.push(`completed_at = ${input.is_completed ? 'NOW()' : 'NULL'}`);
    }

    if (setClauses.length === 0) return this.getById(id, adminId) as Promise<AdminNote | null>;
    setClauses.push(`updated_at = NOW()`);

    const result = await query<AdminNote>(
      `UPDATE admin_notes SET ${setClauses.join(', ')}
       WHERE id = $${idx} AND admin_id = $${idx + 1}
       RETURNING *`,
      [...params, id, adminId],
    );
    const note = result.rows[0] || null;
    if (note && Object.keys(changes).length > 0) {
      await this.logActivity(note.id, note.admin_id, 'updated', changes);
    }
    return note;
  }

  // ─── DELETE (permanently, only allowed from trash) ────────────────

  async delete(id: string, adminId: string): Promise<boolean> {
    const result = await query('DELETE FROM admin_notes WHERE id = $1 AND admin_id = $2', [
      id,
      adminId,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  // ─── LIFECYCLE: trash / archive / restore ─────────────────────────

  async trash(id: string, adminId: string): Promise<AdminNote | null> {
    const result = await query<AdminNote>(
      `UPDATE admin_notes SET status = 'trashed', trashed_at = NOW(), is_pinned = FALSE, updated_at = NOW()
       WHERE id = $1 AND admin_id = $2 RETURNING *`,
      [id, adminId],
    );
    const note = result.rows[0] || null;
    if (note) await this.logActivity(note.id, adminId, 'trashed', {});
    return note;
  }

  async archive(id: string, adminId: string): Promise<AdminNote | null> {
    const result = await query<AdminNote>(
      `UPDATE admin_notes SET status = 'archived', archived_at = NOW(), is_pinned = FALSE, updated_at = NOW()
       WHERE id = $1 AND admin_id = $2 RETURNING *`,
      [id, adminId],
    );
    const note = result.rows[0] || null;
    if (note) await this.logActivity(note.id, adminId, 'archived', {});
    return note;
  }

  async restore(id: string, adminId: string): Promise<AdminNote | null> {
    const result = await query<AdminNote>(
      `UPDATE admin_notes
        SET status = 'active', archived_at = NULL, trashed_at = NULL, updated_at = NOW()
       WHERE id = $1 AND admin_id = $2 RETURNING *`,
      [id, adminId],
    );
    const note = result.rows[0] || null;
    if (note) await this.logActivity(note.id, adminId, 'restored', {});
    return note;
  }

  async emptyTrash(adminId: string): Promise<number> {
    const result = await query(
      `DELETE FROM admin_notes WHERE admin_id = $1 AND status = 'trashed'`,
      [adminId],
    );
    return result.rowCount ?? 0;
  }

  // ─── TOGGLES ───────────────────────────────────────────────────────

  async togglePin(id: string, adminId: string): Promise<AdminNote | null> {
    const result = await query<AdminNote>(
      `UPDATE admin_notes SET is_pinned = NOT is_pinned, updated_at = NOW()
       WHERE id = $1 AND admin_id = $2 RETURNING *`,
      [id, adminId],
    );
    const note = result.rows[0] || null;
    if (note)
      await this.logActivity(note.id, adminId, 'pin_toggled', { is_pinned: note.is_pinned });
    return note;
  }

  async toggleComplete(id: string, adminId: string): Promise<AdminNote | null> {
    const result = await query<AdminNote>(
      `UPDATE admin_notes SET is_completed = NOT is_completed,
        completed_at = CASE WHEN NOT is_completed THEN NOW() ELSE NULL END,
        updated_at = NOW()
       WHERE id = $1 AND admin_id = $2 RETURNING *`,
      [id, adminId],
    );
    const note = result.rows[0] || null;
    if (note)
      await this.logActivity(note.id, adminId, 'complete_toggled', {
        is_completed: note.is_completed,
      });
    return note;
  }

  // ─── BULK OPERATIONS ────────────────────────────────────────────────

  async bulkArchive(ids: string[], adminId: string): Promise<number> {
    if (!ids.length) return 0;
    const result = await query(
      `UPDATE admin_notes SET status = 'archived', archived_at = NOW(), is_pinned = FALSE, updated_at = NOW()
       WHERE id = ANY($1::text[]) AND admin_id = $2 AND status = 'active'`,
      [ids, adminId],
    );
    return result.rowCount ?? 0;
  }

  async bulkTrash(ids: string[], adminId: string): Promise<number> {
    if (!ids.length) return 0;
    const result = await query(
      `UPDATE admin_notes SET status = 'trashed', trashed_at = NOW(), is_pinned = FALSE, updated_at = NOW()
       WHERE id = ANY($1::text[]) AND admin_id = $2 AND status IN ('active', 'archived')`,
      [ids, adminId],
    );
    return result.rowCount ?? 0;
  }

  async bulkRestore(ids: string[], adminId: string): Promise<number> {
    if (!ids.length) return 0;
    const result = await query(
      `UPDATE admin_notes SET status = 'active', archived_at = NULL, trashed_at = NULL, updated_at = NOW()
       WHERE id = ANY($1::text[]) AND admin_id = $2 AND status IN ('archived', 'trashed')`,
      [ids, adminId],
    );
    return result.rowCount ?? 0;
  }

  async bulkDelete(ids: string[], adminId: string): Promise<number> {
    if (!ids.length) return 0;
    const result = await query(
      `DELETE FROM admin_notes WHERE id = ANY($1::text[]) AND admin_id = $2 AND status = 'trashed'`,
      [ids, adminId],
    );
    return result.rowCount ?? 0;
  }

  async bulkComplete(ids: string[], adminId: string, completed: boolean): Promise<number> {
    if (!ids.length) return 0;
    const result = await query(
      `UPDATE admin_notes SET is_completed = $3,
        completed_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
        updated_at = NOW()
       WHERE id = ANY($1::text[]) AND admin_id = $2 AND status = 'active'`,
      [ids, adminId, completed],
    );
    return result.rowCount ?? 0;
  }

  // ─── CHECKLIST ──────────────────────────────────────────────────────

  async addChecklistItem(
    noteId: string,
    adminId: string,
    content: string,
    sortOrder = 0,
  ): Promise<ChecklistItem | null> {
    const note = await this.getByIdInternal(noteId, adminId);
    if (!note) return null;
    const id = pdId('acl');
    const result = await query<ChecklistItem>(
      `INSERT INTO admin_note_checklist_items (id, note_id, content, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, noteId, content, sortOrder],
    );
    const item = result.rows[0];
    if (item)
      await this.logActivity(noteId, adminId, 'checklist_added', { item_id: item.id, content });
    return item;
  }

  async updateChecklistItem(
    noteId: string,
    itemId: string,
    adminId: string,
    patch: { content?: string; is_done?: boolean; sort_order?: number },
  ): Promise<ChecklistItem | null> {
    const note = await this.getByIdInternal(noteId, adminId);
    if (!note) return null;
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (patch.content !== undefined) {
      setClauses.push(`content = $${idx++}`);
      params.push(patch.content);
    }
    if (patch.is_done !== undefined) {
      setClauses.push(`is_done = $${idx++}`);
      params.push(patch.is_done);
    }
    if (patch.sort_order !== undefined) {
      setClauses.push(`sort_order = $${idx++}`);
      params.push(patch.sort_order);
    }
    if (!setClauses.length) return null;
    setClauses.push(`updated_at = NOW()`);
    const result = await query<ChecklistItem>(
      `UPDATE admin_note_checklist_items SET ${setClauses.join(', ')}
       WHERE id = $${idx} AND note_id = $${idx + 1} RETURNING *`,
      [...params, itemId, noteId],
    );
    const item = result.rows[0] || null;
    if (item)
      await this.logActivity(noteId, adminId, 'checklist_updated', {
        item_id: itemId,
        is_done: item.is_done,
      });
    return item;
  }

  async removeChecklistItem(noteId: string, itemId: string, adminId: string): Promise<boolean> {
    const note = await this.getByIdInternal(noteId, adminId);
    if (!note) return false;
    const result = await query(
      'DELETE FROM admin_note_checklist_items WHERE id = $1 AND note_id = $2',
      [itemId, noteId],
    );
    const ok = (result.rowCount ?? 0) > 0;
    if (ok) await this.logActivity(noteId, adminId, 'checklist_removed', { item_id: itemId });
    return ok;
  }

  // ─── ATTACHMENTS ────────────────────────────────────────────────────

  async addAttachment(
    noteId: string,
    adminId: string,
    input: {
      file_key: string;
      bucket: string;
      filename: string;
      content_type: string;
      file_size: number;
      scope?: string;
    },
  ): Promise<NoteAttachment | null> {
    const note = await this.getByIdInternal(noteId, adminId);
    if (!note) return null;
    const id = pdId('att');
    const result = await query<NoteAttachment>(
      `INSERT INTO admin_note_attachments (id, note_id, admin_id, file_key, bucket, filename, content_type, file_size, scope)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        id,
        noteId,
        adminId,
        input.file_key,
        input.bucket,
        input.filename,
        input.content_type,
        input.file_size,
        input.scope || 'platform',
      ],
    );
    const att = result.rows[0];
    if (att)
      await this.logActivity(noteId, adminId, 'attachment_added', {
        attachment_id: att.id,
        filename: input.filename,
      });
    return att;
  }

  async removeAttachment(noteId: string, attachmentId: string, adminId: string): Promise<boolean> {
    const note = await this.getByIdInternal(noteId, adminId);
    if (!note) return false;
    const result = await query(
      'DELETE FROM admin_note_attachments WHERE id = $1 AND note_id = $2 AND admin_id = $3',
      [attachmentId, noteId, adminId],
    );
    const ok = (result.rowCount ?? 0) > 0;
    if (ok)
      await this.logActivity(noteId, adminId, 'attachment_removed', {
        attachment_id: attachmentId,
      });
    return ok;
  }

  // ─── ACTIVITY LOG ───────────────────────────────────────────────────

  async listActivity(noteId: string, adminId: string, limit = 50): Promise<NoteActivity[]> {
    const note = await this.getByIdInternal(noteId, adminId);
    if (!note) return [];
    const result = await query<NoteActivity>(
      `SELECT * FROM admin_note_activity WHERE note_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [noteId, Math.min(limit, 200)],
    );
    return result.rows;
  }

  private async logActivity(
    noteId: string,
    adminId: string,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const id = pdId('act');
    await query(
      `INSERT INTO admin_note_activity (id, note_id, admin_id, action, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [id, noteId, adminId, action, JSON.stringify(metadata)],
    ).catch(() => {
      // activity logging must never break the primary operation
    });
  }

  // ─── STATS ─────────────────────────────────────────────────────────

  async stats(adminId: string): Promise<NoteStats> {
    const baseRes = await query<{
      status: string;
      type: string;
      priority: string;
      is_pinned: boolean;
      is_completed: boolean;
    }>(
      `SELECT status, type, priority, is_pinned, is_completed FROM admin_notes WHERE admin_id = $1`,
      [adminId],
    );
    const rows = baseRes.rows;

    const overdueRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM admin_notes
       WHERE admin_id = $1 AND status = 'active' AND is_completed = FALSE
       AND reminder_at IS NOT NULL AND reminder_at < NOW()`,
      [adminId],
    );
    const upcomingRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM admin_notes
       WHERE admin_id = $1 AND status = 'active' AND is_completed = FALSE
       AND reminder_at IS NOT NULL AND reminder_at > NOW() AND reminder_at <= (NOW() + '48 hours'::interval)`,
      [adminId],
    );

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let active = 0,
      archived = 0,
      trashed = 0,
      completed = 0,
      pinned = 0;

    for (const r of rows) {
      byType[r.type] = (byType[r.type] || 0) + 1;
      byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
      if (r.status === 'active') active++;
      if (r.status === 'archived') archived++;
      if (r.status === 'trashed') trashed++;
      if (r.is_completed) completed++;
      if (r.is_pinned) pinned++;
    }

    return {
      total: rows.length,
      active,
      archived,
      trashed,
      completed,
      pinned,
      overdue_reminders: parseInt(overdueRes.rows[0]?.count || '0', 10),
      upcoming_reminders: parseInt(upcomingRes.rows[0]?.count || '0', 10),
      by_type: byType,
      by_priority: byPriority,
    };
  }

  // ─── EXPORT ────────────────────────────────────────────────────────

  async exportNotes(
    adminId: string,
    format: 'csv' | 'json',
  ): Promise<{ contentType: string; body: string; filename: string }> {
    const result = await query<AdminNote>(
      `SELECT * FROM admin_notes WHERE admin_id = $1 AND status != 'trashed' ORDER BY is_pinned DESC, updated_at DESC`,
      [adminId],
    );
    const filename = `admin-notes-${new Date().toISOString().slice(0, 10)}.${format}`;

    if (format === 'json') {
      return {
        contentType: 'application/json',
        filename,
        body: JSON.stringify(result.rows, null, 2),
      };
    }

    // CSV with basic escaping
    const headers = [
      'id',
      'type',
      'title',
      'content',
      'priority',
      'is_pinned',
      'is_completed',
      'reminder_at',
      'due_at',
      'tags',
      'status',
      'created_at',
      'updated_at',
    ];
    const escape = (v: unknown) => {
      const s =
        v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [headers.join(',')];
    for (const row of result.rows) {
      lines.push(
        [
          escape(row.id),
          escape(row.type),
          escape(row.title),
          escape(row.content),
          escape(row.priority),
          escape(row.is_pinned),
          escape(row.is_completed),
          escape(row.reminder_at),
          escape(row.due_at),
          escape(row.tags),
          escape(row.status),
          escape(row.created_at),
          escape(row.updated_at),
        ].join(','),
      );
    }
    return { contentType: 'text/csv', filename, body: lines.join('\n') };
  }

  // ─── DUE/REMINDER NOTIFICATIONS ────────────────────────────────────

  /**
   * Return notes whose reminder_at is now in the past but within the stale window.
   * Used by a periodic job to push realtime notifications.
   */
  async fetchDueReminders(adminId: string, sinceHoursAgo = 1): Promise<AdminNote[]> {
    const result = await query<AdminNote>(
      `SELECT * FROM admin_notes
       WHERE admin_id = $1 AND status = 'active' AND is_completed = FALSE
       AND reminder_at IS NOT NULL
       AND reminder_at < NOW()
       AND reminder_at >= (NOW() - ($2::numeric * INTERVAL '1 hour'))
       ORDER BY reminder_at ASC`,
      [adminId, sinceHoursAgo],
    );
    return result.rows;
  }

  /**
   * Audit P2-17: single-JOIN variant of the reminder sweep — returns every due
   * reminder for ALL admin users in one query, replacing the previous N+1
   * pattern (one SELECT of admins, then one fetchDueReminders per admin).
   */
  async fetchDueRemindersForAllAdmins(sinceHoursAgo = 1): Promise<AdminNote[]> {
    const result = await query<AdminNote>(
      `SELECT n.*
       FROM admin_notes n
       JOIN pd_user u ON u.id = n.admin_id
       WHERE u.role IN ('admin', 'superadmin', 'super_admin')
         AND n.status = 'active'
         AND n.is_completed = FALSE
         AND n.reminder_at IS NOT NULL
         AND n.reminder_at < NOW()
         AND n.reminder_at >= (NOW() - ($1::numeric * INTERVAL '1 hour'))
       ORDER BY n.reminder_at ASC`,
      [sinceHoursAgo],
    );
    return result.rows;
  }

  // ─── FOLDERS & SORTING ─────────────────────────────────────────────

  async createFolder(adminId: string, name: string, color?: string): Promise<AdminNoteFolder> {
    const result = await query<AdminNoteFolder>(
      `INSERT INTO admin_note_folders (admin_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [adminId, name, color || 'default'],
    );
    return result.rows[0];
  }

  async listFolders(adminId: string): Promise<AdminNoteFolder[]> {
    const result = await query<AdminNoteFolder>(
      `SELECT * FROM admin_note_folders WHERE admin_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [adminId],
    );
    return result.rows;
  }

  async updateFolder(id: string, adminId: string, input: { name?: string; color?: string; sort_order?: number }): Promise<AdminNoteFolder | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      params.push(input.name);
    }
    if (input.color !== undefined) {
      setClauses.push(`color = $${idx++}`);
      params.push(input.color);
    }
    if (input.sort_order !== undefined) {
      setClauses.push(`sort_order = $${idx++}`);
      params.push(input.sort_order);
    }

    if (setClauses.length === 0) {
      const res = await query<AdminNoteFolder>(`SELECT * FROM admin_note_folders WHERE id = $1 AND admin_id = $2`, [id, adminId]);
      return res.rows[0] || null;
    }

    setClauses.push(`updated_at = NOW()`);
    const result = await query<AdminNoteFolder>(
      `UPDATE admin_note_folders SET ${setClauses.join(', ')} WHERE id = $${idx} AND admin_id = $${idx + 1} RETURNING *`,
      [...params, id, adminId],
    );
    return result.rows[0] || null;
  }

  async deleteFolder(id: string, adminId: string): Promise<boolean> {
    const result = await query(`DELETE FROM admin_note_folders WHERE id = $1 AND admin_id = $2`, [id, adminId]);
    return (result.rowCount ?? 0) > 0;
  }

  async updateFolderSortOrder(updates: { id: string; sort_order: number }[], adminId: string): Promise<void> {
    if (!updates.length) return;
    for (const update of updates) {
      await query(`UPDATE admin_note_folders SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND admin_id = $3`, [update.sort_order, update.id, adminId]);
    }
  }

  async updateNoteSortOrder(updates: { id: string; sort_order: number }[], adminId: string): Promise<void> {
    if (!updates.length) return;
    for (const update of updates) {
      await query(`UPDATE admin_notes SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND admin_id = $3`, [update.sort_order, update.id, adminId]);
    }
  }

  async moveToFolder(id: string, adminId: string, folderId: string | null): Promise<AdminNote | null> {
    const result = await query<AdminNote>(
      `UPDATE admin_notes SET folder_id = $1, updated_at = NOW() WHERE id = $2 AND admin_id = $3 RETURNING *`,
      [folderId, id, adminId],
    );
    return result.rows[0] || null;
  }

  // ─── HELPERS ───────────────────────────────────────────────────────

  private async getByIdInternal(id: string, adminId: string): Promise<AdminNote | null> {
    const result = await query<AdminNote>(
      'SELECT * FROM admin_notes WHERE id = $1 AND admin_id = $2',
      [id, adminId],
    );
    return result.rows[0] || null;
  }
}

export const adminNotesService = new AdminNotesService();
