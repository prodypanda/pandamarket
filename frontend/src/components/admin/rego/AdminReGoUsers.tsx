'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  Store,
  KeyRound,
  Ban,
  CheckCircle2,
  RefreshCw,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  Phone,
  Lock,
  DollarSign,
  Package,
  ShoppingCart,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface VendorAccount {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  is_active?: boolean | null;
  two_factor_enabled?: boolean | null;
  last_login_at?: string | null;
  created_at?: string | null;
  store_count?: string | number | null;
  free_store_count?: string | number | null;
  paid_store_count?: string | number | null;
  verified_store_count?: string | number | null;
  suspended_store_count?: string | number | null;
  product_count?: string | number | null;
  order_count?: string | number | null;
  captured_revenue?: string | number | null;
  open_report_count?: string | number | null;
}

export interface VendorAccountSummary {
  total: number;
  active: number;
  inactive: number;
  multi_store_accounts: number;
  free_store_slots_available: number;
  total_stores: number;
}

export interface AdminReGoUsersProps {
  accounts: VendorAccount[];
  summary: VendorAccountSummary;
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  search: string;
  onSearchChange: (search: string) => void;
  multiStoreOnly: boolean;
  onMultiStoreOnlyChange: (enabled: boolean) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onToggleActive: (accountId: string, currentlyActive: boolean) => Promise<void>;
  onSendPasswordReset: (accountId: string, email: string) => Promise<void>;
  activeAction?: string | null;
  error?: string;
  success?: string;
}

function toNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function AdminReGoUsers({
  accounts,
  summary,
  loading,
  page,
  totalPages,
  total,
  search,
  onSearchChange,
  multiStoreOnly,
  onMultiStoreOnlyChange,
  onPageChange,
  onRefresh,
  onToggleActive,
  onSendPasswordReset,
  activeAction,
  error,
  success,
}: AdminReGoUsersProps) {
  const [selectedAccount, setSelectedAccount] = useState<VendorAccount | null>(null);

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[var(--rego-fg,#111111)]">
                Comptes & Utilisateurs Vendeurs
              </h1>
              <ReGoStatusChip
                status="neutral"
                label={`${summary.total} comptes`}
                size="xs"
              />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Gestion des identités marchandes ReGo · Sécurité des accès, 2FA et associations multi-boutiques
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
            href="/stores"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all"
          >
            <span>Annuaire Boutiques</span>
          </Link>
          <Link
            href="/buyers"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs transition-all"
          >
            <span>Comptes Acheteurs</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-[var(--rego-r,8px)] border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold">
          {success}
        </div>
      )}

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ReGoKpiHero
          label="Total Comptes Vendeurs"
          value={loading ? '—' : summary.total}
          hint="Propriétaires de boutiques"
        />
        <ReGoKpiHero
          label="Comptes Actifs"
          value={loading ? '—' : summary.active}
          hint="Accès plateforme opérationnels"
        />
        <ReGoKpiHero
          label="Multi-Boutiques"
          value={loading ? '—' : summary.multi_store_accounts}
          hint="Marchands gérant ≥ 2 boutiques"
        />
        <ReGoKpiHero
          label="Total Boutiques Gérées"
          value={loading ? '—' : summary.total_stores}
          hint="Volume réseau sous gestion"
        />
      </div>

      {/* Main Table Card */}
      <ReGoCard
        title="Annuaire des Comptes Marchands"
        subtitle="Contrôlez les accès de connexion, statuts 2FA et réinitialisez les mots de passe"
        icon={Users}
        actions={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <button
              type="button"
              onClick={() => onMultiStoreOnlyChange(!multiStoreOnly)}
              className={`px-3 py-1 text-xs font-bold rounded-[var(--rego-r,8px)] border transition-all cursor-pointer ${
                multiStoreOnly
                  ? 'bg-[var(--rego-fg,#111111)] text-white border-[var(--rego-fg,#111111)]'
                  : 'border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)]'
              }`}
            >
              Multi-Boutiques Uniquement
            </button>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
              <input
                type="text"
                placeholder="Rechercher email, nom..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-hidden focus:border-[var(--rego-accent,#ad0505)] font-medium"
              />
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--rego-accent,#ad0505)]" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Users className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-[var(--rego-fg,#111111)]">
              Aucun compte vendeur trouvé
            </p>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto">
              Modifiez votre recherche ou désactivez le filtre multi-boutiques.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--rego-fg,#111111)]">
                <thead className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
                  <tr>
                    <th className="px-3 py-2.5">Marchand / Identité</th>
                    <th className="px-3 py-2.5">Contact & 2FA</th>
                    <th className="px-3 py-2.5">Boutiques Gérées</th>
                    <th className="px-3 py-2.5">Volume Ventes</th>
                    <th className="px-3 py-2.5">Dernière Connexion</th>
                    <th className="px-3 py-2.5">Statut Compte</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                  {accounts.map((account) => {
                    const fullName = [account.first_name, account.last_name].filter(Boolean).join(' ');
                    const isActing = activeAction === account.id;

                    return (
                      <tr
                        key={account.id}
                        className="hover:bg-[var(--rego-surface,#f5f5f5)]/50 transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                            {fullName || 'Marchand sans nom'}
                          </div>
                          <div className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                            {account.email}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-mono text-[11px] text-[var(--rego-fg,#111111)]">
                            {account.phone || '—'}
                          </div>
                          <div className="mt-0.5">
                            {account.two_factor_enabled ? (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                2FA Actif
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Sans 2FA</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                            {toNumber(account.store_count)} boutique{toNumber(account.store_count) > 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px] text-[var(--rego-ink-3,#949494)] block">
                            {toNumber(account.verified_store_count)} vérifiée(s)
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <ReGoAmtBox amount={toNumber(account.captured_revenue)} size="sm" />
                          <span className="text-[10px] text-[var(--rego-ink-3,#949494)] block">
                            {toNumber(account.order_count)} commandes
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-[var(--rego-ink-2,#737373)]">
                          {account.last_login_at
                            ? new Date(account.last_login_at).toLocaleDateString('fr-TN', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : 'Jamais connecté'}
                        </td>
                        <td className="px-3 py-2.5">
                          <ReGoStatusChip
                            status={account.is_active ? 'ok' : 'err'}
                            label={account.is_active ? 'Actif' : 'Désactivé'}
                            size="xs"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedAccount(account)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspecter</span>
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(isActing)}
                              onClick={() => account.email && void onSendPasswordReset(account.id, account.email)}
                              title="Envoyer lien de réinitialisation de mot de passe"
                              className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(isActing)}
                              onClick={() => void onToggleActive(account.id, Boolean(account.is_active))}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                account.is_active
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {account.is_active ? 'Désactiver' : 'Activer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
                Page <strong className="text-[var(--rego-fg,#111111)]">{page}</strong> sur {totalPages || 1} ({total} comptes)
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
        isOpen={Boolean(selectedAccount)}
        onClose={() => setSelectedAccount(null)}
        title={selectedAccount ? ([selectedAccount.first_name, selectedAccount.last_name].filter(Boolean).join(' ') || selectedAccount.email || 'Compte Vendeur') : 'Détails Compte'}
        subtitle={`ID: ${selectedAccount?.id}`}
        footer={
          <button
            type="button"
            onClick={() => setSelectedAccount(null)}
            className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer"
          >
            Fermer
          </button>
        }
      >
        {selectedAccount && (
          <div className="space-y-4">
            <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50">
              <span className="text-[10px] font-extrabold uppercase text-[var(--rego-ink-3,#949494)]">
                Volume d&apos;Affaires Cumulé
              </span>
              <div className="mt-1">
                <ReGoAmtBox amount={toNumber(selectedAccount.captured_revenue)} size="lg" />
              </div>
              <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-1">
                {toNumber(selectedAccount.store_count)} boutique(s) enregistrée(s) · {toNumber(selectedAccount.product_count)} article(s) en catalogue
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[var(--rego-fg,#111111)]">Informations d&apos;Accès</h4>
              <div className="space-y-1.5 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-ink-2,#737373)]">
                <p><strong className="text-[var(--rego-fg,#111111)]">Email :</strong> {selectedAccount.email}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Téléphone :</strong> {selectedAccount.phone || 'Non renseigné'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Authentification 2FA :</strong> {selectedAccount.two_factor_enabled ? 'Active' : 'Désactivée'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Dernière connexion :</strong> {selectedAccount.last_login_at ? new Date(selectedAccount.last_login_at).toLocaleString('fr-TN') : 'Jamais'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Date d&apos;inscription :</strong> {selectedAccount.created_at ? new Date(selectedAccount.created_at).toLocaleDateString('fr-TN') : '—'}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--rego-border,#dedede)]">
              <Link
                href={`/stores?owner_id=${selectedAccount.id}`}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-white text-xs font-bold hover:bg-[var(--rego-accent,#ad0505)] transition-colors"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Voir les Boutiques de ce Vendeur</span>
              </Link>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
