'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { useDashboardStyle } from '@/contexts/DashboardStyleContext';
import { AnalyticsBentoCockpit, AdsData } from '@/components/dashboard/AnalyticsBentoCockpit';
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
  ExternalLink,
  Sparkles,
  Calendar,
  Target,
} from 'lucide-react';
import Link from 'next/link';

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
  payment_required: '#F43F5E',
  fulfilled: '#0284C7',
  delivered: '#10B981',
  cancelled: '#64748B',
  refunded: '#8B5CF6',
};

// ==========================================================
// Component
// ==========================================================

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const { dashboardStyle } = useDashboardStyle();
  const [adsData, setAdsData] = useState<AdsData | null>(null);
  const { t, locale, dir } = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
  const statusLabels: Record<string, string> = {
    pending: t('dashboardPages.analytics.statusPending'),
    processing: t('dashboardPages.analytics.statusProcessing'),
    payment_required: t('dashboardPages.analytics.statusPaymentRequired'),
    fulfilled: t('dashboardPages.analytics.statusFulfilled'),
    delivered: t('dashboardPages.analytics.statusDelivered'),
    cancelled: t('dashboardPages.analytics.statusCancelled'),
    refunded: t('dashboardPages.analytics.statusRefunded'),
  };
  const dayLabels = [
    t('dashboardPages.analytics.daySun'),
    t('dashboardPages.analytics.dayMon'),
    t('dashboardPages.analytics.dayTue'),
    t('dashboardPages.analytics.dayWed'),
    t('dashboardPages.analytics.dayThu'),
    t('dashboardPages.analytics.dayFri'),
    t('dashboardPages.analytics.daySat'),
  ];

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

  const fetchAds = useCallback(async (p: number) => {
    try {
      const fromDate = new Date(Date.now() - p * 86400000).toISOString().slice(0, 10);
      const toDate = new Date().toISOString().slice(0, 10);
      const [accRes, anRes] = await Promise.all([
        fetchWithCsrf('/api/pd/ads/account', { credentials: 'include' }),
        fetchWithCsrf(`/api/pd/ads/analytics?from=${fromDate}&to=${toDate}&granularity=daily`, { credentials: 'include' }),
      ]);
      if (accRes.ok && anRes.ok) {
        const [accData, anData] = await Promise.all([accRes.json(), anRes.json()]);
        setAdsData({
          account: accData.account || null,
          analytics: anData.summary || null,
          daily: anData.daily || [],
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
    fetchAds(period);
  }, [period, fetchAnalytics, fetchAds]);

  const handleRefresh = async () => {
    await Promise.all([fetchAnalytics(period), fetchAds(period)]);
  };

  const kpis = data?.kpis;
  const trend = data?.revenue_trend || [];
  const maxRevenue = Math.max(...trend.map((d) => d.revenue), 1);
  const breakdown = data?.order_breakdown || [];
  const totalBreakdown = breakdown.reduce((s, b) => s + b.count, 0) || 1;
  const topProducts = data?.top_products || [];
  const maxProductRevenue = topProducts.length > 0 ? topProducts[0].revenue : 1;
  const revenueByDay = data?.revenue_by_day || [];
  const maxDayRevenue = Math.max(...revenueByDay.map((d) => d.revenue), 1);

  // Find best day insight
  const bestDay = revenueByDay.length > 0 ? revenueByDay.reduce((a, b) => (a.revenue > b.revenue ? a : b)) : null;

  const kpiCards = kpis
    ? [
        {
          label: t('dashboardPages.analytics.kpiRevenue'),
          value: formatPrice(kpis.total_revenue),
          icon: DollarSign,
        },
        {
          label: t('dashboardPages.analytics.kpiOrders'),
          value: String(kpis.total_orders),
          icon: ShoppingCart,
        },
        {
          label: t('dashboardPages.analytics.kpiAvgOrder'),
          value: formatPrice(kpis.avg_order_value),
          icon: Package,
        },
        {
          label: t('dashboardPages.analytics.kpiRepeatCustomers'),
          value: `${kpis.repeat_customer_rate}%`,
          icon: Repeat,
        },
        {
          label: t('dashboardPages.analytics.kpiGrowth'),
          value: `${kpis.conversion_period_growth >= 0 ? '+' : ''}${kpis.conversion_period_growth}%`,
          icon: kpis.conversion_period_growth >= 0 ? TrendingUp : TrendingDown,
          growthPositive: kpis.conversion_period_growth >= 0,
        },
      ]
    : [];

  // Build SVG line chart points
  const chartWidth = 700;
  const chartHeight = 180;
  const chartPadding = 4;
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
  const donutStroke = 14;
  const circumference = 2 * Math.PI * donutRadius;

  let donutOffset = 0;
  const donutSegments = breakdown.map((b) => {
    const pct = b.count / totalBreakdown;
    const dash = circumference * pct;
    const gap = circumference - dash;
    const seg = { ...b, dash, gap, offset: donutOffset, color: STATUS_COLORS[b.status] || '#94A3B8' };
    donutOffset += dash;
    return seg;
  });

  // Grid lines for revenue chart
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: chartHeight - chartPadding - pct * (chartHeight - chartPadding * 2),
    label: formatCompact(maxRevenue * pct),
  }));

  return (
    <div className="space-y-6" dir={dir}>
      {dashboardStyle === 'bento' ? (
        <AnalyticsBentoCockpit
          data={data}
          adsData={adsData}
          period={period}
          onPeriodChange={(p) => setPeriod(p)}
          loading={loading}
          onRefresh={handleRefresh}
          dir={dir}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {t('dashboardPages.analytics.title')}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {t('dashboardPages.analytics.badge')}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-normal">
              {t('dashboardPages.analytics.subtitle')}
            </p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs self-start sm:self-auto">
          {([7, 30, 90] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('dashboardPages.analytics.periodButton', { p })}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {card.label}
                </span>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Insights */}
      {!loading && kpis && (
        <div className="flex flex-wrap gap-2.5">
          {bestDay && bestDay.revenue > 0 && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span>
                {t('dashboardPages.analytics.bestDayPrefix')} <strong>{dayLabels[bestDay.day]}</strong> {t('dashboardPages.analytics.bestDaySuffix', { revenue: formatPrice(bestDay.revenue) })}
              </span>
            </div>
          )}
          {kpis.total_orders > 0 && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
              <Target className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span>
                {t('dashboardPages.analytics.ordersOverPeriod', { count: kpis.total_orders, s: kpis.total_orders > 1 ? 's' : '', period })}
              </span>
            </div>
          )}
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>
              {t('dashboardPages.analytics.periodLabel', { period })}
            </span>
          </div>
        </div>
      )}

      {/* Revenue Trend + Order Breakdown */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Revenue Trend Chart */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('dashboardPages.analytics.revenueTrendTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                {t('dashboardPages.analytics.revenueTrendSubtitle', { period, revenue: formatCompact(kpis?.total_revenue ?? 0) })}
              </p>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${(kpis?.conversion_period_growth ?? 0) >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800'}`}>
              {(kpis?.conversion_period_growth ?? 0) >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>{kpis?.conversion_period_growth ?? 0}%</span>
            </div>
          </div>
          {loading ? (
            <div className="h-[220px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50" />
          ) : (
            <div className="relative pt-2">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[220px]" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F172A" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#0F172A" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="areaGradDark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#F8FAFC" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {gridLines.map((gl, i) => (
                  <line key={i} x1="0" y1={gl.y} x2={chartWidth} y2={gl.y} className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="1" />
                ))}
                {areaPath && (
                  <>
                    <path d={areaPath} fill="url(#areaGrad)" className="dark:hidden" />
                    <path d={areaPath} fill="url(#areaGradDark)" className="hidden dark:block" />
                  </>
                )}
                {linePath && (
                  <path d={linePath} fill="none" className="stroke-slate-900 dark:stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                )}
                {points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="4" className="fill-white dark:fill-slate-900 stroke-slate-900 dark:stroke-white opacity-0 hover:opacity-100 transition-opacity cursor-pointer" strokeWidth="2">
                    <title>{t('dashboardPages.analytics.chartTooltip', { date: new Date(p.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' }), revenue: formatPrice(p.revenue), orders: p.orders })}</title>
                  </circle>
                ))}
              </svg>
              {/* Y-axis labels */}
              <div className="absolute left-0 top-2 bottom-6 flex flex-col justify-between py-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono pointer-events-none">
                {gridLines.slice().reverse().map((gl, i) => (
                  <span key={i}>{gl.label}</span>
                ))}
              </div>
              {/* X-axis labels */}
              <div className="flex justify-between mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                <span>
                  {trend[0] && new Date(trend[0].date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                </span>
                <span>
                  {trend[Math.floor(trend.length / 2)] && new Date(trend[Math.floor(trend.length / 2)].date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                </span>
                <span>{t('dashboardPages.analytics.today')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Order Status Donut */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('dashboardPages.analytics.orderBreakdownTitle')}
          </h3>
          {loading ? (
            <div className="h-[180px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50" />
          ) : breakdown.length === 0 ? (
            <div className="flex h-[180px] flex-col items-center justify-center text-center">
              <ShoppingCart className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('dashboardPages.analytics.noOrders')}</p>
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{t('dashboardPages.analytics.noOrdersHint')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <svg width="150" height="150" viewBox="0 0 160 160" className="mb-3">
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
                <text x="80" y="76" textAnchor="middle" className="text-xl font-semibold fill-slate-900 dark:fill-white">
                  {totalBreakdown > 1 ? totalBreakdown : breakdown.reduce((s, b) => s + b.count, 0)}
                </text>
                <text x="80" y="94" textAnchor="middle" className="text-[11px] font-medium fill-slate-400 dark:fill-slate-500">
                  {t('dashboardPages.analytics.ordersCount')}
                </text>
              </svg>
              <div className="space-y-1.5 w-full">
                {breakdown.map((b) => {
                  const pct = Math.round((b.count / totalBreakdown) * 100);
                  return (
                    <div key={b.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[b.status] || '#94A3B8' }} />
                        <span className="text-slate-600 dark:text-slate-400 font-normal">{statusLabels[b.status] || b.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">{pct}%</span>
                        <span className="font-medium text-slate-900 dark:text-white">{b.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Products + Day-of-Week Heatmap */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Top Products */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('dashboardPages.analytics.topProductsTitle')}
            </h3>
            <Link href="/hub/dashboard/products" className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              {t('dashboardPages.analytics.viewAllProducts')}
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50" />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <div className="flex h-36 flex-col items-center justify-center text-center">
              <Package className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('dashboardPages.analytics.noSales')}</p>
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{t('dashboardPages.analytics.noSalesHint')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((product, i) => {
                const barWidth = maxProductRevenue > 0 ? (product.revenue / maxProductRevenue) * 100 : 0;
                return (
                  <Link
                    key={product.id}
                    href={`/hub/dashboard/products?edit=${product.id}`}
                    className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 group"
                  >
                    {/* Rank badge */}
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                      {i + 1}
                    </span>

                    {/* Product image */}
                    {product.image_url ? (
                      <img
                        src={product.image_url ? getResizedImageUrl(product.image_url, 'medium') : ''}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover border border-slate-200/80 dark:border-slate-800 shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-800">
                        <Package className="h-4 w-4 text-slate-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                        {product.title}
                      </p>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-900 dark:bg-white transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{formatCompact(product.revenue)} TND</p>
                      <p className="text-[10px] font-normal text-slate-400">{t('dashboardPages.analytics.units', { count: product.units_sold, s: product.units_sold > 1 ? 's' : '' })}</p>
                    </div>

                    <ExternalLink className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Day-of-Week Heatmap */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('dashboardPages.analytics.revenueByDayTitle')}
          </h3>
          {loading ? (
            <div className="h-[200px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50" />
          ) : revenueByDay.length === 0 ? (
            <div className="flex h-[200px] flex-col items-center justify-center text-center">
              <Calendar className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('dashboardPages.analytics.noData')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dayLabels.map((label, dayIdx) => {
                const dayData = revenueByDay.find((d) => d.day === dayIdx);
                const rev = dayData?.revenue ?? 0;
                const intensity = maxDayRevenue > 0 ? rev / maxDayRevenue : 0;
                const isBest = bestDay && bestDay.day === dayIdx && rev > 0;
                return (
                  <div key={dayIdx} className="flex items-center gap-2.5">
                    <span className={`w-8 text-xs font-medium ${isBest ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                      {label}
                    </span>
                    <div className="flex-1 h-6 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                      <div
                        className="h-full rounded-md transition-all duration-500 bg-slate-900 dark:bg-white"
                        style={{
                          width: `${Math.max(intensity * 100, 2)}%`,
                          opacity: Math.max(0.2, intensity),
                        }}
                      />
                      {rev > 0 && (
                        <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-semibold text-slate-700 dark:text-slate-300 font-mono">
                          {formatCompact(rev)}
                        </span>
                      )}
                    </div>
                    <span className="w-12 text-right text-[10px] font-normal text-slate-400">
                      {t('dashboardPages.analytics.ordersShort', { count: dayData?.orders ?? 0 })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
