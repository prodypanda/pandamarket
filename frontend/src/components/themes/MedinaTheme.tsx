import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag, Star } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath } from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';

/**
 * Medina Theme — Traditional marketplace feel, ornate borders, warm colors.
 * Deep teal and gold palette, arch-shaped elements, rich textures.
 */
export function MedinaTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const gold = tc.colors.primary;
  const teal = tc.colors.accent;
  const dp = products.length > 0 ? products : [
    { id: '1', title: 'Zellige Tiles Set', price: 180, images: [], category: 'Decor' },
    { id: '2', title: 'Copper Tea Set', price: 220, images: [], category: 'Kitchen' },
    { id: '3', title: 'Silk Kaftan', price: 450, images: [], category: 'Fashion' },
    { id: '4', title: 'Argan Oil Premium', price: 65, images: [], category: 'Beauty' },
    { id: '5', title: 'Mosaic Mirror', price: 340, images: [], category: 'Decor' },
    { id: '6', title: 'Woven Basket', price: 55, images: [], category: 'Home' },
  ];
  return (
    <div className={`${theme.typography.fontFamily} min-h-screen`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
      <div className="text-center py-2 text-xs tracking-widest uppercase font-medium text-white" style={{ backgroundColor: teal }}>
        <Star className="w-3 h-3 inline mr-2" style={{ color: gold }} />Artisanat Authentique — Livraison Tunisie
      </div>
      <header className="border-b" style={{ borderColor: `${gold}30` }}>
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <Link href={branding?.store_path_base || '/'} className="inline-block">
            {branding?.logo_url ? <img src={branding.logo_url} alt={storeName} className="h-12 mx-auto object-contain" /> : (
              <h1 className="text-3xl font-serif font-bold tracking-wide" style={{ color: teal }}>{storeName}</h1>
            )}
          </Link>
          <nav className="flex justify-center gap-8 mt-4 text-xs tracking-[0.15em] uppercase font-medium" style={{ color: '#8B7355' }}>
            <a href="#products" className="hover:opacity-70 transition-opacity">Souk</a>
            <a href="#products" className="hover:opacity-70 transition-opacity">Collections</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-70 transition-opacity">Notre Médina</Link>
          </nav>
          <div className="mt-4 flex justify-center">
            <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={gold} iconColor={teal} className="inline-flex items-center hover:opacity-70 transition-opacity" />
          </div>
        </div>
      </header>
      <section className="py-20 text-center" style={{ background: `linear-gradient(180deg, ${teal}08 0%, transparent 100%)` }}>
        <div className="inline-block px-6 py-1 rounded-full text-xs font-semibold mb-6 border" style={{ borderColor: gold, color: gold }}>★ Fait Main ★</div>
        <h2 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-6" style={{ color: teal }}>Au Cœur<br />de la Médina</h2>
        <p className="text-sm max-w-md mx-auto mb-8 leading-relaxed" style={{ color: '#8B7355' }}>Chaque pièce raconte une histoire. Artisanat tunisien d&apos;exception.</p>
        <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: teal }}>Découvrir le Souk</a>
      </section>
      <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {dp.map((p) => (
            <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-xl overflow-hidden border-2 transition-all hover:shadow-lg" style={{ borderColor: `${gold}20`, backgroundColor: '#FFFDF8' }}>
              <div className="aspect-square overflow-hidden" style={{ backgroundColor: `${teal}08` }}>
                {getStoreProductImage(p) ? <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
                  <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10" style={{ color: `${gold}30` }} /></div>
                )}
              </div>
              <div className="p-4 text-center">
                {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: gold }}>{p.category}</p>}
                <h3 className="text-sm font-serif font-semibold">{p.title}</h3>
                <p className="text-sm font-bold mt-1" style={{ color: teal }}>{formatStorePrice(p)}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <footer className="py-10 text-center text-white" style={{ backgroundColor: teal }}>
        <p className="text-xs tracking-wide">{storeName} — Propulsé par <Link href="/" className="hover:underline" style={{ color: gold }}>🐼 PandaMarket</Link></p>
      </footer>
    </div>
  );
}

