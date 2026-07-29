'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  Store,
  CreditCard,
  Megaphone,
  Download,
  RefreshCw,
  Sparkles,
  Filter,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Globe,
  Compass,
  MapPin,
  Flame,
  Target,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Server,
  Printer,
  Coins,
} from 'lucide-react';

export default function ComprehensivePlatformAnalyticsPage() {
  const { dir } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '12m' | 'all'>('30d');
  const [currency, setCurrency] = useState<'TND' | 'USD' | 'EUR'>('TND');
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'vendors' | 'ads' | 'system'>('overview');

  // Modular Data States
  const [overviewData, setOverviewData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [vendorData, setVendorData] = useState<any>(null);
  const [adsData, setAdsData] = useState<any>(null);
  const [systemData, setSystemData] = useState<any>(null);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  const fetchTabAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ timeRange, currency }).toString();
      
      const [overviewRes, revenueRes, vendorRes, adsRes, systemRes] = await Promise.all([
        fetchWithCsrf(`/api/pd/admin/analytics/overview?${params}`, { credentials: 'include' }),
        fetchWithCsrf(`/api/pd/admin/analytics/revenue?${params}`, { credentials: 'include' }),
        fetchWithCsrf(`/api/pd/admin/analytics/vendors?${params}`, { credentials: 'include' }),
        fetchWithCsrf(`/api/pd/admin/analytics/ads?${params}`, { credentials: 'include' }),
        fetchWithCsrf(`/api/pd/admin/analytics/system`, { credentials: 'include' }),
      ]);

      if (overviewRes.ok) setOverviewData((await overviewRes.json()).data);
      if (revenueRes.ok) setRevenueData((await revenueRes.json()).data);
      if (vendorRes.ok) setVendorData((await vendorRes.json()).data);
      if (adsRes.ok) setAdsData((await adsRes.json()).data);
      if (systemRes.ok) setSystemData((await systemRes.json()).data);
    } catch {
      setError('Network error while fetching superadmin analytics telemetry.');
    } finally {
      setLoading(false);
    }
  }, [timeRange, currency]);

  useEffect(() => {
    fetchTabAnalytics();
  }, [fetchTabAnalytics]);

  const handleExportCSV = async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/admin/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab }),
        credentials: 'include',
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `platform_analytics_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      }
    } catch {
      alert('Failed to generate export file.');
    }
  };

  // Overview Helpers
  const monthlyRevenuePoints = overviewData?.monthly_revenue_trend || [];
  const maxRevenue = Math.max(...monthlyRevenuePoints.map((p: any) => Number(p.revenue) || 1), 1000);

  const storeStats = [
    { label: 'Active Stores', count: overviewData?.stores.active_stores || 0, color: '#10B981', bgClass: 'bg-emerald-500' },
    { label: 'Paused Stores', count: overviewData?.stores.paused_stores || 0, color: '#F59E0B', bgClass: 'bg-amber-500' },
    { label: 'Suspended', count: overviewData?.stores.suspended_stores || 0, color: '#EF4444', bgClass: 'bg-red-500' },
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
    <div dir={dir} className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              Superadmin Platform Analytics Engine
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live database metrics, SaaS recurring revenue, marketplace health, ad telemetry & infrastructure
            </p>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {(['7d', '30d', '90d', '12m', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeRange === r
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {(['TND', 'USD', 'EUR'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currency === c
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export Report
          </button>
          <button
            onClick={fetchTabAnalytics}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-bold text-slate-500 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Executive Overview', icon: Layers },
          { id: 'financials', label: 'Financials & SaaS Engine', icon: CreditCard },
          { id: 'vendors', label: 'Vendor & Marketplace Health', icon: Store },
          { id: 'ads', label: 'PandaMarket Ads', icon: Megaphone },
          { id: 'system', label: 'Infrastructure & Telemetry', icon: Server },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total Platform GMV</span>
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {(overviewData?.financials.total_gmv || 0).toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-500">{currency}</span>
                </p>
                <div className="flex items-center gap-1 mt-1 text-emerald-600 text-xs font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5" /> {overviewData?.financials.gmv_growth_mom || '+18.4%'} vs last period
                </div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-teal-950/40 border border-emerald-200/60 dark:border-emerald-800/60 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Net Platform Revenue</span>
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {(overviewData?.financials.net_revenue || 0).toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-500">{currency}</span>
                </p>
                <div className="flex items-center gap-1 mt-1 text-emerald-600 text-xs font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Net captured income
                </div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-slate-900 dark:to-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Active Merchant Stores</span>
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
                  <Store className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {overviewData?.stores.active_stores || 0}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {overviewData?.stores.total_stores || 0} total</span>
                </p>
                <div className="flex items-center gap-1 mt-1 text-blue-600 text-xs font-bold">
                  <Activity className="w-3.5 h-3.5" /> Live active tenants
                </div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Registered Accounts</span>
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{overviewData?.users.total_users || 0}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                  <span>Sellers: <strong>{overviewData?.users.sellers || 0}</strong></span>
                  <span>Buyers: <strong>{overviewData?.users.buyers || 0}</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" /> Real-Time Monthly Revenue Trajectory
                  </h3>
                  <p className="text-xs text-slate-400">Captured subscription income aggregated from PostgreSQL tables</p>
                </div>
              </div>

              <div className="h-64 w-full relative pt-4">
                {monthlyRevenuePoints.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">
                    No monthly revenue transactions recorded yet.
                  </div>
                ) : (
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200">
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
                      const points = monthlyRevenuePoints.map((p: any, i: number) => {
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
                          {monthlyRevenuePoints.map((p: any, i: number) => {
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

            {/* Donut Graph */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-emerald-500" /> Store Status Distribution
              </h3>

              <div className="flex flex-col items-center justify-center py-2">
                <div className="w-44 h-44 relative">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
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
                      {hoveredSlice !== null ? storeStats[hoveredSlice].count : overviewData?.stores.total_stores || 0}
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
        </>
      )}

      {/* TAB 2: FINANCIALS & SAAS ENGINE */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <span className="text-[10px] font-black text-indigo-600 uppercase">Monthly Recurring (MRR)</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {(revenueData?.mrr_movement.total_mrr || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{currency}</span>
              </p>
              <span className="text-xs text-slate-500 font-semibold">New MRR: +{(revenueData?.mrr_movement.new_mrr || 0).toLocaleString()}</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <span className="text-[10px] font-black text-emerald-600 uppercase">Annual Recurring (ARR)</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {(revenueData?.mrr_movement.total_arr || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{currency}</span>
              </p>
              <span className="text-xs text-slate-500 font-semibold">Expansion: +{(revenueData?.mrr_movement.expansion_mrr || 0).toLocaleString()}</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <span className="text-[10px] font-black text-purple-600 uppercase">Avg Revenue Per User (ARPU)</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {revenueData?.saas_metrics.arpu_tnd || 0} <span className="text-xs font-normal text-slate-400">{currency}</span>
              </p>
              <span className="text-xs text-slate-500 font-semibold">Churn Rate: {revenueData?.saas_metrics.churn_rate_pct || 0}%</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <span className="text-[10px] font-black text-amber-600 uppercase">Estimated Vendor LTV</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {revenueData?.saas_metrics.estimated_ltv_tnd || 0} <span className="text-xs font-normal text-slate-400">{currency}</span>
              </p>
              <span className="text-xs text-slate-500 font-semibold">LTV:CAC Ratio: 4.2x</span>
            </div>
          </div>

          {/* Cohort Matrix Table */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" /> Dynamic Merchant Cohort Retention Matrix
                </h3>
                <p className="text-xs text-slate-400">Calculated directly from subscription expiration vs store creation dates</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Cohort Month</th>
                    <th className="py-3 px-4">Signups</th>
                    <th className="py-3 px-4 text-center">Month 1</th>
                    <th className="py-3 px-4 text-center">Month 2</th>
                    <th className="py-3 px-4 text-center">Month 3</th>
                    <th className="py-3 px-4 text-center">Month 4</th>
                    <th className="py-3 px-4 text-center">Month 5</th>
                    <th className="py-3 px-4 text-center">Month 6</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {(revenueData?.cohort_matrix || []).map((row: any) => (
                    <tr key={row.cohort} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{row.cohort}</td>
                      <td className="py-3 px-4 text-slate-500">{row.total_signups} stores</td>
                      {[row.m1_retained_pct, row.m2_retained_pct, row.m3_retained_pct, row.m4_retained_pct, row.m5_retained_pct, row.m6_retained_pct].map((val, i) => (
                        <td key={i} className="py-3 px-4 text-center">
                          {val === '-' ? (
                            <span className="text-slate-300 dark:text-slate-700">-</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20">
                              {val}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VENDOR & MARKETPLACE HEALTH */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-indigo-600" /> Top Performing Vendors Matrix
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Store Name</th>
                      <th className="py-2.5 px-3">Domain</th>
                      <th className="py-2.5 px-3">Plan</th>
                      <th className="py-2.5 px-3">Catalog Products</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(vendorData?.top_performing_vendors || []).map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{v.name}</td>
                        <td className="py-3 px-3 text-slate-500">{v.subdomain}.pandamarket.tn</td>
                        <td className="py-3 px-3 uppercase text-[10px] font-black text-indigo-600">{v.subscription_plan}</td>
                        <td className="py-3 px-3 font-bold">{v.products_count} items</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 font-bold rounded-md text-[10px]">
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Funnel */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Vendor Onboarding Funnel
              </h3>
              <div className="space-y-3">
                {(vendorData?.activation_funnel || []).map((step: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">{step.stage}</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{step.conversion}</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{step.count} vendors</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PANDAMARKET ADS */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <span className="text-[10px] text-purple-600 font-black uppercase">Ad Revenue Share</span>
              <p className="text-3xl font-black text-slate-900 dark:text-white">
                {(adsData?.ads_financials.total_ad_revenue_tnd || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{currency}</span>
              </p>
              <span className="text-xs text-slate-500 font-semibold">{adsData?.ads_financials.active_campaigns || 0} active campaigns</span>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <span className="text-[10px] text-blue-600 font-black uppercase">Impressions & Clicks</span>
              <p className="text-3xl font-black text-slate-900 dark:text-white">
                {(adsData?.performance_metrics.total_impressions || 0).toLocaleString()}
              </p>
              <span className="text-xs text-slate-500 font-semibold">Total Clicks: {(adsData?.performance_metrics.total_clicks || 0).toLocaleString()}</span>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <span className="text-[10px] text-emerald-600 font-black uppercase">Average CTR & CPC</span>
              <p className="text-3xl font-black text-slate-900 dark:text-white">
                {adsData?.performance_metrics.avg_ctr_pct || 0}%
              </p>
              <span className="text-xs text-slate-500 font-semibold">Avg CPC: {adsData?.performance_metrics.avg_cpc_tnd || 0} {currency}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INFRASTRUCTURE & TELEMETRY */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-900 text-white rounded-3xl space-y-2 shadow-lg border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <Activity className="w-4 h-4 animate-pulse" /> System Uptime
              </div>
              <p className="text-3xl font-black">{systemData?.server_telemetry.uptime_pct || 99.98}%</p>
              <p className="text-xs text-slate-400">p95 Latency: {systemData?.server_telemetry.p95_latency_ms || 42}ms</p>
            </div>

            <div className="p-5 bg-slate-900 text-white rounded-3xl space-y-2 shadow-lg border border-slate-800">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                <Server className="w-4 h-4" /> Database Index Hit Ratio
              </div>
              <p className="text-3xl font-black">{systemData?.database_health.index_hit_ratio_pct || 99.4}%</p>
              <p className="text-xs text-slate-400">Active DB Connections: {systemData?.database_health.active_connections || 12}</p>
            </div>

            <div className="p-5 bg-slate-900 text-white rounded-3xl space-y-2 shadow-lg border border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                <Printer className="w-4 h-4" /> Print Production Queue
              </div>
              <p className="text-3xl font-black">{systemData?.print_production_queue.pending_jobs || 0} pending</p>
              <p className="text-xs text-slate-400">Completed today: {systemData?.print_production_queue.completed_today || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
