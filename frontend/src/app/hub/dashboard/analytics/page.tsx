'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Repeat,
  ArrowUpRight,
  Package,
} from 'lucide-react';
import Image from 'next/image';

// ==========================================================
// Types
// ==========================================================

interface RevenueTrend {
  date: string;
  revenue: number;
  orders: number;
}

interface OrderBreakdown {
  status: string;
  count: number;
}

interface TopProduct {
  id: string;
  title: string;
  image_url: string | null;
  revenue: number;
  units_sold: number;
}

interface RevenueByDay {
  day: number;
  label: string;
  revenue: number;
  orders: number;
}

interface KPIs {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  repeat_customer_rate: number;
  conversion_period_growth: number;
}

interface AnalyticsData {
  revenue_trend: RevenueTrend[];
  order_breakdown: OrderBreakdown[];
  top_products: TopProduct[];
  revenue_by_day: RevenueByDay[];
  kpis: KPIs;
}

// ==========================================================
// Helpers
// ==========================================================

function formatPrice(v: number): string {
  return `${v.toFixed(3)} TND`;
}

function formatCompact(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toFixed(v % 1 === 0 ? 0 : 3);
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  processing: '#3B82F6',
  payment_required: '#EF4444',
  fulfilled: '#16C784',
  delivered: '#059669',
  cancelled: '#6B7280',
  refunded: '#8B5CF6',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  processing: 'En cours',
  payment_required: 'Paiement requis',
  fulfilled: 'Expédié',
  delivered: 'Livré',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
};

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

// ==========================================================
// Component
// ==========================================================

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  const fetchAnalytics = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/analytics/store?period=${p}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  const kpis = data?.kpis;
  const trend = data?.revenue_trend || [];
  const maxRevenue = Math.max(...trend.map((d) => d.revenue), 1);
  const breakdown = data?.order_breakdown || [];
  const totalBreakdown = breakdown.reduce((s, b) => s + b.count, 0) || 1;
  const topProducts = data?.top_products || [];
  const maxProductRevenue = topProducts.length > 0 ? topProducts[0].revenue : 1;
  const revenueByDay = data?.revenue_by_day || [];
  const maxDayRevenue = Math.max(...revenueByDay.map((d) => d.revenue), 1);

  const kpiCards = kpis
    ? [
        {
          label: 'Revenu total',
          value: formatPrice(kpis.total_revenue),
          icon: DollarSign,
          accent: 'bg-emerald-500/10 text-emerald-600',
        },
        {
          label: 'Commandes',
          value: String(kpis.total_orders),
          icon: ShoppingCart,
          accent: 'bg-blue-500/10 text-blue-600',
        },
        {
          label: 'Panier moyen',
          value: formatPrice(kpis.avg_order_value),
          icon: Package,
          accent: 'bg-violet-500/10 text-violet-600',
        },
        {
          label: 'Clients fidèles',
          value: `${kpis.repeat_customer_rate}%`,
          icon: Repeat,
          accent: 'bg-amber-500/10 text-amber-600',
        },
        {
          label: 'Croissance',
          value: `${kpis.conversion_period_growth >= 0 ? '+' : ''}${kpis.conversion_period_growth}%`,
          icon: kpis.conversion_period_growth >= 0 ? TrendingUp : TrendingDown,
          accent:
            kpis.conversion_period_growth >= 0
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-red-500/10 text-red-600',
        },
      ]
    : [];

  // Build SVG line chart points
  const chartWidth = 700;
  const chartHeight = 180;
  const chartPadding = 2;
  const points = trend.map((d, i) => {
    const x = chartPadding + (i / Math.max(trend.length - 1, 1)) * (chartWidth - chartPadding * 2);
    const y = chartHeight - chartPadding - (d.revenue / maxRevenue) * (chartHeight - chartPadding * 2);
    return { x, y, ...d };
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1]?.x ?? chartWidth} ${chartHeight} L ${points[0]?.x ?? 0} ${chartHeight} Z`
    : '';

  // Donut chart
  const donutRadius = 60;
  const donutStroke = 16;
  const circumference = 2 * Math.PI * donutRadius;

  let donutOffset = 0;
  const donutSegments = breakdown.map((b) => {
    const pct = b.count / totalBreakdown;
    const dash = circumference * pct;
    const gap = circumference - dash;
    const seg = { ...b, dash, gap, offset: donutOffset, color: STATUS_COLORS[b.status] || '#9CA3AF' };
    donutOffset += dash;
    return seg;
  });

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-2xl shadow-slate-900/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-emerald-100">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight">Performance de votre boutique</h1>
            <p className="mt-1 text-sm text-emerald-50/70">
              Analysez vos ventes, produits et tendances pour optimiser votre activité.
            </p>
          </div>
          {/* Period selector */}
          <div className="flex gap-1 rounded-xl bg-white/10 p-1">
            {([7, 30, 90] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  period === p
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {p}j
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white border border-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">{card.label}</span>
                <div className={`rounded-lg p-2 ${card.accent}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-black text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Revenue Trend + Order Breakdown */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Revenue Trend Chart */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-gray-900">Tendance des revenus</h3>
              <p className="text-xs text-gray-500">
                {period} derniers jours • {formatCompact(kpis?.total_revenue ?? 0)} TND
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              {(kpis?.conversion_period_growth ?? 0) >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span
                className={
                  (kpis?.conversion_period_growth ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'
                }
              >
                {kpis?.conversion_period_growth ?? 0}%
              </span>
            </div>
          </div>
          {loading ? (
            <div className="h-[200px] animate-pulse rounded-lg bg-gray-50" />
          ) : (
            <div className="relative">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[200px]" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16C784" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#16C784" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#16C784"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="3"
                    fill="#16C784"
                    className="opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <title>{`${new Date(p.date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}: ${formatPrice(p.revenue)} (${p.orders} cmd)`}</title>
                  </circle>
                ))}
              </svg>
              <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                <span>
                  {trend[0] &&
                    new Date(trend[0].date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}
                </span>
                <span>
                  {trend[Math.floor(trend.length / 2)] &&
                    new Date(trend[Math.floor(trend.length / 2)].date).toLocaleDateString('fr-TN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                </span>
                <span>Aujourd&apos;hui</span>
              </div>
            </div>
          )}
        </div>

        {/* Order Status Donut */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-base font-black text-gray-900 mb-4">Répartition des commandes</h3>
          {loading ? (
            <div className="h-[180px] animate-pulse rounded-lg bg-gray-50" />
          ) : breakdown.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center text-sm text-gray-400">
              Aucune commande
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <svg width="160" height="160" viewBox="0 0 160 160" className="mb-4">
                {donutSegments.map((seg, i) => (
                  <circle
                    key={i}
                    cx="80"
                    cy="80"
                    r={donutRadius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={donutStroke}
                    strokeDasharray={`${seg.dash} ${seg.gap}`}
                    strokeDashoffset={-seg.offset}
                    transform="rotate(-90 80 80)"
                    className="transition-all duration-500"
                  />
                ))}
                <text x="80" y="76" textAnchor="middle" className="text-2xl font-black fill-gray-900">
                  {totalBreakdown > 1 ? totalBreakdown : breakdown.reduce((s, b) => s + b.count, 0)}
                </text>
                <text x="80" y="94" textAnchor="middle" className="text-xs fill-gray-500">
                  commandes
                </text>
              </svg>
              <div className="space-y-1.5 w-full">
                {breakdown.map((b) => (
                  <div key={b.status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[b.status] || '#9CA3AF' }}
                      />
                      <span className="text-gray-600">{STATUS_LABELS[b.status] || b.status}</span>
                    </div>
                    <span className="font-bold text-gray-900">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Products + Day-of-Week Heatmap */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Top Products */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-base font-black text-gray-900 mb-4">Produits les plus vendus</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-50" />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-gray-400">
              Aucune vente sur cette période
            </div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((product, i) => {
                const barWidth = maxProductRevenue > 0 ? (product.revenue / maxProductRevenue) * 100 : 0;
                return (
                  <div key={product.id} className="flex items-center gap-3 group">
                    <span className="w-6 text-center text-xs font-black text-gray-400">
                      {i + 1}
                    </span>
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt=""
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-lg object-cover border border-gray-100"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Package className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{product.title}</p>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#16C784] transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCompact(product.revenue)}</p>
                      <p className="text-[10px] text-gray-400">{product.units_sold} unités</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Day-of-Week Heatmap */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-base font-black text-gray-900 mb-4">Revenus par jour</h3>
          {loading ? (
            <div className="h-[200px] animate-pulse rounded-lg bg-gray-50" />
          ) : revenueByDay.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
              Pas de données
            </div>
          ) : (
            <div className="space-y-2">
              {DAY_LABELS.map((label, dayIdx) => {
                const dayData = revenueByDay.find((d) => d.day === dayIdx);
                const rev = dayData?.revenue ?? 0;
                const intensity = maxDayRevenue > 0 ? rev / maxDayRevenue : 0;
                return (
                  <div key={dayIdx} className="flex items-center gap-3">
                    <span className="w-8 text-xs font-semibold text-gray-500">{label}</span>
                    <div className="flex-1 h-8 rounded-lg overflow-hidden bg-gray-50 relative">
                      <div
                        className="h-full rounded-lg transition-all duration-500"
                        style={{
                          width: `${Math.max(intensity * 100, 2)}%`,
                          backgroundColor: `hsl(158, 72%, ${65 - intensity * 30}%)`,
                        }}
                      />
                      {rev > 0 && (
                        <span className="absolute inset-y-0 right-2 flex items-center text-xs font-bold text-gray-600">
                          {formatCompact(rev)}
                        </span>
                      )}
                    </div>
                    <span className="w-12 text-right text-[10px] text-gray-400">
                      {dayData?.orders ?? 0} cmd
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
