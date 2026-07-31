'use client';

import React, { useState } from 'react';
import { ShoppingBag, UtensilsCrossed, Clock, Flame, Search, Menu, X, Play, ChevronRight } from 'lucide-react';
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
 * Flavor Theme — Food, restaurants, bakeries, gourmet products.
 * Warm off-white background, burnt orange/terracotta accent,
 * bold typography, appetizing card layout with rounded corners.
 */
export function FlavorTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const accentColor = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allProducts = products.length > 0 ? products : [
    { id: '1', title: 'Coffret Pâtisseries Fines', price: 45, images: [], category: 'Pâtisserie' },
    { id: '2', title: 'Huile d\'Olive Extra Vierge', price: 32, images: [], category: 'Épicerie' },
    { id: '3', title: 'Assortiment Makroudh', price: 28, images: [], category: 'Traditionnel' },
    { id: '4', title: 'Café Torréfié Artisanal', price: 22, images: [], category: 'Boissons' },
    { id: '5', title: 'Harissa Maison Bio', price: 15, images: [], category: 'Épicerie' },
    { id: '6', title: 'Coffret Dattes Deglet Nour', price: 55, images: [], category: 'Fruits Secs' },
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
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b shadow-sm" style={{ backgroundColor: tc.colors.headerBg, color: headerTextColor, borderColor: `${accentColor}15` }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg opacity-80 hover:opacity-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link href={branding?.store_path_base || '/'} className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-9 object-contain" />
              ) : (
                <>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}>
                    <UtensilsCrossed className="w-4.5 h-4.5" strokeWidth={2} />
                  </div>
                  <span className="text-lg font-extrabold tracking-tight" style={{ color: headerTextColor }}>{storeName}</span>
                </>
              )}
            </Link>
          </div>

          {/* Search bar */}
          <div className="hidden sm:flex items-center flex-1 max-w-sm mx-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher des produits..."
              className="w-full py-1.5 pl-9 pr-4 text-sm rounded-full border bg-black/5 focus:outline-none focus:ring-1"
              style={{ color: headerTextColor, borderColor: `${accentColor}30` }}
            />
            <Search className="w-4 h-4 absolute left-3 opacity-50" />
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium opacity-80">
            <a href="#products" className="hover:opacity-100 transition-opacity">Menu</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-100 transition-opacity">À propos</Link>
            <Link href="/hub/login" className="hover:opacity-100 transition-opacity">Connexion</Link>
          </nav>

          <div className="flex items-center gap-3">
            <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={accentColor} iconColor={headerTextColor} className="inline-flex items-center transition-colors hover:opacity-70" icon="cart" />
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm h-full flex flex-col justify-between p-6 shadow-2xl z-10 overflow-y-auto" style={{ backgroundColor: tc.colors.background, color: tc.colors.text }}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: `${tc.colors.text}15` }}>
                <span className="font-extrabold text-lg">{storeName}</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 opacity-70 hover:opacity-100">
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
                  className="w-full py-2 pl-9 pr-4 text-sm rounded-xl border bg-black/5"
                  style={{ borderColor: `${accentColor}30`, color: tc.colors.text }}
                />
                <Search className="w-4 h-4 absolute left-3 top-3 opacity-50" />
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-3 py-3 text-sm font-medium border-b" style={{ borderColor: `${tc.colors.text}15` }}>
                <Link href={branding?.store_path_base || '/'} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-70">Accueil</Link>
                <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-70">Menu & Produits</a>
                <Link href={`${branding?.store_path_base || ''}/pages/about`} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-70">À propos</Link>
                <Link href="/hub/login" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-70">Connexion</Link>
              </nav>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="py-4 border-b" style={{ borderColor: `${tc.colors.text}15` }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accentColor }}>Catégories</p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`text-left text-sm py-1.5 px-3 rounded-lg transition-colors ${!activeCategory ? 'font-bold bg-black/5' : 'opacity-70 hover:opacity-100'}`}
                    >
                      Tout
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`text-left text-sm py-1.5 px-3 rounded-lg transition-colors ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'font-bold bg-black/5' : 'opacity-70 hover:opacity-100'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Footer Links */}
            <div className="pt-4 border-t text-xs" style={{ borderColor: `${tc.colors.text}15` }}>
              <StorefrontSocialLinks branding={branding} showContact linkClassName="block py-1 opacity-70 hover:opacity-100" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      {children ? (
        <main className="py-8 flex-1">{children}</main>
      ) : (
        <div className="flex-1">
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="max-w-6xl mx-auto px-6 py-12 md:py-20">
              {tc.heroStyle === 'split' ? (
                <div className="grid md:grid-cols-2 gap-10 items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6" style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
                      <Flame className="w-3.5 h-3.5" />
                      Fait maison avec passion
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5">
                      Des saveurs <span style={{ color: accentColor }}>authentiques</span>
                    </h2>
                    <p className="text-base opacity-70 leading-relaxed mb-8">
                      Découvrez nos produits artisanaux préparés avec des ingrédients frais et locaux.
                    </p>
                    <a href="#products" className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:shadow-lg hover:scale-[1.02]" style={{ backgroundColor: accentColor }}>
                      Commander maintenant
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="rounded-3xl p-8 aspect-video flex items-center justify-center border" style={{ backgroundColor: `${accentColor}08`, borderColor: `${accentColor}20` }}>
                    <UtensilsCrossed className="w-20 h-20" style={{ color: `${accentColor}50` }} />
                  </div>
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className="text-center py-6">
                  <h2 className="text-3xl font-extrabold mb-2">{storeName}</h2>
                  <p className="text-sm opacity-60">Produits artisanaux & gourmands</p>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="text-center max-w-3xl mx-auto">
                  <div className="relative aspect-video rounded-3xl overflow-hidden flex items-center justify-center mb-8 border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}20` }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}>
                      <Play className="w-8 h-8 fill-current ml-1" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Notre Savoir-Faire</h2>
                  <a href="#products" className="inline-block px-7 py-3 rounded-2xl text-sm font-bold text-white" style={{ backgroundColor: accentColor }}>
                    Voir le menu
                  </a>
                </div>
              ) : (
                <div className="text-center max-w-2xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6" style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
                    <Flame className="w-3.5 h-3.5" />
                    Fait maison avec passion
                  </div>
                  <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5">
                    Des saveurs<br />
                    <span style={{ color: accentColor }}>authentiques</span>
                  </h2>
                  <p className="text-base opacity-70 leading-relaxed mb-8 max-w-md mx-auto">
                    Découvrez nos produits artisanaux préparés avec des ingrédients frais et locaux. Livraison à domicile.
                  </p>
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <a href="#products" className="px-7 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: accentColor }}>
                      Commander maintenant
                    </a>
                    <div className="flex items-center gap-1.5 text-sm opacity-60">
                      <Clock className="w-4 h-4" />
                      <span>Livraison en 24-48h</span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="max-w-6xl mx-auto px-6 mb-10">
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveCategory('')}
                  className={`px-5 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all ${
                    !activeCategory ? 'text-white shadow-md' : 'bg-white border text-gray-600 hover:border-gray-300'
                  }`}
                  style={!activeCategory ? { backgroundColor: accentColor } : { borderColor: `${tc.colors.text}20` }}
                >
                  Tout
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all ${
                      activeCategory.toLowerCase() === cat.toLowerCase() ? 'text-white shadow-md' : 'bg-white border text-gray-600 hover:border-gray-300'
                    }`}
                    style={activeCategory.toLowerCase() === cat.toLowerCase() ? { backgroundColor: accentColor } : { borderColor: `${tc.colors.text}20` }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          <main id="products" className="max-w-6xl mx-auto px-6 pb-24">
            <div className={`grid ${tc.gridClasses}`}>
              {displayProducts.map((p) => (
                <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block bg-white rounded-2xl overflow-hidden border hover:shadow-lg transition-all duration-300" style={{ borderColor: `${tc.colors.text}10` }}>
                  <div className="aspect-[4/3] overflow-hidden bg-orange-50 relative">
                    {getStoreProductImage(p) ? (
                      <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: `${accentColor}20` }}>
                        <ShoppingBag className="w-10 h-10" />
                      </div>
                    )}
                    {p.category && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-sm" style={{ color: accentColor }}>
                        {p.category}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold line-clamp-1 mb-1.5" style={{ color: tc.colors.text }}>{p.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-extrabold" style={{ color: accentColor }}>{formatStorePrice(p)}</span>
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-75" style={{ backgroundColor: accentColor }}>
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {displayProducts.length === 0 && (
              <div className="text-center py-20 opacity-40">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm">Aucun produit pour le moment</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t py-10 text-center" style={{ backgroundColor: tc.colors.footerBg, borderColor: `${accentColor}10` }}>
        <div className="max-w-6xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-4 flex flex-wrap justify-center gap-4 text-xs" linkClassName="opacity-80 hover:opacity-100 transition-opacity" />
          <p className="text-xs opacity-60">
            © {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" />
          </p>
        </div>
      </footer>
    </div>
  );
}
