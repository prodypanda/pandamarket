'use client';

import React, { useState } from 'react';
import { ShoppingBag, Zap, ChevronRight, Cpu, Search, Menu, X, Play } from 'lucide-react';
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

/**
 * TechHub Theme — Electronics, gadgets, tech products.
 * Dark background, cyan/electric blue accents, sharp edges,
 * grid-based layout with spec-card style product cards.
 */
export function TechHubTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const accentColor = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Wireless Pro Earbuds', price: 189, images: [], category: 'Audio' },
        { id: '2', title: 'Mechanical Keyboard RGB', price: 350, images: [], category: 'Peripherals' },
        { id: '3', title: 'Ultra-Wide Monitor 34"', price: 1200, images: [], category: 'Displays' },
        { id: '4', title: 'Gaming Mouse 16K DPI', price: 95, images: [], category: 'Peripherals' },
        { id: '5', title: 'USB-C Hub 12-in-1', price: 75, images: [], category: 'Accessories' },
        { id: '6', title: 'Portable SSD 2TB', price: 280, images: [], category: 'Storage' },
        { id: '7', title: 'Webcam 4K HDR', price: 165, images: [], category: 'Video' },
        { id: '8', title: 'Smart LED Strip 5m', price: 55, images: [], category: 'Lighting' },
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
      <header className="border-b border-white/5 sticky top-0 z-40 backdrop-blur-xl" style={{ backgroundColor: tc.colors.headerBg, color: headerTextColor }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-gray-400 hover:text-white focus:outline-none"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link href={branding?.store_path_base || '/'} className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-8 object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <Cpu className="w-6 h-6" style={{ color: accentColor }} />
                  <span className="text-lg font-bold tracking-tight" style={{ color: headerTextColor }}>{storeName}</span>
                </div>
              )}
            </Link>
          </div>

          {/* Search bar */}
          <div className="hidden sm:flex items-center flex-1 max-w-md mx-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un produit tech..."
              className="w-full py-1.5 pl-9 pr-4 text-sm rounded-lg bg-white/5 border border-white/10 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              style={{ color: headerTextColor }}
            />
            <Search className="w-4 h-4 absolute left-3 text-gray-500" />
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium opacity-80">
            <a href="#products" className="hover:opacity-100 transition-opacity">Produits</a>
            <Link href={`${branding?.store_path_base || ''}/pages/support`} className="hover:opacity-100 transition-opacity">Support</Link>
            <Link href="/hub/login" className="hover:opacity-100 transition-opacity">Connexion</Link>
          </nav>

          <div className="flex items-center gap-4">
            <a
              href="#products"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
              style={{ backgroundColor: accentColor, color: '#0A0A0A' }}
            >
              <Zap className="w-4 h-4" />
              Deals
            </a>
            <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={accentColor} iconColor={headerTextColor} badgeTextColor="#0A0A0A" className="inline-flex items-center transition-colors hover:opacity-80" icon="cart" />
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm h-full flex flex-col justify-between p-6 shadow-2xl z-10 overflow-y-auto border-r border-white/10" style={{ backgroundColor: tc.colors.headerBg, color: headerTextColor }}>
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <Link href={branding?.store_path_base || '/'} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt={storeName} className="h-7 object-contain" />
                  ) : (
                    <span className="font-bold text-lg">{storeName}</span>
                  )}
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 opacity-70 hover:opacity-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Search */}
              <div className="my-4 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full py-2 pl-9 pr-4 text-sm rounded-lg bg-white/5 border border-white/10 placeholder-gray-500"
                  style={{ color: headerTextColor }}
                />
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
              </div>

              {/* Mobile Nav Links */}
              <nav className="flex flex-col gap-4 py-4 text-sm font-medium border-b border-white/10">
                <Link href={branding?.store_path_base || '/'} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-80">Accueil</Link>
                <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-80">Produits</a>
                <Link href={`${branding?.store_path_base || ''}/pages/support`} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-80">Support</Link>
                <Link href="/hub/login" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-80">Connexion</Link>
              </nav>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="py-4 border-b border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3 opacity-60">Catégories</p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`text-left text-sm py-1.5 px-3 rounded-md transition-colors ${!activeCategory ? 'bg-white/10 font-bold' : 'opacity-70 hover:opacity-100'}`}
                    >
                      Toutes les catégories
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`text-left text-sm py-1.5 px-3 rounded-md transition-colors ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'bg-white/10 font-bold' : 'opacity-70 hover:opacity-100'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Contact Footer */}
            <div className="pt-6 border-t border-white/10 text-xs">
              <StorefrontSocialLinks branding={branding} showContact linkClassName="block opacity-70 hover:opacity-100 py-1" />
            </div>
          </div>
        </div>
      )}

      {/* Body Content */}
      {children ? (
        <main className="py-8 flex-1">{children}</main>
      ) : (
        <div className="flex-1">
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[150px] opacity-10"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
              <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                      <div
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border"
                        style={{ borderColor: `${accentColor}40`, color: accentColor, backgroundColor: `${accentColor}10` }}
                      >
                        <Zap className="w-3 h-3" />
                        Nouveautés Tech
                      </div>
                      <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
                        La tech de <span style={{ color: accentColor }}>demain</span>
                      </h2>
                      <p className="text-base opacity-70 leading-relaxed mb-8">
                        Découvrez notre sélection de produits tech haute performance.
                      </p>
                      <a
                        href="#products"
                        className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-bold transition-all"
                        style={{ backgroundColor: accentColor, color: '#0A0A0A' }}
                      >
                        Explorer le catalogue
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 flex items-center justify-center aspect-video">
                      <Cpu className="w-24 h-24" style={{ color: `${accentColor}60` }} />
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div className="text-center py-6">
                    <h2 className="text-3xl font-bold mb-2">{storeName}</h2>
                    <p className="text-sm opacity-70">Électronique & High-Tech High Performance</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div className="text-center max-w-3xl mx-auto">
                    <div className="relative aspect-video rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center mb-8">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: accentColor, color: '#0A0A0A' }}>
                        <Play className="w-8 h-8 fill-current ml-1" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Démonstration Produit</h2>
                    <a
                      href="#products"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold"
                      style={{ backgroundColor: accentColor, color: '#0A0A0A' }}
                    >
                      Voir la boutique
                    </a>
                  </div>
                ) : (
                  <div className="max-w-2xl">
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border"
                      style={{ borderColor: `${accentColor}40`, color: accentColor, backgroundColor: `${accentColor}10` }}
                    >
                      <Zap className="w-3 h-3" />
                      Nouveautés Tech
                    </div>
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
                      La tech de<br />
                      <span style={{ color: accentColor }}>demain</span>,<br />
                      disponible aujourd&apos;hui
                    </h2>
                    <p className="text-base opacity-70 leading-relaxed mb-8 max-w-lg">
                      Découvrez notre sélection de produits tech haute performance.
                    </p>
                    <a
                      href="#products"
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-bold transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                      style={{ backgroundColor: accentColor, color: '#0A0A0A' }}
                    >
                      Explorer le catalogue
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Products Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
            {/* Category Filter Tabs */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8">
                <button
                  onClick={() => setActiveCategory('')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    !activeCategory
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                  }`}
                >
                  Tous
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      activeCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold">Tous les produits</h3>
              <span className="text-sm opacity-60">{displayProducts.length} articles</span>
            </div>

            <div className={`grid ${tc.gridClasses}`}>
              {displayProducts.map((p) => (
                <Link
                  key={p.id}
                  href={getStorefrontProductPath(p, branding?.store_path_base)}
                  className="group block rounded-lg overflow-hidden border border-white/5 hover:border-white/15 transition-all duration-300"
                  style={{ backgroundColor: '#111111' }}
                >
                  <div className="aspect-square overflow-hidden bg-[#1A1A1A] relative">
                    {getStoreProductImage(p) ? (
                      <img
                        src={getStoreProductImage(p)}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: `${accentColor}20` }}>
                        <ShoppingBag className="w-10 h-10" />
                      </div>
                    )}
                    {p.category && (
                      <span
                        className="absolute top-3 left-3 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                      >
                        {p.category}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-white line-clamp-1 mb-2">{p.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: accentColor }}>
                        {formatStorePrice(p)}
                      </span>
                      <span
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium px-2 py-1 rounded"
                        style={{ backgroundColor: accentColor, color: '#0A0A0A' }}
                      >
                        Voir
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {displayProducts.length === 0 && (
              <div className="text-center py-20 opacity-50">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm">Aucun produit trouvé</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 text-center" style={{ backgroundColor: tc.colors.footerBg }}>
        <div className="max-w-7xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-4 flex flex-wrap justify-center gap-4 text-xs" linkClassName="opacity-70 hover:opacity-100 transition-opacity" />
          <p className="text-xs opacity-60">
            © {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" />
          </p>
        </div>
      </footer>
    </div>
  );
}
