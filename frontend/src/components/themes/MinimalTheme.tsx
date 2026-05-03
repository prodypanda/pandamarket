import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

interface StoreProduct {
  id: string;
  title: string;
  price: number;
  images?: { url: string }[];
  category?: string;
}

interface StoreBranding {
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  favicon_url?: string;
}

interface ThemeProps {
  theme: ThemeConfig;
  storeName: string;
  products?: StoreProduct[];
  branding?: StoreBranding;
}

export function MinimalTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const brandStyle = branding?.primary_color
    ? { '--store-primary': branding.primary_color, '--store-secondary': branding.secondary_color || branding.primary_color } as React.CSSProperties
    : {};
  const displayProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Linen Shirt', price: 89, images: [] },
        { id: '2', title: 'Canvas Tote', price: 45, images: [] },
        { id: '3', title: 'Ceramic Mug', price: 25, images: [] },
        { id: '4', title: 'Leather Wallet', price: 120, images: [] },
      ];

  return (
    <div className={`${theme.colors.background} ${theme.colors.text} ${theme.typography.fontFamily} min-h-screen`} style={brandStyle}>
      {branding?.favicon_url && (
        <link rel="icon" href={branding.favicon_url} />
      )}
      <header className="py-12 px-8 border-b border-gray-100 flex justify-between items-center max-w-7xl mx-auto">
        {branding?.logo_url ? (
          <img src={branding.logo_url} alt={storeName} className="h-10 object-contain" />
        ) : (
          <h1 className={`text-3xl ${theme.typography.headingStyle}`}>{storeName}</h1>
        )}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-16">
          {displayProducts.map((p) => (
            <Link key={p.id} href={`/hub/products/${p.id}`} className="group cursor-pointer block">
              <div className="bg-gray-100 aspect-[3/4] mb-6 overflow-hidden">
                {p.images && p.images[0]?.url ? (
                  <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gray-200 group-hover:scale-105 transition-transform duration-500 flex items-center justify-center text-gray-400">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                )}
              </div>
              <h3 className="text-sm font-medium">{p.title}</h3>
              <p className="text-sm text-gray-500 mt-2">{p.price.toFixed(3)} TND</p>
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
