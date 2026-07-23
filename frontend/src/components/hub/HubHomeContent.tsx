'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, BadgeCheck, CreditCard, Flame, Grid3X3, Headphones, PackageCheck, Search, ShieldCheck, ShoppingBag, Sparkles, Store, Truck, Zap } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import { getHubProductHref } from '../../lib/product-links';
import { normalizePublicAssetUrl } from '../../lib/public-assets';
import { resolveHomeBlocks } from '../../lib/home-blocks';
import { RecentlyViewedRail, isRtlLocale } from './home-template-shared';

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
  marketplace_default_locale?: 'fr' | 'en' | 'ar';
  marketplace_rtl_enabled?: string | boolean;
  hub_homepage_banner_title?: string;
  hub_homepage_banner_subtitle?: string;
  hub_homepage_banner_cta_label?: string;
  hub_homepage_banner_cta_url?: string;
  hub_homepage_banner_image_url?: string;
  hub_homepage_blocks?: string;
  default_currency?: string;
}

interface HubHomeContentProps {
  trendingProducts: Product[];
  categories: MarketplaceCategory[];
  marketplaceSettings?: MarketplaceSettings;
}

// Sections that can be reordered from the admin Homepage Blocks editor.
const MIDDLE_BLOCK_IDS = ['features', 'categories', 'deals_spotlight', 'trending', 'category_showcase', 'cta_banner', 'recently_viewed'];

function formatPrice(price: Product['price']) {
  const numericPrice = typeof price === 'number' ? price : Number(price);
  return Number.isFinite(numericPrice) ? numericPrice.toFixed(3) : '0.000';
}

function getProductImage(product: Product) {
  return normalizePublicAssetUrl(product.images?.[0]?.url || product.thumbnail || '');
}

function ProductCard({ product, currency }: { product: Product; currency: string }) {
  const image = getProductImage(product);

  return (
    <Link
      href={getHubProductHref(product)}
      className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10 dark:border-white/10 dark:bg-[#1A1A2E]"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
        {product.category && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-gray-700 shadow-sm">
            {product.category}
          </span>
        )}
        {image ? (
          <img
            src={image}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <ShoppingBag className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="p-4">
        {product.store_name && (
          <p className="mb-1 truncate text-xs font-semibold text-[#16C784]">{product.store_name}</p>
        )}
        <h3 className="mb-3 line-clamp-2 min-h-[40px] font-bold text-gray-900 dark:text-white">{product.title}</h3>
        <div className="flex items-center justify-between">
          <span className="font-black text-[#16C784]">
            {formatPrice(product.price)} {currency}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors group-hover:bg-[#16C784] group-hover:text-white dark:bg-gray-800 dark:text-gray-400">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function HubHomeContent({ trendingProducts, categories, marketplaceSettings }: HubHomeContentProps) {
  const { t, locale } = useLocale();
  const rtl = isRtlLocale(marketplaceSettings, locale);
  const [slideIndex, setSlideIndex] = useState(0);

  // Admin-managed block configuration (enable/disable, order, titles, limits)
  const blocks = useMemo(
    () => resolveHomeBlocks(marketplaceSettings?.hub_homepage_blocks, 'classic'),
    [marketplaceSettings?.hub_homepage_blocks],
  );
  const blockById = useMemo(() => new Map(blocks.map((block) => [block.id, block])), [blocks]);
  const isBlockEnabled = (id: string) => blockById.get(id)?.enabled !== false;
  const blockTitle = (id: string, fallback: string) => blockById.get(id)?.title || fallback;
  const blockLimit = (id: string, fallback: number) => blockById.get(id)?.limit || fallback;

  const publicCategories = categories.filter((category) => !category.is_default);
  const featuredCategories = publicCategories.slice(0, blockLimit('categories', 8));
  const heroCategories = publicCategories.slice(0, 10);
  const dealProducts = trendingProducts.slice(0, blockLimit('deals_spotlight', 4));
  const heroProducts = trendingProducts.slice(0, 3);
  const categoryShowcase = publicCategories.slice(0, blockLimit('category_showcase', 3));
  const currency = marketplaceSettings?.default_currency || t('common.currency');
  const tagline = marketplaceSettings?.marketplace_tagline || t('common.tagline');

  // Admin-defined hero slides rotate and override the banner settings.
  const heroSlides = blockById.get('hero')?.slides ?? [];
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const id = setInterval(() => setSlideIndex((prev) => (prev + 1) % heroSlides.length), 6000);
    return () => clearInterval(id);
  }, [heroSlides.length]);
  const activeSlide = heroSlides.length > 0 ? heroSlides[slideIndex % heroSlides.length] : null;

  const bannerTitle = activeSlide?.title || marketplaceSettings?.hub_homepage_banner_title?.trim() || t('hub.hero.title');
  const bannerSubtitle = activeSlide?.subtitle || marketplaceSettings?.hub_homepage_banner_subtitle?.trim() || t('hub.hero.subtitle');
  const bannerCtaLabel = activeSlide?.cta_label || marketplaceSettings?.hub_homepage_banner_cta_label?.trim() || t('nav.explore');
  const bannerCtaUrl = activeSlide?.cta_url || marketplaceSettings?.hub_homepage_banner_cta_url?.trim() || '/hub/search';
  const bannerImage = normalizePublicAssetUrl(activeSlide?.image_url || marketplaceSettings?.hub_homepage_banner_image_url || '');
  const marketplaceStats = [
    { label: 'Produits actifs', value: `${trendingProducts.length}+` },
    { label: 'Catégories', value: `${publicCategories.length}+` },
    { label: 'Paiements', value: '4 modes' },
  ];

  const features = [
    {
      icon: Store,
      title: t('hub.valueProps.verified.title'),
      desc: t('hub.valueProps.verified.desc'),
    },
    {
      icon: Zap,
      title: t('hub.valueProps.payment.title'),
      desc: t('hub.valueProps.payment.desc'),
    },
    {
      icon: ShoppingBag,
      title: t('hub.valueProps.fast.title'),
      desc: t('hub.valueProps.fast.desc'),
    },
  ];

  const serviceBadges = [
    { icon: Truck, title: 'Livraison rapide', desc: 'Expédition locale par les vendeurs' },
    { icon: CreditCard, title: 'Paiement sécurisé', desc: 'Flouci, Konnect, mandat et COD' },
    { icon: BadgeCheck, title: 'Boutiques vérifiées', desc: 'Vendeurs tunisiens contrôlés' },
    { icon: Headphones, title: 'Support acheteur', desc: 'Assistance marketplace centralisée' },
  ];

  const renderFeatures = (): ReactNode => (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {features.map((feature, idx) => (
          <div key={idx} className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-[#1A1A2E]">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#16C784]/10 text-[#16C784]">
              <feature.icon className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">{feature.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );

  const renderCategories = (): ReactNode => (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#16C784]/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#0f9f6e]">
            <Grid3X3 className="h-3.5 w-3.5" />
            Marketplace
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">{t('hub.categories')}</h2>
        </div>
        <Link href="/hub/search" className="flex items-center font-bold text-[#16C784] hover:text-[#14b576]">
          {t('common.seeAll')} <ArrowRight className="ms-1 h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {featuredCategories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/hub/search?category=${encodeURIComponent(cat.slug)}`}
            className="group relative min-h-[210px] overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/15"
          >
            {cat.image_url ? (
              <img src={normalizePublicAssetUrl(cat.image_url)} alt={cat.name} className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(22,199,132,0.45),transparent_40%),linear-gradient(135deg,#0f172a,#16C784)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent" />
            <div className="relative flex h-full min-h-[210px] flex-col justify-end p-6">
              <div className="mb-3 inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white/85 backdrop-blur">
                {cat.product_count || 0} produits
              </div>
              <h3 className="text-xl font-black">{cat.name}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-white/75">
                {cat.short_description || cat.description || t('nav.explore')}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );

  const renderDealsSpotlight = (): ReactNode => (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] bg-gradient-to-br from-[#16C784] to-[#0f9f6e] p-8 text-white shadow-xl shadow-[#16C784]/20">
          <Sparkles className="mb-5 h-10 w-10" />
          <h2 className="text-3xl font-black">{blockTitle('deals_spotlight', 'Daily marketplace deals')}</h2>
          <p className="mt-3 text-white/75">Discover new offers from independent Tunisian sellers every day.</p>
          <Link href="/hub/search" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#0f9f6e]">
            Shop deals <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {dealProducts.map((product) => (
            <Link key={product.id} href={getHubProductHref(product)} className="group flex gap-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-[#1A1A2E]">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
                {getProductImage(product) ? (
                  <img src={getProductImage(product)} alt={product.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    <PackageCheck className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[11px] font-black text-red-600">
                  <Flame className="h-3 w-3" />
                  Trending
                </div>
                <h3 className="line-clamp-2 font-bold text-gray-900 dark:text-white">{product.title}</h3>
                <p className="mt-2 font-black text-[#16C784]">{formatPrice(product.price)} {currency}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );

  const renderTrending = (): ReactNode => (
    <section className="bg-gray-50 py-20 dark:bg-[#0F0F23]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-600">
              <Flame className="h-3.5 w-3.5" />
              Trending now
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white">{blockTitle('trending', t('hub.trending'))}</h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('hub.trendingSubtitle')}</p>
          </div>
          <Link href="/hub/search" className="flex items-center font-bold text-[#16C784] hover:text-[#14b576]">
            {t('common.seeAll')} <ArrowRight className="ms-1 h-4 w-4" />
          </Link>
        </div>
        {trendingProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {trendingProducts.map((product) => (
              <ProductCard key={product.id} product={product} currency={currency} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400">{t('common.noResults')}</p>
            <Link
              href="/hub/vendor-signup"
              className="mt-4 inline-block px-6 py-2 bg-[#16C784] text-white font-medium rounded-full hover:bg-[#14b876] transition-colors"
            >
              {t('hub.hero.ctaCreateStore')}
            </Link>
          </div>
        )}
      </div>
    </section>
  );

  const renderCategoryShowcase = (): ReactNode => {
    if (categoryShowcase.length === 0) return null;
    return (
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {categoryShowcase.map((category) => (
            <Link key={category.slug} href={`/hub/search?category=${encodeURIComponent(category.slug)}`} className="group rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-[#1A1A2E]">
              <div className="mb-5 h-44 overflow-hidden rounded-3xl bg-gray-100 dark:bg-gray-800">
                {category.image_url ? (
                  <img src={normalizePublicAssetUrl(category.image_url)} alt={category.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-[#16C784] text-white">
                    <Grid3X3 className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#16C784]">{category.product_count || 0} produits</p>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">{category.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{category.short_description || category.description || t('nav.explore')}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors group-hover:bg-[#16C784] group-hover:text-white dark:bg-white/10 dark:text-gray-300">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  };

  const renderCtaBanner = (): ReactNode => (
    <section className="bg-gradient-to-r from-[#1A1A2E] to-[#25253D] py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pd-reveal">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{blockTitle('cta_banner', t('hub.ctaBanner.title'))}</h2>
        <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">{t('hub.ctaBanner.subtitle')}</p>
        <Link
          href={blockById.get('cta_banner')?.cta_url || '/hub/vendor-signup'}
          className="pd-btn pd-btn-primary inline-block px-10 py-4 bg-[#16C784] text-white font-semibold rounded-full shadow-lg shadow-[#16C784]/30 hover:bg-[#14b576] hover:-translate-y-0.5 transition-all text-lg"
        >
          {blockById.get('cta_banner')?.cta_label || t('hub.ctaBanner.cta')}
        </Link>
      </div>
    </section>
  );

  const middleRenderers: Record<string, () => ReactNode> = {
    features: renderFeatures,
    categories: renderCategories,
    deals_spotlight: renderDealsSpotlight,
    trending: renderTrending,
    category_showcase: renderCategoryShowcase,
    cta_banner: renderCtaBanner,
    recently_viewed: () => <RecentlyViewedRail />,
  };

  const middleBlocks = blocks.filter((block) => MIDDLE_BLOCK_IDS.includes(block.id) && block.enabled);

  return (
    <main dir={rtl ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      {isBlockEnabled('hero') && (
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(22,199,132,0.22),transparent_34%),linear-gradient(180deg,#f8fffb_0%,#ffffff_100%)] pb-20 pt-8 dark:from-[#16C784]/10 dark:to-[#0F0F23]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#16C784] to-[#1EE69A]" />
        <div className="absolute -left-24 top-28 h-72 w-72 rounded-full bg-[#16C784]/10 blur-3xl" />
        <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-slate-900/5 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr_300px]">
            <aside className="hidden rounded-3xl border border-gray-100 bg-white p-5 shadow-xl shadow-emerald-950/5 dark:border-white/10 dark:bg-[#1A1A2E] lg:block">
              <div className="mb-4 flex items-center gap-2 font-black text-gray-900 dark:text-white">
                <Grid3X3 className="h-5 w-5 text-[#16C784]" />
                Departments
              </div>
              <div className="space-y-1">
                {heroCategories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/hub/search?category=${encodeURIComponent(category.slug)}`}
                    className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-[#16C784]/10 hover:text-[#0f9f6e] dark:text-gray-300"
                  >
                    <span className="truncate">{category.name}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ))}
                <Link href="/hub/search" className="mt-2 flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2.5 text-sm font-bold text-[#16C784] dark:bg-white/5">
                  {t('common.seeAll')} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </aside>

            <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl shadow-emerald-950/20 md:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(22,199,132,0.55),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.18),transparent_28%)]" />
              {bannerImage && <img src={bannerImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
              <div className="relative max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white shadow-sm backdrop-blur">
                  <ShieldCheck className="h-4 w-4 text-[#1EE69A]" />
                  {tagline}
                </div>
                <h1 className="mb-5 text-4xl font-black tracking-tight md:text-6xl">
                  {bannerTitle}
                </h1>
                <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                  {bannerSubtitle}
                </p>
                <Link
                  href={bannerCtaUrl}
                  className="flex max-w-xl items-center gap-3 rounded-full border border-white/15 bg-white p-2 pl-5 text-left text-gray-500 shadow-2xl shadow-black/20 transition-all hover:border-[#16C784]/40"
                >
                  <Search className="h-5 w-5 text-gray-400" />
                  <span className="flex-1 text-sm">{t('common.search')}</span>
                  <span className="rounded-full bg-[#16C784] px-5 py-3 text-sm font-bold text-white">{bannerCtaLabel}</span>
                </Link>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  {marketplaceStats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                      <p className="text-2xl font-black">{stat.value}</p>
                      <p className="mt-1 text-xs font-semibold text-white/60">{stat.label}</p>
                    </div>
                  ))}
                </div>
                {heroSlides.length > 1 && (
                  <div className="mt-6 flex gap-1.5">
                    {heroSlides.map((entry, idx) => (
                      <button key={`${entry.title}-${idx}`} type="button" aria-label={`Slide ${idx + 1}`} onClick={() => setSlideIndex(idx)} className={`h-1.5 rounded-full transition-all ${idx === slideIndex % heroSlides.length ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {heroProducts.map((product, index) => (
                <Link
                  key={product.id}
                  href={getHubProductHref(product)}
                  className="group flex overflow-hidden rounded-3xl border border-gray-100 bg-white p-3 shadow-xl shadow-emerald-950/5 transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-[#1A1A2E]"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
                    {getProductImage(product) ? (
                      <img src={getProductImage(product)} alt={product.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 px-3 py-1">
                    <p className="text-[11px] font-black uppercase tracking-wide text-[#16C784]">Top pick #{index + 1}</p>
                    <h3 className="mt-1 line-clamp-2 text-sm font-bold text-gray-900 dark:text-white">{product.title}</h3>
                    <p className="mt-1 text-sm font-black text-[#16C784]">{formatPrice(product.price)} {currency}</p>
                  </div>
                </Link>
              ))}
              <Link href="/hub/vendor-signup" className="rounded-3xl bg-gradient-to-br from-[#16C784] to-[#0f9f6e] p-5 text-white shadow-xl shadow-[#16C784]/20 transition hover:-translate-y-1">
                <Store className="mb-4 h-8 w-8" />
                <p className="text-lg font-black">{t('hub.hero.ctaCreateStore')}</p>
                <p className="mt-2 text-sm text-white/75">Launch your seller storefront and sell on PandaMarket.</p>
              </Link>
            </aside>
          </div>
        </div>
        </section>
      )}

      {/* Value Props */}
      {isBlockEnabled('value_props') && (
        <section className="relative z-10 mx-auto -mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-xl shadow-gray-200/50 dark:border-white/10 dark:bg-[#1A1A2E] dark:shadow-black/20 md:grid-cols-4">
            {serviceBadges.map((badge) => (
              <div key={badge.title} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-gray-50 dark:hover:bg-white/5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#16C784]/10 text-[#16C784]">
                  <badge.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">{badge.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Admin-ordered middle sections */}
      {middleBlocks.map((block) => (
        <Fragment key={block.id}>{middleRenderers[block.id]?.() ?? null}</Fragment>
      ))}
    </main>
  );
}
