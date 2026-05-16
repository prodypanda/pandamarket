'use client';

import { fetchWithCsrf } from '@/lib/api';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Database,
  Download,
  Eye,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Terminal,
  Trash2,
  Users,
  X,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  method: string | null;
  status_code: number | null;
  duration_ms: number | null;
  path: string | null;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface AuditSummary {
  total: number;
  last_24h: number;
  failed: number;
  actors: number;
  writes: number;
}

interface CounterRow {
  action?: string;
  resource_type?: string | null;
  count: string | number;
}

const defaultSummary: AuditSummary = {
  total: 0,
  last_24h: 0,
  failed: 0,
  actors: 0,
  writes: 0,
};

const methodOptions = ['all', 'POST', 'PUT', 'PATCH', 'DELETE'];
const actorRoleOptions = ['all', 'vendor'];
const skeletonWidths = ['70%', '55%', '82%', '64%', '48%', '60%', '44%'];

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.error?.message || data.message || fallback;
  } catch {
    return fallback;
  }
}

function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeSummary(value: Partial<Record<keyof AuditSummary, string | number>> | undefined): AuditSummary {
  return {
    total: toNumber(value?.total),
    last_24h: toNumber(value?.last_24h),
    failed: toNumber(value?.failed),
    actors: toNumber(value?.actors),
    writes: toNumber(value?.writes),
  };
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

function compactId(value: string | null) {
  if (!value) return '-';
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

function actionTone(entry: AuditEntry) {
  const action = entry.action.toLowerCase();
  if ((entry.status_code ?? 0) >= 400) return 'bg-red-50 text-red-700 ring-red-100';
  if (action.includes('approve') || action.includes('unsuspend')) return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (action.includes('reject') || action.includes('suspend') || action.includes('delete')) return 'bg-red-50 text-red-700 ring-red-100';
  if (action.includes('patch') || action.includes('put') || action.includes('update')) return 'bg-amber-50 text-amber-700 ring-amber-100';
  if (action.includes('post') || action.includes('create')) return 'bg-amber-50 text-[#7F1D1D] ring-amber-100';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function methodTone(method: string | null) {
  switch (method) {
    case 'DELETE':
      return 'bg-red-950 text-white';
    case 'PATCH':
    case 'PUT':
      return 'bg-amber-100 text-amber-800';
    case 'POST':
      return 'bg-amber-100 text-[#7F1D1D]';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function statusTone(status: number | null) {
  if (!status) return 'bg-slate-100 text-slate-500';
  if (status >= 500) return 'bg-rose-950 text-white';
  if (status >= 400) return 'bg-red-100 text-red-700';
  if (status >= 300) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export default function SellerAuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [summary, setSummary] = useState<AuditSummary>(defaultSummary);
  const [actions, setActions] = useState<CounterRow[]>([]);
  const [resources, setResources] = useState<CounterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceType, setResourceType] = useState('');
  const [actorRole, setActorRole] = useState('all');
  const [method, setMethod] = useState('all');
  const [statusCode, setStatusCode] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeDays, setPurgeDays] = useState(30);
  const [isPurging, setIsPurging] = useState(false);

  const applyFiltersToParams = useCallback((params: URLSearchParams) => {
    if (search.trim()) params.set('search', search.trim());
    if (actionFilter !== 'all') params.set('action', actionFilter);
    if (resourceType.trim()) params.set('resource_type', resourceType.trim());
    if (actorRole !== 'all') params.set('actor_role', actorRole);
    if (method !== 'all') params.set('method', method);
    if (statusCode.trim()) params.set('status_code', statusCode.trim());
    if (fromDate) params.set('from', new Date(fromDate).toISOString());
    if (toDate) params.set('to', new Date(toDate).toISOString());
  }, [actionFilter, actorRole, fromDate, method, resourceType, search, statusCode, toDate]);

  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const listParams = new URLSearchParams({ page: String(page), limit: '25', log_type: 'seller' });
      const summaryParams = new URLSearchParams({ log_type: 'seller' });
      applyFiltersToParams(listParams);
      applyFiltersToParams(summaryParams);

      const summaryQuery = summaryParams.toString();
      const [summaryRes, listRes] = await Promise.all([
        fetchWithCsrf(`/api/pd/admin/audit-log/summary${summaryQuery ? `?${summaryQuery}` : ''}`, { credentials: 'include' }),
        fetchWithCsrf(`/api/pd/admin/audit-log?${listParams.toString()}`, { credentials: 'include' }),
      ]);

      if (!summaryRes.ok) throw new Error(await getErrorMessage(summaryRes, 'Failed to load audit summary'));
      if (!listRes.ok) throw new Error(await getErrorMessage(listRes, 'Failed to load audit log'));

      const summaryData = await summaryRes.json();
      const listData = await listRes.json();
      setSummary(normalizeSummary(summaryData.summary));
      setActions(summaryData.actions || []);
      setResources(summaryData.resources || []);
      setEntries(listData.data || []);
      setTotalPages(Math.max(1, listData.meta?.total_pages || listData.meta?.totalPages || 1));
      setTotal(toNumber(listData.meta?.total));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
      setEntries([]);
      setSummary(defaultSummary);
      setActions([]);
      setResources([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [applyFiltersToParams, page]);

  useEffect(() => {
    void fetchAuditLog();
  }, [fetchAuditLog]);

  const handleExport = async () => {
    setIsExporting(true);
    setError('');
    try {
      const params = new URLSearchParams({ log_type: 'seller' });
      applyFiltersToParams(params);
      const query = params.toString();
      
      const res = await fetchWithCsrf(`/api/pd/admin/audit-log/export${query ? `?${query}` : ''}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to export audit log'));
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export audit log');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePurge = async () => {
    setIsPurging(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/audit-log/purge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ older_than_days: purgeDays, log_type: 'seller' }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to purge audit log'));
      
      await res.json();
      setShowPurgeModal(false);
      void fetchAuditLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purge audit log');
    } finally {
      setIsPurging(false);
    }
  };

  const actionOptions = useMemo(() => {
    const dynamicActions = actions.map((row) => row.action || '').filter(Boolean);
    return uniqueOptions([
      actionFilter !== 'all' ? actionFilter : '',
      ...dynamicActions,
      ...entries.map((entry) => entry.action),
    ]);
  }, [actionFilter, actions, entries]);

  const cards = useMemo(() => [
    { label: 'Total events', value: summary.total, icon: Shield, tone: 'from-slate-950 to-slate-700 text-white' },
    { label: 'Last 24h', value: summary.last_24h, icon: Clock, tone: 'from-[#B91C1C] to-amber-500 text-white' },
    { label: 'Failed actions', value: summary.failed, icon: AlertTriangle, tone: 'from-red-500 to-rose-600 text-white' },
    { label: 'Active actors', value: summary.actors, icon: Users, tone: 'from-amber-500 to-red-600 text-white' },
    { label: 'Write actions', value: summary.writes, icon: Activity, tone: 'from-[#7F1D1D] to-[#B91C1C] text-white' },
  ], [summary]);

  const hasActiveFilters = Boolean(search || actionFilter !== 'all' || resourceType || actorRole !== 'all' || method !== 'all' || statusCode || fromDate || toDate);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setActionFilter('all');
    setResourceType('');
    setActorRole('all');
    setMethod('all');
    setStatusCode('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const copyValue = async (value: string | null | undefined) => {
    if (!value) return;
    await navigator.clipboard?.writeText(value);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-8 text-white shadow-2xl shadow-slate-900/20">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.22),transparent_65%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-100">
              <Shield className="h-3.5 w-3.5" />
              Compliance center
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">Seller Audit Log</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Review every vendor action, product update, store configuration, and order status change.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPurgeModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900/50 px-4 py-3 text-sm font-black text-white shadow-lg shadow-black/20 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Purge
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={isExporting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900/50 px-4 py-3 text-sm font-black text-white shadow-lg shadow-black/20 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => void fetchAuditLog()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-[1.5rem] bg-gradient-to-br ${card.tone} p-5 shadow-lg shadow-slate-900/10`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">{card.label}</p>
                <p className="mt-2 text-3xl font-black">{card.value.toLocaleString()}</p>
              </div>
              <card.icon className="h-9 w-9 opacity-70" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form onSubmit={handleSearchSubmit} className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-black text-gray-900">
            <Filter className="h-4 w-4 text-[#B91C1C]" />
            Filters and investigation scope
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search actor, action, resource, IP, metadata..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-900 outline-none transition focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(event) => { setActionFilter(event.target.value); setPage(1); }}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10 lg:col-span-2"
          >
            <option value="all">All actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Resource type"
            value={resourceType}
            onChange={(event) => { setResourceType(event.target.value); setPage(1); }}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10 lg:col-span-2"
          />
          <select
            value={method}
            onChange={(event) => { setMethod(event.target.value); setPage(1); }}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10 lg:col-span-2"
          >
            {methodOptions.map((option) => (
              <option key={option} value={option}>{option === 'all' ? 'All methods' : option}</option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-900/15 transition hover:-translate-y-0.5 hover:bg-[#991B1B] lg:col-span-2"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
          <select
            value={actorRole}
            onChange={(event) => { setActorRole(event.target.value); setPage(1); }}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10 lg:col-span-2"
          >
            {actorRoleOptions.map((option) => (
              <option key={option} value={option}>{option === 'all' ? 'All actor roles' : option}</option>
            ))}
          </select>
          <input
            type="number"
            min="100"
            max="599"
            placeholder="HTTP status"
            value={statusCode}
            onChange={(event) => { setStatusCode(event.target.value); setPage(1); }}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10 lg:col-span-2"
          />
          <input
            type="datetime-local"
            value={fromDate}
            onChange={(event) => { setFromDate(event.target.value); setPage(1); }}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10 lg:col-span-2"
          />
          <input
            type="datetime-local"
            value={toDate}
            onChange={(event) => { setToDate(event.target.value); setPage(1); }}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10 lg:col-span-2"
          />
        </div>
      </form>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Table */}
        <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-xl shadow-slate-900/5">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">Events</h2>
              <p className="text-xs font-medium text-gray-500">{total.toLocaleString()} matching entries</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">
              <Database className="h-3.5 w-3.5" />
              Append-only audit trail
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">Actor</th>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">Resource</th>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">IP</th>
                  <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-wider text-gray-500">Inspect</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-gray-50">
                      {skeletonWidths.map((width, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-5">
                          <div className="h-4 animate-pulse rounded-full bg-gray-100" style={{ width }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                        <Shield className="h-7 w-7" />
                      </div>
                      <p className="mt-4 text-sm font-black text-gray-700">No audit log entries found</p>
                      <p className="mt-1 text-xs text-gray-500">Try changing filters or search scope.</p>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 transition-colors hover:bg-emerald-50/30">
                      <td className="whitespace-nowrap px-6 py-4">
                        <p className="text-xs font-bold text-gray-700">{formatDate(entry.created_at)}</p>
                        {entry.duration_ms !== null && (
                          <p className="mt-1 text-[11px] font-medium text-gray-400">{entry.duration_ms} ms</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="max-w-[220px] truncate text-sm font-bold text-gray-900">{entry.actor_email || 'Unknown actor'}</p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{entry.actor_role || 'unknown'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${methodTone(entry.method)}`}>
                              {entry.method || 'ACTION'}
                            </span>
                            <span className={`inline-flex max-w-[280px] truncate rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${actionTone(entry)}`}>
                              {entry.action}
                            </span>
                          </div>
                          <p className="max-w-[360px] truncate font-mono text-[11px] text-gray-400">{entry.path || '-'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-black uppercase tracking-wider text-gray-700">{entry.resource_type || 'unknown'}</p>
                        <p className="mt-1 font-mono text-[11px] text-gray-400">{compactId(entry.resource_id)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${statusTone(entry.status_code)}`}>
                          {entry.status_code || 'n/a'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-gray-500">
                        {entry.ip || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(entry)}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-[#B91C1C]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1 || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-white/70 bg-white p-5 shadow-xl shadow-slate-900/5">
            <div className="mb-4 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#B91C1C]" />
              <h3 className="text-sm font-black text-gray-900">Top actions</h3>
            </div>
            <div className="space-y-2">
              {actions.slice(0, 8).map((row) => (
                <button
                  key={row.action}
                  type="button"
                  onClick={() => { setActionFilter(row.action || 'all'); setPage(1); }}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gray-50 px-3 py-2 text-left transition hover:bg-emerald-50"
                >
                  <span className="truncate text-xs font-bold text-gray-700">{row.action || 'unknown'}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-gray-500">{toNumber(row.count)}</span>
                </button>
              ))}
              {!actions.length && <p className="text-xs text-gray-400">No action data.</p>}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/70 bg-white p-5 shadow-xl shadow-slate-900/5">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-[#B91C1C]" />
              <h3 className="text-sm font-black text-gray-900">Top resources</h3>
            </div>
            <div className="space-y-2">
              {resources.slice(0, 8).map((row) => (
                <button
                  key={row.resource_type || 'unknown'}
                  type="button"
                  onClick={() => { setResourceType(row.resource_type || ''); setPage(1); }}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gray-50 px-3 py-2 text-left transition hover:bg-emerald-50"
                >
                  <span className="truncate text-xs font-bold text-gray-700">{row.resource_type || 'unknown'}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-gray-500">{toNumber(row.count)}</span>
                </button>
              ))}
              {!resources.length && <p className="text-xs text-gray-400">No resource data.</p>}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-900">
            <div className="mb-2 flex items-center gap-2 font-black">
              <CheckCircle2 className="h-4 w-4" />
              Audit coverage
            </div>
            <p className="text-xs leading-5">
              State-changing vendor API calls are captured with redacted request bodies, status codes, duration, actor role, IP, and user agent.
            </p>
          </div>
        </aside>
      </div>

      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">Danger Zone</p>
                <h2 className="mt-1 text-xl font-black text-gray-900">Purge old logs</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPurgeModal(false)}
                className="rounded-full bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4 text-sm font-medium text-gray-600">
                Select the retention period. Logs older than this will be permanently deleted. This action cannot be undone.
              </p>
              <select
                value={purgeDays}
                onChange={(e) => setPurgeDays(Number(e.target.value))}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              >
                <option value={30}>Older than 30 days</option>
                <option value={60}>Older than 60 days</option>
                <option value={90}>Older than 90 days</option>
                <option value={180}>Older than 180 days</option>
                <option value={365}>Older than 1 year</option>
              </select>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPurgeModal(false)}
                  className="rounded-full px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handlePurge()}
                  disabled={isPurging}
                  className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-2 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPurging ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Confirm Purge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B91C1C]">Audit event</p>
                <h2 className="mt-1 text-xl font-black text-gray-900">{selectedEntry.action}</h2>
                <p className="mt-1 text-xs font-medium text-gray-500">{formatDate(selectedEntry.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="rounded-full bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-100px)] overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ['Event ID', selectedEntry.id],
                  ['Actor', selectedEntry.actor_email || selectedEntry.actor_id || 'Unknown'],
                  ['Actor role', selectedEntry.actor_role || 'unknown'],
                  ['Method', selectedEntry.method || 'n/a'],
                  ['Status', selectedEntry.status_code ? String(selectedEntry.status_code) : 'n/a'],
                  ['Duration', selectedEntry.duration_ms !== null ? `${selectedEntry.duration_ms} ms` : 'n/a'],
                  ['Resource type', selectedEntry.resource_type || 'unknown'],
                  ['Resource ID', selectedEntry.resource_id || 'n/a'],
                  ['IP address', selectedEntry.ip || 'n/a'],
                  ['User agent', selectedEntry.user_agent || 'n/a'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-gray-50 p-4">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">{label}</p>
                      <button
                        type="button"
                        onClick={() => void copyValue(value)}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-white hover:text-gray-700"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="break-words font-mono text-xs font-semibold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-slate-100">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Request path</p>
                  <button
                    type="button"
                    onClick={() => void copyValue(selectedEntry.path)}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold text-white transition hover:bg-white/20"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
                <p className="break-words font-mono text-xs">{selectedEntry.path || '-'}</p>
              </div>

              <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-950 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Metadata</p>
                  <button
                    type="button"
                    onClick={() => void copyValue(formatMetadata(selectedEntry.metadata))}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold text-white transition hover:bg-white/20"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy JSON
                  </button>
                </div>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-100">
                  {formatMetadata(selectedEntry.metadata)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
