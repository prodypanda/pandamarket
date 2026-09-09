'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
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
  FileSearch,
  FileText,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  Terminal,
  Trash2,
  Users,
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

export interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  method: string | null;
  status_code: number | null;
  duration_ms: number | null;
  path: string | null;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditSummary {
  total: number;
  last_24h: number;
  failed: number;
  actors: number;
  writes: number;
}

export interface CounterRow {
  action?: string;
  resource_type?: string | null;
  count: string | number;
}

export interface AdminReGoAuditLogProps {
  logType: 'admin' | 'seller' | 'buyer';
  entries: AuditEntry[];
  summary: AuditSummary;
  loading: boolean;
  error: string;
  page: number;
  totalPages: number;
  total: number;
  search: string;
  searchInput: string;
  setSearchInput: (v: string) => void;
  setSearch: (v: string) => void;
  actionFilter: string;
  setActionFilter: (v: string) => void;
  resourceType: string;
  setResourceType: (v: string) => void;
  actorRole: string;
  setActorRole: (v: string) => void;
  method: string;
  setMethod: (v: string) => void;
  statusCode: string;
  setStatusCode: (v: string) => void;
  fromDate: string;
  setFromDate: (v: string) => void;
  toDate: string;
  setToDate: (v: string) => void;
  selectedEntry: AuditEntry | null;
  setSelectedEntry: (v: AuditEntry | null) => void;
  isExporting: boolean;
  onExport: () => void;
  showPurgeModal: boolean;
  setShowPurgeModal: (v: boolean) => void;
  purgeDays: number;
  setPurgeDays: (v: number) => void;
  isPurging: boolean;
  onPurge: () => void;
  onRefresh: () => void;
  onResetFilters: () => void;
  onPageChange: (p: number) => void;
  actions: CounterRow[];
  resources: CounterRow[];
}

export function AdminReGoAuditLog({
  logType,
  entries,
  summary,
  loading,
  error,
  page,
  totalPages,
  total,
  search,
  searchInput,
  setSearchInput,
  setSearch,
  actionFilter,
  setActionFilter,
  resourceType,
  setResourceType,
  actorRole,
  setActorRole,
  method,
  setMethod,
  statusCode,
  setStatusCode,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  selectedEntry,
  setSelectedEntry,
  isExporting,
  onExport,
  showPurgeModal,
  setShowPurgeModal,
  purgeDays,
  setPurgeDays,
  isPurging,
  onPurge,
  onRefresh,
  onResetFilters,
  onPageChange,
  actions,
  resources,
}: AdminReGoAuditLogProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Copy helper
  const copyValue = (text: string | null | undefined, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Header meta by logType
  const meta = useMemo(() => {
    switch (logType) {
      case 'seller':
        return {
          title: "Journal d'Activité des Vendeurs",
          subtitle: "Consultez l'historique des opérations sensibles réalisées par les marchands au sein de leurs tableaux de bord respectifs.",
          breadcrumb: 'Audit Vendeurs',
          icon: FileText,
          roles: ['all', 'vendor'],
        };
      case 'buyer':
        return {
          title: "Journal d'Activité des Acheteurs",
          subtitle: "Surveillez les comportements des clients, les tentatives d'authentification et les modifications d'adresses.",
          breadcrumb: 'Audit Acheteurs',
          icon: FileSearch,
          roles: ['all', 'customer'],
        };
      default:
        return {
          title: "Journal d'Audit des Administrateurs",
          subtitle: "Traçabilité intégrale et inaltérable de chaque action, modification de politique et intervention administrative effectuée sur la plateforme.",
          breadcrumb: 'Audit Administrateur',
          icon: Shield,
          roles: ['all', 'admin', 'super_admin'],
        };
    }
  }, [logType]);

  const methodOptions = ['all', 'POST', 'PUT', 'PATCH', 'DELETE', 'GET'];

  // Status Chip Tone Helper
  const getStatusChip = (code: number | null) => {
    if (!code) return <ReGoStatusChip status="neutral" label="N/A" />;
    if (code >= 500) return <ReGoStatusChip status="err" label={`${code} ERR`} />;
    if (code >= 400) return <ReGoStatusChip status="warn" label={`${code} WARN`} />;
    return <ReGoStatusChip status="ok" label={`${code} OK`} />;
  };

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Administration', href: '/dashboard' },
        { label: 'Infrastructure', href: '/audit-log' },
        { label: meta.breadcrumb },
      ]}
      headerTitle={meta.title}
      headerSubtitle={meta.subtitle}
      headerIcon={meta.icon}
      statusBadge={
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
            {total.toLocaleString('fr-TN')} Événements Enregistrés
          </span>
        </div>
      }
      secondaryAction={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPurgeModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-rose-700 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purger</span>
          </button>
          <button
            onClick={onExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-50 transition-colors"
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
            <span>{isExporting ? 'Export...' : 'Exporter CSV'}</span>
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
        summary.failed > 0 ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-rose-300 bg-rose-50 text-rose-900 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Attention : {summary.failed} action{summary.failed > 1 ? 's' : ''} ont échoué ou ont été rejetées lors des dernières 24h.
              </span>
            </div>
            <button
              onClick={() => {
                setStatusCode('400');
              }}
              className="px-2.5 py-1 text-[11px] font-bold rounded bg-rose-600 text-white hover:bg-rose-700"
            >
              Filtrer les erreurs
            </button>
          </div>
        ) : null
      }
      kpiStrip={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <ReGoKpiHero
            label="Total Événements"
            value={summary.total.toLocaleString('fr-TN')}
            hint="Historique complet immuable"
            icon={Database}
            accent
          />
          <ReGoKpiHero
            label="Dernières 24h"
            value={summary.last_24h.toLocaleString('fr-TN')}
            hint="Activité récente enregistrée"
            icon={Clock}
          />
          <ReGoKpiHero
            label="Échecs / Rejets"
            value={summary.failed.toLocaleString('fr-TN')}
            hint="Statut HTTP 4xx / 5xx"
            delta={summary.failed}
            deltaType={summary.failed > 0 ? 'decrease' : 'neutral'}
            deltaLabel="anomalies"
            icon={AlertTriangle}
          />
          <ReGoKpiHero
            label="Acteurs Distincts"
            value={summary.actors.toLocaleString('fr-TN')}
            hint="Utilisateurs audités"
            icon={Users}
          />
          <ReGoKpiHero
            label="Mutations / Écritures"
            value={summary.writes.toLocaleString('fr-TN')}
            hint="POST, PUT, PATCH, DELETE"
            icon={Activity}
          />
        </div>
      }
      filterToolbar={
        <div className="space-y-3 border-b border-[var(--rego-border,#dedede)]/70 pb-3">
          {/* Top Row: Search + Action Filter + Actor Role */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSearch(searchInput);
                }}
                placeholder="Rechercher par action, cible, email ou IP..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] placeholder:text-[var(--rego-ink-3,#949494)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
              />
            </div>

            <button
              onClick={() => setSearch(searchInput)}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-border,#dedede)] transition-colors"
            >
              Rechercher
            </button>

            {/* Action filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
            >
              <option value="all">Toutes les actions</option>
              {actions.map((act) => (
                <option key={act.action} value={act.action}>
                  {act.action} ({act.count})
                </option>
              ))}
            </select>

            {/* Actor role filter */}
            <select
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
            >
              {meta.roles.map((r) => (
                <option key={r} value={r}>
                  {r === 'all' ? 'Tous les rôles' : r}
                </option>
              ))}
            </select>

            {/* Reset button */}
            <button
              onClick={onResetFilters}
              className="p-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]"
              title="Réinitialiser les filtres"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bottom Row: HTTP Method pills + Date filters */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <span className="text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)] mr-1">
                Méthode :
              </span>
              {methodOptions.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full transition-all ${
                    method === m
                      ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                      : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                  }`}
                >
                  {m.toUpperCase()}
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
                  <th className="px-4 py-3">Horodatage (UTC+1)</th>
                  <th className="px-4 py-3">Acteur</th>
                  <th className="px-4 py-3">Action & Méthode</th>
                  <th className="px-4 py-3">Cible / Ressource</th>
                  <th className="px-4 py-3 text-center">Statut HTTP</th>
                  <th className="px-4 py-3">IP & Machine</th>
                  <th className="px-4 py-3 text-center">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[var(--rego-ink-3,#949494)]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--rego-accent,#ad0505)]" />
                      Chargement du journal d'audit...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[var(--rego-ink-3,#949494)]">
                      Aucun événement d'audit ne correspond aux filtres appliqués.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-[var(--rego-ink-2,#737373)]">
                        {new Date(entry.created_at).toLocaleString('fr-TN', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0 max-w-[180px]">
                          <p className="font-bold text-[var(--rego-fg,#111111)] truncate">
                            {entry.actor_email || entry.actor_id || 'Système'}
                          </p>
                          <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-3,#949494)]">
                            {entry.actor_role || 'anonyme'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {entry.method && (
                            <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)]">
                              {entry.method}
                            </span>
                          )}
                          <span className="font-semibold text-[var(--rego-fg,#111111)] truncate max-w-[200px]">
                            {entry.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[11px]">
                          <span className="font-bold text-[var(--rego-fg,#111111)]">
                            {entry.resource_type || '-'}
                          </span>
                          {entry.resource_id && (
                            <p className="font-mono text-[10px] text-[var(--rego-ink-2,#737373)] truncate max-w-[140px]">
                              #{entry.resource_id}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusChip(entry.status_code)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[11px] max-w-[160px]">
                          <p className="font-mono text-[var(--rego-fg,#111111)] truncate">{entry.ip || '-'}</p>
                          <p className="text-[10px] text-[var(--rego-ink-3,#949494)] truncate">{entry.user_agent || '-'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className="p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors"
                          title="Inspecter l'événement et les métadonnées"
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
                Page {page} sur {totalPages} ({total.toLocaleString('fr-TN')} événements au total)
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
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          title="Inspection de l'Événement d'Audit"
          subtitle={selectedEntry ? `ID: #${selectedEntry.id}` : ''}
          width="max-w-xl"
        >
          {selectedEntry && (
            <div className="space-y-4 text-xs">
              {/* Event Header Card */}
              <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/60 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[var(--rego-fg,#111111)]">{selectedEntry.action}</h4>
                  <p className="text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5">
                    {new Date(selectedEntry.created_at).toLocaleString('fr-TN')}
                  </p>
                </div>
                {getStatusChip(selectedEntry.status_code)}
              </div>

              {/* Telemetry Grid */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Acteur</span>
                  <div className="flex items-center gap-1 font-bold text-[var(--rego-fg,#111111)]">
                    <span className="truncate">{selectedEntry.actor_email || selectedEntry.actor_id || 'Système'}</span>
                    <button
                      onClick={() => copyValue(selectedEntry.actor_email || selectedEntry.actor_id, 'actor')}
                      className="text-[var(--rego-ink-3,#949494)] hover:text-[var(--rego-fg,#111111)]"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Rôle</span>
                  <span className="font-semibold text-[var(--rego-fg,#111111)]">{selectedEntry.actor_role || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Méthode HTTP</span>
                  <span className="font-mono font-bold text-[var(--rego-fg,#111111)]">{selectedEntry.method || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Durée</span>
                  <span className="font-mono text-[var(--rego-fg,#111111)]">
                    {selectedEntry.duration_ms !== null ? `${selectedEntry.duration_ms} ms` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Ressource Cible</span>
                  <span className="font-bold text-[var(--rego-fg,#111111)]">
                    {selectedEntry.resource_type || '-'} {selectedEntry.resource_id ? `#${selectedEntry.resource_id}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Adresse IP</span>
                  <div className="flex items-center gap-1 font-mono text-[var(--rego-fg,#111111)]">
                    <span>{selectedEntry.ip || '-'}</span>
                    <button
                      onClick={() => copyValue(selectedEntry.ip, 'ip')}
                      className="text-[var(--rego-ink-3,#949494)] hover:text-[var(--rego-fg,#111111)]"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Request Path */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[var(--rego-fg,#111111)]">Endpoint URL / Route</span>
                  <button
                    onClick={() => copyValue(selectedEntry.path, 'path')}
                    className="inline-flex items-center gap-1 text-[10px] text-[var(--rego-accent,#ad0505)] hover:underline"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'path' ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] font-mono text-[11px] text-[var(--rego-fg,#111111)] break-all">
                  {selectedEntry.path || '-'}
                </div>
              </div>

              {/* User Agent */}
              <div>
                <span className="font-bold text-[var(--rego-fg,#111111)] block mb-1">User-Agent / Navigateur</span>
                <div className="p-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] font-mono text-[10px] text-[var(--rego-ink-2,#737373)] break-all">
                  {selectedEntry.user_agent || '-'}
                </div>
              </div>

              {/* Metadata JSON */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[var(--rego-fg,#111111)]">Métadonnées & Diff (Payload JSON)</span>
                  <button
                    onClick={() => copyValue(JSON.stringify(selectedEntry.metadata, null, 2), 'meta')}
                    className="inline-flex items-center gap-1 text-[10px] text-[var(--rego-accent,#ad0505)] hover:underline"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'meta' ? 'Copié !' : 'Copier JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] font-mono text-[11px] overflow-x-auto max-h-60 text-[var(--rego-fg,#111111)]">
                  {selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0
                    ? JSON.stringify(selectedEntry.metadata, null, 2)
                    : '// Aucune métadonnée enregistrée pour cette action'}
                </pre>
              </div>
            </div>
          )}
        </ReGoDrawer>
      }
      modals={
        <ReGoModal
          isOpen={showPurgeModal}
          onClose={() => setShowPurgeModal(false)}
          title="Purger les Anciens Événements d'Audit"
          subtitle="Cette action est irréversible et supprime définitivement les logs antérieurs à la période choisie."
          maxWidth="max-w-md"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPurgeModal(false)}
                className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]"
              >
                Annuler
              </button>
              <button
                onClick={onPurge}
                disabled={isPurging}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isPurging ? 'animate-spin' : ''}`} />
                <span>{isPurging ? 'Suppression...' : 'Confirmer la Purge'}</span>
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <label className="font-bold text-[var(--rego-fg,#111111)] block">
              Conserver les logs des derniers :
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setPurgeDays(days)}
                  className={`p-2.5 rounded-[var(--rego-r,8px)] border text-center font-bold transition-all ${
                    purgeDays === days
                      ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-accent,#ad0505)]'
                      : 'border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)]'
                  }`}
                >
                  {days} Jours
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
              Tous les enregistrements d'audit antérieurs à <strong>{purgeDays} jours</strong> seront purgés de la base de données.
            </p>
          </div>
        </ReGoModal>
      }
    />
  );
}
