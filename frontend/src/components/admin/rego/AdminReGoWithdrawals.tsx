'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowUpRight,
  Store,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Building2,
  Clock,
  Eye,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface Withdrawal {
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

export interface AdminReGoWithdrawalsProps {
  withdrawals: Withdrawal[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

function toNumber(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function AdminReGoWithdrawals({
  withdrawals,
  loading,
  page,
  totalPages,
  total,
  onPageChange,
  onRefresh,
}: AdminReGoWithdrawalsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);

  const filteredWithdrawals = useMemo(() => {
    if (!searchTerm.trim()) return withdrawals;
    const term = searchTerm.toLowerCase();
    return withdrawals.filter(
      (w) =>
        w.store_name.toLowerCase().includes(term) ||
        w.id.toLowerCase().includes(term) ||
        (w.description && w.description.toLowerCase().includes(term))
    );
  }, [withdrawals, searchTerm]);

  const pageTotalDisbursed = useMemo(() => {
    return withdrawals.reduce((acc, w) => acc + Math.abs(toNumber(w.amount)), 0);
  }, [withdrawals]);

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[var(--rego-fg,#111111)]">
                Journal des Retraits & Décaissements Marchands
              </h1>
              <ReGoStatusChip
                status="neutral"
                label={`${total} opérations`}
                size="xs"
              />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Supervision financière ReGo · Traçabilité des virements bancaires et des soldes marchands
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

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ReGoKpiHero
          label="Total Opérations"
          value={loading ? '—' : total}
          hint="Transactions de débit ou virement"
        />
        <ReGoKpiHero
          label="Volume Décaissement (Page)"
          value={<ReGoAmtBox amount={pageTotalDisbursed} size="lg" />}
          hint={`Somme des débits sur la page ${page}`}
        />
        <ReGoKpiHero
          label="Page Active"
          value={`${page} / ${totalPages || 1}`}
          hint="20 enregistrements par page"
        />
        <ReGoKpiHero
          label="Statut Trésorerie"
          value="Synchronisé"
          hint="Ledger bancaire à jour"
        />
      </div>

      {/* Main Table Card */}
      <ReGoCard
        title="Historique des Virements & Débits Marchands"
        subtitle="Registres complets avec vérification des soldes après transaction"
        icon={Wallet}
        actions={
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
            <input
              type="text"
              placeholder="Rechercher boutique, ID..."
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
        ) : filteredWithdrawals.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="text-sm font-bold text-[var(--rego-fg,#111111)]">
              {withdrawals.length === 0 ? 'Aucun retrait trouvé' : 'Aucun résultat correspondant'}
            </p>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto">
              {withdrawals.length === 0
                ? 'Toutes les demandes de décaissements ont été exécutées ou aucun virement n\'a encore été initié.'
                : 'Essayez d\'ajuster vos filtres de recherche.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--rego-fg,#111111)]">
                <thead className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Boutique Marchande</th>
                    <th className="px-3 py-2.5">Montant Débité</th>
                    <th className="px-3 py-2.5">Solde Après Opération</th>
                    <th className="px-3 py-2.5">Description</th>
                    <th className="px-3 py-2.5">ID Réf</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                  {filteredWithdrawals.map((w) => (
                    <tr
                      key={w.id}
                      className="hover:bg-[var(--rego-surface,#f5f5f5)]/50 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-[11px] text-[var(--rego-ink-2,#737373)] font-mono">
                        {new Date(w.created_at).toLocaleDateString('fr-TN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-[var(--rego-ink-3,#949494)]" />
                          <span className="font-bold text-[var(--rego-fg,#111111)]">
                            {w.store_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 text-rose-600 font-bold">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>-{toNumber(w.amount).toFixed(3)} TND</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                        {toNumber(w.balance_after).toFixed(3)} TND
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-[var(--rego-ink-2,#737373)] max-w-xs truncate">
                        {w.description || 'Virement standard'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-[var(--rego-ink-3,#949494)]">
                        {w.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedWithdrawal(w)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-accent,#ad0505)] p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Détails</span>
                        </button>
                      </td>
                    </tr>
                  ))}
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
                Page <strong className="text-[var(--rego-fg,#111111)]">{page}</strong> sur {totalPages || 1} ({total} retraits)
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

      {/* Detail Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(selectedWithdrawal)}
        onClose={() => setSelectedWithdrawal(null)}
        title={selectedWithdrawal ? `Virement #${selectedWithdrawal.id.slice(-8).toUpperCase()}` : 'Détails du Retrait'}
        subtitle={`Boutique: ${selectedWithdrawal?.store_name}`}
        footer={
          <button
            type="button"
            onClick={() => setSelectedWithdrawal(null)}
            className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer"
          >
            Fermer
          </button>
        }
      >
        {selectedWithdrawal && (
          <div className="space-y-4">
            <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50">
              <span className="text-[10px] font-extrabold uppercase text-[var(--rego-ink-3,#949494)]">
                Montant Virement
              </span>
              <div className="mt-1">
                <ReGoAmtBox amount={Math.abs(toNumber(selectedWithdrawal.amount))} size="lg" />
              </div>
              <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-1">
                Solde restant du portefeuille : {toNumber(selectedWithdrawal.balance_after).toFixed(3)} TND
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[var(--rego-fg,#111111)]">Informations Opération</h4>
              <div className="space-y-1.5 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-ink-2,#737373)]">
                <p><strong className="text-[var(--rego-fg,#111111)]">Boutique :</strong> {selectedWithdrawal.store_name}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">ID Portefeuille :</strong> {selectedWithdrawal.wallet_id}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Type d&apos;opération :</strong> {selectedWithdrawal.type}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Description :</strong> {selectedWithdrawal.description || 'Aucune description'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Date :</strong> {new Date(selectedWithdrawal.created_at).toLocaleString('fr-TN')}</p>
              </div>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
