'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  Mail,
  LogOut,
  Tags,
  Store,
} from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = [
    { href: '/dashboard', label: t('admin.sidebar.dashboard'), icon: LayoutDashboard },
    { href: '/kyc', label: t('admin.sidebar.kyc'), icon: ShieldCheck },
    { href: '/mandats', label: t('admin.sidebar.mandats'), icon: Receipt },
    { href: '/reports', label: t('admin.sidebar.reports'), icon: Flag },
    { href: '/users', label: t('admin.sidebar.vendors'), icon: Users },
    { href: '/withdrawals', label: t('admin.sidebar.withdrawals'), icon: Wallet },
    { href: '/plans', label: t('admin.sidebar.plans'), icon: Crown },
    { href: '/marketplace-categories', label: 'Marketplace Categories', icon: Tags },
    { href: '/ai-costs', label: t('admin.sidebar.aiCosts'), icon: Sparkles },
    { href: '/audit-log', label: t('admin.sidebar.auditLog'), icon: ScrollText },
    { href: '/smtp-config', label: t('admin.sidebar.smtpConfig'), icon: Mail },
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
      window.location.href = '/login';
    }
  };

  return (
    <div className="admin-shell min-h-screen flex bg-[radial-gradient(circle_at_top_left,rgba(22,199,132,0.10),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F0F23] text-white flex flex-col shadow-2xl shadow-slate-950/20">
        <div className="p-6 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-black text-[#16C784]">🐼</span>
            <span className="text-lg font-bold">PandaMarket</span>
          </Link>
          <p className="text-xs text-gray-400 mt-1">{t('admin.title')}</p>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mx-3 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? 'text-[#16C784] bg-white/10 shadow-inner shadow-white/5'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-2 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
            {t('admin.sidebar.settings')}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 w-full px-2 py-2 text-sm text-red-300 hover:text-red-200 transition-colors disabled:opacity-60"
          >
            <LogOut className="w-5 h-5" />
            {loggingOut ? 'Logging out...' : t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 px-8 py-4 shadow-sm shadow-slate-900/5 backdrop-blur-xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">{t('admin.title')}</h2>
            <p className="text-xs font-medium text-gray-500">Control center · marketplace operations</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/hub"
              className="inline-flex items-center gap-2 rounded-full bg-[#16C784] px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition-all hover:-translate-y-0.5 hover:bg-[#14b876]"
            >
              <Store className="h-4 w-4" />
              Go to Hub
            </Link>
            <span className="hidden text-sm font-semibold text-gray-500 lg:inline">admin@pandamarket.tn</span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-full px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
            >
              {loggingOut ? 'Logging out...' : t('nav.logout')}
            </button>
            <div className="w-8 h-8 rounded-full bg-[#16C784] flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
