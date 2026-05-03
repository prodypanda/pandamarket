import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HubNavbar } from '../../../../components/hub/HubNavbar';
import { AddToCartButton } from '../../../../components/hub/AddToCartButton';
import { ChevronRight, Star, Heart, Shield } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  images?: { id: string; url: string; position: number }[];
  tags?: string[];
  inventory_quantity?: number;
  store_id: string;
  store_name?: string;
  variants?: { name: string; values: string[] }[];
  status: string;
}

async function getProduct(id: string): Promise<Product | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
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

async function getSimilarProducts(category: string, excludeId: string): Promise<Product[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
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

  const imageUrl = product.images?.[0]?.url;

  return {
    title: product.title,
    description: product.description?.slice(0, 160) || `Achetez ${product.title} sur PandaMarket — ${product.price.toFixed(3)} TND`,
    openGraph: {
      title: `${product.title} — ${product.price.toFixed(3)} TND`,
      description: product.description?.slice(0, 160) || `Achetez ${product.title} sur PandaMarket`,
      type: 'website',
      url: `/hub/products/${id}`,
      ...(imageUrl && {
        images: [{ url: imageUrl, width: 800, height: 800, alt: product.title }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} — ${product.price.toFixed(3)} TND`,
      description: product.description?.slice(0, 160) || `Achetez ${product.title} sur PandaMarket`,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

function formatPrice(price: number): string {
  return `${price.toFixed(3)} TND`;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const similarProducts = product.category
    ? await getSimilarProducts(product.category, product.id)
    : [];

  const mainImage = product.images?.[0]?.url;
  const thumbnails = product.images?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-white">
      <HubNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/hub" className="hover:text-[#16C784] transition-colors">
            Hub
          </Link>
          <ChevronRight className="w-4 h-4" />
          {product.category && (
            <>
              <Link
                href={`/hub/search?category=${encodeURIComponent(product.category)}`}
                className="hover:text-[#16C784] transition-colors"
              >
                {product.category}
              </Link>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
          <span className="text-gray-900 font-medium truncate max-w-xs">{product.title}</span>
        </nav>

        {/* Product Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
          {/* Images */}
          <div>
            <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                  No Image
                </div>
              )}
            </div>
            {thumbnails.length > 1 && (
              <div className="flex gap-3">
                {thumbnails.map((img, idx) => (
                  <div
                    key={img.id || idx}
                    className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#16C784] transition-colors cursor-pointer"
                  >
                    <img
                      src={img.url}
                      alt={`${product.title} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.title}</h1>

            {/* Rating placeholder */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${star <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">(0 avis)</span>
            </div>

            {/* Price */}
            <p className="text-3xl font-extrabold text-[#16C784] mb-6">
              {formatPrice(product.price)}
            </p>

            {/* Vendor */}
            {product.store_name && (
              <div className="flex items-center gap-2 mb-6 text-sm">
                <span className="text-gray-500">Vendeur :</span>
                <span className="font-medium text-gray-900 flex items-center gap-1">
                  {product.store_name}
                  <Shield className="w-4 h-4 text-[#16C784]" />
                </span>
              </div>
            )}

            {/* Stock */}
            {product.inventory_quantity !== undefined && (
              <p className="text-sm text-gray-500 mb-6">
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
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Add to Cart */}
            <div className="flex items-center gap-3 mb-6">
              <AddToCartButton
                product_id={product.id}
                title={product.title}
                price={product.price}
                store_id={product.store_id}
                store_name={product.store_name || 'Store'}
                image_url={mainImage || null}
              />
              <button className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                <Heart className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs: Description */}
        <div className="border-t border-gray-200 pt-10 mb-16">
          <div className="flex gap-8 border-b border-gray-200 mb-6">
            <button className="pb-3 border-b-2 border-[#16C784] text-[#16C784] font-semibold text-sm">
              Description
            </button>
            <button className="pb-3 border-b-2 border-transparent text-gray-500 font-medium text-sm hover:text-gray-700">
              Caractéristiques
            </button>
            <button className="pb-3 border-b-2 border-transparent text-gray-500 font-medium text-sm hover:text-gray-700">
              Avis (0)
            </button>
          </div>
          <div className="prose prose-gray max-w-none">
            {product.description ? (
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            ) : (
              <p className="text-gray-400 italic">Aucune description disponible.</p>
            )}
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Produits Similaires</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {similarProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/hub/products/${p.id}`}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden group hover:shadow-lg transition-all duration-300"
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {p.images && p.images[0] ? (
                      <img
                        src={typeof p.images[0] === 'string' ? p.images[0] : (p.images[0] as any).url}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                      {p.title}
                    </h3>
                    <p className="font-bold text-[#16C784]">{formatPrice(p.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
