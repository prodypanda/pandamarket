'use client';

import React from 'react';
import { ArrowUpRight, Compass, Plus, Store, Tag } from 'lucide-react';

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
}

export const DiscoverSimilarStores: React.FC<DiscoverSimilarStoresProps> = ({ similarStores, recommendedProducts, onFollowStore }) => (
  <aside data-testid="section-discoveries" aria-labelledby="discoveries-title" className="lg:border-l lg:border-[#c8ccbf] lg:pl-8 dark:lg:border-[#34382f]">
    <div className="border-b-2 border-[#171a16] pb-4 dark:border-[#e7eadf]">
      <Compass className="h-5 w-5 text-[#2456a6]" />
      <h2 id="discoveries-title" className="mt-3 text-2xl font-black">Découvertes &amp; Similaires</h2>
      <p className="mt-1 text-xs leading-5 text-[#697065] dark:text-[#aeb4a6]">Des pistes hors de vos abonnements, reliées à vos centres d’intérêt.</p>
    </div>

    {similarStores.length > 0 && (
      <div className="mt-6" data-testid="similar-stores-list">
        <h3 className="text-xs font-black text-[#087f5b]">Boutiques recommandées</h3>
        <div className="mt-2 border-t border-[#c8ccbf] dark:border-[#34382f]">
          {similarStores.map((store) => (
            <div key={store.id} data-testid={`similar-store-${store.id}`} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#c8ccbf] py-3 dark:border-[#34382f]">
              <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#e4e7de] dark:bg-[#292d26]"><Store className="h-4 w-4" /></span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-black">{store.name}</span>
                <span className="mt-1 block truncate text-[10px] text-[#747b70] dark:text-[#a9afa1]">@{store.subdomain} · {store.primary_category}</span>
              </span>
              <button type="button" data-testid={`btn-follow-similar-${store.id}`} onClick={() => onFollowStore(store)} aria-label={`Suivre ${store.name}`} className="inline-flex h-8 items-center gap-1 rounded-sm bg-[#087f5b] px-2.5 text-[10px] font-black text-white hover:bg-[#076b4d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f5b]"><Plus className="h-3 w-3" /> Suivre</button>
            </div>
          ))}
        </div>
      </div>
    )}

    {recommendedProducts.length > 0 && (
      <div className="mt-8" data-testid="recommended-products-list">
        <h3 className="text-xs font-black text-[#2456a6]">Produits selon vos intérêts</h3>
        <div className="mt-2 border-t border-[#c8ccbf] dark:border-[#34382f]">
          {recommendedProducts.slice(0, 8).map((product) => {
            const image = product.thumbnail || product.image_url;
            return (
              <div key={product.id} data-testid={`recommended-prod-${product.id}`} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 border-b border-[#c8ccbf] py-3 dark:border-[#34382f]">
                <span className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-sm bg-[#e4e7de] dark:bg-[#292d26]">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Tag className="h-4 w-4 text-[#697065]" />}</span>
                <span className="min-w-0">
                  <span className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-xs font-black leading-4">{product.title}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#2456a6]" /></span>
                  <span className="mt-2 flex items-center justify-between gap-2"><span className="truncate text-[10px] text-[#747b70] dark:text-[#a9afa1]">{product.store_name}</span><strong className="shrink-0 text-[11px] tabular-nums">{product.price.toFixed(3)} TND</strong></span>
                  <span className="mt-1 block text-[9px] font-bold text-[#2456a6]">#{product.matched_tag}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {similarStores.length === 0 && recommendedProducts.length === 0 && <div className="flex min-h-40 items-center gap-3 border-b border-[#c8ccbf] text-sm text-[#697065] dark:border-[#34382f] dark:text-[#aeb4a6]"><Compass className="h-6 w-6" /> De nouvelles découvertes apparaîtront à mesure que vous explorez le marché.</div>}
  </aside>
);
