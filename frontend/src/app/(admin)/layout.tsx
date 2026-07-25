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
  Crown,
  Sparkles,
  MessageSquare,
  LogOut,
  Tags,
  Store,
  ChevronDown,
  ChevronRight,
  Activity,
  Megaphone,
  FolderOpen,
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
  marketplace_logo_light_url?: string;
  marketplace_logo_dark_url?: string;
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
  const { dir, locale, setLocale, t } = useLocale();
  const [authorized, setAuthorized] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [marketplaceSettings, setMarketplaceSettings] = useState<MarketplaceSettings>({});
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

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

  const navSections = [
    {
      title: t('admin.sidebar.overview') || 'OVERVIEW',
      items: [
        { href: '/dashboard', label: t('admin.sidebar.dashboard') || 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: t('admin.sidebar.commerceAndVendors') || 'COMMERCE & VENDORS',
      items: [
        {
          label: t('admin.sidebar.commerceAndVendors') || 'Stores & Sellers',
          icon: Store,
          href: '/stores',
          subItems: [
            { href: '/stores', label: t('admin.sidebar.storesOverview') || 'Stores Overview' },
            { href: '/users', label: t('admin.sidebar.vendors') || 'Vendors' },
            { href: '/buyers', label: t('admin.sidebar.buyersDirectory') || 'Buyers Directory' },
            { href: '/kyc', label: t('admin.sidebar.kyc') || 'KYC Verifications' },
            { href: '/mandats', label: t('admin.sidebar.mandats') || 'Mandats' },
            { href: '/withdrawals', label: t('admin.sidebar.withdrawals') || 'Withdrawals' },
          ],
        },
      ],
    },
    {
      title: t('admin.sidebar.catalogAndContent') || 'CATALOG & CONTENT',
      items: [
        {
          label: t('admin.sidebar.catalogAndContent') || 'Marketplace Content',
          icon: Tags,
          href: '/marketplace-categories',
          subItems: [
            { href: '/marketplace-categories', label: t('admin.sidebar.marketplaceCategories') || 'Marketplace Categories' },
            { href: '/platform-media', label: t('admin.sidebar.platformMedia') || 'Platform Media' },
            { href: '/messages', label: t('admin.sidebar.customerMessages') || 'Customer Messages' },
            { href: '/reports', label: t('admin.sidebar.reports') || 'Reports & Cases' },
          ],
        },
      ],
    },
    {
      title: t('admin.sidebar.growthAndAds') || 'GROWTH & MONETIZATION',
      items: [
        {
          label: t('admin.sidebar.growthAndAds') || 'Monetization & Ads',
          icon: Megaphone,
          href: '/ads',
          subItems: [
            { href: '/ads', label: t('admin.sidebar.pandaAds') || 'PandaMarket Ads' },
            { href: '/plans', label: t('admin.sidebar.plans') || 'Subscription Plans' },
            { href: '/ai-costs', label: t('admin.sidebar.aiCosts') || 'AI Usage Costs' },
          ],
        },
      ],
    },
    {
      title: t('admin.sidebar.systemAndLogs') || 'SYSTEM & LOGS',
      items: [
        {
          label: t('admin.sidebar.systemAndLogs') || 'Audit & System Logs',
          icon: Activity,
          href: '/audit-log',
          subItems: [
            { href: '/audit-log', label: t('admin.sidebar.adminLogs') || 'Admin Logs' },
            { href: '/seller-audit-log', label: t('admin.sidebar.sellerLogs') || 'Seller Logs' },
            { href: '/buyer-audit-log', label: t('admin.sidebar.buyerLogs') || 'Buyer Logs' },
            { href: '/system-logs', label: t('admin.sidebar.serverLogs') || 'Server Logs' },
          ],
        },
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
          {t('admin.checkingAccess') || 'Checking access...'}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(180,83,9,0.10),transparent_28%),linear-gradient(180deg,#fafaf9_0%,#eef2f7_100%)] text-gray-900" dir={dir}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 z-40 flex w-60 flex-col overflow-hidden bg-white text-slate-800 shadow-xl shadow-slate-900/10 ${
        dir === 'rtl' ? 'right-0 border-l border-slate-200/90' : 'left-0 border-r border-slate-200/90'
      }`}>
        {/* Pure White Brand Header */}
        <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 py-4 text-slate-950">
          <MarketplaceBrand
            href="/dashboard"
            marketplaceName={marketplaceSettings.marketplace_name}
            marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
            marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
            marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
            logoSurface="light"
            imageClassName="h-8 max-w-[150px] object-contain"
            textClassName="text-base font-black text-slate-900"
            fallbackMarkClassName="text-2xl font-black text-[#B91C1C]"
          />
          <div className="mt-2 flex items-center justify-between gap-1.5 px-0.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Superadmin</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-bold text-slate-600">
              {(['fr', 'en', 'ar'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  className={`rounded-md px-1.5 py-0.5 uppercase transition-all ${
                    locale === l ? 'bg-[#B91C1C] text-white font-black shadow-xs' : 'hover:bg-slate-200/60'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">{section.title}</p>
              {section.items.map((item) => {
                if ('subItems' in item && item.subItems) {
                  const isOpen = openMenus[item.label] ?? false;
                  const isActiveChild = item.subItems.some((sub) => pathname === sub.href || pathname?.startsWith(sub.href + '/'));
                  const isActiveParent = item.href && (pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href + '/')));

                  return (
                    <div key={item.label} className="space-y-0.5">
                      <div
                        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold transition-all ${
                          isActiveParent || isActiveChild
                            ? 'bg-amber-50 text-[#B91C1C] border-l-2 border-[#B91C1C]'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Link
                          href={item.href}
                          className="flex flex-1 items-center gap-2.5 truncate py-0.5"
                        >
                          <item.icon className={`w-4 h-4 shrink-0 ${isActiveParent || isActiveChild ? 'text-[#B91C1C]' : 'text-slate-400'}`} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMenu(item.label);
                          }}
                          title="Toggle submenu"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors ml-1"
                        >
                          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {isOpen && (
                        <div className={`flex flex-col gap-0.5 pt-0.5 ${dir === 'rtl' ? 'pr-6 pl-1' : 'pl-6 pr-1'}`}>
                          {item.subItems.map((sub) => {
                            const isSubActive = pathname === sub.href || pathname?.startsWith(sub.href + '/');
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all flex items-center gap-2 ${
                                  isSubActive
                                    ? 'bg-red-50 text-[#B91C1C] font-bold border-l-2 border-[#B91C1C] pl-2'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                              >
                                <span className="h-1 w-1 rounded-full bg-slate-400 shrink-0" />
                                <span className="truncate">{sub.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.href}
                    href={item.href!}
                    className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#B91C1C] to-red-700 text-white shadow-md shadow-red-900/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Area */}
        <div className="mt-auto shrink-0 border-t border-slate-200/80 bg-slate-50/80 p-3 space-y-1">
          <Link
            href="/settings"
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
              pathname === '/settings' || pathname?.startsWith('/settings/')
                ? 'bg-gradient-to-r from-[#B91C1C] to-red-700 text-white shadow-md'
                : 'text-slate-700 hover:bg-white hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4 text-amber-600" />
            <span>{t('admin.sidebar.settings') || 'Settings'}</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
          >
            <LogOut className="w-4 h-4" />
            <span>{loggingOut ? (t('admin.loggingOut') || 'Logging out...') : (t('nav.logout') || 'Logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`${dir === 'rtl' ? 'mr-60 ml-0' : 'ml-60 mr-0'} min-h-screen overflow-auto`}>
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 px-8 py-4 shadow-sm shadow-slate-900/5 backdrop-blur-xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">{t('admin.title') || 'Admin Dashboard'}</h2>
            <p className="text-xs font-medium text-gray-500">{t('admin.top.subtitle') || 'Welcome back to your control panel'}</p>
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
