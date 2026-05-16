'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileWarning,
  Filter,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  ServerCrash,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';

type SystemLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface SystemLogEntry {
  id: string;
  level: SystemLogLevel;
  source: string;
  event_type: string;
  message: string;
  request_id: string | null;
  method: string | null;
  path: string | null;
  status_code: number | null;
  user_id: string | null;
  user_role: string | null;
  ip: string | null;
  user_agent: string | null;
  error_name: string | null;
  error_code: string | null;
  stack: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface SystemLogSummary {
  total: number;
  info?: number;
  errors: number;
  warnings: number;
  fatal: number;
  last_hour?: number;
  last_24h: number;
  unresolved_500s: number;
  manual_logs?: number;
}

interface CreateLogForm {
  level: SystemLogLevel;
  source: string;
  event_type: string;
  message: string;
  path: string;
  status_code: string;
  error_name: string;
  error_code: string;
  stack: string;
  metadata: string;
}

type ClearMode = 'filters' | 'older' | 'all';

const defaultSummary: SystemLogSummary = {
  total: 0,
  info: 0,
  errors: 0,
  warnings: 0,
  fatal: 0,
  last_hour: 0,
  last_24h: 0,
  unresolved_500s: 0,
  manual_logs: 0,
};

const defaultCreateForm: CreateLogForm = {
  level: 'info',
  source: 'admin',
  event_type: 'admin_manual_log',
  message: '',
  path: '',
  status_code: '',
  error_name: '',
  error_code: '',
  stack: '',
  metadata: '{\n  "note": ""\n}',
};

const levelStyles: Record<SystemLogLevel, string> = {
  debug: 'bg-slate-100 text-slate-600 ring-slate-200',
  info: 'bg-blue-50 text-blue-700 ring-blue-100',
  warn: 'bg-amber-50 text-amber-700 ring-amber-100',
  error: 'bg-red-50 text-red-700 ring-red-100',
  fatal: 'bg-rose-950 text-white ring-rose-900',
};

const levelOptions: Array<{ value: SystemLogLevel; label: string }> = [
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'fatal', label: 'Fatal' },
];

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.error?.message || data.message || fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-TN');
}

function formatMetadata(value: Record<string, unknown> | null) {
  if (!value || Object.keys(value).length === 0) return '-';
  return JSON.stringify(value, null, 2);
}

function toNumber(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function normalizeSummary(value: Partial<SystemLogSummary> | undefined): SystemLogSummary {
  return {
    total: toNumber(value?.total),
    info: toNumber(value?.info),
    errors: toNumber(value?.errors),
    warnings: toNumber(value?.warnings),
    fatal: toNumber(value?.fatal),
    last_hour: toNumber(value?.last_hour),
    last_24h: toNumber(value?.last_24h),
    unresolved_500s: toNumber(value?.unresolved_500s),
    manual_logs: toNumber(value?.manual_logs),
  };
}

export default function SystemLogsPage() {
  const [entries, setEntries] = useState<SystemLogEntry[]>([]);
  const [summary, setSummary] = useState<SystemLogSummary>(defaultSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [eventType, setEventType] = useState('');
  const [source, setSource] = useState('');
  const [requestId, setRequestId] = useState('');
  const [hasStack, setHasStack] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [creating, setCreating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [clearError, setClearError] = useState('');
  const [clearSuccess, setClearSuccess] = useState('');
  const [clearMode, setClearMode] = useState<ClearMode>('filters');
  const [clearConfirm, setClearConfirm] = useState('');
  const [olderThanDays, setOlderThanDays] = useState('30');
  const [createForm, setCreateForm] = useState<CreateLogForm>(defaultCreateForm);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search.trim()) params.set('search', search.trim());
      if (level !== 'all') params.set('level', level);
      if (eventType.trim()) params.set('event_type', eventType.trim());
      if (source.trim()) params.set('source', source.trim());
      if (requestId.trim()) params.set('request_id', requestId.trim());
      if (hasStack !== 'all') params.set('has_stack', hasStack);
      if (fromDate) params.set('from', new Date(fromDate).toISOString());
      if (toDate) params.set('to', new Date(toDate).toISOString());

      const [summaryRes, listRes] = await Promise.all([
        fetchWithCsrf('/api/pd/admin/system-logs/summary', { credentials: 'include' }),
        fetchWithCsrf(`/api/pd/admin/system-logs?${params.toString()}`, { credentials: 'include' }),
      ]);

      if (!summaryRes.ok) throw new Error(await getErrorMessage(summaryRes, 'Failed to load log summary'));
      if (!listRes.ok) throw new Error(await getErrorMessage(listRes, 'Failed to load server logs'));

      const summaryData = await summaryRes.json();
      const listData = await listRes.json();
      setSummary(normalizeSummary(summaryData.summary));
      setEntries(listData.data || []);
      setTotalPages(Math.max(1, listData.meta?.total_pages || 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load server logs');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [eventType, fromDate, hasStack, level, page, requestId, search, source, toDate]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const cards = useMemo(() => [
    { label: 'Total logs', value: summary.total, icon: Activity, tone: 'from-slate-950 to-slate-700 text-white' },
    { label: 'Errors', value: summary.errors, icon: ServerCrash, tone: 'from-red-500 to-rose-600 text-white' },
    { label: 'Warnings', value: summary.warnings, icon: AlertTriangle, tone: 'from-amber-400 to-orange-500 text-white' },
    { label: 'Fatal', value: summary.fatal, icon: FileWarning, tone: 'from-rose-950 to-black text-white' },
    { label: 'Last hour', value: summary.last_hour ?? 0, icon: Clock, tone: 'from-[#B91C1C] to-amber-500 text-white' },
    { label: 'Manual logs', value: summary.manual_logs ?? 0, icon: ShieldAlert, tone: 'from-amber-500 to-red-600 text-white' },
  ], [summary]);

  const resetFilters = () => {
    setSearch('');
    setLevel('all');
    setEventType('');
    setSource('');
    setRequestId('');
    setHasStack('all');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const currentFilters = useMemo(() => {
    const filters: Record<string, string | boolean> = {};
    if (search.trim()) filters.search = search.trim();
    if (level !== 'all') filters.level = level;
    if (eventType.trim()) filters.event_type = eventType.trim();
    if (source.trim()) filters.source = source.trim();
    if (requestId.trim()) filters.request_id = requestId.trim();
    if (hasStack !== 'all') filters.has_stack = hasStack === 'true';
    if (fromDate) filters.from = new Date(fromDate).toISOString();
    if (toDate) filters.to = new Date(toDate).toISOString();
    return filters;
  }, [eventType, fromDate, hasStack, level, requestId, search, source, toDate]);

  const hasActiveFilters = Object.keys(currentFilters).length > 0;

  const updateCreateField = (field: keyof CreateLogForm, value: string) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
    setCreateError('');
    setCreateSuccess('');
  };

  const createLog = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    let metadata: Record<string, unknown> | undefined;
    if (createForm.metadata.trim()) {
      try {
        const parsed = JSON.parse(createForm.metadata) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Metadata must be a JSON object');
        }
        metadata = parsed as Record<string, unknown>;
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : 'Metadata JSON is invalid');
        return;
      }
    }

    const statusCode = createForm.status_code.trim() ? Number(createForm.status_code) : null;
    if (statusCode !== null && (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599)) {
      setCreateError('Status code must be between 100 and 599');
      return;
    }

    setCreating(true);
    try {
      const res = await fetchWithCsrf('/api/pd/admin/system-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          level: createForm.level,
          source: createForm.source.trim() || 'admin',
          event_type: createForm.event_type.trim() || 'admin_manual_log',
          message: createForm.message.trim(),
          path: createForm.path.trim() || undefined,
          status_code: statusCode,
          error_name: createForm.error_name.trim() || undefined,
          error_code: createForm.error_code.trim() || undefined,
          stack: createForm.stack.trim() || undefined,
          metadata,
        }),
      });

      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to create log entry'));
      setCreateForm(defaultCreateForm);
      setCreateSuccess('Log entry created successfully');
      setPage(1);
      await fetchLogs();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create log entry');
    } finally {
      setCreating(false);
    }
  };

  const clearLogs = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClearError('');
    setClearSuccess('');

    if (clearConfirm !== 'CLEAR LOGS') {
      setClearError('Type CLEAR LOGS to confirm.');
      return;
    }
    if (clearMode === 'filters' && !hasActiveFilters) {
      setClearError('Apply at least one filter first, or choose Clear all logs.');
      return;
    }

    const days = Number(olderThanDays);
    if (clearMode === 'older' && (!Number.isInteger(days) || days < 1 || days > 3650)) {
      setClearError('Older-than days must be between 1 and 3650.');
      return;
    }

    setClearing(true);
    try {
      const body =
        clearMode === 'filters'
          ? { confirm: clearConfirm, filters: currentFilters }
          : clearMode === 'older'
            ? { confirm: clearConfirm, older_than_days: days }
            : { confirm: clearConfirm, clear_all: true };

      const res = await fetchWithCsrf('/api/pd/admin/system-logs/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to clear logs'));
      const data = await res.json();
      setClearConfirm('');
      setClearSuccess(`${data.deleted ?? 0} log entries cleared.`);
      setPage(1);
      await fetchLogs();
    } catch (err) {
      setClearError(err instanceof Error ? err.message : 'Failed to clear logs');
    } finally {
      setClearing(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!window.confirm('Delete this log entry? This cannot be undone.')) return;
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/system-logs/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to delete log entry'));
      await fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete log entry');
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-6 text-white shadow-2xl shadow-slate-900/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-amber-100">
              <ServerCrash className="h-4 w-4" />
              Backend observability
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Server Logs</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Track runtime errors, request IDs, operational events, manual admin notes, metadata, and stack traces.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowClear((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:bg-white/15"
            >
              {showClear ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              {showClear ? 'Close cleanup' : 'Clear logs'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-red-950/20 transition hover:bg-red-400"
            >
              {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showCreate ? 'Close creator' : 'Create log'}
            </button>
            <button
              type="button"
              onClick={() => void fetchLogs()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-lg shadow-black/10"
            >
              <RotateCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-3xl bg-gradient-to-br p-5 shadow-xl shadow-slate-900/5 ${card.tone}`}>
            <card.icon className="h-5 w-5 opacity-80" />
            <p className="mt-4 text-3xl font-black">{card.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide opacity-80">{card.label}</p>
          </div>
        ))}
      </div>

      {showCreate && (
        <form onSubmit={createLog} className="rounded-[2rem] border border-red-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">Create operational log</h2>
              <p className="mt-1 text-sm font-semibold text-gray-500">Add an admin note, incident marker, maintenance event, or manually tracked server issue.</p>
            </div>
            <button
              type="submit"
              disabled={creating || createForm.message.trim().length < 3}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-red-600 disabled:opacity-40"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save log
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Level</label>
              <select value={createForm.level} onChange={(event) => updateCreateField('level', event.target.value as SystemLogLevel)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-black text-gray-700 outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10">
                {levelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Source</label>
              <input value={createForm.source} onChange={(event) => updateCreateField('source', event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Event type</label>
              <input value={createForm.event_type} onChange={(event) => updateCreateField('event_type', event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Status code</label>
              <input value={createForm.status_code} onChange={(event) => updateCreateField('status_code', event.target.value)} placeholder="500" inputMode="numeric" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10" />
            </div>
            <div className="lg:col-span-4">
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Message</label>
              <textarea value={createForm.message} onChange={(event) => updateCreateField('message', event.target.value)} rows={3} placeholder="Describe the issue or operational event..." className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10" />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Path</label>
              <input value={createForm.path} onChange={(event) => updateCreateField('path', event.target.value)} placeholder="/api/pd/..." className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Error name</label>
              <input value={createForm.error_name} onChange={(event) => updateCreateField('error_name', event.target.value)} placeholder="PdInternalError" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Error code</label>
              <input value={createForm.error_code} onChange={(event) => updateCreateField('error_code', event.target.value)} placeholder="PD_INTERNAL_ERROR" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10" />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Metadata JSON</label>
              <textarea value={createForm.metadata} onChange={(event) => updateCreateField('metadata', event.target.value)} rows={7} className="font-mono w-full rounded-2xl border border-gray-200 bg-slate-950 px-4 py-3 text-xs text-slate-100 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10" />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Stack trace</label>
              <textarea value={createForm.stack} onChange={(event) => updateCreateField('stack', event.target.value)} rows={7} placeholder="Optional stack trace or diagnostic text" className="font-mono w-full rounded-2xl border border-gray-200 bg-slate-950 px-4 py-3 text-xs text-amber-100 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10" />
            </div>
          </div>

          {createError && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{createError}</div>}
          {createSuccess && <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{createSuccess}</div>}
        </form>
      )}

      {showClear && (
        <form onSubmit={clearLogs} className="rounded-[2rem] border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-red-950">Clear server logs</h2>
              <p className="mt-1 max-w-3xl text-sm font-semibold text-red-800">
                Cleanup is permanent. Use filtered cleanup for targeted deletion, old-log pruning for retention, or full clear only when you intentionally want to wipe the table.
              </p>
            </div>
            <button
              type="submit"
              disabled={clearing || clearConfirm !== 'CLEAR LOGS'}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-40"
            >
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Clear
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr_240px]">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-red-400">Mode</label>
              <select value={clearMode} onChange={(event) => setClearMode(event.target.value as ClearMode)} className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-950 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10">
                <option value="filters">Clear current filters</option>
                <option value="older">Prune old logs</option>
                <option value="all">Clear all logs</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-red-400">Scope</label>
              {clearMode === 'filters' ? (
                <div className="rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-bold text-red-900">
                  {hasActiveFilters ? `${Object.keys(currentFilters).length} active filter(s) will be applied.` : 'No filters active. Add filters above before clearing filtered logs.'}
                </div>
              ) : clearMode === 'older' ? (
                <input value={olderThanDays} onChange={(event) => setOlderThanDays(event.target.value)} inputMode="numeric" className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-950 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10" />
              ) : (
                <div className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-700">
                  All log entries will be deleted.
                </div>
              )}
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-red-400">Type CLEAR LOGS</label>
              <input value={clearConfirm} onChange={(event) => setClearConfirm(event.target.value)} placeholder="CLEAR LOGS" className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-950 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10" />
            </div>
          </div>

          {clearError && <div className="mt-4 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-700">{clearError}</div>}
          {clearSuccess && <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{clearSuccess}</div>}
        </form>
      )}

      <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm font-black text-gray-700"><Filter className="h-4 w-4" /> Filters</div>
          <button type="button" onClick={resetFilters} className="rounded-full border border-gray-200 px-3 py-1 text-xs font-black text-gray-500 transition hover:bg-gray-50">Reset</button>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Search logs</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Request ID, message, path, source, user, error code..." className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10" />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Level</label>
            <select value={level} onChange={(event) => { setLevel(event.target.value); setPage(1); }} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-black text-gray-700 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10">
              <option value="all">All levels</option>
              {levelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Has stack</label>
            <select value={hasStack} onChange={(event) => { setHasStack(event.target.value); setPage(1); }} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-black text-gray-700 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10">
              <option value="all">All</option>
              <option value="true">With stack</option>
              <option value="false">No stack</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Event type</label>
            <input value={eventType} onChange={(event) => { setEventType(event.target.value); setPage(1); }} placeholder="server_error" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Source</label>
            <input value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }} placeholder="backend" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Request ID</label>
            <input value={requestId} onChange={(event) => { setRequestId(event.target.value); setPage(1); }} placeholder="request id" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">From</label>
              <input type="datetime-local" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs font-bold text-gray-700 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">To</label>
              <input type="datetime-local" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs font-bold text-gray-700 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10" />
            </div>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-500"><ServerCrash className="mx-auto mb-3 h-12 w-12 text-gray-300" /><p className="font-bold">No server logs found.</p></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((entry) => (
              <details key={entry.id} className="group p-5 open:bg-slate-50">
                <summary className="flex cursor-pointer list-none flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${levelStyles[entry.level]}`}>{entry.level}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">{entry.event_type}</span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-[#7F1D1D] ring-1 ring-amber-100">{entry.source}</span>
                      {entry.status_code && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-100">HTTP {entry.status_code}</span>}
                      {entry.request_id && <span className="font-mono text-xs font-bold text-gray-400">req:{entry.request_id}</span>}
                    </div>
                    <h2 className="mt-3 truncate text-base font-black text-gray-900">{entry.message}</h2>
                    <p className="mt-1 truncate font-mono text-xs text-gray-500">{[entry.method, entry.path].filter(Boolean).join(' ') || '-'}</p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-xs font-bold text-gray-500">{formatDate(entry.created_at)}</p>
                    <p className="mt-1 text-xs font-semibold text-gray-400">{entry.ip || 'No IP'}</p>
                  </div>
                </summary>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-400">Request context</p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-4"><dt className="font-bold text-gray-500">ID</dt><dd className="font-mono text-xs text-gray-800">{entry.id}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="font-bold text-gray-500">User</dt><dd className="font-mono text-xs text-gray-800">{entry.user_id || '-'} {entry.user_role ? `(${entry.user_role})` : ''}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="font-bold text-gray-500">Error</dt><dd className="text-gray-800">{entry.error_name || '-'} {entry.error_code ? `· ${entry.error_code}` : ''}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="font-bold text-gray-500">User agent</dt><dd className="max-w-[320px] truncate text-gray-800">{entry.user_agent || '-'}</dd></div>
                    </dl>
                    <button
                      type="button"
                      onClick={() => void deleteEntry(entry.id)}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete this log
                    </button>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-400">Metadata</p>
                    <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{formatMetadata(entry.metadata)}</pre>
                  </div>
                  {entry.stack && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 lg:col-span-2">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-400">Stack trace</p>
                      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs leading-5 text-amber-100">{entry.stack}</pre>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-[2rem] border border-gray-100 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Previous</button>
        <span className="text-center text-sm font-bold text-gray-500">Page {page} / {totalPages}</span>
        <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-40">Next<ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
