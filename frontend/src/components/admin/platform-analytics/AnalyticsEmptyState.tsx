'use client';

import { Layers } from 'lucide-react';

interface AnalyticsEmptyStateProps {
  title?: string;
  message?: string;
}

export function AnalyticsEmptyState({
  title = 'No Telemetry Recorded',
  message = 'No data points were recorded in the selected time range window.',
}: AnalyticsEmptyStateProps) {
  return (
    <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center space-y-2 shadow-sm">
      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400">
        <Layers className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm">{message}</p>
    </div>
  );
}
