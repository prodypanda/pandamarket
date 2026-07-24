'use client';

import React, { useEffect, useState } from 'react';
import {
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Upload,
  Trash2,
  Copy,
  Check,
  Search,
  Grid,
  List,
  Loader2,
  Maximize2,
  FileImage,
  Tags,
  Sparkles,
  Palette,
  LayoutTemplate,
  HardDrive,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';

interface MediaItem {
  key: string;
  url: string;
  filename: string;
  folder: 'categories' | 'branding' | 'banners' | 'general';
  content_type: string;
  size: number;
  created_at: string;
}

interface SummaryCounts {
  total: number;
  categories: number;
  branding: number;
  banners: number;
  general: number;
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function PlatformMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [summary, setSummary] = useState<SummaryCounts>({ total: 0, categories: 0, branding: 0, banners: 0, general: 0 });
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFolder, setUploadFolder] = useState<'categories' | 'branding' | 'banners' | 'general'>('categories');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Toast / Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadMedia() {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/platform-media?folder=${activeFolder}&search=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setItems(json.data || []);
        if (json.summary) {
          setSummary(json.summary);
        }
      } else {
        setError('Failed to load platform media library');
      }
    } catch {
      setError('An error occurred while fetching media');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMedia();
  }, [activeFolder]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);
    setError('');
    setSuccess('');

    try {
      // 1. Presign upload URL
      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || 'image/jpeg',
          purpose: 'marketplace_asset',
          folder: uploadFolder,
          file_size: file.size,
        }),
      });

      if (!presignRes.ok) {
        throw new Error('Failed to get presigned upload URL');
      }

      const { upload_url, file_key, public_url } = await presignRes.json();

      // 2. Upload file binary directly
      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Binary upload failed');
      }

      setSuccess(`File uploaded successfully to ${uploadFolder} folder!`);
      setIsUploadOpen(false);
      loadMedia();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress('');
      e.target.value = '';
    }
  }

  async function handleDelete(key: string) {
    if (!confirm('Are you sure you want to delete this media asset?')) return;

    setDeletingKey(key);
    try {
      const res = await fetchWithCsrf('/api/pd/admin/platform-media', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      if (res.ok) {
        setSuccess('Media file deleted cleanly');
        setItems(items.filter((item) => item.key !== key));
        if (previewItem?.key === key) setPreviewItem(null);
      } else {
        setError('Failed to delete file');
      }
    } catch {
      setError('An error occurred during file deletion');
    } finally {
      setDeletingKey(null);
    }
  }

  function handleCopyUrl(url: string, key: string) {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const filteredItems = items.filter((item) => {
    if (activeFolder !== 'all' && item.folder !== activeFolder) return false;
    if (searchQuery.trim() && !item.filename.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 p-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/40">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6a00] to-amber-500 text-white shadow-lg shadow-orange-500/20">
            <FolderOpen className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Platform Media Library</h1>
              <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-black uppercase text-[#ff6a00]">
                Superadmin
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Organize marketplace categories, logos, banners, and platform images in distinct folders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadMedia}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#ff6a00]' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff6a00] to-amber-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-500/25 transition-all hover:scale-105"
          >
            <Upload className="h-4 w-4" />
            Upload Asset
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-700 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Folder Navigation Tabs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { id: 'all', label: 'All Assets', icon: HardDrive, count: summary.total, color: 'from-slate-700 to-slate-900' },
          { id: 'categories', label: 'Categories', icon: Tags, count: summary.categories, color: 'from-orange-500 to-amber-600' },
          { id: 'branding', label: 'Branding & Logos', icon: Palette, count: summary.branding, color: 'from-purple-600 to-indigo-700' },
          { id: 'banners', label: 'Banners & Hero', icon: LayoutTemplate, count: summary.banners, color: 'from-blue-600 to-cyan-600' },
          { id: 'general', label: 'General', icon: Folder, count: summary.general, color: 'from-emerald-600 to-teal-700' },
        ].map((tab) => {
          const isActive = activeFolder === tab.id;
          const IconComp = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveFolder(tab.id)}
              className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                isActive
                  ? 'border-orange-500 bg-white shadow-xl shadow-orange-500/10 ring-2 ring-orange-500/20'
                  : 'border-slate-200/80 bg-white hover:bg-slate-50 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tab.color} text-white shadow-sm`}>
                  <IconComp className="h-4 w-4" />
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${isActive ? 'bg-orange-100 text-[#ff6a00]' : 'bg-slate-100 text-slate-600'}`}>
                  {tab.count}
                </span>
              </div>
              <div className="mt-3">
                <span className={`block text-xs font-black ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Toolbar: Search & View Mode */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets by filename..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#ff6a00] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition-all ${viewMode === 'grid' ? 'bg-white text-[#ff6a00] shadow-xs' : 'text-slate-400'}`}
              title="Grid View"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-lg p-1.5 transition-all ${viewMode === 'table' ? 'bg-white text-[#ff6a00] shadow-xs' : 'text-slate-400'}`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Display */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border border-slate-200/60 bg-white shadow-sm">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-[#ff6a00]" />
            <span>Loading platform media assets...</span>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-400">
          <FileImage className="h-10 w-10 text-slate-300 mb-2" />
          <p>No platform media files found in this folder.</p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            Upload New File
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredItems.map((item) => (
            <div
              key={item.key}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl"
            >
              {/* Image Preview Box */}
              <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                <img
                  src={item.url}
                  alt={item.filename}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="12">No Preview</text></svg>';
                  }}
                />
                <span className="absolute left-2.5 top-2.5 rounded-md bg-slate-950/70 px-2 py-0.5 text-[9px] font-black uppercase text-white backdrop-blur-md">
                  {item.folder}
                </span>

                {/* Quick Action Overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/40 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-800 shadow-md hover:bg-orange-500 hover:text-white"
                    title="Zoom Preview"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleCopyUrl(item.url, item.key)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-800 shadow-md hover:bg-orange-500 hover:text-white"
                    title="Copy URL"
                  >
                    {copiedKey === item.key ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(item.key)}
                    disabled={deletingKey === item.key}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-red-600 shadow-md hover:bg-red-600 hover:text-white"
                    title="Delete File"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Item Info Footer */}
              <div className="p-3">
                <span className="block truncate text-xs font-extrabold text-slate-800" title={item.filename}>
                  {item.filename}
                </span>
                <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>{formatBytes(item.size)}</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-4">Preview</th>
                <th className="p-4">Filename</th>
                <th className="p-4">Folder</th>
                <th className="p-4">File Size</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {filteredItems.map((item) => (
                <tr key={item.key} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3">
                    <img src={item.url} alt={item.filename} className="h-10 w-10 rounded-xl object-cover border border-slate-200" />
                  </td>
                  <td className="p-4">
                    <span className="block max-w-xs truncate text-slate-900" title={item.filename}>
                      {item.filename}
                    </span>
                    <span className="block text-[10px] font-mono text-slate-400 truncate max-w-xs">{item.key}</span>
                  </td>
                  <td className="p-4">
                    <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase text-[#ff6a00]">
                      {item.folder}
                    </span>
                  </td>
                  <td className="p-4">{formatBytes(item.size)}</td>
                  <td className="p-4">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleCopyUrl(item.url, item.key)}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-orange-400 hover:text-[#ff6a00]"
                        title="Copy URL"
                      >
                        {copiedKey === item.key ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-orange-400 hover:text-[#ff6a00]"
                        title="Zoom Preview"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.key)}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-[#ff6a00]" />
                Upload Platform Asset
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Folder</label>
                <select
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value as any)}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-[#ff6a00] focus:bg-white"
                >
                  <option value="categories">🏷️ Categories (Category & Subcategory Pictures)</option>
                  <option value="branding">🎨 Branding & Logos (Logos, Favicons, Default Covers)</option>
                  <option value="banners">🖼️ Banners & Sliders (Hero Banners, Promos)</option>
                  <option value="general">📦 General (Other Platform Media)</option>
                </select>
              </div>

              <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-8 text-center transition-all hover:bg-orange-50/30 hover:border-orange-400">
                <Upload className="h-10 w-10 text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-700">Choose a image file to upload</p>
                <p className="text-[10px] text-slate-400 mt-1">Supports PNG, JPEG, WEBP, SVG</p>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </div>

              {uploading && (
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#ff6a00] pt-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{uploadProgress}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULLSIZE PREVIEW MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="relative max-w-4xl w-full overflow-hidden rounded-3xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 truncate">
                <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase text-[#ff6a00]">
                  {previewItem.folder}
                </span>
                <h3 className="text-sm font-black text-slate-900 truncate">{previewItem.filename}</h3>
              </div>
              <button onClick={() => setPreviewItem(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex max-h-[65vh] items-center justify-center overflow-hidden rounded-2xl bg-slate-900 p-2">
              <img src={previewItem.url} alt={previewItem.filename} className="max-h-[60vh] w-auto object-contain rounded-xl" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 text-xs font-bold text-slate-600">
              <div className="space-x-3">
                <span>Size: {formatBytes(previewItem.size)}</span>
                <span>Type: {previewItem.content_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyUrl(previewItem.url, previewItem.key)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Image Link</span>
                </button>
                <a
                  href={previewItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open in New Tab</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
