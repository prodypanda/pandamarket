'use client';

import React, { useRef } from 'react';
import { Check, ChevronLeft, ChevronRight, Store, X, Sparkles } from 'lucide-react';

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

function getInitials(name: string): string {
  if (!name) return 'B';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const FollowedStoresCarousel: React.FC<FollowedStoresCarouselProps> = ({
  followedStores,
  selectedStoreId,
  onSelectStore,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === 'left' ? -280 : 280;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <section
      data-testid="section-followed-stores"
      aria-labelledby="followed-stores-title"
      className="rounded-2xl border border-gray-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#161a22]/80"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-[#087f5b] dark:bg-emerald-500/20 dark:text-emerald-400">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <h2 id="followed-stores-title" className="text-base font-black text-gray-900 dark:text-white sm:text-lg">
              Mes Boutiques Suivies
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sélectionnez une boutique pour isoler ses dernières publications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedStoreId && (
            <button
              type="button"
              onClick={() => onSelectStore(null)}
              data-testid="clear-store-filter"
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15"
            >
              <X className="h-3.5 w-3.5" />
              Afficher toutes les boutiques
            </button>
          )}

          {followedStores.length > 3 && (
            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => scroll('left')}
                aria-label="Faire défiler vers la gauche"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                aria-label="Faire défiler vers la droite"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {followedStores.length === 0 ? (
        <div
          className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300/80 p-6 text-center dark:border-white/10"
          data-testid="empty-followed-stores"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#087f5b] dark:bg-emerald-950/40 dark:text-emerald-400">
            <Store className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-bold text-gray-800 dark:text-gray-200">
            Vous ne suivez aucune boutique pour le moment.
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Explorez le marché et cliquez sur « Suivre » sur vos créateurs favoris pour voir leurs nouveautés ici.
          </p>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto pb-1 pt-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800"
          data-testid="followed-stores-carousel"
        >
          {followedStores.map((store) => {
            const selected = selectedStoreId === store.id;
            return (
              <button
                key={store.id}
                type="button"
                data-testid={`store-chip-${store.id}`}
                aria-pressed={selected}
                onClick={() => onSelectStore(selected ? null : store.id)}
                className={`group relative flex min-w-[220px] max-w-[260px] shrink-0 items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f5b] ${
                  selected
                    ? 'border-[#087f5b] bg-[#087f5b] text-white shadow-md shadow-emerald-900/20 ring-2 ring-[#087f5b]/30'
                    : 'border-gray-200/90 bg-white text-gray-900 shadow-sm hover:border-[#087f5b]/60 hover:shadow-md dark:border-white/10 dark:bg-[#12161f] dark:text-white dark:hover:border-emerald-500/50'
                }`}
              >
                {/* Store Avatar */}
                <div
                  className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border font-black text-sm transition-transform duration-200 group-hover:scale-105 ${
                    selected
                      ? 'border-white/20 bg-white/20 text-white'
                      : 'border-gray-100 bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-800 dark:border-white/10 dark:from-emerald-950/60 dark:to-teal-900/40 dark:text-emerald-300'
                  }`}
                >
                  {store.logo_url ? (
                    <img src={store.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span>{getInitials(store.name)}</span>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-black leading-tight sm:text-sm">
                      {store.name}
                    </span>
                    {store.is_verified && (
                      <span
                        title="Boutique vérifiée"
                        className={`inline-flex shrink-0 items-center rounded-full p-0.5 ${
                          selected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        }`}
                      >
                        <Check className="h-3 w-3 stroke-[3]" aria-label="Boutique vérifiée" />
                      </span>
                    )}
                  </div>
                  <span
                    className={`mt-0.5 block truncate text-[11px] font-medium ${
                      selected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    @{store.subdomain}
                  </span>
                </div>

                {/* Unread updates count */}
                {store.unread_updates_count > 0 && (
                  <span
                    data-testid={`unread-badge-${store.id}`}
                    className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-black tabular-nums shadow-sm ${
                      selected ? 'bg-white text-[#087f5b]' : 'bg-[#c2412d] text-white'
                    }`}
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
