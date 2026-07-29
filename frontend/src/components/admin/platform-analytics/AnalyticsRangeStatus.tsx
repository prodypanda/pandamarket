'use client';

import { Calendar } from 'lucide-react';
import { NormalizedAnalyticsRange } from '@/types/analytics';

interface AnalyticsRangeStatusProps {
  range: NormalizedAnalyticsRange | null | undefined;
}

export function AnalyticsRangeStatus({ range }: AnalyticsRangeStatusProps) {
  if (!range) return null;

  return (
    <div className="px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2 shadow-sm">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-indigo-500" aria-hidden="true" />
        {range.isAllTime ? (
          <span>Showing all-time platform data</span>
        ) : (
          <span>
            Showing data from{' '}
            <strong className="text-slate-900 dark:text-white">
              {range.startDate ? new Date(range.startDate).toLocaleDateString() : 'Beginning'}
            </strong>{' '}
            to{' '}
            <strong className="text-slate-900 dark:text-white">
              {new Date(range.endDate).toLocaleDateString()}
            </strong>
          </span>
        )}
      </div>

      {range.comparison_available && range.previousStartDate && range.previousEndDate && (
        <span className="text-[11px] text-slate-500">
          Compared with previous period ({new Date(range.previousStartDate).toLocaleDateString()} to{' '}
          {new Date(range.previousEndDate).toLocaleDateString()})
        </span>
      )}
    </div>
  );
}
