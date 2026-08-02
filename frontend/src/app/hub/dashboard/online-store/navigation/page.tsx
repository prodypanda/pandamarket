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

// ─── Types ─────────────────────────────────────────────────────────

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

const FOOTER_BLOCK_TYPES: { value: FooterBlockType; label: string; desc: string }[] = [
  { value: 'text', label: 'Texte libre', desc: 'Paragraphe de texte arbitraire' },
  { value: 'menu', label: 'Menu de liens', desc: 'Liste de liens vers des pages/produits' },
  { value: 'contact', label: 'Contact', desc: 'Email, téléphone et adresse' },
  { value: 'social', label: 'Réseaux sociaux', desc: 'Icônes vers vos profils sociaux' },
  { value: 'newsletter', label: 'Newsletter', desc: 'Formulaire d\'inscription email' },
  { value: 'payment_badges', label: 'Badges de paiement', desc: 'Logos des méthodes de paiement' },
  { value: 'legal', label: 'Mentions légales', desc: 'Liens vers CGV, confidentialité, etc.' },
  { value: 'map', label: 'Carte Google Maps', desc: 'Embed Google Maps de votre boutique' },
];

// ─── Main Component ─────────────────────────────────────────────────

export default function NavigationManagerPage() {
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
          items: ((m.items || []) as Array<Record<string, unknown>>).map((item) => {
            const rawLabel = item.localized_label;
            const label: string =
              typeof rawLabel === 'object' && rawLabel !== null
                ? (rawLabel as Record<string, string>).fr ||
                  (rawLabel as Record<string, string>).en ||
                  ''
                : typeof rawLabel === 'string'
                  ? rawLabel
                  : typeof item.label === 'string'
                    ? item.label
                    : '';
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
        return {
          ...m,
          items: m.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
        };
      }),
    );
    setIsDirty(true);
  };

  const handleRemoveItem = (location: Menu['location'], itemId: string) => {
    setMenus((prev) =>
      prev.map((m) =>
        m.location === location ? { ...m, items: m.items.filter((item) => item.id !== itemId) } : m,
      ),
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
        setFeedback({ message: 'Brouillons (menus + footer) sauvegardés.' });
      } else {
        const errData = await navRes.json().catch(() => ({}));
        setFeedback({ message: errData.error?.message || 'Erreur lors de la sauvegarde du brouillon', isError: true });
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
        setFeedback({ message: 'Navigation & Footer publiés en ligne !' });
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
    setFooterBlocks(initialFooterBlocks);
    setIsDirty(false);
  };

  // ─── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const locations: { key: Menu['location']; label: string; desc: string }[] = [
    { key: 'header', label: 'Menu principal (En-tête)', desc: 'Affiché dans la barre de navigation supérieure' },
    { key: 'mobile', label: 'Menu Drawer Mobile', desc: 'Affiché dans le tiroir de navigation mobile' },
    { key: 'footer', label: 'Menu Pied de page (liens)', desc: 'Liens affichés dans le menu du pied de page' },
    { key: 'utility', label: 'Menu utilitaire', desc: 'Barre utilitaire au-dessus de l\'en-tête (contact, réseaux)' },
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
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Menus & Navigation</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Configurez les menus de l&apos;en-tête, du pied de page, du mobile et les blocs du footer.
                </p>
              </div>
            </div>
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
              {publishing ? 'Publication...' : 'Publier en ligne'}
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
          const menuData =
            menus.find((m) => m.location === loc.key) || { id: `menu_${loc.key}`, location: loc.key, items: [] };
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
                          onChange={(e) => handleUpdateItem(loc.key, item.id, 'type', e.target.value)}
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
                          onChange={(e) => handleUpdateItem(loc.key, item.id, 'localized_label', e.target.value)}
                          placeholder="Intitulé du lien"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C] sm:w-1/2"
                        />
                        <input
                          type="text"
                          value={item.url}
                          onChange={(e) => handleUpdateItem(loc.key, item.id, 'url', e.target.value)}
                          placeholder="URL (ex: /pages/contact ou https://...)"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C] sm:w-1/2"
                        />
                        {item.type !== 'custom_url' && (
                          <div className="w-full sm:w-1/3">
                            <ReferenceSelector
                              type={item.type as 'page' | 'product' | 'category' | 'collection'}
                              value={item.reference_id || ''}
                              onChange={(id) => handleUpdateItem(loc.key, item.id, 'reference_id', id)}
                            />
                          </div>
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

      {/* Footer Blocks Editor */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-[#B91C1C]/10 p-2 text-[#B91C1C]">
                <PanelBottom className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Blocs du Footer</h2>
                <p className="text-xs text-slate-500">
                  Colonnes affichées en bas de chaque page de la boutique
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddBlock}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-[#B91C1C]/10 hover:text-[#B91C1C] transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un bloc
          </button>
        </div>

        {footerBlocks.length > 0 ? (
          <div className="space-y-4">
            {footerBlocks.map((block, idx) => (
              <div key={block.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {/* Block header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => handleMoveBlock(block.id, 'up')}
                      disabled={idx === 0}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <GripVertical className="h-3 w-3 text-slate-300" />
                    <button
                      type="button"
                      onClick={() => handleMoveBlock(block.id, 'down')}
                      disabled={idx === footerBlocks.length - 1}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                  <select
                    value={block.type}
                    onChange={(e) => handleUpdateBlock(block.id, 'type', e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C] w-40"
                  >
                    {FOOTER_BLOCK_TYPES.map((bt) => (
                      <option key={bt.value} value={bt.value}>
                        {bt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={block.title}
                    onChange={(e) => handleUpdateBlock(block.id, 'title', e.target.value)}
                    placeholder="Titre du bloc (ex: À propos, Liens utiles, Contact...)"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveBlock(block.id)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
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
          <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
            Aucun bloc de footer. Le footer affichera un contenu par défaut. Cliquez sur &quot;Ajouter un bloc&quot; pour personnaliser.
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
  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]';

  const content = block.content || {};

  switch (block.type) {
    case 'text':
      return (
        <textarea
          value={String(content.text || content.body || '')}
          onChange={(e) => onUpdateContent('text', e.target.value)}
          placeholder="Saisissez le texte de ce bloc..."
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
                placeholder="Intitulé du lien"
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
                placeholder="URL (ex: /pages/contact)"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => {
                  const newLinks = links.filter((_, i) => i !== idx);
                  onUpdateContent('links', newLinks);
                }}
                className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onUpdateContent('links', [...links, { label: '', url: '/' }])}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
          >
            <Plus className="h-3 w-3" />
            Ajouter un lien
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
            placeholder="Email (ex: contact@ma-boutique.tn)"
            className={inputClass}
          />
          <input
            type="tel"
            value={String(content.phone || '')}
            onChange={(e) => onUpdateContent('phone', e.target.value)}
            placeholder="Téléphone"
            className={inputClass}
          />
          <input
            type="text"
            value={String(content.address || '')}
            onChange={(e) => onUpdateContent('address', e.target.value)}
            placeholder="Adresse"
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
            placeholder="Titre du formulaire (ex: Inscrivez-vous à la newsletter)"
            className={inputClass}
          />
          <input
            type="text"
            value={String(content.button_label || '')}
            onChange={(e) => onUpdateContent('button_label', e.target.value)}
            placeholder="Texte du bouton (ex: S'inscrire)"
            className={inputClass}
          />
          <input
            type="text"
            value={String(content.placeholder || '')}
            onChange={(e) => onUpdateContent('placeholder', e.target.value)}
            placeholder="Placeholder du champ email"
            className={inputClass}
          />
        </div>
      );

    case 'payment_badges':
      return (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Les badges de paiement (Flouci, Konnect, Mandat Minute, Espèces à la livraison) sont affichés
            automatiquement. Aucune configuration supplémentaire nécessaire.
          </p>
          <input
            type="text"
            value={String(content.note || '')}
            onChange={(e) => onUpdateContent('note', e.target.value)}
            placeholder="Note optionnelle sous les badges"
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
            placeholder="URL des CGV (ex: /pages/cgv)"
            className={inputClass}
          />
          <input
            type="text"
            value={String(content.privacy_url || '')}
            onChange={(e) => onUpdateContent('privacy_url', e.target.value)}
            placeholder="URL Politique de confidentialité"
            className={inputClass}
          />
          <input
            type="text"
            value={String(content.refund_url || '')}
            onChange={(e) => onUpdateContent('refund_url', e.target.value)}
            placeholder="URL Politique de remboursement"
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
          placeholder="URL embed Google Maps (ex: https://www.google.com/maps/embed?...)"
          className={inputClass}
        />
      );

    default:
      return null;
  }
}
