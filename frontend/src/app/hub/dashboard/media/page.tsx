'use client';

import { fetchWithCsrf } from '@/lib/api';
import { Check, Copy, ExternalLink, ImageIcon, Loader2, Search, UploadCloud, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface MediaItem {
  url: string;
  product_id?: string | null;
  product_title?: string | null;
  alt_text?: string | null;
  is_thumbnail?: boolean | null;
}

async function getErrorMessage(res: Response, fallback = 'Request failed') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

function filenameFromUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    const segment = parsed.pathname.split('/').filter(Boolean).pop();
    return segment || 'media asset';
  } catch {
    return url.split('/').filter(Boolean).pop() || 'media asset';
  }
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function SellerMediaPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const showFeedback = useCallback((message: string, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess('');
    } else {
      setSuccess(message);
      setError('');
    }
    window.setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3500);
  }, []);

  const fetchMediaItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/media?limit=100', { credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to load media'));
      const data = await res.json();
      setMediaItems(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMediaItems();
  }, [fetchMediaItems]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return mediaItems;
    return mediaItems.filter((item) => [item.product_title, item.alt_text, filenameFromUrl(item.url), item.url]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)));
  }, [mediaItems, search]);

  const productLinkedCount = mediaItems.filter((item) => item.product_id && !String(item.product_id).startsWith('asset_')).length;
  const standaloneCount = Math.max(0, mediaItems.length - productLinkedCount);

  const uploadMedia = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) throw new Error('Please upload a JPG, PNG, or WebP image.');
      if (file.size > 10 * 1024 * 1024) throw new Error('Image must be smaller than 10 MB.');

      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ filename: file.name, content_type: file.type, file_size: file.size, purpose: 'product_image' }),
      });
      if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes, 'Failed to prepare upload'));
      const data = await presignRes.json();
      if (!data.upload_url || !data.public_url) throw new Error('Upload URL was not returned by the server.');

      const uploadRes = await fetch(data.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Image upload failed.');

      await fetchMediaItems();
      showFeedback('Image uploaded to your media library.');
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Image upload failed', true);
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      showFeedback('Media URL copied.');
      window.setTimeout(() => setCopiedUrl(''), 1500);
    } catch {
      showFeedback('Could not copy URL automatically.', true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-2xl shadow-slate-900/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-emerald-100">
              <ImageIcon className="h-4 w-4" />
              Store media library
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Media</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">
              Upload and reuse store images for products, categories, logos, marketplace headers, and storefront content.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-emerald-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {uploading ? 'Uploading...' : 'Upload image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(event) => void uploadMedia(event.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {(success || error) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error || success}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-gray-400">Total media</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{mediaItems.length}</p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-gray-400">Product images</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{productLinkedCount}</p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-gray-400">Standalone assets</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{standaloneCount}</p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search images by product, filename, or URL"
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#16C784] focus:bg-white focus:ring-4 focus:ring-[#16C784]/10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-[2rem] border border-gray-100 bg-white py-16 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-[#16C784]" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500">
          <ImageIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="font-bold">No media found.</p>
          <p className="mt-1 text-sm">Upload your first image or clear the current search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {filteredItems.map((item) => (
            <div key={item.url} className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10">
              <button
                type="button"
                onClick={() => setSelectedItem(item)}
                className="block aspect-square w-full bg-gray-100"
              >
                <div
                  aria-label={item.alt_text || item.product_title || filenameFromUrl(item.url)}
                  role="img"
                  className="h-full w-full bg-cover bg-center transition duration-300 group-hover:scale-105"
                  style={{ backgroundImage: `url(${item.url})` }}
                />
              </button>
              <div className="p-4">
                <p className="truncate text-sm font-black text-gray-900">{item.product_title || filenameFromUrl(item.url)}</p>
                <p className="mt-1 truncate text-xs font-semibold text-gray-500">{item.alt_text || item.url}</p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void copyUrl(item.url)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-200"
                  >
                    {copiedUrl === item.url ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy
                  </button>
                  <Link
                    href={item.url}
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-xl bg-[#16C784] px-3 py-2 text-xs font-black text-white transition hover:bg-[#14b876]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">Media details</h2>
                <p className="text-xs font-semibold text-gray-500">{filenameFromUrl(selectedItem.url)}</p>
              </div>
              <button type="button" onClick={() => setSelectedItem(null)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
              <div className="min-h-[420px] bg-gray-100">
                <div
                  aria-label={selectedItem.alt_text || selectedItem.product_title || filenameFromUrl(selectedItem.url)}
                  role="img"
                  className="h-full min-h-[420px] w-full bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${selectedItem.url})` }}
                />
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-gray-400">Title</p>
                  <p className="mt-1 break-words text-sm font-bold text-gray-900">{selectedItem.product_title || 'Standalone asset'}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-gray-400">URL</p>
                  <p className="mt-1 break-all rounded-2xl bg-gray-50 p-3 text-xs font-semibold text-gray-600">{selectedItem.url}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-gray-400">Size</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{formatBytes(0)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyUrl(selectedItem.url)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16C784] px-4 py-3 text-sm font-black text-white transition hover:bg-[#14b876]"
                >
                  <Copy className="h-4 w-4" />
                  Copy media URL
                </button>
                <Link
                  href={selectedItem.url}
                  target="_blank"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open original
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
