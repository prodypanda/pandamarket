'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { ThemeCustomizer } from '@/components/dashboard/ThemeCustomizer';
import { UnsavedChangesBanner } from '@/components/dashboard/UnsavedChangesBanner';
import { type ThemeCustomization, type ThemeId } from '@/lib/themes';
import { Sparkles, RefreshCw } from 'lucide-react';
import { revalidateStoreCache } from '@/lib/store-cache';
import { getStorefrontUrl } from '@/lib/store-hosts';
import { useLocale } from '@/contexts/LocaleContext';

export default function ThemeCustomizePage() {
  const { t, dir } = useLocale();
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
        setFeedback({ message: t('dashboardPages.customize.saved') });
        revalidateStoreCache({ subdomain, custom_domain: customDomain });
      } else {
        setFeedback({ message: t('dashboardPages.customize.saveError'), isError: true });
      }
    } catch (err) {
      setFeedback({ message: err instanceof Error ? err.message : t('dashboardPages.customize.networkError'), isError: true });
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
      <div dir={dir} className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6">
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2 text-slate-900 dark:text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboardPages.customize.title')}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('dashboardPages.customize.activeThemeSubtitle', { themeId })}
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
                setFeedback({ message: t('dashboardPages.customize.previewError'), isError: true });
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium px-4 py-2.5 text-xs shadow-2xs transition-colors"
          >
            <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            <span>{t('dashboardPages.customize.fullscreenPreview')}</span>
          </button>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs font-semibold ${
              feedback.isError
                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
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
