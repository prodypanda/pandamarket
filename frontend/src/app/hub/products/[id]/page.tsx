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

const DEMO_PRODUCT: SingleProductData = {
  id: 'demo',
  slug: 'sweat-capuche-panda-organic-edition-limitee',
  title: 'Sweat à Capuche Panda Organic — Édition Limitée',
  price: 79.0,
  compare_at_price: 119.0,
  category: 'Mode & Accessoires',
  marketplace_category_slug: 'mode-accessoires',
  product_reference: 'PND-HOOD-2026',
  thumbnail: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=900&auto=format&fit=crop&q=80',
  images: [
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&auto=format&fit=crop&q=80',
  ],
  inventory_quantity: 4,
  store_id: 'store_demo_1',
  store_name: 'Panda Studio Officiel',
  store_subdomain: 'pandaofficial',
  store_is_verified: true,
  store_seller_type: 'hybrid',
  store_status: 'approved',
  store_product_count: 42,
  description: 'Confectionné en coton 100% biologique certifié GOTS, le sweat Panda Organic combine confort thermique supérieur, finitions premium et coupe unisexe moderne. Parfait pour les saisons fraîches et le quotidien actif.',
  attributes: [
    { name: 'Matière', value: '100% Coton Biologique 380 GSM' },
    { name: 'Coupe', value: 'Confort / Oversize Moderne' },
    { name: 'Origine', value: 'Fabriqué en Tunisie' },
    { name: 'Entretien', value: 'Lavage en machine à 30°C' },
  ],
  metadata: {
    wholesale_pricing: {
      min_quantity: 5,
      price_tiers: [
        { min_quantity: 5, unit_price: 69.0 },
        { min_quantity: 20, unit_price: 59.0 },
        { min_quantity: 50, unit_price: 49.0 },
      ],
    },
  },
  status: 'active',
  type: 'physical',
};

const DEMO_SIMILAR_PRODUCTS: SingleProductData[] = [
  {
    id: 'demo_sim_1',
    slug: 't-shirt-panda-eco-black',
    title: 'T-Shirt Panda Eco Essential Black',
    price: 39.0,
    thumbnail: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
    category: 'Mode & Accessoires',
    store_name: 'Panda Studio Officiel',
    store_id: 'store_demo_1',
    status: 'active',
  },
  {
    id: 'demo_sim_2',
    slug: 'casquette-panda-urban',
    title: 'Casquette Panda Urban Snapback',
    price: 29.0,
    thumbnail: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&auto=format&fit=crop&q=80',
    category: 'Mode & Accessoires',
    store_name: 'Panda Studio Officiel',
    store_id: 'store_demo_1',
    status: 'active',
  },
  {
    id: 'demo_sim_3',
    slug: 'sac-a-dos-panda-voyage',
    title: 'Sac à Dos Panda Voyageur Imperméable',
    price: 89.0,
    thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80',
    category: 'Mode & Accessoires',
    store_name: 'Panda Studio Officiel',
    store_id: 'store_demo_1',
    status: 'active',
  },
];

async function getProduct(id: string): Promise<SingleProductData | null> {
  if (id === 'demo') {
    return DEMO_PRODUCT;
  }
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
  if (productId === 'demo') {
    return { average_rating: 4.9, review_count: 28 };
  }
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
  if (excludeId === 'demo') {
    return DEMO_SIMILAR_PRODUCTS;
  }
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
    if (id === 'demo') {
      return { title: 'Aperçu Démo — Fiche Produit PandaMarket' };
    }
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
  let product = await getProduct(id);

  // If preview is requested or id is demo, fallback to DEMO_PRODUCT instead of 404
  if (!product) {
    if (id === 'demo' || Boolean(resolvedSearchParams.preview_version)) {
      product = DEMO_PRODUCT;
    } else {
      notFound();
    }
  }

  const [similarProducts, ratingData, marketplaceSettings] = await Promise.all([
    product.category ? getSimilarProducts(product.category, product.id) : [],
    getProductRating(product.id),
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
