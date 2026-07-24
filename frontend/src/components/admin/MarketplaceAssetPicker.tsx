'use client';

import { fetchWithCsrf } from '@/lib/api';
import { FileText, ImageIcon, Loader2, Search, Upload, X, Zap, CheckCircle2, Folder } from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

interface FileAsset {
  id: string;
  url: string;
  filename: string;
  content_type: string;
  file_size?: string | number | null;
  created_at?: string;
  key?: string;
}

interface MarketplaceAssetPickerProps {
  open: boolean;
  title?: string;
  type?: 'image' | 'document';
  onClose: () => void;
  onSelect: (url: string) => void;
}

async function getErrorMessage(res: Response, fallback = 'Request failed') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

function formatSize(value?: string | number | null) {
  const size = typeof value === 'string' ? Number(value) : value;
  if (!size || Number.isNaN(size)) return '';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function MarketplaceAssetPicker({ open, title = 'Media library', type = 'image', onClose, onSelect }: MarketplaceAssetPickerProps) {
  const [assets, setAssets] = useState<FileAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');

  // Optimization & Folder State
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<'categories' | 'branding' | 'banners' | 'general'>('categories');
  const [optimizingId, setOptimizingId] = useState<string | null>(null);

  // Auto-infer folder from picker title
  useEffect(() => {
    const lower = (title || '').toLowerCase();
    if (lower.includes('category')) {
      setSelectedFolder('categories');
    } else if (lower.includes('logo') || lower.includes('brand') || lower.includes('setting')) {
      setSelectedFolder('branding');
    } else if (lower.includes('banner') || lower.includes('hero')) {
      setSelectedFolder('banners');
    } else {
      setSelectedFolder('general');
    }
  }, [title]);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/assets?type=${type}&limit=80`, { credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to load media library'));
      const data = await res.json();
      setAssets(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media library');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (open) void loadAssets();
  }, [loadAssets, open]);

  const filteredAssets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return assets;
    return assets.filter((asset) => asset.filename.toLowerCase().includes(needle) || asset.url.toLowerCase().includes(needle));
  }, [assets, query]);

  const uploadAsset = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError('');
    setNotification('');

    try {
      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || 'image/jpeg',
          file_size: file.size,
          purpose: 'marketplace_asset',
          folder: selectedFolder,
        }),
      });

      if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes, 'Failed to prepare upload'));
      const presignData = await presignRes.json();

      const uploadRes = await fetch(presignData.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Upload failed. Please try again.');

      let finalUrl = presignData.public_url;

      // Auto-Optimize if enabled and asset is an image
      if (autoOptimize && (file.type.startsWith('image/') || type === 'image') && presignData.file_key) {
        setNotification('⚡ Optimizing and compressing uploaded picture...');
        try {
          const optRes = await fetchWithCsrf('/api/pd/admin/platform-media/optimize', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: presignData.file_key,
              quality: 80,
              maxWidth: 1600,
              format: 'webp',
            }),
          });

          if (optRes.ok) {
            const optJson = await optRes.json();
            setNotification(
              `⚡ Uploaded & Compressed! Size reduced by ${optJson.saved_percentage}% (${formatSize(optJson.original_size)} ➔ ${formatSize(optJson.new_size)})`,
            );
          }
        } catch {
          // Ignore compression failure & fallback to uncompressed image
        }
      }

      if (finalUrl) onSelect(finalUrl);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleInlineOptimize = async (asset: FileAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!asset.key && !asset.url) return;

    // Derive key from asset key or URL
    const rawKey = asset.key || asset.url.replace(/^\//, '');
    setOptimizingId(asset.id);
    setError('');
    setNotification('');

    try {
      const res = await fetchWithCsrf('/api/pd/admin/platform-media/optimize', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: rawKey,
          quality: 80,
          maxWidth: 1600,
          format: 'webp',
        }),
      });

      if (!res.ok) throw new Error('Failed to compress image');
      const optJson = await res.json();
      setNotification(`⚡ Picture compressed! Saved ${optJson.saved_percentage}% space (${formatSize(optJson.original_size)} ➔ ${formatSize(optJson.new_size)})`);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setOptimizingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs">
      <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl space-y-0 overflow-hidden border border-slate-200/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900">{title}</h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800 uppercase">
                Sharp Compressed
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">Upload a new picture or select an existing marketplace asset.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {error && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
          {notification && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
          )}

          {/* Search, Folder Selector & Upload Controls */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search marketplace assets..."
                className="w-full rounded-xl border border-gray-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs font-bold outline-none focus:border-[#16C784] focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Folder Selector */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                <Folder className="h-3.5 w-3.5 text-[#ff6a00]" />
                <span className="text-[10px] uppercase text-slate-400">Folder:</span>
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value as any)}
                  className="bg-transparent font-black text-slate-900 outline-none cursor-pointer text-xs"
                >
                  <option value="categories">Categories</option>
                  <option value="branding">Branding & Logos</option>
                  <option value="banners">Banners</option>
                  <option value="general">General</option>
                </select>
              </div>

              {/* Auto-Optimize Toggle */}
              <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100">
                <input
                  type="checkbox"
                  checked={autoOptimize}
                  onChange={(e) => setAutoOptimize(e.target.checked)}
                  className="rounded text-[#ff6a00] focus:ring-0 cursor-pointer"
                />
                <Zap className="h-3.5 w-3.5 text-[#ff6a00]" />
                <span>Auto-Compress (WebP 80%)</span>
              </label>

              {/* Upload Button */}
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#ff6a00] px-4 py-2.5 text-xs font-black text-white shadow-md hover:bg-orange-600 transition-transform active:scale-95">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {uploading ? 'Uploading...' : 'Upload File'}
                <input type="file" accept={type === 'image' ? 'image/*' : undefined} onChange={uploadAsset} disabled={uploading} className="hidden" />
              </label>
            </div>
          </div>

          {/* Asset Gallery Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#ff6a00]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-xs font-semibold text-gray-500">No assets found.</div>
          ) : (
            <div className="grid max-h-[500px] grid-cols-2 gap-3.5 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
              {filteredAssets.map((asset) => {
                const isImage = asset.content_type.startsWith('image/');
                const isOptimizingThis = optimizingId === asset.id;

                return (
                  <div
                    key={asset.id}
                    onClick={() => onSelect(asset.url)}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-[#ff6a00] hover:shadow-lg cursor-pointer"
                  >
                    <div className="relative flex aspect-square items-center justify-center bg-gray-50 overflow-hidden">
                      {isImage ? (
                        <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <FileText className="h-10 w-10 text-gray-400" />
                      )}

                      {/* Inline Quick Compression Button */}
                      {isImage && (
                        <button
                          type="button"
                          onClick={(e) => handleInlineOptimize(asset, e)}
                          disabled={isOptimizingThis}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-xl bg-slate-950/70 text-amber-400 backdrop-blur-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-amber-400 hover:text-slate-950 shadow-md"
                          title="Compress & Convert to WebP"
                        >
                          {isOptimizingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1 p-3">
                      <p className="truncate text-xs font-black text-gray-900" title={asset.filename}>{asset.filename}</p>
                      <p className="flex items-center justify-between text-[10px] font-bold text-gray-400">
                        <span>{asset.content_type.split('/')[1] || asset.content_type}</span>
                        <span>{formatSize(asset.file_size)}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
