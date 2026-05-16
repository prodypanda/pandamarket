'use client';

import { fetchWithCsrf } from '@/lib/api';
/**
 * Page Builder Dashboard — Vendor page management.
 * ─────────────────────────────────────────────────
 * Lists all custom pages, allows creating new ones,
 * and opens the GrapesJS editor for editing.
 *
 * Plan gate: Only Regular+ plans (has_page_builder = true).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Grid3X3,
  List,
  BarChart3,
  MousePointerClick,
} from 'lucide-react';
import { PageBuilderEditor } from '../../../../components/page-builder/PageBuilderEditor';
import { TemplatePicker } from '../../../../components/page-builder/TemplatePicker';
import type { PageTemplate, TemplateBranding } from '../../../../components/page-builder/templates';
import { revalidatePageBuilderCache } from '@/lib/page-builder-cache';
import { pageBuilderDashboardStatsLabels } from '@/lib/page-builder-dashboard-stats';

interface StorePage {
  id: string;
  slug: string;
  title: string;
  builder_data: Record<string, unknown>;
  html: string;
  css: string;
  is_published: boolean;
  is_homepage: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image?: string | null;
  noindex?: boolean;
  show_in_navigation?: boolean;
  show_in_footer?: boolean;
  sort_order: number;
  views_30d?: number;
  cta_clicks_30d?: number;
  product_clicks_30d?: number;
  created_at: string;
  updated_at: string;
}

interface StoreData {
  id?: string | null;
  name?: string | null;
  subdomain?: string | null;
  seller_type?: string | null;
  settings?: Record<string, unknown> | null;
}

type View = 'list' | 'editor';
type PagesLayout = 'grid' | 'list';

interface ApiErrorPayload {
  error?: {
    message?: string;
    details?: {
      field?: string;
      slug?: string;
    };
  };
  message?: string;
}

interface PageBuilderLimits {
  plan: string;
  max_page_builder_pages: number;
  has_ai_seo?: boolean;
}

const PAGE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/;

export default function PageBuilderDashboard() {
  const [view, setView] = useState<View>('list');
  const [pages, setPages] = useState<StorePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [editingPage, setEditingPage] = useState<StorePage | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [pagesLayout, setPagesLayout] = useState<PagesLayout>('list');
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [templateHtml, setTemplateHtml] = useState('');
  const [templateCss, setTemplateCss] = useState('');
  const [store, setStore] = useState<StoreData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [slugFieldError, setSlugFieldError] = useState('');
  const [pageBuilderLimits, setPageBuilderLimits] = useState<PageBuilderLimits | null>(null);
  const [editorInitialNotice, setEditorInitialNotice] = useState('');

  const existingSlugs = useMemo(() => new Set(pages.map((page) => page.slug)), [pages]);
  const slugValidationMessage = useMemo(() => {
    if (!newPageSlug.trim()) return '';
    if (!PAGE_SLUG_PATTERN.test(newPageSlug)) {
      return 'Le slug doit contenir 2 à 100 caractères, commencer et finir par une lettre ou un chiffre.';
    }
    if (existingSlugs.has(newPageSlug)) {
      return `Le slug "${newPageSlug}" est déjà utilisé par une autre page.`;
    }
    return '';
  }, [existingSlugs, newPageSlug]);
  const createSlugError = slugFieldError || slugValidationMessage;
  const pageLimit = pageBuilderLimits?.max_page_builder_pages ?? 20;
  const pageLimitLabel = pageLimit === -1 ? 'Illimité' : pageLimit.toLocaleString('fr-TN');
  const hasReachedPageLimit = pageLimit !== -1 && pages.length >= pageLimit;
  const slugSuggestions = useMemo(() => {
    const baseSlug = slugify(newPageSlug || newPageTitle) || 'page';
    const suggestions: string[] = [];
    for (let suffix = 2; suggestions.length < 3 && suffix < 100; suffix++) {
      const suffixText = `-${suffix}`;
      const candidate = `${baseSlug.slice(0, 100 - suffixText.length)}${suffixText}`;
      if (!existingSlugs.has(candidate) && PAGE_SLUG_PATTERN.test(candidate)) {
        suggestions.push(candidate);
      }
    }
    return suggestions;
  }, [existingSlugs, newPageSlug, newPageTitle]);

  const getErrorMessage = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      return data.error?.message || data.message || `${fallback} (${res.status})`;
    } catch {
      return `${fallback} (${res.status})`;
    }
  };

  const fetchPages = useCallback(async () => {
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/page-builder/pages', { credentials: 'include' });
      if (res.status === 403) {
        setHasAccess(false);
        return;
      }
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Erreur lors du chargement des pages'));
        return;
      }
      const data = await res.json();
      setPages(data.data || []);
      setPageBuilderLimits(data.limits || null);
      setHasAccess(true);
    } catch (err) {
      setHasAccess(true);
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setStore(data.store || null);
        }
      } catch {
        setStore(null);
      }
    }

    fetchStore();
  }, []);

  const handleCreatePage = async () => {
    const normalizedSlug = slugify(newPageSlug);
    if (!newPageTitle.trim() || !normalizedSlug) return;
    if (hasReachedPageLimit) {
      setError(`Limite de ${pageLimitLabel} pages atteinte pour votre plan.`);
      return;
    }
    if (!PAGE_SLUG_PATTERN.test(normalizedSlug)) {
      setSlugFieldError('Le slug doit contenir 2 à 100 caractères, commencer et finir par une lettre ou un chiffre.');
      return;
    }
    if (existingSlugs.has(normalizedSlug)) {
      setSlugFieldError(`Le slug "${normalizedSlug}" est déjà utilisé par une autre page.`);
      return;
    }
    setError('');
    setSuccess('');
    setSlugFieldError('');
    setCreating(true);
    try {
      const createdFromTemplate = Boolean(templateHtml);
      const res = await fetchWithCsrf('/api/pd/page-builder/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newPageTitle,
          slug: normalizedSlug,
          ...(templateHtml ? { html: templateHtml, css: templateCss } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as ApiErrorPayload | null;
        const message = data?.error?.message || data?.message || `Erreur lors de la création (${res.status})`;
        if (res.status === 409 && data?.error?.details?.field === 'slug') {
          setSlugFieldError(message);
        }
        setError(message);
        return;
      }
      const data = await res.json();
      setShowCreateModal(false);
      setNewPageTitle('');
      setNewPageSlug('');
      setSlugFieldError('');
      setTemplateHtml('');
      setTemplateCss('');
      setEditorInitialNotice(createdFromTemplate ? 'Template loaded. Customize sections, SEO, then publish.' : '');
      // Open editor immediately for the new page
      setEditingPage(data.page);
      setView('editor');
      setSuccess('Page créée avec succès.');
      fetchPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = () => {
    if (hasReachedPageLimit) {
      setError(`Limite de ${pageLimitLabel} pages atteinte pour votre plan.`);
      return;
    }
    setTemplateHtml('');
    setTemplateCss('');
    setShowCreateModal(true);
  };

  const handleDeletePage = async (page: StorePage) => {
    if (!confirm('Supprimer cette page ? Cette action est irréversible.')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithCsrf(`/api/pd/page-builder/pages/${page.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setPages((prev) => prev.filter((p) => p.id !== page.id));
        await revalidatePageBuilderCache({ storeId: store?.id, slug: page.slug, homepage: page.is_homepage });
        setSuccess('Page supprimée.');
      } else {
        setError(await getErrorMessage(res, 'Erreur lors de la suppression'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const handleDuplicatePage = async (pageId: string) => {
    if (hasReachedPageLimit) {
      setError(`Limite de ${pageLimitLabel} pages atteinte pour votre plan.`);
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithCsrf(`/api/pd/page-builder/pages/${pageId}/duplicate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setSuccess('Page dupliquée.');
        fetchPages();
      } else {
        setError(await getErrorMessage(res, 'Erreur lors de la duplication'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la duplication');
    }
  };

  const handleTogglePublish = async (page: StorePage) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithCsrf(`/api/pd/page-builder/pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_published: !page.is_published }),
      });
      if (res.ok) {
        setPages((prev) =>
          prev.map((p) => (p.id === page.id ? { ...p, is_published: !p.is_published } : p)),
        );
        await revalidatePageBuilderCache({ storeId: store?.id, slug: page.slug, homepage: page.is_homepage });
        setSuccess(!page.is_published ? 'Page publiée.' : 'Page dépubliée.');
      } else {
        setError(await getErrorMessage(res, 'Erreur lors de la mise à jour'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleSetHomepage = async (page: StorePage) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithCsrf(`/api/pd/page-builder/pages/${page.id}`, {
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
        await revalidatePageBuilderCache({ storeId: store?.id, slug: page.slug, homepage: true });
        setSuccess(!page.is_homepage ? 'Page définie comme accueil.' : 'Page retirée de l’accueil.');
      } else {
        setError(await getErrorMessage(res, 'Erreur lors de la mise à jour'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const openEditor = async (page: StorePage) => {
    // Fetch full page data (including builder_data)
    try {
      const res = await fetchWithCsrf(`/api/pd/page-builder/pages/${page.id}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Erreur lors du chargement de la page'));
        return;
      }
      const data = await res.json();
      setEditorInitialNotice('');
      setEditingPage(data.page);
      setView('editor');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de la page');
    }
  };

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setNewPageTitle(title);
    if (!newPageSlug || newPageSlug === slugify(newPageTitle)) {
      setNewPageSlug(slugify(title));
      setSlugFieldError('');
    }
  };

  // Handle template selection from TemplatePicker
  const handleTemplateSelect = (template: PageTemplate) => {
    if (hasReachedPageLimit) {
      setShowTemplatePicker(false);
      setError(`Limite de ${pageLimitLabel} pages atteinte pour votre plan.`);
      return;
    }
    setShowTemplatePicker(false);
    setNewPageTitle(template.name);
    setNewPageSlug(template.slug);
    setSlugFieldError('');
    setTemplateHtml(template.html);
    setTemplateCss(template.css);
    setShowCreateModal(true);
  };

  // ─── Editor View ──────────────────────────────────────────

  if (view === 'editor' && editingPage) {
    return (
      <div className="fixed inset-0 z-50">
        <PageBuilderEditor
          pageId={editingPage.id}
          storeId={store?.id || ''}
          storeHost={store?.subdomain ?? null}
          initialData={{
            builder_data: editingPage.builder_data,
            html: editingPage.html,
            css: editingPage.css,
            title: editingPage.title,
            slug: editingPage.slug,
            is_published: editingPage.is_published,
            is_homepage: editingPage.is_homepage,
            seo_title: editingPage.seo_title,
            seo_description: editingPage.seo_description,
            og_image: editingPage.og_image,
            noindex: editingPage.noindex,
            show_in_navigation: editingPage.show_in_navigation,
            show_in_footer: editingPage.show_in_footer,
            sort_order: editingPage.sort_order,
          }}
          onSave={() => fetchPages()}
          onBack={() => {
            setView('list');
            setEditingPage(null);
            setEditorInitialNotice('');
            fetchPages();
          }}
          initialNotice={editorInitialNotice || undefined}
          hasAiSeo={Boolean(pageBuilderLimits?.has_ai_seo)}
        />
      </div>
    );
  }

  // ─── Loading State ────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 text-[#1A1A2E]">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Page Builder</h1>
        <div className="rounded-2xl border border-[#E4D8C6] bg-[#FBF8F1] p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-[#B91C1C] animate-spin mx-auto" />
          <p className="text-sm text-[#7C7468] mt-3">Chargement...</p>
        </div>
      </div>
    );
  }

  // ─── Plan Gate ────────────────────────────────────────────

  if (hasAccess === false) {
    return (
      <div className="space-y-6 text-[#1A1A2E]">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Page Builder</h1>
        <div className="rounded-2xl border border-[#E4D8C6] bg-[#FBF8F1] p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-[#F4EDE2] rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#8A6F3D]" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">
            Fonctionnalité Premium
          </h2>
          <p className="text-[#7C7468] mb-6 max-w-md mx-auto">
            Le Page Builder Drag &amp; Drop est disponible à partir du plan <strong>Regular</strong>.
            Créez des pages personnalisées sans coder pour votre boutique.
          </p>
          <a
            href="/hub/dashboard/subscription"
            className="inline-flex items-center gap-2 rounded-full bg-[#B91C1C] px-6 py-3 font-semibold text-white shadow-sm shadow-amber-900/10 transition-colors hover:bg-[#991B1B]"
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
    <div className="space-y-6 text-[#1A1A2E]">
      <div className="mb-2 flex items-center justify-between rounded-3xl border border-[#E4D8C6] bg-[#FBF8F1] p-5 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A6F3D]">Studio pages</p>
          <h1 className="mt-1 text-2xl font-bold text-[#1A1A2E]">Page Builder</h1>
          <p className="text-sm text-[#7C7468] mt-1">
            Créez et personnalisez les pages de votre boutique avec l&apos;éditeur visuel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplatePicker(true)}
            disabled={hasReachedPageLimit}
            className="flex items-center gap-2 rounded-full border border-[#D6B779] bg-white px-4 py-2.5 font-semibold text-[#8A6F3D] shadow-sm transition-colors hover:bg-[#FFF8E8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LayoutTemplate className="w-4 h-4" />
            Depuis un template
          </button>
          <button
            onClick={() => openCreateModal()}
            disabled={hasReachedPageLimit}
            className="flex items-center gap-2 rounded-full bg-[#B91C1C] px-4 py-2.5 font-semibold text-white shadow-sm shadow-amber-900/10 transition-colors hover:bg-[#991B1B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Page vierge
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm font-medium text-amber-700">
          {success}
        </div>
      )}

      <div className="mb-2 flex flex-col gap-3 rounded-2xl border border-[#E4D8C6] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold shadow-sm ${
            hasReachedPageLimit ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-[#E4D8C6] bg-white text-[#7C7468]'
          }`}>
            {pages.length} / {pageLimitLabel} pages
          </div>
          {hasReachedPageLimit && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium text-amber-700">
                Limite atteinte pour votre plan actuel. Supprimez une page ou upgradez votre abonnement.
              </p>
              <a
                href="/hub/dashboard/subscription"
                className="inline-flex items-center gap-1 rounded-full bg-[#B91C1C] px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#991B1B]"
              >
                <Crown className="h-3 w-3" />
                Upgrade plan
              </a>
            </div>
          )}
        </div>
        <div className="flex w-fit items-center rounded-full border border-[#E4D8C6] bg-[#F4EDE2] p-0.5 shadow-inner">
          {[
            { value: 'grid' as const, label: 'Grille', icon: Grid3X3 },
            { value: 'list' as const, label: 'Liste', icon: List },
          ].map((option) => {
            const Icon = option.icon;
            const isActive = pagesLayout === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPagesLayout(option.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  isActive ? 'bg-[#1A1A2E] text-white shadow-sm' : 'text-[#7C7468] hover:bg-white hover:text-[#1A1A2E]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pages Grid */}
      {pages.length === 0 ? (
        <div className="rounded-3xl border border-[#E4D8C6] bg-[#FBF8F1] p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-[#F4EDE2] rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutTemplate className="w-8 h-8 text-[#8A6F3D]" />
          </div>
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-2">
            Aucune page personnalisée
          </h2>
          <p className="text-[#7C7468] mb-6 max-w-md mx-auto">
            Créez votre première page avec l&apos;éditeur Drag &amp; Drop.
            Choisissez parmi 20 templates prêts à l&apos;emploi ou partez de zéro.
          </p>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={() => setShowTemplatePicker(true)}
              disabled={hasReachedPageLimit}
              className="inline-flex items-center gap-2 rounded-full bg-[#B91C1C] px-6 py-3 font-semibold text-white shadow-sm shadow-amber-900/10 transition-colors hover:bg-[#991B1B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LayoutTemplate className="w-5 h-5" />
              Choisir un template
            </button>
            <button
              onClick={() => openCreateModal()}
              disabled={hasReachedPageLimit}
              className="inline-flex items-center gap-2 rounded-full border border-[#D6B779] bg-white px-6 py-3 font-semibold text-[#8A6F3D] shadow-sm transition-colors hover:bg-[#FFF8E8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              Page vierge
            </button>
          </div>
        </div>
      ) : (
        <div className={pagesLayout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {pages.map((page) => {
            const statsLabels = pageBuilderDashboardStatsLabels(page);
            return (
            <div
              key={page.id}
              data-testid={`page-builder-page-card-${page.id}`}
              className={`overflow-hidden rounded-2xl border border-[#E4D8C6] bg-white shadow-sm transition-all hover:border-[#D6B779] hover:shadow-md ${
                pagesLayout === 'grid' ? 'hover:-translate-y-0.5' : 'sm:flex sm:items-stretch'
              }`}
            >
              <div className={`border-[#E4D8C6] bg-gradient-to-br from-[#FFFDF8] to-[#F8F2E8] p-4 ${
                pagesLayout === 'grid' ? 'border-b' : 'sm:w-80 sm:flex-shrink-0 sm:border-r'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-[#E4D8C6] bg-white text-[#D6B779] shadow-sm">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A6F3D]">Page créée</p>
                      <p className="truncate text-sm font-bold text-[#1A1A2E]">{page.title}</p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap justify-end gap-1">
                    {page.is_homepage && (
                      <span className="px-2 py-0.5 bg-[#EEF3FF] text-[#3153B7] text-xs font-semibold rounded-full flex items-center gap-1">
                        <Home className="w-3 h-3" /> Accueil
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        page.is_published
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-[#F4EDE2] text-[#7C7468]'
                      }`}
                    >
                      {page.is_published ? 'Publié' : 'Brouillon'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Page Info */}
              <div className={`p-4 ${pagesLayout === 'list' ? 'sm:flex sm:flex-1 sm:items-center sm:justify-between sm:gap-4' : ''}`}>
                <div className={`flex items-center gap-2 ${pagesLayout === 'grid' ? 'mb-3' : 'mb-3 sm:mb-0'}`}>
                  <p className="truncate text-xs font-medium text-[#7C7468]">/{page.slug}</p>
                  {page.updated_at && (
                    <>
                      <span className="text-xs text-[#D6B779]">·</span>
                      <p className="whitespace-nowrap text-xs text-[#7C7468]">
                        {new Date(page.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  )}
                </div>

                {page.is_published && (
                  <div className={`flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#7C7468] ${pagesLayout === 'grid' ? 'mb-3' : 'mb-3 sm:mb-0'}`}>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#E4D8C6] bg-[#FBF8F1] px-2 py-1">
                      <BarChart3 className="h-3 w-3 text-[#8A6F3D]" />
                      30j
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#E4D8C6] bg-white px-2 py-1">
                      <Eye className="h-3 w-3 text-[#B91C1C]" />
                      {statsLabels.views}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#E4D8C6] bg-white px-2 py-1">
                      <MousePointerClick className="h-3 w-3 text-[#D6B779]" />
                      {statsLabels.clicks}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditor(page)}
                    data-testid={`page-builder-edit-page-${page.id}`}
                    className="flex items-center gap-1 rounded-full bg-[#B91C1C]/10 px-3 py-1.5 text-xs font-bold text-[#B91C1C] transition-colors hover:bg-[#B91C1C]/20"
                  >
                    <Pencil className="w-3 h-3" />
                    Éditer
                  </button>
                  <button
                    onClick={() => handleTogglePublish(page)}
                    className="p-1.5 text-[#7C7468] transition-colors hover:text-[#1A1A2E]"
                    title={page.is_published ? 'Dépublier' : 'Publier'}
                  >
                    {page.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleSetHomepage(page)}
                    className={`p-1.5 transition-colors ${
                      page.is_homepage ? 'text-[#3153B7]' : 'text-[#7C7468] hover:text-[#1A1A2E]'
                    }`}
                    title={page.is_homepage ? 'Retirer comme accueil' : 'Définir comme accueil'}
                  >
                    <Home className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicatePage(page.id)}
                    disabled={hasReachedPageLimit}
                    className="p-1.5 text-[#7C7468] transition-colors hover:text-[#1A1A2E] disabled:cursor-not-allowed disabled:opacity-40"
                    title="Dupliquer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {page.is_published && store?.subdomain && (
                    <a
                      href={`/store/${store.subdomain}/pages/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-[#7C7468] transition-colors hover:text-[#1A1A2E]"
                      title="Voir la page sur la boutique"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => handleDeletePage(page)}
                    className="p-1.5 text-[#7C7468] transition-colors hover:text-red-500"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* Create Page Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[#E4D8C6] bg-[#FBF8F1] p-6 mx-4 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-[#1A1A2E]">Nouvelle page</h2>
            {templateHtml && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#B91C1C]/20 bg-[#B91C1C]/10 px-3 py-2">
                <LayoutTemplate className="w-4 h-4 text-[#B91C1C] flex-shrink-0" />
                <p className="text-sm text-[#B91C1C] font-medium">Template pré-rempli. Vous pourrez le personnaliser dans l&apos;éditeur.</p>
              </div>
            )}
            {hasReachedPageLimit && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                <p>Limite de {pageLimitLabel} pages atteinte pour votre plan.</p>
                <a
                  href="/hub/dashboard/subscription"
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#B91C1C] px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-[#991B1B]"
                >
                  <Crown className="h-3 w-3" />
                  Upgrade plan
                </a>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#6B6258] mb-1">
                  Titre de la page
                </label>
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ex: À propos, Promotions d'été..."
                  className="w-full rounded-xl border border-[#E4D8C6] bg-white px-4 py-2.5 text-[#1A1A2E] outline-none transition-colors focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6B6258] mb-1">
                  Slug (URL)
                </label>
                <div className="flex items-center">
                  <span className="text-sm text-[#8A6F3D] mr-1">/</span>
                  <input
                    type="text"
                    value={newPageSlug}
                    onChange={(e) => {
                      setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      setSlugFieldError('');
                    }}
                    placeholder="a-propos"
                    aria-invalid={Boolean(createSlugError)}
                    className={`w-full rounded-xl border bg-white px-4 py-2.5 text-[#1A1A2E] outline-none transition-colors focus:ring-2 ${
                      createSlugError
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-[#E4D8C6] focus:border-[#D6B779] focus:ring-[#D6B779]/20'
                    }`}
                  />
                </div>
                {createSlugError ? (
                  <div className="mt-2 rounded-lg border border-red-100 bg-red-50 p-2">
                    <p className="text-xs font-medium text-red-700">{createSlugError}</p>
                    {slugSuggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {slugSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              setNewPageSlug(suggestion);
                              setSlugFieldError('');
                            }}
                            className="rounded-full border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                          >
                            Utiliser /{suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#7C7468] mt-1">
                    Lettres minuscules, chiffres et tirets uniquement.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPageTitle('');
                  setNewPageSlug('');
                  setSlugFieldError('');
                  setTemplateHtml('');
                  setTemplateCss('');
                }}
                className="rounded-full px-4 py-2 text-sm font-semibold text-[#6B6258] transition-colors hover:bg-[#F4EDE2]"
              >
                Annuler
              </button>
              <button
                onClick={handleCreatePage}
                disabled={creating || hasReachedPageLimit || !newPageTitle.trim() || !newPageSlug.trim() || Boolean(createSlugError)}
                className="flex items-center gap-2 rounded-full bg-[#B91C1C] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-900/10 transition-colors hover:bg-[#991B1B] disabled:opacity-50"
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

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <TemplatePicker
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplatePicker(false)}
          storeBranding={buildTemplateBranding(store)}
        />
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

function settingsString(settings: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = settings?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function buildTemplateBranding(store: StoreData | null): TemplateBranding {
  const settings = store?.settings || {};
  const colors = settings.colors && typeof settings.colors === 'object' && !Array.isArray(settings.colors)
    ? settings.colors as Record<string, unknown>
    : {};
  return {
    storeName: store?.name || settingsString(settings, 'store_name') || settingsString(settings, 'name'),
    logoUrl: settingsString(settings, 'logo_url'),
    primaryColor: typeof colors.primary === 'string' ? colors.primary : settingsString(settings, 'primary_color'),
    secondaryColor: typeof colors.secondary === 'string' ? colors.secondary : settingsString(settings, 'secondary_color'),
    sellerType: store?.seller_type,
  };
}
