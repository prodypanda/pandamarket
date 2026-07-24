'use client';

import { fetchWithCsrf } from '@/lib/api';
import { MarketplaceAssetPicker } from '@/components/admin/MarketplaceAssetPicker';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Book,
  Car,
  ChevronDown,
  FolderTree,
  Gamepad,
  Headphones,
  Home as HomeIcon,
  ImageIcon,
  ImagePlus,
  Laptop,
  Layers,
  LayoutList,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Settings2,
  Shirt,
  Smartphone,
  Sparkles,
  Tags,
  Trash2,
  Tv,
  Utensils,
  Watch,
  X,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';

// Icon library options for categories
const ICON_OPTIONS = [
  { name: 'Layers', comp: Layers },
  { name: 'Laptop', comp: Laptop },
  { name: 'Smartphone', comp: Smartphone },
  { name: 'Shirt', comp: Shirt },
  { name: 'Sparkles', comp: Sparkles },
  { name: 'Home', comp: HomeIcon },
  { name: 'Car', comp: Car },
  { name: 'Watch', comp: Watch },
  { name: 'Utensils', comp: Utensils },
  { name: 'Book', comp: Book },
  { name: 'Gamepad', comp: Gamepad },
  { name: 'Tv', comp: Tv },
  { name: 'Headphones', comp: Headphones },
  { name: 'Package', comp: Package },
];

interface Category {
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
}: {
  value: string;
  onChange: (id: string) => void;
  options: Array<{ id: string; name: string }>;
  currentCategoryId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
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
        className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none hover:bg-white"
      >
        <span className="truncate">{selectedOption ? selectedOption.name : 'None (Top-Level Department)'}</span>
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
              placeholder="Search parent category..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-bold text-slate-900 outline-none focus:border-[#B91C1C] focus:bg-white"
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
            <span>None (Top-Level Department)</span>
            {!value && <Check className="h-4 w-4 text-[#B91C1C]" />}
          </button>

          {filtered.length === 0 ? (
            <div className="py-3 text-center text-xs font-semibold text-slate-400">No parent category matches "{search}"</div>
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

function RecursiveCategoryItem({
  node,
  depth = 0,
  collapsedParents,
  toggleParentCollapse,
  setAssetPickerTarget,
  movePosition,
  updateCategory,
  requestDelete,
  setParentId,
  setEditingCategory,
  filteredCategories,
  searchQuery,
}: {
  node: Category;
  depth?: number;
  collapsedParents: Record<string, boolean>;
  toggleParentCollapse: (id: string) => void;
  setAssetPickerTarget: (id: string) => void;
  movePosition: (cat: Category, direction: 'up' | 'down') => void;
  updateCategory: (cat: Category, patch: Partial<Category>) => void;
  requestDelete: (cat: Category) => void;
  setParentId: (id: string) => void;
  setEditingCategory: (cat: Category) => void;
  filteredCategories: Category[];
  searchQuery: string;
}) {
  const matchesFilter = filteredCategories.some((c) => c.id === node.id || c.parent_id === node.id);
  if (!matchesFilter && searchQuery.trim()) return null;

  const isCollapsed = collapsedParents[node.id];
  const hasChildren = node.children && node.children.length > 0;
  const isMegamenuVisible = node.show_in_megamenu ?? true;

  const levelColors = [
    'border-slate-200 bg-white shadow-xs',
    'border-amber-200 bg-amber-50/40 shadow-xs',
    'border-blue-200 bg-blue-50/40 shadow-xs',
    'border-purple-200 bg-purple-50/40 shadow-xs',
    'border-emerald-200 bg-emerald-50/40 shadow-xs',
  ];
  const badgeColors = [
    'bg-slate-900 text-white',
    'bg-amber-600 text-white',
    'bg-blue-600 text-white',
    'bg-purple-600 text-white',
    'bg-emerald-600 text-white',
  ];

  const currentLevelColor = levelColors[Math.min(depth, levelColors.length - 1)];
  const currentBadgeColor = badgeColors[Math.min(depth, badgeColors.length - 1)];

  return (
    <div className="space-y-2">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 transition-all hover:border-orange-300 ${currentLevelColor}`}
        style={{ marginLeft: `${depth * 1.5}rem` }}
      >
        <div className="flex items-center gap-3">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleParentCollapse(node.id)}
              className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
            </button>
          ) : (
            <span className="w-5 text-center font-mono text-xs font-bold text-slate-300">└──</span>
          )}

          <div className="relative shrink-0">
            {node.image_url ? (
              <img src={node.image_url} alt={node.name} className="h-10 w-10 rounded-xl border border-slate-200 object-cover shadow-xs" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-400">
                <Tags className="h-4 w-4" />
              </div>
            )}
            <button
              type="button"
              onClick={() => setAssetPickerTarget(node.id)}
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-400 shadow-xs ring-1 ring-slate-200 hover:bg-[#B91C1C] hover:text-white"
              title="Change Image"
            >
              <ImagePlus className="h-2.5 w-2.5" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${currentBadgeColor}`}>
                Level {depth + 1}
              </span>
              <h4 className="text-sm font-black text-slate-900">{node.name}</h4>
              {node.is_default && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-[#B91C1C]">
                  Default
                </span>
              )}
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-500">
                /{node.slug}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
              {node.name_fr && <span>🇫🇷 {node.name_fr}</span>}
              {node.name_ar && <span>🇸🇦 {node.name_ar}</span>}
              {node.name_en && <span>🇬🇧 {node.name_en}</span>}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Show / Hide Megamenu Selector Toggle */}
          <button
            type="button"
            onClick={() => updateCategory(node, { show_in_megamenu: !isMegamenuVisible })}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold transition-colors ${
              isMegamenuVisible
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                : 'border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
            title="Toggle visibility in public Megamenu"
          >
            {isMegamenuVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>{isMegamenuVisible ? 'Megamenu: Visible' : 'Megamenu: Hidden'}</span>
          </button>

          {/* Active / Inactive Status Toggle */}
          <button
            type="button"
            onClick={() => updateCategory(node, { is_active: !node.is_active })}
            disabled={node.is_default}
            className={`rounded-full border px-3 py-1 text-xs font-extrabold ${
              node.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'
            }`}
          >
            {node.is_active ? 'Active' : 'Inactive'}
          </button>

          {/* Position Reordering Buttons */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => movePosition(node, 'up')}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              title="Move Up"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => movePosition(node, 'down')}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              title="Move Down"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Add Subcategory */}
          <button
            type="button"
            onClick={() => setParentId(node.id)}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#B91C1C]"
            title="Add Subcategory under this category"
          >
            <Plus className="h-3.5 w-3.5 text-[#B91C1C]" />
            <span>Add Sub</span>
          </button>

          {/* Edit Button */}
          <button
            type="button"
            onClick={() => setEditingCategory(node)}
            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-[#B91C1C]"
            title="Edit Category Details"
          >
            <Settings2 className="h-4 w-4" />
          </button>

          {/* Delete Button */}
          {!node.is_default && (
            <button
              type="button"
              onClick={() => requestDelete(node)}
              className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Delete Category"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Recursive Children Display */}
      {hasChildren && !isCollapsed && (
        <div className="space-y-2">
          {node.children!.map((child) => (
            <RecursiveCategoryItem
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsedParents={collapsedParents}
              toggleParentCollapse={toggleParentCollapse}
              setAssetPickerTarget={setAssetPickerTarget}
              movePosition={movePosition}
              updateCategory={updateCategory}
              requestDelete={requestDelete}
              setParentId={setParentId}
              setEditingCategory={setEditingCategory}
              filteredCategories={filteredCategories}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarketplaceCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Multilingual Form States
  const [formLang, setFormLang] = useState<'fr' | 'ar' | 'en'>('fr');
  const [nameFr, setNameFr] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [parentId, setParentId] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [descFr, setDescFr] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [icon, setIcon] = useState('Layers');
  const [showInMegamenu, setShowInMegamenu] = useState(true);

  // Edit Drawer Modal State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // View & Filter States
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'root' | 'sub'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [collapsedParents, setCollapsedParents] = useState<Record<string, boolean>>({});

  // MarketplaceAssetPicker state
  const [assetPickerTarget, setAssetPickerTarget] = useState<string | null>(null); // 'new' | 'edit_image' | 'edit_banner' | category.id

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/marketplace-categories?tree=false', { credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to fetch categories'));
      const data = await res.json();
      setCategories(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Construct Category Tree from Flat Array (Preserving Position Sorting)
  const categoryTree = useMemo(() => {
    const map = new Map<string, Category>();
    const roots: Category[] = [];

    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach((cat) => {
      const current = map.get(cat.id)!;
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children!.push(current);
      } else {
        roots.push(current);
      }
    });

    // Sort roots & children by position
    const sortNodes = (nodes: Category[]) => {
      nodes.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      nodes.forEach((n) => {
        if (n.children && n.children.length > 0) sortNodes(n.children);
      });
    };
    sortNodes(roots);

    return roots;
  }, [categories]);

  // Flattened Options for Parent Category Selector
  const flattenedCategoryOptions = useMemo(() => {
    const buildOptions = (nodes: Category[], level = 0): Array<{ id: string; name: string }> => {
      const result: Array<{ id: string; name: string }> = [];
      nodes.forEach((node) => {
        const indent = '─ '.repeat(level);
        result.push({ id: node.id, name: `${indent}${node.name}` });
        if (node.children && node.children.length > 0) {
          result.push(...buildOptions(node.children, level + 1));
        }
      });
      return result;
    };
    return buildOptions(categoryTree);
  }, [categoryTree]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (typeFilter === 'root' && c.parent_id) return false;
      if (typeFilter === 'sub' && !c.parent_id) return false;
      if (statusFilter === 'active' && !c.is_active) return false;
      if (statusFilter === 'inactive' && c.is_active) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (
          c.name?.toLowerCase().includes(q) ||
          c.name_fr?.toLowerCase().includes(q) ||
          c.name_ar?.toLowerCase().includes(q) ||
          c.name_en?.toLowerCase().includes(q) ||
          c.slug?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
        );
        if (!matchesName) return false;
      }

      return true;
    });
  }, [categories, searchQuery, typeFilter, statusFilter]);

  const toggleParentCollapse = (id: string) => {
    setCollapsedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const createCategory = async () => {
    const primaryName = nameFr.trim() || nameEn.trim() || nameAr.trim();
    if (!primaryName) return;
    setError('');
    setSuccess('');
    setSavingId('new');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/marketplace-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: primaryName,
          name_fr: nameFr.trim() || primaryName,
          name_ar: nameAr.trim() || undefined,
          name_en: nameEn.trim() || undefined,
          description_fr: descFr.trim() || shortDescription.trim() || undefined,
          description_ar: descAr.trim() || undefined,
          description_en: descEn.trim() || undefined,
          parent_id: parentId || null,
          short_description: shortDescription.trim() || undefined,
          long_description: descFr.trim() || undefined,
          image_url: imageUrl.trim() || null,
          banner_url: bannerUrl.trim() || null,
          icon: icon || 'Layers',
          show_in_megamenu: showInMegamenu,
        }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to create category'));
      setNameFr('');
      setNameAr('');
      setNameEn('');
      setParentId('');
      setShortDescription('');
      setDescFr('');
      setDescAr('');
      setDescEn('');
      setImageUrl('');
      setBannerUrl('');
      setIcon('Layers');
      setShowInMegamenu(true);
      setSuccess('Marketplace category created successfully.');
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setSavingId(null);
    }
  };

  const updateCategory = async (category: Category, patch: Partial<Category>) => {
    setError('');
    setSuccess('');
    setSavingId(category.id);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/marketplace-categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to update category'));
      const data = await res.json();
      setCategories((current) => current.map((item) => (item.id === category.id ? { ...item, ...data.category } : item)));
      setSuccess(`Category "${category.name}" updated successfully.`);
      if (editingCategory?.id === category.id) {
        setEditingCategory((prev) => (prev ? { ...prev, ...data.category } : null));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setSavingId(null);
    }
  };

  const movePosition = async (category: Category, direction: 'up' | 'down') => {
    const siblings = categories.filter((c) => c.parent_id === (category.parent_id || null));
    siblings.sort((a, b) => a.position - b.position);
    const currentIndex = siblings.findIndex((c) => c.id === category.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const otherCategory = siblings[targetIndex];
    const newPos = otherCategory.position;
    const oldPos = category.position;

    setSavingId(category.id);
    try {
      await fetchWithCsrf('/api/pd/admin/marketplace-categories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: [
            { id: category.id, position: newPos },
            { id: otherCategory.id, position: oldPos },
          ],
        }),
      });
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder category');
    } finally {
      setSavingId(null);
    }
  };

  const requestDelete = async (category: Category) => {
    if (category.is_default) return;
    setError('');
    setSuccess('');
    setDeletingId(category.id);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/marketplace-categories/${category.id}/delete-impact`, { credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to inspect category'));
      const impact = await res.json();
      setDeleteWarning({ ...category, product_count: impact.product_count ?? category.product_count });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to inspect category');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteWarning) return;
    const cat = deleteWarning;
    setDeletingId(cat.id);
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/marketplace-categories/${cat.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to delete category'));
      setDeleteWarning(null);
      setSuccess(`Category "${cat.name}" deleted.`);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen space-y-8 p-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/40">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#B91C1C] to-red-600 text-white shadow-lg shadow-red-900/20">
            <Tags className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Marketplace Categories</h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Manage multi-level category trees, set Megamenu visibility, and reorder categories.
            </p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-700">{success}</div>}

      {/* CREATE NEW CATEGORY FORM */}
      <div className="rounded-[2.5rem] border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/40 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#B91C1C]">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Add New Category or Subcategory</h3>
              <p className="text-xs font-semibold text-slate-400">Configure multilingual names, parent category, and Megamenu visibility.</p>
            </div>
          </div>

          {/* Form Language Selector */}
          <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
            {(['fr', 'ar', 'en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setFormLang(lang)}
                className={`rounded-xl px-3 py-1 text-xs font-black uppercase transition-all ${
                  formLang === lang ? 'bg-white text-[#B91C1C] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {lang === 'fr' ? '🇫🇷 FR' : lang === 'ar' ? '🇸🇦 AR' : '🇬🇧 EN'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Dynamic Language Name Inputs */}
          {formLang === 'fr' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nom de la catégorie (FR 🇫🇷)</label>
              <input
                type="text"
                value={nameFr}
                onChange={(e) => setNameFr(e.target.value)}
                placeholder="ex. Électronique & High-Tech"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-[#B91C1C] focus:bg-white"
              />
            </div>
          )}
          {formLang === 'ar' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">اسم القسم (العربية AR 🇸🇦)</label>
              <input
                type="text"
                dir="rtl"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: الإلكترونيات والتكنولوجيا"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-[#B91C1C] focus:bg-white"
              />
            </div>
          )}
          {formLang === 'en' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Category Name (EN 🇬🇧)</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Electronics & High-Tech"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-[#B91C1C] focus:bg-white"
              />
            </div>
          )}

          {/* Searchable Parent Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Parent Department (Searchable)</label>
            <SearchableParentCategorySelect
              value={parentId}
              onChange={(id) => setParentId(id)}
              options={flattenedCategoryOptions}
            />
          </div>

          {/* Megamenu Visibility Selector Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Megamenu Visibility</label>
            <button
              type="button"
              onClick={() => setShowInMegamenu(!showInMegamenu)}
              className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-extrabold transition-all ${
                showInMegamenu
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 bg-slate-100 text-slate-500'
              }`}
            >
              <span className="flex items-center gap-2">
                {showInMegamenu ? <Eye className="h-4 w-4 text-indigo-600" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                <span>{showInMegamenu ? 'Show in Public Megamenu' : 'Hide from Public Megamenu'}</span>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${showInMegamenu ? 'bg-indigo-200 text-indigo-950' : 'bg-slate-200 text-slate-600'}`}>
                {showInMegamenu ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Picture Preview Placeholder for Category Image */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Category Picture (Hero Preview)</label>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                {imageUrl ? (
                  <img src={imageUrl} alt="Category preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-slate-300">
                    <ImageIcon className="h-6 w-6" />
                    <span className="text-[9px] font-bold">No Image</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <p className="text-xs font-black text-slate-800">
                  {imageUrl ? 'Picture Selected' : 'No Picture Selected'}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold truncate max-w-xs">{imageUrl || 'Upload or select a picture from gallery.'}</p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAssetPickerTarget('new')}
                    className="inline-flex items-center rounded-lg bg-[#B91C1C] px-3 py-1.5 text-xs font-black text-white hover:bg-red-800"
                  >
                    <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                    {imageUrl ? 'Change Picture' : 'Choose / Upload Asset'}
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-end md:col-span-1">
            <button
              type="button"
              onClick={createCategory}
              disabled={savingId === 'new' || (!nameFr.trim() && !nameAr.trim() && !nameEn.trim())}
              className="w-full inline-flex items-center justify-center rounded-xl bg-[#B91C1C] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-red-900/20 transition-all hover:-translate-y-0.5 hover:bg-[#991B1B] disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {savingId === 'new' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
              Publish Category
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, View Modes */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[280px] flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by FR, AR, EN name or slug..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#B91C1C] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none hover:bg-white"
          >
            <option value="all">All Types</option>
            <option value="root">Departments Only</option>
            <option value="sub">Subcategories Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none hover:bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                viewMode === 'tree' ? 'bg-white text-[#B91C1C] shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FolderTree className="h-4 w-4" />
              Tree View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                viewMode === 'table' ? 'bg-white text-[#B91C1C] shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutList className="h-4 w-4" />
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* Main Categories Display Container */}
      <div className="rounded-[2.5rem] border border-slate-200/60 bg-white p-6 shadow-xl shadow-slate-200/40">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-[#B91C1C]" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-20 text-center text-xs font-semibold text-slate-400">
            No categories found matching criteria.
          </div>
        ) : viewMode === 'tree' ? (
          /* TREE VIEW 🌳 */
          <div className="space-y-4">
            {categoryTree.map((root) => (
              <RecursiveCategoryItem
                key={root.id}
                node={root}
                depth={0}
                collapsedParents={collapsedParents}
                toggleParentCollapse={toggleParentCollapse}
                setAssetPickerTarget={setAssetPickerTarget}
                movePosition={movePosition}
                updateCategory={updateCategory}
                requestDelete={requestDelete}
                setParentId={setParentId}
                setEditingCategory={setEditingCategory}
                filteredCategories={filteredCategories}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        ) : (
          /* DENSE TABLE VIEW 📋 */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Category Details</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Parent</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Megamenu</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.map((category) => {
                  const isMegamenuVisible = category.show_in_megamenu ?? true;
                  return (
                    <tr key={category.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="shrink-0">
                            {category.image_url ? (
                              <img src={category.image_url} alt={category.name} className="h-12 w-12 rounded-xl object-cover border border-slate-200" />
                            ) : (
                              <div className="h-12 w-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-300">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{category.name}</p>
                            <p className="text-xs font-mono text-slate-400">/{category.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">
                        {category.parent_name ? (
                          <span className="rounded-md bg-amber-50 px-2.5 py-1 text-amber-800 border border-amber-200">
                            └─ {category.parent_name}
                          </span>
                        ) : (
                          <span className="text-slate-400">Top-Level</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => updateCategory(category, { show_in_megamenu: !isMegamenuVisible })}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold transition-colors ${
                            isMegamenuVisible
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 bg-slate-100 text-slate-400'
                          }`}
                        >
                          {isMegamenuVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          <span>{isMegamenuVisible ? 'Visible' : 'Hidden'}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => updateCategory(category, { is_active: !category.is_active })}
                          disabled={category.is_default}
                          className={`rounded-full border px-3 py-1 text-xs font-extrabold ${
                            category.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'
                          }`}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCategory(category)}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-[#B91C1C]"
                          >
                            <Settings2 className="h-4 w-4" />
                          </button>
                          {!category.is_default && (
                            <button
                              type="button"
                              onClick={() => requestDelete(category)}
                              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comprehensive Category Edit Drawer / Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#B91C1C]">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Edit Category — {editingCategory.name}</h3>
                  <p className="text-xs font-semibold text-slate-400">Update parent category, Megamenu visibility, and picture preview.</p>
                </div>
              </div>
              <button type="button" onClick={() => setEditingCategory(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Parent Category & Megamenu Visibility */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Parent Department (Searchable)</label>
                <SearchableParentCategorySelect
                  value={editingCategory.parent_id || ''}
                  onChange={(id) => updateCategory(editingCategory, { parent_id: id || null })}
                  options={flattenedCategoryOptions}
                  currentCategoryId={editingCategory.id}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Megamenu Visibility</label>
                <button
                  type="button"
                  onClick={() => updateCategory(editingCategory, { show_in_megamenu: !(editingCategory.show_in_megamenu ?? true) })}
                  className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-extrabold transition-all ${
                    (editingCategory.show_in_megamenu ?? true)
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-slate-100 text-slate-500'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {(editingCategory.show_in_megamenu ?? true) ? <Eye className="h-4 w-4 text-indigo-600" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                    <span>{(editingCategory.show_in_megamenu ?? true) ? 'Visible in Megamenu' : 'Hidden from Megamenu'}</span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${(editingCategory.show_in_megamenu ?? true) ? 'bg-indigo-200 text-indigo-950' : 'bg-slate-200 text-slate-600'}`}>
                    {(editingCategory.show_in_megamenu ?? true) ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            </div>

            {/* Category Image Picture Preview Placeholder */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Category Picture (Hero Preview)</label>
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                  {editingCategory.image_url ? (
                    <img src={editingCategory.image_url} alt={editingCategory.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-300">
                      <ImageIcon className="h-7 w-7" />
                      <span className="text-[9px] font-bold">No Image</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <p className="text-xs font-black text-slate-800">
                    {editingCategory.image_url ? 'Picture Set' : 'No Picture Selected'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold truncate max-w-sm">{editingCategory.image_url || 'Choose an image from gallery.'}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAssetPickerTarget(editingCategory.id)}
                      className="inline-flex items-center rounded-lg bg-[#B91C1C] px-3.5 py-1.5 text-xs font-black text-white hover:bg-red-800"
                    >
                      <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                      {editingCategory.image_url ? 'Change Picture' : 'Choose / Upload Asset'}
                    </button>
                    {editingCategory.image_url && (
                      <button
                        type="button"
                        onClick={() => updateCategory(editingCategory, { image_url: null })}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Warning Modal */}
      {deleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Category</h3>
                <p className="text-xs font-semibold text-slate-500">"{deleteWarning.name}"</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              Are you sure you want to delete this category? Associated products will be re-assigned to Non Categorized.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeleteWarning(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId === deleteWarning.id}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId === deleteWarning.id ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Central Asset Picker Modal */}
      <MarketplaceAssetPicker
        open={Boolean(assetPickerTarget)}
        title="Choose Category Image"
        type="image"
        onClose={() => setAssetPickerTarget(null)}
        onSelect={(url) => {
          if (assetPickerTarget === 'new') {
            setImageUrl(url);
          } else if (assetPickerTarget && editingCategory) {
            updateCategory(editingCategory, { image_url: url });
          } else if (assetPickerTarget) {
            const targetCat = categories.find((c) => c.id === assetPickerTarget);
            if (targetCat) updateCategory(targetCat, { image_url: url });
          }
          setAssetPickerTarget(null);
        }}
      />
    </div>
  );
}
