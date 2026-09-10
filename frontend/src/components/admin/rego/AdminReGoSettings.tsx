'use client';

import React, { useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Globe2,
  SlidersHorizontal,
  CreditCard,
  Truck,
  ShieldCheck,
  Shield,
  BarChart3,
  Sparkles,
  LayoutGrid,
  AlertTriangle,
  CheckCircle2,
  Eye,
  ExternalLink,
  Zap,
  Lock,
} from 'lucide-react';
import { DashboardPageWrapper } from '@/components/dashboard/DashboardPageWrapper';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface PlatformSettings {
  marketplace_name: string;
  marketplace_tagline: string;
  marketplace_logo_url: string;
  marketplace_logo_light_url: string;
  marketplace_logo_dark_url: string;
  marketplace_favicon_url: string;
  marketplace_og_image_url: string;
  marketplace_public_url: string;
  marketplace_theme: 'panda' | 'aliexpress' | 'aliexpress2';
  marketplace_primary_color: string;
  marketplace_secondary_color: string;
  marketplace_default_locale: 'fr' | 'en' | 'ar';
  marketplace_support_email: string;
  marketplace_support_phone: string;
  marketplace_support_whatsapp: string;
  marketplace_address: string;
  marketplace_city: string;
  marketplace_country: string;
  marketplace_business_hours: string;
  marketplace_facebook_url: string;
  marketplace_instagram_url: string;
  marketplace_x_url: string;
  marketplace_tiktok_url: string;
  marketplace_youtube_url: string;
  marketplace_linkedin_url: string;
  marketplace_enabled: boolean;
  vendor_registration_enabled: boolean;
  buyer_registration_enabled: boolean;
  product_moderation_required: boolean;
  reviews_enabled: boolean;
  wishlist_enabled: boolean;
  ai_tools_enabled: boolean;
  page_builder_enabled: boolean;
  platform_commission_rate: number;
  min_withdrawal_tnd: number;
  default_tax_rate: number;
  tax_mode: 'included' | 'exclusive' | 'none';
  payout_schedule: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'manual';
  payment_flouci_enabled: boolean;
  payment_konnect_enabled: boolean;
  payment_paypal_enabled: boolean;
  payment_mandat_enabled: boolean;
  payment_cod_enabled: boolean;
  maintenance_enabled: boolean;
  maintenance_title: string;
  maintenance_message: string;
  hub_homepage_layout: string;
  hub_homepage_pagination_style: string;
  hub_megamenu_style: string;
  hub_category_page_style: string;
  hub_card_show_rating: boolean;
  hub_card_show_add_to_cart: boolean;
  hub_card_show_store_name: boolean;
  hub_card_show_store_verified: boolean;
  hub_grid_columns: number;
  analytics_ga4_measurement_id: string;
  analytics_gtm_container_id: string;
  analytics_meta_pixel_id: string;
  watermark_enabled: boolean;
  [key: string]: any;
}

export type SettingsTabId =
  | 'brand'
  | 'homepage'
  | 'commerce'
  | 'finance'
  | 'security'
  | 'analytics';

export interface AdminReGoSettingsProps {
  settings: any;
  updateSetting: (key: any, value: any) => void;
  loading: boolean;
  saving: boolean;
  saved: boolean;
  error: string;
  onSave: () => Promise<void>;
  onReset: () => void;
  isDirty: boolean;
  onOpenPreviewLab: () => void;
  showMaintenanceConfirm: boolean;
  setShowMaintenanceConfirm: (v: boolean) => void;
}

export function AdminReGoSettings({
  settings,
  updateSetting,
  loading,
  saving,
  saved,
  error,
  onSave,
  onReset,
  isDirty,
  onOpenPreviewLab,
  showMaintenanceConfirm,
  setShowMaintenanceConfirm,
}: AdminReGoSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('brand');
  const [seoPreviewOpen, setSeoPreviewOpen] = useState(false);

  const tabs: Array<{ id: SettingsTabId; label: string; icon: any }> = [
    { id: 'brand', label: 'Identité & Marque', icon: Globe2 },
    { id: 'homepage', label: 'Accueil & Mégamenu', icon: LayoutGrid },
    { id: 'commerce', label: 'Commerce & Fiches', icon: SlidersHorizontal },
    { id: 'finance', label: 'Finances & Payouts', icon: CreditCard },
    { id: 'security', label: 'Sécurité & Maintenance', icon: ShieldCheck },
    { id: 'analytics', label: 'Télémétrie & GA4', icon: BarChart3 },
  ];

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Administration', href: '/dashboard' },
        { label: 'Gouvernance', href: '/settings' },
        { label: 'Configuration Générale' },
      ]}
      headerTitle="Paramètres Globaux de la Marketplace"
      headerSubtitle="Configurez l'identité légale de PandaMarket, les visuels de marque, les bannières d'accueil, le mégamenu, les réseaux sociaux et les intégrations globales."
      headerIcon={Settings}
      statusBadge={
        <div className="flex items-center gap-2">
          <span
            className={`flex h-2 w-2 rounded-full ${
              settings.maintenance_enabled ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
            }`}
          />
          <span className="text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
            {settings.maintenance_enabled ? 'Mode Maintenance Actif' : 'Marketplace Ouverte'}
          </span>
        </div>
      }
      secondaryAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSeoPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Aperçu SERP Google</span>
          </button>
          {isDirty && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Annuler Brouillon</span>
            </button>
          )}
        </div>
      }
      primaryAction={
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving || loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]"
        >
          <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
          <span>{saving ? 'Enregistrement...' : 'Enregistrer les Paramètres'}</span>
        </button>
      }
      alertBanner={
        settings.maintenance_enabled ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>
                Attention : Le mode maintenance est actuellement activé. L&apos;accès public à la place de marché et aux vitrines marchandes est suspendu.
              </span>
            </div>
            <button
              onClick={() => updateSetting('maintenance_enabled', false)}
              className="px-2.5 py-1 text-[11px] font-bold rounded bg-rose-600 text-white hover:bg-rose-700"
            >
              Désactiver la maintenance
            </button>
          </div>
        ) : isDirty ? (
          <div className="flex items-center gap-2 p-3 rounded-[var(--rego-r,8px)] border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Modifications non enregistrées en cours. Pensez à valider pour appliquer à la marketplace.</span>
          </div>
        ) : saved ? (
          <div className="flex items-center gap-2 p-3 rounded-[var(--rego-r,8px)] border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Paramètres de la plateforme enregistrés avec succès !</span>
          </div>
        ) : null
      }
      kpiStrip={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <ReGoKpiHero
            label="État de la Marketplace"
            value={settings.marketplace_enabled ? 'En Ligne' : 'Paillette'}
            hint={settings.marketplace_enabled ? 'Transactions ouvertes' : 'Ventes suspendues'}
            icon={Globe2}
            accent={settings.marketplace_enabled}
          />
          <ReGoKpiHero
            label="Commission Plateforme"
            value={`${settings.platform_commission_rate}%`}
            hint="Prélevée sur commandes"
            icon={CreditCard}
          />
          <ReGoKpiHero
            label="Seuil Minimum de Retrait"
            value={<ReGoAmtBox amount={settings.min_withdrawal_tnd || 50} size="md" />}
            hint="Pour virement vendeur"
            icon={Zap}
          />
          <ReGoKpiHero
            label="Thème Actif"
            value={settings.marketplace_theme.toUpperCase()}
            hint={settings.marketplace_default_locale.toUpperCase()}
            icon={SlidersHorizontal}
          />
          <ReGoKpiHero
            label="Sécurité & Maintenance"
            value={settings.maintenance_enabled ? 'Hors-Ligne' : 'Protégé'}
            hint="2FA & Pare-feu actifs"
            icon={ShieldCheck}
          />
        </div>
      }
      filterToolbar={
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 border-b border-[var(--rego-border,#dedede)]/70 pb-3">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                  isActive
                    ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-2xs'
                    : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      }
      mainContent={
        <div className="space-y-4">
          {/* TAB 1: IDENTITÉ & MARQUE */}
          {activeTab === 'brand' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReGoCard
                title="Identité Commerciale & Contact"
                subtitle="Informations générales et coordonnées du service client"
                icon={Globe2}
              >
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Nom Commercial de la Marketplace
                    </label>
                    <input
                      type="text"
                      value={settings.marketplace_name}
                      onChange={(e) => updateSetting('marketplace_name', e.target.value)}
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Slogan & Tagline Promotionnelle
                    </label>
                    <input
                      type="text"
                      value={settings.marketplace_tagline}
                      onChange={(e) => updateSetting('marketplace_tagline', e.target.value)}
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                        Langue par Défaut
                      </label>
                      <select
                        value={settings.marketplace_default_locale}
                        onChange={(e) => updateSetting('marketplace_default_locale', e.target.value as any)}
                        className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                      >
                        <option value="fr">Français (TN)</option>
                        <option value="ar">العربية (TN)</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                        URL Publique Officielle
                      </label>
                      <input
                        type="text"
                        value={settings.marketplace_public_url}
                        onChange={(e) => updateSetting('marketplace_public_url', e.target.value)}
                        className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Email du Support Client
                    </label>
                    <input
                      type="email"
                      value={settings.marketplace_support_email}
                      onChange={(e) => updateSetting('marketplace_support_email', e.target.value)}
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                        Téléphone Support
                      </label>
                      <input
                        type="text"
                        value={settings.marketplace_support_phone}
                        onChange={(e) => updateSetting('marketplace_support_phone', e.target.value)}
                        className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                        WhatsApp Officiel
                      </label>
                      <input
                        type="text"
                        value={settings.marketplace_support_whatsapp}
                        onChange={(e) => updateSetting('marketplace_support_whatsapp', e.target.value)}
                        className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                      />
                    </div>
                  </div>
                </div>
              </ReGoCard>

              <ReGoCard
                title="Réseaux Sociaux & Liens Officiels"
                subtitle="Liens vers les profils officiels de PandaMarket"
                icon={Globe2}
              >
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Facebook URL</label>
                    <input
                      type="text"
                      value={settings.marketplace_facebook_url}
                      onChange={(e) => updateSetting('marketplace_facebook_url', e.target.value)}
                      placeholder="https://facebook.com/pandamarket"
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Instagram URL</label>
                    <input
                      type="text"
                      value={settings.marketplace_instagram_url}
                      onChange={(e) => updateSetting('marketplace_instagram_url', e.target.value)}
                      placeholder="https://instagram.com/pandamarket.tn"
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">TikTok URL</label>
                    <input
                      type="text"
                      value={settings.marketplace_tiktok_url}
                      onChange={(e) => updateSetting('marketplace_tiktok_url', e.target.value)}
                      placeholder="https://tiktok.com/@pandamarket"
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">LinkedIn URL</label>
                    <input
                      type="text"
                      value={settings.marketplace_linkedin_url}
                      onChange={(e) => updateSetting('marketplace_linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/company/pandamarket"
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                    />
                  </div>
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB 2: ACCUEIL & MÉGAMENU */}
          {activeTab === 'homepage' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReGoCard
                title="Disposition de la Page d'Accueil"
                subtitle="Choix du gabarit d'affichage et pagination"
                icon={LayoutGrid}
              >
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Disposition du Hub
                    </label>
                    <select
                      value={settings.hub_homepage_layout}
                      onChange={(e) => updateSetting('hub_homepage_layout', e.target.value)}
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                    >
                      <option value="theme_default">Défaut du thème</option>
                      <option value="classic">Classique E-commerce</option>
                      <option value="deals">Deals & Promotions</option>
                      <option value="premium_deals">Grille Premium</option>
                      <option value="alibaba">Style Alibaba</option>
                      <option value="amazon">Style Amazon</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Mode de Pagination des Produits
                    </label>
                    <select
                      value={settings.hub_homepage_pagination_style}
                      onChange={(e) => updateSetting('hub_homepage_pagination_style', e.target.value)}
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                    >
                      <option value="infinite">Défilement Infini (Infinite Scroll)</option>
                      <option value="load_more">Bouton Charger Plus</option>
                      <option value="pagination">Pagination Numérotée</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Style du Mégamenu En-Tête
                    </label>
                    <select
                      value={settings.hub_megamenu_style}
                      onChange={(e) => updateSetting('hub_megamenu_style', e.target.value)}
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                    >
                      <option value="standard">Standard Compact</option>
                      <option value="visual_rich">Visuel Riche avec Icônes</option>
                      <option value="ultra_rich">Ultra-Riche avec Bannières</option>
                      <option value="ultra_rich_deep">Ultra-Riche Multi-Niveaux</option>
                    </select>
                  </div>
                </div>
              </ReGoCard>

              <ReGoCard
                title="Grilles Produits & Affichage"
                subtitle="Options des vignettes et colonnes desktop"
                icon={SlidersHorizontal}
              >
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Nombre de Colonnes de la Grille (Desktop)
                    </label>
                    <select
                      value={settings.hub_grid_columns || 4}
                      onChange={(e) => updateSetting('hub_grid_columns', parseInt(e.target.value))}
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                    >
                      <option value={3}>3 Colonnes</option>
                      <option value={4}>4 Colonnes (Recommandé)</option>
                      <option value={5}>5 Colonnes (Dense)</option>
                    </select>
                  </div>
                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.hub_card_show_rating}
                        onChange={(e) => updateSetting('hub_card_show_rating', e.target.checked)}
                        className="rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)]"
                      />
                      <span className="font-semibold text-[var(--rego-fg,#111111)]">
                        Afficher les étoiles de notation sur les vignettes
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.hub_card_show_add_to_cart}
                        onChange={(e) => updateSetting('hub_card_show_add_to_cart', e.target.checked)}
                        className="rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)]"
                      />
                      <span className="font-semibold text-[var(--rego-fg,#111111)]">
                        Afficher le bouton d&apos;ajout rapide au panier
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.hub_card_show_store_name}
                        onChange={(e) => updateSetting('hub_card_show_store_name', e.target.checked)}
                        className="rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)]"
                      />
                      <span className="font-semibold text-[var(--rego-fg,#111111)]">
                        Afficher le nom de la boutique vendeuse
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.hub_card_show_store_verified}
                        onChange={(e) => updateSetting('hub_card_show_store_verified', e.target.checked)}
                        className="rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)]"
                      />
                      <span className="font-semibold text-[var(--rego-fg,#111111)]">
                        Afficher le badge de boutique vérifiée
                      </span>
                    </label>
                  </div>
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB 3: FINANCES & COMMISSIONS */}
          {activeTab === 'finance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReGoCard
                title="Commissions & Virements Vendeurs"
                subtitle="Politique financière et calendrier des règlements"
                icon={CreditCard}
              >
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Taux de Commission Plateforme par Défaut (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      value={settings.platform_commission_rate}
                      onChange={(e) => updateSetting('platform_commission_rate', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Seuil Minimum de Retrait Portefeuille (TND)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="10"
                      value={settings.min_withdrawal_tnd}
                      onChange={(e) => updateSetting('min_withdrawal_tnd', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Fréquence des Virements Programmés
                    </label>
                    <select
                      value={settings.payout_schedule}
                      onChange={(e) => updateSetting('payout_schedule', e.target.value as any)}
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                    >
                      <option value="weekly">Hebdomadaire (Chaque Lundi)</option>
                      <option value="biweekly">Bimensuel (Le 1er et le 15)</option>
                      <option value="monthly">Mensuel</option>
                      <option value="manual">À la demande (Manuel)</option>
                    </select>
                  </div>
                </div>
              </ReGoCard>

              <ReGoCard
                title="Passerelles de Paiement Marketplace"
                subtitle="Activation des canaux de règlement disponibles aux acheteurs"
                icon={Zap}
              >
                <div className="space-y-3 text-xs">
                  <label className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] cursor-pointer">
                    <span className="font-bold text-[var(--rego-fg,#111111)]">
                      Paiement Mobile Flouci (QR Code & Portefeuille)
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.payment_flouci_enabled}
                      onChange={(e) => updateSetting('payment_flouci_enabled', e.target.checked)}
                      className="rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)]"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] cursor-pointer">
                    <span className="font-bold text-[var(--rego-fg,#111111)]">
                      Konnect Tunisie (Carte Bancaire & e-Dinar)
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.payment_konnect_enabled}
                      onChange={(e) => updateSetting('payment_konnect_enabled', e.target.checked)}
                      className="rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)]"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] cursor-pointer">
                    <span className="font-bold text-[var(--rego-fg,#111111)]">
                      Mandat Minute / Virement Postal (La Poste)
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.payment_mandat_enabled}
                      onChange={(e) => updateSetting('payment_mandat_enabled', e.target.checked)}
                      className="rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)]"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] cursor-pointer">
                    <span className="font-bold text-[var(--rego-fg,#111111)]">
                      Paiement à la Livraison (Cash on Delivery)
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.payment_cod_enabled}
                      onChange={(e) => updateSetting('payment_cod_enabled', e.target.checked)}
                      className="rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)]"
                    />
                  </label>
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB 4: SÉCURITÉ & MAINTENANCE */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReGoCard
                title="Mode Maintenance de la Plateforme"
                subtitle="Suspension temporaire de l'accès public pour travaux"
                icon={AlertTriangle}
              >
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 dark:bg-rose-950/40/50 dark:bg-rose-950/20 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-rose-900 dark:text-rose-300">Activer le Mode Maintenance</p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300">Bloque l&apos;accès aux clients et vendeurs</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMaintenanceConfirm(true)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] ${
                        settings.maintenance_enabled
                          ? 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                      }`}
                    >
                      {settings.maintenance_enabled ? 'En Maintenance' : 'Hors Maintenance'}
                    </button>
                  </div>
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Titre de l&apos;Écran de Maintenance
                    </label>
                    <input
                      type="text"
                      value={settings.maintenance_title}
                      onChange={(e) => updateSetting('maintenance_title', e.target.value)}
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Message Explicatif
                    </label>
                    <textarea
                      rows={3}
                      value={settings.maintenance_message}
                      onChange={(e) => updateSetting('maintenance_message', e.target.value)}
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
                    />
                  </div>
                </div>
              </ReGoCard>

              <ReGoCard
                title="Protection par Filigrane (Watermark)"
                subtitle="Protection automatique des photographies produits"
                icon={Lock}
              >
                <div className="space-y-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.watermark_enabled}
                      onChange={(e) => updateSetting('watermark_enabled', e.target.checked)}
                      className="rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)]"
                    />
                    <span className="font-bold text-[var(--rego-fg,#111111)]">
                      Appliquer un filigrane sur les images du catalogue
                    </span>
                  </label>
                  <div>
                    <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                      Texte du Filigrane
                    </label>
                    <input
                      type="text"
                      value={settings.watermark_text || 'PandaMarket'}
                      onChange={(e) => updateSetting('watermark_text', e.target.value)}
                      className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                    />
                  </div>
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB 5: ANALYTICS & GTM */}
          {activeTab === 'analytics' && (
            <ReGoCard
              title="Télémétrie & Outils Webmaster"
              subtitle="Balises de suivi pour Google Analytics 4, GTM et Meta Pixel"
              icon={BarChart3}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                    Google Analytics 4 Measurement ID
                  </label>
                  <input
                    type="text"
                    value={settings.analytics_ga4_measurement_id}
                    onChange={(e) => updateSetting('analytics_ga4_measurement_id', e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                    Google Tag Manager Container ID
                  </label>
                  <input
                    type="text"
                    value={settings.analytics_gtm_container_id}
                    onChange={(e) => updateSetting('analytics_gtm_container_id', e.target.value)}
                    placeholder="GTM-XXXXXXX"
                    className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                    Meta Pixel ID (Facebook / Instagram)
                  </label>
                  <input
                    type="text"
                    value={settings.analytics_meta_pixel_id}
                    onChange={(e) => updateSetting('analytics_meta_pixel_id', e.target.value)}
                    placeholder="123456789012345"
                    className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-[11px]"
                  />
                </div>
              </div>
            </ReGoCard>
          )}
        </div>
      }
      drawer={
        <ReGoDrawer
          isOpen={seoPreviewOpen}
          onClose={() => setSeoPreviewOpen(false)}
          title="Prévisualisation SERP Google (SEO)"
          subtitle="Rendu simulé de la page d'accueil dans les résultats de recherche"
          width="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="truncate">{settings.marketplace_public_url || 'https://pandamarket.tn'}</span>
              </div>
              <h4 className="text-base text-blue-800 hover:underline cursor-pointer font-medium">
                {settings.marketplace_name} — {settings.marketplace_tagline}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Découvrez PandaMarket, la première place de marché moderne en Tunisie. Vendez et achetez en toute sécurité avec livraison partout en Tunisie.
              </p>
            </div>
          </div>
        </ReGoDrawer>
      }
      modals={
        <ReGoModal
          isOpen={showMaintenanceConfirm}
          onClose={() => setShowMaintenanceConfirm(false)}
          title="Activer le Mode Maintenance ?"
          subtitle="Attention : Cette action va immédiatement restreindre l'accès à la marketplace."
          maxWidth="max-w-md"
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMaintenanceConfirm(false)}
                className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  updateSetting('maintenance_enabled', true);
                  setShowMaintenanceConfirm(false);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-rose-600 text-white hover:bg-rose-700"
              >
                Confirmer la Mise Hors-Ligne
              </button>
            </div>
          }
        >
          <p className="text-xs text-[var(--rego-ink-2,#737373)] leading-relaxed">
            Seuls les comptes administrateurs pourront naviguer sur la plateforme. Tous les acheteurs et vendeurs verront l&apos;écran d&apos;attente de maintenance.
          </p>
        </ReGoModal>
      }
    />
  );
}
