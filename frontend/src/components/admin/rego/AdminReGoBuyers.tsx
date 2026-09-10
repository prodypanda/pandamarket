'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  UserRound,
  Users,
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
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  Heart,
  Star,
  MapPin,
  WalletCards,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AdminUserSecurityActivityPanel } from '@/components/admin/AdminUserSecurityActivityPanel';

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
  chat_count?: string | number | null;
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
  status: string;
  onStatusChange: (status: string) => void;
  emailVerified: string;
  onEmailVerifiedChange: (value: string) => void;
  withOrdersOnly: boolean;
  onWithOrdersOnlyChange: (enabled: boolean) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onToggleActive: (buyerId: string, currentlyActive: boolean) => Promise<void>;
  onSendPasswordReset: (buyerId: string, email: string) => Promise<void>;
  onResetTwoFactor: (buyerId: string) => Promise<void>;
  onStartChat: (buyer: BuyerAccount) => Promise<void>;
  onUpdateEmailVerification: (buyer: BuyerAccount, nextValue: boolean) => Promise<void>;
  activeAction?: string | null;
  error?: string;
  success?: string;
}

function toNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildPageItems(currentPage: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const visible = new Set([1, 2, totalPages - 1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const items: Array<number | 'gap'> = [];
  let lastPushed = 0;
  for (let candidate = 1; candidate <= totalPages; candidate += 1) {
    if (!visible.has(candidate)) continue;
    if (lastPushed > 0 && candidate - lastPushed > 1) items.push('gap');
    items.push(candidate);
    lastPushed = candidate;
  }
  return items;
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
  status,
  onStatusChange,
  emailVerified,
  onEmailVerifiedChange,
  withOrdersOnly,
  onWithOrdersOnlyChange,
  onClearFilters,
  onPageChange,
  onRefresh,
  onToggleActive,
  onSendPasswordReset,
  onResetTwoFactor,
  onStartChat,
  onUpdateEmailVerification,
  activeAction,
  error,
  success,
}: AdminReGoBuyersProps) {
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerAccount | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<BuyerAccount | null>(null);
  const [confirmReset2fa, setConfirmReset2fa] = useState<BuyerAccount | null>(null);

  const isBuyerActing = (buyerId: string) =>
    Boolean(activeAction && activeAction.startsWith(`buyer-${buyerId}-`));

  const getBuyerName = (buyer: BuyerAccount) =>
    [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') || buyer.email || 'Client sans nom';

  const handleSuspendConfirmed = async () => {
    if (!confirmSuspend) return;
    await onToggleActive(confirmSuspend.id, true);
    setConfirmSuspend(null);
    setSelectedBuyer(null);
  };

  const handleReset2faConfirmed = async () => {
    if (!confirmReset2fa) return;
    await onResetTwoFactor(confirmReset2fa.id);
    setConfirmReset2fa(null);
    setSelectedBuyer(null);
  };

  const pageItems = buildPageItems(page, totalPages || 1);

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
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <ReGoKpiHero
          label="Total Acheteurs"
          value={loading ? '—' : summary.total}
          hint="Clients enregistrés sur PandaMarket"
          icon={Users}
        />
        <ReGoKpiHero
          label="Comptes Actifs"
          value={loading ? '—' : summary.active}
          hint="Comptes sans restriction"
          icon={ShieldCheck}
        />
        <ReGoKpiHero
          label="Comptes Inactifs"
          value={loading ? '—' : summary.inactive}
          hint="Comptes suspendus ou désactivés"
          icon={Ban}
        />
        <ReGoKpiHero
          label="Emails Vérifiés"
          value={loading ? '—' : summary.email_verified}
          hint="Adresses de contact authentifiées"
          icon={CheckCircle2}
        />
        <ReGoKpiHero
          label="Clients Avec Achats"
          value={loading ? '—' : summary.with_orders}
          hint="Acheteurs ayant commandé"
          icon={ShoppingBag}
        />
        <ReGoKpiHero
          label="Total Commandes"
          value={loading ? '—' : summary.total_orders}
          hint="Commandes passées sur la marketplace"
          icon={WalletCards}
        />
      </div>

      {/* Main Table Card */}
      <ReGoCard
        title="Liste des Comptes Acheteurs"
        subtitle="Consultez les profils clients, historiques d'achat et pilotez les statuts des comptes"
        icon={UserRound}
        badge={
          <ReGoStatusChip
            status="neutral"
            label={`${total} résultat${total > 1 ? 's' : ''}`}
            size="xs"
          />
        }
      >
        <div className="space-y-4">
          {/* Filters & Search toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
              <input
                type="text"
                placeholder="Rechercher nom, email, tél..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full ps-8 pe-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-hidden focus:border-[var(--rego-accent,#ad0505)] font-medium"
              />
            </div>

            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filtrer par statut de compte"
              className="px-2.5 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-hidden focus:border-[var(--rego-accent,#ad0505)] font-bold cursor-pointer"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>

            <select
              value={emailVerified}
              onChange={(e) => onEmailVerifiedChange(e.target.value)}
              aria-label="Filtrer par vérification email"
              className="px-2.5 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-hidden focus:border-[var(--rego-accent,#ad0505)] font-bold cursor-pointer"
            >
              <option value="">Tous les emails</option>
              <option value="true">Vérifiés</option>
              <option value="false">Non vérifiés</option>
            </select>

            <button
              type="button"
              onClick={() => onWithOrdersOnlyChange(!withOrdersOnly)}
              className={`px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border transition-all cursor-pointer ${
                withOrdersOnly
                  ? 'bg-[var(--rego-fg,#111111)] text-white border-[var(--rego-fg,#111111)]'
                  : 'border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)]'
              }`}
            >
              Avec Achats Uniquement
            </button>

            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser les filtres</span>
            </button>
          </div>

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
                Modifiez votre recherche ou réinitialisez les filtres.
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
                      <th className="px-3 py-2.5">Activité</th>
                      <th className="px-3 py-2.5">Statut Compte</th>
                      <th className="px-3 py-2.5 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                    {buyers.map((buyer) => {
                      const isActing = isBuyerActing(buyer.id);

                      return (
                        <tr
                          key={buyer.id}
                          className="hover:bg-[var(--rego-surface,#f5f5f5)]/50 transition-colors"
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                              {[buyer.first_name, buyer.last_name].filter(Boolean).join(' ') || 'Client sans nom'}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-[var(--rego-ink-2,#737373)]">
                              <span>{buyer.email}</span>
                              {buyer.email_verified && (
                                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              )}
                            </div>
                            <div className="mt-0.5">
                              {buyer.two_factor_enabled ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold">
                                  2FA Actif
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Sans 2FA</span>
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
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-fg,#111111)]">
                              <MessageSquare className="w-3 h-3 text-[var(--rego-ink-3,#949494)]" />
                              {toNumber(buyer.chat_count)} discussion{toNumber(buyer.chat_count) > 1 ? 's' : ''}
                            </span>
                            {toNumber(buyer.open_report_count) > 0 ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="w-3 h-3" />
                                {toNumber(buyer.open_report_count)} signalement{toNumber(buyer.open_report_count) > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="block text-[10px] text-[var(--rego-ink-3,#949494)]">Aucun signalement</span>
                            )}
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
                                disabled={isActing}
                                onClick={() => void onStartChat(buyer)}
                                title="Démarrer / ouvrir une discussion support"
                                className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => void onUpdateEmailVerification(buyer, !buyer.email_verified)}
                                title={buyer.email_verified ? "Marquer l'email comme non vérifié" : "Marquer l'email comme vérifié"}
                                className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                disabled={isActing || !buyer.email}
                                onClick={() => buyer.email && void onSendPasswordReset(buyer.id, buyer.email)}
                                title="Envoyer lien de réinitialisation de mot de passe"
                                className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => {
                                  if (buyer.is_active === false) {
                                    void onToggleActive(buyer.id, false);
                                  } else {
                                    setConfirmSuspend(buyer);
                                  }
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50 ${
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-[var(--rego-border,#dedede)] text-xs text-[var(--rego-ink-2,#737373)]">
                <span className="font-medium text-center sm:text-start">
                  Page <strong className="text-[var(--rego-fg,#111111)]">{page}</strong> sur {totalPages || 1} · {total} acheteur{total > 1 ? 's' : ''}
                </span>
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 font-bold cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Précédent</span>
                  </button>

                  {pageItems.map((item, index) =>
                    item === 'gap' ? (
                      <span key={`gap-${index}`} className="px-1 font-bold text-[var(--rego-ink-3,#949494)]">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => onPageChange(item)}
                        disabled={item === page}
                        className={`min-w-[26px] h-[26px] px-1 rounded-[var(--rego-r,8px)] border text-[11px] font-bold transition-colors ${
                          item === page
                            ? 'bg-[var(--rego-accent,#ad0505)] border-[var(--rego-accent,#ad0505)] text-white cursor-default'
                            : 'border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40 font-bold cursor-pointer"
                  >
                    <span>Suivant</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ReGoCard>

      {/* Detail Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(selectedBuyer)}
        onClose={() => setSelectedBuyer(null)}
        title={selectedBuyer ? getBuyerName(selectedBuyer) : 'Fiche Acheteur'}
        subtitle={selectedBuyer ? `ID: ${selectedBuyer.id}` : undefined}
        footer={
          selectedBuyer ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void onUpdateEmailVerification(selectedBuyer, !selectedBuyer.email_verified)}
                disabled={isBuyerActing(selectedBuyer.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{selectedBuyer.email_verified ? 'Marquer non vérifié' : 'Marquer vérifié'}</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset2fa(selectedBuyer)}
                disabled={!selectedBuyer.two_factor_enabled || isBuyerActing(selectedBuyer.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Réinitialiser le 2FA</span>
              </button>
              {selectedBuyer.is_active === false ? (
                <button
                  type="button"
                  onClick={() => void onToggleActive(selectedBuyer.id, false)}
                  disabled={isBuyerActing(selectedBuyer.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réactiver le compte</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmSuspend(selectedBuyer)}
                  disabled={isBuyerActing(selectedBuyer.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Suspendre le compte</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedBuyer(null)}
                className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer"
              >
                Fermer
              </button>
            </div>
          ) : null
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
                {toNumber(selectedBuyer.order_count)} commande(s) au total · {toNumber(selectedBuyer.captured_order_count)} capturée(s) · {toNumber(selectedBuyer.open_order_count)} en cours
              </p>
            </div>

            <button
              type="button"
              onClick={() => void onStartChat(selectedBuyer)}
              disabled={isBuyerActing(selectedBuyer.id)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-white text-xs font-bold hover:bg-[var(--rego-accent,#ad0505)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Démarrer / ouvrir une discussion support</span>
            </button>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[var(--rego-fg,#111111)]">Coordonnées & Sécurité</h4>
              <div className="space-y-1.5 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-ink-2,#737373)]">
                <p><strong className="text-[var(--rego-fg,#111111)]">Email :</strong> {selectedBuyer.email}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Téléphone :</strong> {selectedBuyer.phone || 'Non renseigné'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Email vérifié :</strong> {selectedBuyer.email_verified ? 'Oui' : 'Non'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Authentification 2FA :</strong> {selectedBuyer.two_factor_enabled ? 'Active' : 'Désactivée'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Dernière connexion :</strong> {selectedBuyer.last_login_at ? new Date(selectedBuyer.last_login_at).toLocaleString('fr-TN') : 'Jamais'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Dernier achat :</strong> {selectedBuyer.last_order_at ? new Date(selectedBuyer.last_order_at).toLocaleDateString('fr-TN') : 'Aucun'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Date d&apos;inscription :</strong> {selectedBuyer.created_at ? new Date(selectedBuyer.created_at).toLocaleDateString('fr-TN') : '—'}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[var(--rego-fg,#111111)]">Engagement & Livraison</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900">
                  <Heart className="w-4 h-4 text-[var(--rego-ink-3,#949494)]" />
                  <p className="mt-1.5 text-sm font-black text-[var(--rego-fg,#111111)]">{toNumber(selectedBuyer.wishlist_count)}</p>
                  <p className="text-[10px] font-bold uppercase text-[var(--rego-ink-3,#949494)]">Favoris</p>
                </div>
                <div className="p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900">
                  <Star className="w-4 h-4 text-[var(--rego-ink-3,#949494)]" />
                  <p className="mt-1.5 text-sm font-black text-[var(--rego-fg,#111111)]">{toNumber(selectedBuyer.review_count)}</p>
                  <p className="text-[10px] font-bold uppercase text-[var(--rego-ink-3,#949494)]">Avis déposés</p>
                </div>
                <div className="p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900">
                  <MapPin className="w-4 h-4 text-[var(--rego-ink-3,#949494)]" />
                  <p className="mt-1.5 text-sm font-black text-[var(--rego-fg,#111111)]">{toNumber(selectedBuyer.address_count)}</p>
                  <p className="text-[10px] font-bold uppercase text-[var(--rego-ink-3,#949494)]">Adresses</p>
                </div>
                <div className="p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900">
                  <AlertTriangle className={`w-4 h-4 ${toNumber(selectedBuyer.open_report_count) > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-[var(--rego-ink-3,#949494)]'}`} />
                  <p className="mt-1.5 text-sm font-black text-[var(--rego-fg,#111111)]">{toNumber(selectedBuyer.open_report_count)}</p>
                  <p className="text-[10px] font-bold uppercase text-[var(--rego-ink-3,#949494)]">Signalements</p>
                </div>
              </div>
            </div>

            <AdminUserSecurityActivityPanel userId={selectedBuyer.id} accentClass="bg-[var(--rego-accent,#ad0505)]" />
          </div>
        )}
      </ReGoDrawer>

      <ConfirmDialog
        isOpen={Boolean(confirmSuspend)}
        onClose={() => setConfirmSuspend(null)}
        onConfirm={handleSuspendConfirmed}
        title="Suspendre le compte acheteur"
        description={
          <>
            Voulez-vous vraiment suspendre le compte de{' '}
            <strong>{confirmSuspend ? getBuyerName(confirmSuspend) : ''}</strong> ? Son accès à la
            plateforme sera bloqué jusqu&apos;à sa réactivation.
          </>
        }
        confirmLabel="Suspendre le compte"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={Boolean(confirmReset2fa)}
        onClose={() => setConfirmReset2fa(null)}
        onConfirm={handleReset2faConfirmed}
        title="Réinitialiser le 2FA du compte"
        description={
          <>
            La double authentification de{' '}
            <strong>{confirmReset2fa ? getBuyerName(confirmReset2fa) : ''}</strong> sera désactivée.
            L&apos;utilisateur devra la reconfigurer à sa prochaine connexion.
          </>
        }
        confirmLabel="Réinitialiser le 2FA"
        variant="warning"
      />
    </div>
  );
}
