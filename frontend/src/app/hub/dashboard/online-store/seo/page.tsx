'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { Search, Save, RefreshCw } from 'lucide-react';
import { UnsavedChangesBanner } from '@/components/dashboard/UnsavedChangesBanner';
import { revalidateStoreCache } from '@/lib/store-cache';

interface SeoSettings {
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  keywords?: string;
}

export default function SeoSettingsPage() {
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
        setFeedback({ message: 'Paramètres SEO sauvegardés avec succès !' });
        revalidateStoreCache({ subdomain, custom_domain: customDomain });
      } else {
        setFeedback({ message: 'Erreur lors de la sauvegarde du SEO', isError: true });
      }
    } catch {
      setFeedback({ message: 'Erreur réseau', isError: true });
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
            <Search className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">SEO & Référencement</h1>
            <p className="text-sm text-slate-500">
              Optimisez le titre, la description et les balises de partage de votre boutique pour les moteurs de recherche.
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
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Méta-titre (Title Tag)</label>
          <input
            type="text"
            value={seo.meta_title || ''}
            onChange={(e) => handleChange('meta_title', e.target.value)}
            placeholder="Titre de la boutique pour Google (ex: Ma Boutique Artisanale — Produits Bio & Lin)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Méta-description</label>
          <textarea
            rows={3}
            value={seo.meta_description || ''}
            onChange={(e) => handleChange('meta_description', e.target.value)}
            placeholder="Description concise de votre activité affichée dans les résultats de recherche (150-160 caractères recommandés)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Mots-clés (Keywords)</label>
          <input
            type="text"
            value={seo.keywords || ''}
            onChange={(e) => handleChange('keywords', e.target.value)}
            placeholder="Mots-clés séparés par des virgules (ex: artisanat, tunique, huile d'olive, tunisie)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Image de partage OpenGraph (URL)</label>
          <input
            type="text"
            value={seo.og_image_url || ''}
            onChange={(e) => handleChange('og_image_url', e.target.value)}
            placeholder="https://... (Image affichée lors du partage sur Facebook/WhatsApp/X)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#991B1B] transition shadow-sm disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Sauvegarde...' : 'Enregistrer le SEO'}
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
