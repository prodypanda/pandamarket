'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { useRealtimeEvent } from '@/hooks/useRealtimeEvent';
import { useState, useCallback, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
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
  FileType2,
  Paperclip,
  ListChecks,
  Plus as PlusIcon,
  History,
} from 'lucide-react';

/* ─── Types ─── */
interface ChecklistItem {
  id: string;
  note_id: string;
  content: string;
  is_done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface NoteAttachment {
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

interface AdminNote {
  id: string;
  admin_id: string;
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

interface AdminNoteDetail extends AdminNote {
  checklist: ChecklistItem[];
  attachments: NoteAttachment[];
}

interface NoteStats {
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

interface NoteActivity {
  id: string;
  note_id: string;
  admin_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

type TabType = 'all' | 'note' | 'reminder' | 'draft';
type StatusFilter = 'active' | 'archived' | 'trashed';

const COLORS = [
  {
    id: 'default',
    bg: 'bg-white dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
  {
    id: 'blue',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  {
    id: 'green',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  {
    id: 'yellow',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  {
    id: 'red',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
  },
  {
    id: 'purple',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800',
    dot: 'bg-violet-500',
  },
  {
    id: 'pink',
    bg: 'bg-pink-50 dark:bg-pink-950/30',
    border: 'border-pink-200 dark:border-pink-800',
    dot: 'bg-pink-500',
  },
  {
    id: 'orange',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    dot: 'bg-orange-500',
  },
];

const PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    icon: Circle,
    color: 'text-slate-400 dark:text-slate-500',
    bg: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  },
  normal: {
    label: 'Normal',
    icon: Circle,
    color: 'text-blue-400 dark:text-blue-500',
    bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  high: {
    label: 'High',
    icon: AlertTriangle,
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  },
  urgent: {
    label: 'Urgent',
    icon: AlertCircle,
    color: 'text-red-500 dark:text-red-400',
    bg: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
} as const;

function getColorConfig(colorId: string) {
  return COLORS.find((c) => c.id === colorId) || COLORS[0];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatReminderDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isOverdue(reminderAt: string | null, isCompleted: boolean): boolean {
  if (!reminderAt || isCompleted) return false;
  return new Date(reminderAt).getTime() < Date.now();
}

function isDueSoon(reminderAt: string | null, isCompleted: boolean, hours = 48): boolean {
  if (!reminderAt || isCompleted) return false;
  const target = new Date(reminderAt).getTime();
  const now = Date.now();
  return target > now && target <= now + hours * 3600 * 1000;
}

function formatFileSize(bytes: number | string): string {
  const n = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (!n || isNaN(n)) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* ─── Minimal Markdown Renderer (safe) ─── */
function renderMarkdown(markdown: string): string {
  let html = markdown;
  html = html.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  html = html.replace(
    /\[(.+?)\]\((.+?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => match.replace(/\n/g, ''));
  html = html.replace(/(<li>.*?<\/li>\n?)+/g, (match) => `<ul>${match.replace(/\n/g, '')}</ul>`);
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><h([1-3])>/g, '<h$1>');
  html = html.replace(/<\/h([1-3])><\/p>/g, '</h$1>');
  html = html.replace(/<p><ul>/g, '<ul>');
  html = html.replace(/<\/ul><\/p>/g, '</ul>');
  html = html.replace(/<p><blockquote>/g, '<blockquote>');
  html = html.replace(/<\/blockquote><\/p>/g, '</blockquote>');
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'b',
      'i',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'blockquote',
      'a',
      'code',
      'pre',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

/* ─── Main Page ─── */
export default function AdminNotesPage() {
  const { t } = useLocale();
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [stats, setStats] = useState<NoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOverdue, setShowOverdue] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<AdminNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<AdminNoteDetail | null>(null);
  const [activity, setActivity] = useState<NoteActivity[]>([]);

  // Editor state
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorType, setEditorType] = useState<'note' | 'reminder' | 'draft'>('note');
  const [editorColor, setEditorColor] = useState('default');
  const [editorPriority, setEditorPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>(
    'normal',
  );
  const [editorFormat, setEditorFormat] = useState<'plain' | 'markdown'>('plain');
  const [editorPreviewMode, setEditorPreviewMode] = useState(false);
  const [editorReminderAt, setEditorReminderAt] = useState('');
  const [editorDueAt, setEditorDueAt] = useState('');
  const [editorTags, setEditorTags] = useState('');

  const buildListUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('status', statusFilter);
    if (activeTab !== 'all') params.set('type', activeTab);
    if (showOverdue) params.set('overdue', 'true');
    if (showUpcoming) params.set('upcoming', 'true');
    if (searchQuery) params.set('search', searchQuery);
    params.set('limit', '100');
    return `/api/pd/admin/notes?${params.toString()}`;
  }, [statusFilter, activeTab, showOverdue, showUpcoming, searchQuery]);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetchWithCsrf(buildListUrl(), { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setNotes(json.data || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [buildListUrl]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/admin/notes/stats', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setStats(json.data || null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/notes/${id}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setDetailData(json.data || null);
      }
      const actRes = await fetchWithCsrf(`/api/pd/admin/notes/${id}/activity`, {
        credentials: 'include',
      });
      if (actRes.ok) {
        const actJson = await actRes.json();
        setActivity(actJson.data || []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Initial load + reload when filters change
  useEffect(() => {
    fetchNotes();
    fetchStats();
  }, [fetchNotes, fetchStats]);

  // Listen for realtime reminder notifications to refresh
  useRealtimeEvent('notification', (payload: unknown) => {
    const data = payload as Record<string, unknown>;
    if (data?.type === 'admin_note_reminder') {
      fetchStats();
    }
  });

  const openNewEditor = (type: 'note' | 'reminder' | 'draft' = 'note') => {
    setEditingNote(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorType(type);
    setEditorColor('default');
    setEditorPriority('normal');
    setEditorFormat('plain');
    setEditorPreviewMode(false);
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
    setEditorFormat(note.content_format || 'plain');
    setEditorPreviewMode(false);
    setEditorReminderAt(
      note.reminder_at ? new Date(note.reminder_at).toISOString().slice(0, 16) : '',
    );
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
        content_format: editorFormat,
        reminder_at: editorReminderAt ? new Date(editorReminderAt).toISOString() : null,
        due_at: editorDueAt ? new Date(editorDueAt).toISOString() : null,
        tags: editorTags
          ? editorTags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
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
      fetchStats();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const doLifecycle = async (
    id: string,
    action: 'archive' | 'trash' | 'restore' | 'delete',
    refresh = true,
  ) => {
    try {
      if (action === 'delete') {
        const res = await fetchWithCsrf(`/api/pd/admin/notes/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) {
          alert((await res.json().catch(() => ({}))).error?.message || 'Delete failed');
          return;
        }
      } else {
        await fetchWithCsrf(`/api/pd/admin/notes/${id}/${action}`, {
          method: 'PATCH',
          credentials: 'include',
        });
      }
      if (refresh) {
        fetchNotes();
        fetchStats();
      }
    } catch {
      /* ignore */
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm(t('admin.notes.confirmDeleteForever') as string)) return;
    await doLifecycle(id, 'delete');
  };

  const emptyTrash = async () => {
    if (!confirm(t('admin.notes.confirmEmptyTrash') as string)) return;
    try {
      const res = await fetchWithCsrf('/api/pd/admin/notes/trash/empty', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        fetchNotes();
        fetchStats();
      }
    } catch {
      /* ignore */
    }
  };

  const togglePin = async (id: string) => {
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/notes/${id}/pin`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === id ? json.data : n)));
        fetchStats();
      }
    } catch {
      /* ignore */
    }
  };

  const toggleComplete = async (id: string) => {
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/notes/${id}/complete`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === id ? json.data : n)));
        fetchStats();
      }
    } catch {
      /* ignore */
    }
  };

  // Bulk operations
  const bulkAction = async (
    action: 'archive' | 'trash' | 'restore' | 'delete' | 'complete' | 'incomplete',
  ) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (action === 'delete' && !confirm(t('admin.notes.confirmDeleteForever') as string)) return;
    try {
      const endpoint =
        action === 'complete' || action === 'incomplete'
          ? `/api/pd/admin/notes/bulk/complete`
          : `/api/pd/admin/notes/bulk/${action}`;
      const body =
        action === 'complete' || action === 'incomplete'
          ? JSON.stringify({ ids, completed: action === 'complete' })
          : JSON.stringify({ ids });
      await fetchWithCsrf(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      setSelectedIds(new Set());
      fetchNotes();
      fetchStats();
    } catch {
      /* ignore */
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportNotes = async (format: 'csv' | 'json') => {
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/notes/export?format=${format}`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `admin-notes.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };

  // Filter by search (client-side, server already handles too)
  const filteredNotes = notes;

  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.is_pinned);

  const tabs: { key: TabType; label: string; icon: typeof StickyNote; count: number }[] = [
    { key: 'all', label: t('admin.notes.all') as string, icon: StickyNote, count: notes.length },
    {
      key: 'note',
      label: t('admin.notes.notesTab') as string,
      icon: StickyNote,
      count: notes.filter((n) => n.type === 'note').length,
    },
    {
      key: 'reminder',
      label: t('admin.notes.remindersTab') as string,
      icon: Bell,
      count: notes.filter((n) => n.type === 'reminder').length,
    },
    {
      key: 'draft',
      label: t('admin.notes.draftsTab') as string,
      icon: FileText,
      count: notes.filter((n) => n.type === 'draft').length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('admin.notes.title') as string}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('admin.notes.subtitle') as string}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportNotes('csv')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-50 dark:hover:bg-slate-700"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            onClick={() => exportNotes('json')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-50 dark:hover:bg-slate-700"
            title="Export JSON"
          >
            <Download className="h-3.5 w-3.5" /> JSON
          </button>
          <button
            onClick={() => openNewEditor('note')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B91C1C] to-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Plus className="h-4 w-4" /> {t('admin.notes.newNote') as string}
          </button>
          <button
            onClick={() => openNewEditor('reminder')}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-2.5 text-sm font-bold text-amber-700 dark:text-amber-300 transition-all hover:bg-amber-100"
          >
            <Bell className="h-4 w-4" /> {t('admin.notes.newReminder') as string}
          </button>
          <button
            onClick={() => openNewEditor('draft')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" /> {t('admin.notes.newDraft') as string}
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <StatCard
            label={t('admin.notes.stats.total') as string}
            value={stats.total}
            icon={StickyNote}
            color="slate"
          />
          <StatCard
            label={t('admin.notes.stats.active') as string}
            value={stats.active}
            icon={Circle}
            color="blue"
          />
          <StatCard
            label={t('admin.notes.stats.completed') as string}
            value={stats.completed}
            icon={CheckCircle2}
            color="green"
          />
          <StatCard
            label={t('admin.notes.stats.pinned') as string}
            value={stats.pinned}
            icon={Pin}
            color="amber"
          />
          <StatCard
            label={t('admin.notes.stats.overdueReminders') as string}
            value={stats.overdue_reminders}
            icon={AlertCircle}
            color="red"
          />
          <StatCard
            label={t('admin.notes.stats.upcomingReminders') as string}
            value={stats.upcoming_reminders}
            icon={Clock}
            color="violet"
          />
        </div>
      )}

      {/* Tabs + Status Filter + Search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-[#B91C1C] to-red-700 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {(['active', 'archived', 'trashed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                statusFilter === s
                  ? s === 'archived'
                    ? 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-white'
                    : s === 'trashed'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {s === 'archived' ? (
                <Archive className="h-3 w-3" />
              ) : s === 'trashed' ? (
                <Trash2 className="h-3 w-3" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {t(`admin.notes.status.${s}`) as string}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Quick Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('admin.notes.searchPlaceholder') as string}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-sm outline-none transition-all focus:border-red-300 focus:ring-2 focus:ring-red-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowOverdue(!showOverdue);
              setShowUpcoming(false);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
              showOverdue
                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                : 'border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" /> {t('admin.notes.showOverdue') as string}
          </button>
          <button
            onClick={() => {
              setShowUpcoming(!showUpcoming);
              setShowOverdue(false);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
              showUpcoming
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300'
                : 'border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> {t('admin.notes.showUpcoming') as string}
          </button>
          {statusFilter === 'trashed' && (
            <button
              onClick={emptyTrash}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t('admin.notes.emptyTrash') as string}
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-4 py-3">
          <span className="text-xs font-black text-red-700 dark:text-red-300">
            {(t('admin.notes.selectedCount') as string).replace(
              '{count}',
              String(selectedIds.size),
            )}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => bulkAction('complete')}
            className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 transition-all hover:bg-green-200 dark:bg-green-900 dark:text-green-300"
          >
            <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
            {t('admin.notes.bulkComplete') as string}
          </button>
          <button
            onClick={() => bulkAction('incomplete')}
            className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
          >
            {t('admin.notes.bulkIncomplete') as string}
          </button>
          {statusFilter === 'active' && (
            <button
              onClick={() => bulkAction('archive')}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
            >
              <Archive className="mr-1 inline h-3.5 w-3.5" />
              {t('admin.notes.bulkArchive') as string}
            </button>
          )}
          {statusFilter !== 'trashed' && (
            <button
              onClick={() => bulkAction('trash')}
              className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 transition-all hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300"
            >
              <Trash2 className="mr-1 inline h-3.5 w-3.5" />
              {t('admin.notes.bulkTrash') as string}
            </button>
          )}
          {statusFilter !== 'active' && (
            <button
              onClick={() => bulkAction('restore')}
              className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 transition-all hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
            >
              <ArchiveRestore className="mr-1 inline h-3.5 w-3.5" />
              {t('admin.notes.bulkRestore') as string}
            </button>
          )}
          {statusFilter === 'trashed' && (
            <button
              onClick={() => bulkAction('delete')}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-red-700"
            >
              <Trash2 className="mr-1 inline h-3.5 w-3.5" />
              {t('admin.notes.bulkDelete') as string}
            </button>
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {t('admin.notes.deselectAll') as string}
          </button>
        </div>
      )}

      {/* Notes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-200 border-t-red-600" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
            <StickyNote className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
            {t('admin.notes.noItems') as string}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('admin.notes.noItemsDesc') as string}
          </p>
          <button
            onClick={() => openNewEditor()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B91C1C] to-red-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" /> {t('admin.notes.createFirstNote') as string}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pinned Section */}
          {pinnedNotes.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 px-1">
                <Pin className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {t('admin.notes.pinned') as string}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isSelected={selectedIds.has(note.id)}
                    onToggleSelect={() => toggleSelect(note.id)}
                    onEdit={() => openEditEditor(note)}
                    onOpenDetail={() => {
                      setDetailId(note.id);
                      fetchDetail(note.id);
                    }}
                    onDelete={() => deleteNote(note.id)}
                    onArchive={() => doLifecycle(note.id, 'archive')}
                    onTrash={() => doLifecycle(note.id, 'trash')}
                    onRestore={() => doLifecycle(note.id, 'restore')}
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
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    {t('admin.notes.other') as string}
                  </span>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {unpinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isSelected={selectedIds.has(note.id)}
                    onToggleSelect={() => toggleSelect(note.id)}
                    onEdit={() => openEditEditor(note)}
                    onOpenDetail={() => {
                      setDetailId(note.id);
                      fetchDetail(note.id);
                    }}
                    onDelete={() => deleteNote(note.id)}
                    onArchive={() => doLifecycle(note.id, 'archive')}
                    onTrash={() => doLifecycle(note.id, 'trash')}
                    onRestore={() => doLifecycle(note.id, 'restore')}
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
        <NoteEditor
          editingNote={editingNote}
          editorTitle={editorTitle}
          setEditorTitle={setEditorTitle}
          editorContent={editorContent}
          setEditorContent={setEditorContent}
          editorType={editorType}
          setEditorType={setEditorType}
          editorColor={editorColor}
          setEditorColor={setEditorColor}
          editorPriority={editorPriority}
          setEditorPriority={setEditorPriority}
          editorFormat={editorFormat}
          setEditorFormat={setEditorFormat}
          editorPreviewMode={editorPreviewMode}
          setEditorPreviewMode={setEditorPreviewMode}
          editorReminderAt={editorReminderAt}
          setEditorReminderAt={setEditorReminderAt}
          editorDueAt={editorDueAt}
          setEditorDueAt={setEditorDueAt}
          editorTags={editorTags}
          setEditorTags={setEditorTags}
          saving={saving}
          onSave={saveNote}
          onClose={() => setShowEditor(false)}
          t={t}
        />
      )}

      {/* Detail Drawer */}
      {detailId && detailData && (
        <NoteDetailDrawer
          note={detailData}
          activity={activity}
          onClose={() => {
            setDetailId(null);
            setDetailData(null);
            setActivity([]);
          }}
        />
      )}
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof StickyNote;
  color: string;
}) {
  const colors: Record<string, string> = {
    slate: 'text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800',
    blue: 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30',
    green: 'text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-950/30',
    amber: 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30',
    red: 'text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/30',
    violet: 'text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/30',
  };
  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-700 ${colors[color]} p-3 transition-all hover:shadow-md`}
    >
      <div className="mb-1 flex items-center justify-between">
        <Icon className="h-4 w-4 opacity-60" />
        <span className="text-xl font-black">{value}</span>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
    </div>
  );
}

/* ─── Note Card ─── */
function NoteCard({
  note,
  isSelected,
  onToggleSelect,
  onEdit,
  onOpenDetail,
  onDelete,
  onArchive,
  onTrash,
  onRestore,
  onTogglePin,
  onToggleComplete,
}: {
  note: AdminNote;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onOpenDetail: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onTogglePin: () => void;
  onToggleComplete: () => void;
}) {
  const { t } = useLocale();
  const colorCfg = getColorConfig(note.color);
  const priorityCfg = PRIORITY_CONFIG[note.priority];
  const PriorityIcon = priorityCfg.icon;
  const overdue = isOverdue(note.reminder_at, note.is_completed);
  const dueSoon = isDueSoon(note.reminder_at, note.is_completed);

  const typeIcon = note.type === 'reminder' ? Bell : note.type === 'draft' ? FileText : StickyNote;
  const TypeIcon = typeIcon;
  const typeColor =
    note.type === 'reminder'
      ? 'text-amber-500 dark:text-amber-400'
      : note.type === 'draft'
        ? 'text-slate-400 dark:text-slate-500'
        : 'text-blue-500 dark:text-blue-400';

  const renderContent = () => {
    if (!note.content) return null;
    if (note.content_format === 'markdown') {
      return (
        <div
          className="mb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 prose prose-sm max-w-none line-clamp-3 [&_*]:!text-inherit"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
        />
      );
    }
    return (
      <p className="mb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">
        {note.content}
      </p>
    );
  };

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border ${colorCfg.border} ${colorCfg.bg} p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${note.is_completed ? 'opacity-60' : ''} ${overdue ? 'ring-2 ring-red-300 dark:ring-red-700' : ''} ${dueSoon ? 'ring-2 ring-violet-200 dark:ring-violet-700' : ''}`}
    >
      {/* Selection checkbox */}
      <div className="absolute -left-2 -top-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-red-600 focus:ring-red-500"
        />
      </div>

      {/* Top Row */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TypeIcon className={`h-3.5 w-3.5 ${typeColor}`} />
          {note.priority !== 'normal' && (
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${priorityCfg.bg}`}>
              <PriorityIcon className="mr-0.5 inline h-2.5 w-2.5" />
              {priorityCfg.label}
            </span>
          )}
          {overdue && (
            <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900 dark:text-red-300 animate-pulse">
              {t('admin.notes.reminderOverdue') as string}
            </span>
          )}
          {dueSoon && (
            <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900 dark:text-violet-300">
              {t('admin.notes.reminderDueSoon') as string}
            </span>
          )}
          {note.content_format === 'markdown' && (
            <FileType2 className="h-3 w-3 text-slate-300 dark:text-slate-500" title="Markdown" />
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onOpenDetail}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-slate-700 dark:hover:bg-slate-700/60"
            title="Open detail"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {note.status === 'active' && (
            <>
              <button
                onClick={onTogglePin}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-amber-500 dark:hover:bg-slate-700/60"
                title="Pin"
              >
                {note.is_pinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={onToggleComplete}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-green-500 dark:hover:bg-slate-700/60"
                title="Complete"
              >
                {note.is_completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={onEdit}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-blue-500 dark:hover:bg-slate-700/60"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onArchive}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-slate-700 dark:hover:bg-slate-700/60"
                title="Archive"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {(note.status === 'archived' || note.status === 'active') && (
            <button
              onClick={onTrash}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-red-500 dark:hover:bg-slate-700/60"
              title="Trash"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {note.status !== 'active' && (
            <button
              onClick={onRestore}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-blue-500 dark:hover:bg-slate-700/60"
              title="Restore"
            >
              <ArchiveRestore className="h-3.5 w-3.5" />
            </button>
          )}
          {note.status === 'trashed' && (
            <button
              onClick={onDelete}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-red-500 dark:hover:bg-slate-700/60"
              title="Delete forever"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h4
        className={`mb-1 cursor-pointer text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2 ${note.is_completed ? 'line-through' : ''}`}
        onClick={onOpenDetail}
      >
        {note.is_pinned && <Pin className="mr-1 inline h-3 w-3 text-amber-500" />}
        {note.title}
      </h4>

      {/* Content preview */}
      {renderContent()}

      {/* Reminder / Due */}
      {(note.reminder_at || note.due_at) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {note.reminder_at && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${overdue ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}
            >
              <Bell className="h-2.5 w-2.5" />
              {formatReminderDate(note.reminder_at)}
            </span>
          )}
          {note.due_at && (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
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
            <span
              key={tag}
              className="rounded-md bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700/60 dark:text-slate-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-2 text-[10px] text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {formatDate(note.updated_at)}
        </span>
        <span className="capitalize">{note.status}</span>
      </div>
    </div>
  );
}

/* ─── Note Editor Modal ─── */
function NoteEditor(props: {
  editingNote: AdminNote | null;
  editorTitle: string;
  setEditorTitle: (v: string) => void;
  editorContent: string;
  setEditorContent: (v: string) => void;
  editorType: 'note' | 'reminder' | 'draft';
  setEditorType: (v: 'note' | 'reminder' | 'draft') => void;
  editorColor: string;
  setEditorColor: (v: string) => void;
  editorPriority: 'low' | 'normal' | 'high' | 'urgent';
  setEditorPriority: (v: 'low' | 'normal' | 'high' | 'urgent') => void;
  editorFormat: 'plain' | 'markdown';
  setEditorFormat: (v: 'plain' | 'markdown') => void;
  editorPreviewMode: boolean;
  setEditorPreviewMode: (v: boolean) => void;
  editorReminderAt: string;
  setEditorReminderAt: (v: string) => void;
  editorDueAt: string;
  setEditorDueAt: (v: string) => void;
  editorTags: string;
  setEditorTags: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  t: (key: string) => string | undefined;
}) {
  const { t } = useLocale();
  const p = props;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {p.editingNote
              ? (t('admin.notes.editor.edit') as string)
              : (t('admin.notes.editor.create') as string)}{' '}
            {p.editorType === 'note'
              ? t('admin.notes.type.note')
              : p.editorType === 'reminder'
                ? t('admin.notes.type.reminder')
                : t('admin.notes.type.draft')}
          </h3>
          <button
            onClick={p.onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body (scrollable) */}
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {/* Type selector */}
          <div className="flex items-center gap-2">
            {(['note', 'reminder', 'draft'] as const).map((ty) => (
              <button
                key={ty}
                onClick={() => p.setEditorType(ty)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                  p.editorType === ty
                    ? ty === 'note'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : ty === 'reminder'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t(`admin.notes.type.${ty}`) as string}
              </button>
            ))}
          </div>

          {/* Title */}
          <input
            type="text"
            value={p.editorTitle}
            onChange={(e) => p.setEditorTitle(e.target.value)}
            placeholder={t('admin.notes.editor.titlePlaceholder') as string}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-red-300 focus:ring-2 focus:ring-red-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />

          {/* Content with format toggle + preview */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(['plain', 'markdown'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      p.setEditorFormat(f);
                      p.setEditorPreviewMode(false);
                    }}
                    className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase transition-all ${
                      p.editorFormat === f
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {t(`admin.notes.contentFormat.${f}`) as string}
                  </button>
                ))}
              </div>
              {p.editorFormat === 'markdown' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => p.setEditorPreviewMode(false)}
                    className={`rounded-lg px-2 py-1 text-[10px] font-bold ${!p.editorPreviewMode ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'text-slate-400'}`}
                  >
                    {t('admin.notes.editor.edit') as string}
                  </button>
                  <button
                    onClick={() => p.setEditorPreviewMode(true)}
                    className={`rounded-lg px-2 py-1 text-[10px] font-bold ${p.editorPreviewMode ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'text-slate-400'}`}
                  >
                    {t('admin.notes.editor.preview') as string}
                  </button>
                </div>
              )}
            </div>
            {p.editorFormat === 'markdown' && p.editorPreviewMode ? (
              <div
                className="min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 prose prose-sm max-w-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                dangerouslySetInnerHTML={{
                  __html:
                    renderMarkdown(p.editorContent) ||
                    `<p class="text-slate-400">${t('admin.notes.editor.contentPlaceholder') as string}</p>`,
                }}
              />
            ) : (
              <textarea
                value={p.editorContent}
                onChange={(e) => p.setEditorContent(e.target.value)}
                placeholder={t('admin.notes.editor.contentPlaceholder') as string}
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-red-300 focus:ring-2 focus:ring-red-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            )}
            {p.editorFormat === 'markdown' && !p.editorPreviewMode && (
              <p className="mt-1 text-[10px] text-slate-400">
                {'**bold**, *italic*, `code`, # Heading, - list, [link](url), > quote'}
              </p>
            )}
          </div>

          {/* Color picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('admin.notes.color') as string}:
            </span>
            {COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => p.setEditorColor(c.id)}
                className={`h-6 w-6 rounded-full ${c.dot} transition-all ${
                  p.editorColor === c.id
                    ? 'ring-2 ring-offset-2 ring-slate-400 scale-110 dark:ring-offset-slate-900'
                    : 'hover:scale-110'
                }`}
              />
            ))}
          </div>

          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('admin.notes.filterByPriority') as string}:
            </span>
            {(['low', 'normal', 'high', 'urgent'] as const).map((pr) => {
              const cfg = PRIORITY_CONFIG[pr];
              return (
                <button
                  key={pr}
                  onClick={() => p.setEditorPriority(pr)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition-all ${
                    p.editorPriority === pr
                      ? cfg.bg
                      : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t(`admin.notes.priority.${pr}`) as string}
                </button>
              );
            })}
          </div>

          {/* Reminder / Due dates */}
          {(p.editorType === 'reminder' || p.editorType === 'note') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t('admin.notes.reminderAt') as string}
                </label>
                <input
                  type="datetime-local"
                  value={p.editorReminderAt}
                  onChange={(e) => p.setEditorReminderAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-red-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t('admin.notes.dueAt') as string}
                </label>
                <input
                  type="datetime-local"
                  value={p.editorDueAt}
                  onChange={(e) => p.setEditorDueAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-red-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('admin.notes.tags') as string}
            </label>
            <input
              type="text"
              value={p.editorTags}
              onChange={(e) => p.setEditorTags(e.target.value)}
              placeholder={t('admin.notes.tagsPlaceholder') as string}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-red-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700 px-6 py-4">
          <button
            onClick={p.onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('admin.notes.editor.cancel') as string}
          </button>
          <button
            onClick={p.onSave}
            disabled={p.saving || !p.editorTitle.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B91C1C] to-red-700 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {p.saving
              ? (t('admin.notes.editor.saving') as string)
              : p.editingNote
                ? (t('admin.notes.editor.update') as string)
                : (t('admin.notes.editor.create') as string)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Note Detail Drawer ─── */
function NoteDetailDrawer({
  note,
  activity,
  onClose,
}: {
  note: AdminNoteDetail;
  activity: NoteActivity[];
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [newItem, setNewItem] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addChecklistItem = async () => {
    if (!newItem.trim()) return;
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/notes/${note.id}/checklist`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newItem.trim(), sort_order: note.checklist.length }),
      });
      if (res.ok) {
        const json = await res.json();
        note.checklist = [...note.checklist, json.data];
        setNewItem('');
      }
    } catch {
      /* ignore */
    }
  };

  const toggleChecklistItem = async (item: ChecklistItem) => {
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/notes/${note.id}/checklist/${item.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_done: !item.is_done }),
      });
      if (res.ok) {
        const json = await res.json();
        const idx = note.checklist.findIndex((c) => c.id === item.id);
        if (idx >= 0) note.checklist[idx] = json.data;
        note.checklist = [...note.checklist];
      }
    } catch {
      /* ignore */
    }
  };

  const removeChecklistItem = async (itemId: string) => {
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/notes/${note.id}/checklist/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        note.checklist = note.checklist.filter((c) => c.id !== itemId);
        note.checklist = [...note.checklist];
      }
    } catch {
      /* ignore */
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const contentType = file.type || 'application/octet-stream';
        const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            content_type: contentType,
            file_size: file.size,
            purpose: 'admin_note_attachment',
          }),
        });
        const presignData = await presignRes.json();
        if (!presignRes.ok) throw new Error(presignData.error?.message || 'Upload refused');
        await fetch(presignData.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: file,
        });
        const attRes = await fetchWithCsrf(`/api/pd/admin/notes/${note.id}/attachments`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_key: presignData.file_key,
            bucket: presignData.public_url ? 'pd-product-images' : 'pd-private',
            filename: file.name,
            content_type: contentType,
            file_size: file.size,
          }),
        });
        if (attRes.ok) {
          const attJson = await attRes.json();
          note.attachments = [...note.attachments, attJson.data];
          note.attachments = [...note.attachments];
        }
      }
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    try {
      const res = await fetchWithCsrf(
        `/api/pd/admin/notes/${note.id}/attachments/${attachmentId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      if (res.ok) {
        note.attachments = note.attachments.filter((a) => a.id !== attachmentId);
        note.attachments = [...note.attachments];
      }
    } catch {
      /* ignore */
    }
  };

  const colorCfg = getColorConfig(note.color);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`flex h-full w-full max-w-lg flex-col overflow-hidden border-l ${colorCfg.border} bg-white shadow-2xl dark:bg-slate-900`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-4 ${colorCfg.bg}`}
        >
          <h3 className="text-lg font-black text-slate-900 dark:text-white line-clamp-1">
            {note.title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Content */}
          {note.content ? (
            note.content_format === 'markdown' ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {note.content}
              </p>
            )
          ) : (
            <p className="text-sm text-slate-400">No content</p>
          )}

          {/* Reminder & Due */}
          {(note.reminder_at || note.due_at) && (
            <div className="flex flex-wrap gap-2">
              {note.reminder_at && (
                <div
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${isOverdue(note.reminder_at, note.is_completed) ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}
                >
                  <Bell className="mr-1.5 inline h-3.5 w-3.5" />
                  {t('admin.notes.reminderAt') as string}: {formatReminderDate(note.reminder_at)}
                </div>
              )}
              {note.due_at && (
                <div className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  <Calendar className="mr-1.5 inline h-3.5 w-3.5" />
                  {t('admin.notes.dueAt') as string}: {formatReminderDate(note.due_at)}
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Checklist */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-slate-400" />
              <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">
                {t('admin.notes.checklist') as string}
              </h4>
            </div>
            {note.checklist && note.checklist.length > 0 ? (
              <div className="space-y-1.5">
                {note.checklist.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <button
                      onClick={() => toggleChecklistItem(item)}
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded ${item.is_done ? 'bg-green-500 text-white' : 'border border-slate-300 dark:border-slate-600'}`}
                    >
                      {item.is_done && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                    <span
                      className={`flex-1 text-xs ${item.is_done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      {item.content}
                    </span>
                    <button
                      onClick={() => removeChecklistItem(item.id)}
                      className="text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">{t('admin.notes.checklistEmpty') as string}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                placeholder={t('admin.notes.checklistPlaceholder') as string}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-red-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <button
                onClick={addChecklistItem}
                className="rounded-lg bg-slate-200 p-1.5 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-slate-400" />
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">
                  {t('admin.notes.attachments') as string}
                </h4>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 transition-all hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                {uploading ? '...' : (t('admin.notes.attachFile') as string)}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleUpload}
                className="hidden"
              />
            </div>
            {note.attachments && note.attachments.length > 0 ? (
              <div className="space-y-1.5">
                {note.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="group flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                    <span className="flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {att.filename}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatFileSize(att.file_size)}
                    </span>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No attachments</p>
            )}
          </div>

          {/* Activity Log */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <History className="h-4 w-4 text-slate-400" />
              <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">
                {t('admin.notes.activityLog') as string}
              </h4>
            </div>
            {activity.length > 0 ? (
              <div className="space-y-1.5">
                {activity.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
                  >
                    <span className="font-bold capitalize text-slate-600 dark:text-slate-300">
                      {act.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span>{formatDate(act.created_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">{t('admin.notes.activityEmpty') as string}</p>
            )}
          </div>

          {/* Meta */}
          <div className="border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-700">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                {t('admin.notes.createdAt') as string}: {formatDate(note.created_at)}
              </span>
              <span>
                {t('admin.notes.updatedAt') as string}: {formatDate(note.updated_at)}
              </span>
              {note.completed_at && (
                <span>
                  {t('admin.notes.completedAt') as string}: {formatDate(note.completed_at)}
                </span>
              )}
              {note.archived_at && (
                <span>
                  {t('admin.notes.archivedAt') as string}: {formatDate(note.archived_at)}
                </span>
              )}
              {note.trashed_at && (
                <span>
                  {t('admin.notes.trashedAt') as string}: {formatDate(note.trashed_at)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
