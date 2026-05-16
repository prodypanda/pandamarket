'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Receipt,
  Flag,
  Users,
  Settings,
  Wallet,
  ScrollText,
  Crown,
  Sparkles,
  MessageSquare,
  LogOut,
  Tags,
  Store,
  ChevronDown,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import { LocaleSwitcher } from '../../components/LocaleSwitcher';
import { MarketplaceBrand } from '../../components/MarketplaceBrand';

interface CurrentUser {
  role?: string;
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [loggingOut, setLoggingOut] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [marketplaceSettings, setMarketplaceSettings] = useState<MarketplaceSettings>({});
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'Logs': pathname?.includes('log') || false,
  });

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => {
    let cancelled = false;

    async function verifyAdminAccess() {
      try {
        const res = await fetchWithCsrf('/api/pd/auth/me', { credentials: 'include' });
        if (!res.ok) {
          window.location.href = `/login/admin?next=${encodeURIComponent(pathname || '/dashboard')}`;
          return;
        }

        const data = await res.json();
        const user = (data.user || data.data) as CurrentUser | null;
        if (!isAdminRole(user?.role)) {
          window.location.href = isVendorRole(user?.role) ? '/hub/dashboard' : '/hub';
          return;
        }

        if (!cancelled) {
          setAuthorized(true);
        }
      } catch {
        window.location.href = `/login/admin?next=${encodeURIComponent(pathname || '/dashboard')}`;
      }
    }

    verifyAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

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

  const navItems = [
    { href: '/dashboard', label: t('admin.sidebar.dashboard'), icon: LayoutDashboard },
    { href: '/kyc', label: t('admin.sidebar.kyc'), icon: ShieldCheck },
    { href: '/mandats', label: t('admin.sidebar.mandats'), icon: Receipt },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/reports', label: t('admin.sidebar.reports'), icon: Flag },
    { href: '/stores', label: 'Stores', icon: Store },
    { href: '/users', label: t('admin.sidebar.vendors'), icon: Users },
    { href: '/buyers', label: 'Buyers', icon: Users },
    { href: '/withdrawals', label: t('admin.sidebar.withdrawals'), icon: Wallet },
    { href: '/plans', label: t('admin.sidebar.plans'), icon: Crown },
    { href: '/marketplace-categories', label: t('admin.sidebar.marketplaceCategories'), icon: Tags },
    { href: '/ai-costs', label: t('admin.sidebar.aiCosts'), icon: Sparkles },
    {
      label: 'Logs',
      icon: Activity,
      subItems: [
        { href: '/audit-log', label: 'Administration' },
        { href: '/seller-audit-log', label: 'Seller' },
        { href: '/buyer-audit-log', label: 'Buyer' },
        { href: '/system-logs', label: 'Server' },
      ],
    },
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
      window.location.href = '/login/admin';
    }
  };

  if (!authorized) {
    return (
      <div className="admin-shell min-h-screen flex items-center justify-center bg-slate-100 text-gray-900">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold shadow-xl">
          {t('admin.checkingAccess')}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(180,83,9,0.10),transparent_28%),linear-gradient(180deg,#fafaf9_0%,#eef2f7_100%)] text-gray-900">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden bg-[#0F0F23] text-white shadow-2xl shadow-slate-950/20">
        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-7 text-slate-950">
          <MarketplaceBrand
            href="/dashboard"
            marketplaceName={marketplaceSettings.marketplace_name}
            marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
            className="min-h-[56px]"
            imageClassName="h-14 max-w-[210px] object-contain"
            textClassName="text-xl font-black text-slate-950"
            fallbackMarkClassName="text-3xl font-black text-[#B91C1C]"
          />
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            if (item.subItems) {
              const isOpen = openMenus[item.label];
              const isActiveChild = item.subItems.some((sub) => pathname === sub.href || pathname?.startsWith(sub.href + '/'));

              return (
                <div key={item.label} className="mx-3 mb-1">
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.label)}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm font-semibold transition-all ${
                      isActiveChild || isOpen
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-5 h-5 ${isActiveChild ? 'text-amber-300' : ''}`} />
                      {item.label}
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {isOpen && (
                    <div className="mt-1 flex flex-col gap-1 pl-11 pr-3">
                      {item.subItems.map((sub) => {
                        const isSubActive = pathname === sub.href || pathname?.startsWith(sub.href + '/');
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                              isSubActive
                                ? 'bg-amber-300/15 text-amber-200'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`mx-3 mb-1 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-white/10 text-amber-200 shadow-inner shadow-white/5'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto shrink-0 border-t border-white/10 bg-[#09091A] p-4">
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition-colors ${
              pathname === '/settings' || pathname?.startsWith('/settings/')
                ? 'bg-white text-[#0F0F23]'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
            {t('admin.sidebar.settings')}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-red-200 transition-colors hover:bg-red-500/10 hover:text-amber-100 disabled:opacity-60"
          >
            <LogOut className="w-5 h-5" />
            {loggingOut ? t('admin.loggingOut') : t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen overflow-auto">
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 px-8 py-4 shadow-sm shadow-slate-900/5 backdrop-blur-xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">{t('admin.title')}</h2>
            <p className="text-xs font-medium text-gray-500">{t('admin.top.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <Link
              href="/hub"
              className="inline-flex items-center gap-2 rounded-full bg-[#B91C1C] px-4 py-2 text-sm font-black text-white shadow-lg shadow-red-900/15 transition-all hover:-translate-y-0.5 hover:bg-[#991B1B]"
            >
              <Store className="h-4 w-4" />
              {t('admin.top.goToHub')}
            </Link>
            <span className="hidden text-sm font-semibold text-gray-500 lg:inline">admin@pandamarket.tn</span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-full px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
            >
              {loggingOut ? t('admin.loggingOut') : t('nav.logout')}
            </button>
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
