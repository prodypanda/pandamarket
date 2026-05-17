import React from 'react';
import { Camera } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath, getStoreBrandLogo, getLogoSurfaceForColor, getStoreThemeLogoSurface } from './shared';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';

/** Studio Theme — Photography/art portfolio style, gallery-focused layout. */
export function StudioTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const accent = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));
  const dp = products.length > 0 ? products : [
    { id: '1', title: 'Fine Art Print — Sunset', price: 180, images: [], category: 'Prints' },
    { id: '2', title: 'Canvas — Abstract Blue', price: 350, images: [], category: 'Canvas' },
    { id: '3', title: 'Photo Book — Tunisia', price: 95, images: [], category: 'Books' },
    { id: '4', title: 'Framed — Medina Doors', price: 250, images: [], category: 'Framed' },
    { id: '5', title: 'Digital Download Pack', price: 45, images: [], category: 'Digital' },
    { id: '6', title: 'Limited Edition — Coast', price: 520, images: [], category: 'Limited' },
  ];
  return (
    <div className={`${theme.typography.fontFamily} min-h-screen`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <Link href={branding?.store_path_base || '/'}>
            {logoUrl ? <img src={logoUrl} alt={storeName} className="h-10 object-contain" /> : (
              <div className="flex items-center gap-3"><Camera className="w-5 h-5" style={{ color: accent }} /><h1 className="text-xl font-medium tracking-wide">{storeName}</h1></div>
            )}
          </Link>
          <nav className="hidden md:flex gap-8 text-sm text-gray-500">
            <a href="#products" className="hover:text-gray-900 transition-colors">Gallery</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:text-gray-900 transition-colors">About</Link>
            <Link href={`${branding?.store_path_base || ''}/pages/contact`} className="hover:text-gray-900 transition-colors">Contact</Link>
          </nav>
          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={accent} iconColor="#9CA3AF" className="inline-flex items-center transition-colors hover:text-gray-700" />
        </div>
      </header>
      <section className="py-20 text-center">
        <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: accent }}>Portfolio & Shop</p>
        <h2 className="text-4xl md:text-6xl font-light leading-tight mb-6">Art Meets<br /><span className="font-bold" style={{ color: accent }}>Commerce</span></h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-8">Original works and limited editions. Each piece tells a story.</p>
        <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>View Gallery</a>
      </section>
      <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
        {/* Masonry-style 2-column layout */}
        <div className="columns-2 md:columns-3 gap-4 space-y-4">
          {dp.map((p, i) => (
            <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block break-inside-avoid rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all">
              <div className={`overflow-hidden ${i % 3 === 0 ? 'aspect-[3/4]' : i % 3 === 1 ? 'aspect-square' : 'aspect-[4/3]'}`} style={{ backgroundColor: '#F0F0F0' }}>
                {getStoreProductImage(p) ? <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : (
                  <div className="w-full h-full flex items-center justify-center"><Camera className="w-10 h-10 text-gray-300" strokeWidth={1} /></div>
                )}
              </div>
              <div className="p-4">
                {p.category && <p className="text-[10px] tracking-widest uppercase font-medium mb-1" style={{ color: accent }}>{p.category}</p>}
                <h3 className="text-sm font-medium">{p.title}</h3>
                <p className="text-sm mt-1" style={{ color: accent }}>{formatStorePrice(p)}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <footer className="border-t border-gray-200 py-10 text-center">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" /></p>
      </footer>
    </div>
  );
}

