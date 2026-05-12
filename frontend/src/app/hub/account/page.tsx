'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FileText, Heart, Loader2, LogOut, MapPin, MessageSquare, Package, ShoppingBag, User } from 'lucide-react';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import { useMarketplaceTheme } from '../../../hooks/useMarketplaceTheme';
import { fetchWithCsrf } from '../../../lib/api';

interface CurrentUser {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  store_id?: string | null;
}

interface OrderSummary {
  id: string;
  status: string;
  total: string;
  created_at: string;
}

export default function BuyerAccountPage() {
  const { settings, classes, isAliExpress } = useMarketplaceTheme();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const accentText = isAliExpress ? 'text-[#ff4747]' : 'text-[#16C784]';
  const accentBg = isAliExpress ? 'bg-[#ff4747]' : 'bg-[#16C784]';

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const userRes = await fetch('/api/pd/auth/me', { credentials: 'include' });
        if (!userRes.ok) {
          window.location.href = '/login/buyer?next=/hub/account';
          return;
        }

        const userData = await userRes.json();
        const currentUser = (userData.user || userData.data || null) as CurrentUser | null;
        const role = currentUser?.role?.toLowerCase();
        if (role === 'admin' || role === 'super_admin') {
          window.location.href = '/dashboard';
          return;
        }
        if (role === 'vendor' || currentUser?.store_id) {
          window.location.href = '/hub/dashboard';
          return;
        }

        if (!cancelled) setUser(currentUser);

        const ordersRes = await fetch('/api/pd/orders/me?page=1&limit=3', { credentials: 'include' });
        if (!cancelled && ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData.data || []);
        }
      } catch {
        if (!cancelled) window.location.href = '/login/buyer?next=/hub/account';
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      title: 'Mes informations',
      description: 'Modifier votre profil, téléphone et adresses.',
      href: '/hub/profile',
      icon: User,
    },
    {
      title: 'Mes commandes',
      description: 'Voir le suivi, les paiements et les téléchargements.',
      href: '/hub/orders',
      icon: Package,
    },
    {
      title: 'Mes dossiers',
      description: 'Suivre vos signalements et ajouter des preuves.',
      href: '/hub/cases',
      icon: FileText,
    },
    {
      title: 'Mes messages',
      description: 'Discuter avec les vendeurs ou contacter le support marketplace.',
      href: '/hub/messages',
      icon: MessageSquare,
    },
    {
      title: 'Ma wishlist',
      description: 'Retrouver les produits sauvegardés.',
      href: '/hub/wishlist',
      icon: Heart,
    },
    {
      title: 'Mon panier',
      description: 'Continuer ou finaliser vos achats.',
      href: '/hub/cart',
      icon: ShoppingBag,
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
      window.location.href = '/login/buyer';
    }
  };

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar
        marketplaceName={settings.marketplace_name}
        marketplaceLogoUrl={settings.marketplace_logo_url}
        marketplaceTheme={settings.marketplace_theme}
      />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <Loader2 className={`h-8 w-8 animate-spin ${accentText}`} />
          </div>
        ) : (
          <div className="space-y-8">
            <section className={`${classes.panel} overflow-hidden p-8`}>
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className={`text-sm font-black uppercase tracking-[0.2em] ${accentText}`}>Compte acheteur</p>
                  <h1 className="mt-3 text-3xl font-black text-gray-900 md:text-4xl">
                    Bonjour {user?.first_name || user?.email || 'client'}
                  </h1>
                  <p className="mt-3 max-w-2xl text-gray-500">
                    Gérez vos informations, vos adresses, vos commandes et vos articles sauvegardés depuis cet espace.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/hub/profile" className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-black text-white ${accentBg}`}>
                    Modifier mon profil
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    {loggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {loggingOut ? 'Déconnexion...' : 'Se déconnecter'}
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.href} href={card.href} className={`${classes.panel} group p-6 transition hover:-translate-y-1 hover:shadow-xl`}>
                    <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl text-white ${accentBg}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-black text-gray-900">{card.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-500">{card.description}</p>
                  </Link>
                );
              })}
            </section>

            <section className={`${classes.panel} p-6`}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Commandes récentes</h2>
                  <p className="text-sm text-gray-500">Les trois dernières commandes de votre compte.</p>
                </div>
                <Link href="/hub/orders" className={`text-sm font-bold ${accentText}`}>
                  Voir toutes
                </Link>
              </div>
              {orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
                  <MapPin className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                  Aucune commande récente.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <div key={order.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-mono text-sm font-bold text-gray-900">#{order.id.slice(-8)}</p>
                        <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{order.status}</span>
                        <span className="font-black text-gray-900">{Number(order.total).toFixed(3)} TND</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <HubFooter {...settings} />
    </div>
  );
}
