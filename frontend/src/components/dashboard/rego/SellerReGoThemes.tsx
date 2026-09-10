'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
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
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Layers,
  ChevronRight,
  ShieldCheck,
  Paintbrush,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';
import { themes, type ThemeId, type ThemeConfig } from '@/lib/themes';
import { getStorefrontUrl } from '@/lib/store-hosts';

export interface SellerReGoThemesProps {
  activeThemeId: ThemeId | null;
  subdomain: string;
  customDomain: string | null;
  loading: boolean;
  applying: string | null;
  feedback: { message: string; isError?: boolean } | null;
  onApplyTheme: (themeId: ThemeId) => Promise<void>;
  onRefresh: () => Promise<void>;
  dir?: 'ltr' | 'rtl';
}

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export function SellerReGoThemes({
  activeThemeId,
  subdomain,
  customDomain,
  loading,
  applying,
  feedback,
  onApplyTheme,
  onRefresh,
  dir = 'ltr',
}: SellerReGoThemesProps) {
  const { t } = useLocale();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'popular' | 'minimal' | 'craft' | 'tech'>('all');

  // Preview Modal
  const [previewThemeId, setPreviewThemeId] = useState<ThemeId | null>(null);
  const [previewViewport, setPreviewViewport] = useState<ViewportMode>('desktop');

  const storefrontUrl = getStorefrontUrl({
    subdomain,
    customDomain,
  });

  const allThemesList = useMemo(() => {
    return Object.values(themes);
  }, []);

  const filteredThemes = useMemo(() => {
    return allThemesList.filter((theme) => {
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
  }, [allThemesList, searchQuery, categoryFilter]);

  const activeTheme = activeThemeId ? themes[activeThemeId] || themes.classic : themes.classic;

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
            Thème Actif : {activeTheme.name}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
            20 Thèmes Prêts à l&apos;Emploi
          </span>
        </div>
      }
      primaryAction={
        <Link
          href="/hub/dashboard/online-store/customize"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Paintbrush className="w-4 h-4" />
          <span>Personnaliser le Thème Actif</span>
        </Link>
      }
      secondaryAction={
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualiser</span>
        </button>
      }
      alertBanner={
        feedback && (
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
        )
      }
      kpiStrip={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <ReGoKpiHero
            label="Thème Déployé Actuellement"
            value={activeTheme.name}
            hint="Actif sur votre domaine public"
            delta={100}
            deltaLabel="actif"
            deltaType="increase"
          />
          <ReGoKpiHero
            label="Catalogue de Thèmes"
            value={`${allThemesList.length} Thèmes`}
            hint="Styles variés et responsive mobile"
            delta={allThemesList.length}
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
            {[
              { id: 'all', label: 'Tous les thèmes' },
              { id: 'popular', label: 'Les Plus Populaires' },
              { id: 'minimal', label: 'Minimaliste & Épuré' },
              { id: 'craft', label: 'Artisanat & Terroir' },
              { id: 'tech', label: 'High-Tech & Moderne' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id as any)}
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

              return (
                <div
                  key={theme.id}
                  className={`rounded-[var(--rego-r,8px)] border bg-[var(--rego-bg,#ffffff)] overflow-hidden transition-all flex flex-col justify-between ${
                    isActive
                      ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500'
                      : 'border-[var(--rego-border,#dedede)] hover:border-[var(--rego-accent,#ad0505)]/60 shadow-xs'
                  }`}
                >
                  {/* Theme Header preview banner */}
                  <div
                    className="p-5 relative"
                    style={{
                      backgroundColor: theme.colors.background || '#ffffff',
                      color: theme.colors.text || '#111111',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-black/10"
                          style={{ backgroundColor: theme.colors.primary }}
                        />
                        <h3 className="font-bold text-sm tracking-tight">{theme.name}</h3>
                      </div>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold inline-flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Actif
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
                        <span className="font-mono font-bold" style={{ color: theme.colors.primary }}>
                          49.900 TND
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-black/10 text-[9px] font-bold">COD</span>
                      </div>
                    </div>

                    {/* Color Swatches */}
                    <div className="mt-3 flex items-center gap-1.5">
                      {[
                        theme.colors.primary,
                        theme.colors.secondary,
                        theme.colors.accent,
                        theme.colors.background,
                        theme.colors.text,
                      ].map((col, idx) => (
                        <span
                          key={idx}
                          className="w-4 h-4 rounded-full border border-black/20 shadow-2xs"
                          style={{ backgroundColor: col }}
                          title={col}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Body & Actions */}
                  <div className="p-4 border-t border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] space-y-3">
                    <p className="text-[11px] text-[var(--rego-ink-2,#737373)] line-clamp-2">
                      Thème e-commerce responsive avec en-tête {theme.layout?.headerStyle || 'moderne'} et grille optimisée pour le commerce tunisien.
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewThemeId(theme.id);
                          setPreviewViewport('desktop');
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
                        <span>Aperçu</span>
                      </button>

                      {isActive ? (
                        <Link
                          href="/hub/dashboard/online-store/customize"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90 transition-opacity"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Personnaliser</span>
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
                          <span>{isApplyingThis ? 'Application...' : 'Appliquer'}</span>
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
        <ReGoModal
          isOpen={Boolean(previewThemeId)}
          onClose={() => setPreviewThemeId(null)}
          title={`Prévisualisation Interactive · ${previewThemeId ? themes[previewThemeId]?.name : ''}`}
        >
          {previewThemeId && (
            <div className="space-y-4">
              {/* Viewport bar */}
              <div className="flex items-center justify-between p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('desktop')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--rego-r,8px)] text-xs font-bold transition-colors ${
                      previewViewport === 'desktop'
                        ? 'bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)]'
                        : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Grand Écran</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('tablet')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--rego-r,8px)] text-xs font-bold transition-colors ${
                      previewViewport === 'tablet'
                        ? 'bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)]'
                        : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                    }`}
                  >
                    <Tablet className="w-3.5 h-3.5" />
                    <span>Tablette (768px)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('mobile')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--rego-r,8px)] text-xs font-bold transition-colors ${
                      previewViewport === 'mobile'
                        ? 'bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)]'
                        : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile (390px)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (previewThemeId) onApplyTheme(previewThemeId);
                      setPreviewThemeId(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--rego-r,8px)] bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                  >
                    <Check className="w-3 h-3" />
                    <span>Activer ce Thème</span>
                  </button>
                </div>
              </div>

              {/* Viewport Frame Container */}
              <div
                className={`mx-auto border border-[var(--rego-border,#dedede)] rounded-xl overflow-hidden shadow-lg transition-all ${
                  previewViewport === 'mobile'
                    ? 'max-w-[390px] h-[550px]'
                    : previewViewport === 'tablet'
                    ? 'max-w-[768px] h-[550px]'
                    : 'w-full h-[550px]'
                }`}
              >
                <iframe
                  src={storefrontUrl}
                  title={`Aperçu ${previewThemeId}`}
                  className="w-full h-full border-0 bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          )}
        </ReGoModal>
      }
    />
  );
}
