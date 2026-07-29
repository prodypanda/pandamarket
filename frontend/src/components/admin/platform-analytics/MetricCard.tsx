'use client';

import { ReactNode } from 'react';
import { GrowthBadge } from './GrowthBadge';

interface MetricCardProps {
  title: string;
  value: string | number;
  currencyLabel?: string;
  icon: ReactNode;
  growthPct?: number | null;
  growthLabel?: string;
  subtext?: ReactNode;
  gradientClass?: string;
  borderClass?: string;
  titleColorClass?: string;
  iconBgClass?: string;
  iconColorClass?: string;
}

export function MetricCard({
  title,
  value,
  currencyLabel,
  icon,
  growthPct,
  growthLabel,
  subtext,
  gradientClass = 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-indigo-950/40',
  borderClass = 'border-indigo-200/60 dark:border-indigo-800/60',
  titleColorClass = 'text-indigo-600 dark:text-indigo-400',
  iconBgClass = 'bg-indigo-500/10',
  iconColorClass = 'text-indigo-600 dark:text-indigo-400',
}: MetricCardProps) {
  return (
    <div className={`p-5 rounded-3xl ${gradientClass} border ${borderClass} space-y-3 shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-black uppercase tracking-wider ${titleColorClass}`}>
          {title}
        </span>
        <div className={`p-2 rounded-xl ${iconBgClass} ${iconColorClass}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}{' '}
          {currencyLabel && <span className="text-xs font-normal text-slate-500">{currencyLabel}</span>}
        </p>
        {(growthPct !== undefined || subtext) && (
          <div className="flex items-center gap-1 mt-1 text-xs">
            {subtext}
            {growthPct !== undefined && <GrowthBadge growthPct={growthPct} label={growthLabel} />}
          </div>
        )}
      </div>
    </div>
  );
}
