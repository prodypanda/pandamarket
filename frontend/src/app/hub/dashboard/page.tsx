'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Wallet,
  TrendingUp,
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

  useEffect(() => {
    async function fetchData() {
      try {
        const [walletRes, productsRes, ordersRes, chartOrdersRes, storeRes, verificationRes] = await Promise.allSettled([
          fetchWithCsrf('/api/pd/wallet/me', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/stores/me/products?limit=1', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/orders/store?limit=5', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/orders/store?limit=200&days=30', { credentials: 'include' }),
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

  const stats = [
    {
      name: 'Total Revenue',
      value: loading ? '—' : formatPrice(wallet?.total_earned),
      hint: `${formatPrice(totalRevenue30d)} in last 30 days`,
      icon: DollarSign,
      color: 'bg-[#16C784]/10 text-[#16C784]',
    },
    {
      name: 'Active Products',
      value: loading ? '—' : String(productCount),
      hint: productCount > 0 ? 'Catalog available' : 'Add your first listing',
      icon: Package,
      color: 'bg-[#16C784]/10 text-[#16C784]',
    },
    {
      name: 'Total Orders',
      value: loading ? '—' : String(orderCount),
      hint: `${totalOrders30d} in last 30 days`,
      icon: ShoppingCart,
      color: 'bg-[#16C784]/10 text-[#16C784]',
    },
    {
      name: 'Available Balance',
      value: loading ? '—' : formatPrice(wallet?.balance),
      hint: `${formatPrice(wallet?.pending_balance)} pending`,
      icon: Wallet,
      color: 'bg-[#16C784]/10 text-[#16C784]',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-2xl shadow-slate-900/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-emerald-100">
              <Store className="h-4 w-4" />
              Seller command center
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">{store?.name || 'Overview'}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">Track store readiness, sales, orders, wallet balance, and the next actions that help you launch faster.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={storefrontHref} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900 transition hover:-translate-y-0.5 hover:bg-emerald-50">
              View storefront <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/hub/dashboard/products" className="inline-flex items-center gap-2 rounded-2xl bg-[#16C784] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#14b876]">
              Add product <Package className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                {loading ? (
                  <div className="h-9 w-24 bg-gray-100 rounded animate-pulse mt-2" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                )}
                <p className="mt-2 text-xs font-semibold text-gray-400">{stat.hint}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-900">Launch readiness</h3>
              <p className="mt-1 text-sm font-semibold text-gray-500">{completedSetupSteps} of {setupSteps.length} steps completed</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-[#16C784]">{Math.round((completedSetupSteps / setupSteps.length) * 100)}%</p>
              <p className="text-xs font-black uppercase tracking-wide text-gray-400">Ready</p>
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-[#16C784]" style={{ width: `${Math.round((completedSetupSteps / setupSteps.length) * 100)}%` }} />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {setupSteps.map((step) => (
              <Link key={step.label} href={step.href} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:border-[#16C784]/30 hover:bg-emerald-50/40">
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${step.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
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

        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-gray-900">Store health</h3>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-600"><ShieldCheck className="h-4 w-4 text-gray-400" /> Verification</span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${verification?.status === 'approved' || store?.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {verification?.status === 'approved' || store?.is_verified ? 'Approved' : verification?.status || 'Not submitted'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-600"><CreditCard className="h-4 w-4 text-gray-400" /> Payments</span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${store?.payment_config ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Sales (30 days)</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-[#16C784]">
                <TrendingUp className="h-4 w-4" />
                <span className="font-semibold">{formatPrice(totalRevenue30d)}</span>
              </div>
              <span className="text-gray-400">{totalOrders30d} orders</span>
            </div>
          </div>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <div className="h-48 flex items-end gap-[2px]">
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
                      className={`w-full rounded-t transition-all duration-300 ${
                        isToday ? 'bg-[#16C784]' : 'bg-[#16C784]/40 group-hover:bg-[#16C784]/70'
                      }`}
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                        <p className="font-medium">{new Date(day.date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</p>
                        <p className="text-[#16C784]">{formatPrice(day.total)}</p>
                        <p className="text-gray-400">{day.count} order{day.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* X-axis labels */}
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span>{new Date(salesData[0]?.date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</span>
            <span>{new Date(salesData[14]?.date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</span>
            <span>Today</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h3>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentOrders.length > 0 ? (
            <ul className="space-y-4">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 font-medium text-xs">
                      #{order.id.slice(-4)}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {order.customer_email || 'Customer'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('fr-TN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {formatPrice(getOrderTotal(order))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No orders yet</p>
          )}
          <Link
            href="/hub/dashboard/orders"
            className="block mt-4 text-center text-sm font-medium text-[#16C784] hover:text-[#14b876]"
          >
            View all orders →
          </Link>
        </div>
      </div>
    </div>
  );
}
