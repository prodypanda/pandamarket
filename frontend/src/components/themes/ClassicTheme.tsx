import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingCart, Search, Menu } from 'lucide-react';

interface ThemeProps {
  theme: ThemeConfig;
  storeName: string;
}

export function ClassicTheme({ theme, storeName }: ThemeProps) {
  const products = [
    { id: 1, name: 'Wireless Headphones', price: 'TND 149', rating: 4 },
    { id: 2, name: 'Smart Watch', price: 'TND 299', rating: 5 },
    { id: 3, name: 'Bluetooth Speaker', price: 'TND 89', rating: 4 },
    { id: 4, name: 'Power Bank', price: 'TND 45', rating: 3 },
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="bg-gray-100 aspect-square w-full"></div>
              <div className="p-4">
                <h3 className="text-gray-800 font-medium line-clamp-1">{p.name}</h3>
                <div className="flex text-yellow-400 mt-1 mb-3">
                  {'★'.repeat(p.rating)}{'☆'.repeat(5-p.rating)}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${theme.colors.accent}`}>{p.price}</span>
                  <button className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded hover:bg-gray-200 transition-colors">
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
