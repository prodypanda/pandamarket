'use client';

import React, { useState } from 'react';
import { Search, Menu, X, ShoppingBag, Play, Phone, Mail, MapPin } from 'lucide-react';
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

export function MinimalTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const allProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Linen Shirt', price: 89, images: [], category: 'Vêtements' },
        { id: '2', title: 'Canvas Tote', price: 45, images: [], category: 'Accessoires' },
        { id: '3', title: 'Ceramic Mug', price: 25, images: [], category: 'Maison' },
        { id: '4', title: 'Leather Wallet', price: 120, images: [], category: 'Accessoires' },
      ];

  const categories = Array.from(new Set(allProducts.map((p) => p.category).filter(Boolean))) as string[];

  const displayProducts = allProducts.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCat) return false;
    }
    if (activeCategory && p.category !== activeCategory) return false;
    return true;
  });

  const headerTextColor = getLogoSurfaceForColor(tc.colors.headerBg) === 'dark' ? '#FFFFFF' : tc.colors.text;
  const footerTextColor = getLogoSurfaceForColor(tc.colors.footerBg) === 'dark' ? '#FFFFFF' : tc.colors.text;

  return (
    <div
      className={`${theme.typography.fontFamily} min-h-screen flex flex-col`}
      style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}
    >
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header
        className="py-6 px-6 border-b transition-colors"
        style={{ backgroundColor: tc.colors.headerBg, color: headerTextColor, borderColor: `${headerTextColor}15` }}
      >
        <div className={`${tc.layout.container} w-full flex justify-between items-center gap-4`}>
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link href={branding?.store_path_base || '/'}>
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-9 object-contain" />
              ) : (
                <h1 className={`text-2xl md:text-3xl tracking-tight ${theme.typography.headingStyle}`}>
                  {storeName}
                </h1>
              )}
            </Link>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex flex-1 max-w-sm mx-6 relative">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 pl-4 pr-10 rounded-full text-sm outline-none transition-all border border-current/15 focus:border-current/40"
              style={{ backgroundColor: tc.colors.background, color: tc.colors.text }}
            />
            <Search className="w-4 h-4 absolute right-3.5 top-3 opacity-50" />
          </div>

          <nav className="flex items-center space-x-6 text-sm font-medium tracking-wide">
            <a href="#products" className="hidden sm:inline hover:opacity-70 transition-opacity">Boutique</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hidden sm:inline hover:opacity-70 transition-opacity">À propos</Link>
            <Link href="/hub/login" className="hidden lg:inline hover:opacity-70 transition-opacity">Connexion</Link>
            <StorefrontThemeCartLink
              storeId={branding?.store_id}
              storeHost={branding?.store_host}
              storePathBase={branding?.store_path_base}
              primaryColor={tc.colors.primary}
              iconColor={headerTextColor}
              className="inline-flex items-center gap-2 transition-opacity hover:opacity-70"
              label="Panier"
            />
          </nav>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div
            className="absolute inset-y-0 left-0 w-80 max-w-[85vw] shadow-2xl overflow-y-auto flex flex-col"
            style={{ backgroundColor: tc.colors.background, color: tc.colors.text }}
          >
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: `${tc.colors.text}15` }}>
              <span className="font-semibold text-lg">{storeName}</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md hover:bg-black/5" aria-label="Fermer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 space-y-6">
              {/* Mobile Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2 pl-3 pr-9 rounded-md border text-sm outline-none"
                  style={{ borderColor: `${tc.colors.text}20`, backgroundColor: tc.colors.background, color: tc.colors.text }}
                />
                <Search className="w-4 h-4 absolute right-3 top-2.5 opacity-50" />
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                <h3 className="text-xs uppercase tracking-wider font-semibold opacity-50 px-2 mb-2">Navigation</h3>
                <Link
                  href={branding?.store_path_base || '/'}
                  className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-black/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Accueil
                </Link>
                <a
                  href="#products"
                  className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-black/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Produits
                </a>
                <Link
                  href={`${branding?.store_path_base || ''}/pages/about`}
                  className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-black/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  À propos
                </Link>
                <Link
                  href="/hub/login"
                  className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-black/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Connexion
                </Link>
              </div>

              {/* Category Links */}
              {categories.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-xs uppercase tracking-wider font-semibold opacity-50 px-2 mb-2">Catégories</h3>
                  <button
                    onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${!activeCategory ? 'bg-black/10 font-bold' : 'hover:bg-black/5'}`}
                  >
                    Toutes les catégories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-black/10 font-bold' : 'hover:bg-black/5'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Store Contact */}
              {(branding?.contact_email || branding?.contact_phone || branding?.address) && (
                <div className="pt-4 border-t space-y-2 text-xs opacity-75" style={{ borderColor: `${tc.colors.text}15` }}>
                  <h3 className="text-xs uppercase tracking-wider font-semibold opacity-70 mb-2">Contact</h3>
                  {branding.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{branding.contact_email}</span>
                    </div>
                  )}
                  {branding.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{branding.contact_phone}</span>
                    </div>
                  )}
                  {branding.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{branding.address}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {children ? (
        <main className="py-8 flex-1">{children}</main>
      ) : (
        <div className="flex-1">
          {/* Hero (respects heroStyle: banner, split, minimal, video, none) */}
          {tc.heroStyle !== 'none' && (
            <section
              className="py-16 md:py-24 text-center border-b"
              style={{
                backgroundColor: tc.heroStyle === 'banner' ? tc.colors.primary : tc.colors.secondary,
                color: tc.heroStyle === 'banner' ? tc.colors.background : tc.colors.text,
                borderColor: `${tc.colors.text}10`,
              }}
            >
              <div className={tc.layout.container}>
                {tc.heroStyle === 'split' ? (
                  <div className="flex flex-col md:flex-row items-center gap-10 text-left">
                    <div className="flex-1">
                      <h2 className={`text-4xl md:text-5xl font-light mb-4 tracking-tight ${theme.typography.headingStyle}`}>
                        {storeName}
                      </h2>
                      <p className="text-base opacity-75 mb-6 leading-relaxed max-w-md">
                        Découvrez notre collection soigneusement sélectionnée avec précision et simplicité.
                      </p>
                      <a
                        href="#products"
                        className="inline-block px-7 py-3 text-sm font-semibold rounded-md transition-opacity hover:opacity-80"
                        style={{ backgroundColor: tc.colors.primary, color: tc.colors.background }}
                      >
                        Explorer la collection
                      </a>
                    </div>
                    <div
                      className="flex-1 w-full aspect-[4/3] rounded-lg border flex items-center justify-center"
                      style={{ backgroundColor: `${tc.colors.text}05`, borderColor: `${tc.colors.text}10` }}
                    >
                      <ShoppingBag className="w-16 h-16 opacity-20" />
                    </div>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div className="max-w-3xl mx-auto">
                    <h2 className={`text-3xl md:text-5xl mb-4 ${theme.typography.headingStyle}`}>
                      {storeName}
                    </h2>
                    <p className="text-base opacity-75 mb-8">Regardez notre histoire et notre processus de fabrication.</p>
                    <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg bg-black/10 border flex items-center justify-center group cursor-pointer" style={{ borderColor: `${tc.colors.text}15` }}>
                      <div className="w-16 h-16 rounded-full bg-white/90 text-black flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-current ml-1" />
                      </div>
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div className="max-w-xl mx-auto">
                    <h2 className={`text-3xl md:text-4xl mb-3 ${theme.typography.headingStyle}`}>{storeName}</h2>
                    <p className="text-sm opacity-60 tracking-widest uppercase">Qualité. Simplicité. Authenticité.</p>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto">
                    <h2 className={`text-4xl md:text-6xl mb-4 tracking-tight ${theme.typography.headingStyle}`}>{storeName}</h2>
                    <p className="text-base opacity-80 mb-8 leading-relaxed max-w-lg mx-auto">
                      Découvrez notre collection soigneusement sélectionnée pour un style épuré et durable.
                    </p>
                    <a
                      href="#products"
                      className="inline-block px-8 py-3 text-sm font-semibold rounded-md transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: tc.heroStyle === 'banner' ? tc.colors.background : tc.colors.primary,
                        color: tc.heroStyle === 'banner' ? tc.colors.primary : tc.colors.background,
                      }}
                    >
                      Explorer le catalogue
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Interactive Category Filter Pills */}
          {categories.length > 0 && (
            <div className={`${tc.layout.container} pt-8 flex flex-wrap gap-2 justify-center`}>
              <button
                onClick={() => setActiveCategory('')}
                className="px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-colors"
                style={{
                  backgroundColor: !activeCategory ? tc.colors.primary : tc.colors.secondary,
                  color: !activeCategory ? tc.colors.background : tc.colors.text,
                }}
              >
                Tous
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-colors"
                  style={{
                    backgroundColor: activeCategory === cat ? tc.colors.primary : tc.colors.secondary,
                    color: activeCategory === cat ? tc.colors.background : tc.colors.text,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Products */}
          <main id="products" className="py-16">
            <ThemeLayout
              variation={tc.layoutVariation}
              layout={tc.layout}
              colors={tc.colors}
              categories={categories}
              activeCategory={activeCategory}
            >
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p) => (
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group cursor-pointer block">
                    <div className="aspect-[3/4] mb-4 overflow-hidden rounded-md" style={{ backgroundColor: `${tc.colors.text}08` }}>
                      {getStoreProductImage(p) ? (
                        <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full group-hover:scale-105 transition-transform duration-500 flex items-center justify-center" style={{ color: `${tc.colors.text}30` }}>
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    {p.category && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold opacity-60 block mb-1">
                        {p.category}
                      </span>
                    )}
                    <h3 className="text-sm font-medium line-clamp-1" style={{ color: tc.colors.text }}>{p.title}</h3>
                    <p className="text-sm font-semibold mt-1" style={{ color: tc.colors.accent }}>{formatStorePrice(p)}</p>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20" style={{ color: `${tc.colors.text}50` }}>
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p>Aucun produit ne correspond à votre recherche</p>
                </div>
              )}
            </ThemeLayout>
          </main>
        </div>
      )}

      {/* Footer */}
      <footer className="py-10 text-center text-xs mt-auto" style={{ backgroundColor: tc.colors.footerBg, color: footerTextColor }}>
        <StorefrontSocialLinks branding={branding} showContact className="mb-4 flex flex-wrap items-center justify-center gap-4" linkClassName="font-medium hover:underline opacity-90" />
        <p>© {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" /></p>
      </footer>
    </div>
  );
}
