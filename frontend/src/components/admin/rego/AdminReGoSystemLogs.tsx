'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Database,
  Download,
  Eye,
  FileWarning,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Server,
  ServerCrash,
  ShieldAlert,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { DashboardPageWrapper } from '@/components/dashboard/DashboardPageWrapper';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from '@/components/dashboard/rego/ReGoPrimitives';

export type SystemLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface SystemLogEntry {
  id: string;
  level: SystemLogLevel;
  source: string;
  event_type: string;
  message: string;
  request_id: string | null;
  method: string | null;
  path: string | null;
  status_code: number | null;
  user_id: string | null;
  user_role: string | null;
  ip: string | null;
  user_agent: string | null;
  error_name: string | null;
  error_code: string | null;
  stack: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SystemLogSummary {
  total: number;
  info?: number;
  errors: number;
  warnings: number;
  fatal: number;
  last_hour?: number;
  last_24h: number;
  unresolved_500s: number;
  manual_logs?: number;
}

export interface CreateLogForm {
  level: SystemLogLevel;
  source: string;
  event_type: string;
  message: string;
  path: string;
  status_code: string;
  error_name: string;
  error_code: string;
  stack: string;
  metadata: string;
}

export type ClearMode = 'filters' | 'older' | 'all';

export interface AdminReGoSystemLogsProps {
  entries: SystemLogEntry[];
  summary: SystemLogSummary;
  loading: boolean;
  error: string;
  page: number;
  totalPages: number;
  search: string;
  setSearch: (v: string) => void;
  level: string;
  setLevel: (v: string) => void;
  eventType: string;
  setEventType: (v: string) => void;
  source: string;
  setSource: (v: string) => void;
  requestId: string;
  setRequestId: (v: string) => void;
  hasStack: string;
  setHasStack: (v: string) => void;
  fromDate: string;
  setFromDate: (v: string) => void;
  toDate: string;
  setToDate: (v: string) => void;
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  showClear: boolean;
  setShowClear: (v: boolean) => void;
  creating: boolean;
  clearing: boolean;
  createError: string;
  createSuccess: string;
  clearError: string;
  clearSuccess: string;
  clearMode: ClearMode;
  setClearMode: (v: ClearMode) => void;
  clearConfirm: string;
  setClearConfirm: (v: string) => void;
  olderThanDays: string;
  setOlderThanDays: (v: string) => void;
  createForm: CreateLogForm;
  setCreateForm: React.Dispatch<React.SetStateAction<CreateLogForm>>;
  onCreateLog: (e: React.FormEvent<HTMLFormElement>) => void;
  onClearLogs: (e: React.FormEvent<HTMLFormElement>) => void;
  onRefresh: () => void;
  onResetFilters: () => void;
  onPageChange: (p: number) => void;
}

export function AdminReGoSystemLogs({
  entries,
  summary,
  loading,
  error,
  page,
  totalPages,
  search,
  setSearch,
  level,
  setLevel,
  eventType,
  setEventType,
  source,
  setSource,
  requestId,
  setRequestId,
  hasStack,
  setHasStack,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  showCreate,
  setShowCreate,
  showClear,
  setShowClear,
  creating,
  clearing,
  createError,
  createSuccess,
  clearError,
  clearSuccess,
  clearMode,
  setClearMode,
  clearConfirm,
  setClearConfirm,
  olderThanDays,
  setOlderThanDays,
  createForm,
  setCreateForm,
  onCreateLog,
  onClearLogs,
  onRefresh,
  onResetFilters,
  onPageChange,
}: AdminReGoSystemLogsProps) {
  const [selectedLog, setSelectedLog] = useState<SystemLogEntry | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyValue = (text: string | null | undefined, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getLevelChip = (lvl: SystemLogLevel) => {
    switch (lvl) {
      case 'fatal':
        return <ReGoStatusChip status="err" label="FATAL" size="xs" />;
      case 'error':
        return <ReGoStatusChip status="err" label="ERROR" size="xs" />;
      case 'warn':
        return <ReGoStatusChip status="warn" label="WARN" size="xs" />;
      case 'info':
        return <ReGoStatusChip status="info" label="INFO" size="xs" />;
      default:
        return <ReGoStatusChip status="neutral" label={lvl.toUpperCase()} size="xs" />;
    }
  };

  const levelOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Tous' },
    { value: 'fatal', label: 'FATAL' },
    { value: 'error', label: 'ERROR' },
    { value: 'warn', label: 'WARN' },
    { value: 'info', label: 'INFO' },
    { value: 'debug', label: 'DEBUG' },
  ];

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Administration', href: '/dashboard' },
        { label: 'Infrastructure', href: '/system-logs' },
        { label: 'Logs Serveur' },
      ]}
      headerTitle="Journaux Système & Erreurs Serveur"
      headerSubtitle="Console d'inspection technique des flux de logs de production, exceptions applicatives, erreurs 500 et alertes de performance."
      headerIcon={Server}
      statusBadge={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-[var(--rego-ink-2,#737373)]">Node: Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-[var(--rego-ink-2,#737373)]">PostgreSQL: OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-[var(--rego-ink-2,#737373)]">Redis: Actif</span>
          </div>
        </div>
      }
      secondaryAction={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowClear(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-rose-700 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purger</span>
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Manuel</span>
          </button>
        </div>
      }
      primaryAction={
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      }
      alertBanner={
        summary.unresolved_500s > 0 || summary.fatal > 0 ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-rose-300 bg-rose-50 text-rose-900 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <ServerCrash className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Attention critique : {summary.unresolved_500s} erreur{summary.unresolved_500s > 1 ? 's' : ''} 500 et {summary.fatal} incident{summary.fatal > 1 ? 's' : ''} fatal{summary.fatal > 1 ? 's' : ''} nécessitent une intervention immédiate.
              </span>
            </div>
            <button
              onClick={() => {
                setLevel('error');
              }}
              className="px-2.5 py-1 text-[11px] font-bold rounded bg-rose-600 text-white hover:bg-rose-700"
            >
              Voir les erreurs critiques
            </button>
          </div>
        ) : null
      }
      kpiStrip={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <ReGoKpiHero
            label="Total Logs"
            value={summary.total.toLocaleString('fr-TN')}
            hint="Entrées enregistrées"
            icon={Database}
          />
          <ReGoKpiHero
            label="Erreurs & Crashs"
            value={(summary.errors + summary.fatal).toLocaleString('fr-TN')}
            hint={`${summary.fatal} fatal, ${summary.errors} errors`}
            delta={summary.errors + summary.fatal}
            deltaType={(summary.errors + summary.fatal) > 0 ? 'decrease' : 'neutral'}
            deltaLabel="anomalies"
            icon={ServerCrash}
            accent={(summary.errors + summary.fatal) > 0}
          />
          <ReGoKpiHero
            label="Avertissements (Warn)"
            value={summary.warnings.toLocaleString('fr-TN')}
            hint="Alertes non bloquantes"
            icon={AlertTriangle}
          />
          <ReGoKpiHero
            label="Erreurs 500 Serveur"
            value={summary.unresolved_500s.toLocaleString('fr-TN')}
            hint="Exceptions HTTP 500"
            icon={ShieldAlert}
          />
          <ReGoKpiHero
            label="Dernières 24h"
            value={summary.last_24h.toLocaleString('fr-TN')}
            hint="Flux d'activité récent"
            icon={Clock}
          />
        </div>
      }
      filterToolbar={
        <div className="space-y-3 border-b border-[var(--rego-border,#dedede)]/70 pb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrer dans la trace de pile (Stacktrace) ou message..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] placeholder:text-[var(--rego-ink-3,#949494)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
              />
            </div>

            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Service source (ex: auth, checkout)..."
              className="py-1.5 px-3 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] w-48"
            />

            <select
              value={hasStack}
              onChange={(e) => setHasStack(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
            >
              <option value="all">Toutes les traces</option>
              <option value="true">Avec Stacktrace</option>
              <option value="false">Sans Stacktrace</option>
            </select>

            <button
              onClick={onResetFilters}
              className="p-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]"
              title="Réinitialiser les filtres"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <span className="text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)] mr-1">
                Niveau :
              </span>
              {levelOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLevel(opt.value)}
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full transition-all ${
                    level === opt.value
                      ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                      : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-[var(--rego-ink-3,#949494)]">Période :</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="py-1 px-2 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
              />
              <span className="text-[var(--rego-ink-3,#949494)]">à</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="py-1 px-2 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
              />
            </div>
          </div>
        </div>
      }
      mainContent={
        <ReGoCard noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/60 text-[var(--rego-ink-2,#737373)] uppercase font-bold text-[10px] tracking-wider">
                  <th className="px-4 py-3">Niveau</th>
                  <th className="px-4 py-3">Horodatage (UTC+1)</th>
                  <th className="px-4 py-3">Service Source</th>
                  <th className="px-4 py-3">Message d'Erreur & Route</th>
                  <th className="px-4 py-3 text-center">Code HTTP</th>
                  <th className="px-4 py-3 text-center">Trace</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[var(--rego-ink-3,#949494)]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--rego-accent,#ad0505)]" />
                      Chargement des flux de logs système...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[var(--rego-ink-3,#949494)]">
                      Aucun log système ne correspond aux filtres appliqués.
                    </td>
                  </tr>
                ) : (
                  entries.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors"
                    >
                      <td className="px-4 py-3">{getLevelChip(log.level)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-[var(--rego-ink-2,#737373)] font-mono">
                        {new Date(log.created_at).toLocaleString('fr-TN', {
                          timeStyle: 'medium',
                          dateStyle: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[var(--rego-fg,#111111)] bg-[var(--rego-surface,#f5f5f5)] px-2 py-0.5 rounded text-[11px]">
                          {log.source || 'server'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0 max-w-[320px]">
                          <p className="font-semibold text-[var(--rego-fg,#111111)] truncate" title={log.message}>
                            {log.message}
                          </p>
                          {log.path && (
                            <p className="font-mono text-[10px] text-[var(--rego-ink-2,#737373)] truncate">
                              {log.method ? `${log.method} ` : ''}{log.path}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.status_code ? (
                          <span
                            className={`font-mono text-[11px] font-bold ${
                              log.status_code >= 500
                                ? 'text-rose-600'
                                : log.status_code >= 400
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {log.status_code}
                          </span>
                        ) : (
                          <span className="text-[var(--rego-ink-3,#949494)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.stack ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            <Terminal className="w-3 h-3" /> Stack
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--rego-ink-3,#949494)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors"
                          title="Déplier la trace complète d'erreur (Stacktrace)"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/30 text-xs">
              <span className="text-[var(--rego-ink-2,#737373)]">
                Page {page} sur {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  className="px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] disabled:opacity-40 font-bold"
                >
                  Précédent
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] disabled:opacity-40 font-bold"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </ReGoCard>
      }
      drawer={
        <ReGoDrawer
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Trace d'Erreur & Diagnostic Serveur"
          subtitle={selectedLog ? `Log ID: #${selectedLog.id}` : ''}
          width="max-w-2xl"
        >
          {selectedLog && (
            <div className="space-y-4 text-xs">
              {/* Message Header */}
              <div className="p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/60 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getLevelChip(selectedLog.level)}
                    <span className="font-mono text-[10px] text-[var(--rego-ink-2,#737373)]">
                      {new Date(selectedLog.created_at).toLocaleString('fr-TN')}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-[var(--rego-fg,#111111)] break-words">
                    {selectedLog.message}
                  </h4>
                  {selectedLog.error_name && (
                    <p className="font-mono text-xs font-bold text-rose-700 mt-1">
                      {selectedLog.error_name} {selectedLog.error_code ? `(${selectedLog.error_code})` : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Telemetry Grid */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Source</span>
                  <span className="font-bold text-[var(--rego-fg,#111111)]">{selectedLog.source}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Event Type</span>
                  <span className="font-mono text-[var(--rego-fg,#111111)]">{selectedLog.event_type}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Request ID</span>
                  <span className="font-mono text-[var(--rego-fg,#111111)]">{selectedLog.request_id || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Statut HTTP</span>
                  <span className="font-mono font-bold text-[var(--rego-fg,#111111)]">{selectedLog.status_code || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">IP Client</span>
                  <span className="font-mono text-[var(--rego-fg,#111111)]">{selectedLog.ip || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Utilisateur</span>
                  <span className="font-mono text-[var(--rego-fg,#111111)]">{selectedLog.user_id ? `#${selectedLog.user_id}` : 'Anonyme'}</span>
                </div>
              </div>

              {/* Endpoint path */}
              {selectedLog.path && (
                <div>
                  <span className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Route & Méthode</span>
                  <div className="p-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] font-mono text-[11px] text-[var(--rego-fg,#111111)] break-all">
                    {selectedLog.method ? `${selectedLog.method} ` : ''}{selectedLog.path}
                  </div>
                </div>
              )}

              {/* Stacktrace */}
              {selectedLog.stack && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[var(--rego-fg,#111111)]">Trace Complète (Stacktrace)</span>
                    <button
                      onClick={() => copyValue(selectedLog.stack, 'stack')}
                      className="inline-flex items-center gap-1 text-[10px] text-[var(--rego-accent,#ad0505)] hover:underline"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey === 'stack' ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-[var(--rego-r,8px)] bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-72 whitespace-pre-wrap break-all leading-5">
                    {selectedLog.stack}
                  </pre>
                </div>
              )}

              {/* Metadata JSON */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[var(--rego-fg,#111111)]">Métadonnées Contextuelles</span>
                    <button
                      onClick={() => copyValue(JSON.stringify(selectedLog.metadata, null, 2), 'meta')}
                      className="inline-flex items-center gap-1 text-[10px] text-[var(--rego-accent,#ad0505)] hover:underline"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey === 'meta' ? 'Copié !' : 'Copier JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] font-mono text-[11px] overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </ReGoDrawer>
      }
      modals={
        <>
          {/* Modal 1: Create Manual Log */}
          <ReGoModal
            isOpen={showCreate}
            onClose={() => setShowCreate(false)}
            title="Créer une Entrée de Log Système"
            subtitle="Ajoutez un événement technique ou une trace manuelle dans le registre"
            maxWidth="max-w-lg"
          >
            <form onSubmit={onCreateLog} className="space-y-3 text-xs">
              {createError && (
                <div className="p-2.5 rounded-[var(--rego-r,8px)] border border-rose-300 bg-rose-50 text-rose-800">
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="p-2.5 rounded-[var(--rego-r,8px)] border border-emerald-300 bg-emerald-50 text-emerald-800">
                  {createSuccess}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Niveau</label>
                  <select
                    value={createForm.level}
                    onChange={(e) => setCreateForm((c) => ({ ...c, level: e.target.value as SystemLogLevel }))}
                    className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                  >
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                    <option value="fatal">Fatal</option>
                    <option value="debug">Debug</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Source</label>
                  <input
                    type="text"
                    value={createForm.source}
                    onChange={(e) => setCreateForm((c) => ({ ...c, source: e.target.value }))}
                    placeholder="admin_manual"
                    className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Message</label>
                <input
                  type="text"
                  required
                  value={createForm.message}
                  onChange={(e) => setCreateForm((c) => ({ ...c, message: e.target.value }))}
                  placeholder="Message explicatif..."
                  className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                />
              </div>
              <div>
                <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Stacktrace (optionnel)</label>
                <textarea
                  rows={3}
                  value={createForm.stack}
                  onChange={(e) => setCreateForm((c) => ({ ...c, stack: e.target.value }))}
                  className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--rego-border,#dedede)]">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white disabled:opacity-50"
                >
                  <Save className={`w-3.5 h-3.5 ${creating ? 'animate-spin' : ''}`} />
                  <span>{creating ? 'Création...' : 'Enregistrer'}</span>
                </button>
              </div>
            </form>
          </ReGoModal>

          {/* Modal 2: Clear Logs */}
          <ReGoModal
            isOpen={showClear}
            onClose={() => setShowClear(false)}
            title="Purger les Journaux Système"
            subtitle="Cette action supprime les logs selon le mode sélectionné."
            maxWidth="max-w-md"
          >
            <form onSubmit={onClearLogs} className="space-y-3 text-xs">
              {clearError && (
                <div className="p-2.5 rounded-[var(--rego-r,8px)] border border-rose-300 bg-rose-50 text-rose-800">
                  {clearError}
                </div>
              )}
              {clearSuccess && (
                <div className="p-2.5 rounded-[var(--rego-r,8px)] border border-emerald-300 bg-emerald-50 text-emerald-800">
                  {clearSuccess}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="font-bold text-[var(--rego-fg,#111111)] block">Mode de Purge</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'filters', label: 'Filtres actifs' },
                    { key: 'older', label: 'Plus de X jours' },
                    { key: 'all', label: 'Tout purger' },
                  ].map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setClearMode(m.key as ClearMode)}
                      className={`p-2 rounded-[var(--rego-r,8px)] border text-center font-bold text-[11px] ${
                        clearMode === m.key
                          ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-accent,#ad0505)]'
                          : 'border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {clearMode === 'older' && (
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                    Supprimer les logs de plus de (jours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={olderThanDays}
                    onChange={(e) => setOlderThanDays(e.target.value)}
                    className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                  Tapez <span className="font-mono text-rose-600">CLEAR LOGS</span> pour confirmer :
                </label>
                <input
                  type="text"
                  value={clearConfirm}
                  onChange={(e) => setClearConfirm(e.target.value)}
                  placeholder="CLEAR LOGS"
                  className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--rego-border,#dedede)]">
                <button
                  type="button"
                  onClick={() => setShowClear(false)}
                  className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={clearing || clearConfirm !== 'CLEAR LOGS'}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  <Trash2 className={`w-3.5 h-3.5 ${clearing ? 'animate-spin' : ''}`} />
                  <span>{clearing ? 'Purge en cours...' : 'Confirmer'}</span>
                </button>
              </div>
            </form>
          </ReGoModal>
        </>
      }
    />
  );
}
