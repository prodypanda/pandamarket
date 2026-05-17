'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  ExternalLink,
  Package,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Wallet,
  TrendingUp,
  X,
} from 'lucide-react';
import Link from 'next/link';

interface WalletData {
  balance?: number | string | null;
  pending_balance?: number | string | null;
  total_earned?: number | string | null;
}

interface StoreInfo {
  id?: string;
  name?: string;
  subdomain?: string | null;
  custom_domain?: string | null;
  status?: string | null;
  is_verified?: boolean | null;
  theme_id?: string | null;
  payment_config?: unknown;
  settings?: {
    logo_url?: string | null;
    store_description?: string | null;
  } | null;
}

interface VerificationData {
  status?: string | null;
}

interface Order {
  id: string;
  total_amount?: number | string | null;
  total?: number | string | null;
  status: string;
  created_at: string;
  customer_email?: string;
}

interface DailySales {
  date: string;
  total: number;
  count: number;
}

function toNumber(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatPrice(price: unknown): string {
  return `${toNumber(price).toFixed(3)} TND`;
}

function getOrderTotal(order: Order): number {
  return toNumber(order.total_amount ?? order.total);
}

const ORDER_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'En attente' },
  processing: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'En cours' },
  payment_required: { bg: 'bg-red-50', text: 'text-red-700', label: 'Paiement requis' },
  fulfilled: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Expédié' },
  delivered: { bg: 'bg-green-50', text: 'text-green-700', label: 'Livré' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Annulé' },
  refunded: { bg: 'bg-violet-50', text: 'text-violet-700', label: 'Remboursé' },
};

const STORE_STATUS_BADGES: Record<string, { label: string; className: string; dotClassName: string }> = {
  verified: {
    label: 'Live',
    className: 'bg-emerald-500/20 text-emerald-200',
    dotClassName: 'bg-emerald-300',
  },
  maintenance: {
    label: 'Maintenance',
    className: 'bg-amber-500/20 text-amber-200',
    dotClassName: 'bg-amber-300',
  },
  unverified: {
    label: 'Pending verification',
    className: 'bg-slate-500/30 text-slate-200',
    dotClassName: 'bg-slate-300',
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-red-500/20 text-red-200',
    dotClassName: 'bg-red-300',
  },
};

function getWelcomeStorageKey(storeId: string): string {
  return `pd_seller_welcome_seen:${storeId}`;
}

function hasSeenWelcomeModal(storeId: string): boolean {
  try {
    return window.localStorage.getItem(getWelcomeStorageKey(storeId)) === 'true';
  } catch {
    return true;
  }
}

function markWelcomeModalSeen(storeId: string): void {
  try {
    window.localStorage.setItem(getWelcomeStorageKey(storeId), 'true');
  } catch {
    // Ignore storage failures so dismissing the modal never breaks the dashboard.
  }
}

/** Build last-30-day sales data from orders */
function buildSalesChart(orders: Order[]): DailySales[] {
  const days: DailySales[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, total: 0, count: 0 });
  }
  const map = new Map(days.map((d) => [d.date, d]));
  for (const order of orders) {
    const key = new Date(order.created_at).toISOString().slice(0, 10);
    const entry = map.get(key);
    if (entry) {
      entry.total += getOrderTotal(order);
      entry.count += 1;
    }
  }
  return days;
}

export default function DashboardOverview() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Calculate date_from for 30-day chart
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 30);
        const dateFromStr = dateFrom.toISOString().slice(0, 10);

        const [walletRes, productsRes, ordersRes, chartOrdersRes, storeRes, verificationRes] = await Promise.allSettled([
          fetchWithCsrf('/api/pd/wallet/me', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/stores/me/products?limit=1', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/orders/store?limit=5', { credentials: 'include' }),
          fetchWithCsrf(`/api/pd/orders/store?limit=200&date_from=${dateFromStr}`, { credentials: 'include' }),
          fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/verification/status', { credentials: 'include' }),
        ]);

        if (walletRes.status === 'fulfilled' && walletRes.value.ok) {
          const data = await walletRes.value.json();
          setWallet(data.wallet);
        }

        if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
          const data = await productsRes.value.json();
          setProductCount(data.meta?.total || 0);
        }

        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const data = await ordersRes.value.json();
          setRecentOrders(data.data || []);
          setOrderCount(data.meta?.total || 0);
        }

        if (chartOrdersRes.status === 'fulfilled' && chartOrdersRes.value.ok) {
          const data = await chartOrdersRes.value.json();
          setAllOrders(data.data || []);
        }

        if (storeRes.status === 'fulfilled' && storeRes.value.ok) {
          const data = await storeRes.value.json();
          setStore(data.store || null);
        }

        if (verificationRes.status === 'fulfilled' && verificationRes.value.ok) {
          const data = await verificationRes.value.json();
          setVerification(data.verification || null);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (loading || !store?.id) return;
    if (!hasSeenWelcomeModal(store.id)) {
      setShowWelcomeModal(true);
    }
  }, [loading, store?.id]);

  const dismissWelcomeModal = () => {
    if (store?.id) {
      markWelcomeModalSeen(store.id);
    }
    setShowWelcomeModal(false);
  };

  const salesData = useMemo(() => buildSalesChart(allOrders), [allOrders]);
  const maxSales = useMemo(() => Math.max(...salesData.map((d) => d.total), 1), [salesData]);
  const totalRevenue30d = useMemo(() => salesData.reduce((s, d) => s + d.total, 0), [salesData]);
  const totalOrders30d = useMemo(() => salesData.reduce((s, d) => s + d.count, 0), [salesData]);
  const storefrontHref = store?.subdomain ? `/store/${encodeURIComponent(store.subdomain)}` : '/hub';
  const setupSteps = [
    {
      label: 'Store basics',
      description: 'Logo and description',
      completed: Boolean(store?.settings?.logo_url || store?.settings?.store_description),
      href: '/hub/dashboard/settings',
    },
    {
      label: 'Theme selected',
      description: 'Storefront design',
      completed: Boolean(store?.theme_id),
      href: '/hub/dashboard/settings',
    },
    {
      label: 'KYC approved',
      description: 'Verification status',
      completed: verification?.status === 'approved' || Boolean(store?.is_verified),
      href: '/hub/dashboard/kyc',
    },
    {
      label: 'First product',
      description: 'Catalog is ready',
      completed: productCount > 0,
      href: '/hub/dashboard/products',
    },
    {
      label: 'Payment configured',
      description: 'Direct payments',
      completed: Boolean(store?.payment_config),
      href: '/hub/dashboard/payment-config',
    },
  ];
  const completedSetupSteps = setupSteps.filter((step) => step.completed).length;
  const setupPercent = Math.round((completedSetupSteps / setupSteps.length) * 100);
  const storeStatusBadge = store?.status ? STORE_STATUS_BADGES[store.status] : null;

  const stats = [
    {
      name: 'Total Revenue',
      value: loading ? '—' : formatPrice(wallet?.total_earned),
      hint: `${formatPrice(totalRevenue30d)} in last 30 days`,
      icon: DollarSign,
      gradient: 'from-amber-500 to-teal-600',
    },
    {
      name: 'Active Products',
      value: loading ? '—' : String(productCount),
      hint: productCount > 0 ? 'Catalog available' : 'Add your first listing',
      icon: Package,
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      name: 'Total Orders',
      value: loading ? '—' : String(orderCount),
      hint: `${totalOrders30d} in last 30 days`,
      icon: ShoppingCart,
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      name: 'Available Balance',
      value: loading ? '—' : formatPrice(wallet?.balance),
      hint: `${formatPrice(wallet?.pending_balance)} pending`,
      icon: Wallet,
      gradient: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="seller-welcome-title" className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-950/30">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#B91C1C]/10 blur-3xl" />
            <div className="relative p-6 sm:p-8">
              <button
                type="button"
                onClick={dismissWelcomeModal}
                className="absolute right-5 top-5 rounded-full bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
                aria-label="Fermer le message de bienvenue"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#B91C1C]/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#B91C1C]">
                <Store className="h-4 w-4" />
                Bienvenue vendeur
              </div>
              <h2 id="seller-welcome-title" className="mt-4 text-3xl font-black tracking-tight text-gray-900">
                Lancez {store?.name || 'votre boutique'} en quelques étapes
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-gray-500">
                Votre espace vendeur est prêt. Suivez cette checklist pour préparer votre vitrine, publier vos premiers produits, configurer les paiements et passer votre boutique en ligne.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {setupSteps.map((step, index) => (
                  <Link
                    key={step.label}
                    href={step.href}
                    onClick={dismissWelcomeModal}
                    className="group flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:border-[#B91C1C]/30 hover:bg-white hover:shadow-md"
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${step.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-500 ring-1 ring-gray-200'}`}>
                      {step.completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-black text-gray-900 group-hover:text-[#B91C1C]">{step.label}</span>
                      <span className="mt-1 block text-xs font-semibold leading-5 text-gray-500">{step.description}</span>
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-bold text-gray-400">Retrouvez ces étapes dans la carte Launch readiness du dashboard.</p>
                <button type="button" onClick={dismissWelcomeModal} className="inline-flex items-center justify-center rounded-2xl bg-[#B91C1C] px-5 py-3 text-sm font-black text-white transition hover:bg-[#991B1B]">
                  Commencer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-900 p-6 text-white shadow-2xl shadow-slate-900/10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-[80px]" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-5">
            {/* Store logo */}
            {store?.settings?.logo_url ? (
              <div className="hidden h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white shadow-xl sm:flex">
                <img src={store.settings.logo_url} alt="" className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 sm:flex">
                <Store className="h-7 w-7 text-amber-200" />
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-amber-100">
                <Store className="h-4 w-4" />
                Seller command center
                {storeStatusBadge && (
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${storeStatusBadge.className}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${storeStatusBadge.dotClassName} ${store?.status === 'verified' ? 'animate-pulse' : ''}`} />
                    {storeStatusBadge.label}
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight">{store?.name || 'Overview'}</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-amber-50/70">Track store readiness, sales, orders, wallet balance, and next actions.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={storefrontHref} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900 transition hover:-translate-y-0.5 hover:bg-amber-50">
              View storefront <ExternalLink className="h-4 w-4" />
            </Link>
            <Link href="/hub/dashboard/products" className="inline-flex items-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#991B1B]">
              Add product <Plus className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Products', icon: Package, href: '/hub/dashboard/products', color: 'text-blue-600 bg-blue-50' },
          { label: 'Orders', icon: ShoppingCart, href: '/hub/dashboard/orders', color: 'text-violet-600 bg-violet-50' },
          { label: 'Analytics', icon: BarChart3, href: '/hub/dashboard/analytics', color: 'text-amber-600 bg-amber-50' },
          { label: 'Settings', icon: Settings, href: '/hub/dashboard/settings', color: 'text-gray-600 bg-gray-100' },
        ].map((action) => (
          <Link key={action.label} href={action.href} className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className={`rounded-xl p-2.5 ${action.color} transition-transform group-hover:scale-110`}>
              <action.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-gray-700">{action.label}</span>
            <ArrowRight className="ml-auto h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="group relative overflow-hidden bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{stat.name}</p>
                {loading ? (
                  <div className="h-9 w-28 bg-gray-100 rounded-lg animate-pulse mt-2" />
                ) : (
                  <p className="text-2xl font-black text-gray-900 mt-2">{stat.value}</p>
                )}
                <p className="mt-2 text-[11px] font-semibold text-gray-400">{stat.hint}</p>
              </div>
              <div className={`rounded-xl bg-gradient-to-br ${stat.gradient} p-3 text-white shadow-lg`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${stat.gradient} opacity-0 transition-opacity group-hover:opacity-100`} />
          </div>
        ))}
      </div>

      {/* Launch Readiness + Store Health */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-900">Launch readiness</h3>
              <p className="mt-1 text-sm font-semibold text-gray-500">{completedSetupSteps} of {setupSteps.length} steps completed</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-black ${setupPercent === 100 ? 'text-[#B91C1C]' : 'text-amber-500'}`}>{setupPercent}%</p>
              <p className="text-xs font-black uppercase tracking-wide text-gray-400">{setupPercent === 100 ? '🎉 Ready!' : 'In progress'}</p>
            </div>
          </div>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full rounded-full transition-all duration-700 ${setupPercent === 100 ? 'bg-[#B91C1C]' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`} style={{ width: `${setupPercent}%` }} />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {setupSteps.map((step) => (
              <Link key={step.label} href={step.href} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:border-[#B91C1C]/30 hover:bg-amber-50/40">
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${step.completed ? 'bg-amber-100 text-amber-700' : 'bg-amber-100 text-amber-700'}`}>
                  {step.completed ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                </span>
                <span>
                  <span className="block text-sm font-black text-gray-900">{step.label}</span>
                  <span className="block text-xs font-semibold text-gray-500">{step.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-gray-900">Store health</h3>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-600"><ShieldCheck className="h-4 w-4 text-gray-400" /> Verification</span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${verification?.status === 'approved' || store?.is_verified ? 'bg-amber-100 text-amber-700' : 'bg-amber-100 text-amber-700'}`}>
                {verification?.status === 'approved' || store?.is_verified ? 'Approved' : verification?.status || 'Not submitted'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-600"><CreditCard className="h-4 w-4 text-gray-400" /> Payments</span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${store?.payment_config ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'}`}>
                {store?.payment_config ? 'Configured' : 'Marketplace default'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-600"><Settings className="h-4 w-4 text-gray-400" /> Store status</span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{store?.status || 'active'}</span>
            </div>
            {completedSetupSteps < setupSteps.length && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                <AlertCircle className="mb-2 h-4 w-4" />
                Finish the remaining setup steps to improve buyer trust and conversion.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sales Chart + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-black text-gray-900">Sales (30 days)</h3>
              <p className="mt-0.5 text-xs text-gray-400">{totalOrders30d} orders • {formatPrice(totalRevenue30d)}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-[#B91C1C]">
              <TrendingUp className="h-4 w-4" />
              {formatPrice(totalRevenue30d)}
            </div>
          </div>
          {loading ? (
            <div className="h-52 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <>
              <div className="relative h-52 flex items-end gap-[2px]">
                {/* Horizontal grid lines */}
                {[0.25, 0.5, 0.75, 1].map((pct) => (
                  <div key={pct} className="pointer-events-none absolute left-0 right-0 border-t border-gray-100" style={{ bottom: `${pct * 100}%` }} />
                ))}
                {salesData.map((day, i) => {
                  const height = maxSales > 0 ? (day.total / maxSales) * 100 : 0;
                  const isToday = i === salesData.length - 1;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 group relative"
                      title={`${day.date}: ${formatPrice(day.total)} (${day.count} orders)`}
                    >
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          isToday
                            ? 'bg-gradient-to-t from-[#B91C1C] to-[#1EE69A] shadow-sm shadow-amber-500/20'
                            : 'bg-[#B91C1C]/30 group-hover:bg-[#B91C1C]/60'
                        }`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2 whitespace-nowrap shadow-xl">
                          <p className="font-bold">{new Date(day.date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</p>
                          <p className="text-[#B91C1C] font-black">{formatPrice(day.total)}</p>
                          <p className="text-gray-400">{day.count} order{day.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* X-axis labels */}
              <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-medium">
                <span>{salesData[0] && new Date(salesData[0].date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</span>
                <span>{salesData[14] && new Date(salesData[14].date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</span>
                <span>Today</span>
              </div>
            </>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-gray-900">Recent Orders</h3>
            <Link href="/hub/dashboard/orders" className="text-xs font-bold text-[#B91C1C] hover:underline">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentOrders.length > 0 ? (
            <ul className="space-y-3">
              {recentOrders.map((order) => {
                const statusInfo = ORDER_STATUS_COLORS[order.status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: order.status };
                return (
                  <li key={order.id}>
                    <Link href={`/hub/dashboard/orders/${order.id}`} className="flex items-center justify-between rounded-xl p-3 transition-all hover:bg-gray-50 group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-mono text-[10px] font-bold">
                          #{order.id.slice(-4)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#B91C1C] transition-colors">
                            {order.customer_email || 'Customer'}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {new Date(order.created_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.label}
                        </span>
                        <span className="text-sm font-black text-gray-900">{formatPrice(getOrderTotal(order))}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ShoppingCart className="mb-3 h-10 w-10 text-gray-200" />
              <p className="text-sm font-semibold text-gray-400">No orders yet</p>
              <p className="mt-1 text-xs text-gray-300">Orders will appear here when customers purchase</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
