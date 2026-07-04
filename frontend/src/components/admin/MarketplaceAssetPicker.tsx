'use client';

import { fetchWithCsrf } from '@/lib/api';
import { FileText, ImageIcon, Loader2, Search, Upload, X } from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

interface FileAsset {
  id: string;
  url: string;
  filename: string;
  content_type: string;
  file_size?: string | number | null;
  created_at?: string;
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

export function MarketplaceAssetPicker({
  open,
  title = 'Media library',
  type = 'image',
  onClose,
  onSelect,
}: MarketplaceAssetPickerProps) {
  const [assets, setAssets] = useState<FileAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/assets?type=${type}&limit=80`, {
        credentials: 'include',
      });
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
    return assets.filter(
      (asset) =>
        asset.filename.toLowerCase().includes(needle) || asset.url.toLowerCase().includes(needle),
    );
  }, [assets, query]);

  const uploadAsset = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
          purpose: 'marketplace_asset',
        }),
      });
      if (!presignRes.ok)
        throw new Error(await getErrorMessage(presignRes, 'Failed to prepare upload'));
      const presignData = await presignRes.json();

      const uploadRes = await fetch(presignData.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Upload failed. Please try again.');

      if (presignData.public_url) onSelect(presignData.public_url);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">
              Upload a new file or reuse an existing marketplace asset.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search assets"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784]"
              />
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#16C784] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14b876]">
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? 'Uploading...' : 'Upload file'}
              <input
                type="file"
                accept={type === 'image' ? 'image/*' : undefined}
                onChange={uploadAsset}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#16C784]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-500">
              No assets found.
            </div>
          ) : (
            <div className="grid max-h-[520px] grid-cols-2 gap-4 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
              {filteredAssets.map((asset) => {
                const isImage = asset.content_type.startsWith('image/');
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => onSelect(asset.url)}
                    className="group overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition hover:border-[#16C784] hover:shadow-md"
                  >
                    <div className="flex aspect-square items-center justify-center bg-gray-50">
                      {isImage ? (
                        <img
                          src={asset.url}
                          alt={asset.filename}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FileText className="h-10 w-10 text-gray-400" />
                      )}
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {asset.filename}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-500">
                        {isImage ? (
                          <ImageIcon className="h-3.5 w-3.5" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                        {asset.content_type}
                        {formatSize(asset.file_size) ? ` • ${formatSize(asset.file_size)}` : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
