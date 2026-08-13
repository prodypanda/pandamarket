/**
 * Idempotently synchronizes the source-verified Hub/Settings Admin Notes.
 * Read-only unless --apply is explicit. It never deletes, trashes, archives,
 * or uncompletes notes/folders, and credentials come only from PD_* env vars.
 */
import type { PoolClient } from 'pg';
import { closePool, query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import {
  CATALOG_VERSION,
  auditNotes,
  buildChecklist,
  expectedCompletedExternalIds,
  folderDefinitions,
  renderNoteContent,
  validateCatalog,
  type AuditNoteDefinition,
} from './hub-settings-admin-notes.catalog';

const EXTERNAL_ID_PREFIX = 'external-id:';
const MANAGED_TAG = 'managed:hub-settings-audit';
const VERSION_TAG_PREFIX = 'catalog-version:';
const COMPLETED_IDS = new Set<string>(expectedCompletedExternalIds);

type DbNote = {
  id: string; admin_id: string; folder_id: string | null; folder_name: string | null;
  title: string; content: string; content_format: string; color: string; priority: string;
  is_pinned: boolean; is_completed: boolean; completed_at: Date | null; status: string;
  tags: string[]; sort_order: number;
};
type DbChecklist = { id: string; note_id: string; content: string; is_done: boolean; sort_order: number };
type DbFolder = { id: string; name: string; color: string; sort_order: number };
type LoadedState = { adminId: string; folders: DbFolder[]; notes: DbNote[]; checklistByNote: Map<string, DbChecklist[]> };
type PlannedAction = { type: 'create-folder' | 'update-folder' | 'create-note' | 'update-note' | 'sync-checklist' | 'preserve'; externalId?: string; target: string; detail: string };

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}
function externalIdOf(tags: string[]): string | undefined {
  return tags.find((tag) => tag.startsWith(EXTERNAL_ID_PREFIX))?.slice(EXTERNAL_ID_PREFIX.length);
}
function desiredTags(note: AuditNoteDefinition): string[] {
  return Array.from(new Set([
    `${EXTERNAL_ID_PREFIX}${note.externalId}`,
    MANAGED_TAG,
    `${VERSION_TAG_PREFIX}${CATALOG_VERSION}`,
    `classification:${note.classification.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    ...note.tags.map((tag) => tag.toLowerCase().trim()).filter(Boolean),
  ])).sort();
}
function desiredChecklist(note: AuditNoteDefinition): string[] {
  return note.verifiedComplete ? [] : buildChecklist(note);
}
function noteColor(priority: string): string {
  return priority === 'urgent' ? '#DC2626' : priority === 'high' ? '#EA580C' : priority === 'normal' ? '#2563EB' : '#64748B';
}

async function getAdminId(client?: PoolClient): Promise<string> {
  const result = client
    ? await client.query<{ id: string }>(`SELECT id FROM pd_user WHERE role = 'super_admin' ORDER BY created_at LIMIT 1`)
    : await query<{ id: string }>(`SELECT id FROM pd_user WHERE role = 'super_admin' ORDER BY created_at LIMIT 1`);
  if (result.rows[0]?.id) return result.rows[0].id;
  const fallback = client
    ? await client.query<{ id: string }>(`SELECT id FROM pd_user WHERE role = 'admin' ORDER BY created_at LIMIT 1`)
    : await query<{ id: string }>(`SELECT id FROM pd_user WHERE role = 'admin' ORDER BY created_at LIMIT 1`);
  if (!fallback.rows[0]?.id) throw new Error('No superadmin/admin user was found.');
  return fallback.rows[0].id;
}

async function loadState(client?: PoolClient): Promise<LoadedState> {
  const adminId = await getAdminId(client);
  const execute = <T extends Record<string, unknown>>(sql: string, params: unknown[]) =>
    client ? client.query<T>(sql, params) : query<T>(sql, params);
  const folderQuery = () => execute<DbFolder>(`SELECT id, name, color, sort_order FROM admin_note_folders WHERE admin_id = $1 ORDER BY sort_order, created_at`, [adminId]);
  const noteQuery = () => execute<DbNote>(`SELECT n.id, n.admin_id, n.folder_id, f.name AS folder_name, n.title, n.content,
      n.content_format, n.color, n.priority, n.is_pinned, n.is_completed, n.completed_at,
      n.status, n.tags, n.sort_order FROM admin_notes n LEFT JOIN admin_note_folders f ON f.id = n.folder_id
      WHERE n.admin_id = $1 ORDER BY n.status, f.sort_order, n.sort_order, n.created_at`, [adminId]);
  const checklistQuery = () => execute<DbChecklist>(`SELECT item.id, item.note_id, item.content, item.is_done, item.sort_order
      FROM admin_note_checklist_items item JOIN admin_notes note ON note.id = item.note_id
      WHERE note.admin_id = $1 ORDER BY item.note_id, item.sort_order, item.created_at`, [adminId]);
  // Pool queries can run concurrently; a single transaction client cannot.
  const [folderResult, noteResult, checklistResult] = client
    ? [await folderQuery(), await noteQuery(), await checklistQuery()]
    : await Promise.all([folderQuery(), noteQuery(), checklistQuery()]);
  const checklistByNote = new Map<string, DbChecklist[]>();
  for (const item of checklistResult.rows) {
    const rows = checklistByNote.get(item.note_id) ?? [];
    rows.push(item); checklistByNote.set(item.note_id, rows);
  }
  return { adminId, folders: folderResult.rows, notes: noteResult.rows, checklistByNote };
}

function assertUniqueActiveExternalIds(state: LoadedState): Map<string, DbNote> {
  const result = new Map<string, DbNote>();
  for (const note of state.notes.filter((entry) => entry.status === 'active')) {
    const externalId = externalIdOf(note.tags); if (!externalId) continue;
    if (result.has(externalId)) throw new Error(`Duplicate active Admin Notes external ID: ${externalId}`);
    result.set(externalId, note);
  }
  return result;
}

function buildPlan(state: LoadedState): PlannedAction[] {
  validateCatalog();
  const actions: PlannedAction[] = [];
  const folders = new Map(state.folders.map((folder) => [folder.name, folder]));
  const notes = assertUniqueActiveExternalIds(state);
  for (const folder of folderDefinitions) {
    const existing = folders.get(folder.name);
    if (!existing) actions.push({ type: 'create-folder', target: folder.name, detail: `color=${folder.color}; sort=${folder.sortOrder}` });
    else if (existing.color !== folder.color || existing.sort_order !== folder.sortOrder) actions.push({ type: 'update-folder', target: folder.name, detail: `color/sort metadata` });
  }
  for (const definition of auditNotes) {
    const existing = notes.get(definition.externalId);
    const content = renderNoteContent(definition); const tags = desiredTags(definition); const checklist = desiredChecklist(definition);
    if (!existing) {
      actions.push({ type: 'create-note', externalId: definition.externalId, target: definition.title, detail: `${definition.folder}; ${content.length} chars; ${checklist.length} checklist rows` });
      continue;
    }
    if (definition.verifiedComplete && !existing.is_completed) throw new Error(`${definition.externalId} must remain completed, but production is open.`);
    if (!definition.verifiedComplete && existing.is_completed) throw new Error(`${definition.externalId} is completed in production; refusing to uncomplete it.`);
    const changes: string[] = [];
    if (existing.title !== `${definition.externalId} — ${definition.title}`) changes.push('title');
    if (existing.content !== content) changes.push('content');
    if (existing.content_format !== 'markdown') changes.push('format');
    if (existing.priority !== definition.priority) changes.push('priority');
    if (existing.folder_name !== definition.folder) changes.push('folder');
    if (existing.sort_order !== definition.sortOrder) changes.push('sort');
    if (!arraysEqual([...existing.tags].sort(), tags)) changes.push('tags');
    if (changes.length) actions.push({ type: 'update-note', externalId: definition.externalId, target: definition.title, detail: changes.join(', ') });
    const rows = state.checklistByNote.get(existing.id) ?? [];
    if (definition.verifiedComplete) actions.push({ type: 'preserve', externalId: definition.externalId, target: 'completed checklist', detail: `preserve ${rows.filter((item) => item.is_done).length}/${rows.length} exactly` });
    else if (rows.length !== checklist.length || rows.some((item, index) => item.content !== checklist[index] || item.sort_order !== index + 1 || item.is_done)) actions.push({ type: 'sync-checklist', externalId: definition.externalId, target: 'open checklist', detail: `${rows.length}→${checklist.length}; all open` });
  }
  return actions;
}

async function inventory(): Promise<void> {
  const state = await loadState(); const summary = process.argv.includes('--summary');
  const rows = state.notes.filter((note) => !summary || (note.status === 'active' && externalIdOf(note.tags))).map((note) => {
    const checklist = state.checklistByNote.get(note.id) ?? [];
    return { id: note.id, externalId: externalIdOf(note.tags), title: note.title, status: note.status,
      completed: note.is_completed, priority: note.priority, folder: note.folder_name, contentLength: note.content.length,
      checklist: `${checklist.filter((item) => item.is_done).length}/${checklist.length}` };
  });
  console.log(JSON.stringify({ adminId: state.adminId, count: rows.length, notes: rows }, null, 2));
}

async function dryRun(): Promise<void> {
  const state = await loadState(); const plan = buildPlan(state);
  const actions = plan.reduce<Record<string, number>>((result, item) => { result[item.type] = (result[item.type] ?? 0) + 1; return result; }, {});
  console.log(JSON.stringify({ mode: 'dry-run', catalogVersion: CATALOG_VERSION, catalogNotes: auditNotes.length, actions, plan }, null, 2));
}

async function upsertFolders(client: PoolClient, adminId: string): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const folder of folderDefinitions) {
    const existing = await client.query<{ id: string }>(`SELECT id FROM admin_note_folders WHERE admin_id = $1 AND name = $2 ORDER BY created_at LIMIT 1`, [adminId, folder.name]);
    if (existing.rows[0]) {
      await client.query(`UPDATE admin_note_folders SET color=$1, sort_order=$2, updated_at=NOW() WHERE id=$3 AND admin_id=$4`, [folder.color, folder.sortOrder, existing.rows[0].id, adminId]);
      ids.set(folder.name, existing.rows[0].id);
    } else {
      const id = pdId('anfolder');
      await client.query(`INSERT INTO admin_note_folders (id, admin_id, name, color, sort_order) VALUES ($1,$2,$3,$4,$5)`, [id, adminId, folder.name, folder.color, folder.sortOrder]);
      ids.set(folder.name, id);
    }
  }
  return ids;
}

async function syncOpenChecklist(client: PoolClient, noteId: string, desired: string[]): Promise<void> {
  const current = await client.query<DbChecklist>(`SELECT id, note_id, content, is_done, sort_order FROM admin_note_checklist_items WHERE note_id=$1 ORDER BY sort_order, created_at FOR UPDATE`, [noteId]);
  for (let index = 0; index < desired.length; index += 1) {
    const existing = current.rows[index];
    if (existing) await client.query(`UPDATE admin_note_checklist_items SET content=$1, is_done=FALSE, sort_order=$2, updated_at=NOW() WHERE id=$3 AND note_id=$4`, [desired[index], index + 1, existing.id, noteId]);
    else await client.query(`INSERT INTO admin_note_checklist_items (id,note_id,content,is_done,sort_order) VALUES ($1,$2,$3,FALSE,$4)`, [pdId('acl'), noteId, desired[index], index + 1]);
  }
  // Safety: surplus user-created rows are preserved, never deleted; keep them open after managed rows.
  for (let index = desired.length; index < current.rows.length; index += 1) await client.query(`UPDATE admin_note_checklist_items SET is_done=FALSE, sort_order=$1, updated_at=NOW() WHERE id=$2 AND note_id=$3`, [index + 1, current.rows[index].id, noteId]);
}

async function applyCatalog(): Promise<void> {
  const preState = await loadState(); const plan = buildPlan(preState);
  const mutating = plan.filter((action) => action.type !== 'preserve');
  if (!mutating.length) { console.log(JSON.stringify({ mode: 'apply', changed: 0, message: 'Catalog already synchronized.' }, null, 2)); return; }
  await transaction(async (client) => {
    const adminId = await getAdminId(client);
    await client.query(`SELECT id FROM admin_notes WHERE admin_id=$1 FOR UPDATE`, [adminId]);
    await client.query(`SELECT id FROM admin_note_folders WHERE admin_id=$1 FOR UPDATE`, [adminId]);
    const state = await loadState(client); const active = assertUniqueActiveExternalIds(state);
    const folderIds = await upsertFolders(client, adminId);
    for (const definition of auditNotes) {
      const folderId = folderIds.get(definition.folder); if (!folderId) throw new Error(`Missing folder ${definition.folder}`);
      const title = `${definition.externalId} — ${definition.title}`; const content = renderNoteContent(definition);
      const tags = desiredTags(definition); const checklist = desiredChecklist(definition); const existing = active.get(definition.externalId);
      if (existing) {
        if (definition.verifiedComplete && !existing.is_completed) throw new Error(`Refusing to complete ${definition.externalId}`);
        if (!definition.verifiedComplete && existing.is_completed) throw new Error(`Refusing to uncomplete ${definition.externalId}`);
        await client.query(`UPDATE admin_notes SET folder_id=$1,title=$2,content=$3,content_format='markdown',color=$4,priority=$5,tags=$6,sort_order=$7,updated_at=NOW() WHERE id=$8 AND admin_id=$9 AND status='active'`, [folderId, title, content, noteColor(definition.priority), definition.priority, tags, definition.sortOrder, existing.id, adminId]);
        if (!definition.verifiedComplete) await syncOpenChecklist(client, existing.id, checklist);
      } else {
        const noteId = pdId('anote');
        await client.query(`INSERT INTO admin_notes (id,admin_id,folder_id,type,title,content,content_format,color,priority,is_pinned,is_completed,tags,status,sort_order) VALUES ($1,$2,$3,'note',$4,$5,'markdown',$6,$7,FALSE,FALSE,$8,'active',$9)`, [noteId, adminId, folderId, title, content, noteColor(definition.priority), definition.priority, tags, definition.sortOrder]);
        for (let index = 0; index < checklist.length; index += 1) await client.query(`INSERT INTO admin_note_checklist_items (id,note_id,content,is_done,sort_order) VALUES ($1,$2,$3,FALSE,$4)`, [pdId('acl'), noteId, checklist[index], index + 1]);
      }
    }
  });
  console.log(JSON.stringify({ mode: 'apply', catalogVersion: CATALOG_VERSION, changed: mutating.length, plannedActions: plan.length }, null, 2));
}

async function verify(): Promise<void> {
  const state = await loadState(); const active = assertUniqueActiveExternalIds(state); const failures: string[] = [];
  for (const definition of auditNotes) {
    const note = active.get(definition.externalId); if (!note) { failures.push(`${definition.externalId}: missing`); continue; }
    if (note.title !== `${definition.externalId} — ${definition.title}`) failures.push(`${definition.externalId}: title`);
    if (note.content !== renderNoteContent(definition)) failures.push(`${definition.externalId}: content`);
    if (note.folder_name !== definition.folder) failures.push(`${definition.externalId}: folder`);
    if (note.priority !== definition.priority) failures.push(`${definition.externalId}: priority`);
    if (!note.tags.includes(MANAGED_TAG) || !note.tags.includes(`${VERSION_TAG_PREFIX}${CATALOG_VERSION}`)) failures.push(`${definition.externalId}: tags`);
    const checklist = state.checklistByNote.get(note.id) ?? [];
    if (definition.verifiedComplete) {
      if (!note.is_completed || !COMPLETED_IDS.has(definition.externalId)) failures.push(`${definition.externalId}: completion`);
      if (checklist.length !== 4 || checklist.some((item) => !item.is_done)) failures.push(`${definition.externalId}: checklist not 4/4`);
    } else if (note.is_completed || checklist.length < buildChecklist(definition).length || checklist.some((item) => item.is_done)) failures.push(`${definition.externalId}: open checklist`);
    if (note.content.length < 2600) failures.push(`${definition.externalId}: short content`);
  }
  const managed = state.notes.filter((note) => note.status === 'active' && note.tags.includes(MANAGED_TAG));
  if (managed.length !== auditNotes.length) failures.push(`managed count ${managed.length} != ${auditNotes.length}`);
  const completed = managed.filter((note) => note.is_completed).map((note) => externalIdOf(note.tags) as string).sort();
  if (!arraysEqual(completed, [...expectedCompletedExternalIds].sort())) failures.push(`completed IDs: ${completed.join(',')}`);
  if (failures.length) throw new Error(`Verification failed:\n- ${failures.join('\n- ')}`);
  console.log(JSON.stringify({ mode: 'verify', catalogVersion: CATALOG_VERSION, managedActive: managed.length, completed,
    folders: folderDefinitions.map((folder) => ({ folder: folder.name, count: managed.filter((note) => note.folder_name === folder.name).length })),
    minimumContentLength: Math.min(...managed.map((note) => note.content.length)),
    checklistRows: managed.reduce((sum, note) => sum + (state.checklistByNote.get(note.id)?.length ?? 0), 0), ok: true }, null, 2));
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2));
  if (flags.has('--inventory')) return inventory();
  if (flags.has('--apply')) return applyCatalog();
  if (flags.has('--verify')) return verify();
  return dryRun();
}
main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }).finally(closePool);
