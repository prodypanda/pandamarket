'use client';

import Link from 'next/link';
import { fetchWithCsrf } from '@/lib/api';
import { ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Ad = {
  campaign_id: string;
  creative_id: string;
  title: string;
  description?: string;
  image_url?: string;
  cta_label?: string;
  destination_url?: string;
  store_name: string;
  event_token: string;
};

type Attribution = {
  campaign_id: string;
  creative_id: string;
  event_key: string;
  created_at: number;
};

const eventKey = (type: string, ad: Ad) => `${type}:${ad.campaign_id}:${ad.creative_id}:${crypto.randomUUID()}`;

function adsSession() {
  let value = sessionStorage.getItem('pd_ads_session');
  if (!value) {
    value = crypto.randomUUID();
    sessionStorage.setItem('pd_ads_session', value);
  }
  return value;
}

export function SponsoredAdsRail({
  placement = 'hub.sponsored_products',
  title = 'Sponsored',
  locale = 'all',
  category,
  variant = 'cards',
}: {
  placement?: string;
  title?: string;
  locale?: 'all' | 'fr' | 'en' | 'ar';
  category?: string;
  variant?: 'cards' | 'banner';
}) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const viewed = useRef(new Set<string>());
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    const device = window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
    const audience = localStorage.getItem('pd_returning_visitor') === '1' ? 'returning' : 'new';
    localStorage.setItem('pd_returning_visitor', '1');
    const params = new URLSearchParams({ placement, limit: '6', locale, device, audience });
    if (category) params.set('category', category);
    fetch(`/api/pd/ads/public/delivery?${params}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { ads: [] }))
      .then((d) => setAds(d.ads || []))
      .catch(() => setAds([]));
  }, [placement, locale, category]);

  // Auto-rotate banner ads if multiple ads exist
  useEffect(() => {
    if (variant !== 'banner' || ads.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % ads.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [variant, ads.length]);

  // Impression observer
  useEffect(() => {
    if (!ads.length || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.adId;
          if (!id) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (viewed.current.has(id) || timers.current.has(id)) return;
            const ad = ads.find((a) => a.creative_id === id);
            if (!ad) return;
            const timer = window.setTimeout(() => {
              viewed.current.add(id);
              timers.current.delete(id);
              fetchWithCsrf('/api/pd/ads/public/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: ad.event_token, event_type: 'impression', event_key: eventKey('impression', ad), session_hash: adsSession() }),
              }).catch(() => undefined);
            }, 1000);
            timers.current.set(id, timer);
          } else {
            const timer = timers.current.get(id);
            if (timer) {
              window.clearTimeout(timer);
              timers.current.delete(id);
            }
          }
        }),
      { threshold: [0, 0.5, 1] }
    );
    document.querySelectorAll('[data-sponsored-ad]').forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, [ads]);

  if (!ads.length) return null;

  if (variant === 'banner') {
    const currentAd = ads[activeIndex % ads.length];
    return (
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <Link
            data-sponsored-ad
            data-ad-id={currentAd.creative_id}
            href={`/api/pd/ads/public/click?token=${encodeURIComponent(currentAd.event_token)}`}
            onClick={() => {
              const key = eventKey('click', currentAd);
              localStorage.setItem('pd_ads_attribution', JSON.stringify({ campaign_id: currentAd.campaign_id, creative_id: currentAd.creative_id, event_key: key, created_at: Date.now() }));
              void fetchWithCsrf('/api/pd/ads/public/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: currentAd.event_token, event_type: 'click', event_key: key, session_hash: adsSession() }),
                keepalive: true,
              });
            }}
            className="relative block min-h-60"
          >
            {currentAd.image_url && <img src={currentAd.image_url} alt={currentAd.title} className="absolute inset-0 h-full w-full object-cover opacity-60 transition-all duration-700" />}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
            <div className="relative max-w-2xl p-8 sm:p-10">
              <span className="rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950">
                Sponsored {ads.length > 1 ? `(${activeIndex + 1}/${ads.length})` : ''}
              </span>
              <h2 className="mt-4 text-2xl sm:text-3xl font-black">{currentAd.title}</h2>
              {currentAd.description && <p className="mt-2 text-sm text-white/80 line-clamp-2">{currentAd.description}</p>}
              <p className="mt-2 text-xs font-semibold text-amber-300">By {currentAd.store_name}</p>
              <span className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-xs font-black text-slate-950 shadow-md">
                {currentAd.cta_label || 'Learn more'}
              </span>
            </div>
          </Link>

          {/* Multiple Banner Controls & Indicators */}
          {ads.length > 1 && (
            <div className="absolute bottom-4 right-6 flex items-center gap-3 z-10">
              <button
                type="button"
                aria-label="Previous sponsored banner"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveIndex((prev) => (prev - 1 + ads.length) % ads.length);
                }}
                className="rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition cursor-pointer backdrop-blur-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {ads.map((a, idx) => (
                  <button
                    key={a.creative_id}
                    type="button"
                    aria-label={`Go to slide ${idx + 1}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveIndex(idx);
                    }}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${idx === activeIndex ? 'w-6 bg-amber-400' : 'w-2.5 bg-white/40'}`}
                  />
                ))}
              </div>

              <button
                type="button"
                aria-label="Next sponsored banner"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveIndex((prev) => (prev + 1) % ads.length);
                }}
                className="rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition cursor-pointer backdrop-blur-sm"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-amber-600" />
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {ads.map((ad) => (
          <Link
            data-sponsored-ad
            data-ad-id={ad.creative_id}
            key={ad.creative_id}
            href={`/api/pd/ads/public/click?token=${encodeURIComponent(ad.event_token)}`}
            onClick={() => {
              const key = eventKey('click', ad);
              const attribution: Attribution = { campaign_id: ad.campaign_id, creative_id: ad.creative_id, event_key: key, created_at: Date.now() };
              localStorage.setItem('pd_ads_attribution', JSON.stringify(attribution));
              fetchWithCsrf('/api/pd/ads/public/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: ad.event_token, event_type: 'click', event_key: key, session_hash: adsSession() }),
                keepalive: true,
              }).catch(() => undefined);
            }}
            className="group overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="aspect-square bg-slate-100">
              {ad.image_url ? (
                <img src={ad.image_url} alt={ad.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Megaphone className="text-slate-300" />
                </div>
              )}
            </div>
            <div className="p-3">
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-800">Sponsored</span>
              <p className="mt-2 line-clamp-2 text-sm font-black text-slate-900">{ad.title}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{ad.store_name}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
