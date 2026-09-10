'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  Wallet,
  Store,
  Activity,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileCheck,
  Server,
  Eye,
  Check,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Phone,
  FileText,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { fetchWithCsrf } from '@/lib/api';

export interface AdminStats {
  total_stores: number;
  total_orders: number;
  total_revenue: number;
  pending_kyc: number;
  pending_mandats: number;
  open_reports: number;
}

interface KycSubmission {
  id: string;
  store_name: string;
  owner_email: string;
  phone_number: string | null;
  phone_verified: boolean;
  rc_document_url: string | null;
  cin_document_url: string | null;
  created_at: string;
}

interface Withdrawal {
  id: string;
  wallet_id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
  store_id: string;
  store_name: string;
}

export interface AdminReGoOverviewProps {
  stats: AdminStats | null;
  loading: boolean;
}

function toNumber(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function AdminReGoOverview({
  stats,
  loading: statsLoading,
}: AdminReGoOverviewProps) {
  const [kycQueue, setKycQueue] = useState<KycSubmission[]>([]);
  const [kycLoading, setKycLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<Record<string, boolean>>({});
  const [selectedKyc, setSelectedKyc] = useState<KycSubmission | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchKycQueue = useCallback(async () => {
    setKycLoading(true);
    try {
      const res = await fetchWithCsrf('/api/pd/admin/verifications/pending?limit=5');
      if (res.ok) {
        const data = await res.json();
        setKycQueue(data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setKycLoading(false);
    }
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    setWithdrawalsLoading(true);
    try {
      const res = await fetchWithCsrf('/api/pd/admin/withdrawals?page=1&limit=5', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setWithdrawalsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchKycQueue();
    void fetchWithdrawals();
  }, [fetchKycQueue, fetchWithdrawals]);

  const handleApproveKyc = async (id: string) => {
    setActionId(id);
    setActionError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/verifications/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Échec de la validation KYC');
      setActionSuccess((prev) => ({ ...prev, [id]: true }));
      await fetchKycQueue();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur d\'approbation');
    } finally {
      setActionId(null);
    }
  };

  const totalActionsPending =
    (stats?.pending_kyc ?? 0) + (stats?.pending_mandats ?? 0) + (stats?.open_reports ?? 0);

  return (
    <div className="space-y-6">
      {/* Executive Telemetry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-[var(--rego-fg,#111111)]">PandaMarket Superadmin Hub</h2>
              <ReGoStatusChip status="ok" label="Plateforme Opérationnelle" size="xs" />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Gouvernance ReGo · Supervision globale du volume d&apos;affaires et des validations nationales
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void fetchKycQueue();
              void fetchWithdrawals();
            }}
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${kycLoading || withdrawalsLoading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
          <Link
            href="/kyc"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>File KYC ({stats?.pending_kyc ?? 0})</span>
          </Link>
          <Link
            href="/withdrawals"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs transition-all"
          >
            <span>Trésorerie & Retraits</span>
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-[var(--rego-r,8px)] border border-red-200 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold">
          {actionError}
        </div>
      )}

      {/* Layer 4: Platform Telemetry & Executive Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ReGoKpiHero
          label="Volume d'Affaires (GMV)"
          value={
            statsLoading ? (
              '—'
            ) : (
              <ReGoAmtBox amount={toNumber(stats?.total_revenue)} size="lg" />
            )
          }
          hint="Volume total des transactions marketplace"
        />
        <ReGoKpiHero
          label="Vendeurs Enregistrés"
          value={statsLoading ? '—' : (stats?.total_stores ?? 0)}
          hint="Boutiques actives sur PandaMarket"
        />
        <ReGoKpiHero
          label="Commandes Traitées"
          value={statsLoading ? '—' : (stats?.total_orders ?? 0)}
          hint="Total des commandes passées"
        />
        <ReGoKpiHero
          label="File d'Attente Opérationnelle"
          value={statsLoading ? '—' : totalActionsPending}
          hint={`${stats?.pending_kyc ?? 0} KYC · ${stats?.pending_mandats ?? 0} mandats · ${stats?.open_reports ?? 0} litiges`}
        />
      </div>

      {/* Layer 5: Moderation Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Pending KYC Moderation Deck (7 cols) */}
        <div className="lg:col-span-7">
          <ReGoCard
            title="Validation des Dossiers KYC Marchands"
            subtitle="Conformité légale tunisienne (RNE, Registre de Commerce et CIN)"
            icon={ShieldCheck}
            badge={
              (stats?.pending_kyc ?? kycQueue.length) > 0 ? (
                <ReGoStatusChip status="warn" label={`${stats?.pending_kyc ?? kycQueue.length} en attente`} size="xs" />
              ) : (
                <ReGoStatusChip status="ok" label="À jour" size="xs" />
              )
            }
            actions={
              <Link href="/kyc" className="text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline inline-flex items-center gap-1">
                <span>Voir tout ({stats?.pending_kyc ?? kycQueue.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {kycLoading ? (
              <div className="py-8 flex justify-center items-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--rego-accent,#ad0505)]" />
              </div>
            ) : kycQueue.length > 0 ? (
              <div className="space-y-2.5">
                {kycQueue.map((item) => {
                  const isActing = actionId === item.id;
                  const isApproved = actionSuccess[item.id];
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 hover:bg-[var(--rego-surface,#f5f5f5)]/80 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                            {item.store_name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--rego-ink-2,#737373)] font-medium">
                            {item.owner_email}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--rego-ink-2,#737373)]">
                          <span className="text-[11px] font-medium">
                            {item.phone_number || 'Sans téléphone'}
                          </span>
                          <span>•</span>
                          <span className="text-[10px] text-[var(--rego-ink-3,#949494)]">
                            {new Date(item.created_at).toLocaleDateString('fr-TN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          <span>•</span>
                          <div className="flex items-center gap-1 text-[10px]">
                            {item.cin_document_url && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold">CIN</span>
                            )}
                            {item.rc_document_url && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold">RNE/RC</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedKyc(item)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] px-2.5 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Détails</span>
                        </button>

                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2.5 py-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40">
                            <Check className="w-3.5 h-3.5" /> Approuvé
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleApproveKyc(item.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] hover:bg-[var(--rego-accent,#ad0505)] disabled:opacity-50 px-3 py-1.5 rounded-[var(--rego-r,8px)] transition-all shadow-2xs cursor-pointer"
                          >
                            {isActing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Valider</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                  Aucun dossier KYC en attente
                </p>
                <p className="text-[11px] text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto">
                  Tous les dossiers d&apos;identité marchands récents ont été examinés et validés.
                </p>
              </div>
            )}
          </ReGoCard>
        </div>

        {/* Pending Withdrawals & Disbursal Queue (5 cols) */}
        <div className="lg:col-span-5">
          <ReGoCard
            title="Derniers Retraits & Décaissements"
            subtitle="Validation des virements bancaires vers les comptes marchands"
            icon={Wallet}
            actions={
              <Link href="/withdrawals" className="text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]">
                Voir Retraits
              </Link>
            }
          >
            {withdrawalsLoading ? (
              <div className="py-8 flex justify-center items-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--rego-accent,#ad0505)]" />
              </div>
            ) : withdrawals.length > 0 ? (
              <div className="space-y-2.5">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                  >
                    <div>
                      <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                        {w.store_name}
                      </span>
                      <p className="text-[10px] text-[var(--rego-ink-2,#737373)]">
                        {new Date(w.created_at).toLocaleDateString('fr-TN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <div className="text-end">
                      <ReGoAmtBox amount={Math.abs(w.amount)} size="sm" />
                      <p className="text-[10px] text-[var(--rego-ink-3,#949494)]">Solde rest: {toNumber(w.balance_after).toFixed(3)} TND</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Wallet className="mx-auto h-8 w-8 text-[var(--rego-ink-3,#949494)]" />
                <p className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                  Aucun retrait en cours
                </p>
                <p className="text-[11px] text-[var(--rego-ink-2,#737373)] max-w-xs mx-auto">
                  Toutes les demandes de virement ont été traitées ou aucun décaissement n&apos;est en attente.
                </p>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[var(--rego-border,#dedede)]">
              <Link
                href="/withdrawals"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] hover:bg-[var(--rego-border,#dedede)]/30 text-xs font-bold text-[var(--rego-fg,#111111)] transition-colors"
              >
                <span>Accéder au Module Virements</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </ReGoCard>
        </div>
      </div>

      {/* Detail KYC Inspection Drawer */}
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
                  void handleApproveKyc(selectedKyc.id);
                  setSelectedKyc(null);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs cursor-pointer"
              >
                Approuver le Dossier
              </button>
            )}
          </>
        }
      >
        {selectedKyc && (
          <div className="space-y-4">
            <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] p-3 bg-[var(--rego-surface,#f5f5f5)]/50">
              <span className="text-[10px] font-extrabold uppercase text-[var(--rego-ink-3,#949494)]">Boutique</span>
              <p className="text-sm font-black text-[var(--rego-fg,#111111)]">{selectedKyc.store_name}</p>
              <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">{selectedKyc.owner_email}</p>
              {selectedKyc.phone_number && (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-[var(--rego-fg,#111111)]">
                  <Phone className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
                  <span>{selectedKyc.phone_number}</span>
                  {selectedKyc.phone_verified && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">Vérifié</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">Pièces Justificatives Fournies</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--rego-ink-2,#737373)]" />
                    <div>
                      <p className="text-xs font-bold text-[var(--rego-fg,#111111)]">Carte d&apos;Identité Nationale (CIN)</p>
                      <p className="text-[10px] text-[var(--rego-ink-3,#949494)]">{selectedKyc.cin_document_url ? 'Document joint' : 'Non fourni'}</p>
                    </div>
                  </div>
                  {selectedKyc.cin_document_url && (
                    <a
                      href={selectedKyc.cin_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-100 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Ouvrir</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--rego-ink-2,#737373)]" />
                    <div>
                      <p className="text-xs font-bold text-[var(--rego-fg,#111111)]">Registre de Commerce / RNE</p>
                      <p className="text-[10px] text-[var(--rego-ink-3,#949494)]">{selectedKyc.rc_document_url ? 'Document joint' : 'Non fourni'}</p>
                    </div>
                  </div>
                  {selectedKyc.rc_document_url && (
                    <a
                      href={selectedKyc.rc_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-100 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Ouvrir</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--rego-border,#dedede)]">
              <Link
                href="/kyc"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-white text-xs font-bold hover:bg-[var(--rego-accent,#ad0505)] transition-colors"
              >
                <span>Accéder au Dossier Complet sur la Page KYC</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
