'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Settings, 
  Store, 
  Wallet, 
  ShieldCheck, 
  Globe2, 
  SlidersHorizontal, 
  CreditCard, 
  Crown, 
  Truck, 
  Mail,
  Shield,
  BarChart3
} from 'lucide-react';

const tabs = [
  { id: 'marketplace', label: 'Marketplace & Hero', description: 'Identity, branding, themes, megamenu & hero builder', icon: Globe2 },
  { id: 'commerce', label: 'Commerce & Catalog', description: 'Product rules, moderation, reviews, AI & builder', icon: SlidersHorizontal },
  { id: 'finance', label: 'Finance & Payments', description: 'Gateways, Flouci, Konnect, commissions & payouts', icon: CreditCard },
  { id: 'shipping', label: 'Shipping & Delivery', description: 'Aramex, La Poste, platform delivery & zone rates', icon: Truck },
  { id: 'security', label: 'Security & Governance', description: 'Login security, password rules, custom domains & 2FA', icon: ShieldCheck },
  { id: 'operations', label: 'Platform Operations', description: 'Maintenance mode, storage limits & chat quotas', icon: Shield },
  { id: 'integrations', label: 'Integrations & Webmaster', description: 'GA4, GTM, Meta Pixel, Cloudflare & Search Console', icon: BarChart3 },
  { id: 'plans', label: 'Subscription Plans', description: 'Seller plans, prices, quotas and feature matrix', icon: Crown },
  { id: 'email', label: 'Transactional Emails', description: 'SMTP provider, credentials, test sender & templates', icon: Mail },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Platform Settings</h1>
          <p className="mt-2 text-sm text-slate-500">
            Configure core marketplace parameters, payment gateways, theme rules, and operational limits.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="w-full lg:w-72 lg:flex-shrink-0">
          <nav className="flex space-x-2 overflow-x-auto pb-4 lg:flex-col lg:space-x-0 lg:space-y-1 lg:pb-0" aria-label="Tabs">
            {tabs.map((tab) => {
              const href = `/settings/${tab.id}`;
              const isActive = pathname.startsWith(href) || (pathname === '/settings' && tab.id === 'marketplace');
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.id}
                  href={href}
                  className={`group flex flex-col rounded-xl px-4 py-3 transition-all duration-300 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        isActive ? 'bg-white/10 text-white' : 'bg-slate-200/50 text-slate-400 group-hover:bg-white group-hover:text-slate-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-bold">{tab.label}</span>
                  </div>
                  <span
                    className={`mt-1.5 pl-11 text-[11px] leading-relaxed hidden lg:block ${
                      isActive ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {tab.description}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
