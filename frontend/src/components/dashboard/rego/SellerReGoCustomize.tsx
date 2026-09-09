'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Save,
  RotateCcw,
  Palette,
  Layout,
  Type,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  Check,
  ShoppingBag,
  Search,
  CheckCircle2,
  AlertCircle,
  Sliders,
  ShieldCheck,
  Truck,
  ExternalLink,
  ChevronRight,
  Maximize2,
  RefreshCw,
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
import {
  themes,
  type ThemeId,
  type ThemeCustomization,
  type ColorPreset,
  LAYOUT_VARIATION_LABELS,
  GRID_DENSITY_LABELS,
  HERO_STYLE_LABELS,
  resolveThemeColors,
} from '@/lib/themes';
import { getStorefrontUrl } from '@/lib/store-hosts';

export interface SellerReGoCustomizeProps {
  themeId: ThemeId;
  subdomain: string;
  customDomain: string | null;
  initialCustomization: ThemeCustomization;
  currentCustomization: ThemeCustomization;
  isDirty: boolean;
  saving: boolean;
  feedback: { message: string; isError?: boolean } | null;
  onSave: (customization?: ThemeCustomization) => Promise<void>;
  onReset: () => void;
  onChange: (customization: ThemeCustomization) => void;
  dir?: 'ltr' | 'rtl';
}

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export function SellerReGoCustomize({
  themeId,
  subdomain,
  customDomain,
  initialCustomization,
  currentCustomization,
  isDirty,
  saving,
  feedback,
  onSave,
  onReset,
  onChange,
  dir = 'ltr',
}: SellerReGoCustomizeProps) {
  const { t } = useLocale();

  const [activeControlTab, setActiveControlTab] = useState<'colors' | 'layout' | 'typography' | 'hero'>('colors');
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [fullPreviewModalOpen, setFullPreviewModalOpen] = useState(false);

  const theme = themes[themeId] || themes.classic;
  const resolvedColors = useMemo(() => {
    return resolveThemeColors(theme, currentCustomization);
  }, [theme, currentCustomization]);

  const storefrontUrl = getStorefrontUrl({
    subdomain,
    customDomain,
  });

  const handleUpdate = (patch: Partial<ThemeCustomization>) => {
    const updated = {
      ...currentCustomization,
      ...patch,
    };
    onChange(updated);
  };

  const handleCustomColorChange = (key: 'primary' | 'secondary' | 'accent' | 'background' | 'text', val: string) => {
    handleUpdate({
      customColors: {
        ...(currentCustomization.customColors || {}),
        [key]: val,
      },
    });
  };

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Boutique en Ligne', href: '/hub/dashboard/online-store' },
        { label: 'Personnalisation Visuelle' },
      ]}
      headerTitle="Personnalisateur Visuel de Thème"
      headerSubtitle="Adaptez la typographie, la palette de couleurs de votre marque, les arrondis et la disposition en direct."
      headerIcon={Sparkles}
      statusBadge={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
            Thème : {theme.name}
          </span>
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              Modifications non enregistrées
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              À jour
            </span>
          )}
        </div>
      }
      primaryAction={
        <button
          type="button"
          onClick={() => onSave()}
          disabled={saving || !isDirty}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Enregistrement...' : 'Enregistrer le thème'}</span>
        </button>
      }
      secondaryAction={
        <button
          type="button"
          onClick={onReset}
          disabled={!isDirty}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Réinitialiser</span>
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
            label="Thème Sélectionné"
            value={theme.name}
            hint="Modèle de base chargé"
            delta={100}
            deltaLabel="actif"
            deltaType="increase"
          />
          <ReGoKpiHero
            label="Couleur Primaire (CTA)"
            value={
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-black/20"
                  style={{ backgroundColor: resolvedColors.primary }}
                />
                <span className="font-mono text-sm uppercase">{resolvedColors.primary}</span>
              </div>
            }
            hint="Boutons de validation et liens"
            delta={100}
            deltaLabel="personnalisé"
            deltaType="increase"
          />
          <ReGoKpiHero
            label="Variation de Disposition"
            value={LAYOUT_VARIATION_LABELS[currentCustomization.layoutVariation || 'default']?.label || 'Standard'}
            hint="En-tête et structure générale"
            delta={100}
            deltaLabel="grille"
            deltaType="neutral"
          />
          <ReGoKpiHero
            label="Rendu & Fluidité Mobile"
            value="Temps Réel"
            hint="Synchronisation CSS immédiate"
            delta={100}
            deltaLabel="instant"
            deltaType="increase"
          />
        </div>
      }
      filterToolbar={
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]">
          {/* Controls tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'colors', label: 'Couleurs & Nuancier', icon: Palette },
              { id: 'layout', label: 'Mise en Page & Grille', icon: Layout },
              { id: 'hero', label: 'Style de Bannière Hero', icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeControlTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveControlTab(tab.id as any)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)]'
                      : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Viewport switcher */}
          <div className="flex items-center gap-1 p-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded text-xs font-bold transition-colors ${
                viewport === 'desktop' ? 'bg-[var(--rego-bg,#ffffff)] shadow-xs text-[var(--rego-fg,#111111)]' : 'text-[var(--rego-ink-2,#737373)]'
              }`}
              title="Aperçu Écran Large"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded text-xs font-bold transition-colors ${
                viewport === 'tablet' ? 'bg-[var(--rego-bg,#ffffff)] shadow-xs text-[var(--rego-fg,#111111)]' : 'text-[var(--rego-ink-2,#737373)]'
              }`}
              title="Aperçu Tablette"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded text-xs font-bold transition-colors ${
                viewport === 'mobile' ? 'bg-[var(--rego-bg,#ffffff)] shadow-xs text-[var(--rego-fg,#111111)]' : 'text-[var(--rego-ink-2,#737373)]'
              }`}
              title="Aperçu Mobile"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      }
      mainContent={
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* TAB 1: COLORS */}
            {activeControlTab === 'colors' && (
              <ReGoCard
                title="Nuancier & Couleurs de Marque"
                subtitle="Sélectionnez une palette prédéfinie ou ajustez les teintes hexadécimales sur mesure."
              >
                <div className="space-y-4 text-xs">
                  {/* Presets */}
                  <div>
                    <label className="block font-bold text-[var(--rego-fg,#111111)] mb-2">
                      Palettes Prédéfinies pour {theme.name}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {theme.colorPresets.map((preset) => {
                        const isSelected = currentCustomization.colorPresetId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              handleUpdate({
                                colorPresetId: preset.id,
                                customColors: undefined,
                              });
                            }}
                            className={`p-2.5 rounded-[var(--rego-r,8px)] border text-left transition-all flex items-center justify-between ${
                              isSelected
                                ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-surface,#f5f5f5)] ring-1 ring-[var(--rego-accent,#ad0505)]'
                                : 'border-[var(--rego-border,#dedede)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                            }`}
                          >
                            <span className="font-bold text-[11px] text-[var(--rego-fg,#111111)] truncate">
                              {preset.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20"
                                style={{ backgroundColor: preset.primary }}
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20"
                                style={{ backgroundColor: preset.secondary }}
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20"
                                style={{ backgroundColor: preset.accent }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Hex Overrides */}
                  <div className="pt-3 border-t border-[var(--rego-border,#dedede)]/70 space-y-3">
                    <label className="block font-bold text-[var(--rego-fg,#111111)]">
                      Ajustement Fin des Couleurs (Hex)
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[11px] text-[var(--rego-ink-2,#737373)] font-medium">
                          Couleur Primaire (CTA)
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={resolvedColors.primary}
                            onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                            className="w-7 h-7 rounded border border-[var(--rego-border,#dedede)] cursor-pointer p-0"
                          />
                          <input
                            type="text"
                            value={resolvedColors.primary}
                            onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                            className="flex-1 px-2 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px] font-bold outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] text-[var(--rego-ink-2,#737373)] font-medium">
                          Couleur d'Accent
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={resolvedColors.accent}
                            onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                            className="w-7 h-7 rounded border border-[var(--rego-border,#dedede)] cursor-pointer p-0"
                          />
                          <input
                            type="text"
                            value={resolvedColors.accent}
                            onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                            className="flex-1 px-2 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px] font-bold outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] text-[var(--rego-ink-2,#737373)] font-medium">
                          Fond de Page
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={resolvedColors.background}
                            onChange={(e) => handleCustomColorChange('background', e.target.value)}
                            className="w-7 h-7 rounded border border-[var(--rego-border,#dedede)] cursor-pointer p-0"
                          />
                          <input
                            type="text"
                            value={resolvedColors.background}
                            onChange={(e) => handleCustomColorChange('background', e.target.value)}
                            className="flex-1 px-2 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px] font-bold outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] text-[var(--rego-ink-2,#737373)] font-medium">
                          Couleur du Texte
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={resolvedColors.text}
                            onChange={(e) => handleCustomColorChange('text', e.target.value)}
                            className="w-7 h-7 rounded border border-[var(--rego-border,#dedede)] cursor-pointer p-0"
                          />
                          <input
                            type="text"
                            value={resolvedColors.text}
                            onChange={(e) => handleCustomColorChange('text', e.target.value)}
                            className="flex-1 px-2 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px] font-bold outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ReGoCard>
            )}

            {/* TAB 2: LAYOUT */}
            {activeControlTab === 'layout' && (
              <ReGoCard
                title="Structure & Grille Produits"
                subtitle="Ajustez l'agencement des éléments de navigation et l'espacement du catalogue."
              >
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-[var(--rego-fg,#111111)] mb-2">
                      Variation de Mise en Page
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {theme.layoutVariations.map((v) => {
                        const isSelected = (currentCustomization.layoutVariation || 'default') === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleUpdate({ layoutVariation: v })}
                            className={`p-3 rounded-[var(--rego-r,8px)] border text-left font-bold text-xs transition-all ${
                              isSelected
                                ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-accent,#ad0505)]'
                                : 'border-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                            }`}
                          >
                            {LAYOUT_VARIATION_LABELS[v]?.label || v}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--rego-border,#dedede)]/70">
                    <label className="block font-bold text-[var(--rego-fg,#111111)] mb-2">
                      Densité de la Grille Produits
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {theme.gridDensities.map((d) => {
                        const isSelected = (currentCustomization.gridDensity || 'comfortable') === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => handleUpdate({ gridDensity: d })}
                            className={`p-2.5 rounded-[var(--rego-r,8px)] border text-center font-bold text-xs transition-all ${
                              isSelected
                                ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-accent,#ad0505)]'
                                : 'border-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                            }`}
                          >
                            {GRID_DENSITY_LABELS[d]?.label || d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </ReGoCard>
            )}

            {/* TAB 3: HERO */}
            {activeControlTab === 'hero' && (
              <ReGoCard
                title="Style de la Bannière Hero d'Accueil"
                subtitle="Sélectionnez l'impact visuel de la première section vue par vos acheteurs."
              >
                <div className="space-y-3 text-xs">
                  {theme.heroStyles.map((h) => {
                    const isSelected = (currentCustomization.heroStyle || 'banner') === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleUpdate({ heroStyle: h })}
                        className={`w-full p-3 rounded-[var(--rego-r,8px)] border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-surface,#f5f5f5)]'
                            : 'border-[var(--rego-border,#dedede)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-xs text-[var(--rego-fg,#111111)] block">
                            {HERO_STYLE_LABELS[h]?.label || h}
                          </span>
                          <span className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                            {h === 'banner'
                              ? 'Grande bannière plein écran avec appel à l\'action central'
                              : h === 'split'
                              ? 'Disposition 50/50 avec texte à gauche et produit vedette à droite'
                              : h === 'minimal'
                              ? 'Style épuré mettant directement l\'accent sur les collections'
                              : 'Présentation dynamique multimédia'}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[var(--rego-accent,#ad0505)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </ReGoCard>
            )}
          </div>

          {/* Right Column: Live Responsive Storefront Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[var(--rego-fg,#111111)] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
                <span>Rendu Visuel en Temps Réel</span>
              </span>

              <button
                type="button"
                onClick={() => setFullPreviewModalOpen(true)}
                className="text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] flex items-center gap-1"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Plein Écran</span>
              </button>
            </div>

            {/* Preview Frame */}
            <div
              className={`mx-auto border border-[var(--rego-border,#dedede)] rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${
                viewport === 'mobile'
                  ? 'max-w-[390px]'
                  : viewport === 'tablet'
                  ? 'max-w-[560px]'
                  : 'w-full'
              }`}
              style={{
                backgroundColor: resolvedColors.background,
                color: resolvedColors.text,
              }}
            >
              {/* Top Announcement Bar */}
              <div
                className="py-1 px-3 text-[10px] text-center font-bold tracking-wide transition-colors"
                style={{
                  backgroundColor: resolvedColors.accent,
                  color: '#ffffff',
                }}
              >
                Livraison express en 24-48h sur toute la Tunisie · Paiement à la livraison
              </div>

              {/* Storefront Nav Header */}
              <div
                className="p-3 border-b flex items-center justify-between transition-colors"
                style={{
                  backgroundColor: resolvedColors.headerBg || resolvedColors.background,
                  borderColor: 'rgba(0,0,0,0.08)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white"
                    style={{ backgroundColor: resolvedColors.primary }}
                  >
                    P
                  </span>
                  <span className="font-extrabold text-xs tracking-tight">
                    {subdomain ? `${subdomain.toUpperCase()} STORE` : 'MA BOUTIQUE TN'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/5 text-[10px] opacity-70">
                    <Search className="w-2.5 h-2.5" />
                    <span>Rechercher...</span>
                  </div>
                  <div
                    className="p-1 rounded-full text-white cursor-pointer"
                    style={{ backgroundColor: resolvedColors.primary }}
                  >
                    <ShoppingBag className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Hero Section */}
              <div
                className="p-6 transition-colors relative overflow-hidden"
                style={{
                  backgroundColor: resolvedColors.secondary,
                }}
              >
                <div className="max-w-md space-y-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase text-white"
                    style={{ backgroundColor: resolvedColors.accent }}
                  >
                    Nouvelle Collection 2026
                  </span>
                  <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                    L'Excellence & Le Savoir-Faire Artisanal Tunisien
                  </h2>
                  <p className="text-[11px] opacity-80 leading-relaxed">
                    Découvrez nos créations exclusives préparées avec passion et livrées directement à votre porte.
                  </p>
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-md text-white text-[11px] font-bold shadow-xs transition-opacity"
                      style={{ backgroundColor: resolvedColors.primary }}
                    >
                      Commander maintenant
                    </button>
                    <span className="text-[10px] font-semibold opacity-70">Satisfait ou remboursé</span>
                  </div>
                </div>
              </div>

              {/* Featured Product Card */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs tracking-tight">Nos Meilleures Ventes</span>
                  <span className="text-[10px] font-bold hover:underline" style={{ color: resolvedColors.primary }}>
                    Voir tout
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { title: 'Coffret Huile d\'Olive Bio 750ml', price: 42.5 },
                    { title: 'Céramique Émaillée Traditionnelle', price: 68.0 },
                  ].map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-black/10 bg-white dark:bg-black/20 space-y-2"
                    >
                      <div className="aspect-square rounded bg-black/5 flex items-center justify-center text-[10px] opacity-50 font-mono">
                        Produit Image
                      </div>
                      <div>
                        <h4 className="font-bold text-[11px] truncate">{p.title}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <span
                            className="font-mono font-bold text-xs"
                            style={{ color: resolvedColors.primary }}
                          >
                            {p.price.toFixed(3)} TND
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-black/5 text-[9px] font-bold">
                            COD
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="w-full py-1 rounded text-[10px] font-bold text-white transition-opacity"
                        style={{ backgroundColor: resolvedColors.primary }}
                      >
                        Ajouter au Panier
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Trust Bar */}
              <div
                className="p-3 border-t text-[10px] flex items-center justify-around opacity-80"
                style={{
                  backgroundColor: resolvedColors.footerBg || resolvedColors.background,
                  borderColor: 'rgba(0,0,0,0.08)',
                }}
              >
                <div className="flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  <span>Livraison Rapide</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Paiement Sécurisé</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
      modals={
        <ReGoModal
          isOpen={fullPreviewModalOpen}
          onClose={() => setFullPreviewModalOpen(false)}
          title="Aperçu Plein Écran de la Vitrine"
        >
          <div className="space-y-4">
            <div className="h-[550px] rounded-xl overflow-hidden border border-[var(--rego-border,#dedede)]">
              <iframe
                src={storefrontUrl}
                title="Vitrine Plein Écran"
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </div>
        </ReGoModal>
      }
    />
  );
}
