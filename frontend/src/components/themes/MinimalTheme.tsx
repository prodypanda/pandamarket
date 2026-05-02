import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag } from 'lucide-react';

interface ThemeProps {
  theme: ThemeConfig;
  storeName: string;
}

export function MinimalTheme({ theme, storeName }: ThemeProps) {
  const products = [
    { id: 1, name: 'Linen Shirt', price: 'TND 89' },
    { id: 2, name: 'Canvas Tote', price: 'TND 45' },
    { id: 3, name: 'Ceramic Mug', price: 'TND 25' },
    { id: 4, name: 'Leather Wallet', price: 'TND 120' },
  ];

  return (
    <div className={`${theme.colors.background} ${theme.colors.text} ${theme.typography.fontFamily} min-h-screen`}>
      <header className="py-12 px-8 border-b border-gray-100 flex justify-between items-center max-w-7xl mx-auto">
        <h1 className={`text-3xl ${theme.typography.headingStyle}`}>{storeName}</h1>
        <nav className="flex space-x-8 text-sm font-medium tracking-wide">
          <a href="#" className="hover:text-gray-500 transition-colors">Shop</a>
          <a href="#" className="hover:text-gray-500 transition-colors">About</a>
          <a href="#" className="flex items-center hover:text-gray-500 transition-colors">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Cart (0)
          </a>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-16">
          {products.map((p) => (
            <div key={p.id} className="group cursor-pointer">
              <div className="bg-gray-100 aspect-[3/4] mb-6 overflow-hidden">
                <div className="w-full h-full bg-gray-200 group-hover:scale-105 transition-transform duration-500"></div>
              </div>
              <h3 className="text-sm font-medium">{p.name}</h3>
              <p className="text-sm text-gray-500 mt-2">{p.price}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
