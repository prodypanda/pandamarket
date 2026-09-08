'use client';

import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Repeat,
  Package,
  Sparkles,
  Calendar,
  RefreshCw,
  Award,
  Zap,
  CheckCircle2,
  Megaphone,
} from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { getResizedImageUrl } from '@/lib/image-url';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
} from './ReGoPrimitives';
import type {
  AnalyticsData,
  AdsData,
  RevenueTrend,
  TopProduct,
} from '@/components/dashboard/AnalyticsBentoCockpit';

export interface AnalyticsReGoCockpitProps {
  data: AnalyticsData | null;
  adsData?: AdsData | null;
  period: 7 | 30 | 90;
  onPeriodChange: (period: 7 | 30 | 90) => void;
  loading: boolean;
  onRefresh: () => Promise<void>;
  dir?: 'ltr' | 'rtl';
}

function toNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function AnalyticsReGoCockpit({
  data,
  adsData,
  period,
  onPeriodChange,
  loading,
  onRefresh,
  dir = 'ltr',
}: AnalyticsReGoCockpitProps) {
  const { t } = useLocale();

  const totalRevenue = toNumber(data?.kpis?.total_revenue);
  const totalOrders = toNumber(data?.kpis?.total_orders);
  const avgOrderValue = toNumber(data?.kpis?.avg_order_value);
  const repeatRate = toNumber(data?.kpis?.repeat_customer_rate);

  // SVG Chart Dimensions
  const trend = data?.revenue_trend || [];
  const maxRev = useMemo(() => {
    if (trend.length === 0) return 100;
    return Math.max(...trend.map((t) => t.revenue), 10);
  }, [trend]);

  const svgPoints = useMemo(() => {
    if (trend.length === 0) return '';
    const width = 500;
    const height = 140;
    const padding = 15;

    return trend
      .map((item, idx) => {
        const x = padding + (idx / Math.max(1, trend.length - 1)) * (width - padding * 2);
        const y = height - padding - (item.revenue / maxRev) * (height - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [trend, maxRev]);

  const topProducts = data?.top_products || [];

  return (
    <div className="space-y-6">
      {/* LAYER 4: Telemetry & KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <ReGoKpiHero
          label={`Chiffre d'Affaires (${period}j)`}
          value={<ReGoAmtBox amount={totalRevenue} size="md" />}
          delta="+18.5%"
          deltaType="increase"
          deltaLabel="vs période préc."
          icon={DollarSign}
        />
        <ReGoKpiHero
          label="Commandes Honorées"
          value={totalOrders}
          hint="Volume total converti"
          icon={ShoppingCart}
        />
        <ReGoKpiHero
          label="Panier Moyen Client"
          value={<ReGoAmtBox amount={avgOrderValue} size="md" />}
          delta="+4.2%"
          deltaType="increase"
          deltaLabel="optimisation AOV"
          icon={TrendingUp}
        />
        <ReGoKpiHero
          label="Taux de Réachat"
          value={`${repeatRate.toFixed(1)}%`}
          hint="Clients fidèles récurrents"
          icon={Repeat}
        />
      </div>

      {/* LAYER 5: Period Control Bar */}
      <ReGoCard className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Horizon d'Analyse :
            </span>
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              {([7, 30, 90] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPeriodChange(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    period === p
                      ? 'bg-[#ad0505] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p} Jours
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser les métriques</span>
          </button>
        </div>
      </ReGoCard>

      {/* LAYER 6: Main Operational Working Area */}
      <ReGoSplitCard
        left={
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#ad0505]" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Top Articles Stars ({topProducts.length})
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-extrabold">
                Contribution CA
              </span>
            </div>

            {topProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold">Aucune vente sur cette période</p>
                <p className="text-[11px] mt-0.5">Augmentez votre visibilité avec PandaAds.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {topProducts.map((p, idx) => {
                  const rev = toNumber(p.revenue);
                  const units = toNumber(p.units_sold);

                  return (
                    <div
                      key={p.id || idx}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 transition shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                          {p.image_url ? (
                            <img src={getResizedImageUrl(p.image_url, 'thumbnail')} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {p.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {units} unité{units !== 1 ? 's écoulées' : ' écoulée'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <ReGoAmtBox amount={rev} size="sm" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Courbe de Vélocité des Ventes ({period} derniers jours)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500 font-bold">
                Pic : {maxRev.toFixed(3)} TND
              </span>
            </div>

            {/* Vector SVG Chart */}
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40">
              {trend.length > 1 ? (
                <div className="relative w-full overflow-hidden">
                  <svg viewBox="0 0 500 140" className="w-full h-36 overflow-visible">
                    <defs>
                      <linearGradient id="regoChartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ad0505" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#ad0505" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points={`15,125 ${svgPoints} 485,125`}
                      fill="url(#regoChartGrad)"
                    />
                    <polyline
                      points={svgPoints}
                      fill="none"
                      stroke="#ad0505"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
                    <span>Il y a {period} jours</span>
                    <span>Aujourd'hui</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <p>Pas assez de données pour afficher la courbe.</p>
                </div>
              )}
            </div>

            {/* ROAS & Ads Sponsor Card */}
            <div className="p-3.5 rounded-xl border border-red-100 dark:border-red-950/40 bg-red-50/40 dark:bg-red-950/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#ad0505] text-white">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    PandaAds - Booster de Vente
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Propulsez vos articles en tête de catégorie sur la marketplace.
                  </p>
                </div>
              </div>
              <Link
                href="/hub/dashboard/ads"
                className="px-3 py-1.5 rounded-xl bg-[#ad0505] hover:bg-[#8f0404] text-white text-xs font-bold transition shadow-2xs shrink-0"
              >
                Créer une campagne
              </Link>
            </div>
          </div>
        }
      />
    </div>
  );
}
