'use client';

import React, { useState } from 'react';
import {
  StickyNote,
  Bell,
  FileText,
  Plus,
  Pin,
  PinOff,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  AlertCircle,
  X,
  Pencil,
  Search,
  Calendar,
  Download,
  Archive,
  ArchiveRestore,
  Eye,
  Folder,
  FolderPlus,
  FolderOpen,
  ListChecks,
  Paperclip,
  Check,
  Send,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { DashboardPageWrapper } from '@/components/dashboard/DashboardPageWrapper';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from '@/components/dashboard/rego/ReGoPrimitives';

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

export interface AdminNote {
  id: string;
  admin_id: string;
  folder_id: string | null;
  sort_order: number;
  type: 'note' | 'reminder' | 'draft';
  title: string;
  content: string;
  content_format: 'plain' | 'markdown';
  color: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  is_completed: boolean;
  reminder_at: string | null;
  due_at: string | null;
  tags: string[];
  status: 'active' | 'archived' | 'trashed';
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

export interface NoteActivity {
  id: string;
  note_id: string;
  admin_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type TabType = 'all' | 'note' | 'reminder' | 'draft';
export type StatusFilter = 'active' | 'archived' | 'trashed';

export interface AdminReGoNotesProps {
  notes: any[];
  folders: any[];
  activeFolder: string;
  setActiveFolder: (f: string) => void;
  stats: any;
  loading: boolean;
  activeTab: any;
  setActiveTab: (t: any) => void;
  statusFilter: any;
  setStatusFilter: (s: any) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showOverdue: boolean;
  setShowOverdue: (v: boolean) => void;
  showUpcoming: boolean;
  setShowUpcoming: (v: boolean) => void;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  openNewEditor: (type?: any) => void;
  openEditEditor: (note: any) => void;
  togglePin: (note: any, e?: React.MouseEvent) => any;
  toggleComplete: (note: any, e?: React.MouseEvent) => any;
  archiveNote: (note: any, e?: React.MouseEvent) => any;
  trashNote: (note: any, e?: React.MouseEvent) => any;
  restoreNote: (note: any, e?: React.MouseEvent) => any;
  permanentDeleteNote: (note: any, e?: React.MouseEvent) => any;
  batchArchive: () => any;
  batchTrash: () => any;
  batchDelete: () => any;
  exportNotes: (format: 'json' | 'csv') => any;
  openDetail: (note: any) => void;
  showFolderModal: boolean;
  setShowFolderModal: (v: boolean) => void;
  openNewFolderModal: () => void;
  openEditFolderModal?: (folder: any) => void;
  deleteFolder?: (folderId: any) => any;
  detailId: string | null;
  detailData: any;
  activity: any[];
  onCloseDetail: () => void;
  addChecklistItem?: (noteId: string, content: string) => any;
  toggleChecklistItem?: (noteId: string, itemId: string, isDone: boolean) => any;
  deleteChecklistItem?: (noteId: string, itemId: string) => any;
  uploadAttachment?: (noteId: string, file: File) => any;
  deleteAttachment?: (noteId: string, attachmentId: string) => any;
  addActivityComment?: (noteId: string, comment: string) => any;
  showEditor: boolean;
  setShowEditor: (v: boolean) => void;
  editorTitle: string;
  setEditorTitle: (v: string) => void;
  editorContent: string;
  setEditorContent: (v: string) => void;
  editorType: any;
  setEditorType: (v: any) => void;
  editorColor: string;
  setEditorColor: (v: string) => void;
  editorFolderId: string | null;
  setEditorFolderId: (v: string | null) => void;
  editorPriority: any;
  setEditorPriority: (v: any) => void;
  editorFormat: any;
  setEditorFormat: (v: any) => void;
  editorPreviewMode: boolean;
  setEditorPreviewMode: (v: boolean) => void;
  editorReminderAt: string;
  setEditorReminderAt: (v: string) => void;
  editorDueAt: string;
  setEditorDueAt: (v: string) => void;
  editorTags: string;
  setEditorTags: (v: string) => void;
  saveNote: () => any;
  saving: boolean;
  editingNote: any;
}

export function AdminReGoNotes({
  notes,
  folders,
  activeFolder,
  setActiveFolder,
  stats,
  loading,
  activeTab,
  setActiveTab,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  showOverdue,
  setShowOverdue,
  showUpcoming,
  setShowUpcoming,
  selectedIds,
  setSelectedIds,
  openNewEditor,
  openEditEditor,
  togglePin,
  toggleComplete,
  archiveNote,
  trashNote,
  restoreNote,
  permanentDeleteNote,
  batchArchive,
  batchTrash,
  batchDelete,
  exportNotes,
  openDetail,
  showFolderModal,
  setShowFolderModal,
  openNewFolderModal,
  openEditFolderModal,
  deleteFolder,
  detailId,
  detailData,
  activity,
  onCloseDetail,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  uploadAttachment,
  deleteAttachment,
  addActivityComment,
  showEditor,
  setShowEditor,
  editorTitle,
  setEditorTitle,
  editorContent,
  setEditorContent,
  editorType,
  setEditorType,
  editorColor,
  setEditorColor,
  editorFolderId,
  setEditorFolderId,
  editorPriority,
  setEditorPriority,
  editorFormat,
  setEditorFormat,
  editorPreviewMode,
  setEditorPreviewMode,
  editorReminderAt,
  setEditorReminderAt,
  editorDueAt,
  setEditorDueAt,
  editorTags,
  setEditorTags,
  saveNote,
  saving,
  editingNote,
}: AdminReGoNotesProps) {
  const [newChecklistText, setNewChecklistText] = useState('');

  const totalActive = stats?.active ?? notes.filter((n) => n.status === 'active').length;
  const overdueCount = stats?.overdue_reminders ?? 0;
  const upcomingCount = stats?.upcoming_reminders ?? 0;
  const pinnedCount = stats?.pinned ?? notes.filter((n) => n.is_pinned).length;
  const completedCount = stats?.completed ?? notes.filter((n) => n.is_completed).length;

  const handleSelectNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isOverdue = (reminderAt: string | null, isCompleted: boolean): boolean => {
    if (!reminderAt || isCompleted) return false;
    return new Date(reminderAt).getTime() < Date.now();
  };

  const isDueSoon = (reminderAt: string | null, isCompleted: boolean): boolean => {
    if (!reminderAt || isCompleted) return false;
    const target = new Date(reminderAt).getTime();
    const now = Date.now();
    return target > now && target <= now + 48 * 3600 * 1000;
  };

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Administration', href: '/dashboard' },
        { label: 'Pilotage & Télémétrie', href: '/dashboard' },
        { label: 'Notes & Rappels' },
      ]}
      headerTitle="Notes Administratives & Rappels Opérationnels"
      headerSubtitle="Espace collaboratif pour consigner les mémos d'audit, les consignes d'astreinte, les décisions exceptionnelles et les rappels d'arbitrage."
      headerIcon={StickyNote}
      statusBadge={
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
            Bloc-notes Collaboratif
          </span>
        </div>
      }
      secondaryAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void exportNotes('csv')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={openNewFolderModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
            <span>+ Dossier</span>
          </button>
        </div>
      }
      primaryAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openNewEditor('reminder')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 shadow-xs transition-all"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            <span>+ Rappel</span>
          </button>
          <button
            type="button"
            onClick={() => openNewEditor('note')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-95 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Rédiger Note</span>
          </button>
        </div>
      }
      alertBanner={
        overdueCount > 0 ? (
          <div className="p-4 rounded-[var(--rego-r,8px)] border border-red-200 bg-red-50 text-red-900 text-xs font-medium flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                <strong className="font-bold">{overdueCount} rappel(s) administratif(s) en retard.</strong> Des actions requièrent votre vigilance immédiate.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowOverdue(true);
                setActiveTab('reminder');
              }}
              className="px-3 py-1 text-xs font-bold rounded-[var(--rego-r,8px)] bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Afficher les Rappels en Retard
            </button>
          </div>
        ) : undefined
      }
      kpiStrip={
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <ReGoKpiHero
            label="Notes Actives"
            value={totalActive.toString()}
            delta={totalActive}
            deltaType="increase"
            deltaLabel="enregistrées"
            hint="Base administrative"
            icon={FileText}
          />
          <ReGoKpiHero
            label="Rappels en Retard"
            value={overdueCount.toString()}
            delta={overdueCount}
            deltaType={overdueCount > 0 ? 'decrease' : 'neutral'}
            deltaLabel={overdueCount > 0 ? 'Action requise' : 'À jour'}
            hint="Échéance dépassée"
            icon={AlertTriangle}
            accent={overdueCount > 0}
          />
          <ReGoKpiHero
            label="Rappels Prochains"
            value={upcomingCount.toString()}
            delta={upcomingCount}
            deltaType="neutral"
            deltaLabel="sous 48h"
            hint="Planifiés sous peu"
            icon={Bell}
          />
          <ReGoKpiHero
            label="Notes Épinglées"
            value={pinnedCount.toString()}
            delta={pinnedCount}
            deltaType="increase"
            deltaLabel="prioritaires"
            hint="Toujours en tête"
            icon={Pin}
          />
          <ReGoKpiHero
            label="Tâches Résolues"
            value={completedCount.toString()}
            delta={completedCount}
            deltaType="increase"
            deltaLabel="clôturées"
            hint="Historique archivé"
            icon={CheckCircle2}
          />
        </div>
      }
      filterToolbar={
        <div className="flex flex-col gap-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-3 shadow-2xs">
          {/* Module tabs & search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Type tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'Toutes', icon: StickyNote },
                  { id: 'note', label: 'Notes', icon: FileText },
                  { id: 'reminder', label: 'Rappels', icon: Bell },
                  { id: 'draft', label: 'Brouillons', icon: Sparkles },
                ] as Array<{ id: TabType; label: string; icon: any }>
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] transition-all ${
                      isActive
                        ? 'bg-[var(--rego-fg,#111111)] text-white shadow-xs'
                        : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par titre, contenu, tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-fg,#111111)] focus:outline-none focus:ring-1 focus:ring-[var(--rego-accent,#ad0505)]"
              />
            </div>
          </div>

          {/* Folder Pills Bar */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--rego-border,#dedede)] pt-3">
            <span className="text-xs font-bold text-[var(--rego-ink-2,#737373)] mr-1 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5" /> Dossiers:
            </span>
            <button
              type="button"
              onClick={() => setActiveFolder('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-[var(--rego-r,8px)] transition-all ${
                activeFolder === 'all'
                  ? 'bg-[var(--rego-accent,#ad0505)] text-white'
                  : 'border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-ink-2,#737373)] hover:bg-slate-50'
              }`}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => setActiveFolder('unorganized')}
              className={`px-2.5 py-1 text-xs font-bold rounded-[var(--rego-r,8px)] transition-all ${
                activeFolder === 'unorganized'
                  ? 'bg-[var(--rego-accent,#ad0505)] text-white'
                  : 'border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-ink-2,#737373)] hover:bg-slate-50'
              }`}
            >
              Non classés
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setActiveFolder(folder.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-[var(--rego-r,8px)] transition-all ${
                  activeFolder === folder.id
                    ? 'bg-[var(--rego-accent,#ad0505)] text-white'
                    : 'border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-ink-2,#737373)] hover:bg-slate-50'
                }`}
              >
                {folder.name}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-2.5 py-1 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-fg,#111111)]"
              >
                <option value="active">Actives</option>
                <option value="archived">Archivées</option>
                <option value="trashed">Corbeille</option>
              </select>
            </div>
          </div>

          {/* Batch Actions Toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] bg-slate-100 border border-slate-200 text-xs font-bold">
              <span>{selectedIds.size} note(s) sélectionnée(s)</span>
              <div className="flex items-center gap-2">
                {statusFilter === 'active' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void batchArchive()}
                      className="px-2.5 py-1 rounded-[var(--rego-r,8px)] bg-white border border-slate-300 hover:bg-slate-50"
                    >
                      Archiver la sélection
                    </button>
                    <button
                      type="button"
                      onClick={() => void batchTrash()}
                      className="px-2.5 py-1 rounded-[var(--rego-r,8px)] bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                    >
                      Mettre à la corbeille
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void batchDelete()}
                    className="px-2.5 py-1 rounded-[var(--rego-r,8px)] bg-red-600 text-white hover:bg-red-700"
                  >
                    Supprimer définitivement
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-2 py-1 text-slate-500 hover:text-slate-800"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      }
      mainContent={
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] space-y-3">
              <Clock className="w-6 h-6 animate-spin text-[var(--rego-accent,#ad0505)]" />
              <p className="text-xs font-bold text-[var(--rego-ink-2,#737373)]">
                Chargement des notes et mémos opérationnels...
              </p>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 rounded-[var(--rego-r,8px)] border border-dashed border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-center space-y-3">
              <StickyNote className="w-10 h-10 text-slate-300" />
              <h4 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
                Aucune note administrative trouvée
              </h4>
              <p className="text-xs text-[var(--rego-ink-2,#737373)] max-w-sm leading-relaxed">
                Consignez les mémos d&apos;audit, les consignes d&apos;astreinte ou les rappels d&apos;arbitrage pour l&apos;équipe de supervision.
              </p>
              <button
                type="button"
                onClick={() => openNewEditor('note')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-95 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer une première note</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map((note) => {
                const isSelected = selectedIds.has(note.id);
                const overdue = isOverdue(note.reminder_at, note.is_completed);
                const dueSoon = isDueSoon(note.reminder_at, note.is_completed);

                return (
                  <div
                    key={note.id}
                    onClick={() => openDetail(note)}
                    className={`group relative flex flex-col justify-between rounded-[var(--rego-r,8px)] border p-4 transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                      note.is_completed
                        ? 'border-emerald-200 bg-emerald-50/20 opacity-75'
                        : note.priority === 'urgent'
                        ? 'border-red-300 bg-red-50/30 hover:border-red-400'
                        : note.priority === 'high'
                        ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400'
                        : 'border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] hover:border-slate-400'
                    } ${isSelected ? 'ring-2 ring-[var(--rego-accent,#ad0505)]' : ''}`}
                  >
                    <div className="space-y-3">
                      {/* Top card bar */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => handleSelectNote(note.id, e)}
                            onChange={() => {}}
                            className="rounded text-[var(--rego-accent,#ad0505)] focus:ring-[var(--rego-accent,#ad0505)]"
                          />
                          <ReGoStatusChip
                            status={
                              note.priority === 'urgent'
                                ? 'err'
                                : note.priority === 'high'
                                ? 'warn'
                                : note.priority === 'low'
                                ? 'neutral'
                                : 'info'
                            }
                            label={note.priority}
                          />
                          {note.type === 'reminder' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                              <Bell className="w-3 h-3" /> Rappel
                            </span>
                          )}
                        </div>

                        {/* Pin button */}
                        <button
                          type="button"
                          onClick={(e) => void togglePin(note, e)}
                          className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                            note.is_pinned ? 'text-[var(--rego-accent,#ad0505)]' : 'text-slate-300 hover:text-slate-500'
                          }`}
                          title={note.is_pinned ? 'Détacher la note' : 'Épingler en haut'}
                        >
                          {note.is_pinned ? <Pin className="w-4 h-4 fill-current" /> : <Pin className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Note Title */}
                      <div>
                        <h4 className={`text-sm font-bold leading-tight ${note.is_completed ? 'line-through text-slate-500' : 'text-[var(--rego-fg,#111111)]'}`}>
                          {note.title}
                        </h4>
                        <p className="mt-1.5 text-xs text-[var(--rego-ink-2,#737373)] line-clamp-3 leading-relaxed">
                          {note.content}
                        </p>
                      </div>

                      {/* Tags */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.tags.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Reminder indicator */}
                      {note.reminder_at && (
                        <div className={`flex items-center gap-1.5 text-[11px] font-bold p-1.5 rounded ${
                          overdue
                            ? 'bg-red-100 text-red-800'
                            : dueSoon
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {overdue ? 'En retard: ' : 'Échéance: '}
                            {new Date(note.reminder_at).toLocaleString('fr-TN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card footer actions */}
                    <div className="mt-4 pt-3 border-t border-[var(--rego-border,#dedede)] flex items-center justify-between text-xs">
                      <span className="text-[10px] text-[var(--rego-ink-2,#737373)]">
                        {new Date(note.created_at).toLocaleDateString('fr-TN')}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => void toggleComplete(note, e)}
                          className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                            note.is_completed ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
                          }`}
                          title={note.is_completed ? 'Marquer non fait' : 'Marquer terminé'}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditEditor(note);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {statusFilter === 'active' ? (
                          <button
                            type="button"
                            onClick={(e) => void archiveNote(note, e)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            title="Archiver"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => void restoreNote(note, e)}
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors"
                            title="Restaurer"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => void trashNote(note, e)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      }
      drawer={
        <ReGoDrawer
          isOpen={Boolean(detailId)}
          onClose={onCloseDetail}
          title={detailData?.title || 'Détail de la Note'}
          subtitle={`Type: ${detailData?.type || 'note'} • Statut: ${detailData?.status || 'active'}`}
        >
          {detailData && (
            <div className="space-y-6">
              {/* Header metadata */}
              <div className="flex flex-wrap items-center gap-2">
                <ReGoStatusChip
                  status={
                    detailData.priority === 'urgent'
                      ? 'err'
                      : detailData.priority === 'high'
                      ? 'warn'
                      : 'info'
                  }
                  label={`Priorité: ${detailData.priority}`}
                />
                {detailData.is_completed && (
                  <ReGoStatusChip status="ok" label="Terminée" />
                )}
                {detailData.reminder_at && (
                  <span className="text-xs text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-bold">
                    Rappel: {new Date(detailData.reminder_at).toLocaleString('fr-TN')}
                  </span>
                )}
              </div>

              {/* Note Content */}
              <div className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-slate-50/50 text-xs leading-relaxed text-[var(--rego-fg,#111111)] whitespace-pre-wrap">
                {detailData.content}
              </div>

              {/* Interactive Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-[var(--rego-ink-2,#737373)] flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-slate-500" />
                    <span>Checklist & Sous-Tâches ({detailData.checklist?.length || 0})</span>
                  </h4>
                </div>

                <div className="space-y-2">
                  {detailData.checklist?.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-xs"
                    >
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.is_done}
                          onChange={(e) => {
                            if (toggleChecklistItem) void toggleChecklistItem(detailData.id, item.id, e.target.checked);
                          }}
                          className="rounded text-[var(--rego-accent,#ad0505)]"
                        />
                        <span className={item.is_done ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                          {item.content}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (deleteChecklistItem) void deleteChecklistItem(detailData.id, item.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ajouter une tâche à la checklist..."
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newChecklistText.trim()) {
                          if (addChecklistItem) void addChecklistItem(detailData.id, newChecklistText.trim());
                          setNewChecklistText('');
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newChecklistText.trim()) {
                          if (addChecklistItem) void addChecklistItem(detailData.id, newChecklistText.trim());
                          setNewChecklistText('');
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-white"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {detailData.attachments && detailData.attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-[var(--rego-ink-2,#737373)] flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-slate-500" />
                    <span>Pièces Jointes ({detailData.attachments.length})</span>
                  </h4>
                  <div className="divide-y border rounded-[var(--rego-r,8px)] border-[var(--rego-border,#dedede)] bg-white text-xs">
                    {detailData.attachments.map((att: any) => (
                      <div key={att.id} className="p-2.5 flex justify-between items-center">
                        <span className="font-medium truncate max-w-[200px]">{att.filename}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (deleteAttachment) void deleteAttachment(detailData.id, att.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Trail */}
              {activity && activity.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-[var(--rego-ink-2,#737373)]">
                    Journal d'Activité
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {activity.map((act: any) => (
                      <div key={act.id} className="p-2 rounded bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                        <span className="font-bold">{act.action}</span> • {new Date(act.created_at).toLocaleString('fr-TN')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ReGoDrawer>
      }
      modals={
        <ReGoModal
          isOpen={showEditor}
          onClose={() => setShowEditor(false)}
          title={editingNote ? 'Modifier la Note' : 'Rédiger une Note Administrative'}
          subtitle="Consignez les mémos d'audit, rappels d'échéance ou consignes d'astreinte."
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">
                Titre du Mémo / Rappel *
              </label>
              <input
                type="text"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                placeholder="ex. Audit conformité Aramex Sfax..."
                className="w-full px-3 py-2 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-fg,#111111)] focus:outline-none focus:ring-1 focus:ring-[var(--rego-accent,#ad0505)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">
                  Type
                </label>
                <select
                  value={editorType}
                  onChange={(e) => setEditorType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-fg,#111111)]"
                >
                  <option value="note">Note Ordinaire</option>
                  <option value="reminder">Rappel Planifié</option>
                  <option value="draft">Brouillon</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">
                  Niveau de Priorité
                </label>
                <select
                  value={editorPriority}
                  onChange={(e) => setEditorPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-fg,#111111)]"
                >
                  <option value="low">Basse</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Critique / Urgente</option>
                </select>
              </div>
            </div>

            {editorType === 'reminder' && (
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">
                  Date et Heure du Rappel *
                </label>
                <input
                  type="datetime-local"
                  value={editorReminderAt}
                  onChange={(e) => setEditorReminderAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-fg,#111111)]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">
                Contenu de la Note
              </label>
              <textarea
                rows={5}
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                placeholder="Détails du dossier, consignes pour l'équipe, décisions d'arbitrage..."
                className="w-full px-3 py-2 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-fg,#111111)] focus:outline-none focus:ring-1 focus:ring-[var(--rego-accent,#ad0505)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">
                Tags (séparés par une virgule)
              </label>
              <input
                type="text"
                value={editorTags}
                onChange={(e) => setEditorTags(e.target.value)}
                placeholder="Litige, Aramex, KYC, Remboursement..."
                className="w-full px-3 py-2 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-fg,#111111)]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--rego-border,#dedede)]">
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="px-3.5 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void saveNote()}
                disabled={saving || !editorTitle.trim()}
                className="px-4 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 disabled:opacity-50 shadow-sm transition-all"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer la Note'}
              </button>
            </div>
          </div>
        </ReGoModal>
      }
    />
  );
}
