'use client';

import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, ShieldAlert, UserMinus, Users, Calendar, RefreshCw, Plus, Trash2, Send, CheckCircle2, Info } from 'lucide-react';
import {
  fetchAnomalies,
  fetchVendorRisk,
  fetchChurnRisk,
  fetchCohortAnalysis,
  fetchReportSchedules,
  createReportSchedule,
  deleteReportSchedule,
  triggerReportScheduleNow,
} from '@/lib/admin-platform-analytics';

export function IntelligenceTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Intelligence State
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [vendorRisk, setVendorRisk] = useState<any[]>([]);
  const [churnRisk, setChurnRisk] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  // Schedule Modal State
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [recipients, setRecipients] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [format, setFormat] = useState('csv');

  const loadIntelligenceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [anomRes, vRiskRes, cRiskRes, cohortRes, schedRes] = await Promise.all([
        fetchAnomalies().catch(() => ({ anomalies: [] })),
        fetchVendorRisk().catch(() => ({ vendor_risk: [] })),
        fetchChurnRisk().catch(() => ({ churn_risk: [] })),
        fetchCohortAnalysis().catch(() => ({ cohorts: [] })),
        fetchReportSchedules().catch(() => []),
      ]);

      setAnomalies(anomRes?.anomalies || []);
      setVendorRisk(vRiskRes?.vendor_risk || []);
      setChurnRisk(cRiskRes?.churn_risk || []);
      setCohorts(cohortRes?.cohorts || []);
      setSchedules(schedRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load intelligence metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntelligenceData();
  }, []);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleName || !recipients) return;
    try {
      await createReportSchedule({
        title: scheduleName,
        recipients: recipients.split(',').map((r) => r.trim()),
        frequency,
        format,
      });
      setShowScheduleForm(false);
      setScheduleName('');
      setRecipients('');
      await loadIntelligenceData();
    } catch (err: any) {
      alert(`Failed to create schedule: ${err.message}`);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report schedule?')) return;
    try {
      await deleteReportSchedule(id);
      await loadIntelligenceData();
    } catch (err: any) {
      alert(`Failed to delete schedule: ${err.message}`);
    }
  };

  const handleRunScheduleNow = async (id: string) => {
    try {
      await triggerReportScheduleNow(id);
      alert('Report generated and sent to recipients.');
    } catch (err: any) {
      alert(`Failed to trigger report: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-center space-x-3 text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
        <span className="font-semibold text-sm">Evaluating statistical models & risk intelligence...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8" role="region" aria-label="Platform Intelligence Engine">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600/30 rounded-2xl border border-indigo-500/30">
            <Brain className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Analytics Intelligence & Risk Engine</h2>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic Z-Score anomaly detection, vendor compliance scoring, churn heuristics, cohort retention matrices, and scheduled executive reports.
            </p>
          </div>
        </div>
        <button
          onClick={loadIntelligenceData}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Re-eval Insights
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Intelligence Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 1. Z-Score Anomaly Alerts */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Metric Anomaly Detection (Z-Score)</h3>
            </div>
            <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase rounded-full">
              {anomalies.length} Detected
            </span>
          </div>

          {anomalies.length === 0 ? (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All Metrics Within Normal Standard Deviation</p>
              <p className="text-[11px] text-slate-500">No statistical anomalies (z &gt; 2.0) detected in rolling 30-day window.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((item: any, idx: number) => (
                <div key={idx} className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block">{item.metric_name || 'Metric Variance'}</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Current: {item.current_value} vs Mean: {item.baseline_mean} (Z: {item.z_score})
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold text-[10px] uppercase rounded-lg">
                    {item.severity || 'Warning'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Vendor Compliance Risk */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Vendor Compliance Risk</h3>
            </div>
            <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] uppercase rounded-full">
              {vendorRisk.length} Flagged
            </span>
          </div>

          {vendorRisk.length === 0 ? (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No High Compliance Risk Vendors</p>
              <p className="text-[11px] text-slate-500">Dispute rates, order cancellations, and KYC rejection thresholds are nominal.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vendorRisk.map((item: any, idx: number) => (
                <div key={idx} className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-300 block">{item.store_name || item.vendor_id}</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Risk Score: {item.risk_score} / 100 — {item.reason || 'High dispute volume'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-rose-100 font-bold text-[10px] uppercase rounded-lg">
                    Score: {item.risk_score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Vendor Churn Risk */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserMinus className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Vendor Churn Risk Heuristics</h3>
            </div>
            <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] uppercase rounded-full">
              {churnRisk.length} Inactive
            </span>
          </div>

          {churnRisk.length === 0 ? (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Seller Activity Levels Active</p>
              <p className="text-[11px] text-slate-500">No stores exhibiting dormant sales or zero product publication patterns.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {churnRisk.map((item: any, idx: number) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{item.store_name || item.vendor_id}</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Days Inactive: {item.days_inactive} — {item.recommendation || 'Send activation prompt'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px] uppercase rounded-lg">
                    {item.churn_probability ? `${Math.round(item.churn_probability * 100)}% Risk` : 'Dormant'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Cohort Retention Analysis */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Monthly Cohort Retention</h3>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase rounded-full">
              6-Month Matrix
            </span>
          </div>

          {cohorts.length === 0 ? (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1">
              <Info className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Cohort Matrix Accumulating</p>
              <p className="text-[11px] text-slate-500">Cohort analytics require rolling 30-day customer cohort volume.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                    <th className="py-2 px-3 font-semibold">Cohort Month</th>
                    <th className="py-2 px-3 font-semibold">Initial Size</th>
                    <th className="py-2 px-3 font-semibold">M1</th>
                    <th className="py-2 px-3 font-semibold">M3</th>
                    <th className="py-2 px-3 font-semibold">M6</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {cohorts.map((row: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 text-slate-900 dark:text-slate-100 font-bold">{row.cohort_month}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{row.size}</td>
                      <td className="py-2 px-3 text-emerald-600 font-bold">{row.m1_retention ? `${row.m1_retention}%` : '—'}</td>
                      <td className="py-2 px-3 text-emerald-600 font-bold">{row.m3_retention ? `${row.m3_retention}%` : '—'}</td>
                      <td className="py-2 px-3 text-emerald-600 font-bold">{row.m6_retention ? `${row.m6_retention}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 5. Scheduled Executive Reports Management */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Scheduled Executive Reports</h3>
            </div>
            <button
              onClick={() => setShowScheduleForm(!showScheduleForm)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule New Report</span>
            </button>
          </div>

          {showScheduleForm && (
            <form onSubmit={handleCreateSchedule} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Schedule Executive Report Email</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Report Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Weekly Executive GMV & Vendor Digest"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Recipient Emails (comma separated)</label>
                  <input
                    type="text"
                    required
                    placeholder="exec@pandamarket.com, admin@pandamarket.com"
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Summary (Mondays)</option>
                    <option value="monthly">Monthly Executive Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Export Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="csv">CSV Dataset Export</option>
                    <option value="json">JSON Metadata Digest</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          )}

          {schedules.length === 0 ? (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1">
              <Calendar className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Scheduled Reports Configured</p>
              <p className="text-[11px] text-slate-500">Schedule recurring automated analytics summaries directly to executive team inboxes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                    <th className="py-2 px-3 font-semibold">Report Title</th>
                    <th className="py-2 px-3 font-semibold">Frequency</th>
                    <th className="py-2 px-3 font-semibold">Format</th>
                    <th className="py-2 px-3 font-semibold">Recipients</th>
                    <th className="py-2 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {schedules.map((sched: any) => (
                    <tr key={sched.id}>
                      <td className="py-3 px-3 text-slate-900 dark:text-slate-100 font-bold">{sched.title || sched.name}</td>
                      <td className="py-3 px-3 capitalize text-slate-600 dark:text-slate-400">{sched.frequency}</td>
                      <td className="py-3 px-3 uppercase font-bold text-indigo-600">{sched.format}</td>
                      <td className="py-3 px-3 text-slate-500 truncate max-w-xs">{Array.isArray(sched.recipients) ? sched.recipients.join(', ') : sched.recipients}</td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleRunScheduleNow(sched.id)}
                          className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] rounded-lg hover:bg-indigo-100 flex-inline items-center gap-1"
                        >
                          <Send className="w-3 h-3 inline mr-1" />
                          Run Now
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(sched.id)}
                          className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold text-[11px] rounded-lg hover:bg-rose-100 flex-inline items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
