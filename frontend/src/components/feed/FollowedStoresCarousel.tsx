'use client';

import React from 'react';
import { Check, Store, X } from 'lucide-react';

export interface FollowedStoreItem {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  unread_updates_count: number;
  is_verified: boolean;
}

export interface FollowedStoresCarouselProps {
  followedStores: FollowedStoreItem[];
  selectedStoreId: string | null;
  onSelectStore: (storeId: string | null) => void;
}

export const FollowedStoresCarousel: React.FC<FollowedStoresCarouselProps> = ({ followedStores, selectedStoreId, onSelectStore }) => (
  <section data-testid="section-followed-stores" aria-labelledby="followed-stores-title">
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 id="followed-stores-title" className="text-lg font-black">Mes Boutiques Suivies</h2>
        <p className="mt-1 text-xs text-[#697065] dark:text-[#aeb4a6]">Sélectionnez une boutique pour isoler ses dernières publications.</p>
      </div>
      {selectedStoreId && (
        <button type="button" onClick={() => onSelectStore(null)} data-testid="clear-store-filter" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087f5b] underline decoration-1 underline-offset-4 hover:text-[#075e45]">
          <X className="h-3.5 w-3.5" /> Afficher toutes les boutiques
        </button>
      )}
    </div>

    {followedStores.length === 0 ? (
      <div className="flex min-h-24 items-center gap-4 border-y border-[#c8ccbf] py-5 dark:border-[#34382f]" data-testid="empty-followed-stores">
        <Store className="h-7 w-7 text-[#087f5b]" />
        <p className="text-sm text-[#596055] dark:text-[#b8bdae]">Vous ne suivez aucune boutique pour le moment.</p>
      </div>
    ) : (
      <div className="flex gap-2 overflow-x-auto border-y border-[#c8ccbf] py-3 [scrollbar-color:#087f5b_transparent] dark:border-[#34382f]" data-testid="followed-stores-carousel">
        {followedStores.map((store) => {
          const selected = selectedStoreId === store.id;
          return (
            <button key={store.id} type="button" data-testid={`store-chip-${store.id}`} aria-pressed={selected} onClick={() => onSelectStore(selected ? null : store.id)} className={`group relative flex min-w-[210px] shrink-0 items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f5b] ${selected ? 'border-[#087f5b] bg-[#087f5b] text-white' : 'border-[#b9beb2] bg-white text-[#171a16] hover:border-[#087f5b] dark:border-[#3b4037] dark:bg-[#191c17] dark:text-[#f4f5ef]'}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm ${selected ? 'bg-white/16' : 'bg-[#e4e7de] dark:bg-[#292d26]'}`}>
                {store.logo_url ? <img src={store.logo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 truncate text-xs font-black">{store.name}{store.is_verified && <Check className="h-3.5 w-3.5" aria-label="Boutique vérifiée" />}</span>
                <span className={`mt-1 block truncate text-[11px] ${selected ? 'text-white/75' : 'text-[#747b70] dark:text-[#a9afa1]'}`}>@{store.subdomain}</span>
              </span>
              {store.unread_updates_count > 0 && <span data-testid={`unread-badge-${store.id}`} className={`min-w-6 rounded-sm px-1.5 py-1 text-center text-[10px] font-black tabular-nums ${selected ? 'bg-white text-[#087f5b]' : 'bg-[#c2412d] text-white'}`}>{store.unread_updates_count}</span>}
            </button>
          );
        })}
      </div>
    )}
  </section>
);
