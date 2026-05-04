import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag, Download, Code2 } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars } from './shared';
import { ThemeLayout } from './ThemeLayout';

/** Digital Theme — Software/SaaS products, gradient backgrounds, modern. */
export function DigitalTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const accent = branding?.primary_color || '#6366F1';
  const dp = products.length > 0 ? products : [
    { id: '1', title: 'UI Kit Pro', price: 89, images: [], category: 'Design' },
    { id: '2', title: 'Icon Pack 2000+', price: 35, images: [], category: 'Icons' },
    { id: '3', title: 'WordPress Theme', price: 59, images: [], category: 'Themes' },
    { id: '4', title: 'React Component Library', price: 149, images: [], category: 'Code' },
    { id: '5', title: 'Stock Photo Bundle', price: 45, images: [], category: 'Photos' },
    { id: '6', title: 'Font Family Pack', price: 29, images: [], category: 'Fonts' },
  ];
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0F1A', color: '#E2E8F0' }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
      <header className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {branding?.logo_url ? <img src={branding.logo_url} alt={storeName} className="h-8 object-contain" /> : (
            <div className="flex items-center gap-2"><Code2 className="w-5 h-5" style={{ color: accent }} /><h1 className="text-lg font-bold">{storeName}</h1></div>
          )}
          <nav className="hidden md:flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Products</a>
            <a href="#" className="hover:text-white transition-colors">Bundles</a>
            <a href="#" className="hover:text-white transition-colors">Free</a>
          </nav>
          <Link href="/hub/cart"><ShoppingBag className="w-5 h-5 text-gray-400 hover:text-white transition-colors" /></Link>
        </div>
      </header>
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}15 0%, transparent 70%)` }} />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8 border" style={{ borderColor: `${accent}40`, color: accent, backgroundColor: `${accent}10` }}>
            <Download className="w-3 h-3" /> Instant Download
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">Digital Products<br /><span style={{ color: accent }}>Made Right</span></h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-10">Premium digital assets for designers, developers, and creators.</p>
          <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>Browse Products</a>
        </div>
      </section>
      <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {dp.map((p) => (
            <Link key={p.id} href={`/hub/products/${p.id}`} className="group block rounded-xl overflow-hidden border border-white/5 hover:border-white/15 transition-all" style={{ backgroundColor: '#1A1A2E' }}>
              <div className="aspect-[4/3] overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}10, ${accent}05)` }}>
                {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
                  <div className="w-full h-full flex items-center justify-center"><Download className="w-10 h-10" style={{ color: `${accent}25` }} /></div>
                )}
              </div>
              <div className="p-4">
                {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: accent }}>{p.category}</p>}
                <h3 className="text-sm font-semibold text-white line-clamp-1">{p.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-bold" style={{ color: accent }}>{p.price.toFixed(3)} TND</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">Instant</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <footer className="border-t border-white/5 py-10 text-center">
        <p className="text-xs text-gray-600">© {new Date().getFullYear()} {storeName} — Powered by <Link href="/" className="text-[#16C784] hover:underline">🐼 PandaMarket</Link></p>
      </footer>
    </div>
  );
}
