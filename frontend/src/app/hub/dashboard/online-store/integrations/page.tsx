'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { Code2, Save, RefreshCw } from 'lucide-react';
import { UnsavedChangesBanner } from '@/components/dashboard/UnsavedChangesBanner';
import { revalidateStoreCache } from '@/lib/store-cache';

interface IntegrationsSettings {
  google_analytics_id?: string;
  facebook_pixel_id?: string;
  tiktok_pixel_id?: string;
  custom_head_js?: string;
  custom_body_js?: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationsSettings>({
    google_analytics_id: '',
    facebook_pixel_id: '',
    tiktok_pixel_id: '',
    custom_head_js: '',
    custom_body_js: '',
  });
  const [initialIntegrations, setInitialIntegrations] = useState<IntegrationsSettings>({});
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
        const loaded = data.store.settings?.integrations || {};
        setIntegrations(loaded);
        setInitialIntegrations(loaded);
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

  const handleChange = (field: keyof IntegrationsSettings, value: string) => {
    setIntegrations((prev) => ({ ...prev, [field]: value }));
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
          settings: { integrations },
        }),
      });
      if (res.ok) {
        setInitialIntegrations(integrations);
        setIsDirty(false);
        setFeedback({ message: 'Intégrations et scripts sauvegardés avec succès !' });
        revalidateStoreCache({ subdomain, custom_domain: customDomain });
      } else {
        setFeedback({ message: 'Erreur lors de la sauvegarde', isError: true });
      }
    } catch {
      setFeedback({ message: 'Erreur réseau', isError: true });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleReset = () => {
    setIntegrations(initialIntegrations);
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
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-[#B91C1C]/10 p-2 text-[#B91C1C]">
            <Code2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Intégrations & Scripts</h1>
            <p className="text-sm text-slate-500">
              Injectez vos pixels de suivi et scripts tiers (Google Analytics, Meta Pixel, TikTok Pixel).
            </p>
          </div>
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

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Google Analytics ID</label>
            <input
              type="text"
              value={integrations.google_analytics_id || ''}
              onChange={(e) => handleChange('google_analytics_id', e.target.value)}
              placeholder="G-XXXXXXXXXX"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Meta / Facebook Pixel ID</label>
            <input
              type="text"
              value={integrations.facebook_pixel_id || ''}
              onChange={(e) => handleChange('facebook_pixel_id', e.target.value)}
              placeholder="123456789012345"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">TikTok Pixel ID</label>
            <input
              type="text"
              value={integrations.tiktok_pixel_id || ''}
              onChange={(e) => handleChange('tiktok_pixel_id', e.target.value)}
              placeholder="C1234567890"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Script JavaScript personnalisé (&lt;head&gt;)</label>
          <textarea
            rows={4}
            value={integrations.custom_head_js || ''}
            onChange={(e) => handleChange('custom_head_js', e.target.value)}
            placeholder="// Code JS injecté dans le head de toutes les pages storefront"
            className="w-full font-mono text-xs rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-3 placeholder-slate-500 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Script JavaScript personnalisé (&lt;body&gt; - fin de page)</label>
          <textarea
            rows={4}
            value={integrations.custom_body_js || ''}
            onChange={(e) => handleChange('custom_body_js', e.target.value)}
            placeholder="// Code JS injecté en fin de body sur toutes les pages storefront"
            className="w-full font-mono text-xs rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-3 placeholder-slate-500 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#991B1B] transition shadow-sm disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Sauvegarde...' : 'Enregistrer les intégrations'}
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
