import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag, Flame } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars } from './shared';
import { ThemeLayout } from './ThemeLayout';

/** Urban Theme — Street fashion, bold typography, high contrast. */
export function UrbanTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const accent = branding?.primary_color || '#FF3B30';
  const dp = products.length > 0 ? products : [
    { id: '1', title: 'Oversized Hoodie', price: 120, images: [], category: 'Streetwear' },
    { id: '2', title: 'Cargo Pants', price: 95, images: [], category: 'Bottoms' },
    { id: '3', title: 'Chunky Sneakers', price: 280, images: [], category: 'Shoes' },
    { id: '4', title: 'Bucket Hat', price: 45, images: [], category: 'Accessories' },
    { id: '5', title: 'Crossbody Bag', price: 85, images: [], category: 'Bags' },
    { id: '6', title: 'Graphic Tee', price: 55, images: [], category: 'Tops' },
  ];
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFFFF', color: '#0A0A0A' }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
      <header className="border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {branding?.logo_url ? <img src={branding.logo_url} alt={storeName} className="h-8 object-contain" /> : (
            <h1 className="text-2xl font-black uppercase tracking-tighter">{storeName}</h1>
          )}
          <nav className="hidden md:flex gap-6 text-xs uppercase tracking-widest font-black">
            <a href="#" className="hover:opacity-60 transition-opacity">New</a>
            <a href="#" className="hover:opacity-60 transition-opacity">Shop</a>
            <a href="#" className="hover:opacity-60 transition-opacity">Sale</a>
          </nav>
          <Link href="/hub/cart" className="relative"><ShoppingBag className="w-5 h-5" /></Link>
        </div>
      </header>
      <section className="bg-black text-white py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-white/20">
          <Flame className="w-3 h-3" style={{ color: accent }} /> Hot Drops
        </div>
        <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-6">
          Street<br /><span style={{ color: accent }}>Culture</span>
        </h2>
        <p className="text-sm text-gray-400 max-w-md mx-auto mb-8">Bold. Unapologetic. Authentic.</p>
        <a href="#products" className="inline-block px-8 py-3 text-sm font-black uppercase tracking-wider text-black transition-all hover:scale-105" style={{ backgroundColor: accent, color: '#fff' }}>Shop Now</a>
      </section>
      <main id="products" className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {dp.map((p) => (
            <Link key={p.id} href={`/hub/products/${p.id}`} className="group block border-2 border-black overflow-hidden hover:bg-black hover:text-white transition-all duration-300">
              <div className="aspect-square overflow-hidden bg-gray-100 group-hover:bg-gray-900">
                {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
                  <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10 text-gray-300 group-hover:text-gray-600" /></div>
                )}
              </div>
              <div className="p-4">
                {p.category && <p className="text-[10px] tracking-widest uppercase font-black mb-1" style={{ color: accent }}>{p.category}</p>}
                <h3 className="text-sm font-black uppercase">{p.title}</h3>
                <p className="text-sm font-bold mt-1">{p.price.toFixed(3)} TND</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <footer className="border-t-4 border-black py-10 text-center">
        <p className="text-xs text-gray-500">© {new Date().getFullYear()} {storeName} — Powered by <Link href="/" className="text-[#16C784] hover:underline">🐼 PandaMarket</Link></p>
      </footer>
    </div>
  );
}
