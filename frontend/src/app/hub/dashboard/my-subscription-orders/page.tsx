'use client';

import { fetchWithCsrf } from '@/lib/api';
import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReceiptText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload,
  Printer,
  X,
  CreditCard,
  Crown,
  FileText,
  Building,
  Loader2,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface UserStore {
  id: string;
  name: string;
  subdomain?: string | null;
}

interface SubscriptionOrder {
  id: string;
  store_id: string;
  user_id: string;
  from_plan: string;
  target_plan: string;
  amount: number | string;
  currency: string;
  gateway: string;
  gateway_reference?: string | null;
  checkout_url?: string | null;
  status: 'pending' | 'pending_proof' | 'pending_review' | 'captured' | 'paid' | 'failed' | 'cancelled' | 'rejected';
  proof_url?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  store_name?: string | null;
  store_subdomain?: string | null;
}

interface SummaryStats {
  total_spent_tnd: number;
  paid_count: number;
  pending_count: number;
}

interface OrdersResponse {
  orders: SubscriptionOrder[];
  user_stores?: UserStore[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  summary: SummaryStats;
}

function buildGatewayNames(t: (key: string, params?: Record<string, string | number>) => string): Record<string, string> {
  return {
    flouci: t('dashboardPages.mySubscriptionOrders.gatewayFlouci'),
    konnect: t('dashboardPages.mySubscriptionOrders.gatewayKonnect'),
    paypal: t('dashboardPages.mySubscriptionOrders.gatewayPaypal'),
    manual_mandat: t('dashboardPages.mySubscriptionOrders.gatewayManualMandat'),
    cod: t('dashboardPages.mySubscriptionOrders.gatewayCod'),
  };
}

function buildStatusBadges(t: (key: string, params?: Record<string, string | number>) => string): Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> {
  return {
    captured: { label: t('dashboardPages.mySubscriptionOrders.statusCaptured'), bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50', text: 'text-emerald-700 dark:text-emerald-300', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    paid: { label: t('dashboardPages.mySubscriptionOrders.statusPaid'), bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50', text: 'text-emerald-700 dark:text-emerald-300', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    pending_review: { label: t('dashboardPages.mySubscriptionOrders.statusPendingReview'), bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50', text: 'text-amber-700 dark:text-amber-300', icon: <Clock className="w-3.5 h-3.5" /> },
    pending_proof: { label: t('dashboardPages.mySubscriptionOrders.statusPendingProof'), bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/50', text: 'text-orange-700 dark:text-orange-300', icon: <Clock className="w-3.5 h-3.5" /> },
    pending: { label: t('dashboardPages.mySubscriptionOrders.statusPending'), bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300', icon: <Clock className="w-3.5 h-3.5" /> },
    failed: { label: t('dashboardPages.mySubscriptionOrders.statusFailed'), bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50', text: 'text-rose-700 dark:text-rose-400', icon: <XCircle className="w-3.5 h-3.5" /> },
    rejected: { label: t('dashboardPages.mySubscriptionOrders.statusRejected'), bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50', text: 'text-rose-700 dark:text-rose-400', icon: <XCircle className="w-3.5 h-3.5" /> },
    cancelled: { label: t('dashboardPages.mySubscriptionOrders.statusCancelled'), bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', text: 'text-slate-500 dark:text-slate-400', icon: <XCircle className="w-3.5 h-3.5" /> },
  };
}

export default function SubscriptionOrdersPage() {
  const { t, locale, dir } = useLocale();
  const localeCode = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
  const GATEWAY_NAMES = buildGatewayNames(t);
  const STATUS_BADGES = buildStatusBadges(t);
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [userStores, setUserStores] = useState<UserStore[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({ total_spent_tnd: 0, paid_count: 0, pending_count: 0 });
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [statusFilter, setStatusFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectingStoreId, setSelectingStoreId] = useState<string | null>(null);

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionOrder | null>(null);
  const [uploadModalOrder, setUploadModalOrder] = useState<SubscriptionOrder | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cancelOrderTargetId, setCancelOrderTargetId] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        store_id: storeFilter,
        search: searchQuery.trim(),
      });
      const res = await fetchWithCsrf(`/api/pd/subscriptions/orders?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(t('dashboardPages.mySubscriptionOrders.errorLoadingOrders'));
      const data: OrdersResponse = await res.json();
      setOrders(data.orders || []);
      if (data.user_stores) setUserStores(data.user_stores);
      setTotalPages(data.meta?.total_pages || 1);
      setTotalRecords(data.meta?.total || 0);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.mySubscriptionOrders.errorNetwork'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, storeFilter, searchQuery, t]);

  const handleSelectStore = async (storeId: string) => {
    setSelectingStoreId(storeId);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ store_id: storeId }),
      });
      if (res.ok) {
        window.location.href = '/hub/dashboard';
      }
    } catch {
      setSelectingStoreId(null);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleCancelOrder = (orderId: string) => {
    setCancelOrderTargetId(orderId);
  };

  const confirmCancelOrder = async () => {
    if (!cancelOrderTargetId) return;
    setCancellingOrder(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithCsrf('/api/pd/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ intent_id: cancelOrderTargetId }),
      });
      if (res.ok) {
        setSuccess(t('dashboardPages.mySubscriptionOrders.intentCancelled'));
        setCancelOrderTargetId(null);
        await loadOrders();
      } else {
        const data = await res.json();
        setError(data.error?.message || t('dashboardPages.mySubscriptionOrders.errorCancelling'));
      }
    } catch {
      setError(t('dashboardPages.mySubscriptionOrders.errorNetworkCancelling'));
    } finally {
      setCancellingOrder(false);
    }
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    const contentType = file.type || 'image/jpeg';
    const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        filename: file.name,
        content_type: contentType,
        purpose: 'mandat_proof',
        file_size: file.size,
      }),
    });
    if (!presignRes.ok) {
      const errData = await presignRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || t('dashboardPages.mySubscriptionOrders.errorPreparingUpload'));
    }
    const presignData = await presignRes.json();
    const uploadRes = await fetch(presignData.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
    if (!uploadRes.ok) throw new Error(t('dashboardPages.mySubscriptionOrders.errorUploadingProof'));
    return presignData.public_url || presignData.file_key;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleUploadProof = async () => {
    if (!uploadModalOrder) return;
    setError('');
    setSuccess('');
    setUploading(true);

    try {
      let finalUrl = proofUrl;
      if (proofFile) {
        finalUrl = await handleFileUpload(proofFile);
      }

      if (!finalUrl) {
        setError(t('dashboardPages.mySubscriptionOrders.errorNoFileOrUrl'));
        setUploading(false);
        return;
      }

      const res = await fetchWithCsrf('/api/pd/subscriptions/upload-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          intent_id: uploadModalOrder.id,
          proof_url: finalUrl,
        }),
      });

      if (res.ok) {
        setSuccess(t('dashboardPages.mySubscriptionOrders.proofSubmitted'));
        setUploadModalOrder(null);
        setProofFile(null);
        setProofUrl('');
        await loadOrders();
      } else {
        const data = await res.json();
        setError(data.error?.message || t('dashboardPages.mySubscriptionOrders.errorSubmittingProof'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.mySubscriptionOrders.errorNetwork'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div dir={dir} className="space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300 self-start">
            <ReceiptText className="h-4 w-4" />
            {t('dashboardPages.mySubscriptionOrders.headerBadge')}
          </div>
          <Link
            href="/hub/dashboard/subscription"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2 text-xs font-semibold text-white transition shadow-2xs self-start sm:self-auto"
          >
            <Crown className="h-4 w-4 text-amber-400" />
            {t('dashboardPages.mySubscriptionOrders.changeOrUpgradePlan')}
          </Link>
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl text-slate-900 dark:text-white">{t('dashboardPages.mySubscriptionOrders.pageTitle')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {t('dashboardPages.mySubscriptionOrders.pageSubtitle')}
        </p>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-xl">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{t('dashboardPages.mySubscriptionOrders.kpiTotalSpentLabel')}</span>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{summary.total_spent_tnd.toFixed(2)} TND</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{summary.paid_count} {t('dashboardPages.mySubscriptionOrders.kpiTotalSpentSub')}</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{t('dashboardPages.mySubscriptionOrders.kpiPendingLabel')}</span>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{summary.pending_count}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('dashboardPages.mySubscriptionOrders.kpiPendingSub')}</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{t('dashboardPages.mySubscriptionOrders.kpiManageLabel')}</span>
          <Link
            href="/hub/dashboard/subscription"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white hover:underline"
          >
            <span>{t('dashboardPages.mySubscriptionOrders.kpiManageLink')}</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('dashboardPages.mySubscriptionOrders.kpiManageSub')}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500 ml-2" />
          {[
            { id: 'all', label: t('dashboardPages.mySubscriptionOrders.filterAll') },
            { id: 'captured', label: t('dashboardPages.mySubscriptionOrders.filterPaid') },
            { id: 'pending_review', label: t('dashboardPages.mySubscriptionOrders.filterPendingReview') },
            { id: 'pending_proof', label: t('dashboardPages.mySubscriptionOrders.filterPendingProof') },
            { id: 'cancelled', label: t('dashboardPages.mySubscriptionOrders.filterCancelled') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {/* Store Filter Selector */}
          {userStores.length > 0 && (
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200 dark:border-slate-700">
              <Building className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <select
                value={storeFilter}
                onChange={(e) => {
                  setStoreFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-slate-900 dark:focus:border-white"
              >
                <option value="all" className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">{t('dashboardPages.mySubscriptionOrders.allStoresOption', { count: userStores.length })}</option>
                {userStores.map((st) => (
                  <option key={st.id} value={st.id} className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">
                    {st.name} {st.subdomain ? `(${st.subdomain})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder={t('dashboardPages.mySubscriptionOrders.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
          />
        </div>
      </div>

      {/* Main Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-slate-500 dark:text-slate-400" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('dashboardPages.mySubscriptionOrders.loadingOrders')}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center">
            <ReceiptText className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('dashboardPages.mySubscriptionOrders.noOrdersTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              {t('dashboardPages.mySubscriptionOrders.noOrdersDesc')}
            </p>
            <Link
              href="/hub/dashboard/subscription"
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 text-xs font-semibold text-white shadow-2xs transition"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              {t('dashboardPages.mySubscriptionOrders.discoverPlans')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">{t('dashboardPages.mySubscriptionOrders.colOrderNumber')}</th>
                  <th className="px-6 py-4">{t('dashboardPages.mySubscriptionOrders.colStore')}</th>
                  <th className="px-6 py-4">{t('dashboardPages.mySubscriptionOrders.colPlan')}</th>
                  <th className="px-6 py-4">{t('dashboardPages.mySubscriptionOrders.colAmount')}</th>
                  <th className="px-6 py-4">{t('dashboardPages.mySubscriptionOrders.colPaymentMethod')}</th>
                  <th className="px-6 py-4">{t('dashboardPages.mySubscriptionOrders.colDate')}</th>
                  <th className="px-6 py-4">{t('dashboardPages.mySubscriptionOrders.colStatus')}</th>
                  <th className="px-6 py-4 text-right">{t('dashboardPages.mySubscriptionOrders.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {orders.map((ord) => {
                  const badge = STATUS_BADGES[ord.status] || STATUS_BADGES.pending;
                  const isPaid = ord.status === 'captured' || ord.status === 'paid';
                  const isPendingProof = ord.status === 'pending_proof' || ord.status === 'pending';

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                        #{ord.id.slice(-10)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleSelectStore(ord.store_id)}
                            disabled={selectingStoreId === ord.store_id}
                            className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-300 text-left transition group"
                            title={t('dashboardPages.mySubscriptionOrders.switchStoreTitle')}
                          >
                            <Building className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
                            <span>{ord.store_name || t('dashboardPages.mySubscriptionOrders.defaultStoreName')}</span>
                            {selectingStoreId === ord.store_id && <Loader2 className="w-3 h-3 animate-spin text-slate-500 dark:text-slate-400" />}
                          </button>
                          {ord.store_subdomain && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                              {ord.store_subdomain}.garbage.team
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-slate-900 dark:text-white uppercase">
                          {ord.target_plan}
                        </span>
                        {ord.from_plan && (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                            ({t('dashboardPages.mySubscriptionOrders.fromPlan', { plan: ord.from_plan })})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white">
                        {Number(ord.amount).toFixed(2)} {ord.currency || 'TND'}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {GATEWAY_NAMES[ord.gateway] || ord.gateway}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {new Date(ord.created_at).toLocaleDateString(localeCode, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text}`}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isPaid && (
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(ord)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs transition"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            <span>{t('dashboardPages.mySubscriptionOrders.invoiceAction')}</span>
                          </button>
                        )}

                        {isPendingProof && (
                          <button
                            type="button"
                            onClick={() => setUploadModalOrder(ord)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-600 font-semibold text-white shadow-2xs transition"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{t('dashboardPages.mySubscriptionOrders.receiptAction')}</span>
                          </button>
                        )}

                        {(ord.status === 'pending' || ord.status === 'pending_proof') && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(ord.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          >
                            <span>{t('dashboardPages.mySubscriptionOrders.cancelAction')}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-850/50">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              {t('dashboardPages.mySubscriptionOrders.paginationInfo', { page, total: totalPages, records: totalRecords })}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{t('dashboardPages.mySubscriptionOrders.previous')}</span>
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition"
              >
                <span>{t('dashboardPages.mySubscriptionOrders.next')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-2xl space-y-6 my-8 print:p-0 print:shadow-none print:border-none">
            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white">{t('dashboardPages.mySubscriptionOrders.invoicePlatform')}</span>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{t('dashboardPages.mySubscriptionOrders.invoiceTitle')}</h2>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">{t('dashboardPages.mySubscriptionOrders.invoiceRef', { ref: selectedInvoice.id.slice(-8).toUpperCase() })}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-900/50 rounded-full text-xs">
                  {t('dashboardPages.mySubscriptionOrders.invoicePaidBadge')}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {t('dashboardPages.mySubscriptionOrders.invoiceDateLabel')}: {new Date(selectedInvoice.created_at).toLocaleDateString(localeCode)}
                </p>
              </div>
            </div>

            {/* Billed To / Company Details */}
            <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div>
                <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">{t('dashboardPages.mySubscriptionOrders.invoiceProviderLabel')}</span>
                <p className="font-bold text-slate-900 dark:text-white">{t('dashboardPages.mySubscriptionOrders.invoiceProviderName')}</p>
                <p className="text-slate-600 dark:text-slate-300">{t('dashboardPages.mySubscriptionOrders.invoiceProviderDesc')}</p>
                <p className="text-slate-600 dark:text-slate-300">{t('dashboardPages.mySubscriptionOrders.invoiceProviderMf')}</p>
                <p className="text-slate-600 dark:text-slate-300">{t('dashboardPages.mySubscriptionOrders.invoiceProviderLocation')}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">{t('dashboardPages.mySubscriptionOrders.invoiceBeneficiaryLabel')}</span>
                <p className="font-bold text-slate-900 dark:text-white">{t('dashboardPages.mySubscriptionOrders.invoiceStoreNumber', { ref: selectedInvoice.store_id.slice(-8) })}</p>
                <p className="text-slate-600 dark:text-slate-300">{t('dashboardPages.mySubscriptionOrders.invoiceSubscriptionPlan', { plan: selectedInvoice.target_plan.toUpperCase() })}</p>
                <p className="text-slate-600 dark:text-slate-300">{t('dashboardPages.mySubscriptionOrders.invoicePaymentVia', { gateway: GATEWAY_NAMES[selectedInvoice.gateway] || selectedInvoice.gateway })}</p>
              </div>
            </div>

            {/* Invoice Line Items */}
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="p-3">{t('dashboardPages.mySubscriptionOrders.invoiceColDescription')}</th>
                    <th className="p-3">{t('dashboardPages.mySubscriptionOrders.invoiceColPeriod')}</th>
                    <th className="p-3 text-right">{t('dashboardPages.mySubscriptionOrders.invoiceColAmount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  <tr>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {t('dashboardPages.mySubscriptionOrders.invoiceLineItem', { plan: selectedInvoice.target_plan.toUpperCase() })}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {t('dashboardPages.mySubscriptionOrders.invoiceLineItemDesc')}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{t('dashboardPages.mySubscriptionOrders.invoicePeriod')}</td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                      {Number(selectedInvoice.amount).toFixed(2)} TND
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Invoice Totals */}
            <div className="flex justify-between items-center pt-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p>{t('dashboardPages.mySubscriptionOrders.invoiceTaxNote')}</p>
                <p>{t('dashboardPages.mySubscriptionOrders.invoiceAutoGenerated')}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase block">{t('dashboardPages.mySubscriptionOrders.invoiceTotalNet')}</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{Number(selectedInvoice.amount).toFixed(2)} TND</span>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                {t('dashboardPages.mySubscriptionOrders.close')}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium text-xs shadow-2xs transition"
              >
                <Printer className="w-4 h-4" />
                {t('dashboardPages.mySubscriptionOrders.printInvoice')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Proof Modal */}
      {uploadModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboardPages.mySubscriptionOrders.uploadProofTitle')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('dashboardPages.mySubscriptionOrders.uploadProofSubtitle', { ref: uploadModalOrder.id.slice(-8), plan: uploadModalOrder.target_plan.toUpperCase() })}</p>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <Building className="w-4 h-4 text-amber-700 dark:text-amber-400" /> {t('dashboardPages.mySubscriptionOrders.mandatBankTitle')}
                </p>
                <p>{t('dashboardPages.mySubscriptionOrders.mandatRibLabel')}: <strong>10 000 0000000000000 00</strong> ({t('dashboardPages.mySubscriptionOrders.invoiceProviderName')})</p>
                <p>{t('dashboardPages.mySubscriptionOrders.mandatUploadHint')}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">{t('dashboardPages.mySubscriptionOrders.fileLabel')}</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 dark:file:bg-white file:text-white dark:file:text-slate-900 hover:file:bg-slate-800 dark:hover:file:bg-slate-100 cursor-pointer transition"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">{t('dashboardPages.mySubscriptionOrders.orUrlLabel')}</label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUploadModalOrder(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                {t('dashboardPages.mySubscriptionOrders.cancelAction')}
              </button>
              <button
                type="button"
                onClick={handleUploadProof}
                disabled={uploading}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium rounded-xl text-xs shadow-2xs transition disabled:opacity-50"
              >
                {uploading ? t('dashboardPages.mySubscriptionOrders.transmitting') : t('dashboardPages.mySubscriptionOrders.submitReceipt')}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelOrderTargetId && (
        <ConfirmDialog
          isOpen={!!cancelOrderTargetId}
          onClose={() => {
            if (!cancellingOrder) setCancelOrderTargetId(null);
          }}
          onConfirm={confirmCancelOrder}
          title={t('dashboardPages.mySubscriptionOrders.cancelOrderTitle') || "Annuler la commande d'abonnement"}
          description={t('dashboardPages.mySubscriptionOrders.confirmCancelIntent') || "Êtes-vous sûr de vouloir annuler cette intention de paiement ?"}
          confirmLabel={t('dashboardPages.mySubscriptionOrders.cancelOrderButton') || "Annuler la commande"}
          cancelLabel={t('dashboardPages.common.cancel') || "Fermer"}
          variant="danger"
          loading={cancellingOrder}
          dir={dir}
        />
      )}
    </div>
  );
}
