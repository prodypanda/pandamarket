'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Compass,
  Plus,
  Check,
  Store,
  Tag,
  Sparkles,
  ShoppingCart,
  Users,
  ExternalLink,
} from 'lucide-react';
import { getResizedImageUrl } from '@/lib/image-url';

export interface RecommendedProduct {
  id: string;
  store_id: string;
  store_name: string;
  title: string;
  price: number;
  matched_tag: string;
  interest_tags: string[];
  thumbnail?: string | null;
  image_url?: string | null;
}

export interface SimilarStore {
  id: string;
  name: string;
  subdomain: string;
  primary_category: string;
  subscribers_count: number;
  interest_tags: string[];
}

export interface DiscoverSimilarStoresProps {
  similarStores: SimilarStore[];
  recommendedProducts: RecommendedProduct[];
  onFollowStore: (store: SimilarStore) => void;
  onAddToCart?: (product: {
    id: string;
    store_id: string;
    store_name: string;
    title: string;
    price: number;
    image_url: string | null;
  }) => void;
}

function getStoreInitials(name: string): string {
  if (!name) return 'B';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const DiscoverSimilarStores: React.FC<DiscoverSimilarStoresProps> = ({
  similarStores,
  recommendedProducts,
  onFollowStore,
  onAddToCart,
}) => {
  const [followingId, setFollowingId] = useState<string | null>(null);
  const [cartSuccessId, setCartSuccessId] = useState<string | null>(null);

  const handleFollow = (store: SimilarStore) => {
    setFollowingId(store.id);
    onFollowStore(store);
  };

  const handleAddRecToCart = (product: RecommendedProduct) => {
    if (onAddToCart) {
      onAddToCart({
        id: product.id,
        store_id: product.store_id,
        store_name: product.store_name,
        title: product.title,
        price: product.price,
        image_url: product.image_url || product.thumbnail || null,
      });
      setCartSuccessId(product.id);
      window.setTimeout(() => setCartSuccessId(null), 2000);
    }
  };

  return (
    <aside
      data-testid="section-discoveries"
      aria-labelledby="discoveries-title"
      className="space-y-6 lg:border-s lg:border-gray-200/80 lg:ps-8 dark:lg:border-white/10"
    >
      {/* Sidebar Header */}
      <div className="border-b border-gray-200/90 pb-4 dark:border-white/10">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Compass className="h-5 w-5" />
          <span className="text-xs font-black uppercase tracking-wider">Moteur de Découvertes</span>
        </div>
        <h2 id="discoveries-title" className="mt-1 text-lg font-black text-gray-900 dark:text-white">
          Boutiques Recommandées
        </h2>
        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
          Des créateurs hors de vos abonnements actuels, suggérés selon vos centres d&apos;intérêt.
        </p>
      </div>

      {/* Similar Recommended Stores */}
      {similarStores.length > 0 && (
        <div data-testid="similar-stores-list" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              <Store className="h-3.5 w-3.5" />
              Boutiques suggérées
            </h3>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {similarStores.length} disponible{similarStores.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200/80 bg-white/90 p-2 shadow-xs dark:divide-white/5 dark:border-white/10 dark:bg-[#161a22]">
            {similarStores.map((store) => {
              const isProcessing = followingId === store.id;
              return (
                <div
                  key={store.id}
                  data-testid={`similar-store-${store.id}`}
                  className="flex items-center justify-between gap-3 p-2.5 transition-colors hover:bg-gray-50/80 dark:hover:bg-white/5 rounded-xl"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 font-black text-xs text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/40 dark:border-white/10">
                      {getStoreInitials(store.name)}
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-bold text-gray-900 dark:text-white">
                        {store.name}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                        <span>@{store.subdomain}</span>
                        {store.subscribers_count > 0 && (
                          <span className="flex items-center gap-0.5 font-medium">
                            · <Users className="h-2.5 w-2.5" /> {store.subscribers_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      data-testid={`btn-follow-similar-${store.id}`}
                      onClick={() => handleFollow(store)}
                      disabled={isProcessing}
                      aria-label={`Suivre ${store.name}`}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#087f5b] px-3 text-[11px] font-bold text-white transition hover:bg-[#066548] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f5b] disabled:opacity-50 shadow-xs"
                    >
                      {isProcessing ? (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      <span>{isProcessing ? 'Suivi' : 'Suivre'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended Products by Interest Profile */}
      {recommendedProducts.length > 0 && (
        <div data-testid="recommended-products-list" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" />
              Produits selon vos intérêts
            </h3>
            <span className="text-[10px] font-bold text-gray-400">
              {recommendedProducts.length} pépites
            </span>
          </div>

          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200/80 bg-white/90 p-2 shadow-xs dark:divide-white/5 dark:border-white/10 dark:bg-[#161a22]">
            {recommendedProducts.slice(0, 6).map((product) => {
              const isAdded = cartSuccessId === product.id;
              const image = product.thumbnail || product.image_url;
              const imageUrl = image ? getResizedImageUrl(image, 'small') : null;
              const productHref = `/hub/products/${encodeURIComponent(product.id)}`;

              return (
                <div
                  key={product.id}
                  data-testid={`recommended-prod-${product.id}`}
                  className="group flex items-center justify-between gap-3 p-2.5 transition-colors hover:bg-gray-50/80 dark:hover:bg-white/5 rounded-xl"
                >
                  <Link href={productHref} className="flex min-w-0 items-center gap-3 flex-1">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-[#12161f]">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-600">
                          <Tag className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <span className="line-clamp-1 text-xs font-bold text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                          {product.title}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-[10px] text-gray-500 dark:text-gray-400">
                          {product.store_name}
                        </span>
                        <strong className="shrink-0 text-xs font-black tabular-nums text-gray-900 dark:text-white">
                          {product.price.toFixed(3)} TND
                        </strong>
                      </div>

                      {product.matched_tag && (
                        <span className="mt-0.5 inline-block text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                          #{product.matched_tag}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* 1-Click Quick Add CTA */}
                  {onAddToCart && (
                    <button
                      type="button"
                      onClick={() => handleAddRecToCart(product)}
                      title={isAdded ? 'Ajouté !' : 'Ajouter au panier'}
                      className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border transition ${
                        isAdded
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10'
                      }`}
                    >
                      {isAdded ? (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      ) : (
                        <ShoppingCart className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {similarStores.length === 0 && recommendedProducts.length === 0 && (
        <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300/80 p-6 text-center text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
          <Compass className="h-6 w-6 text-gray-400 mb-2" />
          <p className="font-bold text-gray-700 dark:text-gray-300">
            Vous suivez toutes les boutiques suggérées !
          </p>
          <p className="mt-1 text-[11px]">
            De nouveaux créateurs apparaîtront à mesure que de nouveaux commerçants rejoignent PandaMarket.
          </p>
        </div>
      )}
    </aside>
  );
};
