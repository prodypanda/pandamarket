'use client';

import React, { useState } from 'react';
import { Scissors, Search, Menu, X, Play, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath, getStoreBrandLogo, getLogoSurfaceForColor, getStoreThemeLogoSurface } from './shared';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';
import { StorefrontSocialLinks } from './StorefrontSocialLinks';
import { ThemeLayout } from './ThemeLayout';

/** Craft Theme — DIY/handmade, rustic textures, warm palette. */
export function CraftTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const rust = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const allProducts = products.length > 0 ? products : [
    { id: '1', title: 'Hand-Knit Scarf', price: 75, images: [], category: 'Knitting' },
    { id: '2', title: 'Pottery Vase', price: 120, images: [], category: 'Ceramics' },
    { id: '3', title: 'Macramé Wall Hanging', price: 95, images: [], category: 'Decor' },
    { id: '4', title: 'Wooden Cutting Board', price: 65, images: [], category: 'Woodwork' },
    { id: '5', title: 'Beeswax Candle Set', price: 35, images: [], category: 'Candles' },
    { id: '6', title: 'Leather Journal', price: 55, images: [], category: 'Leather' },
  ];

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
    <div className={`${theme.typography.fontFamily} min-h-screen relative`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header className="border-b-2 border-dashed relative z-20" style={{ backgroundColor: tc.colors.headerBg, borderColor: `${rust}30` }}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-black/5 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" style={{ color: rust }} />
            </button>
            <Link href={branding?.store_path_base || '/'}>
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-10 object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <Scissors className="w-5 h-5" style={{ color: rust }} />
                  <h1 className="text-2xl font-serif font-bold">{storeName}</h1>
                </div>
              )}
            </Link>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex flex-1 max-w-xs lg:max-w-md mx-6 relative">
            <input
              type="text"
              placeholder="Search handmade items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 px-4 pr-10 text-xs rounded-lg border-2 border-dashed bg-white/50 focus:outline-none"
              style={{ borderColor: `${rust}40`, color: tc.colors.text }}
            />
            <Search className="w-4 h-4 absolute right-3 top-2.5 pointer-events-none" style={{ color: rust }} />
          </div>

          <nav className="hidden lg:flex gap-8 text-sm font-medium" style={{ color: `${rust}90` }}>
            <a href="#products" className="hover:opacity-70 transition-opacity">Shop</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-70 transition-opacity">About Maker</Link>
            <Link href="/hub/login" className="hover:opacity-70 transition-opacity">Login</Link>
          </nav>

          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={rust} iconColor={rust} className="inline-flex items-center hover:opacity-70 transition-opacity" />
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] shadow-2xl p-6 overflow-y-auto flex flex-col justify-between border-r-2 border-dashed" style={{ backgroundColor: tc.colors.headerBg, borderColor: `${rust}40`, color: tc.colors.text }}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b-2 border-dashed" style={{ borderColor: `${rust}30` }}>
                <span className="font-serif font-bold text-lg flex items-center gap-2" style={{ color: rust }}>
                  <Scissors className="w-5 h-5" />
                  {storeName}
                </span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:opacity-70" aria-label="Close menu">
                  <X className="w-6 h-6" style={{ color: rust }} />
                </button>
              </div>

              <div className="py-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search crafts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2 px-3 pr-9 text-xs rounded-md border-2 border-dashed bg-white/50 focus:outline-none"
                    style={{ borderColor: `${rust}40`, color: tc.colors.text }}
                  />
                  <Search className="w-4 h-4 absolute right-2.5 top-2.5" style={{ color: rust }} />
                </div>
              </div>

              <nav className="py-4 space-y-3 font-serif font-medium text-sm">
                <Link href={branding?.store_path_base || '/'} className="block hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  Home
                </Link>
                <a href="#products" className="block hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  Shop Catalog
                </a>
                <Link href={`${branding?.store_path_base || ''}/pages/about`} className="block hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  About the Maker
                </Link>
                <Link href={`${branding?.store_path_base || ''}/pages/contact`} className="block hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  Contact
                </Link>
                <Link href="/hub/login" className="block font-bold" style={{ color: rust }} onClick={() => setMobileMenuOpen(false)}>
                  Maker Login
                </Link>
              </nav>

              {categories.length > 0 && (
                <div className="py-4 border-t-2 border-dashed" style={{ borderColor: `${rust}30` }}>
                  <p className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: rust }}>Craft Categories</p>
                  <div className="space-y-2 text-sm">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`block w-full text-left ${!activeCategory ? 'font-bold' : 'opacity-80'}`}
                      style={{ color: !activeCategory ? rust : tc.colors.text }}
                    >
                      All Crafts
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`block w-full text-left ${activeCategory === cat ? 'font-bold' : 'opacity-80'}`}
                        style={{ color: activeCategory === cat ? rust : tc.colors.text }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t-2 border-dashed" style={{ borderColor: `${rust}30` }}>
              <StorefrontSocialLinks branding={branding} showContact className="flex flex-col gap-2 text-xs opacity-80" linkClassName="hover:underline" />
            </div>
          </div>
        </div>
      )}

      {children ? (
        <main className="py-8 max-w-7xl mx-auto px-6">{children}</main>
      ) : (
        <>
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="py-20 text-center relative" style={{ backgroundColor: tc.heroStyle === 'banner' ? `${rust}08` : 'transparent' }}>
              <div className="max-w-4xl mx-auto px-6">
                <p className="text-xs tracking-[0.25em] uppercase mb-4 font-semibold" style={{ color: rust }}>✦ Handmade with Love ✦</p>
                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-8 items-center text-left">
                    <div>
                      <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                        Made by<br />Hand
                      </h2>
                      <p className="text-sm max-w-md mb-8 leading-relaxed" style={{ color: `${rust}80` }}>
                        Every piece is unique, crafted with care and passion. Support local artisans and unique creations.
                      </p>
                      <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: rust }}>
                        Browse Crafts
                      </a>
                    </div>
                    <div className="aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center p-8 bg-[#F0E8DD]" style={{ borderColor: `${rust}30` }}>
                      <Scissors className="w-16 h-16 animate-bounce" style={{ color: `${rust}40` }} />
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold mb-3">
                      {storeName} Studio
                    </h2>
                    <p className="text-xs tracking-wider uppercase opacity-70">Authentic Handcrafted Treasures</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4 border-2 border-dashed bg-white/50" style={{ borderColor: `${rust}40`, color: rust }}>
                      <Play className="w-3.5 h-3.5 fill-current" /> Watch Workshop Process
                    </div>
                    <h2 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-6">
                      Artisan Craftsmanship
                    </h2>
                    <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: rust }}>
                      Shop Workshop
                    </a>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-6">
                      Made by<br />Hand
                    </h2>
                    <p className="text-sm max-w-md mx-auto mb-8 leading-relaxed" style={{ color: `${rust}80` }}>
                      Every piece is unique, crafted with care and passion. Support local artisans.
                    </p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: rust }}>
                      Browse Crafts
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 pt-6 pb-2">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide flex-wrap justify-center">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-5 py-2 rounded-full text-xs font-serif font-semibold transition-all border-2 border-dashed"
                  style={{
                    borderColor: `${rust}40`,
                    backgroundColor: !activeCategory ? rust : 'transparent',
                    color: !activeCategory ? '#ffffff' : rust,
                  }}
                >
                  All Crafts
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-5 py-2 rounded-full text-xs font-serif font-semibold transition-all border-2 border-dashed"
                    style={{
                      borderColor: `${rust}40`,
                      backgroundColor: activeCategory === cat ? rust : 'transparent',
                      color: activeCategory === cat ? '#ffffff' : rust,
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
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-xl overflow-hidden bg-white border-2 border-dashed hover:border-solid transition-all" style={{ borderColor: `${rust}20` }}>
                    <div className="aspect-square overflow-hidden" style={{ backgroundColor: '#F0E8DD' }}>
                      {getStoreProductImage(p) ? (
                        <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Scissors className="w-10 h-10" style={{ color: `${rust}20` }} />
                        </div>
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
              {displayProducts.length === 0 && (
                <div className="text-center py-20" style={{ color: `${rust}50` }}>
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm font-serif">No handmade items found matching search</p>
                </div>
              )}
            </ThemeLayout>
          </main>
        </>
      )}

      {/* Footer */}
      <footer className="border-t-2 border-dashed py-10 text-center" style={{ backgroundColor: tc.colors.footerBg, borderColor: `${rust}20` }}>
        <div className="max-w-7xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-4 flex flex-wrap items-center justify-center gap-4 text-xs font-medium" linkClassName="hover:underline" />
          <p className="text-xs" style={{ color: `${rust}60` }}>
            © {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" />
          </p>
        </div>
      </footer>
    </div>
  );
}
