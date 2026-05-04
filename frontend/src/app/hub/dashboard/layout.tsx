'use client';

import Link from 'next/link';
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
  LayoutTemplate,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLocale();

  const navigation = [
    { name: t('dashboard.sidebar.overview'), href: '/hub/dashboard', icon: LayoutDashboard },
    { name: t('dashboard.sidebar.products'), href: '/hub/dashboard/products', icon: Package },
    { name: t('dashboard.sidebar.orders'), href: '/hub/dashboard/orders', icon: ShoppingCart },
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex fixed h-full z-10">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/hub/dashboard" className="text-xl font-bold text-[#16C784]">
            🐼 PandaMarket
          </Link>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-[#16C784]/5 hover:text-[#16C784] transition-colors"
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <Link href="/hub" className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-500 rounded-md hover:bg-gray-100 transition-colors mb-1">
            ← {t('common.back')}
          </Link>
          <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors">
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-gray-800">{t('dashboard.title')}</h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">Welcome, Vendor</div>
            <div className="h-8 w-8 rounded-full bg-[#16C784]/10 flex items-center justify-center text-[#16C784] font-bold">
              V
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="p-8 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
