'use client';

import React, { useState } from 'react';
import { Check, ListFilter, PackageOpen, ShoppingCart, Sparkles, TrendingDown, Store } from 'lucide-react';
import { getResizedImageUrl } from '@/lib/image-url';

export interface FeedTimelineProduct {
  id: string;
  store_id: string;
  store_name: string;
  title: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  is_new_arrival: boolean;
  published_at: string;
  image_url: string | null;
  interest_tags?: string[];
}

export interface FeedTimelineProps {
  products: FeedTimelineProduct[];
  activeFilter: 'all' | 'price_drops' | 'new_arrivals';
  onFilterChange: (filter: 'all' | 'price_drops' | 'new_arrivals') => void;
  onAddToCart?: (product: FeedTimelineProduct) => void;
}

const filters = [
  { id: 'all' as const, label: 'Tous les flux', icon: ListFilter },
  { id: 'price_drops' as const, label: 'Baisses de prix', icon: TrendingDown },
  { id: 'new_arrivals' as const, label: 'Nouveautés', icon: Sparkles },
];

export const FeedTimeline: React.FC<FeedTimelineProps> = ({
  products,
  activeFilter,
  onFilterChange,
  onAddToCart,
}) => {
  const [cartSuccessId, setCartSuccessId] = useState<string | null>(null);

  const handleAddToCartClick = (product: FeedTimelineProduct) => {
    onAddToCart?.(product);
    setCartSuccessId(product.id);
    window.setTimeout(() => setCartSuccessId(null), 2200);
  };

  return (
    <section data-testid="section-feed-timeline" aria-labelledby="feed-timeline-title">
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-4 border-b border-gray-200/90 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="feed-timeline-title" className="text-xl font-black text-gray-900 dark:text-white sm:text-2xl">
            Nouveautés &amp; Baisses de Prix
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Le registre chronologique des publications de vos boutiques suivies.
          </p>
        </div>

        {/* Filter Pills */}
        <div
          className="flex max-w-full gap-1.5 overflow-x-auto rounded-xl bg-gray-100/90 p-1 dark:bg-white/5"
          data-testid="feed-filter-tabs"
          aria-label="Filtrer le fil"
        >
          {filters.map(({ id, label, icon: Icon }) => {
            const isActive = activeFilter === id;
            return (
              <button
                key={id}
                type="button"
                data-testid={`filter-${id === 'price_drops' ? 'price-drops' : id === 'new_arrivals' ? 'new-arrivals' : 'all'}`}
                aria-pressed={isActive}
                onClick={() => onFilterChange(id)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f5b] ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-[#1f242e] dark:text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${
                    isActive
                      ? id === 'price_drops'
                        ? 'text-red-500'
                        : id === 'new_arrivals'
                          ? 'text-blue-500'
                          : 'text-[#087f5b]'
                      : 'text-gray-400'
                  }`}
                />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed List or Empty State */}
      {products.length === 0 ? (
        <div
          className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300/80 p-8 text-center dark:border-white/10"
          data-testid="empty-feed-timeline"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500">
            <PackageOpen className="h-7 w-7" />
          </div>
          <p className="mt-4 text-sm font-black text-gray-800 dark:text-gray-200">
            Aucune nouveauté récente cette semaine dans ce filtre.
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Essayez de sélectionner « Tous les flux » ou explorez d&apos;autres boutiques recommandées.
          </p>
        </div>
      ) : (
        <div data-testid="feed-timeline-list" className="divide-y divide-gray-100 dark:divide-white/5">
          {products.map((product) => {
            const isAdded = cartSuccessId === product.id;
            const hasDate = !Number.isNaN(new Date(product.published_at).getTime());
            const formattedDate = hasDate
              ? new Intl.DateTimeFormat('fr-TN', { day: '2-digit', month: 'short' }).format(
                  new Date(product.published_at),
                )
              : '';
            const isDiscounted = !!product.discount_percentage && product.discount_percentage > 0;
            const imageUrl = product.image_url ? getResizedImageUrl(product.image_url, 'medium') : null;

            return (
              <article
                key={product.id}
                data-testid={`timeline-item-${product.id}`}
                className="group grid gap-4 py-5 transition-colors sm:grid-cols-[108px_minmax(0,1fr)_auto] sm:items-center sm:gap-6"
              >
                {/* Product Thumbnail */}
                <div className="relative aspect-square w-full sm:w-[108px] overflow-hidden rounded-xl border border-gray-100 bg-gray-50 shadow-sm dark:border-white/10 dark:bg-[#161a22]">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-600">
                      <PackageOpen className="h-8 w-8 stroke-[1.5]" />
                    </div>
                  )}

                  {isDiscounted && (
                    <span
                      data-testid={`discount-badge-${product.id}`}
                      className="absolute start-1.5 top-1.5 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm"
                    >
                      -{product.discount_percentage}%
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0">
                  {/* Meta Bar */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-[#087f5b] dark:text-emerald-400">
                      <Store className="h-3.5 w-3.5" />
                      {product.store_name}
                    </span>

                    {formattedDate && (
                      <span className="text-gray-400 dark:text-gray-500">· {formattedDate}</span>
                    )}

                    {product.is_new_arrival && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        NOUVEAU
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="mt-1.5 text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-[#087f5b] dark:text-white dark:group-hover:text-emerald-400 sm:text-lg">
                    {product.title}
                  </h3>

                  {/* Price & Tags */}
                  <div className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
                    <span className="text-lg font-black tabular-nums text-gray-900 dark:text-white">
                      {product.price.toFixed(3)} TND
                    </span>

                    {product.original_price && product.original_price > product.price && (
                      <span className="text-xs font-bold tabular-nums text-gray-400 line-through">
                        {product.original_price.toFixed(3)} TND
                      </span>
                    )}

                    {product.interest_tags && product.interest_tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 ms-1">
                        {product.interest_tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-white/5 dark:text-gray-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action CTA */}
                <div className="flex items-center justify-start sm:justify-end">
                  <button
                    type="button"
                    data-testid={`btn-add-to-cart-${product.id}`}
                    onClick={() => handleAddToCartClick(product)}
                    aria-label={
                      isAdded
                        ? `${product.title} ajouté au panier`
                        : `Ajouter ${product.title} au panier`
                    }
                    className={`inline-flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-5 text-xs font-black transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f5b] shadow-sm ${
                      isAdded
                        ? 'bg-emerald-600 text-white scale-[0.98]'
                        : 'bg-gray-900 text-white hover:bg-[#087f5b] hover:shadow-md dark:bg-white dark:text-gray-900 dark:hover:bg-emerald-400'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="h-4 w-4 stroke-[3]" />
                        <span>Ajouté !</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        <span>Ajouter au panier</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
