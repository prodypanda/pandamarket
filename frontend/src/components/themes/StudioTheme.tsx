'use client';

import React, { useState } from 'react';
import { Camera, Search, Menu, X, Play } from 'lucide-react';
import Link from 'next/link';
import {
  type ThemeProps,
  useThemeCustomization,
  colorVars,
  formatStorePrice,
  getStoreProductImage,
  getStorefrontProductPath,
  getStoreBrandLogo,
  getLogoSurfaceForColor,
  getStoreThemeLogoSurface,
} from './shared';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';
import { StorefrontSocialLinks } from './StorefrontSocialLinks';

/** Studio Theme — Photography/art portfolio style, gallery-focused layout. */
export function StudioTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const accent = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allProducts = products.length > 0 ? products : [
    { id: '1', title: 'Fine Art Print — Sunset', price: 180, images: [], category: 'Prints' },
    { id: '2', title: 'Canvas — Abstract Blue', price: 350, images: [], category: 'Canvas' },
    { id: '3', title: 'Photo Book — Tunisia', price: 95, images: [], category: 'Books' },
    { id: '4', title: 'Framed — Medina Doors', price: 250, images: [], category: 'Framed' },
    { id: '5', title: 'Digital Download Pack', price: 45, images: [], category: 'Digital' },
    { id: '6', title: 'Limited Edition — Coast', price: 520, images: [], category: 'Limited' },
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

  const headerTextColor = getLogoSurfaceForColor(tc.colors.headerBg) === 'dark' ? '#FFFFFF' : tc.colors.text;

  return (
    <div className={`${theme.typography.fontFamily} min-h-screen flex flex-col`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 z-40 backdrop-blur-md" style={{ backgroundColor: tc.colors.headerBg, color: headerTextColor }}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href={branding?.store_path_base || '/'}>
              {logoUrl ? <img src={logoUrl} alt={storeName} className="h-10 object-contain" /> : (
                <div className="flex items-center gap-3"><Camera className="w-5 h-5" style={{ color: accent }} /><h1 className="text-xl font-medium tracking-wide">{storeName}</h1></div>
              )}
            </Link>
          </div>

          {/* Header Search */}
          <div className="hidden sm:flex items-center flex-1 max-w-xs mx-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gallery..."
              className="w-full py-1.5 pl-9 pr-4 text-xs rounded-full border border-gray-200 focus:outline-none"
              style={{ backgroundColor: tc.colors.background, color: tc.colors.text }}
            />
            <Search className="w-4 h-4 absolute left-3 text-gray-400" />
          </div>

          <nav className="hidden md:flex gap-8 text-sm text-gray-500">
            <a href="#products" className="hover:text-gray-900 transition-colors">Gallery</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:text-gray-900 transition-colors">About</Link>
            <Link href="/hub/login" className="hover:text-gray-900 transition-colors">Connexion</Link>
          </nav>
          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={accent} iconColor="#9CA3AF" className="inline-flex items-center transition-colors hover:text-gray-700" />
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm h-full flex flex-col justify-between p-6 bg-white text-gray-900 z-10 overflow-y-auto shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <span className="font-medium text-lg tracking-wide">{storeName}</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 opacity-70 hover:opacity-100" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search gallery..."
                  className="w-full py-2 pl-9 pr-4 text-xs rounded-full border border-gray-200"
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              </div>

              <nav className="flex flex-col gap-3 py-3 text-sm text-gray-600 border-b border-gray-100">
                <Link href={branding?.store_path_base || '/'} onClick={() => setMobileMenuOpen(false)} className="hover:text-gray-900">Home</Link>
                <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:text-gray-900">Gallery</a>
                <Link href={`${branding?.store_path_base || ''}/pages/about`} onClick={() => setMobileMenuOpen(false)} className="hover:text-gray-900">About</Link>
                <Link href="/hub/login" onClick={() => setMobileMenuOpen(false)} className="hover:text-gray-900">Connexion</Link>
              </nav>

              {categories.length > 0 && (
                <div className="py-4">
                  <p className="text-xs uppercase tracking-widest font-medium text-gray-400 mb-2">Categories</p>
                  <div className="flex flex-col gap-1 text-sm">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`text-left py-1.5 px-3 rounded-lg ${!activeCategory ? 'font-semibold text-gray-900 bg-gray-100' : 'text-gray-600'}`}
                    >
                      All Works
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`text-left py-1.5 px-3 rounded-lg ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'font-semibold text-gray-900 bg-gray-100' : 'text-gray-600'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 text-xs">
              <StorefrontSocialLinks branding={branding} showContact className="flex flex-col gap-2 text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {children ? (
        <main className="py-8 flex-1">{children}</main>
      ) : (
        <div className="flex-1">
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="py-20 text-center">
              {tc.heroStyle === 'split' ? (
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-center text-left">
                  <div>
                    <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: accent }}>Portfolio & Shop</p>
                    <h2 className="text-4xl md:text-5xl font-light leading-tight mb-6">Art Meets<br /><span className="font-bold" style={{ color: accent }}>Commerce</span></h2>
                    <p className="text-sm text-gray-500 mb-8 max-w-md">Original works and limited editions. Each piece tells a story.</p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>View Gallery</a>
                  </div>
                  <div className="aspect-[4/3] rounded-xl bg-gray-100 flex items-center justify-center">
                    <Camera className="w-16 h-16 text-gray-300" strokeWidth={1} />
                  </div>
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className="max-w-3xl mx-auto px-6 py-4">
                  <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: accent }}>Portfolio & Shop</p>
                  <h2 className="text-2xl font-light">{storeName}</h2>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="max-w-3xl mx-auto px-6">
                  <div className="aspect-video rounded-xl bg-gray-100 flex items-center justify-center mb-6">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: accent }}>
                      <Play className="w-6 h-6 ml-1" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-light mb-2">Behind the Lens</h2>
                </div>
              ) : (
                <>
                  <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: accent }}>Portfolio & Shop</p>
                  <h2 className="text-4xl md:text-6xl font-light leading-tight mb-6">Art Meets<br /><span className="font-bold" style={{ color: accent }}>Commerce</span></h2>
                  <p className="text-sm text-gray-500 max-w-md mx-auto mb-8">Original works and limited editions. Each piece tells a story.</p>
                  <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>View Gallery</a>
                </>
              )}
            </section>
          )}

          {/* Products Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
            {/* Category Filter Tabs */}
            {categories.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: !activeCategory ? accent : 'transparent',
                    color: !activeCategory ? '#FFFFFF' : tc.colors.text,
                    border: !activeCategory ? 'none' : '1px solid rgba(156,163,175,0.3)',
                  }}
                >
                  All Works
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      backgroundColor: activeCategory.toLowerCase() === cat.toLowerCase() ? accent : 'transparent',
                      color: activeCategory.toLowerCase() === cat.toLowerCase() ? '#FFFFFF' : tc.colors.text,
                      border: activeCategory.toLowerCase() === cat.toLowerCase() ? 'none' : '1px solid rgba(156,163,175,0.3)',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className={`grid ${tc.gridClasses}`}>
              {displayProducts.map((p) => (
                <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all">
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                    {getStoreProductImage(p) ? <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera className="w-10 h-10" strokeWidth={1} /></div>
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

            {displayProducts.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Camera className="w-12 h-12 mx-auto mb-4 text-gray-300" strokeWidth={1} />
                <p className="text-sm">No artworks found</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 py-10 text-center" style={{ backgroundColor: tc.colors.footerBg }}>
        <div className="max-w-7xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-4 flex flex-wrap justify-center gap-4 text-xs text-gray-500" linkClassName="hover:underline" />
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" /></p>
        </div>
      </footer>
    </div>
  );
}
