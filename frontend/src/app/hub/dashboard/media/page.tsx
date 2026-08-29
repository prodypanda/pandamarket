'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { useLocale } from '@/contexts/LocaleContext';
import { fetchWithCsrf } from '@/lib/api';
import {
  Check,
  Copy,
  ExternalLink,
  ImageIcon,
  Loader2,
  Search,
  UploadCloud,
  X,
  Maximize2,
  Trash2,
  Edit3,
  Zap,
  Folder,
  Layers,
  Package,
  Palette,
  FolderOpen,
  Grid,
  List,
  ArrowUpDown,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Link as LinkIcon,
} from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface MediaItem {
  key: string;
  url: string;
  filename: string;
  folder: 'products' | 'branding' | 'uncategorized' | 'general';
  content_type: string;
  size: number;
  width?: number | null;
  height?: number | null;
  dimensions?: string | null;
  product_id?: string | null;
  product_title?: string | null;
  created_at: string;
}

interface SummaryCounts {
  total: number;
  products: number;
  branding: number;
  uncategorized: number;
  general: number;
  storage_used: number;
}

async function getErrorMessage(res: Response, fallback = 'Request failed') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(dateStr?: string, locale = 'fr-TN') {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function SellerMediaPage() {
  const { t, locale } = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  // Data & loading
  const [items, setItems] = useState<MediaItem[]>([]);
  const [summary, setSummary] = useState<SummaryCounts>({
    total: 0,
    products: 0,
    branding: 0,
    uncategorized: 0,
    general: 0,
    storage_used: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters & display
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc'>('date_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Drag & drop
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Modals & Item Actions
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const [renamingItem, setRenamingItem] = useState<MediaItem | null>(null);
  const [newFilename, setNewFilename] = useState('');
  const [savingRename, setSavingRename] = useState(false);

  const [optimizingItem, setOptimizingItem] = useState<MediaItem | null>(null);
  const [optQuality, setOptQuality] = useState<number>(80);
  const [optMaxWidth, setOptMaxWidth] = useState<number>(1600);
  const [optFormat, setOptFormat] = useState<'webp' | 'jpeg' | 'png' | 'original'>('webp');
  const [optimizing, setOptimizing] = useState(false);
  const [optResult, setOptResult] = useState<{ original_size: number; new_size: number; saved_percentage: string } | null>(null);

  const [deletingItem, setDeletingItem] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Feedback toasts
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
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
    }, 4000);
  }, []);

  // Fetch Media Items from Backend
  const fetchMediaItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        folder: activeFolder,
        search: search.trim(),
        sort_by: sortBy,
        limit: '150',
      });
      const res = await fetchWithCsrf(`/api/pd/stores/me/media?${queryParams.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.media.errorLoadMedia')));
      const json = await res.json();
      setItems(json.data || []);
      if (json.summary) {
        setSummary(json.summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.media.errorLoadMedia'));
    } finally {
      setLoading(false);
    }
  }, [activeFolder, search, sortBy, t]);

  useEffect(() => {
    void fetchMediaItems();
  }, [fetchMediaItems]);

  // Upload Logic with folder selection
  const processUpload = async (file: File, folderTarget = 'uncategorized') => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(`${file.name}...`);
    setError('');
    setSuccess('');

    try {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(t('dashboardPages.media.errorInvalidType'));
      }
      if (file.size > 15 * 1024 * 1024) {
        throw new Error(t('dashboardPages.media.errorTooLarge'));
      }

      // Presign upload URL
      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || 'image/jpeg',
          file_size: file.size,
          purpose: 'store_asset',
          folder: folderTarget,
        }),
      });

      if (!presignRes.ok) {
        throw new Error(await getErrorMessage(presignRes, t('dashboardPages.media.errorPrepareUpload')));
      }
      const presignData = await presignRes.json();
      if (!presignData.upload_url) {
        throw new Error(t('dashboardPages.media.errorNoUploadUrl'));
      }

      // Upload binary to S3/Mock storage
      const uploadRes = await fetch(presignData.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(t('dashboardPages.media.errorUploadFailed'));
      }

      // Auto-generate multi-size WebP variants and sync to R2 in background
      if (presignData.file_key) {
        try {
          await fetchWithCsrf('/api/pd/files/process-variants', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_key: presignData.file_key,
            }),
          });
        } catch {
          // Non-blocking variant generation
        }
      }

      await fetchMediaItems();
      showFeedback(t('dashboardPages.media.successUploaded'));
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.media.errorUploadFailed'), true);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // Put new dropped files directly into the uncategorized folder
    const targetFolder = activeFolder !== 'all' && ['products', 'branding', 'uncategorized', 'general'].includes(activeFolder)
      ? activeFolder
      : 'uncategorized';

    void processUpload(files[0], targetFolder);
  };

  // Rename Handler
  const handleSaveRename = async () => {
    if (!renamingItem || !newFilename.trim()) return;
    setSavingRename(true);
    setError('');

    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/media/rename', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: renamingItem.key,
          new_filename: newFilename.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(await getErrorMessage(res, 'Failed to rename media'));
      }

      showFeedback(t('dashboardPages.media.renameSuccess'));
      setRenamingItem(null);
      setNewFilename('');
      await fetchMediaItems();
    } catch (err: any) {
      showFeedback(err.message || 'Rename failed', true);
    } finally {
      setSavingRename(false);
    }
  };

  // Optimize Handler
  const handleSaveOptimize = async () => {
    if (!optimizingItem) return;
    setOptimizing(true);
    setOptResult(null);
    setError('');

    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/media/optimize', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: optimizingItem.key,
          quality: optQuality,
          maxWidth: optMaxWidth,
          format: optFormat,
        }),
      });

      if (!res.ok) {
        throw new Error(await getErrorMessage(res, 'Optimization failed'));
      }

      const data = await res.json();
      setOptResult({
        original_size: data.original_size,
        new_size: data.new_size,
        saved_percentage: data.saved_percentage,
      });

      showFeedback(t('dashboardPages.media.optimizeSuccess'));
      await fetchMediaItems();
    } catch (err: any) {
      showFeedback(err.message || 'Optimization failed', true);
    } finally {
      setOptimizing(false);
    }
  };

  // Delete Handler
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    setError('');

    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/media', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: deletingItem.key }),
      });

      if (!res.ok) {
        throw new Error(await getErrorMessage(res, 'Failed to delete media asset'));
      }

      showFeedback(t('dashboardPages.media.deleteSuccess'));
      setDeletingItem(null);
      await fetchMediaItems();
    } catch (err: any) {
      showFeedback(err.message || 'Delete failed', true);
    } finally {
      setDeleting(false);
    }
  };

  // Copy URL with feedback
  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      showFeedback(t('dashboardPages.media.successUrlCopied'));
      window.setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      showFeedback(t('dashboardPages.media.errorCopyFailed'), true);
    }
  };

  // Folder labels and metadata
  const folderTabs = useMemo(
    () => [
      { id: 'all', label: t('dashboardPages.media.all'), icon: Layers, count: summary.total },
      { id: 'products', label: t('dashboardPages.media.products'), icon: Package, count: summary.products },
      { id: 'branding', label: t('dashboardPages.media.branding'), icon: Palette, count: summary.branding },
      { id: 'uncategorized', label: t('dashboardPages.media.uncategorized'), icon: Folder, count: summary.uncategorized },
    ],
    [t, summary],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative min-h-[calc(100vh-8rem)] space-y-6"
    >
      {/* Drag & Drop Visual Backdrop Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-950/80 p-8 backdrop-blur-md transition-all">
          <div className="flex max-w-lg flex-col items-center rounded-3xl border-2 border-dashed border-emerald-400 bg-emerald-900/60 p-10 text-center text-white shadow-2xl">
            <UploadCloud className="h-20 w-20 animate-bounce text-emerald-400" />
            <h2 className="mt-4 text-2xl font-black">{t('dashboardPages.media.dropToUpload')}</h2>
            <p className="mt-2 text-sm text-emerald-200">{t('dashboardPages.media.dragDropSubtitle')}</p>
          </div>
        </div>
      )}

      {/* Main Header Card */}
      <div className="relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-2xl shadow-emerald-950/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-black text-emerald-300">
              <ImageIcon className="h-3.5 w-3.5" />
              {t('dashboardPages.media.storeMediaLibrary')}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">{t('dashboardPages.media.title')}</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              {t('dashboardPages.media.description')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-400 active:translate-y-0">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin text-slate-950" /> : <UploadCloud className="h-4 w-4 text-slate-950" />}
              <span>{uploading ? uploadProgress || t('dashboardPages.media.uploading') : t('dashboardPages.media.uploadImage')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void processUpload(file, activeFolder !== 'all' ? activeFolder : 'uncategorized');
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Note on Automatic Product Picture Duplication */}
        <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-3.5 text-xs text-emerald-200">
          <Info className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{t('dashboardPages.media.autoDuplicatedNote')}</span>
        </div>
      </div>

      {/* Toast Feedback */}
      {(success || error) && (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-semibold shadow-sm transition-all ${
            error
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300'
          }`}
        >
          {error ? <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" /> : <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
          <span className="flex-1">{error || success}</span>
          <button type="button" onClick={() => { setError(''); setSuccess(''); }} className="opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
            <span className="text-xs font-black uppercase tracking-wider">{t('dashboardPages.media.totalMedia')}</span>
            <Layers className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{summary.total}</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
            <span className="text-xs font-black uppercase tracking-wider">{t('dashboardPages.media.productImages')}</span>
            <Package className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{summary.products}</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
            <span className="text-xs font-black uppercase tracking-wider">{t('dashboardPages.media.uncategorized')}</span>
            <Folder className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{summary.uncategorized}</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
            <span className="text-xs font-black uppercase tracking-wider">{t('dashboardPages.media.storageUsed')}</span>
            <HardDrive className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{formatBytes(summary.storage_used)}</p>
        </div>
      </div>

      {/* Folder Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
        {folderTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFolder === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFolder(tab.id)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-slate-900 dark:text-gray-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('dashboardPages.media.searchPlaceholder')}
            className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-xs font-semibold text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Sorting */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-800 dark:bg-slate-900">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-gray-700 outline-none dark:text-gray-300"
            >
              <option value="date_desc">{t('dashboardPages.media.sortNewest')}</option>
              <option value="date_asc">{t('dashboardPages.media.sortOldest')}</option>
              <option value="name_asc">{t('dashboardPages.media.sortNameAsc')}</option>
              <option value="name_desc">{t('dashboardPages.media.sortNameDesc')}</option>
              <option value="size_desc">{t('dashboardPages.media.sortSizeDesc')}</option>
              <option value="size_asc">{t('dashboardPages.media.sortSizeAsc')}</option>
            </select>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center rounded-2xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-xl p-1.5 transition ${viewMode === 'grid' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'text-gray-400 hover:text-gray-700'}`}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`rounded-xl p-1.5 transition ${viewMode === 'table' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'text-gray-400 hover:text-gray-700'}`}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Media Items Display */}
      {loading ? (
        <div className="flex items-center justify-center rounded-[2rem] border border-gray-100 bg-white py-20 shadow-sm dark:border-gray-800 dark:bg-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-gray-200 bg-white px-6 py-20 text-center dark:border-gray-800 dark:bg-slate-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <ImageIcon className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">{t('dashboardPages.media.noMedia')}</h3>
          <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">{t('dashboardPages.media.dragDropSubtitle')}</p>
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500">
            <UploadCloud className="h-4 w-4" />
            <span>{t('dashboardPages.media.uploadImage')}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void processUpload(file, activeFolder !== 'all' ? activeFolder : 'uncategorized');
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <div
              key={item.key || item.url}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-950/10 dark:border-gray-800 dark:bg-slate-900"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-slate-800">
                <img
                  src={item.url ? getResizedImageUrl(item.url, 'medium') : ''}
                  alt={item.filename}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Folder Badge Pill */}
                <div className="absolute left-2.5 top-2.5 z-10">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm ${
                      item.folder === 'products'
                        ? 'bg-emerald-600/90 text-white'
                        : item.folder === 'branding'
                        ? 'bg-purple-600/90 text-white'
                        : 'bg-slate-900/80 text-amber-300'
                    }`}
                  >
                    {item.folder === 'products' ? (
                      <Package className="h-2.5 w-2.5" />
                    ) : item.folder === 'branding' ? (
                      <Palette className="h-2.5 w-2.5" />
                    ) : (
                      <Folder className="h-2.5 w-2.5" />
                    )}
                    {item.folder === 'products'
                      ? 'Produit'
                      : item.folder === 'branding'
                      ? 'Branding'
                      : 'Non classé'}
                  </span>
                </div>

                {/* Quick Action Overlay on Hover */}
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-slate-950/70 p-2 opacity-0 backdrop-blur-xs transition-opacity duration-200 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewItem(item);
                      setZoomLevel(1);
                    }}
                    title={t('dashboardPages.media.zoom')}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white transition hover:bg-white hover:text-slate-900"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOptimizingItem(item);
                      setOptResult(null);
                    }}
                    title={t('dashboardPages.media.optimize')}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white transition hover:bg-emerald-500 hover:text-slate-900"
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRenamingItem(item);
                      setNewFilename(item.filename);
                    }}
                    title={t('dashboardPages.media.rename')}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white transition hover:bg-white hover:text-slate-900"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => void copyUrl(item.url)}
                    title={t('dashboardPages.media.copy')}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white transition hover:bg-white hover:text-slate-900"
                  >
                    {copiedUrl === item.url ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingItem(item)}
                    title={t('dashboardPages.media.delete')}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white transition hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Footer Information */}
              <div className="flex flex-1 flex-col justify-between p-3">
                <div>
                  <p className="truncate text-xs font-bold text-gray-900 dark:text-white" title={item.filename}>
                    {item.filename}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                    <span>{item.dimensions || (item.size > 0 ? formatBytes(item.size) : 'Image')}</span>
                    {item.size > 0 && <span>{formatBytes(item.size)}</span>}
                  </div>
                </div>

                {/* Linked Product Link */}
                {item.product_title && item.product_id && (
                  <div className="mt-2.5 border-t border-gray-100 pt-2 dark:border-gray-800">
                    <Link
                      href={`/hub/dashboard/products/${item.product_id}`}
                      className="flex items-center gap-1 truncate text-[10px] font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                      title={item.product_title}
                    >
                      <LinkIcon className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{item.product_title}</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:border-gray-800 dark:bg-slate-800/50 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Aperçu</th>
                  <th className="px-4 py-3">{t('dashboardPages.media.name')}</th>
                  <th className="px-4 py-3">Dossier</th>
                  <th className="px-4 py-3">{t('dashboardPages.media.dimensions')}</th>
                  <th className="px-4 py-3">{t('dashboardPages.media.size')}</th>
                  <th className="px-4 py-3">{t('dashboardPages.media.date')}</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item) => (
                  <tr key={item.key || item.url} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewItem(item);
                          setZoomLevel(1);
                        }}
                        className="relative block h-10 w-10 overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800"
                      >
                        <img
                          src={item.url ? getResizedImageUrl(item.url, 'small') : ''}
                          alt={item.filename}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-white">
                      <p className="max-w-xs truncate">{item.filename}</p>
                      {item.product_title && item.product_id && (
                        <Link
                          href={`/hub/dashboard/products/${item.product_id}`}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          <LinkIcon className="h-2.5 w-2.5" />
                          {item.product_title}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700 dark:bg-slate-800 dark:text-gray-300">
                        {item.folder === 'products'
                          ? 'Produits'
                          : item.folder === 'branding'
                          ? 'Branding'
                          : 'Non classé'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{item.dimensions || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{formatBytes(item.size)}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{formatDate(item.created_at, dateLocale)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewItem(item);
                            setZoomLevel(1);
                          }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-white"
                          title={t('dashboardPages.media.zoom')}
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOptimizingItem(item);
                            setOptResult(null);
                          }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:text-emerald-400"
                          title={t('dashboardPages.media.optimize')}
                        >
                          <Zap className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingItem(item);
                            setNewFilename(item.filename);
                          }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-white"
                          title={t('dashboardPages.media.rename')}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyUrl(item.url)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-white"
                          title={t('dashboardPages.media.copy')}
                        >
                          {copiedUrl === item.url ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(item)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                          title={t('dashboardPages.media.delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1. ZOOM / LIGHTBOX PREVIEW MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">{previewItem.filename}</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{previewItem.dimensions || formatBytes(previewItem.size)}</p>
                </div>
              </div>

              {/* Zoom Controls & Close */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    className="rounded-lg p-1 text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-[10px] font-black">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                    className="rounded-lg p-1 text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="rounded-lg p-1 text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content & Sidebar */}
            <div className="grid flex-1 gap-0 overflow-y-auto lg:grid-cols-[1fr_320px]">
              {/* Viewer */}
              <div className="flex min-h-[420px] items-center justify-center overflow-auto bg-slate-950 p-6">
                <div
                  style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease' }}
                  className="flex items-center justify-center"
                >
                  <img
                    src={previewItem.url ? getResizedImageUrl(previewItem.url, 'large') : ''}
                    alt={previewItem.filename}
                    className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-2xl"
                  />
                </div>
              </div>

              {/* Sidebar Details */}
              <div className="flex flex-col justify-between border-t border-gray-100 bg-gray-50/50 p-6 dark:border-gray-800 dark:bg-slate-900 lg:border-l lg:border-t-0">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t('dashboardPages.media.name')}</span>
                    <p className="mt-1 break-words text-xs font-bold text-gray-900 dark:text-white">{previewItem.filename}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t('dashboardPages.media.dimensions')}</span>
                    <p className="mt-1 text-xs font-bold text-gray-900 dark:text-white">{previewItem.dimensions || '—'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t('dashboardPages.media.size')}</span>
                    <p className="mt-1 text-xs font-bold text-gray-900 dark:text-white">{formatBytes(previewItem.size)}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Dossier</span>
                    <p className="mt-1 text-xs font-bold text-gray-900 dark:text-white">
                      {previewItem.folder === 'products'
                        ? 'Images Produits'
                        : previewItem.folder === 'branding'
                        ? 'Branding & Boutique'
                        : 'Non catégorisé'}
                    </p>
                  </div>

                  {previewItem.product_title && previewItem.product_id && (
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t('dashboardPages.media.productLinked')}</span>
                      <Link
                        href={`/hub/dashboard/products/${previewItem.product_id}`}
                        className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        <Package className="h-3.5 w-3.5" />
                        <span>{previewItem.product_title}</span>
                      </Link>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t('dashboardPages.media.url')}</span>
                    <div className="mt-1 rounded-xl bg-white p-2.5 text-[11px] font-semibold text-gray-600 break-all dark:bg-slate-800 dark:text-gray-300">
                      {previewItem.url}
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <button
                    type="button"
                    onClick={() => void copyUrl(previewItem.url)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
                  >
                    <Copy className="h-4 w-4" />
                    <span>{t('dashboardPages.media.copyMediaUrl')}</span>
                  </button>

                  <a
                    href={previewItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>{t('dashboardPages.media.openOriginal')}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. OPTIMIZATION MODAL */}
      {optimizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Zap className="h-4 w-4" />
                </div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">{t('dashboardPages.media.optimizeModalTitle')}</h3>
              </div>
              <button type="button" onClick={() => setOptimizingItem(null)} className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-3.5 dark:bg-slate-800">
                <img
                  src={optimizingItem.url ? getResizedImageUrl(optimizingItem.url, 'small') : ''}
                  alt={optimizingItem.filename}
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <div>
                  <p className="truncate text-xs font-bold text-gray-900 dark:text-white">{optimizingItem.filename}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{formatBytes(optimizingItem.size)} • {optimizingItem.dimensions || 'Image'}</p>
                </div>
              </div>

              {/* Quality Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                  <span>{t('dashboardPages.media.quality')}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{optQuality}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={optQuality}
                  onChange={(e) => setOptQuality(parseInt(e.target.value, 10))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-emerald-600 dark:bg-slate-700"
                />
              </div>

              {/* Max Width */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('dashboardPages.media.maxWidth')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[800, 1200, 1600, 2400].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setOptMaxWidth(w)}
                      className={`rounded-xl py-2 text-xs font-bold transition ${
                        optMaxWidth === w
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300'
                      }`}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Format */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('dashboardPages.media.format')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['webp', 'jpeg', 'png', 'original'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setOptFormat(fmt)}
                      className={`rounded-xl py-2 text-xs font-bold uppercase transition ${
                        optFormat === fmt
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optimization Result Feedback */}
              {optResult && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t('dashboardPages.media.optimizeSuccess')}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <span>{formatBytes(optResult.original_size)} → {formatBytes(optResult.new_size)}</span>
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white">-{optResult.saved_percentage}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOptimizingItem(null)}
                className="rounded-2xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
              >
                {t('dashboardPages.media.cancel')}
              </button>

              <button
                type="button"
                disabled={optimizing}
                onClick={() => void handleSaveOptimize()}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                <span>{optimizing ? t('dashboardPages.media.optimizing') : t('dashboardPages.media.optimize')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. RENAME MODAL */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300">
                  <Edit3 className="h-4 w-4" />
                </div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">{t('dashboardPages.media.renameModalTitle')}</h3>
              </div>
              <button type="button" onClick={() => setRenamingItem(null)} className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('dashboardPages.media.newFilename')}</label>
                <input
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  placeholder="photo-nom.jpg"
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs font-semibold text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRenamingItem(null)}
                className="rounded-2xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
              >
                {t('dashboardPages.media.cancel')}
              </button>

              <button
                type="button"
                disabled={savingRename || !newFilename.trim()}
                onClick={() => void handleSaveRename()}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {savingRename ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>{t('dashboardPages.media.save')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DELETE CONFIRMATION MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
              <Trash2 className="h-6 w-6" />
            </div>

            <h3 className="mt-4 text-base font-black text-gray-900 dark:text-white">{t('dashboardPages.media.deleteConfirm')}</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('dashboardPages.media.deleteWarning')}</p>

            <div className="mt-4 rounded-2xl bg-gray-50 p-3 text-xs font-bold text-gray-800 dark:bg-slate-800 dark:text-gray-200">
              {deletingItem.filename}
            </div>

            {deletingItem.product_title && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Cette image est associée au produit: <strong>{deletingItem.product_title}</strong></span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="rounded-2xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
              >
                {t('dashboardPages.media.cancel')}
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-red-600/20 transition hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>{t('dashboardPages.media.delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
