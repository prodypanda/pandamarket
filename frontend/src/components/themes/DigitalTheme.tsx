'use client';

import React, { useState } from 'react';
import { Download, Code2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath } from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontFooter } from '../store/StorefrontFooter';
import { StorefrontHeader } from '../store/StorefrontHeader';

/** Digital Theme — Software/SaaS products, gradient backgrounds, modern. */
export function DigitalTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const accent = tc.colors.primary;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const allProducts = products;

  const categories = [...new Set(allProducts.map((p) => p.category).filter(Boolean))] as string[];

  const displayProducts = allProducts.filter((p) => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(p.category || '').toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (activeCategory && p.category !== activeCategory) {
      return false;
    }
    return true;
  });

  return (
    <div className={`${theme.typography.fontFamily} min-h-screen relative flex flex-col`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
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
        <main className="py-8 max-w-7xl mx-auto px-6">{children}</main>
      ) : (
        <>
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="relative overflow-hidden py-24">
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}15 0%, transparent 70%)` }} />
              <div className="relative max-w-7xl mx-auto px-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8 border" style={{ borderColor: `${accent}40`, color: accent, backgroundColor: `${accent}10` }}>
                  <Download className="w-3 h-3" /> Instant Download
                </div>

                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-8 items-center text-left">
                    <div>
                      <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6 text-white">
                        Digital Products <br /><span style={{ color: accent }}>Made Right</span>
                      </h2>
                      <p className="text-sm text-gray-400 mb-8 max-w-md">
                        Premium digital assets for designers, developers, and creators. Crafted with precision and speed.
                      </p>
                      <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>
                        Browse Products
                      </a>
                    </div>
                    <div className="aspect-video rounded-xl border border-white/10 bg-white/5 flex items-center justify-center p-6">
                      <Code2 className="w-16 h-16 animate-pulse" style={{ color: accent }} />
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                      {storeName} Marketplace
                    </h2>
                    <p className="text-sm text-gray-400">Next-gen digital assets & software tools.</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div>
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6 text-white">
                      Build Faster with <span style={{ color: accent }}>Assets</span>
                    </h2>
                    <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>
                      View Assets
                    </a>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6 text-white">
                      Digital Products<br /><span style={{ color: accent }}>Made Right</span>
                    </h2>
                    <p className="text-sm text-gray-400 max-w-md mx-auto mb-10">
                      Premium digital assets for designers, developers, and creators.
                    </p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>
                      Browse Products
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 pt-4 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-wrap justify-center">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-5 py-2 rounded-full text-xs font-semibold transition-all border border-white/10"
                  style={{
                    backgroundColor: !activeCategory ? accent : 'rgba(255,255,255,0.05)',
                    color: !activeCategory ? '#ffffff' : '#9CA3AF',
                  }}
                >
                  All Products
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-5 py-2 rounded-full text-xs font-semibold transition-all border border-white/10"
                    style={{
                      backgroundColor: activeCategory === cat ? accent : 'rgba(255,255,255,0.05)',
                      color: activeCategory === cat ? '#ffffff' : '#9CA3AF',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Product Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
            <ThemeLayout variation={tc.layoutVariation} layout={tc.layout} colors={tc.colors} categories={categories} activeCategory={activeCategory}>
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p) => (
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-xl overflow-hidden border border-white/5 hover:border-white/15 transition-all" style={{ backgroundColor: '#1A1A2E' }}>
                    <div className="aspect-[4/3] overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}10, ${accent}05)` }}>
                      {getStoreProductImage(p) ? (
                        <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={400} unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Download className="w-10 h-10" style={{ color: `${accent}25` }} />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: accent }}>{p.category}</p>}
                      <h3 className="text-sm font-semibold text-white line-clamp-1">{p.title}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm font-bold" style={{ color: accent }}>{formatStorePrice(p)}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">Instant</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm">No digital items found matching search</p>
                </div>
              )}
            </ThemeLayout>
          </main>
        </>
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
