import Link from 'next/link';
import { HubNavbar } from '../../../../components/hub/HubNavbar';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  price: number;
  thumbnail?: string;
  images?: { url: string }[];
  category?: string;
  store_id: string;
  store_name?: string;
}

interface CategoryData {
  slug: string;
  name: string;
}

interface CategoryResponse {
  category: CategoryData;
  data: Product[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}

async function getCategoryProducts(
  slug: string,
  page: number = 1,
): Promise<CategoryResponse | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
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

function formatPrice(price: number): string {
  return `${price.toFixed(3)} TND`;
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

  const result = await getCategoryProducts(slug, page);

  if (!result) {
    return (
      <div className="min-h-screen bg-[#F8F9FC]">
        <HubNavbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Catégorie introuvable</h1>
          <p className="text-gray-500 mb-8">
            La catégorie &quot;{slug}&quot; n&apos;existe pas ou ne contient aucun produit.
          </p>
          <Link
            href="/hub"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#16C784] text-white font-semibold rounded-xl hover:bg-[#14b576] transition-colors"
          >
            Retour au Hub
          </Link>
        </main>
      </div>
    );
  }

  const { category, data: products, meta } = result;

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <HubNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/hub" className="hover:text-[#16C784] transition-colors">
            Hub
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">{category.name}</span>
        </nav>

        {/* Category Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
            <p className="text-gray-500 mt-1">
              {meta.total} produit{meta.total !== 1 ? 's' : ''} trouvé{meta.total !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href={`/hub/search?category=${encodeURIComponent(category.name)}`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtres avancés
          </Link>
        </div>

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
                  href={`/hub/products/${product.id}`}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden group hover:shadow-lg transition-all duration-300"
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
                    <p className="font-bold text-[#16C784] text-sm">
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
                      ? 'bg-[#16C784] text-white'
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
    </div>
  );
}
