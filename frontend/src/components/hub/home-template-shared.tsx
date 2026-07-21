'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { History } from 'lucide-react';

export interface HomeProduct {
  id: string;
  title: string;
  slug?: string | null;
  price: number | string;
  store_name?: string;
  store_subdomain?: string | null;
  images?: { url: string }[];
  thumbnail?: string | null;
  category?: string;
  marketplace_category_slug?: string | null;
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
export function isRtlLocale(settings?: {
  marketplace_rtl_enabled?: string | boolean;
  marketplace_default_locale?: string;
}): boolean {
  if (!settings) return false;
  const rtl = settings.marketplace_rtl_enabled;
  return (rtl === true || rtl === 'true') && settings.marketplace_default_locale === 'ar';
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
        style={{ backgroundImage: `url(${block.image_url})` }}
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
        <h2 className="text-xl font-black text-gray-900">Recently viewed</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="w-40 shrink-0 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="mb-2 aspect-square overflow-hidden rounded-xl bg-gray-100">
              {item.thumbnail ? (
                <div aria-label={item.title} role="img" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${item.thumbnail})` }} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
              )}
            </div>
            <p className="line-clamp-2 text-xs font-bold text-gray-900">{item.title}</p>
            <p className={`mt-1 text-sm font-black ${accentClass}`}>{item.price.toFixed(3)} TND</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
