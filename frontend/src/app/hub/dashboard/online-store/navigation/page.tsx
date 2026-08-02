'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { Navigation, Plus, Trash2, Save, Send, RefreshCw } from 'lucide-react';
import { UnsavedChangesBanner } from '@/components/dashboard/UnsavedChangesBanner';

interface MenuItem {
  id: string;
  type: 'page' | 'product' | 'category' | 'collection' | 'custom_url';
  localized_label: string;
  url: string;
  reference_id?: string | null;
  target?: '_self' | '_blank';
}

interface Menu {
  id: string;
  location: 'header' | 'footer' | 'mobile' | 'utility';
  items: MenuItem[];
}

export default function NavigationManagerPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [initialMenus, setInitialMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const fetchDraftNavigation = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/navigation/draft', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const rawMenus: Array<{ id?: string; location: Menu['location']; items?: Array<Record<string, unknown>> }> = data.navigation?.menus || [
          { id: 'menu_header', location: 'header', items: [] },
          { id: 'menu_footer', location: 'footer', items: [] },
          { id: 'menu_mobile', location: 'mobile', items: [] },
        ];
        // Normalize localized_label: backend may return { fr: "...", en: "..." } object
        const loadedMenus: Menu[] = rawMenus.map((m) => ({
          id: m.id || `menu_${m.location}`,
          location: m.location,
          items: ((m.items || []) as Array<Record<string, unknown>>).map((item) => {
            const rawLabel = item.localized_label;
            const label: string = typeof rawLabel === 'object' && rawLabel !== null
              ? (((rawLabel as Record<string, string>).fr) || ((rawLabel as Record<string, string>).en) || '')
              : (typeof rawLabel === 'string' ? rawLabel : (typeof item.label === 'string' ? item.label : ''));
            return {
              ...(item as object),
              id: (item.id as string) || `item_${Math.random()}`,
              type: (item.type as MenuItem['type']) || 'custom_url',
              localized_label: label,
              url: (item.url as string) || '',
              reference_id: (item.reference_id as string | null) || null,
              target: (item.target as MenuItem['target']) || '_self',
            } as MenuItem;
          }),
        }));
        setMenus(loadedMenus);
        setInitialMenus(loadedMenus);
      }
    } catch {
      // Fallback defaults
      const defaults: Menu[] = [
        { id: 'menu_header', location: 'header', items: [{ id: '1', type: 'custom_url', localized_label: 'Accueil', url: '/' }] },
        { id: 'menu_footer', location: 'footer', items: [{ id: '2', type: 'custom_url', localized_label: 'Contact', url: '/pages/contact' }] },
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

  const handleAddItem = (location: Menu['location']) => {
    const newItem: MenuItem = {
      id: `item_${crypto.randomUUID()}`,
      type: 'custom_url',
      localized_label: 'Nouveau lien',
      url: '/',
      target: '_self',
    };
    setMenus((prev) =>
      prev.map((m) =>
        m.location === location ? { ...m, items: [...(m.items || []), newItem] } : m,
      ),
    );
    setIsDirty(true);
  };

  const handleUpdateItem = (
    location: Menu['location'],
    itemId: string,
    field: keyof MenuItem,
    value: string,
  ) => {
    setMenus((prev) =>
      prev.map((m) => {
        if (m.location !== location) return m;
        return {
          ...m,
          items: m.items.map((item) =>
            item.id === itemId ? { ...item, [field]: value } : item,
          ),
        };
      }),
    );
    setIsDirty(true);
  };

  const handleRemoveItem = (location: Menu['location'], itemId: string) => {
    setMenus((prev) =>
      prev.map((m) =>
        m.location === location
          ? { ...m, items: m.items.filter((item) => item.id !== itemId) }
          : m,
      ),
    );
    setIsDirty(true);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/navigation/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ menus }),
      });
      if (res.ok) {
        setInitialMenus(menus);
        setIsDirty(false);
        setFeedback({ message: 'Brouillon de navigation sauvegardé.' });
      } else {
        setFeedback({ message: 'Erreur lors de la sauvegarde du brouillon', isError: true });
      }
    } catch {
      setFeedback({ message: 'Erreur réseau', isError: true });
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
        setFeedback({ message: 'Navigation publiée en ligne !' });
      } else {
        setFeedback({ message: 'Erreur lors de la publication', isError: true });
      }
    } catch {
      setFeedback({ message: 'Erreur réseau', isError: true });
    } finally {
      setPublishing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleReset = () => {
    setMenus(initialMenus);
    setIsDirty(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const locations: { key: Menu['location']; label: string; desc: string }[] = [
    { key: 'header', label: 'Menu principal (En-tête)', desc: 'Affiché dans la barre de navigation supérieure' },
    { key: 'footer', label: 'Menu Pied de page', desc: 'Affiché en bas de chaque page de la boutique' },
    { key: 'mobile', label: 'Menu Drawer Mobile', desc: 'Affiché dans le tiroir de navigation mobile' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-[#B91C1C]/10 p-2 text-[#B91C1C]">
                <Navigation className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900">Menus & Navigation</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Configurez l&apos;arborescence des liens de votre boutique pour l&apos;en-tête, le footer et le mobile.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder brouillon'}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#991B1B] transition shadow-sm disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {publishing ? 'Publication...' : 'Publier la navigation'}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs font-semibold ${
              feedback.isError
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Menu Editors */}
      <div className="space-y-6">
        {locations.map((loc) => {
          const menuData = menus.find((m) => m.location === loc.key) || {
            id: `menu_${loc.key}`,
            location: loc.key,
            items: [],
          };
          return (
            <div key={loc.key} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{loc.label}</h2>
                  <p className="text-xs text-slate-500">{loc.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddItem(loc.key)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-[#B91C1C]/10 hover:text-[#B91C1C] transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un lien
                </button>
              </div>

              {menuData.items.length > 0 ? (
                <div className="space-y-3">
                  {menuData.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex-1 space-y-2 sm:space-y-0 sm:flex sm:gap-3">
                        <select
                          value={item.type}
                          onChange={(e) =>
                            handleUpdateItem(loc.key, item.id, 'type', e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C] sm:w-32"
                        >
                          <option value="custom_url">URL libre</option>
                          <option value="page">Page</option>
                          <option value="product">Produit</option>
                          <option value="category">Catégorie</option>
                          <option value="collection">Collection</option>
                        </select>
                        <input
                          type="text"
                          value={item.localized_label}
                          onChange={(e) =>
                            handleUpdateItem(loc.key, item.id, 'localized_label', e.target.value)
                          }
                          placeholder="Intitulé du lien"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C] sm:w-1/2"
                        />
                        <input
                          type="text"
                          value={item.url}
                          onChange={(e) =>
                            handleUpdateItem(loc.key, item.id, 'url', e.target.value)
                          }
                          placeholder="URL (ex: /pages/contact ou https://...)"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C] sm:w-1/2"
                        />
                        {item.type !== 'custom_url' && (
                          <input
                            type="text"
                            value={item.reference_id || ''}
                            onChange={(e) =>
                              handleUpdateItem(loc.key, item.id, 'reference_id', e.target.value)
                            }
                            placeholder="ID de référence (ex: ID du produit/page)"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C] sm:w-1/3"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(loc.key, item.id)}
                        className="self-end sm:self-auto rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                  Aucun lien dans ce menu. Cliquez sur &quot;Ajouter un lien&quot; pour commencer.
                </div>
              )}
            </div>
          );
        })}
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
