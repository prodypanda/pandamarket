'use client';

import { fetchWithCsrf } from '@/lib/api';
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

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; border: string; icon: typeof AlertTriangle }> = {
  open: { label: 'Open', color: 'bg-red-50 text-red-700 ring-red-100', border: 'border-red-100', icon: AlertTriangle },
  investigating: { label: 'Investigating', color: 'bg-yellow-50 text-yellow-700 ring-yellow-100', border: 'border-yellow-100', icon: Clock },
  awaiting_buyer: { label: 'Awaiting buyer', color: 'bg-blue-50 text-blue-700 ring-blue-100', border: 'border-blue-100', icon: MessageSquare },
  awaiting_seller: { label: 'Action required', color: 'bg-purple-50 text-purple-700 ring-purple-100', border: 'border-purple-100', icon: ShieldAlert },
  resolved: { label: 'Resolved', color: 'bg-green-50 text-green-700 ring-green-100', border: 'border-green-100', icon: CheckCircle },
  dismissed: { label: 'Dismissed', color: 'bg-gray-100 text-gray-600 ring-gray-200', border: 'border-gray-100', icon: XCircle },
};

const PRIORITY_CONFIG: Record<ReportPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', color: 'bg-blue-50 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-50 text-orange-700' },
  critical: { label: 'Critical', color: 'bg-red-50 text-red-700' },
};

export default function VendorReportsPage() {
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
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to load reports'));
      const data = await res.json();
      setReports(data.data || []);
      setMeta(data.meta || { page, limit: 10, total: 0, total_pages: 1 });
    } catch (err) {
      setReports([]);
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [filter, getErrorMessage, page]);

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

  function formatDate(value?: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function reportRef(report: Report) {
    return `#${report.id.slice(-8).toUpperCase()}`;
  }

  function priorityConfig(priority?: ReportPriority | null) {
    return PRIORITY_CONFIG[priority || 'medium'] || PRIORITY_CONFIG.medium;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-[#16C784] p-6 text-white shadow-xl shadow-slate-950/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white/80">
              <ShieldAlert className="h-3.5 w-3.5" />
              Case management
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Reports & Disputes</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/75">
              Track reports filed against your store, review marketplace notes, and respond with evidence from each case.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchReports()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:-translate-y-0.5 hover:bg-white/90 disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Total cases', value: summary?.total ?? meta.total, icon: AlertTriangle, tone: 'text-slate-700 bg-slate-50' },
          { label: 'Open', value: summary?.open ?? reports.filter((report) => report.status === 'open').length, icon: AlertTriangle, tone: 'text-red-700 bg-red-50' },
          { label: 'Investigating', value: summary?.investigating ?? reports.filter((report) => report.status === 'investigating').length, icon: Clock, tone: 'text-yellow-700 bg-yellow-50' },
          { label: 'High priority', value: summary?.high_priority ?? reports.filter((report) => ['high', 'critical'].includes(report.priority || '')).length, icon: ShieldAlert, tone: 'text-orange-700 bg-orange-50' },
          { label: 'Action required', value: actionRequiredCount, icon: MessageSquare, tone: 'text-purple-700 bg-purple-50' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className={`mb-4 inline-flex rounded-2xl p-3 ${item.tone}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{item.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-gray-400">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        {statusOptions.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => selectFilter(status)}
            className={`rounded-full px-4 py-2 text-sm font-black transition-colors ${
              filter === status
                ? 'bg-[#16C784] text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {status === 'all' ? 'All cases' : STATUS_CONFIG[status].label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Reports List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-6">
              <div className="h-5 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-[#16C784]" />
          <h3 className="mb-2 text-lg font-bold text-gray-900">No reports</h3>
          <p className="text-sm text-gray-500">
            {filter === 'all'
              ? 'Your store has no reports filed against it. Keep up the great work!'
              : `No ${filter} reports found.`}
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
                className={`rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${config.border}`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${config.color}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {config.label}
                      </span>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${priority.color}`}>
                        {priority.label}
                      </span>
                      {report.category && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600">{report.category}</span>}
                      <span className="font-mono text-xs font-bold text-gray-400">{reportRef(report)}</span>
                      {report.order_id && (
                        <span className="font-mono text-xs font-bold text-gray-400">
                          Order #{report.order_id.slice(-8).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <h2 className="line-clamp-1 text-lg font-black text-gray-900">
                      {report.reason}
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-bold text-gray-400">
                      <span>Filed {formatDate(report.created_at)}</span>
                      {report.reporter_email && <span>Buyer {report.reporter_email}</span>}
                      {report.updated_at && <span>Updated {formatDate(report.updated_at)}</span>}
                      {report.resolved_at && <span>Resolved {formatDate(report.resolved_at)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-black text-gray-600 hover:border-[#16C784] hover:text-[#16C784]"
                    >
                      <Eye className="h-4 w-4" />
                      Quick view
                    </button>
                    <Link
                      href={`/hub/dashboard/reports/${report.id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-[#16C784] px-4 py-2 text-sm font-black text-white hover:bg-[#14b876]"
                    >
                      Open case
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {report.admin_notes && (
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="mb-1 text-xs font-black uppercase tracking-wide text-blue-700">Admin response</p>
                    <p className="line-clamp-3 text-sm leading-6 text-blue-800">{report.admin_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && reports.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-gray-500">
            Showing page {meta.page || page} of {Math.max(1, meta.total_pages || 1)} · {meta.total || reports.length} total case{(meta.total || reports.length) !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-black text-gray-600 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(meta.total_pages || 1, current + 1))}
              disabled={page >= (meta.total_pages || 1)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-black text-gray-600 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Report Details</h3>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="text-xl text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Report ID</p>
                <p className="text-sm text-gray-900 font-mono">{selectedReport.id}</p>
              </div>

              {selectedReport.category && (
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">Category</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedReport.category}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ring-1 ${STATUS_CONFIG[selectedReport.status].color}`}>
                  {STATUS_CONFIG[selectedReport.status].label}
                </span>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">Priority</p>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${priorityConfig(selectedReport.priority).color}`}>
                  {priorityConfig(selectedReport.priority).label}
                </span>
              </div>

              {selectedReport.order_id && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Related Order</p>
                  <p className="text-sm text-gray-900 font-mono">{selectedReport.order_id}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Reason</p>
                <p className="text-sm text-gray-700">{selectedReport.reason}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Filed On</p>
                <p className="text-sm text-gray-900">
                  {new Date(selectedReport.created_at).toLocaleString('fr-TN')}
                </p>
              </div>

              {selectedReport.admin_notes && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-medium text-blue-700 mb-1">Admin Notes</p>
                  <p className="text-sm text-blue-800">{selectedReport.admin_notes}</p>
                </div>
              )}

              {selectedReport.resolved_at && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Resolved On</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedReport.resolved_at).toLocaleString('fr-TN')}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/hub/dashboard/reports/${selectedReport.id}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#16C784] px-4 py-2.5 text-sm font-black text-white hover:bg-[#14b876]"
              >
                Open full case
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
