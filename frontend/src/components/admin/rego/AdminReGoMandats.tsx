'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Check,
  X,
  Eye,
  DollarSign,
  Loader2,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface MandatProof {
  id: string;
  order_id: string;
  customer_email: string;
  amount_expected: number | string;
  image_url: string;
  created_at: string;
  uploaded_by: string;
}

export interface AdminReGoMandatsProps {
  mandats: MandatProof[];
  loading: boolean;
  error: string | null;
  actionId: string | null;
  onRefresh: () => Promise<void>;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}

function toAmount(value: number | string): number {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function AdminReGoMandats({
  mandats,
  loading,
  error,
  actionId,
  onRefresh,
  onApprove,
  onReject,
}: AdminReGoMandatsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMandat, setSelectedMandat] = useState<MandatProof | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const filteredMandats = useMemo(() => {
    if (!searchTerm.trim()) return mandats;
    const term = searchTerm.toLowerCase();
    return mandats.filter(
      (m) =>
        m.order_id.toLowerCase().includes(term) ||
        m.customer_email.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term)
    );
  }, [mandats, searchTerm]);

  const totalExpectedAmount = useMemo(() => {
    return mandats.reduce((acc, m) => acc + toAmount(m.amount_expected), 0);
  }, [mandats]);

  const handleConfirmReject = async (id: string) => {
    if (!rejectionReason.trim()) return;
    await onReject(id, rejectionReason.trim());
    setRejectingId(null);
    setRejectionReason('');
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[var(--rego-fg,#111111)]">
                Validation des Mandats Minute (Poste Tunisienne)
              </h1>
              <ReGoStatusChip
                status={mandats.length > 0 ? 'warn' : 'ok'}
                label={`${mandats.length} en attente`}
                size="xs"
              />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Réconciliation postale ReGo · Contrôle des reçus physiques de mandats et déblocage des commandes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onRefresh()}
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
        <div className="p-3 rounded-[var(--rego-r,8px)] border border-red-200 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Telemetry KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ReGoKpiHero
          label="Mandats en Attente"
          value={loading ? '—' : mandats.length}
          hint="Reçus à examiner et valider"
        />
        <ReGoKpiHero
          label="Montant Total Attendu"
          value={<ReGoAmtBox amount={totalExpectedAmount} size="lg" />}
          hint="Somme à encaisser en bureau de poste"
        />
        <ReGoKpiHero
          label="Réseau Postal"
          value="La Poste TN"
          hint="Mandat Minute & Mandat Express"
        />
        <ReGoKpiHero
          label="Mandats Affichés"
          value={loading ? '—' : filteredMandats.length}
          hint="Après filtre de recherche"
        />
      </div>

      {/* Main Table Card */}
      <ReGoCard
        title="File de Réconciliation des Reçus Postaux"
        subtitle="Vérifiez le numéro d'ordre postal et validez le paiement pour débloquer l'envoi"
        icon={Receipt}
        actions={
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
            <input
              type="text"
              placeholder="Rechercher commande, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full ps-8 pe-3 py-1 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-hidden focus:border-[var(--rego-accent,#ad0505)] font-medium"
            />
          </div>
        }
      >
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--rego-accent,#ad0505)]" />
          </div>
        ) : filteredMandats.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="text-sm font-bold text-[var(--rego-fg,#111111)]">
              {mandats.length === 0 ? 'Aucun mandat en attente de vérification' : 'Aucun mandat correspondant'}
            </p>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto">
              {mandats.length === 0
                ? 'Tous les reçus de paiement par mandat postal ont été traités et réconciliés.'
                : 'Modifiez votre terme de recherche pour retrouver la commande.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMandats.map((mandat) => {
              const isActing = actionId === mandat.id;
              const isRejecting = rejectingId === mandat.id;

              return (
                <div
                  key={mandat.id}
                  className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/30 hover:bg-[var(--rego-surface,#f5f5f5)]/70 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {mandat.image_url ? (
                        <button
                          type="button"
                          onClick={() => setSelectedMandat(mandat)}
                          className="h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 p-0.5 hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          <img
                            src={mandat.image_url}
                            alt="Reçu postal"
                            className="h-full w-full object-cover rounded"
                          />
                        </button>
                      ) : (
                        <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                          <Receipt className="w-6 h-6" />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[var(--rego-accent,#ad0505)]">
                            #{mandat.order_id.slice(-8).toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold text-[var(--rego-fg,#111111)] truncate max-w-[200px]">
                            {mandat.customer_email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--rego-ink-2,#737373)]">
                          <span>Montant attendu :</span>
                          <ReGoAmtBox amount={toAmount(mandat.amount_expected)} size="sm" />
                          <span>•</span>
                          <span className="text-[10px] text-[var(--rego-ink-3,#949494)]">
                            {new Date(mandat.created_at).toLocaleDateString('fr-TN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedMandat(mandat)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Agrandir Reçu</span>
                      </button>

                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => void onApprove(mandat.id)}
                        className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 px-3.5 py-1.5 rounded-[var(--rego-r,8px)] shadow-2xs transition-all cursor-pointer"
                      >
                        {isActing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Valider Mandat</span>
                      </button>

                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => {
                          setRejectingId(isRejecting ? null : mandat.id);
                          setRejectionReason('');
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 disabled:opacity-50 px-3 py-1.5 rounded-[var(--rego-r,8px)] shadow-2xs transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Rejeter</span>
                      </button>
                    </div>
                  </div>

                  {/* Rejection input expansion */}
                  {isRejecting && (
                    <div className="p-3 rounded-[var(--rego-r,8px)] bg-rose-50/50 dark:bg-rose-950/50 border border-rose-200 space-y-2">
                      <p className="text-xs font-bold text-rose-800">
                        Motif du rejet du mandat (transmis au client) :
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ex: Reçu illisible ou montant différent du total de commande"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-rose-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden"
                        />
                        <button
                          type="button"
                          disabled={!rejectionReason.trim() || isActing}
                          onClick={() => void handleConfirmReject(mandat.id)}
                          className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          Confirmer le Rejet
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingId(null)}
                          className="px-2.5 py-1.5 text-xs rounded-[var(--rego-r,8px)] text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ReGoCard>

      {/* Detail Inspection Drawer with Image Preview */}
      <ReGoDrawer
        isOpen={Boolean(selectedMandat)}
        onClose={() => setSelectedMandat(null)}
        title={selectedMandat ? `Reçu Mandat #${selectedMandat.order_id.slice(-8).toUpperCase()}` : 'Détails du Reçu'}
        subtitle={`Client: ${selectedMandat?.customer_email}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedMandat(null)}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer"
            >
              Fermer
            </button>
            {selectedMandat && (
              <button
                type="button"
                onClick={() => {
                  void onApprove(selectedMandat.id);
                  setSelectedMandat(null);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs cursor-pointer"
              >
                Approuver ce Mandat
              </button>
            )}
          </>
        }
      >
        {selectedMandat && (
          <div className="space-y-4">
            <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50">
              <span className="text-[10px] font-extrabold uppercase text-[var(--rego-ink-3,#949494)]">
                Montant Attendu
              </span>
              <div className="mt-1">
                <ReGoAmtBox amount={toAmount(selectedMandat.amount_expected)} size="lg" />
              </div>
              <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-1">
                Commande réf : <strong className="font-mono">{selectedMandat.order_id}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                Photographie du Reçu Postal Fourni
              </h4>
              {selectedMandat.image_url ? (
                <div className="rounded-[var(--rego-r,8px)] overflow-hidden border border-[var(--rego-border,#dedede)] bg-slate-950/5 p-1">
                  <img
                    src={selectedMandat.image_url}
                    alt="Reçu Mandat Minute"
                    className="w-full max-h-[380px] object-contain rounded bg-white dark:bg-slate-900"
                  />
                  <div className="pt-2 flex justify-end">
                    <a
                      href={selectedMandat.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Ouvrir en taille réelle</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-[var(--rego-r,8px)]">
                  Aucune image attachée
                </div>
              )}
            </div>

            <div className="text-xs space-y-1 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-ink-2,#737373)]">
              <p><strong className="text-[var(--rego-fg,#111111)]">Téléversé par :</strong> {selectedMandat.uploaded_by}</p>
              <p><strong className="text-[var(--rego-fg,#111111)]">Date :</strong> {new Date(selectedMandat.created_at).toLocaleString('fr-TN')}</p>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
