'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Gift,
  MapPin,
  Megaphone,
  Package,
  ShieldCheck,
  Store,
  Zap,
} from 'lucide-react';
import type { MarketplaceSettings } from '../../lib/marketplace-settings';
import { resolveHomeBlocks } from '../../lib/home-blocks';
import {
  BlockBanner,
  RecentlyViewedRail,
  formatPrice,
  getProductHref,
  getProductImage,
  isRtlLocale,
  useCountdown,
  type HomeCategory,
  type HomeProduct,
} from './home-template-shared';

interface AmazonHomeContentProps {
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

const INK = '#131921';
const TEAL = '#007185';
const AMBER = '#febd69';

// Sections that can be reordered from the admin Homepage Blocks editor.
const MIDDLE_BLOCK_IDS = ['lightning_deals', 'top_sellers', 'sponsored_brands', 'recently_viewed'];

export function AmazonHomeContent({ trendingProducts, categories, marketplaceSettings }: AmazonHomeContentProps) {
  const marketplaceName = marketplaceSettings.marketplace_name || 'PandaMarket';
  const rtl = isRtlLocale(marketplaceSettings);
  const [slideIndex, setSlideIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<HomeCategory | null>(null);
  const countdown = useCountdown();

  // Admin-managed block configuration (enable/disable, order, titles, limits)
  const blocks = useMemo(
    () => resolveHomeBlocks(marketplaceSettings.hub_homepage_blocks, 'amazon'),
    [marketplaceSettings.hub_homepage_blocks],
  );
  const blockById = useMemo(() => new Map(blocks.map((block) => [block.id, block])), [blocks]);
  const isBlockEnabled = (id: string) => blockById.get(id)?.enabled !== false;
  const blockTitle = (id: string, fallback: string) => blockById.get(id)?.title || fallback;
  const blockLimit = (id: string, fallback: number) => blockById.get(id)?.limit || fallback;

  const slides = useMemo<HeroSlide[]>(() => {
    // Admin-defined hero slides fully replace the banner+category fallback.
    const configured = (blockById.get('hero')?.slides ?? []).map((entry) => ({
      title: entry.title,
      subtitle: entry.subtitle || '',
      ctaLabel: entry.cta_label || 'Shop now',
      ctaUrl: entry.cta_url || '/hub/search',
      imageUrl: entry.image_url || null,
    }));
    if (configured.length > 0) return configured;
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
        subtitle: category.short_description || category.description || 'Discover top-rated picks.',
        ctaLabel: 'Shop the range',
        ctaUrl: `/hub/category/${encodeURIComponent(category.slug)}`,
        imageUrl: category.image_url,
      });
    });
    if (result.length === 0) {
      result.push({
        title: marketplaceName,
        subtitle: marketplaceSettings.marketplace_tagline || 'Everything you need, delivered.',
        ctaLabel: 'Start shopping',
        ctaUrl: '/hub/search',
      });
    }
    return result;
  }, [blockById, categories, marketplaceName, marketplaceSettings]);

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
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [trendingProducts]);

  const topSellersList = topSellers.slice(0, blockLimit('top_sellers', 8));
  const sponsoredBrands = topSellers.slice(0, blockLimit('sponsored_brands', 3));
  const lightningDeals = trendingProducts.slice(0, blockLimit('lightning_deals', 8));
  const stripCategories = categories.slice(0, blockLimit('category_strip', 10));
  const categoryCards = categories.slice(0, 4);
  const middleBlocks = blocks.filter((block) => MIDDLE_BLOCK_IDS.includes(block.id) && block.enabled);

  const renderLightningDeals = (): ReactNode => (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <BlockBanner block={blockById.get('lightning_deals')} />
      <div className="rounded-lg bg-white p-5 shadow-md">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Zap className="h-5 w-5 fill-current" style={{ color: '#cc0c39' }} /> {blockTitle('lightning_deals', 'Lightning deals')}
          </h2>
          <div className="flex items-center gap-1.5 text-sm font-black">
            <span className="text-gray-500">Ends in</span>
            {[{ label: 'h', value: countdown.hours }, { label: 'm', value: countdown.minutes }, { label: 's', value: countdown.seconds }].map((unit) => (
              <span key={unit.label} className="rounded px-2 py-1 font-mono text-white" style={{ backgroundColor: '#cc0c39' }}>{unit.value}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {lightningDeals.map((product) => (
            <Link key={product.id} href={getProductHref(product)} className="group w-44 shrink-0 rounded-lg border border-gray-200 bg-white p-3 transition hover:shadow-lg">
              <div className="relative mb-2 aspect-square overflow-hidden rounded-md bg-gray-100">
                <span className="absolute left-2 top-2 z-10 rounded px-2 py-0.5 text-[10px] font-black text-white" style={{ backgroundColor: '#cc0c39' }}>Deal</span>
                {getProductImage(product) ? (
                  <div aria-label={product.title} role="img" className="h-full w-full bg-cover bg-center transition-transform group-hover:scale-105" style={{ backgroundImage: `url(${getProductImage(product)})` }} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                )}
              </div>
              <p className="line-clamp-2 text-xs font-bold text-gray-900">{product.title}</p>
              <p className="mt-1 text-sm font-black text-[#b12704]">{formatPrice(product.price)}</p>
            </Link>
          ))}
          {lightningDeals.length === 0 && <p className="text-sm text-gray-400">No deals available yet.</p>}
        </div>
      </div>
    </section>
  );

  const renderTopSellers = (): ReactNode => {
    if (topSellersList.length === 0) return null;
    return (
      <section className="mx-auto max-w-7xl px-4 pb-2 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-5 shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <Store className="h-5 w-5" style={{ color: TEAL }} />
            <h2 className="text-xl font-black">{blockTitle('top_sellers', 'Top sellers')}</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {topSellersList.map((seller) => (
              <Link key={seller.name} href={seller.subdomain ? `/store/${encodeURIComponent(seller.subdomain)}` : '/hub/search'} className="w-44 shrink-0 rounded-lg border border-gray-200 p-4 transition hover:shadow-md">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <p className="mt-2 truncate text-sm font-black text-gray-900">{seller.name}</p>
                <p className="text-[11px] font-semibold text-gray-500">{seller.count} trending products</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderSponsoredBrands = (): ReactNode => {
    if (sponsoredBrands.length === 0) return null;
    return (
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <BlockBanner block={blockById.get('sponsored_brands')} />
        <div className="rounded-lg bg-white p-5 shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5" style={{ color: TEAL }} />
            <h2 className="text-xl font-black">{blockTitle('sponsored_brands', 'Sponsored brands')}</h2>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-gray-500">Ad</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {sponsoredBrands.map((brand) => (
              <Link key={brand.name} href={brand.subdomain ? `/store/${encodeURIComponent(brand.subdomain)}` : '/hub/search'} className="rounded-lg border border-gray-200 p-5 transition hover:shadow-md">
                <Gift className="h-5 w-5" style={{ color: AMBER }} />
                <p className="mt-2 truncate text-sm font-black text-gray-900">{brand.name}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-black" style={{ color: TEAL }}>Explore brand <ArrowRight className="h-3.5 w-3.5" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderRecentlyViewed = (): ReactNode => <RecentlyViewedRail accentClass="text-[#b12704]" />;

  const middleRenderers: Record<string, () => ReactNode> = {
    lightning_deals: renderLightningDeals,
    top_sellers: renderTopSellers,
    sponsored_brands: renderSponsoredBrands,
    recently_viewed: renderRecentlyViewed,
  };

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="bg-[#e3e6e6] text-gray-900">
      {/* Utility bar */}
      {isBlockEnabled('utility_bar') && (
        <div className="text-white" style={{ backgroundColor: INK }}>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-[11px] font-bold sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-4 text-white/80">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" style={{ color: AMBER }} /> Deliver across Tunisia</span>
              <span className="hidden items-center gap-1.5 sm:inline-flex"><Package className="h-3.5 w-3.5" style={{ color: AMBER }} /> Free returns on eligible items</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/hub/orders" className="hover:text-[#febd69]">Returns &amp; orders</Link>
              <Link href={marketplaceSettings.marketplace_help_url || '/hub/cases'} className="hover:text-[#febd69]">Customer service</Link>
              <Link href="/hub/vendor-signup" className="rounded-md px-3 py-1 font-black text-gray-900" style={{ backgroundColor: AMBER }}>Sell</Link>
            </div>
          </div>
        </div>
      )}

      {/* Category strip with hover panels */}
      {isBlockEnabled('category_strip') && (
        <div className="relative border-b border-gray-300 bg-white" onMouseLeave={() => setActiveCategory(null)}>
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 text-xs font-bold text-gray-700 sm:px-6 lg:px-8">
            <span className="mr-1 shrink-0 rounded-md px-2 py-1 text-white" style={{ backgroundColor: INK }}>All</span>
            {stripCategories.map((category) => (
              <Link
                key={category.id}
                href={`/hub/category/${encodeURIComponent(category.slug)}`}
                onMouseEnter={() => setActiveCategory(category)}
                className={`shrink-0 rounded-md px-2 py-1 transition-colors ${activeCategory?.id === category.id ? 'bg-gray-100 text-[#007185]' : 'hover:bg-gray-100'}`}
              >
                {category.name}
              </Link>
            ))}
          </div>
          {activeCategory && (
            <div className="absolute left-1/2 top-full z-30 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 rounded-b-2xl border border-t-0 border-gray-200 bg-white p-5 shadow-2xl">
              <div className="flex gap-4">
                {activeCategory.image_url && (
                  <div aria-label={activeCategory.name} role="img" className="h-24 w-24 shrink-0 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${activeCategory.image_url})` }} />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900">{activeCategory.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                    {activeCategory.short_description || activeCategory.description || 'Explore top-rated products in this department.'}
                  </p>
                  <Link href={`/hub/category/${encodeURIComponent(activeCategory.slug)}`} className="mt-2 inline-flex items-center gap-1 text-xs font-black" style={{ color: TEAL }}>
                    Shop now <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hero carousel with overlapping card row */}
      {isBlockEnabled('hero') && (
        <div className="relative">
          <div className="relative h-[340px] overflow-hidden text-white" style={{ background: `linear-gradient(180deg, ${INK}, #37475a)` }}>
            {slide.imageUrl && (
              <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${slide.imageUrl})` }} />
            )}
            <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-4 pb-24 sm:px-6 lg:px-8">
              <h1 className="max-w-xl text-3xl font-black leading-tight sm:text-4xl">{slide.title}</h1>
              {slide.subtitle && <p className="mt-2 max-w-md text-sm font-semibold text-white/80">{slide.subtitle}</p>}
              <Link href={slide.ctaUrl} className="mt-5 inline-flex w-fit items-center gap-2 rounded-md px-6 py-2.5 text-sm font-black text-gray-900 shadow" style={{ backgroundColor: AMBER }}>
                {slide.ctaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {slides.length > 1 && (
              <>
                <button type="button" aria-label="Previous slide" onClick={() => setSlideIndex((slideIndex - 1 + slides.length) % slides.length)} className="absolute left-2 top-24 rounded-md bg-white/10 p-3 hover:bg-white/25">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" aria-label="Next slide" onClick={() => setSlideIndex((slideIndex + 1) % slides.length)} className="absolute right-2 top-24 rounded-md bg-white/10 p-3 hover:bg-white/25">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute left-1/2 top-4 flex -translate-x-1/2 gap-1.5">
                  {slides.map((entry, idx) => (
                    <button key={`${entry.title}-${idx}`} type="button" aria-label={`Slide ${idx + 1}`} onClick={() => setSlideIndex(idx)} className={`h-1.5 rounded-full transition-all ${idx === slideIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Overlapping category cards */}
          <div className="mx-auto -mt-24 grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {categoryCards.map((category) => (
              <div key={category.id} className="rounded-lg bg-white p-4 shadow-md">
                <p className="text-sm font-black text-gray-900">{category.name}</p>
                <Link href={`/hub/category/${encodeURIComponent(category.slug)}`} className="mt-2 block aspect-[4/3] overflow-hidden rounded-md bg-gray-100">
                  {category.image_url ? (
                    <div aria-label={category.name} role="img" className="h-full w-full bg-cover bg-center transition-transform hover:scale-105" style={{ backgroundImage: `url(${category.image_url})` }} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">{category.name}</div>
                  )}
                </Link>
                <Link href={`/hub/category/${encodeURIComponent(category.slug)}`} className="mt-3 inline-block text-xs font-black" style={{ color: TEAL }}>
                  Shop now
                </Link>
              </div>
            ))}
            {categoryCards.length === 0 && (
              <div className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow-md sm:col-span-2 lg:col-span-4">Categories coming soon.</div>
            )}
          </div>
        </div>
      )}

      {/* Admin-ordered middle sections */}
      {middleBlocks.map((block) => (
        <Fragment key={block.id}>{middleRenderers[block.id]?.() ?? null}</Fragment>
      ))}

      {/* Back to top + footer mega-grid */}
      {isBlockEnabled('footer_links') && (
        <>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex w-full items-center justify-center gap-2 py-3 text-xs font-black text-white hover:opacity-90"
            style={{ backgroundColor: '#37475a' }}
          >
            <ArrowUp className="h-4 w-4" /> Back to top
          </button>
          <section className="text-white" style={{ backgroundColor: '#232f3e' }}>
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
              {[
                {
                  title: 'Get to know us',
                  links: [
                    { label: `About ${marketplaceName}`, href: '/hub' },
                    { label: 'Pricing plans', href: '/hub/pricing' },
                    { label: 'Contact us', href: marketplaceSettings.marketplace_contact_url || '/hub/cases' },
                  ],
                },
                {
                  title: 'Make money with us',
                  links: [
                    { label: 'Sell on the marketplace', href: '/hub/vendor-signup' },
                    { label: 'Seller dashboard', href: '/hub/dashboard' },
                    { label: 'Advertise your products', href: '/hub/pricing' },
                  ],
                },
                {
                  title: 'Let us help you',
                  links: [
                    { label: 'Your orders', href: '/hub/orders' },
                    { label: 'Returns & disputes', href: '/hub/cases' },
                    { label: 'Help center', href: marketplaceSettings.marketplace_help_url || '/hub/cases' },
                  ],
                },
                {
                  title: 'Policies',
                  links: [
                    { label: 'Terms of service', href: marketplaceSettings.marketplace_terms_url || '/hub' },
                    { label: 'Privacy policy', href: marketplaceSettings.marketplace_privacy_url || '/hub' },
                    { label: 'Refund policy', href: marketplaceSettings.marketplace_refund_url || '/hub' },
                  ],
                },
              ].map((column) => (
                <div key={column.title}>
                  <p className="text-sm font-black">{column.title}</p>
                  <ul className="mt-3 space-y-2">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <Link href={link.href} className="text-xs font-semibold text-white/70 hover:text-white hover:underline">{link.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
