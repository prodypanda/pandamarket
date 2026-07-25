'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { useEffect, useState, useCallback } from 'react';
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
  ChevronDown,
  X,
  Pencil,
  Search,
  Calendar,
} from 'lucide-react';

/* ─── Types ─── */
interface AdminNote {
  id: string;
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

type TabType = 'all' | 'note' | 'reminder' | 'draft';

const COLORS = [
  { id: 'default', bg: 'bg-white', border: 'border-slate-200', dot: 'bg-slate-400' },
  { id: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
  { id: 'green', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'yellow', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
  { id: 'red', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
  { id: 'purple', bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-500' },
  { id: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', dot: 'bg-pink-500' },
  { id: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
];

const PRIORITY_CONFIG = {
  low: { label: 'Low', icon: Circle, color: 'text-slate-400', bg: 'bg-slate-100 text-slate-600' },
  normal: { label: 'Normal', icon: Circle, color: 'text-blue-400', bg: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 text-amber-700' },
  urgent: { label: 'Urgent', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 text-red-700' },
};

function getColorConfig(colorId: string) {
  return COLORS.find((c) => c.id === colorId) || COLORS[0];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function formatReminderDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminNotesPage() {
  const { t } = useLocale();
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<AdminNote | null>(null);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorType, setEditorType] = useState<'note' | 'reminder' | 'draft'>('note');
  const [editorColor, setEditorColor] = useState('default');
  const [editorPriority, setEditorPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [editorReminderAt, setEditorReminderAt] = useState('');
  const [editorDueAt, setEditorDueAt] = useState('');
  const [editorTags, setEditorTags] = useState('');

  const fetchNotes = useCallback(async () => {
    try {
      const url = activeTab === 'all' ? '/api/pd/admin/notes' : `/api/pd/admin/notes?type=${activeTab}`;
      const res = await fetchWithCsrf(url, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setNotes(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchNotes();
  }, [fetchNotes]);

  const openNewEditor = (type: 'note' | 'reminder' | 'draft' = 'note') => {
    setEditingNote(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorType(type);
    setEditorColor('default');
    setEditorPriority('normal');
    setEditorReminderAt('');
    setEditorDueAt('');
    setEditorTags('');
    setShowEditor(true);
  };

  const openEditEditor = (note: AdminNote) => {
    setEditingNote(note);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorType(note.type);
    setEditorColor(note.color);
    setEditorPriority(note.priority);
    setEditorReminderAt(note.reminder_at ? new Date(note.reminder_at).toISOString().slice(0, 16) : '');
    setEditorDueAt(note.due_at ? new Date(note.due_at).toISOString().slice(0, 16) : '');
    setEditorTags(note.tags?.join(', ') || '');
    setShowEditor(true);
  };

  const saveNote = async () => {
    if (!editorTitle.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: editorTitle.trim(),
        content: editorContent,
        type: editorType,
        color: editorColor,
        priority: editorPriority,
        reminder_at: editorReminderAt || null,
        due_at: editorDueAt || null,
        tags: editorTags ? editorTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };

      if (editingNote) {
        await fetchWithCsrf(`/api/pd/admin/notes/${editingNote.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await fetchWithCsrf('/api/pd/admin/notes', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      setShowEditor(false);
      fetchNotes();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await fetchWithCsrf(`/api/pd/admin/notes/${id}`, { method: 'DELETE', credentials: 'include' });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch { /* ignore */ }
  };

  const togglePin = async (id: string) => {
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/notes/${id}/pin`, { method: 'PATCH', credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === id ? json.data : n)));
      }
    } catch { /* ignore */ }
  };

  const toggleComplete = async (id: string) => {
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/notes/${id}/complete`, { method: 'PATCH', credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === id ? json.data : n)));
      }
    } catch { /* ignore */ }
  };

  // Filter by search
  const filteredNotes = notes.filter((n) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags?.some((t) => t.toLowerCase().includes(q));
  });

  // Separate pinned and unpinned
  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.is_pinned);

  const tabs: { key: TabType; label: string; icon: typeof StickyNote; count: number }[] = [
    { key: 'all', label: 'All', icon: StickyNote, count: notes.length },
    { key: 'note', label: 'Notes', icon: StickyNote, count: notes.filter((n) => n.type === 'note').length },
    { key: 'reminder', label: 'Reminders', icon: Bell, count: notes.filter((n) => n.type === 'reminder').length },
    { key: 'draft', label: 'Drafts', icon: FileText, count: notes.filter((n) => n.type === 'draft').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {t('admin.notes.title') || 'Notes & Reminders'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('admin.notes.subtitle') || 'Your personal workspace for notes, reminders, and drafts'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openNewEditor('note')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B91C1C] to-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Plus className="h-4 w-4" />
            New Note
          </button>
          <button
            onClick={() => openNewEditor('reminder')}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 transition-all hover:bg-amber-100"
          >
            <Bell className="h-4 w-4" />
            Reminder
          </button>
          <button
            onClick={() => openNewEditor('draft')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            Draft
          </button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-[#B91C1C] to-red-700 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-sm outline-none transition-all focus:border-red-300 focus:ring-2 focus:ring-red-100 sm:w-64"
          />
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-200 border-t-red-600" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <StickyNote className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">No items yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create your first note, reminder, or draft to get started.</p>
          <button
            onClick={() => openNewEditor()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B91C1C] to-red-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Create First Note
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pinned Section */}
          {pinnedNotes.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 px-1">
                <Pin className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Pinned</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={() => openEditEditor(note)}
                    onDelete={() => deleteNote(note.id)}
                    onTogglePin={() => togglePin(note.id)}
                    onToggleComplete={() => toggleComplete(note.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Notes */}
          {unpinnedNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">Other</span>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {unpinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={() => openEditEditor(note)}
                    onDelete={() => deleteNote(note.id)}
                    onTogglePin={() => togglePin(note.id)}
                    onToggleComplete={() => toggleComplete(note.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-black text-slate-900">
                {editingNote ? 'Edit' : 'New'} {editorType === 'note' ? 'Note' : editorType === 'reminder' ? 'Reminder' : 'Draft'}
              </h3>
              <button onClick={() => setShowEditor(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 px-6 py-5">
              {/* Type selector */}
              <div className="flex items-center gap-2">
                {(['note', 'reminder', 'draft'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEditorType(t)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                      editorType === t
                        ? t === 'note' ? 'bg-blue-100 text-blue-700' : t === 'reminder' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Title */}
              <input
                type="text"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                placeholder="Title..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />

              {/* Content */}
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                placeholder="Write your content here..."
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />

              {/* Color picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Color:</span>
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setEditorColor(c.id)}
                    className={`h-6 w-6 rounded-full ${c.dot} transition-all ${
                      editorColor === c.id ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'
                    }`}
                  />
                ))}
              </div>

              {/* Priority */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Priority:</span>
                {(['low', 'normal', 'high', 'urgent'] as const).map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  return (
                    <button
                      key={p}
                      onClick={() => setEditorPriority(p)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition-all ${
                        editorPriority === p ? cfg.bg : 'text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              {/* Reminder / Due dates */}
              {(editorType === 'reminder' || editorType === 'note') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500">Reminder at</label>
                    <input
                      type="datetime-local"
                      value={editorReminderAt}
                      onChange={(e) => setEditorReminderAt(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-red-300"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500">Due date</label>
                    <input
                      type="datetime-local"
                      value={editorDueAt}
                      onChange={(e) => setEditorDueAt(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-red-300"
                    />
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editorTags}
                  onChange={(e) => setEditorTags(e.target.value)}
                  placeholder="e.g. important, todo, follow-up"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-red-300"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setShowEditor(false)}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 transition-all hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                disabled={saving || !editorTitle.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B91C1C] to-red-700 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {saving ? 'Saving...' : editingNote ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Note Card Component ─── */
function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleComplete,
}: {
  note: AdminNote;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleComplete: () => void;
}) {
  const colorCfg = getColorConfig(note.color);
  const priorityCfg = PRIORITY_CONFIG[note.priority];
  const PriorityIcon = priorityCfg.icon;

  const typeIcon = note.type === 'reminder' ? Bell : note.type === 'draft' ? FileText : StickyNote;
  const TypeIcon = typeIcon;
  const typeColor = note.type === 'reminder' ? 'text-amber-500' : note.type === 'draft' ? 'text-slate-400' : 'text-blue-500';

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border ${colorCfg.border} ${colorCfg.bg} p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
        note.is_completed ? 'opacity-60' : ''
      }`}
    >
      {/* Top Row */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TypeIcon className={`h-3.5 w-3.5 ${typeColor}`} />
          {note.priority !== 'normal' && (
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${priorityCfg.bg}`}>
              {priorityCfg.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={onTogglePin} className="rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-amber-500" title="Pin">
            {note.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onToggleComplete} className="rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-green-500" title="Complete">
            {note.is_completed ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Circle className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onEdit} className="rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-blue-500" title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-red-500" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className={`mb-1 text-sm font-bold text-slate-800 line-clamp-2 ${note.is_completed ? 'line-through' : ''}`}>
        {note.is_pinned && <Pin className="mr-1 inline h-3 w-3 text-amber-500" />}
        {note.title}
      </h4>

      {/* Content preview */}
      {note.content && (
        <p className="mb-2 text-xs leading-relaxed text-slate-500 line-clamp-3">{note.content}</p>
      )}

      {/* Reminder / Due */}
      {(note.reminder_at || note.due_at) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {note.reminder_at && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
              <Bell className="h-2.5 w-2.5" />
              {formatReminderDate(note.reminder_at)}
            </span>
          )}
          {note.due_at && (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
              <Calendar className="h-2.5 w-2.5" />
              {formatReminderDate(note.due_at)}
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-2 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {formatDate(note.updated_at)}
        </span>
        <span className="capitalize">{note.type}</span>
      </div>
    </div>
  );
}
