'use client';

import { fetchWithCsrf } from '@/lib/api';
import { fetchOnboardingState } from '@/lib/onboarding';
import { DashboardSubscriptionProvider } from '@/contexts/DashboardSubscriptionContext';
import { DashboardStyleProvider, useDashboardStyle } from '@/contexts/DashboardStyleContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  Settings,
  LogOut,
  Shield,
  Sparkles,
  Crown,
  Key,
  CreditCard,
  Webhook,
  Bell,
  Flag,
  MessageSquare,
  LayoutTemplate,
  Tags,
  Plus,
  ImageIcon,
  CheckCircle2,
  BarChart3,
  ReceiptText,
  UserRound,
  Megaphone,
  Store,
  Menu,
  X,
  Globe,
  Palette,
  Layout,
  LayoutGrid,
  Navigation as NavIcon,
  Search,
  Code2,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import { LocaleSwitcher } from '../../../components/LocaleSwitcher';
import { MarketplaceBrand } from '../../../components/MarketplaceBrand';

interface CurrentUser {
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string;
  store_id?: string | null;
}

interface ThemeCustomizationState {
  colorPresetId?: string | null;
  customColors?: Record<string, string | null | undefined>;
}

interface CurrentStore {
  id?: string;
  name?: string;
  status?: string | null;
  is_verified?: boolean | null;
  theme_id?: string | null;
  subscription_plan?: string | null;
  settings?: {
    logo_url?: string | null;
    logo_light_url?: string | null;
    logo_dark_url?: string | null;
    store_description?: string | null;
    themeCustomization?: ThemeCustomizationState | null;
  } | null;
  payment_config?: unknown;
  subdomain?: string | null;
  custom_domain?: string | null;
}

interface MarketplaceSettings {
  marketplace_name?: string;
  marketplace_logo_url?: string;
  marketplace_logo_light_url?: string;
  marketplace_logo_dark_url?: string;
}

function isAdminRole(role?: string) {
  return role === 'admin' || role === 'super_admin' || role === 'Admin' || role === 'SuperAdmin';
}

function isVendorRole(role?: string) {
  return role === 'vendor' || role === 'Vendor';
}

function hasCustomColors(customization?: ThemeCustomizationState | null): boolean {
  return Boolean(
    customization?.colorPresetId || Object.values(customization?.customColors || {}).some((value) => Boolean(value)),
  );
}

function DashboardInnerLayout({ children }: { children: React.ReactNode }) {
  const { t, dir } = useLocale();
  const pathname = usePathname();
  const { dashboardStyle, setDashboardStyle, sidebarCollapsed, toggleSidebarCollapsed } = useDashboardStyle();

  const [loggingOut, setLoggingOut] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [currentStore, setCurrentStore] = useState<CurrentStore | null>(null);
  const [storeCount, setStoreCount] = useState(0);
  const [canCreateFreeStore, setCanCreateFreeStore] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [marketplaceSettings, setMarketplaceSettings] = useState<MarketplaceSettings>({});
  const [setupProgress, setSetupProgress] = useState({ completed: 0, total: 5 });
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const isStoreSelectorPage = pathname === '/hub/dashboard/select-store';
  const isStoreCreatePage = pathname === '/hub/dashboard/create-store';
  const isSubscriptionOrdersPage = pathname === '/hub/dashboard/my-subscription-orders';
  const isStoreSetupPage = isStoreSelectorPage || isStoreCreatePage || isSubscriptionOrdersPage;

  const isBentoMode = dashboardStyle === 'bento';
  const isCollapsed = isBentoMode && sidebarCollapsed;

  useEffect(() => {
    let cancelled = false;

    async function fetchAccountContext() {
      const [userRes, storeRes] = await Promise.allSettled([
        fetchWithCsrf('/api/pd/auth/me', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/stores/mine', { credentials: 'include' }),
      ]);

      if (cancelled) return;

      if (userRes.status === 'fulfilled' && userRes.value.ok) {
        const data = await userRes.value.json();
        const user = (data.user || data.data || null) as CurrentUser | null;
        if (!isVendorRole(user?.role)) {
          window.location.href = isAdminRole(user?.role) ? '/dashboard' : '/hub';
          return;
        }
        setCurrentUser(user);
      } else {
        window.location.href = '/login/seller?next=/hub/dashboard';
        return;
      }

      if (storeRes.status === 'fulfilled' && storeRes.value.ok) {
        const data = await storeRes.value.json();
        const stores = Array.isArray(data.stores) ? (data.stores as CurrentStore[]) : [];
        if (stores.length === 0 && !isStoreCreatePage) {
          window.location.href = '/hub/vendor-signup';
          return;
        }
        setStoreCount(stores.length);
        setCanCreateFreeStore(Boolean(data.can_create_free_store));
        if (data.requires_selection && !isStoreSetupPage) {
          window.location.href = '/hub/dashboard/select-store';
          return;
        }
        setCurrentStore(data.selected_store || stores[0] || null);
        setAuthorized(true);
      } else {
        window.location.href = '/hub/vendor-signup';
      }
    }

    fetchAccountContext();

    return () => {
      cancelled = true;
    };
  }, [isStoreCreatePage, isStoreSetupPage]);

  useEffect(() => {
    let cancelled = false;
    async function fetchMarketplaceSettings() {
      try {
        const res = await fetchWithCsrf('/api/pd/marketplace/settings', { credentials: 'include' });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setMarketplaceSettings(data.data || {});
        }
      } catch {
        if (!cancelled) setMarketplaceSettings({});
      }
    }
    fetchMarketplaceSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  // Real setup progress derivation
  useEffect(() => {
    if (!authorized || !currentStore?.id || isStoreSetupPage) return;
    let cancelled = false;
    async function fetchSetupProgress() {
      try {
        const [onboardingState, productsRes, kycRes] = await Promise.all([
          fetchOnboardingState(),
          fetchWithCsrf('/api/pd/stores/me/products?limit=1', { credentials: 'include' }).catch(() => null),
          fetchWithCsrf('/api/pd/verification/status', { credentials: 'include' }).catch(() => null),
        ]);
        if (cancelled) return;

        let hasProducts = Boolean(onboardingState.first_product?.completed);
        if (!hasProducts && productsRes && productsRes.ok) {
          const pData = await productsRes.json().catch(() => ({}));
          hasProducts = Boolean(
            (pData.data && pData.data.length > 0) ||
              (pData.products && pData.products.length > 0) ||
              pData.total > 0,
          );
        }

        let kycVerified = Boolean(currentStore?.is_verified || onboardingState.kyc?.completed);
        if (!kycVerified && kycRes && kycRes.ok) {
          const kData = await kycRes.json().catch(() => ({}));
          const status = kData.verification?.status || kData.status || kData.data?.status;
          kycVerified = status === 'approved' || status === 'verified';
        }

        const hasBranding = Boolean(
          currentStore?.name &&
            (currentStore?.settings?.logo_url ||
              currentStore?.settings?.logo_light_url ||
              currentStore?.settings?.logo_dark_url ||
              hasCustomColors(currentStore?.settings?.themeCustomization) ||
              onboardingState.store_basics?.completed),
        );

        const hasTheme = Boolean(currentStore?.theme_id || onboardingState.theme?.completed);
        const isPublished = Boolean(
          currentStore?.status === 'verified' || onboardingState.publish_store?.completed,
        );

        const steps = [hasBranding, hasTheme, hasProducts, kycVerified, isPublished];

        setSetupProgress({ completed: steps.filter(Boolean).length, total: steps.length });
      } catch {
        setSetupProgress((current) => current);
      }
    }
    fetchSetupProgress();
    return () => {
      cancelled = true;
    };
  }, [authorized, currentStore, isStoreSetupPage]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  // Mobile drawer scroll lock & keyboard event handling
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileDrawerOpen(false);
      } else if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileDrawerOpen]);

  // Grouped Navigation Definition
  const navigationGroups = [
    {
      groupName: undefined,
      items: [
        { name: t('dashboard.sidebar.overview') || 'Vue d\'ensemble', href: '/hub/dashboard', icon: LayoutDashboard },
        { name: t('dashboard.sidebar.setupGuide') || 'Guide de lancement', href: '/hub/dashboard/onboarding', icon: CheckCircle2 },
        { name: t('dashboard.sidebar.analytics') || 'Statistiques', href: '/hub/dashboard/analytics', icon: BarChart3 },
        { name: t('dashboard.sidebar.ads') || 'PandaAds', href: '/hub/dashboard/ads', icon: Megaphone },
      ],
    },
    {
      groupName: t('dashboard.sidebar.groupCatalogSales') || 'Catalogue & Ventes',
      items: [
        { name: t('dashboard.sidebar.products') || 'Produits', href: '/hub/dashboard/products', icon: Package },
        { name: t('dashboard.sidebar.categories') || 'Catégories', href: '/hub/dashboard/categories', icon: Tags },
        { name: t('dashboard.sidebar.loyalty') || 'Abonnés & Fidélité', href: '/hub/dashboard/loyalty', icon: Users },
        { name: t('dashboard.sidebar.media') || 'Médiathèque', href: '/hub/dashboard/media', icon: ImageIcon },
        { name: t('dashboard.sidebar.orders') || 'Commandes', href: '/hub/dashboard/orders', icon: ShoppingCart },
        { name: t('dashboard.sidebar.messages') || 'Messagerie', href: '/hub/dashboard/messages', icon: MessageSquare },
        { name: t('dashboard.sidebar.wallet') || 'Portefeuille', href: '/hub/dashboard/wallet', icon: Wallet },
        { name: t('dashboard.sidebar.financialReport') || 'Rapports financiers', href: '/hub/dashboard/financial', icon: ReceiptText },
      ],
    },
    {
      groupName: t('dashboard.sidebar.groupOnlineStore') || 'Boutique en Ligne',
      items: [
        { name: t('dashboard.sidebar.onlineStoreOverview') || 'Boutique en ligne', href: '/hub/dashboard/online-store', icon: Globe },
        { name: t('dashboard.sidebar.themes') || 'Thèmes', href: '/hub/dashboard/online-store/themes', icon: Palette },
        { name: t('dashboard.sidebar.customize') || 'Personnalisation', href: '/hub/dashboard/online-store/customize', icon: Sparkles },
        { name: t('dashboard.sidebar.menusNavigation') || 'Navigation & Menus', href: '/hub/dashboard/online-store/navigation', icon: NavIcon },
        { name: t('dashboard.sidebar.pages') || 'Constructeur de pages', href: '/hub/dashboard/page-builder', icon: LayoutTemplate },
        { name: t('dashboard.sidebar.domains') || 'Domaines & DNS', href: '/hub/dashboard/online-store/domains', icon: Globe },
        { name: t('dashboard.sidebar.seoMeta') || 'Référencement SEO', href: '/hub/dashboard/online-store/seo', icon: Search },
        { name: t('dashboard.sidebar.integrationsPixels') || 'Logistique & Intégrations', href: '/hub/dashboard/online-store/integrations', icon: Code2 },
        { name: t('dashboard.sidebar.customers') || 'Clients', href: '/hub/dashboard/online-store/customers', icon: Users },
      ],
    },
    {
      groupName: t('dashboard.sidebar.groupConfiguration') || 'Configuration',
      items: [
        { name: t('dashboard.sidebar.aiTools') || 'Outils IA', href: '/hub/dashboard/ai', icon: Sparkles },
        { name: t('dashboard.sidebar.subscription') || 'Abonnement', href: '/hub/dashboard/subscription', icon: Crown },
        { name: t('dashboard.sidebar.paymentConfig') || 'Passerelles de paiement', href: '/hub/dashboard/payment-config', icon: CreditCard },
        { name: t('dashboard.sidebar.reports') || 'Signalements', href: '/hub/dashboard/reports', icon: Flag },
        { name: t('dashboard.sidebar.settings') || 'Paramètres', href: '/hub/dashboard/settings', icon: Settings },
      ],
    },
  ];

  const accountMenuItems = [
    { name: t('dashboard.sidebar.myAccount') || 'Mon compte', href: '/hub/profile', icon: UserRound },
    { name: t('dashboard.sidebar.platformOrdersInvoices') || 'Commandes d\'abonnement', href: '/hub/dashboard/my-subscription-orders', icon: ReceiptText },
    { name: t('dashboard.sidebar.verification') || 'Vérification KYC', href: '/hub/dashboard/kyc', icon: Shield },
    { name: t('dashboard.sidebar.apiKeys') || 'Clés d\'API', href: '/hub/dashboard/api-keys', icon: Key },
    { name: t('dashboard.sidebar.webhooks') || 'Webhooks', href: '/hub/dashboard/webhooks', icon: Webhook },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetchWithCsrf('/api/pd/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      window.location.href = '/login/seller';
    }
  };

  const displayName =
    currentStore?.name ||
    [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ') ||
    currentUser?.email ||
    'Vendor';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const setupPercentage = Math.round((setupProgress.completed / setupProgress.total) * 100);

  const renderNavLinks = (collapsed = false) => (
    <div className="space-y-6">
      {navigationGroups.map((group, gIdx) => (
        <div key={gIdx} className="space-y-1">
          {!collapsed && group.groupName && (
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              {group.groupName}
            </p>
          )}
          {group.items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/hub/dashboard' &&
                item.href !== '/hub/dashboard/online-store' &&
                pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={`flex items-center text-xs font-medium rounded-xl transition ${
                  collapsed ? 'justify-center p-2.5' : 'px-3 py-2'
                } ${
                  active
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon className={`${collapsed ? 'h-4 w-4' : 'me-2.5 h-4 w-4'} flex-shrink-0`} aria-hidden="true" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold shadow-xl">
          {t('dashboard.checkingAccess') || 'Vérification des accès...'}
        </div>
      </div>
    );
  }

  if (isStoreSetupPage) {
    return (
      <div dir={dir} className="min-h-screen bg-slate-100 text-slate-900">
        <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <MarketplaceBrand
              href="/hub"
              marketplaceName={marketplaceSettings.marketplace_name}
              marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
              marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
              marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
              logoSurface="light"
              imageClassName="h-10 max-w-[170px] object-contain"
              textClassName="text-xl font-bold text-slate-900"
            />
            <div className="flex items-center gap-3">
              <Link
                href="/hub/dashboard/select-store"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 transition shadow-sm"
              >
                <Store className="h-4 w-4 text-slate-900" />
                <span>Mes boutiques</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center gap-2 rounded-full border border-rose-100 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? (t('dashboard.loggingOut') || 'Déconnexion...') : (t('nav.logout') || 'Déconnexion')}
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white flex">
      {/* Desktop Sidebar */}
      <aside
        className={`bg-white dark:bg-slate-900 border-e border-slate-200/80 dark:border-slate-800 flex-col hidden md:flex fixed inset-y-0 start-0 h-full z-20 shadow-2xs transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`h-16 flex items-center border-b border-slate-200/80 dark:border-slate-800 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
          {!isCollapsed && (
            <MarketplaceBrand
              href="/hub/dashboard"
              marketplaceName={marketplaceSettings.marketplace_name}
              marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
              marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
              marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
              logoSurface="light"
              imageClassName="h-8 max-w-[140px] object-contain"
              textClassName="text-lg font-bold text-slate-900 dark:text-white"
            />
          )}

          {isBentoMode && (
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              aria-label={isCollapsed ? 'Développer la barre latérale' : 'Réduire la barre latérale'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-5 overflow-y-auto">{renderNavLinks(isCollapsed)}</nav>

        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 space-y-1">
          <Link
            href="/hub"
            title={isCollapsed ? (t('common.back') || 'Retour vers la marketplace') : undefined}
            className={`flex items-center text-xs font-medium text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
            }`}
          >
            <span className={isCollapsed ? '' : 'me-2'}>←</span>
            {!isCollapsed && <span>{t('common.back') || 'Retour marketplace'}</span>}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title={isCollapsed ? (t('nav.logout') || 'Déconnexion') : undefined}
            className={`flex items-center text-xs font-medium text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-60 cursor-pointer w-full ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
            }`}
          >
            <LogOut className={`${isCollapsed ? 'h-4 w-4' : 'me-2.5 h-4 w-4'} flex-shrink-0`} />
            {!isCollapsed && <span>{loggingOut ? (t('dashboard.loggingOut') || 'Déconnexion...') : (t('nav.logout') || 'Déconnexion')}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div
            ref={drawerRef}
            tabIndex={-1}
            className="fixed inset-y-0 start-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-50 focus:outline-none border-e border-slate-200 dark:border-slate-800"
          >
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
              <MarketplaceBrand
                href="/hub/dashboard"
                marketplaceName={marketplaceSettings.marketplace_name}
                marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
                marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
                marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
                logoSurface="light"
                imageClassName="h-8 max-w-[140px] object-contain"
                textClassName="text-lg font-bold text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Fermer le menu"
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 overflow-y-auto">{renderNavLinks(false)}</nav>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
              <Link
                href="/hub"
                className="flex items-center w-full px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ← {t('common.back') || 'Retour marketplace'}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center w-full px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-60 cursor-pointer"
              >
                <LogOut className="mr-2.5 h-4 w-4 flex-shrink-0" />
                {loggingOut ? (t('dashboard.loggingOut') || 'Déconnexion...') : (t('nav.logout') || 'Déconnexion')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'md:ms-16' : 'md:ms-64'
        }`}
      >
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Ouvrir le menu de navigation"
              aria-expanded={mobileDrawerOpen}
              className="md:hidden rounded-xl p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
              {t('dashboard.title') || 'Tableau de bord Vendeur'}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Style Switcher Segmented Control */}
            <div
              role="group"
              aria-label="Style d'affichage du tableau de bord"
              className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700"
            >
              <button
                type="button"
                onClick={() => setDashboardStyle('classic')}
                aria-pressed={dashboardStyle === 'classic'}
                aria-label="Vue Classique"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  dashboardStyle === 'classic'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Classique</span>
              </button>

              <button
                type="button"
                onClick={() => setDashboardStyle('bento')}
                aria-pressed={dashboardStyle === 'bento'}
                aria-label="Vue Bento Cockpit"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  dashboardStyle === 'bento'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bento Cockpit</span>
              </button>
            </div>

            <LocaleSwitcher />

            <Link
              href="/hub/dashboard/select-store"
              className="hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
            >
              <Store className="h-3.5 w-3.5" />
              <span>{t('dashboard.sidebar.myStore') || 'Boutiques'}</span>
            </Link>

            <Link
              href="/hub/dashboard/notifications"
              aria-label={t('dashboard.sidebar.notifications') || 'Notifications'}
              className="relative inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
            >
              <Bell className="h-4 w-4" />
            </Link>

            {/* Account Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                aria-label="Menu utilisateur"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shadow-2xs transition hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer"
              >
                {initials}
              </button>

              {accountMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 text-xs shadow-2xl animate-in fade-in"
                >
                  <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-2.5">
                    <p className="font-semibold text-slate-900 dark:text-white">{displayName}</p>
                    {currentUser?.email && (
                      <p className="truncate text-[11px] text-slate-400">
                        {currentUser.email}
                      </p>
                    )}
                  </div>
                  {accountMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 font-medium transition ${
                        pathname === item.href || pathname.startsWith(`${item.href}/`)
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 font-medium text-rose-600 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-60 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>{loggingOut ? (t('dashboard.loggingOut') || 'Déconnexion...') : (t('nav.logout') || 'Déconnexion')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Setup Progress Bar if < 100% */}
        {setupPercentage < 100 && (
          <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 sm:px-6 py-2.5 backdrop-blur-xs">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5 text-xs">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Lancement de votre boutique</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {setupProgress.completed} sur {setupProgress.total} étapes validées ({setupPercentage}%)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:w-80">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-slate-900 dark:bg-white transition-all duration-500"
                    style={{ width: `${setupPercentage}%` }}
                  />
                </div>
                <Link
                  href="/hub/dashboard/onboarding"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs flex-shrink-0"
                >
                  <span>Continuer</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardStyleProvider>
      <DashboardSubscriptionProvider>
        <DashboardInnerLayout>{children}</DashboardInnerLayout>
      </DashboardSubscriptionProvider>
    </DashboardStyleProvider>
  );
}
