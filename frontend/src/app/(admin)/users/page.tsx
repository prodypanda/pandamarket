'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Loader2,
  Mail,
  MessageSquare,
  RotateCcw,
  Search,
  ShieldCheck,
  Store,
  Users,
  WalletCards,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';

interface VendorAccount {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  is_active?: boolean | null;
  two_factor_enabled?: boolean | null;
  last_login_at?: string | null;
  created_at?: string | null;
  store_count?: string | number | null;
  free_store_count?: string | number | null;
  paid_store_count?: string | number | null;
  verified_store_count?: string | number | null;
  suspended_store_count?: string | number | null;
  product_count?: string | number | null;
  order_count?: string | number | null;
  captured_revenue?: string | number | null;
  open_report_count?: string | number | null;
}

interface VendorAccountSummary {
  total: number;
  active: number;
  inactive: number;
  multi_store_accounts: number;
  free_store_slots_available: number;
  total_stores: number;
}

const defaultSummary: VendorAccountSummary = {
  total: 0,
  active: 0,
  inactive: 0,
  multi_store_accounts: 0,
  free_store_slots_available: 0,
  total_stores: 0,
};

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

export default function AdminVendorAccountsPage() {
  const { locale, dir } = useLocale();
  const isRtl = dir === 'rtl';
  const [accounts, setAccounts] = useState<VendorAccount[]>([]);
  const [summary, setSummary] = useState<VendorAccountSummary>(defaultSummary);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [multiStoreOnly, setMultiStoreOnly] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
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

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (search.trim()) params.set('search', search.trim());
      if (multiStoreOnly) params.set('multi_store_only', 'true');
      const res = await fetchWithCsrf(`/api/pd/admin/vendor-accounts?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.data || []);
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
  }, [multiStoreOnly, page, search, showFeedback]);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const formatDate = (value?: string | null) => {
    if (!value) return 'Not provided';
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

  const getAccountName = (account: VendorAccount) => {
    const name = `${account.first_name || ''} ${account.last_name || ''}`.trim();
    return name || account.email || 'Vendor account';
  };

  const runAction = async (accountId: string, action: 'suspend' | 'reactivate' | 'reset-2fa') => {
    const actionKey = `vendor-account-${accountId}-${action}`;
    setActiveAction(actionKey);
    try {
      const endpoint = `/api/pd/admin/vendor-accounts/${accountId}/${action}`;
      const res = await fetchWithCsrf(endpoint, {
        method: 'PUT',
        headers: action === 'suspend' ? { 'Content-Type': 'application/json' } : undefined,
        credentials: 'include',
        body: action === 'suspend' ? JSON.stringify({ reason: 'Suspended by superadmin from Vendor Accounts' }) : undefined,
      });
      if (res.ok) {
        const successMessage =
          action === 'reset-2fa'
            ? 'Vendor account 2FA reset'
            : action === 'reactivate'
              ? 'Vendor account reactivated'
              : 'Vendor account suspended';
        showFeedback(successMessage);
        await fetchAccounts();
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Network error', true);
    } finally {
      setActiveAction(null);
    }
  };

  const metricCards = [
    { label: 'Vendor accounts', value: summary.total, icon: Users, tone: 'from-slate-950 to-slate-700 text-white' },
    { label: 'Active accounts', value: summary.active, icon: ShieldCheck, tone: 'from-[#7F1D1D] to-[#B91C1C] text-white' },
    { label: 'Inactive accounts', value: summary.inactive, icon: Ban, tone: 'from-red-500 to-rose-600 text-white' },
    { label: 'Multi-store accounts', value: summary.multi_store_accounts, icon: Store, tone: 'from-amber-500 to-red-600 text-white' },
    { label: 'Total stores', value: summary.total_stores, icon: Store, tone: 'from-[#B91C1C] to-amber-500 text-white' },
    { label: 'Free slots available', value: summary.free_store_slots_available, icon: WalletCards, tone: 'from-amber-400 to-orange-500 text-white' },
  ];

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={dir}>
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-6 text-white shadow-2xl shadow-slate-900/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-amber-100">
              <Users className="h-4 w-4" />
              Vendors management
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Vendor accounts</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Manage seller accounts separately from their stores. Each account can own multiple stores, but only one free store.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/users" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-lg shadow-black/10">
              <Users className="h-4 w-4" />
              Vendors
            </Link>
            <Link href="/stores" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/15">
              <Store className="h-4 w-4" />
              Stores
            </Link>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Filtered total</p>
              <p className="mt-1 text-3xl font-black">{total}</p>
            </div>
          </div>
        </div>
      </div>

      {(success || error) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
          error ? 'border-red-100 bg-red-50 text-red-700' : 'border-amber-100 bg-amber-50 text-[#7F1D1D]'
        }`}>
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

      <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Search accounts</label>
            <div className="relative">
              <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-4' : 'left-4'}`} />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by owner name, email, or phone"
                className={`w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/10 ${isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'}`}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setMultiStoreOnly((current) => !current);
              setPage(1);
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition ${
              multiStoreOnly ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Store className="h-4 w-4" />
            Multi-store only
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-[2rem] border border-gray-100 bg-white py-16 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500">
            <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="font-bold">No vendor accounts found.</p>
          </div>
        ) : (
          accounts.map((account) => {
            const actionBase = `vendor-account-${account.id}`;
            return (
              <div key={account.id} className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm transition hover:shadow-xl hover:shadow-slate-900/5">
                <div className="grid gap-0 xl:grid-cols-[1.35fr_0.85fr]">
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7F1D1D] to-[#B91C1C] text-white shadow-lg shadow-red-900/20">
                          <Users className="h-7 w-7" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-black text-gray-900">{getAccountName(account)}</h2>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${account.is_active === false ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-amber-50 text-[#B91C1C] ring-amber-100'}`}>
                              {account.is_active === false ? 'Inactive' : 'Active'}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${account.two_factor_enabled ? 'bg-amber-50 text-[#7F1D1D] ring-amber-100' : 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                              2FA {account.two_factor_enabled ? 'on' : 'off'}
                            </span>
                          </div>
                          {account.email && (
                            <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-500">
                              <Mail className="h-3.5 w-3.5" />
                              {account.email}
                            </p>
                          )}
                          <p className="mt-2 text-xs font-semibold text-gray-500">Vendor account ID: {account.id}</p>
                          <p className="mt-2 text-xs font-semibold text-gray-500">
                            Created {formatDate(account.created_at)} · Last login {formatDate(account.last_login_at)}
                          </p>
                          {account.phone && <p className="mt-1 text-xs font-semibold text-gray-500">{account.phone}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <Store className="h-4 w-4 text-gray-400" />
                          <p className="mt-2 text-lg font-black text-gray-900">{toNumber(account.store_count)}</p>
                          <p className="text-[11px] font-bold uppercase text-gray-400">Stores</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <ShieldCheck className="h-4 w-4 text-gray-400" />
                          <p className="mt-2 text-lg font-black text-gray-900">{toNumber(account.verified_store_count)}</p>
                          <p className="text-[11px] font-bold uppercase text-gray-400">Verified</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <WalletCards className="h-4 w-4 text-gray-400" />
                          <p className="mt-2 text-sm font-black text-gray-900">{formatMoney(account.captured_revenue)}</p>
                          <p className="text-[11px] font-bold uppercase text-gray-400">Revenue</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <AlertTriangle className="h-4 w-4 text-gray-400" />
                          <p className="mt-2 text-lg font-black text-gray-900">{toNumber(account.open_report_count)}</p>
                          <p className="text-[11px] font-bold uppercase text-gray-400">Reports</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">Store allowance</p>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-xl bg-white px-2 py-2">
                            <p className="text-sm font-black text-gray-900">{toNumber(account.free_store_count)}</p>
                            <p className="text-[10px] font-bold uppercase text-gray-400">Free</p>
                          </div>
                          <div className="rounded-xl bg-white px-2 py-2">
                            <p className="text-sm font-black text-gray-900">{toNumber(account.paid_store_count)}</p>
                            <p className="text-[10px] font-bold uppercase text-gray-400">Paid</p>
                          </div>
                          <div className="rounded-xl bg-white px-2 py-2">
                            <p className="text-sm font-black text-gray-900">{toNumber(account.free_store_count) === 0 ? 'Yes' : 'No'}</p>
                            <p className="text-[10px] font-bold uppercase text-gray-400">Free slot</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">Catalog</p>
                        <p className="mt-2 text-sm font-bold text-gray-900">{toNumber(account.product_count)} products</p>
                        <p className="mt-1 text-xs font-semibold text-gray-500">{toNumber(account.order_count)} orders across all stores</p>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">Isolation</p>
                        <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">
                          Store operations are managed per store. Account actions affect login access and security only.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 bg-slate-50 p-5 xl:border-l xl:border-t-0">
                    <div className="space-y-3">
                      <Link
                        href={`/stores?owner_id=${encodeURIComponent(account.id)}&owner=${encodeURIComponent(getAccountName(account))}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                      >
                        <Store className="h-4 w-4" />
                        Manage stores
                      </Link>
                      <Link
                        href="/messages"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#991B1B]"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Open chat center
                      </Link>
                      {account.is_active === false ? (
                        <button
                          type="button"
                          onClick={() => void runAction(account.id, 'reactivate')}
                          disabled={activeAction === `${actionBase}-reactivate`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-60"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reactivate account
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void runAction(account.id, 'suspend')}
                          disabled={activeAction === `${actionBase}-suspend`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          <Ban className="h-4 w-4" />
                          Suspend account
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void runAction(account.id, 'reset-2fa')}
                        disabled={activeAction === `${actionBase}-reset-2fa` || !account.two_factor_enabled}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm font-black text-[#7F1D1D] transition hover:bg-amber-50 disabled:opacity-50"
                      >
                        <KeyRound className="h-4 w-4" />
                        Reset account 2FA
                      </button>
                    </div>
                  </div>
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
          Previous
        </button>
        <span className="text-center text-sm font-bold text-gray-500">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
