'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { Globe, Save, ExternalLink, RefreshCw } from 'lucide-react';
import { UnsavedChangesBanner } from '@/components/dashboard/UnsavedChangesBanner';
import { revalidateStoreCache } from '@/lib/store-cache';

export default function DomainsPage() {
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [initialCustomDomain, setInitialCustomDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const fetchStore = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSubdomain(data.store.subdomain || '');
        const domain = data.store.custom_domain || '';
        setCustomDomain(domain);
        setInitialCustomDomain(domain);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/domain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ custom_domain: customDomain.trim() || null }),
      });
      if (res.ok) {
        setInitialCustomDomain(customDomain);
        setIsDirty(false);
        setFeedback({ message: 'Nom de domaine mis à jour avec succès !' });
        revalidateStoreCache({ subdomain, custom_domain: customDomain.trim() || null });
      } else {
        const errData = await res.json().catch(() => ({}));
        setFeedback({
          message: errData.error?.message || errData.message || 'Erreur lors de la sauvegarde du domaine',
          isError: true,
        });
      }
    } catch {
      setFeedback({ message: 'Erreur réseau', isError: true });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleReset = () => {
    setCustomDomain(initialCustomDomain);
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
            <Globe className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Noms de domaine</h1>
            <p className="text-sm text-slate-500">
              Gérez votre sous-domaine gratuit PandaMarket et votre nom de domaine personnalisé.
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

      {/* Primary Subdomain Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">Sous-domaine gratuit PandaMarket</h2>
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-200">
          <div>
            <p className="text-sm font-bold text-slate-900">{subdomain}.garbage.team</p>
            <p className="text-xs text-slate-500">Domaine par défaut toujours actif et sécurisé SSL.</p>
          </div>
          <a
            href={`/store/${subdomain}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-[#B91C1C] hover:text-[#B91C1C] transition"
          >
            <span>Ouvrir</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Custom Domain Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">Nom de domaine personnalisé (.tn, .com, etc.)</h2>
        <p className="text-xs text-slate-500">
          Entrez votre propre domaine personnalisé (ex: boutique.tn). Assurez-vous d&apos;avoir fait pointer vos DNS CNAME ou A vers nos serveurs.
        </p>
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Domaine personnalisé</label>
          <input
            type="text"
            value={customDomain}
            onChange={(e) => {
              setCustomDomain(e.target.value);
              setIsDirty(true);
            }}
            placeholder="ex: ma-boutique.tn"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#991B1B] transition shadow-sm disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Sauvegarde...' : 'Enregistrer le domaine'}
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
