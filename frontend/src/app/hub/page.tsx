import type { Metadata } from 'next';
import { HubNavbar } from '../../components/hub/HubNavbar';
import { ArrowRight, ShoppingBag, Store, Zap } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hub — Explorez des milliers de produits',
  description: 'Parcourez le Hub central PandaMarket : des milliers de produits de vendeurs tunisiens indépendants. Électronique, mode, maison, gaming et plus.',
  openGraph: {
    title: 'PandaMarket Hub — La marketplace tunisienne #1',
    description: 'Parcourez le Hub central PandaMarket : des milliers de produits de vendeurs tunisiens indépendants.',
    type: 'website',
    url: '/hub',
  },
};

interface Product {
  id: string;
  title: string;
  price: number;
  store_name?: string;
  images?: { url: string }[];
  category?: string;
}

async function getTrendingProducts(): Promise<Product[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const res = await fetch(`${backendUrl}/api/pd/products/public?page=1&limit=8`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export default async function HubHomepage() {
  const trendingProducts = await getTrendingProducts();

  const categories = [
    { name: 'Electronics', count: 'Explore', color: 'bg-[#16C784]/5 text-[#16C784]' },
    { name: 'Fashion', count: 'Explore', color: 'bg-pink-50 text-pink-600' },
    { name: 'Home & Living', count: 'Explore', color: 'bg-green-50 text-green-600' },
    { name: 'Beauty', count: 'Explore', color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <HubNavbar />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#16C784]/5 to-white pt-16 pb-32">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#16C784] to-[#1EE69A]"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
              The premier marketplace <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#16C784] to-[#1EE69A]">
                in Tunisia.
              </span>
            </h1>
            <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto mb-10">
              Discover thousands of unique products from independent vendors across the country, all in one place.
            </p>
            <div className="flex justify-center gap-4">
              <button className="px-8 py-3.5 bg-[#16C784] text-white font-medium rounded-full shadow-lg shadow-[#16C784]/20 hover:bg-[#14b576] hover:-translate-y-0.5 transition-all">
                Start Shopping
              </button>
              <Link href="/hub/dashboard" className="px-8 py-3.5 bg-white text-gray-700 border border-gray-200 font-medium rounded-full hover:bg-gray-50 transition-colors">
                Become a Vendor
              </Link>
            </div>
          </div>
        </section>

        {/* Value Props */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Store, title: 'Independent Stores', desc: 'Shop directly from thousands of local Tunisian brands and creators.' },
              { icon: Zap, title: 'Fast Global Search', desc: 'Powered by Meilisearch for instant product discovery across all vendors.' },
              { icon: ShoppingBag, title: 'Secure Checkout', desc: 'Protected escrow payments via Flouci, Konnect, and Mandat Minute.' }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100 text-center">
                <div className="w-12 h-12 bg-[#16C784]/10 text-[#16C784] rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Explore Categories</h2>
              <p className="text-gray-500 mt-2">Find exactly what you&apos;re looking for.</p>
            </div>
            <Link href="/hub/search" className="text-[#16C784] font-medium flex items-center hover:text-[#14b576]">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link key={cat.name} href={`/hub/search?category=${encodeURIComponent(cat.name)}`} className={`${cat.color} rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform duration-300 block`}>
                <h3 className="font-bold text-lg mb-1">{cat.name}</h3>
                <p className="text-sm opacity-80">{cat.count}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Trending Products */}
        <section className="bg-gray-50 py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">Trending Now</h2>
            {trendingProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {trendingProducts.map((product) => (
                  <Link key={product.id} href={`/hub/products/${product.id}`} className="bg-white rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {product.images && product.images[0]?.url ? (
                        <img src={product.images[0].url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400">
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      {product.store_name && (
                        <p className="text-xs font-semibold text-[#16C784] mb-1">{product.store_name}</p>
                      )}
                      <h3 className="font-bold text-gray-900 mb-2 truncate">{product.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#16C784]">{product.price.toFixed(3)} TND</span>
                        <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-[#16C784] group-hover:text-white transition-colors">
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Products coming soon. Be the first to sell!</p>
                <Link href="/hub/dashboard" className="mt-4 inline-block px-6 py-2 bg-[#16C784] text-white font-medium rounded-full hover:bg-[#14b876] transition-colors">
                  Open your store
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
