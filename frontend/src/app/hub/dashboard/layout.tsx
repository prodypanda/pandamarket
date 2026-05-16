'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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

interface CurrentStore {
  id?: string;
  name?: string;
  status?: string | null;
  is_verified?: boolean | null;
  theme_id?: string | null;
  subscription_plan?: string | null;
  settings?: {
    logo_url?: string | null;
    store_description?: string | null;
  } | null;
  payment_config?: unknown;
  subdomain?: string | null;
  custom_domain?: string | null;
}

interface MarketplaceSettings {
  marketplace_name?: string;
  marketplace_logo_url?: string;
}

function isAdminRole(role?: string) {
  return role === 'admin' || role === 'super_admin' || role === 'Admin' || role === 'SuperAdmin';
}

function isVendorRole(role?: string) {
  return role === 'vendor' || role === 'Vendor';
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
  const [setupProgress, setSetupProgress] = useState({ completed: 1, total: 6 });
  const isStoreSelectorPage = pathname === '/hub/dashboard/select-store';
  const isStoreCreatePage = pathname === '/hub/dashboard/create-store';
  const isStoreSetupPage = isStoreSelectorPage || isStoreCreatePage;

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
        const stores = Array.isArray(data.stores) ? data.stores as CurrentStore[] : [];
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

  useEffect(() => {
    let cancelled = false;
    async function fetchSetupProgress() {
      if (!authorized || isStoreSetupPage) return;
      try {
        const [storeRes, productsRes, verificationRes] = await Promise.allSettled([
          fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/stores/me/products?limit=1', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/verification/status', { credentials: 'include' }),
        ]);
        if (cancelled) return;
        const steps = [
          Boolean(currentStore?.id),
          false,
          false,
          false,
          false,
          false,
        ];
        if (storeRes.status === 'fulfilled' && storeRes.value.ok) {
          const data = await storeRes.value.json();
          const store = data.store as CurrentStore | null;
          steps[1] = Boolean(store?.settings?.logo_url || store?.settings?.store_description);
          steps[2] = Boolean(store?.theme_id);
          steps[5] = Boolean(store?.payment_config);
        }
        if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
          const data = await productsRes.value.json();
          steps[4] = Number(data.meta?.total || 0) > 0;
        }
        if (verificationRes.status === 'fulfilled' && verificationRes.value.ok) {
          const data = await verificationRes.value.json();
          steps[3] = data.verification?.status === 'approved';
        }
        setSetupProgress({ completed: steps.filter(Boolean).length, total: steps.length });
      } catch {
        setSetupProgress((current) => current);
      }
    }
    fetchSetupProgress();
    return () => {
      cancelled = true;
    };
  }, [authorized, currentStore?.id, isStoreSetupPage]);

  const navigation = [
    { name: t('dashboard.sidebar.overview'), href: '/hub/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', href: '/hub/dashboard/analytics', icon: BarChart3 },
    { name: t('dashboard.sidebar.products'), href: '/hub/dashboard/products', icon: Package },
    { name: t('dashboard.sidebar.categories'), href: '/hub/dashboard/categories', icon: Tags },
    { name: 'Media', href: '/hub/dashboard/media', icon: ImageIcon },
    { name: t('dashboard.sidebar.orders'), href: '/hub/dashboard/orders', icon: ShoppingCart },
    { name: 'Messages', href: '/hub/dashboard/messages', icon: MessageSquare },
    { name: t('dashboard.sidebar.wallet'), href: '/hub/dashboard/wallet', icon: Wallet },
    { name: 'Financial', href: '/hub/dashboard/financial', icon: ReceiptText },
    { name: t('dashboard.sidebar.pageBuilder'), href: '/hub/dashboard/page-builder', icon: LayoutTemplate },
    { name: t('dashboard.sidebar.aiTools'), href: '/hub/dashboard/ai', icon: Sparkles },
    { name: t('dashboard.sidebar.verification'), href: '/hub/dashboard/kyc', icon: Shield },
    { name: t('dashboard.sidebar.subscription'), href: '/hub/dashboard/subscription', icon: Crown },
    { name: t('dashboard.sidebar.apiKeys'), href: '/hub/dashboard/api-keys', icon: Key },
    { name: t('dashboard.sidebar.webhooks'), href: '/hub/dashboard/webhooks', icon: Webhook },
    { name: t('dashboard.sidebar.paymentConfig'), href: '/hub/dashboard/payment-config', icon: CreditCard },
    { name: t('dashboard.sidebar.reports'), href: '/hub/dashboard/reports', icon: Flag },
    { name: t('dashboard.sidebar.settings'), href: '/hub/dashboard/settings', icon: Settings },
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
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'V';
  const setupPercentage = Math.round((setupProgress.completed / setupProgress.total) * 100);

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
              imageClassName="h-10 max-w-[170px] object-contain"
              textClassName="text-xl font-bold text-[#B91C1C]"
            />
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
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex fixed h-full z-10 shadow-sm">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <MarketplaceBrand
            href="/hub/dashboard"
            marketplaceName={marketplaceSettings.marketplace_name}
            marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
            imageClassName="h-10 max-w-[170px] object-contain"
            textClassName="text-xl font-bold text-[#B91C1C]"
          />
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            (() => {
              const active = pathname === item.href || (item.href !== '/hub/dashboard' && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    active
                      ? 'bg-[#B91C1C]/12 text-[#B91C1C] ring-1 ring-[#B91C1C]/15'
                      : 'text-slate-700 hover:bg-[#B91C1C]/10 hover:text-[#B91C1C]'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })()
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <Link href="/hub" className="flex items-center w-full px-3 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-100 transition-colors mb-1">
            ← {t('common.back')}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center w-full px-3 py-2 text-sm font-semibold text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
            {loggingOut ? t('dashboard.loggingOut') : t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">{t('dashboard.title')}</h2>
          <div className="flex items-center space-x-4">
            <LocaleSwitcher />
            {storeCount > 1 && (
              <Link
                href="/hub/dashboard/select-store"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-[#B91C1C] hover:text-[#B91C1C]"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Switch store
              </Link>
            )}
            {storeCount === 1 && canCreateFreeStore && (
              <Link
                href="/hub/dashboard/create-store"
                className="inline-flex items-center gap-2 rounded-full bg-[#B91C1C] px-3 py-2 text-xs font-black text-white transition hover:bg-[#991B1B]"
              >
                <Plus className="h-4 w-4" />
                Create free store
              </Link>
            )}
            <Link
              href="/hub/dashboard/notifications"
              aria-label={t('dashboard.sidebar.notifications')}
              className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                pathname.startsWith('/hub/dashboard/notifications')
                  ? 'border-[#B91C1C]/20 bg-[#B91C1C]/10 text-[#B91C1C]'
                  : 'border-slate-200 text-slate-500 hover:border-[#B91C1C]/30 hover:bg-[#B91C1C]/10 hover:text-[#B91C1C]'
              }`}
            >
              <Bell className="h-5 w-5" />
            </Link>
            <div className="text-sm font-medium text-slate-600">{t('dashboard.top.welcome', { name: displayName })}</div>
            <div className="h-8 w-8 rounded-full bg-[#B91C1C]/15 flex items-center justify-center text-[#B91C1C] font-bold">
              {initials}
            </div>
          </div>
        </header>
        {setupPercentage < 100 && (
          <div className="sticky top-16 z-20 border-b border-amber-100 bg-white/95 px-8 py-3 backdrop-blur">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 text-sm">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#B91C1C]/10 text-[#B91C1C]">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-black text-slate-900">Store setup progress</p>
                  <p className="text-xs font-semibold text-slate-500">{setupProgress.completed} of {setupProgress.total} launch steps completed</p>
                </div>
              </div>
              <div className="flex items-center gap-3 lg:w-80">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#B91C1C]" style={{ width: `${setupPercentage}%` }} />
                </div>
                <span className="text-xs font-black text-[#B91C1C]">{setupPercentage}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="p-8 pt-2 flex-1 overflow-auto bg-slate-100 text-slate-900">
          {children}
        </div>
      </main>
    </div>
  );
}
