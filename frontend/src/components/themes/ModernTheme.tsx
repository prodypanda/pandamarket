import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { Sparkles, ArrowRight, ShoppingCart } from 'lucide-react';

interface ThemeProps {
  theme: ThemeConfig;
  storeName: string;
}

export function ModernTheme({ theme, storeName }: ThemeProps) {
  const products = [
    { id: 1, name: 'Neon Cyber Keyboard', price: 'TND 350', tag: 'New Arrival' },
    { id: 2, name: 'Holographic Display', price: 'TND 1200', tag: 'Trending' },
    { id: 3, name: 'Quantum Processor Unit', price: 'TND 899', tag: 'Pro' },
    { id: 4, name: 'Neural Link Headset', price: 'TND 450', tag: 'Best Seller' },
  ];

  return (
    <div className={`${theme.colors.background} ${theme.colors.text} ${theme.typography.fontFamily} min-h-screen relative overflow-hidden`}>
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <header className="relative z-10 px-6 lg:px-12 py-6 flex justify-between items-center">
        <h1 className={`text-2xl ${theme.typography.headingStyle} ${theme.colors.accent}`}>
          {storeName}
        </h1>
        <nav className="hidden md:flex space-x-8">
          <a href="#" className="text-slate-300 hover:text-white transition-colors">Discover</a>
          <a href="#" className="text-slate-300 hover:text-white transition-colors">Collections</a>
          <a href="#" className="text-slate-300 hover:text-white transition-colors">Creators</a>
        </nav>
        <button className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all">
          <ShoppingCart className="w-5 h-5" />
        </button>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-sm font-medium text-purple-200">The Future of Commerce</span>
          </div>
          <h2 className={`text-5xl lg:text-7xl leading-tight mb-6 ${theme.typography.headingStyle}`}>
            Elevate Your <br/> <span className={theme.colors.accent}>Digital Lifestyle</span>
          </h2>
          <p className="text-lg text-slate-400 mb-10">
            Discover cutting-edge products curated for the modern visionary. Experience frictionless shopping.
          </p>
          <button className={`${theme.colors.primary} px-8 py-4 rounded-full font-bold text-lg hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.5)] transition-all flex items-center mx-auto group`}>
            Explore Catalog
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <div key={p.id} className="group relative rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-sm hover:bg-white/10 transition-colors duration-500">
              <div className="absolute top-4 left-4 z-20">
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-black/50 backdrop-blur-md rounded-full text-white border border-white/20">
                  {p.tag}
                </span>
              </div>
              <div className="aspect-[4/5] bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500"></div>
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-2">{p.name}</h3>
                <div className="flex justify-between items-center">
                  <p className="text-purple-300 font-medium">{p.price}</p>
                  <button className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
