'use client';

import React from 'react';

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

export const FollowedStoresCarousel: React.FC<FollowedStoresCarouselProps> = ({
  followedStores,
  selectedStoreId,
  onSelectStore,
}) => {
  return (
    <section data-testid="section-followed-stores" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>🏪</span> Mes Boutiques Suivies
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold">
            {followedStores.length}
          </span>
        </h2>
        {selectedStoreId && (
          <button
            type="button"
            onClick={() => onSelectStore(null)}
            data-testid="clear-store-filter"
            className="text-xs text-emerald-600 hover:underline font-medium"
          >
            Afficher toutes les boutiques
          </button>
        )}
      </div>

      {followedStores.length === 0 ? (
        <div
          className="p-6 text-center rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800"
          data-testid="empty-followed-stores"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Vous ne suivez aucune boutique pour le moment.
          </p>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin"
          data-testid="followed-stores-carousel"
        >
          {followedStores.map((store) => {
            const isSelected = selectedStoreId === store.id;
            return (
              <button
                key={store.id}
                type="button"
                data-testid={`store-chip-${store.id}`}
                onClick={() => onSelectStore(isSelected ? null : store.id)}
                className={`flex-shrink-0 flex items-center gap-2.5 p-2.5 pr-4 rounded-xl border transition-all select-none ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-200'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs">
                  {store.name.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-xs leading-tight">{store.name}</div>
                  <div className="text-[10px] text-zinc-400">@{store.subdomain}</div>
                </div>
                {store.unread_updates_count > 0 && (
                  <span
                    data-testid={`unread-badge-${store.id}`}
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse"
                  >
                    {store.unread_updates_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
