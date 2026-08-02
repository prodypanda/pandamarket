'use client';

import { fetchWithCsrf } from '@/lib/api';
import { fetchOnboardingState } from '@/lib/onboarding';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import {
  ArrowLeftRight,
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
  Navigation as NavIcon,
  FileText,
  Search,
  Code2,
  Users,
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const pathname = usePathname();
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
          fetchWithCsrf('/api/pd/products?limit=1', { credentials: 'include' }).catch(() => null),
          fetchWithCsrf('/api/pd/kyc/me', { credentials: 'include' }).catch(() => null),
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
          const status = kData.status || kData.data?.status;
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

  // Mobile drawer scroll lock & keyboard event handling (Escape & Focus trap)
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
        { name: t('dashboard.sidebar.overview'), href: '/hub/dashboard', icon: LayoutDashboard },
        { name: 'Setup guide', href: '/hub/dashboard/onboarding', icon: CheckCircle2 },
        { name: 'Analytics', href: '/hub/dashboard/analytics', icon: BarChart3 },
        { name: 'PandaMarket Ads', href: '/hub/dashboard/ads', icon: Megaphone },
      ],
    },
    {
      groupName: 'Catalogue & Ventes',
      items: [
        { name: t('dashboard.sidebar.products'), href: '/hub/dashboard/products', icon: Package },
        { name: t('dashboard.sidebar.categories'), href: '/hub/dashboard/categories', icon: Tags },
        { name: 'Médias', href: '/hub/dashboard/media', icon: ImageIcon },
        { name: t('dashboard.sidebar.orders'), href: '/hub/dashboard/orders', icon: ShoppingCart },
        { name: 'Messages', href: '/hub/dashboard/messages', icon: MessageSquare },
        { name: t('dashboard.sidebar.wallet'), href: '/hub/dashboard/wallet', icon: Wallet },
        { name: 'Bilan financier', href: '/hub/dashboard/financial', icon: ReceiptText },
      ],
    },
    {
      groupName: 'Boutique en ligne',
      items: [
        { name: 'Vue d\'ensemble', href: '/hub/dashboard/online-store', icon: Globe },
        { name: 'Thèmes', href: '/hub/dashboard/online-store/themes', icon: Palette },
        { name: 'Personnaliser', href: '/hub/dashboard/online-store/customize', icon: Sparkles },
        { name: 'Menus & Navigation', href: '/hub/dashboard/online-store/navigation', icon: NavIcon },
        { name: 'Pages', href: '/hub/dashboard/page-builder', icon: LayoutTemplate },
        { name: 'Domaines', href: '/hub/dashboard/online-store/domains', icon: Globe },
        { name: 'SEO & Méta', href: '/hub/dashboard/online-store/seo', icon: Search },
        { name: 'Intégrations & Pixels', href: '/hub/dashboard/online-store/integrations', icon: Code2 },
        { name: 'Clients', href: '/hub/dashboard/online-store/customers', icon: Users },
      ],
    },
    {
      groupName: 'Configuration',
      items: [
        { name: t('dashboard.sidebar.aiTools'), href: '/hub/dashboard/ai', icon: Sparkles },
        { name: t('dashboard.sidebar.subscription'), href: '/hub/dashboard/subscription', icon: Crown },
        { name: t('dashboard.sidebar.paymentConfig'), href: '/hub/dashboard/payment-config', icon: CreditCard },
        { name: t('dashboard.sidebar.reports'), href: '/hub/dashboard/reports', icon: Flag },
        { name: t('dashboard.sidebar.settings'), href: '/hub/dashboard/settings', icon: Settings },
      ],
    },
  ];

  const accountMenuItems = [
    { name: 'My account', href: '/hub/profile', icon: UserRound },
    { name: 'Platform Orders & Invoices', href: '/hub/dashboard/my-subscription-orders', icon: ReceiptText },
    { name: t('dashboard.sidebar.verification'), href: '/hub/dashboard/kyc', icon: Shield },
    { name: t('dashboard.sidebar.apiKeys'), href: '/hub/dashboard/api-keys', icon: Key },
    { name: t('dashboard.sidebar.webhooks'), href: '/hub/dashboard/webhooks', icon: Webhook },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetchWithCsrf('/api/pd/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      localStorage.removeItem('pd_access_token');
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

  const renderNavLinks = () => (
    <div className="space-y-6">
      {navigationGroups.map((group, gIdx) => (
        <div key={gIdx} className="space-y-1">
          {group.groupName && (
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
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
                className={`flex items-center px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
                  active
                    ? 'bg-[#B91C1C]/12 text-[#B91C1C] ring-1 ring-[#B91C1C]/15 font-bold'
                    : 'text-slate-700 hover:bg-[#B91C1C]/10 hover:text-[#B91C1C]'
                }`}
              >
                <item.icon className="mr-2.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{item.name}</span>
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
          {t('dashboard.checkingAccess')}
        </div>
      </div>
    );
  }

  if (isStoreSetupPage) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
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
              textClassName="text-xl font-bold text-[#B91C1C]"
            />
            <div className="flex items-center gap-3">
              <Link
                href="/hub/dashboard/select-store"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:border-[#B91C1C] hover:text-[#B91C1C] transition shadow-sm"
              >
                <Store className="h-4 w-4 text-[#B91C1C]" />
                <span>Mes boutiques</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center gap-2 rounded-full border border-red-100 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? t('dashboard.loggingOut') : t('nav.logout')}
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-col hidden md:flex fixed h-full z-10 shadow-sm">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <MarketplaceBrand
            href="/hub/dashboard"
            marketplaceName={marketplaceSettings.marketplace_name}
            marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
            marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
            marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
            logoSurface="light"
            imageClassName="h-10 max-w-[170px] object-contain"
            textClassName="text-xl font-bold text-[#B91C1C]"
          />
        </div>
        <nav className="flex-1 px-4 py-6 overflow-y-auto">{renderNavLinks()}</nav>
        <div className="p-4 border-t border-slate-200">
          <Link
            href="/hub"
            className="flex items-center w-full px-3 py-2 text-xs font-semibold text-slate-600 rounded-lg hover:bg-slate-100 transition-colors mb-1"
          >
            ← {t('common.back')}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center w-full px-3 py-2 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            <LogOut className="mr-2.5 h-4 w-4 flex-shrink-0" />
            {loggingOut ? t('dashboard.loggingOut') : t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          {/* Drawer Panel */}
          <div
            ref={drawerRef}
            tabIndex={-1}
            className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-50 focus:outline-none"
          >
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
              <MarketplaceBrand
                href="/hub/dashboard"
                marketplaceName={marketplaceSettings.marketplace_name}
                marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
                marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
                marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
                logoSurface="light"
                imageClassName="h-8 max-w-[140px] object-contain"
                textClassName="text-lg font-bold text-[#B91C1C]"
              />
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Fermer le menu"
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 overflow-y-auto">{renderNavLinks()}</nav>
            <div className="p-4 border-t border-slate-200">
              <Link
                href="/hub"
                className="flex items-center w-full px-3 py-2 text-xs font-semibold text-slate-600 rounded-lg hover:bg-slate-100 transition-colors mb-1"
              >
                ← {t('common.back')}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center w-full px-3 py-2 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                <LogOut className="mr-2.5 h-4 w-4 flex-shrink-0" />
                {loggingOut ? t('dashboard.loggingOut') : t('nav.logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Ouvrir le menu de navigation"
              aria-expanded={mobileDrawerOpen}
              className="md:hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">{t('dashboard.title')}</h2>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <LocaleSwitcher />
            <Link
              href="/hub/dashboard/select-store"
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-[#B91C1C] hover:text-[#B91C1C]"
            >
              <Store className="h-4 w-4 text-[#B91C1C]" />
              Mes boutiques
            </Link>
            {storeCount === 1 && canCreateFreeStore && (
              <Link
                href="/hub/dashboard/create-store"
                className="hidden sm:inline-flex items-center gap-2 rounded-full bg-[#B91C1C] px-3 py-2 text-xs font-black text-white transition hover:bg-[#991B1B]"
              >
                <Plus className="h-4 w-4" />
                Create free store
              </Link>
            )}
            <Link
              href="/hub/dashboard/my-subscription-orders"
              title="Platform Orders & Invoices"
              aria-label="Platform Orders & Invoices"
              className={`relative inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border transition ${
                pathname.startsWith('/hub/dashboard/my-subscription-orders')
                  ? 'border-amber-400 bg-amber-50 text-amber-600'
                  : 'border-slate-200 text-slate-500 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600'
              }`}
            >
              <ReceiptText className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <Link
              href="/hub/dashboard/notifications"
              aria-label={t('dashboard.sidebar.notifications')}
              className={`relative inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border transition ${
                pathname.startsWith('/hub/dashboard/notifications')
                  ? 'border-[#B91C1C]/20 bg-[#B91C1C]/10 text-[#B91C1C]'
                  : 'border-slate-200 text-slate-500 hover:border-[#B91C1C]/30 hover:bg-[#B91C1C]/10 hover:text-[#B91C1C]'
              }`}
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <div className="hidden lg:block text-xs sm:text-sm font-medium text-slate-600">
              {t('dashboard.top.welcome', { name: displayName })}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                className="h-9 w-9 rounded-full bg-[#B91C1C]/15 flex items-center justify-center text-[#B91C1C] font-bold ring-1 ring-[#B91C1C]/10 transition hover:bg-[#B91C1C]/20"
              >
                {initials}
              </button>
              {accountMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 text-sm shadow-2xl shadow-slate-900/15"
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="font-black text-slate-900">{displayName}</p>
                    {currentUser?.email && (
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
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
                      className={`flex items-center gap-3 px-4 py-3 font-bold transition ${
                        pathname === item.href || pathname.startsWith(`${item.href}/`)
                          ? 'bg-[#B91C1C]/10 text-[#B91C1C]'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-[#B91C1C]'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  ))}
                  <Link
                    href="/hub/dashboard/select-store"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 font-bold text-slate-700 hover:bg-slate-50 hover:text-[#B91C1C] transition"
                  >
                    <Store className="h-4 w-4 text-[#B91C1C]" />
                    <span>Mes boutiques (Select store)</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    role="menuitem"
                    className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" />
                    {loggingOut ? t('dashboard.loggingOut') : t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {setupPercentage < 100 && (
          <div className="sticky top-16 z-20 border-b border-amber-100 bg-white/95 px-4 sm:px-8 py-3 backdrop-blur">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 text-sm">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#B91C1C]/10 text-[#B91C1C]">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-black text-slate-900">Store setup progress</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {setupProgress.completed} of {setupProgress.total} launch steps completed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 lg:w-80">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#B91C1C]"
                    style={{ width: `${setupPercentage}%` }}
                  />
                </div>
                <span className="text-xs font-black text-[#B91C1C]">{setupPercentage}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="p-4 sm:p-8 pt-4 flex-1 overflow-auto bg-slate-100 text-slate-900">
          {children}
        </div>
      </main>
    </div>
  );
}
