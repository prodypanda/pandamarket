'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Layout,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  Layers,
  Image,
  ShoppingBag,
  Megaphone,
  Star,
  RefreshCw,
  ExternalLink,
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

export interface HomepageSection {
  id: string;
  type: 'promo_bar' | 'hero_banner' | 'featured_categories' | 'popular_products' | 'testimonials' | 'video_banner';
  title: string;
  subtitle?: string;
  enabled: boolean;
  content: Record<string, any>;
}

export interface SellerReGoBannersProps {
  initialSections?: HomepageSection[];
  onSave: (sections: HomepageSection[]) => Promise<void>;
  saving: boolean;
  feedback: { message: string; isError?: boolean } | null;
  dir?: 'ltr' | 'rtl';
}

const DEFAULT_SECTIONS: HomepageSection[] = [
  {
    id: 'promo_bar',
    type: 'promo_bar',
    title: 'Barre d\'Annonce Supérieure (Promo Bar)',
    enabled: true,
    content: {
      text: 'Livraison offerte sur toute la Tunisie dès 80 TND d\'achat !',
      link: '/hub/products',
    },
  },
  {
    id: 'hero_banner',
    type: 'hero_banner',
    title: 'Grande Bannière Héro (Hero Slider / Banner)',
    subtitle: 'Mise en avant principale au sommet de la vitrine',
    enabled: true,
    content: {
      heading: 'Nouvelle Collection Artisanale d\'Automne',
      description: 'Découvrez notre sélection exclusive fabriquée par nos maîtres artisans tunisiens.',
      ctaText: 'Explorer la boutique',
      ctaLink: '/products',
      imageUrl: '',
    },
  },
  {
    id: 'featured_categories',
    type: 'featured_categories',
    title: 'Grille des Catégories en Vedette',
    subtitle: 'Affichage des rayons phares de votre catalogue',
    enabled: true,
    content: {
      categoryCount: 4,
      style: 'cards',
    },
  },
  {
    id: 'popular_products',
    type: 'popular_products',
    title: 'Produits Populaires & Meilleures Ventes',
    subtitle: 'Grille de 8 articles les plus plébiscités',
    enabled: true,
    content: {
      displayCount: 8,
      algorithm: 'best_sellers',
    },
  },
  {
    id: 'testimonials',
    type: 'testimonials',
    title: 'Témoignages & Avis Clients Vérifiés',
    subtitle: 'Preuve sociale et recommandations 5 étoiles',
    enabled: true,
    content: {
      showStars: true,
      maxReviews: 3,
    },
  },
];

export function SellerReGoBanners({
  initialSections,
  onSave,
  saving,
  feedback,
  dir = 'ltr',
}: SellerReGoBannersProps) {
  const { t } = useLocale();

  const [sections, setSections] = useState<HomepageSection[]>(
    initialSections && initialSections.length > 0 ? initialSections : DEFAULT_SECTIONS
  );
  const [selectedSection, setSelectedSection] = useState<HomepageSection | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleToggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSections((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return;
    setSections((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleRemove = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddSection = (type: HomepageSection['type'], title: string) => {
    const newSection: HomepageSection = {
      id: `section_${Date.now()}`,
      type,
      title,
      enabled: true,
      content: {},
    };
    setSections((prev) => [...prev, newSection]);
    setAddModalOpen(false);
  };

  const activeCount = sections.filter((s) => s.enabled).length;

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Boutique en Ligne', href: '/hub/dashboard/online-store' },
        { label: 'Bannières & Carrousels' },
      ]}
      headerTitle="Personnalisation des Sections de la Page d'Accueil"
      headerSubtitle="Ajoutez, supprimez et réorganisez les blocs de contenu qui composent la vitrine d'accueil de votre boutique."
      headerIcon={Layout}
      statusBadge={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {activeCount} / {sections.length} Blocs Actifs
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
            Glisser-Déposer & Tri Rapide
          </span>
        </div>
      }
      primaryAction={
        <button
          type="button"
          onClick={() => onSave(sections)}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Enregistrement...' : 'Enregistrer et Publier'}</span>
        </button>
      }
      secondaryAction={
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
        >
          <Plus className="w-4 h-4 text-[var(--rego-accent,#ad0505)]" />
          <span>Ajouter une section</span>
        </button>
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
            label="Total des Blocs Définis"
            value={`${sections.length} Sections`}
            hint="Structure de la page d'accueil"
            delta={sections.length}
            deltaLabel="configurés"
            deltaType="increase"
          />
          <ReGoKpiHero
            label="Sections Publiées en Ligne"
            value={`${activeCount} Visibles`}
            hint="Affichées aux visiteurs"
            delta={activeCount}
            deltaLabel="actives"
            deltaType="increase"
          />
          <ReGoKpiHero
            label="Bannière Hero Sommet"
            value={sections.find((s) => s.type === 'hero_banner')?.enabled ? 'Actif' : 'Désactivé'}
            hint="Premier impact visuel"
            delta={100}
            deltaLabel="slider"
            deltaType="neutral"
          />
          <ReGoKpiHero
            label="Barre Promo Flottante"
            value={sections.find((s) => s.type === 'promo_bar')?.enabled ? 'En Ligne' : 'Masquée'}
            hint="Incitation livraison gratuite"
            delta={100}
            deltaLabel="80 TND"
            deltaType="increase"
          />
        </div>
      }
      mainContent={
        <div className="space-y-4">
          <ReGoCard
            title="Agencement Linéaire des Blocs d'Accueil (Ordre d'Affichage)"
            subtitle="Utilisez les flèches haut/bas pour réorganiser la position des blocs sur la page d'accueil de votre boutique."
          >
            <div className="space-y-3">
              {sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className={`p-4 rounded-[var(--rego-r,8px)] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    sec.enabled
                      ? 'border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-xs'
                      : 'border-[var(--rego-border,#dedede)]/60 bg-[var(--rego-surface,#f5f5f5)]/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] disabled:opacity-20"
                        title="Monter"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === sections.length - 1}
                        className="p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] disabled:opacity-20"
                        title="Descendre"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-2 rounded-md bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)]">
                      {sec.type === 'promo_bar' ? (
                        <Megaphone className="w-4 h-4 text-amber-600" />
                      ) : sec.type === 'hero_banner' ? (
                        <Image className="w-4 h-4 text-[var(--rego-accent,#ad0505)]" />
                      ) : sec.type === 'popular_products' ? (
                        <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Star className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-[var(--rego-ink-2,#737373)]">
                          #{idx + 1}
                        </span>
                        <h4 className="font-bold text-xs text-[var(--rego-fg,#111111)]">{sec.title}</h4>
                      </div>
                      {sec.subtitle && (
                        <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">{sec.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedSection(sec)}
                      className="px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                    >
                      Configurer
                    </button>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={sec.enabled}
                        onChange={() => handleToggleSection(sec.id)}
                        className="accent-[var(--rego-accent,#ad0505)] cursor-pointer"
                      />
                      <span className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                        {sec.enabled ? 'Actif' : 'Masqué'}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemove(sec.id)}
                      className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Supprimer ce bloc"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ReGoCard>
        </div>
      }
      drawer={
        <ReGoDrawer
          isOpen={Boolean(selectedSection)}
          onClose={() => setSelectedSection(null)}
          title={`Configuration : ${selectedSection?.title || ''}`}
        >
          {selectedSection && (
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-[var(--rego-fg,#111111)]">Titre de la Section</label>
                <input
                  type="text"
                  value={selectedSection.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedSection((prev) => (prev ? { ...prev, title: val } : null));
                    setSections((prev) =>
                      prev.map((s) => (s.id === selectedSection.id ? { ...s, title: val } : s))
                    );
                  }}
                  className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] outline-none"
                />
              </div>

              {selectedSection.type === 'promo_bar' && (
                <div className="space-y-1">
                  <label className="block font-bold text-[var(--rego-fg,#111111)]">Texte d'Annonce</label>
                  <input
                    type="text"
                    value={selectedSection.content.text || ''}
                    onChange={(e) => {
                      const text = e.target.value;
                      setSelectedSection((prev) =>
                        prev ? { ...prev, content: { ...prev.content, text } } : null
                      );
                      setSections((prev) =>
                        prev.map((s) =>
                          s.id === selectedSection.id
                            ? { ...s, content: { ...s.content, text } }
                            : s
                        )
                      );
                    }}
                    className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] outline-none"
                  />
                </div>
              )}

              {selectedSection.type === 'hero_banner' && (
                <>
                  <div className="space-y-1">
                    <label className="block font-bold text-[var(--rego-fg,#111111)]">Titre Héro</label>
                    <input
                      type="text"
                      value={selectedSection.content.heading || ''}
                      onChange={(e) => {
                        const heading = e.target.value;
                        setSelectedSection((prev) =>
                          prev ? { ...prev, content: { ...prev.content, heading } } : null
                        );
                        setSections((prev) =>
                          prev.map((s) =>
                            s.id === selectedSection.id
                              ? { ...s, content: { ...s.content, heading } }
                              : s
                          )
                        );
                      }}
                      className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-[var(--rego-fg,#111111)]">Description</label>
                    <textarea
                      rows={2}
                      value={selectedSection.content.description || ''}
                      onChange={(e) => {
                        const description = e.target.value;
                        setSelectedSection((prev) =>
                          prev ? { ...prev, content: { ...prev.content, description } } : null
                        );
                        setSections((prev) =>
                          prev.map((s) =>
                            s.id === selectedSection.id
                              ? { ...s, content: { ...s.content, description } }
                              : s
                          )
                        );
                      }}
                      className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs text-[var(--rego-fg,#111111)] outline-none"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-[var(--rego-border,#dedede)] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedSection(null)}
                  className="px-4 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90"
                >
                  Appliquer les modifications
                </button>
              </div>
            </div>
          )}
        </ReGoDrawer>
      }
      modals={
        <ReGoModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Ajouter une Section sur la Page d'Accueil"
        >
          <div className="space-y-3 text-xs">
            {[
              {
                type: 'hero_banner' as const,
                title: 'Bannière Héro Supplémentaire',
                desc: 'Slider secondaire pour une opération commerciale ou un déstockage.',
              },
              {
                type: 'featured_categories' as const,
                title: 'Rayons & Collections en Vedette',
                desc: 'Grille d\'images pointant vers des collections thématiques.',
              },
              {
                type: 'popular_products' as const,
                title: 'Grille Produits Spécifique',
                desc: 'Sélection manuelle ou par tag d\'articles recommandés.',
              },
              {
                type: 'video_banner' as const,
                title: 'Bannière Vidéo Plein Écran',
                desc: 'Vidéo MP4 ou YouTube présentant les coulisses de vos produits.',
              },
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddSection(item.type, item.title)}
                className="w-full p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] hover:border-[var(--rego-accent,#ad0505)] text-left transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-xs text-[var(--rego-fg,#111111)] block">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-[var(--rego-ink-2,#737373)]">{item.desc}</span>
                </div>
                <Plus className="w-4 h-4 text-[var(--rego-accent,#ad0505)] shrink-0" />
              </button>
            ))}
          </div>
        </ReGoModal>
      }
    />
  );
}
