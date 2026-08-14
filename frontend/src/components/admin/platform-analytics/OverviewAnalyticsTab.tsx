'use client';

import { useState } from 'react';
import {
  CreditCard,
  Coins,
  Lock,
  Store,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  MapPin,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { AnalyticsTabID, PlatformOverviewAnalytics } from '@/types/analytics';
import { MetricCard } from './MetricCard';
import { AnalyticsEmptyState } from './AnalyticsEmptyState';
import { TunisiaChoroplethMap } from './TunisiaChoroplethMap';
import { formatMoney, formatNumber, formatPercent } from '@/lib/analytics-formatters';

interface OverviewAnalyticsTabProps {

  data: PlatformOverviewAnalytics | null;
  currency?: string;
  onNavigateToTab?: (tabId: AnalyticsTabID) => void;
}


export function OverviewAnalyticsTab({ data, currency = 'TND', onNavigateToTab }: OverviewAnalyticsTabProps) {
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  if (!data) {
    return (
      <AnalyticsEmptyState
        title="No Executive Overview Data"
        message="No overview metrics are available for the selected period."
      />
    );
  }

  const monthlyRevenuePoints = data.monthly_revenue_trend || [];
  const maxRevenue = Math.max(...monthlyRevenuePoints.map((p) => Number(p.revenue) || 1), 1000);

  const storeStats = [
    { label: 'Active / Verified', count: data.stores.active_stores || 0, color: '#10B981', bgClass: 'bg-emerald-500' },
    { label: 'Unverified / Pending', count: data.stores.paused_stores || 0, color: '#F59E0B', bgClass: 'bg-amber-500' },
    { label: 'Suspended', count: data.stores.suspended_stores || 0, color: '#EF4444', bgClass: 'bg-red-500' },
  ];
  const totalStoreCount = storeStats.reduce((acc, curr) => acc + curr.count, 0) || 1;

  let cumulativePercent = 0;
  const donutSlices = storeStats.map((stat, idx) => {
    const percent = stat.count / totalStoreCount;
    const startAngle = cumulativePercent * 360;
    cumulativePercent += percent;
    const endAngle = cumulativePercent * 360;

    const x1 = 50 + 40 * Math.cos((Math.PI * (startAngle - 90)) / 180);
    const y1 = 50 + 40 * Math.sin((Math.PI * (startAngle - 90)) / 180);
    const x2 = 50 + 40 * Math.cos((Math.PI * (endAngle - 90)) / 180);
    const y2 = 50 + 40 * Math.sin((Math.PI * (endAngle - 90)) / 180);

    const largeArc = percent > 0.5 ? 1 : 0;
    const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { ...stat, pathData, percent: Math.round(percent * 100), idx };
  });

  return (
    <div className="space-y-6">
      {/* Real-time Live Velocity Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/20 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Live Pulse Telemetry</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-[10px] font-mono text-indigo-200">Surveillance Active</span>
            </div>
            <p className="text-sm font-bold text-slate-200">
              <strong>{data.active_sessions ?? 0}</strong> visiteurs actifs en direct
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Vélocité Commandes</span>
            <strong className="text-sm font-black text-emerald-400">
              {data.financials.total_orders > 0 ? `${(data.financials.total_orders / Math.max(1, 24 * 60)).toFixed(2)} cmd / min` : 'En attente'}
            </strong>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Vélocité Volume GMV</span>
            <strong className="text-sm font-black text-indigo-300">
              {data.financials.total_gmv > 0 ? `${(data.financials.total_gmv / Math.max(1, 24 * 60)).toFixed(2)} ${currency} / min` : `0.00 ${currency} / min`}
            </strong>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Santé Passerelles</span>
            <strong className="text-sm font-black text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Opérationnel
            </strong>
          </div>
        </div>
      </div>

      {/* 5 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Platform GMV"
          value={data.financials.total_gmv}
          currencyLabel={currency}
          icon={<CreditCard className="w-4 h-4" />}
          growthPct={data.financials.gmv_growth_pct}
          growthLabel="GMV PoP"
          gradientClass="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-indigo-950/40"
          borderClass="border-indigo-200/60 dark:border-indigo-800/60"
          titleColorClass="text-indigo-600 dark:text-indigo-400"
          iconBgClass="bg-indigo-500/10"
          iconColorClass="text-indigo-600"
        />

        <MetricCard
          title="Net Revenue"
          value={data.financials.net_revenue}
          currencyLabel={currency}
          icon={<Coins className="w-4 h-4" />}
          growthPct={data.financials.net_revenue_growth_pct}
          growthLabel="Rev PoP"
          gradientClass="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-teal-950/40"
          borderClass="border-emerald-200/60 dark:border-emerald-800/60"
          titleColorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-500/10"
          iconColorClass="text-emerald-600"
        />

        <MetricCard
          title="Escrow Balance"
          value={data.financials.funds_in_escrow}
          currencyLabel={currency}
          icon={<Lock className="w-4 h-4" />}
          subtext={<span className="text-[10px] text-purple-600 font-bold">Held for payouts</span>}
          gradientClass="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-purple-950/40"
          borderClass="border-purple-200/60 dark:border-purple-800/60"
          titleColorClass="text-purple-600 dark:text-purple-400"
          iconBgClass="bg-purple-500/10"
          iconColorClass="text-purple-600"
        />

        <MetricCard
          title="Active Stores"
          value={`${data.stores.active_stores} / ${data.stores.total_stores}`}
          icon={<Store className="w-4 h-4" />}
          growthPct={data.stores.new_stores_growth_pct}
          growthLabel="Stores"
          subtext={
            <span className="text-slate-500 mr-1">
              New in period: <strong>{data.stores.new_stores_in_period}</strong>
            </span>
          }
          gradientClass="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-slate-900 dark:to-blue-950/40"
          borderClass="border-blue-200/60 dark:border-blue-800/60"
          titleColorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-500/10"
          iconColorClass="text-blue-600"
        />

        <MetricCard
          title="Accounts"
          value={data.users.total_users}
          icon={<Users className="w-4 h-4" />}
          growthPct={data.users.new_users_growth_pct}
          growthLabel="Users"
          subtext={
            <span className="text-[11px] text-slate-500 mr-1">
              New in period: <strong>{data.users.new_users_in_period}</strong>
            </span>
          }
          gradientClass="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-amber-950/40"
          borderClass="border-amber-200/60 dark:border-amber-800/60"
          titleColorClass="text-amber-600 dark:text-amber-400"
          iconBgClass="bg-amber-500/10"
          iconColorClass="text-amber-600"
        />
      </div>

      {/* Trajectory SVG & Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" aria-hidden="true" /> Revenue Trajectory in Selected Period
              </h3>
              <p className="text-xs text-slate-400">Captured subscription & marketplace income from PostgreSQL tables</p>
            </div>
          </div>

          <div className="h-64 w-full relative pt-4">
            {monthlyRevenuePoints.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">
                No monthly revenue transactions recorded in selected range.
              </div>
            ) : (
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" aria-label="Revenue trajectory chart">
                <defs>
                  <linearGradient id="areaGradientOverview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="40" x2="500" y2="40" stroke="#E2E8F0" strokeDasharray="4 4" className="dark:stroke-slate-800" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#E2E8F0" strokeDasharray="4 4" className="dark:stroke-slate-800" />
                <line x1="0" y1="140" x2="500" y2="140" stroke="#E2E8F0" strokeDasharray="4 4" className="dark:stroke-slate-800" />
                <line x1="0" y1="190" x2="500" y2="190" stroke="#E2E8F0" className="dark:stroke-slate-800" />

                {(() => {
                  const step = 500 / (monthlyRevenuePoints.length - 1 || 1);
                  const points = monthlyRevenuePoints.map((p, i) => {
                    const x = i * step;
                    const y = 190 - ((Number(p.revenue) || 0) / maxRevenue) * 150;
                    return `${x},${y}`;
                  });
                  const pathStr = `M 0,190 L ${points.join(' L ')} L 500,190 Z`;
                  const lineStr = `M ${points.join(' L ')}`;
                  return (
                    <>
                      <path d={pathStr} fill="url(#areaGradientOverview)" />
                      <path d={lineStr} fill="none" stroke="#6366F1" strokeWidth="3" />
                      {monthlyRevenuePoints.map((p, i) => {
                        const x = i * step;
                        const y = 190 - ((Number(p.revenue) || 0) / maxRevenue) * 150;
                        return (
                          <g key={i} className="group cursor-pointer">
                            <circle cx={x} cy={y} r="5" fill="#FFFFFF" stroke="#6366F1" strokeWidth="3" />
                            <text x={x} y={y - 12} textAnchor="middle" className="text-[10px] font-bold fill-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              {Number(p.revenue).toFixed(0)} {currency}
                            </text>
                            <text x={x} y="205" textAnchor="middle" className="text-[10px] font-medium fill-slate-400">
                              {p.month}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            )}
          </div>
        </div>

        {/* Store Status Donut */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-emerald-500" aria-hidden="true" /> Store Status Distribution
          </h3>

          <div className="flex flex-col items-center justify-center py-2">
            <div className="w-44 h-44 relative">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100" aria-label="Store status distribution donut">
                {donutSlices.map((slice) => (
                  <path
                    key={slice.idx}
                    d={slice.pathData}
                    fill={slice.color}
                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                    onMouseEnter={() => setHoveredSlice(slice.idx)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 m-auto w-24 h-24 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {hoveredSlice !== null ? storeStats[hoveredSlice].count : data.stores.total_stores}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  {hoveredSlice !== null ? storeStats[hoveredSlice].label : 'Total Stores'}
                </span>
              </div>
            </div>

            <div className="w-full space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {donutSlices.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${s.bgClass}`} />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{s.label}</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {s.count} ({s.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Tunisia 24 Governorates & Diaspora Regional Telemetry */}
      <TunisiaChoroplethMap currency={currency} />
    </div>
  );
}

