'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Globe,
  Share2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
  Save,
  Tag,
  FileText,
  Eye,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export interface SeoSettings {
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  keywords?: string;
}

export interface SellerReGoSeoProps {
  seo: SeoSettings;
  subdomain: string;
  customDomain: string | null;
  saving: boolean;
  isDirty: boolean;
  feedback: { message: string; isError?: boolean } | null;
  onChange: (field: keyof SeoSettings, value: string) => void;
  onSave: () => Promise<void>;
  onReset: () => void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoSeo({
  seo,
  subdomain,
  customDomain,
  saving,
  isDirty,
  feedback,
  onChange,
  onSave,
  onReset,
  dir = 'ltr',
}: SellerReGoSeoProps) {
  const { t } = useLocale();
  const [showSeoDrawer, setShowSeoDrawer] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'google' | 'social'>('google');

  const titleLength = (seo.meta_title || '').length;
  const descLength = (seo.meta_description || '').length;
  const keywordsCount = (seo.keywords || '').split(',').filter((k) => k.trim().length > 0).length;

  // SEO Score calculation (0 - 100%)
  const seoScore = Math.min(
    100,
    (titleLength >= 30 && titleLength <= 70 ? 30 : titleLength > 0 ? 15 : 0) +
    (descLength >= 80 && descLength <= 165 ? 35 : descLength > 0 ? 20 : 0) +
    (keywordsCount >= 3 ? 15 : keywordsCount > 0 ? 8 : 0) +
    (seo.og_image_url && seo.og_image_url.trim().length > 0 ? 20 : 0)
  );

  const displayHost = customDomain ? customDomain.replace(/^https?:\/\//, '') : `${subdomain || 'votre-boutique'}.pandamarket.tn`;
  const canonicalUrl = `https://${displayHost}`;

  return (
    <div dir={dir}>
      <DashboardPageWrapper
        breadcrumbs={[
          { label: 'Accueil', href: '/hub/dashboard' },
          { label: 'Boutique en Ligne', href: '/hub/dashboard/online-store' },
          { label: 'Référencement & Pixels' },
        ]}
        headerTitle="Référencement Naturel (SEO) & Méta-Données"
        headerSubtitle="Optimisez la visibilité de votre vitrine sur Google et contrôlez l'apparence de vos liens lors des partages sur les réseaux sociaux."
        headerIcon={Search}
        statusBadge={
          <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)] rounded-full">
            SERP & OpenGraph
          </span>
        }
        secondaryAction={
          <button
            onClick={() => setShowSeoDrawer(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Guide Bonnes Pratiques</span>
          </button>
        }
        primaryAction={
          <button
            onClick={() => onSave()}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Enregistrement...' : 'Enregistrer le SEO'}</span>
          </button>
        }
        alertBanner={
          feedback && (
            <div
              className={`flex items-center gap-3 p-3.5 rounded-[var(--rego-r,8px)] border text-xs font-semibold ${
                feedback.isError
                  ? 'border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-800'
                  : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800'
              }`}
            >
              {feedback.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          )
        }
        kpiStrip={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <ReGoKpiHero
              label="Score SEO Global"
              value={`${seoScore}%`}
              hint={seoScore >= 80 ? 'Excellente visibilité' : 'Optimisations recommandées'}
              icon={Sparkles}
              accent={seoScore >= 80}
            />
            <ReGoKpiHero
              label="Longueur Titre Google"
              value={`${titleLength} / 65`}
              hint={titleLength >= 30 && titleLength <= 65 ? 'Longueur optimale' : 'Recommandé : 40-60 car.'}
              icon={FileText}
            />
            <ReGoKpiHero
              label="Méta-Description"
              value={`${descLength} / 160`}
              hint={descLength >= 100 && descLength <= 160 ? 'Longueur idéale' : 'Recommandé : 120-155 car.'}
              icon={Search}
            />
            <ReGoKpiHero
              label="Carte OpenGraph"
              value={seo.og_image_url ? 'Image Définie' : 'Image par défaut'}
              hint="Format optimal : 1200 x 630 px"
              icon={Share2}
            />
          </div>
        }
        mainContent={
          <div className="space-y-6">
            <ReGoSplitCard
              left={
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)] flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[var(--rego-accent,#ad0505)]" />
                      <span>Formulaire des Balises Méta</span>
                    </h3>
                    <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
                      Renseignez les balises HTML lues par les robots d&apos;indexation de Google et les crawlers de réseaux sociaux.
                    </p>
                  </div>

                  {/* Meta Title */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                        Titre de la Boutique (&lt;title&gt;)
                      </label>
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          titleLength > 70 ? 'text-rose-600' : titleLength >= 30 ? 'text-emerald-600' : 'text-[var(--rego-ink-3,#949494)]'
                        }`}
                      >
                        {titleLength} / 70
                      </span>
                    </div>
                    <input
                      type="text"
                      value={seo.meta_title || ''}
                      onChange={(e) => onChange('meta_title', e.target.value)}
                      placeholder="ex: Artisanat Traditionnel Tunisien | Poterie & Cuir — Ma Boutique"
                      className="w-full px-3 py-2 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all"
                    />
                    <p className="text-[11px] text-[var(--rego-ink-3,#949494)] mt-1">
                      Le titre principal affiché en bleu sur les résultats de recherche Google.
                    </p>
                  </div>

                  {/* Meta Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                        Méta-Description
                      </label>
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          descLength > 165 ? 'text-rose-600' : descLength >= 80 ? 'text-emerald-600' : 'text-[var(--rego-ink-3,#949494)]'
                        }`}
                      >
                        {descLength} / 160
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={seo.meta_description || ''}
                      onChange={(e) => onChange('meta_description', e.target.value)}
                      placeholder="ex: Découvrez notre collection exclusive d'objets d'artisanat faits main en Tunisie. Poterie artisanale de Nabeul, maroquinerie authentique et livraison rapide dans les 24 gouvernorats."
                      className="w-full px-3 py-2 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all resize-none leading-relaxed"
                    />
                    <p className="text-[11px] text-[var(--rego-ink-3,#949494)] mt-1">
                      Court résumé incitant au clic sur Google. Mentionnez vos atouts et la livraison en Tunisie.
                    </p>
                  </div>

                  {/* Keywords */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                        Mots-clés Principaux (Keywords)
                      </label>
                      <span className="text-[11px] font-mono text-[var(--rego-ink-3,#949494)]">
                        {keywordsCount} tag(s)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={seo.keywords || ''}
                      onChange={(e) => onChange('keywords', e.target.value)}
                      placeholder="artisanat tunisien, poterie nabeul, cuir véritable, cadeaux traditionnels"
                      className="w-full px-3 py-2 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all"
                    />
                    <p className="text-[11px] text-[var(--rego-ink-3,#949494)] mt-1">
                      Séparez vos mots-clés par des virgules pour faciliter l&apos;indexation sémantique.
                    </p>
                  </div>

                  {/* OG Image URL */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-1">
                      Image de Partage Social (OpenGraph Image)
                    </label>
                    <div className="relative">
                      <ImageIcon className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
                      <input
                        type="url"
                        value={seo.og_image_url || ''}
                        onChange={(e) => onChange('og_image_url', e.target.value)}
                        placeholder="https://cdn.pandamarket.tn/stores/banner.jpg"
                        className="w-full ps-9 pe-3 py-2 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-[var(--rego-ink-3,#949494)] mt-1">
                      Résolution recommandée : 1200 x 630 px. Cette bannière apparaîtra lors d&apos;un partage WhatsApp / Facebook.
                    </p>
                  </div>

                  {isDirty && (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onReset}
                        className="px-3 py-1.5 text-xs font-bold rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => onSave()}
                        disabled={saving}
                        className="px-4 py-1.5 text-xs font-bold rounded-md bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
                      >
                        {saving ? 'Enregistrement...' : 'Sauvegarder les Balises'}
                      </button>
                    </div>
                  )}
                </div>
              }
              right={
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--rego-border,#dedede)] pb-3">
                    <div>
                      <h4 className="text-xs font-black text-[var(--rego-fg,#111111)] uppercase tracking-wider">
                        Prévisualisation en Direct
                      </h4>
                      <p className="text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5">
                        Visualisez exactement comment les internautes découvrent votre boutique.
                      </p>
                    </div>
                    <div className="flex items-center rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-0.5">
                      <button
                        onClick={() => setPreviewDevice('google')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                          previewDevice === 'google'
                            ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                            : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                        }`}
                      >
                        Google SERP
                      </button>
                      <button
                        onClick={() => setPreviewDevice('social')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                          previewDevice === 'social'
                            ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                            : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                        }`}
                      >
                        Réseaux Sociaux
                      </button>
                    </div>
                  </div>

                  {previewDevice === 'google' ? (
                    <div className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 space-y-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-300">
                          PM
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                            {seo.meta_title || 'PandaMarket Boutique'}
                          </p>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-300 truncate font-mono">
                            {canonicalUrl}
                          </p>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-[#1a0dab] hover:underline cursor-pointer leading-tight">
                        {seo.meta_title || 'Boutique Officielle | PandaMarket Tunisie'}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {seo.meta_description ||
                          'Découvrez nos collections artisanales et produits locaux avec paiement à la livraison et expédition rapide dans tous les gouvernorats de Tunisie.'}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                      <div className="aspect-[1.91/1] w-full bg-[var(--rego-surface,#f5f5f5)] flex items-center justify-center border-b border-[var(--rego-border,#dedede)] relative">
                        {seo.og_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={seo.og_image_url}
                            alt="OpenGraph preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="text-center p-4">
                            <Share2 className="w-8 h-8 text-[var(--rego-ink-3,#949494)] mx-auto mb-1.5" />
                            <span className="text-xs font-bold text-[var(--rego-ink-2,#737373)]">
                              Bannière 1200 x 630 px
                            </span>
                            <p className="text-[10px] text-[var(--rego-ink-3,#949494)] mt-0.5">
                              Ajoutez une URL d&apos;image pour personnaliser l&apos;aperçu
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 space-y-1 bg-slate-50/70 dark:bg-slate-900/70">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                          {displayHost}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                          {seo.meta_title || 'Boutique Officielle sur PandaMarket'}
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {seo.meta_description ||
                            'Accédez à notre catalogue exclusif en ligne. Livraison sécurisée dans les 24 gouvernorats tunisiens.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Sitemap & Robots.txt Indicator */}
                  <div className="p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold text-[var(--rego-fg,#111111)]">
                          Sitemap XML & Robots.txt Actifs
                        </div>
                        <div className="text-[10px] text-[var(--rego-ink-2,#737373)] font-mono">
                          /store/{subdomain}/sitemap.xml
                        </div>
                      </div>
                    </div>
                    <a
                      href={`/store/${subdomain}/sitemap.xml`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-[var(--rego-fg,#111111)] hover:text-[var(--rego-accent,#ad0505)] flex items-center gap-1"
                    >
                      <span>Vérifier</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              }
            />
          </div>
        }
        drawer={
          <ReGoDrawer
            isOpen={showSeoDrawer}
            onClose={() => setShowSeoDrawer(false)}
            title="Guide d'Optimisation SEO E-commerce"
            subtitle="Recommandations pour le marché tunisien"
            footer={
              <button
                onClick={() => setShowSeoDrawer(false)}
                className="w-full px-4 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-white hover:opacity-90 transition-all shadow-2xs"
              >
                Compris
              </button>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-md bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] space-y-2">
                <h4 className="font-bold text-[var(--rego-fg,#111111)]">Mots-clés géolocalisés Tunisie</h4>
                <p className="text-[var(--rego-ink-2,#737373)] leading-relaxed">
                  Incluez systématiquement les termes « Tunisie », « Livraison 24 Gouvernorats » ou le nom de votre ville artisanale (Nabeul, Sfax, Djerba) pour capter les recherches locales à forte intention d&apos;achat.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] text-[10px]">
                  Règles d&apos;or du Méta Titre
                </h4>
                <ul className="space-y-1.5 text-[var(--rego-fg,#111111)] list-disc pl-4">
                  <li>Placez vos mots-clés stratégiques au début du titre.</li>
                  <li>Terminez par le nom de votre marque ou boutique.</li>
                  <li>Ne dépassez jamais 70 caractères pour éviter d&apos;être tronqué sur mobile.</li>
                </ul>
              </div>

              <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Indexation Google Automatique</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  PandaMarket génère et met à jour automatiquement votre flux <code>sitemap.xml</code> et communique directement avec l&apos;index Google lors de la publication de vos produits.
                </p>
              </div>
            </div>
          </ReGoDrawer>
        }
      />
    </div>
  );
}
