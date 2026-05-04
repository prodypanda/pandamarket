import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag, Leaf } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars } from './shared';
import { ThemeLayout } from './ThemeLayout';

/** Garden Theme — Organic/natural products, greens and earth tones. */
export function GardenTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const green = branding?.primary_color || '#3A7D44';
  const dp = products.length > 0 ? products : [
    { id: '1', title: 'Organic Face Cream', price: 65, images: [], category: 'Skincare' },
    { id: '2', title: 'Herbal Tea Collection', price: 35, images: [], category: 'Wellness' },
    { id: '3', title: 'Bamboo Toothbrush Set', price: 18, images: [], category: 'Eco' },
    { id: '4', title: 'Natural Soap Bar', price: 12, images: [], category: 'Bath' },
    { id: '5', title: 'Essential Oil Kit', price: 85, images: [], category: 'Aromatherapy' },
    { id: '6', title: 'Reusable Produce Bags', price: 25, images: [], category: 'Eco' },
  ];
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F9F0', color: '#2D3B2D' }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
      <header className="border-b" style={{ borderColor: `${green}20` }}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          {branding?.logo_url ? <img src={branding.logo_url} alt={storeName} className="h-10 object-contain" /> : (
            <div className="flex items-center gap-2"><Leaf className="w-5 h-5" style={{ color: green }} /><h1 className="text-2xl font-semibold">{storeName}</h1></div>
          )}
          <nav className="hidden md:flex gap-8 text-sm font-medium text-green-600/70">
            <a href="#" className="hover:text-green-800 transition-colors">Shop</a>
            <a href="#" className="hover:text-green-800 transition-colors">Our Story</a>
            <a href="#" className="hover:text-green-800 transition-colors">Sustainability</a>
          </nav>
          <Link href="/hub/cart"><ShoppingBag className="w-5 h-5" style={{ color: green }} /></Link>
        </div>
      </header>
      <section className="py-20 text-center" style={{ background: `linear-gradient(180deg, #E8F5E0 0%, transparent 100%)` }}>
        <Leaf className="w-8 h-8 mx-auto mb-4" style={{ color: green }} strokeWidth={1.5} />
        <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-6">Naturally<br /><span style={{ color: green }}>Beautiful</span></h2>
        <p className="text-sm max-w-md mx-auto mb-8 leading-relaxed text-green-700/60">Pure ingredients, sustainable practices. Good for you, good for the planet.</p>
        <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: green }}>Shop Natural</a>
      </section>
      <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {dp.map((p) => (
            <Link key={p.id} href={`/hub/products/${p.id}`} className="group block rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all border" style={{ borderColor: `${green}10` }}>
              <div className="aspect-square overflow-hidden" style={{ backgroundColor: '#EDF5E5' }}>
                {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
                  <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10" style={{ color: `${green}20` }} /></div>
                )}
              </div>
              <div className="p-4">
                {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: green }}>{p.category}</p>}
                <h3 className="text-sm font-semibold">{p.title}</h3>
                <p className="text-sm font-bold mt-1" style={{ color: green }}>{p.price.toFixed(3)} TND</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <footer className="border-t py-10 text-center" style={{ borderColor: `${green}15` }}>
        <p className="text-xs text-green-600/50">© {new Date().getFullYear()} {storeName} — Powered by <Link href="/" className="text-[#16C784] hover:underline">🐼 PandaMarket</Link></p>
      </footer>
    </div>
  );
}
