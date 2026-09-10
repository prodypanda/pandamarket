'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  UserRound,
  ShieldCheck,
  ShoppingBag,
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
  DollarSign,
  Heart,
  Star,
  MapPin,
  Clock,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface BuyerAccount {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email_verified?: boolean | null;
  is_active?: boolean | null;
  two_factor_enabled?: boolean | null;
  last_login_at?: string | null;
  created_at?: string | null;
  order_count?: string | number | null;
  open_order_count?: string | number | null;
  captured_order_count?: string | number | null;
  total_spent?: string | number | null;
  last_order_at?: string | null;
  wishlist_count?: string | number | null;
  review_count?: string | number | null;
  address_count?: string | number | null;
  open_report_count?: string | number | null;
}

export interface BuyerSummary {
  total: number;
  active: number;
  inactive: number;
  email_verified: number;
  with_orders: number;
  total_orders: number;
}

export interface AdminReGoBuyersProps {
  buyers: BuyerAccount[];
  summary: BuyerSummary;
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  search: string;
  onSearchChange: (search: string) => void;
  withOrdersOnly: boolean;
  onWithOrdersOnlyChange: (enabled: boolean) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onToggleActive: (buyerId: string, currentlyActive: boolean) => Promise<void>;
  onSendPasswordReset: (buyerId: string, email: string) => Promise<void>;
  activeAction?: string | null;
  error?: string;
  success?: string;
}

function toNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function AdminReGoBuyers({
  buyers,
  summary,
  loading,
  page,
  totalPages,
  total,
  search,
  onSearchChange,
  withOrdersOnly,
  onWithOrdersOnlyChange,
  onPageChange,
  onRefresh,
  onToggleActive,
  onSendPasswordReset,
  activeAction,
  error,
  success,
}: AdminReGoBuyersProps) {
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerAccount | null>(null);

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]">
            <UserRound className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[var(--rego-fg,#111111)]">
                Annuaire Central des Acheteurs Marketplace
              </h1>
              <ReGoStatusChip
                status="neutral"
                label={`${summary.total} acheteurs`}
                size="xs"
              />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Gestion de la clientèle ReGo · Suivi des volumes d&apos;achats, fidélité et statuts de sécurité
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
            href="/users"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all"
          >
            <span>Comptes Vendeurs</span>
          </Link>
          <Link
            href="/stores"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs transition-all"
          >
            <span>Annuaire Boutiques</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-[var(--rego-r,8px)] border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
          {success}
        </div>
      )}

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ReGoKpiHero
          label="Total Acheteurs"
          value={loading ? '—' : summary.total}
          hint="Clients enregistrés sur PandaMarket"
        />
        <ReGoKpiHero
          label="Comptes Actifs"
          value={loading ? '—' : summary.active}
          hint="Comptes sans restriction"
        />
        <ReGoKpiHero
          label="Emails Vérifiés"
          value={loading ? '—' : summary.email_verified}
          hint="Adresses de contact authentifiées"
        />
        <ReGoKpiHero
          label="Clients Avec Achats"
          value={loading ? '—' : summary.with_orders}
          hint={`${summary.total_orders} commandes passées au total`}
        />
      </div>

      {/* Main Table Card */}
      <ReGoCard
        title="Liste des Comptes Acheteurs"
        subtitle="Consultez les profils clients, historiques d'achat et activez/désactivez les comptes"
        icon={UserRound}
        actions={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <button
              type="button"
              onClick={() => onWithOrdersOnlyChange(!withOrdersOnly)}
              className={`px-3 py-1 text-xs font-bold rounded-[var(--rego-r,8px)] border transition-all cursor-pointer ${
                withOrdersOnly
                  ? 'bg-[var(--rego-fg,#111111)] text-white border-[var(--rego-fg,#111111)]'
                  : 'border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)]'
              }`}
            >
              Avec Achats Uniquement
            </button>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
              <input
                type="text"
                placeholder="Rechercher email, nom, tél..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full ps-8 pe-3 py-1 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-hidden focus:border-[var(--rego-accent,#ad0505)] font-medium"
              />
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--rego-accent,#ad0505)]" />
          </div>
        ) : buyers.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <UserRound className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-[var(--rego-fg,#111111)]">
              Aucun acheteur trouvé
            </p>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto">
              Modifiez votre recherche ou désactivez le filtre d&apos;achats.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs text-[var(--rego-fg,#111111)]">
                <thead className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
                  <tr>
                    <th className="px-3 py-2.5">Acheteur / Contact</th>
                    <th className="px-3 py-2.5">Téléphone</th>
                    <th className="px-3 py-2.5">Commandes</th>
                    <th className="px-3 py-2.5">Dépenses Totales</th>
                    <th className="px-3 py-2.5">Dernier Achat</th>
                    <th className="px-3 py-2.5">Statut Compte</th>
                    <th className="px-3 py-2.5 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                  {buyers.map((buyer) => {
                    const fullName = [buyer.first_name, buyer.last_name].filter(Boolean).join(' ');
                    const isActing = activeAction === buyer.id;

                    return (
                      <tr
                        key={buyer.id}
                        className="hover:bg-[var(--rego-surface,#f5f5f5)]/50 transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                            {fullName || 'Client sans nom'}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-[var(--rego-ink-2,#737373)]">
                            <span>{buyer.email}</span>
                            {buyer.email_verified && (
                              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--rego-fg,#111111)]">
                          {buyer.phone || '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                            {toNumber(buyer.order_count)} commande{toNumber(buyer.order_count) > 1 ? 's' : ''}
                          </span>
                          {toNumber(buyer.open_order_count) > 0 && (
                            <span className="text-[10px] text-amber-600 font-semibold block">
                              {toNumber(buyer.open_order_count)} en cours
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <ReGoAmtBox amount={toNumber(buyer.total_spent)} size="sm" />
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-[var(--rego-ink-2,#737373)]">
                          {buyer.last_order_at
                            ? new Date(buyer.last_order_at).toLocaleDateString('fr-TN', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : 'Aucun achat'}
                        </td>
                        <td className="px-3 py-2.5">
                          <ReGoStatusChip
                            status={buyer.is_active ? 'ok' : 'err'}
                            label={buyer.is_active ? 'Actif' : 'Désactivé'}
                            size="xs"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-end">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedBuyer(buyer)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspecter</span>
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(isActing)}
                              onClick={() => buyer.email && void onSendPasswordReset(buyer.id, buyer.email)}
                              title="Envoyer lien de réinitialisation de mot de passe"
                              className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(isActing)}
                              onClick={() => void onToggleActive(buyer.id, Boolean(buyer.is_active))}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                buyer.is_active
                                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                              }`}
                            >
                              {buyer.is_active ? 'Désactiver' : 'Activer'}
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
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 font-bold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>

              <span className="font-medium">
                Page <strong className="text-[var(--rego-fg,#111111)]">{page}</strong> sur {totalPages || 1} ({total} acheteurs)
              </span>

              <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 font-bold cursor-pointer"
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
        isOpen={Boolean(selectedBuyer)}
        onClose={() => setSelectedBuyer(null)}
        title={selectedBuyer ? ([selectedBuyer.first_name, selectedBuyer.last_name].filter(Boolean).join(' ') || selectedBuyer.email || 'Client') : 'Fiche Acheteur'}
        subtitle={`ID: ${selectedBuyer?.id}`}
        footer={
          <button
            type="button"
            onClick={() => setSelectedBuyer(null)}
            className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer"
          >
            Fermer
          </button>
        }
      >
        {selectedBuyer && (
          <div className="space-y-4">
            <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50">
              <span className="text-[10px] font-extrabold uppercase text-[var(--rego-ink-3,#949494)]">
                Dépenses Cumulées
              </span>
              <div className="mt-1">
                <ReGoAmtBox amount={toNumber(selectedBuyer.total_spent)} size="lg" />
              </div>
              <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-1">
                {toNumber(selectedBuyer.order_count)} commande(s) validée(s)
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[var(--rego-fg,#111111)]">Coordonnées</h4>
              <div className="space-y-1.5 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-ink-2,#737373)]">
                <p><strong className="text-[var(--rego-fg,#111111)]">Email :</strong> {selectedBuyer.email}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Téléphone :</strong> {selectedBuyer.phone || 'Non renseigné'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Email vérifié :</strong> {selectedBuyer.email_verified ? 'Oui' : 'Non'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Date d&apos;inscription :</strong> {selectedBuyer.created_at ? new Date(selectedBuyer.created_at).toLocaleDateString('fr-TN') : '—'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Articles en favoris :</strong> {toNumber(selectedBuyer.wishlist_count)}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Avis déposés :</strong> {toNumber(selectedBuyer.review_count)}</p>
              </div>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
