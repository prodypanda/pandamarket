'use client';

import React, { useState } from 'react';
import {
  Navigation,
  Plus,
  Trash2,
  Save,
  Send,
  RefreshCw,
  PanelBottom,
  PanelTop,
  GripVertical,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Layers,
  FolderTree,
  FileText,
  CornerDownRight,
  Pencil,
  Sliders,
  Link2,
  Package,
  LucideIcon,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { ReGoCard, ReGoKpiHero, ReGoDrawer } from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';
import { ReferenceSelector } from '../ReferenceSelector';
import { UnsavedChangesBanner } from '../UnsavedChangesBanner';

export interface MenuItem {
  id: string;
  type: 'page' | 'product' | 'category' | 'collection' | 'custom_url';
  localized_label: string;
  url: string;
  reference_id?: string | null;
  target?: '_self' | '_blank';
  children?: MenuItem[];
}

export interface Menu {
  id: string;
  location: 'header' | 'footer' | 'mobile' | 'utility';
  items: MenuItem[];
}

export interface FooterBlock {
  id: string;
  type: string;
  title: string;
  content: Record<string, unknown>;
  sort_order: number;
}

export interface SellerReGoNavigationProps {
  menus: Menu[];
  footerBlocks: FooterBlock[];
  isDirty: boolean;
  saving: boolean;
  publishing: boolean;
  feedback: { message: string; isError?: boolean } | null;
  onSaveDraft: () => Promise<void>;
  onPublish: () => Promise<void>;
  onReset: () => void;
  onAddItem: (location: Menu['location'], type: MenuItem['type']) => void;
  onUpdateItem: (location: Menu['location'], itemId: string, field: keyof MenuItem, value: string) => void;
  onRemoveItem: (location: Menu['location'], itemId: string) => void;
  onMoveItem: (location: Menu['location'], itemId: string, direction: 'up' | 'down') => void;
  onAddChildItem: (location: Menu['location'], parentId: string) => void;
  onAddBlock: () => void;
  onUpdateBlock: (blockId: string, field: keyof FooterBlock, value: unknown) => void;
  onUpdateBlockContent: (blockId: string, key: string, value: unknown) => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, direction: 'up' | 'down') => void;
  dir?: 'ltr' | 'rtl';
}

const FOOTER_BLOCK_TYPES: { value: string; labelKey: string }[] = [
  { value: 'text', labelKey: 'storefrontNav.footerBlock.text.label' },
  { value: 'menu', labelKey: 'storefrontNav.footerBlock.menu.label' },
  { value: 'contact', labelKey: 'storefrontNav.footerBlock.contact.label' },
  { value: 'social', labelKey: 'storefrontNav.footerBlock.social.label' },
  { value: 'newsletter', labelKey: 'storefrontNav.footerBlock.newsletter.label' },
  { value: 'payment_badges', labelKey: 'storefrontNav.footerBlock.payment_badges.label' },
  { value: 'legal', labelKey: 'storefrontNav.footerBlock.legal.label' },
  { value: 'map', labelKey: 'storefrontNav.footerBlock.map.label' },
];

const ITEM_TYPE_ICONS: Record<MenuItem['type'], LucideIcon> = {
  custom_url: Link2,
  page: FileText,
  product: Package,
  category: FolderTree,
  collection: Layers,
};

const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'x', 'tiktok', 'youtube', 'whatsapp'] as const;

export function SellerReGoNavigation({
  menus,
  footerBlocks,
  isDirty,
  saving,
  publishing,
  feedback,
  onSaveDraft,
  onPublish,
  onReset,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
  onAddChildItem,
  onAddBlock,
  onUpdateBlock,
  onUpdateBlockContent,
  onRemoveBlock,
  onMoveBlock,
  dir = 'ltr',
}: SellerReGoNavigationProps) {
  const { t } = useLocale();

  const [activeTab, setActiveTab] = useState<Menu['location']>('header');
  const [editingItem, setEditingItem] = useState<{ location: Menu['location']; item: MenuItem } | null>(null);

  const activeMenu = menus.find((m) => m.location === activeTab) || {
    id: activeTab,
    location: activeTab,
    items: [],
  };

  const headerItemsCount = menus.find((m) => m.location === 'header')?.items.length || 0;
  const footerBlocksCount = footerBlocks.length;

  const navTabs: { id: Menu['location']; label: string; icon: LucideIcon }[] = [
    { id: 'header', label: 'Menu Principal (En-tête / Header)', icon: Navigation },
    { id: 'mobile', label: 'Navigation Mobile (Tiroir)', icon: Sliders },
    { id: 'utility', label: t('storefrontNav.locations.utility'), icon: PanelTop },
    { id: 'footer', label: 'Pied de Page (Footer)', icon: PanelBottom },
  ];

  return (
    <>
      <DashboardPageWrapper
        breadcrumbs={[
          { label: 'Accueil', href: '/hub/dashboard' },
          { label: 'Boutique en Ligne', href: '/hub/dashboard/online-store' },
          { label: 'Menus & Navigation' },
        ]}
        headerTitle="Éditeur des Menus & Arborescence de Navigation"
        headerSubtitle="Configurez les liens du menu principal d'en-tête, les menus déroulants et les colonnes informatives du pied de page."
        headerIcon={Navigation}
        statusBadge={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Arborescence Multi-Niveaux
            </span>
            {isDirty ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Modifications non enregistrées
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
                Synchronisé
              </span>
            )}
          </div>
        }
        primaryAction={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={saving || !isDirty}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Enregistrer brouillon</span>
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={publishing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
            >
              {publishing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Publier la navigation</span>
            </button>
          </div>
        }
        alertBanner={
          feedback && (
            <div
              className={`p-3.5 rounded-[var(--rego-r,8px)] text-xs font-semibold flex items-center gap-2.5 border ${
                feedback.isError
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {feedback.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )
        }
        kpiStrip={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <ReGoKpiHero
              label="Liens Menu d'En-tête"
              value={`${headerItemsCount} Liens`}
              hint="Éléments affichés dans la barre supérieure"
              delta={headerItemsCount}
              deltaLabel="liens actifs"
              deltaType="increase"
            />
            <ReGoKpiHero
              label="Blocs Pied de Page"
              value={`${footerBlocksCount} Blocs`}
              hint="Colonnes et informations de réassurance"
              delta={footerBlocksCount}
              deltaLabel="colonnes"
              deltaType="neutral"
            />
            <ReGoKpiHero
              label="Navigation Mobile"
              value="Menu Tiroir Dédié"
              hint="Optimisé smartphones & tablettes"
              delta={100}
              deltaLabel="tactile"
              deltaType="increase"
            />
            <ReGoKpiHero
              label="Profondeur d'Arborescence"
              value="Niveau 2 (Sous-liens)"
              hint="Mégamenus et catégories imbriquées"
              delta={2}
              deltaLabel="niveaux"
              deltaType="neutral"
            />
          </div>
        }
        filterToolbar={
          <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)]'
                        : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div>
              {activeTab === 'footer' ? (
                <button
                  type="button"
                  onClick={onAddBlock}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un bloc pied de page</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onAddItem(activeTab, 'custom_url')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un lien</span>
                </button>
              )}
            </div>
          </div>
        }
        mainContent={
          <div className="space-y-4">
            {/* HEADER / MOBILE / UTILITY TAB: Tree of MenuItems */}
            {activeTab !== 'footer' && (
              <ReGoCard
                title={
                  activeTab === 'header'
                    ? 'Arborescence des Liens du Menu Principal'
                    : activeTab === 'mobile'
                    ? 'Arborescence de la Navigation Mobile'
                    : t('storefrontNav.locations.utility')
                }
                subtitle={
                  activeTab === 'utility'
                    ? t('storefrontNav.locations.utilityDesc')
                    : 'Glissez ou utilisez les flèches pour réordonner les onglets de votre boutique.'
                }
              >
                {activeMenu.items.length === 0 ? (
                  <div className="text-center py-12 text-[var(--rego-ink-2,#737373)]">
                    <Navigation className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-bold">Aucun lien dans ce menu pour le moment.</p>
                    <button
                      type="button"
                      onClick={() => onAddItem(activeTab, 'custom_url')}
                      className="mt-3 px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold"
                    >
                      Ajouter le premier lien
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeMenu.items.map((item, idx) => {
                      const TypeIcon = ITEM_TYPE_ICONS[item.type];
                      return (
                        <div key={item.id} className="space-y-2">
                          {/* Level 1 item card */}
                          <div className="p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => onMoveItem(activeTab, item.id, 'up')}
                                  disabled={idx === 0}
                                  className="p-0.5 hover:bg-[var(--rego-surface,#f5f5f5)] rounded text-[var(--rego-ink-2,#737373)] disabled:opacity-20"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onMoveItem(activeTab, item.id, 'down')}
                                  disabled={idx === activeMenu.items.length - 1}
                                  className="p-0.5 hover:bg-[var(--rego-surface,#f5f5f5)] rounded text-[var(--rego-ink-2,#737373)] disabled:opacity-20"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div>
                                <input
                                  type="text"
                                  value={item.localized_label}
                                  onChange={(e) =>
                                    onUpdateItem(activeTab, item.id, 'localized_label', e.target.value)
                                  }
                                  className="font-bold text-xs text-[var(--rego-fg,#111111)] border-b border-transparent hover:border-[var(--rego-border,#dedede)] focus:border-[var(--rego-accent,#ad0505)] outline-none bg-transparent"
                                />
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--rego-ink-2,#737373)]">
                                  <span className="font-mono">{item.url || '/'}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] text-[10px] uppercase font-bold inline-flex items-center gap-1">
                                    <TypeIcon className="w-2.5 h-2.5" />
                                    {item.type}
                                  </span>
                                  {item.reference_id && (
                                    <span className="px-1.5 py-0.5 rounded bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] text-[10px] font-bold font-mono">
                                      # {item.reference_id.slice(-8)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {(activeTab === 'header' || activeTab === 'mobile') && (
                                <button
                                  type="button"
                                  onClick={() => onAddChildItem(activeTab, item.id)}
                                  className="px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-border,#dedede)]/40 flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Sous-lien</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setEditingItem({ location: activeTab, item })}
                                className="p-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] hover:bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)]"
                                title="Modifier cible"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => onRemoveItem(activeTab, item.id)}
                                className="p-1.5 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Children / Level 2 sub-links */}
                          {item.children && item.children.length > 0 && (
                            <div className="pl-6 sm:pl-8 space-y-1.5 border-l-2 border-[var(--rego-border,#dedede)] ml-4">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-3,#949494)]">
                                  {t('storefrontNav.subLinks')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onAddChildItem(activeTab, item.id)}
                                  className="text-[10px] font-bold text-[var(--rego-fg,#111111)] hover:underline"
                                >
                                  {t('storefrontNav.add')}
                                </button>
                              </div>
                              {item.children.map((child) => (
                                <div
                                  key={child.id}
                                  className="p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50 flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <CornerDownRight className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
                                    <div className="flex flex-wrap items-center gap-2">
                                      <input
                                        type="text"
                                        value={child.localized_label}
                                        onChange={(e) =>
                                          onUpdateItem(activeTab, child.id, 'localized_label', e.target.value)
                                        }
                                        placeholder={t('storefrontNav.labelPlaceholder')}
                                        className="font-semibold text-xs text-[var(--rego-fg,#111111)] outline-none bg-transparent border-b border-transparent focus:border-[var(--rego-accent,#ad0505)]"
                                      />
                                      <input
                                        type="text"
                                        value={child.url}
                                        onChange={(e) => onUpdateItem(activeTab, child.id, 'url', e.target.value)}
                                        placeholder={t('storefrontNav.urlPlaceholder')}
                                        className="font-mono text-[10px] text-[var(--rego-ink-2,#737373)] w-32 px-1.5 py-0.5 rounded-[var(--rego-r,8px)] border border-transparent hover:border-[var(--rego-border,#dedede)] focus:border-[var(--rego-accent,#ad0505)] outline-none bg-transparent"
                                      />
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => onRemoveItem(activeTab, child.id)}
                                    className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ReGoCard>
            )}

            {/* FOOTER TAB: Footer Blocks */}
            {activeTab === 'footer' && (
              <ReGoCard
                title="Colonnes & Blocs d'Informations du Pied de Page"
                subtitle="Gérez les textes légaux, menus d'aide, coordonnées et mentions obligatoires."
              >
                {footerBlocks.length === 0 ? (
                  <div className="text-center py-12 text-[var(--rego-ink-2,#737373)]">
                    <PanelBottom className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-bold">{t('storefrontNav.emptyFooter')}</p>
                    <button
                      type="button"
                      onClick={onAddBlock}
                      className="mt-3 px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold"
                    >
                      {t('storefrontNav.addBlock')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {footerBlocks.map((block, idx) => (
                      <div
                        key={block.id}
                        className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-xs space-y-3"
                      >
                        {/* Block header: reorder + title + type + delete */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex flex-col gap-0.5 items-center self-start sm:self-center">
                            <button
                              type="button"
                              onClick={() => onMoveBlock(block.id, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 hover:bg-[var(--rego-surface,#f5f5f5)] rounded text-[var(--rego-ink-2,#737373)] disabled:opacity-20"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <GripVertical className="w-3 h-3 text-[var(--rego-ink-3,#949494)]" />
                            <button
                              type="button"
                              onClick={() => onMoveBlock(block.id, 'down')}
                              disabled={idx === footerBlocks.length - 1}
                              className="p-0.5 hover:bg-[var(--rego-surface,#f5f5f5)] rounded text-[var(--rego-ink-2,#737373)] disabled:opacity-20"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={block.title}
                              onChange={(e) => onUpdateBlock(block.id, 'title', e.target.value)}
                              placeholder={t('storefrontNav.blockTitlePlaceholder')}
                              className="w-full font-bold text-xs text-[var(--rego-fg,#111111)] outline-none border-b border-transparent focus:border-[var(--rego-accent,#ad0505)] bg-transparent"
                            />
                            <span className="text-[11px] text-[var(--rego-ink-2,#737373)] block">
                              Bloc {idx + 1} / {footerBlocks.length}
                            </span>
                          </div>

                          <select
                            value={block.type}
                            onChange={(e) => onUpdateBlock(block.id, 'type', e.target.value)}
                            className="w-44 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                          >
                            {FOOTER_BLOCK_TYPES.map((bt) => (
                              <option key={bt.value} value={bt.value}>
                                {t(bt.labelKey)}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => onRemoveBlock(block.id)}
                            className="p-1.5 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Type-specific content fields */}
                        <ReGoFooterBlockContentEditor
                          block={block}
                          onUpdateContent={(key, value) => onUpdateBlockContent(block.id, key, value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </ReGoCard>
            )}
          </div>
        }
        drawer={
          <ReGoDrawer
            isOpen={Boolean(editingItem)}
            onClose={() => setEditingItem(null)}
            title={`Paramètres du Lien : ${editingItem?.item.localized_label || ''}`}
          >
            {editingItem && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block font-bold text-[var(--rego-fg,#111111)]">Type de Lien</label>
                  <select
                    value={editingItem.item.type}
                    onChange={(e) => {
                      const val = e.target.value as MenuItem['type'];
                      onUpdateItem(editingItem.location, editingItem.item.id, 'type', val);
                      setEditingItem((prev) =>
                        prev
                          ? { ...prev, item: { ...prev.item, type: val, reference_id: '' } }
                          : null,
                      );
                    }}
                    className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] outline-none"
                  >
                    <option value="custom_url">{t('storefrontNav.itemType.customUrl')}</option>
                    <option value="page">{t('storefrontNav.itemType.page')}</option>
                    <option value="product">{t('storefrontNav.itemType.product')}</option>
                    <option value="category">{t('storefrontNav.itemType.category')}</option>
                    <option value="collection">{t('storefrontNav.itemType.collection')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-[var(--rego-fg,#111111)]">Libellé Affiché</label>
                  <input
                    type="text"
                    value={editingItem.item.localized_label}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateItem(editingItem.location, editingItem.item.id, 'localized_label', val);
                      setEditingItem((prev) =>
                        prev ? { ...prev, item: { ...prev.item, localized_label: val } } : null
                      );
                    }}
                    className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-[var(--rego-fg,#111111)]">URL de Destination</label>
                  <input
                    type="text"
                    value={editingItem.item.url}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateItem(editingItem.location, editingItem.item.id, 'url', val);
                      setEditingItem((prev) =>
                        prev ? { ...prev, item: { ...prev.item, url: val } } : null
                      );
                    }}
                    placeholder={t('storefrontNav.urlPlaceholder')}
                    className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-mono font-medium text-[var(--rego-fg,#111111)] outline-none"
                  />
                </div>

                {editingItem.item.type !== 'custom_url' && (
                  <div className="space-y-1">
                    <label className="block font-bold text-[var(--rego-fg,#111111)]">Contenu Lié</label>
                    <ReferenceSelector
                      key={editingItem.item.type}
                      type={editingItem.item.type as 'page' | 'product' | 'category' | 'collection'}
                      value={editingItem.item.reference_id || ''}
                      onChange={(id) => {
                        onUpdateItem(editingItem.location, editingItem.item.id, 'reference_id', id);
                        setEditingItem((prev) =>
                          prev ? { ...prev, item: { ...prev.item, reference_id: id } } : null
                        );
                      }}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block font-bold text-[var(--rego-fg,#111111)]">Cible d&apos;Ouverture</label>
                  <select
                    value={editingItem.item.target || '_self'}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateItem(editingItem.location, editingItem.item.id, 'target', val);
                      setEditingItem((prev) =>
                        prev ? { ...prev, item: { ...prev.item, target: val as MenuItem['target'] } } : null
                      );
                    }}
                    className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] outline-none"
                  >
                    <option value="_self">Même onglet (_self)</option>
                    <option value="_blank">Nouvel onglet (_blank)</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-[var(--rego-border,#dedede)] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </ReGoDrawer>
        }
      />
      <UnsavedChangesBanner isDirty={isDirty} onSave={onSaveDraft} onReset={onReset} saving={saving} />
    </>
  );
}

function ReGoFooterBlockContentEditor({
  block,
  onUpdateContent,
}: {
  block: FooterBlock;
  onUpdateContent: (key: string, value: unknown) => void;
}) {
  const { t } = useLocale();
  const inputClass =
    'w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-semibold text-[var(--rego-fg,#111111)] placeholder:text-[var(--rego-ink-3,#949494)] outline-none focus:border-[var(--rego-accent,#ad0505)]';

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
      const links = Array.isArray(content.links)
        ? (content.links as { url?: string; label?: string }[])
        : [];
      return (
        <div className="space-y-2">
          {links.map((link, idx) => (
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
                className="p-2 rounded-[var(--rego-r,8px)] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onUpdateContent('links', [...links, { label: '', url: '/' }])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-border,#dedede)]/40"
          >
            <Plus className="w-3 h-3" />
            <span>{t('storefrontNav.footerBlock.addLink')}</span>
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
          {SOCIAL_PLATFORMS.map((platform) => (
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
          <p className="text-xs text-[var(--rego-ink-2,#737373)]">
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
