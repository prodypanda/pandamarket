'use client';

/**
 * Page Builder Dashboard — Vendor page management.
 * ─────────────────────────────────────────────────
 * Lists all custom pages, allows creating new ones,
 * and opens the GrapesJS editor for editing.
 *
 * Plan gate: Only Regular+ plans (has_page_builder = true).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Lock,
  Crown,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { PageBuilderEditor } from '../../../../components/page-builder/PageBuilderEditor';

interface StorePage {
  id: string;
  slug: string;
  title: string;
  builder_data: Record<string, unknown>;
  html: string;
  css: string;
  is_published: boolean;
  is_homepage: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

type View = 'list' | 'editor';

export default function PageBuilderDashboard() {
  const [view, setView] = useState<View>('list');
  const [pages, setPages] = useState<StorePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [editingPage, setEditingPage] = useState<StorePage | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');

  const fetchPages = useCallback(async () => {
    try {
      const res = await fetch('/api/pd/page-builder/pages', { credentials: 'include' });
      if (res.status === 403) {
        setHasAccess(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch pages');
      const data = await res.json();
      setPages(data.data || []);
      setHasAccess(true);
    } catch {
      setHasAccess(true); // Assume access, show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleCreatePage = async () => {
    if (!newPageTitle.trim() || !newPageSlug.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/pd/page-builder/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: newPageTitle, slug: newPageSlug }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error?.message || 'Erreur lors de la création');
        return;
      }
      const data = await res.json();
      setShowCreateModal(false);
      setNewPageTitle('');
      setNewPageSlug('');
      // Open editor immediately for the new page
      setEditingPage(data.page);
      setView('editor');
      fetchPages();
    } catch {
      alert('Erreur réseau');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Supprimer cette page ? Cette action est irréversible.')) return;
    try {
      const res = await fetch(`/api/pd/page-builder/pages/${pageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setPages((prev) => prev.filter((p) => p.id !== pageId));
      }
    } catch {
      alert('Erreur lors de la suppression');
    }
  };

  const handleDuplicatePage = async (pageId: string) => {
    try {
      const res = await fetch(`/api/pd/page-builder/pages/${pageId}/duplicate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        fetchPages();
      }
    } catch {
      alert('Erreur lors de la duplication');
    }
  };

  const handleTogglePublish = async (page: StorePage) => {
    try {
      const res = await fetch(`/api/pd/page-builder/pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_published: !page.is_published }),
      });
      if (res.ok) {
        setPages((prev) =>
          prev.map((p) => (p.id === page.id ? { ...p, is_published: !p.is_published } : p)),
        );
      }
    } catch {
      alert('Erreur');
    }
  };

  const handleSetHomepage = async (page: StorePage) => {
    try {
      const res = await fetch(`/api/pd/page-builder/pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_homepage: !page.is_homepage, is_published: true }),
      });
      if (res.ok) {
        setPages((prev) =>
          prev.map((p) => ({
            ...p,
            is_homepage: p.id === page.id ? !p.is_homepage : false,
          })),
        );
      }
    } catch {
      alert('Erreur');
    }
  };

  const openEditor = async (page: StorePage) => {
    // Fetch full page data (including builder_data)
    try {
      const res = await fetch(`/api/pd/page-builder/pages/${page.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch page');
      const data = await res.json();
      setEditingPage(data.page);
      setView('editor');
    } catch {
      alert('Erreur lors du chargement de la page');
    }
  };

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setNewPageTitle(title);
    if (!newPageSlug || newPageSlug === slugify(newPageTitle)) {
      setNewPageSlug(slugify(title));
    }
  };

  // ─── Editor View ──────────────────────────────────────────

  if (view === 'editor' && editingPage) {
    return (
      <div className="fixed inset-0 z-50">
        <PageBuilderEditor
          pageId={editingPage.id}
          storeId=""
          initialData={{
            builder_data: editingPage.builder_data,
            html: editingPage.html,
            css: editingPage.css,
            title: editingPage.title,
            is_published: editingPage.is_published,
          }}
          onSave={() => fetchPages()}
          onBack={() => {
            setView('list');
            setEditingPage(null);
            fetchPages();
          }}
        />
      </div>
    );
  }

  // ─── Loading State ────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Page Builder</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Loader2 className="w-8 h-8 text-[#16C784] animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Chargement...</p>
        </div>
      </div>
    );
  }

  // ─── Plan Gate ────────────────────────────────────────────

  if (hasAccess === false) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Page Builder</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Fonctionnalité Premium
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Le Page Builder Drag &amp; Drop est disponible à partir du plan <strong>Regular</strong>.
            Créez des pages personnalisées sans coder pour votre boutique.
          </p>
          <a
            href="/hub/dashboard/subscription"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b876] transition-colors"
          >
            <Crown className="w-5 h-5" />
            Upgrader mon plan
          </a>
        </div>
      </div>
    );
  }

  // ─── Page List View ───────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Page Builder</h1>
          <p className="text-sm text-gray-500 mt-1">
            Créez et personnalisez les pages de votre boutique avec l&apos;éditeur visuel.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b876] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle page
        </button>
      </div>

      {/* Page Count */}
      <div className="text-sm text-gray-500">
        {pages.length} / 20 pages
      </div>

      {/* Pages Grid */}
      {pages.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-[#16C784]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutTemplate className="w-8 h-8 text-[#16C784]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Aucune page personnalisée
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Créez votre première page avec l&apos;éditeur Drag &amp; Drop.
            Ajoutez des sections hero, grilles de produits, témoignages et plus.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b876] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Créer ma première page
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page) => (
            <div
              key={page.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Page Preview Thumbnail */}
              <div className="h-36 bg-gray-50 border-b border-gray-100 relative flex items-center justify-center">
                {page.html ? (
                  <div
                    className="w-full h-full overflow-hidden pointer-events-none"
                    style={{ transform: 'scale(0.25)', transformOrigin: 'top left', width: '400%', height: '400%' }}
                  >
                    <div dangerouslySetInnerHTML={{ __html: `<style>${page.css}</style>${page.html}` }} />
                  </div>
                ) : (
                  <FileText className="w-10 h-10 text-gray-300" />
                )}
                {/* Status badges */}
                <div className="absolute top-2 right-2 flex gap-1">
                  {page.is_homepage && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <Home className="w-3 h-3" /> Accueil
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      page.is_published
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {page.is_published ? 'Publié' : 'Brouillon'}
                  </span>
                </div>
              </div>

              {/* Page Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1 truncate">{page.title}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs text-gray-400">/{page.slug}</p>
                  {page.updated_at && (
                    <>
                      <span className="text-xs text-gray-300">·</span>
                      <p className="text-xs text-gray-400">
                        {new Date(page.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditor(page)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#16C784] bg-[#16C784]/10 rounded-md hover:bg-[#16C784]/20 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Éditer
                  </button>
                  <button
                    onClick={() => handleTogglePublish(page)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    title={page.is_published ? 'Dépublier' : 'Publier'}
                  >
                    {page.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleSetHomepage(page)}
                    className={`p-1.5 transition-colors ${
                      page.is_homepage ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={page.is_homepage ? 'Retirer comme accueil' : 'Définir comme accueil'}
                  >
                    <Home className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicatePage(page.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Dupliquer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {page.is_published && (
                    <a
                      href={`/store/my-store/pages/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Voir la page sur la boutique"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => handleDeletePage(page.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Page Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nouvelle page</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre de la page
                </label>
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ex: À propos, Promotions d'été..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (URL)
                </label>
                <div className="flex items-center">
                  <span className="text-sm text-gray-400 mr-1">/</span>
                  <input
                    type="text"
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="a-propos"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Lettres minuscules, chiffres et tirets uniquement.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPageTitle('');
                  setNewPageSlug('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreatePage}
                disabled={creating || !newPageTitle.trim() || !newPageSlug.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#16C784] text-white text-sm font-semibold rounded-lg hover:bg-[#14b876] transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {creating ? 'Création...' : 'Créer et éditer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Utility ────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}
