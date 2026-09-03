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
  Construction,
} from 'lucide-react';
import { PageBuilderEditor } from '../../../../components/page-builder/PageBuilderEditor';
import { TemplatePicker } from '../../../../components/page-builder/TemplatePicker';
import type { PageTemplate, TemplateBranding } from '../../../../components/page-builder/templates';
import { revalidatePageBuilderCache } from '@/lib/page-builder-cache';
import { pageBuilderDashboardStatsLabels } from '@/lib/page-builder-dashboard-stats';
import { useLocale } from '@/contexts/LocaleContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
const MAINTENANCE_PAGE_SLUG = 'maintenance';
const MAINTENANCE_PAGE_TEMPLATE_HTML = `
<section class="pd-maintenance-template">
  <div data-pd-block="store-hero" data-pd-title="Maintenance en cours" data-pd-subtitle="Notre boutique se refait une beauté. Nous revenons très bientôt avec une meilleure expérience."></div>
  <div class="pd-maintenance-note">
    <p>Merci pour votre patience. Vous pouvez nous contacter si vous avez une commande en cours ou une question urgente.</p>
  </div>
  <div data-pd-block="store-contact" data-pd-title="Nous contacter"></div>
</section>`;
const MAINTENANCE_PAGE_TEMPLATE_CSS = `
.pd-maintenance-template {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
}
.pd-maintenance-note {
  max-width: 760px;
  margin: -28px auto 0;
  position: relative;
  z-index: 2;
  padding: 0 24px;
}
.pd-maintenance-note p {
  margin: 0;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  background: white;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
  padding: 24px;
  color: #4b5563;
  font-size: 16px;
  line-height: 1.7;
  text-align: center;
}`;

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
  const [pageToDelete, setPageToDelete] = useState<StorePage | null>(null);
  const [deletingPage, setDeletingPage] = useState(false);

  const { t, locale, dir } = useLocale();

  const existingSlugs = useMemo(() => new Set(pages.map((page) => page.slug)), [pages]);
  const maintenancePage = useMemo(() => pages.find((page) => page.slug === MAINTENANCE_PAGE_SLUG) || null, [pages]);
  const slugValidationMessage = useMemo(() => {
    if (!newPageSlug.trim()) return '';
    if (!PAGE_SLUG_PATTERN.test(newPageSlug)) {
      return t('dashboardPages.pageBuilder.slugInvalid');
    }
    if (existingSlugs.has(newPageSlug)) {
      return t('dashboardPages.pageBuilder.slugTaken', { slug: newPageSlug });
    }
    return '';
  }, [existingSlugs, newPageSlug, t]);
  const createSlugError = slugFieldError || slugValidationMessage;
  const pageLimit = pageBuilderLimits?.max_page_builder_pages ?? 20;
  const pageLimitLabel = pageLimit === -1 ? t('dashboardPages.pageBuilder.unlimited') : pageLimit.toLocaleString(locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN');
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
        setError(await getErrorMessage(res, t('dashboardPages.pageBuilder.errorLoadingPages')));
        return;
      }
      const data = await res.json();
      setPages(data.data || []);
      setPageBuilderLimits(data.limits || null);
      setHasAccess(true);
    } catch (err) {
      setHasAccess(true);
      setError(err instanceof Error ? err.message : t('dashboardPages.pageBuilder.networkError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
      setError(t('dashboardPages.pageBuilder.pageLimitReached', { limit: pageLimitLabel }));
      return;
    }
    if (!PAGE_SLUG_PATTERN.test(normalizedSlug)) {
      setSlugFieldError(t('dashboardPages.pageBuilder.slugInvalid'));
      return;
    }
    if (existingSlugs.has(normalizedSlug)) {
      setSlugFieldError(t('dashboardPages.pageBuilder.slugTaken', { slug: normalizedSlug }));
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
        const message = data?.error?.message || data?.message || t('dashboardPages.pageBuilder.errorCreating', { status: res.status });
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
      setEditorInitialNotice(createdFromTemplate ? t('dashboardPages.pageBuilder.templateLoadedNotice') : '');
      // Open editor immediately for the new page
      setEditingPage(data.page);
      setView('editor');
      setSuccess(t('dashboardPages.pageBuilder.pageCreatedSuccess'));
      fetchPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.pageBuilder.networkError'));
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = () => {
    if (hasReachedPageLimit) {
      setError(t('dashboardPages.pageBuilder.pageLimitReached', { limit: pageLimitLabel }));
      return;
    }
    setTemplateHtml('');
    setTemplateCss('');
    setShowCreateModal(true);
  };

  const handleDeletePage = (page: StorePage) => {
    setPageToDelete(page);
  };

  const confirmDeletePage = async () => {
    if (!pageToDelete) return;
    setDeletingPage(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithCsrf(`/api/pd/page-builder/pages/${pageToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setPages((prev) => prev.filter((p) => p.id !== pageToDelete.id));
        await revalidatePageBuilderCache({ storeId: store?.id, slug: pageToDelete.slug, homepage: pageToDelete.is_homepage });
        setSuccess(t('dashboardPages.pageBuilder.pageDeleted'));
        setPageToDelete(null);
      } else {
        setError(await getErrorMessage(res, t('dashboardPages.pageBuilder.errorDeleting')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.pageBuilder.errorDeleting'));
    } finally {
      setDeletingPage(false);
    }
  };

  const handleDuplicatePage = async (pageId: string) => {
    if (hasReachedPageLimit) {
      setError(t('dashboardPages.pageBuilder.pageLimitReached', { limit: pageLimitLabel }));
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
        setSuccess(t('dashboardPages.pageBuilder.pageDuplicated'));
        fetchPages();
      } else {
        setError(await getErrorMessage(res, t('dashboardPages.pageBuilder.errorDuplicating')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.pageBuilder.errorDuplicating'));
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
        setSuccess(!page.is_published ? t('dashboardPages.pageBuilder.pagePublished') : t('dashboardPages.pageBuilder.pageUnpublished'));
      } else {
        setError(await getErrorMessage(res, t('dashboardPages.pageBuilder.errorUpdating')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.pageBuilder.errorGeneric'));
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
        setSuccess(!page.is_homepage ? t('dashboardPages.pageBuilder.setAsHomepageSuccess') : t('dashboardPages.pageBuilder.removedFromHomepage'));
      } else {
        setError(await getErrorMessage(res, t('dashboardPages.pageBuilder.errorUpdating')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.pageBuilder.errorGeneric'));
    }
  };

  const openEditor = async (page: StorePage) => {
    // Fetch full page data (including builder_data)
    try {
      const res = await fetchWithCsrf(`/api/pd/page-builder/pages/${page.id}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, t('dashboardPages.pageBuilder.errorLoadingPage')));
        return;
      }
      const data = await res.json();
      setEditorInitialNotice('');
      setEditingPage(data.page);
      setView('editor');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.pageBuilder.errorLoadingPage'));
    }
  };

  const handleMaintenancePage = async () => {
    if (maintenancePage) {
      await openEditor(maintenancePage);
      return;
    }
    if (hasReachedPageLimit) {
      setError(t('dashboardPages.pageBuilder.pageLimitReached', { limit: pageLimitLabel }));
      return;
    }
    setError('');
    setSuccess('');
    setCreating(true);
    try {
      const res = await fetchWithCsrf('/api/pd/page-builder/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: t('dashboardPages.pageBuilder.maintenancePageName'),
          slug: MAINTENANCE_PAGE_SLUG,
          html: MAINTENANCE_PAGE_TEMPLATE_HTML,
          css: MAINTENANCE_PAGE_TEMPLATE_CSS,
          noindex: true,
          show_in_navigation: false,
          show_in_footer: false,
        }),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, t('dashboardPages.pageBuilder.errorCreatingMaintenance')));
        return;
      }
      const data = await res.json();
      setEditorInitialNotice(t('dashboardPages.pageBuilder.maintenanceCreatedNotice'));
      setEditingPage(data.page);
      setView('editor');
      setSuccess(t('dashboardPages.pageBuilder.maintenanceCreated'));
      fetchPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.pageBuilder.errorCreatingMaintenance'));
    } finally {
      setCreating(false);
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
      setError(t('dashboardPages.pageBuilder.pageLimitReached', { limit: pageLimitLabel }));
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
      <div dir={dir} className="space-y-6 text-slate-900 dark:text-white">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboardPages.pageBuilder.title')}</h1>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-2xs">
          <Loader2 className="w-8 h-8 text-slate-900 dark:text-white animate-spin mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">{t('dashboardPages.pageBuilder.loading')}</p>
        </div>
      </div>
    );
  }

  // ─── Plan Gate ────────────────────────────────────────────

  if (hasAccess === false) {
    return (
      <div dir={dir} className="space-y-6 text-slate-900 dark:text-white">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboardPages.pageBuilder.title')}</h1>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-2xs">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-slate-700 dark:text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {t('dashboardPages.pageBuilder.premiumFeature')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            {t('dashboardPages.pageBuilder.premiumDescription', { plan: 'Regular' })}
          </p>
          <a
            href="/hub/dashboard/subscription"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-6 py-3 font-semibold text-white shadow-2xs transition-colors"
          >
            <Crown className="w-5 h-5" />
            {t('dashboardPages.pageBuilder.upgradeMyPlan')}
          </a>
        </div>
      </div>
    );
  }

  // ─── Page List View ───────────────────────────────────────

  return (
    <div dir={dir} className="space-y-6 text-slate-900 dark:text-white">
      <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t('dashboardPages.pageBuilder.eyebrow')}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{t('dashboardPages.pageBuilder.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('dashboardPages.pageBuilder.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplatePicker(true)}
            disabled={hasReachedPageLimit}
            className="flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 text-xs"
          >
            <LayoutTemplate className="w-4 h-4" />
            {t('dashboardPages.pageBuilder.fromTemplate')}
          </button>
          <button
            onClick={() => openCreateModal()}
            disabled={hasReachedPageLimit}
            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2.5 font-semibold text-white shadow-2xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 text-xs"
          >
            <Plus className="w-4 h-4" />
            {t('dashboardPages.pageBuilder.blankPage')}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs">
              <Construction className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t('dashboardPages.pageBuilder.specialPage')}</p>
              <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{t('dashboardPages.pageBuilder.maintenanceStoreTitle')}</h2>
              <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                {t('dashboardPages.pageBuilder.maintenanceDescriptionBefore')}{' '}<span className="font-bold text-slate-900 dark:text-white">/maintenance</span>{' '}{t('dashboardPages.pageBuilder.maintenanceDescriptionAfter')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                  {maintenancePage ? t('dashboardPages.pageBuilder.configured') : t('dashboardPages.pageBuilder.notConfigured')}
                </span>
                {maintenancePage && (
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${maintenancePage.is_published ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    {maintenancePage.is_published ? t('dashboardPages.pageBuilder.published') : t('dashboardPages.pageBuilder.draft')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => void handleMaintenancePage()}
              disabled={creating || (!maintenancePage && hasReachedPageLimit)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              {maintenancePage ? t('dashboardPages.pageBuilder.editThePage') : t('dashboardPages.pageBuilder.createThePage')}
            </button>
            {maintenancePage?.is_published && store?.subdomain && (
              <a
                href={`/store/${store.subdomain}/pages/${MAINTENANCE_PAGE_SLUG}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ExternalLink className="h-4 w-4" />
                {t('dashboardPages.pageBuilder.viewPage')}
              </a>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-3 text-sm font-medium text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {success}
        </div>
      )}

      <div className="mb-2 flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold shadow-sm ${
            hasReachedPageLimit ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {t('dashboardPages.pageBuilder.pagesCount', { current: pages.length, limit: pageLimitLabel })}
          </div>
          {hasReachedPageLimit && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {t('dashboardPages.pageBuilder.limitReachedDesc')}
              </p>
              <a
                href="/hub/dashboard/subscription"
                className="inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 px-3 py-1 text-xs font-bold text-white shadow-2xs transition-colors"
              >
                <Crown className="h-3 w-3" />
                {t('dashboardPages.pageBuilder.upgradePlan')}
              </a>
            </div>
          )}
        </div>
        <div className="flex w-fit items-center rounded-full border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 p-0.5 shadow-inner">
          {[
            { value: 'grid' as const, label: t('dashboardPages.pageBuilder.gridLayout'), icon: Grid3X3 },
            { value: 'list' as const, label: t('dashboardPages.pageBuilder.listLayout'), icon: List },
          ].map((option) => {
            const Icon = option.icon;
            const isActive = pagesLayout === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPagesLayout(option.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  isActive ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-2xs">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutTemplate className="w-8 h-8 text-slate-500 dark:text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {t('dashboardPages.pageBuilder.noPages')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            {t('dashboardPages.pageBuilder.noPagesDesc')}
          </p>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={() => setShowTemplatePicker(true)}
              disabled={hasReachedPageLimit}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-6 py-3 font-semibold text-white shadow-2xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 text-xs"
            >
              <LayoutTemplate className="w-5 h-5" />
              {t('dashboardPages.pageBuilder.chooseTemplate')}
            </button>
            <button
              onClick={() => openCreateModal()}
              disabled={hasReachedPageLimit}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 px-6 py-3 font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 text-xs"
            >
              <Plus className="w-5 h-5" />
              {t('dashboardPages.pageBuilder.blankPage')}
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
              className={`overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs transition-all hover:border-slate-400 dark:hover:border-slate-700 hover:shadow-md ${
                pagesLayout === 'grid' ? 'hover:-translate-y-0.5' : 'sm:flex sm:items-stretch'
              }`}
            >
              <div className={`border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 ${
                pagesLayout === 'grid' ? 'border-b' : 'sm:w-80 sm:flex-shrink-0 sm:border-r'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 shadow-2xs">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('dashboardPages.pageBuilder.pageCreatedBadge')}</p>
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{page.title}</p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap justify-end gap-1">
                    {page.is_homepage && (
                      <span className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-semibold rounded-full flex items-center gap-1 border border-sky-200/60 dark:border-sky-900/50">
                        <Home className="w-3 h-3" /> {t('dashboardPages.pageBuilder.homepage')}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        page.is_published
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {page.is_published ? t('dashboardPages.pageBuilder.published') : t('dashboardPages.pageBuilder.draft')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Page Info */}
              <div className={`p-4 ${pagesLayout === 'list' ? 'sm:flex sm:flex-1 sm:items-center sm:justify-between sm:gap-4' : ''}`}>
                <div className={`flex items-center gap-2 ${pagesLayout === 'grid' ? 'mb-3' : 'mb-3 sm:mb-0'}`}>
                  <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">/{page.slug}</p>
                  {page.updated_at && (
                    <>
                      <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
                      <p className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {new Date(page.updated_at).toLocaleDateString(locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  )}
                </div>

                {page.is_published && (
                  <div className={`flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 ${pagesLayout === 'grid' ? 'mb-3' : 'mb-3 sm:mb-0'}`}>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-2 py-1">
                      <BarChart3 className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                      {t('dashboardPages.pageBuilder.last30Days')}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 px-2 py-1 text-slate-700 dark:text-slate-300">
                      <Eye className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                      {statsLabels.views}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 px-2 py-1 text-slate-700 dark:text-slate-300">
                      <MousePointerClick className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                      {statsLabels.clicks}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditor(page)}
                    data-testid={`page-builder-edit-page-${page.id}`}
                    className="flex items-center gap-1 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    {t('dashboardPages.pageBuilder.edit')}
                  </button>
                  <button
                    onClick={() => handleTogglePublish(page)}
                    className="p-1.5 text-slate-400 dark:text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white"
                    title={page.is_published ? t('dashboardPages.pageBuilder.unpublish') : t('dashboardPages.pageBuilder.publish')}
                  >
                    {page.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleSetHomepage(page)}
                    className={`p-1.5 transition-colors ${
                      page.is_homepage ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={page.is_homepage ? t('dashboardPages.pageBuilder.removeAsHomepage') : t('dashboardPages.pageBuilder.setAsHomepage')}
                  >
                    <Home className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicatePage(page.id)}
                    disabled={hasReachedPageLimit}
                    className="p-1.5 text-slate-400 dark:text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    title={t('dashboardPages.pageBuilder.duplicate')}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {page.is_published && store?.subdomain && (
                    <a
                      href={`/store/${store.subdomain}/pages/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 dark:text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white"
                      title={t('dashboardPages.pageBuilder.viewPageOnStore')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => handleDeletePage(page)}
                    className="p-1.5 text-slate-400 dark:text-slate-500 transition-colors hover:text-rose-600 dark:hover:text-rose-400"
                    title={t('dashboardPages.pageBuilder.delete')}
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
          <div className="w-full max-w-md rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 mx-4 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{t('dashboardPages.pageBuilder.addPage')}</h2>
            {templateHtml && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50 dark:bg-sky-950/30 px-3 py-2 text-sky-700 dark:text-sky-300">
                <LayoutTemplate className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                <p className="text-sm font-medium">{t('dashboardPages.pageBuilder.templatePrefilled')}</p>
              </div>
            )}
            {hasReachedPageLimit && (
              <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                <p>{t('dashboardPages.pageBuilder.pageLimitReached', { limit: pageLimitLabel })}</p>
                <a
                  href="/hub/dashboard/subscription"
                  className="mt-2 inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 px-3 py-1 text-xs font-bold text-white shadow-2xs transition-colors"
                >
                  <Crown className="h-3 w-3" />
                  {t('dashboardPages.pageBuilder.upgradePlan')}
                </a>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('dashboardPages.pageBuilder.pageTitle')}
                </label>
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder={t('dashboardPages.pageBuilder.titlePlaceholder')}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('dashboardPages.pageBuilder.slug')}
                </label>
                <div className="flex items-center">
                  <span className="text-sm text-slate-500 dark:text-slate-400 mr-1">/</span>
                  <input
                    type="text"
                    value={newPageSlug}
                    onChange={(e) => {
                      setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      setSlugFieldError('');
                    }}
                    placeholder={t('dashboardPages.pageBuilder.slugPlaceholder')}
                    aria-invalid={Boolean(createSlugError)}
                    className={`w-full rounded-xl border bg-white dark:bg-slate-850 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:ring-1 ${
                      createSlugError
                        ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-slate-300 dark:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:ring-slate-900 dark:focus:ring-white'
                    }`}
                  />
                </div>
                {createSlugError ? (
                  <div className="mt-2 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-2">
                    <p className="text-xs font-medium text-rose-700 dark:text-rose-400">{createSlugError}</p>
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
                            className="rounded-full border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-850 px-2 py-1 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                          >
                            {t('dashboardPages.pageBuilder.useSlug', { slug: suggestion })}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t('dashboardPages.pageBuilder.slugHelp')}
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
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t('dashboardPages.pageBuilder.cancel')}
              </button>
              <button
                onClick={handleCreatePage}
                disabled={creating || hasReachedPageLimit || !newPageTitle.trim() || !newPageSlug.trim() || Boolean(createSlugError)}
                className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2 text-sm font-semibold text-white shadow-2xs transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {creating ? t('dashboardPages.pageBuilder.creating') : t('dashboardPages.pageBuilder.createAndEdit')}
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

      {pageToDelete && (
        <ConfirmDialog
          isOpen={!!pageToDelete}
          onClose={() => {
            if (!deletingPage) setPageToDelete(null);
          }}
          onConfirm={confirmDeletePage}
          title={t('dashboardPages.pageBuilder.deleteModalTitle') || "Supprimer la page"}
          description={
            <div className="space-y-2">
              <p>
                {t('dashboardPages.pageBuilder.confirmDelete') || "Êtes-vous sûr de vouloir supprimer cette page ?"}
              </p>
              <p className="font-semibold text-slate-900 dark:text-white">
                « {pageToDelete.title} » ({pageToDelete.slug})
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-400">
                Cette action est irréversible et supprimera le contenu ainsi que la route associée.
              </p>
            </div>
          }
          confirmLabel={t('dashboardPages.common.delete') || "Supprimer"}
          cancelLabel={t('dashboardPages.common.cancel') || "Annuler"}
          variant="danger"
          loading={deletingPage}
          dir={dir}
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
