'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchWithCsrf } from '@/lib/api';
import { themes, type ThemeId } from '@/lib/themes';
import { revalidateStoreCache } from '@/lib/store-cache';
import { Palette, Check, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';

export default function ThemesPage() {
  const [activeThemeId, setActiveThemeId] = useState<ThemeId | null>(null);
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

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
        setFeedback({ message: `Thème "${themes[themeId].name}" appliqué avec succès !` });
        revalidateStoreCache({ subdomain, custom_domain: customDomain });
      } else {
        const errData = await res.json().catch(() => ({}));
        setFeedback({ message: errData.error?.message || 'Erreur lors du changement de thème', isError: true });
      }
    } catch {
      setFeedback({ message: 'Erreur réseau', isError: true });
    } finally {
      setApplying(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const themeList = Object.values(themes);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-[#B91C1C]/10 p-2 text-[#B91C1C]">
                <Palette className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Thèmes & Style</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Choisissez parmi {themeList.length} thèmes professionnels et personnalisez l&apos;apparence de votre boutique.
                </p>
              </div>
            </div>
          </div>

          {activeThemeId && (
            <Link
              href="/hub/dashboard/online-store/customize"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Personnaliser le thème actif</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs font-semibold ${
              feedback.isError
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Theme Gallery */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {themeList.map((theme) => {
          const isActive = theme.id === activeThemeId;
          const isApplying = applying === theme.id;
          const defaultPreset = theme.colorPresets[0];

          return (
            <div
              key={theme.id}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-all ${
                isActive
                  ? 'border-[#B91C1C] ring-2 ring-[#B91C1C]/20'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {/* Preview Thumbnail */}
              <div
                className="relative aspect-[4/3] overflow-hidden"
                style={{
                  backgroundColor: defaultPreset.background,
                }}
              >
                {/* Mini storefront preview */}
                <div className="absolute inset-0 flex flex-col p-3 gap-2">
                  {/* Header bar */}
                  <div
                    className="rounded-md px-2 py-1.5 flex items-center justify-between"
                    style={{ backgroundColor: defaultPreset.headerBg }}
                  >
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: defaultPreset.primary }} />
                      <div className="h-1.5 w-12 rounded" style={{ backgroundColor: defaultPreset.text, opacity: 0.6 }} />
                    </div>
                    <div className="flex gap-1">
                      <div className="h-1 w-4 rounded" style={{ backgroundColor: defaultPreset.text, opacity: 0.4 }} />
                      <div className="h-1 w-3 rounded" style={{ backgroundColor: defaultPreset.text, opacity: 0.4 }} />
                    </div>
                  </div>

                  {/* Hero strip */}
                  <div
                    className="rounded-md h-8 flex items-center justify-center"
                    style={{ backgroundColor: defaultPreset.primary }}
                  >
                    <span className="text-[7px] font-bold" style={{ color: defaultPreset.background }}>
                      {theme.name}
                    </span>
                  </div>

                  {/* Product cards */}
                  <div className="grid grid-cols-3 gap-1 flex-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="rounded flex flex-col gap-0.5 overflow-hidden"
                        style={{ backgroundColor: defaultPreset.background }}
                      >
                        <div className="flex-1 rounded-sm" style={{ backgroundColor: defaultPreset.secondary }} />
                        <div className="h-0.5 w-2/3 mx-auto rounded" style={{ backgroundColor: defaultPreset.text, opacity: 0.5 }} />
                      </div>
                    ))}
                  </div>
                </div>

                {isActive && (
                  <div className="absolute top-2 right-2 rounded-full bg-[#B91C1C] px-2 py-1 text-[9px] font-bold text-white shadow-lg flex items-center gap-1">
                    <Check className="h-2.5 w-2.5" />
                    Actif
                  </div>
                )}
              </div>

              {/* Theme Info */}
              <div className="flex flex-col gap-2 p-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{theme.name}</h3>
                  <div className="mt-1 flex items-center gap-1">
                    {theme.colorPresets.slice(0, 5).map((preset) => (
                      <div
                        key={preset.id}
                        className="h-3 w-3 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: preset.primary }}
                        title={preset.name}
                      />
                    ))}
                    {theme.colorPresets.length > 5 && (
                      <span className="text-[9px] text-slate-400">+{theme.colorPresets.length - 5}</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyTheme(theme.id)}
                  disabled={isApplying || isActive}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                    isActive
                      ? 'bg-slate-100 text-slate-500 cursor-default'
                      : 'bg-[#B91C1C] text-white hover:bg-[#991B1B]'
                  }`}
                >
                  {isApplying ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Application...
                    </span>
                  ) : isActive ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Check className="h-3 w-3" />
                      Thème actif
                    </span>
                  ) : (
                    'Appliquer ce thème'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
