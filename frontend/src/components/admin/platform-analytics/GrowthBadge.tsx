'use client';

import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface GrowthBadgeProps {
  growthPct: number | null | undefined;
  label?: string;
}

export function GrowthBadge({ growthPct, label = 'Growth' }: GrowthBadgeProps) {
  if (growthPct === null || growthPct === undefined) {
    return <span className="text-slate-400 font-normal">{label}: Unavailable</span>;
  }

  if (growthPct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold" title={`${label}: +${growthPct}%`}>
        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" /> +{growthPct}%
      </span>
    );
  }

  if (growthPct < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-bold" title={`${label}: ${growthPct}%`}>
        <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" /> {growthPct}%
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-slate-500 font-bold" title={`${label}: 0%`}>
      <Minus className="w-3.5 h-3.5" aria-hidden="true" /> 0.00%
    </span>
  );
}
