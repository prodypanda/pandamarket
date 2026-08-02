'use client';

import React, { useState } from 'react';
import { ShoppingBag, Leaf, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
  type ThemeProps,
  useThemeCustomization,
  colorVars,
  formatStorePrice,
  getStoreProductImage,
  getStorefrontProductPath,
} from './shared';
import { StorefrontFooter } from '../store/StorefrontFooter';

/** Garden Theme — Organic/natural products, greens and earth tones. */
export function GardenTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const green = tc.colors.primary;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');

  const allProducts = products.length > 0 ? products : [
    { id: '1', title: 'Organic Face Cream', price: 65, images: [], category: 'Skincare' },
    { id: '2', title: 'Herbal Tea Collection', price: 35, images: [], category: 'Wellness' },
    { id: '3', title: 'Bamboo Toothbrush Set', price: 18, images: [], category: 'Eco' },
    { id: '4', title: 'Natural Soap Bar', price: 12, images: [], category: 'Bath' },
    { id: '5', title: 'Essential Oil Kit', price: 85, images: [], category: 'Aromatherapy' },
    { id: '6', title: 'Reusable Produce Bags', price: 25, images: [], category: 'Eco' },
  ];

  const categories = Array.from(new Set(allProducts.map((p) => p.category).filter(Boolean))) as string[];

  const displayProducts = allProducts.filter((product) => {
    const matchesSearch =
      !searchQuery.trim() ||
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      !activeCategory ||
      product.category?.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`${theme.typography.fontFamily} min-h-screen flex flex-col`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}



      {children ? (
        <main className="py-8 flex-1">{children}</main>
      ) : (
        <div className="flex-1">
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="py-20 text-center" style={{ background: `linear-gradient(180deg, #E8F5E0 0%, transparent 100%)` }}>
              {tc.heroStyle === 'split' ? (
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-center text-left">
                  <div>
                    <Leaf className="w-8 h-8 mb-4" style={{ color: green }} strokeWidth={1.5} />
                    <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4">Naturally<br /><span style={{ color: green }}>Beautiful</span></h2>
                    <p className="text-sm max-w-md mb-6 leading-relaxed text-green-700/60">Pure ingredients, sustainable practices. Good for you, good for the planet.</p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: green }}>Shop Natural</a>
                  </div>
                  <div className="aspect-square rounded-2xl flex items-center justify-center p-8" style={{ backgroundColor: '#EDF5E5' }}>
                    <Leaf className="w-20 h-20" style={{ color: `${green}40` }} />
                  </div>
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className="max-w-3xl mx-auto px-6 py-4">
                  <Leaf className="w-6 h-6 mx-auto mb-2" style={{ color: green }} strokeWidth={1.5} />
                  <h2 className="text-2xl font-bold">{storeName}</h2>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="max-w-3xl mx-auto px-6">
                  <div className="aspect-video rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: '#EDF5E5' }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: green }}>
                      <Play className="w-6 h-6 ml-1" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Our Eco Story</h2>
                </div>
              ) : (
                <>
                  <Leaf className="w-8 h-8 mx-auto mb-4" style={{ color: green }} strokeWidth={1.5} />
                  <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-6">Naturally<br /><span style={{ color: green }}>Beautiful</span></h2>
                  <p className="text-sm max-w-md mx-auto mb-8 leading-relaxed text-green-700/60">Pure ingredients, sustainable practices. Good for you, good for the planet.</p>
                  <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: green }}>Shop Natural</a>
                </>
              )}
            </section>
          )}

          {/* Products Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 pb-24 pt-8">
            {/* Category Filter Tabs */}
            {categories.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: !activeCategory ? green : `${green}15`,
                    color: !activeCategory ? '#FFFFFF' : green,
                  }}
                >
                  All Products
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: activeCategory.toLowerCase() === cat.toLowerCase() ? green : `${green}15`,
                      color: activeCategory.toLowerCase() === cat.toLowerCase() ? '#FFFFFF' : green,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className={`grid ${tc.gridClasses}`}>
              {displayProducts.map((p) => (
                <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all border" style={{ borderColor: `${green}10` }}>
                  <div className="aspect-square overflow-hidden" style={{ backgroundColor: '#EDF5E5' }}>
                    {getStoreProductImage(p) ? <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={400} unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
                      <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10" style={{ color: `${green}20` }} /></div>
                    )}
                  </div>
                  <div className="p-4">
                    {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: green }}>{p.category}</p>}
                    <h3 className="text-sm font-semibold">{p.title}</h3>
                    <p className="text-sm font-bold mt-1" style={{ color: green }}>{formatStorePrice(p)}</p>
                  </div>
                </Link>
              ))}
            </div>

            {displayProducts.length === 0 && (
              <div className="text-center py-20 text-green-700/40">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm">No natural products found</p>
              </div>
            )}
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
