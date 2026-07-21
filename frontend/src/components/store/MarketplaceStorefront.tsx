import Link from 'next/link';
import { ArrowRight, BadgeCheck, CalendarDays, ExternalLink, Grid3X3, MapPin, Package, Search, ShieldCheck, Star, Store, Truck } from 'lucide-react';
import { HubNavbar } from '../hub/HubNavbar';
import { HubFooter } from '../hub/HubFooter';
import { getMarketplaceThemeClasses, type MarketplaceThemeSettings } from '../../lib/marketplace-theme';
import { SellerTypeText } from '../i18n/SellerTypeText';
import { InstantChatLauncher } from '../chat/InstantChatLauncher';
import { getStorefrontWebsiteHref } from '../../lib/storefront-url';
import { StorefrontSocialLinks } from '../themes/StorefrontSocialLinks';
import type { StoreBranding, StoreSocialLinks } from '../themes/shared';
import { selectLogoForSurface } from '../../lib/public-assets';

export interface MarketplaceStoreData {
  id: string;
  name: string;
  subdomain?: string | null;
  custom_domain?: string | null;
  description?: string | null;
  is_verified?: boolean | null;
  seller_type?: string | null;
  status?: string | null;
  created_at?: string | null;
  seller_score?: number | string | null;
  seller_review_count?: number | string | null;
  settings?: {
    logo_url?: string | null;
    logo_light_url?: string | null;
    logo_dark_url?: string | null;
    marketplace_header_image_url?: string | null;
    store_description?: string | null;
    description?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    map_embed_url?: string | null;
    social?: StoreSocialLinks | null;
    [key: string]: unknown;
  };
}

export interface MarketplaceStoreProduct {
  id: string;
  title: string;
  slug?: string | null;
  price: number | string;
  thumbnail?: string | null;
  images?: Array<string | { url: string }>;
  category?: string | null;
  marketplace_category_slug?: string | null;
  storefront_category_slug?: string | null;
  storefront_parent_category_slug?: string | null;
  store_id: string;
  store_name?: string | null;
  store_subdomain?: string | null;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  is_default?: boolean;
  image_url?: string | null;
  short_description?: string | null;
  product_count?: number | string | null;
}

function slugSegment(value?: string | null): string {
  return (value || 'non-categorized-products')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'non-categorized-products';
}

function productSlug(product: MarketplaceStoreProduct): string {
  return slugSegment(product.slug || product.title || product.id);
}

export function getMarketplaceStoreProductHref(storeHost: string, product: MarketplaceStoreProduct): string {
  const categorySlug = slugSegment(product.marketplace_category_slug || product.category);
  return `/store/${encodeURIComponent(storeHost)}/products/${encodeURIComponent(categorySlug)}/${encodeURIComponent(productSlug(product))}`;
}

function getProductImage(product: MarketplaceStoreProduct): string {
  const firstImage = product.images?.[0];
  if (typeof firstImage === 'string') return firstImage;
  return firstImage?.url || product.thumbnail || '';
}

function formatPrice(price: MarketplaceStoreProduct['price']): string {
  const amount = Number(price);
  return `${Number.isFinite(amount) ? amount.toFixed(3) : '0.000'} TND`;
}

function storeDescription(store: MarketplaceStoreData): string {
  return store.description || store.settings?.store_description || store.settings?.description || `Découvrez les produits de ${store.name} sur PandaMarket.`;
}

function storeLocation(store: MarketplaceStoreData): string | null {
  return [store.settings?.city, store.settings?.country].filter(Boolean).join(', ') || store.settings?.address || null;
}

function formatSince(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-TN', { month: 'short', year: 'numeric' });
}

function formatSellerScore(value?: number | string | null): string {
  const score = Number(value);
  return Number.isFinite(score) && score > 0 ? score.toFixed(1) : 'New';
}

function safeGoogleMapEmbedUrl(value?: string | null): string {
  if (!value) return '';
  try {
    const url = new URL(value.trim());
    const isGoogleMaps = url.protocol === 'https:' && /(^|\\.)google\\.[a-z.]+$/i.test(url.hostname) && url.pathname.startsWith('/maps/embed');
    return isGoogleMaps ? url.toString() : '';
  } catch {
    return '';
  }
}

interface MarketplaceSellerPageProps {
  storeHost: string;
  store: MarketplaceStoreData;
  products: MarketplaceStoreProduct[];
  categories: MarketplaceCategory[];
  marketplaceSettings: MarketplaceThemeSettings;
  selectedCategorySlug?: string;
  currentHost?: string | null;
}

export function MarketplaceSellerPage({
  storeHost,
  store,
  products,
  categories,
  marketplaceSettings,
  selectedCategorySlug,
  currentHost,
}: MarketplaceSellerPageProps) {
  const classes = getMarketplaceThemeClasses(marketplaceSettings.marketplace_theme);
  const isAliExpress = classes.isAliExpress;
  const visibleCategories = categories.filter((category) => !category.is_default);
  const filteredProducts = selectedCategorySlug
    ? products.filter((product) => slugSegment(product.marketplace_category_slug || product.category) === selectedCategorySlug)
    : products;
  const categoryCounts = products.reduce<Record<string, number>>((acc, product) => {
    const slug = slugSegment(product.marketplace_category_slug || product.category);
    acc[slug] = (acc[slug] || 0) + 1;
    return acc;
  }, {});
  const selectedCategory = visibleCategories.find((category) => category.slug === selectedCategorySlug);
  const logoUrl = selectLogoForSurface({
    logo_url: store.settings?.logo_url,
    logo_light_url: store.settings?.logo_light_url,
    logo_dark_url: store.settings?.logo_dark_url,
  }, 'dark');
  const headerImageUrl = store.settings?.marketplace_header_image_url || '';
  const location = storeLocation(store);
  const since = formatSince(store.created_at);
  const productsHref = `/store/${encodeURIComponent(storeHost)}/products`;
  const storefrontWebsiteHref = getStorefrontWebsiteHref({
    currentHost,
    subdomain: store.subdomain,
    customDomain: store.custom_domain,
  });
  const sellerScore = formatSellerScore(store.seller_score);
  const mapEmbedUrl = safeGoogleMapEmbedUrl(store.settings?.map_embed_url);
  const storeBranding: StoreBranding = {
    contact_email: store.settings?.contact_email,
    contact_phone: store.settings?.contact_phone,
    address: store.settings?.address,
    city: store.settings?.city,
    country: store.settings?.country,
    map_embed_url: store.settings?.map_embed_url,
    social: store.settings?.social,
  };

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar
        marketplaceName={marketplaceSettings.marketplace_name}
        marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
        marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
        marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
        marketplaceTheme={marketplaceSettings.marketplace_theme}
        showInstantChat={false}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className={`mb-6 flex items-center gap-2 rounded-full px-4 py-3 text-sm ${isAliExpress ? 'border border-orange-100 bg-white/85 text-gray-500 shadow-sm shadow-orange-900/5' : 'text-gray-500'}`}>
          <Link href="/hub" className={`font-bold ${classes.primaryTextHover}`}>Hub</Link>
          <span>/</span>
          <span className="font-bold text-gray-900">{store.name}</span>
        </nav>

        <section
          className={`relative mb-8 overflow-hidden rounded-[2rem] ${isAliExpress ? 'bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] text-white shadow-2xl shadow-orange-900/15' : 'bg-gradient-to-r from-slate-950 via-slate-900 to-[#16C784] text-white shadow-2xl shadow-slate-950/15'} p-6 sm:p-8`}
          style={headerImageUrl ? { backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.86), rgba(15,23,42,0.52)), url(${headerImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute bottom-0 right-24 h-32 w-32 rounded-full bg-black/10 blur-2xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/25 bg-white text-gray-900 shadow-xl shadow-black/10">
                {logoUrl ? (
                  <div
                    aria-label={store.name}
                    role="img"
                    className="h-full w-full bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${logoUrl})` }}
                  />
                ) : (
                  <Store className={`h-10 w-10 ${classes.primaryText}`} />
                )}
              </div>
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white/85">
                    <SellerTypeText sellerType={store.seller_type} />
                  </span>
                  {store.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-black text-[#ff4747]">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{store.name}</h1>
                <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-white/80">{storeDescription(store)}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold text-white/80">
                  {location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {location}</span>}
                  {since && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Since {since}</span>}
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Buyer protection</span>
                </div>
                {storefrontWebsiteHref && (
                  <Link
                    href={storefrontWebsiteHref}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white/90"
                  >
                    Visit storefront website <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
                <StorefrontSocialLinks
                  branding={storeBranding}
                  showContact
                  className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold text-white/85"
                  linkClassName="rounded-full bg-white/15 px-3 py-1 transition hover:bg-white/25"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-[1.75rem] bg-white/15 p-4 text-center backdrop-blur">
              <div>
                <p className="text-2xl font-black">{products.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Products</p>
              </div>
              <div>
                <p className="text-2xl font-black">{visibleCategories.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Categories</p>
              </div>
              <div>
                <p className="text-2xl font-black">{sellerScore}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Seller score</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, title: 'Buyer protection', text: 'Secure marketplace checkout' },
            { icon: Truck, title: 'Local delivery', text: 'Seller-managed fulfillment' },
            { icon: Star, title: 'Verified products', text: 'Published marketplace catalog' },
            { icon: Search, title: 'Easy discovery', text: 'Browse by marketplace category' },
          ].map((item) => (
            <div key={item.title} className={`${classes.panel} p-5`}>
              <item.icon className={`mb-3 h-6 w-6 ${classes.primaryText}`} />
              <h3 className="font-black text-gray-900">{item.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{item.text}</p>
            </div>
          ))}
        </section>

        {mapEmbedUrl && (
          <section className={`${classes.panel} mb-8 overflow-hidden p-0`}>
            <iframe
              src={mapEmbedUrl}
              title={`${store.name} map`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-72 w-full border-0"
            />
          </section>
        )}

        <section className={`${classes.panel} mb-8 p-5`}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black text-gray-900">
                <Grid3X3 className={`h-5 w-5 ${classes.primaryText}`} /> Marketplace categories
              </h2>
              <p className="mt-1 text-sm text-gray-500">Browse this seller using PandaMarket marketplace categories.</p>
            </div>
            <Link href={productsHref} className={`hidden rounded-full px-4 py-2 text-sm font-black sm:inline-flex ${classes.primaryGradient}`}>All products</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <Link
              href={productsHref}
              className={`shrink-0 rounded-2xl border px-4 py-3 text-sm font-black transition-all ${!selectedCategorySlug ? `${classes.primaryGradient} border-transparent` : isAliExpress ? 'border-orange-100 bg-orange-50 text-[#7a2d11] hover:border-orange-200' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-emerald-200'}`}
            >
              All products <span className="ml-1 opacity-70">{products.length}</span>
            </Link>
            {visibleCategories.map((category) => {
              const isActive = selectedCategorySlug === category.slug;
              return (
                <Link
                  key={category.id}
                  href={`${productsHref}?category=${encodeURIComponent(category.slug)}`}
                  className={`shrink-0 rounded-2xl border px-4 py-3 text-sm font-black transition-all ${isActive ? `${classes.primaryGradient} border-transparent` : isAliExpress ? 'border-orange-100 bg-orange-50 text-[#7a2d11] hover:border-orange-200' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-emerald-200'}`}
                >
                  {category.name} <span className="ml-1 opacity-70">{categoryCounts[category.slug] || 0}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section id="seller-products">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900">{selectedCategory ? selectedCategory.name : 'All seller products'}</h2>
              <p className="mt-1 text-sm text-gray-500">{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} available from {store.name}.</p>
            </div>
            <Link href="/hub/search" className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black ${classes.primaryGradient}`}>
              Explore marketplace <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredProducts.map((product) => {
                const imageUrl = getProductImage(product);
                return (
                  <Link key={product.id} href={getMarketplaceStoreProductHref(storeHost, product)} className={`group overflow-hidden ${classes.card}`}>
                    <div className={`relative aspect-square overflow-hidden ${isAliExpress ? 'bg-orange-50' : 'bg-gray-100'}`}>
                      {product.category && (
                        <span className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[11px] font-black shadow-sm ${isAliExpress ? 'bg-white/95 text-[#ff4747]' : 'bg-white/90 text-gray-700'}`}>{product.category}</span>
                      )}
                      {imageUrl ? (
                        <div
                          aria-label={product.title}
                          role="img"
                          className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                          style={{ backgroundImage: `url(${imageUrl})` }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400"><Package className="h-9 w-9" /></div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className={`mb-2 line-clamp-2 text-sm font-bold text-gray-900 transition-colors ${classes.primaryTextHover}`}>{product.title}</h3>
                      <p className={`text-base font-black ${classes.primaryText}`}>{formatPrice(product.price)}</p>
                      <p className="mt-1 text-xs font-semibold text-gray-400">{store.name}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={`${classes.panel} py-16 text-center`}>
              <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-black text-gray-900">No products in this category</h3>
              <p className="mt-1 text-sm text-gray-500">Try another marketplace category or browse all seller products.</p>
            </div>
          )}
        </section>
      </main>

      <HubFooter {...marketplaceSettings} />
      <InstantChatLauncher
        marketplaceTheme={marketplaceSettings.marketplace_theme}
        storeContext={{ storeId: store.id, storeName: store.name }}
      />
    </div>
  );
}
