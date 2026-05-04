'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { HubNavbar } from '../../../components/hub/HubNavbar';

interface WishlistItem {
  id: string;
  product_id: string;
  product_title?: string;
  product_price?: number;
  product_thumbnail?: string | null;
  product_status?: string;
  store_name?: string;
  store_id?: string;
  created_at: string;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:4000';

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pd_access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch(
        `${backendUrl}/api/pd/wishlist?page=${page}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [backendUrl, page]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemove = async (productId: string) => {
    setRemoving(productId);
    try {
      const token = localStorage.getItem('pd_access_token');
      await fetch(`${backendUrl}/api/pd/wishlist/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.filter((i) => i.product_id !== productId));
      setTotal((prev) => prev - 1);
    } catch {
      // ignore
    }
    setRemoving(null);
  };

  const totalPages = Math.ceil(total / 20);
  const isLoggedIn =
    typeof window !== 'undefined' && !!localStorage.getItem('pd_access_token');

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <HubNavbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Heart className="w-7 h-7 text-red-500 fill-red-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ma Wishlist</h1>
              <p className="text-sm text-gray-500">
                {total} produit{total !== 1 ? 's' : ''} sauvegardé{total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Link
            href="/hub"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#16C784] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Continuer mes achats
          </Link>
        </div>

        {/* Not logged in */}
        {!isLoggedIn && !loading && (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connectez-vous pour voir votre wishlist
            </h2>
            <p className="text-gray-500 mb-6">
              Sauvegardez vos produits préférés pour les retrouver facilement.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex px-6 py-3 bg-[#16C784] text-white font-semibold rounded-xl hover:bg-[#14b576] transition-colors"
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
          <div className="text-center py-16">
            <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Votre wishlist est vide
            </h2>
            <p className="text-gray-500 mb-6">
              Parcourez nos produits et cliquez sur le coeur pour les sauvegarder.
            </p>
            <Link
              href="/hub"
              className="inline-flex px-6 py-3 bg-[#16C784] text-white font-semibold rounded-xl hover:bg-[#14b576] transition-colors"
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
                className={`bg-white rounded-xl border border-gray-100 overflow-hidden group hover:shadow-lg transition-all duration-300 ${
                  removing === item.product_id ? 'opacity-50 scale-95' : ''
                }`}
              >
                <Link href={`/hub/products/${item.product_id}`}>
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
                  <Link href={`/hub/products/${item.product_id}`}>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 hover:text-[#16C784] transition-colors">
                      {item.product_title || 'Produit'}
                    </h3>
                  </Link>

                  {item.store_name && (
                    <p className="text-xs text-gray-500 mb-2">{item.store_name}</p>
                  )}

                  <p className="font-bold text-[#16C784] text-lg mb-3">
                    {item.product_price?.toFixed(3) || '0.000'} TND
                  </p>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/hub/products/${item.product_id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#16C784] text-white text-sm font-semibold rounded-lg hover:bg-[#14b576] transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Voir
                    </Link>
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      disabled={removing === item.product_id}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
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
                    ? 'bg-[#16C784] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
