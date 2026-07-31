'use client';

import React, { useState } from 'react';
import { ShoppingBag, Waves, Anchor, Search, Menu, X, Play } from 'lucide-react';
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
import { ThemeLayout } from './ThemeLayout';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';
import { StorefrontSocialLinks } from './StorefrontSocialLinks';

/** Coastal Theme — Beach/resort, blues and sandy tones, relaxed vibe. */
export function CoastalTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allProducts = products.length > 0 ? products : [
    { id: '1', title: 'Linen Beach Shirt', price: 95, images: [], category: 'Clothing' },
    { id: '2', title: 'Straw Sun Hat', price: 45, images: [], category: 'Accessories' },
    { id: '3', title: 'Coral Necklace', price: 120, images: [], category: 'Jewelry' },
    { id: '4', title: 'Canvas Espadrilles', price: 75, images: [], category: 'Shoes' },
    { id: '5', title: 'Sea Salt Candle', price: 35, images: [], category: 'Home' },
    { id: '6', title: 'Driftwood Frame', price: 55, images: [], category: 'Decor' },
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
    <div className="min-h-screen flex flex-col" style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header className="border-b sticky top-0 z-40 backdrop-blur-md" style={{ borderColor: `${tc.colors.primary}20`, backgroundColor: tc.colors.headerBg, color: headerTextColor }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg border hover:opacity-80 transition-opacity"
              style={{ borderColor: `${tc.colors.primary}30`, color: headerTextColor }}
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href={branding?.store_path_base || '/'}>
              {logoUrl ? <img src={logoUrl} alt={storeName} className="h-10 object-contain" /> : (
                <div className="flex items-center gap-2"><Anchor className="w-5 h-5" style={{ color: tc.colors.primary }} /><h1 className="text-2xl font-semibold tracking-wide">{storeName}</h1></div>
              )}
            </Link>
          </div>

          {/* Search Input */}
          <div className="hidden sm:flex items-center flex-1 max-w-xs mx-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full py-1.5 pl-9 pr-4 text-xs rounded-full border focus:outline-none"
              style={{ borderColor: `${tc.colors.primary}30`, backgroundColor: tc.colors.background, color: tc.colors.text }}
            />
            <Search className="w-4 h-4 absolute left-3 opacity-50" />
          </div>

          <nav className="hidden md:flex gap-6 text-sm font-medium" style={{ color: `${tc.colors.primary}90` }}>
            <a href="#products" className="hover:opacity-70 transition-opacity">Boutique</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-70 transition-opacity">À propos</Link>
            <Link href="/hub/login" className="hover:opacity-70 transition-opacity">Connexion</Link>
          </nav>
          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={tc.colors.primary} iconColor={tc.colors.primary} className="inline-flex items-center hover:opacity-70 transition-opacity" />
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm h-full flex flex-col justify-between p-6 shadow-xl z-10 overflow-y-auto" style={{ backgroundColor: tc.colors.background, color: tc.colors.text }}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: `${tc.colors.primary}20` }}>
                <span className="font-semibold text-lg">{storeName}</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 opacity-70 hover:opacity-100" aria-label="Fermer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full py-2 pl-9 pr-4 text-xs rounded-full border"
                  style={{ borderColor: `${tc.colors.primary}30`, backgroundColor: tc.colors.background, color: tc.colors.text }}
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 opacity-50" />
              </div>

              <nav className="flex flex-col gap-3 py-3 text-sm font-medium border-b" style={{ borderColor: `${tc.colors.primary}15` }}>
                <Link href={branding?.store_path_base || '/'} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-70">Accueil</Link>
                <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-70">Boutique</a>
                <Link href={`${branding?.store_path_base || ''}/pages/about`} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-70">À propos</Link>
                <Link href="/hub/login" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-70">Connexion</Link>
              </nav>

              {categories.length > 0 && (
                <div className="py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2 opacity-60">Catégories</p>
                  <div className="flex flex-col gap-1 text-sm">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`text-left py-1.5 px-3 rounded-lg ${!activeCategory ? 'font-bold' : 'opacity-70'}`}
                      style={{ backgroundColor: !activeCategory ? `${tc.colors.primary}15` : 'transparent', color: !activeCategory ? tc.colors.primary : tc.colors.text }}
                    >
                      Toutes les catégories
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`text-left py-1.5 px-3 rounded-lg ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'font-bold' : 'opacity-70'}`}
                        style={{ backgroundColor: activeCategory.toLowerCase() === cat.toLowerCase() ? `${tc.colors.primary}15` : 'transparent', color: activeCategory.toLowerCase() === cat.toLowerCase() ? tc.colors.primary : tc.colors.text }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t text-xs" style={{ borderColor: `${tc.colors.primary}20` }}>
              <StorefrontSocialLinks branding={branding} showContact className="flex flex-col gap-2 opacity-80" />
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
            <section className="py-20 text-center" style={{ background: `linear-gradient(180deg, ${tc.colors.secondary} 0%, transparent 100%)` }}>
              {tc.heroStyle === 'split' ? (
                <div className={`${tc.layout.container} flex items-center gap-12 text-left`}>
                  <div className="flex-1">
                    <Waves className="w-8 h-8 mb-4" style={{ color: tc.colors.primary }} strokeWidth={1.5} />
                    <h2 className="text-4xl md:text-5xl font-light leading-tight mb-4">Coastal<br /><span className="font-bold" style={{ color: tc.colors.primary }}>Living</span></h2>
                    <p className="text-sm max-w-md mb-8 leading-relaxed" style={{ color: `${tc.colors.text}70` }}>Inspired by the Mediterranean coast. Effortless style for sun-kissed days.</p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: tc.colors.primary }}>Explorer la collection</a>
                  </div>
                  <div className="flex-1 hidden md:block aspect-[4/3] rounded-2xl" style={{ backgroundColor: `${tc.colors.primary}15` }} />
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className={tc.layout.container}>
                  <Waves className="w-6 h-6 mx-auto mb-3" style={{ color: tc.colors.primary }} strokeWidth={1.5} />
                  <h2 className="text-2xl font-semibold">{storeName}</h2>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="max-w-2xl mx-auto px-6">
                  <div className="aspect-video rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: `${tc.colors.primary}15` }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: tc.colors.primary }}>
                      <Play className="w-6 h-6 ml-1" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Aperçu Collection</h2>
                </div>
              ) : (
                <>
                  <Waves className="w-8 h-8 mx-auto mb-4" style={{ color: tc.colors.primary }} strokeWidth={1.5} />
                  <h2 className="text-4xl md:text-6xl font-light leading-tight mb-6">Coastal<br /><span className="font-bold" style={{ color: tc.colors.primary }}>Living</span></h2>
                  <p className="text-sm max-w-md mx-auto mb-8 leading-relaxed" style={{ color: `${tc.colors.text}70` }}>Inspired by the Mediterranean coast. Effortless style for sun-kissed days.</p>
                  <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: tc.colors.primary }}>Explorer la collection</a>
                </>
              )}
            </section>
          )}

          {/* Products Section */}
          <main id="products" className="pb-24 pt-8">
            {/* Category Filter Tabs */}
            {categories.length > 0 && (
              <div className="max-w-7xl mx-auto px-6 mb-8 flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: !activeCategory ? tc.colors.primary : tc.colors.secondary,
                    color: !activeCategory ? '#FFFFFF' : tc.colors.text,
                  }}
                >
                  Tous
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: activeCategory.toLowerCase() === cat.toLowerCase() ? tc.colors.primary : tc.colors.secondary,
                      color: activeCategory.toLowerCase() === cat.toLowerCase() ? '#FFFFFF' : tc.colors.text,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <ThemeLayout variation={tc.layoutVariation} layout={tc.layout} colors={tc.colors} categories={categories} activeCategory={activeCategory}>
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p) => (
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all" style={{ backgroundColor: tc.colors.headerBg }}>
                    <div className="aspect-square overflow-hidden" style={{ backgroundColor: `${tc.colors.primary}10` }}>
                      {getStoreProductImage(p) ? <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
                        <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10" style={{ color: `${tc.colors.primary}30` }} /></div>
                      )}
                    </div>
                    <div className="p-4">
                      {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: tc.colors.primary }}>{p.category}</p>}
                      <h3 className="text-sm font-semibold" style={{ color: tc.colors.text }}>{p.title}</h3>
                      <p className="text-sm font-bold mt-1" style={{ color: tc.colors.accent }}>{formatStorePrice(p)}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20 opacity-50">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" style={{ color: tc.colors.primary }} />
                  <p className="text-sm">Aucun produit trouvé</p>
                </div>
              )}
            </ThemeLayout>
          </main>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t py-10 text-center" style={{ borderColor: `${tc.colors.primary}15`, backgroundColor: tc.colors.footerBg }}>
        <div className="max-w-7xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-4 flex flex-wrap justify-center gap-4 text-xs" linkClassName="hover:underline opacity-80" />
          <p className="text-xs" style={{ color: `${tc.colors.text}60` }}>© {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" /></p>
        </div>
      </footer>
    </div>
  );
}
