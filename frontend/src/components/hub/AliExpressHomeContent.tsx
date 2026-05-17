'use client';

import Link from 'next/link';
import { ArrowRight, BadgePercent, Flame, Grid3X3, Headphones, Package, Search, ShieldCheck, ShoppingBag, Star, Store, Truck, Zap } from 'lucide-react';
import { getHubProductHref } from '../../lib/product-links';
import { normalizePublicAssetUrl } from '../../lib/public-assets';
import { getMarketplaceThemeClasses, resolveMarketplaceTheme } from '../../lib/marketplace-theme';

type MarketplaceThemeClasses = ReturnType<typeof getMarketplaceThemeClasses>;

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
}

interface AliExpressHomeContentProps {
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

function DealCard({ product, currency, themeClasses, isAliExpress2 }: { product: Product; currency: string; themeClasses: MarketplaceThemeClasses; isAliExpress2: boolean }) {
  const image = getProductImage(product);

  return (
    <Link href={getHubProductHref(product)} className={`group overflow-hidden ${themeClasses.card} block`}>
      <div className={`relative aspect-square overflow-hidden ${isAliExpress2 ? 'bg-orange-50/30' : 'bg-orange-50'}`}>
        <span className={`absolute left-2 top-2 z-10 px-2.5 py-1 text-[10px] ${themeClasses.dealPill}`}>Deal</span>
        {image ? (
          <img src={image} alt={product.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-orange-300">
            <ShoppingBag className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 min-h-[40px] text-sm font-bold text-gray-900">{product.title}</h3>
        <div className="mt-2 flex items-end justify-between gap-2">
          <span className={`text-lg font-black ${themeClasses.primaryText}`}>{formatPrice(product.price)} {currency}</span>
          <span className={`px-2 py-1 text-[10px] ${themeClasses.primarySoft}`}>Hot</span>
        </div>
        {product.store_name && <p className="mt-1 truncate text-xs font-semibold text-gray-400">{product.store_name}</p>}
      </div>
    </Link>
  );
}

export function AliExpressHomeContent({ trendingProducts, categories, marketplaceSettings }: AliExpressHomeContentProps) {
  const publicCategories = categories.filter((category) => !category.is_default);
  const heroCategories = publicCategories.slice(0, 12);
  const featuredCategories = publicCategories.slice(0, 8);
  const flashProducts = trendingProducts.slice(0, 6);
  const recommendedProducts = trendingProducts.slice(6, 16);
  const currency = marketplaceSettings?.default_currency || 'TND';
  const marketplaceName = marketplaceSettings?.marketplace_name || 'PandaMarket';
  const tagline = marketplaceSettings?.marketplace_tagline || 'Des milliers de produits, prix malins, vendeurs tunisiens.';
  const bannerTitle = marketplaceSettings?.hub_homepage_banner_title?.trim() || `${marketplaceName} deals, direct from local sellers`;
  const bannerSubtitle = marketplaceSettings?.hub_homepage_banner_subtitle?.trim() || tagline;
  const bannerCtaLabel = marketplaceSettings?.hub_homepage_banner_cta_label?.trim() || 'Search';
  const bannerCtaUrl = marketplaceSettings?.hub_homepage_banner_cta_url?.trim() || '/hub/search';
  const bannerImage = normalizePublicAssetUrl(marketplaceSettings?.hub_homepage_banner_image_url || '');
  const theme = resolveMarketplaceTheme(marketplaceSettings?.marketplace_theme);
  const themeClasses = getMarketplaceThemeClasses(theme);
  const isAliExpress2 = theme === 'aliexpress2';

  return (
    <main className={themeClasses.page}>
      <section className={themeClasses.header}>
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 text-sm font-bold sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Mega deals marketplace · coupons · flash offers
          </div>
          <Link href="/hub/search" className="inline-flex items-center gap-1 rounded-full bg-white/15 px-4 py-1.5 text-xs hover:bg-white/25">
            Explore offers <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[260px_1fr_280px]">
          <aside className={`hidden ${themeClasses.panel} p-4 lg:block`}>
            <div className="mb-3 flex items-center gap-2 font-black text-gray-900">
              <Grid3X3 className={`h-5 w-5 ${themeClasses.primaryText}`} />
              Categories
            </div>
            <div className="space-y-1">
              {heroCategories.map((category) => (
                <Link key={category.slug} href={`/hub/search?category=${encodeURIComponent(category.slug)}`} className={`flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-600 transition ${themeClasses.primaryTextHover} ${isAliExpress2 ? 'rounded-lg hover:bg-orange-50/50' : 'rounded-xl hover:bg-orange-50'}`}>
                  <span className="truncate">{category.name}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </aside>

          <div className={`overflow-hidden ${isAliExpress2 ? 'rounded-xl shadow-xl shadow-orange-900/10' : 'rounded-3xl shadow-sm'}`}>
            <div className={`relative min-h-[420px] overflow-hidden ${isAliExpress2 ? 'bg-gradient-to-br from-[#ff4747] via-[#ff5f2e] to-[#ff8a00]' : 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.42),transparent_32%),linear-gradient(135deg,#ff4747_0%,#ff7a00_52%,#ffd36d_100%)]'} p-6 text-white md:p-10`}>
              <div className="absolute -right-14 bottom-0 h-72 w-72 rounded-full bg-white/15 blur-2xl" />
              {bannerImage && <img src={bannerImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
              <div className="relative max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide backdrop-blur">
                  <BadgePercent className="h-4 w-4" />
                  AliExpress style marketplace
                </span>
                <h1 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
                  {bannerTitle}
                </h1>
                <p className="mt-5 max-w-xl text-lg font-medium text-white/85">{bannerSubtitle}</p>
                <Link href={bannerCtaUrl} className="mt-8 flex max-w-xl items-center gap-3 rounded-full bg-white p-2 pl-5 text-left text-gray-500 shadow-2xl shadow-orange-950/20 transition hover:scale-[1.01]">
                  <Search className="h-5 w-5 text-gray-400" />
                  <span className="flex-1 text-sm">Search products, stores, categories...</span>
                  <span className={`px-5 py-3 text-sm ${themeClasses.primary}`}>{bannerCtaLabel}</span>
                </Link>
                <div className="mt-7 grid max-w-xl grid-cols-3 gap-3">
                  {[{ label: 'Flash deals', value: `${flashProducts.length}+` }, { label: 'Categories', value: `${publicCategories.length}+` }, { label: 'Local sellers', value: 'Verified' }].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                      <p className="text-2xl font-black">{item.value}</p>
                      <p className="mt-1 text-xs font-semibold text-white/70">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: ShieldCheck, title: 'Buyer protection', desc: 'Secure marketplace checkout' },
              { icon: Truck, title: 'Local delivery', desc: 'Fast shipping from sellers' },
              { icon: Headphones, title: 'Support', desc: 'Marketplace assistance' },
            ].map((item) => (
              <div key={item.title} className={`${themeClasses.panel} p-5`}>
                <item.icon className={`h-7 w-7 ${themeClasses.primaryText}`} />
                <h3 className="mt-4 font-black text-gray-900">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
            <Link href="/hub/vendor-signup" className={`${isAliExpress2 ? 'rounded-xl shadow-lg shadow-orange-900/10 border border-gray-800' : 'rounded-2xl shadow-sm'} bg-gray-900 p-5 text-white transition hover:-translate-y-1`}>
              <Store className="h-7 w-7 text-[#ff8a00]" />
              <p className="mt-4 font-black">Open your store</p>
              <p className="mt-1 text-sm text-white/60">Sell on the marketplace today.</p>
            </Link>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className={`${themeClasses.panel} p-5`}>
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={`h-5 w-5 ${themeClasses.primaryText}`} />
              <h2 className="text-xl font-black text-gray-900">Flash Deals</h2>
            </div>
            <Link href="/hub/search" className={`text-sm font-black ${themeClasses.primaryTextHover} transition-colors`}>View all</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {flashProducts.map((product) => <DealCard key={product.id} product={product} currency={currency} themeClasses={themeClasses} isAliExpress2={isAliExpress2} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
          {featuredCategories.map((category) => (
            <Link key={category.slug} href={`/hub/search?category=${encodeURIComponent(category.slug)}`} className={`group overflow-hidden bg-white text-center transition hover:-translate-y-1 block ${themeClasses.card}`}>
              <div className={`aspect-square ${isAliExpress2 ? 'bg-orange-50/50' : 'bg-orange-50'}`}>
                {category.image_url ? (
                  <img src={normalizePublicAssetUrl(category.image_url)} alt={category.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-orange-300">
                    <Package className="h-8 w-8" />
                  </div>
                )}
              </div>
              <p className="p-3 text-sm font-black text-gray-800">{category.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className={`flex items-center gap-1 text-xs font-black uppercase tracking-wide ${themeClasses.primaryText}`}><Star className={`h-4 w-4 fill-current`} /> Just for you</p>
            <h2 className="text-2xl font-black text-gray-900">Recommended Products</h2>
          </div>
          <Link href="/hub/search" className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-black shadow-sm ${themeClasses.primarySoft}`}>
            More <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {recommendedProducts.map((product) => <DealCard key={product.id} product={product} currency={currency} themeClasses={themeClasses} isAliExpress2={isAliExpress2} />)}
        </div>
      </section>
    </main>
  );
}
