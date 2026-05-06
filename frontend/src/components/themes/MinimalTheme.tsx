import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath } from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';

export function MinimalTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const displayProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Linen Shirt', price: 89, images: [] },
        { id: '2', title: 'Canvas Tote', price: 45, images: [] },
        { id: '3', title: 'Ceramic Mug', price: 25, images: [] },
        { id: '4', title: 'Leather Wallet', price: 120, images: [] },
      ];

  const categories = [...new Set(displayProducts.map((p) => p.category).filter(Boolean))] as string[];

  return (
    <div
      className={`${theme.typography.fontFamily} min-h-screen`}
      style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}
    >
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header
        className="py-8 px-8 border-b flex justify-between items-center"
        style={{ backgroundColor: tc.colors.headerBg, borderColor: `${tc.colors.text}10` }}
      >
        <div className={tc.layout.container + ' w-full flex justify-between items-center'}>
          <Link href={branding?.store_path_base || '/'}>
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={storeName} className="h-10 object-contain" />
            ) : (
              <h1 className={`text-3xl ${theme.typography.headingStyle}`} style={{ color: tc.colors.text }}>
                {storeName}
              </h1>
            )}
          </Link>
          <nav className="flex space-x-8 text-sm font-medium tracking-wide">
            <a href="#products" className="hover:opacity-70 transition-opacity" style={{ color: tc.colors.text }}>Shop</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-70 transition-opacity" style={{ color: tc.colors.text }}>About</Link>
            <StorefrontThemeCartLink
              storeId={branding?.store_id}
              storeHost={branding?.store_host}
              storePathBase={branding?.store_path_base}
              primaryColor={tc.colors.primary}
              iconColor={tc.colors.text}
              className="inline-flex items-center gap-2 transition-opacity hover:opacity-70"
              label="Cart"
            />
          </nav>
        </div>
      </header>

      {/* Hero (respects heroStyle) */}
      {tc.heroStyle !== 'none' && (
        <section
          className="py-20 text-center"
          style={{
            backgroundColor: tc.heroStyle === 'banner' ? tc.colors.primary : tc.colors.background,
            color: tc.heroStyle === 'banner' ? tc.colors.background : tc.colors.text,
          }}
        >
          <div className={tc.layout.container}>
            {tc.heroStyle === 'split' ? (
              <div className="flex items-center gap-12 text-left">
                <div className="flex-1">
                  <h2 className={`text-4xl md:text-5xl mb-4 ${theme.typography.headingStyle}`}>
                    {storeName}
                  </h2>
                  <p className="text-lg opacity-70 mb-6">Découvrez notre collection soigneusement sélectionnée.</p>
                  <a href="#products" className="inline-block px-6 py-3 text-sm font-semibold rounded-md transition-opacity hover:opacity-80" style={{ backgroundColor: tc.colors.primary, color: tc.colors.background }}>
                    Explorer
                  </a>
                </div>
                <div className="flex-1 hidden md:block aspect-[4/3] rounded-lg" style={{ backgroundColor: `${tc.colors.text}10` }} />
              </div>
            ) : tc.heroStyle === 'minimal' ? (
              <>
                <h2 className={`text-3xl md:text-4xl mb-3 ${theme.typography.headingStyle}`}>{storeName}</h2>
                <p className="text-base opacity-60">Qualité. Simplicité. Authenticité.</p>
              </>
            ) : (
              <>
                <h2 className={`text-4xl md:text-6xl mb-4 ${theme.typography.headingStyle}`}>{storeName}</h2>
                <p className="text-lg opacity-70 mb-8 max-w-lg mx-auto">Découvrez notre collection soigneusement sélectionnée.</p>
                <a href="#products" className="inline-block px-8 py-3 text-sm font-semibold rounded-md transition-opacity hover:opacity-80" style={{ backgroundColor: tc.colors.background, color: tc.colors.primary }}>
                  Explorer le catalogue
                </a>
              </>
            )}
          </div>
        </section>
      )}

      {/* Products */}
      <main id="products" className="py-16">
        <ThemeLayout
          variation={tc.layoutVariation}
          layout={tc.layout}
          colors={tc.colors}
          categories={categories}
        >
          <div className={`grid ${tc.gridClasses}`}>
            {displayProducts.map((p) => (
              <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group cursor-pointer block">
                <div className="aspect-[3/4] mb-4 overflow-hidden" style={{ backgroundColor: `${tc.colors.text}08` }}>
                  {getStoreProductImage(p) ? (
                    <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full group-hover:scale-105 transition-transform duration-500 flex items-center justify-center" style={{ color: `${tc.colors.text}30` }}>
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-medium" style={{ color: tc.colors.text }}>{p.title}</h3>
                <p className="text-sm mt-1" style={{ color: tc.colors.accent }}>{formatStorePrice(p)}</p>
              </Link>
            ))}
          </div>
          {displayProducts.length === 0 && (
            <div className="text-center py-20" style={{ color: `${tc.colors.text}50` }}>
              <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
              <p>Aucun produit pour le moment</p>
            </div>
          )}
        </ThemeLayout>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs" style={{ backgroundColor: tc.colors.footerBg, color: `${tc.colors.background}80` }}>
        <p>© {new Date().getFullYear()} {storeName} — Propulsé par <Link href="/" className="text-[#16C784] hover:underline">🐼 PandaMarket</Link></p>
      </footer>
    </div>
  );
}

