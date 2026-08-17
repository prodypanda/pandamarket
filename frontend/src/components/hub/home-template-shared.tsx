'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { History, Star, ShoppingCart, Check, Store, ShieldCheck } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import type { MarketplaceSettings } from '@/lib/marketplace-settings';

export interface HomeProduct {
  id: string;
  title: string;
  slug?: string | null;
  price: number | string;
  compare_at_price?: number | string | null;
  average_rating?: number | string | null;
  review_count?: number | string | null;
  store_name?: string;
  store_subdomain?: string | null;
  store_seller_type?: string | null;
  store_is_verified?: boolean | null;
  store_score?: number | string | null;
  images?: { url: string }[];
  thumbnail?: string | null;
  category?: string;
  marketplace_category_slug?: string | null;
}

export function StoreInfoBadge({
  product,
  marketplaceSettings,
  className = '',
  textColor,
  storeIconColor = 'text-slate-400',
}: {
  product: HomeProduct;
  marketplaceSettings?: MarketplaceSettings | null;
  className?: string;
  textColor?: string;
  storeIconColor?: string;
}) {
  const showStoreName = marketplaceSettings?.hub_card_show_store_name !== false;
  const showVerified = marketplaceSettings?.hub_card_show_store_verified !== false;
  const showScore = marketplaceSettings?.hub_card_show_store_score !== false;

  if (!showStoreName && !showVerified && !showScore) return null;

  const isVerified = Boolean(
    product.store_is_verified ||
    (product as any).is_verified ||
    (product as any).store_status === 'verified' ||
    (product as any).store?.is_verified
  );

  const rawScore = product.store_score !== undefined && product.store_score !== null
    ? Number(product.store_score)
    : product.average_rating !== undefined && product.average_rating !== null
      ? Number(product.average_rating)
      : null;

  const formattedScore = rawScore !== null && rawScore > 0 ? rawScore.toFixed(1) : null;

  if (!product.store_name && !isVerified && !formattedScore) return null;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap min-w-0 ${className}`}>
      {showStoreName && product.store_name && (
        <div className="flex items-center gap-1 min-w-0">
          <Store className={`h-3 w-3 shrink-0 ${storeIconColor}`} />
          <span className={`truncate text-xs font-semibold ${textColor || 'text-slate-600 dark:text-slate-300'}`}>
            {product.store_name}
          </span>
        </div>
      )}

      {showVerified && isVerified && (
        <span title="Boutique Vérifiée" className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800/80">
          <ShieldCheck className="h-3 w-3 text-sky-500 fill-sky-500/20" />
          <span className="text-[9px] font-black uppercase">Vérifié</span>
        </span>
      )}

      {showScore && formattedScore && (
        <span title={`Score de la boutique: ${formattedScore}/5`} className="shrink-0 inline-flex items-center gap-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200/60">
          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
          <span>{formattedScore}</span>
        </span>
      )}
    </div>
  );
}

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  image_url?: string | null;
  is_default?: boolean;
  product_count?: number;
}

export function toNumber(price: number | string): number {
  const value = typeof price === 'number' ? price : Number(price);
  return Number.isFinite(value) ? value : 0;
}

export function formatPrice(price: number | string): string {
  return `${toNumber(price).toFixed(3)} TND`;
}

export function getProductImage(product: HomeProduct): string | undefined {
  return product.thumbnail || product.images?.[0]?.url || undefined;
}

export function getProductHref(product: HomeProduct): string {
  return `/hub/products/${encodeURIComponent(product.id)}`;
}

/**
 * Real countdown engine. Counts down to `target` (ISO string) when provided and
 * in the future; otherwise rolls over daily at local midnight so "deals of the
 * day" always show a live, accurate timer.
 */
export function useCountdown(target?: string | null) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const resolveTarget = () => {
      if (target) {
        const parsed = new Date(target).getTime();
        if (Number.isFinite(parsed) && parsed > Date.now()) return parsed;
      }
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      return midnight.getTime();
    };

    let end = resolveTarget();
    const tick = () => {
      if (end - Date.now() <= 0) end = resolveTarget();
      setRemainingMs(Math.max(0, end - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    hours: pad(Math.floor(totalSeconds / 3600)),
    minutes: pad(Math.floor((totalSeconds % 3600) / 60)),
    seconds: pad(totalSeconds % 60),
  };
}

export const RECENTLY_VIEWED_KEY = 'pd_recently_viewed';
export const RECENTLY_VIEWED_LIMIT = 12;

export interface RecentlyViewedItem {
  id: string;
  title: string;
  price: number;
  thumbnail?: string | null;
  href: string;
  viewed_at?: number;
}

export function readRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is RecentlyViewedItem => Boolean(item) && typeof item.id === 'string' && typeof item.href === 'string')
      : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(item: RecentlyViewedItem) {
  if (typeof window === 'undefined') return;
  try {
    const existing = readRecentlyViewed().filter((entry) => entry.id !== item.id);
    const next = [{ ...item, viewed_at: Date.now() }, ...existing].slice(0, RECENTLY_VIEWED_LIMIT);
    window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode / quota exceeded) — ignore silently
  }
}

/**
 * True when the marketplace default locale is Arabic and RTL rendering is
 * enabled from the admin settings. Used to set `dir="rtl"` on templates.
 */
export function isRtlLocale(
  settings?: {
    marketplace_rtl_enabled?: string | boolean;
    marketplace_default_locale?: string;
  },
  activeLocale?: string,
): boolean {
  if (activeLocale) {
    return activeLocale === 'ar' || activeLocale.startsWith('ar');
  }
  if (!settings) return false;
  const rtl = settings.marketplace_rtl_enabled;
  const isRtlEnabled = rtl === true || rtl === 'true';
  return isRtlEnabled && settings.marketplace_default_locale === 'ar';
}

/**
 * Optional admin-configured banner rendered above a homepage block. Shows
 * nothing unless the block has an image_url; the CTA makes it clickable.
 */
export function BlockBanner({ block }: {
  block?: { image_url?: string; cta_label?: string; cta_url?: string; title?: string };
}) {
  if (!block?.image_url) return null;
  const banner = (
    <div className="relative mb-4 h-40 w-full overflow-hidden rounded-2xl bg-gray-100 sm:h-52">
      <div
        aria-label={block.title || 'Section banner'}
        role="img"
        className="h-full w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${getResizedImageUrl(block.image_url, 'large')})` }}
      />
      {block.cta_label && (
        <span className="absolute bottom-3 start-3 rounded-full bg-black/70 px-4 py-1.5 text-xs font-black text-white">
          {block.cta_label}
        </span>
      )}
    </div>
  );
  return block.cta_url ? <Link href={block.cta_url} className="block">{banner}</Link> : banner;
}

export function RecentlyViewedRail({ accentClass = 'text-[#16C784]' }: { accentClass?: string }) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    setItems(readRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center gap-2">
        <History className={`h-5 w-5 ${accentClass}`} />
        <h2 className="text-xl font-black text-gray-900 dark:text-white">Recently viewed</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="w-40 shrink-0 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="mb-2 aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-white/[0.03]">
              {item.thumbnail ? (
                <div aria-label={item.title} role="img" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${getResizedImageUrl(item.thumbnail, 'large')})` }} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-gray-400 dark:text-gray-500">No image</div>
              )}
            </div>
            <p className="line-clamp-2 text-xs font-bold text-gray-900 dark:text-white">{item.title}</p>
            <p className={`mt-1 text-sm font-black ${accentClass}`}>{item.price.toFixed(3)} TND</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function StarRating({
  rating = 0,
  count = 0,
  size = 'sm',
  className = '',
  showCount = true,
  theme = 'amber',
}: {
  rating?: number | string | null;
  count?: number | string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  showCount?: boolean;
  theme?: 'amber' | 'emerald' | 'orange' | 'cyan';
}) {
  const numRating = typeof rating === 'number' ? rating : Number(rating) || 0;
  const numCount = typeof count === 'number' ? count : Number(count) || 0;

  if (numCount <= 0 && numRating <= 0) {
    return null;
  }

  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
  };

  const textSizes = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-sm',
  };

  const themeColors = {
    amber: 'text-amber-400 fill-amber-400',
    emerald: 'text-emerald-500 fill-emerald-500',
    orange: 'text-orange-500 fill-orange-500',
    cyan: 'text-cyan-400 fill-cyan-400',
  };

  const clampedRating = Math.max(0, Math.min(5, numRating));

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => {
          const isFilled = i < Math.floor(clampedRating);
          const isHalf = !isFilled && i < clampedRating;
          return (
            <Star
              key={i}
              className={`${iconSizes[size]} ${
                isFilled
                  ? themeColors[theme]
                  : isHalf
                  ? `${themeColors[theme]} opacity-70`
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          );
        })}
      </div>
      <span className={`font-bold text-gray-700 dark:text-gray-300 ${textSizes[size]}`}>
        {clampedRating > 0 ? clampedRating.toFixed(1) : ''}
      </span>
      {showCount && numCount > 0 && (
        <span className={`text-gray-400 dark:text-gray-500 ${textSizes[size]}`}>
          ({numCount})
        </span>
      )}
    </div>
  );
}

export function QuickAddToCartButton({
  product,
  style = 'icon',
  accentColor = '#16C784',
  className = '',
}: {
  product: HomeProduct;
  style?: 'icon' | 'compact' | 'full' | string;
  accentColor?: string;
  className?: string;
}) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const image = getProductImage(product);
    addToCart({
      product_id: product.id,
      title: product.title,
      slug: product.slug,
      category: product.category,
      marketplace_category_slug: product.marketplace_category_slug,
      price: toNumber(product.price),
      base_price: toNumber(product.price),
      quantity: 1,
      store_id: product.id,
      store_name: product.store_name || 'PandaMarket Store',
      store_subdomain: product.store_subdomain,
      image_url: image || null,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  if (style === 'full') {
    return (
      <button
        type="button"
        onClick={handleAdd}
        aria-label={`Ajouter ${product.title} au panier`}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all shadow-sm ${
          added
            ? 'bg-emerald-600 text-white shadow-emerald-600/30'
            : 'text-white hover:opacity-95 active:scale-95 shadow-sm'
        } ${className}`}
        style={!added ? { backgroundColor: accentColor } : undefined}
      >
        {added ? (
          <>
            <Check className="h-4 w-4 shrink-0" />
            <span>Ajouté !</span>
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span>Ajouter au panier</span>
          </>
        )}
      </button>
    );
  }

  if (style === 'compact') {
    return (
      <button
        type="button"
        onClick={handleAdd}
        aria-label={`Ajouter ${product.title} au panier`}
        className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all shadow-sm ${
          added
            ? 'bg-emerald-600 text-white shadow-emerald-600/30'
            : 'text-white hover:opacity-95 active:scale-95'
        } ${className}`}
        style={!added ? { backgroundColor: accentColor } : undefined}
      >
        {added ? (
          <>
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>Ajouté</span>
          </>
        ) : (
          <>
            <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
            <span>Panier</span>
          </>
        )}
      </button>
    );
  }

  // default: 'icon'
  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-label={`Ajouter ${product.title} au panier`}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all shadow-sm ${
        added
          ? 'bg-emerald-600 text-white shadow-emerald-600/30'
          : 'text-white hover:opacity-95 hover:scale-105 active:scale-90'
      } ${className}`}
      style={!added ? { backgroundColor: accentColor } : undefined}
    >
      {added ? (
        <Check className="h-4 w-4" />
      ) : (
        <ShoppingCart className="h-4 w-4" />
      )}
    </button>
  );
}

