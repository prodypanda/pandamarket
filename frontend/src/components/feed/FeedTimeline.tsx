'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Check,
  ListFilter,
  PackageOpen,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  Store,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Share2,
  Tag,
  X,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { getResizedImageUrl } from '@/lib/image-url';
import { useLocale } from '@/contexts/LocaleContext';

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
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
}

export const FeedTimeline: React.FC<FeedTimelineProps> = ({
  products,
  activeFilter,
  onFilterChange,
  onAddToCart,
  selectedTag = null,
  onSelectTag,
}) => {
  const { t, dir } = useLocale();
  const [cartSuccessId, setCartSuccessId] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc' | 'discount_desc'>('recent');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const filters = [
    { id: 'all' as const, label: t('followedFeed.allStores') || 'Tous les flux', icon: ListFilter },
    { id: 'price_drops' as const, label: t('storeFollow.priceDrops') || 'Baisses de prix', icon: TrendingDown },
    { id: 'new_arrivals' as const, label: t('storeFollow.newProducts') || 'Nouveautés', icon: Sparkles },
  ];

  const handleAddToCartClick = (product: FeedTimelineProduct) => {
    onAddToCart?.(product);
    setCartSuccessId(product.id);
    window.setTimeout(() => setCartSuccessId(null), 2200);
  };

  const handleShareClick = (product: FeedTimelineProduct) => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/hub/products/${product.id}` : `/hub/products/${product.id}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedShareId(product.id);
    window.setTimeout(() => setCopiedShareId(null), 2000);
  };

  // In-feed Search, Tag Filtering & Sorting
  const processedProducts = useMemo(() => {
    let list = [...products];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.store_name.toLowerCase().includes(q) ||
          (p.interest_tags && p.interest_tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }

    // 2. Tag Filter
    if (selectedTag) {
      list = list.filter((p) => p.interest_tags && p.interest_tags.includes(selectedTag));
    }

    // 3. Sorting
    list.sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'discount_desc') {
        const discA = a.discount_percentage || 0;
        const discB = b.discount_percentage || 0;
        return discB - discA;
      }
      // 'recent' by default
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    return list;
  }, [products, searchQuery, selectedTag, sortBy]);

  // Extract top active tags across current products for quick chips
  const availableTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (p.interest_tags) {
        for (const t of p.interest_tags) {
          map.set(t, (map.get(t) || 0) + 1);
        }
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [products]);

  return (
    <section data-testid="section-feed-timeline" aria-labelledby="feed-timeline-title" dir={dir} className="space-y-5">
      {/* Header & Main Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="feed-timeline-title" className="text-xl font-black tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            {t('followedFeed.title') || 'Nouveautés & Offres'}
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('followedFeed.subtitle') || 'Activités récentes des boutiques que vous suivez.'}
          </p>
        </div>

        {/* Filter Badges (All / Price drops / New arrivals) */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-gray-200/80 bg-gray-100/60 p-1 dark:border-white/10 dark:bg-white/5">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                data-testid={`filter-btn-${filter.id}`}
                onClick={() => onFilterChange(filter.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-[#1f242e] dark:text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar: Search + Sort + View Mode */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-gray-200/80 bg-white/70 p-2.5 shadow-xs backdrop-blur-sm dark:border-white/10 dark:bg-[#161a22]/70">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un produit, une boutique, un tag..."
            className="w-full rounded-xl border border-transparent bg-gray-50/80 py-2 ps-9 pe-8 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:bg-white/5 dark:text-white dark:focus:bg-[#1f242e]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort selector + View Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative inline-flex items-center gap-1.5 rounded-xl border border-gray-200/80 bg-gray-50/80 px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
            <ArrowUpDown className="h-3 w-3 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none cursor-pointer"
            >
              <option value="recent">Plus récents</option>
              <option value="discount_desc">Plus forte remise</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </select>
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex items-center rounded-xl border border-gray-200/80 bg-gray-100/60 p-0.5 dark:border-white/10 dark:bg-white/5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Vue Liste"
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'list'
                  ? 'bg-white text-emerald-700 shadow-xs dark:bg-[#1f242e] dark:text-emerald-400'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Vue Grille"
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'grid'
                  ? 'bg-white text-emerald-700 shadow-xs dark:bg-[#1f242e] dark:text-emerald-400'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Tag Pills (if available) */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-gray-400 me-1">Filtrer par tag:</span>
          {availableTags.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onSelectTag?.(isSelected ? null : tag)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15'
                }`}
              >
                <span>#{tag}</span>
                {isSelected && <X className="h-3 w-3 ms-0.5" />}
              </button>
            );
          })}
          {selectedTag && (
            <button
              type="button"
              onClick={() => onSelectTag?.(null)}
              className="text-[10px] font-bold text-red-600 hover:underline ms-1 dark:text-red-400"
            >
              Effacer le tag
            </button>
          )}
        </div>
      )}

      {/* Feed List or Empty State */}
      {processedProducts.length === 0 ? (
        <div
          className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300/80 p-8 text-center dark:border-white/10"
          data-testid="empty-feed-timeline"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500">
            <PackageOpen className="h-7 w-7" />
          </div>
          <p className="mt-4 text-sm font-black text-gray-800 dark:text-gray-200">
            {searchQuery || selectedTag
              ? 'Aucun produit ne correspond à vos filtres actuels.'
              : t('followedFeed.emptyFeed') || 'Aucune nouveauté récente cette semaine dans ce filtre.'}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {searchQuery || selectedTag
              ? 'Essayez de modifier vos termes de recherche ou de réinitialiser les filtres.'
              : t('followedFeed.emptyFeedHint') || 'Essayez de sélectionner « Tous les flux » ou explorez d\'autres boutiques recommandées.'}
          </p>
          {(searchQuery || selectedTag || activeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                onSelectTag?.(null);
                onFilterChange('all');
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3.5 py-1.5 text-xs font-bold text-gray-800 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              <span>Réinitialiser les filtres</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ================= GRID VIEW ================= */
        <div data-testid="feed-timeline-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedProducts.map((product) => {
            const isAdded = cartSuccessId === product.id;
            const isCopied = copiedShareId === product.id;
            const hasDate = !Number.isNaN(new Date(product.published_at).getTime());
            const formattedDate = hasDate
              ? new Intl.DateTimeFormat('fr-TN', { day: '2-digit', month: 'short' }).format(new Date(product.published_at))
              : '';
            const isDiscounted = !!product.discount_percentage && product.discount_percentage > 0;
            const imageUrl = product.image_url ? getResizedImageUrl(product.image_url, 'medium') : null;
            const productHref = `/hub/products/${encodeURIComponent(product.id)}`;

            return (
              <article
                key={product.id}
                data-testid={`timeline-item-${product.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/80 bg-white/90 p-3.5 shadow-sm transition-all hover:border-[#087f5b]/50 hover:shadow-md dark:border-white/10 dark:bg-[#161a22]"
              >
                <div>
                  {/* Image & Badges */}
                  <Link
                    href={productHref}
                    className="relative block aspect-square w-full overflow-hidden rounded-xl bg-gray-50 dark:bg-white/5"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-600">
                        <PackageOpen className="h-10 w-10 stroke-[1.5]" />
                      </div>
                    )}

                    {isDiscounted && (
                      <span
                        data-testid={`discount-badge-${product.id}`}
                        className="absolute start-2 top-2 rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-black text-white shadow-sm"
                      >
                        -{product.discount_percentage}%
                      </span>
                    )}

                    {product.is_new_arrival && (
                      <span className="absolute end-2 top-2 rounded-lg bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
                        NOUVEAU
                      </span>
                    )}
                  </Link>

                  {/* Store & Date */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-[#087f5b] dark:text-emerald-400 truncate max-w-[70%]">
                      <Store className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{product.store_name}</span>
                    </span>
                    {formattedDate && <span className="text-[10px] text-gray-400">{formattedDate}</span>}
                  </div>

                  {/* Title */}
                  <Link href={productHref} className="block mt-1">
                    <h3 className="line-clamp-2 text-sm font-bold text-gray-900 transition-colors group-hover:text-[#087f5b] dark:text-white dark:group-hover:text-emerald-400">
                      {product.title}
                    </h3>
                  </Link>
                </div>

                {/* Price & Actions */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-base font-black tabular-nums text-gray-900 dark:text-white">
                      {product.price.toFixed(3)} TND
                    </div>
                    {product.original_price && product.original_price > product.price && (
                      <div className="text-[11px] font-bold tabular-nums text-gray-400 line-through">
                        {product.original_price.toFixed(3)} TND
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleShareClick(product)}
                      title="Partager"
                      className="rounded-xl border border-gray-200/80 p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/10"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
                    </button>

                    <button
                      type="button"
                      data-testid={`btn-add-to-cart-${product.id}`}
                      onClick={() => handleAddToCartClick(product)}
                      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-black transition-all ${
                        isAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-900 text-white hover:bg-[#087f5b] dark:bg-white dark:text-gray-900 dark:hover:bg-emerald-400'
                      }`}
                    >
                      {isAdded ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* ================= LIST VIEW (DEFAULT) ================= */
        <div data-testid="feed-timeline-list" className="divide-y divide-gray-100 dark:divide-white/5">
          {processedProducts.map((product) => {
            const isAdded = cartSuccessId === product.id;
            const isCopied = copiedShareId === product.id;
            const hasDate = !Number.isNaN(new Date(product.published_at).getTime());
            const formattedDate = hasDate
              ? new Intl.DateTimeFormat('fr-TN', { day: '2-digit', month: 'short' }).format(new Date(product.published_at))
              : '';
            const isDiscounted = !!product.discount_percentage && product.discount_percentage > 0;
            const imageUrl = product.image_url ? getResizedImageUrl(product.image_url, 'medium') : null;
            const productHref = `/hub/products/${encodeURIComponent(product.id)}`;

            return (
              <article
                key={product.id}
                data-testid={`timeline-item-${product.id}`}
                className="group grid gap-4 py-5 transition-colors sm:grid-cols-[108px_minmax(0,1fr)_auto] sm:items-center sm:gap-6"
              >
                {/* Product Thumbnail (Clickable Link) */}
                <Link
                  href={productHref}
                  className="relative aspect-square w-full sm:w-[108px] overflow-hidden rounded-xl border border-gray-100 bg-gray-50 shadow-xs transition-transform duration-300 hover:opacity-95 dark:border-white/10 dark:bg-[#161a22]"
                >
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
                </Link>

                {/* Details */}
                <div className="min-w-0">
                  {/* Meta Bar */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-[#087f5b] dark:text-emerald-400">
                      <Store className="h-3.5 w-3.5" />
                      {product.store_name}
                    </span>

                    {formattedDate && <span className="text-gray-400 dark:text-gray-500">· {formattedDate}</span>}

                    {product.is_new_arrival && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        {t('followedFeed.newArrival') || 'NOUVEAU'}
                      </span>
                    )}
                  </div>

                  {/* Title (Clickable Link) */}
                  <Link href={productHref} className="block">
                    <h3 className="mt-1.5 text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-[#087f5b] dark:text-white dark:group-hover:text-emerald-400 sm:text-lg">
                      {product.title}
                    </h3>
                  </Link>

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
                          <button
                            key={tag}
                            type="button"
                            onClick={() => onSelectTag?.(selectedTag === tag ? null : tag)}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition ${
                              selectedTag === tag
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
                            }`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action CTA */}
                <div className="flex items-center justify-start sm:justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleShareClick(product)}
                    title={isCopied ? 'Lien copié !' : 'Partager'}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200/80 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/10"
                  >
                    {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    data-testid={`btn-add-to-cart-${product.id}`}
                    onClick={() => handleAddToCartClick(product)}
                    aria-label={isAdded ? `${product.title} ajouté au panier` : `Ajouter ${product.title} au panier`}
                    className={`inline-flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-5 text-xs font-black transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f5b] shadow-xs ${
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
