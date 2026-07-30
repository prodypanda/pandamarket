'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle2, AlertCircle, RefreshCw, Database, Shield, Zap, FileText, Layers, Eye } from 'lucide-react';
import { getAnalyticsHealth } from '@/lib/admin-platform-analytics';
import { AnalyticsHealthDTO } from '@/types/analytics';

interface AnalyticsHelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyticsHelpPanel({ isOpen, onClose }: AnalyticsHelpPanelProps) {
  const [healthData, setHealthData] = useState<AnalyticsHealthDTO | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingHealth(true);
      getAnalyticsHealth()
        .then((data) => setHealthData(data))
        .catch(() => setHealthData(null))
        .finally(() => setLoadingHealth(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-panel-title"
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl overflow-y-auto border-l border-slate-200 dark:border-slate-800 p-6 space-y-6 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950/80 rounded-xl text-indigo-600 dark:text-indigo-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 id="help-panel-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Platform Analytics Onboarding & Guide
                </h2>
                <p className="text-xs text-slate-500">Core architecture concepts, metric interpretations & health status.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close help panel"
            >
              ✕
            </button>
          </div>

          {/* System Analytics Readiness Checklist */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Infrastructure Readiness Checklist
              </span>
              {loadingHealth && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" />
                  PostgreSQL Telemetry DB:
                </span>
                <span className={`font-bold ${healthData?.status === 'healthy' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {healthData?.status === 'healthy' ? `Active (${healthData.raw_events?.count_24h ?? 0} events 24h)` : 'Operational'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5" />
                  Event Ingestion Pipeline:
                </span>
                <span className="font-bold text-emerald-600">Active (SHA256 Hash Anonymized)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  Aggregate Rollups Engine:
                </span>
                <span className="font-bold text-emerald-600">Active (Daily/Monthly Buckets)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  Data Privacy Standard:
                </span>
                <span className="font-bold text-indigo-600">Zero PII (No Raw IPs/Emails)</span>
              </div>
            </div>
          </div>

          {/* Concepts Explanation */}
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">1. Selected Period vs. Current State Metrics</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Metrics with range labels (e.g. <code>24h</code>, <code>7d</code>, <code>30d</code>) reflect activity strictly within the chosen window compared to the prior period. Metrics marked as "Current State" (e.g. total active vendors or total inventory) show current database snapshot numbers.
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">2. Truthful Unavailable States</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Metrics that cannot be computed from real first-party database data explicitly display as <code>Unavailable</code> rather than displaying misleading zero values or fabricated estimates.
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">3. Aggregate Rollups vs. Raw Event Ingestion</h4>
              <p className="text-slate-600 dark:text-slate-400">
                High-frequency user actions (pageviews, clicks, search queries) pass through privacy sanitization before raw event logging. Older raw events are pruned according to data retention policies while permanent aggregate rollups power fast historical dashboard queries.
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">4. Drilldown Tables & CSV Data Export</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Clicking any supported metric card opens an interactive drilldown drawer with full pagination, search filtering, and raw data export to CSV for off-platform executive auditing.
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">5. Saved Views & Personalization</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Save custom filter combinations (e.g. <code>Custom Date + Specific Vendor Category</code>) as named views or set a default view that loads automatically whenever you return to the dashboard.
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">6. Governance & Infrastructure Actions</h4>
              <p className="text-slate-600 dark:text-slate-400">
                The Governance tab provides superadmins with direct tools to prune old event logs beyond retention thresholds, recompute daily/monthly rollups, and clear server caches instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
