'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, FileText, Zap, History, RefreshCw, AlertCircle } from 'lucide-react';

interface AiJob {
  id: string;
  type: string;
  status: string;
  input_url?: string;
  input_meta?: Record<string, unknown>;
  output?: Record<string, unknown>;
  tokens_consumed: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

interface Credits {
  ai_tokens: number;
  tokens_used: number;
}

export default function AiToolsPage() {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Compress form
  const [compressUrl, setCompressUrl] = useState('');
  const [compressProductId, setCompressProductId] = useState('');
  const [compressing, setCompressing] = useState(false);

  // SEO form
  const [seoProductId, setSeoProductId] = useState('');
  const [seoLanguage, setSeoLanguage] = useState<'fr' | 'ar' | 'en'>('fr');
  const [generating, setGenerating] = useState(false);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/ai/credits', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/ai/history?limit=20', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void Promise.all([fetchCredits(), fetchJobs()]).finally(() => setLoading(false));
  }, [fetchCredits, fetchJobs]);

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess('');
    } else {
      setSuccess(msg);
      setError('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 4000);
  };

  const handleCompress = async () => {
    if (!compressUrl) {
      showFeedback('URL de l\'image requise', true);
      return;
    }
    setCompressing(true);
    try {
      const res = await fetchWithCsrf('/api/pd/ai/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          image_url: compressUrl,
          product_id: compressProductId || undefined,
        }),
      });
      if (res.ok) {
        showFeedback('Compression lancée ! Le job est en cours de traitement.');
        setCompressUrl('');
        setCompressProductId('');
        fetchCredits();
        fetchJobs();
      } else {
        const data = await res.json();
        showFeedback(data.error?.message || 'Erreur', true);
      }
    } catch {
      showFeedback('Erreur réseau', true);
    } finally {
      setCompressing(false);
    }
  };

  const handleSeoGenerate = async () => {
    if (!seoProductId) {
      showFeedback('ID du produit requis', true);
      return;
    }
    setGenerating(true);
    try {
      const res = await fetchWithCsrf('/api/pd/ai/seo-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product_id: seoProductId,
          language: seoLanguage,
        }),
      });
      if (res.ok) {
        showFeedback('Génération SEO lancée !');
        setSeoProductId('');
        fetchCredits();
        fetchJobs();
      } else {
        const data = await res.json();
        showFeedback(data.error?.message || 'Erreur', true);
      }
    } catch {
      showFeedback('Erreur réseau', true);
    } finally {
      setGenerating(false);
    }
  };

  const isUnlimited = credits && credits.ai_tokens === -1;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Outils IA</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-gray-100 rounded w-1/2" />
                <div className="h-20 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Outils IA</h1>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#16C784]/10 rounded-full">
          <Zap className="w-4 h-4 text-[#16C784]" />
          <span className="text-sm font-semibold text-[#16C784]">
            {isUnlimited ? '∞' : credits?.ai_tokens || 0} tokens
          </span>
          {!isUnlimited && credits && (
            <span className="text-xs text-gray-500">({credits.tokens_used} utilisés)</span>
          )}
        </div>
      </div>

      {/* Feedback */}
      {success && (
        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{success}</div>
      )}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Tool Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image Compression */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Compression Image</h2>
              <p className="text-xs text-gray-500">1 token / image</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Optimisez vos photos produit pour un chargement plus rapide.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={compressUrl}
              onChange={(e) => setCompressUrl(e.target.value)}
              placeholder="URL de l'image"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
            />
            <input
              type="text"
              value={compressProductId}
              onChange={(e) => setCompressProductId(e.target.value)}
              placeholder="ID du produit (optionnel)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
            />
            <button
              onClick={handleCompress}
              disabled={compressing}
              className="w-full py-2.5 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b876] transition-colors disabled:opacity-50 text-sm"
            >
              {compressing ? 'Compression...' : 'Compresser →'}
            </button>
          </div>
        </div>

        {/* SEO Generation */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">SEO Automatique</h2>
              <p className="text-xs text-gray-500">2 tokens / produit</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Générez titres et descriptions SEO optimisés pour vos produits.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={seoProductId}
              onChange={(e) => setSeoProductId(e.target.value)}
              placeholder="ID du produit"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
            />
            <select
              value={seoLanguage}
              onChange={(e) => setSeoLanguage(e.target.value as 'fr' | 'ar' | 'en')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
            >
              <option value="fr">Français</option>
              <option value="ar">Arabe</option>
              <option value="en">Anglais</option>
            </select>
            <button
              onClick={handleSeoGenerate}
              disabled={generating}
              className="w-full py-2.5 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b876] transition-colors disabled:opacity-50 text-sm"
            >
              {generating ? 'Génération...' : 'Générer →'}
            </button>
          </div>
        </div>
      </div>

      {/* Job History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Historique des Jobs</h2>
          </div>
          <button
            onClick={fetchJobs}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Statut</th>
                <th className="px-6 py-3">Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                    Aucun job IA
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {new Date(job.created_at).toLocaleDateString('fr-TN')}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className="flex items-center gap-1.5">
                        {job.type === 'image_compression' ? (
                          <ImageIcon className="w-4 h-4 text-blue-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-purple-500" />
                        )}
                        {job.type === 'image_compression' ? 'Compression' : 'SEO'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          job.status === 'completed'
                            ? 'bg-green-50 text-green-700'
                            : job.status === 'processing'
                              ? 'bg-blue-50 text-blue-700'
                              : job.status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        {job.status === 'completed'
                          ? '✅ Terminé'
                          : job.status === 'processing'
                            ? '⏳ En cours'
                            : job.status === 'failed'
                              ? '❌ Échoué'
                              : '🕐 En attente'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {job.tokens_consumed > 0 ? `${job.tokens_consumed} 🪙` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
