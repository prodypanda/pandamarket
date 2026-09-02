'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Wallet,
  Truck,
  Megaphone,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Store,
  Clock3,
  ChevronRight,
  CreditCard,
  Zap,
} from 'lucide-react';
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

interface SellerBentoCockpitProps {
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

export function SellerBentoCockpit({
  store,
  wallet,
  productCount,
  orderCount,
  recentOrders,
  salesData,
  totalRevenue30d,
  totalOrders30d,
  maxSales,
  verificationStatus,
  setupPercent,
  loading,
  storefrontHref,
}: SellerBentoCockpitProps) {
  const { t, locale } = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  // Average order value
  const averageOrderValue = useMemo(() => {
    if (totalOrders30d === 0) return 0;
    return totalRevenue30d / totalOrders30d;
  }, [totalRevenue30d, totalOrders30d]);

  // Peak sales day
  const peakDay = useMemo(() => {
    if (!salesData || salesData.length === 0) return null;
    return [...salesData].sort((a, b) => b.total - a.total)[0];
  }, [salesData]);

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
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* Cockpit Top Bar Banner */}
      <header className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {store?.settings?.logo_url ? (
              <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-2xs">
                <img
                  src={getResizedImageUrl(store.settings.logo_url, 'thumbnail')}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-2xs">
                <Store className="h-5 w-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-slate-900 dark:text-white">
                  {store?.name || t('dashboardPages.overview.title') || 'Tableau de bord'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Cockpit Bento
                </span>
                {store?.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    Vérifié
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                Vue modulaire synthétique pour le pilotage de votre activité e-commerce en Tunisie.
              </p>
            </div>
          </div>

          {/* Direct Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={storefrontHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
            >
              <span>{t('dashboardPages.overview.viewStore') || 'Voir la boutique'}</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </Link>
            <Link
              href="/hub/dashboard/products"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('dashboardPages.overview.addProduct') || 'Ajouter un produit'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* ========================================================================= */}
        {/* BENTO CARD 1: REVENUE VELOCITY & SALES 30D (Span 2 cols, 2 rows) */}
        {/* ========================================================================= */}
        <section
          aria-label="Vélocité des ventes et chiffre d'affaires"
          className="md:col-span-2 xl:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Vélocité des Ventes & Recettes</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                {loading ? '—' : formatPrice(totalRevenue30d)}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {totalOrders30d} commandes enregistrées sur les 30 derniers jours.
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Panier Moyen</span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white font-mono mt-0.5">
                {formatPrice(averageOrderValue)}
              </p>
              {peakDay && peakDay.total > 0 && (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                  Pic: {formatPrice(peakDay.total)}
                </span>
              )}
            </div>
          </div>

          {/* Interactive Bar Sparkline */}
          <div className="pt-2">
            <div className="relative h-44 flex items-end gap-[3px] border-b border-slate-100 dark:border-slate-800 pb-1">
              {salesData.map((day, i) => {
                const height = maxSales > 0 ? (day.total / maxSales) * 100 : 0;
                const isToday = i === salesData.length - 1;
                return (
                  <div
                    key={day.date}
                    className="flex h-full flex-1 items-end group relative"
                    title={`${day.date}: ${formatPrice(day.total)} (${day.count} commandes)`}
                  >
                    <div
                      className={`w-full rounded-t-sm transition-all duration-200 ${
                        isToday
                          ? 'bg-slate-900 dark:bg-white shadow-2xs'
                          : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-400 dark:group-hover:bg-slate-500'
                      }`}
                      style={{ height: `${Math.max(height, 3)}%` }}
                    />
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                      <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs rounded-xl px-2.5 py-1.5 whitespace-nowrap shadow-xl border border-slate-800 dark:border-slate-200">
                        <p className="font-semibold text-[11px]">{new Date(day.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}</p>
                        <p className="font-semibold text-[11px] font-mono">{formatPrice(day.total)}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500">{day.count} commandes</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              <span>{salesData[0] && new Date(salesData[0].date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}</span>
              <span>{salesData[14] && new Date(salesData[14].date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}</span>
              <span>Aujourd'hui</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Total encaissé historique :</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{formatPrice(wallet?.total_earned)}</span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BENTO CARD 2: TUNISIAN LOGISTICS PULSE */}
        {/* ========================================================================= */}
        <section
          aria-label="Pouls logistique et transporteurs tunisiens"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white">Hub Logistique TN</h2>
                <p className="text-[10px] text-slate-400">Routage 24 Gouvernorats</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
              Actif
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-750 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-[11px]">Aramex Express</p>
                <p className="text-[10px] text-slate-400">Suivi digital temps réel</p>
              </div>
              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 font-semibold">24-48h</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-750 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-[11px]">Rapid-Poste (La Poste TN)</p>
                <p className="text-[10px] text-slate-400">Réseau 24 gouvernorats</p>
              </div>
              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 font-semibold">24-72h</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-750 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-[11px]">First Delivery & Runex</p>
                <p className="text-[10px] text-slate-400">Grand Tunis, Sahel & Sfax</p>
              </div>
              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 font-semibold">12-24h</span>
            </div>
          </div>

          <Link
            href="/hub/dashboard/online-store/integrations"
            className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs flex items-center justify-center gap-1.5"
          >
            <span>Simulateur & Devis Multi-Transporteurs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        {/* ========================================================================= */}
        {/* BENTO CARD 3: CATALOG & PANDA ADS BOOSTER */}
        {/* ========================================================================= */}
        <section
          aria-label="Catalogue et campagnes publicitaires"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white">Catalogue & Ventes</h2>
                <p className="text-[10px] text-slate-400">Visibilité & Boosts</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
              {productCount} articles
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <p className="text-xs font-semibold text-slate-900 dark:text-white">PandaAds Sponsorisé</p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Boostez vos articles en tête de marketplace dès 10 TND avec suivi du ROAS.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/hub/dashboard/products"
              className="py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs flex items-center justify-center gap-1"
            >
              <span>Catalogue</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
            <Link
              href="/hub/dashboard/ads"
              className="py-2 rounded-xl bg-slate-900 dark:bg-white text-[11px] font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs flex items-center justify-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-400 dark:text-amber-600" />
              <span>Booster</span>
            </Link>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BENTO CARD 4: STORE HEALTH, TRUST & KYC */}
        {/* ========================================================================= */}
        <section
          aria-label="Santé boutique et conformité KYC"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white">Santé & Conformité</h2>
                <p className="text-[10px] text-slate-400">KYC & Passerelles</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
              {setupPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  setupPercent === 100 ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-white'
                }`}
                style={{ width: `${setupPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 text-right">État de préparation</p>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-750">
              <span className="text-[11px] text-slate-600 dark:text-slate-400">Vérification KYC :</span>
              {verificationStatus === 'approved' || store?.is_verified ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-medium border border-emerald-200/60 dark:border-emerald-800">
                  Approuvée
                </span>
              ) : (
                <Link
                  href="/hub/dashboard/kyc"
                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-medium hover:bg-slate-200"
                >
                  À compléter →
                </Link>
              )}
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-750">
              <span className="text-[11px] text-slate-600 dark:text-slate-400">Passerelles de paiement :</span>
              {store?.payment_config ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-medium border border-emerald-200/60 dark:border-emerald-800">
                  Directes
                </span>
              ) : (
                <Link
                  href="/hub/dashboard/payment-config"
                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-medium hover:bg-slate-200"
                >
                  Configurer →
                </Link>
              )}
            </div>
          </div>

          <Link
            href="/hub/dashboard/onboarding"
            className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs flex items-center justify-center gap-1.5"
          >
            <span>Guide d'Onboarding Complet</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        {/* ========================================================================= */}
        {/* BENTO CARD 5: FINANCIAL WALLET & CASH FLOW */}
        {/* ========================================================================= */}
        <section
          aria-label="Portefeuille marchand et trésorerie"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white">Portefeuille & Solde</h2>
                <p className="text-[10px] text-slate-400">Trésorerie marchande</p>
              </div>
            </div>
            <Link
              href="/hub/dashboard/wallet"
              className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
            >
              Détails →
            </Link>
          </div>

          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
              <span className="text-[10px] font-medium uppercase text-slate-400">Solde Disponible Immédiat :</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                {formatPrice(wallet?.balance)}
              </p>
            </div>

            <div className="flex items-center justify-between px-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">En attente / COD :</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                {formatPrice(wallet?.pending_balance)}
              </span>
            </div>
          </div>

          <Link
            href="/hub/dashboard/wallet"
            className="w-full py-2 rounded-xl bg-slate-900 dark:bg-white text-[11px] font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs flex items-center justify-center gap-1.5"
          >
            <span>Demander un Virement</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        {/* ========================================================================= */}
        {/* BENTO CARD 6: LIVE ORDERS BOARD & RECENT FULFILLMENT (Span 2 cols) */}
        {/* ========================================================================= */}
        <section
          aria-label="Dernières commandes et expéditions"
          className="md:col-span-2 xl:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white">Commandes Récentes</h2>
                <p className="text-[10px] text-slate-400">Flux d'expédition direct</p>
              </div>
            </div>
            <Link
              href="/hub/dashboard/orders"
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Voir les {orderCount} commandes →
            </Link>
          </div>

          {recentOrders.length > 0 ? (
            <ul className="space-y-2">
              {recentOrders.slice(0, 4).map((order) => {
                const statusClass = ORDER_STATUS_CLASSES[order.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                return (
                  <li key={order.id}>
                    <Link
                      href={`/hub/dashboard/orders?id=${order.id}`}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                          #{order.id.slice(-4)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-900 dark:text-white truncate group-hover:text-slate-700 dark:group-hover:text-slate-300">
                            {order.customer_email || 'Client'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {new Date(order.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass}`}>
                          {orderStatusLabel(order.status)}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                          {formatPrice(getOrderTotal(order))}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-8 text-center">
              <ShoppingCart className="mx-auto mb-2 h-7 w-7 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Aucune commande enregistrée</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Les nouvelles commandes apparaîtront instantanément ici.</p>
            </div>
          )}

          <div className="pt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
            <span>Volume 30 jours : <strong>{totalOrders30d} commandes</strong></span>
            <Link href="/hub/dashboard/orders" className="text-[11px] font-medium text-slate-900 dark:text-white hover:underline">
              Gérer les expéditions
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
