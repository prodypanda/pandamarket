import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HubNavbar } from '../../../../components/hub/HubNavbar';
import { HubFooter } from '../../../../components/hub/HubFooter';
import { ReviewSection } from '../../../../components/hub/ReviewSection';
import { WishlistButton } from '../../../../components/hub/WishlistButton';
import { BadgeCheck, ChevronRight, PackageCheck, RotateCcw, ShieldCheck, Star, Truck, Zap } from 'lucide-react';
import Link from 'next/link';
import { getHubProductHref } from '../../../../lib/product-links';
import { ProductDescriptionRenderer } from '../../../../components/product/ProductDescription';
import { ProductGallery } from '../../../../components/product/ProductGallery';
import { ProductVariantPurchasePanel } from '../../../../components/product/ProductVariantPurchasePanel';
import { SellerHoverCard } from '../../../../components/product/SellerHoverCard';
import { RecentlyViewedTracker } from '../../../../components/hub/RecentlyViewedTracker';
import { ContactSellerButton } from '../../../../components/chat/ContactSellerButton';
import { getMarketplaceSettings } from '../../../../lib/marketplace-settings';
import { getMarketplaceThemeClasses } from '../../../../lib/marketplace-theme';
import { getStorefrontWebsiteHref } from '../../../../lib/storefront-url';
import { getWholesalePricingFromMetadata } from '../../../../lib/cart-utils';
import { t as translate } from '../../../../i18n/utils';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isValidLocale } from '../../../../i18n/config';
import { cookies, headers } from 'next/headers';

type ProductImage = string | { id?: string; url: string; position?: number };

interface ProductVariant {
  id: string;
  sku?: string | null;
  title: string;
  price: number | string;
  inventory_quantity?: number | null;
  options?: Record<string, string> | null;
}

interface Product {
  id: string;
  type?: string | null;
  title: string;
  slug?: string | null;
  description?: string;
  price: number | string;
  category?: string;
  product_reference?: string | null;
  marketplace_category_slug?: string | null;
  images?: ProductImage[];
  thumbnail?: string;
  tags?: string[];
  attributes?: { name: string; value: string }[];
  metadata?: Record<string, unknown> | null;
  inventory_quantity?: number;
  store_id: string;
  store_name?: string;
  store_subdomain?: string | null;
  store_custom_domain?: string | null;
  store_is_verified?: boolean | null;
  store_seller_type?: string | null;
  store_status?: string | null;
  store_settings?: Record<string, unknown> | null;
  store_created_at?: string | null;
  store_product_count?: string | number | null;
  variants?: ProductVariant[];
  status: string;
}

async function getProduct(id: string): Promise<Product | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/products/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.product;
  } catch {
    return null;
  }
}

async function getProductRating(productId: string): Promise<{ average_rating: number; review_count: number } | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/reviews/products/${productId}/rating`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getSimilarProducts(category: string, excludeId: string): Promise<Product[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(
      `${backendUrl}/api/pd/search?q=${encodeURIComponent(category)}&limit=4`,
      { next: { revalidate: 120 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const hits = data.hits || data.data || [];
    return hits.filter((p: Product) => p.id !== excludeId).slice(0, 4);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return { title: 'Produit introuvable' };
  }

  const imageUrl = getImageUrl(product.images?.[0]) || product.thumbnail;
  const formattedPrice = formatPrice(product.price);
  const marketplaceSettings = await getMarketplaceSettings();
  const marketplaceName = marketplaceSettings.marketplace_name || 'PandaMarket';
  const description = product.description?.slice(0, 160) || `Achetez ${product.title} sur ${marketplaceName} — ${formattedPrice}`;

  return {
    title: product.title,
    description,
    openGraph: {
      title: `${product.title} — ${formattedPrice}`,
      description,
      type: 'website',
      url: getHubProductHref(product),
      ...(imageUrl && {
        images: [{ url: imageUrl, width: 800, height: 800, alt: product.title }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} — ${formattedPrice}`,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

function toNumber(price: Product['price']): number {
  const numericPrice = typeof price === 'number' ? price : Number(price);
  return Number.isFinite(numericPrice) ? numericPrice : 0;
}

function formatPrice(price: Product['price']): string {
  return `${toNumber(price).toFixed(3)} TND`;
}

function getImageUrl(image?: ProductImage): string | undefined {
  if (!image) return undefined;
  return typeof image === 'string' ? image : image.url;
}

function getCategorySearchHref(product: Product): string {
  return `/hub/search?category=${encodeURIComponent(product.marketplace_category_slug || product.category || '')}`;
}

function formatProductType(type?: string | null): string {
  if (!type) return 'Physical';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const requestHost = (await headers()).get('host');
  const requestedLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isValidLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const tx = (key: string, values?: Record<string, string | number>) => translate(locale, key, values);
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const [similarProducts, ratingData, marketplaceSettings] = await Promise.all([
    product.category ? getSimilarProducts(product.category, product.id) : [],
    getProductRating(id),
    getMarketplaceSettings(),
  ]);
  const classes = getMarketplaceThemeClasses(marketplaceSettings.marketplace_theme);
  const isAliExpress = classes.isAliExpress;
  const accentHex = isAliExpress ? '#ff4747' : '#16C784';
  const accentText = classes.primaryText;
  const accentBgSoft = classes.primarySoft;
  const accentTextSoft = classes.primaryText;
  const cardClass = isAliExpress
    ? 'rounded-[2rem] border border-orange-100/80 bg-white shadow-xl shadow-orange-900/5'
    : 'rounded-[2rem] border border-gray-100 bg-white shadow-sm';
  const microCardClass = isAliExpress
    ? 'rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-4'
    : 'rounded-2xl border border-gray-100 bg-gray-50 p-4';

  const avgRating = ratingData?.average_rating ?? 0;
  const reviewCount = ratingData?.review_count ?? 0;

  const mainImage = product.thumbnail || getImageUrl(product.images?.[0]);
  const numericPrice = toNumber(product.price);
  const isPhysicalProduct = product.type === 'physical' || !product.type;
  const storeHref = product.store_subdomain ? `/store/${encodeURIComponent(product.store_subdomain)}` : null;
  const sellerWebsiteHref = getStorefrontWebsiteHref({
    subdomain: product.store_subdomain,
    customDomain: product.store_custom_domain,
    currentHost: requestHost,
  });
  const wholesalePricing = product.store_seller_type === 'wholesaler' || product.store_seller_type === 'hybrid'
    ? getWholesalePricingFromMetadata(product.metadata)
    : null;

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar
        marketplaceName={marketplaceSettings.marketplace_name}
        marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
        marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
        marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
        marketplaceTheme={marketplaceSettings.marketplace_theme}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RecentlyViewedTracker
          product={{
            id: product.id,
            title: product.title,
            price: toNumber(product.price),
            thumbnail: mainImage || null,
            href: `/hub/products/${encodeURIComponent(product.id)}`,
          }}
        />
        {isAliExpress && (
          <div className="mb-6 overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] p-[1px] shadow-xl shadow-orange-900/10">
            <div className="flex flex-col gap-3 rounded-[1.7rem] bg-white/95 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 font-black text-[#7a2d11]">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#ff4747] px-3 py-1.5 text-xs text-white">
                  <Zap className="h-3.5 w-3.5 fill-white" />
                  AliExpress Style Deal
                </span>
                <span>Buyer protection · fast checkout · verified marketplace sellers</span>
              </div>
              <Link href="/hub/search" className="inline-flex items-center justify-center rounded-full bg-[#fff1e8] px-4 py-2 text-xs font-black text-[#ff4747] hover:bg-[#ffe1d1]">
                Continue shopping
              </Link>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <nav className={`mb-8 flex items-center gap-2 rounded-full px-4 py-3 text-sm ${isAliExpress ? 'border border-orange-100 bg-white/80 text-gray-500 shadow-sm shadow-orange-900/5' : 'text-gray-500'}`}>
          <Link href="/hub" className={`font-bold transition-colors ${classes.primaryTextHover}`}>
            Hub
          </Link>
          <ChevronRight className="w-4 h-4" />
          {product.category && (
            <>
              <Link
                href={getCategorySearchHref(product)}
                className={`font-bold transition-colors ${classes.primaryTextHover}`}
              >
                {product.category}
              </Link>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
          <span className="text-gray-900 font-medium truncate max-w-xs">{product.title}</span>
        </nav>

        {/* Product Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-8 mb-16">
          {/* Images */}
          <div className={isAliExpress ? 'rounded-[2rem] bg-white p-3 shadow-xl shadow-orange-900/5' : ''}>
            <ProductGallery title={product.title} thumbnail={product.thumbnail} images={product.images} accentColor={accentHex} />
          </div>

          {/* Product Info */}
          <div className={`lg:sticky lg:top-24 h-fit p-6 sm:p-8 ${cardClass}`}>
            <div className="flex flex-wrap gap-2 mb-4">
              {product.category && (
                <Link href={getCategorySearchHref(product)} className={`rounded-full ${accentBgSoft} px-3 py-1 text-xs font-bold ${accentTextSoft}`}>
                  {product.category}
                </Link>
              )}
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${isAliExpress ? 'bg-[#fff1e8] text-[#7a2d11]' : 'bg-gray-100 text-gray-600'}`}>{product.status}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3 leading-tight">{product.title}</h1>

            {/* Rating */}
            <div className={`mb-5 inline-flex flex-wrap items-center gap-2 rounded-full px-3 py-2 ${isAliExpress ? 'bg-orange-50 text-[#7a2d11]' : 'bg-gray-50 text-gray-600'}`}>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${star <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-bold">({reviewCount} avis)</span>
              {isAliExpress && <span className="text-xs font-black text-[#ff4747]">Top marketplace choice</span>}
            </div>

            {/* Price */}
            <div className={`mb-6 overflow-hidden rounded-[1.75rem] ${isAliExpress ? 'border border-orange-100 bg-gradient-to-br from-[#fff7f2] via-white to-white' : 'border border-gray-100 bg-gray-50'} p-5`}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Marketplace price</p>
                  <p className={`mt-1 text-4xl sm:text-5xl font-black ${accentText}`}>
                    {formatPrice(product.price)}
                  </p>
                </div>
                {isAliExpress && (
                  <span className="rounded-full bg-[#ff4747] px-4 py-2 text-xs font-black text-white shadow-lg shadow-orange-900/20">
                    Limited offer
                  </span>
                )}
              </div>
            </div>
            {wholesalePricing && (
              <div className={`mb-6 rounded-[1.75rem] p-5 ${isAliExpress ? 'border border-orange-100 bg-orange-50/70' : 'border border-emerald-100 bg-emerald-50/70'}`}>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">{tx('productWholesale.publicTitle')}</p>
                <p className="mt-1 text-sm font-semibold text-gray-700">
                  {tx('productWholesale.publicSubtitle')}
                </p>
                <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700">
                  {tx('productWholesale.minimumQuantity')}: {wholesalePricing.min_quantity}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {wholesalePricing.price_tiers?.map((tier) => (
                    <div key={tier.min_quantity} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-gray-800 shadow-sm">
                      <span className="block text-xs font-black uppercase text-gray-400">
                        {tx('productWholesale.tierLine', { quantity: tier.min_quantity })}
                      </span>
                      <span className={accentText}>
                        {tx('productWholesale.unitPriceLine', { price: Number(tier.unit_price).toFixed(3) })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vendor */}
            {product.store_name && (
              <div className="mb-6 space-y-3">
                <SellerHoverCard
                  name={product.store_name}
                  href={storeHref}
                  websiteHref={sellerWebsiteHref}
                  isVerified={product.store_is_verified}
                  sellerType={product.store_seller_type}
                  status={product.store_status}
                  createdAt={product.store_created_at}
                  productCount={product.store_product_count}
                  settings={product.store_settings}
                  accentColor={accentHex}
                />
                <ContactSellerButton
                  storeId={product.store_id}
                  productId={product.id}
                  subject={product.title}
                  isAliExpress={isAliExpress}
                />
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className={microCardClass}>
                <span className="block text-xs font-bold uppercase tracking-wide text-gray-400">Type</span>
                <span className="mt-1 block font-bold text-gray-900">{formatProductType(product.type)}</span>
              </div>
              {product.product_reference && (
                <div className={microCardClass}>
                  <span className="block text-xs font-bold uppercase tracking-wide text-gray-400">Reference</span>
                  <span className="mt-1 block font-bold text-gray-900">{product.product_reference}</span>
                </div>
              )}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, label: 'Buyer protection', text: 'Secure marketplace checkout' },
                { icon: Truck, label: 'Delivery', text: 'Seller-managed shipping' },
                { icon: RotateCcw, label: 'Support', text: 'Order tracking and help' },
              ].map((item) => (
                <div key={item.label} className={`rounded-2xl p-3 ${isAliExpress ? 'bg-orange-50/70 text-[#7a2d11]' : 'bg-gray-50 text-gray-700'}`}>
                  <item.icon className={`mb-2 h-5 w-5 ${accentText}`} />
                  <p className="text-xs font-black">{item.label}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{item.text}</p>
                </div>
              ))}
            </div>

            {/* Stock */}
            {isPhysicalProduct && product.inventory_quantity !== undefined && (
              <p className={`mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${product.inventory_quantity > 0 ? accentBgSoft : 'bg-red-50 text-red-600'}`}>
                <PackageCheck className="h-4 w-4" />
                {product.inventory_quantity > 0
                  ? `${product.inventory_quantity} disponibles`
                  : 'Rupture de stock'}
              </p>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-3 py-1 text-xs font-bold rounded-full ${isAliExpress ? 'bg-orange-50 text-[#7a2d11]' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <ProductVariantPurchasePanel
                productId={product.id}
                title={product.title}
                slug={product.slug}
                category={product.category}
                marketplaceCategorySlug={product.marketplace_category_slug}
                basePrice={numericPrice}
                sellerType={product.store_seller_type}
                wholesalePricing={wholesalePricing}
                storeId={product.store_id}
                storeName={product.store_name || 'Store'}
                storeSubdomain={product.store_subdomain}
                productType={product.type}
                imageUrl={mainImage || null}
                inventoryQuantity={product.inventory_quantity}
                variants={product.variants}
                isAliExpress={isAliExpress}
              />
              <WishlistButton productId={product.id} size="md" />
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className={`mb-10 p-6 sm:p-8 ${cardClass}`}>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-gray-900">
            <BadgeCheck className={`h-5 w-5 ${accentText}`} />
            Description
          </h2>
          <ProductDescriptionRenderer value={product.description} />
        </div>

        {product.attributes && product.attributes.length > 0 && (
          <div className={`mb-10 p-6 sm:p-8 ${cardClass}`}>
            <h2 className="text-xl font-black text-gray-900 mb-4">Product details</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {product.attributes.map((attribute) => (
                <div key={`${attribute.name}-${attribute.value}`} className={microCardClass}>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{attribute.name}</p>
                  <p className="mt-1 font-semibold text-gray-900">{attribute.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className={`mb-16 p-6 sm:p-8 ${cardClass}`}>
          <h2 className="text-xl font-black text-gray-900 mb-6">
            Avis clients ({reviewCount})
          </h2>
          <ReviewSection productId={product.id} marketplaceTheme={marketplaceSettings.marketplace_theme} />
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Produits Similaires</h2>
                <p className="text-sm text-gray-500 mt-1">Produits de la même catégorie.</p>
              </div>
              {product.category && (
                <Link href={getCategorySearchHref(product)} className={`text-sm font-bold ${classes.primaryText} ${classes.primaryTextHover}`}>
                  Voir tout
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {similarProducts.map((p) => (
                <Link
                  key={p.id}
                  href={getHubProductHref(p)}
                  className={`group overflow-hidden ${classes.card}`}
                >
                  <div className={`aspect-square relative overflow-hidden ${isAliExpress ? 'bg-orange-50' : 'bg-gray-100'}`}>
                    {p.category && (
                      <span className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[11px] font-bold shadow-sm ${isAliExpress ? 'bg-white/95 text-[#ff4747]' : 'bg-white/90 text-gray-700'}`}>
                        {p.category}
                      </span>
                    )}
                    {getImageUrl(p.images?.[0]) || p.thumbnail ? (
                      <div
                        aria-label={p.title}
                        role="img"
                        className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                        style={{ backgroundImage: `url(${getImageUrl(p.images?.[0]) || p.thumbnail})` }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className={`font-bold text-gray-900 text-sm mb-1 line-clamp-2 transition-colors ${classes.primaryTextHover}`}>
                      {p.title}
                    </h3>
                    <p className={`font-black ${accentText}`}>{formatPrice(p.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <HubFooter {...marketplaceSettings} />
    </div>
  );
}
