import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag, Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars } from './shared';
import { ThemeLayout } from './ThemeLayout';

/**
 * Elegance Theme — Minimalist luxury with generous whitespace.
 * Serif headings (Playfair Display feel via font-serif), muted palette,
 * editorial grid, large imagery, understated sophistication.
 */
export function EleganceTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const accent = branding?.primary_color || '#2C2C2C';
  const displayProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Merino Wool Coat', price: 680, images: [] },
        { id: '2', title: 'Silk Blouse', price: 320, images: [] },
        { id: '3', title: 'Leather Loafers', price: 450, images: [] },
        { id: '4', title: 'Cashmere Sweater', price: 390, images: [] },
      ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF8', color: '#1A1A1A' }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header className="border-b border-gray-200/60">
        <div className="max-w-6xl mx-auto px-6 py-10 flex items-center justify-between">
          <button className="md:hidden">
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <div className="flex-1 text-center">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={storeName} className="h-10 mx-auto object-contain" />
            ) : (
              <h1 className="text-3xl md:text-4xl font-serif font-light tracking-wide">{storeName}</h1>
            )}
          </div>
          <div className="flex items-center gap-5">
            <Search className="w-5 h-5 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer" strokeWidth={1.5} />
            <Link href="/hub/cart" className="relative">
              <ShoppingBag className="w-5 h-5 text-gray-400 hover:text-gray-700 transition-colors" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
        <nav className="hidden md:flex justify-center gap-10 pb-6 text-xs tracking-[0.2em] uppercase text-gray-500">
          <a href="#" className="hover:text-gray-900 transition-colors">New Arrivals</a>
          <a href="#" className="hover:text-gray-900 transition-colors">Collections</a>
          <a href="#" className="hover:text-gray-900 transition-colors">About</a>
          <a href="#" className="hover:text-gray-900 transition-colors">Contact</a>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-28 text-center">
        <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-6">Curated Selection</p>
        <h2 className="text-5xl md:text-7xl font-serif font-light leading-[1.1] mb-8">
          Less is<br />More
        </h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed mb-10">
          Timeless pieces crafted with intention. Quality over quantity, always.
        </p>
        <a
          href="#products"
          className="inline-block px-12 py-4 text-xs tracking-[0.2em] uppercase border border-gray-300 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all duration-300"
        >
          Shop Now
        </a>
      </section>

      {/* Products */}
      <main id="products" className="max-w-6xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
          {displayProducts.map((p) => (
            <Link key={p.id} href={`/hub/products/${p.id}`} className="group block">
              <div className="aspect-[3/4] mb-6 overflow-hidden bg-gray-100">
                {p.images && p.images[0]?.url ? (
                  <img
                    src={p.images[0].url}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ShoppingBag className="w-8 h-8" strokeWidth={1} />
                  </div>
                )}
              </div>
              <h3 className="text-sm font-serif tracking-wide">{p.title}</h3>
              <p className="text-xs text-gray-500 mt-2">{p.price.toFixed(3)} TND</p>
            </Link>
          ))}
        </div>
        {displayProducts.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4" strokeWidth={1} />
            <p className="text-sm">No products yet</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 py-16 text-center">
        <p className="text-xs text-gray-400 tracking-wide">
          © {new Date().getFullYear()} {storeName} — Powered by{' '}
          <Link href="/" className="text-[#16C784] hover:underline">🐼 PandaMarket</Link>
        </p>
      </footer>
    </div>
  );
}
