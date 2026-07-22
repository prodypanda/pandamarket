import type { Metadata } from 'next';
import Link from 'next/link';
import { HubNavbar } from '../../../../components/hub/HubNavbar';
import { HubFooter } from '../../../../components/hub/HubFooter';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { getHubProductHref } from '../../../../lib/product-links';
import { getMarketplaceSettings } from '../../../../lib/marketplace-settings';
import { isAliExpressTheme } from '../../../../lib/marketplace-theme';
import { selectLogoForSurface } from '../../../../lib/public-assets';
import { SponsoredAdsRail } from '../../../../components/hub/SponsoredAdsRail';

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
  slug: string;
  name: string;
}

interface CategoryResponse {
  category: CategoryData;
  ancestors?: Array<{ id: string; name: string; slug: string }>;
  subcategories?: Array<{ id: string; name: string; slug: string; short_description?: string | null; image_url?: string | null; product_count?: number }>;
  data: Product[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}

async function getCategoryProducts(
  slug: string,
  page: number = 1,
): Promise<CategoryResponse | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(
      `${backendUrl}/api/pd/categories/${encodeURIComponent(slug)}?page=${page}&limit=20`,
      { next: { revalidate: 120 } },
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
  const description = `Découvrez les meilleurs produits ${name.toLowerCase()} sur ${marketplaceName}. Comparez les prix et achetez auprès de vendeurs tunisiens vérifiés.`;
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
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = parseInt(sp.page || '1', 10);

  const [result, marketplaceSettings] = await Promise.all([
    getCategoryProducts(slug, page),
    getMarketplaceSettings(),
  ]);
  const isAliExpress = isAliExpressTheme(marketplaceSettings.marketplace_theme);
  const isAliExpress2 = marketplaceSettings.marketplace_theme === 'aliexpress2';
  const accentText = isAliExpress ? 'text-[#ff4747]' : 'text-[#16C784]';
  const accentBg = isAliExpress ? 'bg-[#ff4747]' : 'bg-[#16C784]';
  const accentHoverBg = isAliExpress ? 'hover:bg-[#f03d3d]' : 'hover:bg-[#14b576]';

  if (!result) {
    return (
      <div className={`min-h-screen ${isAliExpress ? 'bg-[#f5f5f5]' : 'bg-[#F8F9FC]'}`}>
        <HubNavbar
          marketplaceName={marketplaceSettings.marketplace_name}
          marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
          marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
          marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
          marketplaceTheme={marketplaceSettings.marketplace_theme}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Catégorie introuvable</h1>
          <p className="text-gray-500 mb-8">
            La catégorie &quot;{slug}&quot; n&apos;existe pas ou ne contient aucun produit.
          </p>
          <Link
            href="/hub"
            className={`inline-flex items-center gap-2 px-6 py-3 ${accentBg} text-white font-semibold rounded-xl ${accentHoverBg} transition-colors`}
          >
            Retour au Hub
          </Link>
        </main>
        <HubFooter {...marketplaceSettings} />
      </div>
    );
  }

  const { category, data: products, meta } = result;

  return (
    <div className={`min-h-screen ${isAliExpress ? 'bg-[#f5f5f5]' : 'bg-[#F8F9FC]'}`}>
      <HubNavbar
        marketplaceName={marketplaceSettings.marketplace_name}
        marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
        marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
        marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
        marketplaceTheme={marketplaceSettings.marketplace_theme}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <CategoryBreadcrumbs ancestors={result.ancestors && result.ancestors.length > 0 ? result.ancestors : [{ id: category.slug, name: category.name, slug: category.slug }]} />

        {/* Category Header */}
        <div className={`mb-8 flex items-center justify-between ${isAliExpress ? (isAliExpress2 ? 'rounded-xl bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] p-6 text-white shadow-xl shadow-orange-900/10' : 'rounded-3xl bg-gradient-to-r from-[#ff4747] to-[#ff8a00] p-6 text-white shadow-lg shadow-orange-900/10') : ''}`}>
          <div>
            <h1 className={`text-3xl font-bold ${isAliExpress ? 'text-white' : 'text-gray-900'}`}>{category.name}</h1>
            <p className={`mt-1 ${isAliExpress ? 'text-white/80' : 'text-gray-500'}`}>
              {meta.total} produit{meta.total !== 1 ? 's' : ''} trouvé{meta.total !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href={`/hub/search?category=${encodeURIComponent(category.name)}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              isAliExpress ? 'border border-white/25 bg-white/15 text-white hover:bg-white/25' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtres avancés
          </Link>
        </div>

        {/* Subcategories Grid */}
        <SubcategoryGrid parentName={category.name} subcategories={result.subcategories || []} />

        <SponsoredAdsRail placement="search.top_results" title="Sponsored in this category" locale={marketplaceSettings.marketplace_default_locale || 'fr'} category={slug} />

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
                  className={`bg-white border-gray-100 overflow-hidden group transition-all duration-300 block ${isAliExpress2 ? 'rounded-lg border shadow-md hover:shadow-xl hover:-translate-y-1 hover:border-orange-200/50' : isAliExpress ? 'rounded-2xl border shadow-sm hover:shadow-lg hover:-translate-y-1' : 'rounded-xl border hover:shadow-lg'}`}
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                        Pas d&apos;image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    {product.category && (
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        {product.category}
                      </p>
                    )}
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                      {product.title}
                    </h3>
                    <p className={`font-bold ${accentText} text-sm`}>
                      {formatPrice(product.price)}
                    </p>
                    {product.store_name && (
                      <p className="text-xs text-gray-400 mt-1">{product.store_name}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Aucun produit dans cette catégorie.</p>
          </div>
        )}

        {/* Pagination */}
        {meta.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/hub/category/${slug}?page=${page - 1}`}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Précédent
              </Link>
            )}
            {Array.from({ length: Math.min(meta.total_pages, 5) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Link
                  key={pageNum}
                  href={`/hub/category/${slug}?page=${pageNum}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pageNum === page
                      ? `${accentBg} text-white`
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </Link>
              );
            })}
            {page < meta.total_pages && (
              <Link
                href={`/hub/category/${slug}?page=${page + 1}`}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Suivant →
              </Link>
            )}
          </div>
        )}
      </main>
      <HubFooter {...marketplaceSettings} />
    </div>
  );
}
