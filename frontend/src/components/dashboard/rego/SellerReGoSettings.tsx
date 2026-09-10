'use client';

import React, { useState } from 'react';
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
  Phone,
  Mail,
  Globe,
  Truck,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';
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
  tabs?: { id: string; label: string; icon: any }[];
  activeMainTab?: string;
  onMainTabChange?: (tab: string) => void;
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
  dir: _dir = 'ltr',
  tabs,
  activeMainTab,
  onMainTabChange,
}: SellerReGoSettingsProps) {
  const { t: _t } = useLocale();
  const [activeTab, setActiveTab] = useState<'identity' | 'contact' | 'policies' | 'appearance'>('identity');

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Paramètres', href: '/hub/dashboard/settings' },
        { label: 'Profil Boutique', href: '/hub/dashboard/settings' },
      ]}
      headerTitle="Paramètres Généraux de la Boutique"
      headerSubtitle="Mettez à jour les informations légales, les visuels de marque et les coordonnées de contact de votre boutique."
      headerIcon={Settings}
      statusBadge={
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Boutique En Ligne Active</span>
        </div>
      }
      primaryAction={
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md hover:shadow-indigo-500/20"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saving ? 'Enregistrement...' : 'Enregistrer les Modifications'}</span>
        </button>
      }
      secondaryAction={
        subdomain ? (
          <a
            href={`https://${subdomain}.pandamarket.tn`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
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
      kpiStrip={
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
            value={<span className="text-sm font-bold capitalize">ReGo Modern</span>}
            hint="Interface vendeur"
            icon={Palette}
          />
        </div>
      }
      filterToolbar={
        <div className="space-y-3 w-full">
          {tabs && tabs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800">
              {tabs.map((t) => {
                const Icon = t.icon;
                const isSelected = (activeMainTab || 'store') === t.id;
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
        </div>
      }
      mainContent={
        <div className="space-y-6">
          {/* TAB 1: IDENTITY */}
          {activeTab === 'identity' && (
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

          {/* TAB 2: CONTACT & LOCATION */}
          {activeTab === 'contact' && (
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

          {/* TAB 3: POLICIES & HOURS */}
          {activeTab === 'policies' && (
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

          {/* TAB 4: APPEARANCE & THEME */}
          {activeTab === 'appearance' && (
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
        </div>
      }
    />
  );
}
