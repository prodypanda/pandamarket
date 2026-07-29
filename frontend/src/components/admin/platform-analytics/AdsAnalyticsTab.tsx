'use client';

import { PlatformAdsAnalytics } from '@/types/analytics';
import { GrowthBadge } from './GrowthBadge';
import { AnalyticsEmptyState } from './AnalyticsEmptyState';
import { formatMoney, formatNumber, formatPercent } from '@/lib/analytics-formatters';

interface AdsAnalyticsTabProps {
  data: PlatformAdsAnalytics | null;
}

export function AdsAnalyticsTab({ data }: AdsAnalyticsTabProps) {
  if (!data) {
    return <AnalyticsEmptyState title="No Ad Telemetry" message="No PandaMarket ad campaigns recorded in the selected period." />;
  }

  const { ads_financials, performance_metrics } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] text-purple-600 font-black uppercase">Ad Revenue Share in Period</span>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {formatMoney(ads_financials.total_ad_revenue_tnd, 'TND')}
          </p>
          <div className="flex items-center gap-1 text-xs">
            <span>{ads_financials.active_campaigns} active campaigns</span>
            <GrowthBadge growthPct={ads_financials.ad_revenue_growth_pct} label="Ad Rev" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] text-blue-600 font-black uppercase">Impressions & Clicks in Period</span>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {formatNumber(performance_metrics.total_impressions)}
          </p>
          <span className="text-xs text-slate-500 font-semibold">
            Total Clicks: {formatNumber(performance_metrics.total_clicks)}
          </span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] text-emerald-600 font-black uppercase">Average CTR & CPC</span>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {formatPercent(performance_metrics.avg_ctr_pct)}
          </p>
          <span className="text-xs text-slate-500 font-semibold">
            Avg CPC: {formatMoney(performance_metrics.avg_cpc_tnd, 'TND')} | ROAS:{' '}
            {performance_metrics.estimated_roas !== null ? performance_metrics.estimated_roas : 'Unavailable'}
          </span>
        </div>
      </div>
    </div>
  );
}
