'use client';

import React, { useState } from 'react';
import { Diamond, Search, Menu, X, Play, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath, getStoreBrandLogo, getLogoSurfaceForColor, getStoreThemeLogoSurface } from './shared';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';
import { StorefrontSocialLinks } from './StorefrontSocialLinks';
import { ThemeLayout } from './ThemeLayout';

/** Luxe Theme — High-end jewelry/watches, dark with gold accents. */
export function LuxeTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const gold = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const allProducts = products.length > 0 ? products : [
    { id: '1', title: 'Diamond Pendant', price: 2800, images: [], category: 'Necklaces' },
    { id: '2', title: 'Swiss Chronograph', price: 4500, images: [], category: 'Watches' },
    { id: '3', title: 'Gold Cuff Bracelet', price: 1200, images: [], category: 'Bracelets' },
    { id: '4', title: 'Sapphire Ring', price: 3200, images: [], category: 'Rings' },
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
      <header className="border-b relative z-20" style={{ backgroundColor: tc.colors.headerBg, borderColor: `${gold}20` }}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Toggle menu"
              style={{ color: gold }}
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href={branding?.store_path_base || '/'} className="inline-block">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-10 object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <Diamond className="w-5 h-5 hidden sm:block" style={{ color: gold }} />
                  <h1 className="text-xl sm:text-2xl font-serif font-light tracking-[0.25em] uppercase">{storeName}</h1>
                  <Diamond className="w-5 h-5 hidden sm:block" style={{ color: gold }} />
                </div>
              )}
            </Link>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xs lg:max-w-md mx-6 relative">
            <input
              type="text"
              placeholder="Search catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 px-4 pr-10 text-xs tracking-wider rounded-full border bg-white/5 focus:outline-none focus:border-gold transition-colors"
              style={{ borderColor: `${gold}30`, color: tc.colors.text }}
            />
            <Search className="w-4 h-4 absolute right-3 top-2.5 pointer-events-none" style={{ color: gold }} />
          </div>

          <div className="flex items-center gap-6">
            <Link href="/hub/login" className="hidden sm:inline text-xs tracking-[0.2em] uppercase font-medium hover:opacity-70 transition-opacity" style={{ color: gold }}>
              Account
            </Link>
            <StorefrontThemeCartLink
              storeId={branding?.store_id}
              storeHost={branding?.store_host}
              storePathBase={branding?.store_path_base}
              primaryColor={gold}
              iconColor={gold}
              className="inline-flex items-center hover:opacity-70 transition-opacity"
            />
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] border-r shadow-2xl p-6 overflow-y-auto flex flex-col justify-between" style={{ backgroundColor: tc.colors.headerBg, borderColor: `${gold}30`, color: tc.colors.text }}>
            <div>
              <div className="flex items-center justify-between pb-6 border-b" style={{ borderColor: `${gold}20` }}>
                <span className="font-serif font-light tracking-[0.2em] uppercase text-sm" style={{ color: gold }}>{storeName}</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:opacity-70" aria-label="Close menu">
                  <X className="w-6 h-6" style={{ color: gold }} />
                </button>
              </div>

              <div className="py-6 border-b" style={{ borderColor: `${gold}20` }}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search catalog..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2 px-3 pr-9 text-xs rounded-md border bg-white/5 focus:outline-none"
                    style={{ borderColor: `${gold}30`, color: tc.colors.text }}
                  />
                  <Search className="w-4 h-4 absolute right-2.5 top-2.5" style={{ color: gold }} />
                </div>
              </div>

              <nav className="py-6 space-y-4">
                <Link href={branding?.store_path_base || '/'} className="block text-xs uppercase tracking-[0.2em] font-medium hover:opacity-70" style={{ color: gold }} onClick={() => setMobileMenuOpen(false)}>
                  Home
                </Link>
                <a href="#products" className="block text-xs uppercase tracking-[0.2em] font-medium hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  Collections
                </a>
                <Link href={`${branding?.store_path_base || ''}/pages/about`} className="block text-xs uppercase tracking-[0.2em] font-medium hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  About Us
                </Link>
                <Link href={`${branding?.store_path_base || ''}/pages/contact`} className="block text-xs uppercase tracking-[0.2em] font-medium hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  Contact
                </Link>
                <Link href="/hub/login" className="block text-xs uppercase tracking-[0.2em] font-medium hover:opacity-70" style={{ color: gold }} onClick={() => setMobileMenuOpen(false)}>
                  Account Login
                </Link>
              </nav>

              {categories.length > 0 && (
                <div className="py-4 border-t" style={{ borderColor: `${gold}20` }}>
                  <p className="text-[10px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: gold }}>Categories</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`block w-full text-left text-xs uppercase tracking-wider ${!activeCategory ? 'font-bold' : 'opacity-70'}`}
                      style={{ color: !activeCategory ? gold : tc.colors.text }}
                    >
                      All Collections
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`block w-full text-left text-xs uppercase tracking-wider ${activeCategory === cat ? 'font-bold' : 'opacity-70'}`}
                        style={{ color: activeCategory === cat ? gold : tc.colors.text }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t" style={{ borderColor: `${gold}20` }}>
              <StorefrontSocialLinks branding={branding} showContact className="flex flex-col gap-2 text-xs opacity-80" linkClassName="hover:underline" />
            </div>
          </div>
        </div>
      )}

      {children ? (
        <main className="py-8 max-w-7xl mx-auto px-6">{children}</main>
      ) : (
        <>
          {/* Hero Section */}
          {tc.heroStyle !== 'none' && (
            <section className="py-20 md:py-28 text-center relative overflow-hidden" style={{ backgroundColor: tc.heroStyle === 'banner' ? `${gold}08` : 'transparent' }}>
              <div className="max-w-4xl mx-auto px-6 relative z-10">
                <p className="text-xs tracking-[0.4em] uppercase mb-6" style={{ color: gold }}>Haute Joaillerie</p>
                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-10 items-center text-left">
                    <div>
                      <h2 className="text-4xl md:text-6xl font-serif font-light tracking-wide leading-tight mb-6">
                        Eternal <br /><span style={{ color: gold }}>Brilliance</span>
                      </h2>
                      <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                        Exceptional craftsmanship. Timeless elegance. Each piece, a masterwork curated for discerning tastes.
                      </p>
                      <a href="#products" className="inline-block px-8 py-3.5 text-xs tracking-[0.25em] uppercase font-medium border transition-all hover:bg-white/5" style={{ borderColor: gold, color: gold }}>
                        Explore Catalog
                      </a>
                    </div>
                    <div className="aspect-square rounded-xl border flex items-center justify-center bg-white/5" style={{ borderColor: `${gold}30` }}>
                      <Diamond className="w-20 h-20 animate-pulse" style={{ color: `${gold}40` }} strokeWidth={1} />
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div>
                    <h2 className="text-3xl md:text-4xl font-serif font-light tracking-widest uppercase mb-4" style={{ color: gold }}>
                      {storeName}
                    </h2>
                    <p className="text-xs tracking-[0.2em] text-gray-400 uppercase">Curated Luxury & Timepieces</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs tracking-widest uppercase mb-6" style={{ borderColor: `${gold}40`, color: gold }}>
                      <Play className="w-3 h-3 fill-current" /> Watch Brand Film
                    </div>
                    <h2 className="text-4xl md:text-6xl font-serif font-light tracking-wide leading-tight mb-6">
                      Timeless Excellence
                    </h2>
                    <a href="#products" className="inline-block px-10 py-4 text-xs tracking-[0.25em] uppercase font-medium border transition-all hover:bg-white/5" style={{ borderColor: gold, color: gold }}>
                      View Collection
                    </a>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-4xl md:text-7xl font-serif font-light tracking-wide leading-tight mb-8">
                      Eternal<br />Brilliance
                    </h2>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto mb-10 leading-relaxed">
                      Exceptional craftsmanship. Timeless elegance. Each piece, a masterwork.
                    </p>
                    <a href="#products" className="inline-block px-12 py-4 text-xs tracking-[0.25em] uppercase font-medium border transition-all hover:bg-white/5" style={{ borderColor: gold, color: gold }}>
                      Discover
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Category Filter Pills/Tabs */}
          {categories.length > 0 && (
            <div className="max-w-6xl mx-auto px-6 pt-6 pb-2">
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide justify-center flex-wrap">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-5 py-2 text-xs uppercase tracking-[0.2em] border transition-all"
                  style={{
                    borderColor: gold,
                    backgroundColor: !activeCategory ? gold : 'transparent',
                    color: !activeCategory ? tc.colors.background : gold,
                  }}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-5 py-2 text-xs uppercase tracking-[0.2em] border transition-all"
                    style={{
                      borderColor: gold,
                      backgroundColor: activeCategory === cat ? gold : 'transparent',
                      color: activeCategory === cat ? tc.colors.background : gold,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Product Section */}
          <main id="products" className="max-w-6xl mx-auto px-6 pb-32">
            <ThemeLayout variation={tc.layoutVariation} layout={tc.layout} colors={tc.colors} categories={categories} activeCategory={activeCategory}>
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p) => (
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block">
                    <div className="aspect-square overflow-hidden mb-6 relative border" style={{ backgroundColor: '#1A1A1A', borderColor: `${gold}20` }}>
                      {getStoreProductImage(p) ? (
                        <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Diamond className="w-12 h-12" style={{ color: `${gold}20` }} strokeWidth={1} />
                        </div>
                      )}
                    </div>
                    {p.category && <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: gold }}>{p.category}</p>}
                    <h3 className="text-lg font-serif font-light tracking-wide">{p.title}</h3>
                    <p className="text-sm mt-2" style={{ color: gold }}>{formatStorePrice(p)}</p>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20" style={{ color: `${gold}60` }}>
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-xs uppercase tracking-widest">No luxury items found</p>
                </div>
              )}
            </ThemeLayout>
          </main>
        </>
      )}

      {/* Footer */}
      <footer className="border-t py-12 text-center" style={{ backgroundColor: tc.colors.footerBg, borderColor: `${gold}15` }}>
        <div className="max-w-6xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-6 flex flex-wrap items-center justify-center gap-4 text-xs tracking-wider" linkClassName="hover:underline" />
          <p className="text-xs tracking-wide text-gray-500">
            © {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="hover:underline" linkStyle={{ color: gold }} />
          </p>
        </div>
      </footer>
    </div>
  );
}
