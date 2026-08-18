import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Store,
  X,
  Sparkles,
  Flame,
  Zap,
  Copy,
  ExternalLink,
  ArrowRight,
  Layers,
  ShoppingBag,
  Bell,
} from 'lucide-react';
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
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  // List of stores that have active stories
  const storyStores = followedStores.filter(
    (s) => s.has_active_story || (s.unread_updates_count > 0 && s.active_flash_drop)
  );

  const activeStoryStore =
    activeStoryIndex !== null && activeStoryIndex >= 0 && activeStoryIndex < followedStores.length
      ? followedStores[activeStoryIndex]
      : null;

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const isRtl = dir === 'rtl';
    let scrollAmount = direction === 'left' ? -300 : 300;
    if (isRtl) scrollAmount = -scrollAmount;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const openStoryForStore = (store: FollowedStoreItem) => {
    const idx = followedStores.findIndex((s) => s.id === store.id);
    if (idx !== -1) {
      setActiveStoryIndex(idx);
      setStoryProgress(0);
      setIsPaused(false);
    }
  };

  const nextStory = useCallback(() => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex < followedStores.length - 1) {
      setActiveStoryIndex((prev) => (prev !== null ? prev + 1 : null));
      setStoryProgress(0);
    } else {
      setActiveStoryIndex(null);
      setStoryProgress(0);
    }
  }, [activeStoryIndex, followedStores.length]);

  const prevStory = useCallback(() => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => (prev !== null ? prev - 1 : null));
      setStoryProgress(0);
    }
  }, [activeStoryIndex]);

  // Auto-advancing Story progress timer (5 seconds) with pause-on-hover
  useEffect(() => {
    if (!activeStoryStore || isPaused) return;

    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryStore, isPaused, nextStory]);

  // Keyboard navigation for Story Modal
  useEffect(() => {
    if (!activeStoryStore) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveStoryIndex(null);
      if (e.key === 'ArrowRight') nextStory();
      if (e.key === 'ArrowLeft') prevStory();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStoryStore, nextStory, prevStory]);

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
      className="rounded-3xl border border-gray-200/80 bg-white/90 p-5 shadow-xs backdrop-blur-xl dark:border-white/10 dark:bg-[#161a22]/90 sm:p-6"
    >
      {/* Header bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#087f5b]/10 text-[#087f5b] shadow-inner dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="followed-stores-title" className="text-base font-black tracking-tight text-gray-900 dark:text-white sm:text-lg">
                {t('followedFeed.followedStores')}
              </h2>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {followedStores.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('followedFeed.carouselHint')}
            </p>
          </div>
        </div>

        {/* Scroll Controls & Actions */}
        <div className="flex items-center gap-2">
          {selectedStoreId && (
            <button
              type="button"
              onClick={() => onSelectStore(null)}
              data-testid="clear-store-filter"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 shadow-2xs transition hover:bg-gray-100 dark:border-white/10 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15"
            >
              <X className="h-3.5 w-3.5" />
              <span>{t('followedFeed.allStores')}</span>
            </button>
          )}

          {followedStores.length > 2 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scroll('left')}
                aria-label="Faire défiler vers la gauche"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200/80 bg-white text-gray-600 shadow-2xs transition hover:bg-gray-50 hover:text-gray-900 dark:border-white/10 dark:bg-[#1f242e] dark:text-gray-300 dark:hover:bg-[#282e3b]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                aria-label="Faire défiler vers la droite"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200/80 bg-white text-gray-600 shadow-2xs transition hover:bg-gray-50 hover:text-gray-900 dark:border-white/10 dark:bg-[#1f242e] dark:text-gray-300 dark:hover:bg-[#282e3b]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Zero Followed Stores State */}
      {followedStores.length === 0 ? (
        <div
          className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300/80 bg-gray-50/50 p-6 text-center dark:border-white/10 dark:bg-white/2"
          data-testid="empty-followed-stores"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#087f5b] shadow-inner dark:bg-emerald-950/40 dark:text-emerald-400">
            <Store className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-bold text-gray-800 dark:text-gray-200">
            {t('followedFeed.noFollowedStores')}
          </p>
          <p className="mt-1 max-w-md text-xs leading-5 text-gray-500 dark:text-gray-400">
            {t('followedFeed.exploreHint')}
          </p>
        </div>
      ) : (
        /* Carousel Track */
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800"
          data-testid="followed-stores-carousel"
        >
          {/* "Tous les flux" Master Toggle Chip */}
          <button
            type="button"
            data-testid="all-stores-master-chip"
            onClick={() => onSelectStore(null)}
            className={`group relative flex min-w-[170px] shrink-0 items-center gap-3 rounded-2xl border p-2.5 text-left transition-all duration-200 ${
              selectedStoreId === null
                ? 'border-[#087f5b] bg-[#087f5b] text-white shadow-md shadow-emerald-900/20 ring-2 ring-[#087f5b]/30'
                : 'border-gray-200/90 bg-white text-gray-900 shadow-2xs hover:border-[#087f5b]/60 hover:shadow-xs dark:border-white/10 dark:bg-[#12161f] dark:text-white dark:hover:border-emerald-500/50'
            }`}
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-black transition-transform group-hover:scale-105 ${
                selectedStoreId === null
                  ? 'border-white/20 bg-white/20 text-white'
                  : 'border-gray-200/60 bg-gray-100 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300'
              }`}
            >
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-black sm:text-sm">
                {t('followedFeed.allStoresChip')}
              </span>
              <span
                className={`block text-[10px] font-medium ${
                  selectedStoreId === null ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {followedStores.length} boutique{followedStores.length > 1 ? 's' : ''}
              </span>
            </div>
          </button>

          {/* Individual Followed Store Chips */}
          {followedStores.map((store) => {
            const selected = selectedStoreId === store.id;
            const hasStory = store.has_active_story || store.active_flash_drop != null;

            return (
              <div
                key={store.id}
                data-testid={`store-chip-${store.id}`}
                className={`group relative flex min-w-[230px] max-w-[270px] shrink-0 items-center gap-3 rounded-2xl border p-2.5 text-left transition-all duration-200 ${
                  selected
                    ? 'border-[#087f5b] bg-[#087f5b] text-white shadow-md shadow-emerald-900/20 ring-2 ring-[#087f5b]/30'
                    : 'border-gray-200/90 bg-white text-gray-900 shadow-2xs hover:border-[#087f5b]/60 hover:shadow-xs dark:border-white/10 dark:bg-[#12161f] dark:text-white dark:hover:border-emerald-500/50'
                }`}
              >
                {/* Store Avatar with Story Gradient Ring */}
                <button
                  type="button"
                  data-testid={`store-story-trigger-${store.id}`}
                  title={hasStory ? `Visionner la Story de ${store.name}` : store.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasStory) {
                      openStoryForStore(store);
                    } else {
                      onSelectStore(selected ? null : store.id);
                    }
                  }}
                  className={`relative flex shrink-0 items-center justify-center rounded-2xl p-[2px] transition-transform hover:scale-105 ${
                    hasStory && !selected
                      ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 animate-pulse'
                      : ''
                  }`}
                >
                  <div
                    className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border font-black text-xs ${
                      selected
                        ? 'border-white/20 bg-white/20 text-white'
                        : 'border-gray-100 bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-800 dark:border-white/10 dark:from-emerald-950/60 dark:to-teal-900/40 dark:text-emerald-300'
                    }`}
                  >
                    {store.logo_url ? (
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        className="h-full w-full object-contain p-0.5 bg-white dark:bg-gray-800 rounded-[12px]"
                      />
                    ) : (
                      <span>{getInitials(store.name)}</span>
                    )}
                  </div>
                </button>

                {/* Store Details (Click to filter timeline) */}
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
                          selected
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
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

                {/* Flash Drop Badge or Unread Pill */}
                {store.active_flash_drop ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openStoryForStore(store);
                    }}
                    title={store.active_flash_drop.title}
                    className="flex h-6 shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-2 text-[10px] font-black text-white shadow-2xs hover:scale-105 transition active:scale-95"
                  >
                    <Zap className="h-3 w-3" />
                    <span>{store.active_flash_drop.discount}</span>
                  </button>
                ) : store.unread_updates_count > 0 ? (
                  <span
                    data-testid={`unread-badge-${store.id}`}
                    className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-black tabular-nums shadow-2xs ${
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

      {/* Interactive Story & Flash Drop Reel Modal */}
      {activeStoryStore && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="story-reel-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fadeIn"
          onClick={() => setActiveStoryIndex(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white shadow-2xl border border-white/10 p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Story Progress Indicators */}
            <div className="flex items-center gap-1.5 w-full">
              {followedStores.map((_, i) => {
                let widthPercent = 0;
                if (activeStoryIndex !== null) {
                  if (i < activeStoryIndex) widthPercent = 100;
                  else if (i === activeStoryIndex) widthPercent = storyProgress;
                  else widthPercent = 0;
                }
                return (
                  <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 transition-all duration-100 ease-linear"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Header with Store Info & Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-2xl border-2 border-emerald-500 bg-white/10 flex items-center justify-center font-black">
                  {activeStoryStore.logo_url ? (
                    <img
                      src={activeStoryStore.logo_url}
                      alt=""
                      className="h-full w-full object-contain p-1 bg-white"
                    />
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
                  <p className="text-xs text-gray-400">
                    @{activeStoryStore.subdomain} · {t('followedFeed.storyActive')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveStoryIndex(null)}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Story Content / Flash Drop Highlight */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-950/60 to-teal-950/60 border border-emerald-500/30 p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                <Flame className="h-4 w-4 text-amber-400 animate-bounce" />
                <span>{t('followedFeed.vipOffer')}</span>
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
                <div className="flex items-center justify-between rounded-xl bg-black/40 border border-white/10 p-3.5">
                  <div>
                    <span className="text-[11px] font-bold text-gray-400">Remise VIP</span>
                    <p className="text-lg font-black text-emerald-400">
                      {activeStoryStore.active_flash_drop.discount}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCoupon(`VIP_${activeStoryStore.subdomain.toUpperCase()}`)
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition active:scale-95"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>
                      {copiedCoupon ? t('followedFeed.copied') : t('followedFeed.copyCode')}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Navigation & Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  onSelectStore(activeStoryStore.id);
                  setActiveStoryIndex(null);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/40 active:scale-95"
              >
                <span>{t('followedFeed.exploreFeed')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
