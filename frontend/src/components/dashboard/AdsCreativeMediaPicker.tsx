'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { ImageIcon, Loader2, Search, UploadCloud, X } from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';

type Asset = { url: string; product_title?: string | null; alt_text?: string | null };

async function message(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data.error?.message || data.message || fallback;
  } catch {
    return fallback;
  }
}

function name(asset: Asset) {
  try {
    return asset.product_title || asset.alt_text || new URL(asset.url, window.location.origin).pathname.split('/').pop() || 'Image de boutique';
  } catch {
    return asset.product_title || asset.alt_text || 'Image de boutique';
  }
}

export function AdsCreativeMediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const { t, dir } = useLocale();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchWithCsrf('/api/pd/stores/me/media?limit=100', { credentials: 'include' });
      if (!response.ok) throw new Error(await message(response, 'Impossible de charger vos médias'));
      const data = await response.json();
      setAssets(data.data || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger vos médias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    return value ? assets.filter((asset) => `${name(asset)} ${asset.url}`.toLowerCase().includes(value)) : assets;
  }, [assets, search]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Veuillez téléverser une image JPG, PNG ou WebP valide.');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('L\'image ne doit pas dépasser 10 Mo.');
      }
      const presign = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content_type: file.type, file_size: file.size, purpose: 'product_image' }),
      });
      if (!presign.ok) throw new Error(await message(presign, 'Impossible de préparer le téléversement'));
      const data = await presign.json();
      const result = await fetch(data.upload_url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!result.ok) throw new Error('Échec du téléversement de l\'image.');
      if (!data.public_url) throw new Error('L\'URL de l\'image téléversée est indisponible.');
      onSelect(data.public_url);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Échec du téléversement');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ads-media-title"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl space-y-4">
        <header className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 id="ads-media-title" className="text-base font-semibold text-slate-900 dark:text-white">
                {t('ads.mediaPicker.title') || 'Choisir une image pour le créatif'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {t('ads.mediaPicker.subtitle') || 'Sélectionnez une image de votre boutique ou téléversez un nouveau visuel.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la médiathèque"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-5 pb-5">
          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-medium text-rose-700 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <span className="sr-only">Rechercher une image</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('ads.mediaPicker.searchPlaceholder') || 'Rechercher une image...'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none shadow-2xs"
              />
            </label>
            <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-3.5 py-2 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs shrink-0">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              <span>{uploading ? t('ads.mediaPicker.uploading') || 'Téléversement…' : t('ads.mediaPicker.upload') || 'Téléverser une image'}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={upload} className="hidden" />
            </label>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-900 dark:text-white" />
            </div>
          ) : filtered.length ? (
            <div className="grid max-h-[50vh] grid-cols-2 gap-2.5 overflow-y-auto sm:grid-cols-3 md:grid-cols-4 p-1">
              {filtered.map((asset) => (
                <button
                  key={asset.url}
                  type="button"
                  onClick={() => {
                    onSelect(asset.url);
                    onClose();
                  }}
                  className="group overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 text-left transition hover:border-slate-400 hover:shadow-xs cursor-pointer"
                >
                  <img src={asset.url ? getResizedImageUrl(asset.url, 'medium') : ''} alt={name(asset)} className="aspect-square w-full bg-slate-100 dark:bg-slate-800 object-cover" />
                  <p className="truncate p-2.5 text-xs font-medium text-slate-900 dark:text-white">{name(asset)}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-12 text-center text-xs text-slate-400">
              <ImageIcon className="mx-auto mb-2 h-7 w-7 text-slate-300 dark:text-slate-600" />
              {t('ads.mediaPicker.noImages') || 'Aucune image trouvée dans votre médiathèque.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
