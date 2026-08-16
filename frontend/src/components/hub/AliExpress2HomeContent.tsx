'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import Link from 'next/link';
import { ArrowRight, BadgePercent, Crown, Flame, Gift, Headphones, Package, Search, ShieldCheck, ShoppingBag, Sparkles, Star, Store, Timer, Truck, Zap } from 'lucide-react';
import { getHubProductHref } from '../../lib/product-links';
import { normalizePublicAssetUrl } from '../../lib/public-assets';
import { HubProductPagination } from './HubProductPagination';
import { useLocale } from '../../contexts/LocaleContext';
import { resolveHomeBlocks } from '../../lib/home-blocks';
import { BlockBanner, RecentlyViewedRail, isRtlLocale } from './home-template-shared';
import { useMemo, useCallback } from 'react';
interface Product {
  id: string;
  title: string;
  price: number | string;
  slug?: string | null;
  store_name?: string;
  store_subdomain?: string | null;
  images?: { url: string }[];
  thumbnail?: string | null;
  category?: string;
  marketplace_category_slug?: string | null;
}

interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  image_url?: string | null;
  is_default?: boolean;
  product_count?: number;
}

interface MarketplaceSettings {
  marketplace_name?: string;
  marketplace_tagline?: string;
  default_currency?: string;
  marketplace_theme?: 'panda' | 'aliexpress' | 'aliexpress2';
  hub_homepage_banner_title?: string;
  hub_homepage_banner_subtitle?: string;
  hub_homepage_banner_cta_label?: string;
  hub_homepage_banner_cta_url?: string;
  hub_homepage_banner_image_url?: string;
  hub_homepage_pagination_style?: string;
  catalog_default_sort?: string;
  hub_feed_base_sort?: string;
  hub_feed_personalization_pct?: number;
}

interface AliExpress2HomeContentProps {
  trendingProducts: Product[];
  categories: MarketplaceCategory[];
  marketplaceSettings?: MarketplaceSettings;
}

function formatPrice(price: Product['price']) {
  const numericPrice = typeof price === 'number' ? price : Number(price);
  return Number.isFinite(numericPrice) ? numericPrice.toFixed(3) : '0.000';
}

function getProductImage(product: Product) {
  return normalizePublicAssetUrl(product.images?.[0]?.url || product.thumbnail || '');
}

/* ──────────────────────────────────────────────
   SUPER DEAL product card — glass + dark overlay
   ────────────────────────────────────────────── */
function SuperDealCard({ product, currency, rank }: { product: Product; currency: string; rank?: number }) {
  const image = getProductImage(product);

  return (
    <Link href={getHubProductHref(product)} className="group relative block overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-[#18181b]/60 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:border-[#ff4747]/40 hover:shadow-[0_20px_60px_-12px_rgba(255,71,71,0.35)]">
      {/* Gradient glow on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#ff4747]/0 via-transparent to-[#ff8a00]/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:from-[#ff4747]/10 group-hover:to-[#ff8a00]/5" />

      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-black/20">
        {/* Deal badge */}
        <div className="absolute start-3 top-3 z-10 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#ff4747] to-[#ff5f2e] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/40">
          <Zap className="h-3 w-3 fill-white" />
          Super Deal
        </div>
        {rank && rank <= 3 && (
          <div className="absolute end-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-[10px] font-black text-white shadow-lg">
            #{rank}
          </div>
        )}
        {image ? (
          <img src={image ? getResizedImageUrl(image, 'medium') : ''} alt={product.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-white/20">
            <ShoppingBag className="h-10 w-10" />
          </div>
        )}
        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-50 dark:from-[#18181b] to-transparent" />
      </div>

      <div className="relative p-4">
        <h3 className="line-clamp-2 min-h-[40px] text-sm font-bold text-gray-900 dark:text-white/90 transition-colors group-hover:text-gray-900 dark:group-hover:text-white">{product.title}</h3>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <span className="text-xl font-black bg-gradient-to-r from-[#ff4747] to-[#ff8a00] bg-clip-text text-transparent">{formatPrice(product.price)}</span>
            <span className="ms-1.5 text-xs font-bold text-gray-500 dark:text-white/40">{currency}</span>
          </div>
          <span className="flex items-center gap-1 rounded-lg bg-[#ff4747]/15 px-2 py-1 text-[10px] font-black text-[#ff6b6b] backdrop-blur">
            <Flame className="h-3 w-3 fill-[#ff6b6b]" /> Hot
          </span>
        </div>
        {product.store_name && (
          <p className="mt-2 flex items-center gap-1.5 truncate text-[11px] font-medium text-gray-500 dark:text-white/30">
            <Store className="h-3 w-3" /> {product.store_name}
          </p>
        )}
      </div>
    </Link>
  );
}

export function AliExpress2HomeContent({ trendingProducts, categories, marketplaceSettings }: AliExpress2HomeContentProps) {
  const { t, locale } = useLocale();
  const dir = isRtlLocale(undefined, locale) ? 'rtl' : 'ltr';

  const blocks = useMemo(
    () => resolveHomeBlocks((marketplaceSettings as any)?.hub_homepage_blocks, 'aliexpress'),
    [(marketplaceSettings as any)?.hub_homepage_blocks]
  );
  const blockById = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);
  const blockLimit = useCallback(
    (id: string, def: number) => blockById.get(id)?.limit ?? def,
    [blockById]
  );

  const publicCategories = categories.filter((category) => !category.is_default);
  const heroCategories = publicCategories.slice(0, 10);
  const featuredCategories = publicCategories.slice(0, blockLimit('category_tiles', 8));
  const flashProducts = trendingProducts.slice(0, blockLimit('flash_deals', 6));
  const recommendedProducts = trendingProducts.slice(6, 6 + blockLimit('recommended', 10));
  const currency = marketplaceSettings?.default_currency || 'TND';
  const marketplaceName = marketplaceSettings?.marketplace_name || 'PandaMarket';
  const tagline = marketplaceSettings?.marketplace_tagline || t('common.tagline') || 'Des milliers de produits, prix malins, vendeurs tunisiens.';
  const bannerTitle = marketplaceSettings?.hub_homepage_banner_title?.trim() || marketplaceName;
  const bannerSubtitle = marketplaceSettings?.hub_homepage_banner_subtitle?.trim() || tagline;
  const bannerCtaLabel = marketplaceSettings?.hub_homepage_banner_cta_label?.trim() || t('nav.explore') || 'Search';
  const bannerCtaUrl = marketplaceSettings?.hub_homepage_banner_cta_url?.trim() || '/hub/search';
  const bannerImage = normalizePublicAssetUrl(marketplaceSettings?.hub_homepage_banner_image_url || '');

  const blockTitle = (id: string, defaultTitle: string) => blockById.get(id)?.title || defaultTitle;

  return (
    <main className="bg-white dark:bg-[#09090b] text-gray-900 dark:text-white" dir={dir}>

      {/* ═══════════════════════════════════════
          HERO SECTION — Full-bleed dark gradient
         ═══════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Animated background glows */}
        <div className="pointer-events-none absolute -start-40 -top-40 h-[500px] w-[500px] rounded-full bg-[#ff4747]/20 blur-[120px] animate-pulse" />
        <div className="pointer-events-none absolute -end-20 top-20 h-[400px] w-[400px] rounded-full bg-[#ff8a00]/15 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 start-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[#ff5f2e]/10 blur-[80px]" />
        {bannerImage && <img src={bannerImage ? getResizedImageUrl(bannerImage, 'medium') : ''} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" />}

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            {/* Left — Hero content */}
            <div className="flex flex-col justify-center">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-[#ff4747]/30 bg-gray-50 dark:bg-[#ff4747]/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#ff6b6b] backdrop-blur-xl">
                  <Sparkles className="h-3.5 w-3.5" /> {t('hub.hero.title') || 'Super Deal'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-3 py-1.5 text-[10px] font-bold text-gray-500 dark:text-white/60 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> {t('hub.hero.subtitle') || 'Live deals'}
                </span>
              </div>

              <h1 className="text-5xl font-black tracking-tight md:text-7xl lg:text-8xl">
                <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-white dark:to-white/60 bg-clip-text text-transparent">{bannerTitle}</span>
                <br />
                <span className="bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] bg-clip-text text-transparent">Super Deals</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-gray-600 dark:text-white/50">{bannerSubtitle}</p>

              {/* Search bar */}
              <div className="mt-8 max-w-xl">
                <Link href={bannerCtaUrl} className="group flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 p-2 ps-5 backdrop-blur-xl transition-all hover:border-[#ff4747]/30 hover:bg-white/10">
                  <Search className="h-5 w-5 text-gray-400 dark:text-white/30" />
                  <span className="flex-1 text-sm text-gray-400 dark:text-white/30">{t('nav.searchPlaceholder') || 'Search products...'}</span>
                  <span className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4747] to-[#ff8a00] px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-900/30 transition-transform group-hover:scale-[1.03]">
                    <Search className="h-4 w-4" /> {bannerCtaLabel}
                  </span>
                </Link>
              </div>

              {/* Stats row */}
              <div className="mt-8 flex flex-wrap gap-4">
                {[
                  { icon: Zap, label: t('hub.sections.flashDeals') || 'Flash deals', value: `${flashProducts.length}+` },
                  { icon: Store, label: t('hub.sections.categories') || 'Categories', value: `${publicCategories.length}+` },
                  { icon: ShieldCheck, label: t('hub.valueProps.verified.title') || 'Verified sellers', value: '100%' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] px-4 py-3 backdrop-blur">
                    <stat.icon className="h-5 w-5 text-[#ff4747]" />
                    <div>
                      <p className="text-lg font-black text-gray-900 dark:text-white">{stat.value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-white/30">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Category navigation */}
            <aside className="hidden lg:block">
              <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] p-5 backdrop-blur-2xl">
                <div className="mb-4 flex items-center gap-2 text-sm font-black text-gray-800 dark:text-white/80">
                  <Crown className="h-4 w-4 text-[#ff8a00]" /> {t('hub.sections.categories') || 'Top Categories'}
                </div>
                <div className="space-y-1">
                  {heroCategories.map((category) => (
                    <Link key={category.slug} href={`/hub/search?category=${encodeURIComponent(category.slug)}`} className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-white/50 transition-all hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-[#ff6b6b]">
                      <span className="truncate">{category.name}</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:opacity-100 rtl:group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5 rtl:rotate-180" />
                    </Link>
                  ))}
                </div>
                <Link href="/hub/search" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4747] to-[#ff8a00] px-4 py-3 text-xs font-black text-white shadow-lg shadow-red-900/30 transition hover:scale-[1.02]">
                  {t('nav.explore') || 'Browse All'} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-4 space-y-3">
                {[
                  { icon: ShieldCheck, title: t('hub.valueProps.payment.title') || 'Buyer Protection', desc: t('hub.valueProps.payment.desc') || 'Secure checkout' },
                  { icon: Truck, title: t('hub.valueProps.fast.title') || 'Fast Delivery', desc: t('hub.valueProps.fast.desc') || 'Local sellers' },
                  { icon: Headphones, title: t('hub.valueProps.support.title') || '24/7 Support', desc: t('hub.valueProps.support.desc') || 'Always available' },
                ].map((item) => (
                  <div key={item.title} className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] px-4 py-3 backdrop-blur">
                    <item.icon className="h-5 w-5 text-[#ff8a00]" />
                    <div>
                      <p className="text-xs font-black text-gray-700 dark:text-white/70">{item.title}</p>
                      <p className="text-[10px] text-gray-500 dark:text-white/30">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FLASH DEALS — Glowing section
         ═══════════════════════════════════════ */}
      {blockById.get('flash_deals')?.enabled !== false && (
        <section className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 dark:border-white/[0.06] bg-gradient-to-br from-gray-50 dark:from-white/[0.04] to-transparent p-6 backdrop-blur-xl">
            {/* Section header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4747] to-[#ff8a00] shadow-lg shadow-red-900/30">
                  <Timer className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">{blockTitle('flash_deals', t('hub.sections.flashDeals') || 'Flash Deals')}</h2>
                  <p className="text-xs font-medium text-gray-500 dark:text-white/30">Limited time offers · Best prices</p>
                </div>
              </div>
              <Link href="/hub/search" className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-4 py-2 text-xs font-black text-gray-700 dark:text-white/60 backdrop-blur transition-all hover:border-[#ff4747]/30 hover:text-[#ff6b6b]">
                {t('nav.explore') || 'View All'} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </Link>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {flashProducts.map((product, i) => (
                <SuperDealCard key={product.id} product={product} currency={currency} rank={i + 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════
          FEATURED CATEGORIES — Glass cards
         ═══════════════════════════════════════ */}
      {blockById.get('category_tiles')?.enabled !== false && (
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff8a00] to-[#ff4747] shadow-lg shadow-orange-900/30">
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{blockTitle('category_tiles', t('hub.sections.categories') || 'Shop by Category')}</h2>
              <p className="text-xs font-medium text-gray-500 dark:text-white/30">Explore our curated collections</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
            {featuredCategories.map((category) => (
              <Link key={category.slug} href={`/hub/search?category=${encodeURIComponent(category.slug)}`} className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] transition-all duration-500 hover:-translate-y-1 hover:border-[#ff4747]/30 hover:shadow-[0_12px_40px_-8px_rgba(255,71,71,0.2)]">
                <div className="aspect-square overflow-hidden bg-gray-200 dark:bg-black/30">
                  {category.image_url ? (
                    <img src={category.image_url ? getResizedImageUrl(normalizePublicAssetUrl(category.image_url), 'medium') : ''} alt={category.name} className="h-full w-full object-cover opacity-70 transition-all duration-700 group-hover:scale-110 group-hover:opacity-100" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-white/10">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-100 via-gray-100/40 dark:from-[#09090b] dark:via-[#09090b]/40 to-transparent" />
                </div>
                <p className="absolute bottom-0 w-full p-3 text-center text-xs font-black text-gray-700 dark:text-white/80 transition-colors group-hover:text-gray-900 dark:group-hover:text-white">{category.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════
          PROMO BANNER — Full-width gradient
         ═══════════════════════════════════════ */}
      {blockById.get('promo_bar')?.enabled !== false && (
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] rtl:bg-gradient-to-l p-8 md:p-12">
            <div className="pointer-events-none absolute -end-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -start-10 h-48 w-48 rounded-full bg-black/10 blur-2xl" />
            <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <BadgePercent className="h-6 w-6 text-white" />
                  <span className="text-sm font-black uppercase tracking-widest text-white/80">Limited Time</span>
                </div>
                <h2 className="text-3xl font-black md:text-4xl text-white">Mega Deals Week</h2>
                <p className="mt-2 max-w-md text-sm font-medium text-white/70">Exclusive discounts from verified local sellers. Free buyer protection on every purchase.</p>
              </div>
              <Link href="/hub/search" className="flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-black text-[#ff4747] shadow-2xl shadow-black/20 transition-transform hover:scale-105">
                Shop Now <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════
          RECOMMENDED — "Just for you"
         ═══════════════════════════════════════ */}
      {blockById.get('recommended')?.enabled !== false && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg shadow-orange-900/30">
                <Star className="h-5 w-5 fill-white text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">{blockTitle('recommended', t('hub.sections.trending') || 'Just For You')}</h2>
                <p className="text-xs font-medium text-gray-500 dark:text-white/30">Handpicked recommendations</p>
              </div>
            </div>
            <Link href="/hub/search" className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-4 py-2 text-xs font-black text-gray-700 dark:text-white/60 backdrop-blur transition-all hover:border-[#ff4747]/30 hover:text-[#ff6b6b]">
              {t('nav.explore') || 'See More'} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {recommendedProducts.map((product) => (
              <SuperDealCard key={product.id} product={product} currency={currency} />
            ))}
          </div>

          <HubProductPagination
            style={marketplaceSettings?.hub_homepage_pagination_style}
            sortBy={marketplaceSettings?.hub_feed_base_sort || marketplaceSettings?.catalog_default_sort}
            gridClassName="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
            renderCard={(product) => (
              <SuperDealCard key={product.id} product={product as Product} currency={currency} />
            )}
          />
        </section>
      )}

      {blockById.get('recently_viewed')?.enabled !== false && <RecentlyViewedRail />}

      {/* ═══════════════════════════════════════
          SELLER CTA — Dark glass card
         ═══════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] p-8 backdrop-blur-xl md:p-12">
          <div className="pointer-events-none absolute end-0 top-0 h-full w-1/2 bg-gradient-to-s from-[#ff4747]/5 rtl:bg-gradient-to-e to-transparent" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <Store className="mb-4 h-10 w-10 text-[#ff8a00]" />
              <h2 className="text-3xl font-black text-gray-900 dark:text-white">{t('nav.startSelling') || 'Start Selling Today'}</h2>
              <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-white/40">Open your store on the marketplace and reach thousands of buyers across Tunisia.</p>
            </div>
            <Link href="/hub/vendor-signup" className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff4747] to-[#ff8a00] rtl:bg-gradient-to-l px-8 py-4 text-sm font-black text-white shadow-2xl shadow-red-900/30 transition-transform hover:scale-105">
              {t('nav.startSelling') || 'Open Your Store'} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
