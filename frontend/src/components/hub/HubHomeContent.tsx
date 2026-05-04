'use client';

import Link from 'next/link';
import { ArrowRight, ShoppingBag, Store, Zap } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';

interface Product {
  id: string;
  title: string;
  price: number;
  store_name?: string;
  images?: { url: string }[];
  category?: string;
}

interface HubHomeContentProps {
  trendingProducts: Product[];
}

export function HubHomeContent({ trendingProducts }: HubHomeContentProps) {
  const { t } = useLocale();

  const categories = [
    { name: t('nav.categories') === 'Categories' ? 'Electronics' : 'Électronique', slug: 'Electronics', color: 'bg-[#16C784]/5 text-[#16C784]' },
    { name: t('nav.categories') === 'Categories' ? 'Fashion' : 'Mode', slug: 'Fashion', color: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20' },
    { name: t('nav.categories') === 'Categories' ? 'Home & Living' : 'Maison', slug: 'Home', color: 'bg-green-50 text-green-600 dark:bg-green-900/20' },
    { name: t('nav.categories') === 'Categories' ? 'Beauty' : 'Beauté', slug: 'Beauty', color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20' },
  ];

  const features = [
    {
      icon: Store,
      title: t('hub.valueProps.verified.title'),
      desc: t('hub.valueProps.verified.desc'),
    },
    {
      icon: Zap,
      title: t('hub.valueProps.payment.title'),
      desc: t('hub.valueProps.payment.desc'),
    },
    {
      icon: ShoppingBag,
      title: t('hub.valueProps.fast.title'),
      desc: t('hub.valueProps.fast.desc'),
    },
  ];

  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#16C784]/5 to-white dark:from-[#16C784]/10 dark:to-[#0F0F23] pt-16 pb-32">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#16C784] to-[#1EE69A]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pd-reveal">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
            {t('hub.hero.title')}
          </h1>
          <p className="mt-4 text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
            {t('hub.hero.subtitle')}
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/hub/search"
              className="pd-btn pd-btn-primary px-8 py-3.5 bg-[#16C784] text-white font-medium rounded-full shadow-lg shadow-[#16C784]/20 hover:bg-[#14b576] hover:-translate-y-0.5 transition-all"
            >
              {t('hub.hero.ctaExplore')}
            </Link>
            <Link
              href="/hub/vendor-signup"
              className="px-8 py-3.5 bg-white dark:bg-white/10 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/20 font-medium rounded-full hover:bg-gray-50 dark:hover:bg-white/20 transition-colors"
            >
              {t('hub.hero.ctaCreateStore')}
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pd-stagger">
          {features.map((feature, idx) => (
            <div key={idx} className="pd-card bg-white dark:bg-[#1A1A2E] rounded-2xl p-8 shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-white/10 text-center">
              <div className="w-12 h-12 bg-[#16C784]/10 text-[#16C784] rounded-full flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('hub.categories')}</h2>
          </div>
          <Link href="/hub/search" className="text-[#16C784] font-medium flex items-center hover:text-[#14b576]">
            {t('common.seeAll')} <ArrowRight className="w-4 h-4 ms-1" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/hub/search?category=${encodeURIComponent(cat.slug)}`}
              className={`${cat.color} rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform duration-300 block`}
            >
              <h3 className="font-bold text-lg mb-1">{cat.name}</h3>
              <p className="text-sm opacity-80">{t('nav.explore')}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Products */}
      <section className="bg-gray-50 dark:bg-[#0F0F23] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">{t('hub.trending')}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-10">{t('hub.trendingSubtitle')}</p>
          {trendingProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pd-stagger">
              {trendingProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/hub/products/${product.id}`}
                  className="pd-card bg-white dark:bg-[#1A1A2E] rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-white/10"
                >
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden pd-img-zoom">
                    {product.images && product.images[0]?.url ? (
                      <img
                        src={product.images[0].url}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    {product.store_name && (
                      <p className="text-xs font-semibold text-[#16C784] mb-1">{product.store_name}</p>
                    )}
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2 truncate">{product.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#16C784]">
                        {product.price.toFixed(3)} {t('common.currency')}
                      </span>
                      <span className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:bg-[#16C784] group-hover:text-white transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('common.noResults')}</p>
              <Link
                href="/hub/vendor-signup"
                className="mt-4 inline-block px-6 py-2 bg-[#16C784] text-white font-medium rounded-full hover:bg-[#14b876] transition-colors"
              >
                {t('hub.hero.ctaCreateStore')}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-gradient-to-r from-[#1A1A2E] to-[#25253D] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pd-reveal">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t('hub.ctaBanner.title')}</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">{t('hub.ctaBanner.subtitle')}</p>
          <Link
            href="/hub/vendor-signup"
            className="pd-btn pd-btn-primary inline-block px-10 py-4 bg-[#16C784] text-white font-semibold rounded-full shadow-lg shadow-[#16C784]/30 hover:bg-[#14b576] hover:-translate-y-0.5 transition-all text-lg"
          >
            {t('hub.ctaBanner.cta')}
          </Link>
        </div>
      </section>
    </main>
  );
}
