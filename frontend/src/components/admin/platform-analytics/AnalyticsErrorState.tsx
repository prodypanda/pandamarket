'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AnalyticsErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function AnalyticsErrorState({ message, onRetry }: AnalyticsErrorStateProps) {
  return (
    <div
      role="alert"
      className="p-5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}
    </div>
  );
}
