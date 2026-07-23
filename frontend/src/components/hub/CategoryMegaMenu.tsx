'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronDown,
  Grid,
  Layers,
  Sparkles,
  Smartphone,
  Shirt,
  Home,
  Utensils,
  Palette,
  Dumbbell,
  Wrench,
  Baby,
  BookOpen,
  HeartPulse,
  Gem,
  Dog,
  Sparkle,
  Music,
  Briefcase,
  User,
  Tv,
} from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  product_count?: number;
  children?: CategoryNode[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  Smartphone,
  Shirt,
  Home,
  Utensils,
  Palette,
  Dumbbell,
  Wrench,
  Baby,
  BookOpen,
  HeartPulse,
  Gem,
  Dog,
  Sparkle,
  Music,
  Briefcase,
  User,
  Tv,
};

function getCategoryIconComponent(cat: CategoryNode) {
  if (cat.icon && ICON_MAP[cat.icon]) {
    return ICON_MAP[cat.icon];
  }
  const slug = (cat.slug || cat.name || '').toLowerCase();
  if (slug.includes('electr') || slug.includes('tech') || slug.includes('phone') || slug.includes('ordinat')) return Smartphone;
  if (slug.includes('fash') || slug.includes('vetement') || slug.includes('cloth') || slug.includes('mode')) return Shirt;
  if (slug.includes('home') || slug.includes('maison') || slug.includes('meuble') || slug.includes('furnit')) return Home;
  if (slug.includes('beaut') || slug.includes('beaute') || slug.includes('cosmet')) return Sparkle;
  if (slug.includes('auto') || slug.includes('vehic') || slug.includes('car')) return Wrench;
  if (slug.includes('bijou') || slug.includes('watch') || slug.includes('montre')) return Gem;
  if (slug.includes('food') || slug.includes('alimen') || slug.includes('restau')) return Utensils;
  if (slug.includes('book') || slug.includes('livre') || slug.includes('bureau')) return BookOpen;
  if (slug.includes('game') || slug.includes('jouet') || slug.includes('toy')) return Tv;
  if (slug.includes('media') || slug.includes('tv') || slug.includes('video')) return Tv;
  if (slug.includes('audio') || slug.includes('music') || slug.includes('casque')) return Music;
  return Layers;
}

export interface CategoryMegaMenuProps {
  variant?: 'classic' | 'aliexpress' | 'aliexpress2';
  marketplaceTheme?: 'panda' | 'aliexpress' | 'aliexpress2';
}

export function CategoryMegaMenu({ variant, marketplaceTheme }: CategoryMegaMenuProps) {
  const { locale } = useLocale();
  const isRtl = locale === 'ar';
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryNode | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const theme = marketplaceTheme || variant || 'panda';
  const isAliExpress = theme === 'aliexpress' || theme === 'aliexpress2';
  const isAliExpress2 = theme === 'aliexpress2';

  useEffect(() => {
    let cancelled = false;
    async function fetchCategories() {
      setLoading(true);
      try {
        const res = await fetch(`/api/pd/categories?tree=true&locale=${locale}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          const treeData: CategoryNode[] = data.data || [];
          setCategories(treeData);
          if (treeData.length > 0) {
            setActiveCategory(treeData[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load mega-menu categories:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (isOpen) {
      fetchCategories();
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, locale]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buttonStyle = isAliExpress2
    ? 'bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] text-white hover:opacity-95 shadow-md shadow-orange-900/20'
    : isAliExpress
      ? 'bg-gradient-to-r from-[#ff4747] to-[#ff8a00] text-white hover:opacity-90 shadow-md shadow-orange-900/10'
      : 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-xs font-black transition-all ${buttonStyle}`}
        aria-expanded={isOpen}
      >
        <Grid className="h-4 w-4" />
        <span className="tracking-wide">
          {locale === 'ar' ? 'جميع الأقسام' : locale === 'en' ? 'All Departments' : 'Toutes les catégories'}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className={`absolute ${isRtl ? 'right-0' : 'left-0'} top-full mt-3 z-50 w-[850px] max-w-[95vw] rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#1A1A2E]/95`}
        >
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                <Sparkles className="h-4 w-4 animate-spin text-amber-500" />
                <span>
                  {locale === 'ar' ? 'جاري تحميل الأقسام...' : locale === 'en' ? 'Loading categories...' : 'Chargement des catégories...'}
                </span>
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-xs font-semibold text-slate-500">
              {locale === 'ar' ? 'لا توجد أقسام متوفرة' : locale === 'en' ? 'No categories available' : 'Aucune catégorie disponible'}
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4 border-r border-slate-100 dark:border-white/10 pr-2 space-y-1 max-h-[420px] overflow-y-auto">
                {categories.map((cat) => {
                  const IconComp = getCategoryIconComponent(cat);
                  const isActive = activeCategory?.id === cat.id;

                  return (
                    <button
                      key={cat.id}
                      onMouseEnter={() => setActiveCategory(cat)}
                      onClick={() => setActiveCategory(cat)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                        isActive
                          ? isAliExpress
                            ? 'bg-orange-50 text-[#ff4747] dark:bg-orange-950/40 dark:text-orange-400'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <IconComp className="h-4 w-4 shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <ChevronRight className={`h-3.5 w-3.5 shrink-0 opacity-40 ${isRtl ? 'rotate-180' : ''}`} />
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Multi-Column Subcategory Panel */}
              <div className="col-span-8 p-2 max-h-[420px] overflow-y-auto">
                {activeCategory ? (
                  <div>
                    <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          {activeCategory.name}
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-400">
                          {locale === 'ar'
                            ? `${activeCategory.children?.length || 0} قسم فرعي`
                            : locale === 'en'
                              ? `${activeCategory.children?.length || 0} subcategories`
                              : `${activeCategory.children?.length || 0} sous-catégories`}
                        </p>
                      </div>
                      <Link
                        href={`/hub/category/${activeCategory.slug}`}
                        onClick={() => setIsOpen(false)}
                        className={`text-xs font-extrabold transition-colors ${
                          isAliExpress ? 'text-[#ff4747] hover:underline' : 'text-emerald-600 hover:underline'
                        }`}
                      >
                        {locale === 'ar' ? 'تصفح الكل ➔' : locale === 'en' ? 'Browse All ➔' : 'Tout parcourir ➔'}
                      </Link>
                    </div>

                    {/* Subcategories Grid */}
                    {activeCategory.children && activeCategory.children.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {activeCategory.children.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/hub/category/${sub.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="group flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50/30 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
                          >
                            <span className="text-xs font-extrabold text-slate-800 group-hover:text-amber-800 dark:text-slate-200 dark:group-hover:text-amber-400">
                              {sub.name}
                            </span>
                            <span className="mt-2 text-[10px] font-bold text-slate-400">
                              {locale === 'ar'
                                ? `${sub.product_count || 0} منتج`
                                : locale === 'en'
                                  ? `${sub.product_count || 0} products`
                                  : `${sub.product_count || 0} produits`}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-semibold text-slate-400 dark:border-white/10">
                        <p>
                          {locale === 'ar'
                            ? `استكشف المنتجات في قسم ${activeCategory.name}`
                            : locale === 'en'
                              ? `Explore products in ${activeCategory.name}`
                              : `Explorez les produits dans ${activeCategory.name}`}
                        </p>
                        <Link
                          href={`/hub/category/${activeCategory.slug}`}
                          onClick={() => setIsOpen(false)}
                          className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                        >
                          {locale === 'ar' ? 'الانتقال إلى القسم' : locale === 'en' ? 'Go to department' : 'Accéder au rayon'}
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs font-semibold text-slate-400">
                    {locale === 'ar' ? 'اختر قسمًا من القائمة على اليمين' : locale === 'en' ? 'Select a category from the left menu' : 'Sélectionnez un rayon à gauche'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
