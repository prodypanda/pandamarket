import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag, Gamepad2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath } from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';

/**
 * Neon Theme — Dark mode default, neon accent colors, gaming/tech vibe.
 * Deep black background, vibrant neon glow effects, sharp edges,
 * cyberpunk-inspired typography, animated hover states.
 */
export function NeonTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const neon = tc.colors.primary;
  const displayProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'RGB Gaming Headset', price: 249, images: [], category: 'Gaming' },
        { id: '2', title: 'Neon LED Controller', price: 89, images: [], category: 'Accessories' },
        { id: '3', title: 'Mechanical Keypad', price: 175, images: [], category: 'Peripherals' },
        { id: '4', title: 'Stream Deck Pro', price: 320, images: [], category: 'Streaming' },
        { id: '5', title: 'Gaming Chair X', price: 890, images: [], category: 'Furniture' },
        { id: '6', title: 'VR Headset Elite', price: 1200, images: [], category: 'VR' },
      ];

  return (
    <div className={`${theme.typography.fontFamily} min-h-screen`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header className="border-b" style={{ borderColor: `${neon}15` }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href={branding?.store_path_base || '/'}>
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={storeName} className="h-8 object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-6 h-6" style={{ color: neon }} />
                <span className="text-xl font-black uppercase tracking-tighter" style={{ color: neon }}>
                  {storeName}
                </span>
              </div>
            )}
          </Link>
          <nav className="hidden md:flex gap-6 text-xs uppercase tracking-widest font-bold text-gray-500">
            <a href="#products" className="hover:text-white transition-colors">Shop</a>
            <a href="#products" className="hover:text-white transition-colors">Deals</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:text-white transition-colors">About</Link>
          </nav>
          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={neon} iconColor="#9CA3AF" badgeTextColor="#050505" className="inline-flex items-center transition-colors hover:text-white" icon="cart" />
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-32">
        {/* Neon glow background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[200px] opacity-15" style={{ backgroundColor: neon }} />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[150px] opacity-10" style={{ backgroundColor: '#FF00FF' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border" style={{ borderColor: `${neon}40`, color: neon }}>
            <Sparkles className="w-3 h-3" />
            New Drops
          </div>
          <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-6">
            Level<br />
            <span style={{ color: neon, textShadow: `0 0 40px ${neon}60` }}>Up</span>
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-10">
            Premium gear for gamers and creators. Unleash your potential.
          </p>
          <a
            href="#products"
            className="inline-block px-8 py-3 text-sm font-black uppercase tracking-wider transition-all hover:scale-105"
            style={{ backgroundColor: neon, color: '#050505', boxShadow: `0 0 30px ${neon}40` }}
          >
            Shop Now
          </a>
        </div>
      </section>

      {/* Products */}
      <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {displayProducts.map((p) => (
            <Link
              key={p.id}
              href={getStorefrontProductPath(p, branding?.store_path_base)}
              className="group block border overflow-hidden transition-all duration-300 hover:border-opacity-60"
              style={{ borderColor: `${neon}10`, backgroundColor: '#0A0A0A' }}
            >
              <div className="aspect-square overflow-hidden relative">
                {getStoreProductImage(p) ? (
                  <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#0F0F0F' }}>
                    <ShoppingBag className="w-10 h-10" style={{ color: `${neon}15` }} />
                  </div>
                )}
                {p.category && (
                  <span className="absolute top-3 left-3 px-2 py-1 text-[10px] font-black uppercase tracking-wider" style={{ backgroundColor: neon, color: '#050505' }}>
                    {p.category}
                  </span>
                )}
                {/* Neon border glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: `inset 0 0 30px ${neon}15` }} />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold text-white line-clamp-1">{p.title}</h3>
                <p className="text-sm font-black mt-1" style={{ color: neon }}>{formatStorePrice(p)}</p>
              </div>
            </Link>
          ))}
        </div>
        {displayProducts.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
            <p className="text-sm">No products yet</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-10 text-center" style={{ borderColor: `${neon}10` }}>
        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} {storeName} — Powered by{' '}
          <Link href="/" className="text-[#16C784] hover:underline">🐼 PandaMarket</Link>
        </p>
      </footer>
    </div>
  );
}

