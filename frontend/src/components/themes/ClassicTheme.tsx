import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingCart, Search, Menu, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

interface StoreProduct {
  id: string;
  title: string;
  price: number;
  images?: { url: string }[];
  category?: string;
}

interface ThemeProps {
  theme: ThemeConfig;
  storeName: string;
  products?: StoreProduct[];
}

export function ClassicTheme({ theme, storeName, products = [] }: ThemeProps) {
  const displayProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Wireless Headphones', price: 149, images: [] },
        { id: '2', title: 'Smart Watch', price: 299, images: [] },
        { id: '3', title: 'Bluetooth Speaker', price: 89, images: [] },
        { id: '4', title: 'Power Bank', price: 45, images: [] },
      ];

  return (
    <div className={`${theme.colors.background} ${theme.colors.text} ${theme.typography.fontFamily} min-h-screen`}>
      <header className={`${theme.colors.primary} shadow-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Menu className="w-6 h-6 lg:hidden" />
            <h1 className={`text-2xl ${theme.typography.headingStyle}`}>{storeName}</h1>
          </div>
          
          <div className="hidden lg:flex flex-1 max-w-lg mx-8 relative">
            <input 
              type="text" 
              placeholder="Search products..." 
              className="w-full py-2 px-4 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <Search className="w-5 h-5 text-gray-500 absolute right-3 top-2.5" />
          </div>

          <div className="flex items-center space-x-6">
            <a href="#" className="text-sm font-medium hover:text-blue-100 transition-colors">Sign In</a>
            <a href="#" className="flex items-center hover:text-blue-100 transition-colors relative">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                0
              </span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-xl font-bold border-b border-gray-200 pb-4 mb-8">Featured Products</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {displayProducts.map((p) => (
            <Link key={p.id} href={`/hub/products/${p.id}`} className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-lg transition-shadow duration-300 block">
              <div className="bg-gray-100 aspect-square w-full overflow-hidden">
                {p.images && p.images[0]?.url ? (
                  <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-gray-800 font-medium line-clamp-1">{p.title}</h3>
                <div className="flex items-center justify-between mt-3">
                  <span className={`font-bold ${theme.colors.accent}`}>{p.price.toFixed(3)} TND</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded hover:bg-gray-200 transition-colors">
                    View
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {displayProducts.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
            <p>No products yet</p>
          </div>
        )}
      </main>
    </div>
  );
}
