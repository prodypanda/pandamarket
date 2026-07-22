'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { useLocale } from '../../contexts/LocaleContext';
import type { MarketplaceSettings } from '../../lib/marketplace-settings';
import { resolveHomeBlocks } from '../../lib/home-blocks';
import { SponsoredAdsRail } from './SponsoredAdsRail';
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

interface TreeCategoryNode {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  image_url?: string | null;
  product_count?: number;
  children?: TreeCategoryNode[];
}

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

// Sections that can be reordered from the admin Homepage Blocks editor.
const MIDDLE_BLOCK_IDS = ['deals', 'sponsored_brands', 'product_grid', 'recently_viewed'];

export function AlibabaHomeContent({ trendingProducts, categories, marketplaceSettings }: AlibabaHomeContentProps) {
  const marketplaceName = marketplaceSettings.marketplace_name || 'PandaMarket';
  const { locale } = useLocale();
  const rtl = isRtlLocale(marketplaceSettings, locale);
  const [treeCategories, setTreeCategories] = useState<TreeCategoryNode[]>([]);
  const [activeCategory, setActiveCategory] = useState<TreeCategoryNode | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const countdown = useCountdown();

  useEffect(() => {
    let cancelled = false;
    async function fetchTreeCategories() {
      try {
        const res = await fetch(`/api/pd/categories?tree=true&locale=${locale}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setTreeCategories(data.data || []);
        }
      } catch (err) {
        console.error('Failed to load tree categories for Alibaba layout:', err);
      }
    }
    fetchTreeCategories();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const displayCategories: TreeCategoryNode[] = treeCategories.length > 0
    ? treeCategories
    : categories.map((c) => ({ ...c, children: [] }));

  // Admin-managed block configuration (enable/disable, order, titles, limits)
  const blocks = useMemo(
    () => resolveHomeBlocks(marketplaceSettings.hub_homepage_blocks, 'alibaba'),
    [marketplaceSettings.hub_homepage_blocks],
  );
  const blockById = useMemo(() => new Map(blocks.map((block) => [block.id, block])), [blocks]);
  const isBlockEnabled = (id: string) => blockById.get(id)?.enabled !== false;
  const blockTitle = (id: string, fallback: string) => blockById.get(id)?.title || fallback;
  const blockLimit = (id: string, fallback: number) => blockById.get(id)?.limit || fallback;

  // Admin-managed hero carousel: the configured banner (admin settings) is
  // always slide 1, followed by featured category slides.
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
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [trendingProducts]);

  const sponsoredBrands = topSellers.slice(0, blockLimit('sponsored_brands', 4));
  const dealProducts = trendingProducts.slice(0, blockLimit('deals', 6));
  const gridProducts = trendingProducts.slice(0, blockLimit('product_grid', 12));
  const middleBlocks = blocks.filter((block) => MIDDLE_BLOCK_IDS.includes(block.id) && block.enabled);

  const renderDeals = (): ReactNode => (
    <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
      <BlockBanner block={blockById.get('deals')} />
      <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Clock3 className="h-5 w-5" style={{ color: ORANGE }} /> {blockTitle('deals', "Today's deals")}
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
  );

  const renderSponsoredBrands = (): ReactNode => {
    return (
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <BlockBanner block={blockById.get('sponsored_brands')} />
        <SponsoredAdsRail placement="hub.sponsored_brands" variant="cards" />
      </section>
    );
  };

  const renderProductGrid = (): ReactNode => (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <BlockBanner block={blockById.get('product_grid')} />
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black">{blockTitle('product_grid', 'Just for you')}</h2>
        <Link href={blockById.get('product_grid')?.cta_url || '/hub/search'} className="text-xs font-black" style={{ color: ORANGE }}>
          {blockById.get('product_grid')?.cta_label || 'View all'}
        </Link>
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
              <p className="mt-2 text-sm font-black" style={{ color: ORANGE }}>{formatPrice(product.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );

  const renderRecentlyViewed = (): ReactNode => <RecentlyViewedRail accentClass="text-[#ff6a00]" />;

  const middleRenderers: Record<string, () => ReactNode> = {
    deals: renderDeals,
    sponsored_brands: renderSponsoredBrands,
    product_grid: renderProductGrid,
    recently_viewed: renderRecentlyViewed,
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Top B2B Sourcing Announcement Bar */}
      <div className="bg-[#0b1e3f] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs font-black sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-amber-400" /> Trade Assurance Protection</span>
            <span className="hidden items-center gap-1.5 md:flex"><Truck className="h-4 w-4 text-[#ff6a00]" /> Verified Suppliers & Fast Logistics</span>
          </div>
          <Link href="/hub/vendor-signup" className="rounded-full bg-[#ff6a00] px-3 py-1 font-black text-white hover:bg-orange-600 transition-colors">
            Become a Seller
          </Link>
        </div>
      </div>

      {/* Hero: persistent Alibaba B2B category sidebar + multi-column mega flyout + carousel + seller rail */}
      {isBlockEnabled('hero') && (
        <>
          <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr_240px] lg:px-8">
            <aside
              className="relative hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:block"
              onMouseLeave={() => setActiveCategory(null)}
            >
              <p className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500">
                <LayoutGrid className="h-4 w-4" style={{ color: ORANGE }} /> {rtl ? 'جميع الأقسام' : 'My Markets & Categories'}
              </p>
              <ul className="max-h-[380px] overflow-y-auto py-1">
                {displayCategories.slice(0, 12).map((category) => (
                  <li key={category.id} onMouseEnter={() => setActiveCategory(category)}>
                    <Link
                      href={`/hub/category/${encodeURIComponent(category.slug)}`}
                      className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-all ${
                        activeCategory?.id === category.id
                          ? 'bg-orange-50 text-[#ff6a00]'
                          : 'text-gray-700 hover:bg-orange-50'
                      }`}
                    >
                      <span className="truncate">{category.name}</span>
                      <ChevronRight className={`h-4 w-4 shrink-0 text-gray-300 ${rtl ? 'rotate-180' : ''}`} />
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Alibaba B2B Multi-Column Mega Flyout Panel */}
              {activeCategory && (
                <div
                  dir={rtl ? 'rtl' : 'ltr'}
                  className={`absolute ${
                    rtl ? 'right-full mr-2' : 'left-full ml-2'
                  } top-0 z-40 w-[640px] max-w-[90vw] rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-2xl backdrop-blur-xl`}
                >
                  <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{activeCategory.name}</h3>
                      <p className="text-xs font-semibold text-slate-400">
                        {activeCategory.children?.length || 0} subcategories available
                      </p>
                    </div>
                    <Link
                      href={`/hub/category/${encodeURIComponent(activeCategory.slug)}`}
                      className="text-xs font-black text-[#ff6a00] hover:underline"
                    >
                      Browse All ➔
                    </Link>
                  </div>

                  {activeCategory.children && activeCategory.children.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {activeCategory.children.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/hub/category/${encodeURIComponent(sub.slug)}`}
                          className="group flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/40"
                        >
                          <span className="text-xs font-extrabold text-slate-800 group-hover:text-[#ff6a00]">
                            {sub.name}
                          </span>
                          <span className="mt-2 text-[10px] font-bold text-slate-400">
                            {sub.product_count || 0} products
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs font-semibold text-slate-400">
                      {activeCategory.short_description || activeCategory.description || 'Source directly from verified manufacturers and suppliers.'}
                    </div>
                  )}

                  {/* B2B Sourcing Tags */}
                  <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-[11px] font-black text-slate-600">
                    <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Trade Assurance Verified</span>
                    <span className="flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5 text-blue-500" /> Verified Factory Suppliers</span>
                  </div>
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

          {/* Mobile category access (the sidebar above is desktop-only) */}
          {categories.length > 0 && (
            <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-4 sm:px-6 lg:hidden">
              {categories.slice(0, 12).map((category) => (
                <Link
                  key={category.id}
                  href={`/hub/category/${encodeURIComponent(category.slug)}`}
                  className="shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:border-orange-200 hover:text-[#ff6a00]"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Admin-ordered middle sections */}
      {middleBlocks.map((block) => (
        <Fragment key={block.id}>{middleRenderers[block.id]?.() ?? null}</Fragment>
      ))}

      {/* Footer mega-grid */}
      {isBlockEnabled('footer_links') && (
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
      )}
    </div>
  );
}
