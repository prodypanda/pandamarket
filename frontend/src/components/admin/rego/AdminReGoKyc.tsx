'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Phone,
  FileText,
  Eye,
  Check,
  X,
  Loader2,
  RefreshCw,
  Search,
  ExternalLink,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface KycSubmission {
  id: string;
  store_name: string;
  owner_email: string;
  phone_number: string | null;
  phone_verified: boolean;
  rc_document_url: string | null;
  cin_document_url: string | null;
  created_at: string;
}

export interface AdminReGoKycProps {
  queue: KycSubmission[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  actionId: string | null;
  onOpenDocument: (fileRef: string | null) => Promise<void>;
}

export function AdminReGoKyc({
  queue,
  loading,
  error,
  onRefresh,
  onApprove,
  onReject,
  actionId,
  onOpenDocument,
}: AdminReGoKycProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKyc, setSelectedKyc] = useState<KycSubmission | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const filteredQueue = useMemo(() => {
    if (!searchTerm.trim()) return queue;
    const term = searchTerm.toLowerCase();
    return queue.filter(
      (item) =>
        item.store_name.toLowerCase().includes(term) ||
        item.owner_email.toLowerCase().includes(term) ||
        (item.phone_number && item.phone_number.includes(term))
    );
  }, [queue, searchTerm]);

  const phoneVerifiedCount = useMemo(() => queue.filter((k) => k.phone_verified).length, [queue]);
  const completeDocsCount = useMemo(
    () => queue.filter((k) => Boolean(k.cin_document_url && k.rc_document_url)).length,
    [queue]
  );

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
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[var(--rego-fg,#111111)]">
                File d&apos;Attente des Vérifications KYC
              </h1>
              <ReGoStatusChip
                status={queue.length > 0 ? 'warn' : 'ok'}
                label={`${queue.length} en attente`}
                size="xs"
              />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Conformité marchande ReGo · Validation des registres RNE, CIN et coordonnées bancaires
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

      {/* Telemetry Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ReGoKpiHero
          label="Dossiers à Traiter"
          value={loading ? '—' : queue.length}
          hint="En attente d'approbation superadmin"
        />
        <ReGoKpiHero
          label="Téléphones Vérifiés"
          value={loading ? '—' : phoneVerifiedCount}
          hint="Numéros vérifiés par SMS OTP"
        />
        <ReGoKpiHero
          label="Dossiers Complets (CIN + RNE)"
          value={loading ? '—' : completeDocsCount}
          hint="Toutes pièces légales attachées"
        />
        <ReGoKpiHero
          label="Pièces Manquantes"
          value={loading ? '—' : queue.length - completeDocsCount}
          hint="Requiert relance ou complément"
        />
      </div>

      {/* Main Working Area with Search */}
      <ReGoCard
        title="Dossiers Marchands Soumis"
        subtitle="Examinez chaque soumission et validez l'accès vendeur en 1 clic"
        icon={ShieldCheck}
        actions={
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
            <input
              type="text"
              placeholder="Rechercher boutique, email..."
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
        ) : filteredQueue.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="text-sm font-bold text-[var(--rego-fg,#111111)]">
              {queue.length === 0 ? 'Aucune vérification KYC en attente' : 'Aucun résultat trouvé'}
            </p>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto">
              {queue.length === 0
                ? 'Tous les dossiers KYC ont été approuvés ou traités par l\'administration.'
                : 'Modifiez votre recherche pour trouver d\'autres boutiques.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQueue.map((item) => {
              const isActing = actionId === item.id;
              const isRejecting = rejectingId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/30 hover:bg-[var(--rego-surface,#f5f5f5)]/70 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--rego-fg,#111111)]">
                          {item.store_name}
                        </span>
                        <ReGoStatusChip status="warn" label="À Valider" size="xs" />
                      </div>
                      <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
                        {item.owner_email} · Soumis le {new Date(item.created_at).toLocaleDateString('fr-TN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedKyc(item)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspecter Dossier</span>
                      </button>

                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => void onApprove(item.id)}
                        className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 px-3.5 py-1.5 rounded-[var(--rego-r,8px)] shadow-2xs transition-all cursor-pointer"
                      >
                        {isActing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Approuver</span>
                      </button>

                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => {
                          setRejectingId(isRejecting ? null : item.id);
                          setRejectionReason('');
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 disabled:opacity-50 px-3 py-1.5 rounded-[var(--rego-r,8px)] shadow-2xs transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Rejeter</span>
                      </button>
                    </div>
                  </div>

                  {/* Documents & Verification Details Deck */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--rego-border,#dedede)]/60 text-xs">
                    {/* Phone */}
                    <div className="flex items-center justify-between p-2 rounded-[var(--rego-r,8px)] bg-white dark:bg-slate-900 border border-[var(--rego-border,#dedede)]/80">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
                        <span className="font-mono">{item.phone_number || 'Aucun numéro'}</span>
                      </div>
                      {item.phone_verified ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Vérifié OTP</span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-semibold">Non vérifié</span>
                      )}
                    </div>

                    {/* CIN */}
                    <div className="flex items-center justify-between p-2 rounded-[var(--rego-r,8px)] bg-white dark:bg-slate-900 border border-[var(--rego-border,#dedede)]/80">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
                        <span>Carte CIN</span>
                      </div>
                      {item.cin_document_url ? (
                        <button
                          type="button"
                          onClick={() => void onOpenDocument(item.cin_document_url)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-accent,#ad0505)] hover:underline cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Voir CIN</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-[var(--rego-ink-3,#949494)]">Manquant</span>
                      )}
                    </div>

                    {/* RC / RNE */}
                    <div className="flex items-center justify-between p-2 rounded-[var(--rego-r,8px)] bg-white dark:bg-slate-900 border border-[var(--rego-border,#dedede)]/80">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
                        <span>Registre RNE / RC</span>
                      </div>
                      {item.rc_document_url ? (
                        <button
                          type="button"
                          onClick={() => void onOpenDocument(item.rc_document_url)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-accent,#ad0505)] hover:underline cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Voir RNE</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-[var(--rego-ink-3,#949494)]">Manquant</span>
                      )}
                    </div>
                  </div>

                  {/* Rejection input expansion */}
                  {isRejecting && (
                    <div className="p-3 rounded-[var(--rego-r,8px)] bg-rose-50/50 dark:bg-rose-950/50 border border-rose-200 space-y-2">
                      <p className="text-xs font-bold text-rose-800">
                        Motif du rejet (ce message sera transmis au marchand) :
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ex: Pièce d'identité illisible ou expirée, veuillez soumettre un scan net"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-rose-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden"
                        />
                        <button
                          type="button"
                          disabled={!rejectionReason.trim() || isActing}
                          onClick={() => void handleConfirmReject(item.id)}
                          className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                        >
                          Confirmer le Rejet
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingId(null)}
                          className="px-2.5 py-1.5 text-xs rounded-[var(--rego-r,8px)] text-slate-600 dark:text-slate-400 hover:bg-slate-200"
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

      {/* Detail Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(selectedKyc)}
        onClose={() => setSelectedKyc(null)}
        title={selectedKyc?.store_name || 'Dossier KYC Marchand'}
        subtitle={`Propriétaire: ${selectedKyc?.owner_email}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedKyc(null)}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)]"
            >
              Fermer
            </button>
            {selectedKyc && (
              <button
                type="button"
                onClick={() => {
                  void onApprove(selectedKyc.id);
                  setSelectedKyc(null);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs cursor-pointer"
              >
                Approuver Immédiatement
              </button>
            )}
          </>
        }
      >
        {selectedKyc && (
          <div className="space-y-4">
            <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50">
              <span className="text-[10px] font-extrabold uppercase text-[var(--rego-ink-3,#949494)]">
                Dossier Marchand
              </span>
              <p className="text-base font-black text-[var(--rego-fg,#111111)] mt-0.5">
                {selectedKyc.store_name}
              </p>
              <p className="text-xs text-[var(--rego-ink-2,#737373)]">{selectedKyc.owner_email}</p>
              {selectedKyc.phone_number && (
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href={`tel:${selectedKyc.phone_number}`}
                    className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[var(--rego-accent,#ad0505)] hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{selectedKyc.phone_number}</span>
                  </a>
                  {selectedKyc.phone_verified ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">
                      Vérifié
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold">
                      Non vérifié
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                Documents Légaux Tunisiens
              </h4>

              {/* CIN Preview */}
              <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--rego-accent,#ad0505)]" />
                    <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                      Carte d&apos;Identité Nationale (CIN)
                    </span>
                  </div>
                  {selectedKyc.cin_document_url ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                      Fourni
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                      Non fourni
                    </span>
                  )}
                </div>
                {selectedKyc.cin_document_url && (
                  <button
                    type="button"
                    onClick={() => void onOpenDocument(selectedKyc.cin_document_url)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-[var(--rego-r,8px)] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-800 dark:text-slate-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Visualiser la Carte CIN</span>
                  </button>
                )}
              </div>

              {/* RC Preview */}
              <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[var(--rego-accent,#ad0505)]" />
                    <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                      Registre de Commerce / RNE
                    </span>
                  </div>
                  {selectedKyc.rc_document_url ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                      Fourni
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                      Non fourni
                    </span>
                  )}
                </div>
                {selectedKyc.rc_document_url && (
                  <button
                    type="button"
                    onClick={() => void onOpenDocument(selectedKyc.rc_document_url)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-[var(--rego-r,8px)] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-800 dark:text-slate-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Visualiser l&apos;Extrait RNE / RC</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
