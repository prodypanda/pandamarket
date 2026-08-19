import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { HubNavbar } from '@/components/hub/HubNavbar';
import { HubFooter } from '@/components/hub/HubFooter';
import { getMarketplaceSettings } from '@/lib/marketplace-settings';
import { getMarketplaceThemeClasses } from '@/lib/marketplace-theme';
import { getHubProductHref } from '@/lib/product-links';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isValidLocale } from '@/i18n/config';
import { ProductDetailV1, type SingleProductData, type ProductImage } from '@/components/product/ProductDetailV1';
import { ProductDetailV2 } from '@/components/product/ProductDetailV2';

async function getProduct(id: string): Promise<SingleProductData | null> {
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

async function getSimilarProducts(category: string, excludeId: string): Promise<SingleProductData[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(
      `${backendUrl}/api/pd/search?q=${encodeURIComponent(category)}&limit=4`,
      { next: { revalidate: 120 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const hits = data.hits || data.data || [];
    return hits.filter((p: SingleProductData) => p.id !== excludeId).slice(0, 4);
  } catch {
    return [];
  }
}

function getImageUrl(image?: ProductImage): string | undefined {
  if (!image) return undefined;
  return typeof image === 'string' ? image : image.url;
}

function toNumber(price: SingleProductData['price']): number {
  const numericPrice = typeof price === 'number' ? price : Number(price);
  return Number.isFinite(numericPrice) ? numericPrice : 0;
}

function formatPrice(price: SingleProductData['price']): string {
  return `${toNumber(price).toFixed(3)} TND`;
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
  const description =
    product.description?.slice(0, 160) || `Achetez ${product.title} sur ${marketplaceName} — ${formattedPrice}`;

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

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ preview_version?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const requestHost = (await headers()).get('host');
  const requestedLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isValidLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
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

  // Version resolution: Superadmin setting with optional URL preview override
  const previewVersion = resolvedSearchParams.preview_version;
  const activeVersion =
    previewVersion === 'v2'
      ? 'v2_modern_showcase'
      : previewVersion === 'v1'
      ? 'v1_classic'
      : marketplaceSettings.single_product_page_version || 'v1_classic';

  const isV2 = activeVersion === 'v2_modern_showcase';

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
        {isV2 ? (
          <ProductDetailV2
            product={product}
            similarProducts={similarProducts}
            ratingData={ratingData}
            marketplaceSettings={marketplaceSettings}
            locale={locale}
            requestHost={requestHost}
          />
        ) : (
          <ProductDetailV1
            product={product}
            similarProducts={similarProducts}
            ratingData={ratingData}
            marketplaceSettings={marketplaceSettings}
            locale={locale}
            requestHost={requestHost}
          />
        )}
      </main>

      <HubFooter {...marketplaceSettings} />
    </div>
  );
}
