'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Palette,
  Check,
  Sparkles,
  RefreshCw,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  X,
  ShoppingBag,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Paintbrush,
  Globe,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { ReGoKpiHero, ReGoStatusChip } from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';
import type { ThemeId, ThemeConfig } from '@/lib/themes';
import { getStorefrontUrl } from '@/lib/store-hosts';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

type CategoryFilter = 'all' | 'popular' | 'minimal' | 'craft' | 'tech';

/**
 * Gallery theme entry: static ThemeConfig enriched with marketplace API
 * metadata (free/paid flags and price). Built and owned by the themes page.
 */
export interface SellerReGoThemeItem extends ThemeConfig {
  isFree: boolean;
  isPremium: boolean;
  price: number;
  description: string | null;
}

export interface SellerReGoThemesProps {
  themeList: SellerReGoThemeItem[];
  activeThemeId: ThemeId | null;
  subdomain: string;
  customDomain: string | null;
  applying: string | null;
  feedback: { message: string; isError?: boolean } | null;
  previewThemeId: ThemeId | null;
  previewViewport: ViewportMode;
  selectedPresetIndex: number;
  onApplyTheme: (themeId: ThemeId) => Promise<void>;
  onRefresh: () => Promise<void>;
  onOpenPreview: (themeId: ThemeId) => void;
  onClosePreview: () => void;
  onPreviewViewportChange: (viewport: ViewportMode) => void;
  onSelectPreset: (index: number) => void;
  dir?: 'ltr' | 'rtl';
}

const CATEGORY_FILTERS: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'Tous les thèmes' },
  { id: 'popular', label: 'Les Plus Populaires' },
  { id: 'minimal', label: 'Minimaliste & Épuré' },
  { id: 'craft', label: 'Artisanat & Terroir' },
  { id: 'tech', label: 'High-Tech & Moderne' },
];

const VIEWPORT_OPTIONS: Array<{
  mode: ViewportMode;
  icon: typeof Monitor;
  label: string;
  title: string;
}> = [
  { mode: 'desktop', icon: Monitor, label: 'Bureau (100%)', title: 'Mode Ordinateur (100%)' },
  { mode: 'tablet', icon: Tablet, label: 'Tablette (768px)', title: 'Mode Tablette (768px)' },
  { mode: 'mobile', icon: Smartphone, label: 'Mobile (375px)', title: 'Mode Mobile (375px)' },
];

export function SellerReGoThemes({
  themeList,
  activeThemeId,
  subdomain,
  customDomain,
  applying,
  feedback,
  previewThemeId,
  previewViewport,
  selectedPresetIndex,
  onApplyTheme,
  onRefresh,
  onOpenPreview,
  onClosePreview,
  onPreviewViewportChange,
  onSelectPreset,
  dir = 'ltr',
}: SellerReGoThemesProps) {
  const { t } = useLocale();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const activeTheme = themeList.find((theme) => theme.id === activeThemeId) ?? null;
  const previewTheme = themeList.find((theme) => theme.id === previewThemeId) ?? null;
  const activePreviewPreset =
    previewTheme && previewTheme.colorPresets[selectedPresetIndex]
      ? previewTheme.colorPresets[selectedPresetIndex]
      : previewTheme
        ? previewTheme.colorPresets[0]
        : null;

  // Custom-domain-aware storefront URL. Falls back to the marketplace
  // /store/<subdomain> route when no dedicated storefront host resolves.
  const storefrontUrl = getStorefrontUrl({ subdomain, customDomain });
  const previewUrl =
    storefrontUrl !== '#'
      ? storefrontUrl
      : subdomain
        ? `/store/${encodeURIComponent(subdomain)}`
        : null;

  const filteredThemes = useMemo(() => {
    return themeList.filter((theme) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          theme.name.toLowerCase().includes(q) ||
          theme.id.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (categoryFilter === 'popular') {
        return ['classic', 'modern', 'artisan', 'minimal', 'flavor'].includes(theme.id);
      }
      if (categoryFilter === 'minimal') {
        return ['minimal', 'studio', 'luxe', 'elegance'].includes(theme.id);
      }
      if (categoryFilter === 'craft') {
        return ['artisan', 'craft', 'medina', 'sahara', 'coastal'].includes(theme.id);
      }
      if (categoryFilter === 'tech') {
        return ['techhub', 'digital', 'neon', 'urban'].includes(theme.id);
      }
      return true;
    });
  }, [themeList, searchQuery, categoryFilter]);

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Boutique en Ligne', href: '/hub/dashboard/online-store' },
        { label: 'Galerie de Thèmes' },
      ]}
      headerTitle="Galerie de Thèmes & Habillages de Boutique"
      headerSubtitle="Explorez notre collection de thèmes e-commerce réactifs conçus pour le commerce tunisien, prévisualisez en direct et appliquez en 1 clic."
      headerIcon={Palette}
      statusBadge={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Check className="w-3.5 h-3.5" />
            {t('dashboardPages.themes.activeTheme')} : {activeTheme ? activeTheme.name : '—'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
            {themeList.length} Thèmes Prêts à l&apos;Emploi
          </span>
        </div>
      }
      primaryAction={
        activeThemeId ? (
          <Link
            href="/hub/dashboard/online-store/customize"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Paintbrush className="w-4 h-4" />
            <span>{t('dashboardPages.themes.customizeActive')}</span>
          </Link>
        ) : undefined
      }
      secondaryAction={
        <div className="flex items-center gap-2">
          {activeThemeId && (
            <button
              type="button"
              onClick={() => onOpenPreview(activeThemeId)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
              <span>Aperçu du thème actif</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualiser</span>
          </button>
        </div>
      }
      alertBanner={
        feedback ? (
          <div
            className={`p-3.5 rounded-[var(--rego-r,8px)] text-xs font-semibold flex items-center gap-2.5 border ${
              feedback.isError
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {feedback.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        ) : undefined
      }
      kpiStrip={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <ReGoKpiHero
            label="Thème Déployé Actuellement"
            value={activeTheme ? activeTheme.name : '—'}
            hint="Actif sur votre domaine public"
            delta={100}
            deltaLabel="actif"
            deltaType="increase"
          />
          <ReGoKpiHero
            label="Catalogue de Thèmes"
            value={`${themeList.length} Thèmes`}
            hint="Styles variés et responsive mobile"
            delta={themeList.length}
            deltaLabel="disponibles"
            deltaType="increase"
          />
          <ReGoKpiHero
            label="Optimisation Mobile 4G"
            value="100 / 100"
            hint="Temps de chargement < 800ms"
            delta={100}
            deltaLabel="Google Core Vitals"
            deltaType="increase"
          />
          <ReGoKpiHero
            label="Personnalisation Visuelle"
            value="Libre"
            hint="Palette, typographie et grille éditables"
            delta={100}
            deltaLabel="CSS dynamique"
            deltaType="increase"
          />
        </div>
      }
      filterToolbar={
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {CATEGORY_FILTERS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold transition-colors whitespace-nowrap ${
                  categoryFilter === tab.id
                    ? 'bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)]'
                    : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-2,#737373)]" />
            <input
              type="text"
              placeholder="Rechercher un thème..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-8 pe-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] outline-none placeholder:text-[var(--rego-ink-2,#737373)] w-56"
            />
          </div>
        </div>
      }
      mainContent={
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredThemes.map((theme) => {
              const isActive = theme.id === activeThemeId;
              const isApplyingThis = applying === theme.id;
              const defaultPreset = theme.colorPresets[0];

              return (
                <div
                  key={theme.id}
                  className={`group rounded-[var(--rego-r,8px)] border bg-[var(--rego-bg,#ffffff)] overflow-hidden transition-all flex flex-col justify-between ${
                    isActive
                      ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500'
                      : 'border-[var(--rego-border,#dedede)] hover:border-[var(--rego-accent,#ad0505)]/60 shadow-xs'
                  }`}
                >
                  {/* Theme Header preview banner (clickable — opens live preview) */}
                  <div
                    className="p-5 relative cursor-pointer"
                    onClick={() => onOpenPreview(theme.id)}
                    style={
                      defaultPreset
                        ? {
                            backgroundColor: defaultPreset.background,
                            color: defaultPreset.text,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-black/10 dark:border-white/20"
                          style={{ backgroundColor: defaultPreset?.primary }}
                        />
                        <h3 className="font-bold text-sm tracking-tight">{theme.name}</h3>
                      </div>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold inline-flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {t('dashboardPages.themes.active')}
                        </span>
                      )}
                    </div>

                    {/* Simulated Storefront Card Mock */}
                    <div className="mt-4 p-3 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold truncate">{theme.name} Store</span>
                        <ShoppingBag className="w-3 h-3 opacity-60" />
                      </div>
                      <div className="h-12 rounded bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] opacity-60 font-mono">
                        Hero Banner · {theme.heroStyles?.[0] || 'Banner'}
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span
                          className="font-mono font-bold"
                          style={defaultPreset ? { color: defaultPreset.primary } : undefined}
                        >
                          49.900 TND
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px] font-bold">COD</span>
                      </div>
                    </div>

                    {/* Hover overlay with preview prompt */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                      <span className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white shadow-md">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Aperçu Responsive</span>
                      </span>
                    </div>
                  </div>

                  {/* Body & Actions */}
                  <div className="p-4 border-t border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <ReGoStatusChip
                        status={theme.isFree ? 'ok' : 'warn'}
                        label={theme.isFree ? 'Gratuit' : `Premium · ${theme.price} TND`}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-3,#949494)]">
                        {theme.layout?.headerStyle || 'moderne'}
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--rego-ink-2,#737373)] line-clamp-2">
                      {theme.description ||
                        `Thème e-commerce responsive avec en-tête ${theme.layout?.headerStyle || 'moderne'} et grille optimisée pour le commerce tunisien.`}
                    </p>

                    {/* Color Preset Swatches */}
                    <div className="flex items-center gap-1.5">
                      {theme.colorPresets.slice(0, 5).map((preset) => (
                        <span
                          key={preset.id}
                          className="h-3.5 w-3.5 rounded-full border border-[var(--rego-border,#dedede)] shadow-xs"
                          style={{ backgroundColor: preset.primary }}
                          title={preset.name}
                        />
                      ))}
                      {theme.colorPresets.length > 5 && (
                        <span className="text-[10px] font-bold text-[var(--rego-ink-3,#949494)]">
                          +{theme.colorPresets.length - 5}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenPreview(theme.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
                        <span>{t('dashboardPages.themes.preview')}</span>
                      </button>

                      {isActive ? (
                        <Link
                          href="/hub/dashboard/online-store/customize"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90 transition-opacity"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>{t('dashboardPages.themes.customize')}</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onApplyTheme(theme.id)}
                          disabled={Boolean(applying)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {isApplyingThis ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{isApplyingThis ? t('dashboardPages.themes.applying') : 'Appliquer'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      }
      modals={
        previewTheme && activePreviewPreset ? (
          <div
            dir={dir}
            className="fixed inset-0 z-50 flex flex-col bg-[var(--rego-bg,#ffffff)]"
            role="dialog"
            aria-modal="true"
            aria-label={`Aperçu ${previewTheme.name}`}
          >
            {/* Top Preview Control Bar */}
            <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] px-3 sm:px-4 py-2.5">
              {/* Left: Store info & Close button */}
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={onClosePreview}
                  className="flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Fermer l&apos;aperçu</span>
                </button>
                <div className="text-xs min-w-0">
                  <span className="font-extrabold text-[var(--rego-fg,#111111)] text-sm">
                    {previewTheme.name}
                  </span>
                  <span className="ms-2 text-[var(--rego-ink-2,#737373)] hidden md:inline">
                    Palette : <strong className="text-[var(--rego-fg,#111111)]">{activePreviewPreset.name}</strong>
                  </span>
                </div>
              </div>

              {/* Center: Responsive Viewport Preview Toggles */}
              <div className="flex items-center gap-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-1">
                {VIEWPORT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.mode}
                      type="button"
                      onClick={() => onPreviewViewportChange(option.mode)}
                      title={option.title}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        previewViewport === option.mode
                          ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-sm'
                          : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{option.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right: Preset Switcher & Apply CTA */}
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-1 flex-wrap">
                  {previewTheme.colorPresets.map((preset, idx) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectPreset(idx)}
                      title={preset.name}
                      className={`h-6 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-colors ${
                        selectedPresetIndex === idx
                          ? 'bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] border-[var(--rego-fg,#111111)]'
                          : 'text-[var(--rego-ink-2,#737373)] border-transparent hover:text-[var(--rego-fg,#111111)]'
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-black/10 dark:border-white/20"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onApplyTheme(previewTheme.id);
                    onClosePreview();
                  }}
                  disabled={previewTheme.id === activeThemeId || Boolean(applying)}
                  className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {previewTheme.id === activeThemeId ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Thème Actif</span>
                    </>
                  ) : applying === previewTheme.id ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('dashboardPages.themes.applying')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('dashboardPages.themes.applyTheme')}</span>
                    </>
                  )}
                </button>
              </div>
            </header>

            {/* Browser URL Bar (custom-domain aware) */}
            <div className="flex items-center gap-2 border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 sm:px-4 py-2">
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="flex-1 min-w-0 truncate font-mono text-xs text-[var(--rego-ink-2,#737373)]" dir="ltr">
                {previewUrl ?? 'Aucune URL de vitrine configurée'}
              </span>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ouvrir la vitrine dans un nouvel onglet"
                  className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] px-2.5 py-1 text-[10px] font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="hidden sm:inline">Ouvrir</span>
                </a>
              )}
            </div>

            {/* Main Viewport Shell */}
            <div className="flex-1 overflow-auto bg-[var(--rego-surface,#f5f5f5)] p-3 sm:p-5 flex justify-center">
              <div
                className={`h-full transition-all duration-300 overflow-hidden shadow-xl bg-white dark:bg-slate-900 ${
                  previewViewport === 'desktop'
                    ? 'w-full max-w-6xl rounded-xl border border-[var(--rego-border,#dedede)]'
                    : previewViewport === 'tablet'
                      ? 'w-[768px] max-w-full rounded-2xl border-8 border-[var(--rego-border,#dedede)]'
                      : 'w-[375px] max-w-full rounded-2xl border-8 border-[var(--rego-border,#dedede)]'
                }`}
              >
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    title={`Aperçu ${previewTheme.name}`}
                    className="w-full h-full border-0 bg-white dark:bg-slate-900"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center p-6">
                    <Globe className="w-8 h-8 text-[var(--rego-ink-3,#949494)]" />
                    <p className="text-xs font-bold text-[var(--rego-fg,#111111)]">Vitrine non disponible</p>
                    <p className="text-[11px] text-[var(--rego-ink-2,#737373)] max-w-xs">
                      Définissez le sous-domaine ou le domaine personnalisé de votre boutique pour lancer la prévisualisation en direct.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null
      }
    />
  );
}
