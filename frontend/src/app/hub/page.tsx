import { HubNavbar } from '../../components/hub/HubNavbar';
import { ArrowRight, ShoppingBag, Store, Zap } from 'lucide-react';
import Link from 'next/link';

export default function HubHomepage() {
  const categories = [
    { name: 'Electronics', count: '1,204 Products', color: 'bg-blue-50 text-blue-600' },
    { name: 'Fashion', count: '853 Products', color: 'bg-pink-50 text-pink-600' },
    { name: 'Home & Living', count: '432 Products', color: 'bg-green-50 text-green-600' },
    { name: 'Beauty', count: '654 Products', color: 'bg-purple-50 text-purple-600' },
  ];

  const trendingProducts = [
    { id: 1, name: 'Premium Noise-Canceling Headphones', price: 'TND 450', store: 'TechStore', image: 'bg-gray-100' },
    { id: 2, name: 'Minimalist Leather Watch', price: 'TND 120', store: 'Elegant Time', image: 'bg-gray-200' },
    { id: 3, name: 'Smart Home Security Camera', price: 'TND 299', store: 'SecureTech', image: 'bg-gray-100' },
    { id: 4, name: 'Organic Cotton T-Shirt', price: 'TND 45', store: 'EcoWear', image: 'bg-gray-200' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <HubNavbar />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white pt-16 pb-32">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
              The premier marketplace <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                in Tunisia.
              </span>
            </h1>
            <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto mb-10">
              Discover thousands of unique products from independent vendors across the country, all in one place.
            </p>
            <div className="flex justify-center gap-4">
              <button className="px-8 py-3.5 bg-blue-600 text-white font-medium rounded-full shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all">
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
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
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
              <p className="text-gray-500 mt-2">Find exactly what you're looking for.</p>
            </div>
            <button className="text-blue-600 font-medium flex items-center hover:text-blue-700">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div key={cat.name} className={`${cat.color} rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform duration-300`}>
                <h3 className="font-bold text-lg mb-1">{cat.name}</h3>
                <p className="text-sm opacity-80">{cat.count}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trending Products */}
        <section className="bg-gray-50 py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">Trending Now</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {trendingProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className={`aspect-square ${product.image} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-semibold text-blue-600 mb-1">{product.store}</p>
                    <h3 className="font-bold text-gray-900 mb-2 truncate">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-gray-900">{product.price}</span>
                      <button className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
