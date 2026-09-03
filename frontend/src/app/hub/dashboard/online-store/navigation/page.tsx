'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import {
  Navigation,
  Plus,
  Trash2,
  Save,
  Send,
  RefreshCw,
  PanelBottom,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { UnsavedChangesBanner } from '@/components/dashboard/UnsavedChangesBanner';
import { ReferenceSelector } from '@/components/dashboard/ReferenceSelector';
import { useLocale } from '@/contexts/LocaleContext';

// ─── Types ─────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  type: 'page' | 'product' | 'category' | 'collection' | 'custom_url';
  localized_label: string;
  url: string;
  reference_id?: string | null;
  target?: '_self' | '_blank';
  image?: string | null;
  sort_order?: number;
  children?: MenuItem[];
}

interface Menu {
  id: string;
  location: 'header' | 'footer' | 'mobile' | 'utility';
  items: MenuItem[];
}

type FooterBlockType =
  | 'menu'
  | 'text'
  | 'contact'
  | 'social'
  | 'newsletter'
  | 'payment_badges'
  | 'legal'
  | 'map';

interface FooterBlock {
  id: string;
  type: FooterBlockType;
  title: string;
  content: Record<string, unknown>;
  sort_order: number;
}

// ─── Constants ──────────────────────────────────────────────────────

// Footer block types — labels resolved at render time via t() for i18n
const FOOTER_BLOCK_TYPES: { value: FooterBlockType; labelKey: string; descKey: string }[] = [
  { value: 'text', labelKey: 'storefrontNav.footerBlock.text.label', descKey: 'storefrontNav.footerBlock.text.desc' },
  { value: 'menu', labelKey: 'storefrontNav.footerBlock.menu.label', descKey: 'storefrontNav.footerBlock.menu.desc' },
  { value: 'contact', labelKey: 'storefrontNav.footerBlock.contact.label', descKey: 'storefrontNav.footerBlock.contact.desc' },
  { value: 'social', labelKey: 'storefrontNav.footerBlock.social.label', descKey: 'storefrontNav.footerBlock.social.desc' },
  { value: 'newsletter', labelKey: 'storefrontNav.footerBlock.newsletter.label', descKey: 'storefrontNav.footerBlock.newsletter.desc' },
  { value: 'payment_badges', labelKey: 'storefrontNav.footerBlock.payment_badges.label', descKey: 'storefrontNav.footerBlock.payment_badges.desc' },
  { value: 'legal', labelKey: 'storefrontNav.footerBlock.legal.label', descKey: 'storefrontNav.footerBlock.legal.desc' },
  { value: 'map', labelKey: 'storefrontNav.footerBlock.map.label', descKey: 'storefrontNav.footerBlock.map.desc' },
];

// ─── Helpers ───────────────────────────────────────────────────────

function extractLabel(raw: unknown): string {
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, string>;
    return obj.fr || obj.en || '';
  }
  return typeof raw === 'string' ? raw : '';
}

function mapItems(raw: Array<Record<string, unknown>>): MenuItem[] {
  return raw.map((item) => ({
    id: (item.id as string) || `item_${crypto.randomUUID()}`,
    type: (item.type as MenuItem['type']) || 'custom_url',
    localized_label: extractLabel(item.localized_label ?? item.label),
    url: (item.url as string) || '',
    reference_id: (item.reference_id as string | null) || null,
    target: (item.target as MenuItem['target']) || '_self',
    image: (item.image as string | null) || null,
    children: Array.isArray(item.children) ? mapItems(item.children as Array<Record<string, unknown>>) : [],
  }));
}

function updateItemInTree(
  items: MenuItem[],
  itemId: string,
  field: keyof MenuItem,
  value: string,
): MenuItem[] {
  return items.map((item) => {
    if (item.id === itemId) {
      return { ...item, [field]: value };
    }
    if (item.children && item.children.length > 0) {
      return { ...item, children: updateItemInTree(item.children, itemId, field, value) };
    }
    return item;
  });
}

function removeItemFromTree(items: MenuItem[], itemId: string): MenuItem[] {
  return items
    .filter((item) => item.id !== itemId)
    .map((item) =>
      item.children && item.children.length > 0
        ? { ...item, children: removeItemFromTree(item.children, itemId) }
        : item,
    );
}

function addChildToTree(items: MenuItem[], parentId: string, child: MenuItem): MenuItem[] {
  return items.map((item) => {
    if (item.id === parentId) {
      return { ...item, children: [...(item.children ?? []), child] };
    }
    if (item.children && item.children.length > 0) {
      return { ...item, children: addChildToTree(item.children, parentId, child) };
    }
    return item;
  });
}

// ─── Main Component ─────────────────────────────────────────────────

export default function NavigationManagerPage() {
  const { t, dir } = useLocale();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [initialMenus, setInitialMenus] = useState<Menu[]>([]);
  const [footerBlocks, setFooterBlocks] = useState<FooterBlock[]>([]);
  const [initialFooterBlocks, setInitialFooterBlocks] = useState<FooterBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const fetchDraftNavigation = useCallback(async () => {
    try {
      const [navRes, footerRes] = await Promise.all([
        fetchWithCsrf('/api/pd/stores/me/navigation/draft', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/stores/me/footer/draft', { credentials: 'include' }),
      ]);

      // ── Menus ──
      let loadedMenus: Menu[] = [];
      if (navRes.ok) {
        const data = await navRes.json();
        const rawMenus: Array<{ id?: string; location: Menu['location']; items?: Array<Record<string, unknown>> }> =
          data.navigation?.menus || data.menus || [];
        loadedMenus = rawMenus.map((m) => ({
          id: m.id || `menu_${m.location}`,
          location: m.location,
          items: mapItems((m.items || []) as Array<Record<string, unknown>>),
        }));
      }
      // Ensure all 4 locations exist
      const locations: Menu['location'][] = ['header', 'footer', 'mobile', 'utility'];
      for (const loc of locations) {
        if (!loadedMenus.find((m) => m.location === loc)) {
          loadedMenus.push({ id: `menu_${loc}`, location: loc, items: [] });
        }
      }

      // ── Footer Blocks ──
      let loadedBlocks: FooterBlock[] = [];
      if (footerRes.ok) {
        const data = await footerRes.json();
        const rawBlocks: Array<Record<string, unknown>> = data.blocks || data.footer?.blocks || [];
        loadedBlocks = rawBlocks.map((b, i) => ({
          id: (b.id as string) || `block_${i}`,
          type: (b.type as FooterBlockType) || 'text',
          title: (b.title as string) || '',
          content: (b.content as Record<string, unknown>) || {},
          sort_order: typeof b.sort_order === 'number' ? b.sort_order : i,
        }));
      }

      setMenus(loadedMenus);
      setInitialMenus(loadedMenus);
      setFooterBlocks(loadedBlocks);
      setInitialFooterBlocks(loadedBlocks);
    } catch {
      const defaults: Menu[] = [
        { id: 'menu_header', location: 'header', items: [{ id: '1', type: 'custom_url', localized_label: 'Accueil', url: '/' }] },
        { id: 'menu_footer', location: 'footer', items: [{ id: '2', type: 'custom_url', localized_label: 'Contact', url: '/pages/contact' }] },
        { id: 'menu_mobile', location: 'mobile', items: [] },
        { id: 'menu_utility', location: 'utility', items: [] },
      ];
      setMenus(defaults);
      setInitialMenus(defaults);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDraftNavigation();
  }, [fetchDraftNavigation]);

  // ─── Menu Item Handlers ────────────────────────────────────────────

  const handleAddItem = (location: Menu['location']) => {
    const newItem: MenuItem = {
      id: `item_${crypto.randomUUID()}`,
      type: 'custom_url',
      localized_label: 'Nouveau lien',
      url: '/',
      target: '_self',
    };
    setMenus((prev) =>
      prev.map((m) => (m.location === location ? { ...m, items: [...(m.items || []), newItem] } : m)),
    );
    setIsDirty(true);
  };

  const handleUpdateItem = (location: Menu['location'], itemId: string, field: keyof MenuItem, value: string) => {
    setMenus((prev) =>
      prev.map((m) => {
        if (m.location !== location) return m;
        // When the type changes, also clear the reference_id so stale
        // references (e.g. a page ID when switching to product) don't persist.
        const items =
          field === 'type'
            ? updateItemInTree(updateItemInTree(m.items, itemId, 'reference_id', ''), itemId, 'type', value)
            : updateItemInTree(m.items, itemId, field, value);
        return { ...m, items };
      }),
    );
    setIsDirty(true);
  };

  const handleRemoveItem = (location: Menu['location'], itemId: string) => {
    setMenus((prev) =>
      prev.map((m) =>
        m.location === location ? { ...m, items: removeItemFromTree(m.items, itemId) } : m,
      ),
    );
    setIsDirty(true);
  };

  const handleAddChildItem = (location: Menu['location'], parentId: string) => {
    const newChild: MenuItem = {
      id: `item_${crypto.randomUUID()}`,
      type: 'custom_url',
      localized_label: 'Sous-lien',
      url: '/',
      target: '_self',
    };
    setMenus((prev) =>
      prev.map((m) => {
        if (m.location !== location) return m;
        return {
          ...m,
          items: addChildToTree(m.items, parentId, newChild),
        };
      }),
    );
    setIsDirty(true);
  };

  // ─── Footer Block Handlers ──────────────────────────────────────────

  const handleAddBlock = () => {
    const newBlock: FooterBlock = {
      id: `block_${crypto.randomUUID()}`,
      type: 'text',
      title: 'Nouveau bloc',
      content: {},
      sort_order: footerBlocks.length,
    };
    setFooterBlocks((prev) => [...prev, newBlock]);
    setIsDirty(true);
  };

  const handleUpdateBlock = (blockId: string, field: keyof FooterBlock, value: unknown) => {
    setFooterBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, [field]: value } : b)),
    );
    setIsDirty(true);
  };

  const handleUpdateBlockContent = (blockId: string, key: string, value: unknown) => {
    setFooterBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, content: { ...b.content, [key]: value } } : b,
      ),
    );
    setIsDirty(true);
  };

  const handleRemoveBlock = (blockId: string) => {
    setFooterBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setIsDirty(true);
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    setFooterBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === blockId);
      if (index === -1) return prev;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr.map((b, i) => ({ ...b, sort_order: i }));
    });
    setIsDirty(true);
  };

  // ─── Save & Publish ────────────────────────────────────────────────

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const navPayload = { menus: menus.map(({ id, location, items }) => ({ id, location, items })) };
      const [navRes, footerRes] = await Promise.all([
        fetchWithCsrf('/api/pd/stores/me/navigation/draft', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(navPayload),
        }),
        fetchWithCsrf('/api/pd/stores/me/footer/draft', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ blocks: footerBlocks }),
        }),
      ]);
      if (navRes.ok && footerRes.ok) {
        setInitialMenus(menus);
        setInitialFooterBlocks(footerBlocks);
        setIsDirty(false);
        setFeedback({ message: t('storefrontNav.saved') });
      } else {
        const errData = await navRes.json().catch(() => ({}));
        setFeedback({ message: errData.error?.message || t('storefrontNav.errorSave'), isError: true });
      }
    } catch {
      setFeedback({ message: t('storefrontNav.errorNetwork'), isError: true });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (isDirty) {
        await handleSaveDraft();
      }
      const res = await fetchWithCsrf('/api/pd/stores/me/content/publish', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setFeedback({ message: t('storefrontNav.published') });
      } else {
        setFeedback({ message: t('storefrontNav.errorPublish'), isError: true });
      }
    } catch {
      setFeedback({ message: t('storefrontNav.errorNetwork'), isError: true });
    } finally {
      setPublishing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleReset = () => {
    setMenus(initialMenus);
    setFooterBlocks(initialFooterBlocks);
    setIsDirty(false);
  };

  // ─── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div dir={dir} className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  const locations: { key: Menu['location']; label: string; desc: string }[] = [
    { key: 'header', label: t('storefrontNav.locations.header'), desc: t('storefrontNav.locations.headerDesc') },
    { key: 'mobile', label: t('storefrontNav.locations.mobile'), desc: t('storefrontNav.locations.mobileDesc') },
    { key: 'footer', label: t('storefrontNav.locations.footer'), desc: t('storefrontNav.locations.footerDesc') },
    { key: 'utility', label: t('storefrontNav.locations.utility'), desc: t('storefrontNav.locations.utilityDesc') },
  ];

  return (
    <div dir={dir} className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2 text-slate-900 dark:text-white">
                <Navigation className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('storefrontNav.title')}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('storefrontNav.subtitle')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? t('storefrontNav.saving') : t('storefrontNav.saveDraft')}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {publishing ? t('storefrontNav.publishing') : t('storefrontNav.publishOnline')}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs font-semibold ${
              feedback.isError
                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Menu Editors */}
      <div className="space-y-6">
        {locations.map((loc) => {
          const menuData =
            menus.find((m) => m.location === loc.key) || { id: `menu_${loc.key}`, location: loc.key, items: [] };
          return (
            <div key={loc.key} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">{loc.label}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{loc.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddItem(loc.key)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('storefrontNav.addItem')}
                </button>
              </div>

              {menuData.items.length > 0 ? (
                <div className="space-y-3">
                  {menuData.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex-1 space-y-2 sm:space-y-0 sm:flex sm:gap-3">
                        <select
                          value={item.type}
                          onChange={(e) => handleUpdateItem(loc.key, item.id, 'type', e.target.value)}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white sm:w-32"
                        >
                          <option value="custom_url">{t('storefrontNav.itemType.customUrl')}</option>
                          <option value="page">{t('storefrontNav.itemType.page')}</option>
                          <option value="product">{t('storefrontNav.itemType.product')}</option>
                          <option value="category">{t('storefrontNav.itemType.category')}</option>
                          <option value="collection">{t('storefrontNav.itemType.collection')}</option>
                        </select>
                        <input
                          type="text"
                          value={item.localized_label}
                          onChange={(e) => handleUpdateItem(loc.key, item.id, 'localized_label', e.target.value)}
                          placeholder={t('storefrontNav.labelPlaceholder')}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white sm:w-1/2"
                        />
                        <input
                          type="text"
                          value={item.url}
                          onChange={(e) => handleUpdateItem(loc.key, item.id, 'url', e.target.value)}
                          placeholder={t('storefrontNav.urlPlaceholder')}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white sm:w-1/2"
                        />
                        {item.type !== 'custom_url' && (
                          <div className="w-full sm:w-1/3">
                            <ReferenceSelector
                              key={item.type}
                              type={item.type as 'page' | 'product' | 'category' | 'collection'}
                              value={item.reference_id || ''}
                              onChange={(id) => handleUpdateItem(loc.key, item.id, 'reference_id', id)}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {loc.key === 'header' && (
                          <button
                            type="button"
                            onClick={() => handleAddChildItem(loc.key, item.id)}
                            title={t('storefrontNav.addChild')}
                            className="rounded-xl p-2 text-slate-400 dark:text-slate-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 hover:text-sky-600 dark:hover:text-sky-400 transition"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(loc.key, item.id)}
                          className="rounded-xl p-2 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Nested children (mega menu sub-items) */}
                      {item.children && item.children.length > 0 && (
                        <div className="w-full space-y-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              {t('storefrontNav.subLinks')}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddChildItem(loc.key, item.id)}
                              className="text-[10px] font-bold text-slate-900 dark:text-white hover:underline"
                            >
                              {t('storefrontNav.add')}
                            </button>
                          </div>
                          {item.children.map((child) => (
                            <div key={child.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={child.localized_label}
                                onChange={(e) => handleUpdateItem(loc.key, child.id, 'localized_label', e.target.value)}
                                placeholder={t('storefrontNav.labelPlaceholder')}
                                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:outline-none"
                              />
                              <input
                                type="text"
                                value={child.url}
                                onChange={(e) => handleUpdateItem(loc.key, child.id, 'url', e.target.value)}
                                placeholder={t('storefrontNav.urlPlaceholder')}
                                className="w-32 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(loc.key, child.id)}
                                className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200/80 dark:border-slate-800 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  {t('storefrontNav.emptyMenu')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Blocks Editor */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2 text-slate-900 dark:text-white">
                <PanelBottom className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('storefrontNav.footerBlocks')}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('storefrontNav.footerBlocksDesc')}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddBlock}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('storefrontNav.addBlock')}
          </button>
        </div>

        {footerBlocks.length > 0 ? (
          <div className="space-y-4">
            {footerBlocks.map((block, idx) => (
              <div key={block.id} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 p-4">
                {/* Block header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => handleMoveBlock(block.id, 'up')}
                      disabled={idx === 0}
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <GripVertical className="h-3 w-3 text-slate-300 dark:text-slate-600" />
                    <button
                      type="button"
                      onClick={() => handleMoveBlock(block.id, 'down')}
                      disabled={idx === footerBlocks.length - 1}
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                  <select
                    value={block.type}
                    onChange={(e) => handleUpdateBlock(block.id, 'type', e.target.value)}
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white w-40"
                  >
                    {FOOTER_BLOCK_TYPES.map((bt) => (
                      <option key={bt.value} value={bt.value}>
                        {t(bt.labelKey)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={block.title}
                    onChange={(e) => handleUpdateBlock(block.id, 'title', e.target.value)}
                    placeholder={t('storefrontNav.blockTitlePlaceholder')}
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveBlock(block.id)}
                    className="rounded-xl p-2 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Block content editor based on type */}
                <FooterBlockContentEditor
                  block={block}
                  onUpdateContent={(key, value) => handleUpdateBlockContent(block.id, key, value)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200/80 dark:border-slate-800 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            {t('storefrontNav.emptyFooter')}
          </div>
        )}
      </div>

      <UnsavedChangesBanner
        isDirty={isDirty}
        onSave={handleSaveDraft}
        onReset={handleReset}
        saving={saving}
      />
    </div>
  );
}

// ─── Footer Block Content Editor ───────────────────────────────────

function FooterBlockContentEditor({
  block,
  onUpdateContent,
}: {
  block: FooterBlock;
  onUpdateContent: (key: string, value: unknown) => void;
}) {
  const { t } = useLocale();
  const inputClass =
    'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white';

  const content = block.content || {};

  switch (block.type) {
    case 'text':
      return (
        <textarea
          value={String(content.text || content.body || '')}
          onChange={(e) => onUpdateContent('text', e.target.value)}
          placeholder={t('storefrontNav.footerBlock.textPlaceholder')}
          rows={3}
          className={inputClass}
        />
      );

    case 'menu': {
      const links = Array.isArray(content.links) ? content.links : [];
      return (
        <div className="space-y-2">
          {links.map((link: { url?: string; label?: string }, idx: number) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={link.label || ''}
                onChange={(e) => {
                  const newLinks = [...links];
                  newLinks[idx] = { ...newLinks[idx], label: e.target.value };
                  onUpdateContent('links', newLinks);
                }}
                placeholder={t('storefrontNav.footerBlock.linkLabel')}
                className={`${inputClass} flex-1`}
              />
              <input
                type="text"
                value={link.url || ''}
                onChange={(e) => {
                  const newLinks = [...links];
                  newLinks[idx] = { ...newLinks[idx], url: e.target.value };
                  onUpdateContent('links', newLinks);
                }}
                placeholder={t('storefrontNav.footerBlock.linkUrlPlaceholder')}
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => {
                  const newLinks = links.filter((_, i) => i !== idx);
                  onUpdateContent('links', newLinks);
                }}
                className="rounded-xl p-2 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onUpdateContent('links', [...links, { label: '', url: '/' }])}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Plus className="h-3 w-3" />
            {t('storefrontNav.footerBlock.addLink')}
          </button>
        </div>
      );
    }

    case 'contact':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="email"
            value={String(content.email || '')}
            onChange={(e) => onUpdateContent('email', e.target.value)}
            placeholder={t('storefrontNav.footerBlock.contactEmailPlaceholder')}
            className={inputClass}
          />
          <input
            type="tel"
            value={String(content.phone || '')}
            onChange={(e) => onUpdateContent('phone', e.target.value)}
            placeholder={t('storefrontNav.footerBlock.contactPhonePlaceholder')}
            className={inputClass}
          />
          <input
            type="text"
            value={String(content.address || '')}
            onChange={(e) => onUpdateContent('address', e.target.value)}
            placeholder={t('storefrontNav.footerBlock.contactAddressPlaceholder')}
            className={inputClass}
          />
        </div>
      );

    case 'social':
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(['facebook', 'instagram', 'x', 'tiktok', 'youtube', 'whatsapp'] as const).map((platform) => (
            <input
              key={platform}
              type="text"
              value={String((content as Record<string, string>)[platform] || '')}
              onChange={(e) => onUpdateContent(platform, e.target.value)}
              placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
              className={inputClass}
            />
          ))}
        </div>
      );

    case 'newsletter':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={String(content.title || '')}
            onChange={(e) => onUpdateContent('title', e.target.value)}
            placeholder={t('storefrontNav.footerBlock.newsletterTitlePlaceholder')}
            className={inputClass}
          />
          <input
            type="text"
            value={String(content.button_label || '')}
            onChange={(e) => onUpdateContent('button_label', e.target.value)}
            placeholder={t('storefrontNav.footerBlock.newsletterButtonPlaceholder')}
            className={inputClass}
          />
          <input
            type="text"
            value={String(content.placeholder || '')}
            onChange={(e) => onUpdateContent('placeholder', e.target.value)}
            placeholder={t('storefrontNav.footerBlock.newsletterEmailPlaceholder')}
            className={inputClass}
          />
        </div>
      );

    case 'payment_badges':
      return (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('storefrontNav.footerBlock.paymentBadgesDesc')}
          </p>
          <input
            type="text"
            value={String(content.note || '')}
            onChange={(e) => onUpdateContent('note', e.target.value)}
            placeholder={t('storefrontNav.footerBlock.paymentBadgesNotePlaceholder')}
            className={inputClass}
          />
        </div>
      );

    case 'legal':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={String(content.cgv_url || '')}
            onChange={(e) => onUpdateContent('cgv_url', e.target.value)}
            placeholder={t('storefrontNav.footerBlock.legalCgvPlaceholder')}
            className={inputClass}
          />
          <input
            type="text"
            value={String(content.privacy_url || '')}
            onChange={(e) => onUpdateContent('privacy_url', e.target.value)}
            placeholder={t('storefrontNav.footerBlock.legalPrivacyPlaceholder')}
            className={inputClass}
          />
          <input
            type="text"
            value={String(content.refund_url || '')}
            onChange={(e) => onUpdateContent('refund_url', e.target.value)}
            placeholder={t('storefrontNav.footerBlock.legalRefundPlaceholder')}
            className={inputClass}
          />
        </div>
      );

    case 'map':
      return (
        <input
          type="text"
          value={String(content.map_embed_url || '')}
          onChange={(e) => onUpdateContent('map_embed_url', e.target.value)}
          placeholder={t('storefrontNav.footerBlock.mapEmbedPlaceholder')}
          className={inputClass}
        />
      );

    default:
      return null;
  }
}
