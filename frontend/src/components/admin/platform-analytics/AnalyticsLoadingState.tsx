'use client';

import { RefreshCw } from 'lucide-react';

interface AnalyticsLoadingStateProps {
  message?: string;
}

export function AnalyticsLoadingState({ message = 'Loading platform analytics telemetry...' }: AnalyticsLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center space-y-3 shadow-sm"
    >
      <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{message}</p>
      <span className="sr-only">Loading</span>
    </div>
  );
}
