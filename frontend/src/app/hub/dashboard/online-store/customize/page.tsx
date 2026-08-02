'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { ThemeCustomizer } from '@/components/dashboard/ThemeCustomizer';
import { UnsavedChangesBanner } from '@/components/dashboard/UnsavedChangesBanner';
import { type ThemeCustomization, type ThemeId } from '@/lib/themes';
import { Sparkles, RefreshCw } from 'lucide-react';
import { revalidateStoreCache } from '@/lib/store-cache';
import { getStorefrontUrl } from '@/lib/store-hosts';

export default function ThemeCustomizePage() {
  const [themeId, setThemeId] = useState<ThemeId>('classic');
  const [initialCustomization, setInitialCustomization] = useState<ThemeCustomization>({});
  const [currentCustomization, setCurrentCustomization] = useState<ThemeCustomization>({});
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const store = data.store;
        setThemeId((store.theme_id || 'classic') as ThemeId);
        const customization = store.settings?.themeCustomization || {};
        setInitialCustomization(customization);
        setCurrentCustomization(customization);
        setSubdomain(store.subdomain || '');
        setCustomDomain(store.custom_domain || null);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (customizationToSave?: ThemeCustomization) => {
    const payload = customizationToSave || currentCustomization;
    setSaving(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          settings: { themeCustomization: payload },
        }),
      });
      if (res.ok) {
        setInitialCustomization(payload);
        setCurrentCustomization(payload);
        setIsDirty(false);
        setFeedback({ message: 'Personnalisation sauvegardée avec succès !' });
        revalidateStoreCache({ subdomain, custom_domain: customDomain });
      } else {
        setFeedback({ message: 'Erreur lors de la sauvegarde', isError: true });
      }
    } catch (err) {
      setFeedback({ message: err instanceof Error ? err.message : 'Erreur réseau', isError: true });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleReset = () => {
    setCurrentCustomization(initialCustomization);
    setIsDirty(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-[#B91C1C]/10 p-2 text-[#B91C1C]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Personnalisation du thème</h1>
              <p className="text-sm text-slate-500">
                Ajustez les couleurs, typographies, bannières et agencement du thème actif ({themeId}).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                await fetchWithCsrf('/api/pd/stores/me/theme/draft', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    draftThemeCustomization: currentCustomization,
                  }),
                });
                const tokenRes = await fetchWithCsrf('/api/pd/stores/me/theme/preview-token', {
                  method: 'POST',
                  credentials: 'include',
                });
                if (tokenRes.ok) {
                  const { token } = await tokenRes.json();
                  const storefrontUrl = getStorefrontUrl({ subdomain, customDomain });
                  // Open the preview on the actual storefront subdomain so the
                  // theme renders in its real context (own domain, own paths).
                  const previewUrl = storefrontUrl !== '#'
                    ? `${storefrontUrl}/preview?token=${token}`
                    : `/store/${encodeURIComponent(subdomain)}/preview?token=${token}`;
                  window.open(previewUrl, '_blank');
                }
              } catch {
                setFeedback({ message: 'Erreur lors de la génération de l\'aperçu', isError: true });
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Aperçu plein écran</span>
          </button>
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

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <ThemeCustomizer
          themeId={themeId}
          initialCustomization={currentCustomization}
          onSave={async (customization) => {
            setCurrentCustomization(customization);
            setIsDirty(true);
            await handleSave(customization);
          }}
        />
      </div>

      <UnsavedChangesBanner
        isDirty={isDirty}
        onSave={() => handleSave()}
        onReset={handleReset}
        saving={saving}
      />
    </div>
  );
}
