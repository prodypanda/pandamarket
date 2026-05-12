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
  subdomain?: string | null;
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

  const navigation = [
    { name: t('dashboard.sidebar.overview'), href: '/hub/dashboard', icon: LayoutDashboard },
    { name: t('dashboard.sidebar.products'), href: '/hub/dashboard/products', icon: Package },
    { name: t('dashboard.sidebar.categories'), href: '/hub/dashboard/categories', icon: Tags },
    { name: t('dashboard.sidebar.orders'), href: '/hub/dashboard/orders', icon: ShoppingCart },
    { name: 'Messages', href: '/hub/dashboard/messages', icon: MessageSquare },
    { name: t('dashboard.sidebar.wallet'), href: '/hub/dashboard/wallet', icon: Wallet },
    { name: t('dashboard.sidebar.pageBuilder'), href: '/hub/dashboard/page-builder', icon: LayoutTemplate },
    { name: t('dashboard.sidebar.aiTools'), href: '/hub/dashboard/ai', icon: Sparkles },
    { name: t('dashboard.sidebar.verification'), href: '/hub/dashboard/kyc', icon: Shield },
    { name: t('dashboard.sidebar.subscription'), href: '/hub/dashboard/subscription', icon: Crown },
    { name: t('dashboard.sidebar.apiKeys'), href: '/hub/dashboard/api-keys', icon: Key },
    { name: t('dashboard.sidebar.webhooks'), href: '/hub/dashboard/webhooks', icon: Webhook },
    { name: t('dashboard.sidebar.paymentConfig'), href: '/hub/dashboard/payment-config', icon: CreditCard },
    { name: t('dashboard.sidebar.reports'), href: '/hub/dashboard/reports', icon: Flag },
    { name: t('dashboard.sidebar.notifications'), href: '/hub/dashboard/notifications', icon: Bell },
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
              textClassName="text-xl font-bold text-[#16C784]"
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
            textClassName="text-xl font-bold text-[#16C784]"
          />
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-[#16C784]/10 hover:text-[#0f9f6e] transition-colors"
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">{t('dashboard.title')}</h2>
          <div className="flex items-center space-x-4">
            <LocaleSwitcher />
            {storeCount > 1 && (
              <Link
                href="/hub/dashboard/select-store"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-[#16C784] hover:text-[#0f9f6e]"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Switch store
              </Link>
            )}
            {storeCount === 1 && canCreateFreeStore && (
              <Link
                href="/hub/dashboard/create-store"
                className="inline-flex items-center gap-2 rounded-full bg-[#16C784] px-3 py-2 text-xs font-black text-white transition hover:bg-[#14b876]"
              >
                <Plus className="h-4 w-4" />
                Create free store
              </Link>
            )}
            <div className="text-sm font-medium text-slate-600">{t('dashboard.top.welcome', { name: displayName })}</div>
            <div className="h-8 w-8 rounded-full bg-[#16C784]/15 flex items-center justify-center text-[#0f9f6e] font-bold">
              {initials}
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="p-8 flex-1 overflow-auto bg-slate-100 text-slate-900">
          {children}
        </div>
      </main>
    </div>
  );
}
