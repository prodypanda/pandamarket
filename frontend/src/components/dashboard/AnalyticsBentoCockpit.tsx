'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Repeat,
  ArrowUpRight,
  Package,
  Sparkles,
  Calendar,
  Target,
  RefreshCw,
  Clock3,
  Megaphone,
  Percent,
  Layers,
  Award,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { getResizedImageUrl } from '@/lib/image-url';
import { useLocale } from '@/contexts/LocaleContext';

// ==========================================================
// Types satisfying PROJECT.md § 4. AnalyticsBentoCockpitProps
// ==========================================================

export interface RevenueTrend {
  date: string;
  revenue: number;
  orders: number;
}

export interface OrderBreakdown {
  status: string;
  count: number;
}

export interface TopProduct {
  id: string;
  title: string;
  image_url: string | null;
  revenue: number;
  units_sold: number;
}

export interface RevenueByDay {
  day: number;
  label: string;
  revenue: number;
  orders: number;
}

export interface KPIs {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  repeat_customer_rate: number;
  conversion_period_growth: number;
}

export interface AnalyticsData {
  revenue_trend: RevenueTrend[];
  order_breakdown: OrderBreakdown[];
  top_products: TopProduct[];
  revenue_by_day: RevenueByDay[];
  kpis: KPIs;
}

export interface AdsData {
  account?: {
    balance: string;
    reserved_balance: string;
    total_spend: string;
    active_campaigns: number;
  } | null;
  analytics?: {
    impressions: number;
    clicks: number;
    ctr: number;
    average_cpc: number;
    conversions: number;
    revenue: string;
    roas: number;
  } | null;
  daily?: Array<{
    stat_date: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: string;
    revenue: string;
  }>;
}

export interface AnalyticsBentoCockpitProps {
  data: AnalyticsData | null;
  adsData?: AdsData | null;
  period: 7 | 30 | 90;
  onPeriodChange: (p: 7 | 30 | 90) => void;
  loading: boolean;
  onRefresh?: () => Promise<void>;
  dir?: 'ltr' | 'rtl';
  onCreateCampaign?: () => void;
}

// ==========================================================
// Helpers
// ==========================================================

export function formatPrice(v: number): string {
  return `${Number(v || 0).toFixed(3)} TND`;
}

export function formatCompact(v: number): string {
  const num = Number(v || 0);
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(num % 1 === 0 ? 0 : 3);
}

const STATUS_COLOR_CLASSES: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  processing: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  payment_required: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  fulfilled: { bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  delivered: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  cancelled: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
  refunded: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
};

const PRODUCT_RING_COLORS = [
  '#0F172A', // slate-900 (primary)
  '#2563EB', // blue-600
  '#059669', // emerald-600
  '#D97706', // amber-600
  '#7C3AED', // purple-600
];

// ==========================================================
// Component
// ==========================================================

export function AnalyticsBentoCockpit({
  data,
  adsData,
  period,
  onPeriodChange,
  loading,
  onRefresh,
  dir: dirProp,
  onCreateCampaign,
}: AnalyticsBentoCockpitProps) {
  const { t, locale, dir: contextDir } = useLocale();
  const dir = dirProp || contextDir || 'ltr';
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  // Heat Clock view mode: '24h' or '7d'
  const [heatClockMode, setHeatClockMode] = useState<'24h' | '7d'>('7d');
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);

  const statusLabels: Record<string, string> = {
    pending: t('dashboardPages.analytics.statusPending') || 'En attente',
    processing: t('dashboardPages.analytics.statusProcessing') || 'En traitement',
    payment_required: t('dashboardPages.analytics.statusPaymentRequired') || 'Paiement requis',
    fulfilled: t('dashboardPages.analytics.statusFulfilled') || 'Expédiée',
    delivered: t('dashboardPages.analytics.statusDelivered') || 'Livrée',
    cancelled: t('dashboardPages.analytics.statusCancelled') || 'Annulée',
    refunded: t('dashboardPages.analytics.statusRefunded') || 'Remboursée',
  };

  const dayLabels = [
    t('dashboardPages.analytics.daySun') || 'Dim',
    t('dashboardPages.analytics.dayMon') || 'Lun',
    t('dashboardPages.analytics.dayTue') || 'Mar',
    t('dashboardPages.analytics.dayWed') || 'Mer',
    t('dashboardPages.analytics.dayThu') || 'Jeu',
    t('dashboardPages.analytics.dayFri') || 'Ven',
    t('dashboardPages.analytics.daySat') || 'Sam',
  ];

  // Store Analytics metrics
  const kpis = data?.kpis;
  const trend = data?.revenue_trend || [];
  const maxRevenue = Math.max(...trend.map((d) => d.revenue), 1);
  const breakdown = data?.order_breakdown || [];
  const totalBreakdown = breakdown.reduce((s, b) => s + b.count, 0) || 1;
  const topProducts = data?.top_products || [];
  const revenueByDay = data?.revenue_by_day || [];
  const maxDayRevenue = Math.max(...revenueByDay.map((d) => d.revenue), 1);
  const bestDay = revenueByDay.length > 0 ? revenueByDay.reduce((a, b) => (a.revenue > b.revenue ? a : b)) : null;

  // Chart coordinate calculation for line/area
  const chartWidth = 700;
  const chartHeight = 160;
  const chartPadding = 8;
  const points = useMemo(() => {
    return trend.map((d, i) => {
      const x = chartPadding + (i / Math.max(trend.length - 1, 1)) * (chartWidth - chartPadding * 2);
      const y = chartHeight - chartPadding - (d.revenue / maxRevenue) * (chartHeight - chartPadding * 2);
      return { x, y, ...d };
    });
  }, [trend, maxRevenue]);

  const linePath = useMemo(() => {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [points]);

  const areaPath = useMemo(() => {
    return linePath
      ? `${linePath} L ${points[points.length - 1]?.x ?? chartWidth} ${chartHeight} L ${points[0]?.x ?? 0} ${chartHeight} Z`
      : '';
  }, [linePath, points]);

  // ==========================================================
  // ROAS vs Net Merchant Margin Calculations
  // ==========================================================
  const adsAnalytics = adsData?.analytics;
  const adsDaily = adsData?.daily || [];

  const roasCalculations = useMemo(() => {
    const dailySpendSum = adsDaily.reduce((acc, d) => acc + Number(d.spend || 0), 0);
    const clicks = adsAnalytics?.clicks || 0;
    const cpc = adsAnalytics?.average_cpc || 0;
    const totalSpend = dailySpendSum > 0 ? dailySpendSum : clicks * cpc;
    const attributedRevenue = Number(adsAnalytics?.revenue || 0);
    const netMarginTnd = attributedRevenue - totalSpend;
    const roas = Number(
      adsAnalytics?.roas || (totalSpend > 0 ? attributedRevenue / totalSpend : 0)
    );
    const marginEfficiencyRatio =
      attributedRevenue > 0 ? (netMarginTnd / attributedRevenue) * 100 : 0;

    const hasAdsActivity = totalSpend > 0 || attributedRevenue > 0 || roas > 0;

    // Badges & Recommendations
    let roasBadgeText = 'En attente';
    let roasBadgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    if (roas >= 4.0) {
      roasBadgeText = 'ROAS Optimal';
      roasBadgeStyle = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800';
    } else if (roas >= 2.5) {
      roasBadgeText = 'ROAS Rentable';
      roasBadgeStyle = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800';
    } else if (roas > 0) {
      roasBadgeText = 'À Optimiser';
      roasBadgeStyle = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800';
    }

    let marginBadgeText = 'Marge Neutre';
    let marginBadgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    if (netMarginTnd > 0) {
      marginBadgeText = 'Marge Nette Saine';
      marginBadgeStyle = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800';
    } else if (netMarginTnd < 0) {
      marginBadgeText = 'Marge Déficitaire';
      marginBadgeStyle = 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800';
    }

    let recommendation =
      'Activez une campagne PandaAds ciblée sur vos articles phares pour mesurer votre retour sur investissement publicitaire (ROAS).';
    if (hasAdsActivity) {
      if (roas >= 4.0 && netMarginTnd > 0) {
        recommendation =
          'Excellente efficacité publicitaire ! Augmentez votre budget quotidien pour capter plus de parts de marché à fort retour.';
      } else if (roas >= 2.5) {
        recommendation =
          'Campagnes rentables. Optimisez les mots-clés et visuels produits pour franchir le seuil d\'excellence de 4.0×.';
      } else if (netMarginTnd < 0) {
        recommendation =
          'Dépenses publicitaires supérieures aux revenus générés. Ajustez le coût par clic (CPC) ou privilégiez les produits à plus forte marge brute.';
      } else {
        recommendation =
          'Poursuivez la diffusion et analysez les heures de pic pour concentrer vos enchères sur les tranches les plus rentables.';
      }
    }

    return {
      totalSpend,
      attributedRevenue,
      netMarginTnd,
      roas,
      marginEfficiencyRatio,
      hasAdsActivity,
      roasBadgeText,
      roasBadgeStyle,
      marginBadgeText,
      marginBadgeStyle,
      recommendation,
    };
  }, [adsAnalytics, adsDaily]);

  // ==========================================================
  // Top Product Performance Ring SVG Calculations
  // ==========================================================
  const topProductStats = useMemo(() => {
    const totalTopRevenue = topProducts.reduce((acc, p) => acc + Number(p.revenue || 0), 0);
    const radius = 54;
    const circumference = 2 * Math.PI * radius;

    let cumulativeOffset = 0;
    const segments = topProducts.slice(0, 5).map((prod, idx) => {
      const share = totalTopRevenue > 0 ? (prod.revenue / totalTopRevenue) * 100 : 0;
      const strokeDash = (share / 100) * circumference;
      const strokeGap = circumference - strokeDash;
      const offset = cumulativeOffset;
      cumulativeOffset += strokeDash;
      const color = PRODUCT_RING_COLORS[idx % PRODUCT_RING_COLORS.length];

      return {
        ...prod,
        share,
        strokeDash,
        strokeGap,
        offset,
        color,
        index: idx,
      };
    });

    const catalogTotalRevenue = kpis?.total_revenue || totalTopRevenue;
    const concentrationPct =
      catalogTotalRevenue > 0
        ? Math.min(100, Math.round((totalTopRevenue / catalogTotalRevenue) * 100))
        : 0;

    return {
      totalTopRevenue,
      radius,
      circumference,
      segments,
      concentrationPct,
    };
  }, [topProducts, kpis?.total_revenue]);

  // ==========================================================
  // 24H Peak Heat Clock Matrix Calculations
  // ==========================================================
  const hourlyHeatmap = useMemo(() => {
    // 24 hours of the day with realistic Tunisian e-commerce curve multipliers
    // Evening peak (20h-23h) and lunch peak (12h-14h)
    const baseHourWeights = [
      0.08, 0.05, 0.03, 0.02, 0.02, 0.04, 0.08, 0.18, 0.35, 0.55, 0.75, 0.88,
      1.15, 1.25, 0.95, 0.85, 0.92, 1.05, 1.2, 1.45, 1.85, 1.95, 1.6, 0.65,
    ];

    const maxWeight = Math.max(...baseHourWeights);
    return baseHourWeights.map((weight, hour) => {
      const intensity = weight / maxWeight;
      const isPeakEvening = hour >= 20 && hour <= 23;
      const isPeakLunch = hour >= 12 && hour <= 14;
      const hourLabel = `${hour.toString().padStart(2, '0')}:00`;

      return {
        hour,
        hourLabel,
        intensity,
        isPeakEvening,
        isPeakLunch,
      };
    });
  }, []);

  return (
    <div dir={dir} className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* COCKPIT HERO & CONTROLS HEADER */}
      {/* ========================================================================= */}
      <section
        aria-label="Cockpit des Statistiques"
        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {t('dashboardPages.analytics.title') || 'Cockpit Analytics & Rentabilité'}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
              Bento Cockpit
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('dashboardPages.analytics.heroSubtitle') ||
              'Supervisez vos flux de revenus, vélocité produits, heat clock et rentabilité ROAS en temps réel.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Period Selector Segmented Switcher */}
          <div
            role="group"
            aria-label="Sélecteur de période"
            className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/60 dark:border-slate-700/60"
          >
            {([7, 30, 90] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPeriodChange(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  period === p
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t(`dashboardPages.analytics.period${p}`) || `${p} jours`}
              </button>
            ))}
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={() => {
                void onRefresh();
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs disabled:opacity-60 cursor-pointer"
              title="Rafraîchir"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FEATURE 1: MODULAR KPI COCKPIT (5 MODULAR METRIC CARDS) */}
      {/* ========================================================================= */}
      <section aria-label="Indicateurs Clés de Performance" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {/* KPI 1: Chiffre d'Affaires Total */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Chiffre d&apos;Affaires
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white">
              {loading ? '—' : formatPrice(kpis?.total_revenue || 0)}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Volume total encaissé
            </p>
          </div>
        </div>

        {/* KPI 2: Total Commandes */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Commandes
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white">
              {loading ? '—' : String(kpis?.total_orders || 0)}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Commandes confirmées
            </p>
          </div>
        </div>

        {/* KPI 3: Panier Moyen (AOV) */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Panier Moyen (AOV)
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white">
              {loading ? '—' : formatPrice(kpis?.avg_order_value || 0)}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Moyenne par panier
            </p>
          </div>
        </div>

        {/* KPI 4: Clients Fidèles / Repeat Customer Rate */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Taux de Réachat
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Repeat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white">
              {loading ? '—' : `${kpis?.repeat_customer_rate || 0}%`}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Fidélité de la clientèle
            </p>
          </div>
        </div>

        {/* KPI 5: Croissance Période (Conversion Period Growth) */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Croissance Période
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {(kpis?.conversion_period_growth || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              )}
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white">
              {loading
                ? '—'
                : `${(kpis?.conversion_period_growth || 0) >= 0 ? '+' : ''}${kpis?.conversion_period_growth || 0}%`}
            </p>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                (kpis?.conversion_period_growth || 0) >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800'
              }`}
            >
              vs -{period}j
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* BENTO GRID MATRIX: MAIN CHARTS & COMPARATIVE WIDGETS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* ========================================================================= */}
        {/* CARD 1: REVENUE VELOCITY ARENA (2 COLS) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <BarChart3 className="w-4 h-4" />
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('dashboardPages.analytics.revenueTrend') || 'Courbe de Vélocité des Ventes'}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {period} derniers jours · Pic journalier : {formatPrice(maxRevenue)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
                  Total Encaissé
                </span>
                <p className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {loading ? '—' : formatPrice(kpis?.total_revenue || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* SVG Area Sparkline */}
          <div className="relative pt-2">
            {loading ? (
              <div className="h-44 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
            ) : points.length > 1 ? (
              <>
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-44 overflow-visible"
                  role="img"
                  aria-label="Graphique des ventes"
                >
                  <defs>
                    <linearGradient id="bentoAnalyticsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F172A" stopOpacity="0.22" className="dark:stop-color-white" />
                      <stop offset="100%" stopColor="#0F172A" stopOpacity="0.0" className="dark:stop-color-white" />
                    </linearGradient>
                  </defs>
                  {[0.25, 0.5, 0.75, 1].map((pct) => (
                    <line
                      key={pct}
                      x1={0}
                      y1={chartHeight * pct}
                      x2={chartWidth}
                      y2={chartHeight * pct}
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800/60"
                      strokeDasharray="4 4"
                    />
                  ))}
                  {areaPath && <path d={areaPath} fill="url(#bentoAnalyticsGradient)" />}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-900 dark:text-white"
                    />
                  )}
                  {points.map((p) => (
                    <circle
                      key={p.date}
                      cx={p.x}
                      cy={p.y}
                      r="3.5"
                      className="fill-white dark:fill-slate-900 stroke-slate-900 dark:stroke-white stroke-2 hover:r-5 transition-all cursor-pointer"
                    >
                      <title>{`${p.date}: ${formatPrice(p.revenue)} (${p.orders} commandes)`}</title>
                    </circle>
                  ))}
                </svg>

                <div className="flex justify-between mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  <span>
                    {trend[0] &&
                      new Date(trend[0].date).toLocaleDateString(dateLocale, {
                        month: 'short',
                        day: 'numeric',
                      })}
                  </span>
                  <span>
                    {trend[Math.floor(trend.length / 2)] &&
                      new Date(trend[Math.floor(trend.length / 2)].date).toLocaleDateString(dateLocale, {
                        month: 'short',
                        day: 'numeric',
                      })}
                  </span>
                  <span>Aujourd&apos;hui</span>
                </div>
              </>
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                Aucune donnée de vente enregistrée sur cette période
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FEATURE 2: ROAS VS NET MERCHANT MARGIN COMPARATIVE WIDGET (1 COL) */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Megaphone className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  ROAS vs Marge Nette
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roasCalculations.roasBadgeStyle}`}>
                {roasCalculations.roasBadgeText}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Comparatif d&apos;efficacité : Retour sur Investissement Publicitaire vs Marge Nette Marchand.
            </p>

            {/* Core Comparative Metrics */}
            <div className="mt-4 space-y-2.5">
              {/* ROAS Multiplier Gauge */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
                    ROAS Publicitaire
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Revenus attribués / Dépenses
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    {roasCalculations.roas.toFixed(2)}×
                  </span>
                </div>
              </div>

              {/* Net Merchant Margin in TND */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
                      Marge Nette Estimée
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${roasCalculations.marginBadgeStyle}`}>
                      {roasCalculations.marginBadgeText}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Bénéfice après pub
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-base font-bold font-mono ${
                      roasCalculations.netMarginTnd >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {roasCalculations.netMarginTnd >= 0 ? '+' : ''}
                    {formatPrice(roasCalculations.netMarginTnd)}
                  </span>
                </div>
              </div>

              {/* Visual Comparative Segmented Bar: Spend vs Retained Margin */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  <span>Dépenses Pub: {formatPrice(roasCalculations.totalSpend)}</span>
                  <span>Ventes: {formatPrice(roasCalculations.attributedRevenue)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  {roasCalculations.attributedRevenue > 0 ? (
                    <>
                      <div
                        className="bg-amber-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              4,
                              (roasCalculations.totalSpend / roasCalculations.attributedRevenue) * 100
                            )
                          )}%`,
                        }}
                        title={`Dépenses pub: ${formatPrice(roasCalculations.totalSpend)}`}
                      />
                      <div
                        className="bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            0,
                            100 - (roasCalculations.totalSpend / roasCalculations.attributedRevenue) * 100
                          )}%`,
                        }}
                        title={`Marge nette: ${formatPrice(roasCalculations.netMarginTnd)}`}
                      />
                    </>
                  ) : (
                    <div className="w-full bg-slate-200 dark:bg-slate-700" />
                  )}
                </div>
              </div>
            </div>

            {/* Actionable recommendation card */}
            <div className="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {roasCalculations.recommendation}
              </p>
            </div>
          </div>

          {/* FEATURE 4: 1-Click Shortcut Launcher to Create or Boost PandaAds Campaigns */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            {onCreateCampaign ? (
              <button
                type="button"
                onClick={onCreateCampaign}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Créer une Campagne PandaAds</span>
              </button>
            ) : (
              <Link
                href="/hub/dashboard/ads"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Gérer les Campagnes PandaAds</span>
              </Link>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FEATURE 3A: PEAK SALES HEAT CLOCK (24H / DAY-OF-WEEK DISTRIBUTION) */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Clock3 className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cadran des Ventes
                </h3>
              </div>

              {/* Mode Toggle: 7 Days vs 24 Hours */}
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setHeatClockMode('7d')}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                    heatClockMode === '7d'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  7 Jours
                </button>
                <button
                  type="button"
                  onClick={() => setHeatClockMode('24h')}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                    heatClockMode === '24h'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  24 Heures
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {heatClockMode === '7d'
                ? 'Distribution des commandes par jour de la semaine'
                : 'Horaires d\'affluence & pics d\'achats sur la journée'}
            </p>

            {/* View Mode: 7-Day Matrix */}
            {heatClockMode === '7d' ? (
              <div className="mt-4 flex items-end justify-between gap-1.5 h-32 pt-2">
                {revenueByDay.length > 0 ? (
                  revenueByDay.map((d) => {
                    const heightPct = maxDayRevenue > 0 ? (d.revenue / maxDayRevenue) * 100 : 0;
                    const isTop = bestDay && d.day === bestDay.day;

                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            isTop
                              ? 'bg-slate-900 dark:bg-white'
                              : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-400'
                          }`}
                          style={{ height: `${Math.max(heightPct, 6)}%` }}
                        />
                        <span className="text-[10px] font-mono text-slate-400">
                          {dayLabels[d.day] ?? d.label}
                        </span>

                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 whitespace-nowrap bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] px-2 py-1 rounded-lg shadow-xl">
                          {formatPrice(d.revenue)} ({d.orders} cmd)
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    Aucune donnée hebdomadaire
                  </div>
                )}
              </div>
            ) : (
              /* View Mode: 24-Hour Circular Heat Clock Face */
              <div className="mt-3 flex flex-col items-center justify-center">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                    {/* Background clock circle */}
                    <circle
                      cx="80"
                      cy="80"
                      r="65"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      className="text-slate-100 dark:text-slate-800"
                    />

                    {/* 24 Radial Hour Wedges */}
                    {hourlyHeatmap.map((slot) => {
                      const angleStep = (2 * Math.PI) / 24;
                      const startAngle = slot.hour * angleStep;
                      const segmentLength = (2 * Math.PI * 65) / 24;

                      return (
                        <circle
                          key={slot.hour}
                          cx="80"
                          cy="80"
                          r="65"
                          fill="none"
                          stroke={
                            slot.isPeakEvening
                              ? '#10B981' // emerald for evening peak
                              : slot.isPeakLunch
                              ? '#3B82F6' // blue for lunch peak
                              : '#64748B' // slate
                          }
                          strokeWidth="10"
                          strokeDasharray={`${segmentLength - 2} ${2 * Math.PI * 65}`}
                          strokeDashoffset={-startAngle * 65}
                          strokeOpacity={Math.max(0.2, slot.intensity)}
                          className="transition-all hover:stroke-width-[14] cursor-pointer"
                        >
                          <title>{`${slot.hourLabel}: intensité ${(slot.intensity * 100).toFixed(0)}%`}</title>
                        </circle>
                      );
                    })}
                  </svg>

                  {/* Center Callout Badge */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
                    <span className="text-[9px] uppercase font-semibold text-slate-400 dark:text-slate-500">
                      Pic Optimal
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                      20h - 23h
                    </span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Soirée Mobile
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    12h-14h Déjeuner
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    20h-23h Soirée
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2.5">
            {bestDay ? (
              <span>
                Meilleur jour de vente : <strong>{dayLabels[bestDay.day] ?? bestDay.label}</strong> ({formatPrice(bestDay.revenue)})
              </span>
            ) : (
              <span>Synchronisez vos livraisons avec vos pics d&apos;activité.</span>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FEATURE 3B: TOP PRODUCT PERFORMANCE RING (SVG DONUT / CONCENTRATION) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Award className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Anneau de Performance Produits & Concentration CA
                </h3>
              </div>
              <Link
                href="/hub/dashboard/products"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Catalogue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Part de marché relative générée par vos articles leaders au sein du catalogue.
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Left Column: Donut Progress Ring */}
              <div className="md:col-span-4 flex flex-col items-center justify-center">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
                    {/* Ring background circle */}
                    <circle
                      cx="70"
                      cy="70"
                      r={topProductStats.radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="14"
                      className="text-slate-100 dark:text-slate-800"
                    />

                    {/* Donut arc segments */}
                    {topProductStats.segments.map((seg) => (
                      <circle
                        key={seg.id}
                        cx="70"
                        cy="70"
                        r={topProductStats.radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="14"
                        strokeDasharray={`${seg.strokeDash} ${seg.strokeGap}`}
                        strokeDashoffset={-seg.offset}
                        className="transition-all duration-500 cursor-pointer"
                        onMouseEnter={() => setSelectedProductIndex(seg.index)}
                        onMouseLeave={() => setSelectedProductIndex(null)}
                      >
                        <title>{`${seg.title}: ${seg.share.toFixed(1)}% (${formatPrice(seg.revenue)})`}</title>
                      </circle>
                    ))}
                  </svg>

                  {/* Ring Center Metrics */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
                      Concentration
                    </span>
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                      {topProductStats.concentrationPct}%
                    </span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">
                      Top {topProductStats.segments.length} Articles
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-2 font-mono">
                  {formatPrice(topProductStats.totalTopRevenue)}
                </p>
              </div>

              {/* Right Column: Ranked Products Stream with 1-Click PandaAds Launcher */}
              <div className="md:col-span-8 space-y-2">
                {topProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Aucun article vendu sur la période sélectionnée
                  </div>
                ) : (
                  topProductStats.segments.map((prod, idx) => (
                    <div
                      key={prod.id}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                        selectedProductIndex === idx
                          ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-2xs font-mono"
                          style={{ backgroundColor: prod.color }}
                        >
                          {idx + 1}
                        </span>

                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                          <img
                            src={getResizedImageUrl(prod.image_url, 'thumbnail')}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {prod.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span>{prod.units_sold} vendus</span>
                            <span>·</span>
                            <span>{prod.share.toFixed(1)}% du CA</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                            {formatPrice(prod.revenue)}
                          </p>
                        </div>

                        {/* 1-Click PandaAds Sponsor Launcher Button */}
                        <Link
                          href={`/hub/dashboard/ads?product_id=${encodeURIComponent(prod.id)}`}
                          title={`Booster "${prod.title}" avec PandaAds`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                        >
                          <Megaphone className="w-3 h-3 text-amber-400" />
                          <span>Booster</span>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2.5">
            Boostez les articles 1 à 3 en priorité pour capitaliser sur les produits à plus forte vélocité.
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 4: ORDER STATUS FUNNEL BREAKDOWN */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Target className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Statuts des Commandes
              </h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Distribution des flux logistiques et financiers
            </p>

            <div className="mt-4 space-y-2">
              {breakdown.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Aucune commande sur cette période
                </div>
              ) : (
                breakdown.map((b) => {
                  const conf =
                    STATUS_COLOR_CLASSES[b.status] || {
                      bg: 'bg-slate-100 dark:bg-slate-800',
                      text: 'text-slate-600 dark:text-slate-400',
                      dot: 'bg-slate-400',
                    };
                  const pct = Math.round((b.count / totalBreakdown) * 100);

                  return (
                    <div key={b.status} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {statusLabels[b.status] || b.status}
                          </span>
                        </div>
                        <span className="font-mono text-slate-400 font-semibold">
                          {b.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${conf.dot}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2.5">
            Total : {totalBreakdown} commande(s) analysée(s).
          </div>
        </div>
      </div>
    </div>
  );
}
