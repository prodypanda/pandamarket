'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Home,
  Crown,
  ExternalLink,
  FileText,
  Grid3X3,
  List,
  MousePointerClick,
  Construction,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Type,
  Image as ImageIcon,
  Columns,
  ShoppingBag,
  Send,
  Globe,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export interface StorePage {
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

export interface StoreData {
  id?: string | null;
  name?: string | null;
  subdomain?: string | null;
  seller_type?: string | null;
  settings?: Record<string, unknown> | null;
}

export interface PageBuilderLimits {
  plan: string;
  max_page_builder_pages: number;
  has_ai_seo?: boolean;
}

export interface SellerReGoPageBuilderProps {
  pages: StorePage[];
  store: StoreData | null;
  pageBuilderLimits: PageBuilderLimits | null;
  loading: boolean;
  hasAccess: boolean | null;
  error: string;
  success: string;
  onOpenEditor: (page: StorePage) => void;
  onOpenCreateModal: () => void;
  onOpenTemplatePicker: () => void;
  onTogglePublish: (page: StorePage) => void;
  onSetHomepage: (page: StorePage) => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (page: StorePage) => void;
  onMaintenancePage: () => void;
  maintenancePage: StorePage | null;
  creating: boolean;
  dir?: 'ltr' | 'rtl';
}

const PALETTE_BLOCKS = [
  {
    icon: Type,
    title: 'Titre & Paragraphe Typographique',
    desc: 'Titres stylisés H1-H3, sous-titres captivants et blocs de texte riche avec mise en forme dynamique.',
    tag: 'Typographie',
  },
  {
    icon: ImageIcon,
    title: 'Image Pleine Largeur & Légende',
    desc: 'Bannière visuelle haute résolution avec adaptation automatique responsive et superposition de texte.',
    tag: 'Médias',
  },
  {
    icon: Columns,
    title: 'Colonnes de Texte & Avantages',
    desc: 'Grille de 2 à 4 colonnes illustrées d\'icônes mettant en avant vos garanties et savoir-faire.',
    tag: 'Structure',
  },
  {
    icon: ShoppingBag,
    title: 'Grille de Sélection de Produits',
    desc: 'Intégration directe de vos articles du catalogue PandaMarket avec prix en millimes et bouton d\'ajout.',
    tag: 'Commerce',
  },
  {
    icon: Sparkles,
    title: 'Bouton d\'Appel à l\'Action (CTA)',
    desc: 'Boutons d\'action percutants pointant vers vos catégories, formulaires de commande ou promotions.',
    tag: 'Conversion',
  },
  {
    icon: Send,
    title: 'Formulaire de Contact & Newsletter',
    desc: 'Module de capture d\'emails prospects ou formulaire de contact direct avec notification automatique.',
    tag: 'Engagement',
  },
];

export function SellerReGoPageBuilder({
  pages,
  store,
  pageBuilderLimits,
  loading: _loading,
  hasAccess: _hasAccess,
  error,
  success,
  onOpenEditor,
  onOpenCreateModal,
  onOpenTemplatePicker,
  onTogglePublish,
  onSetHomepage,
  onDuplicatePage,
  onDeletePage,
  onMaintenancePage,
  maintenancePage,
  creating,
  dir = 'ltr',
}: SellerReGoPageBuilderProps) {
  const { locale } = useLocale();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'homepage'>('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('list');
  const [selectedPage, setSelectedPage] = useState<StorePage | null>(null);

  const pageLimit = pageBuilderLimits?.max_page_builder_pages ?? 20;
  const pageLimitLabel =
    pageLimit === -1
      ? 'Illimité'
      : pageLimit.toLocaleString(locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN');
  const hasReachedPageLimit = pageLimit !== -1 && pages.length >= pageLimit;

  // Filtered pages
  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const matchesSearch =
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (statusFilter === 'published') return page.is_published;
      if (statusFilter === 'draft') return !page.is_published;
      if (statusFilter === 'homepage') return page.is_homepage;
      return true;
    });
  }, [pages, searchQuery, statusFilter]);

  // Telemetry
  const publishedCount = useMemo(() => pages.filter((p) => p.is_published).length, [pages]);
  const totalViews = useMemo(() => pages.reduce((acc, p) => acc + (p.views_30d || 0), 0), [pages]);
  const totalInteractions = useMemo(
    () => pages.reduce((acc, p) => acc + (p.cta_clicks_30d || 0) + (p.product_clicks_30d || 0), 0),
    [pages],
  );

  return (
    <div dir={dir}>
      <DashboardPageWrapper
        breadcrumbs={[
          { label: 'Accueil', href: '/hub/dashboard' },
          { label: 'Boutique en Ligne', href: '/hub/dashboard/online-store' },
          { label: 'Constructeur de Pages' },
        ]}
        headerTitle="Constructeur de Pages Sur-Mesure"
        headerSubtitle="Créez des pages d'atterrissage uniques pour vos lancements de produits ou vos opérations promotionnelles sans coder."
        headerIcon={LayoutTemplate}
        statusBadge={
          <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)] rounded-full">
            Drag & Drop Engine
          </span>
        }
        secondaryAction={
          <div className="flex items-center gap-2">
            <button
              onClick={onMaintenancePage}
              disabled={creating || (!maintenancePage && hasReachedPageLimit)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs disabled:opacity-50"
            >
              <Construction className="w-3.5 h-3.5 text-amber-600" />
              <span>{maintenancePage ? 'Page Maintenance' : 'Créer Maintenance'}</span>
            </button>

            <button
              onClick={onOpenTemplatePicker}
              disabled={hasReachedPageLimit}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs disabled:opacity-50"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Modèles</span>
            </button>
          </div>
        }
        primaryAction={
          <button
            onClick={onOpenCreateModal}
            disabled={hasReachedPageLimit}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Créer une Page</span>
          </button>
        }
        alertBanner={
          <div className="space-y-2">
            {error && (
              <div className="flex items-center gap-3 p-3.5 rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-800 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 p-3.5 rounded-[var(--rego-r,8px)] border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{success}</span>
              </div>
            )}
            {hasReachedPageLimit && (
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-[var(--rego-r,8px)] border border-amber-200 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Quota atteint ({pages.length} / {pageLimitLabel} pages). Passez à l&apos;abonnement supérieur pour créer des pages illimitées.
                  </span>
                </div>
                <Link
                  href="/hub/dashboard/subscription"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600 text-white rounded-md font-bold text-[11px] hover:bg-amber-700 transition-colors"
                >
                  <Crown className="w-3 h-3" />
                  Améliorer mon forfait
                </Link>
              </div>
            )}
          </div>
        }
        kpiStrip={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <ReGoKpiHero
              label="Pages Créées"
              value={`${pages.length} / ${pageLimitLabel}`}
              hint="Landing pages actives ou brouillons"
              icon={FileText}
            />
            <ReGoKpiHero
              label="Pages Publiées"
              value={publishedCount}
              hint="En ligne sur votre boutique"
              icon={Globe}
              accent
            />
            <ReGoKpiHero
              label="Vues Cumulées (30j)"
              value={totalViews.toLocaleString('fr-TN')}
              hint="Trafic total enregistré"
              icon={Eye}
            />
            <ReGoKpiHero
              label="Interactions CTA (30j)"
              value={totalInteractions.toLocaleString('fr-TN')}
              hint="Clics boutons & redirections"
              icon={MousePointerClick}
            />
          </div>
        }
        filterToolbar={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
                <input
                  type="text"
                  placeholder="Rechercher une page créée..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full ps-8 pe-3 py-1.5 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] focus:bg-[var(--rego-bg,#ffffff)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-0.5">
                {[
                  { id: 'all', label: 'Toutes' },
                  { id: 'published', label: 'Publiées' },
                  { id: 'draft', label: 'Brouillons' },
                  { id: 'homepage', label: 'Accueil' },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setStatusFilter(filter.id as any)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                      statusFilter === filter.id
                        ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                        : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-0.5">
                <button
                  onClick={() => setLayoutMode('list')}
                  className={`p-1.5 rounded transition-colors ${
                    layoutMode === 'list'
                      ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                      : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                  }`}
                  title="Vue Liste"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    layoutMode === 'grid'
                      ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                      : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                  }`}
                  title="Vue Grille"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        }
        mainContent={
          <div className="space-y-6">
            {/* Pages Table / Grid */}
            {filteredPages.length === 0 ? (
              <ReGoCard>
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--rego-surface,#f5f5f5)] flex items-center justify-center mx-auto mb-3">
                    <LayoutTemplate className="w-6 h-6 text-[var(--rego-ink-3,#949494)]" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
                    {searchQuery || statusFilter !== 'all' ? 'Aucune page correspondante' : 'Aucune page personnalisée'}
                  </h3>
                  <p className="text-xs text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto mt-1 mb-4">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Essayez de modifier votre terme de recherche ou de réinitialiser vos filtres.'
                      : 'Commencez à concevoir vos landing pages sur-mesure pour mettre en valeur votre histoire et vos produits.'}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={onOpenTemplatePicker}
                      disabled={hasReachedPageLimit}
                      className="px-3.5 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs disabled:opacity-50"
                    >
                      Choisir un Modèle
                    </button>
                    <button
                      onClick={onOpenCreateModal}
                      disabled={hasReachedPageLimit}
                      className="px-4 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
                    >
                      Page Vierge
                    </button>
                  </div>
                </div>
              </ReGoCard>
            ) : layoutMode === 'list' ? (
              <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/60 text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                        <th className="py-3 px-4">Titre de la Page</th>
                        <th className="py-3 px-4">URL d&apos;Accès</th>
                        <th className="py-3 px-4">Dernière Modification</th>
                        <th className="py-3 px-4">Statut</th>
                        <th className="py-3 px-4 text-center">Trafic & Clics</th>
                        <th className="py-3 px-4 text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60">
                      {filteredPages.map((page) => (
                        <tr
                          key={page.id}
                          className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors group cursor-pointer"
                          onClick={() => setSelectedPage(page)}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-md bg-[var(--rego-surface,#f5f5f5)] flex items-center justify-center shrink-0 border border-[var(--rego-border,#dedede)]">
                                <FileText className="w-4 h-4 text-[var(--rego-fg,#111111)]" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-[var(--rego-fg,#111111)] truncate">
                                    {page.title}
                                  </span>
                                  {page.is_homepage && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 rounded-full flex items-center gap-0.5">
                                      <Home className="w-2.5 h-2.5" /> Accueil
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[var(--rego-ink-3,#949494)]">
                                  ID: {page.id.slice(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--rego-ink-2,#737373)]">
                            <span className="px-2 py-0.5 rounded bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)]">
                              /pages/{page.slug}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-[11px] text-[var(--rego-ink-2,#737373)]">
                            {page.updated_at
                              ? new Date(page.updated_at).toLocaleDateString('fr-TN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>

                          <td className="py-3.5 px-4">
                            <ReGoStatusChip
                              status={page.is_published ? 'ok' : 'neutral'}
                              label={page.is_published ? 'Publiée' : 'Brouillon'}
                              size="xs"
                            />
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-3 text-[11px] font-bold text-[var(--rego-ink-2,#737373)]">
                              <span className="inline-flex items-center gap-1" title="Vues 30j">
                                <Eye className="w-3 h-3 text-[var(--rego-ink-3,#949494)]" />
                                <span>{(page.views_30d || 0).toLocaleString('fr-TN')}</span>
                              </span>
                              <span className="inline-flex items-center gap-1" title="Clics CTA 30j">
                                <MousePointerClick className="w-3 h-3 text-[var(--rego-ink-3,#949494)]" />
                                <span>{(page.cta_clicks_30d || 0).toLocaleString('fr-TN')}</span>
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-end" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => onOpenEditor(page)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-[var(--rego-fg,#111111)] text-white hover:opacity-90 transition-all shadow-2xs"
                                title="Ouvrir l'éditeur visuel"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Éditer</span>
                              </button>

                              <button
                                onClick={() => onTogglePublish(page)}
                                className="p-1.5 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors rounded hover:bg-[var(--rego-surface,#f5f5f5)]"
                                title={page.is_published ? 'Dépublier la page' : 'Publier la page'}
                              >
                                {page.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                onClick={() => onSetHomepage(page)}
                                className={`p-1.5 rounded transition-colors ${
                                  page.is_homepage
                                    ? 'text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                                    : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                                }`}
                                title={page.is_homepage ? 'Retirer de la page d\'accueil' : 'Définir comme page d\'accueil'}
                              >
                                <Home className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onDuplicatePage(page.id)}
                                disabled={hasReachedPageLimit}
                                className="p-1.5 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors rounded hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40"
                                title="Dupliquer la page"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {page.is_published && store?.subdomain && (
                                <a
                                  href={`/store/${store.subdomain}/pages/${page.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors rounded hover:bg-[var(--rego-surface,#f5f5f5)]"
                                  title="Voir en direct sur la boutique"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              <button
                                onClick={() => onDeletePage(page)}
                                className="p-1.5 text-[var(--rego-ink-2,#737373)] hover:text-rose-600 transition-colors rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                title="Supprimer la page"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPages.map((page) => (
                  <div
                    key={page.id}
                    onClick={() => setSelectedPage(page)}
                    className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-4 shadow-2xs hover:border-[var(--rego-fg,#111111)] transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-[var(--rego-surface,#f5f5f5)] flex items-center justify-center shrink-0 border border-[var(--rego-border,#dedede)]">
                            <FileText className="w-4 h-4 text-[var(--rego-fg,#111111)]" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-[var(--rego-fg,#111111)] truncate">{page.title}</h4>
                            <span className="font-mono text-[10px] text-[var(--rego-ink-2,#737373)]">
                              /pages/{page.slug}
                            </span>
                          </div>
                        </div>
                        <ReGoStatusChip
                          status={page.is_published ? 'ok' : 'neutral'}
                          label={page.is_published ? 'Publiée' : 'Brouillon'}
                          size="xs"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-[var(--rego-ink-3,#949494)] my-3">
                        {page.is_homepage && (
                          <span className="px-1.5 py-0.5 font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 rounded-full flex items-center gap-0.5">
                            <Home className="w-2.5 h-2.5" /> Accueil
                          </span>
                        )}
                        <span>
                          Modifiée le :{' '}
                          {page.updated_at
                            ? new Date(page.updated_at).toLocaleDateString('fr-TN', {
                                day: '2-digit',
                                month: 'short',
                              })
                            : '—'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 py-2 border-t border-[var(--rego-border,#dedede)]/60 text-[11px] text-[var(--rego-ink-2,#737373)]">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-[var(--rego-ink-3,#949494)]" />
                          <strong className="text-[var(--rego-fg,#111111)]">{(page.views_30d || 0).toLocaleString('fr-TN')}</strong> vues
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointerClick className="w-3 h-3 text-[var(--rego-ink-3,#949494)]" />
                          <strong className="text-[var(--rego-fg,#111111)]">{(page.cta_clicks_30d || 0).toLocaleString('fr-TN')}</strong> clics
                        </span>
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-between gap-1 pt-3 border-t border-[var(--rego-border,#dedede)] mt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onOpenEditor(page)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md bg-[var(--rego-fg,#111111)] text-white hover:opacity-90 transition-all shadow-2xs"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Éditer</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onTogglePublish(page)}
                          className="p-1.5 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors rounded hover:bg-[var(--rego-surface,#f5f5f5)]"
                          title={page.is_published ? 'Dépublier' : 'Publier'}
                        >
                          {page.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onSetHomepage(page)}
                          className={`p-1.5 rounded transition-colors ${
                            page.is_homepage ? 'text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40' : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                          }`}
                          title={page.is_homepage ? 'Retirer accueil' : 'Définir accueil'}
                        >
                          <Home className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDuplicatePage(page.id)}
                          disabled={hasReachedPageLimit}
                          className="p-1.5 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors rounded hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-40"
                          title="Dupliquer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeletePage(page)}
                          className="p-1.5 text-[var(--rego-ink-2,#737373)] hover:text-rose-600 transition-colors rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Component Palette */}
            <ReGoCard
              title="Palette des Composants Disponibles"
              subtitle="Composants modulaires insérables directement via le constructeur visuel de pages"
              icon={Layers}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {PALETTE_BLOCKS.map((block, idx) => {
                  const Icon = block.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 hover:bg-[var(--rego-bg,#ffffff)] hover:border-[var(--rego-border,#dedede)] transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="w-7 h-7 rounded bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] flex items-center justify-center text-[var(--rego-accent,#ad0505)]">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-3,#949494)] bg-[var(--rego-surface,#f5f5f5)] px-2 py-0.5 rounded">
                            {block.tag}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">{block.title}</h4>
                        <p className="text-[11px] text-[var(--rego-ink-2,#737373)] mt-1 leading-relaxed">
                          {block.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ReGoCard>
          </div>
        }
        drawer={
          <ReGoDrawer
            isOpen={!!selectedPage}
            onClose={() => setSelectedPage(null)}
            title={selectedPage?.title || 'Détails de la Page'}
            subtitle={selectedPage ? `/pages/${selectedPage.slug}` : undefined}
            footer={
              selectedPage && (
                <div className="flex items-center justify-between w-full">
                  <button
                    onClick={() => {
                      const p = selectedPage;
                      setSelectedPage(null);
                      onDeletePage(p);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                  >
                    Supprimer la page
                  </button>
                  <button
                    onClick={() => {
                      const p = selectedPage;
                      setSelectedPage(null);
                      onOpenEditor(p);
                    }}
                    className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-[var(--rego-fg,#111111)] text-white rounded-md hover:opacity-90 transition-all shadow-2xs"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Ouvrir dans l&apos;Éditeur</span>
                  </button>
                </div>
              )
            }
          >
            {selectedPage && (
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--rego-ink-2,#737373)]">Statut actuel</span>
                    <ReGoStatusChip
                      status={selectedPage.is_published ? 'ok' : 'neutral'}
                      label={selectedPage.is_published ? 'Publiée en ligne' : 'Brouillon privé'}
                      size="xs"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--rego-ink-2,#737373)]">Page d&apos;accueil</span>
                    <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                      {selectedPage.is_homepage ? 'Oui (Prioritaire)' : 'Non'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--rego-ink-2,#737373)]">Afficher au menu</span>
                    <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                      {selectedPage.show_in_navigation ? 'Oui' : 'Non'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--rego-ink-2,#737373)]">Afficher au footer</span>
                    <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                      {selectedPage.show_in_footer ? 'Oui' : 'Non'}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-2">
                    Métadonnées & Référencement (SEO)
                  </h4>
                  <div className="space-y-2 text-xs border border-[var(--rego-border,#dedede)] rounded-md p-3">
                    <div>
                      <span className="font-bold text-[var(--rego-ink-2,#737373)]">Titre SEO (Balise Title) :</span>
                      <p className="text-[var(--rego-fg,#111111)] font-medium mt-0.5">
                        {selectedPage.seo_title || selectedPage.title}
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-[var(--rego-ink-2,#737373)]">Méta-description :</span>
                      <p className="text-[var(--rego-fg,#111111)] font-medium mt-0.5">
                        {selectedPage.seo_description || 'Aucune méta-description personnalisée définie.'}
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-[var(--rego-ink-2,#737373)]">Indexation Google :</span>
                      <p className="text-[var(--rego-fg,#111111)] font-medium mt-0.5">
                        {selectedPage.noindex ? 'noindex (Page masquée des moteurs)' : 'index, follow (Indexée publiquement)'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-2">
                    Performances sur 30 Jours
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-md bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)]">
                      <span className="text-[10px] font-bold uppercase text-[var(--rego-ink-3,#949494)]">Vues Uniques</span>
                      <p className="text-lg font-black text-[var(--rego-fg,#111111)] mt-1">
                        {(selectedPage.views_30d || 0).toLocaleString('fr-TN')}
                      </p>
                    </div>
                    <div className="p-3 rounded-md bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)]">
                      <span className="text-[10px] font-bold uppercase text-[var(--rego-ink-3,#949494)]">Clics CTA</span>
                      <p className="text-lg font-black text-[var(--rego-fg,#111111)] mt-1">
                        {(selectedPage.cta_clicks_30d || 0).toLocaleString('fr-TN')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ReGoDrawer>
        }
      />
    </div>
  );
}
