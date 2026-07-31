'use client';

import React, { useState } from 'react';
import { Download, Code2, Search, Menu, X, Play, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath, getStoreBrandLogo, getLogoSurfaceForColor, getStoreThemeLogoSurface } from './shared';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';
import { StorefrontSocialLinks } from './StorefrontSocialLinks';
import { ThemeLayout } from './ThemeLayout';

/** Digital Theme — Software/SaaS products, gradient backgrounds, modern. */
export function DigitalTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const accent = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const allProducts = products.length > 0 ? products : [
    { id: '1', title: 'UI Kit Pro', price: 89, images: [], category: 'Design' },
    { id: '2', title: 'Icon Pack 2000+', price: 35, images: [], category: 'Icons' },
    { id: '3', title: 'WordPress Theme', price: 59, images: [], category: 'Themes' },
    { id: '4', title: 'React Component Library', price: 149, images: [], category: 'Code' },
    { id: '5', title: 'Stock Photo Bundle', price: 45, images: [], category: 'Photos' },
    { id: '6', title: 'Font Family Pack', price: 29, images: [], category: 'Fonts' },
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
      <header className="border-b border-white/5 relative z-20" style={{ backgroundColor: tc.colors.headerBg }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-300"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" style={{ color: accent }} />
            </button>
            <Link href={branding?.store_path_base || '/'}>
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-8 object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" style={{ color: accent }} />
                  <h1 className="text-lg font-bold text-white">{storeName}</h1>
                </div>
              )}
            </Link>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex flex-1 max-w-xs lg:max-w-md mx-6 relative">
            <input
              type="text"
              placeholder="Search digital assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-1.5 px-4 pr-10 text-xs rounded-full border border-white/10 bg-white/5 focus:outline-none focus:border-white/30 text-white placeholder-gray-500"
            />
            <Search className="w-4 h-4 absolute right-3 top-2 pointer-events-none" style={{ color: accent }} />
          </div>

          <nav className="hidden lg:flex gap-6 text-sm text-gray-400">
            <a href="#products" className="hover:text-white transition-colors">Products</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:text-white transition-colors">About</Link>
            <Link href="/hub/login" className="hover:text-white transition-colors" style={{ color: accent }}>Developer Login</Link>
          </nav>

          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={accent} iconColor="#9CA3AF" className="inline-flex items-center transition-colors hover:text-white" />
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] shadow-2xl p-6 overflow-y-auto flex flex-col justify-between border-r border-white/10" style={{ backgroundColor: tc.colors.headerBg, color: tc.colors.text }}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="font-bold text-lg text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5" style={{ color: accent }} />
                  {storeName}
                </span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:opacity-70 text-gray-400" aria-label="Close menu">
                  <X className="w-6 h-6" style={{ color: accent }} />
                </button>
              </div>

              <div className="py-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2 px-3 pr-9 text-xs rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none"
                  />
                  <Search className="w-4 h-4 absolute right-2.5 top-2.5" style={{ color: accent }} />
                </div>
              </div>

              <nav className="py-4 space-y-3 text-sm text-gray-300">
                <Link href={branding?.store_path_base || '/'} className="block hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                  Home
                </Link>
                <a href="#products" className="block hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                  Digital Catalog
                </a>
                <Link href={`${branding?.store_path_base || ''}/pages/about`} className="block hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                  About
                </Link>
                <Link href={`${branding?.store_path_base || ''}/pages/contact`} className="block hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                  Contact
                </Link>
                <Link href="/hub/login" className="block font-semibold" style={{ color: accent }} onClick={() => setMobileMenuOpen(false)}>
                  Login
                </Link>
              </nav>

              {categories.length > 0 && (
                <div className="py-4 border-t border-white/10">
                  <p className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: accent }}>Categories</p>
                  <div className="space-y-2 text-sm">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`block w-full text-left ${!activeCategory ? 'font-bold text-white' : 'text-gray-400'}`}
                    >
                      All Digital Assets
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`block w-full text-left ${activeCategory === cat ? 'font-bold text-white' : 'text-gray-400'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-white/10">
              <StorefrontSocialLinks branding={branding} showContact className="flex flex-col gap-2 text-xs text-gray-400" linkClassName="hover:text-white transition-colors" />
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
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border border-white/10 bg-white/5 text-gray-300">
                      <Play className="w-3.5 h-3.5 fill-current text-white" /> Demo Video Preview
                    </div>
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
                        <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 text-center" style={{ backgroundColor: tc.colors.footerBg }}>
        <div className="max-w-7xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-4 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400" linkClassName="hover:text-white transition-colors" />
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" />
          </p>
        </div>
      </footer>
    </div>
  );
}
