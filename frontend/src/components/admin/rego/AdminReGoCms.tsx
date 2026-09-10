'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  FileText,
  Plus,
  Search,
  ExternalLink,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Globe,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Layout,
  Navigation,
  FolderOpen,
} from 'lucide-react';
import { DashboardPageWrapper } from '@/components/dashboard/DashboardPageWrapper';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface PlatformPage {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  show_in_footer: boolean;
  show_in_header: boolean;
  updated_at: string;
}

export interface AdminReGoCmsProps {
  pages: PlatformPage[];
  isLoading: boolean;
  onCreatePage: (title: string, slug: string, isPublished: boolean) => Promise<void>;
  onDeletePage: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export function AdminReGoCms({
  pages,
  isLoading,
  onCreatePage,
  onDeletePage,
  onRefresh,
}: AdminReGoCmsProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [placementFilter, setPlacementFilter] = useState<'all' | 'header' | 'footer'>('all');
  const [selectedPage, setSelectedPage] = useState<PlatformPage | null>(null);

  // Creation modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newIsPublished, setNewIsPublished] = useState(false);
  const [creating, setCreating] = useState(false);

  // Auto-slug generator
  const handleTitleChange = (val: string) => {
    setNewTitle(val);
    const generated = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setNewSlug(generated);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await onCreatePage(newTitle.trim(), newSlug.trim() || 'page', newIsPublished);
      setCreateModalOpen(false);
      setNewTitle('');
      setNewSlug('');
      setNewIsPublished(false);
    } finally {
      setCreating(false);
    }
  };

  // Filtered pages
  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const matchSearch =
        page.title.toLowerCase().includes(search.toLowerCase()) ||
        page.slug.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'published'
          ? page.is_published
          : !page.is_published;
      const matchPlacement =
        placementFilter === 'all'
          ? true
          : placementFilter === 'header'
          ? page.show_in_header
          : page.show_in_footer;
      return matchSearch && matchStatus && matchPlacement;
    });
  }, [pages, search, statusFilter, placementFilter]);

  // Telemetry counts
  const publishedCount = useMemo(() => pages.filter((p) => p.is_published).length, [pages]);
  const draftCount = useMemo(() => pages.filter((p) => !p.is_published).length, [pages]);
  const footerCount = useMemo(() => pages.filter((p) => p.show_in_footer).length, [pages]);
  const headerCount = useMemo(() => pages.filter((p) => p.show_in_header).length, [pages]);

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Administration', href: '/dashboard' },
        { label: 'Gouvernance', href: '/settings' },
        { label: 'Articles CMS & Politiques' },
      ]}
      headerTitle="Gestionnaire de Contenu CMS & Politiques"
      headerSubtitle="Rédigez, mettez à jour et publiez les pages d'information, les chartes légales, les guides pratiques et les annonces officielles."
      headerIcon={BookOpen}
      statusBadge={
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
            {publishedCount} Pages Publiées en Ligne
          </span>
        </div>
      }
      secondaryAction={
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      }
      primaryAction={
        <button
          onClick={() => {
            setNewTitle('');
            setNewSlug('');
            setNewIsPublished(false);
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 transition-all shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Rédiger un Nouvel Article</span>
        </button>
      }
      kpiStrip={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <ReGoKpiHero
            label="Total Pages CMS"
            value={pages.length}
            hint="Répertoire éditorial complet"
            icon={FileText}
            accent
          />
          <ReGoKpiHero
            label="Pages Publiées"
            value={publishedCount}
            hint="Accessibles aux internautes"
            icon={Globe}
          />
          <ReGoKpiHero
            label="Brouillons Privés"
            value={draftCount}
            hint="En cours de rédaction"
            icon={Clock}
          />
          <ReGoKpiHero
            label="Menu Pied de Page"
            value={footerCount}
            hint="Liens légaux dans le footer"
            icon={Layout}
          />
          <ReGoKpiHero
            label="En-Tête / Navigation"
            value={headerCount}
            hint="Affichées dans le mégamenu"
            icon={Navigation}
          />
        </div>
      }
      filterToolbar={
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rego-border,#dedede)]/70 pb-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article par titre, slug ou URL..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] placeholder:text-[var(--rego-ink-3,#949494)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="py-1.5 px-3 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publiées en ligne</option>
              <option value="draft">Brouillons privés</option>
            </select>

            <select
              value={placementFilter}
              onChange={(e) => setPlacementFilter(e.target.value as any)}
              className="py-1.5 px-3 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
            >
              <option value="all">Tous les emplacements</option>
              <option value="footer">Pied de page (Footer)</option>
              <option value="header">En-tête (Header)</option>
            </select>
          </div>
        </div>
      }
      mainContent={
        <ReGoCard noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/60 text-[var(--rego-ink-2,#737373)] uppercase font-bold text-[10px] tracking-wider">
                  <th className="px-4 py-3">Titre de l&apos;Article</th>
                  <th className="px-4 py-3">Slug Canonique</th>
                  <th className="px-4 py-3">Emplacements</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3">Dernière Modification</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[var(--rego-ink-3,#949494)]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--rego-accent,#ad0505)]" />
                      Chargement des articles CMS...
                    </td>
                  </tr>
                ) : filteredPages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[var(--rego-ink-3,#949494)]">
                      Aucun article CMS ne correspond à votre recherche.
                    </td>
                  </tr>
                ) : (
                  filteredPages.map((page) => (
                    <tr
                      key={page.id}
                      className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/cms/${page.id}`}
                          className="font-bold text-[var(--rego-fg,#111111)] hover:text-[var(--rego-accent,#ad0505)] transition-colors"
                        >
                          {page.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--rego-ink-2,#737373)]">
                        /hub/pages/{page.slug}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {page.show_in_header && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Header
                            </span>
                          )}
                          {page.show_in_footer && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                              Footer
                            </span>
                          )}
                          {!page.show_in_header && !page.show_in_footer && (
                            <span className="text-[10px] text-[var(--rego-ink-3,#949494)]">Non lié</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ReGoStatusChip
                          status={page.is_published ? 'ok' : 'neutral'}
                          label={page.is_published ? 'Publié' : 'Brouillon'}
                        />
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[var(--rego-ink-2,#737373)] whitespace-nowrap">
                        {page.updated_at
                          ? new Date(page.updated_at).toLocaleDateString('fr-TN', {
                              dateStyle: 'short',
                            })
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedPage(page)}
                            className="p-1.5 rounded text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                            title="Aperçu rapide"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/cms/${page.id}`}
                            className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50"
                            title="Éditer le contenu de la page"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/hub/pages/${page.slug}`}
                            target="_blank"
                            className="p-1.5 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            title="Voir la page publique"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => onDeletePage(page.id)}
                            className="p-1.5 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Supprimer la page"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ReGoCard>
      }
      drawer={
        <ReGoDrawer
          isOpen={!!selectedPage}
          onClose={() => setSelectedPage(null)}
          title="Fiche Technique de la Page CMS"
          subtitle={selectedPage ? selectedPage.title : ''}
          width="max-w-md"
        >
          {selectedPage && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/60 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[var(--rego-fg,#111111)]">{selectedPage.title}</h4>
                  <p className="font-mono text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5">
                    /hub/pages/{selectedPage.slug}
                  </p>
                </div>
                <ReGoStatusChip
                  status={selectedPage.is_published ? 'ok' : 'neutral'}
                  label={selectedPage.is_published ? 'Publié' : 'Brouillon'}
                />
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] flex justify-between">
                  <span className="font-bold text-[var(--rego-fg,#111111)]">Lien dans le Footer :</span>
                  <span>{selectedPage.show_in_footer ? 'Oui (Visible)' : 'Non'}</span>
                </div>
                <div className="p-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] flex justify-between">
                  <span className="font-bold text-[var(--rego-fg,#111111)]">Lien dans l&apos;En-Tête :</span>
                  <span>{selectedPage.show_in_header ? 'Oui (Visible)' : 'Non'}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <Link
                  href={`/cms/${selectedPage.id}`}
                  className="flex-1 py-2 text-center font-bold text-xs rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90"
                >
                  Ouvrir l&apos;Éditeur Complet
                </Link>
                <Link
                  href={`/hub/pages/${selectedPage.slug}`}
                  target="_blank"
                  className="px-3 py-2 font-bold text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </ReGoDrawer>
      }
      modals={
        <ReGoModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Créer une Nouvelle Page CMS"
          subtitle="Définissez le titre et le slug de la page avant de rédiger son contenu"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                Titre de la Page (ex: Conditions Générales de Vente)
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="ex: Conditions d'Utilisation"
                className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
              />
            </div>
            <div>
              <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                Slug URL (automatique ou sur-mesure)
              </label>
              <input
                type="text"
                required
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="conditions-utilisation"
                className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
              />
              <p className="text-[10px] text-[var(--rego-ink-3,#949494)] mt-0.5">
                URL finale : /hub/pages/{newSlug || 'votre-slug'}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="new_is_published"
                checked={newIsPublished}
                onChange={(e) => setNewIsPublished(e.target.checked)}
                className="rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)]"
              />
              <label htmlFor="new_is_published" className="font-bold text-[var(--rego-fg,#111111)] cursor-pointer">
                Publier immédiatement en ligne
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--rego-border,#dedede)]">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{creating ? 'Création...' : 'Créer & Éditer'}</span>
              </button>
            </div>
          </form>
        </ReGoModal>
      }
    />
  );
}
