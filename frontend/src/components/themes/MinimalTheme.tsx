'use client';

import React from 'react';
import { useStorefrontCatalogFilters } from '../../lib/storefront-catalog-state';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Play } from 'lucide-react';
import {
  type ThemeProps,
  useThemeCustomization,
  colorVars,
  formatStorePrice,
  getStoreProductImage,
  getStorefrontProductPath,
} from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontFooter } from '../store/StorefrontFooter';
import { StorefrontHeader } from '../store/StorefrontHeader';

export function MinimalTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const { searchQuery, setSearchQuery, activeCategory, setActiveCategory } = useStorefrontCatalogFilters();

  const allProducts = products;

  const categories = Array.from(new Set(allProducts.map((p) => p.category).filter(Boolean))) as string[];

  const displayProducts = allProducts.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCat) return false;
    }
    if (activeCategory && p.category !== activeCategory) return false;
    return true;
  });

  return (
    <div
      className={`${theme.typography.fontFamily} min-h-screen flex flex-col`}
      style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}
    >
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
      <StorefrontHeader
        storeName={storeName}
        branding={branding}
        theme={theme}
        navigation={navigation}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />


      {children ? (
        <main className="py-8 flex-1">{children}</main>
      ) : (
        <div className="flex-1">
          {/* Hero (respects heroStyle: banner, split, minimal, video, none) */}
          {tc.heroStyle !== 'none' && (
            <section
              className="py-16 md:py-24 text-center border-b"
              style={{
                backgroundColor: tc.heroStyle === 'banner' ? tc.colors.primary : tc.colors.secondary,
                color: tc.heroStyle === 'banner' ? tc.colors.background : tc.colors.text,
                borderColor: `${tc.colors.text}10`,
              }}
            >
              <div className={tc.layout.container}>
                {tc.heroStyle === 'split' ? (
                  <div className="flex flex-col md:flex-row items-center gap-10 text-left">
                    <div className="flex-1">
                      <h2 className={`text-4xl md:text-5xl font-light mb-4 tracking-tight ${theme.typography.headingStyle}`}>
                        {storeName}
                      </h2>
                      <p className="text-base opacity-75 mb-6 leading-relaxed max-w-md">
                        Découvrez notre collection soigneusement sélectionnée avec précision et simplicité.
                      </p>
                      <a
                        href="#products"
                        className="inline-block px-7 py-3 text-sm font-semibold rounded-md transition-opacity hover:opacity-80"
                        style={{ backgroundColor: tc.colors.primary, color: tc.colors.background }}
                      >
                        Explorer la collection
                      </a>
                    </div>
                    <div
                      className="flex-1 w-full aspect-[4/3] rounded-lg border flex items-center justify-center"
                      style={{ backgroundColor: `${tc.colors.text}05`, borderColor: `${tc.colors.text}10` }}
                    >
                      <ShoppingBag className="w-16 h-16 opacity-20" />
                    </div>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div className="max-w-3xl mx-auto">
                    <h2 className={`text-3xl md:text-5xl mb-4 ${theme.typography.headingStyle}`}>
                      {storeName}
                    </h2>
                    <p className="text-base opacity-75 mb-8">Regardez notre histoire et notre processus de fabrication.</p>
                    <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg bg-black/10 border flex items-center justify-center group cursor-pointer" style={{ borderColor: `${tc.colors.text}15` }}>
                      <div className="w-16 h-16 rounded-full bg-white/90 text-black flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-current ml-1" />
                      </div>
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div className="max-w-xl mx-auto">
                    <h2 className={`text-3xl md:text-4xl mb-3 ${theme.typography.headingStyle}`}>{storeName}</h2>
                    <p className="text-sm opacity-60 tracking-widest uppercase">Qualité. Simplicité. Authenticité.</p>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto">
                    <h2 className={`text-4xl md:text-6xl mb-4 tracking-tight ${theme.typography.headingStyle}`}>{storeName}</h2>
                    <p className="text-base opacity-80 mb-8 leading-relaxed max-w-lg mx-auto">
                      Découvrez notre collection soigneusement sélectionnée pour un style épuré et durable.
                    </p>
                    <a
                      href="#products"
                      className="inline-block px-8 py-3 text-sm font-semibold rounded-md transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: tc.heroStyle === 'banner' ? tc.colors.background : tc.colors.primary,
                        color: tc.heroStyle === 'banner' ? tc.colors.primary : tc.colors.background,
                      }}
                    >
                      Explorer le catalogue
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Interactive Category Filter Pills */}
          {categories.length > 0 && (
            <div className={`${tc.layout.container} pt-8 flex flex-wrap gap-2 justify-center`}>
              <button
                onClick={() => setActiveCategory('')}
                className="px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-colors"
                style={{
                  backgroundColor: !activeCategory ? tc.colors.primary : tc.colors.secondary,
                  color: !activeCategory ? tc.colors.background : tc.colors.text,
                }}
              >
                Tous
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-colors"
                  style={{
                    backgroundColor: activeCategory === cat ? tc.colors.primary : tc.colors.secondary,
                    color: activeCategory === cat ? tc.colors.background : tc.colors.text,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Products */}
          <main id="products" className="py-16">
            <ThemeLayout
              variation={tc.layoutVariation}
              layout={tc.layout}
              colors={tc.colors}
              categories={categories}
              activeCategory={activeCategory}
            >
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p) => (
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group cursor-pointer block">
                    <div className="aspect-[3/4] mb-4 overflow-hidden rounded-md" style={{ backgroundColor: `${tc.colors.text}08` }}>
                      {getStoreProductImage(p) ? (
                        <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={533} unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full group-hover:scale-105 transition-transform duration-500 flex items-center justify-center" style={{ color: `${tc.colors.text}30` }}>
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    {p.category && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold opacity-60 block mb-1">
                        {p.category}
                      </span>
                    )}
                    <h3 className="text-sm font-medium line-clamp-1" style={{ color: tc.colors.text }}>{p.title}</h3>
                    <p className="text-sm font-semibold mt-1" style={{ color: tc.colors.accent }}>{formatStorePrice(p)}</p>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20" style={{ color: `${tc.colors.text}50` }}>
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p>Aucun produit ne correspond à votre recherche</p>
                </div>
              )}
            </ThemeLayout>
          </main>
        </div>
      )}

      <StorefrontFooter
        storeName={storeName}
        branding={branding}
        theme={theme}
        navigation={navigation}
        categories={categories}
      />
    </div>
  );
}
