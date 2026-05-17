import React from 'react';
import { Diamond } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath, getStoreBrandLogo, getLogoSurfaceForColor, getStoreThemeLogoSurface } from './shared';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';

/** Luxe Theme — High-end jewelry/watches, dark with gold accents. */
export function LuxeTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const gold = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));
  const dp = products.length > 0 ? products : [
    { id: '1', title: 'Diamond Pendant', price: 2800, images: [], category: 'Necklaces' },
    { id: '2', title: 'Swiss Chronograph', price: 4500, images: [], category: 'Watches' },
    { id: '3', title: 'Gold Cuff Bracelet', price: 1200, images: [], category: 'Bracelets' },
    { id: '4', title: 'Sapphire Ring', price: 3200, images: [], category: 'Rings' },
  ];
  return (
    <div className={`${theme.typography.fontFamily} min-h-screen`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
      <header className="border-b" style={{ borderColor: `${gold}20` }}>
        <div className="max-w-6xl mx-auto px-6 py-10 text-center">
          <div className="flex items-center justify-center gap-5">
            <Link href={branding?.store_path_base || '/'} className="inline-block">
              {logoUrl ? <img src={logoUrl} alt={storeName} className="h-10 mx-auto object-contain" /> : (
                <div className="flex items-center justify-center gap-3">
                  <Diamond className="w-5 h-5" style={{ color: gold }} />
                  <h1 className="text-2xl font-serif font-light tracking-[0.3em] uppercase">{storeName}</h1>
                  <Diamond className="w-5 h-5" style={{ color: gold }} />
                </div>
              )}
            </Link>
            <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={gold} iconColor={gold} className="inline-flex items-center hover:opacity-70 transition-opacity" />
          </div>
        </div>
      </header>
      <section className="py-24 text-center">
        <p className="text-xs tracking-[0.4em] uppercase mb-6" style={{ color: gold }}>Haute Joaillerie</p>
        <h2 className="text-4xl md:text-7xl font-serif font-light tracking-wide leading-tight mb-8">Eternal<br />Brilliance</h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-10 leading-relaxed">Exceptional craftsmanship. Timeless elegance. Each piece, a masterwork.</p>
        <a href="#products" className="inline-block px-12 py-4 text-xs tracking-[0.25em] uppercase font-medium border transition-all hover:bg-white/5" style={{ borderColor: gold, color: gold }}>Discover</a>
      </section>
      <main id="products" className="max-w-6xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-2 gap-8">
          {dp.map((p) => (
            <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block">
              <div className="aspect-square overflow-hidden mb-6" style={{ backgroundColor: '#1A1A1A' }}>
                {getStoreProductImage(p) ? <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" /> : (
                  <div className="w-full h-full flex items-center justify-center"><Diamond className="w-12 h-12" style={{ color: `${gold}20` }} strokeWidth={1} /></div>
                )}
              </div>
              {p.category && <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: gold }}>{p.category}</p>}
              <h3 className="text-lg font-serif font-light tracking-wide">{p.title}</h3>
              <p className="text-sm mt-2" style={{ color: gold }}>{formatStorePrice(p)}</p>
            </Link>
          ))}
        </div>
      </main>
      <footer className="border-t py-12 text-center" style={{ borderColor: `${gold}15` }}>
        <p className="text-xs text-gray-600 tracking-wide">{storeName} — <PoweredByMarketplace branding={branding} linkClassName="hover:underline" linkStyle={{ color: gold }} /></p>
      </footer>
    </div>
  );
}

