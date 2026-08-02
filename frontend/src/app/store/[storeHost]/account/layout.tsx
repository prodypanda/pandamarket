'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, MapPin, Package, Shield, LogOut, ArrowLeft, Store, Download } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { resolveThemeColors, themes, type ThemeCustomization, type ThemeId } from '@/lib/themes';

interface StoreData {
  id: string;
  name: string;
  theme_id: ThemeId;
  settings?: {
    colors?: { primary?: string; secondary?: string };
    themeCustomization?: ThemeCustomization;
  };
}

interface CustomerData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
}

export default function StorefrontAccountLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const storeHost = decodeURIComponent(params.storeHost as string);

  const [store, setStore] = useState<StoreData | null>(null);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeBase, setRouteBase] = useState('');

  useEffect(() => {
    if (window.location.pathname.startsWith('/store/')) {
      setRouteBase(`/store/${encodeURIComponent(storeHost)}`);
    }
  }, [storeHost]);

  useEffect(() => {
    async function loadAuthAndStore() {
      try {
        const [storeRes, customerRes] = await Promise.all([
          fetchWithCsrf(`/api/pd/stores/by-host/${encodeURIComponent(storeHost)}`),
          fetchWithCsrf('/api/pd/storefront/account/me'),
        ]);

        if (storeRes.ok) {
          const data = await storeRes.json();
          setStore(data.store);
        }

        if (customerRes.ok) {
          const data = await customerRes.json();
          setCustomer(data.customer || data.data);
        } else {
          // Redirect to login if unauthenticated
          router.replace(`${routeBase}/login?next=${encodeURIComponent(pathname)}`);
        }
      } catch {
        router.replace(`${routeBase}/login?next=${encodeURIComponent(pathname)}`);
      } finally {
        setLoading(false);
      }
    }

    loadAuthAndStore();
  }, [storeHost, routeBase, pathname, router]);

  async function handleLogout() {
    try {
      await fetchWithCsrf('/api/pd/storefront/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    router.replace(`${routeBase}/login`);
    router.refresh();
  }

  const activeTheme = store?.theme_id ? themes[store.theme_id] || themes.classic : themes.classic;
  const themeCustomization = (store?.settings?.themeCustomization || {}) as ThemeCustomization;
  const resolvedColors = resolveThemeColors(activeTheme, themeCustomization);
  const primaryColor = store?.settings?.colors?.primary || resolvedColors.primary;
  const pageBackground = resolvedColors.background;
  const textColor = resolvedColors.text;
  const mutedTextColor = `${textColor}99`;
  const surfaceColor = store?.settings?.colors?.secondary || resolvedColors.secondary;
  const borderColor = `${primaryColor}20`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2" style={{ borderColor: primaryColor }} />
      </div>
    );
  }

  const navItems = [
    { href: `${routeBase}/account`, label: 'Vue d’ensemble', icon: User },
    { href: `${routeBase}/account/profile`, label: 'Profil & Email', icon: User },
    { href: `${routeBase}/account/addresses`, label: 'Adresses', icon: MapPin },
    { href: `${routeBase}/account/orders`, label: 'Mes Commandes', icon: Package },
    { href: `${routeBase}/account/downloads`, label: 'Téléchargements & Licences', icon: Download },
    { href: `${routeBase}/account/security`, label: 'Sécurité & Sessions', icon: Shield },
  ];

  return (
    <div className={`min-h-screen ${activeTheme.typography.fontFamily}`} style={{ backgroundColor: pageBackground, color: textColor }}>
      {/* Header Bar */}
      <header className="border-b sticky top-0 z-40 bg-white/90 backdrop-blur-md" style={{ borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href={routeBase || '/'} className="flex items-center gap-2 font-bold text-lg" style={{ color: primaryColor }}>
            <Store className="w-5 h-5" />
            {store?.name || storeHost}
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline font-medium" style={{ color: mutedTextColor }}>
              {customer?.first_name ? `Bonjour, ${customer.first_name}` : customer?.email}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold text-red-600 hover:bg-red-50 border-red-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="rounded-2xl border p-4 sticky top-24" style={{ backgroundColor: surfaceColor, borderColor }}>
              <div className="mb-4 pb-3 border-b" style={{ borderColor }}>
                <p className="font-bold text-base line-clamp-1" style={{ color: textColor }}>
                  {customer?.first_name ? `${customer.first_name} ${customer.last_name || ''}` : 'Compte Client'}
                </p>
                <p className="text-xs line-clamp-1" style={{ color: mutedTextColor }}>{customer?.email}</p>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== `${routeBase}/account` && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'hover:bg-gray-100/50'
                      }`}
                      style={isActive ? { backgroundColor: primaryColor } : { color: textColor }}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-6 pt-4 border-t" style={{ borderColor }}>
                <Link
                  href={routeBase || '/'}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Retour à la boutique
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-3">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
