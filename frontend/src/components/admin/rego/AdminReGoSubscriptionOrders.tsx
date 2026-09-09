'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Crown,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Building2,
  RefreshCw,
  Printer,
  Download,
  Trash2,
  Ban,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  X,
  PauseCircle,
  PlayCircle,
  Calendar,
  DollarSign,
  Activity,
  RotateCcw,
  Copy,
  Send,
  ShieldAlert,
  Zap,
  Calculator,
  Plus,
  Key,
  Flame,
  HeartPulse,
  Radar,
  AlertTriangle,
  Lock,
  Edit3,
  Gavel,
  ShieldCheck,
  PieChart,
  Cpu,
  SlidersHorizontal,
  Loader2,
  Check,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { useLocale } from '@/contexts/LocaleContext';

export interface SubscriptionOrder {
  id: string;
  store_id: string;
  user_id: string;
  store_name: string;
  store_subdomain: string;
  seller_email: string;
  reviewer_email?: string;
  from_plan: string;
  target_plan: string;
  amount: string | number;
  currency: string;
  gateway: string;
  gateway_reference?: string;
  checkout_url?: string;
  status: 'pending' | 'pending_proof' | 'pending_review' | 'captured' | 'rejected' | 'failed' | 'cancelled' | 'expired';
  proof_url?: string;
  rejection_reason?: string;
  created_at: string;
  expires_at?: string;
  reviewed_at?: string;
  metadata?: any;
}

export interface ActivityLog {
  id: string;
  action: string;
  actor_id?: string;
  actor_type: string;
  actor_email?: string;
  metadata: any;
  created_at: string;
}

export interface WebhookLog {
  id: string;
  intent_id?: string;
  gateway: string;
  event_type: string;
  status: 'success' | 'failed' | 'pending_retry';
  payload: any;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

export interface StatsData {
  gateway_breakdown: Array<{ gateway: string; count: number; total_amount: number }>;
  plan_breakdown: Array<{ target_plan: string; count: number }>;
  revenue_this_month: number;
  revenue_last_month: number;
  captured_count: number;
  rejected_count: number;
  pending_proof_count: number;
  pending_review_count: number;
  avg_review_hours: number;
  conversion_rate: number;
  rejection_rate: number;
}

export interface ProrationData {
  current_plan: string;
  target_plan: string;
  remaining_days: number;
  current_yearly_price: number;
  target_yearly_price: number;
  unused_current_credit: number;
  remaining_target_cost: number;
  net_proration_amount: number;
  available_store_credits: number;
}

export interface AdminReGoSubscriptionOrdersProps {
  orders: SubscriptionOrder[];
  pagination: { total: number; page: number; limit: number; total_pages: number };
  stats: StatsData | null;
  loading: boolean;
  error: string;
  success: string;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  gatewayFilter: string;
  setGatewayFilter: (val: string) => void;
  targetPlanFilter: string;
  setTargetPlanFilter: (val: string) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  page: number;
  setPage: (val: number) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onBulkAction: (action: 'approve' | 'reject' | 'cancel' | 'delete' | 'pause' | 'resume' | 'migrate' | 'retry') => Promise<void>;
  onReviewManual: (intentId: string, decision: 'approved' | 'rejected', reason?: string) => Promise<void>;
  onGenerateMagicLink: (intentId: string) => Promise<void>;
  onPauseResumeStore: (storeId: string, action: 'pause' | 'resume') => Promise<void>;
  onCancelOrder: (intentId: string) => Promise<void>;
  onDeleteOrder: (intentId: string) => Promise<void>;
  onRunBackgroundCron: () => Promise<void>;
  onDownloadGlExport: () => void;
  onOpenDesyncs: () => void;
  onRefresh: () => Promise<void>;
  // Drawer & Logs inspection props
  drawerOrder: SubscriptionOrder | null;
  setDrawerOrder: (order: SubscriptionOrder | null) => void;
  drawerLogs: ActivityLog[];
  loadingLogs: boolean;
  adminNoteInput: string;
  setAdminNoteInput: (val: string) => void;
  submittingNote: boolean;
  onAddAdminNote: () => Promise<void>;
  // Proration props
  prorationOrder: SubscriptionOrder | null;
  setProrationOrder: (order: SubscriptionOrder | null) => void;
  prorationData: ProrationData | null;
  onOpenProration: (order: SubscriptionOrder) => void;
  // Diagnostics props
  diagnosticsOrder: SubscriptionOrder | null;
  setDiagnosticsOrder: (order: SubscriptionOrder | null) => void;
  webhookLogs: WebhookLog[];
  loadingDiagnostics: boolean;
  onOpenDiagnostics: (order: SubscriptionOrder) => void;
}

const GATEWAY_NAMES: Record<string, string> = {
  manual_mandat: 'Mandat Minute / Virement',
  flouci: 'Flouci',
  konnect: 'Konnect',
  paypal: 'PayPal',
  cod: 'Sur Facture / COD',
};

function getStatusChipVariant(status: string): 'ok' | 'warn' | 'err' | 'neutral' | 'info' {
  switch (status) {
    case 'captured':
      return 'ok';
    case 'pending':
    case 'pending_proof':
    case 'pending_review':
      return 'warn';
    case 'rejected':
    case 'failed':
      return 'err';
    case 'cancelled':
    case 'expired':
    default:
      return 'neutral';
  }
}

export function AdminReGoSubscriptionOrders({
  orders,
  pagination,
  stats,
  loading,
  error,
  success,
  statusFilter,
  setStatusFilter,
  gatewayFilter,
  setGatewayFilter,
  targetPlanFilter,
  setTargetPlanFilter,
  searchTerm,
  setSearchTerm,
  page,
  setPage,
  selectedIds,
  setSelectedIds,
  onBulkAction,
  onReviewManual,
  onGenerateMagicLink,
  onPauseResumeStore,
  onCancelOrder,
  onDeleteOrder,
  onRunBackgroundCron,
  onDownloadGlExport,
  onOpenDesyncs,
  onRefresh,
  drawerOrder,
  setDrawerOrder,
  drawerLogs,
  loadingLogs,
  adminNoteInput,
  setAdminNoteInput,
  submittingNote,
  onAddAdminNote,
  prorationOrder,
  setProrationOrder,
  prorationData,
  onOpenProration,
  diagnosticsOrder,
  setDiagnosticsOrder,
  webhookLogs,
  loadingDiagnostics,
  onOpenDiagnostics,
}: AdminReGoSubscriptionOrdersProps) {
  const { dir, locale } = useLocale();
  const [reviewModalOrder, setReviewModalOrder] = useState<SubscriptionOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const allSelected = orders.length > 0 && selectedIds.length === orders.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div dir={dir} className="space-y-6">
      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--rego-border,#dedede)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--rego-accent,#ad0505)]/10 text-[var(--rego-accent,#ad0505)]">
              <Crown className="w-3.5 h-3.5" />
              ReGo SaaS Subscription Ledger
            </span>
          </div>
          <h1 className="text-2xl font-black text-[var(--rego-fg,#111111)] tracking-tight mt-1">
            Grand Livre des Souscriptions & Factures SaaS
          </h1>
          <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
            Audit des paiements marchands, validation manuelle des mandats et synchronisation des abonnements
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRunBackgroundCron}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition shadow-xs"
            title="Lancer le cycle de renouvellement et d'expiration"
          >
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            Lancer Cron
          </button>

          <button
            type="button"
            onClick={onDownloadGlExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export Comptable
          </button>

          <Link
            href="/fraud-radar"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 transition shadow-xs"
          >
            <Radar className="w-3.5 h-3.5" />
            Radar Fraude
          </Link>

          <button
            type="button"
            onClick={onOpenDesyncs}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Désyncs
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
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
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ─── 5 ReGo KPI Hero Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <ReGoKpiHero
          label="Revenu SaaS (Ce Mois)"
          value={<ReGoAmtBox amount={stats?.revenue_this_month || 0} size="md" />}
          icon={DollarSign}
          hint="Encaissé sur les abonnements"
        />
        <ReGoKpiHero
          label="Revenu SaaS (Mois Préc.)"
          value={<ReGoAmtBox amount={stats?.revenue_last_month || 0} size="md" />}
          icon={Calendar}
          hint="Base comparative clôturée"
        />
        <ReGoKpiHero
          label="Souscriptions Validées"
          value={(stats?.captured_count || 0).toString()}
          icon={CheckCircle2}
          hint="Paiements confirmés"
        />
        <ReGoKpiHero
          label="En Attente de Reçu"
          value={(stats?.pending_proof_count || 0).toString()}
          icon={Clock}
          hint="Mandat ou virement différé"
        />
        <ReGoKpiHero
          label="Souscriptions Rejetées"
          value={(stats?.rejected_count || 0).toString()}
          icon={XCircle}
          hint="Échecs ou refus bancaires"
        />
      </div>

      {/* ─── Search, Filters & Bulk Action Bar ─── */}
      <ReGoCard noPadding>
        <div className="p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-2,#737373)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Recherche par boutique, e-mail vendeur ou sous-domaine..."
              className="w-full h-9 pl-9 pr-3 text-xs font-medium rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs font-semibold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
            >
              <option value="all">Tous statuts</option>
              <option value="pending_review">En attente de revue</option>
              <option value="pending_proof">En attente de preuve</option>
              <option value="captured">Validées (Capturées)</option>
              <option value="rejected">Rejetées</option>
              <option value="cancelled">Annulées</option>
              <option value="failed">Échouées</option>
            </select>

            <select
              value={gatewayFilter}
              onChange={(e) => {
                setGatewayFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs font-semibold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
            >
              <option value="all">Toutes passerelles</option>
              <option value="manual_mandat">Mandat / Virement</option>
              <option value="flouci">Flouci</option>
              <option value="konnect">Konnect</option>
              <option value="cod">Sur Facture</option>
              <option value="paypal">PayPal</option>
            </select>

            <select
              value={targetPlanFilter}
              onChange={(e) => {
                setTargetPlanFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs font-semibold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
            >
              <option value="all">Toutes formules</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="regular">Regular</option>
              <option value="agency">Agency</option>
              <option value="pro">Pro</option>
              <option value="golden">Golden</option>
              <option value="platinum">Platinum</option>
            </select>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--rego-border,#dedede)]">
                <span className="text-xs font-bold text-[var(--rego-ink-2,#737373)]">
                  {selectedIds.length} sélectionnée(s)
                </span>
                <button
                  type="button"
                  onClick={() => onBulkAction('approve')}
                  className="px-2.5 py-1.5 rounded-[var(--rego-r,8px)] bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                >
                  Approuver le lot
                </button>
                <button
                  type="button"
                  onClick={() => onBulkAction('reject')}
                  className="px-2.5 py-1.5 rounded-[var(--rego-r,8px)] bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
                >
                  Rejeter le lot
                </button>
              </div>
            )}
          </div>
        </div>
      </ReGoCard>

      {/* ─── Orders Table ─── */}
      <ReGoCard noPadding>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--rego-accent,#ad0505)]" />
            <p className="mt-3 text-xs font-semibold text-[var(--rego-ink-2,#737373)]">Chargement des souscriptions...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center p-12">
            <Crown className="w-10 h-10 text-[var(--rego-ink-2,#737373)] mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">Aucune souscription trouvée</h3>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-1">
              Aucun paiement ne correspond aux critères de recherche ou filtres appliqués.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--rego-border,#dedede)] text-[10px] font-black uppercase tracking-wider text-[var(--rego-ink-2,#737373)] bg-[var(--rego-bg-subtle,#f7f7f7)]/50">
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded accent-[var(--rego-accent,#ad0505)]"
                    />
                  </th>
                  <th className="py-3 px-2">Boutique & Vendeur</th>
                  <th className="py-3 px-2">Formule</th>
                  <th className="py-3 px-2">Montant</th>
                  <th className="py-3 px-2">Passerelle</th>
                  <th className="py-3 px-2">Statut</th>
                  <th className="py-3 px-2">Créée le</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60 font-semibold text-[var(--rego-fg,#111111)]">
                {orders.map((order) => {
                  const isChecked = selectedIds.includes(order.id);

                  return (
                    <tr key={order.id} className="hover:bg-[var(--rego-bg-subtle,#f7f7f7)]/50 transition">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(order.id)}
                          className="rounded accent-[var(--rego-accent,#ad0505)]"
                        />
                      </td>

                      <td className="py-3 px-2">
                        <div className="space-y-0.5">
                          <span className="font-bold text-[var(--rego-fg,#111111)] block">{order.store_name}</span>
                          <span className="text-[11px] text-[var(--rego-ink-2,#737373)] block">{order.seller_email}</span>
                          <span className="text-[10px] font-mono text-[var(--rego-accent,#ad0505)] block">
                            {order.store_subdomain}.pandamarket.tn
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--rego-bg-subtle,#f7f7f7)] border border-[var(--rego-border,#dedede)] uppercase">
                          {order.target_plan}
                        </span>
                      </td>

                      <td className="py-3 px-2">
                        <ReGoAmtBox amount={order.amount} size="sm" />
                      </td>

                      <td className="py-3 px-2">
                        <span className="text-xs text-[var(--rego-ink-2,#737373)]">
                          {GATEWAY_NAMES[order.gateway] || order.gateway}
                        </span>
                      </td>

                      <td className="py-3 px-2">
                        <ReGoStatusChip
                          status={getStatusChipVariant(order.status)}
                          label={order.status}
                        />
                      </td>

                      <td className="py-3 px-2 text-[var(--rego-ink-2,#737373)] font-mono text-[11px]">
                        {new Date(order.created_at).toLocaleDateString('fr-TN')}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDrawerOrder(order)}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[11px] font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition"
                            title="Inspecter le dossier"
                          >
                            <Eye className="w-3 h-3" />
                            Détails
                          </button>

                          {(order.status === 'pending_review' || order.status === 'pending_proof') && (
                            <button
                              type="button"
                              onClick={() => setReviewModalOrder(order)}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[var(--rego-r,8px)] bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition"
                            >
                              <Gavel className="w-3 h-3" />
                              Arbitrer
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onGenerateMagicLink(order.id)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition"
                            title="Copier Magic Link de paiement"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenDiagnostics(order)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition"
                            title="Diagnostics & logs passerelle"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Pagination Footer ─── */}
        <div className="flex items-center justify-between p-3.5 border-t border-[var(--rego-border,#dedede)] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] disabled:opacity-40 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Précédent
          </button>

          <span className="text-[var(--rego-ink-2,#737373)] font-mono">
            Page {page} sur {pagination.total_pages || 1} · {pagination.total} souscription(s)
          </span>

          <button
            type="button"
            onClick={() => setPage(Math.min(pagination.total_pages || 1, page + 1))}
            disabled={page >= (pagination.total_pages || 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] disabled:opacity-40 transition"
          >
            Suivant
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </ReGoCard>

      {/* ─── Inspection Drawer (Audit & Admin Notes) ─── */}
      <ReGoDrawer
        isOpen={Boolean(drawerOrder)}
        onClose={() => setDrawerOrder(null)}
        title={drawerOrder ? `Dossier Souscription #${drawerOrder.id.slice(-8).toUpperCase()}` : 'Dossier Souscription'}
        subtitle={drawerOrder ? `Boutique : ${drawerOrder.store_name}` : undefined}
        width="max-w-2xl"
      >
        {drawerOrder && (
          <div className="space-y-5 p-1 text-xs">
            {/* Core Info Table */}
            <div className="p-3.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-bg-subtle,#f7f7f7)] border border-[var(--rego-border,#dedede)] space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)]">ID Intention :</span>
                <span className="font-mono font-bold select-all">{drawerOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)]">Boutique :</span>
                <span className="font-bold">{drawerOrder.store_name} ({drawerOrder.store_subdomain}.pandamarket.tn)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)]">E-mail Marchand :</span>
                <span className="font-bold">{drawerOrder.seller_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)]">Formule Ciblée :</span>
                <span className="font-bold uppercase text-[var(--rego-accent,#ad0505)]">{drawerOrder.target_plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)]">Montant Annuel :</span>
                <ReGoAmtBox amount={drawerOrder.amount} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)]">Passerelle :</span>
                <span className="font-bold">{GATEWAY_NAMES[drawerOrder.gateway] || drawerOrder.gateway}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)]">Statut :</span>
                <ReGoStatusChip
                  status={getStatusChipVariant(drawerOrder.status)}
                  label={drawerOrder.status}
                />
              </div>
            </div>

            {/* Direct Action Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onGenerateMagicLink(drawerOrder.id)}
                className="flex-1 py-2 px-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition flex items-center justify-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                Copier Magic Link
              </button>

              <button
                type="button"
                onClick={() => onOpenProration(drawerOrder)}
                className="py-2 px-3 rounded-[var(--rego-r,8px)] border border-indigo-200 bg-indigo-50 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition flex items-center gap-1.5"
                title="Calculer le prorata et migrer de formule"
              >
                <Calculator className="w-3.5 h-3.5" />
                Prorata / Switch
              </button>

              <button
                type="button"
                onClick={() => onPauseResumeStore(drawerOrder.store_id, 'pause')}
                className="py-2 px-3 rounded-[var(--rego-r,8px)] border border-amber-200 bg-amber-50 text-xs font-bold text-amber-800 hover:bg-amber-100 transition flex items-center gap-1.5"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                Geler la boutique
              </button>

              <button
                type="button"
                onClick={() => onCancelOrder(drawerOrder.id)}
                className="py-2 px-3 rounded-[var(--rego-r,8px)] border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 transition flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                Annuler
              </button>
            </div>

            {/* Admin Notes Box */}
            <div className="space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] text-[10px]">
                Notes Internes Administrateur
              </h4>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Ajouter une note de suivi interne..."
                  className="flex-1 h-9 px-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] outline-none"
                />
                <button
                  type="button"
                  onClick={onAddAdminNote}
                  disabled={submittingNote || !adminNoteInput.trim()}
                  className="px-4 h-9 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {submittingNote ? '...' : 'Ajouter'}
                </button>
              </div>
            </div>

            {/* Activity Stream */}
            <div className="space-y-2 pt-2">
              <h4 className="font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] text-[10px]">
                Journal d'activité & Audit ({drawerLogs.length})
              </h4>
              {loadingLogs ? (
                <div className="p-4 text-center text-[var(--rego-ink-2,#737373)]">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                </div>
              ) : drawerLogs.length === 0 ? (
                <p className="p-3 text-center text-[var(--rego-ink-2,#737373)] bg-[var(--rego-bg-subtle,#f7f7f7)] rounded">
                  Aucun événement consigné pour le moment.
                </p>
              ) : (
                <div className="divide-y divide-[var(--rego-border,#dedede)]/60 border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)] overflow-hidden">
                  {drawerLogs.map((log) => (
                    <div key={log.id} className="p-2.5 bg-white flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-[var(--rego-fg,#111111)] uppercase text-[10px] block">
                          {log.action}
                        </span>
                        {log.metadata?.note && (
                          <p className="text-[11px] text-[var(--rego-fg,#111111)] mt-0.5">{log.metadata.note}</p>
                        )}
                        <span className="text-[10px] text-[var(--rego-ink-2,#737373)]">
                          Par: {log.actor_email || log.actor_type}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--rego-ink-2,#737373)] shrink-0">
                        {new Date(log.created_at).toLocaleTimeString('fr-TN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </ReGoDrawer>

      {/* ─── Arbitration Modal (Proof Review) ─── */}
      {reviewModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-black text-[var(--rego-fg,#111111)]">
                Arbitrage Mandat / Virement #{reviewModalOrder.id.slice(-8).toUpperCase()}
              </h3>
              <button type="button" onClick={() => setReviewModalOrder(null)}>
                <X className="w-4 h-4 text-[var(--rego-ink-2,#737373)]" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p>
                Boutique: <strong>{reviewModalOrder.store_name}</strong> · Formule: <strong className="uppercase">{reviewModalOrder.target_plan}</strong>
              </p>
              <div>
                Montant attendu : <ReGoAmtBox amount={reviewModalOrder.amount} size="md" />
              </div>

              {reviewModalOrder.proof_url ? (
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
                    Reçu fourni par le marchand :
                  </span>
                  <a
                    href={reviewModalOrder.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded border border-blue-200 bg-blue-50 text-blue-700 font-bold hover:underline"
                  >
                    Ouvrir le reçu dans un nouvel onglet ↗
                  </a>
                </div>
              ) : (
                <p className="text-amber-800 bg-amber-50 p-3 rounded">
                  ⚠️ Aucun reçu n'a encore été téléversé par le marchand.
                </p>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
                  Motif en cas de rejet :
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="ex: Montant non concordant ou reçu illisible"
                  className="w-full h-8 px-2.5 rounded border border-[var(--rego-border,#dedede)] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setReviewModalOrder(null)}
                className="px-3.5 py-1.5 rounded border text-xs font-bold"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onReviewManual(reviewModalOrder.id, 'rejected', rejectionReason || 'Rejeté par modération');
                  setReviewModalOrder(null);
                }}
                className="px-4 py-1.5 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Rejeter la souscription
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onReviewManual(reviewModalOrder.id, 'approved');
                  setReviewModalOrder(null);
                }}
                className="px-4 py-1.5 rounded bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
              >
                Approuver & Activer la formule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
