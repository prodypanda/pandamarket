'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Layers,
  FolderTree,
  FileText,
  CornerDownRight,
  Pencil,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

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
  onAddItem: (location: Menu['location'], type: MenuItem['type']) => void;
  onUpdateItem: (location: Menu['location'], itemId: string, field: keyof MenuItem, value: string) => void;
  onRemoveItem: (location: Menu['location'], itemId: string) => void;
  onMoveItem: (location: Menu['location'], itemId: string, direction: 'up' | 'down') => void;
  onAddChildItem: (location: Menu['location'], parentId: string) => void;
  onAddBlock: () => void;
  onUpdateBlock: (blockId: string, field: keyof FooterBlock, value: unknown) => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, direction: 'up' | 'down') => void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoNavigation({
  menus,
  footerBlocks,
  isDirty,
  saving,
  publishing,
  feedback,
  onSaveDraft,
  onPublish,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
  onAddChildItem,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  onMoveBlock,
  dir = 'ltr',
}: SellerReGoNavigationProps) {
  const { t } = useLocale();

  const [activeTab, setActiveTab] = useState<'header' | 'footer' | 'mobile'>('header');
  const [editingItem, setEditingItem] = useState<{ location: Menu['location']; item: MenuItem } | null>(null);

  const activeMenu = menus.find((m) => m.location === activeTab) || {
    id: activeTab,
    location: activeTab,
    items: [],
  };

  const headerItemsCount = menus.find((m) => m.location === 'header')?.items.length || 0;
  const footerBlocksCount = footerBlocks.length;

  return (
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
            {[
              { id: 'header', label: 'Menu Principal (En-tête / Header)', icon: Navigation },
              { id: 'mobile', label: 'Navigation Mobile (Tiroir)', icon: Sliders },
              { id: 'footer', label: 'Pied de Page (Footer)', icon: PanelBottom },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
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
                onClick={() => onAddItem(activeTab as any, 'custom_url')}
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
          {/* HEADER / MOBILE TAB: Tree of MenuItems */}
          {(activeTab === 'header' || activeTab === 'mobile') && (
            <ReGoCard
              title={activeTab === 'header' ? 'Arborescence des Liens du Menu Principal' : 'Arborescence de la Navigation Mobile'}
              subtitle="Glissez ou utilisez les flèches pour réordonner les onglets de votre boutique."
            >
              {activeMenu.items.length === 0 ? (
                <div className="text-center py-12 text-[var(--rego-ink-2,#737373)]">
                  <Navigation className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">Aucun lien dans ce menu pour le moment.</p>
                  <button
                    type="button"
                    onClick={() => onAddItem(activeTab as any, 'custom_url')}
                    className="mt-3 px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold"
                  >
                    Ajouter le premier lien
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeMenu.items.map((item, idx) => (
                    <div key={item.id} className="space-y-2">
                      {/* Level 1 item card */}
                      <div className="p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => onMoveItem(activeTab as any, item.id, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 hover:bg-[var(--rego-surface,#f5f5f5)] rounded text-[var(--rego-ink-2,#737373)] disabled:opacity-20"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onMoveItem(activeTab as any, item.id, 'down')}
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
                                onUpdateItem(activeTab as any, item.id, 'localized_label', e.target.value)
                              }
                              className="font-bold text-xs text-[var(--rego-fg,#111111)] border-b border-transparent hover:border-[var(--rego-border,#dedede)] focus:border-[var(--rego-accent,#ad0505)] outline-none bg-transparent"
                            />
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--rego-ink-2,#737373)]">
                              <span className="font-mono">{item.url || '/'}</span>
                              <span className="px-1.5 py-0.5 rounded bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] text-[10px] uppercase font-bold">
                                {item.type}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAddChildItem(activeTab as any, item.id)}
                            className="px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-border,#dedede)]/40 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Sous-lien</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingItem({ location: activeTab as any, item })}
                            className="p-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] hover:bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)]"
                            title="Modifier cible"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemoveItem(activeTab as any, item.id)}
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
                          {item.children.map((child) => (
                            <div
                              key={child.id}
                              className="p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <CornerDownRight className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
                                <div>
                                  <input
                                    type="text"
                                    value={child.localized_label}
                                    onChange={(e) =>
                                      onUpdateItem(activeTab as any, child.id, 'localized_label', e.target.value)
                                    }
                                    className="font-semibold text-xs text-[var(--rego-fg,#111111)] outline-none bg-transparent border-b border-transparent focus:border-[var(--rego-accent,#ad0505)]"
                                  />
                                  <span className="font-mono text-[10px] text-[var(--rego-ink-2,#737373)] ml-2">
                                    {child.url}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => onRemoveItem(activeTab as any, child.id)}
                                className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
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
              <div className="space-y-3">
                {footerBlocks.map((block, idx) => (
                  <div
                    key={block.id}
                    className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => onMoveBlock(block.id, 'up')}
                          disabled={idx === 0}
                          className="p-0.5 hover:bg-[var(--rego-surface,#f5f5f5)] rounded text-[var(--rego-ink-2,#737373)] disabled:opacity-20"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveBlock(block.id, 'down')}
                          disabled={idx === footerBlocks.length - 1}
                          className="p-0.5 hover:bg-[var(--rego-surface,#f5f5f5)] rounded text-[var(--rego-ink-2,#737373)] disabled:opacity-20"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={block.title}
                          onChange={(e) => onUpdateBlock(block.id, 'title', e.target.value)}
                          className="font-bold text-xs text-[var(--rego-fg,#111111)] outline-none border-b border-transparent focus:border-[var(--rego-accent,#ad0505)] bg-transparent"
                        />
                        <span className="text-[11px] text-[var(--rego-ink-2,#737373)] block">
                          Type : {block.type}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveBlock(block.id)}
                      className="p-1.5 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
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
                  className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-mono font-medium text-[var(--rego-fg,#111111)] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-[var(--rego-fg,#111111)]">Cible d&apos;Ouverture</label>
                <select
                  value={editingItem.item.target || '_self'}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateItem(editingItem.location, editingItem.item.id, 'target', val);
                    setEditingItem((prev) =>
                      prev ? { ...prev, item: { ...prev.item, target: val as any } } : null
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
  );
}
