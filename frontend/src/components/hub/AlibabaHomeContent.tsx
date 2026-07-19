'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Factory,
  Globe2,
  Headset,
  LayoutGrid,
  Megaphone,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import type { MarketplaceSettings } from '../../lib/marketplace-settings';
import {
  RecentlyViewedRail,
  formatPrice,
  getProductHref,
  getProductImage,
  useCountdown,
  type HomeCategory,
  type HomeProduct,
} from './home-template-shared';

interface AlibabaHomeContentProps {
  trendingProducts: HomeProduct[];
  categories: HomeCategory[];
  marketplaceSettings: MarketplaceSettings;
}

interface HeroSlide {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl?: string | null;
}

const NAVY = '#0b1e3f';
const ORANGE = '#ff6a00';

export function AlibabaHomeContent({ trendingProducts, categories, marketplaceSettings }: AlibabaHomeContentProps) {
  const marketplaceName = marketplaceSettings.marketplace_name || 'PandaMarket';
  const [activeCategory, setActiveCategory] = useState<HomeCategory | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const countdown = useCountdown();

  // Admin-managed hero carousel: the configured banner (admin settings) is
  // always slide 1, followed by featured category slides.
  const slides = useMemo<HeroSlide[]>(() => {
    const result: HeroSlide[] = [];
    if (marketplaceSettings.hub_homepage_banner_title) {
      result.push({
        title: marketplaceSettings.hub_homepage_banner_title,
        subtitle: marketplaceSettings.hub_homepage_banner_subtitle || '',
        ctaLabel: marketplaceSettings.hub_homepage_banner_cta_label || 'Shop now',
        ctaUrl: marketplaceSettings.hub_homepage_banner_cta_url || '/hub/search',
        imageUrl: marketplaceSettings.hub_homepage_banner_image_url,
      });
    }
    categories.slice(0, 3).forEach((category) => {
      result.push({
        title: category.name,
        subtitle: category.short_description || category.description || 'Source directly from verified sellers.',
        ctaLabel: 'Source now',
        ctaUrl: `/hub/category/${encodeURIComponent(category.slug)}`,
        imageUrl: category.image_url,
      });
    });
    if (result.length === 0) {
      result.push({
        title: marketplaceName,
        subtitle: marketplaceSettings.marketplace_tagline || 'The B2B sourcing marketplace.',
        ctaLabel: 'Explore marketplace',
        ctaUrl: '/hub/search',
      });
    }
    return result;
  }, [categories, marketplaceName, marketplaceSettings]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setSlideIndex((prev) => (prev + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  const slide = slides[slideIndex % slides.length] ?? slides[0];

  const topSellers = useMemo(() => {
    const map = new Map<string, { name: string; subdomain?: string | null; count: number }>();
    trendingProducts.forEach((product) => {
      if (!product.store_name) return;
      const current = map.get(product.store_name) || { name: product.store_name, subdomain: product.store_subdomain, count: 0 };
      current.count += 1;
      map.set(product.store_name, current);
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [trendingProducts]);

  const sponsoredBrands = topSellers.slice(0, 4);
  const dealProducts = trendingProducts.slice(0, 6);
  const gridProducts = trendingProducts.slice(0, 12);

  return (
    <div className="bg-[#f4f6fa] text-gray-900">
      {/* Utility bar */}
      <div className="text-white" style={{ backgroundColor: NAVY }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-[11px] font-bold sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4 text-white/80">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Trade assurance on every order</span>
            {marketplaceSettings.marketplace_support_email && (
              <span className="hidden items-center gap-1.5 sm:inline-flex"><Headset className="h-3.5 w-3.5" /> {marketplaceSettings.marketplace_support_email}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/hub/orders" className="hover:text-[#ffb37d]">Track order</Link>
            <Link href={marketplaceSettings.marketplace_help_url || '/hub/cases'} className="hover:text-[#ffb37d]">Help center</Link>
            <Link href="/hub/vendor-signup" className="rounded-full px-3 py-1 text-white" style={{ backgroundColor: ORANGE }}>Become a supplier</Link>
          </div>
        </div>
      </div>

      {/* Hero: mega-category sidebar + carousel + seller rail */}
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr_240px] lg:px-8">
        <aside className="relative hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:block" onMouseLeave={() => setActiveCategory(null)}>
          <p className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500">
            <LayoutGrid className="h-4 w-4" style={{ color: ORANGE }} /> All categories
          </p>
          <ul className="max-h-[380px] overflow-y-auto py-1">
            {categories.slice(0, 12).map((category) => (
              <li key={category.id} onMouseEnter={() => setActiveCategory(category)}>
                <Link
                  href={`/hub/category/${encodeURIComponent(category.slug)}`}
                  className={`flex items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors ${activeCategory?.id === category.id ? 'bg-orange-50 text-[#ff6a00]' : 'text-gray-700 hover:bg-orange-50'}`}
                >
                  <span className="truncate">{category.name}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                </Link>
              </li>
            ))}
          </ul>

          {activeCategory && (
            <div className="absolute left-full top-0 z-30 ml-2 w-80 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
              {activeCategory.image_url && (
                <div aria-label={activeCategory.name} role="img" className="mb-3 h-28 w-full rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${activeCategory.image_url})` }} />
              )}
              <p className="text-sm font-black text-gray-900">{activeCategory.name}</p>
              <p className="mt-1 line-clamp-3 text-xs leading-5 text-gray-500">
                {activeCategory.short_description || activeCategory.description || 'Browse wholesale listings from verified sellers.'}
              </p>
              {typeof activeCategory.product_count === 'number' && (
                <p className="mt-2 text-xs font-bold text-gray-400">{activeCategory.product_count} products</p>
              )}
              <Link href={`/hub/category/${encodeURIComponent(activeCategory.slug)}`} className="mt-4 inline-flex items-center gap-1 text-xs font-black" style={{ color: ORANGE }}>
                Browse category <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </aside>

        <div className="relative overflow-hidden rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(120deg, ${NAVY}, #163060)` }}>
          {slide.imageUrl && (
            <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${slide.imageUrl})` }} />
          )}
          <div className="relative flex h-full min-h-[280px] flex-col justify-center p-8">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider">
              <Globe2 className="h-3.5 w-3.5" /> {marketplaceName} B2B
            </span>
            <h1 className="mt-4 max-w-lg text-3xl font-black leading-tight sm:text-4xl">{slide.title}</h1>
            {slide.subtitle && <p className="mt-3 max-w-md text-sm font-semibold text-white/75">{slide.subtitle}</p>}
            <Link href={slide.ctaUrl} className="mt-6 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-sm font-black text-white shadow-lg" style={{ backgroundColor: ORANGE }}>
              {slide.ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {slides.length > 1 && (
            <>
              <button type="button" aria-label="Previous slide" onClick={() => setSlideIndex((slideIndex - 1 + slides.length) % slides.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 hover:bg-white/30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Next slide" onClick={() => setSlideIndex((slideIndex + 1) % slides.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 hover:bg-white/30">
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                {slides.map((entry, idx) => (
                  <button key={`${entry.title}-${idx}`} type="button" aria-label={`Slide ${idx + 1}`} onClick={() => setSlideIndex(idx)} className={`h-1.5 rounded-full transition-all ${idx === slideIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="hidden flex-col gap-3 lg:flex">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
              <Store className="h-4 w-4" style={{ color: ORANGE }} /> Top sellers
            </p>
            <ul className="mt-3 space-y-2">
              {topSellers.slice(0, 5).map((seller) => (
                <li key={seller.name}>
                  <Link href={seller.subdomain ? `/store/${encodeURIComponent(seller.subdomain)}` : '/hub/search'} className="flex items-center justify-between rounded-xl px-2 py-1.5 text-xs font-bold text-gray-700 hover:bg-orange-50">
                    <span className="truncate">{seller.name}</span>
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  </Link>
                </li>
              ))}
              {topSellers.length === 0 && <li className="text-xs text-gray-400">No sellers yet</li>}
            </ul>
          </div>
          <div className="rounded-2xl p-4 text-white shadow-sm" style={{ backgroundColor: NAVY }}>
            <Factory className="h-5 w-5" style={{ color: ORANGE }} />
            <p className="mt-2 text-sm font-black">Request for quotation</p>
            <p className="mt-1 text-[11px] leading-4 text-white/70">Tell sellers what you need and receive tailored offers.</p>
            <Link href="/hub/messages" className="mt-3 inline-flex rounded-full bg-white/10 px-4 py-2 text-[11px] font-black hover:bg-white/20">Post a request</Link>
          </div>
        </aside>
      </section>

      {/* Deals countdown */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Clock3 className="h-5 w-5" style={{ color: ORANGE }} /> Today&apos;s deals
            </h2>
            <div className="flex items-center gap-1.5 text-sm font-black">
              <span className="text-gray-500">Ends in</span>
              {[{ label: 'h', value: countdown.hours }, { label: 'm', value: countdown.minutes }, { label: 's', value: countdown.seconds }].map((unit) => (
                <span key={unit.label} className="rounded-lg px-2 py-1 font-mono text-white" style={{ backgroundColor: NAVY }}>{unit.value}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {dealProducts.map((product) => (
              <Link key={product.id} href={getProductHref(product)} className="group rounded-2xl border border-gray-100 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-gray-100">
                  <span className="absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-black text-white" style={{ backgroundColor: ORANGE }}>Deal</span>
                  {getProductImage(product) ? (
                    <div aria-label={product.title} role="img" className="h-full w-full bg-cover bg-center transition-transform group-hover:scale-105" style={{ backgroundImage: `url(${getProductImage(product)})` }} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                  )}
                </div>
                <p className="line-clamp-2 text-xs font-bold text-gray-900">{product.title}</p>
                <p className="mt-1 text-sm font-black" style={{ color: ORANGE }}>{formatPrice(product.price)}</p>
              </Link>
            ))}
            {dealProducts.length === 0 && <p className="col-span-full text-sm text-gray-400">No deals available yet.</p>}
          </div>
        </div>
      </section>

      {/* Sponsored brands */}
      {sponsoredBrands.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5" style={{ color: ORANGE }} />
            <h2 className="text-xl font-black">Sponsored brands</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {sponsoredBrands.map((brand) => (
              <Link key={brand.name} href={brand.subdomain ? `/store/${encodeURIComponent(brand.subdomain)}` : '/hub/search'} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-gray-500">Sponsored</span>
                <p className="mt-3 truncate text-sm font-black text-gray-900">{brand.name}</p>
                <p className="mt-1 text-xs font-semibold text-gray-500">{brand.count} trending products</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-black" style={{ color: ORANGE }}>Visit store <ArrowRight className="h-3.5 w-3.5" /></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Product grid */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">Just for you</h2>
          <Link href="/hub/search" className="text-xs font-black" style={{ color: ORANGE }}>View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {gridProducts.map((product) => (
            <Link key={product.id} href={getProductHref(product)} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="aspect-square overflow-hidden bg-gray-100">
                {getProductImage(product) ? (
                  <div aria-label={product.title} role="img" className="h-full w-full bg-cover bg-center transition-transform group-hover:scale-105" style={{ backgroundImage: `url(${getProductImage(product)})` }} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-xs font-bold text-gray-900">{product.title}</p>
                <p className="mt-1 text-sm font-black" style={{ color: ORANGE }}>{formatPrice(product.price)}</p>
                {product.store_name && <p className="mt-1 truncate text-[10px] font-semibold text-gray-400">{product.store_name}</p>}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recently viewed */}
      <RecentlyViewedRail accentClass="text-[#ff6a00]" />

      {/* Footer mega-grid */}
      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            {
              title: 'Buy with confidence',
              icon: ShieldCheck,
              links: [
                { label: 'Buyer protection', href: '/hub/cases' },
                { label: 'Order tracking', href: '/hub/orders' },
                { label: 'Help center', href: marketplaceSettings.marketplace_help_url || '/hub/cases' },
              ],
            },
            {
              title: 'Sell on the marketplace',
              icon: Store,
              links: [
                { label: 'Become a supplier', href: '/hub/vendor-signup' },
                { label: 'Pricing plans', href: '/hub/pricing' },
                { label: 'Seller dashboard', href: '/hub/dashboard' },
              ],
            },
            {
              title: 'Logistics',
              icon: Truck,
              links: [
                { label: 'Shipping options', href: '/hub/search' },
                { label: 'Wholesale orders', href: '/hub/search' },
                { label: 'Contact support', href: marketplaceSettings.marketplace_contact_url || '/hub/cases' },
              ],
            },
            {
              title: 'Legal',
              icon: Globe2,
              links: [
                { label: 'Terms of service', href: marketplaceSettings.marketplace_terms_url || '/hub' },
                { label: 'Privacy policy', href: marketplaceSettings.marketplace_privacy_url || '/hub' },
                { label: 'Refund policy', href: marketplaceSettings.marketplace_refund_url || '/hub' },
              ],
            },
          ].map((column) => (
            <div key={column.title}>
              <p className="flex items-center gap-2 text-sm font-black text-gray-900">
                <column.icon className="h-4 w-4" style={{ color: ORANGE }} /> {column.title}
              </p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-xs font-semibold text-gray-500 hover:text-[#ff6a00]">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
