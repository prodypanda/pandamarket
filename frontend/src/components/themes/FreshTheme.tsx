'use client';

import React, { useState } from 'react';
import { ShoppingBag, Apple, Search, Menu, X, Play } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath, getStoreBrandLogo, getLogoSurfaceForColor, getStoreThemeLogoSurface } from './shared';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';
import { StorefrontSocialLinks } from './StorefrontSocialLinks';
import { ThemeLayout } from './ThemeLayout';

/** Fresh Theme — Grocery/health food, bright greens and whites. */
export function FreshTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const fresh = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const allProducts = products.length > 0 ? products : [
    { id: '1', title: 'Organic Honey 500g', price: 28, images: [], category: 'Pantry' },
    { id: '2', title: 'Cold-Pressed Juice Pack', price: 35, images: [], category: 'Drinks' },
    { id: '3', title: 'Granola Mix 1kg', price: 22, images: [], category: 'Breakfast' },
    { id: '4', title: 'Dried Fruit Assortment', price: 18, images: [], category: 'Snacks' },
    { id: '5', title: 'Protein Bar Box (12)', price: 45, images: [], category: 'Fitness' },
    { id: '6', title: 'Herbal Supplement Pack', price: 55, images: [], category: 'Wellness' },
    { id: '7', title: 'Almond Butter Jar', price: 32, images: [], category: 'Pantry' },
    { id: '8', title: 'Matcha Powder 100g', price: 40, images: [], category: 'Drinks' },
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
      <div className="text-center py-2 text-xs font-semibold text-white" style={{ backgroundColor: fresh }}>🌿 Free delivery on orders over 50 TND</div>

      {/* Header */}
      <header className="border-b relative z-20" style={{ backgroundColor: tc.colors.headerBg, borderColor: `${fresh}15` }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-black/5 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" style={{ color: fresh }} />
            </button>
            <Link href={branding?.store_path_base || '/'}>
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-10 object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <Apple className="w-5 h-5" style={{ color: fresh }} />
                  <h1 className="text-xl font-bold">{storeName}</h1>
                </div>
              )}
            </Link>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex flex-1 max-w-xs lg:max-w-md mx-6 relative">
            <input
              type="text"
              placeholder="Search organic products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 px-4 pr-10 text-xs rounded-full border bg-white focus:outline-none"
              style={{ borderColor: `${fresh}30`, color: tc.colors.text }}
            />
            <Search className="w-4 h-4 absolute right-3 top-2.5 pointer-events-none" style={{ color: fresh }} />
          </div>

          <nav className="hidden lg:flex gap-6 text-sm font-medium" style={{ color: `${tc.colors.text}80` }}>
            <a href="#products" className="hover:opacity-70 transition-opacity">All Products</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-70 transition-opacity">About Us</Link>
            <Link href="/hub/login" className="hover:opacity-70 transition-opacity">Login</Link>
          </nav>

          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={fresh} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white" label="Cart" />
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] shadow-2xl p-6 overflow-y-auto flex flex-col justify-between" style={{ backgroundColor: tc.colors.headerBg, color: tc.colors.text }}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: `${fresh}20` }}>
                <span className="font-bold text-lg flex items-center gap-2">
                  <Apple className="w-5 h-5" style={{ color: fresh }} />
                  {storeName}
                </span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:opacity-70" aria-label="Close menu">
                  <X className="w-6 h-6" style={{ color: fresh }} />
                </button>
              </div>

              <div className="py-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search organic products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2 px-3 pr-9 text-xs rounded-lg border bg-white focus:outline-none"
                    style={{ borderColor: `${fresh}30`, color: tc.colors.text }}
                  />
                  <Search className="w-4 h-4 absolute right-2.5 top-2.5" style={{ color: fresh }} />
                </div>
              </div>

              <nav className="py-4 space-y-3 font-medium text-sm">
                <Link href={branding?.store_path_base || '/'} className="block hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  Home
                </Link>
                <a href="#products" className="block hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  Shop Catalog
                </a>
                <Link href={`${branding?.store_path_base || ''}/pages/about`} className="block hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  About Us
                </Link>
                <Link href={`${branding?.store_path_base || ''}/pages/contact`} className="block hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  Contact
                </Link>
                <Link href="/hub/login" className="block font-semibold" style={{ color: fresh }} onClick={() => setMobileMenuOpen(false)}>
                  Customer Login
                </Link>
              </nav>

              {categories.length > 0 && (
                <div className="py-4 border-t" style={{ borderColor: `${fresh}20` }}>
                  <p className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: fresh }}>Categories</p>
                  <div className="space-y-2 text-sm">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`block w-full text-left ${!activeCategory ? 'font-bold' : 'opacity-80'}`}
                      style={{ color: !activeCategory ? fresh : tc.colors.text }}
                    >
                      All Products
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`block w-full text-left ${activeCategory === cat ? 'font-bold' : 'opacity-80'}`}
                        style={{ color: activeCategory === cat ? fresh : tc.colors.text }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t" style={{ borderColor: `${fresh}20` }}>
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
            <section className="py-16 text-center relative" style={{ backgroundColor: tc.colors.secondary }}>
              <div className="max-w-4xl mx-auto px-6">
                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-8 items-center text-left">
                    <div>
                      <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
                        Eat <span style={{ color: fresh }}>Fresh</span>,<br />Live Well
                      </h2>
                      <p className="text-sm text-gray-500 mb-6">
                        Premium organic and natural products delivered directly to your door with guaranteed freshness.
                      </p>
                      <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: fresh }}>
                        Shop Now
                      </a>
                    </div>
                    <div className="aspect-video rounded-2xl flex items-center justify-center bg-white shadow-sm border border-green-100">
                      <Apple className="w-16 h-16 animate-bounce" style={{ color: fresh }} />
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-2">
                      Fresh & Organic Essentials
                    </h2>
                    <p className="text-sm text-gray-500">Handpicked organic products for your everyday healthy lifestyle.</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4 bg-white shadow-sm" style={{ color: fresh }}>
                      <Play className="w-3.5 h-3.5 fill-current" /> Farm to Table Story
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                      Pure & Organic Harvest
                    </h2>
                    <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: fresh }}>
                      Explore Products
                    </a>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                      Eat <span style={{ color: fresh }}>Fresh</span>,<br />Live Well
                    </h2>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mb-8">
                      Premium organic and natural products delivered to your door.
                    </p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: fresh }}>
                      Shop Now
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 pt-8 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-wrap justify-center">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                  style={{
                    backgroundColor: !activeCategory ? fresh : tc.colors.secondary,
                    color: !activeCategory ? '#ffffff' : tc.colors.text,
                  }}
                >
                  All Products
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                    style={{
                      backgroundColor: activeCategory === cat ? fresh : tc.colors.secondary,
                      color: activeCategory === cat ? '#ffffff' : tc.colors.text,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Product Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 py-12">
            <ThemeLayout variation={tc.layoutVariation} layout={tc.layout} colors={tc.colors} categories={categories} activeCategory={activeCategory}>
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p) => (
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-xl overflow-hidden border hover:shadow-md transition-all" style={{ backgroundColor: tc.colors.headerBg, borderColor: `${fresh}15` }}>
                    <div className="aspect-square overflow-hidden" style={{ backgroundColor: tc.colors.secondary }}>
                      {getStoreProductImage(p) ? (
                        <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-green-200" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: fresh }}>{p.category}</p>}
                      <h3 className="text-sm font-semibold line-clamp-1">{p.title}</h3>
                      <p className="text-sm font-bold mt-1" style={{ color: fresh }}>{formatStorePrice(p)}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm font-medium">No fresh products found matching your search</p>
                </div>
              )}
            </ThemeLayout>
          </main>
        </>
      )}

      {/* Footer */}
      <footer className="border-t py-8 text-center" style={{ backgroundColor: tc.colors.footerBg, borderColor: `${fresh}15` }}>
        <div className="max-w-7xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-4 flex flex-wrap items-center justify-center gap-3 text-xs" linkClassName="font-semibold hover:underline" />
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" />
          </p>
        </div>
      </footer>
    </div>
  );
}
