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
  ArrowRight,
  Package,
} from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  image_url?: string | null;
  banner_url?: string | null;
  description?: string | null;
  description_fr?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
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

function getCategoryIconComponent(cat: CategoryNode): React.ElementType {
  if (cat.icon && ICON_MAP[cat.icon]) {
    return ICON_MAP[cat.icon];
  }

  const slug = (cat.slug || '').toLowerCase();

  if (slug.includes('phone') || slug.includes('telecom') || slug.includes('smartphone')) return Smartphone;
  if (slug.includes('fashion') || slug.includes('vetement') || slug.includes('mode')) return Shirt;
  if (slug.includes('home') || slug.includes('maison') || slug.includes('deco')) return Home;
  if (slug.includes('auto') || slug.includes('tool') || slug.includes('bricolage')) return Wrench;
  if (slug.includes('sport') || slug.includes('fit')) return Dumbbell;
  if (slug.includes('beauty') || slug.includes('beaute') || slug.includes('parfum') || slug.includes('soin')) return Sparkles;
  if (slug.includes('child') || slug.includes('baby') || slug.includes('bebe') || slug.includes('kid')) return Baby;
  if (slug.includes('bijou') || slug.includes('watch') || slug.includes('montre')) return Gem;
  if (slug.includes('food') || slug.includes('alimen') || slug.includes('restau')) return Utensils;
  if (slug.includes('book') || slug.includes('livre') || slug.includes('bureau')) return BookOpen;
  if (slug.includes('game') || slug.includes('jouet') || slug.includes('toy')) return Tv;
  if (slug.includes('media') || slug.includes('tv') || slug.includes('video')) return Tv;
  if (slug.includes('audio') || slug.includes('music') || slug.includes('casque')) return Music;
  return Layers;
}

const CATEGORY_GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-emerald-600 to-teal-700',
  'from-rose-600 to-pink-700',
  'from-amber-500 to-orange-700',
  'from-purple-600 to-violet-800',
  'from-cyan-600 to-blue-700',
  'from-fuchsia-600 to-pink-700',
];

function getCategoryGradient(index: number): string {
  return CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length];
}

export interface CategoryMegaMenuProps {
  variant?: 'classic' | 'aliexpress' | 'aliexpress2';
  marketplaceTheme?: 'panda' | 'aliexpress' | 'aliexpress2';
  megamenuStyle?: 'standard' | 'visual_rich' | 'ultra_rich' | 'ultra_rich_deep';
}

export function CategoryMegaMenu({ variant, marketplaceTheme, megamenuStyle: propMegamenuStyle }: CategoryMegaMenuProps) {
  const { locale } = useLocale();
  const isRtl = locale === 'ar';
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryNode | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<CategoryNode | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [configuredStyle, setConfiguredStyle] = useState<'standard' | 'visual_rich' | 'ultra_rich' | 'ultra_rich_deep'>('standard');
  const menuRef = useRef<HTMLDivElement>(null);

  const theme = marketplaceTheme || variant || 'panda';
  const isAliExpress = theme === 'aliexpress' || theme === 'aliexpress2';
  const isAliExpress2 = theme === 'aliexpress2';

  const activeMegamenuStyle = propMegamenuStyle || configuredStyle;
  const isVisualRich = activeMegamenuStyle === 'visual_rich';
  const isUltraRich = activeMegamenuStyle === 'ultra_rich';
  const isUltraRichDeep = activeMegamenuStyle === 'ultra_rich_deep';

  useEffect(() => {
    let active = true;
    async function fetchSettings() {
      try {
        const res = await fetch('/api/pd/marketplace/settings');
        if (active && res.ok) {
          const json = await res.json();
          if (json.data?.hub_megamenu_style) {
            setConfiguredStyle(json.data.hub_megamenu_style);
          }
        }
      } catch {
        // Fallback default
      }
    }
    fetchSettings();
    return () => {
      active = false;
    };
  }, []);

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
            if (treeData[0].children && treeData[0].children.length > 0) {
              setActiveSubcategory(treeData[0].children[0]);
            }
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

  const getLocalizedDescription = (cat: CategoryNode) => {
    if (locale === 'ar' && cat.description_ar) return cat.description_ar;
    if (locale === 'fr' && cat.description_fr) return cat.description_fr;
    if (locale === 'en' && cat.description_en) return cat.description_en;
    return cat.description || '';
  };

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
          className={`absolute ${isRtl ? 'right-0' : 'left-0'} top-full mt-3 z-50 transition-all duration-300 ${
            isUltraRichDeep
              ? 'w-[1120px] max-w-[98vw] rounded-3xl border border-slate-200/90 bg-white/98 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0f172a]/98'
              : isUltraRich
                ? 'w-[1040px] max-w-[98vw] rounded-3xl border border-slate-200/90 bg-white/98 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0f172a]/98'
                : isVisualRich
                  ? 'w-[980px] max-w-[96vw] rounded-3xl border border-slate-200/80 bg-white/98 p-5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#111827]/98'
                  : 'w-[850px] max-w-[95vw] rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#1A1A2E]/95'
          }`}
        >
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                <Sparkles className="h-5 w-5 animate-spin text-amber-500" />
                <span>
                  {locale === 'ar' ? 'جاري تحميل الأقسام...' : locale === 'en' ? 'Loading categories...' : 'Chargement des catégories...'}
                </span>
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-xs font-semibold text-slate-500">
              {locale === 'ar' ? 'لا توجد أقسام متوفرة' : locale === 'en' ? 'No categories available' : 'Aucune catégorie disponible'}
            </div>
          ) : isUltraRichDeep ? (
            /* ======================================================================================== */
            /* VERSION 4: ULTRA-RICH DEEP SHOWCASE (LARGE PICTURES, HERO BANNER & INTERACTIVE SUBMENUS) */
            /* ======================================================================================== */
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column: Department List */}
              <div className="col-span-3 max-h-[580px] overflow-y-auto space-y-2 pr-2 border-r border-slate-100 dark:border-white/10">
                <div className="px-2 py-1 mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {locale === 'ar' ? 'الأقسام الرئيسية' : locale === 'en' ? 'Main Departments' : 'Rayons Principaux'}
                  </span>
                  <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[9px] font-extrabold text-[#ff6a00]">
                    V4 Deep
                  </span>
                </div>
                {categories.map((cat, idx) => {
                  const IconComp = getCategoryIconComponent(cat);
                  const isActive = activeCategory?.id === cat.id;

                  return (
                    <button
                      key={cat.id}
                      onMouseEnter={() => {
                        setActiveCategory(cat);
                        setActiveSubcategory(cat.children && cat.children.length > 0 ? cat.children[0] : null);
                      }}
                      onClick={() => {
                        setActiveCategory(cat);
                        setActiveSubcategory(cat.children && cat.children.length > 0 ? cat.children[0] : null);
                      }}
                      className={`group flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/25'
                          : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            className="h-10 w-10 rounded-2xl object-cover shrink-0 border border-slate-200/50 shadow-sm"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getCategoryGradient(
                              idx
                            )} text-white shadow-sm`}
                          >
                            <IconComp className="h-5 w-5" />
                          </div>
                        )}
                        <div className="flex flex-col text-left rtl:text-right truncate">
                          <span className="truncate text-xs font-black">{cat.name}</span>
                          <span
                            className={`truncate text-[10px] font-semibold ${
                              isActive ? 'text-orange-100' : 'text-slate-400'
                            }`}
                          >
                            {cat.children?.length || 0}{' '}
                            {locale === 'ar' ? 'قسم فرعي' : locale === 'en' ? 'subcategories' : 'sous-catégories'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          isActive ? 'translate-x-0.5 opacity-100 text-white' : 'opacity-30 group-hover:opacity-70'
                        } ${isRtl ? 'rotate-180' : ''}`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Right Main Showcase Container */}
              <div className="col-span-9 max-h-[580px] overflow-y-auto space-y-5 pr-1">
                {activeCategory && (
                  <>
                    {/* Large 220px Tall Hero Banner */}
                    <div className="relative h-52 overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-900 text-white shadow-xl dark:border-white/10">
                      {activeCategory.image_url ? (
                        <img
                          src={activeCategory.image_url}
                          alt={activeCategory.name}
                          className="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-700 hover:scale-105"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-r ${getCategoryGradient(0)} opacity-80`} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />

                      <div className="relative z-10 flex h-full flex-col justify-between p-6">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase text-slate-950 shadow-md">
                            <Sparkles className="h-3.5 w-3.5" />
                            {locale === 'ar' ? 'عرض تصفح كامل بالصور الكبيرة والأقسام الفرعية' : locale === 'en' ? 'Large Pictures & Deep Submenus Showcase' : 'Showcase Grandes Images & Sous-Menus'}
                          </span>
                          <span className="rounded-xl bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-bold text-slate-200 border border-white/20">
                            {activeCategory.children?.length || 0} {locale === 'ar' ? 'قسم فرعي' : locale === 'en' ? 'Subcategories' : 'Sous-Catégories'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <h2 className="text-2xl font-black tracking-wide text-white drop-shadow-md">{activeCategory.name}</h2>
                          {getLocalizedDescription(activeCategory) && (
                            <p className="text-xs text-slate-200 max-w-[85%] leading-relaxed line-clamp-2 drop-shadow-sm">
                              {getLocalizedDescription(activeCategory)}
                            </p>
                          )}
                          <div className="pt-1">
                            <Link
                              href={`/hub/category/${activeCategory.slug}`}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg transition-all hover:scale-105 hover:shadow-orange-500/25"
                            >
                              <span>{locale === 'ar' ? 'تصفح جميع المنتجات' : locale === 'en' ? 'Explore Full Collection' : 'Explorer Toute La Collection'}</span>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Large Picture Subcategory Card Grid (Style 3 Layout) with Deep Level 2/3 Submenus */}
                    <div className="grid grid-cols-3 gap-4">
                      {activeCategory.children?.map((sub, idx) => {
                        const SubIcon = getCategoryIconComponent(sub);
                        const subDesc = getLocalizedDescription(sub);
                        const isExpanded = activeSubcategory?.id === sub.id;

                        return (
                          <div
                            key={sub.id}
                            className={`group relative flex flex-col overflow-hidden rounded-3xl border transition-all duration-300 ${
                              isExpanded
                                ? 'border-orange-500 bg-white shadow-2xl ring-2 ring-orange-500/20 dark:bg-slate-900'
                                : 'border-slate-200/80 bg-white shadow-md hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-orange-500/15 dark:border-white/10 dark:bg-slate-900'
                            }`}
                          >
                            {/* Large 136px Picture Frame (Exactly like Style 3) */}
                            <Link
                              href={`/hub/category/${sub.slug}`}
                              onClick={() => setIsOpen(false)}
                              className="relative h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-800"
                            >
                              {sub.image_url ? (
                                <img
                                  src={sub.image_url}
                                  alt={sub.name}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getCategoryGradient(idx)} text-white`}>
                                  <SubIcon className="h-10 w-10 opacity-80" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />
                              <span className="absolute bottom-2.5 left-3 right-3 text-xs font-black text-white truncate drop-shadow-md">
                                {sub.name}
                              </span>
                            </Link>

                            {/* Subcategory Info & Deep Interactive Submenus */}
                            <div className="flex flex-1 flex-col justify-between p-3.5 space-y-2.5">
                              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                                {subDesc || (locale === 'ar' ? 'تشكيلة منتجات ممتازة' : locale === 'en' ? 'Premium product selection' : 'Sélection premium')}
                              </p>

                              {/* Interactive Deep Level 3 Sub-Subcategories Grid / Chips */}
                              {sub.children && sub.children.length > 0 && (
                                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-white/5">
                                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                                    {locale === 'ar' ? 'الأقسام الفرعية الدقيقة:' : locale === 'en' ? 'Level 3 Submenus:' : 'Sous-menus Niveau 3:'}
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {sub.children.map((child) => (
                                      <Link
                                        key={child.id}
                                        href={`/hub/category/${child.slug}`}
                                        onClick={() => setIsOpen(false)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-orange-50/80 px-2 py-1 text-[10px] font-bold text-[#ff6a00] hover:bg-orange-600 hover:text-white transition-all dark:bg-white/10 dark:text-orange-300"
                                      >
                                        <span>{child.name}</span>
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-white/5">
                                <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-0.5 text-[10px] font-black text-[#ff6a00] border border-orange-100">
                                  <Package className="h-3 w-3" />
                                  {sub.product_count || 0} {locale === 'ar' ? 'منتج' : locale === 'en' ? 'products' : 'produits'}
                                </span>
                                <Link
                                  href={`/hub/category/${sub.slug}`}
                                  onClick={() => setIsOpen(false)}
                                  className="flex items-center gap-1 text-[11px] font-black text-slate-900 group-hover:text-amber-500 dark:text-white transition-colors"
                                >
                                  <span>{locale === 'ar' ? 'تصفح' : locale === 'en' ? 'View' : 'Voir'}</span>
                                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : isUltraRich ? (
            /* ========================================================================= */
            /* VERSION 3: ULTRA-RICH SHOWCASE (LARGE HERO BANNERS & LARGE PICTURE CARDS) */
            /* ========================================================================= */
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column: Department List */}
              <div className="col-span-3 max-h-[560px] overflow-y-auto space-y-2 pr-2 border-r border-slate-100 dark:border-white/10">
                <div className="px-2 py-1 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {locale === 'ar' ? 'الأقسام الرئيسية' : locale === 'en' ? 'Main Departments' : 'Rayons Principaux'}
                  </span>
                </div>
                {categories.map((cat, idx) => {
                  const IconComp = getCategoryIconComponent(cat);
                  const isActive = activeCategory?.id === cat.id;

                  return (
                    <button
                      key={cat.id}
                      onMouseEnter={() => setActiveCategory(cat)}
                      onClick={() => setActiveCategory(cat)}
                      className={`group flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                          : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            className="h-10 w-10 rounded-2xl object-cover shrink-0 border border-slate-200/50 shadow-sm"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getCategoryGradient(
                              idx
                            )} text-white shadow-sm`}
                          >
                            <IconComp className="h-5 w-5" />
                          </div>
                        )}
                        <div className="flex flex-col text-left rtl:text-right truncate">
                          <span className="truncate text-xs font-black">{cat.name}</span>
                          <span
                            className={`truncate text-[10px] font-semibold ${
                              isActive ? 'text-orange-100' : 'text-slate-400'
                            }`}
                          >
                            {cat.children?.length || 0}{' '}
                            {locale === 'ar' ? 'قسم فرعي' : locale === 'en' ? 'subcategories' : 'sous-catégories'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          isActive ? 'translate-x-0.5 opacity-100 text-white' : 'opacity-30 group-hover:opacity-70'
                        } ${isRtl ? 'rotate-180' : ''}`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Right Main Showcase Container */}
              <div className="col-span-9 max-h-[560px] overflow-y-auto space-y-5 pr-1">
                {activeCategory && (
                  <>
                    {/* Large 220px Tall Hero Banner */}
                    <div className="relative h-52 overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-900 text-white shadow-xl dark:border-white/10">
                      {activeCategory.image_url ? (
                        <img
                          src={activeCategory.image_url}
                          alt={activeCategory.name}
                          className="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-700 hover:scale-105"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-r ${getCategoryGradient(0)} opacity-80`} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />

                      <div className="relative z-10 flex h-full flex-col justify-between p-6">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase text-slate-950 shadow-md">
                            <Sparkles className="h-3.5 w-3.5" />
                            {locale === 'ar' ? 'تشكيلة مميزة' : locale === 'en' ? 'Featured Collection' : 'Rayon d\'Exception'}
                          </span>
                          <span className="rounded-xl bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-bold text-slate-200 border border-white/20">
                            {activeCategory.children?.length || 0} {locale === 'ar' ? 'قسم فرعي' : locale === 'en' ? 'Subcategories' : 'Sous-Catégories'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <h2 className="text-2xl font-black tracking-wide text-white drop-shadow-md">{activeCategory.name}</h2>
                          {getLocalizedDescription(activeCategory) && (
                            <p className="text-xs text-slate-200 max-w-[85%] leading-relaxed line-clamp-2 drop-shadow-sm">
                              {getLocalizedDescription(activeCategory)}
                            </p>
                          )}
                          <div className="pt-1">
                            <Link
                              href={`/hub/category/${activeCategory.slug}`}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg transition-all hover:scale-105 hover:shadow-orange-500/25"
                            >
                              <span>{locale === 'ar' ? 'تصفح جميع المنتجات' : locale === 'en' ? 'Explore Full Collection' : 'Explorer Toute La Collection'}</span>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Large Picture Subcategory Card Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      {activeCategory.children?.map((sub, idx) => {
                        const SubIcon = getCategoryIconComponent(sub);
                        const subDesc = getLocalizedDescription(sub);

                        return (
                          <Link
                            key={sub.id}
                            href={`/hub/category/${sub.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-orange-500/15 dark:border-white/10 dark:bg-slate-900"
                          >
                            {/* Large 130px Picture Frame */}
                            <div className="relative h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                              {sub.image_url ? (
                                <img
                                  src={sub.image_url}
                                  alt={sub.name}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getCategoryGradient(idx)} text-white`}>
                                  <SubIcon className="h-10 w-10 opacity-80" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                              <span className="absolute bottom-2.5 left-3 right-3 text-xs font-black text-white truncate drop-shadow-md">
                                {sub.name}
                              </span>
                            </div>

                            {/* Subcategory Info & Localized Description */}
                            <div className="flex flex-1 flex-col justify-between p-3.5 space-y-2">
                              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                                {subDesc || (locale === 'ar' ? 'تشكيلة منتجات ممتازة' : locale === 'en' ? 'Premium product selection' : 'Sélection premium')}
                              </p>

                              {/* Deeper Level 3+ Subcategory Chips */}
                              {sub.children && sub.children.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {sub.children.slice(0, 3).map((child) => (
                                    <span
                                      key={child.id}
                                      className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[9.5px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300"
                                    >
                                      {child.name}
                                    </span>
                                  ))}
                                  {sub.children.length > 3 && (
                                    <span className="text-[9px] font-extrabold text-orange-500 self-center">
                                      +{sub.children.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-white/5">
                                <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-0.5 text-[10px] font-black text-[#ff6a00] border border-orange-100">
                                  <Package className="h-3 w-3" />
                                  {sub.product_count || 0} {locale === 'ar' ? 'منتج' : locale === 'en' ? 'products' : 'produits'}
                                </span>
                                <span className="flex items-center gap-1 text-[11px] font-black text-slate-900 group-hover:text-amber-500 dark:text-white transition-colors">
                                  <span>{locale === 'ar' ? 'عرض' : locale === 'en' ? 'View' : 'Voir'}</span>
                                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                </span>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : isVisualRich ? (
            /* ========================================================= */
            /* VERSION 2: VISUAL RICH MEGAMENU (COMPACT PICTURE CARDS)   */
            /* ========================================================= */
            <div className="grid grid-cols-12 gap-5">
              {/* Left Column: Department Selector List */}
              <div className="col-span-4 max-h-[500px] overflow-y-auto space-y-1.5 pr-2 border-r border-slate-100 dark:border-white/10">
                <div className="px-2 py-1 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {locale === 'ar' ? 'الأقسام الرئيسية' : locale === 'en' ? 'Main Departments' : 'Rayons Principaux'}
                  </span>
                </div>
                {categories.map((cat, idx) => {
                  const IconComp = getCategoryIconComponent(cat);
                  const isActive = activeCategory?.id === cat.id;

                  return (
                    <button
                      key={cat.id}
                      onMouseEnter={() => setActiveCategory(cat)}
                      onClick={() => setActiveCategory(cat)}
                      className={`group flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md shadow-slate-900/10 dark:from-amber-500 dark:to-orange-600 dark:text-slate-950'
                          : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            className="h-8 w-8 rounded-xl object-cover shrink-0 border border-slate-200/50 shadow-sm"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getCategoryGradient(
                              idx
                            )} text-white shadow-sm`}
                          >
                            <IconComp className="h-4 w-4" />
                          </div>
                        )}
                        <div className="flex flex-col text-left rtl:text-right truncate">
                          <span className="truncate text-xs font-extrabold">{cat.name}</span>
                          <span
                            className={`truncate text-[10px] font-medium ${
                              isActive ? 'text-slate-300 dark:text-slate-900' : 'text-slate-400'
                            }`}
                          >
                            {cat.children?.length || 0}{' '}
                            {locale === 'ar' ? 'قسم فرعي' : locale === 'en' ? 'subcategories' : 'sous-catégories'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          isActive ? 'translate-x-0.5 opacity-100' : 'opacity-30 group-hover:opacity-70'
                        } ${isRtl ? 'rotate-180' : ''}`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Visual Showcase Panel */}
              <div className="col-span-8 max-h-[500px] overflow-y-auto space-y-4 pr-1">
                {activeCategory ? (
                  <div>
                    {/* Header Banner with Category Details */}
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 text-white shadow-lg dark:border-white/10">
                      {activeCategory.image_url && (
                        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 bg-cover bg-center mix-blend-overlay" style={{ backgroundImage: `url(${activeCategory.image_url})` }} />
                      )}
                      <div className="relative z-10 flex items-start justify-between gap-4">
                        <div className="space-y-1.5 max-w-[75%]">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300 border border-amber-400/30">
                              <Sparkles className="h-3 w-3" />
                              {locale === 'ar' ? 'قسم مميز' : locale === 'en' ? 'Featured Department' : 'Rayon en vedette'}
                            </span>
                          </div>
                          <h3 className="text-lg font-black text-white tracking-wide">{activeCategory.name}</h3>
                          {getLocalizedDescription(activeCategory) && (
                            <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                              {getLocalizedDescription(activeCategory)}
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/hub/category/${activeCategory.slug}`}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-slate-900 shadow-md transition-all hover:bg-amber-400 hover:text-slate-950 hover:scale-105"
                        >
                          <span>{locale === 'ar' ? 'تصفح القسم' : locale === 'en' ? 'Explore All' : 'Tout Explorer'}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Subcategories Visual Grid */}
                    <div className="mt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                          {locale === 'ar' ? 'الأقسام الفرعية' : locale === 'en' ? 'Subcategories' : 'Sous-Catégories'}
                        </h4>
                        <span className="text-[11px] font-bold text-slate-400">
                          {activeCategory.children?.length || 0}{' '}
                          {locale === 'ar' ? 'عنصر' : locale === 'en' ? 'items' : 'éléments'}
                        </span>
                      </div>

                      {activeCategory.children && activeCategory.children.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3.5">
                          {activeCategory.children.map((sub, idx) => {
                            const subDesc = getLocalizedDescription(sub);
                            const SubIcon = getCategoryIconComponent(sub);

                            return (
                              <Link
                                key={sub.id}
                                href={`/hub/category/${sub.slug}`}
                                onClick={() => setIsOpen(false)}
                                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/80 hover:bg-white hover:shadow-xl hover:shadow-amber-500/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                      {sub.image_url ? (
                                        <img
                                          src={sub.image_url}
                                          alt={sub.name}
                                          className="h-9 w-9 rounded-xl object-cover border border-slate-200/50 shadow-sm"
                                          onError={(e) => {
                                            (e.currentTarget as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div
                                          className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${getCategoryGradient(
                                            idx + 2
                                          )} text-white shadow-sm`}
                                        >
                                          <SubIcon className="h-4 w-4" />
                                        </div>
                                      )}
                                      <span className="text-xs font-black text-slate-900 group-hover:text-amber-800 dark:text-white dark:group-hover:text-amber-400">
                                        {sub.name}
                                      </span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                                  </div>

                                  {subDesc ? (
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                                      {subDesc}
                                    </p>
                                  ) : (
                                    <p className="text-[11px] italic text-slate-400">
                                      {locale === 'ar' ? 'تصفح التشكيلة الكاملة' : locale === 'en' ? 'Browse complete collection' : 'Parcourir la collection'}
                                    </p>
                                  )}
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-slate-200/50 pt-2.5 dark:border-white/5">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                    <Package className="h-3 w-3 text-slate-400" />
                                    {locale === 'ar'
                                      ? `${sub.product_count || 0} منتج`
                                      : locale === 'en'
                                        ? `${sub.product_count || 0} products`
                                        : `${sub.product_count || 0} produits`}
                                  </span>
                                  <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 group-hover:underline">
                                    {locale === 'ar' ? 'عرض ➔' : locale === 'en' ? 'View ➔' : 'Voir ➔'}
                                  </span>
                                </div>
                              </Link>
                            );
                          })}
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
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* VERSION 1: STANDARD MEGAMENU (ALIBABA COMPACT LIST)       */
            /* ========================================================= */
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
