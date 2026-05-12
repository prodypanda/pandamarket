import React from 'react';
import { ShoppingBag, Sun } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath } from './shared';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';

/**
 * Sahara Theme — Warm desert tones, Tunisian-inspired patterns.
 * Sandy backgrounds, terracotta accents, geometric borders,
 * warm typography, Mediterranean feel.
 */
export function SaharaTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const accent = tc.colors.primary;
  const dp = products.length > 0 ? products : [
    { id: '1', title: 'Handwoven Rug', price: 350, images: [], category: 'Decor' },
    { id: '2', title: 'Ceramic Tagine', price: 85, images: [], category: 'Kitchen' },
    { id: '3', title: 'Olive Oil Set', price: 45, images: [], category: 'Food' },
    { id: '4', title: 'Leather Pouf', price: 280, images: [], category: 'Furniture' },
    { id: '5', title: 'Brass Lantern', price: 120, images: [], category: 'Lighting' },
    { id: '6', title: 'Embroidered Cushion', price: 65, images: [], category: 'Textiles' },
  ];
  return (
    <div className={`${theme.typography.fontFamily} min-h-screen`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
      <header className="border-b-2" style={{ borderColor: `${accent}30` }}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href={branding?.store_path_base || '/'}>
            {branding?.logo_url ? <img src={branding.logo_url} alt={storeName} className="h-10 object-contain" /> : (
              <div className="flex items-center gap-2"><Sun className="w-6 h-6" style={{ color: accent }} /><h1 className="text-2xl font-bold tracking-wide">{storeName}</h1></div>
            )}
          </Link>
          <nav className="hidden md:flex gap-8 text-sm font-medium" style={{ color: '#7A5C44' }}>
            <a href="#products" className="hover:opacity-70 transition-opacity">Boutique</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-70 transition-opacity">Notre Histoire</Link>
          </nav>
          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={accent} iconColor={accent} className="inline-flex items-center hover:opacity-70 transition-opacity" />
        </div>
      </header>
      <section className="py-20 text-center" style={{ background: `linear-gradient(180deg, ${accent}08 0%, transparent 100%)` }}>
        <p className="text-xs tracking-[0.25em] uppercase mb-4 font-semibold" style={{ color: accent }}>Artisanat Tunisien</p>
        <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-6">Trésors du<br />Sahara</h2>
        <p className="text-sm max-w-md mx-auto mb-8 leading-relaxed" style={{ color: '#7A5C44' }}>Pièces uniques inspirées par les traditions millénaires du désert tunisien.</p>
        <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>Explorer</a>
      </section>
      <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {dp.map((p) => (
            <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-xl overflow-hidden border transition-all hover:shadow-lg" style={{ borderColor: `${accent}15`, backgroundColor: '#FFFBF5' }}>
              <div className="aspect-square overflow-hidden bg-[#F5EDE3]">
                {getStoreProductImage(p) ? <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
                  <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10" style={{ color: `${accent}25` }} /></div>
                )}
              </div>
              <div className="p-4">
                {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: accent }}>{p.category}</p>}
                <h3 className="text-sm font-semibold">{p.title}</h3>
                <p className="text-sm font-bold mt-1" style={{ color: accent }}>{formatStorePrice(p)}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <footer className="border-t-2 py-10 text-center" style={{ borderColor: `${accent}20` }}>
        <p className="text-xs" style={{ color: '#7A5C44' }}>© {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" /></p>
      </footer>
    </div>
  );
}

