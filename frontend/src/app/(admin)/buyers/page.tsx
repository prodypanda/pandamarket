'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserRound,
  Users,
  WalletCards,
} from 'lucide-react';
import { AdminUserSecurityActivityPanel } from '../../../components/admin/AdminUserSecurityActivityPanel';
import { useLocale } from '../../../contexts/LocaleContext';

interface BuyerAccount {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email_verified?: boolean | null;
  is_active?: boolean | null;
  two_factor_enabled?: boolean | null;
  last_login_at?: string | null;
  created_at?: string | null;
  order_count?: string | number | null;
  open_order_count?: string | number | null;
  captured_order_count?: string | number | null;
  total_spent?: string | number | null;
  last_order_at?: string | null;
  wishlist_count?: string | number | null;
  review_count?: string | number | null;
  address_count?: string | number | null;
  open_report_count?: string | number | null;
  chat_count?: string | number | null;
}

interface BuyerSummary {
  total: number;
  active: number;
  inactive: number;
  email_verified: number;
  with_orders: number;
  total_orders: number;
}

const defaultSummary: BuyerSummary = {
  total: 0,
  active: 0,
  inactive: 0,
  email_verified: 0,
  with_orders: 0,
  total_orders: 0,
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

export default function AdminBuyersPage() {
  const { locale, dir } = useLocale();
  const isRtl = dir === 'rtl';
  const [buyers, setBuyers] = useState<BuyerAccount[]>([]);
  const [summary, setSummary] = useState<BuyerSummary>(defaultSummary);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [emailVerified, setEmailVerified] = useState('');
  const [hasOrders, setHasOrders] = useState(false);
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

  const fetchBuyers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (emailVerified) params.set('email_verified', emailVerified);
      if (hasOrders) params.set('has_orders', 'true');
      const res = await fetchWithCsrf(`/api/pd/admin/buyers?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setBuyers(data.data || []);
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
  }, [emailVerified, hasOrders, page, search, showFeedback, status]);

  useEffect(() => {
    void fetchBuyers();
  }, [fetchBuyers]);

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

  const getBuyerName = (buyer: BuyerAccount) => {
    const name = `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim();
    return name || buyer.email || 'Buyer account';
  };

  const runAction = async (buyerId: string, action: 'suspend' | 'reactivate' | 'reset-2fa') => {
    const actionKey = `buyer-${buyerId}-${action}`;
    setActiveAction(actionKey);
    try {
      const endpoint = `/api/pd/admin/buyers/${buyerId}/${action}`;
      const res = await fetchWithCsrf(endpoint, {
        method: 'PUT',
        headers: action === 'suspend' ? { 'Content-Type': 'application/json' } : undefined,
        credentials: 'include',
        body: action === 'suspend' ? JSON.stringify({ reason: 'Suspended by superadmin from Buyer Manager' }) : undefined,
      });
      if (res.ok) {
        const successMessage =
          action === 'reset-2fa'
            ? 'Buyer account 2FA reset'
            : action === 'reactivate'
              ? 'Buyer account reactivated'
              : 'Buyer account suspended';
        showFeedback(successMessage);
        await fetchBuyers();
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Network error', true);
    } finally {
      setActiveAction(null);
    }
  };

  const updateEmailVerification = async (buyer: BuyerAccount, nextValue: boolean) => {
    const actionKey = `buyer-${buyer.id}-email-verification`;
    setActiveAction(actionKey);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/buyers/${buyer.id}/email-verification`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email_verified: nextValue }),
      });
      if (res.ok) {
        showFeedback(nextValue ? 'Buyer email marked as verified' : 'Buyer email marked as unverified');
        await fetchBuyers();
      } else {
        showFeedback(await getErrorMessage(res), true);
      }
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Network error', true);
    } finally {
      setActiveAction(null);
    }
  };

  const startBuyerChat = async (buyer: BuyerAccount) => {
    const actionKey = `buyer-${buyer.id}-chat`;
    setActiveAction(actionKey);
    try {
      const res = await fetchWithCsrf('/api/pd/chats/admin/buyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ buyer_id: buyer.id, subject: `Support with ${getBuyerName(buyer)}` }),
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

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setEmailVerified('');
    setHasOrders(false);
    setPage(1);
  };

  const metricCards = [
    { label: 'Buyer accounts', value: summary.total, icon: Users, tone: 'from-slate-950 to-slate-700 text-white' },
    { label: 'Active buyers', value: summary.active, icon: ShieldCheck, tone: 'from-[#7F1D1D] to-[#B91C1C] text-white' },
    { label: 'Inactive buyers', value: summary.inactive, icon: Ban, tone: 'from-red-500 to-rose-600 text-white' },
    { label: 'Email verified', value: summary.email_verified, icon: CheckCircle2, tone: 'from-amber-500 to-red-600 text-white' },
    { label: 'With orders', value: summary.with_orders, icon: ShoppingBag, tone: 'from-[#B91C1C] to-amber-500 text-white' },
    { label: 'Total orders', value: summary.total_orders, icon: WalletCards, tone: 'from-amber-400 to-orange-500 text-white' },
  ];

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={dir}>
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-6 text-white shadow-2xl shadow-slate-900/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-amber-100">
              <UserRound className="h-4 w-4" />
              Buyer management
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Buyer accounts</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Manage customer accounts, security, verification, support chats, order activity, reports, reviews, wishlists, and addresses.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Filtered total</p>
            <p className="mt-1 text-3xl font-black">{total}</p>
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
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Search buyers</label>
            <div className="relative">
              <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-4' : 'left-4'}`} />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by buyer name, email, or phone"
                className={`w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/10 ${isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:w-[620px]">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Status</label>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Email</label>
              <select
                value={emailVerified}
                onChange={(event) => {
                  setEmailVerified(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
              >
                <option value="">All emails</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setHasOrders((current) => !current);
                  setPage(1);
                }}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition ${
                  hasOrders ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                With orders
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-[2rem] border border-gray-100 bg-white py-16 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : buyers.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500">
            <UserRound className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="font-bold">No buyer accounts found.</p>
          </div>
        ) : (
          buyers.map((buyer) => {
            const actionBase = `buyer-${buyer.id}`;
            return (
              <div key={buyer.id} className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm transition hover:shadow-xl hover:shadow-slate-900/5">
                <div className="grid gap-0 xl:grid-cols-[1.35fr_0.85fr]">
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 text-white shadow-lg shadow-red-900/20">
                          <UserRound className="h-7 w-7" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-black text-gray-900">{getBuyerName(buyer)}</h2>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${buyer.is_active === false ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-amber-50 text-[#B91C1C] ring-amber-100'}`}>
                              {buyer.is_active === false ? 'Inactive' : 'Active'}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${buyer.email_verified ? 'bg-amber-50 text-[#B91C1C] ring-amber-100' : 'bg-amber-50 text-amber-700 ring-amber-100'}`}>
                              Email {buyer.email_verified ? 'verified' : 'unverified'}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${buyer.two_factor_enabled ? 'bg-amber-50 text-[#7F1D1D] ring-amber-100' : 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                              2FA {buyer.two_factor_enabled ? 'on' : 'off'}
                            </span>
                          </div>
                          {buyer.email && (
                            <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-500">
                              <Mail className="h-3.5 w-3.5" />
                              {buyer.email}
                            </p>
                          )}
                          {buyer.phone && <p className="mt-1 text-xs font-semibold text-gray-500">{buyer.phone}</p>}
                          <p className="mt-2 text-xs font-semibold text-gray-500">Buyer ID: {buyer.id}</p>
                          <p className="mt-2 text-xs font-semibold text-gray-500">
                            Created {formatDate(buyer.created_at)} · Last login {formatDate(buyer.last_login_at)} · Last order {formatDate(buyer.last_order_at)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <ShoppingBag className="h-4 w-4 text-gray-400" />
                          <p className="mt-2 text-lg font-black text-gray-900">{toNumber(buyer.order_count)}</p>
                          <p className="text-[11px] font-bold uppercase text-gray-400">Orders</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <WalletCards className="h-4 w-4 text-gray-400" />
                          <p className="mt-2 text-sm font-black text-gray-900">{formatMoney(buyer.total_spent)}</p>
                          <p className="text-[11px] font-bold uppercase text-gray-400">Spent</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <MessageSquare className="h-4 w-4 text-gray-400" />
                          <p className="mt-2 text-lg font-black text-gray-900">{toNumber(buyer.chat_count)}</p>
                          <p className="text-[11px] font-bold uppercase text-gray-400">Chats</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <AlertTriangle className="h-4 w-4 text-gray-400" />
                          <p className="mt-2 text-lg font-black text-gray-900">{toNumber(buyer.open_report_count)}</p>
                          <p className="text-[11px] font-bold uppercase text-gray-400">Reports</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">Commerce</p>
                        <p className="mt-2 text-sm font-bold text-gray-900">{toNumber(buyer.captured_order_count)} captured orders</p>
                        <p className="mt-1 text-xs font-semibold text-gray-500">{toNumber(buyer.open_order_count)} open orders</p>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">Engagement</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-gray-600"><Heart className="h-3.5 w-3.5" /> {toNumber(buyer.wishlist_count)} wishlist</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-gray-600"><Star className="h-3.5 w-3.5" /> {toNumber(buyer.review_count)} reviews</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">Addresses</p>
                        <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-gray-900">
                          <MapPin className="h-4 w-4 text-gray-400" /> {toNumber(buyer.address_count)} saved addresses
                        </p>
                      </div>
                    </div>

                    <AdminUserSecurityActivityPanel userId={buyer.id} accentClass="bg-[#B91C1C]" />
                  </div>

                  <div className="border-t border-gray-100 bg-slate-50 p-5 xl:border-l xl:border-t-0">
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => void startBuyerChat(buyer)}
                        disabled={activeAction === `${actionBase}-chat`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-60"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Start / open support chat
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateEmailVerification(buyer, !buyer.email_verified)}
                        disabled={activeAction === `${actionBase}-email-verification`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm font-black text-[#B91C1C] transition hover:bg-amber-50 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {buyer.email_verified ? 'Mark email unverified' : 'Mark email verified'}
                      </button>
                      {buyer.is_active === false ? (
                        <button
                          type="button"
                          onClick={() => void runAction(buyer.id, 'reactivate')}
                          disabled={activeAction === `${actionBase}-reactivate`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-60"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reactivate account
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void runAction(buyer.id, 'suspend')}
                          disabled={activeAction === `${actionBase}-suspend`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          <Ban className="h-4 w-4" />
                          Suspend account
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void runAction(buyer.id, 'reset-2fa')}
                        disabled={activeAction === `${actionBase}-reset-2fa` || !buyer.two_factor_enabled}
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
