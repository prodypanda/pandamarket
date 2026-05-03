import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Star, Heart, Shield, ShoppingCart, ArrowLeft } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string;
  price: number;
  category?: string;
  images?: { id: string; url: string; position: number }[];
  tags?: string[];
  inventory_quantity?: number;
  store_id: string;
  store_name?: string;
  status: string;
}

interface StoreData {
  id: string;
  name: string;
  subdomain: string;
  theme_id: string;
  settings?: {
    colors?: { primary?: string; secondary?: string };
    logo_url?: string;
    favicon_url?: string;
  };
}

async function getStoreByHost(host: string): Promise<StoreData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
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
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    // Try by slug first, then by ID
    const res = await fetch(
      `${backendUrl}/api/pd/products/${encodeURIComponent(productSlug)}`,
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
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
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

function formatPrice(price: number): string {
  return `${price.toFixed(3)} TND`;
}

export default async function StoreProductPage({
  params,
}: {
  params: Promise<{ storeHost: string; slug: string }>;
}) {
  const { storeHost, slug } = await params;
  const decodedHost = decodeURIComponent(storeHost);

  const store = await getStoreByHost(decodedHost);
  if (!store) {
    notFound();
  }

  const product = await getProduct(slug, store.id);
  if (!product) {
    notFound();
  }

  const relatedProducts = await getStoreProducts(store.id, product.id);
  const primaryColor = store.settings?.colors?.primary || '#16C784';
  const mainImage = product.images?.[0]?.url;
  const thumbnails = product.images?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Store Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {store.settings?.logo_url ? (
                <img src={store.settings.logo_url} alt={store.name} className="h-8 w-auto" />
              ) : (
                <Link
                  href={`/store/${storeHost}`}
                  className="text-xl font-bold"
                  style={{ color: primaryColor }}
                >
                  {store.name}
                </Link>
              )}
            </div>
            <Link
              href={`/store/${storeHost}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la boutique
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href={`/store/${storeHost}`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>
            {store.name}
          </Link>
          <ChevronRight className="w-4 h-4" />
          {product.category && (
            <>
              <span className="text-gray-500">{product.category}</span>
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
                  Pas d&apos;image
                </div>
              )}
            </div>
            {thumbnails.length > 1 && (
              <div className="flex gap-3">
                {thumbnails.map((img, idx) => (
                  <div
                    key={img.id || idx}
                    className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer transition-colors"
                    style={{ borderColor: idx === 0 ? primaryColor : undefined }}
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
            <p className="text-3xl font-extrabold mb-6" style={{ color: primaryColor }}>
              {formatPrice(product.price)}
            </p>

            {/* Vendor badge */}
            <div className="flex items-center gap-2 mb-6 text-sm">
              <span className="text-gray-500">Vendu par :</span>
              <span className="font-medium text-gray-900 flex items-center gap-1">
                {store.name}
                <Shield className="w-4 h-4" style={{ color: primaryColor }} />
              </span>
            </div>

            {/* Stock */}
            {product.inventory_quantity !== undefined && (
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
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Add to Cart */}
            <div className="flex items-center gap-3 mb-6">
              <button
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: primaryColor }}
                disabled={product.inventory_quantity === 0}
              >
                <ShoppingCart className="w-5 h-5" />
                Ajouter au panier
              </button>
              <button className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                <Heart className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="border-t border-gray-200 pt-10 mb-16">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
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

        {/* Related Products from same store */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Autres produits</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/store/${storeHost}/product/${p.slug || p.id}`}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden group hover:shadow-lg transition-all duration-300"
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {p.images && p.images[0] ? (
                      <img
                        src={typeof p.images[0] === 'string' ? p.images[0] : (p.images[0] as { url: string }).url}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        Pas d&apos;image
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
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
      <footer className="border-t border-gray-200 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>
            {store.name} — Propulsé par{' '}
            <Link href="/hub" className="font-medium" style={{ color: primaryColor }}>
              🐼 PandaMarket
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
