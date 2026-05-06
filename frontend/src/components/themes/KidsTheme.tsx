import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag, Star, Heart } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath } from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';

/** Kids Theme — Playful, colorful, rounded shapes, fun typography. */
export function KidsTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const primary = tc.colors.primary;
  const yellow = '#FFD93D';
  const dp = products.length > 0 ? products : [
    { id: '1', title: 'Plush Panda Bear', price: 35, images: [], category: 'Toys' },
    { id: '2', title: 'Wooden Block Set', price: 45, images: [], category: 'Educational' },
    { id: '3', title: 'Rainbow Dress', price: 55, images: [], category: 'Clothing' },
    { id: '4', title: 'Story Book Bundle', price: 28, images: [], category: 'Books' },
    { id: '5', title: 'Art Supply Kit', price: 40, images: [], category: 'Creative' },
    { id: '6', title: 'Musical Instrument Set', price: 65, images: [], category: 'Music' },
    { id: '7', title: 'Puzzle Collection', price: 22, images: [], category: 'Games' },
    { id: '8', title: 'Backpack — Dino', price: 38, images: [], category: 'Accessories' },
  ];
  return (
    <div className={`${theme.typography.fontFamily} min-h-screen`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
      <div className="text-center py-2 text-xs font-bold text-white" style={{ backgroundColor: primary }}>
        ⭐ Free gift wrapping on all orders! ⭐
      </div>
      <header className="border-b-4" style={{ borderColor: yellow }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={branding?.store_path_base || '/'}>
            {branding?.logo_url ? <img src={branding.logo_url} alt={storeName} className="h-10 object-contain" /> : (
              <h1 className="text-2xl font-black" style={{ color: primary }}>{storeName} <Star className="w-5 h-5 inline" style={{ color: yellow }} /></h1>
            )}
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-bold" style={{ color: primary }}>
            <a href="#products" className="hover:opacity-70 transition-opacity">Shop</a>
            <a href="#products" className="hover:opacity-70 transition-opacity">New</a>
            <a href="#products" className="hover:opacity-70 transition-opacity">Sale</a>
          </nav>
          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={primary} className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold text-white" label="Cart" />
        </div>
      </header>
      <section className="py-16 text-center" style={{ background: `linear-gradient(180deg, #FFF0F5 0%, transparent 100%)` }}>
        <div className="text-4xl mb-4">🎈🧸🌈</div>
        <h2 className="text-4xl md:text-6xl font-black leading-tight mb-4">
          Fun for<br /><span style={{ color: primary }}>Little Ones!</span>
        </h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-8">Safe, educational, and oh-so-fun products for kids of all ages.</p>
        <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-black text-white transition-all hover:scale-105" style={{ backgroundColor: primary }}>
          <Heart className="w-4 h-4 inline mr-1" /> Shop Now
        </a>
      </section>
      <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {dp.map((p) => (
            <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-3xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all border-2" style={{ borderColor: `${primary}15` }}>
              <div className="aspect-square overflow-hidden" style={{ backgroundColor: '#FFF5F8' }}>
                {getStoreProductImage(p) ? <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-transform duration-500" /> : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🧸</div>
                )}
              </div>
              <div className="p-3 text-center">
                {p.category && <p className="text-[10px] tracking-widest uppercase font-bold mb-1" style={{ color: primary }}>{p.category}</p>}
                <h3 className="text-sm font-bold">{p.title}</h3>
                <p className="text-sm font-black mt-1" style={{ color: primary }}>{formatStorePrice(p)}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <footer className="border-t-4 py-8 text-center" style={{ borderColor: yellow }}>
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} {storeName} — Powered by <Link href="/" className="text-[#16C784] hover:underline">🐼 PandaMarket</Link></p>
      </footer>
    </div>
  );
}

