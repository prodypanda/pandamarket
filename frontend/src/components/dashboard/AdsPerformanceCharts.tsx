'use client';

import { useState } from 'react';

type Point = {
  stat_date: string;
  impressions: string | number;
  clicks: string | number;
  conversions: string | number;
  spend: string | number;
  revenue: string | number;
};

const W = 720;
const H = 200;
const Px = 40;
const Py = 20;

export function AdsPerformanceCharts({ daily }: { daily: Point[] }) {
  if (!daily || !daily.length) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-8 text-center text-xs font-normal text-slate-400">
        Aucune donnée de performance enregistrée pour la période sélectionnée.
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <SingleChart
        title="Portée & Engagement"
        subtitle="Impressions et clics validés quotidiens"
        daily={daily}
        series={[
          { key: 'impressions', label: 'Impressions', color: '#10b981', getVal: (p) => Number(p.impressions || 0), format: (v) => `${v.toLocaleString()} vues` },
          { key: 'clicks', label: 'Clics', color: '#f59e0b', getVal: (p) => Number(p.clicks || 0), format: (v) => `${v.toLocaleString()} clics` },
        ]}
      />
      <SingleChart
        title="Dépenses & Revenus Attribués"
        subtitle="Dépenses de campagne et ventes générées (TND)"
        daily={daily}
        series={[
          { key: 'spend', label: 'Dépenses', color: '#f43f5e', getVal: (p) => Number(p.spend || 0), format: (v) => `${v.toFixed(3)} TND` },
          { key: 'revenue', label: 'Revenus', color: '#3b82f6', getVal: (p) => Number(p.revenue || 0), format: (v) => `${v.toFixed(3)} TND` },
        ]}
      />
    </div>
  );
}

function SingleChart({
  title,
  subtitle,
  daily,
  series,
}: {
  title: string;
  subtitle: string;
  daily: Point[];
  series: Array<{ key: string; label: string; color: string; getVal: (p: Point) => number; format: (v: number) => string }>;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const len = daily.length;
  const divisor = len > 1 ? len - 1 : 1;

  const allVals = series.flatMap((s) => daily.map((p) => s.getVal(p)));
  const maxVal = Math.max(...allVals, 1);

  const getX = (idx: number) => Px + (idx / divisor) * (W - Px * 2);
  const getY = (val: number) => H - Py - (val / maxVal) * (H - Py * 2);

  const buildPath = (s: (typeof series)[0]) => {
    const vals = daily.map((p) => s.getVal(p));
    return vals.map((v, i) => `${i ? 'L' : 'M'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`).join(' ');
  };

  const dates = daily.map((d) => d.stat_date);
  const hoverPoint = hoverIndex !== null ? daily[hoverIndex] : null;

  return (
    <figure className="min-w-0 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-4 shadow-2xs space-y-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </figcaption>

      {/* SVG Container */}
      <div className="relative overflow-hidden rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 w-full shadow-2xs" dir="ltr">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-44 w-full"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Gridlines */}
          {[0, 0.5, 1].map((ratio) => {
            const y = Py + (H - Py * 2) * ratio;
            const labelVal = maxVal * (1 - ratio);
            return (
              <g key={ratio}>
                <line x1={Px} x2={W - Px} y1={y} y2={y} stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="1" />
                <text x={Px - 6} y={y + 3} textAnchor="end" className="text-[9px] font-mono fill-slate-400">
                  {labelVal > 1000 ? `${(labelVal / 1000).toFixed(1)}k` : labelVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Series Paths */}
          {series.map((s) => (
            <path
              key={s.key}
              d={buildPath(s)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Interactive Hover Area & Circles */}
          {daily.map((p, idx) => {
            const x = getX(idx);
            return (
              <g key={p.stat_date} onMouseEnter={() => setHoverIndex(idx)} className="cursor-pointer">
                <rect x={x - Math.max(10, W / divisor / 2)} y={0} width={Math.max(20, W / divisor)} height={H} fill="transparent" />

                {hoverIndex === idx && (
                  <line x1={x} x2={x} y1={Py} y2={H - Py} stroke="currentColor" className="text-slate-400 dark:text-slate-600" strokeWidth="1" strokeDasharray="2 2" />
                )}

                {series.map((s) => {
                  const val = s.getVal(p);
                  const y = getY(val);
                  return (
                    <circle
                      key={s.key}
                      cx={x}
                      cy={y}
                      r={hoverIndex === idx ? '4.5' : '2.5'}
                      fill={s.color}
                      stroke="currentColor"
                      className="text-white dark:text-slate-900"
                      strokeWidth="1.5"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverPoint && hoverIndex !== null && (
          <div
            className="absolute top-2 z-20 rounded-lg border border-slate-700/60 bg-slate-950/95 p-2 text-xs text-white shadow-xl pointer-events-none backdrop-blur-xs"
            style={{
              left: `${Math.min(Math.max(Px, getX(hoverIndex) - 70), W - 150)}px`,
            }}
          >
            <p className="font-semibold text-slate-300 text-[10px]">
              {(hoverPoint as any).label || new Date(hoverPoint.stat_date).toLocaleDateString()}
            </p>
            <div className="mt-0.5 space-y-0.5 text-[10px] font-mono">
              {series.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">{s.label}:</span>
                  <span className="font-bold text-white">{s.format(s.getVal(hoverPoint))}</span>
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1" dir="ltr">
        <span>{(daily[0] as any).label || new Date(daily[0].stat_date).toLocaleDateString()}</span>
        {daily.length > 4 && <span>{(daily[Math.floor(daily.length / 4)] as any).label || new Date(daily[Math.floor(daily.length / 4)].stat_date).toLocaleDateString()}</span>}
        {daily.length > 2 && <span>{(daily[Math.floor(daily.length / 2)] as any).label || new Date(daily[Math.floor(daily.length / 2)].stat_date).toLocaleDateString()}</span>}
        {daily.length > 4 && <span>{(daily[Math.floor((3 * daily.length) / 4)] as any).label || new Date(daily[Math.floor((3 * daily.length) / 4)].stat_date).toLocaleDateString()}</span>}
        <span>{(daily[daily.length - 1] as any).label || new Date(daily[daily.length - 1].stat_date).toLocaleDateString()}</span>
      </div>
    </figure>
  );
}
