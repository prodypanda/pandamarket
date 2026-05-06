'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useCallback } from 'react';
import { Heart, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import { getHubProductHref } from '../../../lib/product-links';
import { useMarketplaceTheme } from '../../../hooks/useMarketplaceTheme';

interface WishlistItem {
  id: string;
  product_id: string;
  product_title?: string;
  product_slug?: string | null;
  product_category?: string | null;
  marketplace_category_slug?: string | null;
  product_price?: number | string;
  product_thumbnail?: string | null;
  product_status?: string;
  store_name?: string;
  store_id?: string;
  store_subdomain?: string | null;
  created_at: string;
}

function getWishlistProductHref(item: WishlistItem): string {
  return getHubProductHref({
    id: item.product_id,
    title: item.product_title,
    slug: item.product_slug,
    category: item.product_category,
    marketplace_category_slug: item.marketplace_category_slug,
    store_subdomain: item.store_subdomain,
  });
}

function formatWishlistPrice(price?: number | string): string {
  const amount = Number(price);
  return `${Number.isFinite(amount) ? amount.toFixed(3) : '0.000'} TND`;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const { settings, classes, isAliExpress } = useMarketplaceTheme();

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/pd/wishlist?page=${page}&limit=20`,
        { credentials: 'include' },
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
        setIsLoggedIn(true);
      } else if (res.status === 401) {
        setIsLoggedIn(false);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemove = async (productId: string) => {
    setRemoving(productId);
    try {
      await fetchWithCsrf(`/api/pd/wishlist/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setItems((prev) => prev.filter((i) => i.product_id !== productId));
      setTotal((prev) => prev - 1);
    } catch {
      // ignore
    }
    setRemoving(null);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar
        marketplaceName={settings.marketplace_name}
        marketplaceLogoUrl={settings.marketplace_logo_url}
        marketplaceTheme={settings.marketplace_theme}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className={`mb-8 flex flex-col gap-4 overflow-hidden rounded-[2rem] p-6 text-white sm:flex-row sm:items-center sm:justify-between ${classes.header}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
              <Heart className="w-7 h-7 fill-white text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Ma Wishlist</h1>
              <p className="text-sm text-white/75">
                {total} produit{total !== 1 ? 's' : ''} sauvegardé{total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Link
            href="/hub"
            className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="w-4 h-4" />
            Continuer mes achats
          </Link>
        </div>

        {/* Not logged in */}
        {!isLoggedIn && !loading && (
          <div className={`${classes.panel} text-center py-16 px-6`}>
            <Heart className={`w-16 h-16 mx-auto mb-4 ${classes.primaryText}`} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connectez-vous pour voir votre wishlist
            </h2>
            <p className="text-gray-500 mb-6">
              Sauvegardez vos produits préférés pour les retrouver facilement.
            </p>
            <Link
              href="/auth/login"
              className={`inline-flex px-6 py-3 text-white font-black rounded-full transition-all hover:-translate-y-0.5 hover:shadow-lg ${classes.primaryGradient}`}
            >
              Se connecter
            </Link>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl p-4">
                <div className="aspect-square bg-gray-200 rounded-lg mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && isLoggedIn && items.length === 0 && (
          <div className={`${classes.panel} text-center py-16 px-6`}>
            <Heart className={`w-16 h-16 mx-auto mb-4 ${classes.primaryText}`} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Votre wishlist est vide
            </h2>
            <p className="text-gray-500 mb-6">
              Parcourez nos produits et cliquez sur le coeur pour les sauvegarder.
            </p>
            <Link
              href="/hub"
              className={`inline-flex px-6 py-3 text-white font-black rounded-full transition-all hover:-translate-y-0.5 hover:shadow-lg ${classes.primaryGradient}`}
            >
              Explorer les produits
            </Link>
          </div>
        )}

        {/* Wishlist Grid */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`${classes.card} overflow-hidden group ${
                  removing === item.product_id ? 'opacity-50 scale-95' : ''
                }`}
              >
                <Link href={getWishlistProductHref(item)}>
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {item.product_thumbnail ? (
                      <img
                        src={item.product_thumbnail}
                        alt={item.product_title || 'Product'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                    {item.product_status !== 'published' && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
                        Indisponible
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <Link href={getWishlistProductHref(item)}>
                    <h3 className={`font-bold text-gray-900 text-sm mb-1 line-clamp-2 transition-colors ${classes.primaryTextHover}`}>
                      {item.product_title || 'Produit'}
                    </h3>
                  </Link>

                  {item.store_name && (
                    <p className="text-xs text-gray-500 mb-2">{item.store_name}</p>
                  )}

                  <p className={`font-black ${classes.primaryText} text-lg mb-3`}>
                    {formatWishlistPrice(item.product_price)}
                  </p>

                  <div className="flex items-center gap-2">
                    <Link
                      href={getWishlistProductHref(item)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-white text-sm font-black rounded-full transition-all hover:shadow-lg ${classes.primaryGradient}`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Voir
                    </Link>
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      disabled={removing === item.product_id}
                      className="p-2 border border-gray-200 rounded-full hover:bg-red-50 hover:border-red-200 transition-colors"
                      title="Retirer de la wishlist"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? `${isAliExpress ? 'bg-[#ff4747]' : 'bg-[#16C784]'} text-white`
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </main>
      <HubFooter {...settings} />
    </div>
  );
}
