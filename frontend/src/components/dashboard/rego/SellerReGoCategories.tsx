'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Tags,
  FolderTree,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Edit3,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Info,
  ImageIcon,
  LayoutGrid,
  ListTree,
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

export interface SellerReGoCategoriesProps {
  categories: Category[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onSaveCategory: (data: Partial<Category>) => Promise<void>;
  onDeleteCategory: (cat: Category) => Promise<void>;
  onMovePosition: (cat: Category, direction: 'up' | 'down') => Promise<void>;
  onUploadImage?: (file: File) => Promise<string>;
}

export function SellerReGoCategories({
  categories,
  loading,
  onRefresh,
  onSaveCategory,
  onDeleteCategory,
  onMovePosition,
  onUploadImage,
}: SellerReGoCategoriesProps) {
  const { t, locale } = useLocale();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'root' | 'active' | 'megamenu'>('all');
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Drawer & Modal State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  // Category Form
  const [formName, setFormName] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formShowMegamenu, setFormShowMegamenu] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);

  // Build hierarchical tree
  const categoryTree = useMemo(() => {
    const map = new Map<string, Category>();
    const roots: Category[] = [];

    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    map.forEach((cat) => {
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children!.push(cat);
      } else {
        roots.push(cat);
      }
    });

    const sortNodes = (nodes: Category[]) => {
      nodes.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
      nodes.forEach((n) => {
        if (n.children && n.children.length > 0) {
          sortNodes(n.children);
        }
      });
    };

    sortNodes(roots);
    return roots;
  }, [categories]);

  // Flattened roots & children stats
  const rootCategoriesCount = useMemo(
    () => categories.filter((c) => !c.parent_id).length,
    [categories]
  );
  const totalProductsAssigned = useMemo(
    () => categories.reduce((sum, c) => sum + (c.product_count || 0), 0),
    [categories]
  );
  const megamenuCategoriesCount = useMemo(
    () => categories.filter((c) => c.show_in_megamenu ?? true).length,
    [categories]
  );

  // Filtered categories
  const filteredCategories = useMemo(() => {
    let list = categories;
    if (filterMode === 'root') {
      list = list.filter((c) => !c.parent_id);
    } else if (filterMode === 'active') {
      list = list.filter((c) => c.is_active);
    } else if (filterMode === 'megamenu') {
      list = list.filter((c) => c.show_in_megamenu ?? true);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          (c.name_ar && c.name_ar.includes(q))
      );
    }

    return list;
  }, [categories, filterMode, searchQuery]);

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateDrawer = (parentId = '') => {
    setEditingCategory(null);
    setFormName('');
    setFormNameAr('');
    setFormSlug('');
    setFormParentId(parentId);
    setFormDescription('');
    setFormImageUrl('');
    setFormIcon('');
    setFormShowMegamenu(true);
    setFormIsActive(true);
    setFormError('');
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name || '');
    setFormNameAr(cat.name_ar || '');
    setFormSlug(cat.slug || '');
    setFormParentId(cat.parent_id || '');
    setFormDescription(cat.description || '');
    setFormImageUrl(cat.image_url || '');
    setFormIcon(cat.icon || '');
    setFormShowMegamenu(cat.show_in_megamenu ?? true);
    setFormIsActive(cat.is_active ?? true);
    setFormError('');
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError('Le nom de la catégorie est obligatoire');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await onSaveCategory({
        id: editingCategory?.id,
        name: formName.trim(),
        name_fr: formName.trim(),
        name_ar: formNameAr.trim() || undefined,
        slug: formSlug.trim() || undefined,
        parent_id: formParentId || null,
        description: formDescription.trim() || undefined,
        image_url: formImageUrl || undefined,
        icon: formIcon || undefined,
        show_in_megamenu: formShowMegamenu,
        is_active: formIsActive,
      });
      setIsDrawerOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;
    setDeleting(true);
    try {
      await onDeleteCategory(deletingCategory);
      setDeletingCategory(null);
    } catch (err: any) {
      setFormError(err?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Catalogue', href: '/hub/dashboard/products' },
        { label: 'Catégories & Collections' },
      ]}
      headerTitle="Catégories & Collections de la Boutique"
      headerSubtitle="Structurez l'arborescence interne de votre boutique pour faciliter la navigation de vos acheteurs."
      headerIcon={Tags}
      statusBadge={
        <ReGoStatusChip
          status={categories.length > 0 ? 'ok' : 'neutral'}
          label={`${categories.length} catégories répertoriées`}
          size="sm"
        />
      }
      secondaryAction={
        <div className="flex items-center rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('tree')}
            className={`p-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all ${
              viewMode === 'tree'
                ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
            }`}
            title="Vue arborescence"
          >
            <ListTree className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all ${
              viewMode === 'grid'
                ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
            }`}
            title="Vue grille de cartes"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      }
      primaryAction={
        <button
          type="button"
          onClick={() => openCreateDrawer()}
          className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3.5 py-2 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nouvelle Catégorie</span>
        </button>
      }
      alertBanner={
        categories.length === 0 && !loading ? (
          <div className="rounded-[var(--rego-r,8px)] border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <FolderTree className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Aucune catégorie configurée
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Créez vos premiers rayons marchands pour organiser vos fiches produits et structurer votre menu de navigation vitrine.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openCreateDrawer()}
              className="rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] transition-all shadow-xs"
            >
              Créer un premier rayon
            </button>
          </div>
        ) : null
      }
      kpiStrip={
        <>
          <ReGoKpiHero
            label="Total Catégories"
            value={categories.length}
            delta={`${rootCategoriesCount} racines`}
            deltaType="neutral"
            hint="Arborescence catalogue"
            icon={Tags}
            accent={categories.length > 0}
          />
          <ReGoKpiHero
            label="Rayons Principaux"
            value={rootCategoriesCount}
            hint="Racines du menu vitrine"
            icon={FolderTree}
          />
          <ReGoKpiHero
            label="Articles Rattachés"
            value={totalProductsAssigned}
            hint="Produits classés en rayons"
            icon={Package}
          />
          <ReGoKpiHero
            label="Affichage Mégamenu"
            value={megamenuCategoriesCount}
            delta={`${Math.round((megamenuCategoriesCount / (categories.length || 1)) * 100)}%`}
            deltaLabel="visibilité"
            deltaType="neutral"
            hint="Exposés sur la vitrine"
            icon={Eye}
          />
        </>
      }
      filterToolbar={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une catégorie par nom ou slug..."
              className="w-full ps-8 pe-3 py-1.5 text-xs font-medium rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                  : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-border,#dedede)]/40'
              }`}
            >
              Toutes ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('root')}
              className={`px-3 py-1 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'root'
                  ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                  : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-border,#dedede)]/40'
              }`}
            >
              Racines ({rootCategoriesCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('megamenu')}
              className={`px-3 py-1 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'megamenu'
                  ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                  : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-border,#dedede)]/40'
              }`}
            >
              Mégamenu ({megamenuCategoriesCount})
            </button>

            <button
              type="button"
              onClick={() => void onRefresh()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-all shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
              <span>Actualiser</span>
            </button>
          </div>
        </div>
      }
      mainContent={
        viewMode === 'tree' ? (
          /* Tree View */
          <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] divide-y divide-[var(--rego-border,#dedede)]/70 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
            {categoryTree.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--rego-ink-2,#737373)]">
                {searchQuery ? 'Aucune catégorie ne correspond à votre recherche' : 'Aucune catégorie créée'}
              </div>
            ) : (
              categoryTree.map((node) => (
                <TreeCategoryRow
                  key={node.id}
                  node={node}
                  depth={0}
                  collapsedNodes={collapsedNodes}
                  onToggleCollapse={toggleCollapse}
                  onEdit={openEditDrawer}
                  onAddChild={(parentId) => openCreateDrawer(parentId)}
                  onRequestDelete={(cat) => setDeletingCategory(cat)}
                  onMove={onMovePosition}
                />
              ))
            )}
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCategories.length === 0 ? (
              <div className="col-span-full p-8 text-center text-xs text-[var(--rego-ink-2,#737373)] bg-[var(--rego-bg,#ffffff)] rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]">
                Aucune catégorie trouvée
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-4 shadow-2xs flex flex-col justify-between hover:border-[var(--rego-accent,#ad0505)]/50 transition-all group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] flex items-center justify-center text-[var(--rego-accent,#ad0505)] font-bold text-xs shrink-0 border border-[var(--rego-border,#dedede)]/50">
                          {cat.image_url ? (
                            <img
                              src={getResizedImageUrl(cat.image_url, 'small')}
                              alt={cat.name}
                              className="w-full h-full object-cover rounded-[var(--rego-r,8px)]"
                            />
                          ) : (
                            <Tags className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)] truncate">
                            {cat.name}
                          </h4>
                          {cat.name_ar && (
                            <p className="text-[11px] text-[var(--rego-ink-2,#737373)] font-arabic truncate">
                              {cat.name_ar}
                            </p>
                          )}
                        </div>
                      </div>

                      <ReGoStatusChip
                        status={cat.is_active ? 'ok' : 'neutral'}
                        label={cat.is_active ? 'Actif' : 'Masqué'}
                        size="xs"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[var(--rego-ink-2,#737373)] font-mono">
                      <span className="bg-[var(--rego-surface,#f5f5f5)] px-2 py-0.5 rounded border border-[var(--rego-border,#dedede)]/60">
                        /{cat.slug}
                      </span>
                      <span className="bg-[var(--rego-surface,#f5f5f5)] px-2 py-0.5 rounded border border-[var(--rego-border,#dedede)]/60">
                        {cat.product_count || 0} produit(s)
                      </span>
                      {cat.show_in_megamenu && (
                        <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-bold">
                          Mégamenu
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--rego-border,#dedede)]/70 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => openCreateDrawer(cat.id)}
                      className="text-[11px] font-bold text-[var(--rego-accent,#ad0505)] hover:underline"
                    >
                      + Sous-rayon
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditDrawer(cat)}
                        className="p-1 rounded text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
                        title="Modifier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCategory(cat)}
                        className="p-1 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )
      }
      drawer={
        <ReGoDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title={editingCategory ? 'Modifier la Catégorie' : 'Créer une Nouvelle Catégorie'}
          subtitle="Configurez les informations d'affichage, le slug et la position dans l'arborescence."
        >
          {formError && (
            <div className="rounded-[var(--rego-r,8px)] border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                Nom de la Catégorie (Français) *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!editingCategory && !formSlug) {
                    setFormSlug(
                      e.target.value
                        .toLowerCase()
                        .trim()
                        .replace(/[^\w\s-]/g, '')
                        .replace(/[\s_-]+/g, '-')
                        .replace(/^-+|-+$/g, '')
                    );
                  }
                }}
                placeholder="Ex : Céramique & Poterie"
                className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3.5 py-2 text-xs font-medium text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                Nom en Arabe (Optionnel)
              </label>
              <input
                type="text"
                dir="rtl"
                value={formNameAr}
                onChange={(e) => setFormNameAr(e.target.value)}
                placeholder="خزف وفخار تقليدي"
                className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3.5 py-2 text-xs font-arabic font-medium text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                Slug URL vitrine
              </label>
              <div className="flex rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] overflow-hidden font-mono text-xs">
                <span className="px-3 py-2 bg-[var(--rego-border,#dedede)]/40 text-[var(--rego-ink-2,#737373)] border-e border-[var(--rego-border,#dedede)]">
                  /collection/
                </span>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="ceramique-poterie"
                  className="flex-1 bg-transparent px-3 py-2 text-[var(--rego-fg,#111111)] outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                Rayon Parent (Hiérarchie)
              </label>
              <select
                value={formParentId}
                onChange={(e) => setFormParentId(e.target.value)}
                className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-2 text-xs font-medium text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
              >
                <option value="">Rayon racine (Premier niveau)</option>
                {categories
                  .filter((c) => c.id !== editingCategory?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                Description du Rayon
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                placeholder="Présentez les articles de ce rayon pour vos visiteurs..."
                className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-3 text-xs font-medium text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
              />
            </div>

            {/* Visibility Options */}
            <div className="space-y-2 pt-2 border-t border-[var(--rego-border,#dedede)]">
              <label className="flex items-center gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formShowMegamenu}
                  onChange={(e) => setFormShowMegamenu(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)] focus:ring-0"
                />
                <div>
                  <span className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                    Afficher dans le mégamenu de navigation
                  </span>
                  <span className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                    Permet aux acheteurs d&apos;accéder au rayon directement depuis le menu principal.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)] focus:ring-0"
                />
                <div>
                  <span className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                    Catégorie active et visible en vitrine
                  </span>
                  <span className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                    Si décoché, les articles restent accessibles mais le rayon est masqué des listes.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-3 border-t border-[var(--rego-border,#dedede)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3.5 py-2 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] disabled:opacity-50 transition-all cursor-pointer"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer la catégorie'}
              </button>
            </div>
          </div>
        </ReGoDrawer>
      }
      modals={
        <ReGoModal
          isOpen={deletingCategory !== null}
          onClose={() => setDeletingCategory(null)}
          title="Supprimer la Catégorie"
          subtitle="Cette action retirera le classement de vos articles."
        >
          <div className="space-y-4">
            <div className="rounded-[var(--rego-r,8px)] border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300">
              Êtes-vous sûr de vouloir supprimer la catégorie <strong>{deletingCategory?.name}</strong> ?
              {deletingCategory?.children && deletingCategory.children.length > 0 && (
                <div className="mt-1 font-bold">
                  Attention : cette catégorie contient {deletingCategory.children.length} sous-rayon(s).
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="rounded-[var(--rego-r,8px)] bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </ReGoModal>
      }
    />
  );
}

function TreeCategoryRow({
  node,
  depth,
  collapsedNodes,
  onToggleCollapse,
  onEdit,
  onAddChild,
  onRequestDelete,
  onMove,
}: {
  node: Category;
  depth: number;
  collapsedNodes: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  onEdit: (cat: Category) => void;
  onAddChild: (parentId: string) => void;
  onRequestDelete: (cat: Category) => void;
  onMove: (cat: Category, dir: 'up' | 'down') => void;
}) {
  const isCollapsed = collapsedNodes[node.id];
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center justify-between p-3.5 hover:bg-[var(--rego-surface,#f5f5f5)]/60 transition-colors group"
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleCollapse(node.id)}
              className="p-1 rounded text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors shrink-0"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6 shrink-0" />
          )}

          <div className="w-6 h-6 rounded bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)]/60 flex items-center justify-center text-[var(--rego-accent,#ad0505)] text-xs shrink-0">
            {node.image_url ? (
              <img
                src={getResizedImageUrl(node.image_url, 'small')}
                alt={node.name}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <Tags className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--rego-fg,#111111)] truncate">
              {node.name}
            </span>
            {node.name_ar && (
              <span className="text-[11px] text-[var(--rego-ink-2,#737373)] font-arabic truncate">
                ({node.name_ar})
              </span>
            )}
            <span className="text-[10px] font-mono text-[var(--rego-ink-2,#737373)] bg-[var(--rego-surface,#f5f5f5)] px-1.5 py-0.5 rounded border border-[var(--rego-border,#dedede)]/40">
              /{node.slug}
            </span>
            {node.product_count > 0 && (
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                {node.product_count} articles
              </span>
            )}
            {!node.is_active && (
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                Masqué
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {/* Move Up / Down */}
          <button
            type="button"
            onClick={() => onMove(node, 'up')}
            className="p-1 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] rounded"
            title="Monter"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(node, 'down')}
            className="p-1 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] rounded"
            title="Descendre"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onAddChild(node.id)}
            className="px-2 py-1 text-[10px] font-bold text-[var(--rego-accent,#ad0505)] hover:bg-[var(--rego-accent-soft,rgba(173,5,5,0.08))] rounded transition-colors"
          >
            + Sous-rayon
          </button>
          <button
            type="button"
            onClick={() => onEdit(node)}
            className="p-1 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] rounded"
            title="Modifier"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRequestDelete(node)}
            className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {hasChildren && !isCollapsed && (
        <div className="border-t border-[var(--rego-border,#dedede)]/40">
          {node.children!.map((child) => (
            <TreeCategoryRow
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsedNodes={collapsedNodes}
              onToggleCollapse={onToggleCollapse}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onRequestDelete={onRequestDelete}
              onMove={onMove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
