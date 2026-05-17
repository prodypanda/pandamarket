import React from 'react';
import { Scissors } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath, getStoreBrandLogo, getLogoSurfaceForColor, getStoreThemeLogoSurface } from './shared';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';

/** Craft Theme — DIY/handmade, rustic textures, warm palette. */
export function CraftTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const rust = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));
  const dp = products.length > 0 ? products : [
    { id: '1', title: 'Hand-Knit Scarf', price: 75, images: [], category: 'Knitting' },
    { id: '2', title: 'Pottery Vase', price: 120, images: [], category: 'Ceramics' },
    { id: '3', title: 'Macramé Wall Hanging', price: 95, images: [], category: 'Decor' },
    { id: '4', title: 'Wooden Cutting Board', price: 65, images: [], category: 'Woodwork' },
    { id: '5', title: 'Beeswax Candle Set', price: 35, images: [], category: 'Candles' },
    { id: '6', title: 'Leather Journal', price: 55, images: [], category: 'Leather' },
  ];
  return (
    <div className={`${theme.typography.fontFamily} min-h-screen`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
      <header className="border-b-2 border-dashed" style={{ borderColor: `${rust}30` }}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href={branding?.store_path_base || '/'}>
            {logoUrl ? <img src={logoUrl} alt={storeName} className="h-10 object-contain" /> : (
              <div className="flex items-center gap-2"><Scissors className="w-5 h-5" style={{ color: rust }} /><h1 className="text-2xl font-serif font-bold">{storeName}</h1></div>
            )}
          </Link>
          <nav className="hidden md:flex gap-8 text-sm font-medium" style={{ color: `${rust}90` }}>
            <a href="#products" className="hover:opacity-70 transition-opacity">Shop</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-70 transition-opacity">About the Maker</Link>
          </nav>
          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={rust} iconColor={rust} className="inline-flex items-center hover:opacity-70 transition-opacity" />
        </div>
      </header>
      <section className="py-20 text-center">
        <p className="text-xs tracking-[0.25em] uppercase mb-4 font-semibold" style={{ color: rust }}>✦ Handmade with Love ✦</p>
        <h2 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-6">Made by<br />Hand</h2>
        <p className="text-sm max-w-md mx-auto mb-8 leading-relaxed" style={{ color: `${rust}80` }}>Every piece is unique, crafted with care and passion. Support local artisans.</p>
        <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: rust }}>Browse Crafts</a>
      </section>
      <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {dp.map((p) => (
            <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-xl overflow-hidden bg-white border-2 border-dashed hover:border-solid transition-all" style={{ borderColor: `${rust}20` }}>
              <div className="aspect-square overflow-hidden" style={{ backgroundColor: '#F0E8DD' }}>
                {getStoreProductImage(p) ? <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
                  <div className="w-full h-full flex items-center justify-center"><Scissors className="w-10 h-10" style={{ color: `${rust}20` }} /></div>
                )}
              </div>
              <div className="p-4">
                {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: rust }}>{p.category}</p>}
                <h3 className="text-sm font-serif font-semibold">{p.title}</h3>
                <p className="text-sm font-bold mt-1" style={{ color: rust }}>{formatStorePrice(p)}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <footer className="border-t-2 border-dashed py-10 text-center" style={{ borderColor: `${rust}20` }}>
        <p className="text-xs" style={{ color: `${rust}60` }}>© {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" /></p>
      </footer>
    </div>
  );
}

