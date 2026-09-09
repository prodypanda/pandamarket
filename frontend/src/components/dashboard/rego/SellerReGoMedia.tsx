'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  ImageIcon,
  UploadCloud,
  Search,
  Check,
  Copy,
  ExternalLink,
  Trash2,
  Edit3,
  Zap,
  RotateCcw,
  Maximize2,
  Layers,
  Package,
  Palette,
  Folder,
  Grid,
  List,
  ArrowUpDown,
  ZoomIn,
  ZoomOut,
  Info,
  AlertTriangle,
  HardDrive,
  CheckCircle2,
  X,
  Upload,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { DashboardPageWrapper } from '@/components/dashboard/DashboardPageWrapper';
import { getResizedImageUrl } from '@/lib/image-url';
import { useLocale } from '@/contexts/LocaleContext';

export interface MediaItem {
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

export interface SummaryCounts {
  total: number;
  products: number;
  branding: number;
  uncategorized: number;
  general: number;
  storage_used: number;
}

export interface SellerReGoMediaProps {
  items: MediaItem[];
  summary: SummaryCounts;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onUploadFiles: (files: FileList | File[]) => Promise<void>;
  onRename: (item: MediaItem, newName: string) => Promise<void>;
  onDelete: (item: MediaItem) => Promise<void>;
  onOptimize?: (item: MediaItem, options: { quality: number; maxWidth: number; format: string }) => Promise<void>;
  uploading: boolean;
  uploadProgress: string;
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

export function SellerReGoMedia({
  items,
  summary,
  loading,
  onRefresh,
  onUploadFiles,
  onRename,
  onDelete,
  onOptimize,
  uploading,
  uploadProgress,
}: SellerReGoMediaProps) {
  const { t, locale } = useLocale();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter & Search state
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc'>('date_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Inspection Drawer & Action State
  const [inspectedItem, setInspectedItem] = useState<MediaItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MediaItem | null>(null);
  const [renamingItem, setRenamingItem] = useState<MediaItem | null>(null);
  const [newFilename, setNewFilename] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Optimize state inside drawer
  const [optQuality, setOptQuality] = useState(80);
  const [optMaxWidth, setOptMaxWidth] = useState(1600);
  const [optFormat, setOptFormat] = useState('webp');
  const [optimizing, setOptimizing] = useState(false);

  // Storage calculation (2GB limit = 2 * 1024 * 1024 * 1024)
  const maxStorage = 2 * 1024 * 1024 * 1024;
  const storagePercentage = Math.min(100, Math.round((summary.storage_used / maxStorage) * 100));

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let list = items;
    if (activeFolder !== 'all') {
      list = list.filter((i) => i.folder === activeFolder);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.filename.toLowerCase().includes(q) ||
          (i.product_title && i.product_title.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'name_asc') return a.filename.localeCompare(b.filename);
      if (sortBy === 'name_desc') return b.filename.localeCompare(a.filename);
      if (sortBy === 'size_desc') return b.size - a.size;
      if (sortBy === 'size_asc') return a.size - b.size;
      return 0;
    });
  }, [items, activeFolder, search, sortBy]);

  const copyUrl = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleRenameSubmit = async () => {
    if (!renamingItem || !newFilename.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      await onRename(renamingItem, newFilename.trim());
      setRenamingItem(null);
      setNewFilename('');
    } catch (err: any) {
      setActionError(err?.message || 'Erreur lors du renommage');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingItem) return;
    setActionLoading(true);
    setActionError('');
    try {
      await onDelete(deletingItem);
      if (inspectedItem?.key === deletingItem.key) {
        setInspectedItem(null);
      }
      setDeletingItem(null);
    } catch (err: any) {
      setActionError(err?.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOptimizeSubmit = async () => {
    if (!inspectedItem || !onOptimize) return;
    setOptimizing(true);
    setActionError('');
    try {
      await onOptimize(inspectedItem, {
        quality: optQuality,
        maxWidth: optMaxWidth,
        format: optFormat,
      });
      await onRefresh();
    } catch (err: any) {
      setActionError(err?.message || "Erreur lors de l'optimisation");
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Catalogue', href: '/hub/dashboard/products' },
        { label: 'Médiathèque Marchand' },
      ]}
      headerTitle="Médiathèque de la Boutique"
      headerSubtitle="Stockez, classez et réutilisez l'ensemble de vos photos de produits, bannières promotionnelles et logos."
      headerIcon={ImageIcon}
      statusBadge={
        <ReGoStatusChip
          status={items.length > 0 ? 'ok' : 'neutral'}
          label={`${summary.total} médias répertoriés`}
          size="sm"
        />
      }
      secondaryAction={
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
          <span>Actualiser</span>
        </button>
      }
      primaryAction={
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                void onUploadFiles(e.target.files);
              }
            }}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3.5 py-2 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? uploadProgress || 'Téléversement...' : '+ Téléverser des Médias'}</span>
          </button>
        </div>
      }
      alertBanner={
        storagePercentage > 85 ? (
          <div className="rounded-[var(--rego-r,8px)] border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0" />
              <p className="text-xs text-rose-900 dark:text-rose-300 font-medium">
                <strong>Attention : Quota de stockage saturé à {storagePercentage}%.</strong> Pensez à optimiser vos photos en format WebP ou à supprimer les médias obsolètes.
              </p>
            </div>
          </div>
        ) : null
      }
      kpiStrip={
        <>
          <ReGoKpiHero
            label="Total Fichiers Médias"
            value={summary.total}
            delta={`${summary.products} photos produits`}
            deltaType="neutral"
            hint="Vault images marchand"
            icon={ImageIcon}
            accent={summary.total > 0}
          />
          <ReGoKpiHero
            label="Photos de Produits"
            value={summary.products}
            hint="Liées au catalogue"
            icon={Package}
          />
          <ReGoKpiHero
            label="Visuels & Bannières"
            value={summary.branding}
            hint="Thème & communication"
            icon={Palette}
          />
          <ReGoKpiHero
            label="Espace Stockage Utilisé"
            value={formatBytes(summary.storage_used)}
            delta={`${storagePercentage}%`}
            deltaLabel="du quota 2.0 GB"
            deltaType={storagePercentage > 80 ? 'decrease' : 'neutral'}
            hint={`Capacité max : 2,048 MB`}
            icon={HardDrive}
          />
        </>
      }
      filterToolbar={
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom de fichier ou titre produit..."
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Folder Filters */}
            <div className="flex items-center gap-1">
              {[
                { id: 'all', label: `Tous (${summary.total})` },
                { id: 'products', label: `Produits (${summary.products})` },
                { id: 'branding', label: `Bannières (${summary.branding})` },
                { id: 'uncategorized', label: `Autres (${summary.uncategorized})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFolder(f.id)}
                  className={`px-2.5 py-1 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all cursor-pointer ${
                    activeFolder === f.id
                      ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                      : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-border,#dedede)]/40'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort select */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-2.5 py-1 text-xs font-medium rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none"
            >
              <option value="date_desc">Plus récents</option>
              <option value="date_asc">Plus anciens</option>
              <option value="name_asc">Nom (A-Z)</option>
              <option value="name_desc">Nom (Z-A)</option>
              <option value="size_desc">Plus lourds</option>
              <option value="size_asc">Plus légers</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                    : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                }`}
                title="Vue Grille"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                    : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                }`}
                title="Vue Tableau"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      }
      mainContent={
        filteredItems.length === 0 ? (
          <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-12 text-center shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-[var(--rego-surface,#f5f5f5)] flex items-center justify-center mx-auto text-[var(--rego-accent,#ad0505)]">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
              {search ? 'Aucun média correspondant' : 'Médiathèque vide'}
            </h3>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto">
              Téléversez vos photographies haute résolution pour vos fiches articles et vos bannières de boutique.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Téléverser mon premier média</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid Vault View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
            {filteredItems.map((item) => (
              <div
                key={item.key}
                className="group rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] overflow-hidden shadow-2xs hover:border-[var(--rego-accent,#ad0505)] transition-all flex flex-col justify-between"
              >
                <div
                  className="relative aspect-square bg-[var(--rego-surface,#f5f5f5)] overflow-hidden cursor-pointer"
                  onClick={() => setInspectedItem(item)}
                >
                  <img
                    src={getResizedImageUrl(item.url, 'medium')}
                    alt={item.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectedItem(item);
                      }}
                      className="p-1.5 rounded-full bg-white text-slate-900 hover:bg-slate-100 shadow-xs"
                      title="Inspecter"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void copyUrl(item.url, item.key);
                      }}
                      className="p-1.5 rounded-full bg-white text-slate-900 hover:bg-slate-100 shadow-xs"
                      title="Copier URL"
                    >
                      {copiedKey === item.key ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-2.5 space-y-1">
                  <p
                    className="text-xs font-bold text-[var(--rego-fg,#111111)] truncate cursor-pointer hover:text-[var(--rego-accent,#ad0505)]"
                    onClick={() => setInspectedItem(item)}
                    title={item.filename}
                  >
                    {item.filename}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-[var(--rego-ink-2,#737373)] font-mono">
                    <span>{formatBytes(item.size)}</span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>

                  {item.product_title && (
                    <span className="block text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded truncate">
                      {item.product_title}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3 w-16">Vignette</th>
                  <th className="p-3">Nom du Fichier</th>
                  <th className="p-3">Dossier</th>
                  <th className="p-3">Poids</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                {filteredItems.map((item) => (
                  <tr key={item.key} className="hover:bg-[var(--rego-surface,#f5f5f5)]/50 transition-colors">
                    <td className="p-2.5">
                      <div
                        className="w-10 h-10 rounded-[var(--rego-r,8px)] overflow-hidden bg-[var(--rego-surface,#f5f5f5)] cursor-pointer"
                        onClick={() => setInspectedItem(item)}
                      >
                        <img
                          src={getResizedImageUrl(item.url, 'small')}
                          alt={item.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="p-3 font-bold text-[var(--rego-fg,#111111)]">
                      <div className="max-w-xs truncate cursor-pointer hover:text-[var(--rego-accent,#ad0505)]" onClick={() => setInspectedItem(item)}>
                        {item.filename}
                      </div>
                      {item.product_title && (
                        <div className="text-[10px] text-emerald-700 font-normal">
                          Produit : {item.product_title}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] bg-[var(--rego-surface,#f5f5f5)] px-2 py-0.5 rounded">
                        {item.folder}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[var(--rego-ink-2,#737373)]">
                      {formatBytes(item.size)}
                    </td>
                    <td className="p-3 text-[var(--rego-ink-2,#737373)]">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void copyUrl(item.url, item.key)}
                          className="p-1 rounded text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                          title="Copier l'URL"
                        >
                          {copiedKey === item.key ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectedItem(item)}
                          className="p-1 rounded text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                          title="Inspecter"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingItem(item);
                            setNewFilename(item.filename);
                          }}
                          className="p-1 rounded text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                          title="Renommer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(item)}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      drawer={
        <ReGoDrawer
          isOpen={inspectedItem !== null}
          onClose={() => setInspectedItem(null)}
          title="Inspection du Média"
          subtitle={inspectedItem?.filename}
          width="max-w-xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setDeletingItem(inspectedItem)}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer ce média</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="px-3.5 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
              >
                Fermer
              </button>
            </div>
          }
        >
          {inspectedItem && (
            <div className="space-y-4">
              {/* Image Preview Box */}
              <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/60 p-2 flex items-center justify-center min-h-[220px]">
                <img
                  src={inspectedItem.url}
                  alt={inspectedItem.filename}
                  className="max-h-72 object-contain rounded"
                />
              </div>

              {/* Metadata Card */}
              <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)] font-bold uppercase text-[10px]">Taille du fichier :</span>
                  <span className="font-mono font-bold">{formatBytes(inspectedItem.size)}</span>
                </div>
                {inspectedItem.dimensions && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--rego-ink-2,#737373)] font-bold uppercase text-[10px]">Dimensions :</span>
                    <span className="font-mono">{inspectedItem.dimensions}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)] font-bold uppercase text-[10px]">Format MIME :</span>
                  <span className="font-mono">{inspectedItem.content_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)] font-bold uppercase text-[10px]">Date d'ajout :</span>
                  <span>{formatDate(inspectedItem.created_at)}</span>
                </div>
              </div>

              {/* URL CDN Box */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  URL Publique du Fichier
                </label>
                <div className="flex rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] font-mono text-xs overflow-hidden">
                  <input
                    type="text"
                    readOnly
                    value={inspectedItem.url}
                    className="flex-1 px-3 py-2 bg-transparent text-[var(--rego-fg,#111111)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void copyUrl(inspectedItem.url, inspectedItem.key)}
                    className="px-3 py-2 bg-[var(--rego-bg,#ffffff)] border-l border-[var(--rego-border,#dedede)] hover:bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] font-bold flex items-center gap-1 text-xs"
                  >
                    {copiedKey === inspectedItem.key ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* WebP Optimizer Deck */}
              {onOptimize && (
                <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 p-3.5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                      Optimisation de l'Image (Compression WebP)
                    </h4>
                  </div>
                  <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                    Compressez cette image pour réduire le temps de chargement sur mobile et économiser votre quota de stockage.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--rego-ink-2,#737373)] uppercase block">
                        Qualité ({optQuality}%)
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        value={optQuality}
                        onChange={(e) => setOptQuality(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--rego-ink-2,#737373)] uppercase block">
                        Format Cible
                      </label>
                      <select
                        value={optFormat}
                        onChange={(e) => setOptFormat(e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                      >
                        <option value="webp">WebP (Recommandé)</option>
                        <option value="jpeg">JPEG</option>
                        <option value="png">PNG</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={optimizing}
                    onClick={handleOptimizeSubmit}
                    className="w-full rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] py-2 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{optimizing ? 'Compression en cours...' : 'Optimiser maintenant'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </ReGoDrawer>
      }
      modals={
        <>
          {/* Rename Modal */}
          <ReGoModal
            isOpen={renamingItem !== null}
            onClose={() => setRenamingItem(null)}
            title="Renommer le Média"
            subtitle="Modifiez le nom du fichier pour faciliter son classement."
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  Nouveau nom de fichier
                </label>
                <input
                  type="text"
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-2 text-xs font-medium text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingItem(null)}
                  className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleRenameSubmit}
                  className="rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] disabled:opacity-50"
                >
                  {actionLoading ? 'Enregistrement...' : 'Renommer'}
                </button>
              </div>
            </div>
          </ReGoModal>

          {/* Delete Confirmation Modal */}
          <ReGoModal
            isOpen={deletingItem !== null}
            onClose={() => setDeletingItem(null)}
            title="Supprimer définitivement ce média ?"
            subtitle="Cette action est irréversible."
          >
            <div className="space-y-4">
              <div className="rounded-[var(--rego-r,8px)] border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300">
                Êtes-vous certain de vouloir supprimer <strong>{deletingItem?.filename}</strong> ?
                {deletingItem?.product_title && (
                  <div className="mt-1 font-bold">
                    Ce média est actuellement associé au produit : {deletingItem.product_title}.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleDeleteSubmit}
                  className="rounded-[var(--rego-r,8px)] bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </ReGoModal>
        </>
      }
    />
  );
}
