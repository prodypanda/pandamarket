import { getResizedImageUrl } from '@/lib/image-url';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { HubNavbar } from '../../../../components/hub/HubNavbar';
import { HubFooter } from '../../../../components/hub/HubFooter';
import {
  BadgeCheck,
  Book,
  Box,
  Car,
  ChevronRight,
  Gamepad,
  Headphones,
  Home as HomeIcon,
  Laptop,
  Layers,
  Package,
  Search,
  ShieldCheck,
  Shirt,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  Tv,
  Utensils,
  Watch,
} from 'lucide-react';
import { getHubProductHref } from '../../../../lib/product-links';
import { getMarketplaceSettings } from '../../../../lib/marketplace-settings';
import { isAliExpressTheme } from '../../../../lib/marketplace-theme';
import { selectLogoForSurface } from '../../../../lib/public-assets';
import { SponsoredAdsRail } from '../../../../components/hub/SponsoredAdsRail';
import { LazyBlurImage } from '../../../../components/ui/LazyBlurImage';

import { CategoryBreadcrumbs } from '../../../../components/hub/CategoryBreadcrumbs';
import { SubcategoryGrid } from '../../../../components/hub/SubcategoryGrid';

interface Product {
  id: string;
  title: string;
  slug?: string | null;
  price: number | string;
  thumbnail?: string;
  images?: { url: string }[];
  category?: string;
  marketplace_category_slug?: string | null;
  store_id: string;
  store_name?: string;
  store_subdomain?: string | null;
}

interface CategoryData {
  id?: string;
  slug: string;
  name: string;
  description?: string | null;
  short_description?: string | null;
  image_url?: string | null;
  banner_url?: string | null;
  icon?: string | null;
}

interface CategoryResponse {
  category: CategoryData;
  ancestors?: Array<{ id: string; name: string; slug: string }>;
  subcategories?: Array<{ id: string; name: string; slug: string; short_description?: string | null; image_url?: string | null; icon?: string | null; product_count?: number }>;
  data: Product[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}

const ICON_MAP: Record<string, any> = {
  Layers,
  Laptop,
  Smartphone,
  Shirt,
  Sparkles,
  Home: HomeIcon,
  Car,
  Watch,
  Utensils,
  Book,
  Gamepad,
  Tv,
  Headphones,
  Package,
};

function getCategoryIconComponent(cat: { icon?: string | null; slug?: string; name?: string }) {
  if (cat.icon && ICON_MAP[cat.icon]) {
    return ICON_MAP[cat.icon];
  }
  const slug = (cat.slug || cat.name || '').toLowerCase();
  if (slug.includes('electr') || slug.includes('tech') || slug.includes('phone') || slug.includes('ordinat')) return Laptop;
  if (slug.includes('fash') || slug.includes('vetement') || slug.includes('cloth') || slug.includes('mode')) return Shirt;
  if (slug.includes('home') || slug.includes('maison') || slug.includes('meuble') || slug.includes('furnit')) return HomeIcon;
  if (slug.includes('beaut') || slug.includes('beaute') || slug.includes('cosmet')) return Sparkles;
  if (slug.includes('auto') || slug.includes('vehic') || slug.includes('car')) return Car;
  if (slug.includes('bijou') || slug.includes('watch') || slug.includes('montre')) return Watch;
  if (slug.includes('food') || slug.includes('alimen') || slug.includes('restau')) return Utensils;
  if (slug.includes('book') || slug.includes('livre') || slug.includes('bureau')) return Book;
  if (slug.includes('game') || slug.includes('jouet') || slug.includes('toy')) return Gamepad;
  if (slug.includes('media') || slug.includes('tv') || slug.includes('video')) return Tv;
  if (slug.includes('audio') || slug.includes('headphone') || slug.includes('casque')) return Headphones;
  if (slug.includes('emball') || slug.includes('packag') || slug.includes('box')) return Package;
  return Layers;
}

const TRANSLATIONS = {
  fr: {
    notFoundTitle: 'Catégorie introuvable',
    notFoundDesc: (slug: string) => `La catégorie "${slug}" n'existe pas ou ne contient aucun produit.`,
    backToHub: 'Retour au Hub',
    productsFound: (count: number) => `${count} produit${count !== 1 ? 's' : ''} trouvé${count !== 1 ? 's' : ''}`,
    subcategoriesCount: (count: number) => `${count} sous-catégorie${count > 1 ? 's' : ''}`,
    advancedFilters: 'Filtres avancés',
    noImage: "Pas d'image",
    noProducts: 'Aucun produit dans cette catégorie pour le moment.',
    previous: '← Précédent',
    next: 'Suivant →',
    sponsoredInCat: 'Sponsorisé dans cette catégorie',
    tradeAssurance: 'Garantie Trade Assurance',
    verifiedSuppliers: 'Fournisseurs & Usines Vérifiés',
    fastShipping: 'Expédition Rapide',
    searchInCat: (name: string) => `Rechercher dans ${name}...`,
    searchBtn: 'Rechercher',
    allSubcat: 'Toutes les sous-catégories',
  },
  ar: {
    notFoundTitle: 'القسم غير موجود',
    notFoundDesc: (slug: string) => `القسم "${slug}" غير موجود أو لا يحتوي على منتجات حالياً.`,
    backToHub: 'العودة إلى السوق الرئيسي',
    productsFound: (count: number) => `${count} منتج متوفر`,
    subcategoriesCount: (count: number) => `${count} أقسام فرعية`,
    advancedFilters: 'تصفية متقدمة',
    noImage: 'لا تتوفر صورة',
    noProducts: 'لا توجد منتجات متوفرة في هذا القسم حالياً.',
    previous: '← السابق',
    next: 'التالي →',
    sponsoredInCat: 'منتجات ممولة في هذا القسم',
    tradeAssurance: 'ضمان تجاري معتمد',
    verifiedSuppliers: 'موردون ومصانع معتمدة',
    fastShipping: 'شحن سريع معتمد',
    searchInCat: (name: string) => `البحث في قسم ${name}...`,
    searchBtn: 'بحث',
    allSubcat: 'جميع الأقسام الفرعية',
  },
  en: {
    notFoundTitle: 'Category Not Found',
    notFoundDesc: (slug: string) => `The category "${slug}" does not exist or has no products yet.`,
    backToHub: 'Back to Marketplace Hub',
    productsFound: (count: number) => `${count} product${count !== 1 ? 's' : ''} found`,
    subcategoriesCount: (count: number) => `${count} subcategor${count > 1 ? 'ies' : 'y'}`,
    advancedFilters: 'Advanced Filters',
    noImage: 'No image',
    noProducts: 'No products available in this category yet.',
    previous: '← Previous',
    next: 'Next →',
    sponsoredInCat: 'Sponsored in this category',
    tradeAssurance: 'Trade Assurance Protection',
    verifiedSuppliers: 'Verified Suppliers & Factories',
    fastShipping: 'Fast Express Shipping',
    searchInCat: (name: string) => `Search in ${name}...`,
    searchBtn: 'Search',
    allSubcat: 'All Subcategories',
  },
};

async function getCategoryProducts(
  slug: string,
  page: number = 1,
  locale: string = 'fr',
): Promise<CategoryResponse | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(
      `${backendUrl}/api/pd/categories/${encodeURIComponent(slug)}?page=${page}&limit=20&locale=${encodeURIComponent(locale)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  const marketplaceSettings = await getMarketplaceSettings();
  const marketplaceName = marketplaceSettings.marketplace_name || 'PandaMarket';
  const logoImageUrl = selectLogoForSurface({
    marketplace_logo_url: marketplaceSettings.marketplace_logo_url,
    marketplace_logo_light_url: marketplaceSettings.marketplace_logo_light_url,
    marketplace_logo_dark_url: marketplaceSettings.marketplace_logo_dark_url,
  }, 'light');
  const ogImageUrl = marketplaceSettings.marketplace_og_image_url || logoImageUrl || '/og-image.png';
  const description = `Découvrez les meilleurs produits ${name.toLowerCase()} sur ${marketplaceName}. Comparez les prix et achetez auprès de vendeurs vérifiés.`;
  return {
    title: `${name} — Produits`,
    description,
    openGraph: {
      title: `${name} — ${marketplaceName}`,
      description,
      type: 'website',
      url: `/hub/category/${slug}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${name} — ${marketplaceName}` }],
    },
  };
}

function formatPrice(price: number | string): string {
  const amount = Number(price);
  return `${Number.isFinite(amount) ? amount.toFixed(3) : '0.000'} TND`;
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; locale?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = parseInt(sp.page || '1', 10);

  const [cookieStore, marketplaceSettings] = await Promise.all([
    cookies(),
    getMarketplaceSettings(),
  ]);
  const cookieLocale = cookieStore.get('pd_locale')?.value;
  const activeLocale = sp.locale || cookieLocale || marketplaceSettings.marketplace_default_locale || 'fr';
  const isRtl = activeLocale === 'ar';
  const i18n = TRANSLATIONS[activeLocale as keyof typeof TRANSLATIONS] || TRANSLATIONS.fr;

  const result = await getCategoryProducts(slug, page, activeLocale);

  const isAliExpress = isAliExpressTheme(marketplaceSettings.marketplace_theme);
  const isAliExpress2 = marketplaceSettings.marketplace_theme === 'aliexpress2';
  const accentText = 'text-[#ff6a00]';
  const accentBg = 'bg-[#ff6a00]';
  const accentHoverBg = 'hover:bg-orange-600';

  if (!result) {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#F5F7FA]">
        <HubNavbar
          marketplaceName={marketplaceSettings.marketplace_name}
          marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
          marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
          marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
          marketplaceTheme={marketplaceSettings.marketplace_theme}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 text-[#ff6a00] border border-orange-100 shadow-md">
            <Layers className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3">{i18n.notFoundTitle}</h1>
          <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium text-sm leading-relaxed">
            {i18n.notFoundDesc(slug)}
          </p>
          <Link
            href="/hub"
            className={`inline-flex items-center gap-2 px-8 py-3.5 ${accentBg} text-white font-extrabold rounded-full ${accentHoverBg} transition-all shadow-lg hover:shadow-orange-950/20`}
          >
            {i18n.backToHub}
          </Link>
        </main>
        <HubFooter {...marketplaceSettings} />
      </div>
    );
  }

  const { category, data: products, meta } = result;
  const CategoryIconComp = getCategoryIconComponent(category);
  const isV2Showcase = marketplaceSettings.hub_category_page_style === 'v2_modern_showcase';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#F5F7FA]">
      <HubNavbar
        marketplaceName={marketplaceSettings.marketplace_name}
        marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
        marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
        marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
        marketplaceTheme={marketplaceSettings.marketplace_theme}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumbs */}
        <CategoryBreadcrumbs ancestors={result.ancestors && result.ancestors.length > 0 ? result.ancestors : [{ id: category.slug, name: category.name, slug: category.slug }]} locale={activeLocale} />

        {isV2Showcase ? (
          /* ========================================================================= */
          /* VERSION 2: MODERN SHOWCASE (BIGGER PICTURE HERO & COMPACT INFORMATION AREA)*/
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Compact 60% Height Hero Showcase Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-950 text-white shadow-xl h-48 sm:h-52 md:h-60 flex flex-col justify-between p-5 md:p-6">
              {category.banner_url || category.image_url ? (
                <LazyBlurImage
                  src={category.banner_url || category.image_url!}
                  alt={category.name}
                  containerClassName="absolute inset-0 h-full w-full"
                  className="h-full w-full object-cover opacity-60 transition-transform duration-1000 hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#0b1e3f] via-[#163060] to-[#ff6a00]/40 opacity-90" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent" />

              {/* Top Hero Pills */}
              <div className="relative z-10 flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-0.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-950 shadow-md">
                  <Sparkles className="h-3 w-3" />
                  {i18n.tradeAssurance}
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-white/15 backdrop-blur-md px-3 py-0.5 text-xs font-black text-white border border-white/20 shadow-xs">
                    {i18n.productsFound(meta.total)}
                  </span>
                  {result.subcategories && result.subcategories.length > 0 && (
                    <span className="rounded-xl bg-[#ff6a00] px-3 py-0.5 text-xs font-black text-white shadow-xs">
                      {i18n.subcategoriesCount(result.subcategories.length)}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Hero Info Area */}
              <div className="relative z-10 flex items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-amber-400 backdrop-blur-xl border border-white/30 shadow-xl p-1 overflow-hidden">
                    {category.image_url ? (
                      <LazyBlurImage
                        src={category.image_url ? getResizedImageUrl(category.image_url, 'medium') : ''}
                        alt={category.name}
                        containerClassName="h-full w-full rounded-xl"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <CategoryIconComp className="h-7 w-7 text-amber-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">{category.name}</h1>
                    <p className="text-xs text-slate-200 max-w-xl leading-relaxed font-medium line-clamp-1 drop-shadow-sm">
                      {category.short_description || category.description || `${i18n.productsFound(meta.total)}.`}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/hub/search?category=${encodeURIComponent(category.name)}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/20 px-4 py-2 text-xs font-black text-white backdrop-blur-md hover:bg-white/30 hover:scale-105 transition-all shadow-md shrink-0"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
                  <span>{i18n.advancedFilters}</span>
                </Link>
              </div>
            </div>

            {/* Compact Information Area Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                {/* Search in Category Input */}
                <form action="/hub/search" method="GET" className="flex w-full lg:max-w-md items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5 focus-within:bg-white focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/20 transition-all">
                  <input type="hidden" name="category" value={category.name} />
                  <Search className="h-4 w-4 ml-2 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    name="q"
                    placeholder={i18n.searchInCat(category.name)}
                    className="w-full bg-transparent px-2 py-1 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none"
                  />
                  <button type="submit" className="rounded-xl bg-[#ff6a00] px-4 py-2 text-xs font-black text-white hover:bg-orange-600 transition-colors shadow-xs shrink-0">
                    {i18n.searchBtn}
                  </button>
                </form>

                {/* Sourcing Badges */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-extrabold text-slate-700">
                  <div className="flex items-center gap-1.5 bg-orange-50/80 text-[#ff6a00] px-3 py-1.5 rounded-xl border border-orange-100">
                    <ShieldCheck className="h-4 w-4" />
                    <span>{i18n.tradeAssurance}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-blue-50/80 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100">
                    <BadgeCheck className="h-4 w-4 text-blue-500" />
                    <span>{i18n.verifiedSuppliers}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50/80 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100">
                    <Truck className="h-4 w-4 text-emerald-500" />
                    <span>{i18n.fastShipping}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* VERSION 1: CLASSIC HEADER                                                 */
          /* ========================================================================= */
          <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-[#0b1e3f] via-[#163060] to-[#1e3c72] p-8 text-white shadow-xl">
            {category.banner_url && (
              <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(${getResizedImageUrl(category.banner_url, 'large')})` }} />
            )}

            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-amber-400 backdrop-blur-md border border-white/20 shadow-md">
                  {category.image_url ? (
                    <LazyBlurImage src={category.image_url ? getResizedImageUrl(category.image_url, 'medium') : ''} alt={category.name} containerClassName="h-full w-full rounded-2xl" className="h-full w-full object-cover" />
                  ) : (
                    <CategoryIconComp className="h-8 w-8" />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white leading-tight">{category.name}</h1>
                  <p className="mt-1.5 text-xs font-semibold text-white/80 max-w-xl leading-relaxed">
                    {category.short_description || category.description || `${i18n.productsFound(meta.total)}.`}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold text-white backdrop-blur-xs border border-white/10">
                      <Box className="h-3.5 w-3.5 text-amber-400" />
                      {i18n.productsFound(meta.total)}
                    </span>
                    {result.subcategories && result.subcategories.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/80 px-3 py-1 text-xs font-extrabold text-white backdrop-blur-xs">
                        <Layers className="h-3.5 w-3.5" />
                        {i18n.subcategoriesCount(result.subcategories.length)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Link
                href={`/hub/search?category=${encodeURIComponent(category.name)}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-6 py-3 text-xs font-black text-white backdrop-blur-md hover:bg-white/25 transition-all shadow-md shrink-0 w-fit"
              >
                <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                {i18n.advancedFilters}
              </Link>
            </div>

            {/* B2B Sourcing Feature Badges */}
            <div className="relative z-10 mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-extrabold text-white/90">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                <span>{i18n.tradeAssurance}</span>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-blue-400" />
                <span>{i18n.verifiedSuppliers}</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-orange-400" />
                <span>{i18n.fastShipping}</span>
              </div>
            </div>
          </div>
        )}

        {/* Subcategories Grid */}
        <SubcategoryGrid parentName={category.name} subcategories={result.subcategories || []} locale={activeLocale} isV2Showcase={isV2Showcase} />

        <SponsoredAdsRail placement="search.top_results" title={i18n.sponsoredInCat} locale={activeLocale as 'fr' | 'ar' | 'en'} category={slug} />

        {/* Product Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-10">
            {products.map((product) => {
              const imageUrl =
                product.thumbnail ||
                (product.images && product.images[0]
                  ? typeof product.images[0] === 'string'
                    ? product.images[0]
                    : (product.images[0] as { url: string }).url
                  : null);

              return (
                <Link
                  key={product.id}
                  href={getHubProductHref(product)}
                  className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl block"
                >
                  <div className="aspect-square bg-slate-50 relative overflow-hidden">
                    {imageUrl ? (
                      <LazyBlurImage
                        src={imageUrl}
                        alt={product.title}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                        {i18n.noImage}
                      </div>
                    )}
                  </div>
                  <div className="p-3.5">
                    {product.category && (
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 truncate">
                        {product.category}
                      </p>
                    )}
                    <h3 className="font-extrabold text-slate-900 text-xs mb-1.5 line-clamp-2 leading-snug group-hover:text-[#ff6a00] transition-colors">
                      {product.title}
                    </h3>
                    <p className="font-black text-[#ff6a00] text-sm">
                      {formatPrice(product.price)}
                    </p>
                    {product.store_name && (
                      <p className="text-[11px] font-bold text-slate-500 mt-1.5 flex items-center gap-1 truncate">
                        <Store className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{product.store_name}</span>
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 rounded-3xl border border-dashed border-slate-200 bg-white p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Box className="h-8 w-8" />
            </div>
            <p className="text-slate-600 font-bold text-base">{i18n.noProducts}</p>
          </div>
        )}

        {/* Localized Pagination */}
        {meta.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/hub/category/${slug}?page=${page - 1}&locale=${activeLocale}`}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                {i18n.previous}
              </Link>
            )}
            {Array.from({ length: Math.min(meta.total_pages, 5) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Link
                  key={pageNum}
                  href={`/hub/category/${slug}?page=${pageNum}&locale=${activeLocale}`}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-colors shadow-xs ${
                    pageNum === page
                      ? 'bg-[#ff6a00] text-white shadow-orange-950/20'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </Link>
              );
            })}
            {page < meta.total_pages && (
              <Link
                href={`/hub/category/${slug}?page=${page + 1}&locale=${activeLocale}`}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                {i18n.next}
              </Link>
            )}
          </div>
        )}
      </main>
      <HubFooter {...marketplaceSettings} />
    </div>
  );
}
