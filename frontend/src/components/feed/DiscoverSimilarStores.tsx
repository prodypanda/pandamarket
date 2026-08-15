'use client';

import React from 'react';

export interface RecommendedProduct {
  id: string;
  store_id: string;
  store_name: string;
  title: string;
  price: number;
  matched_tag: string;
  interest_tags: string[];
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
}

export const DiscoverSimilarStores: React.FC<DiscoverSimilarStoresProps> = ({
  similarStores,
  recommendedProducts,
  onFollowStore,
}) => {
  return (
    <section data-testid="section-discoveries" className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-zinc-900 dark:to-zinc-900 border border-emerald-100 dark:border-zinc-800">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
          <span>🤖</span> Découvertes & Similaires
        </h2>

        {similarStores.length > 0 && (
          <div className="space-y-3 mb-6" data-testid="similar-stores-list">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Boutiques recommandées
            </div>
            {similarStores.map((s) => (
              <div
                key={s.id}
                data-testid={`similar-store-${s.id}`}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
              >
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{s.name}</div>
                  <div className="text-[10px] text-zinc-400">{s.primary_category}</div>
                </div>
                <button
                  type="button"
                  data-testid={`btn-follow-similar-${s.id}`}
                  onClick={() => onFollowStore(s)}
                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg transition-colors"
                >
                  + Suivre
                </button>
              </div>
            ))}
          </div>
        )}

        {recommendedProducts.length > 0 && (
          <div className="space-y-3" data-testid="recommended-products-list">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Produits selon vos intérêts
            </div>
            {recommendedProducts.map((p) => (
              <div
                key={p.id}
                data-testid={`recommended-prod-${p.id}`}
                className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium">
                    🏷️ #{p.matched_tag}
                  </span>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {p.price.toFixed(3)} TND
                  </span>
                </div>
                <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {p.title}
                </div>
                <div className="text-[10px] text-zinc-400">{p.store_name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
