'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Loader2,
  RotateCcw,
  Search,
  ShieldAlert,
  Store,
  User,
  UserX,
  XCircle,
  Eye,
  SlidersHorizontal,
  ExternalLink,
  Plus,
  RefreshCw,
  FileText,
  MessageSquare,
  Sparkles,
  Layers,
  X,
  Send,
  AlertCircle,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { useLocale } from '@/contexts/LocaleContext';

export type ReportStatus = 'open' | 'investigating' | 'awaiting_buyer' | 'awaiting_seller' | 'resolved' | 'dismissed';
export type ReportTargetType = 'seller' | 'buyer';
export type ReportSource = 'buyer' | 'admin';
export type ReportPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Report {
  id: string;
  reporter_id: string;
  reporter_email?: string | null;
  reporter_role?: string | null;
  source: ReportSource;
  target_type: ReportTargetType;
  target_user_id: string | null;
  target_user_email?: string | null;
  target_user_role?: string | null;
  target_user_is_active?: boolean | null;
  store_id: string | null;
  store_name?: string | null;
  store_subdomain?: string | null;
  store_status?: string | null;
  order_id: string | null;
  category: string;
  priority: ReportPriority;
  reason: string;
  evidence_urls?: string[] | null;
  status: ReportStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolver_email?: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ReportSummary {
  total: number;
  open: number;
  investigating: number;
  resolved: number;
  dismissed: number;
  seller_reports: number;
  buyer_reports: number;
  high_priority: number;
}

export interface ReportTarget {
  id: string;
  label: string;
  email: string | null;
  secondary: string | null;
  status: string | null;
}

export interface AdminReGoReportsProps {
  reports: Report[];
  summary: ReportSummary;
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (newPage: number) => void;
  statusFilter: 'all' | ReportStatus;
  onStatusFilterChange: (val: 'all' | ReportStatus) => void;
  targetFilter: 'all' | ReportTargetType;
  onTargetFilterChange: (val: 'all' | ReportTargetType) => void;
  sourceFilter: 'all' | ReportSource;
  onSourceFilterChange: (val: 'all' | ReportSource) => void;
  priorityFilter: 'all' | ReportPriority;
  onPriorityFilterChange: (val: 'all' | ReportPriority) => void;
  search: string;
  onSearchChange: (val: string) => void;
  statusDrafts: Record<string, ReportStatus>;
  onStatusDraftChange: (reportId: string, status: ReportStatus) => void;
  notesDrafts: Record<string, string>;
  onNotesDraftChange: (reportId: string, notes: string) => void;
  activeAction: string | null;
  error: string | null;
  success: string | null;
  onUpdateStatus: (reportId: string) => Promise<void>;
  onSuspendStore: (storeId: string) => Promise<void>;
  onSuspendBuyer: (userId: string, reportId: string) => Promise<void>;
  onReactivateBuyer: (userId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  showCreate: boolean;
  onToggleShowCreate: () => void;
  targetType: ReportTargetType;
  onTargetTypeChange: (val: ReportTargetType) => void;
  targetSearch: string;
  onTargetSearchChange: (val: string) => void;
  targets: ReportTarget[];
  selectedTargetId: string;
  onSelectTargetId: (val: string) => void;
  createPriority: ReportPriority;
  onCreatePriorityChange: (val: ReportPriority) => void;
  createCategory: string;
  onCreateCategoryChange: (val: string) => void;
  createOrderId: string;
  onCreateOrderIdChange: (val: string) => void;
  createReason: string;
  onCreateReasonChange: (val: string) => void;
  createNotes: string;
  onCreateNotesChange: (val: string) => void;
  onCreateReport: () => Promise<void>;
}

const reportStatuses: ReportStatus[] = ['open', 'investigating', 'awaiting_buyer', 'awaiting_seller', 'resolved', 'dismissed'];

function getPriorityVariant(priority: ReportPriority): 'danger' | 'warning' | 'info' | 'neutral' {
  switch (priority) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
    default:
      return 'neutral';
  }
}

function getStatusVariant(status: ReportStatus): 'ok' | 'warn' | 'err' | 'neutral' {
  switch (status) {
    case 'open':
      return 'err';
    case 'investigating':
    case 'awaiting_buyer':
    case 'awaiting_seller':
      return 'warn';
    case 'resolved':
      return 'ok';
    case 'dismissed':
    default:
      return 'neutral';
  }
}

export function AdminReGoReports({
  reports,
  summary,
  loading,
  page,
  totalPages,
  total,
  onPageChange,
  statusFilter,
  onStatusFilterChange,
  targetFilter,
  onTargetFilterChange,
  sourceFilter,
  onSourceFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  search,
  onSearchChange,
  statusDrafts,
  onStatusDraftChange,
  notesDrafts,
  onNotesDraftChange,
  activeAction,
  error,
  success,
  onUpdateStatus,
  onSuspendStore,
  onSuspendBuyer,
  onReactivateBuyer,
  onRefresh,
  showCreate,
  onToggleShowCreate,
  targetType,
  onTargetTypeChange,
  targetSearch,
  onTargetSearchChange,
  targets,
  selectedTargetId,
  onSelectTargetId,
  createPriority,
  onCreatePriorityChange,
  createCategory,
  onCreateCategoryChange,
  createOrderId,
  onCreateOrderIdChange,
  createReason,
  onCreateReasonChange,
  createNotes,
  onCreateNotesChange,
  onCreateReport,
}: AdminReGoReportsProps) {
  const { t, locale, dir } = useLocale();
  const [inspectReport, setInspectReport] = useState<Report | null>(null);

  const formatDate = (val?: string | null) => {
    if (!val) return '—';
    return new Date(val).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div dir={dir} className="space-y-6">
      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--rego-accent,#ad0505)]/10 text-[var(--rego-accent,#ad0505)]">
              <Flag className="w-3.5 h-3.5" />
              ReGo Trust & Safety Console
            </span>
          </div>
          <h1 className="text-2xl font-black text-[var(--rego-fg,#111111)] tracking-tight mt-1.5">
            {t('admin.reportsPage.title') || 'Signalements & Infractions Réglementaires'}
          </h1>
          <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5 max-w-2xl">
            {t('admin.reportsPage.subtitle') || 'Supervision des litiges, réclamations acheteurs et violations des conditions générales de vente'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            type="button"
            onClick={onToggleShowCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white text-xs font-bold hover:opacity-90 transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {showCreate ? 'Fermer formulaire' : 'Nouveau signalement'}
          </button>
        </div>
      </div>

      {/* ─── Feedback Alerts ─── */}
      {error && (
        <div className="p-3.5 rounded-[var(--rego-r,8px)] bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-[var(--rego-r,8px)] bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ─── 6 ReGo KPI Hero Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <ReGoKpiHero
          label="Total Dossiers"
          value={summary.total.toString()}
          icon={Flag}
          hint="Historique global"
        />
        <ReGoKpiHero
          label="Ouverts (À traiter)"
          value={summary.open.toString()}
          icon={AlertTriangle}
          hint="Action requise"
        />
        <ReGoKpiHero
          label="En Investigation"
          value={summary.investigating.toString()}
          icon={Clock}
          hint="En cours d'examen"
        />
        <ReGoKpiHero
          label="Haute Priorité"
          value={summary.high_priority.toString()}
          icon={ShieldAlert}
          hint="Risque critique"
        />
        <ReGoKpiHero
          label="Vendeurs Signalés"
          value={summary.seller_reports.toString()}
          icon={Store}
          hint="Boutiques auditées"
        />
        <ReGoKpiHero
          label="Acheteurs Signalés"
          value={summary.buyer_reports.toString()}
          icon={User}
          hint="Abus & refoulements"
        />
      </div>

      {/* ─── Create Report Drawer / Card ─── */}
      {showCreate && (
        <ReGoCard
          title="Émettre un signalement administratif"
          subtitle="Ouverture d'un dossier d'enquête interne par l'équipe de conformité"
          icon={Plus}
          actions={
            <button
              type="button"
              onClick={onToggleShowCreate}
              className="p-1 rounded text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]"
            >
              <X className="w-4 h-4" />
            </button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Type de cible
                </label>
                <select
                  value={targetType}
                  onChange={(e) => {
                    onTargetTypeChange(e.target.value as ReportTargetType);
                    onSelectTargetId('');
                  }}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                >
                  <option value="seller">Boutique / Vendeur</option>
                  <option value="buyer">Acheteur</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Filtrer les cibles
                </label>
                <input
                  type="text"
                  value={targetSearch}
                  onChange={(e) => onTargetSearchChange(e.target.value)}
                  placeholder="Recherche par nom ou e-mail..."
                  className="w-full h-9 px-3 text-xs font-medium rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Sélectionner la cible
                </label>
                <select
                  value={selectedTargetId}
                  onChange={(e) => onSelectTargetId(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                >
                  <option value="">-- Choisir une cible --</option>
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} {t.email ? `(${t.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Niveau de priorité
                </label>
                <select
                  value={createPriority}
                  onChange={(e) => onCreatePriorityChange(e.target.value as ReportPriority)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                >
                  <option value="low">Faible</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="critical">Critique / Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Catégorie d'infraction
                </label>
                <input
                  type="text"
                  value={createCategory}
                  onChange={(e) => onCreateCategoryChange(e.target.value)}
                  placeholder="ex. contrefaçon, fraude COD, impayé"
                  className="w-full h-9 px-3 text-xs font-medium rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  ID Commande associée (facultatif)
                </label>
                <input
                  type="text"
                  value={createOrderId}
                  onChange={(e) => onCreateOrderIdChange(e.target.value)}
                  placeholder="UUID ou référence commande"
                  className="w-full h-9 px-3 text-xs font-medium rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Motif & Circonstances détaillées (min. 10 caractères)
                </label>
                <textarea
                  value={createReason}
                  onChange={(e) => onCreateReasonChange(e.target.value)}
                  rows={3}
                  placeholder="Décrivez précisément les faits constatés, preuves ou signalements récurrents..."
                  className="w-full p-3 text-xs font-medium rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Notes internes administratives
                </label>
                <textarea
                  value={createNotes}
                  onChange={(e) => onCreateNotesChange(e.target.value)}
                  rows={3}
                  placeholder="Remarques à destination des modérateurs (non visibles par les parties)..."
                  className="w-full p-3 text-xs font-medium rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onToggleShowCreate}
                className="px-4 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onCreateReport}
                disabled={activeAction === 'create-report' || !selectedTargetId || createReason.trim().length < 10}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
              >
                {activeAction === 'create-report' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Créer le dossier d'infraction"
                )}
              </button>
            </div>
          </div>
        </ReGoCard>
      )}

      {/* ─── Search & Filters Bar ─── */}
      <ReGoCard noPadding>
        <div className="p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-2,#737373)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onPageChange(1);
              }}
              placeholder="Rechercher par cible, boutique, e-mail ou motif..."
              className="w-full h-9 pl-9 pr-3 text-xs font-medium rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
              <span className="text-[11px] font-bold text-[var(--rego-ink-2,#737373)]">Filtres:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                onStatusFilterChange(e.target.value as 'all' | ReportStatus);
                onPageChange(1);
              }}
              className="h-8 px-2.5 text-xs font-semibold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
            >
              <option value="all">Tous statuts</option>
              {reportStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <select
              value={targetFilter}
              onChange={(e) => {
                onTargetFilterChange(e.target.value as 'all' | ReportTargetType);
                onPageChange(1);
              }}
              className="h-8 px-2.5 text-xs font-semibold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
            >
              <option value="all">Toutes cibles</option>
              <option value="seller">Vendeur</option>
              <option value="buyer">Acheteur</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => {
                onSourceFilterChange(e.target.value as 'all' | ReportSource);
                onPageChange(1);
              }}
              className="h-8 px-2.5 text-xs font-semibold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
            >
              <option value="all">Toutes sources</option>
              <option value="buyer">Acheteur</option>
              <option value="admin">Administrateur</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => {
                onPriorityFilterChange(e.target.value as 'all' | ReportPriority);
                onPageChange(1);
              }}
              className="h-8 px-2.5 text-xs font-semibold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
            >
              <option value="all">Toutes priorités</option>
              <option value="low">Faible</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
              <option value="critical">Critique</option>
            </select>
          </div>
        </div>
      </ReGoCard>

      {/* ─── Reports Stream / Table ─── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--rego-accent,#ad0505)]" />
          <p className="mt-3 text-xs font-semibold text-[var(--rego-ink-2,#737373)]">Chargement des signalements...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center p-12 bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)]">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">Aucun signalement trouvé</h3>
          <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-1">
            Tous les dossiers ont été résolus ou aucun signalement ne correspond aux critères de recherche.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const targetName =
              report.target_type === 'seller'
                ? report.store_name || report.store_id || 'Boutique inconnue'
                : report.target_user_email || report.target_user_id || 'Acheteur inconnu';

            const currentStatus = statusDrafts[report.id] || report.status;
            const currentNotes = notesDrafts[report.id] !== undefined ? notesDrafts[report.id] : (report.admin_notes || '');

            return (
              <div
                key={report.id}
                className="bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)] p-4 transition-all hover:border-[var(--rego-border-hover,#b0b0b0)] shadow-xs"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Target & Meta */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--rego-bg-subtle,#f7f7f7)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
                        {report.target_type === 'seller' ? <Store className="w-3 h-3 text-[var(--rego-accent,#ad0505)]" /> : <User className="w-3 h-3 text-blue-600" />}
                        {report.target_type === 'seller' ? 'Boutique Vendeur' : 'Compte Acheteur'}
                      </span>

                      <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)] truncate">{targetName}</h3>

                      <ReGoStatusChip
                        status={getStatusVariant(report.status)}
                        label={report.status}
                      />

                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                        report.priority === 'critical'
                          ? 'bg-red-600 text-white border-red-600'
                          : report.priority === 'high'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : report.priority === 'medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {report.priority}
                      </span>

                      <span className="text-[11px] font-mono text-[var(--rego-ink-2,#737373)]">
                        #{report.id.slice(-8).toUpperCase()}
                      </span>
                    </div>

                    {/* Reporter, Date & Category */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--rego-ink-2,#737373)]">
                      <span>Signalé par : <strong className="text-[var(--rego-fg,#111111)]">{report.reporter_email || report.reporter_id}</strong> ({report.source})</span>
                      <span>Le : {formatDate(report.created_at)}</span>
                      {report.category && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--rego-bg-subtle,#f7f7f7)] text-[10px] font-bold text-[var(--rego-fg,#111111)]">
                          {report.category}
                        </span>
                      )}
                      {report.order_id && (
                        <span className="font-mono text-xs text-[var(--rego-accent,#ad0505)]">
                          Commande #{report.order_id.slice(-8).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Reason Text */}
                    <div className="p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-bg-subtle,#f7f7f7)] border border-[var(--rego-border,#dedede)]/50 text-xs text-[var(--rego-fg,#111111)] leading-relaxed">
                      {report.reason}
                    </div>

                    {/* Notes preview if exists */}
                    {report.admin_notes && (
                      <div className="text-[11px] text-[var(--rego-ink-2,#737373)] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">Note modérateur: {report.admin_notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Inline Quick Actions */}
                  <div className="flex flex-col gap-2 w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--rego-border,#dedede)]/70 pt-3 lg:pt-0 lg:pl-4">
                    {/* Status updater */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={currentStatus}
                        onChange={(e) => onStatusDraftChange(report.id, e.target.value as ReportStatus)}
                        className="flex-1 h-8 px-2 text-xs font-semibold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                      >
                        {reportStatuses.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => onUpdateStatus(report.id)}
                        disabled={activeAction === `${report.id}-status`}
                        className="px-2.5 h-8 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50 shrink-0"
                      >
                        {activeAction === `${report.id}-status` ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sauvegarder'}
                      </button>
                    </div>

                    {/* Action buttons row */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setInspectReport(report)}
                        className="flex-1 inline-flex items-center justify-center gap-1 h-7 px-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[11px] font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition"
                      >
                        <Eye className="w-3 h-3" />
                        Détails
                      </button>

                      <Link
                        href={`/reports/${report.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1 h-7 px-2 rounded-[var(--rego-r,8px)] bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 transition"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Dossier
                      </Link>

                      {report.store_subdomain && (
                        <Link
                          href={`/store/${encodeURIComponent(report.store_subdomain)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 px-2 inline-flex items-center justify-center rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition"
                          title="Visiter la boutique"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>

                    {/* Moderation Actions (Freeze / Suspend) */}
                    {report.target_type === 'seller' && report.store_id && report.store_status !== 'suspended' && (
                      <button
                        type="button"
                        onClick={() => onSuspendStore(report.store_id!)}
                        disabled={activeAction === `${report.store_id}-suspend`}
                        className="w-full inline-flex items-center justify-center gap-1.5 h-7 px-2 rounded-[var(--rego-r,8px)] border border-red-200 bg-red-50 text-[11px] font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                      >
                        <Ban className="w-3 h-3" />
                        {activeAction === `${report.store_id}-suspend` ? 'Suspension...' : 'Suspendre la boutique'}
                      </button>
                    )}

                    {report.target_type === 'buyer' && report.target_user_id && report.target_user_is_active !== false && (
                      <button
                        type="button"
                        onClick={() => onSuspendBuyer(report.target_user_id!, report.id)}
                        disabled={activeAction === `${report.target_user_id}-suspend-buyer`}
                        className="w-full inline-flex items-center justify-center gap-1.5 h-7 px-2 rounded-[var(--rego-r,8px)] border border-red-200 bg-red-50 text-[11px] font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                      >
                        <UserX className="w-3 h-3" />
                        {activeAction === `${report.target_user_id}-suspend-buyer` ? 'Suspension...' : 'Bloquer cet acheteur'}
                      </button>
                    )}

                    {report.target_type === 'buyer' && report.target_user_id && report.target_user_is_active === false && (
                      <button
                        type="button"
                        onClick={() => onReactivateBuyer(report.target_user_id!)}
                        disabled={activeAction === `${report.target_user_id}-reactivate-buyer`}
                        className="w-full inline-flex items-center justify-center gap-1.5 h-7 px-2 rounded-[var(--rego-r,8px)] border border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {activeAction === `${report.target_user_id}-reactivate-buyer` ? 'Réactivation...' : 'Réactiver le compte'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Pagination Footer ─── */}
      <div className="flex items-center justify-between p-3.5 bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)] text-xs font-semibold">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] disabled:opacity-40 transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Précédent
        </button>

        <span className="text-[var(--rego-ink-2,#737373)] font-mono">
          Page {page} sur {totalPages} · {total} signalement(s)
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] disabled:opacity-40 transition"
        >
          Suivant
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ─── Deep Inspection Drawer ─── */}
      <ReGoDrawer
        isOpen={!!inspectReport}
        onClose={() => setInspectReport(null)}
        title={
          inspectReport
            ? `Dossier de Signalement #${inspectReport.id.slice(-8).toUpperCase()}`
            : 'Dossier de Signalement'
        }
        subtitle={
          inspectReport
            ? `Cible: ${inspectReport.target_type === 'seller' ? inspectReport.store_name || inspectReport.store_id : inspectReport.target_user_email || inspectReport.target_user_id}`
            : undefined
        }
        width="max-w-2xl"
      >
        {inspectReport && (
          <div className="space-y-5 p-1">
            {/* Header badges */}
            <div className="flex flex-wrap items-center gap-2">
              <ReGoStatusChip
                status={getStatusVariant(inspectReport.status)}
                label={inspectReport.status}
              />
              <span className={`px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider border ${
                inspectReport.priority === 'critical'
                  ? 'bg-red-600 text-white border-red-600'
                  : inspectReport.priority === 'high'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : inspectReport.priority === 'medium'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                Priorité: {inspectReport.priority}
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[var(--rego-bg-subtle,#f7f7f7)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
                Source: {inspectReport.source}
              </span>
            </div>

            {/* Target & Reporter info table */}
            <div className="p-3.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-bg-subtle,#f7f7f7)] border border-[var(--rego-border,#dedede)] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)] font-semibold">Identifiant dossier :</span>
                <span className="font-mono font-bold text-[var(--rego-fg,#111111)] select-all">{inspectReport.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)] font-semibold">Cible :</span>
                <span className="font-bold text-[var(--rego-fg,#111111)]">
                  {inspectReport.target_type === 'seller' ? inspectReport.store_name || inspectReport.store_id : inspectReport.target_user_email || inspectReport.target_user_id}
                </span>
              </div>
              {inspectReport.store_subdomain && (
                <div className="flex justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)] font-semibold">Sous-domaine :</span>
                  <span className="font-mono text-[var(--rego-accent,#ad0505)]">{inspectReport.store_subdomain}.pandamarket.tn</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)] font-semibold">Signalé par :</span>
                <span className="font-bold text-[var(--rego-fg,#111111)]">{inspectReport.reporter_email || inspectReport.reporter_id}</span>
              </div>
              {inspectReport.order_id && (
                <div className="flex justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)] font-semibold">Commande liée :</span>
                  <span className="font-mono font-bold text-[var(--rego-accent,#ad0505)]">#{inspectReport.order_id}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)] font-semibold">Créé le :</span>
                <span className="text-[var(--rego-fg,#111111)]">{formatDate(inspectReport.created_at)}</span>
              </div>
              {inspectReport.resolved_at && (
                <div className="flex justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)] font-semibold">Résolu le :</span>
                  <span className="text-emerald-700 font-bold">{formatDate(inspectReport.resolved_at)}</span>
                </div>
              )}
              {inspectReport.resolver_email && (
                <div className="flex justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)] font-semibold">Traité par :</span>
                  <span className="text-[var(--rego-fg,#111111)]">{inspectReport.resolver_email}</span>
                </div>
              )}
            </div>

            {/* Reason details */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)] uppercase tracking-wide">Motif du signalement</h4>
              <div className="p-3.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] text-xs text-[var(--rego-fg,#111111)] leading-relaxed">
                {inspectReport.reason}
              </div>
            </div>

            {/* Evidence URLs if any */}
            {inspectReport.evidence_urls && inspectReport.evidence_urls.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)] uppercase tracking-wide">Preuves fournies ({inspectReport.evidence_urls.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {inspectReport.evidence_urls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg-subtle,#f7f7f7)] text-xs font-semibold text-[var(--rego-accent,#ad0505)] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Preuve #{i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Admin notes modification */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)] uppercase tracking-wide">Notes internes du modérateur</h4>
              <textarea
                value={notesDrafts[inspectReport.id] !== undefined ? notesDrafts[inspectReport.id] : (inspectReport.admin_notes || '')}
                onChange={(e) => onNotesDraftChange(inspectReport.id, e.target.value)}
                rows={3}
                placeholder="Renseignez ici vos conclusions ou mesures prises..."
                className="w-full p-3 text-xs font-medium rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
              />
            </div>

            {/* Change Status selector & Save */}
            <div className="p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg-subtle,#f7f7f7)] space-y-2">
              <label className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                Changer le statut du dossier
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={statusDrafts[inspectReport.id] || inspectReport.status}
                  onChange={(e) => onStatusDraftChange(inspectReport.id, e.target.value as ReportStatus)}
                  className="flex-1 h-9 px-3 text-xs font-semibold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                >
                  {reportStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={async () => {
                    await onUpdateStatus(inspectReport.id);
                    setInspectReport(null);
                  }}
                  disabled={activeAction === `${inspectReport.id}-status`}
                  className="px-4 h-9 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
                >
                  {activeAction === `${inspectReport.id}-status` ? 'Mise à jour...' : 'Appliquer statut & notes'}
                </button>
              </div>
            </div>

            {/* Direct Link to full mediation chat case */}
            <div className="pt-2">
              <Link
                href={`/reports/${inspectReport.id}`}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-[var(--rego-r,8px)] bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                <MessageSquare className="w-4 h-4" />
                Accéder au salon de médiation & pièces jointes
              </Link>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
