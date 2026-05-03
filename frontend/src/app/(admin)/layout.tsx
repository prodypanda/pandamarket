'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldCheck,
  Receipt,
  Flag,
  Users,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/kyc', label: 'KYC Queue', icon: ShieldCheck },
  { href: '/mandats', label: 'Mandats', icon: Receipt },
  { href: '/reports', label: 'Reports', icon: Flag },
  { href: '/users', label: 'Vendors', icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F0F23] text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-black text-[#16C784]">🐼</span>
            <span className="text-lg font-bold">PandaMarket</span>
          </Link>
          <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#16C784] bg-white/5 border-l-3 border-[#16C784]'
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
            Settings
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">admin@pandamarket.tn</span>
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
