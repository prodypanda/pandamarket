'use client';

import { TrendingUp, Download, RefreshCw } from 'lucide-react';
import { AnalyticsTimeRange, AnalyticsCurrency } from '@/types/analytics';

interface PlatformAnalyticsHeaderProps {
  timeRange: AnalyticsTimeRange;
  currency: AnalyticsCurrency;
  loading: boolean;
  onTimeRangeChange: (r: AnalyticsTimeRange) => void;
  onCurrencyChange: (c: AnalyticsCurrency) => void;
  onRefresh: () => void;
  onExport: () => void;
}

const TIME_RANGE_OPTIONS: AnalyticsTimeRange[] = ['7d', '30d', '90d', '12m', 'all'];
const CURRENCY_OPTIONS: AnalyticsCurrency[] = ['TND', 'USD', 'EUR'];

export function PlatformAnalyticsHeader({
  timeRange,
  currency,
  loading,
  onTimeRangeChange,
  onCurrencyChange,
  onRefresh,
  onExport,
}: PlatformAnalyticsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
          <TrendingUp className="w-7 h-7" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            Superadmin Platform Analytics Engine
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Live database metrics, SaaS recurring revenue, marketplace health, ad telemetry & infrastructure
          </p>
        </div>
      </div>

      {/* Filter & Action Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Time Range Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          {TIME_RANGE_OPTIONS.map((r) => {
            const isSelected = timeRange === r;
            return (
              <button
                key={r}
                onClick={() => onTimeRangeChange(r)}
                aria-pressed={isSelected}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {r.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Currency Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          {CURRENCY_OPTIONS.map((c) => {
            const isSelected = currency === c;
            return (
              <button
                key={c}
                onClick={() => onCurrencyChange(c)}
                aria-pressed={isSelected}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Export & Refresh Buttons */}
        <button
          onClick={onExport}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Download className="w-4 h-4 text-slate-500" aria-hidden="true" /> Export Report
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
        </button>
      </div>
    </div>
  );
}
