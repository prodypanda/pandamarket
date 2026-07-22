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
      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-400">
        No performance data available for the selected period.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <SingleChart
        title="Reach & Engagement"
        subtitle="Daily Impressions and Valid Clicks"
        daily={daily}
        series={[
          { key: 'impressions', label: 'Impressions', color: '#059669', getVal: (p) => Number(p.impressions || 0), format: (v) => `${v.toLocaleString()} views` },
          { key: 'clicks', label: 'Clicks', color: '#f59e0b', getVal: (p) => Number(p.clicks || 0), format: (v) => `${v.toLocaleString()} clicks` },
        ]}
      />
      <SingleChart
        title="Spend & Attributed Revenue"
        subtitle="Daily Spend and Order Sales Revenue (TND)"
        daily={daily}
        series={[
          { key: 'spend', label: 'Spend', color: '#dc2626', getVal: (p) => Number(p.spend || 0), format: (v) => `${v.toFixed(3)} TND` },
          { key: 'revenue', label: 'Attributed Revenue', color: '#2563eb', getVal: (p) => Number(p.revenue || 0), format: (v) => `${v.toFixed(3)} TND` },
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
    <figure className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm space-y-3">
      <figcaption className="flex items-center justify-between">
        <div>
          <p className="font-black text-slate-900 text-base">{title}</p>
          <p className="text-xs text-slate-500 font-semibold">{subtitle}</p>
        </div>
        <div className="flex gap-3">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </figcaption>

      {/* SVG Container */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3" dir="ltr">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-48 w-full min-w-[480px]"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Gridlines */}
          {[0, 0.5, 1].map((ratio) => {
            const y = Py + (H - Py * 2) * ratio;
            const labelVal = maxVal * (1 - ratio);
            return (
              <g key={ratio}>
                <line x1={Px} x2={W - Px} y1={y} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                <text x={Px - 6} y={y + 3} textAnchor="end" className="text-[10px] font-mono fill-slate-400 font-semibold">
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
              strokeWidth="3.5"
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
                  <line x1={x} x2={x} y1={Py} y2={H - Py} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
                )}

                {series.map((s) => {
                  const val = s.getVal(p);
                  const y = getY(val);
                  return (
                    <circle
                      key={s.key}
                      cx={x}
                      cy={y}
                      r={hoverIndex === idx ? '5.5' : '3'}
                      fill={s.color}
                      stroke="#ffffff"
                      strokeWidth="2"
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
            className="absolute top-3 z-20 rounded-xl border border-slate-200 bg-slate-950 p-2.5 text-xs font-semibold text-white shadow-xl pointer-events-none"
            style={{
              left: `${Math.min(Math.max(Px, getX(hoverIndex) - 80), W - 160)}px`,
            }}
          >
            <p className="font-black text-amber-400">{new Date(hoverPoint.stat_date).toLocaleDateString()}</p>
            <div className="mt-1 space-y-0.5 text-[11px]">
              {series.map((s) => (
                <p key={s.key}>
                  {s.label}: <span className="font-bold text-white">{s.format(s.getVal(hoverPoint))}</span>
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1" dir="ltr">
        <span>{new Date(dates[0]).toLocaleDateString()}</span>
        <span>{new Date(dates[dates.length - 1]).toLocaleDateString()}</span>
      </div>
    </figure>
  );
}
