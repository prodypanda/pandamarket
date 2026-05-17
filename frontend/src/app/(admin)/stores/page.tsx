'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  ExternalLink,
  FileCheck,
  Globe,
  KeyRound,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Users,
  WalletCards,
  Maximize2,
  Minimize2,
  XCircle,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import { getSellerTypeLabel, getSellerTypeOptions, isSellerTypeValue, type SellerTypeValue } from '../../../lib/seller-type';

interface SellerTypeChangeRequest {
  requested_type?: string;
  status?: string;
  requested_at?: string;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
}

interface Vendor {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string | null;
  owner_id: string;
  owner_email?: string | null;
  owner_first_name?: string | null;
  owner_last_name?: string | null;
  owner_last_login_at?: string | null;
  owner_is_active?: boolean | null;
  owner_two_factor_enabled?: boolean | null;
  owner_phone?: string | null;
  seller_type?: string | null;
  subscription_plan: string;
  subscription_type?: string | null;
  subscription_expires_at?: string | null;
  payment_config_set?: boolean | null;
  status: string;
  is_verified: boolean;
  product_count?: string | number | null;
  published_product_count?: string | number | null;
  order_count?: string | number | null;
  pending_order_count?: string | number | null;
  captured_revenue?: string | number | null;
  open_report_count?: string | number | null;
  owner_store_count?: string | number | null;
  owner_free_store_count?: string | number | null;
  owner_paid_store_count?: string | number | null;
  kyc_status?: string | null;
  kyc_created_at?: string | null;
  kyc_reviewed_at?: string | null;
  settings?: {
    seller_type_change_request?: SellerTypeChangeRequest;
  } | null;
  created_at: string;
}

interface VendorSummary {
  total: number;
  verified: number;
  unverified: number;
  suspended: number;
  maintenance: number;
  pending_seller_type_requests: number;
  pending_kyc: number;
}

interface SubscriptionPlanOption {
  plan_id: string;
}

const defaultSummary: VendorSummary = {
  total: 0,
  verified: 0,
  unverified: 0,
  suspended: 0,
  maintenance: 0,
  pending_seller_type_requests: 0,
  pending_kyc: 0,
};

const planColors: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700 ring-gray-200',
  starter: 'bg-amber-50 text-[#B91C1C] ring-amber-100',
  regular: 'bg-amber-50 text-[#B91C1C] ring-amber-100',
  agency: 'bg-red-50 text-[#7F1D1D] ring-red-100',
  pro: 'bg-amber-50 text-[#B91C1C] ring-amber-100',
  golden: 'bg-yellow-50 text-yellow-700 ring-yellow-100',
  platinum: 'bg-slate-900 text-white ring-slate-800',
};

const statusColors: Record<string, string> = {
  verified: 'bg-amber-50 text-[#B91C1C] ring-amber-100',
  unverified: 'bg-amber-50 text-amber-700 ring-amber-100',
  maintenance: 'bg-blue-50 text-blue-700 ring-blue-100',
  suspended: 'bg-red-50 text-red-700 ring-red-100',
};

const kycColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-100',
  approved: 'bg-amber-50 text-[#B91C1C] ring-amber-100',
  rejected: 'bg-red-50 text-red-700 ring-red-100',
  missing: 'bg-gray-100 text-gray-600 ring-gray-200',
};

const subscriptionPlans = ['free', 'starter', 'regular', 'agency', 'pro', 'golden', 'platinum'];
const subscriptionTypes = ['commission', 'yearly'];

function toNumber(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

async function getErrorMessage(res: Response, fallback = 'Request failed') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

function AdminStoresContent() {
  const { t, locale, dir } = useLocale();
  const searchParams = useSearchParams();
  const sellerTypeOptions = getSellerTypeOptions(t);
  const isRtl = dir === 'rtl';
  const ownerId = searchParams.get('owner_id') || '';
  const ownerName = searchParams.get('owner') || '';
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [summary, setSummary] = useState<VendorSummary>(defaultSummary);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sellerType, setSellerType] = useState('');
  const [status, setStatus] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [expandedVendorIds, setExpandedVendorIds] = useState<Set<string>>(new Set());
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [confirmSuspend, setConfirmSuspend] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<string | null>(null);
  const [availableSubscriptionPlans, setAvailableSubscriptionPlans] = useState(subscriptionPlans);
  const [subscriptionOverrides, setSubscriptionOverrides] = useState<Record<string, { plan: string; type: string; expiresAt: string }>>({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const showFeedback = useCallback((message: string, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess('');
    } else {
      setSuccess(message);
      setError('');
    }
    window.setTimeout(() => {
      setSuccess('');
      setError('');
    }, 3500);
  }, []);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (search.trim()) params.set('search', search.trim());
      if (sellerType) params.set('seller_type', sellerType);
      if (status) params.set('status', status);
      if (pendingOnly) params.set('pending_seller_type_request', 'true');
      if (ownerId) params.set('owner_id', ownerId);
      const res = await fetchWithCsrf(`/api/pd/admin/vendors?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setVendors(data.data || []);
        setTotalPages(data.meta?.total_pages || 1);
        setTotal(data.meta?.total || 0);
        setSummary(data.meta?.summary || defaultSummary);
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Network error', true);
    } finally {
      setLoading(false);
    }
  }, [ownerId, page, pendingOnly, search, sellerType, showFeedback, status]);

  useEffect(() => {
    void fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    async function fetchSubscriptionPlans() {
      const res = await fetchWithCsrf('/api/pd/admin/plans', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data.data) ? data.data : Array.isArray(data.plans) ? data.plans : [];
      const planIds = rows
        .map((plan: SubscriptionPlanOption) => plan.plan_id)
        .filter((planId: unknown): planId is string => typeof planId === 'string' && planId.length > 0);
      if (planIds.length > 0) setAvailableSubscriptionPlans(planIds);
    }
    void fetchSubscriptionPlans();
  }, []);

  const formatDate = (value?: string | null) => {
    if (!value) return t('sellerCard.notProvided');
    return new Date(value).toLocaleDateString(locale);
  };

  const formatMoney = (value: unknown) => (
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(toNumber(value))
  );

  const getOwnerName = (vendor: Vendor) => {
    const name = `${vendor.owner_first_name || ''} ${vendor.owner_last_name || ''}`.trim();
    return name || vendor.owner_email || t('sellerCard.notProvided');
  };

  const runAction = async (
    actionKey: string,
    endpoint: string,
    opts: { method?: string; body?: unknown; successMessage: string },
  ) => {
    setActiveAction(actionKey);
    try {
      const res = await fetchWithCsrf(endpoint, {
        method: opts.method || 'PUT',
        headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
        credentials: 'include',
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      if (res.ok) {
        showFeedback(opts.successMessage);
        await fetchVendors();
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Network error', true);
    } finally {
      setActiveAction(null);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSellerType('');
    setStatus('');
    setPendingOnly(false);
    setPage(1);
  };

  const startStoreChat = async (vendor: Vendor) => {
    const actionKey = `vendor-${vendor.id}-chat`;
    setActiveAction(actionKey);
    try {
      const res = await fetchWithCsrf('/api/pd/chats/admin/seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ store_id: vendor.id, subject: `Support with ${vendor.name}` }),
      });
      if (!res.ok) {
        showFeedback(await getErrorMessage(res), true);
        return;
      }
      const data = await res.json();
      window.location.href = `/messages?conversation=${encodeURIComponent(data.conversation.id)}`;
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Network error', true);
    } finally {
      setActiveAction(null);
    }
  };

  const toggleVendorDetails = (vendorId: string) => {
    setExpandedVendorIds((current) => {
      const next = new Set(current);
      if (next.has(vendorId)) {
        next.delete(vendorId);
      } else {
        next.add(vendorId);
      }
      return next;
    });
  };

  const getSubscriptionOverride = (vendor: Vendor) => subscriptionOverrides[vendor.id] || {
    plan: vendor.subscription_plan || 'free',
    type: vendor.subscription_type || 'commission',
    expiresAt: vendor.subscription_expires_at ? vendor.subscription_expires_at.slice(0, 10) : '',
  };

  const updateSubscriptionOverride = (vendor: Vendor, patch: Partial<{ plan: string; type: string; expiresAt: string }>) => {
    setSubscriptionOverrides((current) => ({
      ...current,
      [vendor.id]: {
        ...getSubscriptionOverride(vendor),
        ...patch,
      },
    }));
  };

  const metricCards = [
    { label: t('admin.vendorsPage.metrics.total'), value: summary.total, icon: Users, tone: 'from-slate-900 to-slate-700 text-white' },
    { label: t('admin.vendorsPage.metrics.verified'), value: summary.verified, icon: ShieldCheck, tone: 'from-[#7F1D1D] to-[#B91C1C] text-white' },
    { label: t('admin.vendorsPage.metrics.unverified'), value: summary.unverified, icon: Clock3, tone: 'from-amber-400 to-orange-500 text-white' },
    { label: t('admin.vendorsPage.metrics.suspended'), value: summary.suspended, icon: Ban, tone: 'from-red-500 to-rose-600 text-white' },
    { label: t('admin.vendorsPage.metrics.maintenance'), value: summary.maintenance, icon: Store, tone: 'from-blue-500 to-sky-600 text-white' },
    { label: t('admin.vendorsPage.metrics.pendingType'), value: summary.pending_seller_type_requests, icon: AlertTriangle, tone: 'from-amber-500 to-red-600 text-white' },
    { label: t('admin.vendorsPage.metrics.pendingKyc'), value: summary.pending_kyc, icon: FileCheck, tone: 'from-[#B91C1C] to-amber-500 text-white' },
  ];

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={dir}>
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-6 text-white shadow-2xl shadow-slate-900/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-amber-100">
              <Store className="h-4 w-4" />
              Store management
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Stores</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Manage individual stores, seller types, subscriptions, verification, domains, and payment configuration.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/users"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/15"
            >
              <Users className="h-4 w-4" />
              Vendors
            </Link>
            <Link
              href="/stores"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-lg shadow-black/10"
            >
              <Store className="h-4 w-4" />
              Stores
            </Link>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">{t('admin.vendorsPage.filteredTotal')}</p>
              <p className="mt-1 text-3xl font-black">{total}</p>
            </div>
          </div>
        </div>
      </div>

      {(success || error) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
          error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-amber-50 text-emerald-700'
        }`}>
          {error || success}
        </div>
      )}

      {ownerId && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-[#7F1D1D] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing stores for {ownerName || ownerId}
          </span>
          <Link href="/stores" className="inline-flex items-center justify-center rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#B91C1C] ring-1 ring-amber-100 transition hover:bg-amber-100">
            Show all stores
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {metricCards.map((card) => (
          <div key={card.label} className={`rounded-3xl bg-gradient-to-br p-5 shadow-xl shadow-slate-900/5 ${card.tone}`}>
            <card.icon className="h-5 w-5 opacity-80" />
            <p className="mt-4 text-3xl font-black">{card.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide opacity-80">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">
              {t('admin.vendorsPage.search')}
            </label>
            <div className="relative">
              <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-4' : 'left-4'}`} />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={t('admin.vendorsPage.searchPlaceholder')}
                className={`w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/10 ${isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:w-[620px]">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">
                {t('admin.vendorsPage.status')}
              </label>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
              >
                <option value="">{t('admin.vendorsPage.allStatuses')}</option>
                <option value="verified">{t('admin.vendorsPage.statuses.verified')}</option>
                <option value="unverified">{t('admin.vendorsPage.statuses.unverified')}</option>
                <option value="maintenance">{t('admin.vendorsPage.statuses.maintenance')}</option>
                <option value="suspended">{t('admin.vendorsPage.statuses.suspended')}</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">
                {t('admin.vendorsPage.sellerTypeFilter')}
              </label>
              <select
                value={sellerType}
                onChange={(event) => {
                  setSellerType(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
              >
                <option value="">{t('sellerTypes.all')}</option>
                {sellerTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setPendingOnly((current) => !current);
                  setPage(1);
                }}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                  pendingOnly ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t('admin.vendorsPage.pendingRequests')}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
          >
            {t('admin.vendorsPage.clearFilters')}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-gray-900">{t('admin.vendorsPage.listDensity')}</p>
          <p className="text-xs font-semibold text-gray-500">{t('admin.vendorsPage.listDensityDesc')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCompactMode((current) => !current)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black transition ${
              compactMode ? 'bg-slate-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {compactMode ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            {compactMode ? t('admin.vendorsPage.fullView') : t('admin.vendorsPage.compactView')}
          </button>
          {compactMode && (
            <button
              type="button"
              onClick={() => {
                setExpandedVendorIds((current) => (
                  current.size === vendors.length ? new Set() : new Set(vendors.map((vendor) => vendor.id))
                ));
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50"
            >
              {expandedVendorIds.size === vendors.length ? t('admin.vendorsPage.collapseAll') : t('admin.vendorsPage.expandAll')}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-[2rem] border border-gray-100 bg-white py-16 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500">
            <Store className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="font-bold">{t('admin.vendorsPage.noVendors')}</p>
          </div>
        ) : (
          vendors.map((vendor) => {
            const request = vendor.settings?.seller_type_change_request;
            const pendingRequestedType =
              request?.status === 'pending' && isSellerTypeValue(request.requested_type)
                ? request.requested_type
                : null;
            const currentSellerType: SellerTypeValue = isSellerTypeValue(vendor.seller_type) ? vendor.seller_type : 'retailer';
            const storefrontHref = `/store/${encodeURIComponent(vendor.subdomain)}`;
            const planKey = vendor.subscription_plan?.toLowerCase() || 'free';
            const statusKey = vendor.status?.toLowerCase() || 'unverified';
            const kycKey = vendor.kyc_status || 'missing';
            const actionBase = `vendor-${vendor.id}`;
            const showFullVendor = !compactMode || expandedVendorIds.has(vendor.id);
            const subscriptionOverride = getSubscriptionOverride(vendor);

            return (
              <div key={vendor.id} className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm transition hover:shadow-xl hover:shadow-slate-900/5">
                <div className={`grid gap-0 ${showFullVendor ? 'xl:grid-cols-[1.35fr_0.85fr]' : ''}`}>
                  <div className={showFullVendor ? 'p-5 sm:p-6' : 'p-4 sm:p-5'}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7F1D1D] to-[#B91C1C] text-white shadow-lg shadow-red-900/20">
                          <Store className="h-7 w-7" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-black text-gray-900">{vendor.name}</h2>
                            {vendor.is_verified && <BadgeCheck className="h-5 w-5 text-[#B91C1C]" />}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500">
                            <span>{vendor.subdomain}</span>
                            <span>· Store ID: {vendor.id}</span>
                            <span>· Owner ID: {vendor.owner_id}</span>
                            {vendor.custom_domain && <span>· {vendor.custom_domain}</span>}
                            <Link href={storefrontHref} className="inline-flex items-center gap-1 text-[#B91C1C] hover:underline">
                              {t('admin.vendorsPage.openStore')} <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusColors[statusKey] || 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
                              {t(`admin.vendorsPage.statuses.${statusKey}`)}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ring-1 ${planColors[planKey] || 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
                              {vendor.subscription_plan}
                            </span>
                            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700 ring-1 ring-orange-100">
                              {getSellerTypeLabel(vendor.seller_type, t)}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${kycColors[kycKey] || kycColors.missing}`}>
                              {t(`admin.vendorsPage.kyc.${kycKey}`)}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${vendor.owner_two_factor_enabled ? 'bg-amber-50 text-[#7F1D1D] ring-amber-100' : 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                              2FA {vendor.owner_two_factor_enabled ? 'on' : 'off'}
                            </span>
                            {vendor.payment_config_set && (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-[#7F1D1D] ring-1 ring-amber-100">
                                Payments set
                              </span>
                            )}
                            {toNumber(vendor.owner_store_count) > 1 && (
                              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white ring-1 ring-slate-800">
                                {toNumber(vendor.owner_store_count)} stores by owner
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 ${showFullVendor ? 'lg:min-w-[430px]' : 'lg:min-w-[520px]'}`}>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <Package className="h-4 w-4 text-gray-400" />
                          <p className="mt-2 text-lg font-black text-gray-900">{toNumber(vendor.product_count)}</p>
                          <p className="text-[11px] font-bold uppercase text-gray-400">{t('admin.vendorsPage.products')}</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <ShoppingBag className="h-4 w-4 text-gray-400" />
                          <p className="mt-2 text-lg font-black text-gray-900">{toNumber(vendor.order_count)}</p>
                          <p className="text-[11px] font-bold uppercase text-gray-400">{t('admin.vendorsPage.orders')}</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <WalletCards className="h-4 w-4 text-gray-400" />
                          <p className="mt-2 text-sm font-black text-gray-900">{formatMoney(vendor.captured_revenue)}</p>
                          <p className="text-[11px] font-bold uppercase text-gray-400">{t('admin.vendorsPage.revenue')}</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <AlertTriangle className="h-4 w-4 text-gray-400" />
                          <p className="mt-2 text-lg font-black text-gray-900">{toNumber(vendor.open_report_count)}</p>
                          <p className="text-[11px] font-bold uppercase text-gray-400">{t('admin.vendorsPage.reports')}</p>
                        </div>
                      </div>
                    </div>

                    {compactMode && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleVendorDetails(vendor.id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50"
                        >
                          {showFullVendor ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                          {showFullVendor ? t('admin.vendorsPage.hideDetails') : t('admin.vendorsPage.showDetails')}
                        </button>
                        {pendingRequestedType && !showFullVendor && (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                            {t('admin.vendorsPage.pendingSellerTypeShort')}
                          </span>
                        )}
                      </div>
                    )}

                    {showFullVendor && (
                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">{t('admin.vendorsPage.owner')}</p>
                        <p className="mt-2 font-bold text-gray-900">{getOwnerName(vendor)}</p>
                        {vendor.owner_email && (
                          <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-500">
                            <Mail className="h-3.5 w-3.5" />
                            {vendor.owner_email}
                          </p>
                        )}
                        {vendor.owner_phone && (
                          <p className="mt-1 text-xs font-semibold text-gray-500">{vendor.owner_phone}</p>
                        )}
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-xl bg-white px-2 py-2">
                            <p className="text-sm font-black text-gray-900">{toNumber(vendor.owner_store_count)}</p>
                            <p className="text-[10px] font-bold uppercase text-gray-400">Stores</p>
                          </div>
                          <div className="rounded-xl bg-white px-2 py-2">
                            <p className="text-sm font-black text-gray-900">{toNumber(vendor.owner_free_store_count)}</p>
                            <p className="text-[10px] font-bold uppercase text-gray-400">Free</p>
                          </div>
                          <div className="rounded-xl bg-white px-2 py-2">
                            <p className="text-sm font-black text-gray-900">{toNumber(vendor.owner_paid_store_count)}</p>
                            <p className="text-[10px] font-bold uppercase text-gray-400">Paid</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">{t('admin.vendorsPage.activity')}</p>
                        <p className="mt-2 text-sm font-bold text-gray-900">
                          {t('admin.vendorsPage.created')}: {formatDate(vendor.created_at)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          {t('admin.vendorsPage.lastLogin')}: {formatDate(vendor.owner_last_login_at)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">{t('admin.vendorsPage.health')}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                          <span className="rounded-full bg-white px-2.5 py-1 text-gray-600">{toNumber(vendor.published_product_count)} {t('admin.vendorsPage.published')}</span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-gray-600">{toNumber(vendor.pending_order_count)} {t('admin.vendorsPage.pendingOrders')}</span>
                          <span className={`rounded-full px-2.5 py-1 ${vendor.owner_is_active === false ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {vendor.owner_is_active === false ? t('admin.vendorsPage.ownerInactive') : t('admin.vendorsPage.ownerActive')}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 ${vendor.owner_two_factor_enabled ? 'bg-amber-100 text-[#7F1D1D]' : 'bg-gray-100 text-gray-600'}`}>
                            2FA {vendor.owner_two_factor_enabled ? 'enabled' : 'disabled'}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 ${vendor.payment_config_set ? 'bg-amber-100 text-[#7F1D1D]' : 'bg-gray-100 text-gray-600'}`}>
                            Payment {vendor.payment_config_set ? 'configured' : 'not configured'}
                          </span>
                        </div>
                      </div>
                    </div>
                    )}

                    {showFullVendor && pendingRequestedType && (
                      <div className="mt-5 rounded-3xl border border-amber-100 bg-amber-50 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-sm font-black text-amber-800">
                              {t('sellerTypes.approval.pendingRequest', { type: getSellerTypeLabel(pendingRequestedType, t) })}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-amber-700">
                              {t('admin.vendorsPage.requestedAt')}: {formatDate(request?.requested_at)}
                            </p>
                          </div>
                          {confirmReject === vendor.id ? (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input
                                value={rejectReason}
                                onChange={(event) => setRejectReason(event.target.value)}
                                placeholder={t('admin.vendorsPage.rejectReasonPlaceholder')}
                                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-amber-400"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  void runAction(`${actionBase}-reject-type`, `/api/pd/admin/vendors/${vendor.id}/seller-type-request/reject`, {
                                    body: { reason: rejectReason || undefined },
                                    successMessage: t('admin.vendorsPage.sellerTypeRejected'),
                                  });
                                  setConfirmReject(null);
                                  setRejectReason('');
                                }}
                                disabled={activeAction === `${actionBase}-reject-type`}
                                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white disabled:opacity-60"
                              >
                                {t('sellerTypes.approval.reject')}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmReject(null);
                                  setRejectReason('');
                                }}
                                className="rounded-xl px-3 py-2 text-xs font-black text-gray-500 hover:bg-white"
                              >
                                {t('admin.vendorsPage.cancel')}
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void runAction(`${actionBase}-approve-type`, `/api/pd/admin/vendors/${vendor.id}/seller-type-request/approve`, {
                                  successMessage: t('admin.vendorsPage.sellerTypeApproved'),
                                })}
                                disabled={activeAction === `${actionBase}-approve-type`}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2 text-xs font-black text-white shadow-lg shadow-red-900/20 disabled:opacity-60"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {t('sellerTypes.approval.approve')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmReject(vendor.id)}
                                className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-white px-4 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4" />
                                {t('sellerTypes.approval.reject')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {showFullVendor && (
                  <div className="border-t border-gray-100 bg-slate-50 p-5 xl:border-l xl:border-t-0">
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">
                          {t('sellerTypes.approval.directChange')}
                        </label>
                        <select
                          value={currentSellerType}
                          onChange={(event) => void runAction(`${actionBase}-seller-type`, `/api/pd/admin/vendors/${vendor.id}/seller-type`, {
                            body: { seller_type: event.target.value },
                            successMessage: t('sellerTypes.approval.updated'),
                          })}
                          disabled={activeAction === `${actionBase}-seller-type`}
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10 disabled:opacity-60"
                        >
                          {sellerTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="rounded-3xl border border-gray-200 bg-white p-4">
                        <p className="mb-3 text-xs font-black uppercase tracking-wide text-gray-400">
                          Subscription override
                        </p>
                        <div className="grid gap-2">
                          <select
                            value={subscriptionOverride.plan}
                            onChange={(event) => updateSubscriptionOverride(vendor, { plan: event.target.value })}
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
                          >
                            {availableSubscriptionPlans.map((plan) => (
                              <option key={plan} value={plan}>{plan}</option>
                            ))}
                          </select>
                          <select
                            value={subscriptionOverride.type}
                            onChange={(event) => updateSubscriptionOverride(vendor, { type: event.target.value })}
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
                          >
                            {subscriptionTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={subscriptionOverride.expiresAt}
                            onChange={(event) => updateSubscriptionOverride(vendor, { expiresAt: event.target.value })}
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
                          />
                          <button
                            type="button"
                            onClick={() => void runAction(`${actionBase}-subscription`, `/api/pd/admin/vendors/${vendor.id}/subscription`, {
                              body: {
                                subscription_plan: subscriptionOverride.plan,
                                subscription_type: subscriptionOverride.type,
                                subscription_expires_at: subscriptionOverride.expiresAt ? new Date(`${subscriptionOverride.expiresAt}T23:59:59.000Z`).toISOString() : null,
                              },
                              successMessage: 'Subscription updated',
                            })}
                            disabled={activeAction === `${actionBase}-subscription`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                          >
                            <CreditCard className="h-4 w-4" />
                            Save subscription
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                        <button
                          type="button"
                          onClick={() => void startStoreChat(vendor)}
                          disabled={activeAction === `${actionBase}-chat`}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-900/20 disabled:opacity-60"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Chat store owner
                        </button>
                        {!vendor.is_verified && (
                          <button
                            type="button"
                            onClick={() => void runAction(`${actionBase}-verify`, `/api/pd/admin/vendors/${vendor.id}/verify`, {
                              successMessage: t('admin.vendorsPage.verified'),
                            })}
                            disabled={activeAction === `${actionBase}-verify`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-900/20 transition hover:bg-[#991B1B] disabled:opacity-60"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {t('admin.vendorsPage.verify')}
                          </button>
                        )}
                        {vendor.status === 'suspended' ? (
                          <button
                            type="button"
                            onClick={() => void runAction(`${actionBase}-reactivate`, `/api/pd/admin/vendors/${vendor.id}/reactivate`, {
                              successMessage: t('admin.vendorsPage.reactivated'),
                            })}
                            disabled={activeAction === `${actionBase}-reactivate`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-900/20 transition hover:bg-[#991B1B] disabled:opacity-60"
                          >
                            <RotateCcw className="h-4 w-4" />
                            {t('admin.vendorsPage.reactivate')}
                          </button>
                        ) : confirmSuspend === vendor.id ? (
                          <div className="rounded-2xl border border-red-100 bg-white p-3">
                            <input
                              type="text"
                              value={suspendReason}
                              onChange={(event) => setSuspendReason(event.target.value)}
                              placeholder={t('admin.vendorsPage.reasonPlaceholder')}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-red-300"
                            />
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  void runAction(`${actionBase}-suspend`, `/api/pd/admin/vendors/${vendor.id}/suspend`, {
                                    body: { reason: suspendReason || 'Suspended by admin' },
                                    successMessage: t('admin.vendorsPage.suspended'),
                                  });
                                  setConfirmSuspend(null);
                                  setSuspendReason('');
                                }}
                                disabled={activeAction === `${actionBase}-suspend`}
                                className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                              >
                                {t('admin.vendorsPage.confirm')}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmSuspend(null);
                                  setSuspendReason('');
                                }}
                                className="rounded-xl px-3 py-2 text-xs font-black text-gray-500 hover:bg-gray-50"
                              >
                                {t('admin.vendorsPage.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmSuspend(vendor.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50"
                          >
                            <Ban className="h-4 w-4" />
                            {t('admin.vendorsPage.suspend')}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                        {vendor.owner_is_active === false ? (
                          <button
                            type="button"
                            onClick={() => void runAction(`${actionBase}-owner-reactivate`, `/api/pd/admin/vendors/${vendor.id}/owner/reactivate`, {
                              successMessage: 'Vendor owner reactivated',
                            })}
                            disabled={activeAction === `${actionBase}-owner-reactivate`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-60"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Reactivate owner
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void runAction(`${actionBase}-owner-suspend`, `/api/pd/admin/vendors/${vendor.id}/owner/suspend`, {
                              body: { reason: 'Suspended by superadmin from Vendor Management' },
                              successMessage: 'Vendor owner suspended',
                            })}
                            disabled={activeAction === `${actionBase}-owner-suspend`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            <Ban className="h-4 w-4" />
                            Suspend owner
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void runAction(`${actionBase}-owner-2fa`, `/api/pd/admin/vendors/${vendor.id}/owner/reset-2fa`, {
                            successMessage: 'Vendor owner 2FA reset',
                          })}
                          disabled={activeAction === `${actionBase}-owner-2fa` || !vendor.owner_two_factor_enabled}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm font-black text-[#7F1D1D] transition hover:bg-amber-50 disabled:opacity-50"
                        >
                          <KeyRound className="h-4 w-4" />
                          Reset owner 2FA
                        </button>
                        <button
                          type="button"
                          onClick={() => void runAction(`${actionBase}-payment-clear`, `/api/pd/admin/vendors/${vendor.id}/payment-config`, {
                            method: 'DELETE',
                            successMessage: 'Payment config cleared',
                          })}
                          disabled={activeAction === `${actionBase}-payment-clear` || !vendor.payment_config_set}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm font-black text-[#7F1D1D] transition hover:bg-amber-50 disabled:opacity-50"
                        >
                          <CreditCard className="h-4 w-4" />
                          Clear payments
                        </button>
                        <button
                          type="button"
                          onClick={() => void runAction(`${actionBase}-domain-clear`, `/api/pd/admin/vendors/${vendor.id}/custom-domain`, {
                            method: 'DELETE',
                            successMessage: 'Custom domain cleared',
                          })}
                          disabled={activeAction === `${actionBase}-domain-clear` || !vendor.custom_domain}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Globe className="h-4 w-4" />
                          Clear domain
                        </button>
                      </div>

                      <Link
                        href={`/reports?store=${encodeURIComponent(vendor.id)}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:border-[#B91C1C] hover:text-[#B91C1C]"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        {t('admin.vendorsPage.viewReports')}
                      </Link>
                    </div>
                  </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-[2rem] border border-gray-100 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page === 1}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('admin.vendorsPage.previous')}
        </button>
        <span className="text-center text-sm font-bold text-gray-500">
          {t('admin.vendorsPage.pageOf', { page, totalPages })}
        </span>
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
        >
          {t('admin.vendorsPage.next')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function AdminStoresPage() {
  return (
    <Suspense fallback={<div className="min-h-screen rounded-[2rem] bg-white" />}>
      <AdminStoresContent />
    </Suspense>
  );
}
