'use client';

import { Flame } from 'lucide-react';
import { PlatformRevenueAnalytics } from '@/types/analytics';
import { AnalyticsEmptyState } from './AnalyticsEmptyState';
import { formatMoney, formatPercent } from '@/lib/analytics-formatters';

interface FinancialsAnalyticsTabProps {
  data: PlatformRevenueAnalytics | null;
}

export function FinancialsAnalyticsTab({ data }: FinancialsAnalyticsTabProps) {
  if (!data) {
    return <AnalyticsEmptyState title="No Financial Analytics" message="No SaaS revenue telemetry recorded for the selected range." />;
  }

  const { saas_metrics, mrr_movement, cohort_matrix } = data;

  return (
    <div className="space-y-6">
      {/* 4 Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] font-black text-indigo-600 uppercase">Monthly Recurring (MRR)</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {formatMoney(mrr_movement.total_mrr, 'TND')}
          </p>
          <span className="text-xs text-slate-400 font-normal">MRR Movement: Not tracked yet</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] font-black text-emerald-600 uppercase">Annual Recurring (ARR)</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {formatMoney(mrr_movement.total_arr, 'TND')}
          </p>
          <span className="text-xs text-slate-400 font-normal">Calculated from active plans</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] font-black text-purple-600 uppercase">Avg Revenue Per User (ARPU)</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {formatMoney(saas_metrics.arpu_tnd, 'TND', 'Unavailable')}
          </p>
          <span className="text-xs text-slate-400 font-normal">
            Churn Rate: {formatPercent(saas_metrics.churn_rate_pct, 'Unavailable')}
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] font-black text-amber-600 uppercase">Estimated Vendor LTV</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {formatMoney(saas_metrics.estimated_ltv_tnd, 'TND', 'Unavailable')}
          </p>
          <span className="text-xs text-slate-400 font-normal">LTV:CAC: Not tracked yet</span>
        </div>
      </div>

      {/* Merchant Cohort Retention Matrix */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" aria-hidden="true" /> Dynamic Merchant Cohort Retention Matrix
            </h3>
            <p className="text-xs text-slate-400">Calculated directly from subscription expiration vs store creation dates</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Cohort Month</th>
                <th className="py-3 px-4">Signups</th>
                <th className="py-3 px-4 text-center">Month 1</th>
                <th className="py-3 px-4 text-center">Month 2</th>
                <th className="py-3 px-4 text-center">Month 3</th>
                <th className="py-3 px-4 text-center">Month 4</th>
                <th className="py-3 px-4 text-center">Month 5</th>
                <th className="py-3 px-4 text-center">Month 6</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {(cohort_matrix || []).map((row) => (
                <tr key={row.cohort} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{row.cohort}</td>
                  <td className="py-3 px-4 text-slate-500">{row.total_signups} stores</td>
                  {[
                    row.m1_retained_pct,
                    row.m2_retained_pct,
                    row.m3_retained_pct,
                    row.m4_retained_pct,
                    row.m5_retained_pct,
                    row.m6_retained_pct,
                  ].map((val, i) => (
                    <td key={i} className="py-3 px-4 text-center">
                      {val === '-' ? (
                        <span className="text-slate-300 dark:text-slate-700">-</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          {val}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
