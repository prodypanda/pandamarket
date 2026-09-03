'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { fetchWithCsrf } from '@/lib/api';
import { themes, type ThemeId, type ThemeConfig, type ColorPreset } from '@/lib/themes';
import { revalidateStoreCache } from '@/lib/store-cache';
import {
  Palette,
  Check,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  X,
  ShoppingBag,
  Search,
  Menu,
  Star,
  Truck,
  ShieldCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export default function ThemesPage() {
  const { t, locale, dir } = useLocale();
  const [activeThemeId, setActiveThemeId] = useState<ThemeId | null>(null);
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  // Live preview modal states
  const [previewThemeId, setPreviewThemeId] = useState<ThemeId | null>(null);
  const [previewViewport, setPreviewViewport] = useState<ViewportMode>('desktop');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);

  const fetchStore = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setActiveThemeId((data.store.theme_id || 'classic') as ThemeId);
        setSubdomain(data.store.subdomain || '');
        setCustomDomain(data.store.custom_domain || null);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  // Keyboard Escape listener for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewThemeId) {
        setPreviewThemeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewThemeId]);

  const handleApplyTheme = async (themeId: ThemeId) => {
    if (themeId === activeThemeId) return;
    setApplying(themeId);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme_id: themeId }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveThemeId(data.store?.theme_id || themeId);
        setFeedback({
          message: t('dashboardPages.themes.applySuccess', { name: themes[themeId].name }),
        });
        revalidateStoreCache({ subdomain, custom_domain: customDomain });
      } else {
        const errData = await res.json().catch(() => ({}));
        setFeedback({
          message: errData.error?.message || t('dashboardPages.themes.applyError'),
          isError: true,
        });
      }
    } catch {
      setFeedback({ message: t('dashboardPages.themes.networkError'), isError: true });
    } finally {
      setApplying(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const openPreview = (themeId: ThemeId) => {
    setPreviewThemeId(themeId);
    setSelectedPresetIndex(0);
  };

  const closePreview = () => {
    setPreviewThemeId(null);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" dir={dir}>
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  const themeList = Object.values(themes);
  const activePreviewTheme: ThemeConfig | null = previewThemeId ? themes[previewThemeId] : null;
  const activePreviewPreset: ColorPreset | null =
    activePreviewTheme && activePreviewTheme.colorPresets[selectedPresetIndex]
      ? activePreviewTheme.colorPresets[selectedPresetIndex]
      : activePreviewTheme
        ? activePreviewTheme.colorPresets[0]
        : null;

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header Card */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 p-3 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
              <Palette className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('dashboardPages.themes.title')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('dashboardPages.themes.subtitle', { count: themeList.length })} — Prévisualisez et basculez l&apos;apparence de votre vitrine en direct.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {activeThemeId && (
              <button
                type="button"
                onClick={() => openPreview(activeThemeId)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-2xs"
              >
                <Eye className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <span>Aperçu du thème actif</span>
              </button>
            )}

            {activeThemeId && (
              <Link
                href="/hub/dashboard/online-store/customize"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-white transition shadow-2xs"
              >
                <Sparkles className="h-4 w-4 text-amber-400 dark:text-amber-600" />
                <span>{t('dashboardPages.themes.customizeActive')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-xl p-3.5 text-xs font-semibold flex items-center gap-2 ${
              feedback.isError
                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
            }`}
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Theme Gallery Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {themeList.map((theme) => {
          const isActive = theme.id === activeThemeId;
          const isApplying = applying === theme.id;
          const defaultPreset = theme.colorPresets[0];

          return (
            <div
              key={theme.id}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white dark:bg-slate-900 shadow-2xs transition-all ${
                isActive
                  ? 'border-rose-500 ring-2 ring-rose-500/20 dark:border-rose-500 dark:ring-rose-500/30'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
              }`}
            >
              {/* Preview Thumbnail Box */}
              <div
                className="relative aspect-[4/3] overflow-hidden cursor-pointer"
                onClick={() => openPreview(theme.id)}
                style={{
                  backgroundColor: defaultPreset.background,
                }}
              >
                {/* Mini storefront mockup preview */}
                <div className="absolute inset-0 flex flex-col p-3 gap-2">
                  {/* Header bar */}
                  <div
                    className="rounded-md px-2 py-1.5 flex items-center justify-between"
                    style={{ backgroundColor: defaultPreset.headerBg }}
                  >
                    <div className="flex items-center gap-1">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: defaultPreset.primary }}
                      />
                      <div
                        className="h-1.5 w-12 rounded"
                        style={{ backgroundColor: defaultPreset.text, opacity: 0.6 }}
                      />
                    </div>
                    <div className="flex gap-1">
                      <div
                        className="h-1 w-4 rounded"
                        style={{ backgroundColor: defaultPreset.text, opacity: 0.4 }}
                      />
                      <div
                        className="h-1 w-3 rounded"
                        style={{ backgroundColor: defaultPreset.text, opacity: 0.4 }}
                      />
                    </div>
                  </div>

                  {/* Hero strip */}
                  <div
                    className="rounded-md h-8 flex items-center justify-center"
                    style={{ backgroundColor: defaultPreset.primary }}
                  >
                    <span
                      className="text-[7px] font-bold tracking-wider"
                      style={{ color: defaultPreset.background }}
                    >
                      {theme.name.toUpperCase()}
                    </span>
                  </div>

                  {/* Product cards */}
                  <div className="grid grid-cols-3 gap-1 flex-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="rounded flex flex-col gap-0.5 overflow-hidden p-1 shadow-xs"
                        style={{ backgroundColor: defaultPreset.background }}
                      >
                        <div
                          className="flex-1 rounded-sm"
                          style={{ backgroundColor: defaultPreset.secondary }}
                        />
                        <div
                          className="h-0.5 w-2/3 mx-auto rounded"
                          style={{ backgroundColor: defaultPreset.text, opacity: 0.5 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hover overlay with preview prompt */}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white shadow-md">
                    <Eye className="h-3.5 w-3.5" />
                    <span>Aperçu Responsive</span>
                  </span>
                </div>

                {/* Active Badge */}
                {isActive && (
                  <div className="absolute top-2 right-2 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-md flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    <span>{t('dashboardPages.themes.active')}</span>
                  </div>
                )}
              </div>

              {/* Theme Info & Actions */}
              <div className="flex flex-col gap-3 p-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {theme.name}
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                      {theme.layout.headerStyle}
                    </span>
                  </div>

                  {/* Color Preset Dots */}
                  <div className="mt-2 flex items-center gap-1.5">
                    {theme.colorPresets.slice(0, 5).map((preset) => (
                      <div
                        key={preset.id}
                        className="h-3.5 w-3.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs"
                        style={{ backgroundColor: preset.primary }}
                        title={preset.name}
                      />
                    ))}
                    {theme.colorPresets.length > 5 && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        +{theme.colorPresets.length - 5}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openPreview(theme.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Aperçu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyTheme(theme.id)}
                    disabled={isApplying || isActive}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-default'
                        : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white shadow-2xs'
                    }`}
                  >
                    {isApplying ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>...</span>
                      </>
                    ) : isActive ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Actif</span>
                      </>
                    ) : (
                      <span>Appliquer</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Responsive Live Preview Modal */}
      {previewThemeId && activePreviewTheme && activePreviewPreset && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Preview Control Bar */}
          <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 sm:px-6 shadow-xl">
            {/* Left: Store info & Back button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closePreview}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Fermer l&apos;aperçu</span>
              </button>
              <div className="text-xs">
                <span className="font-extrabold text-white text-sm">
                  {activePreviewTheme.name}
                </span>
                <span className="ml-2 text-slate-400 hidden md:inline">
                  Palette : <strong className="text-slate-200">{activePreviewPreset.name}</strong>
                </span>
              </div>
            </div>

            {/* Center: Responsive Viewport Preview Toggles */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setPreviewViewport('desktop')}
                title="Mode Ordinateur (100%)"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  previewViewport === 'desktop'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bureau (100%)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewport('tablet')}
                title="Mode Tablette (768px)"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  previewViewport === 'tablet'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tablet className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tablette (768px)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewport('mobile')}
                title="Mode Mobile (375px)"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  previewViewport === 'mobile'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mobile (375px)</span>
              </button>
            </div>

            {/* Right: Preset Switcher & Apply CTA */}
            <div className="flex items-center gap-3">
              {/* Preset buttons */}
              <div className="hidden lg:flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
                {activePreviewTheme.colorPresets.map((preset, idx) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetIndex(idx)}
                    title={preset.name}
                    className={`h-6 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                      selectedPresetIndex === idx
                        ? 'bg-slate-800 text-white ring-1 ring-white/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  handleApplyTheme(activePreviewTheme.id);
                  closePreview();
                }}
                disabled={activeThemeId === activePreviewTheme.id || applying === activePreviewTheme.id}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-slate-900 px-4 py-2 text-xs font-extrabold transition shadow-md disabled:opacity-50"
              >
                {activeThemeId === activePreviewTheme.id ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Thème Actif</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Appliquer ce thème</span>
                  </>
                )}
              </button>
            </div>
          </header>

          {/* Main Viewport Shell */}
          <div className="flex-1 overflow-y-auto bg-slate-950/80 p-4 sm:p-6 flex justify-center items-start">
            <div
              className={`transition-all duration-300 overflow-hidden shadow-2xl ${
                previewViewport === 'desktop'
                  ? 'w-full max-w-6xl rounded-2xl border border-slate-800 my-2'
                  : previewViewport === 'tablet'
                    ? 'w-[768px] max-w-full rounded-3xl border-8 border-slate-800 my-4 shadow-2xl'
                    : 'w-[375px] max-w-full rounded-3xl border-8 border-slate-800 my-4 shadow-2xl'
              }`}
              style={{
                backgroundColor: activePreviewPreset.background,
                color: activePreviewPreset.text,
              }}
            >
              {/* Simulated Storefront Header */}
              <div
                className="px-6 py-4 border-b flex items-center justify-between transition-colors"
                style={{
                  backgroundColor: activePreviewPreset.headerBg,
                  borderColor: `${activePreviewPreset.text}20`,
                }}
              >
                <div className="flex items-center gap-4">
                  {previewViewport === 'mobile' && (
                    <button type="button" className="p-1 opacity-70">
                      <Menu className="h-5 w-5" />
                    </button>
                  )}
                  <div>
                    <h4 className="text-base font-black tracking-tight uppercase">
                      {subdomain ? `${subdomain}.tn` : 'Ma Boutique PandaMarket'}
                    </h4>
                    <span className="text-[10px] opacity-60">Tunisie E-commerce</span>
                  </div>
                </div>

                {previewViewport !== 'mobile' && (
                  <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
                    <span className="cursor-pointer font-bold opacity-100">Accueil</span>
                    <span className="cursor-pointer opacity-70 hover:opacity-100">Nouveautés</span>
                    <span className="cursor-pointer opacity-70 hover:opacity-100">Promotions</span>
                    <span className="cursor-pointer opacity-70 hover:opacity-100">Contact</span>
                  </nav>
                )}

                <div className="flex items-center gap-3">
                  <button type="button" className="p-1.5 rounded-full opacity-70 hover:opacity-100">
                    <Search className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="relative p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-xs"
                    style={{
                      backgroundColor: activePreviewPreset.primary,
                      color: activePreviewPreset.background,
                    }}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Panier (2)</span>
                  </button>
                </div>
              </div>

              {/* Simulated Hero Section */}
              <div
                className="px-6 py-12 sm:py-16 text-center relative overflow-hidden"
                style={{
                  backgroundColor: activePreviewPreset.secondary,
                }}
              >
                <div className="max-w-2xl mx-auto space-y-4">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                    style={{
                      backgroundColor: `${activePreviewPreset.primary}20`,
                      color: activePreviewPreset.primary,
                    }}
                  >
                    Collection Artisanale & Moderne
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                    L&apos;artisanat tunisien réinventé pour votre quotidien
                  </h2>
                  <p className="text-xs sm:text-sm opacity-80 leading-relaxed max-w-lg mx-auto">
                    Découvrez des créations uniques fabriquées à la main avec passion par nos maîtres artisans certifiés.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      className="px-6 py-2.5 rounded-xl text-xs font-bold shadow-md transition transform hover:scale-105"
                      style={{
                        backgroundColor: activePreviewPreset.primary,
                        color: activePreviewPreset.background,
                      }}
                    >
                      Explorer le catalogue
                    </button>
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold border opacity-80 hover:opacity-100 transition"
                      style={{
                        borderColor: `${activePreviewPreset.text}40`,
                      }}
                    >
                      En savoir plus
                    </button>
                  </div>
                </div>
              </div>

              {/* Simulated Trust Badges Bar */}
              <div
                className="px-6 py-4 border-y grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs"
                style={{
                  borderColor: `${activePreviewPreset.text}15`,
                  backgroundColor: `${activePreviewPreset.background}dd`,
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Truck className="h-4 w-4 opacity-70" />
                  <span className="font-semibold">Livraison 24-48h toute la Tunisie</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4 opacity-70" />
                  <span className="font-semibold">Paiement sécurisé à la livraison (COD)</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4 opacity-70" />
                  <span className="font-semibold">Service client 7j/7</span>
                </div>
              </div>

              {/* Simulated Products Grid */}
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Produits Phares</h3>
                    <p className="text-xs opacity-60">Sélectionnés avec soin pour vous</p>
                  </div>
                  <span className="text-xs font-bold underline cursor-pointer opacity-80">
                    Voir tout
                  </span>
                </div>

                <div
                  className={`grid gap-4 ${
                    previewViewport === 'mobile'
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : previewViewport === 'tablet'
                        ? 'grid-cols-2 sm:grid-cols-3'
                        : 'grid-cols-2 sm:grid-cols-4'
                  }`}
                >
                  {[
                    {
                      title: 'Coussin Berbère Fouta Tissé',
                      category: 'Maison & Déco',
                      price: '65.000 TND',
                      oldPrice: '85.000 TND',
                      badge: '-23%',
                    },
                    {
                      title: 'Coffret Huile d’Olive Bio 750ml',
                      category: 'Épicerie Fine',
                      price: '38.500 TND',
                      badge: 'Populaire',
                    },
                    {
                      title: 'Sac Cabas Cuir Véritable Nabeul',
                      category: 'Maroquinerie',
                      price: '145.000 TND',
                      oldPrice: '180.000 TND',
                      badge: 'Artisanal',
                    },
                    {
                      title: 'Service à Thé en Céramique Sejnane',
                      category: 'Arts de la Table',
                      price: '89.000 TND',
                      badge: 'Nouveau',
                    },
                  ].map((p, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border overflow-hidden flex flex-col p-3 shadow-xs space-y-3"
                      style={{
                        borderColor: `${activePreviewPreset.text}15`,
                        backgroundColor: activePreviewPreset.headerBg,
                      }}
                    >
                      <div
                        className="relative aspect-square rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: activePreviewPreset.secondary }}
                      >
                        <span className="text-3xl">🏺</span>
                        <span
                          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
                          style={{
                            backgroundColor: activePreviewPreset.primary,
                            color: activePreviewPreset.background,
                          }}
                        >
                          {p.badge}
                        </span>
                      </div>
                      <div className="space-y-1 flex-1">
                        <span className="text-[10px] uppercase font-bold opacity-60">
                          {p.category}
                        </span>
                        <h4 className="text-xs font-bold line-clamp-1">{p.title}</h4>
                        <div className="flex items-center gap-1 text-amber-500 text-[10px]">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="font-bold">4.9</span>
                          <span className="opacity-50">(32 avis)</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/40 dark:border-slate-800">
                        <div>
                          <span className="text-xs font-black">{p.price}</span>
                          {p.oldPrice && (
                            <span className="text-[10px] line-through opacity-50 ml-1.5">
                              {p.oldPrice}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-xs font-bold"
                          style={{
                            backgroundColor: activePreviewPreset.primary,
                            color: activePreviewPreset.background,
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulated Footer */}
              <div
                className="px-6 py-8 border-t text-xs space-y-4"
                style={{
                  backgroundColor: activePreviewPreset.footerBg,
                  color: '#FFFFFF',
                }}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-sm">
                      {subdomain ? `${subdomain}.pandamarket.tn` : 'PandaMarket Store'}
                    </h5>
                    <p className="text-[11px] opacity-70">
                      Commerce électronique sécurisé propulsé par PandaMarket Tunisie.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-80 text-[11px]">
                    <span>D17</span>
                    <span>•</span>
                    <span>Konnect</span>
                    <span>•</span>
                    <span>Sobflous</span>
                    <span>•</span>
                    <span>Espèces (COD)</span>
                  </div>
                </div>
                <div className="text-[10px] opacity-50 text-center border-t border-white/10 pt-3">
                  © 2026 {subdomain || 'Boutique'}. Tous droits réservés.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
