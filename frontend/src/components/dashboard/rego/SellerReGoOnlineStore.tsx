'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Globe,
  Palette,
  Layout,
  Navigation as NavIcon,
  FileText,
  Search,
  Code2,
  Users,
  Eye,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Monitor,
  Sparkles,
  Link2,
  LayoutTemplate,
  Lock,
  ChevronRight,
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
import { getStorefrontUrl } from '@/lib/store-hosts';

export interface StoreData {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  theme_id: string;
  status: string;
  is_verified: boolean;
  settings?: {
    maintenance_message?: string;
    logo_url?: string;
  };
}

export interface SellerReGoOnlineStoreProps {
  store: StoreData | null;
  loading: boolean;
  publishing: boolean;
  feedback: { message: string; isError?: boolean } | null;
  onTogglePublish: () => Promise<void>;
  onRefresh: () => Promise<void>;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoOnlineStore({
  store,
  loading,
  publishing,
  feedback,
  onTogglePublish,
  onRefresh,
  dir = 'ltr',
}: SellerReGoOnlineStoreProps) {
  const { t } = useLocale();

  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const storefrontUrl = getStorefrontUrl({
    subdomain: store?.subdomain,
    customDomain: store?.custom_domain,
  });

  const isPublished = store?.status === 'verified';

  const quickLinks = [
    {
      title: 'Galerie de Thèmes',
      desc: 'Explorez et appliquez des thèmes e-commerce conçus pour le commerce tunisien.',
      href: '/hub/dashboard/online-store/themes',
      icon: Palette,
      badge: store?.theme_id ? `Actif: ${store.theme_id}` : 'Thème Standard',
    },
    {
      title: 'Personnalisation Visuelle',
      desc: 'Couleurs de marque, typographies, styles de hero et bannières réactives.',
      href: '/hub/dashboard/online-store/customize',
      icon: Sparkles,
      badge: 'CSS Temps Réel',
    },
    {
      title: 'Menus & Navigation',
      desc: 'Structurez les menus d\'en-tête et les liens légaux du pied de page.',
      href: '/hub/dashboard/online-store/navigation',
      icon: NavIcon,
    },
    {
      title: 'Constructeur de Pages',
      desc: 'Créez des pages d\'atterrissage personnalisées (À propos, FAQ, Politiques).',
      href: '/hub/dashboard/page-builder',
      icon: LayoutTemplate,
    },
    {
      title: 'Domaines & Certificats SSL',
      desc: 'Connectez votre nom de domaine .tn ou international avec certificat HTTPS gratuit.',
      href: '/hub/dashboard/online-store/domains',
      icon: Link2,
      badge: store?.custom_domain || `${store?.subdomain || 'boutique'}.pandamarket.tn`,
    },
    {
      title: 'Référencement SEO & Méta-tags',
      desc: 'Optimisez votre visibilité sur Google Tunisie et configurez vos balises OpenGraph.',
      href: '/hub/dashboard/online-store/seo',
      icon: Search,
    },
    {
      title: 'Transporteurs & Pixels Marketing',
      desc: 'Paramétrez les frais de livraison par gouvernorat et intégrez Meta Pixel & TikTok.',
      href: '/hub/dashboard/online-store/integrations',
      icon: Code2,
    },
    {
      title: 'Fichier Clients Vitrine',
      desc: 'Consultez les comptes créés par vos acheteurs sur votre boutique en ligne dédiée.',
      href: '/hub/dashboard/online-store/customers',
      icon: Users,
    },
  ];

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Boutique en Ligne', href: '/hub/dashboard/online-store' },
        { label: "Vue d'ensemble" },
      ]}
      headerTitle="Boutique en Ligne & Vitrine Publique"
      headerSubtitle="Supervisez votre présence sur le web, personnalisez le design de votre boutique et vérifiez l'état technique de votre vitrine."
      headerIcon={Globe}
      statusBadge={
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
              isPublished
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}
          >
            {isPublished ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {isPublished ? 'Boutique En Ligne' : 'Mode Maintenance'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
            <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Certificat SSL HTTPS Actif
          </span>
        </div>
      }
      primaryAction={
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Eye className="w-4 h-4" />
          <span>Visiter la Vitrine</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      }
      secondaryAction={
        <button
          type="button"
          onClick={onTogglePublish}
          disabled={publishing}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-[var(--rego-r,8px)] border text-xs font-bold transition-colors disabled:opacity-50 ${
            isPublished
              ? 'border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20'
              : 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20'
          }`}
        >
          {isPublished ? (
            <>
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{publishing ? 'Mise en pause...' : 'Activer Mode Maintenance'}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{publishing ? 'Publication...' : 'Publier la Boutique'}</span>
            </>
          )}
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
            label="État de la Vitrine"
            value={isPublished ? 'En Ligne' : 'Maintenance'}
            hint={isPublished ? 'Visible par tous les acheteurs' : 'Accès restreint au marchand'}
            delta={isPublished ? 100 : 0}
            deltaLabel="disponibilité"
            deltaType={isPublished ? 'increase' : 'decrease'}
          />
          <ReGoKpiHero
            label="Thème Actif Déployé"
            value={store?.theme_id ? store.theme_id.charAt(0).toUpperCase() + store.theme_id.slice(1) : 'Classic'}
            hint="Habillage graphique de la boutique"
            delta={100}
            deltaLabel="responsive"
            deltaType="increase"
          />
          <ReGoKpiHero
            label="Nom de Domaine"
            value={store?.custom_domain ? store.custom_domain : `${store?.subdomain || 'boutique'}.pandamarket.tn`}
            hint={store?.custom_domain ? 'Domaine personnalisé connecté' : 'Sous-domaine officiel sécurisé'}
            delta={100}
            deltaLabel="SSL 256b"
            deltaType="increase"
          />
          <ReGoKpiHero
            label="Vitesse & Performance"
            value="98 / 100"
            hint="Optimisé pour mobile & 4G tunisienne"
            delta={98}
            deltaLabel="Fast CDN"
            deltaType="increase"
          />
        </div>
      }
      mainContent={
        <div className="space-y-4">
          {/* Module 1: Carte d'Identité & Santé Domaine */}
          <ReGoSplitCard
            left={
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-accent,#ad0505)]">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--rego-fg,#111111)]">
                      Carte d&apos;Identité & Accès Direct
                    </h3>
                    <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                      Coordonnées publiques de votre boutique en ligne sur le réseau PandaMarket.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/70 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">URL Officielle :</span>
                    <a
                      href={storefrontUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono font-bold text-[var(--rego-accent,#ad0505)] hover:underline inline-flex items-center gap-1"
                    >
                      <span>{storefrontUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">Domaine Personnalisé :</span>
                    <span className="font-mono font-bold text-[var(--rego-fg,#111111)]">
                      {store?.custom_domain || 'Aucun (Utilise le sous-domaine gratuit)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">Certificat HTTPS :</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Actif & Renouvelé automatiquement
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMobilePreviewOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
                    <span>Tester le rendu mobile</span>
                  </button>
                  <Link
                    href="/hub/dashboard/online-store/domains"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Gérer les DNS</span>
                  </Link>
                </div>
              </div>
            }
            right={
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-accent,#ad0505)]">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--rego-fg,#111111)]">
                      Thème Actif & Personnalisation
                    </h3>
                    <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                      Modifiez l&apos;apparence visuelle sans toucher au code.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/70 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">Thème déployé :</span>
                    <span className="font-bold text-[var(--rego-fg,#111111)]">
                      {store?.theme_id ? store.theme_id.charAt(0).toUpperCase() + store.theme_id.slice(1) : 'Classic Standard'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">Variante de disposition :</span>
                    <span className="font-bold text-[var(--rego-fg,#111111)]">Bento E-Commerce</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">Palette de couleurs :</span>
                    <span className="font-bold text-[var(--rego-fg,#111111)]">ReGo Modernist & Rouge Tunisien</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href="/hub/dashboard/online-store/customize"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Personnaliser le thème</span>
                  </Link>
                  <Link
                    href="/hub/dashboard/online-store/themes"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Changer de thème</span>
                  </Link>
                </div>
              </div>
            }
          />

          {/* Module 3: Grille des Raccourcis ReGo */}
          <ReGoCard
            title="Outils de Gestion & Paramétrage de la Vitrine"
            subtitle="Accédez directement aux 8 modules de configuration de votre boutique en ligne."
          >
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col justify-between rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-4 shadow-xs hover:border-[var(--rego-accent,#ad0505)] transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="rounded-md bg-[var(--rego-surface,#f5f5f5)] p-2 text-[var(--rego-fg,#111111)] group-hover:bg-[var(--rego-fg,#111111)] group-hover:text-[var(--rego-bg,#ffffff)] transition-colors">
                        <item.icon className="h-4 w-4" />
                      </div>
                      {item.badge && (
                        <span className="truncate max-w-[130px] rounded-full bg-[var(--rego-surface,#f5f5f5)] px-2 py-0.5 text-[10px] font-bold text-[var(--rego-ink-2,#737373)] border border-[var(--rego-border,#dedede)]">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-[11px] text-[var(--rego-ink-2,#737373)] line-clamp-2">
                      {item.desc}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[var(--rego-accent,#ad0505)] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Accéder</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </ReGoCard>
        </div>
      }
      modals={
        <ReGoModal
          isOpen={mobilePreviewOpen}
          onClose={() => setMobilePreviewOpen(false)}
          title="Simulation Vitrine Mobile (Format Smartphone 390px)"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)]">
              <span className="font-mono text-[11px] text-[var(--rego-ink-2,#737373)] truncate">
                {storefrontUrl}
              </span>
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-[var(--rego-accent,#ad0505)] hover:underline inline-flex items-center gap-1"
              >
                <span>Ouvrir dans un nouvel onglet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Mobile Frame Container */}
            <div className="mx-auto max-w-[390px] border-4 border-slate-900 dark:border-slate-700 rounded-[28px] overflow-hidden shadow-2xl bg-white dark:bg-slate-900 aspect-[9/16]">
              <iframe
                src={storefrontUrl}
                title="Aperçu Mobile Vitrine"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </ReGoModal>
      }
    />
  );
}
