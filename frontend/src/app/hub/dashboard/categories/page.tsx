'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Book,
  Camera,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  Coffee,
  Compass,
  Eye,
  EyeOff,
  FolderTree,
  Gamepad,
  Gift,
  Headphones,
  Heart,
  Home as HomeIcon,
  ImageIcon,
  Laptop,
  Layers,
  LayoutList,
  Loader2,
  Package,
  Palette,
  Plus,
  Save,
  Search,
  Settings2,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  Tags,
  Trash2,
  Tv,
  Upload,
  Utensils,
  Watch,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Icon library options for storefront categories
const ICON_OPTIONS = [
  { name: 'Layers', comp: Layers },
  { name: 'Shirt', comp: Shirt },
  { name: 'ShoppingBag', comp: ShoppingBag },
  { name: 'Package', comp: Package },
  { name: 'Tag', comp: Tag },
  { name: 'Laptop', comp: Laptop },
  { name: 'Smartphone', comp: Smartphone },
  { name: 'Sparkles', comp: Sparkles },
  { name: 'Home', comp: HomeIcon },
  { name: 'Car', comp: Car },
  { name: 'Watch', comp: Watch },
  { name: 'Utensils', comp: Utensils },
  { name: 'Book', comp: Book },
  { name: 'Gamepad', comp: Gamepad },
  { name: 'Tv', comp: Tv },
  { name: 'Headphones', comp: Headphones },
  { name: 'Gift', comp: Gift },
  { name: 'Heart', comp: Heart },
  { name: 'Star', comp: Star },
  { name: 'Compass', comp: Compass },
  { name: 'Palette', comp: Palette },
  { name: 'Camera', comp: Camera },
  { name: 'Coffee', comp: Coffee },
];

function getCategoryIconComponent(iconName?: string | null) {
  if (!iconName) return null;
  const found = ICON_OPTIONS.find((i) => i.name.toLowerCase() === iconName.toLowerCase());
  return found ? found.comp : null;
}

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

const emptyCategoryForm = {
  id: '',
  name: '',
  name_fr: '',
  name_ar: '',
  name_en: '',
  parent_id: '',
  description: '',
  description_fr: '',
  description_ar: '',
  description_en: '',
  short_description: '',
  long_description: '',
  image_url: '',
  icon: '',
  banner_url: '',
  seo_title: '',
  seo_description: '',
  show_in_megamenu: true,
  is_active: true,
  position: 0,
};

async function getErrorMessage(res: Response, fallback = 'Request failed') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

// Searchable Parent Category Selector Component
function SearchableParentCategorySelect({
  value,
  onChange,
  options,
  currentCategoryId,
  emptyLabel = 'Rayon principal (Racine)',
}: {
  value: string;
  onChange: (id: string) => void;
  options: Array<{ id: string; name: string }>;
  currentCategoryId?: string;
  emptyLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validOptions = useMemo(() => {
    return options.filter((opt) => opt.id !== currentCategoryId);
  }, [options, currentCategoryId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return validOptions;
    const q = search.toLowerCase();
    return validOptions.filter((opt) => opt.name.toLowerCase().includes(q));
  }, [validOptions, search]);

  const selectedOption = validOptions.find((opt) => opt.id === value);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 outline-none hover:bg-white transition-colors"
      >
        <span className="truncate">{selectedOption ? selectedOption.name : emptyLabel}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl space-y-1">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une catégorie..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-bold text-slate-900 outline-none focus:border-[#B91C1C] focus:bg-white"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
              !value ? 'bg-amber-50 text-[#B91C1C]' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>{emptyLabel}</span>
            {!value && <Check className="h-4 w-4 text-[#B91C1C]" />}
          </button>

          {filtered.length === 0 ? (
            <div className="py-3 text-center text-xs font-semibold text-slate-400">Aucun résultat</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-left transition-colors ${
                  value === opt.id ? 'bg-amber-50 text-[#B91C1C]' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{opt.name}</span>
                {value === opt.id && <Check className="h-4 w-4 text-[#B91C1C]" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Icon Picker Modal Component
function IconPickerModal({
  selectedIcon,
  onSelect,
  onClose,
}: {
  selectedIcon?: string | null;
  onSelect: (iconName: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return ICON_OPTIONS;
    const q = search.toLowerCase();
    return ICON_OPTIONS.filter((i) => i.name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900">Choisir une icône</h3>
            <p className="text-xs text-slate-500 font-medium">Sélectionnez une icône pour représenter cette catégorie</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une icône..."
            className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#B91C1C] outline-none"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-4 gap-2 overflow-y-auto pr-1 py-1 flex-1">
          {filtered.map((item) => {
            const Comp = item.comp;
            const isSelected = selectedIcon?.toLowerCase() === item.name.toLowerCase();
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  onSelect(item.name);
                  onClose();
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center gap-1.5 ${
                  isSelected
                    ? 'border-[#B91C1C] bg-red-50 text-[#B91C1C] ring-2 ring-[#B91C1C]/15 font-black'
                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold'
                }`}
              >
                <Comp className={`w-5 h-5 ${isSelected ? 'text-[#B91C1C]' : 'text-slate-600'}`} />
                <span className="text-[10px] truncate max-w-full">{item.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              onSelect('');
              onClose();
            }}
            className="text-xs font-bold text-red-600 hover:underline"
          >
            Supprimer l&apos;icône
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// Recursive Tree Node Item
function RecursiveCategoryItem({
  node,
  depth = 0,
  collapsedParents,
  toggleParentCollapse,
  movePosition,
  requestDelete,
  setParentForNewCategory,
  setEditingCategory,
  searchQuery,
  t,
}: {
  node: Category;
  depth?: number;
  collapsedParents: Record<string, boolean>;
  toggleParentCollapse: (id: string) => void;
  movePosition: (cat: Category, direction: 'up' | 'down') => void;
  requestDelete: (cat: Category) => void;
  setParentForNewCategory: (parentId: string) => void;
  setEditingCategory: (cat: Category) => void;
  searchQuery: string;
  t: (key: string, values?: Record<string, any>) => string;
}) {
  const isCollapsed = collapsedParents[node.id];
  const hasChildren = node.children && node.children.length > 0;
  const isMegamenuVisible = node.show_in_megamenu ?? true;
  const IconComp = getCategoryIconComponent(node.icon);

  const levelBadges = [
    { label: 'Rayon principal', bg: 'bg-slate-900 text-white' },
    { label: 'Sous-catégorie L2', bg: 'bg-amber-600 text-white' },
    { label: 'Sous-catégorie L3', bg: 'bg-blue-600 text-white' },
    { label: 'Sous-catégorie L4', bg: 'bg-purple-600 text-white' },
    { label: 'Sous-catégorie L5', bg: 'bg-emerald-600 text-white' },
  ];
  const currentBadge = levelBadges[Math.min(depth, levelBadges.length - 1)];

  return (
    <div className="flex flex-col">
      <div
        className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
          depth === 0
            ? 'bg-white border-slate-200/80 shadow-xs hover:border-slate-300'
            : 'bg-slate-50/70 border-slate-200/60 hover:bg-white hover:border-slate-300'
        }`}
        style={{ marginLeft: `${depth * 24}px` }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Collapse Toggle */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleParentCollapse(node.id)}
              className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500 transition-colors shrink-0"
              title={isCollapsed ? 'Déplier' : 'Replier'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6 shrink-0" />
          )}

          {/* Icon or Thumbnail */}
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
            {node.image_url ? (
              <img
                src={getResizedImageUrl(node.image_url, 'small')}
                alt={node.name}
                className="w-full h-full object-cover"
              />
            ) : IconComp ? (
              <IconComp className="w-5 h-5 text-[#B91C1C]" />
            ) : (
              <Tags className="w-4 h-4 text-slate-300" />
            )}
          </div>

          {/* Name, Slug and Badges */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-slate-900 text-sm">{node.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${currentBadge.bg}`}>
                {currentBadge.label}
              </span>
              {node.is_default && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                  Par défaut
                </span>
              )}
              {!node.is_active && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-500">
                  Inactive
                </span>
              )}
              {isMegamenuVisible ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  <Eye className="w-3 h-3" /> Menu
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                  <EyeOff className="w-3 h-3" /> Masquée
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-medium">
              <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">/{node.slug}</span>
              <span>•</span>
              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                {node.product_count} produit{node.product_count !== 1 ? 's' : ''}
              </span>
              {hasChildren && (
                <>
                  <span>•</span>
                  <span className="text-slate-500 font-semibold">
                    {node.children!.length} sous-catégorie{node.children!.length > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          {/* Add Subcategory */}
          <button
            type="button"
            onClick={() => setParentForNewCategory(node.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#B91C1C] rounded-xl text-xs font-bold transition-colors"
            title="Ajouter une sous-catégorie sous ce parent"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sous-catégorie</span>
          </button>

          {/* Reorder Up / Down */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => movePosition(node, 'up')}
              className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors"
              title="Monter"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => movePosition(node, 'down')}
              className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors"
              title="Descendre"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Edit */}
          <button
            type="button"
            onClick={() => setEditingCategory(node)}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Modifier la catégorie"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Delete (if not default) */}
          {!node.is_default && (
            <button
              type="button"
              onClick={() => requestDelete(node)}
              className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
              title="Supprimer la catégorie"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Render Nested Children if not collapsed */}
      {hasChildren && !isCollapsed && (
        <div className="flex flex-col gap-2 mt-2">
          {node.children!.map((child) => (
            <RecursiveCategoryItem
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsedParents={collapsedParents}
              toggleParentCollapse={toggleParentCollapse}
              movePosition={movePosition}
              requestDelete={requestDelete}
              setParentForNewCategory={setParentForNewCategory}
              setEditingCategory={setEditingCategory}
              searchQuery={searchQuery}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Delete Impact Confirmation Modal
function DeleteImpactModal({
  category,
  impact,
  loading,
  onConfirm,
  onClose,
}: {
  category: Category;
  impact: { product_count: number; subcategories_count: number } | null;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-red-100">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <div className="p-3 bg-red-50 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Supprimer « {category.name} » ?</h3>
            <p className="text-xs text-slate-500 font-semibold">Analyse d&apos;impact et réaffectation sécurisée</p>
          </div>
        </div>

        {loading || !impact ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#B91C1C] animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 text-xs font-medium text-slate-600">
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/60 space-y-2">
              <p className="font-bold text-amber-900">Impact détecté sur votre boutique :</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>
                  <strong className="font-black text-slate-900">{impact.product_count}</strong> produit(s) directement rattaché(s)
                </li>
                <li>
                  <strong className="font-black text-slate-900">{impact.subcategories_count}</strong> sous-catégorie(s) enfant(s)
                </li>
              </ul>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed">
              En confirmant la suppression, tous les produits assignés seront automatiquement transférés vers la catégorie par défaut
              <strong className="font-bold text-slate-800"> « Produits non catégorisés »</strong>, et les sous-catégories enfants seront promues au niveau parent.
            </p>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-lg shadow-red-600/20"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StorefrontCategoriesPage() {
  const { t, locale } = useLocale();
  const [categoriesTree, setCategoriesTree] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedParents, setCollapsedParents] = useState<Record<string, boolean>>({});

  // Drawer / Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategoryState] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyCategoryForm);
  const [activeTab, setActiveTab] = useState<'general' | 'translations' | 'media' | 'seo'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  // Delete Impact Modal State
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<{ product_count: number; subcategories_count: number } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [treeRes, flatRes] = await Promise.all([
        fetchWithCsrf('/api/pd/stores/me/categories?tree=true', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/stores/me/categories?tree=false', { credentials: 'include' }),
      ]);

      if (!treeRes.ok) throw new Error(await getErrorMessage(treeRes, t('dashboardPages.categories.failedToLoad')));
      const treeData = await treeRes.json();
      const flatData = await flatRes.json();

      setCategoriesTree(treeData.data || []);
      setFlatCategories(flatData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.categories.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleParentCollapse = (id: string) => {
    setCollapsedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateDrawer = (parentId = '') => {
    setEditingCategoryState(null);
    setForm({
      ...emptyCategoryForm,
      parent_id: parentId,
      position: flatCategories.length * 10 + 10,
    });
    setActiveTab('general');
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (category: Category) => {
    setEditingCategoryState(category);
    setForm({
      id: category.id,
      name: category.name,
      name_fr: category.name_fr || category.name,
      name_ar: category.name_ar || '',
      name_en: category.name_en || '',
      parent_id: category.parent_id || '',
      description: category.description || '',
      description_fr: category.description_fr || category.description || '',
      description_ar: category.description_ar || '',
      description_en: category.description_en || '',
      short_description: category.short_description || '',
      long_description: category.long_description || '',
      image_url: category.image_url || '',
      icon: category.icon || '',
      banner_url: category.banner_url || '',
      seo_title: category.seo_title || '',
      seo_description: category.seo_description || '',
      show_in_megamenu: category.show_in_megamenu ?? true,
      is_active: category.is_active,
      position: category.position ?? 0,
    });
    setActiveTab('general');
    setIsDrawerOpen(true);
  };

  const uploadImage = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) throw new Error(t('dashboardPages.categories.invalidImageType'));
    if (file.size > 10 * 1024 * 1024) throw new Error(t('dashboardPages.categories.imageTooLarge'));

    const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ filename: file.name, content_type: file.type, purpose: 'product_image' }),
    });
    if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes, t('dashboardPages.categories.failedToPrepareUpload')));
    const data = await presignRes.json();
    if (!data.upload_url || !data.public_url) throw new Error(t('dashboardPages.categories.noUploadUrl'));

    const uploadRes = await fetch(data.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error(t('dashboardPages.categories.imageUploadFailed'));
    return data.public_url as string;
  };

  const handleImageUpload = async (file: File | null, field: 'image_url' | 'banner_url') => {
    if (!file) return;
    setUploadingImage(true);
    setError('');
    try {
      const url = await uploadImage(file);
      setForm((curr) => ({ ...curr, [field]: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.categories.imageUploadFailed'));
    } finally {
      setUploadingImage(false);
    }
  };

  const saveCategory = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: form.name.trim(),
        name_fr: form.name_fr.trim() || form.name.trim(),
        name_ar: form.name_ar.trim() || null,
        name_en: form.name_en.trim() || null,
        parent_id: form.parent_id || null,
        description_fr: form.description_fr.trim() || null,
        description_ar: form.description_ar.trim() || null,
        description_en: form.description_en.trim() || null,
        short_description: form.short_description.trim() || null,
        long_description: form.long_description.trim() || null,
        image_url: form.image_url.trim() || null,
        icon: form.icon.trim() || null,
        banner_url: form.banner_url.trim() || null,
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
        show_in_megamenu: form.show_in_megamenu,
        is_active: form.is_active,
        position: form.position,
      };

      if (editingCategory) {
        const res = await fetchWithCsrf(`/api/pd/stores/me/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.categories.failedToUpdate')));
        setSuccess(t('dashboardPages.categories.categoryUpdated'));
      } else {
        const res = await fetchWithCsrf('/api/pd/stores/me/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.categories.failedToCreate')));
        setSuccess(t('dashboardPages.categories.categoryCreated'));
      }

      setIsDrawerOpen(false);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  };

  const movePosition = async (category: Category, direction: 'up' | 'down') => {
    // Find siblings
    const siblings = flatCategories
      .filter((c) => (c.parent_id || null) === (category.parent_id || null))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    const index = siblings.findIndex((c) => c.id === category.id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === siblings.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const targetSibling = siblings[targetIndex];

    const currentPos = category.position ?? 0;
    const targetPos = targetSibling.position ?? 0;

    // Swap positions
    const newCurrentPos = targetPos;
    const newTargetPos = currentPos === targetPos ? (direction === 'up' ? targetPos + 10 : targetPos - 10) : currentPos;

    try {
      await fetchWithCsrf('/api/pd/stores/me/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: [
            { id: category.id, position: newCurrentPos },
            { id: targetSibling.id, position: newTargetPos },
          ],
        }),
      });
      await fetchCategories();
    } catch (err) {
      setError('Erreur lors du déplacement de la catégorie');
    }
  };

  const requestDelete = async (category: Category) => {
    setDeleteTarget(category);
    setDeleteLoading(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/categories/${category.id}/delete-impact`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setDeleteImpact(data.data || { product_count: 0, subcategories_count: 0 });
      } else {
        setDeleteImpact({ product_count: 0, subcategories_count: 0 });
      }
    } catch {
      setDeleteImpact({ product_count: 0, subcategories_count: 0 });
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/categories/${deleteTarget.id}?confirm=true`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.categories.failedToDelete')));
      setSuccess('Catégorie supprimée avec succès.');
      setDeleteTarget(null);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.categories.failedToDelete'));
    }
  };

  // Filter categories by search query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return categoriesTree;
    const q = searchQuery.toLowerCase();

    function filterNode(node: Category): Category | null {
      const nameMatch = node.name.toLowerCase().includes(q) || (node.name_ar && node.name_ar.includes(q)) || (node.name_en && node.name_en.toLowerCase().includes(q));
      const slugMatch = node.slug.toLowerCase().includes(q);

      let filteredChildren: Category[] = [];
      if (node.children && node.children.length > 0) {
        filteredChildren = node.children.map(filterNode).filter(Boolean) as Category[];
      }

      if (nameMatch || slugMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    }

    return categoriesTree.map(filterNode).filter(Boolean) as Category[];
  }, [categoriesTree, searchQuery]);

  const topLevelCount = flatCategories.filter((c) => !c.parent_id).length;
  const subcategoriesCount = flatCategories.filter((c) => c.parent_id).length;
  const activeCount = flatCategories.filter((c) => c.is_active).length;
  const totalAssignedProducts = flatCategories.reduce((sum, c) => sum + (c.product_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-[#B91C1C] via-[#13b777] to-slate-950 p-6 sm:p-8 text-white shadow-xl shadow-amber-900/10">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 left-16 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/90">
              <FolderTree className="w-4 h-4" />
              {t('dashboardPages.categories.storefrontTaxonomy')}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t('dashboardPages.categories.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">
              {t('dashboardPages.categories.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:min-w-[520px]">
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-2xl font-black">{flatCategories.length}</p>
              <p className="text-xs text-white/75">{t('dashboardPages.categories.total')}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-2xl font-black">{topLevelCount}</p>
              <p className="text-xs text-white/75">{t('dashboardPages.categories.topLevel')}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-2xl font-black">{subcategoriesCount}</p>
              <p className="text-xs text-white/75">{t('dashboardPages.categories.subcategories')}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-2xl font-black">{totalAssignedProducts}</p>
              <p className="text-xs text-white/75">{t('dashboardPages.categories.products')}</p>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-xs font-bold border border-red-200">{error}</div>}
      {success && <div className="p-4 rounded-2xl bg-green-50 text-green-700 text-xs font-bold border border-green-200">{success}</div>}

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une catégorie ou sous-catégorie..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/10 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => openCreateDrawer()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#B91C1C] text-white font-black text-xs rounded-2xl hover:bg-[#991B1B] shadow-lg shadow-[#B91C1C]/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t('dashboardPages.categories.addCategory')}</span>
          </button>
        </div>

        {/* Tree List */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#B91C1C] animate-spin" />
            </div>
          ) : filteredTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FolderTree className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-black text-slate-900 text-sm">
                {searchQuery ? `Aucune catégorie ne correspond à « ${searchQuery} »` : t('dashboardPages.categories.noCategories')}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {searchQuery ? 'Essayez avec un autre mot-clé' : t('dashboardPages.categories.noCategoriesHint')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredTree.map((rootNode) => (
                <RecursiveCategoryItem
                  key={rootNode.id}
                  node={rootNode}
                  depth={0}
                  collapsedParents={collapsedParents}
                  toggleParentCollapse={toggleParentCollapse}
                  movePosition={movePosition}
                  requestDelete={requestDelete}
                  setParentForNewCategory={openCreateDrawer}
                  setEditingCategory={openEditDrawer}
                  searchQuery={searchQuery}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit / Create Drawer Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 text-[#B91C1C] rounded-2xl">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingCategory ? 'Modifier la catégorie' : 'Créer une catégorie'}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    {editingCategory ? `Édition de « ${editingCategory.name} »` : 'Ajoutez un rayon ou une sous-catégorie'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100 px-6 bg-slate-50/30">
              {[
                { id: 'general', label: 'Général', icon: LayoutList },
                { id: 'translations', label: 'Traductions (FR/AR/EN)', icon: Book },
                { id: 'media', label: 'Médias & Icône', icon: ImageIcon },
                { id: 'seo', label: 'SEO & Visibilité', icon: Compass },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      isActive
                        ? 'border-[#B91C1C] text-[#B91C1C] font-black'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Body Form */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* TAB 1: GENERAL */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      Nom de la catégorie <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((curr) => ({ ...curr, name: e.target.value }))}
                      placeholder="Ex: Mode & Vêtements Homme"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:border-[#B91C1C] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Catégorie Parente</label>
                    <SearchableParentCategorySelect
                      value={form.parent_id}
                      onChange={(id) => setForm((curr) => ({ ...curr, parent_id: id }))}
                      options={flatCategories}
                      currentCategoryId={editingCategory?.id}
                      emptyLabel="Aucune (Rayon principal / Racine)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Description courte</label>
                    <input
                      type="text"
                      value={form.short_description}
                      onChange={(e) => setForm((curr) => ({ ...curr, short_description: e.target.value }))}
                      placeholder="Affichée dans les résumés et cartes..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:border-[#B91C1C] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Description détaillée</label>
                    <textarea
                      value={form.long_description}
                      onChange={(e) => setForm((curr) => ({ ...curr, long_description: e.target.value }))}
                      placeholder="Présentation complète de la collection..."
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:border-[#B91C1C] outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: TRANSLATIONS */}
              {activeTab === 'translations' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
                    <span className="text-xs font-black text-slate-900">🇫🇷 Français (Langue par défaut)</span>
                    <input
                      type="text"
                      value={form.name_fr}
                      onChange={(e) => setForm((c) => ({ ...c, name_fr: e.target.value }))}
                      placeholder="Nom en Français"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 space-y-3" dir="rtl">
                    <span className="text-xs font-black text-slate-900">🇹🇳 🇸🇦 العربية (Arabic)</span>
                    <input
                      type="text"
                      value={form.name_ar}
                      onChange={(e) => setForm((c) => ({ ...c, name_ar: e.target.value }))}
                      placeholder="اسم الفئة بالعربية..."
                      className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-bold text-right"
                    />
                    <textarea
                      value={form.description_ar}
                      onChange={(e) => setForm((c) => ({ ...c, description_ar: e.target.value }))}
                      placeholder="وصف الفئة بالعربية..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-medium text-right resize-none"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/60 space-y-3">
                    <span className="text-xs font-black text-slate-900">🇬🇧 English</span>
                    <input
                      type="text"
                      value={form.name_en}
                      onChange={(e) => setForm((c) => ({ ...c, name_en: e.target.value }))}
                      placeholder="Category Name in English..."
                      className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs font-bold"
                    />
                    <textarea
                      value={form.description_en}
                      onChange={(e) => setForm((c) => ({ ...c, description_en: e.target.value }))}
                      placeholder="Category Description in English..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs font-medium resize-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: MEDIA & ICON */}
              {activeTab === 'media' && (
                <div className="space-y-5">
                  {/* Icon Selector */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <label className="block text-xs font-black text-slate-700">Icône de la catégorie</label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                        {(() => {
                          const Comp = getCategoryIconComponent(form.icon);
                          return Comp ? <Comp className="w-6 h-6 text-[#B91C1C]" /> : <Tags className="w-5 h-5 text-slate-300" />;
                        })()}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsIconPickerOpen(true)}
                        className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        {form.icon ? `Changer (${form.icon})` : 'Choisir une icône'}
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail Image */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <label className="block text-xs font-black text-slate-700">Image miniature</label>
                    <div className="flex gap-3 items-center">
                      <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {form.image_url ? (
                          <img src={getResizedImageUrl(form.image_url, 'medium')} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="inline-flex items-center justify-center px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                          {uploadingImage ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-[#B91C1C]" /> : <Upload className="w-3.5 h-3.5 mr-2 text-[#B91C1C]" />}
                          Téléverser une image
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={uploadingImage}
                            onChange={(e) => handleImageUpload(e.target.files?.[0] || null, 'image_url')}
                            className="hidden"
                          />
                        </label>
                        {form.image_url && (
                          <button
                            type="button"
                            onClick={() => setForm((c) => ({ ...c, image_url: '' }))}
                            className="block text-[11px] font-bold text-red-600 hover:underline"
                          >
                            Supprimer l&apos;image
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Banner Image */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <label className="block text-xs font-black text-slate-700">Bannière d&apos;en-tête de catégorie</label>
                    <div className="aspect-[3/1] rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                      {form.banner_url ? (
                        <img src={getResizedImageUrl(form.banner_url, 'large')} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">Aucune bannière</span>
                      )}
                    </div>
                    <label className="inline-flex items-center justify-center px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 mr-2 text-[#B91C1C]" />
                      Téléverser une bannière
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingImage}
                        onChange={(e) => handleImageUpload(e.target.files?.[0] || null, 'banner_url')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 4: SEO & VISIBILITY */}
              {activeTab === 'seo' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Titre SEO (Meta Title)</label>
                    <input
                      type="text"
                      value={form.seo_title}
                      onChange={(e) => setForm((curr) => ({ ...curr, seo_title: e.target.value }))}
                      placeholder="Ex: Chaussures Homme | Boutique Panda"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:border-[#B91C1C] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Description SEO (Meta Description)</label>
                    <textarea
                      value={form.seo_description}
                      onChange={(e) => setForm((curr) => ({ ...curr, seo_description: e.target.value }))}
                      placeholder="Description indexée par les moteurs de recherche..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:border-[#B91C1C] outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2 space-y-3">
                    <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={form.show_in_megamenu}
                        onChange={(e) => setForm((c) => ({ ...c, show_in_megamenu: e.target.checked }))}
                        className="w-4 h-4 rounded text-[#B91C1C] focus:ring-[#B91C1C]"
                      />
                      <div>
                        <span className="text-xs font-black text-slate-900 block">Afficher dans le menu de navigation</span>
                        <span className="text-[11px] text-slate-500 font-medium">Visible dans la barre et les menus de la vitrine</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => setForm((c) => ({ ...c, is_active: e.target.checked }))}
                        className="w-4 h-4 rounded text-[#B91C1C] focus:ring-[#B91C1C]"
                      />
                      <div>
                        <span className="text-xs font-black text-slate-900 block">Catégorie active</span>
                        <span className="text-[11px] text-slate-500 font-medium">Accessible publiquement sur la vitrine</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-white"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={saveCategory}
                disabled={isSaving || !form.name.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#B91C1C] text-white font-black text-xs rounded-xl hover:bg-[#991B1B] shadow-lg shadow-[#B91C1C]/20 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{editingCategory ? 'Enregistrer les modifications' : 'Créer la catégorie'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Icon Picker Modal */}
      {isIconPickerOpen && (
        <IconPickerModal
          selectedIcon={form.icon}
          onSelect={(icon) => setForm((c) => ({ ...c, icon }))}
          onClose={() => setIsIconPickerOpen(false)}
        />
      )}

      {/* Delete Impact Modal */}
      {deleteTarget && (
        <DeleteImpactModal
          category={deleteTarget}
          impact={deleteImpact}
          loading={deleteLoading}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
