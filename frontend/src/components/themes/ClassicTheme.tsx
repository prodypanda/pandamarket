'use client';

import React, { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath } from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontHeader } from '../store/StorefrontHeader';
import { StorefrontFooter } from '../store/StorefrontFooter';

export function ClassicTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const allProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Wireless Headphones', price: 149, images: [] },
        { id: '2', title: 'Smart Watch', price: 299, images: [] },
        { id: '3', title: 'Bluetooth Speaker', price: 89, images: [] },
        { id: '4', title: 'Power Bank', price: 45, images: [] },
      ];

  const categories = [...new Set(allProducts.map((p) => p.category).filter(Boolean))] as string[];
  const displayProducts = allProducts.filter((p) => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(p.category || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
        variant="classic"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {children ? (
        /* Sub-route content (product detail, cart, custom page) */
        <main className="py-8 flex-1">{children}</main>
      ) : (
        <>
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section
              className="py-16 text-center"
              style={{
                backgroundColor: tc.heroStyle === 'banner' ? tc.colors.primary : tc.colors.secondary,
                color: tc.heroStyle === 'banner' ? tc.colors.background : tc.colors.text,
              }}
            >
              <div className="max-w-4xl mx-auto px-6">
                {tc.heroStyle === 'split' ? (
                  <div className="flex items-center gap-10 text-left">
                    <div className="flex-1">
                      <h2 className={`text-3xl md:text-4xl mb-3 ${theme.typography.headingFont || ''} ${theme.typography.headingStyle}`}>
                        Bienvenue chez {storeName}
                      </h2>
                      <p className="opacity-70 mb-6">Découvrez nos produits de qualité sélectionnés avec soin.</p>
                      <a href="#products" className="inline-block px-6 py-2.5 rounded-md text-sm font-semibold" style={{ backgroundColor: tc.colors.accent, color: tc.colors.background }}>
                        Voir le catalogue
                      </a>
                    </div>
                    <div className="flex-1 hidden md:block aspect-[4/3] rounded-lg" style={{ backgroundColor: `${tc.colors.text}10` }} />
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <h2 className={`text-2xl ${theme.typography.headingFont || ''} ${theme.typography.headingStyle}`}>
                    {storeName}
                  </h2>
                ) : (
                  <>
                    <h2 className={`text-3xl md:text-5xl mb-4 ${theme.typography.headingFont || ''} ${theme.typography.headingStyle}`}>
                      Bienvenue chez {storeName}
                    </h2>
                    <p className="text-lg opacity-80 mb-6">Découvrez nos produits de qualité sélectionnés avec soin.</p>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Category Filter Tabs */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-wrap gap-2">
              <button onClick={() => setActiveCategory('')} className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors" style={{ backgroundColor: !activeCategory ? tc.colors.primary : tc.colors.secondary, color: !activeCategory ? tc.colors.background : tc.colors.text }}> Tous</button>
              {categories.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors" style={{ backgroundColor: activeCategory === cat ? tc.colors.primary : tc.colors.secondary, color: activeCategory === cat ? tc.colors.background : tc.colors.text }}>{cat}</button>
              ))}
            </div>
          )}

          {/* Products */}
          <main id="products" className="py-12">
            <ThemeLayout variation={tc.layoutVariation} layout={tc.layout} colors={tc.colors} categories={categories} activeCategory={activeCategory}>
              <h2 className="text-xl font-bold pb-4 mb-6" style={{ borderBottom: `1px solid ${tc.colors.text}15`, color: tc.colors.text }}>
                Produits en vedette
              </h2>
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={getStorefrontProductPath(p, branding?.store_path_base)}
                    className="rounded-md overflow-hidden hover:shadow-lg transition-shadow duration-300 block border"
                    style={{ backgroundColor: tc.colors.background, borderColor: `${tc.colors.text}15` }}
                  >
                    <div className="aspect-square w-full overflow-hidden" style={{ backgroundColor: tc.colors.secondary }}>
                      {getStoreProductImage(p) ? (
                        <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={400} unoptimized className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ color: `${tc.colors.text}30` }}>
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium line-clamp-1" style={{ color: tc.colors.text }}>{p.title}</h3>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-bold" style={{ color: tc.colors.accent }}>{formatStorePrice(p)}</span>
                        <span className="px-3 py-1 text-sm font-medium rounded transition-colors" style={{ backgroundColor: tc.colors.secondary, color: tc.colors.text }}>
                          Voir
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20" style={{ color: `${tc.colors.text}50` }}>
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p>Aucun produit pour le moment</p>
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
