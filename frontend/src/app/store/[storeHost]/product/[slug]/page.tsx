import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Star } from 'lucide-react';
import { getStorefrontProductPath, getStoreThemeLogoSurface } from '../../../../../components/themes/shared';
import { ReviewSection } from '../../../../../components/hub/ReviewSection';
import { ProductDescriptionRenderer } from '../../../../../components/product/ProductDescription';
import { ProductGallery } from '../../../../../components/product/ProductGallery';
import { SellerHoverCard } from '../../../../../components/product/SellerHoverCard';
import { ProductVariantSelector } from '../../../../../components/product/ProductVariantSelector';
import { getMarketplaceSettings } from '../../../../../lib/marketplace-settings';
import { getStoreRouteContext } from '../../../../../lib/store-routing';
import { getStorefrontWebsiteHref } from '../../../../../lib/storefront-url';
import { resolveThemeColors, themes, type ThemeCustomization, type ThemeId } from '../../../../../lib/themes';
import { MarketplaceStoreProductDetail } from '../../../../../components/store/MarketplaceStoreProductDetail';
import type { StoreBranding, StoreSocialLinks } from '../../../../../components/themes/shared';
import { getWholesalePricingFromMetadata } from '../../../../../lib/cart-utils';
import { t as translate } from '../../../../../i18n/utils';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isValidLocale } from '../../../../../i18n/config';
import { cookies, headers } from 'next/headers';
import { selectLogoForSurface } from '../../../../../lib/public-assets';
import { STORE_DATA_REVALIDATE_SECONDS, storeHostTag } from '@/lib/store-cache';
import { renderStorefrontTheme } from '../../../../../components/themes/ThemeWrapper';

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
  variants?: Array<{
    id: string;
    title: string;
    price: number;
    sku?: string | null;
    in_stock: boolean;
    inventory_quantity: number;
    options?: Record<string, string>;
  }>;
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
      next: { revalidate: STORE_DATA_REVALIDATE_SECONDS, tags: [storeHostTag(host)] },
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
    const res = await fetch(
      `${backendUrl}/api/pd/products/by-store/${encodeURIComponent(storeId)}/${encodeURIComponent(productSlug)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const product = data.product || data;
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
  const primaryColor = store.settings?.colors?.primary || themeCustomization?.customColors?.primary || resolvedColors.primary;
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

  const productImages = (product.images || []).map((img) => ({
    id: img.id,
    url: img.url,
    alt_text: product.title,
  }));
  if (productImages.length === 0 && product.thumbnail) {
    productImages.push({ id: 'thumb', url: product.thumbnail, alt_text: product.title });
  }

  const storeBranding: StoreBranding = {
    store_id: store.id,
    store_host: storeHost,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    logo_url: store.settings?.logo_url as string | undefined,
    logo_light_url: store.settings?.logo_light_url as string | undefined,
    logo_dark_url: store.settings?.logo_dark_url as string | undefined,
    favicon_url: store.settings?.favicon_url as string | undefined,
    themeCustomization,
    store_path_base: storePathBase,
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

  return renderStorefrontTheme({
    theme: activeTheme,
    storeName: store.name,
    products: relatedProducts,
    branding: storeBranding,
    children: (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
          {/* Gallery */}
          <ProductGallery
            images={productImages}
            title={product.title}
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

            {/* Vendor badge */}
            <div className="mb-6">
              <SellerHoverCard
                name={store.name}
                href={storePathBase || '/'}
                websiteHref={sellerWebsiteHref}
                isVerified={store.is_verified}
                sellerType={store.seller_type}
                status={store.status}
                createdAt={store.created_at}
                settings={store.settings}
                accentColor={primaryColor}
              />
            </div>

            {/* Price & Variant Selector */}
            <div className="mb-6">
              <ProductVariantSelector
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
                  variants: product.variants,
                }}
                primaryColor={primaryColor}
              />
            </div>

            {/* Product Description */}
            {product.description && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h2 className="font-semibold text-lg mb-3">Description</h2>
                <ProductDescriptionRenderer value={product.description} />
              </div>
            )}
          </div>
        </div>

        {/* Customer Reviews Section */}
        <section className="border-t border-gray-200 pt-12 mb-16">
          <ReviewSection productId={product.id} />
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="border-t border-gray-200 pt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Produits similaires</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={getStorefrontProductPath(p, storePathBase)}
                  className="group rounded-xl border border-gray-200 p-3 transition-shadow hover:shadow-md"
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden rounded-lg mb-3">
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
                  <div className="p-1">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: resolvedColors.text }}>
                      {p.title}
                    </h3>
                    <p className="font-bold text-sm" style={{ color: primaryColor }}>
                      {formatPrice(p.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    ),
  });
}
