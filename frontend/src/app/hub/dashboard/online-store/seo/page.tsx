'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { Search, Save, RefreshCw } from 'lucide-react';
import { UnsavedChangesBanner } from '@/components/dashboard/UnsavedChangesBanner';
import { revalidateStoreCache } from '@/lib/store-cache';
import { useLocale } from '@/contexts/LocaleContext';

interface SeoSettings {
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  keywords?: string;
}

export default function SeoSettingsPage() {
  const { t, dir } = useLocale();
  const [seo, setSeo] = useState<SeoSettings>({
    meta_title: '',
    meta_description: '',
    og_image_url: '',
    keywords: '',
  });
  const [initialSeo, setInitialSeo] = useState<SeoSettings>({});
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const fetchStore = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const storeSeo = data.store.settings?.seo || {};
        setSeo(storeSeo);
        setInitialSeo(storeSeo);
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

  const handleChange = (field: keyof SeoSettings, value: string) => {
    setSeo((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          settings: { seo },
        }),
      });
      if (res.ok) {
        setInitialSeo(seo);
        setIsDirty(false);
        setFeedback({ message: t('dashboardPages.seo.saved') });
        revalidateStoreCache({ subdomain, custom_domain: customDomain });
      } else {
        setFeedback({ message: t('dashboardPages.seo.saveError'), isError: true });
      }
    } catch {
      setFeedback({ message: t('dashboardPages.seo.networkError'), isError: true });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleReset = () => {
    setSeo(initialSeo);
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
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2 text-slate-900 dark:text-white">
            <Search className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboardPages.seo.title')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('dashboardPages.seo.subtitle')}
            </p>
          </div>
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

      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-5">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{t('dashboardPages.seo.metaTitle')}</label>
          <input
            type="text"
            value={seo.meta_title || ''}
            onChange={(e) => handleChange('meta_title', e.target.value)}
            placeholder={t('dashboardPages.seo.metaTitlePlaceholder')}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{t('dashboardPages.seo.metaDescription')}</label>
          <textarea
            rows={3}
            value={seo.meta_description || ''}
            onChange={(e) => handleChange('meta_description', e.target.value)}
            placeholder={t('dashboardPages.seo.metaDescriptionPlaceholder')}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{t('dashboardPages.seo.keywords')}</label>
          <input
            type="text"
            value={seo.keywords || ''}
            onChange={(e) => handleChange('keywords', e.target.value)}
            placeholder={t('dashboardPages.seo.keywordsPlaceholder')}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{t('dashboardPages.seo.ogImage')}</label>
          <input
            type="text"
            value={seo.og_image_url || ''}
            onChange={(e) => handleChange('og_image_url', e.target.value)}
            placeholder={t('dashboardPages.seo.ogImagePlaceholder')}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium px-5 py-2.5 text-xs shadow-2xs transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? t('dashboardPages.seo.saving') : t('dashboardPages.seo.save')}
        </button>
      </div>

      <UnsavedChangesBanner
        isDirty={isDirty}
        onSave={handleSave}
        onReset={handleReset}
        saving={saving}
      />
    </div>
  );
}
