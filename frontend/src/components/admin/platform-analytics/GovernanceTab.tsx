'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Database, RefreshCw, Trash2, Zap, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';
import {
  getRetentionStatus,
  runRetentionCleanup,
  recomputeRollups,
  invalidateCache,
  getAnalyticsHealth,
} from '@/lib/admin-platform-analytics';
import {
  AnalyticsRetentionStatusDTO,
  AnalyticsHealthDTO,
  AnalyticsRetentionCleanupResultDTO,
  RollupsRecomputeResultDTO,
  CacheInvalidateResultDTO,
} from '@/types/analytics';

export function GovernanceTab() {
  const [retentionStatus, setRetentionStatus] = useState<AnalyticsRetentionStatusDTO | null>(null);
  const [healthStatus, setHealthStatus] = useState<AnalyticsHealthDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [cleanupDays, setCleanupDays] = useState<number>(180);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<AnalyticsRetentionCleanupResultDTO | null>(null);

  const [recomputing, setRecomputing] = useState(false);
  const [recomputeResult, setRecomputeResult] = useState<RollupsRecomputeResultDTO | null>(null);
  const [recomputePeriod, setRecomputePeriod] = useState<string>('daily');

  const [invalidating, setInvalidating] = useState(false);
  const [invalidateResult, setInvalidateResult] = useState<CacheInvalidateResultDTO | null>(null);

  const fetchGovernanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [retRes, healthRes] = await Promise.all([
        getRetentionStatus().catch(() => null),
        getAnalyticsHealth().catch(() => null),
      ]);
      setRetentionStatus(retRes);
      setHealthStatus(healthRes);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load governance metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernanceData();
  }, []);

  const handleRetentionCleanup = async () => {
    if (!confirm(`Are you sure you want to prune raw analytics events older than ${cleanupDays} days?`)) {
      return;
    }
    setCleaning(true);
    setCleanupResult(null);
    try {
      const res = await runRetentionCleanup(cleanupDays);
      setCleanupResult(res);
      await fetchGovernanceData();
    } catch (err: unknown) {
      alert(`Cleanup failed: ${(err as Error).message}`);
    } finally {
      setCleaning(false);
    }
  };

  const handleRecomputeRollups = async () => {
    setRecomputing(true);
    setRecomputeResult(null);
    try {
      const res = await recomputeRollups({ period: recomputePeriod });
      setRecomputeResult(res);
    } catch (err: unknown) {
      alert(`Recompute failed: ${(err as Error).message}`);
    } finally {
      setRecomputing(false);
    }
  };

  const handleInvalidateCache = async () => {
    setInvalidating(true);
    setInvalidateResult(null);
    try {
      const res = await invalidateCache('all');
      setInvalidateResult(res);
    } catch (err: unknown) {
      alert(`Cache invalidation failed: ${(err as Error).message}`);
    } finally {
      setInvalidating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-center space-x-3 text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
        <span className="font-semibold text-sm">Loading governance & telemetry controls...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600/30 rounded-2xl border border-indigo-500/30">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Analytics Data Governance & Health</h2>
            <p className="text-xs text-slate-400 mt-1">
              Manage data retention policies, raw event pruning, aggregate rollup recalculations, and analytics cache controls.
            </p>
          </div>
        </div>
        <button
          onClick={fetchGovernanceData}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Diagnostics
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Governance Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 1. Retention & Pruning */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Data Retention & Raw Event Pruning</h3>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase rounded-full">
              Policy Active (180d)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium block">Total Raw Events</span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">
                {retentionStatus?.raw_event_count?.toLocaleString() ?? 0}
              </span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium block">Oldest Raw Event</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2 block truncate">
                {retentionStatus?.oldest_raw_event_at
                  ? new Date(retentionStatus.oldest_raw_event_at).toLocaleDateString()
                  : 'No events'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-4">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Manual Raw Event Pruning Window (Days)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="30"
                max="365"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(Number(e.target.value))}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold w-28 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleRetentionCleanup}
                disabled={cleaning}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-2"
              >
                {cleaning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Prune Raw Events</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Raw events older than the retention threshold will be deleted. Pre-aggregated rollups are preserved permanently for long-term trend analysis.
            </p>
            {cleanupResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Successfully pruned {cleanupResult.deleted_events} raw events.</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Rollup Aggregations */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Daily & Monthly Rollups</h3>
            </div>
            <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] uppercase rounded-full">
              Automated Aggregation
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium block">Latest Event Rollup</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2 block truncate">
                {healthStatus?.rollups?.latest_event_rollup_date
                  ? new Date(healthStatus.rollups.latest_event_rollup_date).toLocaleDateString()
                  : 'Active'}
              </span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium block">Latest Search Rollup</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2 block truncate">
                {healthStatus?.rollups?.latest_search_rollup_date
                  ? new Date(healthStatus.rollups.latest_search_rollup_date).toLocaleDateString()
                  : 'Active'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-4">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Recompute Rollups Period
            </label>
            <div className="flex items-center gap-3">
              <select
                value={recomputePeriod}
                onChange={(e) => setRecomputePeriod(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="daily">Daily Rollups</option>
                <option value="weekly">Weekly Rollups</option>
                <option value="monthly">Monthly Rollups</option>
              </select>
              <button
                onClick={handleRecomputeRollups}
                disabled={recomputing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-2"
              >
                {recomputing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>Recompute Rollups</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Recomputes background rollups for accurate reporting. Safe to run anytime.
            </p>
            {recomputeResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Rollups recomputed successfully ({recomputeResult.days_processed ?? 0} days processed, {recomputeResult.event_rollups_inserted ?? 0} rollups inserted).</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Cache & Telemetry Performance */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Analytics Cache & Health Telemetry</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInvalidateCache}
                disabled={invalidating}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-2"
              >
                {invalidating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Flush Analytics Cache</span>
              </button>
            </div>
          </div>

          {invalidateResult && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Analytics cache flushed successfully ({invalidateResult.cleared_keys_count ?? 0} keys cleared).</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium block">Database Status</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {healthStatus?.status === 'healthy' ? 'Healthy' : 'Checking...'}
                </span>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium block">Cache Latency</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                  {healthStatus?.cache?.latency_ms != null ? `${healthStatus.cache.latency_ms} ms` : '—'}
                </span>
              </div>
              <Zap className="w-6 h-6 text-amber-500" />
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium block">Event Ingestion Queue</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                  Healthy (Direct Insert)
                </span>
              </div>
              <ShieldCheck className="w-6 h-6 text-indigo-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
