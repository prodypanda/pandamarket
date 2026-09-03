'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle, ChevronLeft, ChevronRight, Clock, Eye, Loader2, MessageSquare, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';

type ReportStatus = 'open' | 'investigating' | 'awaiting_buyer' | 'awaiting_seller' | 'resolved' | 'dismissed';
type ReportPriority = 'low' | 'medium' | 'high' | 'critical';

interface Report {
  id: string;
  store_id: string;
  order_id: string | null;
  reporter_email?: string | null;
  category?: string | null;
  priority?: ReportPriority | null;
  reason: string;
  status: ReportStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at?: string | null;
  resolved_at: string | null;
}

interface ReportSummary {
  total: number;
  open: number;
  investigating: number;
  resolved: number;
  dismissed: number;
  high_priority: number;
}

interface ReportMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  summary?: ReportSummary;
}

const STATUS_CONFIG: Record<ReportStatus, { labelKey: string; color: string; border: string; icon: typeof AlertTriangle }> = {
  open: { labelKey: 'dashboardPages.reports.statusOpen', color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 ring-rose-200 dark:ring-rose-900/60', border: 'border-rose-200/80 dark:border-rose-900/50', icon: AlertTriangle },
  investigating: { labelKey: 'dashboardPages.reports.statusInvestigating', color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-900/60', border: 'border-amber-200/80 dark:border-amber-900/50', icon: Clock },
  awaiting_buyer: { labelKey: 'dashboardPages.reports.statusAwaitingBuyer', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 ring-blue-200 dark:ring-blue-900/60', border: 'border-blue-200/80 dark:border-blue-900/50', icon: MessageSquare },
  awaiting_seller: { labelKey: 'dashboardPages.reports.statusAwaitingSeller', color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 ring-purple-200 dark:ring-purple-900/60', border: 'border-purple-200/80 dark:border-purple-900/50', icon: ShieldAlert },
  resolved: { labelKey: 'dashboardPages.reports.statusResolved', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-900/60', border: 'border-emerald-200/80 dark:border-emerald-900/50', icon: CheckCircle },
  dismissed: { labelKey: 'dashboardPages.reports.statusDismissed', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ring-slate-200 dark:ring-slate-700', border: 'border-slate-200/80 dark:border-slate-800', icon: XCircle },
};

const PRIORITY_CONFIG: Record<ReportPriority, { labelKey: string; color: string }> = {
  low: { labelKey: 'dashboardPages.reports.priorityLow', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
  medium: { labelKey: 'dashboardPages.reports.priorityMedium', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400' },
  high: { labelKey: 'dashboardPages.reports.priorityHigh', color: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400' },
  critical: { labelKey: 'dashboardPages.reports.priorityCritical', color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' },
};

export default function VendorReportsPage() {
  const { t, locale, dir } = useLocale();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<'all' | ReportStatus>('all');
  const [meta, setMeta] = useState<ReportMeta>({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const getErrorMessage = useCallback(async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      return data.error?.message || data.message || `${fallback} (${res.status})`;
    } catch {
      return `${fallback} (${res.status})`;
    }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (filter !== 'all') params.set('status', filter);
      const res = await fetchWithCsrf(`/api/pd/reports/store?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.reports.failedToLoad')));
      const data = await res.json();
      setReports(data.data || []);
      setMeta(data.meta || { page, limit: 10, total: 0, total_pages: 1 });
    } catch (err) {
      setReports([]);
      setError(err instanceof Error ? err.message : t('dashboardPages.reports.networkError'));
    } finally {
      setLoading(false);
    }
  }, [filter, getErrorMessage, page, t]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const summary = meta.summary;
  const actionRequiredCount = reports.filter((report) => report.status === 'awaiting_seller').length;
  const statusOptions = useMemo(() => ['all', ...Object.keys(STATUS_CONFIG)] as Array<'all' | ReportStatus>, []);

  function selectFilter(status: 'all' | ReportStatus) {
    setFilter(status);
    setPage(1);
  }

  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  function formatDate(value?: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function reportRef(report: Report) {
    return `#${report.id.slice(-8).toUpperCase()}`;
  }

  function priorityConfig(priority?: ReportPriority | null) {
    return PRIORITY_CONFIG[priority || 'medium'] || PRIORITY_CONFIG.medium;
  }

  return (
    <div dir={dir} className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              <ShieldAlert className="h-3.5 w-3.5" />
              {t('dashboardPages.reports.badge')}
            </span>
            <h1 className="mt-4 text-2xl font-bold sm:text-3xl text-slate-900 dark:text-white">{t('dashboardPages.reports.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t('dashboardPages.reports.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchReports()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2.5 text-sm font-medium text-white shadow-2xs transition disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t('dashboardPages.reports.refresh')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: t('dashboardPages.reports.statTotalCases'), value: summary?.total ?? meta.total, icon: AlertTriangle, tone: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800' },
          { label: t('dashboardPages.reports.statOpen'), value: summary?.open ?? reports.filter((report) => report.status === 'open').length, icon: AlertTriangle, tone: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40' },
          { label: t('dashboardPages.reports.statInvestigating'), value: summary?.investigating ?? reports.filter((report) => report.status === 'investigating').length, icon: Clock, tone: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40' },
          { label: t('dashboardPages.reports.statHighPriority'), value: summary?.high_priority ?? reports.filter((report) => ['high', 'critical'].includes(report.priority || '')).length, icon: ShieldAlert, tone: 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40' },
          { label: t('dashboardPages.reports.statActionRequired'), value: actionRequiredCount, icon: MessageSquare, tone: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
            <div className={`mb-4 inline-flex rounded-xl p-3 ${item.tone}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs">
        {statusOptions.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => selectFilter(status)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              filter === status
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {status === 'all' ? t('dashboardPages.reports.filterAll') : t(STATUS_CONFIG[status].labelKey)}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm font-medium text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Reports List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded w-1/3 mb-3" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3 mb-2" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-2xs">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{t('dashboardPages.reports.emptyTitle')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filter === 'all'
              ? t('dashboardPages.reports.emptyAll')
              : t('dashboardPages.reports.emptyFiltered', { filter: t(STATUS_CONFIG[filter as ReportStatus].labelKey) })}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const config = STATUS_CONFIG[report.status];
            const StatusIcon = config.icon;
            const priority = priorityConfig(report.priority);
            return (
              <div
                key={report.id}
                className={`rounded-2xl border bg-white dark:bg-slate-900 p-6 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md ${config.border}`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${config.color}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {t(config.labelKey)}
                      </span>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priority.color}`}>
                        {t(priority.labelKey)}
                      </span>
                      {report.category && <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">{report.category}</span>}
                      <span className="font-mono text-xs font-medium text-slate-400 dark:text-slate-500">{reportRef(report)}</span>
                      {report.order_id && (
                        <span className="font-mono text-xs font-medium text-slate-400 dark:text-slate-500">
                          {t('dashboardPages.reports.orderRef', { id: report.order_id.slice(-8).toUpperCase() })}
                        </span>
                      )}
                    </div>
                    <h2 className="line-clamp-1 text-lg font-bold text-slate-900 dark:text-white">
                      {report.reason}
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400 dark:text-slate-500">
                      <span>{t('dashboardPages.reports.filed')} {formatDate(report.created_at)}</span>
                      {report.reporter_email && <span>{t('dashboardPages.reports.buyer')} {report.reporter_email}</span>}
                      {report.updated_at && <span>{t('dashboardPages.reports.updated')} {formatDate(report.updated_at)}</span>}
                      {report.resolved_at && <span>{t('dashboardPages.reports.resolved')} {formatDate(report.resolved_at)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
                    >
                      <Eye className="h-4 w-4" />
                      {t('dashboardPages.reports.quickView')}
                    </button>
                    <Link
                      href={`/hub/dashboard/reports/${report.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2 text-sm font-medium text-white shadow-2xs transition"
                    >
                      {t('dashboardPages.reports.openCase')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {report.admin_notes && (
                  <div className="mt-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/40 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">{t('dashboardPages.reports.adminResponse')}</p>
                    <p className="line-clamp-3 text-sm leading-6 text-blue-800 dark:text-blue-300">{report.admin_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && reports.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t('dashboardPages.reports.paginationSummary', {
              page: meta.page || page,
              total: Math.max(1, meta.total_pages || 1),
              count: meta.total || reports.length,
            })}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('dashboardPages.reports.previous')}
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(meta.total_pages || 1, current + 1))}
              disabled={page >= (meta.total_pages || 1)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
            >
              {t('dashboardPages.reports.next')}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboardPages.reports.detailsTitle')}</h3>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="text-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('dashboardPages.reports.reportId')}</p>
                <p className="text-sm text-slate-900 dark:text-white font-mono">{selectedReport.id}</p>
              </div>

              {selectedReport.category && (
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{t('dashboardPages.reports.category')}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedReport.category}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('dashboardPages.reports.status')}</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STATUS_CONFIG[selectedReport.status].color}`}>
                  {t(STATUS_CONFIG[selectedReport.status].labelKey)}
                </span>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{t('dashboardPages.reports.priority')}</p>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityConfig(selectedReport.priority).color}`}>
                  {t(priorityConfig(selectedReport.priority).labelKey)}
                </span>
              </div>

              {selectedReport.order_id && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('dashboardPages.reports.relatedOrder')}</p>
                  <p className="text-sm text-slate-900 dark:text-white font-mono">{selectedReport.order_id}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('dashboardPages.reports.reason')}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selectedReport.reason}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('dashboardPages.reports.filedOn')}</p>
                <p className="text-sm text-slate-900 dark:text-white">
                  {new Date(selectedReport.created_at).toLocaleString(dateLocale)}
                </p>
              </div>

              {selectedReport.admin_notes && (
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-900/50">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">{t('dashboardPages.reports.adminNotes')}</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{selectedReport.admin_notes}</p>
                </div>
              )}

              {selectedReport.resolved_at && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('dashboardPages.reports.resolvedOn')}</p>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {new Date(selectedReport.resolved_at).toLocaleString(dateLocale)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/hub/dashboard/reports/${selectedReport.id}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2.5 text-sm font-medium text-white shadow-2xs transition"
              >
                {t('dashboardPages.reports.openFullCase')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                {t('dashboardPages.reports.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
