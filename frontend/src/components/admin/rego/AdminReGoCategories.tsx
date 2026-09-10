'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Tags,
  FolderTree,
  Search,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Settings2,
  Trash2,
  Check,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ImagePlus,
  Layers,
  Sparkles,
  ExternalLink,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface Category {
  id: string;
  parent_id?: string | null;
  name: string;
  name_fr?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  slug: string;
  description?: string | null;
  description_fr?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  image_url?: string | null;
  icon?: string | null;
  banner_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  is_default: boolean;
  is_active: boolean;
  show_in_megamenu?: boolean;
  position: number;
  product_count: number;
  parent_name?: string | null;
  parent_slug?: string | null;
  children?: Category[];
}

export interface AdminReGoCategoriesProps {
  categories: Category[];
  categoryTree: Category[];
  loading: boolean;
  savingId: string | null;
  deletingId: string | null;
  error: string;
  success: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  typeFilter: 'all' | 'root' | 'sub';
  onTypeFilterChange: (filter: 'all' | 'root' | 'sub') => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusFilterChange: (filter: 'all' | 'active' | 'inactive') => void;
  collapsedParents: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onUpdateCategory: (category: Category, updates: Partial<Category>) => Promise<void>;
  onMovePosition: (category: Category, direction: 'up' | 'down') => Promise<void>;
  onRequestDelete: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onAddSubcategory: (parentId: string) => void;
  onOpenCreateModal: () => void;
  onRefresh: () => Promise<void>;
}

export function AdminReGoCategories({
  categories,
  categoryTree,
  loading,
  savingId,
  deletingId,
  error,
  success,
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  collapsedParents,
  onToggleCollapse,
  onExpandAll,
  onCollapseAll,
  onUpdateCategory,
  onMovePosition,
  onRequestDelete,
  onEditCategory,
  onAddSubcategory,
  onOpenCreateModal,
  onRefresh,
}: AdminReGoCategoriesProps) {
  const rootCount = categories.filter((c) => !c.parent_id).length;
  const subCount = categories.filter((c) => Boolean(c.parent_id)).length;
  const activeCount = categories.filter((c) => c.is_active).length;

  const renderTreeItem = (node: Category, depth = 0) => {
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isCollapsed = Boolean(collapsedParents[node.id]);
    const isActing = savingId === node.id || deletingId === node.id;

    // Filter check for children or self
    const matchesSearch = !searchQuery.trim() || (
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Boolean(node.name_fr && node.name_fr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      Boolean(node.name_ar && node.name_ar.toLowerCase().includes(searchQuery.toLowerCase())) ||
      node.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'root' && !node.parent_id) ||
      (typeFilter === 'sub' && Boolean(node.parent_id));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && node.is_active) ||
      (statusFilter === 'inactive' && !node.is_active);

    const isVisible = matchesSearch && matchesType && matchesStatus;

    return (
      <div key={node.id} className="space-y-1.5">
        {isVisible && (
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border p-3 transition-all ${
              depth === 0
                ? 'border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 shadow-2xs hover:border-[var(--rego-accent,#ad0505)]/40'
                : 'border-[var(--rego-border,#dedede)]/70 bg-[var(--rego-surface,#f5f5f5)]/40 hover:bg-[var(--rego-surface,#f5f5f5)]'
            }`}
            style={{ marginInlineStart: `${depth * 1.5}rem` }}
          >
            {/* Left info */}
            <div className="flex items-center gap-3">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggleCollapse(node.id)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
              ) : (
                <span className="w-4 text-center text-slate-300 font-mono text-xs">└──</span>
              )}

              <div className="w-8 h-8 rounded-[var(--rego-r,6px)] border border-[var(--rego-border,#dedede)] overflow-hidden bg-white dark:bg-slate-900 shrink-0 flex items-center justify-center">
                {node.image_url ? (
                  <img src={node.image_url} alt={node.name} className="w-full h-full object-cover" />
                ) : (
                  <Tags className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                    Niv. {depth + 1}
                  </span>
                  <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                    {node.name}
                  </h4>
                  {node.is_default && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200">
                      Défaut
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-[var(--rego-ink-2,#737373)]">
                    /{node.slug}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--rego-ink-2,#737373)]">
                  {node.name_fr && <span>🇫🇷 {node.name_fr}</span>}
                  {node.name_ar && <span>🇹🇳 {node.name_ar}</span>}
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    · {node.product_count || 0} article{(node.product_count || 0) > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Megamenu Visibility Button */}
              <button
                type="button"
                onClick={() => void onUpdateCategory(node, { show_in_megamenu: !node.show_in_megamenu })}
                disabled={isActing}
                title={node.show_in_megamenu ? 'Visible dans le MegaMenu' : 'Masqué du MegaMenu'}
                className={`p-1.5 rounded-[var(--rego-r,6px)] border transition-colors cursor-pointer ${
                  node.show_in_megamenu
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200'
                }`}
              >
                {node.show_in_megamenu ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>

              {/* Active Toggle Chip */}
              <button
                type="button"
                onClick={() => void onUpdateCategory(node, { is_active: !node.is_active })}
                disabled={node.is_default || isActing}
                className={`text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer ${
                  node.is_active
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {node.is_active ? 'Actif' : 'Inactif'}
              </button>

              {/* Position Reorder */}
              <div className="flex items-center rounded border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => void onMovePosition(node, 'up')}
                  disabled={isActing}
                  title="Monter"
                  className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => void onMovePosition(node, 'down')}
                  disabled={isActing}
                  title="Descendre"
                  className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>

              {/* Add Subcategory Button */}
              <button
                type="button"
                onClick={() => onAddSubcategory(node.id)}
                title="Ajouter une sous-catégorie rattachée"
                className="inline-flex items-center gap-1 rounded-[var(--rego-r,6px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[var(--rego-accent,#ad0505)]" />
                <span>+ Sous-rayon</span>
              </button>

              {/* Edit Button */}
              <button
                type="button"
                onClick={() => onEditCategory(node)}
                title="Modifier les détails de la catégorie"
                className="p-1.5 rounded-[var(--rego-r,6px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-[var(--rego-accent,#ad0505)] hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>

              {/* Delete Button */}
              {!node.is_default && (
                <button
                  type="button"
                  onClick={() => onRequestDelete(node)}
                  disabled={isActing}
                  title="Supprimer la catégorie"
                  className="p-1.5 rounded-[var(--rego-r,6px)] border border-rose-200 bg-white dark:bg-slate-900 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Children nodes */}
        {hasChildren && !isCollapsed && (
          <div className="space-y-1.5">
            {node.children!.map((child) => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[var(--rego-fg,#111111)]">
                Taxonomie des Catégories & Rayons Marketplace
              </h1>
              <ReGoStatusChip
                status="neutral"
                label={`${categories.length} catégories`}
                size="xs"
              />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Arborescence globale de la place de marché · Hiérarchie multilingue (FR, AR, EN) & affichage MegaMenu
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
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[var(--rego-accent-dark,#880404)] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle Catégorie Racine</span>
          </button>
        </div>
      </div>

      {/* 2. Feedback alerts */}
      {error && (
        <div className="rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-[var(--rego-r,8px)] border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* 3. Telemetry KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ReGoKpiHero
          label="Total Catégories"
          value={categories.length}
          hint="Arborescence complète"
          accent
          icon={Tags}
        />
        <ReGoKpiHero
          label="Catégories Racines"
          value={rootCount}
          hint="Rayons de 1er niveau"
          icon={FolderTree}
        />
        <ReGoKpiHero
          label="Sous-Catégories"
          value={subCount}
          hint="Déclinaisons rattachées"
          icon={Layers}
        />
        <ReGoKpiHero
          label="Catégories Actives"
          value={activeCount}
          hint="Visibles par les acheteurs"
          icon={CheckCircle2}
        />
      </div>

      {/* 4. Toolbar */}
      <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-3.5 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filtrer par nom ou slug..."
              className="w-full ps-9 pe-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] placeholder:text-[var(--rego-ink-3,#949494)] focus:border-[var(--rego-accent,#ad0505)] outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Type Filter */}
            <div className="flex items-center gap-1 p-0.5 rounded-[var(--rego-r,6px)] bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)]">
              {(
                [
                  { key: 'all', label: 'Toutes' },
                  { key: 'root', label: 'Racines' },
                  { key: 'sub', label: 'Sous-rayons' },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => onTypeFilterChange(f.key)}
                  className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                    typeFilter === f.key
                      ? 'bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] shadow-2xs'
                      : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Expand / Collapse All */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onExpandAll}
                className="px-2.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,6px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer"
              >
                Déplier tout
              </button>
              <button
                type="button"
                onClick={onCollapseAll}
                className="px-2.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,6px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer"
              >
                Replier tout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Hierarchical Tree Surface */}
      <ReGoCard
        title="Arborescence Hiérarchique"
        subtitle="Glisser-déposer ou utiliser les flèches pour réordonner les rayons"
        icon={FolderTree}
      >
        {loading ? (
          <div className="p-12 text-center text-[var(--rego-ink-2,#737373)]">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-[var(--rego-accent,#ad0505)]" />
            <p className="text-xs font-bold mt-2">Chargement de l&apos;arborescence...</p>
          </div>
        ) : categoryTree.length === 0 ? (
          <div className="p-12 text-center text-[var(--rego-ink-2,#737373)] space-y-2">
            <FolderTree className="w-10 h-10 mx-auto text-[var(--rego-ink-3,#949494)]" />
            <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
              Aucune catégorie trouvée
            </h3>
            <p className="text-xs text-[var(--rego-ink-2,#737373)]">
              Créez votre première catégorie racine pour amorcer la taxonomie de PandaMarket.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {categoryTree.map((root) => renderTreeItem(root, 0))}
          </div>
        )}
      </ReGoCard>
    </div>
  );
}
