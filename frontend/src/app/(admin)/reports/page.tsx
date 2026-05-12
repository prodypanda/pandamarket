'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Loader2,
  RotateCcw,
  Search,
  ShieldAlert,
  Store,
  User,
  UserX,
  XCircle,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';

type ReportStatus = 'open' | 'investigating' | 'awaiting_buyer' | 'awaiting_seller' | 'resolved' | 'dismissed';
type ReportTargetType = 'seller' | 'buyer';
type ReportSource = 'buyer' | 'admin';
type ReportPriority = 'low' | 'medium' | 'high' | 'critical';

interface Report {
  id: string;
  reporter_id: string;
  reporter_email?: string | null;
  reporter_role?: string | null;
  source: ReportSource;
  target_type: ReportTargetType;
  target_user_id: string | null;
  target_user_email?: string | null;
  target_user_role?: string | null;
  target_user_is_active?: boolean | null;
  store_id: string | null;
  store_name?: string | null;
  store_subdomain?: string | null;
  store_status?: string | null;
  order_id: string | null;
  category: string;
  priority: ReportPriority;
  reason: string;
  evidence_urls?: string[] | null;
  status: ReportStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolver_email?: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface ReportSummary {
  total: number;
  open: number;
  investigating: number;
  resolved: number;
  dismissed: number;
  seller_reports: number;
  buyer_reports: number;
  high_priority: number;
}

interface ReportTarget {
  id: string;
  label: string;
  email: string | null;
  secondary: string | null;
  status: string | null;
}

const defaultSummary: ReportSummary = {
  total: 0,
  open: 0,
  investigating: 0,
  resolved: 0,
  dismissed: 0,
  seller_reports: 0,
  buyer_reports: 0,
  high_priority: 0,
};

const statusColors: Record<ReportStatus, string> = {
  open: 'bg-red-50 text-red-700 ring-red-100',
  investigating: 'bg-yellow-50 text-yellow-700 ring-yellow-100',
  awaiting_buyer: 'bg-blue-50 text-blue-700 ring-blue-100',
  awaiting_seller: 'bg-purple-50 text-purple-700 ring-purple-100',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  dismissed: 'bg-gray-100 text-gray-600 ring-gray-200',
};

const priorityColors: Record<ReportPriority, string> = {
  low: 'bg-gray-100 text-gray-600 ring-gray-200',
  medium: 'bg-blue-50 text-blue-700 ring-blue-100',
  high: 'bg-orange-50 text-orange-700 ring-orange-100',
  critical: 'bg-red-600 text-white ring-red-600',
};

const statusIcons = {
  open: AlertTriangle,
  investigating: Flag,
  awaiting_buyer: Clock,
  awaiting_seller: ShieldAlert,
  resolved: CheckCircle,
  dismissed: XCircle,
};

const reportStatuses: ReportStatus[] = ['open', 'investigating', 'awaiting_buyer', 'awaiting_seller', 'resolved', 'dismissed'];

async function getErrorMessage(res: Response, fallback = 'Request failed') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

export default function AdminReportsPage() {
  const { t, locale, dir } = useLocale();
  const [reports, setReports] = useState<Report[]>([]);
  const [summary, setSummary] = useState<ReportSummary>(defaultSummary);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [targetFilter, setTargetFilter] = useState<'all' | ReportTargetType>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | ReportSource>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | ReportPriority>('all');
  const [search, setSearch] = useState('');
  const [statusDrafts, setStatusDrafts] = useState<Record<string, ReportStatus>>({});
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [targetType, setTargetType] = useState<ReportTargetType>('seller');
  const [targetSearch, setTargetSearch] = useState('');
  const [targets, setTargets] = useState<ReportTarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [createPriority, setCreatePriority] = useState<ReportPriority>('medium');
  const [createCategory, setCreateCategory] = useState('platform_review');
  const [createOrderId, setCreateOrderId] = useState('');
  const [createReason, setCreateReason] = useState('');
  const [createNotes, setCreateNotes] = useState('');

  const showFeedback = useCallback((message: string, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess(null);
    } else {
      setSuccess(message);
      setError(null);
    }
    window.setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3500);
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (targetFilter !== 'all') params.set('target_type', targetFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetchWithCsrf(`/api/pd/admin/reports?${params.toString()}`);
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to load reports'));
      const data = await res.json();
      const nextReports = data.data || [];
      setReports(nextReports);
      setSummary(data.meta?.summary || defaultSummary);
      setTotal(data.meta?.total || 0);
      setTotalPages(data.meta?.total_pages || 1);
      setStatusDrafts(Object.fromEntries(nextReports.map((report: Report) => [report.id, report.status])));
      setNotesDrafts(Object.fromEntries(nextReports.map((report: Report) => [report.id, report.admin_notes || ''])));
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Failed to load reports', true);
    } finally {
      setLoading(false);
    }
  }, [page, priorityFilter, search, showFeedback, sourceFilter, statusFilter, targetFilter]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    async function fetchTargets() {
      const params = new URLSearchParams({ type: targetType, limit: '20' });
      if (targetSearch.trim()) params.set('search', targetSearch.trim());
      const res = await fetchWithCsrf(`/api/pd/admin/reports/targets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTargets(data.data || []);
      }
    }
    if (showCreate) void fetchTargets();
  }, [showCreate, targetSearch, targetType]);

  const metricCards = useMemo(() => [
    { label: t('admin.reportsPage.metrics.total'), value: summary.total, icon: Flag, tone: 'from-slate-900 to-slate-700 text-white' },
    { label: t('admin.reportsPage.metrics.open'), value: summary.open, icon: AlertTriangle, tone: 'from-red-500 to-rose-600 text-white' },
    { label: t('admin.reportsPage.metrics.investigating'), value: summary.investigating, icon: Clock, tone: 'from-yellow-400 to-orange-500 text-white' },
    { label: t('admin.reportsPage.metrics.highPriority'), value: summary.high_priority, icon: ShieldAlert, tone: 'from-purple-600 to-indigo-700 text-white' },
    { label: t('admin.reportsPage.metrics.sellers'), value: summary.seller_reports, icon: Store, tone: 'from-emerald-500 to-teal-600 text-white' },
    { label: t('admin.reportsPage.metrics.buyers'), value: summary.buyer_reports, icon: User, tone: 'from-blue-500 to-cyan-600 text-white' },
  ], [summary, t]);

  const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString(locale) : t('sellerCard.notProvided'));

  async function updateStatus(reportId: string) {
    const status = statusDrafts[reportId];
    if (!status) return;
    setActiveAction(`${reportId}-status`);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/reports/${reportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: notesDrafts[reportId] || undefined }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to update report status'));
      showFeedback(t('admin.reportsPage.statusUpdated'));
      await fetchReports();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Failed to update report status', true);
    } finally {
      setActiveAction(null);
    }
  }

  async function suspendStore(storeId: string) {
    setActiveAction(`${storeId}-suspend`);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/vendors/${storeId}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Suspended after report review' }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to suspend store'));
      showFeedback(t('admin.reportsPage.storeSuspended'));
      await fetchReports();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Failed to suspend store', true);
    } finally {
      setActiveAction(null);
    }
  }

  async function suspendBuyer(userId: string, reportId: string) {
    setActiveAction(`${userId}-suspend-buyer`);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/buyers/${userId}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `Suspended after report review ${reportId}` }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to suspend buyer'));
      showFeedback(t('admin.reportsPage.buyerSuspended'));
      await fetchReports();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Failed to suspend buyer', true);
    } finally {
      setActiveAction(null);
    }
  }

  async function reactivateBuyer(userId: string) {
    setActiveAction(`${userId}-reactivate-buyer`);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/buyers/${userId}/reactivate`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to reactivate buyer'));
      showFeedback(t('admin.reportsPage.buyerReactivated'));
      await fetchReports();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Failed to reactivate buyer', true);
    } finally {
      setActiveAction(null);
    }
  }

  async function createAdminReport() {
    setActiveAction('create-report');
    try {
      const body = {
        target_type: targetType,
        store_id: targetType === 'seller' ? selectedTargetId : undefined,
        target_user_id: targetType === 'buyer' ? selectedTargetId : undefined,
        order_id: createOrderId || undefined,
        category: createCategory || undefined,
        priority: createPriority,
        reason: createReason,
        admin_notes: createNotes || undefined,
      };
      const res = await fetchWithCsrf('/api/pd/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to create report'));
      setShowCreate(false);
      setSelectedTargetId('');
      setCreateReason('');
      setCreateNotes('');
      setCreateOrderId('');
      showFeedback(t('admin.reportsPage.reportCreated'));
      await fetchReports();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Failed to create report', true);
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-6 text-white shadow-2xl shadow-slate-900/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-red-100">
              <Flag className="h-4 w-4" />
              {t('admin.sidebar.reports')}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">{t('admin.reportsPage.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t('admin.reportsPage.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((current) => !current)}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-red-50"
          >
            {showCreate ? t('admin.reportsPage.closeCreate') : t('admin.reportsPage.createReport')}
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error || success}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {metricCards.map((card) => (
          <div key={card.label} className={`rounded-3xl bg-gradient-to-br p-5 shadow-xl shadow-slate-900/5 ${card.tone}`}>
            <card.icon className="h-5 w-5 opacity-80" />
            <p className="mt-4 text-3xl font-black">{card.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide opacity-80">{card.label}</p>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">{t('admin.reportsPage.targetType')}</label>
              <select
                value={targetType}
                onChange={(event) => {
                  setTargetType(event.target.value as ReportTargetType);
                  setSelectedTargetId('');
                }}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]"
              >
                <option value="seller">{t('admin.reportsPage.targetTypes.seller')}</option>
                <option value="buyer">{t('admin.reportsPage.targetTypes.buyer')}</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">{t('admin.reportsPage.targetSearch')}</label>
              <input
                value={targetSearch}
                onChange={(event) => setTargetSearch(event.target.value)}
                placeholder={t('admin.reportsPage.targetSearchPlaceholder')}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">{t('admin.reportsPage.target')}</label>
              <select
                value={selectedTargetId}
                onChange={(event) => setSelectedTargetId(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]"
              >
                <option value="">{t('admin.reportsPage.selectTarget')}</option>
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>{target.label} {target.email ? `(${target.email})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">{t('admin.reportsPage.priority')}</label>
              <select
                value={createPriority}
                onChange={(event) => setCreatePriority(event.target.value as ReportPriority)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]"
              >
                {(['low', 'medium', 'high', 'critical'] as ReportPriority[]).map((priority) => (
                  <option key={priority} value={priority}>{t(`admin.reportsPage.priorities.${priority}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">{t('admin.reportsPage.category')}</label>
              <input
                value={createCategory}
                onChange={(event) => setCreateCategory(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">{t('admin.reportsPage.orderId')}</label>
              <input
                value={createOrderId}
                onChange={(event) => setCreateOrderId(event.target.value)}
                placeholder={t('admin.reportsPage.optional')}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]"
              />
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <textarea
              value={createReason}
              onChange={(event) => setCreateReason(event.target.value)}
              placeholder={t('admin.reportsPage.reasonPlaceholder')}
              rows={4}
              className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]"
            />
            <textarea
              value={createNotes}
              onChange={(event) => setCreateNotes(event.target.value)}
              placeholder={t('admin.reportsPage.notesPlaceholder')}
              rows={4}
              className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]"
            />
          </div>
          <button
            type="button"
            onClick={createAdminReport}
            disabled={activeAction === 'create-report' || !selectedTargetId || createReason.trim().length < 10}
            className="mt-4 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {activeAction === 'create-report' ? t('admin.reportsPage.creating') : t('admin.reportsPage.submitReport')}
          </button>
        </div>
      )}

      <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t('admin.reportsPage.searchPlaceholder')}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-semibold text-gray-800 outline-none focus:border-[#16C784]"
            />
          </div>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'all' | ReportStatus); setPage(1); }} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]">
            <option value="all">{t('admin.reportsPage.allStatuses')}</option>
            {reportStatuses.map((status) => <option key={status} value={status}>{t(`admin.reportsPage.statuses.${status}`)}</option>)}
          </select>
          <select value={targetFilter} onChange={(event) => { setTargetFilter(event.target.value as 'all' | ReportTargetType); setPage(1); }} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]">
            <option value="all">{t('admin.reportsPage.allTargets')}</option>
            <option value="seller">{t('admin.reportsPage.targetTypes.seller')}</option>
            <option value="buyer">{t('admin.reportsPage.targetTypes.buyer')}</option>
          </select>
          <select value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value as 'all' | ReportSource); setPage(1); }} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]">
            <option value="all">{t('admin.reportsPage.allSources')}</option>
            <option value="buyer">{t('admin.reportsPage.sources.buyer')}</option>
            <option value="admin">{t('admin.reportsPage.sources.admin')}</option>
          </select>
          <select value={priorityFilter} onChange={(event) => { setPriorityFilter(event.target.value as 'all' | ReportPriority); setPage(1); }} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]">
            <option value="all">{t('admin.reportsPage.allPriorities')}</option>
            {(['low', 'medium', 'high', 'critical'] as ReportPriority[]).map((priority) => <option key={priority} value={priority}>{t(`admin.reportsPage.priorities.${priority}`)}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-[2rem] border border-gray-100 bg-white py-16 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-[2rem] border border-gray-100 bg-white p-12 text-center shadow-sm">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-[#16C784]" />
            <h3 className="text-lg font-black text-gray-900">{t('admin.reportsPage.noReports')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('admin.reportsPage.noReportsDesc')}</p>
          </div>
        ) : reports.map((report) => {
          const StatusIcon = statusIcons[report.status];
          const targetName = report.target_type === 'seller'
            ? report.store_name || report.store_id || t('admin.reportsPage.unknownTarget')
            : report.target_user_email || report.target_user_id || t('admin.reportsPage.unknownTarget');
          return (
            <div key={report.id} className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
              <div className="grid gap-0 xl:grid-cols-[1.35fr_0.85fr]">
                <div className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-gray-900">{targetName}</h2>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ring-1 ${statusColors[report.status]}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {t(`admin.reportsPage.statuses.${report.status}`)}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${priorityColors[report.priority]}`}>
                          {t(`admin.reportsPage.priorities.${report.priority}`)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-gray-500">
                        {t('admin.reportsPage.reportedBy')} {report.reporter_email || report.reporter_id} · {formatDate(report.created_at)}
                        {report.order_id && ` · ${t('admin.reportsPage.order')} #${report.order_id.slice(-8).toUpperCase()}`}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">{t(`admin.reportsPage.targetTypes.${report.target_type}`)}</span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">{t(`admin.reportsPage.sources.${report.source}`)}</span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">{report.category}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report.store_subdomain && (
                        <Link href={`/store/${encodeURIComponent(report.store_subdomain)}`} className="rounded-2xl border border-gray-200 px-4 py-2 text-xs font-black text-gray-600 hover:text-[#16C784]">
                          {t('admin.reportsPage.openStore')}
                        </Link>
                      )}
                      <Link href={`/reports/${report.id}`} className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-700">
                        {t('admin.reportsPage.openCase')}
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm font-semibold leading-6 text-gray-700">{report.reason}</p>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">{t('admin.reportsPage.adminNotes')}</label>
                    <textarea
                      value={notesDrafts[report.id] || ''}
                      onChange={(event) => setNotesDrafts((current) => ({ ...current, [report.id]: event.target.value }))}
                      rows={3}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 bg-slate-50 p-5 xl:border-l xl:border-t-0">
                  <div className="space-y-3">
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">{t('admin.reportsPage.status')}</label>
                      <select
                        value={statusDrafts[report.id] || report.status}
                        onChange={(event) => setStatusDrafts((current) => ({ ...current, [report.id]: event.target.value as ReportStatus }))}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-[#16C784]"
                      >
                        {reportStatuses.map((status) => (
                          <option key={status} value={status}>{t(`admin.reportsPage.statuses.${status}`)}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateStatus(report.id)}
                      disabled={activeAction === `${report.id}-status`}
                      className="w-full rounded-2xl bg-[#16C784] px-4 py-3 text-sm font-black text-white transition hover:bg-[#14b576] disabled:opacity-60"
                    >
                      {activeAction === `${report.id}-status` ? t('admin.reportsPage.updating') : t('admin.reportsPage.updateStatus')}
                    </button>
                    {report.target_type === 'seller' && report.store_id && report.store_status !== 'suspended' && (
                      <button
                        type="button"
                        onClick={() => suspendStore(report.store_id!)}
                        disabled={activeAction === `${report.store_id}-suspend`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        <Ban className="h-4 w-4" />
                        {t('admin.reportsPage.suspendSeller')}
                      </button>
                    )}
                    {report.target_type === 'buyer' && report.target_user_id && report.target_user_is_active !== false && (
                      <button
                        type="button"
                        onClick={() => suspendBuyer(report.target_user_id!, report.id)}
                        disabled={activeAction === `${report.target_user_id}-suspend-buyer`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        <UserX className="h-4 w-4" />
                        {t('admin.reportsPage.suspendBuyer')}
                      </button>
                    )}
                    {report.target_type === 'buyer' && report.target_user_id && report.target_user_is_active === false && (
                      <button
                        type="button"
                        onClick={() => reactivateBuyer(report.target_user_id!)}
                        disabled={activeAction === `${report.target_user_id}-reactivate-buyer`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-black text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-60"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {t('admin.reportsPage.reactivateBuyer')}
                      </button>
                    )}
                    <div className="rounded-2xl bg-white p-4 text-xs font-semibold text-gray-500">
                      <p>{t('admin.reportsPage.reportId')}: <span className="font-mono text-gray-700">{report.id}</span></p>
                      {report.resolved_at && <p className="mt-2">{t('admin.reportsPage.resolvedAt')}: {formatDate(report.resolved_at)}</p>}
                      {report.resolver_email && <p className="mt-2">{t('admin.reportsPage.resolvedBy')}: {report.resolver_email}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-[2rem] border border-gray-100 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
          {t('admin.reportsPage.previous')}
        </button>
        <span className="text-center text-sm font-bold text-gray-500">
          {t('admin.reportsPage.pageOf', { page, totalPages })} · {total} {t('admin.reportsPage.total')}
        </span>
        <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-40">
          {t('admin.reportsPage.next')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
