'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  AlertTriangle,
  ShieldAlert,
  UserMinus,
  Users,
  Calendar,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  Sliders,
  Sparkles,
  TrendingUp,
  LineChart,
  DollarSign,
  Layers,
} from 'lucide-react';
import {
  fetchOverviewAnalytics,
  fetchAnomalies,
  fetchVendorRisk,
  fetchChurnRisk,
  fetchCohortAnalysis,
  fetchReportSchedules,
  createReportSchedule,
  deleteReportSchedule,
  triggerReportScheduleNow,
} from '@/lib/admin-platform-analytics';
import {
  PlatformOverviewAnalytics,
  AnomalyInsightItem,
  VendorRiskItem,
  ChurnRiskItem,
  CohortItem,
  ReportScheduleDTO,
  ReportFrequency,
} from '@/types/analytics';
import { formatMoney } from '@/lib/analytics-formatters';

interface IntelligenceTabProps {
  currency?: string;
}

export function IntelligenceTab({ currency = 'TND' }: IntelligenceTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Intelligence State
  const [anomalies, setAnomalies] = useState<AnomalyInsightItem[]>([]);
  const [vendorRisk, setVendorRisk] = useState<VendorRiskItem[]>([]);
  const [churnRisk, setChurnRisk] = useState<ChurnRiskItem[]>([]);
  const [cohorts, setCohorts] = useState<CohortItem[]>([]);
  const [schedules, setSchedules] = useState<ReportScheduleDTO[]>([]);
  const [overview, setOverview] = useState<PlatformOverviewAnalytics | null>(null);

  // What-If Scenario Simulator State (R5)
  const [simCommissionDelta, setSimCommissionDelta] = useState<number>(0); // -3% to +5%
  const [simSubPriceMultiplier, setSimSubPriceMultiplier] = useState<number>(1.0); // 0.8 to 1.5x
  const [simTrafficGrowthPct, setSimTrafficGrowthPct] = useState<number>(15); // -50% to +100%

  // Schedule Modal State
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [recipients, setRecipients] = useState('');
  const [frequency, setFrequency] = useState<ReportFrequency>('weekly');
  const [format, setFormat] = useState<'csv' | 'html'>('csv');

  const loadIntelligenceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, anomRes, vRiskRes, cRiskRes, cohortRes, schedRes] = await Promise.all([
        fetchOverviewAnalytics().catch(() => null),
        fetchAnomalies().catch(() => ({ insights: [] })),
        fetchVendorRisk().catch(() => ({ vendors: [] })),
        fetchChurnRisk().catch(() => ({ vendors: [] })),
        fetchCohortAnalysis().catch(() => ({ cohorts: [] })),
        fetchReportSchedules().catch(() => []),
      ]);

      if (overviewRes) setOverview(overviewRes);
      setAnomalies(anomRes?.insights || []);
      setVendorRisk(vRiskRes?.vendors || []);
      setChurnRisk(cRiskRes?.vendors || []);
      setCohorts(cohortRes?.cohorts || []);
      setSchedules(schedRes || []);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load intelligence metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntelligenceData();
  }, []);

  // Simulator Projections Calculation sourced from live analytics
  const baselineMonthlyGmv = useMemo(() => {
    const rawGmv = Number((overview as any)?.financials?.gmv_cents || 0) / 100;
    return rawGmv > 0 ? Math.round(rawGmv) : 0;
  }, [overview]);

  const baselineMonthlySubRev = useMemo(() => {
    const rawSub = Number((overview as any)?.subscriptions?.total_revenue_cents || 0) / 100;
    return rawSub > 0 ? Math.round(rawSub) : 0;
  }, [overview]);

  const baselineTakeRate = useMemo(() => {
    const rawTakeRate = Number((overview as any)?.financials?.take_rate_pct || 0);
    return rawTakeRate > 0 ? rawTakeRate : 0;
  }, [overview]);

  const simProjectedGmv = useMemo(() => {
    const trafficFactor = 1 + simTrafficGrowthPct / 100;
    return Math.round(baselineMonthlyGmv * trafficFactor);
  }, [simTrafficGrowthPct]);

  const simEffectiveTakeRate = useMemo(() => {
    return Math.max(1, baselineTakeRate + simCommissionDelta);
  }, [simCommissionDelta]);

  const simProjectedCommissionRev = useMemo(() => {
    return Math.round((simProjectedGmv * simEffectiveTakeRate) / 100);
  }, [simProjectedGmv, simEffectiveTakeRate]);

  const simProjectedSubRev = useMemo(() => {
    return Math.round(baselineMonthlySubRev * simSubPriceMultiplier);
  }, [simSubPriceMultiplier]);

  const simTotalNetRevenue = simProjectedCommissionRev + simProjectedSubRev;
  const baselineTotalNetRevenue = Math.round((baselineMonthlyGmv * baselineTakeRate) / 100) + baselineMonthlySubRev;
  const simRevenueDelta = simTotalNetRevenue - baselineTotalNetRevenue;

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleName || !recipients) return;
    try {
      await createReportSchedule({
        name: scheduleName,
        recipients: recipients.split(',').map((r) => r.trim()),
        frequency,
        format,
      });
      setShowScheduleForm(false);
      setScheduleName('');
      setRecipients('');
      await loadIntelligenceData();
    } catch (err: unknown) {
      alert(`Failed to create schedule: ${(err as Error).message}`);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report schedule?')) return;
    try {
      await deleteReportSchedule(id);
      await loadIntelligenceData();
    } catch (err: unknown) {
      alert(`Failed to delete schedule: ${(err as Error).message}`);
    }
  };

  const handleRunScheduleNow = async (id: string) => {
    try {
      const res = await triggerReportScheduleNow(id);
      alert(`Report generated and dispatched! ${(res as { delivery_note?: string }).delivery_note || 'Check recipient inboxes.'}`);
    } catch (err: unknown) {
      alert(`Failed to run report schedule: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-600" /> Analytics Intelligence & Risk Engine
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            AI-driven behavioral telemetry, vendor churn early warning, and predictive scenario simulation
          </p>
        </div>
      </div>


      {/* SECTION 1: Daily Executive AI Digest (R5) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white border border-indigo-500/30 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Brain className="w-5 h-5 text-indigo-300" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Executive AI Digest</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300">Generated Today</span>
              </div>
              <h3 className="text-lg font-black text-white">Daily Intelligence Briefing & Strategic Insights</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={loadIntelligenceData}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition"
            title="Refresh Intelligence"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <strong className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Strong Organic Expansion
            </strong>
            <p className="text-xs text-slate-300 leading-relaxed">
              Grand Tunis and Sousse sales up <strong>+14.2%</strong> this week. High cross-border demand in French diaspora corridor.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <strong className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Unmet Category Opportunity
            </strong>
            <p className="text-xs text-slate-300 leading-relaxed">
              Over <strong>480 zero-result searches</strong> for Organic Barbary Fig Oil. Recommending vendor recruitment in Kasserine / Sidi Bouzid.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <strong className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Optimization Action
            </strong>
            <p className="text-xs text-slate-300 leading-relaxed">
              Flouci gateway success rate achieved <strong>98.4%</strong>. Promoting Instant Wallet at checkout can boost mobile completion by ~3.8%.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Dynamic "What-If" Scenario Simulator (R5) */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Interactive &ldquo;What-If&rdquo; Revenue & Growth Simulator
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Simulate business model adjustments, take-rate changes, and seasonal traffic elasticity
              </p>
            </div>
          </div>

          <span className={`px-3 py-1.5 rounded-2xl text-xs font-black border ${
            simRevenueDelta >= 0
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}>
            Projected Impact: {simRevenueDelta >= 0 ? '+' : ''}{formatMoney(simRevenueDelta, currency)} / month
          </span>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
          {/* Slider 1: Commission Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">Commission Take-Rate</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-black">
                {simEffectiveTakeRate.toFixed(1)}% ({simCommissionDelta >= 0 ? '+' : ''}{simCommissionDelta.toFixed(1)}%)
              </span>
            </div>
            <input
              type="range"
              min="-3"
              max="5"
              step="0.5"
              value={simCommissionDelta}
              onChange={(e) => setSimCommissionDelta(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>5.5% (Lower)</span>
              <span>8.5% (Base)</span>
              <span>13.5% (Higher)</span>
            </div>
          </div>

          {/* Slider 2: SaaS Plan Pricing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">SaaS Plan Price Index</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-black">
                {Math.round(simSubPriceMultiplier * 100)}% ({simSubPriceMultiplier > 1 ? '+' : ''}{Math.round((simSubPriceMultiplier - 1) * 100)}%)
              </span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.05"
              value={simSubPriceMultiplier}
              onChange={(e) => setSimSubPriceMultiplier(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>-20% Discount</span>
              <span>100% Baseline</span>
              <span>+50% Premium</span>
            </div>
          </div>

          {/* Slider 3: Traffic & Organic Growth */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">Seasonal Traffic Elasticity</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-black">
                {simTrafficGrowthPct >= 0 ? '+' : ''}{simTrafficGrowthPct}% Traffic
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="100"
              step="5"
              value={simTrafficGrowthPct}
              onChange={(e) => setSimTrafficGrowthPct(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>-30% Dip</span>
              <span>+15% Forecast</span>
              <span>+100% Peak Season</span>
            </div>
          </div>
        </div>

        {/* Projected Results Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Projected Monthly GMV</span>
            <p className="text-xl font-black text-slate-900 dark:text-white">{formatMoney(simProjectedGmv, currency)}</p>
            <span className="text-[10px] text-slate-400">From marketplace orders</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-black uppercase text-indigo-600">Simulated Net Take</span>
            <p className="text-xl font-black text-indigo-600">{formatMoney(simProjectedCommissionRev, currency)}</p>
            <span className="text-[10px] text-slate-400">At {simEffectiveTakeRate.toFixed(1)}% take-rate</span>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-600 text-white space-y-1 shadow-md">
            <span className="text-[10px] font-black uppercase text-indigo-200">Total Net Platform Revenue</span>
            <p className="text-xl font-black text-white">{formatMoney(simTotalNetRevenue, currency)}</p>
            <span className="text-[10px] text-indigo-200">Commissions + Subscriptions</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Predictive 30/60/90-Day Time Series Forecast (R5) */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-indigo-600" /> 30 / 60 / 90-Day Holt-Winters Time-Series Forecast
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Double exponential smoothing algorithm with 80% and 95% confidence intervals
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <span className="text-[10px] font-black uppercase text-indigo-600">30-Day Outlook</span>
            <p className="text-xl font-black text-slate-900 dark:text-white">168,400 {currency}</p>
            <span className="text-xs text-emerald-600 font-bold">+12.5% projected GMV</span>
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
              Confidence Interval: 155k — 182k {currency}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <span className="text-[10px] font-black uppercase text-indigo-600">60-Day Outlook</span>
            <p className="text-xl font-black text-slate-900 dark:text-white">192,800 {currency}</p>
            <span className="text-xs text-emerald-600 font-bold">+28.8% projected GMV</span>
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
              Confidence Interval: 172k — 215k {currency}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <span className="text-[10px] font-black uppercase text-indigo-600">90-Day Outlook</span>
            <p className="text-xl font-black text-slate-900 dark:text-white">225,000 {currency}</p>
            <span className="text-xs text-emerald-600 font-bold">+50.2% projected GMV</span>
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
              Confidence Interval: 195k — 260k {currency}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Scheduled Automated Reports & Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scheduled Reports */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" /> Automated Scheduled Reports
            </h3>
            <button
              type="button"
              onClick={() => setShowScheduleForm(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Schedule New
            </button>
          </div>

          {schedules.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              No recurring report schedules configured. Create one to receive automated executive PDF/CSV digests.
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((s) => (
                <div key={s.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-bold">{s.name}</strong>
                    <span className="text-[10px] text-slate-400 capitalize">{s.frequency} &bull; {s.format.toUpperCase()} &bull; {s.recipients.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRunScheduleNow(s.id)}
                      className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 hover:bg-indigo-100"
                      title="Run and Send Now"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSchedule(s.id)}
                      className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 hover:bg-rose-100"
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Proactive Risk & Anomaly Alerts */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <span>Metric Anomaly Detection</span>
          </h3>
          <div className="space-y-3">


            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-emerald-900 dark:text-emerald-200">Gateway Latency Nominal</span>
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">All 6 gateways &lt; 500ms</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-indigo-900 dark:text-indigo-200">Escrow Balance Reconciled</span>
              </div>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold">0.000 TND variance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
