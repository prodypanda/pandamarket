'use client';

/**
 * ThemeCustomizer — Advanced theme customization panel for vendor dashboard.
 * ─────────────────────────────────────────────────────────────────────────
 * Allows vendors to:
 *   1. Select a layout variation (default, sidebar, full-width, magazine)
 *   2. Choose grid density (compact, comfortable, spacious)
 *   3. Pick a hero style (banner, split, minimal, video, none)
 *   4. Select from curated color presets per theme
 *   5. Override individual colors with a custom color picker
 *
 * Design system: Panda Green (#16C784), Inter font, Lucide icons.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  LayoutGrid,
  Columns3,
  Image,
  Save,
  Loader2,
  CheckCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  themes,
  type ThemeId,
  type ThemeCustomization,
  type ColorPreset,
  LAYOUT_VARIATION_LABELS,
  GRID_DENSITY_LABELS,
  HERO_STYLE_LABELS,
  resolveThemeColors,
} from '../../lib/themes';

interface ThemeCustomizerProps {
  themeId: ThemeId;
  initialCustomization?: ThemeCustomization;
  onSave: (customization: ThemeCustomization) => Promise<void>;
}

export function ThemeCustomizer({ themeId, initialCustomization, onSave }: ThemeCustomizerProps) {
  const theme = themes[themeId] || themes.classic;

  const [customization, setCustomization] = useState<ThemeCustomization>(
    initialCustomization || {},
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('layout');
  const [showCustomColors, setShowCustomColors] = useState(false);

  // Reset when theme changes
  useEffect(() => {
    setCustomization(initialCustomization || {});
  }, [themeId, initialCustomization]);

  const resolved = resolveThemeColors(theme, customization);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(customization);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  }, [customization, onSave]);

  const handleReset = () => {
    setCustomization({});
    setShowCustomColors(false);
  };

  const updateCustomization = (partial: Partial<ThemeCustomization>) => {
    setCustomization((prev) => ({ ...prev, ...partial }));
    setSaved(false);
  };

  const updateCustomColor = (key: string, value: string) => {
    setCustomization((prev) => ({
      ...prev,
      customColors: { ...prev.customColors, [key]: value },
    }));
    setSaved(false);
  };

  const toggleSection = (id: string) => {
    setExpandedSection((prev) => (prev === id ? null : id));
  };

  const sections = [
    { id: 'layout', label: 'Mise en page', icon: LayoutGrid },
    { id: 'grid', label: 'Grille produits', icon: Columns3 },
    { id: 'hero', label: 'Section Hero', icon: Image },
    { id: 'colors', label: 'Couleurs', icon: Palette },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Personnalisation du thème</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Thème actif : <span className="font-medium text-[#16C784]">{theme.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#16C784] text-white text-sm font-semibold rounded-lg hover:bg-[#14b876] transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé !' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Live Preview Bar */}
      <div
        className="rounded-xl overflow-hidden border border-gray-200"
        style={{ backgroundColor: resolved.background }}
      >
        <div
          className="h-10 flex items-center px-4 text-xs font-medium"
          style={{ backgroundColor: resolved.headerBg, color: resolved.text }}
        >
          <span style={{ color: resolved.primary }}>●</span>
          <span className="ml-2">Aperçu en direct</span>
          <div className="ml-auto flex gap-2">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold"
              style={{ backgroundColor: resolved.primary, color: resolved.background }}
            >
              CTA
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px]"
              style={{ backgroundColor: resolved.secondary, color: resolved.text }}
            >
              Secondaire
            </span>
          </div>
        </div>
        <div className="h-16 flex items-center justify-center gap-4 px-4" style={{ color: resolved.text }}>
          <div className="flex gap-2">
            {[resolved.primary, resolved.secondary, resolved.accent, resolved.background, resolved.text].map(
              (c, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border border-gray-300"
                  style={{ backgroundColor: c }}
                  title={['Primary', 'Secondary', 'Accent', 'Background', 'Text'][i]}
                />
              ),
            )}
          </div>
          <span className="text-xs" style={{ color: resolved.accent }}>
            Accent Link
          </span>
        </div>
        <div
          className="h-6 flex items-center justify-center text-[10px]"
          style={{ backgroundColor: resolved.footerBg, color: resolved.secondary }}
        >
          Footer
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="space-y-2">
        {sections.map((section) => (
          <div key={section.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              aria-expanded={expandedSection === section.id}
            >
              <div className="flex items-center gap-2.5">
                <section.icon className="w-4 h-4 text-[#16C784]" />
                <span className="text-sm font-medium text-gray-900">{section.label}</span>
              </div>
              {expandedSection === section.id ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedSection === section.id && (
              <div className="px-4 pb-4 border-t border-gray-100">
                {/* Layout Variation */}
                {section.id === 'layout' && (
                  <div className="pt-3 space-y-2">
                    {theme.layoutVariations.map((v) => {
                      const info = LAYOUT_VARIATION_LABELS[v];
                      const active = (customization.layoutVariation || theme.layoutVariations[0]) === v;
                      return (
                        <label
                          key={v}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            active ? 'bg-[#16C784]/10 border border-[#16C784]/30' : 'border border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="layoutVariation"
                            checked={active}
                            onChange={() => updateCustomization({ layoutVariation: v })}
                            className="text-[#16C784] focus:ring-[#16C784]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{info.icon}</span>
                              <span className="text-sm font-medium text-gray-900">{info.label}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Grid Density */}
                {section.id === 'grid' && (
                  <div className="pt-3 space-y-2">
                    {theme.gridDensities.map((d) => {
                      const info = GRID_DENSITY_LABELS[d];
                      const active = (customization.gridDensity || theme.gridDensities[0]) === d;
                      return (
                        <label
                          key={d}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            active ? 'bg-[#16C784]/10 border border-[#16C784]/30' : 'border border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="gridDensity"
                            checked={active}
                            onChange={() => updateCustomization({ gridDensity: d })}
                            className="text-[#16C784] focus:ring-[#16C784]"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900">{info.label}</span>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {info.description} ({info.cols})
                            </p>
                          </div>
                          {/* Mini grid preview */}
                          <div className="flex gap-0.5">
                            {Array.from({ length: d === 'compact' ? 5 : d === 'comfortable' ? 3 : 2 }).map(
                              (_, i) => (
                                <div
                                  key={i}
                                  className={`bg-gray-300 rounded-sm ${
                                    d === 'compact' ? 'w-2 h-3' : d === 'comfortable' ? 'w-3 h-4' : 'w-4 h-5'
                                  }`}
                                />
                              ),
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Hero Style */}
                {section.id === 'hero' && (
                  <div className="pt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {theme.heroStyles.map((h) => {
                      const info = HERO_STYLE_LABELS[h];
                      const active = (customization.heroStyle || theme.heroStyles[0]) === h;
                      return (
                        <button
                          key={h}
                          onClick={() => updateCustomization({ heroStyle: h })}
                          className={`p-3 rounded-lg text-center transition-all ${
                            active
                              ? 'bg-[#16C784]/10 border-2 border-[#16C784]'
                              : 'border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-xl block mb-1">{info.icon}</span>
                          <span className="text-xs font-medium text-gray-900">{info.label}</span>
                          <p className="text-[10px] text-gray-500 mt-0.5">{info.description}</p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Color Presets + Custom Colors */}
                {section.id === 'colors' && (
                  <div className="pt-3 space-y-4">
                    {/* Presets */}
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">Palettes prédéfinies</p>
                      <div className="grid grid-cols-2 gap-2">
                        {theme.colorPresets.map((preset) => {
                          const active = customization.colorPresetId === preset.id ||
                            (!customization.colorPresetId && preset.id === theme.colorPresets[0]?.id);
                          return (
                            <PresetCard
                              key={preset.id}
                              preset={preset}
                              active={active}
                              onClick={() =>
                                updateCustomization({
                                  colorPresetId: preset.id,
                                  customColors: undefined,
                                })
                              }
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Color Toggle */}
                    <div>
                      <button
                        onClick={() => setShowCustomColors(!showCustomColors)}
                        className="flex items-center gap-2 text-xs font-medium text-[#16C784] hover:text-[#14b876] transition-colors"
                      >
                        <Palette className="w-3.5 h-3.5" />
                        {showCustomColors ? 'Masquer les couleurs personnalisées' : 'Personnaliser les couleurs'}
                        {showCustomColors ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {showCustomColors && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {(
                            [
                              { key: 'primary', label: 'Primaire (CTA)' },
                              { key: 'secondary', label: 'Secondaire' },
                              { key: 'accent', label: 'Accent' },
                              { key: 'background', label: 'Fond de page' },
                              { key: 'text', label: 'Texte' },
                              { key: 'headerBg', label: 'En-tête' },
                              { key: 'footerBg', label: 'Pied de page' },
                            ] as const
                          ).map(({ key, label }) => (
                            <div key={key}>
                              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                {label}
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={customization.customColors?.[key] || resolved[key]}
                                  onChange={(e) => updateCustomColor(key, e.target.value)}
                                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0"
                                />
                                <input
                                  type="text"
                                  value={customization.customColors?.[key] || resolved[key]}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                                      updateCustomColor(key, v);
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md font-mono focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
                                  maxLength={7}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Small card showing a color preset with swatches. */
function PresetCard({
  preset,
  active,
  onClick,
}: {
  preset: ColorPreset;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg text-left transition-all ${
        active
          ? 'bg-[#16C784]/10 border-2 border-[#16C784]'
          : 'border border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex gap-1 mb-2">
        {[preset.primary, preset.secondary, preset.accent, preset.background, preset.text].map(
          (c, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full border border-gray-200"
              style={{ backgroundColor: c }}
            />
          ),
        )}
      </div>
      <p className="text-xs font-medium text-gray-900">{preset.name}</p>
    </button>
  );
}
