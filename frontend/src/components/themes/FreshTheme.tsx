import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag, Apple } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars } from './shared';
import { ThemeLayout } from './ThemeLayout';

/** Fresh Theme — Grocery/health food, bright greens and whites. */
export function FreshTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const fresh = branding?.primary_color || '#22C55E';
  const dp = products.length > 0 ? products : [
    { id: '1', title: 'Organic Honey 500g', price: 28, images: [], category: 'Pantry' },
    { id: '2', title: 'Cold-Pressed Juice Pack', price: 35, images: [], category: 'Drinks' },
    { id: '3', title: 'Granola Mix 1kg', price: 22, images: [], category: 'Breakfast' },
    { id: '4', title: 'Dried Fruit Assortment', price: 18, images: [], category: 'Snacks' },
    { id: '5', title: 'Protein Bar Box (12)', price: 45, images: [], category: 'Fitness' },
    { id: '6', title: 'Herbal Supplement Pack', price: 55, images: [], category: 'Wellness' },
    { id: '7', title: 'Almond Butter Jar', price: 32, images: [], category: 'Pantry' },
    { id: '8', title: 'Matcha Powder 100g', price: 40, images: [], category: 'Drinks' },
  ];
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFFFF', color: '#1A2E1A' }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
      <div className="text-center py-2 text-xs font-semibold text-white" style={{ backgroundColor: fresh }}>🌿 Free delivery on orders over 50 TND</div>
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {branding?.logo_url ? <img src={branding.logo_url} alt={storeName} className="h-10 object-contain" /> : (
            <div className="flex items-center gap-2"><Apple className="w-5 h-5" style={{ color: fresh }} /><h1 className="text-xl font-bold">{storeName}</h1></div>
          )}
          <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-500">
            <a href="#" className="hover:text-green-700 transition-colors">All Products</a>
            <a href="#" className="hover:text-green-700 transition-colors">Deals</a>
            <a href="#" className="hover:text-green-700 transition-colors">About</a>
          </nav>
          <Link href="/hub/cart" className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: fresh }}>
            <ShoppingBag className="w-4 h-4" /> Cart
          </Link>
        </div>
      </header>
      <section className="py-16 text-center" style={{ backgroundColor: '#F0FFF0' }}>
        <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4">Eat <span style={{ color: fresh }}>Fresh</span>,<br />Live Well</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-8">Premium organic and natural products delivered to your door.</p>
        <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: fresh }}>Shop Now</a>
      </section>
      <main id="products" className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {dp.map((p) => (
            <Link key={p.id} href={`/hub/products/${p.id}`} className="group block rounded-xl overflow-hidden bg-white border border-gray-100 hover:shadow-md transition-all">
              <div className="aspect-square overflow-hidden bg-green-50">
                {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
                  <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-8 h-8 text-green-200" /></div>
                )}
              </div>
              <div className="p-3">
                {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: fresh }}>{p.category}</p>}
                <h3 className="text-sm font-semibold line-clamp-1">{p.title}</h3>
                <p className="text-sm font-bold mt-1" style={{ color: fresh }}>{p.price.toFixed(3)} TND</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <footer className="border-t border-gray-100 py-8 text-center">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} {storeName} — Powered by <Link href="/" className="text-[#16C784] hover:underline">🐼 PandaMarket</Link></p>
      </footer>
    </div>
  );
}
