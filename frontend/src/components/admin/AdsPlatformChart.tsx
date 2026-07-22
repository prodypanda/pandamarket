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

const W = 1200;
const H = 300;
const Px = 50;
const Py = 30;

export function AdsPlatformChart({ daily }: { daily: Point[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [visibleMetrics, setVisibleMetrics] = useState<Record<string, boolean>>({
    spend: true,
    revenue: true,
    clicks: true,
    impressions: false,
  });

  if (!daily || !daily.length) {
    return <p className="p-10 text-center text-sm font-semibold text-gray-400">No platform Ads activity recorded yet.</p>;
  }

  const toggleMetric = (key: string) => {
    setVisibleMetrics((v) => ({ ...v, [key]: !v[key] }));
  };

  const dates = daily.map((d) => d.stat_date);
  const len = daily.length;
  const divisor = len > 1 ? len - 1 : 1;

  const spendVals = daily.map((p) => Math.max(0, Number(p.spend || 0)));
  const revenueVals = daily.map((p) => Math.max(0, Number(p.revenue || 0)));
  const clickVals = daily.map((p) => Math.max(0, Number(p.clicks || 0)));
  const impressionVals = daily.map((p) => Math.max(0, Number(p.impressions || 0)));

  const maxMoney = Math.max(...spendVals, ...revenueVals, 1);
  const maxVolume = Math.max(...clickVals, ...impressionVals, 1);

  const getX = (idx: number) => Px + (idx / divisor) * (W - Px * 2);
  const getYMoney = (val: number) => H - Py - (val / maxMoney) * (H - Py * 2);
  const getYVolume = (val: number) => H - Py - (val / maxVolume) * (H - Py * 2);

  const buildPath = (vals: number[], getY: (v: number) => number) => {
    if (!vals.length) return '';
    return vals.map((v, i) => `${i ? 'L' : 'M'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`).join(' ');
  };

  const buildArea = (vals: number[], getY: (v: number) => number) => {
    if (!vals.length) return '';
    const linePath = buildPath(vals, getY);
    const firstX = getX(0).toFixed(1);
    const lastX = getX(vals.length - 1).toFixed(1);
    const bottomY = (H - Py).toFixed(1);
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const metricsConfig = [
    { key: 'spend', label: 'Spend (TND)', color: '#dc2626', vals: spendVals, getY: getYMoney, formatted: (v: number) => `${v.toFixed(3)} TND` },
    { key: 'revenue', label: 'Revenue (TND)', color: '#2563eb', vals: revenueVals, getY: getYMoney, formatted: (v: number) => `${v.toFixed(3)} TND` },
    { key: 'clicks', label: 'Clicks', color: '#d97706', vals: clickVals, getY: getYVolume, formatted: (v: number) => `${v.toLocaleString()} clicks` },
    { key: 'impressions', label: 'Impressions', color: '#059669', vals: impressionVals, getY: getYVolume, formatted: (v: number) => `${v.toLocaleString()} views` },
  ];

  const activeHoverPoint = hoverIndex !== null ? daily[hoverIndex] : null;
  const totalSpend = spendVals.reduce((a, b) => a + b, 0);
  const totalRevenue = revenueVals.reduce((a, b) => a + b, 0);
  const totalClicks = clickVals.reduce((a, b) => a + b, 0);
  const totalImpressions = impressionVals.reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Metric Selector Badges */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {metricsConfig.map((m) => {
            const active = visibleMetrics[m.key];
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => toggleMetric(m.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-black transition cursor-pointer ${
                  active ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Overview Stats Bar */}
        <div className="flex gap-4 text-xs font-bold text-slate-700">
          <span>Spend: <b className="text-red-700">{totalSpend.toFixed(3)} TND</b></span>
          <span>Revenue: <b className="text-blue-700">{totalRevenue.toFixed(3)} TND</b></span>
          <span>ROAS: <b className="text-emerald-700">{totalSpend ? (totalRevenue / totalSpend).toFixed(2) : '0.00'}×</b></span>
        </div>
      </div>

      {/* SVG Performance Chart */}
      <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm w-full" dir="ltr">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-64 w-full"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-Axis labels */}
          {[0, 0.33, 0.66, 1].map((v) => {
            const y = Py + (H - Py * 2) * v;
            const moneyVal = maxMoney * (1 - v);
            return (
              <g key={v}>
                <line x1={Px} x2={W - Px} y1={y} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                <text x={Px - 8} y={y + 4} textAnchor="end" className="text-[10px] font-mono fill-slate-400 font-semibold">
                  {moneyVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Area Fills & Lines */}
          {visibleMetrics.spend && (
            <>
              <path d={buildArea(spendVals, getYMoney)} fill="url(#spendGrad)" />
              <path d={buildPath(spendVals, getYMoney)} fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
            </>
          )}

          {visibleMetrics.revenue && (
            <>
              <path d={buildArea(revenueVals, getYMoney)} fill="url(#revenueGrad)" />
              <path d={buildPath(revenueVals, getYMoney)} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
            </>
          )}

          {visibleMetrics.clicks && (
            <path d={buildPath(clickVals, getYVolume)} fill="none" stroke="#d97706" strokeWidth="3" strokeDasharray="6 3" />
          )}

          {visibleMetrics.impressions && (
            <path d={buildPath(impressionVals, getYVolume)} fill="none" stroke="#059669" strokeWidth="3" strokeDasharray="3 3" />
          )}

          {/* Hover Crosshair & Data Dots */}
          {dates.map((d, idx) => {
            const x = getX(idx);
            return (
              <g key={d} onMouseEnter={() => setHoverIndex(idx)} className="cursor-pointer">
                {/* Vertical hover capture area */}
                <rect x={x - Math.max(10, W / divisor / 2)} y={0} width={Math.max(20, W / divisor)} height={H} fill="transparent" />

                {hoverIndex === idx && (
                  <line x1={x} x2={x} y1={Py} y2={H - Py} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
                )}

                {metricsConfig.map((m) => {
                  if (!visibleMetrics[m.key]) return null;
                  const val = m.vals[idx];
                  const y = m.getY(val);
                  return (
                    <circle
                      key={m.key}
                      cx={x}
                      cy={y}
                      r={hoverIndex === idx ? '6' : '3.5'}
                      fill={m.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {activeHoverPoint && hoverIndex !== null && (
          <div
            className="absolute top-4 z-20 rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs font-semibold text-white shadow-xl pointer-events-none"
            style={{
              left: `${Math.min(Math.max(Px, getX(hoverIndex) - 90), W - 180)}px`,
            }}
          >
            <p className="font-black text-amber-400">
              {(activeHoverPoint as any).label || new Date(activeHoverPoint.stat_date).toLocaleString()}
            </p>
            <div className="mt-1.5 space-y-1 text-[11px]">
              <p>Spend: <span className="font-bold text-red-400">{Number(activeHoverPoint.spend || 0).toFixed(3)} TND</span></p>
              <p>Revenue: <span className="font-bold text-blue-400">{Number(activeHoverPoint.revenue || 0).toFixed(3)} TND</span></p>
              <p>Clicks: <span className="font-bold text-amber-300">{Number(activeHoverPoint.clicks || 0).toLocaleString()}</span></p>
              <p>Impressions: <span className="font-bold text-emerald-300">{Number(activeHoverPoint.impressions || 0).toLocaleString()}</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Date Axis Footer */}
      <div className="flex justify-between text-[11px] font-bold text-slate-400 px-2" dir="ltr">
        <span>{(daily[0] as any).label || new Date(daily[0].stat_date).toLocaleDateString()}</span>
        {daily.length > 4 && <span>{(daily[Math.floor(daily.length / 4)] as any).label || new Date(daily[Math.floor(daily.length / 4)].stat_date).toLocaleDateString()}</span>}
        {daily.length > 2 && <span>{(daily[Math.floor(daily.length / 2)] as any).label || new Date(daily[Math.floor(daily.length / 2)].stat_date).toLocaleDateString()}</span>}
        {daily.length > 4 && <span>{(daily[Math.floor((3 * daily.length) / 4)] as any).label || new Date(daily[Math.floor((3 * daily.length) / 4)].stat_date).toLocaleDateString()}</span>}
        <span>{(daily[daily.length - 1] as any).label || new Date(daily[daily.length - 1].stat_date).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
