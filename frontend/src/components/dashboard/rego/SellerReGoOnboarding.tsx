'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Store,
  CheckCircle2,
  Clock3,
  Package,
  Palette,
  CreditCard,
  Truck,
  ShieldCheck,
  Upload,
  Phone,
  FileText,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  RotateCcw,
  HelpCircle,
  X,
  Loader2,
  Check,
  Eye,
  AlertTriangle,
  Info,
  Building2,
  Lock,
  Layers,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { DashboardPageWrapper } from '@/components/dashboard/DashboardPageWrapper';
import { themes, type ThemeId } from '@/lib/themes';
import { getResizedImageUrl } from '@/lib/image-url';
import { useLocale } from '@/contexts/LocaleContext';

export interface StoreSettingsState {
  logo_url?: string | null;
  logo_light_url?: string | null;
  logo_dark_url?: string | null;
  themeCustomization?: {
    colorPresetId?: string | null;
    customColors?: Record<string, string | null | undefined>;
  } | null;
  shipping_flat_fee?: number | null;
  payout_method?: string | null;
  payout_details?: string | null;
}

export interface StoreState {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string | null;
  theme_id?: string | null;
  is_verified?: boolean;
  status: string;
  settings?: StoreSettingsState | null;
}

export interface VerificationState {
  id: string;
  status: string;
  rc_document_url?: string | null;
  cin_document_url?: string | null;
  phone_number?: string | null;
}

export interface ProductSummaryState {
  id: string;
  title: string;
  price: string | number;
  status: string;
  thumbnail?: string | null;
}

export interface CategoryState {
  id: string;
  name: string;
  slug: string;
}

export interface SellerReGoOnboardingProps {
  store: StoreState | null;
  verification: VerificationState | null;
  productCount: number;
  firstProduct: ProductSummaryState | null;
  categories: CategoryState[];
  loading: boolean;
  platformDomain: string;
  storefrontHref: string;
  // Wizard state
  showWizard: boolean;
  setShowWizard: (show: boolean) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  savingStep: boolean;
  wizardError: string;
  // Forms & Actions
  storeName: string;
  setStoreName: (name: string) => void;
  logoUrl: string;
  setLogoUrl: (url: string) => void;
  logoDarkUrl: string;
  setLogoDarkUrl: (url: string) => void;
  selectedTheme: ThemeId;
  setSelectedTheme: (theme: ThemeId) => void;
  phone: string;
  setPhone: (phone: string) => void;
  rcFileUrl: string;
  setRcFileUrl: (url: string) => void;
  cinFileUrl: string;
  setCinFileUrl: (url: string) => void;
  productTitle: string;
  setProductTitle: (t: string) => void;
  productPrice: string;
  setProductPrice: (p: string) => void;
  productDescription: string;
  setProductDescription: (d: string) => void;
  selectedCategoryId: string;
  setSelectedCategoryId: (c: string) => void;
  productThumbnail: string;
  setProductThumbnail: (t: string) => void;
  shippingFee: string;
  setShippingFee: (f: string) => void;
  codEnabled: boolean;
  setCodEnabled: (e: boolean) => void;
  bankTransferDetails: string;
  setBankTransferDetails: (b: string) => void;
  // Handler calls
  onSaveBasics: () => Promise<void>;
  onSaveTheme: () => Promise<void>;
  onSaveKyc: () => Promise<void>;
  onSaveProduct: () => Promise<void>;
  onSaveShippingPayment: () => Promise<void>;
  onPublishToggle: (publish: boolean) => Promise<void>;
  onFileUpload: (file: File, purpose: string) => Promise<string>;
  onRefresh: () => Promise<void>;
}

export function SellerReGoOnboarding({
  store,
  verification,
  productCount,
  firstProduct,
  categories,
  loading,
  platformDomain,
  storefrontHref,
  showWizard,
  setShowWizard,
  currentStep,
  setCurrentStep,
  savingStep,
  wizardError,
  storeName,
  setStoreName,
  logoUrl,
  setLogoUrl,
  logoDarkUrl,
  setLogoDarkUrl,
  selectedTheme,
  setSelectedTheme,
  phone,
  setPhone,
  rcFileUrl,
  setRcFileUrl,
  cinFileUrl,
  setCinFileUrl,
  productTitle,
  setProductTitle,
  productPrice,
  setProductPrice,
  productDescription,
  setProductDescription,
  selectedCategoryId,
  setSelectedCategoryId,
  productThumbnail,
  setProductThumbnail,
  shippingFee,
  setShippingFee,
  codEnabled,
  setCodEnabled,
  bankTransferDetails,
  setBankTransferDetails,
  onSaveBasics,
  onSaveTheme,
  onSaveKyc,
  onSaveProduct,
  onSaveShippingPayment,
  onPublishToggle,
  onFileUpload,
  onRefresh,
}: SellerReGoOnboardingProps) {
  const { t, locale, dir } = useLocale();

  // Drawer inspection state for specific milestone
  const [drawerStep, setDrawerStep] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const [uploadingProductImg, setUploadingProductImg] = useState(false);
  const [drawerError, setDrawerError] = useState('');

  const isOnline = store?.status !== 'maintenance' && (store?.status === 'verified' || Boolean(store?.is_verified));

  // Milestones calculation
  const storeBasicsComplete = Boolean(store?.name && (store?.settings?.logo_url || logoUrl));
  const themeStepComplete = Boolean(store?.theme_id);
  const kycStepComplete = verification?.status === 'approved';
  const firstProductStepComplete = productCount > 0;
  const paymentStepComplete = Boolean(store?.settings?.payout_method || (codEnabled || bankTransferDetails));

  const milestones = [
    {
      step: 1,
      id: 'store_basics',
      title: 'Donnez une identité à votre vitrine',
      badgeLabel: 'Étape 01 · Identité',
      subtitle: 'Nom commercial, sous-domaine officiel pandamarket.tn, logos clair et sombre.',
      completed: storeBasicsComplete,
      icon: Store,
      actionLabel: 'Modifier les paramètres',
      summary: store?.name
        ? `${store.name} (${store.subdomain}.${platformDomain})`
        : "Non configuré",
      tag: store?.settings?.logo_url ? 'Logo configuré' : 'Logo manquant',
    },
    {
      step: 2,
      id: 'first_product',
      title: 'Publiez vos premiers articles au catalogue',
      badgeLabel: 'Étape 02 · Produits',
      subtitle: 'Titre descriptif, photos HD, variantes, prix en millimes TND et gestion de stock.',
      completed: firstProductStepComplete,
      icon: Package,
      actionLabel: productCount > 0 ? "Ajouter d'autres produits" : 'Créer le premier produit',
      summary: productCount > 0
        ? `${productCount} article(s) publié(s) au catalogue`
        : "Catalogue vide",
      tag: firstProduct ? `Dernier : ${firstProduct.title}` : 'En attente',
    },
    {
      step: 3,
      id: 'theme',
      title: 'Choisissez et adaptez votre thème visuel',
      badgeLabel: 'Étape 03 · Design',
      subtitle: 'Sélection du thème responsive, palette de couleurs régionales et mise en page vitrine.',
      completed: themeStepComplete,
      icon: Palette,
      actionLabel: 'Personnaliser le thème',
      summary: `Thème actif : ${themes[selectedTheme]?.name || selectedTheme}`,
      tag: 'Adapté mobile & desktop',
    },
    {
      step: 4,
      id: 'payment_shipping',
      title: "Activez l'encaissement et les transporteurs",
      badgeLabel: 'Étape 04 · Logistique & Paiements',
      subtitle: 'Paiement à la livraison (COD), virement bancaire et frais de livraison par gouvernorat.',
      completed: paymentStepComplete,
      icon: CreditCard,
      actionLabel: 'Gérer les paiements',
      summary: codEnabled ? 'Paiement à la livraison (COD) activé' : 'Virement bancaire configuré',
      tag: `${shippingFee || '7.000'} TND forfaitaire`,
    },
    {
      step: 5,
      id: 'kyc',
      title: "Transmettez votre pièce d'identité et votre RIB",
      badgeLabel: 'Étape 05 · Vérification KYC',
      subtitle: 'Téléversement de votre CIN ou RNE et saisie du RIB tunisien sur 20 chiffres.',
      completed: kycStepComplete,
      icon: ShieldCheck,
      actionLabel: verification?.status === 'approved'
        ? "Voir l'attestation"
        : "Compléter la vérification d'identité (Dernière étape) →",
      summary: verification?.status === 'approved'
        ? "Dossier marchand validé par l'administrateur"
        : verification?.status === 'pending'
          ? "Dossier en cours d'examen"
          : "Documents légaux requis",
      tag: verification?.phone_number ? `+216 ${verification.phone_number}` : "Téléphone non renseigné",
    },
  ];

  const totalCompleted = milestones.filter((m) => m.completed).length;
  const completionPercentage = Math.round((totalCompleted / 5) * 100);

  const filteredMilestones = milestones.filter((m) => {
    if (filterMode === 'pending') return !m.completed;
    if (filterMode === 'completed') return m.completed;
    return true;
  });

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Tableau de bord', href: '/hub/dashboard' },
        { label: 'Guide de Lancement' },
      ]}
      headerTitle="Guide de Lancement de Votre Boutique"
      headerSubtitle="Complétez les 5 étapes fondamentales pour certifier votre boutique, attirer vos premiers clients tunisiens et encaisser vos revenus."
      headerIcon={Store}
      statusBadge={
        <ReGoStatusChip
          status={totalCompleted === 5 ? 'ok' : totalCompleted >= 3 ? 'accent' : 'warn'}
          label={`${totalCompleted}/5 validées — ${completionPercentage}%`}
          size="sm"
        />
      }
      secondaryAction={
        storefrontHref ? (
          <a
            href={storefrontHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3.5 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
            <span>Voir Vitrine</span>
          </a>
        ) : null
      }
      primaryAction={
        <button
          type="button"
          onClick={() => {
            setCurrentStep(0);
            setShowWizard(true);
          }}
          className="inline-flex items-center gap-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Lancer l'Assistant Interactif</span>
        </button>
      }
      alertBanner={
        totalCompleted === 5 ? (
          <div className="rounded-[var(--rego-r,8px)] border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                  Boutique 100% Configurée et Prête pour le Commerce Tunisien !
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Toutes les étapes fondamentales sont validées. Votre vitrine est parée à recevoir des commandes et des paiements.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPublishToggle(!isOnline)}
              disabled={savingStep}
              className={`rounded-[var(--rego-r,8px)] px-3.5 py-1.5 text-xs font-bold text-white transition-all shadow-xs ${
                isOnline
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-[var(--rego-accent,#ad0505)] hover:bg-[var(--rego-accent-deep,#8f0404)]'
              }`}
            >
              {isOnline ? '🟢 Vitrine Publique en Ligne' : '🚀 Mettre la Boutique en Ligne'}
            </button>
          </div>
        ) : !kycStepComplete ? (
          <div className="rounded-[var(--rego-r,8px)] border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-900 dark:text-amber-300 font-medium">
                <strong>Vérification d'identité requise :</strong> Transmettez votre CIN ou Registre de Commerce (RC) ainsi que votre RIB tunisien sur 20 chiffres pour activer les virements automatiques de vos ventes.
              </p>
            </div>
            <Link
              href="/hub/dashboard/kyc"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-300 underline shrink-0 ml-4 hover:opacity-80"
            >
              <span>Vérifier mon KYC</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : null
      }
      kpiStrip={
        <>
          <ReGoKpiHero
            label="Progression du Lancement"
            value={`${completionPercentage}%`}
            delta={`${totalCompleted}/5`}
            deltaLabel="étapes validées"
            deltaType={totalCompleted === 5 ? 'increase' : 'neutral'}
            hint="Parcours de démarrage marchand"
            icon={Store}
            accent={totalCompleted === 5}
          />
          <ReGoKpiHero
            label="Catalogue Produits"
            value={productCount > 0 ? `${productCount} articles` : '0 article'}
            delta={productCount > 0 ? 'Actif' : 'Vide'}
            deltaType={productCount > 0 ? 'increase' : 'decrease'}
            hint={firstProduct ? `Récent : ${firstProduct.title}` : 'Premier produit requis'}
            icon={Package}
          />
          <ReGoKpiHero
            label="Statut Vérification KYC"
            value={
              verification?.status === 'approved' ? (
                <span className="text-emerald-600 text-lg font-black">Approuvé</span>
              ) : verification?.status === 'pending' ? (
                <span className="text-amber-600 text-lg font-black">En Examen</span>
              ) : (
                <span className="text-rose-600 text-lg font-black">Non Soumis</span>
              )
            }
            hint="Réglementation BCT & RIB 20 chiffres"
            icon={ShieldCheck}
          />
          <ReGoKpiHero
            label="Visibilité Boutique"
            value={
              isOnline ? (
                <span className="text-emerald-600 text-lg font-black">En Ligne</span>
              ) : (
                <span className="text-slate-600 text-lg font-black">Maintenance</span>
              )
            }
            hint={`${store?.subdomain || 'boutique'}.${platformDomain}`}
            icon={ExternalLink}
          />
        </>
      }
      filterToolbar={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mr-2">
              Étapes du guide :
            </span>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                  : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-border,#dedede)]/40'
              }`}
            >
              Toutes les étapes (5)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('pending')}
              className={`px-3 py-1 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'pending'
                  ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                  : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-border,#dedede)]/40'
              }`}
            >
              À compléter ({5 - totalCompleted})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('completed')}
              className={`px-3 py-1 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'completed'
                  ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                  : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-border,#dedede)]/40'
              }`}
            >
              Validées ({totalCompleted})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-all shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
              <span>Actualiser</span>
            </button>
          </div>
        </div>
      }
      mainContent={
        <div className="space-y-3.5">
          {/* Milestone Cards Grid */}
          <div className="grid grid-cols-1 gap-3.5">
            {filteredMilestones.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.id}
                  className={`rounded-[var(--rego-r,8px)] border transition-all p-4.5 bg-[var(--rego-bg,#ffffff)] shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                    m.completed
                      ? 'border-emerald-200/80 dark:border-emerald-800/50 hover:border-emerald-400'
                      : 'border-[var(--rego-border,#dedede)] hover:border-[var(--rego-accent,#ad0505)]/40'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`p-2.5 rounded-[var(--rego-r,8px)] shrink-0 ${
                        m.completed
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                          {m.badgeLabel}
                        </span>
                        <ReGoStatusChip
                          status={m.completed ? 'ok' : 'warn'}
                          label={m.completed ? 'Validé' : 'À compléter'}
                          size="xs"
                        />
                        {m.tag && (
                          <span className="text-[10px] font-medium text-[var(--rego-ink-2,#737373)] bg-[var(--rego-surface,#f5f5f5)] px-2 py-0.5 rounded-full border border-[var(--rego-border,#dedede)]/50">
                            {m.tag}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)] mt-1">
                        {m.title}
                      </h3>
                      <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
                        {m.subtitle}
                      </p>

                      <div className="mt-2 text-xs font-mono text-[var(--rego-fg,#111111)] bg-[var(--rego-surface,#f5f5f5)]/70 px-2.5 py-1 rounded-[var(--rego-r,8px)] inline-block border border-[var(--rego-border,#dedede)]/40">
                        {m.summary}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 md:pl-4 border-t md:border-t-0 md:border-l border-[var(--rego-border,#dedede)]/60 pt-3 md:pt-0">
                    <button
                      type="button"
                      onClick={() => setDrawerStep(m.step)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--rego-r,8px)] text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                        m.completed
                          ? 'border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                          : 'bg-[var(--rego-accent,#ad0505)] text-white hover:bg-[var(--rego-accent-deep,#8f0404)]'
                      }`}
                    >
                      <span>{m.actionLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Quick Links Deck */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
            <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-4 shadow-2xs space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                Personnalisation Avancée
              </h4>
              <p className="text-xs text-[var(--rego-ink-2,#737373)]">
                Ajustez votre thème visuel, votre palette de couleurs et la mise en page de la vitrine.
              </p>
              <Link
                href="/hub/dashboard/settings?tab=theme"
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline pt-1"
              >
                <span>Studio de Thème →</span>
              </Link>
            </div>

            <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-4 shadow-2xs space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                Catalogue Produits
              </h4>
              <p className="text-xs text-[var(--rego-ink-2,#737373)]">
                Créez vos déclinaisons de tailles, gérez vos stocks et organisez vos collections marchandes.
              </p>
              <Link
                href="/hub/dashboard/products"
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline pt-1"
              >
                <span>Gérer les Produits →</span>
              </Link>
            </div>

            <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-4 shadow-2xs space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                Portail KYC & Payouts
              </h4>
              <p className="text-xs text-[var(--rego-ink-2,#737373)]">
                Consultez l'avancement de votre examen légal et gérez vos virements bancaires BCT.
              </p>
              <Link
                href="/hub/dashboard/kyc"
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline pt-1"
              >
                <span>Portail KYC Vendeur →</span>
              </Link>
            </div>
          </div>
        </div>
      }
      drawer={
        <ReGoDrawer
          isOpen={drawerStep !== null}
          onClose={() => {
            setDrawerStep(null);
            setDrawerError('');
          }}
          title={
            drawerStep === 1
              ? 'Étape 01 : Identité & Paramètres Boutique'
              : drawerStep === 2
                ? 'Étape 02 : Publication du Premier Produit'
                : drawerStep === 3
                  ? 'Étape 03 : Thème Graphique & Couleurs'
                  : drawerStep === 4
                    ? 'Étape 04 : Expédition & Modalités de Paiement'
                    : 'Étape 05 : Justificatifs KYC & RIB Tunisien'
          }
          subtitle="Modifiez directement les paramètres de cette étape sans quitter la page."
        >
          {drawerError && (
            <div className="rounded-[var(--rego-r,8px)] border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{drawerError}</span>
            </div>
          )}

          {/* Drawer Step 1: Store Basics */}
          {drawerStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  Nom commercial de la boutique *
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ex : Maison Artisanale Tunisienne"
                  className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3.5 py-2 text-xs font-medium text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                  Sous-domaine officiel
                </label>
                <div className="flex rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] overflow-hidden font-mono text-xs">
                  <input
                    type="text"
                    readOnly
                    value={store?.subdomain || ''}
                    className="flex-1 bg-transparent px-3 py-2 text-[var(--rego-ink-2,#737373)] outline-none cursor-not-allowed"
                  />
                  <span className="px-3 py-2 bg-[var(--rego-border,#dedede)]/40 text-[var(--rego-ink-2,#737373)] border-l border-[var(--rego-border,#dedede)]">
                    .{platformDomain}
                  </span>
                </div>
              </div>

              {/* Logo Uploaders */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  Logo Officiel de la Boutique
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[var(--rego-r,8px)] border border-dashed border-[var(--rego-border,#dedede)] p-3 text-center flex flex-col items-center justify-center min-h-[100px] bg-[var(--rego-surface,#f5f5f5)]/50">
                    {logoUrl ? (
                      <div className="space-y-1.5">
                        <img
                          src={getResizedImageUrl(logoUrl, 'small')}
                          alt="Logo Clair"
                          className="h-9 object-contain mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          className="text-[11px] font-bold text-rose-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer space-y-1 block">
                        <Upload className="w-5 h-5 text-[var(--rego-ink-2,#737373)] mx-auto" />
                        <span className="block text-[11px] font-bold text-[var(--rego-fg,#111111)]">
                          Fond Clair
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setUploadingLogo(true);
                                const url = await onFileUpload(file, 'store_asset');
                                setLogoUrl(url);
                              } catch {
                                setDrawerError('Échec du téléversement du logo');
                              } finally {
                                setUploadingLogo(false);
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="rounded-[var(--rego-r,8px)] border border-dashed border-[var(--rego-border,#dedede)] p-3 text-center flex flex-col items-center justify-center min-h-[100px] bg-[var(--rego-surface,#f5f5f5)]/50">
                    {logoDarkUrl ? (
                      <div className="space-y-1.5">
                        <img
                          src={getResizedImageUrl(logoDarkUrl, 'small')}
                          alt="Logo Sombre"
                          className="h-9 object-contain mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => setLogoDarkUrl('')}
                          className="text-[11px] font-bold text-rose-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer space-y-1 block">
                        <Upload className="w-5 h-5 text-[var(--rego-ink-2,#737373)] mx-auto" />
                        <span className="block text-[11px] font-bold text-[var(--rego-fg,#111111)]">
                          Fond Sombre
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setUploadingLogo(true);
                                const url = await onFileUpload(file, 'store_asset');
                                setLogoDarkUrl(url);
                              } catch {
                                setDrawerError('Échec du téléversement du logo');
                              } finally {
                                setUploadingLogo(false);
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--rego-border,#dedede)] flex justify-end gap-2">
                <button
                  type="button"
                  disabled={savingStep || uploadingLogo}
                  onClick={async () => {
                    try {
                      await onSaveBasics();
                      setDrawerStep(null);
                    } catch (err: any) {
                      setDrawerError(err?.message || "Erreur d'enregistrement");
                    }
                  }}
                  className="rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {savingStep ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                </button>
              </div>
            </div>
          )}

          {/* Drawer Step 2: First Product */}
          {drawerStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  Titre du Produit *
                </label>
                <input
                  type="text"
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  placeholder="Ex : Tasse en céramique de Nabeul"
                  className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3.5 py-2 text-xs font-medium text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                    Prix (TND) *
                  </label>
                  <input
                    type="text"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="45.000"
                    className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3.5 py-2 text-xs font-mono font-bold text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                    Catégorie
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-2 text-xs font-medium text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  Description
                </label>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={3}
                  placeholder="Détails du produit, matériaux, dimensions..."
                  className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-3 text-xs font-medium text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              {/* Product Image Dropzone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  Photo Principale
                </label>
                <div className="rounded-[var(--rego-r,8px)] border border-dashed border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50 p-4 text-center flex flex-col items-center justify-center min-h-[120px]">
                  {productThumbnail ? (
                    <div className="space-y-2">
                      <img
                        src={productThumbnail}
                        alt="Aperçu"
                        className="h-20 rounded-md object-cover mx-auto"
                      />
                      <button
                        type="button"
                        onClick={() => setProductThumbnail('')}
                        className="text-[11px] font-bold text-rose-600 hover:underline"
                      >
                        Supprimer la photo
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer space-y-1.5 block">
                      <Upload className="w-5 h-5 text-[var(--rego-ink-2,#737373)] mx-auto" />
                      <span className="block text-[11px] font-bold text-[var(--rego-fg,#111111)]">
                        Téléverser une image
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              setUploadingProductImg(true);
                              const url = await onFileUpload(file, 'product_image');
                              setProductThumbnail(url);
                            } catch {
                              setDrawerError('Échec du téléversement de la photo');
                            } finally {
                              setUploadingProductImg(false);
                            }
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--rego-border,#dedede)] flex justify-between items-center">
                <Link
                  href="/hub/dashboard/products"
                  className="text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:underline"
                >
                  Voir tout le catalogue →
                </Link>
                <button
                  type="button"
                  disabled={savingStep || uploadingProductImg}
                  onClick={async () => {
                    try {
                      await onSaveProduct();
                      setDrawerStep(null);
                    } catch (err: any) {
                      setDrawerError(err?.message || 'Erreur de publication du produit');
                    }
                  }}
                  className="rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {savingStep ? 'Publication...' : 'Publier le produit'}
                </button>
              </div>
            </div>
          )}

          {/* Drawer Step 3: Theme */}
          {drawerStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  Sélectionnez votre Thème
                </label>
                <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {Object.values(themes).map((t) => {
                    const isSelected = selectedTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTheme(t.id)}
                        className={`rounded-[var(--rego-r,8px)] border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-accent-soft,rgba(173,5,5,0.05))] font-bold'
                            : 'border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] hover:border-[var(--rego-border,#dedede)]/80'
                        }`}
                      >
                        <Palette className="w-4 h-4 text-[var(--rego-accent,#ad0505)] mb-1" />
                        <h5 className="text-xs font-bold text-[var(--rego-fg,#111111)] truncate">
                          {t.name}
                        </h5>
                        <p className="text-[10px] text-[var(--rego-ink-2,#737373)] truncate mt-0.5">
                          {t.typography.fontFamily}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50 p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] block">
                    Nuances Actives
                  </span>
                  <p className="text-xs font-bold text-[var(--rego-fg,#111111)] mt-0.5">
                    {themes[selectedTheme]?.name}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {themes[selectedTheme]?.colorPresets?.[0] &&
                    [
                      themes[selectedTheme].colorPresets[0].primary,
                      themes[selectedTheme].colorPresets[0].secondary,
                      themes[selectedTheme].colorPresets[0].accent,
                    ].map((color) => (
                      <span
                        key={color}
                        className="w-4 h-4 rounded-full border border-[var(--rego-border,#dedede)]"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--rego-border,#dedede)] flex justify-end gap-2">
                <button
                  type="button"
                  disabled={savingStep}
                  onClick={async () => {
                    try {
                      await onSaveTheme();
                      setDrawerStep(null);
                    } catch (err: any) {
                      setDrawerError(err?.message || "Erreur d'enregistrement du thème");
                    }
                  }}
                  className="rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {savingStep ? 'Enregistrement...' : 'Appliquer ce thème'}
                </button>
              </div>
            </div>
          )}

          {/* Drawer Step 4: Payments & Shipping */}
          {drawerStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  Frais de Livraison Forfaitaires (TND) *
                </label>
                <div className="flex rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] overflow-hidden">
                  <input
                    type="text"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(e.target.value)}
                    placeholder="7.000"
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold text-[var(--rego-fg,#111111)] outline-none"
                  />
                  <span className="px-3 py-2 bg-[var(--rego-surface,#f5f5f5)] text-xs font-extrabold text-[var(--rego-ink-2,#737373)] border-l border-[var(--rego-border,#dedede)]">
                    TND
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  Modes de Versement
                </label>

                <label className="flex items-start gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={codEnabled}
                    onChange={(e) => setCodEnabled(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)] focus:ring-0"
                  />
                  <div>
                    <span className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                      Paiement à la Livraison (COD - Cash On Delivery)
                    </span>
                    <span className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                      Encaissement direct des fonds auprès des transporteurs (Aramex, Rapid-Poste, Runex).
                    </span>
                  </div>
                </label>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                    RIB Bancaire Tunisien (20 chiffres)
                  </label>
                  <textarea
                    rows={2}
                    value={bankTransferDetails}
                    onChange={(e) => setBankTransferDetails(e.target.value)}
                    placeholder="Nom de la banque, titulaire du compte et RIB sur 20 chiffres..."
                    className="w-full rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-3 text-xs font-mono font-medium text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--rego-border,#dedede)] flex justify-end gap-2">
                <button
                  type="button"
                  disabled={savingStep}
                  onClick={async () => {
                    try {
                      await onSaveShippingPayment();
                      setDrawerStep(null);
                    } catch (err: any) {
                      setDrawerError(err?.message || "Erreur d'enregistrement des paiements");
                    }
                  }}
                  className="rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {savingStep ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {/* Drawer Step 5: KYC Verification */}
          {drawerStep === 5 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                  Numéro de Téléphone (+216) *
                </label>
                <div className="flex rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] overflow-hidden">
                  <span className="px-3 py-2 bg-[var(--rego-surface,#f5f5f5)] text-xs font-bold text-[var(--rego-ink-2,#737373)] border-r border-[var(--rego-border,#dedede)] flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> +216
                  </span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98765432"
                    className="flex-1 px-3 py-2 text-xs font-medium text-[var(--rego-fg,#111111)] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                    Registre de Commerce (RC)
                  </label>
                  <div className="rounded-[var(--rego-r,8px)] border border-dashed border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50 p-3 text-center flex flex-col items-center justify-center min-h-[110px]">
                    {rcFileUrl ? (
                      <div className="space-y-1">
                        <FileText className="w-6 h-6 text-emerald-600 mx-auto" />
                        <span className="block text-[11px] font-bold text-emerald-700 truncate max-w-[120px]">
                          RC téléversé
                        </span>
                        <button
                          type="button"
                          onClick={() => setRcFileUrl('')}
                          className="text-[10px] font-bold text-rose-600 hover:underline"
                        >
                          Remplacer
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer space-y-1 block">
                        <Upload className="w-5 h-5 text-[var(--rego-ink-2,#737373)] mx-auto" />
                        <span className="block text-[11px] font-bold text-[var(--rego-fg,#111111)]">
                          Sélectionner RC
                        </span>
                        <input
                          type="file"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setUploadingKyc(true);
                                const url = await onFileUpload(file, 'kyc_document');
                                setRcFileUrl(url);
                              } catch {
                                setDrawerError('Échec du téléversement du RC');
                              } finally {
                                setUploadingKyc(false);
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-fg,#111111)]">
                    Carte d'Identité (CIN)
                  </label>
                  <div className="rounded-[var(--rego-r,8px)] border border-dashed border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/50 p-3 text-center flex flex-col items-center justify-center min-h-[110px]">
                    {cinFileUrl ? (
                      <div className="space-y-1">
                        <FileText className="w-6 h-6 text-emerald-600 mx-auto" />
                        <span className="block text-[11px] font-bold text-emerald-700 truncate max-w-[120px]">
                          CIN téléversée
                        </span>
                        <button
                          type="button"
                          onClick={() => setCinFileUrl('')}
                          className="text-[10px] font-bold text-rose-600 hover:underline"
                        >
                          Remplacer
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer space-y-1 block">
                        <Upload className="w-5 h-5 text-[var(--rego-ink-2,#737373)] mx-auto" />
                        <span className="block text-[11px] font-bold text-[var(--rego-fg,#111111)]">
                          Sélectionner CIN
                        </span>
                        <input
                          type="file"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setUploadingKyc(true);
                                const url = await onFileUpload(file, 'kyc_document');
                                setCinFileUrl(url);
                              } catch {
                                setDrawerError('Échec du téléversement de la CIN');
                              } finally {
                                setUploadingKyc(false);
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--rego-border,#dedede)] flex justify-between items-center">
                <Link
                  href="/hub/dashboard/kyc"
                  className="text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:underline"
                >
                  Portail KYC complet →
                </Link>
                <button
                  type="button"
                  disabled={savingStep || uploadingKyc}
                  onClick={async () => {
                    try {
                      await onSaveKyc();
                      setDrawerStep(null);
                    } catch (err: any) {
                      setDrawerError(err?.message || "Erreur lors de la soumission KYC");
                    }
                  }}
                  className="rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {savingStep ? 'Soumission...' : 'Soumettre les documents'}
                </button>
              </div>
            </div>
          )}
        </ReGoDrawer>
      }
    />
  );
}
