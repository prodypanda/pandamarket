'use client';

import React, { useState, useMemo } from 'react';
import {
  ReceiptText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Upload,
  Printer,
  X,
  CreditCard,
  Crown,
  FileText,
  Building,
  RefreshCw,
  Eye,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export interface UserStore {
  id: string;
  name: string;
  subdomain?: string | null;
}

export interface SubscriptionOrder {
  id: string;
  store_id: string;
  user_id: string;
  from_plan: string;
  target_plan: string;
  amount: number | string;
  currency: string;
  gateway: string;
  gateway_reference?: string | null;
  checkout_url?: string | null;
  status: 'pending' | 'pending_proof' | 'pending_review' | 'captured' | 'paid' | 'failed' | 'cancelled' | 'rejected';
  proof_url?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  store_name?: string | null;
  store_subdomain?: string | null;
}

export interface SummaryStats {
  total_spent_tnd: number;
  paid_count: number;
  pending_count: number;
}

export interface SellerReGoSubscriptionOrdersProps {
  orders: SubscriptionOrder[];
  userStores: UserStore[];
  summary: SummaryStats;
  loading: boolean;
  searchQuery: string;
  statusFilter: string;
  storeFilter: string;
  page: number;
  totalPages: number;
  totalRecords: number;
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: string) => void;
  onStoreFilterChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onRefresh: () => void;
  onOpenUploadModal: (order: SubscriptionOrder) => void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoSubscriptionOrders({
  orders,
  userStores,
  summary,
  loading: _loading,
  searchQuery,
  statusFilter,
  storeFilter,
  page,
  totalPages,
  totalRecords,
  onSearchChange,
  onStatusFilterChange,
  onStoreFilterChange,
  onPageChange,
  onRefresh,
  onOpenUploadModal,
  dir: _dir = 'ltr',
}: SellerReGoSubscriptionOrdersProps) {
  const { t: _t, locale } = useLocale();
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionOrder | null>(null);

  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  const formatGatewayName = (gw: string) => {
    switch (gw) {
      case 'flouci': return 'Portefeuille Flouci';
      case 'konnect': return 'Carte Bancaire (Konnect)';
      case 'manual_mandat': return 'Mandat Minute La Poste';
      case 'paypal': return 'PayPal Int.';
      case 'cod': return 'Paiement Espèces';
      default: return gw;
    }
  };

  const getChipStatus = (status: SubscriptionOrder['status']): 'ok' | 'warn' | 'err' | 'neutral' => {
    if (status === 'paid' || status === 'captured') return 'ok';
    if (status === 'pending_review' || status === 'pending_proof' || status === 'pending') return 'warn';
    if (status === 'failed' || status === 'rejected') return 'err';
    return 'neutral';
  };

  const getStatusLabel = (status: SubscriptionOrder['status']): string => {
    switch (status) {
      case 'paid':
      case 'captured':
        return 'Payée / Validée';
      case 'pending_review':
        return 'Contrôle Reçu en cours';
      case 'pending_proof':
        return 'En attente de reçu';
      case 'pending':
        return 'En attente';
      case 'rejected':
        return 'Rejetée';
      case 'failed':
        return 'Échouée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        o.id.toLowerCase().includes(q) ||
        (o.gateway_reference || '').toLowerCase().includes(q) ||
        (o.target_plan || '').toLowerCase().includes(q) ||
        (o.store_name || '').toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'paid' && (o.status === 'paid' || o.status === 'captured')) ||
        (statusFilter === 'pending' && (o.status === 'pending' || o.status === 'pending_proof' || o.status === 'pending_review')) ||
        (statusFilter === 'rejected' && (o.status === 'rejected' || o.status === 'failed' || o.status === 'cancelled'));

      const matchesStore = storeFilter === 'all' || o.store_id === storeFilter;

      return matchesSearch && matchesStatus && matchesStore;
    });
  }, [orders, searchQuery, statusFilter, storeFilter]);

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Finance', href: '/hub/dashboard/financial' },
        { label: 'Factures d\'Abonnement', href: '/hub/dashboard/my-subscription-orders' },
      ]}
      headerTitle="Historique de Facturation & Preuves de Mandat"
      headerSubtitle="Téléchargez vos factures d'abonnement PandaMarket et soumettez vos preuves de versement postal pour validation rapide."
      headerIcon={ReceiptText}
      statusBadge={
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>Factures Fiscales Récentes ({totalRecords})</span>
        </div>
      }
      primaryAction={
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualiser</span>
        </button>
      }
      secondaryAction={
        <a
          href="/hub/dashboard/subscription"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs"
        >
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span>Gérer le Forfait</span>
        </a>
      }
      kpiStrip={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReGoKpiHero
            label="Total Dépensé SaaS"
            value={<ReGoAmtBox amount={summary.total_spent_tnd} size="sm" />}
            hint="Investissement plateforme"
            icon={ReceiptText}
            accent={true}
          />
          <ReGoKpiHero
            label="Factures Réglées"
            value={String(summary.paid_count)}
            hint="Quittances validées"
            icon={CheckCircle2}
          />
          <ReGoKpiHero
            label="En Attente de Contrôle"
            value={String(summary.pending_count)}
            hint="Vérification mandat / virement"
            icon={Clock}
          />
          <ReGoKpiHero
            label="TVA Applicable"
            value="19.0%"
            hint="Régime fiscal tunisien"
            icon={Building}
          />
        </div>
      }
      filterToolbar={
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher par référence, formule..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="paid">Payée / Validée</option>
              <option value="pending">En attente / En contrôle</option>
              <option value="rejected">Rejetée / Annulée</option>
            </select>

            {userStores.length > 1 && (
              <select
                value={storeFilter}
                onChange={(e) => onStoreFilterChange(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none"
              >
                <option value="all">Toutes les boutiques</option>
                {userStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      }
      mainContent={
        <ReGoCard
          title="Historique des Factures d'Abonnement"
          subtitle="Consultez et téléchargez vos reçus fiscaux officiels délivrés par PandaMarket"
          icon={FileText}
        >
          <div className="space-y-4 pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Réf. Commande</th>
                    <th className="py-2.5 px-3">Formule Souscrite</th>
                    <th className="py-2.5 px-3">Montant TTC</th>
                    <th className="py-2.5 px-3">Mode de Règlement</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => {
                      const amountNum = Number(order.amount) || 0;
                      return (
                        <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              {order.id.slice(0, 8).toUpperCase()}
                            </div>
                            {order.store_name && (
                              <div className="text-[10px] text-slate-400">{order.store_name}</div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 capitalize">
                              Plan {order.target_plan}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <ReGoAmtBox amount={amountNum} size="sm" />
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-slate-600 dark:text-slate-400">
                              {formatGatewayName(order.gateway)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {new Date(order.created_at).toLocaleDateString(dateLocale, {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-3">
                            <ReGoStatusChip
                              label={getStatusLabel(order.status)}
                              status={getChipStatus(order.status)}
                            />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {order.gateway === 'manual_mandat' && (order.status === 'pending' || order.status === 'pending_proof') && (
                                <button
                                  type="button"
                                  onClick={() => onOpenUploadModal(order)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 flex items-center gap-1"
                                >
                                  <Upload className="w-3 h-3" />
                                  <span>Envoyer reçu</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice(order)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Voir la facture"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        Aucune facture d'abonnement trouvée pour les critères sélectionnés.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500">
                <span>Page {page} sur {totalPages}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </ReGoCard>
      }
      drawer={
        <ReGoDrawer
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title="Facture Fiscale d'Abonnement"
          subtitle={selectedInvoice ? `Réf: INV-${selectedInvoice.id.slice(0, 8).toUpperCase()}` : ''}
        >
          {selectedInvoice && (
            <div className="space-y-4 text-xs font-medium text-slate-700 dark:text-slate-300">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Formule :</span>
                  <span className="font-bold capitalize text-slate-900 dark:text-white">Plan {selectedInvoice.target_plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Montant Net TTC :</span>
                  <ReGoAmtBox amount={Number(selectedInvoice.amount) || 0} size="sm" />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TVA (19%) incluse :</span>
                  <span>{((Number(selectedInvoice.amount) || 0) * 0.19 / 1.19).toFixed(3)} TND</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mode de Règlement :</span>
                  <span className="font-bold">{formatGatewayName(selectedInvoice.gateway)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Statut :</span>
                  <ReGoStatusChip label={getStatusLabel(selectedInvoice.status)} status={getChipStatus(selectedInvoice.status)} />
                </div>
              </div>

              {selectedInvoice.proof_url && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white block">Preuve de mandat postal :</span>
                  <div className="aspect-video w-full rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedInvoice.proof_url}
                      alt="Reçu Postal"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-black text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer la Facture Fiscale</span>
                </button>
              </div>
            </div>
          )}
        </ReGoDrawer>
      }
    />
  );
}
