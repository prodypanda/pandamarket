import React from 'react';
import { ShoppingBag, Waves, Anchor } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath } from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';

/** Coastal Theme — Beach/resort, blues and sandy tones, relaxed vibe. */
export function CoastalTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const dp = products.length > 0 ? products : [
    { id: '1', title: 'Linen Beach Shirt', price: 95, images: [], category: 'Clothing' },
    { id: '2', title: 'Straw Sun Hat', price: 45, images: [], category: 'Accessories' },
    { id: '3', title: 'Coral Necklace', price: 120, images: [], category: 'Jewelry' },
    { id: '4', title: 'Canvas Espadrilles', price: 75, images: [], category: 'Shoes' },
    { id: '5', title: 'Sea Salt Candle', price: 35, images: [], category: 'Home' },
    { id: '6', title: 'Driftwood Frame', price: 55, images: [], category: 'Decor' },
  ];
  const categories = [...new Set(dp.map((p) => p.category).filter(Boolean))] as string[];

  return (
    <div className="min-h-screen" style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header className="border-b" style={{ borderColor: `${tc.colors.primary}20`, backgroundColor: tc.colors.headerBg }}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href={branding?.store_path_base || '/'}>
            {branding?.logo_url ? <img src={branding.logo_url} alt={storeName} className="h-10 object-contain" /> : (
              <div className="flex items-center gap-2"><Anchor className="w-5 h-5" style={{ color: tc.colors.primary }} /><h1 className="text-2xl font-semibold tracking-wide">{storeName}</h1></div>
            )}
          </Link>
          <nav className="hidden md:flex gap-8 text-sm font-medium" style={{ color: `${tc.colors.primary}90` }}>
            <a href="#products" className="hover:opacity-70 transition-opacity">Boutique</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-70 transition-opacity">À propos</Link>
          </nav>
          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={tc.colors.primary} iconColor={tc.colors.primary} className="inline-flex items-center hover:opacity-70 transition-opacity" />
        </div>
      </header>

      {/* Hero */}
      {tc.heroStyle !== 'none' && (
        <section className="py-20 text-center" style={{ background: `linear-gradient(180deg, ${tc.colors.secondary} 0%, transparent 100%)` }}>
          {tc.heroStyle === 'split' ? (
            <div className={`${tc.layout.container} flex items-center gap-12 text-left`}>
              <div className="flex-1">
                <Waves className="w-8 h-8 mb-4" style={{ color: tc.colors.primary }} strokeWidth={1.5} />
                <h2 className="text-4xl md:text-5xl font-light leading-tight mb-4">Coastal<br /><span className="font-bold" style={{ color: tc.colors.primary }}>Living</span></h2>
                <p className="text-sm max-w-md mb-8 leading-relaxed" style={{ color: `${tc.colors.text}70` }}>Inspired by the Mediterranean coast. Effortless style for sun-kissed days.</p>
                <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: tc.colors.primary }}>Explorer la collection</a>
              </div>
              <div className="flex-1 hidden md:block aspect-[4/3] rounded-2xl" style={{ backgroundColor: `${tc.colors.primary}15` }} />
            </div>
          ) : tc.heroStyle === 'minimal' ? (
            <div className={tc.layout.container}>
              <Waves className="w-6 h-6 mx-auto mb-3" style={{ color: tc.colors.primary }} strokeWidth={1.5} />
              <h2 className="text-2xl font-semibold">{storeName}</h2>
            </div>
          ) : (
            <>
              <Waves className="w-8 h-8 mx-auto mb-4" style={{ color: tc.colors.primary }} strokeWidth={1.5} />
              <h2 className="text-4xl md:text-6xl font-light leading-tight mb-6">Coastal<br /><span className="font-bold" style={{ color: tc.colors.primary }}>Living</span></h2>
              <p className="text-sm max-w-md mx-auto mb-8 leading-relaxed" style={{ color: `${tc.colors.text}70` }}>Inspired by the Mediterranean coast. Effortless style for sun-kissed days.</p>
              <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: tc.colors.primary }}>Explorer la collection</a>
            </>
          )}
        </section>
      )}

      {/* Products */}
      <main id="products" className="pb-24 pt-8">
        <ThemeLayout variation={tc.layoutVariation} layout={tc.layout} colors={tc.colors} categories={categories}>
          <div className={`grid ${tc.gridClasses}`}>
            {dp.map((p) => (
              <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all" style={{ backgroundColor: tc.colors.headerBg }}>
                <div className="aspect-square overflow-hidden" style={{ backgroundColor: `${tc.colors.primary}10` }}>
                  {getStoreProductImage(p) ? <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
                    <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10" style={{ color: `${tc.colors.primary}30` }} /></div>
                  )}
                </div>
                <div className="p-4">
                  {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: tc.colors.primary }}>{p.category}</p>}
                  <h3 className="text-sm font-semibold" style={{ color: tc.colors.text }}>{p.title}</h3>
                  <p className="text-sm font-bold mt-1" style={{ color: tc.colors.accent }}>{formatStorePrice(p)}</p>
                </div>
              </Link>
            ))}
          </div>
        </ThemeLayout>
      </main>

      {/* Footer */}
      <footer className="border-t py-10 text-center" style={{ borderColor: `${tc.colors.primary}15`, backgroundColor: tc.colors.footerBg }}>
        <p className="text-xs" style={{ color: `${tc.colors.background}60` }}>© {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" /></p>
      </footer>
    </div>
  );
}

