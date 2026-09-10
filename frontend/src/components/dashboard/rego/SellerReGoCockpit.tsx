'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Phone,
  ShieldCheck,
  Truck,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Eye,
  CheckCircle2,
  Filter,
  Check,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import { useLocale } from '@/contexts/LocaleContext';
import { getResizedImageUrl } from '@/lib/image-url';

interface WalletData {
  balance?: number | string | null;
  pending_balance?: number | string | null;
  total_earned?: number | string | null;
}

interface StoreInfo {
  id?: string;
  name?: string;
  subdomain?: string | null;
  custom_domain?: string | null;
  status?: string | null;
  is_verified?: boolean | null;
  theme_id?: string | null;
  payment_config?: unknown;
  settings?: {
    logo_url?: string | null;
    logo_light_url?: string | null;
    logo_dark_url?: string | null;
    store_description?: string | null;
  } | null;
}

interface Order {
  id: string;
  total_amount?: number | string | null;
  total?: number | string | null;
  status: string;
  created_at: string;
  customer_email?: string;
}

interface DailySales {
  date: string;
  total: number;
  count: number;
}

export interface SellerReGoCockpitProps {
  store: StoreInfo | null;
  wallet: WalletData | null;
  productCount: number;
  orderCount: number;
  recentOrders: Order[];
  allOrders: Order[];
  salesData: DailySales[];
  totalRevenue30d: number;
  totalOrders30d: number;
  maxSales: number;
  verificationStatus?: string | null;
  setupPercent: number;
  loading: boolean;
  storefrontHref: string;
}

function toNumber(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatPrice(price: unknown): string {
  return `${toNumber(price).toFixed(3)} TND`;
}

function getOrderTotal(order: Order): number {
  return toNumber(order.total_amount ?? order.total);
}

const ORDER_STATUS_CLASSES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800',
  processing: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800',
  payment_required: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800',
  fulfilled: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800',
  delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
  refunded: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800',
};

export function SellerReGoCockpit({
  store,
  wallet,
  productCount,
  orderCount,
  recentOrders,
  allOrders,
  salesData,
  totalRevenue30d,
  totalOrders30d,
  verificationStatus,
  setupPercent,
  loading,
  storefrontHref,
}: SellerReGoCockpitProps) {
  const { t, locale } = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Derive real pending/actionable orders
  const urgentOrders = useMemo(() => {
    const source = (allOrders && allOrders.length > 0) ? allOrders : (recentOrders || []);
    return source.filter((o) => o.status === 'pending' || o.status === 'processing').slice(0, 5);
  }, [allOrders, recentOrders]);

  // Derive active transit counts
  const inTransitCount = useMemo(() => {
    const source = (allOrders && allOrders.length > 0) ? allOrders : (recentOrders || []);
    return source.filter((o) => o.status === 'fulfilled' || o.status === 'processing').length;
  }, [allOrders, recentOrders]);

  // Average order value
  const averageOrderValue = useMemo(() => {
    if (totalOrders30d > 0) return totalRevenue30d / totalOrders30d;
    if (orderCount > 0 && wallet?.total_earned) return toNumber(wallet.total_earned) / orderCount;
    return 0;
  }, [totalRevenue30d, totalOrders30d, orderCount, wallet]);

  const storeName = store?.name || t('dashboardPages.overview.yourStore') || 'Ma Boutique';

  const orderStatusLabel = (status: string): string => {
    const map: Record<string, string> = {
      pending: t('dashboardPages.overview.orderStatusPending') || 'En attente',
      processing: t('dashboardPages.overview.orderStatusProcessing') || 'En traitement',
      payment_required: t('dashboardPages.overview.orderStatusPaymentRequired') || 'Paiement requis',
      fulfilled: t('dashboardPages.overview.orderStatusFulfilled') || 'Expédiée',
      delivered: t('dashboardPages.overview.orderStatusDelivered') || 'Livrée',
      cancelled: t('dashboardPages.overview.orderStatusCancelled') || 'Annulée',
      refunded: t('dashboardPages.overview.orderStatusRefunded') || 'Remboursée',
    };
    return map[status] ?? status;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Store Status & Cockpit Pulse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          {store?.settings?.logo_url ? (
            <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 p-0.5">
              <img
                src={getResizedImageUrl(store.settings.logo_url, 'thumbnail')}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]">
              <Sparkles className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-[var(--rego-fg,#111111)]">{storeName}</h2>
              {store?.is_verified ? (
                <ReGoStatusChip status="ok" label="Vérifiée" size="xs" />
              ) : store?.status === 'maintenance' ? (
                <ReGoStatusChip status="warn" label="Maintenance" size="xs" />
              ) : (
                <ReGoStatusChip status="neutral" label="Boutique Active" size="xs" />
              )}
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Cockpit ReGo · Synchronisation temps réel des expéditions et du Cash on Delivery
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {storefrontHref && (
            <a
              href={storefrontHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
              <span>Voir Vitrine</span>
            </a>
          )}
          <Link
            href="/hub/dashboard/orders"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
            <span>Commandes ({orderCount})</span>
          </Link>
          <Link
            href="/hub/dashboard/products/create"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs transition-all"
          >
            <span>+ Ajouter un Produit</span>
          </Link>
        </div>
      </div>

      {/* Layer 4: Telemetry & KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ReGoKpiHero
          label="Chiffre d'Affaires Brut"
          value={<ReGoAmtBox amount={toNumber(wallet?.total_earned)} size="lg" />}
          hint={`30 derniers jours : ${formatPrice(totalRevenue30d)}`}
        />
        <ReGoKpiHero
          label="Commandes Totales"
          value={loading ? '—' : String(orderCount)}
          hint={`30 derniers jours : ${totalOrders30d} commandes`}
        />
        <ReGoKpiHero
          label="Solde Disponible"
          value={<ReGoAmtBox amount={toNumber(wallet?.balance)} size="lg" />}
          hint={`En attente / COD : ${formatPrice(wallet?.pending_balance)}`}
        />
        <ReGoKpiHero
          label="Panier Moyen"
          value={<ReGoAmtBox amount={averageOrderValue} size="lg" />}
          hint="Moyenne par commande enregistrée"
        />
      </div>

      {/* High-Priority Commercial Decks: COD Anti-Refus Deck & 4-Carrier SLAs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Urgent COD Anti-Refus Verification Deck (7 cols) */}
        <div className="lg:col-span-7">
          <ReGoCard
            title="Validation Prioritaire des Commandes"
            subtitle="Validez les commandes Cash on Delivery avant le passage du livreur pour réduire les retours"
            icon={ShieldCheck}
            badge={
              urgentOrders.length > 0 ? (
                <ReGoStatusChip status="warn" label={`${urgentOrders.length} à valider`} size="xs" />
              ) : (
                <ReGoStatusChip status="ok" label="À jour" size="xs" />
              )
            }
            actions={
              <Link href="/hub/dashboard/orders" className="text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline">
                Toutes les commandes
              </Link>
            }
          >
            {urgentOrders.length > 0 ? (
              <div className="space-y-2.5">
                {urgentOrders.map((order) => {
                  const orderAmt = getOrderTotal(order);
                  return (
                    <div
                      key={order.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 hover:bg-[var(--rego-surface,#f5f5f5)]/80 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[var(--rego-fg,#111111)]">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold text-[var(--rego-fg,#111111)] truncate max-w-[180px]">
                            {order.customer_email || 'Client'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--rego-ink-2,#737373)]">
                          <ReGoAmtBox amount={orderAmt} size="sm" />
                          <span>•</span>
                          <span className="text-[10px] text-[var(--rego-ink-3,#949494)]">
                            {new Date(order.created_at).toLocaleDateString(dateLocale, {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ORDER_STATUS_CLASSES[order.status] || ''}`}>
                          {orderStatusLabel(order.status)}
                        </span>

                        <Link
                          href={`/hub/dashboard/orders?id=${order.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] hover:bg-[var(--rego-accent,#ad0505)] px-3 py-1.5 rounded-[var(--rego-r,8px)] transition-all shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Traiter</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                  Toutes les commandes sont vérifiées
                </p>
                <p className="text-[11px] text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto">
                  Aucune commande en attente urgente de validation COD. Les nouvelles commandes apparaîtront ici dès leur enregistrement.
                </p>
              </div>
            )}
          </ReGoCard>
        </div>

        {/* Tunisian 4-Carrier SLA Pipeline (5 cols) */}
        <div className="lg:col-span-5">
          <ReGoCard
            title="Pipeline Transporteurs Tunisiens"
            subtitle="Réseau national d'acheminement et gestion des expéditions"
            icon={Truck}
            actions={
              <Link href="/hub/dashboard/shipping" className="text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]">
                Configurer Tarifs
              </Link>
            }
          >
            <div className="space-y-2.5">
              {[
                { name: 'Aramex Express', detail: '24h à 48h · 24 Gouvernorats', scope: 'National' },
                { name: 'Rapid-Poste (Poste Tunisienne)', detail: '24h à 72h · Réseau National Postal', scope: 'Réseau 24 Gouv' },
                { name: 'Runex Delivery', detail: 'Sfax & Sud Tunisien Express', scope: 'Hub Sud' },
                { name: 'First Delivery', detail: '12h à 24h · Grand Tunis', scope: 'Grand Tunis' },
              ].map((carrier) => (
                <div
                  key={carrier.name}
                  className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-accent,#ad0505)]">
                      <Truck className="w-3 h-3" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">{carrier.name}</span>
                      <p className="text-[10px] text-[var(--rego-ink-2,#737373)]">{carrier.detail}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--rego-ink-3,#949494)]">{carrier.scope}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2.5 border-t border-[var(--rego-border,#dedede)] flex items-center justify-between text-xs text-[var(--rego-ink-2,#737373)]">
              <span>Colis en préparation ou transit :</span>
              <span className="font-bold text-[var(--rego-fg,#111111)] font-mono">{inTransitCount} colis</span>
            </div>
          </ReGoCard>
        </div>
      </div>

      {/* Layer 6: Main Working Area - Recent Orders Stream */}
      <ReGoCard
        title="Dernières Commandes Marchand"
        subtitle="Flux en direct des transactions avec inspection détaillée"
        icon={Package}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/hub/dashboard/orders"
              className="text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline inline-flex items-center gap-1"
            >
              <span>Voir tout le registre ({orderCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        }
      >
        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs text-[var(--rego-fg,#111111)]">
              <thead className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
                <tr>
                  <th className="px-3 py-2.5">Commande</th>
                  <th className="px-3 py-2.5">Client</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Montant</th>
                  <th className="px-3 py-2.5">Statut</th>
                  <th className="px-3 py-2.5 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                {recentOrders.slice(0, 6).map((order) => (
                  <tr key={order.id} className="hover:bg-[var(--rego-surface,#f5f5f5)]/50 transition-colors">
                    <td className="px-3 py-2.5 font-mono font-bold text-[var(--rego-accent,#ad0505)]">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-[var(--rego-fg,#111111)] truncate max-w-[200px]">
                        {order.customer_email || 'Client'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-[var(--rego-ink-3,#949494)]">
                      {new Date(order.created_at).toLocaleDateString(dateLocale, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-3 py-2.5">
                      <ReGoAmtBox amount={getOrderTotal(order)} size="sm" />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${ORDER_STATUS_CLASSES[order.status] || ''}`}>
                        {orderStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-end">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-accent,#ad0505)] p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspecter</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center space-y-3">
            <ShoppingCart className="mx-auto h-8 w-8 text-[var(--rego-ink-3,#949494)]" />
            <p className="text-xs font-bold text-[var(--rego-fg,#111111)]">
              Aucune commande enregistrée pour le moment
            </p>
            <p className="text-[11px] text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto">
              Vos nouvelles commandes s&apos;afficheront ici en direct dès qu&apos;un acheteur effectue un achat sur votre boutique.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <Link
                href="/hub/dashboard/products/create"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white text-xs font-bold hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs"
              >
                + Ajouter un Produit
              </Link>
              {storefrontHref && (
                <a
                  href={storefrontHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)] text-xs font-bold hover:bg-[var(--rego-surface,#f5f5f5)]"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Visiter la Boutique</span>
                </a>
              )}
            </div>
          </div>
        )}
      </ReGoCard>

      {/* Layer 7: Detail Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `#${selectedOrder.id.slice(-6).toUpperCase()}` : 'Détails de la Commande'}
        subtitle={`Client: ${selectedOrder?.customer_email || 'Client'}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)]"
            >
              Fermer
            </button>
            {selectedOrder && (
              <Link
                href={`/hub/dashboard/orders?id=${selectedOrder.id}`}
                className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs"
              >
                Gérer la Commande
              </Link>
            )}
          </>
        }
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] p-3 bg-[var(--rego-surface,#f5f5f5)]/50">
              <span className="text-[10px] font-extrabold uppercase text-[var(--rego-ink-3,#949494)]">Montant Total de la Commande</span>
              <div className="mt-1">
                <ReGoAmtBox amount={getOrderTotal(selectedOrder)} size="lg" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">Informations</h4>
              <div className="text-xs space-y-1.5 text-[var(--rego-ink-2,#737373)]">
                <p><strong className="text-[var(--rego-fg,#111111)]">ID Commande :</strong> {selectedOrder.id}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Client :</strong> {selectedOrder.customer_email || 'Non renseigné'}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Date d&apos;enregistrement :</strong> {new Date(selectedOrder.created_at).toLocaleString(dateLocale)}</p>
                <div className="flex items-center gap-2 pt-1">
                  <strong className="text-[var(--rego-fg,#111111)]">Statut :</strong>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${ORDER_STATUS_CLASSES[selectedOrder.status] || ''}`}>
                    {orderStatusLabel(selectedOrder.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--rego-border,#dedede)]">
              <Link
                href={`/hub/dashboard/orders?id=${selectedOrder.id}`}
                className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white font-bold text-xs hover:bg-[var(--rego-accent-deep,#8f0404)] transition-colors shadow-xs"
              >
                <span>Accéder à la Fiche Expédition</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
