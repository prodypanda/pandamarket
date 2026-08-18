import React, { useRef, useState, useEffect } from 'react';
import { Check, ChevronLeft, ChevronRight, Store, X, Sparkles, Flame, Zap, Copy, ExternalLink, ArrowRight } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

export interface FollowedStoreItem {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  unread_updates_count: number;
  is_verified: boolean;
  has_active_story?: boolean;
  active_flash_drop?: {
    title: string;
    discount: string;
  } | null;
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
  const { t, dir } = useLocale();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeStoryStore, setActiveStoryStore] = useState<FollowedStoreItem | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === 'left' ? -280 : 280;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Auto-advancing Story progress timer (5 seconds)
  useEffect(() => {
    if (!activeStoryStore) {
      setStoryProgress(0);
      setCopiedCoupon(false);
      return;
    }

    setStoryProgress(0);
    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setActiveStoryStore(null);
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryStore]);

  const handleCopyCoupon = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 3000);
  };

  return (
    <section
      data-testid="section-followed-stores"
      aria-labelledby="followed-stores-title"
      dir={dir}
      className="rounded-2xl border border-gray-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#161a22]/80"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-[#087f5b] dark:bg-emerald-500/20 dark:text-emerald-400">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <h2 id="followed-stores-title" className="text-base font-black text-gray-900 dark:text-white sm:text-lg">
              {t('followedFeed.followedStores') || 'Mes Boutiques Suivies'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('followedFeed.carouselHint') || 'Sélectionnez une boutique pour isoler ses dernières publications.'}
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
              {t('followedFeed.allStores') || 'Afficher toutes les boutiques'}
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
            {t('followedFeed.noFollowedStores') || 'Vous ne suivez aucune boutique pour le moment.'}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('followedFeed.exploreHint') || 'Explorez le marché et cliquez sur « Suivre » sur vos créateurs favoris pour voir leurs nouveautés ici.'}
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
            const hasStory = store.has_active_story || store.unread_updates_count > 0;

            return (
              <div
                key={store.id}
                data-testid={`store-chip-${store.id}`}
                className={`group relative flex min-w-[220px] max-w-[260px] shrink-0 items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${
                  selected
                    ? 'border-[#087f5b] bg-[#087f5b] text-white shadow-md shadow-emerald-900/20 ring-2 ring-[#087f5b]/30'
                    : 'border-gray-200/90 bg-white text-gray-900 shadow-sm hover:border-[#087f5b]/60 hover:shadow-md dark:border-white/10 dark:bg-[#12161f] dark:text-white dark:hover:border-emerald-500/50'
                }`}
              >
                {/* Store Avatar with Story Gradient Ring (Click to view Story) */}
                <button
                  type="button"
                  data-testid={`store-story-trigger-${store.id}`}
                  title={hasStory ? `Voir la Story 24h de ${store.name}` : store.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasStory) {
                      setActiveStoryStore(store);
                    } else {
                      onSelectStore(selected ? null : store.id);
                    }
                  }}
                  className={`relative flex shrink-0 items-center justify-center rounded-2xl p-0.5 transition-transform hover:scale-105 ${
                    hasStory && !selected
                      ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 animate-pulse ring-2 ring-emerald-400/40'
                      : ''
                  }`}
                >
                  <div
                    className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border font-black text-sm ${
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
                </button>

                {/* Info (Click to filter feed) */}
                <button
                  type="button"
                  onClick={() => onSelectStore(selected ? null : store.id)}
                  className="min-w-0 flex-1 text-left focus:outline-none"
                >
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
                </button>

                {/* Flash Drop / Unread badge (Click to open story) */}
                {store.active_flash_drop ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveStoryStore(store);
                    }}
                    title={store.active_flash_drop.title}
                    className="flex h-6 items-center gap-1 shrink-0 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2 text-[10px] font-black text-white shadow-sm animate-pulse hover:scale-105 transition"
                  >
                    <Zap className="h-3 w-3" />
                    <span>{store.active_flash_drop.discount}</span>
                  </button>
                ) : store.unread_updates_count > 0 ? (
                  <span
                    data-testid={`unread-badge-${store.id}`}
                    className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-black tabular-nums shadow-sm ${
                      selected ? 'bg-white text-[#087f5b]' : 'bg-[#c2412d] text-white'
                    }`}
                  >
                    {store.unread_updates_count}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Story & Flash Drop Reel Modal (4.1) */}
      {activeStoryStore && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="story-reel-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn"
          onClick={() => setActiveStoryStore(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white shadow-2xl border border-white/10 p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Story Progress Bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 transition-all duration-100 ease-linear"
                style={{ width: `${storyProgress}%` }}
              />
            </div>

            {/* Header with Store Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-2xl border-2 border-emerald-500 bg-white/10 flex items-center justify-center font-black">
                  {activeStoryStore.logo_url ? (
                    <img src={activeStoryStore.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span>{getInitials(activeStoryStore.name)}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-black text-white">{activeStoryStore.name}</h3>
                    {activeStoryStore.is_verified && (
                      <span className="rounded-full bg-emerald-500 p-0.5 text-black">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">@{activeStoryStore.subdomain} · Story 24h</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveStoryStore(null)}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Story Content / Flash Drop Highlight */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-950/60 to-teal-950/60 border border-emerald-500/30 p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                <Flame className="h-4 w-4 text-amber-400 animate-bounce" />
                <span>OFFRE FLASH EXCLUSIVE ABONNÉS</span>
              </div>

              <div>
                <h4 className="text-xl font-black text-white">
                  {activeStoryStore.active_flash_drop?.title || 'Nouvelle Vague de Produits Disponibles !'}
                </h4>
                <p className="mt-1 text-xs text-gray-300">
                  Cette boutique vient de publier de nouvelles offres et promotions privées réservées à sa communauté Panda.
                </p>
              </div>

              {activeStoryStore.active_flash_drop && (
                <div className="flex items-center justify-between rounded-xl bg-black/40 border border-white/10 p-3">
                  <div>
                    <span className="text-[11px] font-bold text-gray-400">Remise VIP</span>
                    <p className="text-lg font-black text-emerald-400">{activeStoryStore.active_flash_drop.discount}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCoupon(`VIP_${activeStoryStore.subdomain.toUpperCase()}`)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 transition"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copiedCoupon ? 'Copié !' : 'Copier le code'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  onSelectStore(activeStoryStore.id);
                  setActiveStoryStore(null);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/40"
              >
                <span>Explorer son Fil</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
