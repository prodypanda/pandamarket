'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  ExternalLink,
  Megaphone,
  Package,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Wallet,
  TrendingUp,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { fetchOnboardingState, updateOnboardingStep, type OnboardingState } from '../../../lib/onboarding';
import { useLocale } from '@/contexts/LocaleContext';
import { useDashboardStyle } from '@/contexts/DashboardStyleContext';
import { SellerBentoCockpit } from '@/components/dashboard/SellerBentoCockpit';

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
    themeCustomization?: {
      colorPresetId?: string | null;
      customColors?: Record<string, string | null | undefined>;
    } | null;
  } | null;
}

interface VerificationData {
  status?: string | null;
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

const STORE_STATUS_BADGES: Record<string, { className: string; dotClassName: string }> = {
  verified: {
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    dotClassName: 'bg-emerald-500',
  },
  maintenance: {
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    dotClassName: 'bg-amber-500',
  },
  unverified: {
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    dotClassName: 'bg-slate-400',
  },
  suspended: {
    className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    dotClassName: 'bg-rose-500',
  },
};

function getWelcomeStorageKey(storeId: string): string {
  return `pd_seller_welcome_seen:${storeId}`;
}

function hasSeenWelcomeModal(storeId: string): boolean {
  try {
    return window.localStorage.getItem(getWelcomeStorageKey(storeId)) === 'true';
  } catch {
    return true;
  }
}

function markWelcomeModalSeen(storeId: string): void {
  try {
    window.localStorage.setItem(getWelcomeStorageKey(storeId), 'true');
  } catch {
    // Ignore storage failures
  }
}

/** Build last-30-day sales data from orders */
function buildSalesChart(orders: Order[]): DailySales[] {
  const days: DailySales[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, total: 0, count: 0 });
  }
  const map = new Map(days.map((d) => [d.date, d]));
  for (const order of orders) {
    const key = new Date(order.created_at).toISOString().slice(0, 10);
    const entry = map.get(key);
    if (entry) {
      entry.total += getOrderTotal(order);
      entry.count += 1;
    }
  }
  return days;
}

export default function DashboardOverview() {
  const { dashboardStyle } = useDashboardStyle();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({});
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const { t, locale, dir } = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

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

  const storeStatusLabel = (status: string): string => {
    const map: Record<string, string> = {
      verified: t('dashboardPages.overview.storeStatusVerified') || 'Vérifiée',
      maintenance: t('dashboardPages.overview.storeStatusMaintenance') || 'Maintenance',
      unverified: t('dashboardPages.overview.storeStatusUnverified') || 'Non vérifiée',
      suspended: t('dashboardPages.overview.storeStatusSuspended') || 'Suspendue',
    };
    return map[status] ?? status;
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 30);
        const dateFromStr = dateFrom.toISOString().slice(0, 10);

        const [walletRes, productsRes, ordersRes, chartOrdersRes, storeRes, verificationRes, onboardingRes] = await Promise.allSettled([
          fetchWithCsrf('/api/pd/wallet/me', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/stores/me/products?limit=1', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/orders/store?limit=5', { credentials: 'include' }),
          fetchWithCsrf(`/api/pd/orders/store?limit=200&date_from=${dateFromStr}`, { credentials: 'include' }),
          fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/verification/status', { credentials: 'include' }),
          fetchOnboardingState(),
        ]);

        if (walletRes.status === 'fulfilled' && walletRes.value.ok) {
          const data = await walletRes.value.json();
          setWallet(data.wallet);
        }

        if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
          const data = await productsRes.value.json();
          setProductCount(data.meta?.total || 0);
        }

        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const data = await ordersRes.value.json();
          setRecentOrders(data.data || []);
          setOrderCount(data.meta?.total || 0);
        }

        if (chartOrdersRes.status === 'fulfilled' && chartOrdersRes.value.ok) {
          const data = await chartOrdersRes.value.json();
          setAllOrders(data.data || []);
        }

        if (storeRes.status === 'fulfilled' && storeRes.value.ok) {
          const data = await storeRes.value.json();
          setStore(data.store || null);
        }

        if (verificationRes.status === 'fulfilled' && verificationRes.value.ok) {
          const data = await verificationRes.value.json();
          setVerification(data.verification || null);
        }

        if (onboardingRes.status === 'fulfilled') {
          setOnboardingState(onboardingRes.value);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (loading || !store?.id) return;
    if (!onboardingState.welcome?.dismissed && !hasSeenWelcomeModal(store.id)) {
      setShowWelcomeModal(true);
    }
  }, [loading, onboardingState.welcome?.dismissed, store?.id]);

  const dismissWelcomeModal = useCallback(() => {
    if (store?.id) {
      markWelcomeModalSeen(store.id);
    }
    setShowWelcomeModal(false);
    updateOnboardingStep('welcome', { dismissed: true })
      .then(setOnboardingState)
      .catch(() => undefined);
  }, [store?.id]);

  // Handle escape key and body overflow for welcome modal
  useEffect(() => {
    if (!showWelcomeModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissWelcomeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showWelcomeModal, dismissWelcomeModal]);

  const salesData = useMemo(() => buildSalesChart(allOrders), [allOrders]);
  const maxSales = useMemo(() => Math.max(...salesData.map((d) => d.total), 1), [salesData]);
  const totalRevenue30d = useMemo(() => salesData.reduce((s, d) => s + d.total, 0), [salesData]);
  const totalOrders30d = useMemo(() => salesData.reduce((s, d) => s + d.count, 0), [salesData]);

  const platformDomain = (process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || 'garbage.team').replace(/^https?:\/\//i, '');
  const storefrontHref = store?.custom_domain
    ? `https://${store.custom_domain}`
    : store?.subdomain
      ? `https://${encodeURIComponent(store.subdomain)}.${platformDomain}`
      : '/hub';
  const storeHasLogo = Boolean(store?.settings?.logo_url || store?.settings?.logo_light_url || store?.settings?.logo_dark_url);
  const storeHasCustomColors = Boolean(
    store?.settings?.themeCustomization?.colorPresetId || Object.values(store?.settings?.themeCustomization?.customColors || {}).some(Boolean),
  );
  const storeBasicsCompleted = Boolean(
    onboardingState.store_basics?.completed || (store?.name?.trim() && store?.subdomain?.trim() && storeHasLogo && storeHasCustomColors),
  );
  const setupSteps = [
    {
      label: t('dashboardPages.overview.setupStoreBasics') || 'Identité de la boutique',
      description: t('dashboardPages.overview.setupStoreBasicsDesc') || 'Nom, logo, sous-domaine et description',
      completed: storeBasicsCompleted,
      href: '/hub/dashboard/onboarding',
    },
    {
      label: t('dashboardPages.overview.setupTheme') || 'Thème & Apparence',
      description: t('dashboardPages.overview.setupThemeDesc') || 'Personnalisez vos couleurs et la mise en page',
      completed: Boolean(onboardingState.theme?.completed || store?.theme_id),
      href: '/hub/dashboard/onboarding#theme',
    },
    {
      label: t('dashboardPages.overview.setupKyc') || 'Vérification d\'identité (KYC)',
      description: t('dashboardPages.overview.setupKycDesc') || 'Transmettez votre pièce d\'identité pour activer les retraits',
      completed: Boolean(verification?.status === 'approved' || store?.is_verified),
      href: '/hub/dashboard/onboarding#kyc',
    },
    {
      label: t('dashboardPages.overview.setupFirstProduct') || 'Premier produit en vente',
      description: t('dashboardPages.overview.setupFirstProductDesc') || 'Créez votre première fiche article avec photos et prix',
      completed: productCount > 0,
      href: '/hub/dashboard/onboarding#first-product',
    },
    {
      label: t('dashboardPages.overview.setupPayment') || 'Passerelles de paiement',
      description: t('dashboardPages.overview.setupPaymentDesc') || 'Activez vos comptes marchands Flouci, Konnect ou PayPal',
      completed: Boolean(store?.payment_config),
      href: '/hub/dashboard/payment-config',
    },
  ];
  const completedSetupSteps = setupSteps.filter((step) => step.completed).length;
  const setupPercent = Math.round((completedSetupSteps / setupSteps.length) * 100);
  const storeStatusBadge = store?.status ? STORE_STATUS_BADGES[store.status] : null;

  const stats = [
    {
      name: t('dashboardPages.overview.totalRevenue') || 'Chiffre d\'affaires total',
      value: loading ? '—' : formatPrice(wallet?.total_earned),
      hint: t('dashboardPages.overview.revenueLast30Days', { amount: formatPrice(totalRevenue30d) }) || `30j : ${formatPrice(totalRevenue30d)}`,
      icon: DollarSign,
    },
    {
      name: t('dashboardPages.overview.activeProducts') || 'Produits actifs',
      value: loading ? '—' : String(productCount),
      hint: productCount > 0 ? (t('dashboardPages.overview.catalogAvailable') || 'Catalogue en ligne') : (t('dashboardPages.overview.addFirstListing') || 'Ajoutez votre 1er article'),
      icon: Package,
    },
    {
      name: t('dashboardPages.overview.totalOrders') || 'Commandes totales',
      value: loading ? '—' : String(orderCount),
      hint: t('dashboardPages.overview.ordersLast30Days', { count: totalOrders30d }) || `30j : ${totalOrders30d} commandes`,
      icon: ShoppingCart,
    },
    {
      name: t('dashboardPages.overview.availableBalance') || 'Solde disponible',
      value: loading ? '—' : formatPrice(wallet?.balance),
      hint: t('dashboardPages.overview.pendingBalance', { amount: formatPrice(wallet?.pending_balance) }) || `En cours : ${formatPrice(wallet?.pending_balance)}`,
      icon: Wallet,
    },
  ];

  return (
    <div dir={dir} className="space-y-4 sm:space-y-6">
      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div role="dialog" aria-modal="true" aria-labelledby="seller-welcome-title" className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-7">
            <button
              type="button"
              onClick={dismissWelcomeModal}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              aria-label={t('dashboardPages.overview.closeWelcomeAria') || 'Fermer'}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Store className="h-3.5 w-3.5" />
              {t('dashboardPages.overview.welcomeSeller') || 'Bienvenue sur votre Espace Vendeur'}
            </div>
            <h2 id="seller-welcome-title" className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {t('dashboardPages.overview.launchStepsTitle', { name: store?.name || t('dashboardPages.overview.yourStore') || 'votre boutique' })}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
              {t('dashboardPages.overview.welcomeBody') || 'Suivez ces étapes indispensables pour lancer votre boutique et commencer à recevoir des commandes en Tunisie.'}
            </p>
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {setupSteps.map((step, index) => (
                <Link
                  key={step.label}
                  href={step.href}
                  onClick={dismissWelcomeModal}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 p-3.5 transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-850 shadow-2xs"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-semibold">
                    {step.completed ? (
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {index + 1}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-300">{step.label}</span>
                    <span className="mt-0.5 block text-[11px] font-normal leading-4 text-slate-500 dark:text-slate-400">{step.description}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-xs text-slate-400">{t('dashboardPages.overview.welcomeFooter') || 'Vous pourrez retrouver ces étapes à tout moment.'}</p>
              <button
                type="button"
                onClick={dismissWelcomeModal}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-100 shadow-2xs cursor-pointer"
              >
                {t('dashboardPages.overview.getStarted') || 'Accéder au tableau de bord'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conditionally render Bento Cockpit style OR Classic style */}
      {dashboardStyle === 'bento' ? (
        <SellerBentoCockpit
          store={store}
          wallet={wallet}
          productCount={productCount}
          orderCount={orderCount}
          recentOrders={recentOrders}
          allOrders={allOrders}
          salesData={salesData}
          totalRevenue30d={totalRevenue30d}
          totalOrders30d={totalOrders30d}
          maxSales={maxSales}
          verificationStatus={verification?.status}
          setupPercent={setupPercent}
          loading={loading}
          storefrontHref={storefrontHref}
        />
      ) : (
        /* Classic View */
        <>
          {/* Header Banner */}
          <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <div className="flex items-center gap-4">
              {store?.settings?.logo_url ? (
                <div className="hidden h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs sm:flex">
                  <img src={store.settings.logo_url ? getResizedImageUrl(store.settings.logo_url, 'medium') : ''} alt="" className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 sm:flex">
                  <Store className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <Store className="h-3 w-3" />
                    {t('dashboardPages.overview.sellerCommandCenter') || 'Centre de Commandes'}
                  </span>
                  {storeStatusBadge && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${storeStatusBadge.className}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${storeStatusBadge.dotClassName}`} />
                      {storeStatusLabel(store?.status ?? '')}
                    </span>
                  )}
                </div>
                <h1 className="mt-1 text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                  {store?.name || t('dashboardPages.overview.title') || 'Tableau de bord'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  {t('dashboardPages.overview.heroSubtitle') || 'Supervisez vos ventes, expéditions et performances en temps réel.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <Link
                href="/hub/dashboard/ads"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs"
              >
                <Megaphone className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span>{t('dashboardPages.overview.pandaAds') || 'PandaAds'}</span>
              </Link>
              <Link
                href={storefrontHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs"
              >
                <span>{t('dashboardPages.overview.viewStore') || 'Voir la boutique'}</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </Link>
              <Link
                href="/hub/dashboard/products"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-3.5 py-2 text-xs font-medium text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-100 shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('dashboardPages.overview.addProduct') || 'Ajouter un produit'}</span>
              </Link>
            </div>
          </header>

          {/* Quick Actions */}
          <section aria-label="Actions rapides" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: t('dashboardPages.overview.quickProducts') || 'Produits', icon: Package, href: '/hub/dashboard/products' },
              { label: t('dashboardPages.overview.quickOrders') || 'Commandes', icon: ShoppingCart, href: '/hub/dashboard/orders' },
              { label: t('dashboardPages.overview.quickAds') || 'PandaAds', icon: Megaphone, href: '/hub/dashboard/ads' },
              { label: t('dashboardPages.overview.quickAnalytics') || 'Statistiques', icon: BarChart3, href: '/hub/dashboard/analytics' },
              { label: t('dashboardPages.overview.quickSettings') || 'Paramètres', icon: Settings, href: '/hub/dashboard/settings' },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="group flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs transition hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="rounded-lg p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors group-hover:bg-slate-200 dark:group-hover:bg-slate-700 shrink-0">
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{action.label}</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
              </Link>
            ))}
          </section>

          {/* Stats Cards */}
          <section aria-label="Statistiques clés" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {stats.map((stat) => (
              <div
                key={stat.name}
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">{stat.name}</p>
                    {loading ? (
                      <div className="h-6 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-1.5" />
                    ) : (
                      <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mt-1.5">{stat.value}</p>
                    )}
                    <p className="mt-1 text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate">{stat.hint}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                    <stat.icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Launch Readiness + Store Health */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]">
            {/* Launch Readiness */}
            <section aria-label="Préparation au lancement" className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('dashboardPages.overview.launchReadiness') || 'État de préparation'}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                    {t('dashboardPages.overview.stepsCompleted', { done: completedSetupSteps, total: setupSteps.length }) || `${completedSetupSteps} sur ${setupSteps.length} étapes validées`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{setupPercent}%</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    {setupPercent === 100 ? (t('dashboardPages.overview.ready') || 'Prêt') : (t('dashboardPages.overview.inProgress') || 'En cours')}
                  </p>
                </div>
              </div>

              <div
                role="progressbar"
                aria-valuenow={setupPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('dashboardPages.overview.launchReadiness') || 'État de préparation'}
                className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${setupPercent === 100 ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-white'}`}
                  style={{ width: `${setupPercent}%` }}
                />
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {setupSteps.map((step) => (
                  <Link
                    key={step.label}
                    href={step.href}
                    className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-3 transition hover:bg-white dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                      {step.completed ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          <Clock3 className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-900 dark:text-white truncate">{step.label}</span>
                      <span className="block text-[11px] font-normal text-slate-500 dark:text-slate-400 truncate">{step.description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Store Health */}
            <section aria-label="Santé de la boutique" className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-3.5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('dashboardPages.overview.storeHealth') || 'Santé de la boutique'}</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/40 p-2.5 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                    {t('dashboardPages.overview.verification') || 'Vérification KYC'}
                  </span>
                  {verification?.status === 'approved' || store?.is_verified ? (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {t('dashboardPages.overview.approved') || 'Vérifiée'}
                    </span>
                  ) : (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {verification?.status || t('dashboardPages.overview.notSubmitted') || 'Non soumis'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/40 p-2.5 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    {t('dashboardPages.overview.payments') || 'Paiements directs'}
                  </span>
                  {store?.payment_config ? (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {t('dashboardPages.overview.configured') || 'Configuré'}
                    </span>
                  ) : (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {t('dashboardPages.overview.marketplaceDefault') || 'Standard'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/40 p-2.5 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <Settings className="h-4 w-4 text-slate-400" />
                    {t('dashboardPages.overview.storeStatus') || 'Statut'}
                  </span>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-medium">
                    {store?.status ? storeStatusLabel(store.status) : (t('dashboardPages.common.active') || 'Actif')}
                  </span>
                </div>

                {completedSetupSteps < setupSteps.length && (
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-2.5 text-xs font-normal text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{t('dashboardPages.overview.finishSetupHint') || 'Terminez vos étapes pour maximiser vos ventes.'}</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sales Chart + Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Sales Chart */}
            <section aria-label="Graphique des ventes" className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('dashboardPages.overview.sales30Days') || 'Ventes des 30 derniers jours'}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                    {t('dashboardPages.overview.ordersAndRevenue', { count: totalOrders30d, revenue: formatPrice(totalRevenue30d) }) || `${totalOrders30d} commandes · ${formatPrice(totalRevenue30d)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-mono">
                  <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
                  <span>{formatPrice(totalRevenue30d)}</span>
                </div>
              </div>
              {loading ? (
                <div className="h-52 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />
              ) : (
                <>
                  <div className="relative h-52 flex items-end gap-[3px] pt-4">
                    {[0.25, 0.5, 0.75, 1].map((pct) => (
                      <div key={pct} className="pointer-events-none absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800" style={{ bottom: `${pct * 100}%` }} />
                    ))}
                    {salesData.map((day, i) => {
                      const height = maxSales > 0 ? (day.total / maxSales) * 100 : 0;
                      const isToday = i === salesData.length - 1;
                      return (
                        <div
                          key={day.date}
                          className="flex h-full flex-1 items-end group relative"
                          title={t('dashboardPages.overview.chartBarTitle', { date: day.date, amount: formatPrice(day.total), count: day.count }) || `${day.date}: ${formatPrice(day.total)}`}
                        >
                          <div
                            className={`w-full rounded-t-sm transition-all duration-300 ${
                              isToday
                                ? 'bg-slate-900 dark:bg-white shadow-2xs'
                                : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-400 dark:group-hover:bg-slate-500'
                            }`}
                            style={{ height: `${Math.max(height, 2)}%` }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                            <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs rounded-xl px-3 py-2 whitespace-nowrap shadow-xl border border-slate-800 dark:border-slate-200">
                              <p className="font-semibold">{new Date(day.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}</p>
                              <p className="font-semibold">{formatPrice(day.total)}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('dashboardPages.overview.ordersCount', { count: day.count }) || `${day.count} commandes`}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    <span>{salesData[0] && new Date(salesData[0].date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}</span>
                    <span>{salesData[14] && new Date(salesData[14].date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}</span>
                    <span>{t('dashboardPages.overview.today') || 'Aujourd\'hui'}</span>
                  </div>
                </>
              )}
            </section>

            {/* Recent Orders */}
            <section aria-label="Commandes récentes" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('dashboardPages.overview.recentOrders') || 'Commandes récentes'}</h2>
                <Link href="/hub/dashboard/orders" className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  {t('dashboardPages.overview.viewAll') || 'Voir tout'} →
                </Link>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentOrders.length > 0 ? (
                <ul className="space-y-2">
                  {recentOrders.map((order) => {
                    const statusClass = ORDER_STATUS_CLASSES[order.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                    return (
                      <li key={order.id}>
                        <Link
                          href={`/hub/dashboard/orders?id=${order.id}`}
                          className="flex items-center justify-between rounded-xl p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono text-[10px] font-semibold border border-slate-200/60 dark:border-slate-700">
                              #{order.id.slice(-4)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-900 dark:text-white truncate group-hover:text-slate-700 dark:group-hover:text-slate-300">
                                {order.customer_email || t('dashboardPages.overview.customer') || 'Client'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(order.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass}`}>
                              {orderStatusLabel(order.status)}
                            </span>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">{formatPrice(getOrderTotal(order))}</span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ShoppingCart className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('dashboardPages.overview.noOrders') || 'Aucune commande'}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{t('dashboardPages.overview.noOrdersHint') || 'Vos nouvelles ventes apparaîtront ici.'}</p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
