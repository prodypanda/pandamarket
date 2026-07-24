'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Book,
  Box,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Factory,
  Gamepad,
  Globe2,
  Headphones,
  Headset,
  Home as HomeIcon,
  Laptop,
  Layers,
  LayoutGrid,
  Megaphone,
  Package,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  Tv,
  Utensils,
  Watch,
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
  icon?: string | null;
  banner_url?: string | null;
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

function getCategoryIconComponent(cat: TreeCategoryNode) {
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

// Sections that can be reordered from the admin Homepage Blocks editor.
const MIDDLE_BLOCK_IDS = ['deals', 'sponsored_brands', 'product_grid', 'recently_viewed'];

const TRANSLATIONS = {
  fr: {
    allCategories: 'Toutes les catégories',
    subcategoriesAvailable: (count: number) => `${count} sous-catégorie${count > 1 ? 's' : ''} disponible${count > 1 ? 's' : ''}`,
    browseAll: 'Tout parcourir ➔',
    productsCount: (count: number) => `${count} produit${count > 1 ? 's' : ''}`,
    tradeAssurance: 'Protection Trade Assurance',
    tradeAssuranceVerified: 'Vérifié Trade Assurance',
    verifiedLogistics: 'Fournisseurs vérifiés & Logistique rapide',
    verifiedSuppliers: 'Usines & Fournisseurs vérifiés',
    becomeSeller: 'Devenir vendeur',
    defaultCategoryDesc: 'Achetez directement auprès de fabricants et fournisseurs vérifiés.',
    topSellers: 'Meilleurs vendeurs',
    noSellers: 'Aucun vendeur pour le moment',
    rfqTitle: 'Demande de devis (RFQ)',
    rfqSubtitle: 'Exprimez votre besoin et recevez des offres sur mesure.',
    rfqButton: 'Publier une demande',
    endsIn: 'Se termine dans',
    noDeals: 'Aucune offre pour le moment',
    justForYou: 'Pour vous',
    viewAll: 'Voir tout',
    dealsTitle: "Offres du jour",
    exploreDept: 'Découvrir',
  },
  ar: {
    allCategories: 'جميع الأقسام',
    subcategoriesAvailable: (count: number) => `${count} قسم فرعي متوفر`,
    browseAll: 'تصفح الكل ➔',
    productsCount: (count: number) => `${count} منتج`,
    tradeAssurance: 'حماية الضمان التجاري',
    tradeAssuranceVerified: 'ضمان تجاري معتمد',
    verifiedLogistics: 'موردون معتمدون وشحن سريع',
    verifiedSuppliers: 'موردو مصانع معتمدون',
    becomeSeller: 'كن بائعاً',
    defaultCategoryDesc: 'اشترِ مباشرة من المصانع والموردين المعتمدين.',
    topSellers: 'أفضل البائعين',
    noSellers: 'لا يوجد بائعون بعد',
    rfqTitle: 'طلب عروض أسعار (RFQ)',
    rfqSubtitle: 'أخبر الموردين باحتياجاتك واحصل على أفضل العروض.',
    rfqButton: 'إرسال طلب',
    endsIn: 'ينتهي خلال',
    noDeals: 'لا توجد عروض حالياً',
    justForYou: 'خصيصاً لك',
    viewAll: 'عرض الكل',
    dealsTitle: 'عروض اليوم',
    exploreDept: 'استكشاف',
  },
  en: {
    allCategories: 'My Markets & Categories',
    subcategoriesAvailable: (count: number) => `${count} subcategories available`,
    browseAll: 'Browse All ➔',
    productsCount: (count: number) => `${count} products`,
    tradeAssurance: 'Trade Assurance Protection',
    tradeAssuranceVerified: 'Trade Assurance Verified',
    verifiedLogistics: 'Verified Suppliers & Fast Logistics',
    verifiedSuppliers: 'Verified Factory Suppliers',
    becomeSeller: 'Become a Seller',
    defaultCategoryDesc: 'Source directly from verified manufacturers and suppliers.',
    topSellers: 'Top Sellers',
    noSellers: 'No sellers yet',
    rfqTitle: 'Request for Quotation',
    rfqSubtitle: 'Tell sellers what you need and receive tailored offers.',
    rfqButton: 'Post a Request',
    endsIn: 'Ends in',
    noDeals: 'No deals available yet',
    justForYou: 'Just for you',
    viewAll: 'View all',
    dealsTitle: "Today's deals",
    exploreDept: 'Explore',
  },
};

export function AlibabaHomeContent({ trendingProducts, categories, marketplaceSettings }: AlibabaHomeContentProps) {
  const marketplaceName = marketplaceSettings.marketplace_name || 'PandaMarket';
  const { locale } = useLocale();
  const rtl = isRtlLocale(marketplaceSettings, locale);
  const locKey = locale && locale.startsWith('ar') ? 'ar' : locale && locale.startsWith('en') ? 'en' : 'fr';
  const i18n = TRANSLATIONS[locKey];

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

  // Keep active category synced when treeCategories reloads in another locale
  useEffect(() => {
    if (activeCategory && treeCategories.length > 0) {
      const match = treeCategories.find((c) => c.id === activeCategory.id);
      if (match) setActiveCategory(match);
    }
  }, [treeCategories]);

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

  // Admin-managed hero carousel
  const slides = useMemo<HeroSlide[]>(() => {
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
    displayCategories.slice(0, 3).forEach((category) => {
      result.push({
        title: category.name,
        subtitle: category.short_description || category.description || i18n.defaultCategoryDesc,
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
  }, [blockById, displayCategories, i18n.defaultCategoryDesc, marketplaceName, marketplaceSettings]);

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
            <Clock3 className="h-5 w-5" style={{ color: ORANGE }} /> {blockTitle('deals', i18n.dealsTitle)}
          </h2>
          <div className="flex items-center gap-1.5 text-sm font-black">
            <span className="text-gray-500">{i18n.endsIn}</span>
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
          {dealProducts.length === 0 && <p className="col-span-full text-sm text-gray-400">{i18n.noDeals}</p>}
        </div>
      </div>
    </section>
  );

  const renderSponsoredBrands = (): ReactNode => (
    <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <BlockBanner block={blockById.get('sponsored_brands')} />
      <SponsoredAdsRail placement="hub.sponsored_brands" variant="cards" />
    </section>
  );

  const renderProductGrid = (): ReactNode => (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <BlockBanner block={blockById.get('product_grid')} />
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black">{blockTitle('product_grid', i18n.justForYou)}</h2>
        <Link href={blockById.get('product_grid')?.cta_url || '/hub/search'} className="text-xs font-black" style={{ color: ORANGE }}>
          {blockById.get('product_grid')?.cta_label || i18n.viewAll}
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
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#F5F7FA]">
      {/* Top B2B Sourcing Announcement Bar */}
      <div className="bg-[#0b1e3f] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs font-black sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-amber-400" /> {i18n.tradeAssurance}</span>
            <span className="hidden items-center gap-1.5 md:flex"><Truck className="h-4 w-4 text-[#ff6a00]" /> {i18n.verifiedLogistics}</span>
          </div>
          <Link href="/hub/vendor-signup" className="rounded-full bg-[#ff6a00] px-3 py-1 font-black text-white hover:bg-orange-600 transition-colors">
            {i18n.becomeSeller}
          </Link>
        </div>
      </div>

      {/* Hero: persistent Alibaba B2B category sidebar + multi-column mega flyout + carousel + seller rail */}
      {isBlockEnabled('hero') && (
        <>
          <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr_240px] lg:px-8">
            <aside
              className="relative hidden rounded-3xl border border-gray-200 bg-white shadow-md lg:block"
              onMouseLeave={() => setActiveCategory(null)}
            >
              <p className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-700">
                <LayoutGrid className="h-4 w-4" style={{ color: ORANGE }} /> {i18n.allCategories}
              </p>

              {/* Sidebar Category Department List */}
              <ul className="max-h-[410px] overflow-y-auto py-1 divide-y divide-slate-50">
                {displayCategories.slice(0, 14).map((category) => {
                  const IconComp = (category.icon && ICON_MAP[category.icon]) || getCategoryIconComponent(category);
                  const isActive = activeCategory?.id === category.id;

                  return (
                    <li key={category.id} onMouseEnter={() => setActiveCategory(category)}>
                      <Link
                        href={`/hub/category/${encodeURIComponent(category.slug)}`}
                        className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-extrabold transition-all ${
                          isActive
                            ? rtl
                              ? 'bg-orange-50/90 text-[#ff6a00] border-r-4 border-[#ff6a00] pl-3'
                              : 'bg-orange-50/90 text-[#ff6a00] border-l-4 border-[#ff6a00] pr-3'
                            : 'text-slate-700 hover:bg-orange-50/40 hover:text-[#ff6a00]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <IconComp className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-[#ff6a00]' : 'text-slate-400'}`} />
                          <span className="truncate">{category.name}</span>
                        </div>
                        <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-all ${isActive ? 'text-[#ff6a00] translate-x-0.5' : 'text-slate-300'} ${rtl ? 'rotate-180' : ''}`} />
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Alibaba B2B Multi-Column Mega Flyout Panel */}
              {activeCategory && (
                <div
                  dir={rtl ? 'rtl' : 'ltr'}
                  className={`absolute ${
                    rtl ? 'right-full mr-3' : 'left-full ml-3'
                  } top-0 z-50 ${
                    marketplaceSettings?.hub_megamenu_style === 'ultra_rich'
                      ? 'w-[880px]'
                      : marketplaceSettings?.hub_megamenu_style === 'visual_rich'
                        ? 'w-[820px]'
                        : 'w-[720px]'
                  } max-w-[92vw] overflow-hidden rounded-3xl border border-slate-200/90 bg-white/98 p-6 shadow-2xl backdrop-blur-2xl transition-all duration-200`}
                >
                  {marketplaceSettings?.hub_megamenu_style === 'ultra_rich' ? (
                    /* ========================================================================= */
                    /* ULTRA-RICH MODE: LARGE HERO BANNER + LARGE SUBCATEGORY PICTURE CARDS      */
                    /* ========================================================================= */
                    <div className="space-y-4">
                      {/* Large 200px Hero Banner */}
                      <div className="relative h-48 overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-900 text-white shadow-xl">
                        {activeCategory.image_url ? (
                          <img
                            src={activeCategory.image_url}
                            alt={activeCategory.name}
                            className="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-700 hover:scale-105"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-r from-[#ff6a00] to-amber-600 opacity-90" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-transparent" />

                        <div className="relative z-10 flex h-full flex-col justify-between p-5">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-0.5 text-[10px] font-black uppercase text-slate-950 shadow-md">
                              <Sparkles className="h-3 w-3" />
                              {i18n.tradeAssuranceVerified}
                            </span>
                            <span className="rounded-xl bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20">
                              {i18n.subcategoriesAvailable(activeCategory.children?.length || 0)}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <h2 className="text-xl font-black tracking-wide text-white drop-shadow-md">{activeCategory.name}</h2>
                            {(activeCategory.description || activeCategory.short_description) && (
                              <p className="text-xs text-slate-200 max-w-[85%] leading-relaxed line-clamp-2 drop-shadow-sm">
                                {activeCategory.description || activeCategory.short_description}
                              </p>
                            )}
                            <div className="pt-1">
                              <Link
                                href={`/hub/category/${encodeURIComponent(activeCategory.slug)}`}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff6a00] px-4 py-2 text-xs font-black text-white shadow-lg transition-all hover:bg-orange-600 hover:scale-105"
                              >
                                <span>{i18n.browseAll}</span>
                                <ChevronRight className={`h-3.5 w-3.5 ${rtl ? 'rotate-180' : ''}`} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Large Picture Subcategory Card Grid */}
                      {activeCategory.children && activeCategory.children.length > 0 ? (
                        <div className="grid grid-cols-3 gap-3.5 max-h-[340px] overflow-y-auto pr-1">
                          {activeCategory.children.map((sub) => {
                            const SubIcon = (sub.icon && ICON_MAP[sub.icon]) || getCategoryIconComponent(sub);

                            return (
                              <Link
                                key={sub.id}
                                href={`/hub/category/${encodeURIComponent(sub.slug)}`}
                                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl"
                              >
                                {/* Large 120px Picture Frame */}
                                <div className="relative h-28 w-full overflow-hidden bg-slate-100">
                                  {sub.image_url ? (
                                    <img
                                      src={sub.image_url}
                                      alt={sub.name}
                                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-500 to-amber-600 text-white">
                                      <SubIcon className="h-8 w-8 opacity-80" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                                  <span className="absolute bottom-2 left-2.5 right-2.5 text-xs font-black text-white truncate drop-shadow-md">
                                    {sub.name}
                                  </span>
                                </div>

                                <div className="p-3 space-y-1.5 flex flex-1 flex-col justify-between">
                                  {(sub.description || sub.short_description) && (
                                    <p className="text-[10.5px] font-medium text-slate-500 line-clamp-2 leading-snug">
                                      {sub.description || sub.short_description}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#ff6a00]">
                                      <Box className="h-3 w-3" />
                                      {i18n.productsCount(sub.product_count || 0)}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#ff6a00] transition-colors">
                                      {i18n.exploreDept} ➔
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    /* ========================================================================= */
                    /* STANDARD / COMPACT VISUAL MODE                                            */
                    /* ========================================================================= */
                    <>
                      {/* Flyout Header with Icon / Image Badge */}
                      <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3.5 max-w-[75%]">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-50 text-[#ff6a00] shadow-sm border border-orange-100">
                            {activeCategory.image_url ? (
                              <img
                                src={activeCategory.image_url}
                                alt={activeCategory.name}
                                className="h-full w-full object-cover rounded-2xl"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              (() => {
                                const IconComp = (activeCategory.icon && ICON_MAP[activeCategory.icon]) || getCategoryIconComponent(activeCategory);
                                return <IconComp className="h-6 w-6" />;
                              })()
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-900 leading-tight">{activeCategory.name}</h3>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500 line-clamp-1">
                              {activeCategory.description || activeCategory.short_description || i18n.subcategoriesAvailable(activeCategory.children?.length || 0)}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/hub/category/${encodeURIComponent(activeCategory.slug)}`}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange-50 px-4 py-2 text-xs font-black text-[#ff6a00] hover:bg-orange-100 transition-colors shadow-xs"
                        >
                          {i18n.browseAll}
                        </Link>
                      </div>

                      {/* Multi-Column Subcategories Grid (Visual Rich or Standard) */}
                      {activeCategory.children && activeCategory.children.length > 0 ? (
                        <div className={`grid ${marketplaceSettings?.hub_megamenu_style === 'visual_rich' ? 'grid-cols-2 gap-3.5' : 'grid-cols-3 gap-3'} max-h-[380px] overflow-y-auto pr-1`}>
                          {activeCategory.children.map((sub) => {
                            const SubIcon = (sub.icon && ICON_MAP[sub.icon]) || getCategoryIconComponent(sub);

                            return (
                              <Link
                                key={sub.id}
                                href={`/hub/category/${encodeURIComponent(sub.slug)}`}
                                className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition-all duration-200 hover:-translate-y-1 hover:border-orange-300 hover:bg-white hover:shadow-lg hover:shadow-orange-950/5"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      {sub.image_url ? (
                                        <img
                                          src={sub.image_url}
                                          alt={sub.name}
                                          className="h-7 w-7 rounded-xl object-cover border border-slate-200/60 shadow-xs"
                                          onError={(e) => {
                                            (e.currentTarget as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-100/70 text-[#ff6a00]">
                                          <SubIcon className="h-3.5 w-3.5" />
                                        </div>
                                      )}
                                      <span className="text-xs font-extrabold text-slate-800 group-hover:text-[#ff6a00] transition-colors leading-snug">
                                        {sub.name}
                                      </span>
                                    </div>
                                    <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-[#ff6a00] transition-all ${rtl ? 'rotate-180' : ''}`} />
                                  </div>

                                  {marketplaceSettings?.hub_megamenu_style === 'visual_rich' && (sub.description || sub.short_description) && (
                                    <p className="text-[10.5px] font-medium text-slate-500 line-clamp-2 leading-snug">
                                      {sub.description || sub.short_description}
                                    </p>
                                  )}
                                </div>

                                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100/80">
                                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-black text-slate-600 shadow-xs border border-slate-100">
                                    <Box className="h-3 w-3 text-orange-500" />
                                    {i18n.productsCount(sub.product_count || 0)}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {i18n.exploreDept}
                                  </span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs font-semibold text-slate-500">
                          <p className="leading-relaxed">{activeCategory.short_description || activeCategory.description || i18n.defaultCategoryDesc}</p>
                          <Link
                            href={`/hub/category/${encodeURIComponent(activeCategory.slug)}`}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                          >
                            {i18n.exploreDept} ➔
                          </Link>
                        </div>
                      )}
                    </>
                  )}

                  {/* B2B Sourcing Feature Badges Bar */}
                  <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-2xl bg-gradient-to-r from-slate-900 to-[#0b1e3f] p-3 text-white">
                    <div className="flex items-center gap-2 px-2 py-1">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-400">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black leading-tight">{i18n.tradeAssuranceVerified}</p>
                        <p className="text-[9.5px] font-medium text-white/60">On-time delivery & quality protection</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-400/20 text-blue-400">
                        <BadgeCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black leading-tight">{i18n.verifiedSuppliers}</p>
                        <p className="text-[9.5px] font-medium text-white/60">Verified factory OEM/ODM capacity</p>
                      </div>
                    </div>
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
                  <Store className="h-4 w-4" style={{ color: ORANGE }} /> {i18n.topSellers}
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
                  {topSellers.length === 0 && <li className="text-xs text-gray-400">{i18n.noSellers}</li>}
                </ul>
              </div>
              <div className="rounded-2xl p-4 text-white shadow-sm" style={{ backgroundColor: NAVY }}>
                <Factory className="h-5 w-5" style={{ color: ORANGE }} />
                <p className="mt-2 text-sm font-black">{i18n.rfqTitle}</p>
                <p className="mt-1 text-[11px] leading-4 text-white/70">{i18n.rfqSubtitle}</p>
                <Link href="/hub/messages" className="mt-3 inline-flex rounded-full bg-white/10 px-4 py-2 text-[11px] font-black hover:bg-white/20">{i18n.rfqButton}</Link>
              </div>
            </aside>
          </section>

          {/* Mobile category access */}
          {displayCategories.length > 0 && (
            <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-4 sm:px-6 lg:hidden">
              {displayCategories.slice(0, 12).map((category) => (
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
                title: locKey === 'ar' ? 'تسوق بثقة' : locKey === 'en' ? 'Buy with confidence' : 'Achetez en toute confiance',
                icon: ShieldCheck,
                links: [
                  { label: locKey === 'ar' ? 'حماية المشتري' : locKey === 'en' ? 'Buyer protection' : 'Protection des acheteurs', href: '/hub/cases' },
                  { label: locKey === 'ar' ? 'تتبع الطلبات' : locKey === 'en' ? 'Order tracking' : 'Suivi des commandes', href: '/hub/orders' },
                  { label: locKey === 'ar' ? 'مركز المساعدة' : locKey === 'en' ? 'Help center' : 'Centre d\'aide', href: marketplaceSettings.marketplace_help_url || '/hub/cases' },
                ],
              },
              {
                title: locKey === 'ar' ? 'البيع في السوق' : locKey === 'en' ? 'Sell on the marketplace' : 'Vendre sur la marketplace',
                icon: Store,
                links: [
                  { label: locKey === 'ar' ? 'كن موردًا' : locKey === 'en' ? 'Become a supplier' : 'Devenir un fournisseur', href: '/hub/vendor-signup' },
                  { label: locKey === 'ar' ? 'خطط الأسعار' : locKey === 'en' ? 'Pricing plans' : 'Forfaits & Tarifs', href: '/hub/pricing' },
                  { label: locKey === 'ar' ? 'لوحة تحكم البائع' : locKey === 'en' ? 'Seller dashboard' : 'Tableau de bord vendeur', href: '/hub/dashboard' },
                ],
              },
              {
                title: locKey === 'ar' ? 'الخدمات اللوجستية' : locKey === 'en' ? 'Logistics' : 'Logistique & Expédition',
                icon: Truck,
                links: [
                  { label: locKey === 'ar' ? 'خيارات الشحن' : locKey === 'en' ? 'Shipping options' : 'Options de livraison', href: '/hub/search' },
                  { label: locKey === 'ar' ? 'طلبات الجملة' : locKey === 'en' ? 'Wholesale orders' : 'Commandes en gros', href: '/hub/search' },
                  { label: locKey === 'ar' ? 'الاتصال بالدعم' : locKey === 'en' ? 'Contact support' : 'Contacter le support', href: marketplaceSettings.marketplace_contact_url || '/hub/cases' },
                ],
              },
              {
                title: locKey === 'ar' ? 'الشروط القانونية' : locKey === 'en' ? 'Legal' : 'Informations légales',
                icon: Globe2,
                links: [
                  { label: locKey === 'ar' ? 'شروط الخدمة' : locKey === 'en' ? 'Terms of service' : 'Conditions d\'utilisation', href: marketplaceSettings.marketplace_terms_url || '/hub' },
                  { label: locKey === 'ar' ? 'سياسة الخصوصية' : locKey === 'en' ? 'Privacy policy' : 'Politique de confidentialité', href: marketplaceSettings.marketplace_privacy_url || '/hub' },
                  { label: locKey === 'ar' ? 'سياسة الاسترجاع' : locKey === 'en' ? 'Refund policy' : 'Politique de remboursement', href: marketplaceSettings.marketplace_refund_url || '/hub' },
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
