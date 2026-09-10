'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  Image as ImageIcon,
  MapPin,
  Clock,
  ShieldCheck,
  Palette,
  Sparkles,
  RefreshCw,
  Sliders,
  ExternalLink,
  Mail,
  Globe,
  Truck,
  Lock,
  Star,
  Trash2,
  Plus,
  BarChart3,
  Activity,
  KeyRound,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoModal,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AccountTwoFactorPanel } from '@/components/AccountTwoFactorPanel';
import { AccountSecurityActivityPanel } from '@/components/AccountSecurityActivityPanel';
import { ThemeCustomizer } from '../ThemeCustomizer';
import { EmailTemplateManager } from '@/components/email/EmailTemplateManager';
import { themes, type ThemeId, type ThemeCustomization } from '@/lib/themes';
import type { DashboardStyle, AccentColor } from '@/contexts/DashboardStyleContext';

const TUNISIAN_GOVERNORATES: { id: string; nameFr: string; nameAr: string }[] = [
  { id: 'TUN', nameFr: 'Tunis', nameAr: 'تونس' },
  { id: 'ARI', nameFr: 'Ariana', nameAr: 'أريانة' },
  { id: 'BEN', nameFr: 'Ben Arous', nameAr: 'بن عروس' },
  { id: 'MAN', nameFr: 'Manouba', nameAr: 'منوبة' },
  { id: 'NAB', nameFr: 'Nabeul', nameAr: 'نابل' },
  { id: 'ZAG', nameFr: 'Zaghouan', nameAr: 'زغوان' },
  { id: 'BIZ', nameFr: 'Bizerte', nameAr: 'بنزرت' },
  { id: 'SOU', nameFr: 'Sousse', nameAr: 'سوسة' },
  { id: 'MON', nameFr: 'Monastir', nameAr: 'المنستير' },
  { id: 'MAH', nameFr: 'Mahdia', nameAr: 'المهدية' },
  { id: 'BEJ', nameFr: 'Béja', nameAr: 'باجة' },
  { id: 'JEN', nameFr: 'Jendouba', nameAr: 'جندوبة' },
  { id: 'KEF', nameFr: 'Le Kef', nameAr: 'الكاف' },
  { id: 'SIL', nameFr: 'Siliana', nameAr: 'سليانة' },
  { id: 'KAI', nameFr: 'Kairouan', nameAr: 'القيروان' },
  { id: 'KAS', nameFr: 'Kasserine', nameAr: 'القصرين' },
  { id: 'SID', nameFr: 'Sidi Bouzid', nameAr: 'سيدي بوزيد' },
  { id: 'SFA', nameFr: 'Sfax', nameAr: 'صفاقس' },
  { id: 'GAB', nameFr: 'Gabès', nameAr: 'قابس' },
  { id: 'MED', nameFr: 'Médenine', nameAr: 'مدنين' },
  { id: 'TAT', nameFr: 'Tataouine', nameAr: 'تطاوين' },
  { id: 'GAF', nameFr: 'Gafsa', nameAr: 'قفصة' },
  { id: 'TOZ', nameFr: 'Tozeur', nameAr: 'توزر' },
  { id: 'KEB', nameFr: 'Kébili', nameAr: 'قبلي' },
];

export interface ReGoSettingsApiTheme {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  is_free: boolean;
  is_premium: boolean;
  price: number;
  is_active: boolean;
}

export interface ReGoSettingsThemeListItem {
  id: ThemeId;
  name: string;
  desc: string;
  free: boolean;
  apiTheme?: ReGoSettingsApiTheme;
}

export interface ReGoSettingsDomainItem {
  id: string;
  hostname: string;
  is_primary: boolean;
  verification_status: 'pending' | 'verified' | 'failed';
  ssl_status: 'pending' | 'issuing' | 'active' | 'failed';
  created_at: string;
}

const MAIN_TAB_IDS = ['store', 'security', 'theme', 'domain', 'shipping', 'analytics', 'emails'] as const;

type StoreSection = 'identity' | 'contact' | 'policies' | 'appearance';

export interface SellerReGoSettingsProps {
  storeName: string;
  subdomain: string;
  slogan: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  contactEmail: string;
  phone: string;
  address: string;
  governorate: string;
  postalCode: string;
  operatingHours: string;
  preparationTime: string;
  returnPolicy: string;
  loading: boolean;
  saving: boolean;
  success: string;
  error: string;
  onStoreNameChange: (v: string) => void;
  onSubdomainChange: (v: string) => void;
  onSloganChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onLogoUrlChange: (v: string) => void;
  onBannerUrlChange: (v: string) => void;
  onContactEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onGovernorateChange: (v: string) => void;
  onPostalCodeChange: (v: string) => void;
  onOperatingHoursChange: (v: string) => void;
  onPreparationTimeChange: (v: string) => void;
  onReturnPolicyChange: (v: string) => void;
  onSave: () => void;
  dashboardStyle: DashboardStyle;
  onDashboardStyleChange: (s: DashboardStyle) => void;
  accent: AccentColor;
  onAccentChange: (a: AccentColor) => void;
  dir?: 'ltr' | 'rtl';
  tabs?: { id: string; label: string; icon: LucideIcon }[];
  activeMainTab?: string;
  onMainTabChange?: (tab: string) => void;
  /* Store status */
  storeStatus: string;
  storeIsVerified: boolean;
  marketplaceName: string;
  /* Theme tab */
  themeList: ReGoSettingsThemeListItem[];
  selectedTheme: ThemeId;
  onSelectedThemeChange: (id: ThemeId) => void;
  onApplyTheme: () => void;
  themeCustomization: ThemeCustomization;
  onSaveThemeCustomization: (customization: ThemeCustomization) => Promise<void>;
  purchasedThemeIds: Set<string>;
  purchaseConfirmTheme: ReGoSettingsApiTheme | null;
  onPurchaseConfirmThemeChange: (theme: ReGoSettingsApiTheme | null) => void;
  onPurchaseTheme: (theme: ReGoSettingsApiTheme) => void;
  purchasing: boolean;
  /* Domain tab */
  customDomain: string;
  domainList: ReGoSettingsDomainItem[];
  loadingDomains: boolean;
  newDomainHostname: string;
  onNewDomainHostnameChange: (v: string) => void;
  addingDomain: boolean;
  onAddDomain: () => void;
  verifyingDomainId: string | null;
  onVerifyDomain: (id: string) => void;
  onMakePrimaryDomain: (id: string) => void;
  domainDeleteTargetId: string | null;
  onDomainDeleteTargetChange: (id: string | null) => void;
  onConfirmDomainDelete: () => void;
  deletingDomain: boolean;
  /* Shipping tab */
  shippingMode: string;
  onShippingModeChange: (v: string) => void;
  shippingPolicy: string;
  onShippingPolicyChange: (v: string) => void;
  paymentPolicy: string;
  onPaymentPolicyChange: (v: string) => void;
  onSaveShipping: () => void;
  /* Analytics tab */
  ga4MeasurementId: string;
  onGa4MeasurementIdChange: (v: string) => void;
  metaPixelId: string;
  onMetaPixelIdChange: (v: string) => void;
  gtmContainerId: string;
  onGtmContainerIdChange: (v: string) => void;
  tiktokPixelId: string;
  onTiktokPixelIdChange: (v: string) => void;
}

export function SellerReGoSettings({
  storeName,
  subdomain,
  slogan,
  description,
  logoUrl,
  bannerUrl,
  contactEmail,
  phone,
  address,
  governorate,
  postalCode,
  operatingHours,
  preparationTime,
  returnPolicy,
  loading: _loading,
  saving,
  success,
  error,
  onStoreNameChange,
  onSubdomainChange,
  onSloganChange,
  onDescriptionChange,
  onLogoUrlChange,
  onBannerUrlChange,
  onContactEmailChange,
  onPhoneChange,
  onAddressChange,
  onGovernorateChange,
  onPostalCodeChange,
  onOperatingHoursChange,
  onPreparationTimeChange,
  onReturnPolicyChange,
  onSave,
  dashboardStyle,
  onDashboardStyleChange,
  accent,
  onAccentChange,
  dir = 'ltr',
  tabs,
  activeMainTab,
  onMainTabChange,
  storeStatus,
  storeIsVerified,
  marketplaceName,
  themeList,
  selectedTheme,
  onSelectedThemeChange,
  onApplyTheme,
  themeCustomization,
  onSaveThemeCustomization,
  purchasedThemeIds,
  purchaseConfirmTheme,
  onPurchaseConfirmThemeChange,
  onPurchaseTheme,
  purchasing,
  customDomain,
  domainList,
  loadingDomains,
  newDomainHostname,
  onNewDomainHostnameChange,
  addingDomain,
  onAddDomain,
  verifyingDomainId,
  onVerifyDomain,
  onMakePrimaryDomain,
  domainDeleteTargetId,
  onDomainDeleteTargetChange,
  onConfirmDomainDelete,
  deletingDomain,
  shippingMode,
  onShippingModeChange,
  shippingPolicy,
  onShippingPolicyChange,
  paymentPolicy,
  onPaymentPolicyChange,
  onSaveShipping,
  ga4MeasurementId,
  onGa4MeasurementIdChange,
  metaPixelId,
  onMetaPixelIdChange,
  gtmContainerId,
  onGtmContainerIdChange,
  tiktokPixelId,
  onTiktokPixelIdChange,
}: SellerReGoSettingsProps) {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<StoreSection>('identity');

  const currentMainTab =
    activeMainTab && (MAIN_TAB_IDS as readonly string[]).includes(activeMainTab) ? activeMainTab : 'store';

  const configuredAnalyticsCount = [ga4MeasurementId, metaPixelId, gtmContainerId, tiktokPixelId].filter(
    (v) => v.trim().length > 0,
  ).length;
  const verifiedDomainCount = domainList.filter((d) => d.verification_status === 'verified').length;
  const activeSslCount = domainList.filter((d) => d.ssl_status === 'active').length;
  const shippingModeLabel = shippingMode === 'platform_unified' ? 'Plateforme unifiée' : 'Gestion vendeur';
  const dashboardStyleLabel =
    dashboardStyle === 'rego' ? 'Cockpit ReGo' : dashboardStyle === 'bento' ? 'Cockpit Bento' : 'Tableau Classique';
  const selectedThemeName = themeList.find((item) => item.id === selectedTheme)?.name || selectedTheme;

  const mainTabMeta: Record<string, { title: string; subtitle: string; icon: LucideIcon }> = {
    store: {
      title: 'Paramètres Généraux de la Boutique',
      subtitle:
        'Mettez à jour les informations légales, les visuels de marque et les coordonnées de contact de votre boutique.',
      icon: Settings,
    },
    security: {
      title: 'Sécurité du Compte Vendeur',
      subtitle: 'Gérez la double authentification (2FA) et surveillez l’activité récente de vos connexions.',
      icon: ShieldCheck,
    },
    theme: {
      title: 'Style & Thème de votre Espace Vendeur',
      subtitle:
        'Sélectionnez votre style de cockpit, le thème de votre vitrine publique et personnalisez les couleurs avancées.',
      icon: Palette,
    },
    domain: {
      title: 'Domaines Personnalisés',
      subtitle: `Connectez vos propres noms de domaine à votre boutique ${marketplaceName} (plan Starter et supérieur).`,
      icon: Globe,
    },
    shipping: {
      title: 'Mode de Livraison & Politiques',
      subtitle: 'Choisissez votre mode d’expédition et définissez vos politiques de livraison, retours et paiement.',
      icon: Truck,
    },
    analytics: {
      title: 'Analytics & Pixels de Suivi',
      subtitle:
        'Configurez vos identifiants Google Analytics 4, Meta Pixel, Google Tag Manager et TikTok Pixel pour suivre les conversions et optimiser vos campagnes publicitaires sur votre boutique.',
      icon: BarChart3,
    },
    emails: {
      title: 'Emails de la Boutique',
      subtitle:
        'Personnalisez les emails envoyés à vos clients storefront, comme l’inscription acheteur, la commande placée et le paiement confirmé.',
      icon: Mail,
    },
  };
  const currentMeta = mainTabMeta[currentMainTab] || mainTabMeta.store;

  const renderStatusBadge = () => {
    switch (currentMainTab) {
      case 'security':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <KeyRound className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
            <span>2FA &amp; Activité</span>
          </div>
        );
      case 'theme':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
            <Palette className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
            <span>Thème Actif : {selectedThemeName}</span>
          </div>
        );
      case 'domain':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
            <Globe className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
            <span>
              {domainList.length} domaine{domainList.length === 1 ? '' : 's'}
            </span>
          </div>
        );
      case 'shipping':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
            <Truck className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
            <span>{shippingModeLabel}</span>
          </div>
        );
      case 'analytics':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
            <BarChart3 className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
            <span>{configuredAnalyticsCount}/4 configurés</span>
          </div>
        );
      case 'emails':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
            <Mail className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
            <span>Templates Storefront</span>
          </div>
        );
      default:
        return (
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              storeStatus === 'maintenance'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <ShieldCheck
              className={`w-3.5 h-3.5 ${
                storeStatus === 'maintenance' ? 'text-amber-500' : 'text-emerald-500'
              }`}
            />
            <span>{storeStatus === 'maintenance' ? 'Boutique En Maintenance' : 'Boutique En Ligne Active'}</span>
          </div>
        );
    }
  };

  const renderPrimaryAction = () => {
    if (currentMainTab === 'theme') {
      return (
        <button
          type="button"
          onClick={onApplyTheme}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-[var(--rego-accent,#ad0505)] hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>{saving ? t('dashboardPages.settings.saving') : t('dashboardPages.settings.applyTheme')}</span>
        </button>
      );
    }
    if (currentMainTab === 'shipping') {
      return (
        <button
          type="button"
          onClick={onSaveShipping}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-[var(--rego-accent,#ad0505)] hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saving ? t('dashboardPages.settings.saving') : t('dashboardPages.settings.save')}</span>
        </button>
      );
    }
    if (currentMainTab === 'analytics') {
      return (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-[var(--rego-accent,#ad0505)] hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saving ? t('dashboardPages.settings.saving') : 'Sauvegarder les pixels & analytics'}</span>
        </button>
      );
    }
    if (currentMainTab === 'store') {
      return (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-[var(--rego-accent,#ad0505)] hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saving ? 'Enregistrement...' : 'Enregistrer les Modifications'}</span>
        </button>
      );
    }
    return undefined;
  };

  const renderKpiStrip = () => {
    if (currentMainTab === 'security') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReGoKpiHero
            label="Boutique"
            value={<span className="text-base font-black truncate block">{storeName || 'Ma Boutique'}</span>}
            hint="Compte vendeur actif"
            icon={Building}
            accent={true}
          />
          <ReGoKpiHero
            label="Statut Boutique"
            value={<span className="text-sm font-bold capitalize">{storeStatus === 'maintenance' ? 'Maintenance' : storeIsVerified ? 'Vérifiée' : 'En attente'}</span>}
            hint="Vérification plateforme"
            icon={ShieldCheck}
          />
          <ReGoKpiHero
            label="Email de Contact"
            value={<span className="text-sm font-bold truncate block">{contactEmail || 'Non défini'}</span>}
            hint="Canal de sécurité"
            icon={Mail}
          />
          <ReGoKpiHero
            label="Espace de Travail"
            value={<span className="text-sm font-bold">{dashboardStyleLabel}</span>}
            hint="Interface vendeur"
            icon={Palette}
          />
        </div>
      );
    }
    if (currentMainTab === 'theme') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReGoKpiHero
            label="Thème Actif"
            value={<span className="text-base font-black truncate block">{selectedThemeName}</span>}
            hint="Déployé sur votre vitrine"
            icon={Palette}
            accent={true}
          />
          <ReGoKpiHero
            label="Thèmes Disponibles"
            value={<span className="text-sm font-bold">{themeList.length}</span>}
            hint="Catalogue vitrine publique"
            icon={Sparkles}
          />
          <ReGoKpiHero
            label="Thèmes Premium Achetés"
            value={<span className="text-sm font-bold">{purchasedThemeIds.size}</span>}
            hint="Débloqués sur votre compte"
            icon={Lock}
          />
          <ReGoKpiHero
            label="Espace de Travail"
            value={<span className="text-sm font-bold">{dashboardStyleLabel}</span>}
            hint="Cockpit tableau de bord"
            icon={Settings}
          />
        </div>
      );
    }
    if (currentMainTab === 'domain') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReGoKpiHero
            label="Domaines Configurés"
            value={<span className="text-sm font-bold">{domainList.length}</span>}
            hint="Domaines personnalisés"
            icon={Globe}
            accent={true}
          />
          <ReGoKpiHero
            label="Vérifiés DNS"
            value={<span className="text-sm font-bold">{verifiedDomainCount}</span>}
            hint="Propriété confirmée"
            icon={CheckCircle2}
          />
          <ReGoKpiHero
            label="SSL Actifs"
            value={<span className="text-sm font-bold">{activeSslCount}</span>}
            hint="Certificats HTTPS"
            icon={Lock}
          />
          <ReGoKpiHero
            label="Sous-domaine"
            value={<span className="text-sm font-bold truncate block">{subdomain || 'Auto-généré'}</span>}
            hint={customDomain ? `Domaine courant : ${customDomain}` : 'Vitrine par défaut'}
            icon={ExternalLink}
          />
        </div>
      );
    }
    if (currentMainTab === 'shipping') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReGoKpiHero
            label="Mode de Livraison"
            value={<span className="text-sm font-bold">{shippingModeLabel}</span>}
            hint="Gestion des colis"
            icon={Truck}
            accent={true}
          />
          <ReGoKpiHero
            label="Délai de Préparation"
            value={<span className="text-sm font-bold">{preparationTime || '24h à 48h'}</span>}
            hint="Avant expédition"
            icon={Clock}
          />
          <ReGoKpiHero
            label="Base d'Expédition"
            value={<span className="text-sm font-bold capitalize truncate block">{governorate || 'Tunis'}</span>}
            hint="Adresse de collecte"
            icon={MapPin}
          />
          <ReGoKpiHero
            label="Plateforme"
            value={<span className="text-sm font-bold truncate block">{marketplaceName}</span>}
            hint="Intégrations logistiques"
            icon={Globe}
          />
        </div>
      );
    }
    if (currentMainTab === 'analytics') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReGoKpiHero
            label="Outils Configurés"
            value={<span className="text-sm font-bold">{configuredAnalyticsCount}/4</span>}
            hint="Pixels & conteneurs actifs"
            icon={BarChart3}
            accent={true}
          />
          <ReGoKpiHero
            label="Google Analytics 4"
            value={<span className="text-sm font-bold">{ga4MeasurementId.trim() ? 'Configuré' : 'Vide'}</span>}
            hint="Mesure d'audience"
            icon={Activity}
          />
          <ReGoKpiHero
            label="Meta Pixel"
            value={<span className="text-sm font-bold">{metaPixelId.trim() ? 'Configuré' : 'Vide'}</span>}
            hint="Ads & retargeting"
            icon={BarChart3}
          />
          <ReGoKpiHero
            label="GTM & TikTok"
            value={
              <span className="text-sm font-bold">
                {[gtmContainerId, tiktokPixelId].filter((v) => v.trim().length > 0).length}/2
              </span>
            }
            hint="Conteneur & pixel social"
            icon={Sparkles}
          />
        </div>
      );
    }
    if (currentMainTab === 'emails') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReGoKpiHero
            label="Boutique"
            value={<span className="text-base font-black truncate block">{storeName || 'Ma Boutique'}</span>}
            hint="Expéditeur des emails"
            icon={Building}
            accent={true}
          />
          <ReGoKpiHero
            label="Email de Contact"
            value={<span className="text-sm font-bold truncate block">{contactEmail || 'Non défini'}</span>}
            hint="Canal acheteurs"
            icon={Mail}
          />
          <ReGoKpiHero
            label="Statut Boutique"
            value={<span className="text-sm font-bold capitalize">{storeStatus === 'maintenance' ? 'Maintenance' : storeIsVerified ? 'Vérifiée' : 'En attente'}</span>}
            hint="Vérification plateforme"
            icon={ShieldCheck}
          />
          <ReGoKpiHero
            label="Périmètre"
            value={<span className="text-sm font-bold">Storefront</span>}
            hint="Emails clients boutique"
            icon={Globe}
          />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ReGoKpiHero
          label="Nom Commercial"
          value={<span className="text-base font-black truncate block">{storeName || 'Ma Boutique'}</span>}
          hint="Identité de marque"
          icon={Building}
          accent={true}
        />
        <ReGoKpiHero
          label="Gouvernorat"
          value={<span className="text-sm font-bold capitalize">{governorate || 'Tunis'}</span>}
          hint="Base d'expédition"
          icon={MapPin}
        />
        <ReGoKpiHero
          label="Expédition Moyenne"
          value={<span className="text-sm font-bold">{preparationTime || '24h à 48h'}</span>}
          hint="Délai de préparation"
          icon={Truck}
        />
        <ReGoKpiHero
          label="Style Actif"
          value={<span className="text-sm font-bold">{dashboardStyleLabel}</span>}
          hint="Interface vendeur"
          icon={Palette}
        />
      </div>
    );
  };

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Paramètres', href: '/hub/dashboard/settings' },
        { label: currentMeta.title, href: '/hub/dashboard/settings' },
      ]}
      headerTitle={currentMeta.title}
      headerSubtitle={currentMeta.subtitle}
      headerIcon={currentMeta.icon}
      statusBadge={renderStatusBadge()}
      primaryAction={renderPrimaryAction()}
      secondaryAction={
        subdomain ? (
          <a
            href={`https://${subdomain}.pandamarket.tn`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs"
          >
            <Globe className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
            <span>Voir ma Vitrine</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        ) : undefined
      }
      alertBanner={
        error ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-rose-700 dark:text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : success ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        ) : undefined
      }
      kpiStrip={renderKpiStrip()}
      filterToolbar={
        <div className="space-y-3 w-full">
          {tabs && tabs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800">
              {tabs.map((t) => {
                const Icon = t.icon;
                const isSelected = currentMainTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onMainTabChange?.(t.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentMainTab === 'store' && (
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/60 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Section :</span>
              <button
                type="button"
                onClick={() => setActiveTab('identity')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'identity'
                    ? 'bg-white dark:bg-slate-800 text-[var(--rego-accent,#ad0505)] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Identité & Marque</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('contact')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'contact'
                    ? 'bg-white dark:bg-slate-800 text-[var(--rego-accent,#ad0505)] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Coordonnées & Adresse</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('policies')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'policies'
                    ? 'bg-white dark:bg-slate-800 text-[var(--rego-accent,#ad0505)] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Horaires & Retours</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('appearance')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'appearance'
                    ? 'bg-white dark:bg-slate-800 text-[var(--rego-accent,#ad0505)] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Apparence & Style</span>
              </button>
            </div>
          )}
        </div>
      }
      mainContent={
        <div className="space-y-6">
          {/* MAIN TAB: STORE — SECTION 1: IDENTITY */}
          {currentMainTab === 'store' && activeTab === 'identity' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <ReGoCard
                  title="Identité Publique & Image de Marque"
                  subtitle="Configurez le nom visible par les acheteurs et l'URL de votre vitrine"
                  icon={Building}
                >
                  <div className="space-y-4 pt-2 text-xs">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nom de la boutique <span className="text-rose-500 dark:text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => onStoreNameChange(e.target.value)}
                        placeholder="e.g. Atelier Artisanal de Carthage"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Sous-domaine public
                      </label>
                      <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden">
                        <input
                          type="text"
                          value={subdomain}
                          onChange={(e) => onSubdomainChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="ma-boutique"
                          className="flex-1 px-3 py-2.5 bg-transparent font-medium outline-none"
                        />
                        <span className="px-3 text-slate-400 font-bold text-[11px] bg-slate-100 dark:bg-slate-800 py-2.5">
                          .pandamarket.tn
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Slogan / Accroche promotionnelle
                      </label>
                      <input
                        type="text"
                        value={slogan}
                        onChange={(e) => onSloganChange(e.target.value)}
                        placeholder="e.g. Créations artisanales tunisiennes faites à la main"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Histoire & Description de l&apos;Atelier
                      </label>
                      <textarea
                        rows={4}
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        placeholder="Racontez votre savoir-faire, l'origine de vos matières et vos inspirations..."
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                  </div>
                </ReGoCard>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <ReGoCard
                  title="Visuels Officiels"
                  subtitle="Logo carré et bannière panoramique pour votre boutique"
                  icon={ImageIcon}
                >
                  <div className="space-y-4 pt-2 text-xs">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        URL du Logo (Carré 512x512 recommandé)
                      </label>
                      <input
                        type="url"
                        value={logoUrl}
                        onChange={(e) => onLogoUrlChange(e.target.value)}
                        placeholder="https://.../logo.png"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none"
                      />
                      {logoUrl && (
                        <div className="mt-2 w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        URL de la Bannière (1920x600 recommandé)
                      </label>
                      <input
                        type="url"
                        value={bannerUrl}
                        onChange={(e) => onBannerUrlChange(e.target.value)}
                        placeholder="https://.../banner.jpg"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none"
                      />
                      {bannerUrl && (
                        <div className="mt-2 aspect-[16/5] w-full rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={bannerUrl} alt="Bannière" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* MAIN TAB: STORE — SECTION 2: CONTACT & LOCATION */}
          {currentMainTab === 'store' && activeTab === 'contact' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <ReGoCard
                  title="Coordonnées de Contact & Localisation en Tunisie"
                  subtitle="Informations destinées aux transporteurs et au service client"
                  icon={MapPin}
                >
                  <div className="space-y-4 pt-2 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Email de Contact Public
                        </label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => onContactEmailChange(e.target.value)}
                          placeholder="contact@boutique.tn"
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Téléphone / WhatsApp (+216)
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => onPhoneChange(e.target.value)}
                          placeholder="e.g. 98 123 456"
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Adresse Physique de l&apos;Atelier / Boutique
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => onAddressChange(e.target.value)}
                        placeholder="e.g. 14 Rue Habib Bourguiba"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Gouvernorat Tunisien <span className="text-rose-500 dark:text-rose-400">*</span>
                        </label>
                        <select
                          value={governorate}
                          onChange={(e) => onGovernorateChange(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none capitalize"
                        >
                          <option value="">Sélectionner un gouvernorat...</option>
                          {TUNISIAN_GOVERNORATES.map((g) => (
                            <option key={g.id} value={g.nameFr}>
                              {g.nameFr} ({g.nameAr})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Code Postal
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          value={postalCode}
                          onChange={(e) => onPostalCodeChange(e.target.value)}
                          placeholder="e.g. 1001"
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-center font-bold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </ReGoCard>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <ReGoCard
                  title="Couverture Logistique"
                  subtitle="Expédition sur les 24 gouvernorats tunisiens"
                  icon={Truck}
                >
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-400">
                    <p className="font-bold text-slate-900 dark:text-white">Transporteurs Partenaires Intégrés :</p>
                    <p>Vos colis sont collectés directement à l&apos;adresse de votre atelier par Aramex, Runex, Rapid-Poste ou First Delivery.</p>
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* MAIN TAB: STORE — SECTION 3: POLICIES & HOURS */}
          {currentMainTab === 'store' && activeTab === 'policies' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <ReGoCard
                  title="Horaires d'Ouverture & Politiques Commerciales"
                  subtitle="Rassurez vos acheteurs avec des règles de service claires"
                  icon={Clock}
                >
                  <div className="space-y-4 pt-2 text-xs">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Horaires d&apos;Ouverture / Service Client
                      </label>
                      <input
                        type="text"
                        value={operatingHours}
                        onChange={(e) => onOperatingHoursChange(e.target.value)}
                        placeholder="e.g. Du Lundi au Vendredi : 9h00 - 18h00 | Samedi : 9h00 - 13h00"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Délai Moyen de Préparation des Colis
                      </label>
                      <select
                        value={preparationTime}
                        onChange={(e) => onPreparationTimeChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none"
                      >
                        <option value="24h">Expédié sous 24h ouvrées (Rapide)</option>
                        <option value="1-2 jours">1 à 2 jours ouvrés (Standard)</option>
                        <option value="3-5 jours">Sur commande / Fabrication sur-mesure (3 à 5 jours)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Politique de Retour & Échange
                      </label>
                      <textarea
                        rows={4}
                        value={returnPolicy}
                        onChange={(e) => onReturnPolicyChange(e.target.value)}
                        placeholder="e.g. Retours acceptés sous 10 jours ouvrés si le produit n'a pas été utilisé et dans son emballage d'origine..."
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                  </div>
                </ReGoCard>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <ReGoCard
                  title="Conformité Légale Tunisienne"
                  subtitle="Mentions obligatoires sur le commerce électronique"
                  icon={ShieldCheck}
                >
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-400">
                    <p className="font-bold text-slate-900 dark:text-white">Protection du Consommateur :</p>
                    <p>La législation tunisienne prévoit un droit de rétractation légal de 10 jours pour les achats en ligne non personnalisés.</p>
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* MAIN TAB: STORE — SECTION 4: APPEARANCE & THEME */}
          {currentMainTab === 'store' && activeTab === 'appearance' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <ReGoCard
                  title="Style du Tableau de Bord Vendeur"
                  subtitle="Basculez entre le nouveau design ReGo modernist et l'ancienne interface"
                  icon={Palette}
                >
                  <div className="space-y-4 pt-2 text-xs">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Disposition de l&apos;Interface
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => onDashboardStyleChange('rego')}
                          className={`p-4 rounded-xl border text-start transition-all ${
                            dashboardStyle === 'rego'
                              ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-bold'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="text-sm font-black mb-1">ReGo Modernist (Recommandé)</div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Design système officiel standardisé en 8 couches, optimisé pour la Tunisie.</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDashboardStyleChange('classic')}
                          className={`p-4 rounded-xl border text-start transition-all ${
                            dashboardStyle === 'classic'
                              ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-bold'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="text-sm font-black mb-1">Classic Legacy</div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Ancienne mise en page par cartes classiques.</p>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Couleur d&apos;Accentuation ReGo
                      </label>
                      <div className="flex gap-2">
                        {(
                          [
                            { id: 'rouge', label: 'Rouge Panda', color: '#ad0505' },
                            { id: 'ocre', label: 'Ocre', color: '#d97706' },
                            { id: 'olive', label: 'Olive', color: '#65a30d' },
                            { id: 'bleu', label: 'Bleu', color: '#2563eb' },
                            { id: 'prune', label: 'Prune', color: '#9333ea' },
                            { id: 'charbon', label: 'Charbon', color: '#334155' },
                          ] as const
                        ).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => onAccentChange(c.id as AccentColor)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                              accent === c.id
                                ? 'border-slate-900 dark:border-white shadow-sm ring-2 ring-slate-900/20'
                                : 'border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.color }} />
                            <span>{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* MAIN TAB: SECURITY */}
          {currentMainTab === 'security' && (
            <div className="space-y-4">
              <ReGoCard
                title="Double Authentification (2FA) du Compte"
                subtitle="Protégez votre compte vendeur avec la vérification en deux étapes"
                icon={ShieldCheck}
                noPadding
              >
                <div className="p-3">
                  <AccountTwoFactorPanel compact accentClass="bg-[var(--rego-accent,#ad0505)]" />
                </div>
              </ReGoCard>

              <ReGoCard
                title="Activité Récente & Sessions"
                subtitle="Surveillez les connexions et les événements de sécurité de votre compte"
                icon={Activity}
                noPadding
              >
                <div className="p-3">
                  <AccountSecurityActivityPanel compact accentClass="bg-[var(--rego-accent,#ad0505)]" />
                </div>
              </ReGoCard>
            </div>
          )}

          {/* MAIN TAB: THEME */}
          {currentMainTab === 'theme' && (
            <div className="space-y-6">
              {/* Dashboard Workspace Style (ReGo / Bento / Classic) */}
              <ReGoCard
                title="Style de votre Espace Vendeur"
                subtitle="Sélectionnez votre style de cockpit préféré pour piloter votre catalogue, vos commandes et vos expéditions."
                icon={Sparkles}
                badge={
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                    Actuel : {dashboardStyleLabel}
                  </span>
                }
              >
                <div className="space-y-4 pt-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => onDashboardStyleChange('rego')}
                      className={`p-4 rounded-xl border-2 text-start transition-all cursor-pointer ${
                        dashboardStyle === 'rego'
                          ? 'border-[var(--rego-accent,#ad0505)] bg-rose-50/30 dark:bg-rose-950/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 dark:text-white">Cockpit ReGo</span>
                        {dashboardStyle === 'rego' && (
                          <span className="h-2 w-2 rounded-full bg-[var(--rego-accent,#ad0505)]" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Design haute performance, radar Anti-Refus COD &amp; télémétrie 4 transporteurs tunisiens.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDashboardStyleChange('bento')}
                      className={`p-4 rounded-xl border-2 text-start transition-all cursor-pointer ${
                        dashboardStyle === 'bento'
                          ? 'border-slate-900 dark:border-white bg-slate-100/60 dark:bg-slate-800 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 dark:text-white">Cockpit Bento</span>
                        {dashboardStyle === 'bento' && <span className="h-2 w-2 rounded-full bg-slate-900 dark:bg-white" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Grille modulaire bento, widgets visuels d&apos;onboarding et actions rapides condensées.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDashboardStyleChange('classic')}
                      className={`p-4 rounded-xl border-2 text-start transition-all cursor-pointer ${
                        dashboardStyle === 'classic'
                          ? 'border-slate-900 dark:border-white bg-slate-100/60 dark:bg-slate-800 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 dark:text-white">Tableau Classique</span>
                        {dashboardStyle === 'classic' && (
                          <span className="h-2 w-2 rounded-full bg-slate-900 dark:bg-white" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Disposition traditionnelle standard pour consultations linéaires sur grand écran.
                      </p>
                    </button>
                  </div>

                  {dashboardStyle === 'rego' && (
                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Teinte Régionale Tunisienne (ReGo Accent)
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 capitalize">{accent}</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { id: 'rouge', name: 'Carthage', color: '#ad0505' },
                          { id: 'ocre', name: 'Sahara', color: '#c46808' },
                          { id: 'olive', name: 'Sahel', color: '#2d6b38' },
                          { id: 'bleu', name: 'Sidi Bou', color: '#1565c0' },
                          { id: 'prune', name: 'Médina', color: '#6b2d6b' },
                          { id: 'charbon', name: 'Industriel', color: '#262626' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => onAccentChange(item.id as AccentColor)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                              accent === item.id
                                ? 'border-slate-900 dark:border-white bg-white dark:bg-slate-800 shadow-2xs font-bold'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="h-3.5 w-3.5 rounded-full shadow-2xs" style={{ backgroundColor: item.color }} />
                            <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ReGoCard>

              {/* Storefront Theme Gallery */}
              <ReGoCard
                title="Thème de la Vitrine Publique"
                subtitle={`${themeList.length} thèmes disponibles pour vos visiteurs.`}
                icon={Palette}
                actions={
                  <Link
                    href="/hub/dashboard/online-store/customize"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--rego-fg,#111111)] bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] hover:bg-[var(--rego-bg,#ffffff)] transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
                    <span>Personnaliser</span>
                  </Link>
                }
              >
                <div className="space-y-4 pt-2 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {themeList.map((themeItem) => {
                      const cfg = themes[themeItem.id];
                      const preset = cfg?.colorPresets[0];
                      const isPurchased = themeItem.apiTheme ? purchasedThemeIds.has(themeItem.apiTheme.id) : true;
                      const isLocked = !themeItem.free && !isPurchased;
                      const isSelected = selectedTheme === themeItem.id;
                      return (
                        <div
                          key={themeItem.id}
                          className={`rounded-xl border-2 overflow-hidden transition-all ${
                            isSelected
                              ? 'border-[var(--rego-accent,#ad0505)] shadow-xs bg-slate-50 dark:bg-slate-800/60'
                              : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectedThemeChange(themeItem.id)}
                            className="block w-full text-start"
                          >
                            <div
                              className="h-16 relative overflow-hidden"
                              style={{ backgroundColor: preset?.background || '#F3F4F6' }}
                            >
                              <div
                                className="absolute top-0 left-0 right-0 h-5"
                                style={{ backgroundColor: preset?.headerBg || '#FFFFFF' }}
                              />
                              <div
                                className="absolute bottom-0 left-0 right-0 h-4"
                                style={{ backgroundColor: preset?.footerBg || '#1A1A2E' }}
                              />
                              <div className="absolute top-6 left-2 flex gap-1">
                                {preset &&
                                  [preset.primary, preset.accent, preset.secondary].map((c, i) => (
                                    <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                                  ))}
                              </div>
                              {isLocked && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <Lock className="w-5 h-5 text-white drop-shadow" />
                                </div>
                              )}
                              {isSelected && (
                                <span className="absolute top-1.5 end-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--rego-accent,#ad0505)] text-white text-[9px] font-black">
                                  <Check className="w-2.5 h-2.5" />
                                  Actif
                                </span>
                              )}
                            </div>
                            <div className="p-2.5">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{themeItem.name}</h4>
                                {!themeItem.free && (
                                  <span
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full flex-shrink-0 ${
                                      isPurchased
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                    }`}
                                  >
                                    {isPurchased ? 'ACHETÉ' : 'PREMIUM'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{themeItem.desc}</p>
                            </div>
                          </button>
                          {isLocked && themeItem.apiTheme && (
                            <div className="px-2.5 pb-2.5">
                              <button
                                type="button"
                                onClick={() => onPurchaseConfirmThemeChange(themeItem.apiTheme!)}
                                className="w-full text-center px-2 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition"
                              >
                                Acheter — {themeItem.apiTheme.price} TND
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onApplyTheme}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--rego-accent,#ad0505)] hover:opacity-90 text-white text-sm font-black rounded-xl shadow-xs transition disabled:opacity-50"
                    >
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? t('dashboardPages.settings.saving') : t('dashboardPages.settings.applyTheme')}
                    </button>
                  </div>
                </div>
              </ReGoCard>

              {/* Advanced Theme Customizer */}
              <ReGoCard
                title="Personnalisation avancée"
                subtitle="Variation de mise en page, densité de grille, style de héros et couleurs personnalisées"
                icon={Sliders}
                noPadding
              >
                <div className="p-3">
                  <ThemeCustomizer
                    themeId={selectedTheme}
                    initialCustomization={themeCustomization}
                    onSave={onSaveThemeCustomization}
                  />
                </div>
              </ReGoCard>
            </div>
          )}

          {/* MAIN TAB: DOMAIN */}
          {currentMainTab === 'domain' && (
            <div className="space-y-4">
              <ReGoCard
                title="Ajouter un nouveau domaine"
                subtitle={`Connectez un nom de domaine personnel à votre boutique ${marketplaceName}.`}
                icon={Plus}
              >
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <input
                    type="text"
                    value={newDomainHostname}
                    onChange={(e) => onNewDomainHostnameChange(e.target.value)}
                    placeholder="ex: boutique.com ou www.maboutique.tn"
                    className="flex-1 px-4 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-[var(--rego-accent,#ad0505)] focus:ring-1 focus:ring-[var(--rego-accent,#ad0505)] outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={onAddDomain}
                    disabled={addingDomain || !newDomainHostname.trim()}
                    className="px-5 py-2.5 bg-[var(--rego-accent,#ad0505)] hover:opacity-90 text-white text-sm font-black rounded-xl shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {addingDomain ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {addingDomain ? t('dashboardPages.settings.addingDomain') : t('dashboardPages.settings.addDomain')}
                  </button>
                </div>
              </ReGoCard>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Vos domaines configurés</h3>
                {loadingDomains ? (
                  <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-400 dark:text-slate-500" /> Chargement des domaines...
                  </div>
                ) : domainList.length === 0 ? (
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200/80 dark:border-slate-700 rounded-2xl p-8 text-center space-y-2">
                    <Globe className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Aucun domaine personnalisé configuré</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Ajoutez votre domaine ci-dessus pour remplacer votre sous-domaine par défaut.
                    </p>
                  </div>
                ) : (
                  domainList.map((d) => (
                    <ReGoCard key={d.id} noPadding>
                      <div className="p-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                            <span className="font-bold text-base text-slate-900 dark:text-white truncate">{d.hostname}</span>
                            {d.is_primary && (
                              <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3 fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400" /> Domaine Principal
                              </span>
                            )}
                            <ReGoStatusChip
                              status={d.verification_status === 'verified' ? 'ok' : d.verification_status === 'failed' ? 'err' : 'warn'}
                              label={
                                d.verification_status === 'verified'
                                  ? 'Vérifié'
                                  : d.verification_status === 'failed'
                                    ? 'Vérification échouée'
                                    : 'En attente'
                              }
                            />
                            <ReGoStatusChip
                              status={d.ssl_status === 'active' ? 'info' : 'neutral'}
                              label={d.ssl_status === 'active' ? 'SSL Actif (HTTPS)' : 'SSL En attente'}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onVerifyDomain(d.id)}
                              disabled={verifyingDomainId === d.id}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 disabled:opacity-60"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${verifyingDomainId === d.id ? 'animate-spin' : ''}`} />
                              Vérifier DNS
                            </button>

                            {d.verification_status === 'verified' && !d.is_primary && (
                              <button
                                type="button"
                                onClick={() => onMakePrimaryDomain(d.id)}
                                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl transition"
                              >
                                Définir comme principal
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onDomainDeleteTargetChange(d.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* DNS Configuration Instructions */}
                        <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 text-xs space-y-2">
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            Instructions de configuration DNS chez votre registrar :
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-white dark:bg-slate-900 p-2.5 border border-slate-200/80 dark:border-slate-700 rounded-xl">
                              <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">
                                Enregistrement CNAME (Recommandé)
                              </span>
                              <p className="mt-1 font-mono text-[11px] text-slate-900 dark:text-white">
                                <strong>Nom/Hôte:</strong>{' '}
                                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">@</code>{' '}
                                ou{' '}
                                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">www</code>
                                <br />
                                <strong>Cible:</strong>{' '}
                                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">cname.garbage.team</code>
                              </p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-2.5 border border-slate-200/80 dark:border-slate-700 rounded-xl">
                              <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">
                                Challenge TXT (Alternative)
                              </span>
                              <p className="mt-1 font-mono text-[11px] text-slate-900 dark:text-white">
                                <strong>Nom TXT:</strong>{' '}
                                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200 break-all">
                                  _pandamarket-challenge.{d.hostname}
                                </code>
                                <br />
                                <strong>Valeur TXT:</strong> Token unique généré
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ReGoCard>
                  ))
                )}
              </div>
            </div>
          )}

          {/* MAIN TAB: SHIPPING */}
          {currentMainTab === 'shipping' && (
            <div className="space-y-4">
              <ReGoCard
                title="Mode de livraison"
                subtitle="Choisissez qui gère la logistique et le suivi de vos colis."
                icon={Truck}
              >
                <div className="space-y-3 pt-2 text-xs">
                  {[
                    {
                      id: 'self_managed',
                      name: 'Gestion vendeur',
                      desc: 'Vous gérez vous-même la livraison et le suivi client.',
                    },
                    {
                      id: 'platform_unified',
                      name: 'Plateforme unifiée',
                      desc: `Utilise les intégrations ${marketplaceName} pour les bordereaux et le suivi.`,
                    },
                  ].map((mode) => (
                    <label
                      key={mode.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
                        shippingMode === mode.id
                          ? 'border-[var(--rego-accent,#ad0505)] bg-rose-50/30 dark:bg-rose-950/20 shadow-xs'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping_mode"
                        checked={shippingMode === mode.id}
                        onChange={() => onShippingModeChange(mode.id)}
                        className="accent-[var(--rego-accent,#ad0505)]"
                      />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{mode.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{mode.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </ReGoCard>

              <ReGoCard
                title="Politiques publiques"
                subtitle="Ces textes peuvent être affichés dans les blocs dynamiques Page Builder. Ne saisissez pas de clés API ou d'informations privées."
                icon={ShieldCheck}
              >
                <div className="space-y-4 pt-2 text-xs">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Politique de livraison
                    </label>
                    <textarea
                      value={shippingPolicy}
                      onChange={(e) => onShippingPolicyChange(e.target.value)}
                      rows={4}
                      placeholder="Délais estimés, zones desservies, suivi, frais ou conditions spécifiques..."
                      className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2.5 outline-none focus:border-[var(--rego-accent,#ad0505)] focus:ring-1 focus:ring-[var(--rego-accent,#ad0505)] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Retours & échanges
                    </label>
                    <textarea
                      value={returnPolicy}
                      onChange={(e) => onReturnPolicyChange(e.target.value)}
                      rows={4}
                      placeholder="Conditions de retour, délais, produits exclus, procédure de contact..."
                      className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2.5 outline-none focus:border-[var(--rego-accent,#ad0505)] focus:ring-1 focus:ring-[var(--rego-accent,#ad0505)] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Information paiement publique
                    </label>
                    <textarea
                      value={paymentPolicy}
                      onChange={(e) => onPaymentPolicyChange(e.target.value)}
                      rows={4}
                      placeholder="Modes acceptés, paiement à la livraison, Mandat Minute ou consignes publiques..."
                      className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2.5 outline-none focus:border-[var(--rego-accent,#ad0505)] focus:ring-1 focus:ring-[var(--rego-accent,#ad0505)] transition"
                    />
                  </div>
                </div>
              </ReGoCard>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onSaveShipping}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--rego-accent,#ad0505)] hover:opacity-90 text-white text-sm font-black rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? t('dashboardPages.settings.saving') : t('dashboardPages.settings.save')}
                </button>
              </div>
            </div>
          )}

          {/* MAIN TAB: ANALYTICS & PIXELS */}
          {currentMainTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Google Analytics 4 */}
                <ReGoCard
                  title="Google Analytics 4 (GA4)"
                  subtitle="Suivi des pages vues, du panier et des commandes"
                  icon={BarChart3}
                  badge={
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold rounded-full">
                      Mesure
                    </span>
                  }
                >
                  <div className="space-y-3 pt-2 text-xs">
                    <p className="text-slate-500 dark:text-slate-400">
                      Identifiant de mesure commençant par{' '}
                      <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">G-</code>{' '}
                      pour suivre les pages vues, le panier et les commandes.
                    </p>
                    <input
                      type="text"
                      value={ga4MeasurementId}
                      onChange={(e) => onGa4MeasurementIdChange(e.target.value)}
                      placeholder="G-XXXXXXXXXX"
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono focus:border-[var(--rego-accent,#ad0505)] focus:ring-1 focus:ring-[var(--rego-accent,#ad0505)] bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition"
                    />
                  </div>
                </ReGoCard>

                {/* Meta Pixel */}
                <ReGoCard
                  title="Meta Pixel (Facebook / IG)"
                  subtitle="Suivi des événements AddToCart et Purchase"
                  icon={Activity}
                  badge={
                    <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold rounded-full">
                      Ads &amp; Retargeting
                    </span>
                  }
                >
                  <div className="space-y-3 pt-2 text-xs">
                    <p className="text-slate-500 dark:text-slate-400">
                      Identifiant numérique Meta Pixel (15-16 chiffres) pour suivre les événements{' '}
                      <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">AddToCart</code>{' '}
                      et{' '}
                      <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">Purchase</code>.
                    </p>
                    <input
                      type="text"
                      value={metaPixelId}
                      onChange={(e) => onMetaPixelIdChange(e.target.value)}
                      placeholder="123456789012345"
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono focus:border-[var(--rego-accent,#ad0505)] focus:ring-1 focus:ring-[var(--rego-accent,#ad0505)] bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition"
                    />
                  </div>
                </ReGoCard>

                {/* Google Tag Manager */}
                <ReGoCard
                  title="Google Tag Manager (GTM)"
                  subtitle="Gestion de vos balises personnalisées"
                  icon={Sliders}
                  badge={
                    <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold rounded-full">
                      Conteneur
                    </span>
                  }
                >
                  <div className="space-y-3 pt-2 text-xs">
                    <p className="text-slate-500 dark:text-slate-400">
                      Identifiant conteneur commençant par{' '}
                      <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">GTM-</code>{' '}
                      pour gérer vos balises personnalisées.
                    </p>
                    <input
                      type="text"
                      value={gtmContainerId}
                      onChange={(e) => onGtmContainerIdChange(e.target.value)}
                      placeholder="GTM-XXXXXXX"
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono focus:border-[var(--rego-accent,#ad0505)] focus:ring-1 focus:ring-[var(--rego-accent,#ad0505)] bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition"
                    />
                  </div>
                </ReGoCard>

                {/* TikTok Pixel */}
                <ReGoCard
                  title="TikTok Pixel"
                  subtitle="Mesure du rendement de vos campagnes TikTok"
                  icon={Sparkles}
                  badge={
                    <span className="text-xs px-2 py-0.5 bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 font-semibold rounded-full">
                      TikTok Ads
                    </span>
                  }
                >
                  <div className="space-y-3 pt-2 text-xs">
                    <p className="text-slate-500 dark:text-slate-400">
                      Identifiant TikTok Pixel pour mesurer le rendement de vos campagnes TikTok et le trafic vers votre
                      boutique.
                    </p>
                    <input
                      type="text"
                      value={tiktokPixelId}
                      onChange={(e) => onTiktokPixelIdChange(e.target.value)}
                      placeholder="CXXXXXXXXXXXXXX"
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono focus:border-[var(--rego-accent,#ad0505)] focus:ring-1 focus:ring-[var(--rego-accent,#ad0505)] bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition"
                    />
                  </div>
                </ReGoCard>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--rego-accent,#ad0505)] hover:opacity-90 text-white text-sm font-black rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? t('dashboardPages.settings.saving') : 'Sauvegarder les pixels & analytics'}
                </button>
              </div>
            </div>
          )}

          {/* MAIN TAB: EMAILS */}
          {currentMainTab === 'emails' && (
            <EmailTemplateManager
              scope="storefront"
              title="Emails de la boutique"
              description="Personnalisez les emails envoyés à vos clients storefront, comme l'inscription acheteur, la commande placée et le paiement confirmé."
            />
          )}
        </div>
      }
      modals={
        <>
          {/* Purchase premium theme confirmation */}
          <ReGoModal
            isOpen={Boolean(purchaseConfirmTheme)}
            onClose={() => {
              if (!purchasing) onPurchaseConfirmThemeChange(null);
            }}
            title="Acheter le thème premium"
            subtitle="Débloquez ce thème premium pour votre vitrine publique"
            actions={
              <>
                <button
                  type="button"
                  onClick={() => onPurchaseConfirmThemeChange(null)}
                  disabled={purchasing}
                  className="px-4 py-2 rounded-xl border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-semibold text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (purchaseConfirmTheme) onPurchaseTheme(purchaseConfirmTheme);
                  }}
                  disabled={purchasing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs transition disabled:opacity-50"
                >
                  {purchasing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {purchasing ? t('dashboardPages.settings.purchasing') : t('dashboardPages.settings.confirmPurchase')}
                </button>
              </>
            }
          >
            {purchaseConfirmTheme && (
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p>
                  Vous êtes sur le point d&apos;acheter le thème{' '}
                  <strong className="text-slate-900 dark:text-white">{purchaseConfirmTheme.name}</strong>.
                </p>
                {purchaseConfirmTheme.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{purchaseConfirmTheme.description}</p>
                )}
                <div className="flex justify-between rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 p-3 font-semibold text-amber-900 dark:text-amber-200">
                  <span>Prix :</span>
                  <span>{purchaseConfirmTheme.price} TND</span>
                </div>
              </div>
            )}
          </ReGoModal>

          {/* Delete domain confirmation */}
          <ConfirmDialog
            isOpen={Boolean(domainDeleteTargetId)}
            onClose={() => {
              if (!deletingDomain) onDomainDeleteTargetChange(null);
            }}
            onConfirm={onConfirmDomainDelete}
            title={t('dashboardPages.settings.deleteDomainTitle') || 'Supprimer le domaine'}
            description={
              <div className="space-y-2">
                <p>{t('dashboardPages.settings.confirmDeleteDomain') || 'Êtes-vous sûr de vouloir supprimer ce domaine ?'}</p>
                {(() => {
                  const targetDomain = domainList.find((d) => d.id === domainDeleteTargetId);
                  return targetDomain ? (
                    <p className="font-semibold text-slate-900 dark:text-white font-mono text-sm">{targetDomain.hostname}</p>
                  ) : null;
                })()}
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  Le trafic vers ce domaine personnalisé ne sera plus dirigé vers votre boutique.
                </p>
              </div>
            }
            confirmLabel={t('dashboardPages.common.delete') || 'Supprimer'}
            cancelLabel={t('dashboardPages.common.cancel') || 'Annuler'}
            variant="danger"
            loading={deletingDomain}
            dir={dir}
          />
        </>
      }
    />
  );
}
