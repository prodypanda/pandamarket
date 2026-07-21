import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Star, Heart, ArrowLeft } from 'lucide-react';
import { AddToCartButton } from '../../../../../components/store/AddToCartButton';
import { StoreCartIcon } from '../../../../../components/store/StoreCartIcon';
import { getStorefrontProductPath, getStoreThemeLogoSurface } from '../../../../../components/themes/shared';
import { ReviewSection } from '../../../../../components/hub/ReviewSection';
import { ProductDescriptionRenderer } from '../../../../../components/product/ProductDescription';
import { ProductGallery } from '../../../../../components/product/ProductGallery';
import { SellerHoverCard } from '../../../../../components/product/SellerHoverCard';
import { getMarketplaceSettings } from '../../../../../lib/marketplace-settings';
import { getStoreRouteContext } from '../../../../../lib/store-routing';
import { getStorefrontWebsiteHref } from '../../../../../lib/storefront-url';
import { resolveThemeColors, themes, type ThemeCustomization, type ThemeId } from '../../../../../lib/themes';
import { MarketplaceStoreProductDetail } from '../../../../../components/store/MarketplaceStoreProductDetail';
import { MarketplaceBrand } from '../../../../../components/MarketplaceBrand';
import { StorefrontSocialLinks } from '../../../../../components/themes/StorefrontSocialLinks';
import type { StoreBranding, StoreSocialLinks } from '../../../../../components/themes/shared';
import { getWholesalePricingFromMetadata } from '../../../../../lib/cart-utils';
import { t as translate } from '../../../../../i18n/utils';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isValidLocale } from '../../../../../i18n/config';
import { cookies, headers } from 'next/headers';
import { selectLogoForSurface } from '../../../../../lib/public-assets';

interface Product {
  id: string;
  type?: string | null;
  title: string;
  slug: string;
  description?: string;
  price: number | string;
  category?: string;
  product_reference?: string | null;
  marketplace_category_slug?: string | null;
  storefront_category_slug?: string | null;
  storefront_parent_category_slug?: string | null;
  thumbnail?: string | null;
  images?: { id: string; url: string; position: number }[];
  tags?: string[];
  attributes?: { name: string; value: string }[];
  metadata?: Record<string, unknown> | null;
  inventory_quantity?: number;
  store_id: string;
  store_name?: string;
  store_is_verified?: boolean | null;
  store_seller_type?: string | null;
  store_status?: string | null;
  store_settings?: Record<string, unknown> | null;
  store_created_at?: string | null;
  store_product_count?: string | number | null;
  status: string;
}

interface StoreData {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string | null;
  theme_id: ThemeId;
  settings?: {
    colors?: { primary?: string; secondary?: string };
    logo_url?: string;
    logo_light_url?: string;
    logo_dark_url?: string;
    favicon_url?: string;
    themeCustomization?: ThemeCustomization;
    store_description?: string;
    description?: string;
    contact_email?: string | null;
    contact_phone?: string | null;
    address?: string;
    city?: string;
    country?: string;
    map_embed_url?: string | null;
    social?: StoreSocialLinks | null;
  };
  is_verified?: boolean;
  seller_type?: string | null;
  status?: string;
  created_at?: string;
}

async function getStoreByHost(host: string): Promise<StoreData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/stores/by-host/${encodeURIComponent(host)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.store;
  } catch {
    return null;
  }
}

async function getProduct(productSlug: string, storeId: string): Promise<Product | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    // Try by slug first, then by ID
    const res = await fetch(
      `${backendUrl}/api/pd/products/by-store/${encodeURIComponent(storeId)}/${encodeURIComponent(productSlug)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const product = data.product || data;
    // Verify product belongs to this store
    if (product.store_id !== storeId) return null;
    return product;
  } catch {
    return null;
  }
}

async function getStoreProducts(storeId: string, excludeId: string): Promise<Product[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(
      `${backendUrl}/api/pd/products/public?store_id=${storeId}&limit=4`,
      { next: { revalidate: 120 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).filter((p: Product) => p.id !== excludeId).slice(0, 4);
  } catch {
    return [];
  }
}

function formatPrice(price: number | string): string {
  const amount = Number(price);
  return `${Number.isFinite(amount) ? amount.toFixed(3) : '0.000'} TND`;
}

function formatProductType(type?: string | null): string {
  if (!type) return 'Physical';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
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

/**
 * Dynamic SEO metadata for store product pages.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeHost: string; slug: string }>;
}): Promise<Metadata> {
  const { storeHost, slug } = await params;
  const store = await getStoreByHost(decodeURIComponent(storeHost));
  if (!store) return { title: 'Produit introuvable' };

  const product = await getProduct(slug, store.id);
  if (!product) return { title: 'Produit introuvable' };

  const activeTheme = themes[store.theme_id] || themes.classic;
  const logoUrl = selectLogoForSurface({
    logo_url: store.settings?.logo_url,
    logo_light_url: store.settings?.logo_light_url,
    logo_dark_url: store.settings?.logo_dark_url,
  }, getStoreThemeLogoSurface(activeTheme.id));
  const imageUrl = product.images?.[0]?.url || product.thumbnail || logoUrl;
  const description = product.description?.slice(0, 160)
    || `Achetez ${product.title} chez ${store.name} — ${formatPrice(product.price)}`;

  return {
    title: `${product.title} — ${store.name}`,
    description,
    openGraph: {
      title: product.title,
      description,
      type: 'website',
      ...(imageUrl ? { images: [{ url: imageUrl, width: 800, height: 800, alt: product.title }] } : {}),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: `${product.title} — ${store.name}`,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export default async function StoreProductPage({
  params,
}: {
  params: Promise<{ storeHost: string; slug: string }>;
}) {
  const { storeHost, slug } = await params;
  const decodedHost = decodeURIComponent(storeHost);
  const requestHost = (await headers()).get('host');
  const cookieStore = await cookies();
  const requestedLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isValidLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const tx = (key: string, values?: Record<string, string | number>) => translate(locale, key, values);

  const store = await getStoreByHost(decodedHost);
  if (!store) {
    notFound();
  }

  const product = await getProduct(slug, store.id);
  if (!product) {
    notFound();
  }

  const [relatedProducts, ratingData, marketplaceSettings] = await Promise.all([
    getStoreProducts(store.id, product.id),
    getProductRating(product.id),
    getMarketplaceSettings(),
  ]);
  const { isMarketplaceStoreRoute, storePathBase } = await getStoreRouteContext(storeHost);
  const sellerWebsiteHref = getStorefrontWebsiteHref({
    subdomain: store.subdomain,
    customDomain: store.custom_domain,
    currentHost: requestHost,
  });

  if (isMarketplaceStoreRoute) {
    return (
      <MarketplaceStoreProductDetail
        storeHost={storeHost}
        store={store}
        product={product}
        relatedProducts={relatedProducts}
        ratingData={ratingData}
        marketplaceSettings={marketplaceSettings}
        locale={locale}
        currentHost={requestHost}
      />
    );
  }

  const activeTheme = themes[store.theme_id] || themes.classic;
  const themeCustomization = (store.settings?.themeCustomization || {}) as ThemeCustomization;
  const resolvedColors = resolveThemeColors(activeTheme, themeCustomization);
  const primaryColor = store.settings?.colors?.primary || resolvedColors.primary;
  const secondaryColor = store.settings?.colors?.secondary || resolvedColors.secondary;
  const borderColor = `${primaryColor}20`;
  const mainImage = product.thumbnail || product.images?.[0]?.url;
  const numericPrice = Number(product.price);
  const cartPrice = Number.isFinite(numericPrice) ? numericPrice : 0;
  const avgRating = ratingData?.average_rating ?? 0;
  const reviewCount = ratingData?.review_count ?? 0;
  const isPhysicalProduct = product.type === 'physical' || !product.type;
  const sellerType = product.store_seller_type ?? store.seller_type;
  const wholesalePricing = sellerType === 'wholesaler' || sellerType === 'hybrid'
    ? getWholesalePricingFromMetadata(product.metadata)
    : null;
  const logoUrl = selectLogoForSurface({
    logo_url: store.settings?.logo_url,
    logo_light_url: store.settings?.logo_light_url,
    logo_dark_url: store.settings?.logo_dark_url,
  }, getStoreThemeLogoSurface(activeTheme.id));
  const footerBranding: StoreBranding = {
    marketplace_name: marketplaceSettings.marketplace_name,
    marketplace_logo_url: marketplaceSettings.marketplace_logo_url,
    marketplace_logo_light_url: marketplaceSettings.marketplace_logo_light_url,
    marketplace_logo_dark_url: marketplaceSettings.marketplace_logo_dark_url,
    contact_email: store.settings?.contact_email,
    contact_phone: store.settings?.contact_phone,
    address: store.settings?.address,
    city: store.settings?.city,
    country: store.settings?.country,
    map_embed_url: store.settings?.map_embed_url,
    social: store.settings?.social,
  };

  return (
    <div
      className={`min-h-screen ${activeTheme.typography.fontFamily}`}
      style={{ backgroundColor: resolvedColors.background, color: resolvedColors.text }}
    >
      {/* Store Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: resolvedColors.headerBg, borderBottomColor: `${primaryColor}20` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <Link href={storePathBase || '/'}>
                  <span
                    aria-label={store.name}
                    role="img"
                    className="block h-8 w-28 bg-contain bg-left bg-no-repeat"
                    style={{ backgroundImage: `url(${logoUrl})` }}
                  />
                </Link>
              ) : (
                <Link
                  href={storePathBase || '/'}
                  className="text-xl font-bold"
                  style={{ color: primaryColor }}
                >
                  {store.name}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={storePathBase || '/'}
                className="flex items-center gap-2 text-sm transition-colors hover:opacity-80"
                style={{ color: resolvedColors.text }}
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la boutique
              </Link>
              <StoreCartIcon storeHost={storeHost} storeId={store.id} primaryColor={primaryColor} storePathBase={storePathBase} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href={storePathBase || '/'} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>
            {store.name}
          </Link>
          <ChevronRight className="w-4 h-4" />
          {product.category && (
            <>
              <span className="text-gray-500">{product.category}</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
          <span className="font-medium truncate max-w-xs" style={{ color: resolvedColors.text }}>{product.title}</span>
        </nav>

        {/* Product Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
          {/* Images */}
          <ProductGallery
            title={product.title}
            thumbnail={product.thumbnail}
            images={product.images}
            emptyLabel="Pas d'image"
            accentColor={primaryColor}
          />

          {/* Product Info */}
          <div>
            <h1 className="text-3xl font-bold mb-3" style={{ color: resolvedColors.text }}>{product.title}</h1>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${star <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">({reviewCount} avis)</span>
            </div>

            {/* Price */}
            <p className="text-3xl font-extrabold mb-6" style={{ color: primaryColor }}>
              {formatPrice(product.price)}
            </p>
            {wholesalePricing && (
              <div className="mb-6 rounded-2xl border p-5" style={{ backgroundColor: secondaryColor, borderColor }}>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{tx('productWholesale.publicTitle')}</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: resolvedColors.text }}>
                  {tx('productWholesale.publicSubtitle')}
                </p>
                <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black" style={{ color: primaryColor }}>
                  {tx('productWholesale.minimumQuantity')}: {wholesalePricing.min_quantity}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {wholesalePricing.price_tiers?.map((tier) => (
                    <div key={tier.min_quantity} className="rounded-xl bg-white px-4 py-3 text-sm font-bold shadow-sm" style={{ color: resolvedColors.text }}>
                      <span className="block text-xs font-black uppercase text-gray-400">
                        {tx('productWholesale.tierLine', { quantity: tier.min_quantity })}
                      </span>
                      <span style={{ color: primaryColor }}>
                        {tx('productWholesale.unitPriceLine', { price: Number(tier.unit_price).toFixed(3) })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vendor badge */}
            <div className="mb-6">
              <SellerHoverCard
                name={store.name}
                href={storePathBase || '/'}
                websiteHref={sellerWebsiteHref}
                isVerified={product.store_is_verified ?? store.is_verified}
                sellerType={product.store_seller_type ?? store.seller_type}
                status={product.store_status ?? store.status}
                createdAt={product.store_created_at ?? store.created_at}
                productCount={product.store_product_count}
                settings={product.store_settings || store.settings}
                accentColor={primaryColor}
              />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 p-4" style={{ backgroundColor: secondaryColor }}>
                <span className="block text-xs font-bold uppercase tracking-wide text-gray-400">Type</span>
                <span className="mt-1 block font-bold" style={{ color: resolvedColors.text }}>{formatProductType(product.type)}</span>
              </div>
              {product.product_reference && (
                <div className="rounded-2xl border border-gray-100 p-4" style={{ backgroundColor: secondaryColor }}>
                  <span className="block text-xs font-bold uppercase tracking-wide text-gray-400">Reference</span>
                  <span className="mt-1 block font-bold" style={{ color: resolvedColors.text }}>{product.product_reference}</span>
                </div>
              )}
            </div>

            {/* Stock */}
            {isPhysicalProduct && product.inventory_quantity !== undefined && (
              <p className="text-sm text-gray-500 mb-6">
                {product.inventory_quantity > 0
                  ? `${product.inventory_quantity} en stock`
                  : 'Rupture de stock'}
              </p>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-xs font-medium rounded-full"
                    style={{ backgroundColor: secondaryColor, color: resolvedColors.text }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Add to Cart */}
            <div className="flex items-center gap-3 mb-6">
              <AddToCartButton
                product={{
                  id: product.id,
                  title: product.title,
                  slug: product.slug,
                  category: product.category,
                  marketplace_category_slug: product.marketplace_category_slug,
                  price: cartPrice,
                  seller_type: sellerType,
                  wholesale_pricing: wholesalePricing,
                  store_id: store.id,
                  store_name: store.name,
                  store_subdomain: store.subdomain,
                  product_type: product.type,
                  image_url: mainImage || null,
                  inventory_quantity: product.inventory_quantity,
                }}
                primaryColor={primaryColor}
              />
              <button className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                <Heart className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="border-t pt-10 mb-16" style={{ borderColor }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: resolvedColors.text }}>Description</h2>
          <ProductDescriptionRenderer value={product.description} />
        </div>

        {product.attributes && product.attributes.length > 0 && (
          <div className="border-t pt-10 mb-16" style={{ borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: resolvedColors.text }}>Détails du produit</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {product.attributes.map((attribute) => (
                <div key={`${attribute.name}-${attribute.value}`} className="rounded-2xl border p-4" style={{ backgroundColor: secondaryColor, borderColor }}>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{attribute.name}</p>
                  <p className="mt-1 font-semibold" style={{ color: resolvedColors.text }}>{attribute.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-10 mb-16" style={{ borderColor }}>
          <h2 className="text-xl font-bold mb-6" style={{ color: resolvedColors.text }}>Avis clients ({reviewCount})</h2>
          <ReviewSection productId={product.id} />
        </div>

        {/* Related Products from same store */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6" style={{ color: resolvedColors.text }}>Autres produits</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={getStorefrontProductPath(p, storePathBase)}
                  className="rounded-xl border overflow-hidden group hover:shadow-lg transition-all duration-300"
                  style={{ backgroundColor: secondaryColor, borderColor }}
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {p.images?.[0]?.url || p.thumbnail ? (
                      <div
                        aria-label={p.title}
                        role="img"
                        className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                        style={{ backgroundImage: `url(${p.images?.[0]?.url || p.thumbnail || ''})` }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        Pas d&apos;image
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: resolvedColors.text }}>
                      {p.title}
                    </h3>
                    <p className="font-bold" style={{ color: primaryColor }}>
                      {formatPrice(p.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer
        className="border-t py-8 mt-16"
        style={{ backgroundColor: resolvedColors.footerBg, borderTopColor: `${primaryColor}20` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-white/75">
          <StorefrontSocialLinks
            branding={footerBranding}
            showContact
            className="mb-3 flex flex-wrap items-center justify-center gap-3"
            linkClassName="font-semibold hover:text-white hover:underline"
          />
          <p>
            {store.name} — Propulsé par{' '}
            <MarketplaceBrand
              href="/hub"
              marketplaceName={marketplaceSettings.marketplace_name}
              marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
              marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
              marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
              logoSurface="dark"
              className="inline-flex align-middle"
              imageClassName="inline h-5 max-w-[120px] object-contain"
              textClassName="font-medium"
              fallbackMarkClassName="hidden"
            />
          </p>
        </div>
      </footer>
    </div>
  );
}



