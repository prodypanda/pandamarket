'use client';

import React, { useState } from 'react';

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

export const FeedTimeline: React.FC<FeedTimelineProps> = ({
  products,
  activeFilter,
  onFilterChange,
  onAddToCart,
}) => {
  const [cartSuccessId, setCartSuccessId] = useState<string | null>(null);

  const handleAddToCartClick = (product: FeedTimelineProduct) => {
    if (onAddToCart) onAddToCart(product);
    setCartSuccessId(product.id);
    setTimeout(() => setCartSuccessId(null), 2000);
  };

  return (
    <section data-testid="section-feed-timeline" className="lg:col-span-2 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>🔥</span> Nouveautés & Baisses de Prix
        </h2>

        {/* Filter Tabs */}
        <div
          className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg text-xs"
          data-testid="feed-filter-tabs"
        >
          <button
            type="button"
            data-testid="filter-all"
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Tous les flux
          </button>
          <button
            type="button"
            data-testid="filter-price-drops"
            onClick={() => onFilterChange('price_drops')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeFilter === 'price_drops'
                ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            📉 Baisses de prix
          </button>
          <button
            type="button"
            data-testid="filter-new-arrivals"
            onClick={() => onFilterChange('new_arrivals')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeFilter === 'new_arrivals'
                ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            🆕 Nouveautés
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div
          className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
          data-testid="empty-feed-timeline"
        >
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            Aucune nouveauté récente cette semaine dans ce filtre.
          </p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="feed-timeline-list">
          {products.map((product) => (
            <div
              key={product.id}
              data-testid={`timeline-item-${product.id}`}
              className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0">
                  📦
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {product.store_name}
                    </span>
                    {product.is_new_arrival && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                        NOUVEAU
                      </span>
                    )}
                    {product.discount_percentage && product.discount_percentage > 0 && (
                      <span
                        data-testid={`discount-badge-${product.id}`}
                        className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      >
                        -{product.discount_percentage}%
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm mt-0.5">
                    {product.title}
                  </h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {product.price.toFixed(3)} TND
                    </span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-xs text-zinc-400 line-through">
                        {product.original_price.toFixed(3)} TND
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-testid={`btn-add-to-cart-${product.id}`}
                onClick={() => handleAddToCartClick(product)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  cartSuccessId === product.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'
                }`}
              >
                {cartSuccessId === product.id ? '✓ Ajouté' : 'Ajouter au panier'}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
