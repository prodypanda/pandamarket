'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Undo2,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Store,
  RefreshCw,
  Search,
  Eye,
  AlertTriangle,
  Check,
  X,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface AdminRefundRow {
  id: string;
  order_id: string;
  store_id: string;
  store_name: string | null;
  owner_email: string | null;
  requested_by: string | null;
  amount: string;
  currency: string;
  reason_code: string;
  reason: string | null;
  status: string;
  created_at: string;
  decision_metadata: Record<string, unknown> | null;
  gate: Record<string, unknown> | null;
}

export interface AdminReGoRefundReviewProps {
  refunds: AdminRefundRow[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  decidingId: string;
  error: string;
  feedback: string;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onDecide: (refund: AdminRefundRow, decision: 'approve' | 'reject', note?: string) => Promise<void>;
}

function toNumber(value: unknown): number {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

const REASON_LABELS: Record<string, string> = {
  customer_request: 'Demande client',
  out_of_stock: 'Rupture de stock',
  damaged_item: 'Article endommagé',
  late_delivery: 'Retard de livraison',
  duplicate_order: 'Commande en double',
  goodwill: 'Geste commercial',
  other: 'Autre motif',
};

export function AdminReGoRefundReview({
  refunds,
  loading,
  page,
  totalPages,
  total,
  decidingId,
  error,
  feedback,
  onPageChange,
  onRefresh,
  onDecide,
}: AdminReGoRefundReviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRefund, setSelectedRefund] = useState<AdminRefundRow | null>(null);
  const [rejectingRefund, setRejectingRefund] = useState<AdminRefundRow | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const filteredRefunds = useMemo(() => {
    if (!searchTerm.trim()) return refunds;
    const term = searchTerm.toLowerCase();
    return refunds.filter(
      (r) =>
        r.order_id.toLowerCase().includes(term) ||
        (r.store_name && r.store_name.toLowerCase().includes(term)) ||
        (r.owner_email && r.owner_email.toLowerCase().includes(term)) ||
        r.id.toLowerCase().includes(term)
    );
  }, [refunds, searchTerm]);

  const pageTotalAmount = useMemo(() => {
    return refunds.reduce((acc, r) => acc + Math.abs(toNumber(r.amount)), 0);
  }, [refunds]);

  const handleConfirmReject = async (refund: AdminRefundRow) => {
    if (!rejectNote.trim()) return;
    await onDecide(refund, 'reject', rejectNote.trim());
    setRejectingRefund(null);
    setRejectNote('');
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]">
            <Undo2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[var(--rego-fg,#111111)]">
                Arbitrage des Demandes de Remboursement
              </h1>
              <ReGoStatusChip
                status={total > 0 ? 'warn' : 'ok'}
                label={`${total} en révision`}
                size="xs"
              />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Médiation financière ReGo · Décisions de rétro-facturation, dédommagements et libération du séquestre
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs transition-all"
          >
            <span>Retour Overview</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {feedback && (
        <div className="p-3 rounded-[var(--rego-r,8px)] border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold">
          {feedback}
        </div>
      )}

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ReGoKpiHero
          label="Dossiers en Attente"
          value={loading ? '—' : total}
          hint="En attente de décision superadmin"
        />
        <ReGoKpiHero
          label="Montant Réclamé (Page)"
          value={<ReGoAmtBox amount={pageTotalAmount} size="lg" />}
          hint={`Total sur la page courante (${page})`}
        />
        <ReGoKpiHero
          label="Protection Acheteur"
          value="Garantie Panda"
          hint="Séquestre & arbitrage neutre"
        />
        <ReGoKpiHero
          label="Page Active"
          value={`${page} / ${totalPages || 1}`}
          hint="20 dossiers par page"
        />
      </div>

      {/* Main Table Card */}
      <ReGoCard
        title="File d'Arbitrage des Litiges & Remboursements"
        subtitle="Approuvez pour autoriser le marchand à exécuter le remboursement, ou rejetez avec justification"
        icon={Undo2}
        actions={
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
            <input
              type="text"
              placeholder="Rechercher commande, boutique..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-hidden focus:border-[var(--rego-accent,#ad0505)] font-medium"
            />
          </div>
        }
      >
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--rego-accent,#ad0505)]" />
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="text-sm font-bold text-[var(--rego-fg,#111111)]">
              {refunds.length === 0 ? 'Aucun remboursement en attente d\'arbitrage' : 'Aucun résultat correspondant'}
            </p>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto">
              {refunds.length === 0
                ? 'Toutes les contestations et demandes de retour client ont été traitées.'
                : 'Modifiez vos termes de recherche pour afficher d\'autres demandes.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--rego-fg,#111111)]">
                <thead className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Commande</th>
                    <th className="px-3 py-2.5">Boutique</th>
                    <th className="px-3 py-2.5">Montant</th>
                    <th className="px-3 py-2.5">Motif</th>
                    <th className="px-3 py-2.5">Statut</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                  {filteredRefunds.map((refund) => {
                    const isActing = decidingId === refund.id;

                    return (
                      <tr
                        key={refund.id}
                        className="hover:bg-[var(--rego-surface,#f5f5f5)]/50 transition-colors"
                      >
                        <td className="px-3 py-2.5 text-[11px] text-[var(--rego-ink-2,#737373)] font-mono">
                          {new Date(refund.created_at).toLocaleDateString('fr-TN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-[var(--rego-accent,#ad0505)]">
                          #{refund.order_id.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-[var(--rego-fg,#111111)]">
                            {refund.store_name || 'Boutique inconnue'}
                          </div>
                          <div className="text-[10px] text-[var(--rego-ink-3,#949494)]">
                            {refund.owner_email || '—'}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <ReGoAmtBox amount={Math.abs(toNumber(refund.amount))} size="sm" />
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                            {REASON_LABELS[refund.reason_code] || refund.reason_code}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <ReGoStatusChip
                            status={refund.status === 'approved' ? 'ok' : refund.status === 'rejected' ? 'err' : 'warn'}
                            label={refund.status === 'approved' ? 'Approuvé' : refund.status === 'rejected' ? 'Rejeté' : 'En attente'}
                            size="xs"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedRefund(refund)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspecter</span>
                            </button>

                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => void onDecide(refund, 'approve')}
                              className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 px-2.5 py-1 rounded-[var(--rego-r,8px)] shadow-2xs transition-all cursor-pointer"
                            >
                              {isActing ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              <span>Autoriser</span>
                            </button>

                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => {
                                setRejectingRefund(refund);
                                setRejectNote('');
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 disabled:opacity-50 px-2 py-1 rounded-[var(--rego-r,8px)] shadow-2xs transition-all cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>Rejeter</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--rego-border,#dedede)] text-xs text-[var(--rego-ink-2,#737373)]">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 font-bold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>

              <span className="font-medium">
                Page <strong className="text-[var(--rego-fg,#111111)]">{page}</strong> sur {totalPages || 1} ({total} demandes)
              </span>

              <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 font-bold cursor-pointer"
              >
                <span>Suivant</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </ReGoCard>

      {/* Reject Modal / Dialog Drawer */}
      {rejectingRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[var(--rego-fg,#111111)]">
                Rejeter la Demande #{rejectingRefund.id.slice(-8).toUpperCase()}
              </h3>
              <button
                type="button"
                onClick={() => setRejectingRefund(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--rego-ink-2,#737373)]">
              Veuillez indiquer un motif clair pour le marchand et l&apos;acheteur.
            </p>

            <textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Ex: Délai de réclamation dépassé ou produit conforme livré..."
              className="w-full p-2.5 text-xs rounded-[var(--rego-r,8px)] border border-slate-300 bg-white text-slate-900 focus:outline-hidden"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingRefund(null)}
                className="px-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!rejectNote.trim() || decidingId === rejectingRefund.id}
                onClick={() => void handleConfirmReject(rejectingRefund)}
                className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Confirmer le Rejet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(selectedRefund)}
        onClose={() => setSelectedRefund(null)}
        title={selectedRefund ? `Dossier #${selectedRefund.id.slice(-8).toUpperCase()}` : 'Détails du Remboursement'}
        subtitle={`Commande: #${selectedRefund?.order_id.slice(-8).toUpperCase()}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedRefund(null)}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer"
            >
              Fermer
            </button>
            {selectedRefund && (
              <button
                type="button"
                onClick={() => {
                  void onDecide(selectedRefund, 'approve');
                  setSelectedRefund(null);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs cursor-pointer"
              >
                Autoriser le Remboursement
              </button>
            )}
          </>
        }
      >
        {selectedRefund && (
          <div className="space-y-4">
            <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50">
              <span className="text-[10px] font-extrabold uppercase text-[var(--rego-ink-3,#949494)]">
                Montant Réclamé
              </span>
              <div className="mt-1">
                <ReGoAmtBox amount={Math.abs(toNumber(selectedRefund.amount))} size="lg" />
              </div>
              <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-1">
                Motif principal : <strong>{REASON_LABELS[selectedRefund.reason_code] || selectedRefund.reason_code}</strong>
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[var(--rego-fg,#111111)]">Détails de la Réclamation</h4>
              <div className="space-y-2 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-ink-2,#737373)]">
                <p><strong className="text-[var(--rego-fg,#111111)]">Boutique :</strong> {selectedRefund.store_name || 'Non renseigné'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Email Vendeur :</strong> {selectedRefund.owner_email || 'Non renseigné'}</p>
                <p><Demandeur text={selectedRefund.requested_by} /></p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Commentaire :</strong> {selectedRefund.reason || 'Aucun commentaire saisi'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Horodatage :</strong> {new Date(selectedRefund.created_at).toLocaleString('fr-TN')}</p>
              </div>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}

function Demandeur({ text }: { text?: string | null }) {
  return (
    <>
      <strong className="text-[var(--rego-fg,#111111)]">Initié par :</strong> {text || 'Client'}
    </>
  );
}
