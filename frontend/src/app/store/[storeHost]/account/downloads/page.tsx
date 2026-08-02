'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, Key, FileDown, Clock, AlertCircle, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';

interface Entitlement {
  order_id: string;
  product_id: string;
  product_title: string;
  product_type: 'digital' | 'serial';
  has_file: boolean;
  file_name: string | null;
  max_downloads: number;
  download_count: number;
  downloads_remaining: number;
  license_keys: string[];
  expires_hours: number;
  order_date: string;
}

export default function StorefrontAccountDownloadsPage() {
  const params = useParams();
  const storeHost = decodeURIComponent(params.storeHost as string);

  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadEntitlements() {
      try {
        const res = await fetchWithCsrf('/api/pd/storefront/account/downloads');
        if (res.ok) {
          const data = await res.json();
          setEntitlements(data.entitlements || data.data || []);
        }
      } catch {
        setError('Erreur lors du chargement de vos téléchargements.');
      } finally {
        setLoading(false);
      }
    }

    loadEntitlements();
  }, [storeHost]);

  async function handleDownload(productId: string, orderId: string) {
    setError('');
    setMessage('');
    setDownloading(`${productId}-${orderId}`);

    try {
      const res = await fetchWithCsrf(`/api/pd/storefront/account/downloads/${productId}/${orderId}`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || 'Erreur lors du téléchargement.');
        setDownloading(null);
        return;
      }

      const data = await res.json();
      if (data.data?.download_url) {
        window.open(data.data.download_url, '_blank');
        setMessage('Téléchargement lancé.');
        // Refresh entitlements to update download count
        const refreshRes = await fetchWithCsrf('/api/pd/storefront/account/downloads');
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setEntitlements(refreshData.entitlements || refreshData.data || []);
        }
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setDownloading(null);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Fallback
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 border-b pb-4 mb-6">
          <Download className="w-5 h-5 text-emerald-600" />
          <h1 className="text-xl font-bold text-gray-900">Téléchargements & Licences</h1>
        </div>

        {message && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500" />
            {error}
          </div>
        )}

        {entitlements.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
            <FileDown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">
              Aucun produit numérique ou clé de licence à afficher.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Vos téléchargements apparaîtront ici après un achat confirmé.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {entitlements.map((ent) => {
              const isDownloading = downloading === `${ent.product_id}-${ent.order_id}`;
              const hasExhausted = ent.downloads_remaining <= 0;

              return (
                <div
                  key={`${ent.product_id}-${ent.order_id}`}
                  className="rounded-2xl border border-gray-100 p-5 hover:border-emerald-200 transition-all"
                >
                  {/* Header row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-gray-50">
                    <div>
                      <h3 className="font-extrabold text-sm text-gray-900">{ent.product_title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Commande #{ent.order_id} • {new Date(ent.order_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      ent.product_type === 'serial'
                        ? 'bg-violet-100 text-violet-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}>
                      {ent.product_type === 'serial' ? (
                        <><Key className="w-3.5 h-3.5" /> Clé de licence</>
                      ) : (
                        <><FileDown className="w-3.5 h-3.5" /> Fichier numérique</>
                      )}
                    </span>
                  </div>

                  {/* License keys section */}
                  {ent.license_keys.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Clé(s) de licence
                      </p>
                      {ent.license_keys.map((key, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-sm text-slate-800"
                        >
                          <span className="break-all">{key}</span>
                          <button
                            onClick={() => copyToClipboard(key)}
                            className="ml-3 flex-shrink-0 p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                            title="Copier"
                          >
                            {copiedKey === key ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Download section */}
                  {ent.has_file && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" />
                          {ent.download_count}/{ent.max_downloads} téléchargements
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Lien valide {ent.expires_hours}h
                        </span>
                        {ent.file_name && (
                          <span className="hidden sm:inline text-gray-400 truncate max-w-[200px]" title={ent.file_name}>
                            {ent.file_name}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDownload(ent.product_id, ent.order_id)}
                        disabled={isDownloading || hasExhausted}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-colors ${
                          hasExhausted
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#16C784] text-white hover:bg-[#14b576]'
                        } disabled:opacity-60`}
                      >
                        {isDownloading ? (
                          <>
                            <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Préparation...
                          </>
                        ) : hasExhausted ? (
                          <>Limite atteinte</>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5" />
                            Télécharger
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
