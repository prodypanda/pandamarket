'use client';

import React, { useState } from 'react';
import {
  FolderOpen,
  Folder,
  Upload,
  Search,
  Grid,
  List,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Sliders,
  Edit3,
  ExternalLink,
  Eye,
  Loader2,
  HardDrive,
  FileImage,
  Tags,
  Palette,
  LayoutTemplate,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface MediaItem {
  key: string;
  url: string;
  filename: string;
  folder: 'categories' | 'branding' | 'banners' | 'general';
  content_type: string;
  size: number;
  width?: number | null;
  height?: number | null;
  dimensions?: string | null;
  created_at: string;
}

export interface SummaryCounts {
  total: number;
  categories: number;
  branding: number;
  banners: number;
  general: number;
}

export interface AdminReGoMediaProps {
  items: MediaItem[];
  summary: SummaryCounts;
  loading: boolean;
  activeFolder: string;
  onActiveFolderChange: (folder: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
  sortBy: 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc';
  onSortByChange: (sort: 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc') => void;
  onOpenUpload: () => void;
  onSingleOptimize: (item: MediaItem) => void;
  onBulkOptimize: () => void;
  onRegenerateVariants: () => void;
  onOpenRename: (item: MediaItem) => void;
  onDelete: (key: string) => Promise<void>;
  onCopyUrl: (url: string, key: string) => void;
  copiedKey: string | null;
  deletingKey: string | null;
  bulkOptimizing: boolean;
  regeneratingVariants: boolean;
  error: string;
  success: string;
  onRefresh: () => Promise<void>;
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function AdminReGoMedia({
  items,
  summary,
  loading,
  activeFolder,
  onActiveFolderChange,
  searchQuery,
  onSearchQueryChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  onOpenUpload,
  onSingleOptimize,
  onBulkOptimize,
  onRegenerateVariants,
  onOpenRename,
  onDelete,
  onCopyUrl,
  copiedKey,
  deletingKey,
  bulkOptimizing,
  regeneratingVariants,
  error,
  success,
  onRefresh,
}: AdminReGoMediaProps) {
  const [inspectedItem, setInspectedItem] = useState<MediaItem | null>(null);

  const folders = [
    { key: 'all', label: 'Tous', icon: FolderOpen, count: summary.total },
    { key: 'categories', label: 'Catégories', icon: Tags, count: summary.categories },
    { key: 'branding', label: 'Identité / Logos', icon: Palette, count: summary.branding },
    { key: 'banners', label: 'Bannières SERP', icon: LayoutTemplate, count: summary.banners },
    { key: 'general', label: 'Général', icon: Folder, count: summary.general },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[var(--rego-fg,#111111)]">
                Stockage Médias CDN & Coffre-Fort Fichiers
              </h1>
              <ReGoStatusChip
                status="neutral"
                label={`${summary.total} fichiers`}
                size="xs"
              />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Supervision de l'infrastructure média cloud · Compression WebP, bande passante CDN et variantes d'affichage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>

          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[var(--rego-accent-dark,#880404)] transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Téléverser un média</span>
          </button>
        </div>
      </div>

      {/* 2. Feedback alerts */}
      {error && (
        <div className="rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-[var(--rego-r,8px)] border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* 3. Telemetry KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ReGoKpiHero
          label="Total Bibliothèque"
          value={summary.total}
          hint="Fichiers indexés sur le CDN"
          accent
          icon={HardDrive}
        />
        <ReGoKpiHero
          label="Visuels Catégories"
          value={summary.categories}
          hint="Vignettes & icônes rayons"
          icon={Tags}
        />
        <ReGoKpiHero
          label="Bannières & SERP"
          value={summary.banners}
          hint="Bannières vitrines & accueil"
          icon={LayoutTemplate}
        />
        <ReGoKpiHero
          label="Logos & Branding"
          value={summary.branding}
          hint="Actifs officiels PandaMarket"
          icon={Palette}
        />
      </div>

      {/* 4. Filter Toolbar */}
      <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-3.5 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Folder Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {folders.map((f) => {
              const Icon = f.icon;
              const isActive = activeFolder === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => onActiveFolderChange(f.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)] border border-[var(--rego-accent,#ad0505)]/30'
                      : 'border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{f.label}</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-black/5 font-mono">
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Tools: Search, View Mode, Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Rechercher fichier..."
                className="pl-9 pr-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-fg,#111111)] placeholder:text-[var(--rego-ink-3,#949494)] focus:border-[var(--rego-accent,#ad0505)] outline-none"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-[var(--rego-fg,#111111)] focus:border-[var(--rego-accent,#ad0505)] outline-none cursor-pointer"
            >
              <option value="date_desc">Plus récents</option>
              <option value="date_asc">Plus anciens</option>
              <option value="name_asc">Nom (A-Z)</option>
              <option value="name_desc">Nom (Z-A)</option>
            </select>

            <div className="flex items-center rounded-[var(--rego-r,6px)] border border-[var(--rego-border,#dedede)] bg-white p-0.5">
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                className={`p-1.5 rounded text-xs cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('table')}
                className={`p-1.5 rounded text-xs cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onBulkOptimize}
              disabled={bulkOptimizing}
              title="Compresser tous les visuels du dossier actuel en WebP"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              {bulkOptimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sliders className="w-3 h-3 text-amber-600" />}
              <span>Optimiser dossier</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Main Media Surface */}
      <ReGoCard noPadding>
        {loading ? (
          <div className="p-12 text-center text-[var(--rego-ink-2,#737373)]">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-[var(--rego-accent,#ad0505)]" />
            <p className="text-xs font-bold mt-2">Chargement de la bibliothèque CDN...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-[var(--rego-ink-2,#737373)] space-y-2">
            <FileImage className="w-10 h-10 mx-auto text-[var(--rego-ink-3,#949494)]" />
            <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
              Aucun fichier média trouvé
            </h3>
            <p className="text-xs text-[var(--rego-ink-2,#737373)]">
              Glissez des images directement sur la page ou cliquez sur "Téléverser un média" pour alimenter le CDN.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {items.map((item) => {
              const isDeleting = deletingKey === item.key;
              const isCopied = copiedKey === item.key;

              return (
                <div
                  key={item.key}
                  className="group rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white overflow-hidden shadow-2xs hover:border-[var(--rego-accent,#ad0505)]/50 transition-all flex flex-col justify-between"
                >
                  <div
                    onClick={() => setInspectedItem(item)}
                    className="relative aspect-square bg-[var(--rego-surface,#f5f5f5)] cursor-pointer overflow-hidden flex items-center justify-center"
                  >
                    <img
                      src={item.url}
                      alt={item.filename}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />

                    <div className="absolute top-1.5 left-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur">
                        {item.folder}
                      </span>
                    </div>

                    <div className="absolute bottom-1.5 right-1.5">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur">
                        {formatBytes(item.size)}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 border-t border-[var(--rego-border,#dedede)]/70 bg-white">
                    <p className="text-[11px] font-bold text-[var(--rego-fg,#111111)] truncate" title={item.filename}>
                      {item.filename}
                    </p>

                    <div className="mt-2 pt-1 border-t border-[var(--rego-border,#dedede)]/50 flex items-center justify-between text-slate-400">
                      <button
                        type="button"
                        onClick={() => onCopyUrl(item.url, item.key)}
                        title="Copier le lien public CDN"
                        className="p-1 hover:text-slate-800 cursor-pointer"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenRename(item)}
                        title="Renommer le fichier"
                        className="p-1 hover:text-amber-600 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onSingleOptimize(item)}
                        title="Compresser en WebP"
                        className="p-1 hover:text-blue-600 cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void onDelete(item.key)}
                        disabled={isDeleting}
                        title="Supprimer"
                        className="p-1 hover:text-rose-600 cursor-pointer"
                      >
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--rego-border,#dedede)] text-[11px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                  <th className="px-3 py-2.5">Aperçu</th>
                  <th className="px-3 py-2.5">Nom de fichier</th>
                  <th className="px-3 py-2.5">Dossier</th>
                  <th className="px-3 py-2.5">Type MIME</th>
                  <th className="px-3 py-2.5">Taille</th>
                  <th className="px-3 py-2.5">Date d'Ajout</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                {items.map((item) => (
                  <tr key={item.key} className="hover:bg-[var(--rego-surface,#f5f5f5)]/50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="w-10 h-10 rounded-[var(--rego-r,6px)] border border-[var(--rego-border,#dedede)] overflow-hidden bg-slate-50 flex items-center justify-center">
                        <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-[var(--rego-fg,#111111)]">
                      {item.filename}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {item.folder}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-[var(--rego-ink-2,#737373)]">
                      {item.content_type}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono font-bold text-[var(--rego-fg,#111111)]">
                      {formatBytes(item.size)}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--rego-ink-2,#737373)]">
                      {new Date(item.created_at).toLocaleDateString('fr-TN')}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onCopyUrl(item.url, item.key)}
                          className="p-1 rounded text-slate-400 hover:text-slate-800"
                          title="Copier URL"
                        >
                          {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectedItem(item)}
                          className="p-1 rounded text-slate-400 hover:text-slate-800"
                          title="Inspecter"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete(item.key)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
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
        )}
      </ReGoCard>

      {/* 6. Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(inspectedItem)}
        onClose={() => setInspectedItem(null)}
        title={inspectedItem?.filename || 'Détails du média'}
        subtitle={`Dossier : ${inspectedItem?.folder || ''}`}
        width="max-w-xl"
      >
        {inspectedItem && (
          <div className="space-y-4 text-xs">
            <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] overflow-hidden bg-slate-900/5 max-h-72 flex items-center justify-center p-2">
              <img
                src={inspectedItem.url}
                alt={inspectedItem.filename}
                className="max-h-68 w-auto object-contain rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2.5 rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                <span className="text-[10px] uppercase text-[var(--rego-ink-3,#949494)] block">Taille</span>
                <span className="font-bold text-[var(--rego-fg,#111111)]">{formatBytes(inspectedItem.size)}</span>
              </div>
              <div className="p-2.5 rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                <span className="text-[10px] uppercase text-[var(--rego-ink-3,#949494)] block">Format</span>
                <span className="font-bold text-[var(--rego-fg,#111111)]">{inspectedItem.content_type}</span>
              </div>
            </div>

            <div className="p-2.5 rounded border border-[var(--rego-border,#dedede)] bg-white space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-3,#949494)] block">
                Clé S3 / CDN
              </span>
              <p className="font-mono text-[11px] text-[var(--rego-fg,#111111)] break-all select-all">
                {inspectedItem.key}
              </p>
            </div>

            <div className="p-2.5 rounded border border-[var(--rego-border,#dedede)] bg-white space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-3,#949494)] block">
                URL Publique Directe
              </span>
              <p className="font-mono text-[11px] text-[var(--rego-accent,#ad0505)] break-all select-all">
                {inspectedItem.url}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onCopyUrl(inspectedItem.url, inspectedItem.key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-slate-900 text-white font-bold cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copier URL</span>
              </button>

              <a
                href={inspectedItem.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)] font-bold hover:bg-[var(--rego-surface,#f5f5f5)]"
              >
                <span>Ouvrir en plein écran</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
