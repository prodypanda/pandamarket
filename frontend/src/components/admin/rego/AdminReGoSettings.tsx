'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  Mail,
  Crown,
  Palette,
  Package,
  Gift,
  Bell,
  MessageSquare,
  Server,
  Copy,
  UploadCloud,
  Image as ImageIcon,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Construction,
  Wallet,
  Headphones,
  Search,
} from 'lucide-react';
import { DashboardPageWrapper } from '@/components/dashboard/DashboardPageWrapper';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoDrawer,
  ReGoModal,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { MarketplaceAssetPicker } from '@/components/admin/MarketplaceAssetPicker';
import { HomepageBlocksEditor } from '@/components/admin/HomepageBlocksEditor';
import { HeroCarouselEditor } from '@/components/admin/HeroCarouselEditor';
import { WatermarkOverlay } from '@/components/watermark/MarketplaceWatermark';
import { AccountTwoFactorPanel } from '@/components/AccountTwoFactorPanel';
import AdminPlansPage from '@/app/(admin)/plans/page';
import { getResizedImageUrl } from '@/lib/image-url';

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
  marketplace_whatsapp_url: string;
  marketplace_telegram_url: string;
  marketplace_pinterest_url: string;
  marketplace_snapchat_url: string;
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
  | 'product'
  | 'algorithm'
  | 'commerce'
  | 'finance'
  | 'shipping'
  | 'security'
  | 'operations'
  | 'integrations'
  | 'email'
  | 'plans';

/** Classic persistence sections owned by the settings page (SETTINGS_TAB_KEYS). */
export type PlatformSettingsSectionId =
  | 'marketplace'
  | 'core_pages'
  | 'algorithm'
  | 'commerce'
  | 'finance'
  | 'shipping'
  | 'security'
  | 'operations'
  | 'integrations';

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
  /** Reports the classic persistence section matching the active ReGo tab so save/reset/dirty stay accurate. */
  onActiveSectionChange?: (section: PlatformSettingsSectionId) => void;
  /** Opens the full SMTP / email template editor (classic admin branch). */
  onOpenEmailSettings?: () => void;
}

/* ────────────────────────────────────────────────────────────────────────────
   ReGo-styled field primitives (module scope, controlled by settings props)
   ──────────────────────────────────────────────────────────────────────────── */

const REGO_INPUT_CLS =
  'w-full p-2 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)] transition-colors';
const REGO_INPUT_MONO_CLS = `${REGO_INPUT_CLS} font-mono`;

interface FieldShellProps {
  label: string;
  hint?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function FieldShell({ label, hint, badge, children }: FieldShellProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="font-bold text-[var(--rego-fg,#111111)] block">{label}</label>
        {badge}
      </div>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[var(--rego-ink-2,#737373)] leading-relaxed">{hint}</p>}
    </div>
  );
}

interface TextInputProps {
  settings: any;
  updateSetting: (key: any, value: any) => void;
  k: string;
  label: string;
  placeholder?: string;
  hint?: React.ReactNode;
  mono?: boolean;
  type?: string;
}

function TextInput({ settings, updateSetting, k, label, placeholder, hint, mono, type = 'text' }: TextInputProps) {
  return (
    <FieldShell label={label} hint={hint}>
      <input
        type={type}
        value={settings[k] ?? ''}
        placeholder={placeholder}
        onChange={(e) => updateSetting(k, e.target.value)}
        className={mono ? REGO_INPUT_MONO_CLS : REGO_INPUT_CLS}
      />
    </FieldShell>
  );
}

interface NumberInputProps {
  settings: any;
  updateSetting: (key: any, value: any) => void;
  k: string;
  label: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: React.ReactNode;
  parse?: (raw: string) => number;
}

function NumberInput({ settings, updateSetting, k, label, suffix, min, max, step, hint, parse }: NumberInputProps) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      badge={suffix ? (
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">{suffix}</span>
      ) : undefined}
    >
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={settings[k] ?? 0}
        onChange={(e) => updateSetting(k, parse ? parse(e.target.value) : Number(e.target.value))}
        className={`${REGO_INPUT_CLS} font-mono`}
      />
    </FieldShell>
  );
}

interface SelectInputProps {
  settings: any;
  updateSetting: (key: any, value: any) => void;
  k: string;
  label: string;
  options: Array<{ value: string | number; label: string }>;
  hint?: React.ReactNode;
  fallback?: any;
}

function SelectInput({ settings, updateSetting, k, label, options, hint, fallback }: SelectInputProps) {
  return (
    <FieldShell label={label} hint={hint}>
      <select
        value={fallback !== undefined ? (settings[k] ?? fallback) : settings[k]}
        onChange={(e) => {
          const opt = options.find((o) => String(o.value) === e.target.value);
          updateSetting(k, opt && typeof opt.value === 'number' ? opt.value : e.target.value);
        }}
        className={REGO_INPUT_CLS}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

interface TextAreaInputProps {
  settings: any;
  updateSetting: (key: any, value: any) => void;
  k: string;
  label: string;
  placeholder?: string;
  rows?: number;
  hint?: React.ReactNode;
  mono?: boolean;
}

function TextAreaInput({ settings, updateSetting, k, label, placeholder, rows = 3, hint, mono }: TextAreaInputProps) {
  return (
    <FieldShell label={label} hint={hint}>
      <textarea
        rows={rows}
        value={settings[k] ?? ''}
        placeholder={placeholder}
        onChange={(e) => updateSetting(k, e.target.value)}
        className={mono ? `${REGO_INPUT_MONO_CLS} resize-none` : `${REGO_INPUT_CLS} resize-none`}
      />
    </FieldShell>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 p-2.5 text-left rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] hover:border-[var(--rego-accent,#ad0505)]/40 transition-colors"
    >
      <span className="min-w-0">
        <span className="block text-xs font-bold text-[var(--rego-fg,#111111)]">{label}</span>
        {description && (
          <span className="block text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5 leading-relaxed">{description}</span>
        )}
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[var(--rego-accent,#ad0505)]' : 'bg-[var(--rego-surface,#e5e5e5)]'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white dark:bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

function ColorInput({
  settings,
  updateSetting,
  k,
  label,
}: {
  settings: any;
  updateSetting: (key: any, value: any) => void;
  k: string;
  label: string;
}) {
  return (
    <FieldShell label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={settings[k] || '#000000'}
          onChange={(e) => updateSetting(k, e.target.value)}
          className="h-8 w-12 shrink-0 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]"
        />
        <input
          type="text"
          value={settings[k] ?? ''}
          onChange={(e) => updateSetting(k, e.target.value)}
          className={REGO_INPUT_MONO_CLS}
        />
      </div>
    </FieldShell>
  );
}

function CopyChip({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (value && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        /* clipboard unavailable */
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={!value}
      className="group flex w-full items-center justify-between gap-2 p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-left hover:border-[var(--rego-accent,#ad0505)]/40 disabled:opacity-50 transition-colors"
    >
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">{label}</span>
        <span className="block text-[11px] font-mono text-[var(--rego-fg,#111111)] truncate">{value || '—'}</span>
      </span>
      {copied ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)] shrink-0" />
      )}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Constants mirroring the classic page
   ──────────────────────────────────────────────────────────────────────────── */

const SECTION_OF_TAB: Partial<Record<SettingsTabId, PlatformSettingsSectionId>> = {
  brand: 'marketplace',
  homepage: 'marketplace',
  product: 'core_pages',
  algorithm: 'algorithm',
  commerce: 'commerce',
  finance: 'finance',
  shipping: 'shipping',
  security: 'security',
  operations: 'operations',
  integrations: 'integrations',
};

const REASSURANCE_DEFAULT_ITEMS = [
  { id: '1', icon: 'ShieldCheck', title: 'Paiement 100% Sécurisé', description: 'Carte bancaire, Flouci ou paiement à la livraison' },
  { id: '2', icon: 'Truck', title: 'Livraison Rapide Tunisie', description: '24h à 48h partout en Tunisie avec suivi' },
  { id: '3', icon: 'RotateCcw', title: 'Garantie Retour 7 jours', description: 'Satisfait ou remboursé sous 7 jours ouvrés' },
  { id: '4', icon: 'Award', title: 'Vendeur Certifié Panda', description: 'Boutique auditée et commandes protégées' },
];

const REASSURANCE_ICONS: Array<{ value: string; label: string }> = [
  { value: 'ShieldCheck', label: '🛡️ Sécurité (Shield)' },
  { value: 'Truck', label: '🚚 Livraison Express (Truck)' },
  { value: 'RotateCcw', label: '🔄 Retours Faciles (RotateCcw)' },
  { value: 'Award', label: '🏆 Qualité Certifiée (Award)' },
  { value: 'CheckCircle2', label: '✅ Vérifié Panda (CheckCircle)' },
  { value: 'Zap', label: '⚡ Expédition Immédiate (Zap)' },
  { value: 'Lock', label: '🔒 Paiement Crypté (Lock)' },
  { value: 'Heart', label: '❤️ Service Client (Heart)' },
  { value: 'Sparkles', label: '✨ Offres Exclusives (Sparkles)' },
  { value: 'PackageCheck', label: '📦 Colis Soigné (PackageCheck)' },
  { value: 'Clock', label: '⏱️ Support 24/7 (Clock)' },
  { value: 'CreditCard', label: '💳 Multi-Paiements (CreditCard)' },
];

interface ReassuranceItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

function parseReassuranceItems(raw: string): ReassuranceItem[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* fall back to defaults */
  }
  return REASSURANCE_DEFAULT_ITEMS;
}

/* ────────────────────────────────────────────────────────────────────────────
   Main component
   ──────────────────────────────────────────────────────────────────────────── */

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
  onActiveSectionChange,
  onOpenEmailSettings,
}: AdminReGoSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('brand');
  const [seoPreviewOpen, setSeoPreviewOpen] = useState(false);
  const [assetPickerTarget, setAssetPickerTarget] = useState<string | null>(null);
  const [sandboxProductInput, setSandboxProductInput] = useState('');

  useEffect(() => {
    const section = SECTION_OF_TAB[activeTab];
    if (section) onActiveSectionChange?.(section);
  }, [activeTab, onActiveSectionChange]);

  const tabs: Array<{ id: SettingsTabId; label: string; icon: any }> = [
    { id: 'brand', label: 'Identité & Marque', icon: Globe2 },
    { id: 'homepage', label: 'Accueil & Mégamenu', icon: LayoutGrid },
    { id: 'product', label: 'Fiche Produit', icon: Package },
    { id: 'algorithm', label: 'Algorithme & Flux', icon: Sparkles },
    { id: 'commerce', label: 'Commerce & Catalogue', icon: SlidersHorizontal },
    { id: 'finance', label: 'Finances & Paiements', icon: CreditCard },
    { id: 'shipping', label: 'Livraison & Zones', icon: Truck },
    { id: 'security', label: 'Sécurité & Connexions', icon: ShieldCheck },
    { id: 'operations', label: 'Opérations & Maintenance', icon: Server },
    { id: 'integrations', label: 'Intégrations & Webmaster', icon: BarChart3 },
    { id: 'email', label: 'E-mails Transactionnels', icon: Mail },
    { id: 'plans', label: "Plans d'Abonnement", icon: Crown },
  ];

  const isNonSettingsTab = activeTab === 'email' || activeTab === 'plans';

  const assetPickerTitle =
    assetPickerTarget === 'watermark_image_url'
      ? 'Galerie du logo filigrane'
      : assetPickerTarget === 'maintenance_illustration_url'
        ? "Galerie de l'illustration de maintenance"
        : assetPickerTarget === 'hub_homepage_banner_image_url'
          ? "Galerie de l'image de bannière"
          : assetPickerTarget === 'marketplace_og_image_url'
            ? "Galerie de l'image de partage social"
            : assetPickerTarget === 'marketplace_favicon_url'
              ? 'Galerie du favicon'
              : 'Galerie des logos de la marketplace';

  const reassuranceItems = useMemo(
    () => parseReassuranceItems(settings.single_product_reassurance_items || ''),
    [settings.single_product_reassurance_items],
  );

  const updateReassuranceItem = (index: number, field: string, value: string) => {
    const next = [...reassuranceItems];
    next[index] = { ...next[index], [field]: value };
    updateSetting('single_product_reassurance_items', JSON.stringify(next, null, 2));
  };

  const addReassuranceItem = () => {
    const next = [
      ...reassuranceItems,
      { id: String(Date.now()), icon: 'ShieldCheck', title: 'Nouvelle Garantie', description: 'Description de la garantie offerte à vos acheteurs.' },
    ];
    updateSetting('single_product_reassurance_items', JSON.stringify(next, null, 2));
  };

  const removeReassuranceItem = (index: number) => {
    const next = reassuranceItems.filter((_, i) => i !== index);
    updateSetting('single_product_reassurance_items', JSON.stringify(next, null, 2));
  };

  const moveReassuranceItem = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= reassuranceItems.length) return;
    const next = [...reassuranceItems];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    updateSetting('single_product_reassurance_items', JSON.stringify(next, null, 2));
  };

  const resetReassuranceDefaults = () => {
    updateSetting('single_product_reassurance_items', JSON.stringify(REASSURANCE_DEFAULT_ITEMS, null, 2));
  };

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
          disabled={saving || loading || isNonSettingsTab}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]"
        >
          <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
          <span>{saving ? 'Enregistrement...' : 'Enregistrer les Paramètres'}</span>
        </button>
      }
      alertBanner={
        settings.maintenance_enabled ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 text-xs font-semibold">
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
          <div className="flex items-center gap-2 p-3 rounded-[var(--rego-r,8px)] border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Modifications non enregistrées en cours. Pensez à valider pour appliquer à la marketplace.</span>
          </div>
        ) : saved ? (
          <div className="flex items-center gap-2 p-3 rounded-[var(--rego-r,8px)] border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 text-xs font-semibold">
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
            value={<ReGoAmtBox amount={settings.min_withdrawal_tnd || 20} size="md" />}
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
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
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3 rounded-[var(--rego-r,8px)] border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 text-xs font-semibold"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {loading && (
            <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-xs font-semibold text-[var(--rego-ink-2,#737373)]">
              Chargement des paramètres...
            </div>
          )}

          {/* TAB: IDENTITÉ & MARQUE (section marketplace) */}
          {activeTab === 'brand' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReGoCard
                  title="Identité Commerciale & Contact"
                  subtitle="Informations générales et coordonnées du service client"
                  icon={Globe2}
                >
                  <div className="space-y-3 text-xs">
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_name" label="Nom Commercial de la Marketplace" />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_tagline" label="Slogan & Tagline Promotionnelle" />
                    <div className="grid grid-cols-2 gap-2">
                      <SelectInput
                        settings={settings}
                        updateSetting={updateSetting}
                        k="marketplace_theme"
                        label="Thème Visuel du Marketplace"
                        options={[
                          { value: 'panda', label: 'PandaMarket (Panda Emerald)' },
                          { value: 'aliexpress', label: 'AliExpress Deals' },
                          { value: 'aliexpress2', label: 'AliExpress 2.0' },
                        ]}
                      />
                      <SelectInput
                        settings={settings}
                        updateSetting={updateSetting}
                        k="buyer_orders_theme_style"
                        label="Style Page « Mes Commandes »"
                        options={[
                          { value: 'modern_cards', label: 'Cartes Modernes (Panda)' },
                          { value: 'timeline_logistics', label: 'Timeline Logistique (5 étapes)' },
                        ]}
                        hint="Disposition de la page /hub/orders de l'acheteur."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <SelectInput
                        settings={settings}
                        updateSetting={updateSetting}
                        k="marketplace_default_locale"
                        label="Langue par Défaut"
                        options={[
                          { value: 'fr', label: 'Français (TN)' },
                          { value: 'ar', label: 'العربية (TN)' },
                          { value: 'en', label: 'English' },
                        ]}
                      />
                      <TextInput
                        settings={settings}
                        updateSetting={updateSetting}
                        k="marketplace_supported_locales"
                        label="Locales Supportées"
                        placeholder="fr,en,ar"
                        mono
                      />
                    </div>
                    <ToggleRow
                      label="Activer le RTL (Droite-à-Gauche)"
                      description="Permettre le rendu droite-à-gauche pour les langues supportées comme l'arabe."
                      checked={Boolean(settings.marketplace_rtl_enabled)}
                      onChange={(v) => updateSetting('marketplace_rtl_enabled', v)}
                    />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_public_url" label="URL Publique Officielle" mono />
                    {(!settings.marketplace_public_url || String(settings.marketplace_public_url).includes('garbage.team')) && (
                      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                        ⚠ Assurez-vous que l&apos;URL de production est configurée. Les URLs canoniques, e-mails et liens de partage dépendent de cette valeur.
                      </p>
                    )}
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_support_email" label="Email du Support Client" type="email" mono />
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_support_phone" label="Téléphone Support" />
                      <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_support_whatsapp" label="WhatsApp Officiel" placeholder="+216 ..." />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_address" label="Adresse Postale" />
                      <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_city" label="Ville" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_country" label="Pays" />
                      <TextInput
                        settings={settings}
                        updateSetting={updateSetting}
                        k="marketplace_business_hours"
                        label="Heures d'Ouverture"
                        placeholder="Mon–Fri 09:00–18:00"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <ColorInput settings={settings} updateSetting={updateSetting} k="marketplace_primary_color" label="Couleur Primaire de Marque" />
                      <ColorInput settings={settings} updateSetting={updateSetting} k="marketplace_secondary_color" label="Couleur Secondaire de Marque" />
                    </div>
                  </div>
                </ReGoCard>

                <ReGoCard
                  title="Logos, Favicon & Image de Partage"
                  subtitle="Visuels de marque utilisés sur le Hub et les réseaux sociaux"
                  icon={Palette}
                >
                  <div className="space-y-3 text-xs">
                    {[
                      { key: 'marketplace_logo_url', label: 'Logo Principal', value: settings.marketplace_logo_url, previewClass: 'bg-white' },
                      { key: 'marketplace_logo_dark_url', label: 'Logo Sombre', value: settings.marketplace_logo_dark_url, previewClass: 'bg-white' },
                      { key: 'marketplace_logo_light_url', label: 'Logo Clair', value: settings.marketplace_logo_light_url, previewClass: 'bg-slate-950' },
                    ].map((logo) => (
                      <div
                        key={logo.key}
                        className="flex items-center gap-3 p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]"
                      >
                        <div
                          className={`flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] ${logo.previewClass}`}
                        >
                          {logo.value ? (
                            <div
                              role="img"
                              aria-label={`${settings.marketplace_name} ${logo.label}`}
                              className="h-full w-full bg-contain bg-center bg-no-repeat"
                              style={{ backgroundImage: `url(${getResizedImageUrl(logo.value, 'large')})` }}
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="font-bold text-[var(--rego-fg,#111111)]">
                            {logo.label}
                            <span className="ml-1.5 text-[10px] font-semibold text-[var(--rego-ink-2,#737373)]">512×512px / 400×120px • PNG/SVG</span>
                          </p>
                          <input
                            type="text"
                            value={logo.value || ''}
                            onChange={(e) => updateSetting(logo.key, e.target.value)}
                            placeholder="/logos/..."
                            className={REGO_INPUT_MONO_CLS}
                          />
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAssetPickerTarget(logo.key)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90"
                            >
                              <UploadCloud className="w-3 h-3" /> Choisir
                            </button>
                            {logo.value && (
                              <button
                                type="button"
                                onClick={() => updateSetting(logo.key, '')}
                                className="px-2 py-1 text-[11px] font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                              >
                                Retirer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <FieldShell
                      label="Favicon URL"
                      badge={<span className="text-[10px] font-semibold text-[var(--rego-ink-2,#737373)]">32×32px / 64×64px (1:1) • ICO/PNG/SVG</span>}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settings.marketplace_favicon_url || ''}
                          onChange={(e) => updateSetting('marketplace_favicon_url', e.target.value)}
                          placeholder="/favicon.ico"
                          className={REGO_INPUT_MONO_CLS}
                        />
                        <button
                          type="button"
                          onClick={() => setAssetPickerTarget('marketplace_favicon_url')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 shrink-0"
                        >
                          <UploadCloud className="w-3.5 h-3.5" /> Choisir
                        </button>
                      </div>
                    </FieldShell>
                    <FieldShell
                      label="Image de Partage Social (OpenGraph)"
                      badge={<span className="text-[10px] font-semibold text-[var(--rego-ink-2,#737373)]">1200×630px (1.91:1) • Max 1MB</span>}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settings.marketplace_og_image_url || ''}
                          onChange={(e) => updateSetting('marketplace_og_image_url', e.target.value)}
                          placeholder="/og-image.png"
                          className={REGO_INPUT_MONO_CLS}
                        />
                        <button
                          type="button"
                          onClick={() => setAssetPickerTarget('marketplace_og_image_url')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 shrink-0"
                        >
                          <UploadCloud className="w-3.5 h-3.5" /> Choisir
                        </button>
                      </div>
                    </FieldShell>
                  </div>
                </ReGoCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReGoCard
                  title="Réseaux Sociaux & Liens Officiels"
                  subtitle="Liens vers les profils officiels de PandaMarket"
                  icon={Globe2}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_facebook_url" label="Facebook URL" placeholder="https://facebook.com/..." mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_instagram_url" label="Instagram URL" placeholder="https://instagram.com/..." mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_x_url" label="X (Twitter) URL" placeholder="https://x.com/..." mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_tiktok_url" label="TikTok URL" placeholder="https://tiktok.com/@..." mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_youtube_url" label="YouTube URL" placeholder="https://youtube.com/@..." mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_linkedin_url" label="LinkedIn URL" placeholder="https://linkedin.com/company/..." mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_whatsapp_url" label="WhatsApp URL" placeholder="https://wa.me/..." mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_telegram_url" label="Telegram URL" placeholder="https://t.me/..." mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_pinterest_url" label="Pinterest URL" placeholder="https://pinterest.com/..." mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_snapchat_url" label="Snapchat URL" placeholder="https://snapchat.com/add/..." mono />
                  </div>
                </ReGoCard>

                <ReGoCard
                  title="Liens Légaux & Support (Pied de Page)"
                  subtitle="Liens Aide, CGV, Confidentialité et Contact affichés sur le Hub public"
                  icon={Headphones}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_help_url" label="URL Aide" placeholder="/hub/search" mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_terms_url" label="URL Conditions Générales" placeholder="/hub/search" mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_privacy_url" label="URL Confidentialité" placeholder="/hub/search" mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_refund_url" label="URL Politique de Remboursement" placeholder="/hub/search" mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_cookie_policy_url" label="URL Politique Cookies" placeholder="/hub/search" mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="marketplace_contact_url" label="URL Contact" placeholder="/hub/search" mono />
                  </div>
                </ReGoCard>
              </div>

              {/* Filigrane & Protection d'Images (watermark — section marketplace) */}
              <ReGoCard
                title="Filigrane & Protection d'Images du Marketplace"
                subtitle="Apposition dynamique d'un filigrane (texte, logo ou combiné) et protection contre la copie"
                icon={Shield}
              >
                <div className="space-y-4 text-xs">
                  <ToggleRow
                    label="Activer le Filigrane Marketplace"
                    description="Appose automatiquement un filigrane personnalisable sur les photos de produits affichées dans le marketplace PandaMarket."
                    checked={Boolean(settings.watermark_enabled)}
                    onChange={(v) => updateSetting('watermark_enabled', v)}
                  />
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="space-y-4 lg:col-span-7">
                      <div>
                        <p className="font-bold text-[var(--rego-fg,#111111)] mb-2">Type de Filigrane</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'text', label: 'Texte seul', desc: 'Texte ou variables' },
                            { value: 'image', label: 'Logo / Image', desc: 'Logo PNG ou WebP' },
                            { value: 'both', label: 'Combiné', desc: 'Logo + Texte' },
                          ].map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => updateSetting('watermark_type', item.value)}
                              className={`rounded-[var(--rego-r,8px)] border p-2.5 text-left transition-all ${
                                settings.watermark_type === item.value
                                  ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-accent,#ad0505)]/5 ring-1 ring-[var(--rego-accent,#ad0505)]/30 font-bold'
                                  : 'border-[var(--rego-border,#dedede)] hover:border-[var(--rego-ink-2,#737373)]'
                              }`}
                            >
                              <div className="text-xs">{item.label}</div>
                              <div className="text-[10px] text-[var(--rego-ink-2,#737373)] mt-0.5">{item.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      {(settings.watermark_type === 'text' || settings.watermark_type === 'both') && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-[var(--rego-fg,#111111)]">Texte du Filigrane</label>
                            <div className="flex items-center gap-1.5 text-[10px] text-[var(--rego-ink-2,#737373)]">
                              <span>Variables :</span>
                              <button
                                type="button"
                                onClick={() => updateSetting('watermark_text', (settings.watermark_text || '') + ' {marketplace_name}')}
                                className="rounded bg-[var(--rego-surface,#f5f5f5)] px-1.5 py-0.5 font-mono hover:bg-[var(--rego-border,#dedede)]"
                              >
                                {'{marketplace_name}'}
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSetting('watermark_text', (settings.watermark_text || '') + ' {store_name}')}
                                className="rounded bg-[var(--rego-surface,#f5f5f5)] px-1.5 py-0.5 font-mono hover:bg-[var(--rego-border,#dedede)]"
                              >
                                {'{store_name}'}
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={settings.watermark_text ?? ''}
                            onChange={(e) => updateSetting('watermark_text', e.target.value)}
                            placeholder="ex: PandaMarket"
                            className={REGO_INPUT_CLS}
                          />
                        </div>
                      )}
                      {(settings.watermark_type === 'image' || settings.watermark_type === 'both') && (
                        <div>
                          <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Logo ou Asset Filigrane (URL)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={settings.watermark_image_url ?? ''}
                              onChange={(e) => updateSetting('watermark_image_url', e.target.value)}
                              placeholder="https://... ou /logo.png"
                              className={REGO_INPUT_MONO_CLS}
                            />
                            <button
                              type="button"
                              onClick={() => setAssetPickerTarget('watermark_image_url')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shrink-0"
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> Médiathèque
                            </button>
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-[var(--rego-fg,#111111)] mb-2">Positionnement sur l&apos;Image</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'top-left', label: 'Haut Gauche' },
                            { value: 'top-right', label: 'Haut Droite' },
                            { value: 'center', label: 'Centre' },
                            { value: 'bottom-left', label: 'Bas Gauche' },
                            { value: 'bottom-right', label: 'Bas Droite' },
                            { value: 'diagonal_repeat', label: 'Motif Répété (Diagonale)' },
                          ].map((pos) => (
                            <button
                              key={pos.value}
                              type="button"
                              onClick={() => updateSetting('watermark_position', pos.value)}
                              className={`rounded-[var(--rego-r,8px)] border p-2 text-center text-[11px] transition-all ${
                                settings.watermark_position === pos.value
                                  ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-accent,#ad0505)]/5 ring-1 ring-[var(--rego-accent,#ad0505)]/30 font-bold'
                                  : 'border-[var(--rego-border,#dedede)] hover:border-[var(--rego-ink-2,#737373)]'
                              }`}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-[var(--rego-fg,#111111)]">Opacité du Filigrane</label>
                          <span className="rounded bg-[var(--rego-surface,#f5f5f5)] px-2 py-0.5 text-[11px] font-mono font-bold text-[var(--rego-fg,#111111)]">
                            {settings.watermark_opacity}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          step={5}
                          value={settings.watermark_opacity ?? 40}
                          onChange={(e) => updateSetting('watermark_opacity', Number(e.target.value))}
                          className="w-full accent-[var(--rego-accent,#ad0505)] h-2 bg-[var(--rego-surface,#f5f5f5)] rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-[var(--rego-ink-2,#737373)] mt-1">
                          <span>Subtil (10%)</span>
                          <span>Moyen (50%)</span>
                          <span>Très visible (100%)</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="font-bold text-[var(--rego-fg,#111111)] mb-2">Taille / Échelle</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { value: 'small', label: 'Petite' },
                              { value: 'medium', label: 'Moyenne' },
                              { value: 'large', label: 'Grande' },
                            ].map((s) => (
                              <button
                                key={s.value}
                                type="button"
                                onClick={() => updateSetting('watermark_scale', s.value)}
                                className={`rounded-[var(--rego-r,8px)] border p-2 text-center text-[11px] transition-all ${
                                  settings.watermark_scale === s.value
                                    ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-accent,#ad0505)]/5 ring-1 ring-[var(--rego-accent,#ad0505)]/30 font-bold'
                                    : 'border-[var(--rego-border,#dedede)] hover:border-[var(--rego-ink-2,#737373)]'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-[var(--rego-fg,#111111)] mb-2">Style Visuel</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { value: 'subtle', label: 'Subtil' },
                              { value: 'badge', label: 'Badge Pill' },
                              { value: 'glassmorphism', label: 'Verre Flouté' },
                            ].map((st) => (
                              <button
                                key={st.value}
                                type="button"
                                onClick={() => updateSetting('watermark_style', st.value)}
                                className={`rounded-[var(--rego-r,8px)] border p-2 text-center text-[11px] transition-all ${
                                  settings.watermark_style === st.value
                                    ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-accent,#ad0505)]/5 ring-1 ring-[var(--rego-accent,#ad0505)]/30 font-bold'
                                    : 'border-[var(--rego-border,#dedede)] hover:border-[var(--rego-ink-2,#737373)]'
                                }`}
                              >
                                {st.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-3 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                          Périmètre d&apos;affichage & Protection
                        </p>
                        <ToggleRow
                          label="Galerie principale du produit"
                          description="Afficher le filigrane sur l'image principale de la fiche produit (/hub/products/[id])."
                          checked={Boolean(settings.watermark_show_on_gallery)}
                          onChange={(v) => updateSetting('watermark_show_on_gallery', v)}
                        />
                        <ToggleRow
                          label="Plein écran / Zoom Lightbox"
                          description="Afficher le filigrane lorsque le client ouvre la vue agrandie de l'image."
                          checked={Boolean(settings.watermark_show_on_lightbox)}
                          onChange={(v) => updateSetting('watermark_show_on_lightbox', v)}
                        />
                        <ToggleRow
                          label="Cartes de produits (Catalogues & Recherches)"
                          description="Afficher le filigrane sur les vignettes des produits sur l'accueil, la recherche et les catégories."
                          checked={Boolean(settings.watermark_show_on_cards)}
                          onChange={(v) => updateSetting('watermark_show_on_cards', v)}
                        />
                        <ToggleRow
                          label="Protection contre la copie (Anti-clic droit & Glisser-déposer)"
                          description="Empêche le clic droit « Enregistrer sous » et le drag & drop des photos dans le marketplace."
                          checked={Boolean(settings.watermark_copy_protection)}
                          onChange={(v) => updateSetting('watermark_copy_protection', v)}
                        />
                      </div>
                    </div>
                    <div className="lg:col-span-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                            Aperçu en Direct (Live Sandbox)
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              settings.watermark_enabled
                                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                                : 'text-[var(--rego-ink-2,#737373)] bg-[var(--rego-surface,#f5f5f5)] border-[var(--rego-border,#dedede)]'
                            }`}
                          >
                            {settings.watermark_enabled ? 'Filigrane Actif' : 'Filigrane Inactif'}
                          </span>
                        </div>
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-br from-slate-300 to-slate-500 dark:from-slate-700 dark:to-slate-900">
                          <WatermarkOverlay settings={settings} storeName={settings.marketplace_name} viewType="preview" />
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 pointer-events-none">
                            <div className="text-[11px] font-bold text-white truncate">Aperçu Carte Produit</div>
                            <div className="text-[10px] font-black text-emerald-400">Vignette Catalogue</div>
                          </div>
                        </div>
                        <p className="text-[11px] text-[var(--rego-ink-2,#737373)] leading-relaxed italic">
                          💡 Le filigrane s&apos;applique dynamiquement dans le navigateur pour tous les visiteurs du marketplace, sans altérer vos fichiers
                          sources d&apos;origine ni impacter les boutiques storefronts privées.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB: ACCUEIL & MÉGAMENU (section marketplace) */}
          {activeTab === 'homepage' && (
            <div className="space-y-4">
              <ReGoCard
                title="Disposition de la Page d'Accueil"
                subtitle="Choix du gabarit d'affichage, pagination et navigation par catégories"
                icon={LayoutGrid}
                actions={
                  <button
                    type="button"
                    onClick={onOpenPreviewLab}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-[var(--rego-r,8px)] bg-indigo-600 text-white hover:bg-indigo-700 shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lab d&apos;Apparence & A11y</span>
                  </button>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <SelectInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="hub_homepage_layout"
                    label="Disposition du Hub"
                    options={[
                      { value: 'theme_default', label: 'Défaut du thème' },
                      { value: 'classic', label: 'Classique E-commerce' },
                      { value: 'deals', label: 'Deals & Promotions' },
                      { value: 'premium_deals', label: 'Grille Premium' },
                      { value: 'alibaba', label: 'Style Alibaba' },
                      { value: 'amazon', label: 'Style Amazon' },
                    ]}
                  />
                  <SelectInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="hub_homepage_pagination_style"
                    label="Mode de Pagination des Produits"
                    fallback="none"
                    options={[
                      { value: 'none', label: 'Aucune (12 produits exactement)' },
                      { value: 'infinite', label: 'Défilement Infini (Infinite Scroll)' },
                      { value: 'load_more', label: 'Bouton Charger Plus' },
                      { value: 'pagination', label: 'Pagination Numérotée' },
                    ]}
                  />
                  <SelectInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="hub_megamenu_style"
                    label="Style du Mégamenu En-Tête"
                    fallback="standard"
                    options={[
                      { value: 'standard', label: 'Version 1 : Liste Standard (Compacte Alibaba)' },
                      { value: 'visual_rich', label: 'Version 2 : Cartes Visuelles' },
                      { value: 'ultra_rich', label: 'Version 3 : Vitrine Ultra-Riche' },
                      { value: 'ultra_rich_deep', label: 'Version 4 : Ultra-Riche Multi-Niveaux' },
                    ]}
                  />
                  <ToggleRow
                    label="Chargement Différé du Mégamenu"
                    description="Charge les arbres de catégories à la demande au survol ou clic du mégamenu, améliorant la vitesse de chargement initiale."
                    checked={Boolean(settings.hub_megamenu_lazy_loading)}
                    onChange={(v) => updateSetting('hub_megamenu_lazy_loading', v)}
                  />
                  <SelectInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="hub_category_page_style"
                    label="Style des Pages Catégorie / Sous-Catégorie"
                    fallback="v1_classic"
                    options={[
                      { value: 'v1_classic', label: 'Version 1 : En-tête & Grille Classiques' },
                      { value: 'v2_modern_showcase', label: 'Version 2 : Vitrine Moderne' },
                    ]}
                  />
                  <SelectInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="catalog_default_sort"
                    label="Tri par Défaut du Catalogue"
                    fallback="newest"
                    options={[
                      { value: 'newest', label: '✨ Nouveautés d’abord (Date DESC)' },
                      { value: 'oldest', label: '⏳ Plus anciens d’abord (Date ASC)' },
                      { value: 'price_asc', label: '💵 Prix : Moins cher au plus cher' },
                      { value: 'price_desc', label: '💎 Prix : Plus cher au moins cher' },
                      { value: 'title_asc', label: '🔤 Alphabétique (Titre A-Z)' },
                    ]}
                  />
                  <TextInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="catalog_featured_category_slugs"
                    label="Slugs des Catégories en Vedette"
                    placeholder="electronics,beauty,home"
                    mono
                  />
                </div>
              </ReGoCard>

              <ReGoCard
                title="Bannière Promotionnelle de l'Accueil"
                subtitle="Titre, sous-titre, bouton d'action et visuel de la bannière secondaire"
                icon={Sparkles}
              >
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextInput settings={settings} updateSetting={updateSetting} k="hub_homepage_banner_title" label="Titre de la Bannière" placeholder="Your marketplace headline" />
                    <TextInput settings={settings} updateSetting={updateSetting} k="hub_homepage_banner_subtitle" label="Sous-titre de la Bannière" placeholder="Short hero description" />
                    <TextInput settings={settings} updateSetting={updateSetting} k="hub_homepage_banner_cta_label" label="Libellé du Bouton CTA" placeholder="Explorer le Hub" />
                    <TextInput settings={settings} updateSetting={updateSetting} k="hub_homepage_banner_cta_url" label="URL du Bouton CTA" placeholder="/hub/search" mono />
                  </div>
                  <FieldShell
                    label="Image de la Bannière Promotionnelle"
                    badge={<span className="text-[10px] font-semibold text-[var(--rego-ink-2,#737373)]">1920×600px (16:5) • Max 2MB • WebP/PNG/JPG</span>}
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-3 p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                      <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]">
                        {settings.hub_homepage_banner_image_url ? (
                          <div
                            role="img"
                            aria-label="Aperçu de l'image de bannière"
                            className="h-full w-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${getResizedImageUrl(settings.hub_homepage_banner_image_url, 'medium')})` }}
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 w-full space-y-1.5">
                        <input
                          type="text"
                          value={settings.hub_homepage_banner_image_url || ''}
                          onChange={(e) => updateSetting('hub_homepage_banner_image_url', e.target.value)}
                          placeholder="/pd-product-images/..."
                          className={REGO_INPUT_MONO_CLS}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setAssetPickerTarget('hub_homepage_banner_image_url')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90"
                          >
                            <UploadCloud className="w-3 h-3" /> Choisir dans la Médiathèque
                          </button>
                          {settings.hub_homepage_banner_image_url && (
                            <button
                              type="button"
                              onClick={() => updateSetting('hub_homepage_banner_image_url', '')}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-bg,#ffffff)]"
                            >
                              Retirer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </FieldShell>
                  <div className="space-y-2 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">Aperçu Direct de la Bannière</span>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">Brouillon</span>
                    </div>
                    <div className="relative overflow-hidden rounded-[var(--rego-r,8px)] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white">
                      {settings.hub_homepage_banner_image_url && (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
                          style={{ backgroundImage: `url(${getResizedImageUrl(settings.hub_homepage_banner_image_url, 'large')})` }}
                        />
                      )}
                      <div className="relative z-10 max-w-lg space-y-1.5">
                        <span className="inline-block rounded-full bg-white/20 dark:bg-white/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md">
                          {settings.marketplace_name} Promos
                        </span>
                        <h4 className="text-lg font-black">{settings.hub_homepage_banner_title || 'Titre de votre bannière ici'}</h4>
                        <p className="text-[11px] text-white/80">
                          {settings.hub_homepage_banner_subtitle || 'Sous-titre explicatif et accroche commerciale'}
                        </p>
                        <span className="inline-flex items-center gap-2 rounded-[var(--rego-r,8px)] bg-[#16C784] px-3 py-1.5 text-[11px] font-black text-white">
                          {settings.hub_homepage_banner_cta_label || 'Explorer le Hub'} →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </ReGoCard>

              <ReGoCard
                title="Section Hero (Catégories, Carrousel & Rail Vendeurs)"
                subtitle="Zone Hero de l'accueil Alibaba B2B — barre latérale, carrousel et rail vendeurs"
                icon={Globe2}
              >
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <ToggleRow
                      label="Barre Latérale Catégories"
                      description="Afficher le menu vertical des catégories à gauche."
                      checked={Boolean(settings.hub_hero_show_category_sidebar)}
                      onChange={(v) => updateSetting('hub_hero_show_category_sidebar', v)}
                    />
                    <ToggleRow
                      label="Carrousel Hero"
                      description="Afficher le carrousel/bannière principal au centre."
                      checked={Boolean(settings.hub_hero_show_carousel)}
                      onChange={(v) => updateSetting('hub_hero_show_carousel', v)}
                    />
                    <ToggleRow
                      label="Rail Vendeurs"
                      description="Afficher le rail vendeurs/fournisseurs à droite."
                      checked={Boolean(settings.hub_hero_show_seller_rail)}
                      onChange={(v) => updateSetting('hub_hero_show_seller_rail', v)}
                    />
                  </div>
                  {settings.hub_hero_show_category_sidebar && (
                    <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                      <NumberInput
                        settings={settings}
                        updateSetting={updateSetting}
                        k="hub_hero_category_sidebar_max_items"
                        label="Nombre Maximal de Catégories Affichées"
                        min={1}
                        max={30}
                        hint="Contrôle le nombre de catégories de premier niveau du menu vertical (1 à 30)."
                        parse={(raw) => Math.max(1, Math.min(30, Number(raw) || 14))}
                      />
                    </div>
                  )}
                  {settings.hub_hero_show_seller_rail && (
                    <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                        Configuration du Rail Vendeurs (Hero Alibaba B2B & CTA Classique)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <TextInput settings={settings} updateSetting={updateSetting} k="hub_hero_seller_rail_title" label="Titre de la Carte Rail" placeholder="Accès Vendeurs & Fournisseurs" />
                        <TextInput settings={settings} updateSetting={updateSetting} k="hub_hero_seller_rail_subtitle" label="Sous-titre du Rail" placeholder="Ouvrez votre boutique B2B..." />
                        <TextInput settings={settings} updateSetting={updateSetting} k="hub_hero_seller_rail_cta_label" label="Libellé du Bouton CTA" placeholder="Espace Vendeur" />
                        <TextInput settings={settings} updateSetting={updateSetting} k="hub_hero_seller_rail_cta_url" label="URL du Bouton CTA" placeholder="/hub/dashboard" mono />
                        <TextInput settings={settings} updateSetting={updateSetting} k="hub_hero_seller_rail_badge_text" label="Texte du Badge" placeholder="PandaMarket B2B" />
                      </div>
                    </div>
                  )}
                  {settings.hub_hero_show_carousel && (
                    <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">Configuration du Carrousel Hero</p>
                        <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/40 px-2 py-0.5 rounded-full">
                          Actif sur : Alibaba B2B & Défaut du Thème
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <SelectInput
                          settings={settings}
                          updateSetting={updateSetting}
                          k="hub_hero_carousel_source_mode"
                          label="Mode Source des Slides"
                          fallback="hybrid"
                          options={[
                            { value: 'hybrid', label: '🔀 Hybride (Personnalisé + Catégories)' },
                            { value: 'custom_only', label: '🎯 Slides Personnalisés Uniquement' },
                            { value: 'auto_categories_only', label: '🏷️ Catégories Auto Uniquement' },
                          ]}
                        />
                        <NumberInput
                          settings={settings}
                          updateSetting={updateSetting}
                          k="hub_hero_carousel_max_categories"
                          label="Nombre de Catégories Auto"
                          min={1}
                          max={10}
                          parse={(raw) => Math.max(1, Math.min(10, Number(raw) || 5))}
                        />
                        <SelectInput
                          settings={settings}
                          updateSetting={updateSetting}
                          k="hub_hero_carousel_interval"
                          label="Délai de Rotation des Slides"
                          options={[
                            { value: 3000, label: '3 Secondes (Rapide)' },
                            { value: 5000, label: '5 Secondes (Recommandé)' },
                            { value: 6000, label: '6 Secondes (Standard)' },
                            { value: 8000, label: '8 Secondes (Lent)' },
                            { value: 10000, label: '10 Secondes (Très Lent)' },
                          ]}
                        />
                        <SelectInput
                          settings={settings}
                          updateSetting={updateSetting}
                          k="hub_hero_carousel_dots_style"
                          label="Points Indicateurs"
                          fallback="pill"
                          options={[
                            { value: 'pill', label: 'Points Pilule' },
                            { value: 'circle', label: 'Points Cercle' },
                            { value: 'numbers', label: 'Numéros / Compteur' },
                            { value: 'hidden', label: 'Masqués' },
                          ]}
                        />
                        <SelectInput
                          settings={settings}
                          updateSetting={updateSetting}
                          k="hub_hero_carousel_transition"
                          label="Animation de Transition"
                          fallback="slide"
                          options={[
                            { value: 'slide', label: 'Glissement (Slide)' },
                            { value: 'fade', label: 'Fondu Enchaîné' },
                            { value: 'zoom', label: 'Zoom Échelle' },
                          ]}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ToggleRow
                          label="Rotation Automatique des Slides"
                          description="Avancer automatiquement vers le slide suivant."
                          checked={Boolean(settings.hub_hero_carousel_autoplay)}
                          onChange={(v) => updateSetting('hub_hero_carousel_autoplay', v)}
                        />
                        <ToggleRow
                          label="Flèches de Navigation"
                          description="Afficher les boutons fléchés gauche/droite sur la bannière."
                          checked={Boolean(settings.hub_hero_carousel_show_arrows)}
                          onChange={(v) => updateSetting('hub_hero_carousel_show_arrows', v)}
                        />
                      </div>
                      <HeroCarouselEditor
                        value={settings.hub_hero_carousel_slides}
                        onChange={(next) => updateSetting('hub_hero_carousel_slides', next)}
                      />
                    </div>
                  )}
                </div>
              </ReGoCard>

              <ReGoCard
                title="Blocs de la Page d'Accueil"
                subtitle="Activer, réordonner et personnaliser les blocs pour les accueil Alibaba, Amazon, AliExpress et Classique"
                icon={LayoutGrid}
              >
                <HomepageBlocksEditor
                  value={settings.hub_homepage_blocks}
                  onChange={(next) => updateSetting('hub_homepage_blocks', next)}
                />
              </ReGoCard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReGoCard
                  title="Vignettes Produit du Hub"
                  subtitle="Éléments d'information affichés sur les cartes produit"
                  icon={SlidersHorizontal}
                >
                  <div className="space-y-2 text-xs">
                    <ToggleRow
                      label="🏪 Nom de la Boutique (Store Name)"
                      description="Affiche le nom de la boutique avec icône sur chaque carte produit de la page d'accueil du Hub."
                      checked={settings.hub_card_show_store_name !== false}
                      onChange={(v) => updateSetting('hub_card_show_store_name', v)}
                    />
                    <ToggleRow
                      label="🛡️ Badge Boutique Vérifiée (Verified Store Badge)"
                      description="Affiche le badge « Vérifié » avec bouclier si la boutique du vendeur a été vérifiée par la plateforme."
                      checked={settings.hub_card_show_store_verified !== false}
                      onChange={(v) => updateSetting('hub_card_show_store_verified', v)}
                    />
                    <ToggleRow
                      label="⭐ Score & Note de la Boutique (Store Score)"
                      description="Affiche la note / score de confiance de la boutique vendeuse sur les cartes produit du Hub."
                      checked={settings.hub_card_show_store_score !== false}
                      onChange={(v) => updateSetting('hub_card_show_store_score', v)}
                    />
                  </div>
                </ReGoCard>

                <ReGoCard
                  title="Recherche & Résultats Sponsorisés"
                  subtitle="Grille de la page /hub/search et rail des produits sponsorisés"
                  icon={Search}
                >
                  <div className="space-y-3 text-xs">
                    <SelectInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="hub_search_grid_columns"
                      label="Colonnes Résultats de Recherche (/hub/search)"
                      fallback={5}
                      options={[
                        { value: 2, label: '2 Colonnes (Large)' },
                        { value: 3, label: '3 Colonnes (Large)' },
                        { value: 4, label: '4 Colonnes (Confort)' },
                        { value: 5, label: '5 Colonnes (Standard)' },
                        { value: 6, label: '6 Colonnes (Compact)' },
                      ]}
                    />
                    <SelectInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="hub_search_items_per_page"
                      label="Résultats par Page de Recherche"
                      fallback={20}
                      options={[
                        { value: 12, label: '12 produits' },
                        { value: 16, label: '16 produits' },
                        { value: 20, label: '20 produits (Défaut)' },
                        { value: 24, label: '24 produits' },
                        { value: 30, label: '30 produits' },
                        { value: 36, label: '36 produits' },
                        { value: 48, label: '48 produits' },
                      ]}
                      hint="Nombre de produits renvoyés par requête."
                    />
                    <ToggleRow
                      label="📢 Rail de Résultats Sponsorisés (Sponsored Ads Rail)"
                      description="Section « Sponsored results » en haut de la page de recherche (/hub/search)."
                      checked={settings.hub_search_sponsored_enabled !== false}
                      onChange={(v) => updateSetting('hub_search_sponsored_enabled', v)}
                    />
                    {settings.hub_search_sponsored_enabled !== false && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                        <SelectInput
                          settings={settings}
                          updateSetting={updateSetting}
                          k="hub_search_sponsored_columns"
                          label="Colonnes Sponsorisées"
                          fallback={4}
                          options={[
                            { value: 2, label: '2 Colonnes (Large)' },
                            { value: 3, label: '3 Colonnes (Large)' },
                            { value: 4, label: '4 Colonnes (Standard)' },
                            { value: 5, label: '5 Colonnes (Confort)' },
                            { value: 6, label: '6 Colonnes (Compact)' },
                          ]}
                        />
                        <SelectInput
                          settings={settings}
                          updateSetting={updateSetting}
                          k="hub_search_sponsored_count"
                          label="Nombre Maximal d'Éléments Sponsorisés"
                          fallback={6}
                          options={[
                            { value: 2, label: '2 annonces' },
                            { value: 3, label: '3 annonces' },
                            { value: 4, label: '4 annonces' },
                            { value: 6, label: '6 annonces (Défaut)' },
                            { value: 8, label: '8 annonces' },
                            { value: 12, label: '12 annonces' },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* TAB: FICHE PRODUIT (section core_pages) */}
          {activeTab === 'product' && (
            <div className="space-y-4">
              <ReGoCard
                title="Version Active de la Fiche Produit (Single Product Page)"
                subtitle="Sélectionnez le style de mise en page et l'expérience d'achat sur toutes les fiches produits du Hub."
                icon={Package}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {[
                    {
                      value: 'v1_classic',
                      title: 'Version 1 — Classique',
                      sub: 'Disposition Standard',
                      desc: 'Mise en page standard avec disposition épurée et cartes superposées.',
                      chips: ['⚡ Galerie simple', '📦 Panier classique'],
                    },
                    {
                      value: 'v2_modern_showcase',
                      title: 'Version 2 — Moderne Impeccable',
                      sub: 'Recommandé · Haute Conversion',
                      desc: 'Design moderne à fort taux de conversion : Sticky Cart Bar, Estimateur Tunisie 24 gouvernorats, Preuve sociale en direct, Onglets interactifs et Partage WhatsApp 1-Click.',
                      chips: ['🛒 Sticky Cart', '🇹🇳 24 Gouvernorats', '🔥 Live Views', '💬 WhatsApp 1-Click'],
                    },
                  ].map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => updateSetting('single_product_page_version', v.value)}
                      className={`text-left rounded-[var(--rego-r,8px)] border-2 p-3.5 transition-all ${
                        settings.single_product_page_version === v.value
                          ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-accent,#ad0505)]/5 ring-1 ring-[var(--rego-accent,#ad0505)]/30'
                          : 'border-[var(--rego-border,#dedede)] hover:border-[var(--rego-ink-2,#737373)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-[var(--rego-fg,#111111)]">{v.title}</p>
                          <p className="text-[10px] font-bold text-[var(--rego-ink-2,#737373)]">{v.sub}</p>
                        </div>
                        {settings.single_product_page_version === v.value && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
                            <CheckCircle2 className="w-3 h-3" /> Actif
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-[var(--rego-ink-2,#737373)]">{v.desc}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-[var(--rego-border,#dedede)]/60">
                        {v.chips.map((c) => (
                          <span key={c} className="rounded bg-[var(--rego-surface,#f5f5f5)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--rego-ink-2,#737373)]">
                            {c}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </ReGoCard>

              <ReGoCard
                title="Boosters de Conversion & Micro-interactions"
                subtitle="Activez ou désactivez les fonctionnalités interactives de la fiche produit selon votre stratégie marketing."
                icon={Zap}
              >
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    <ToggleRow
                      label="Sticky Cart Bar"
                      description="Affiche une barre d'achat flottante lors du défilement."
                      checked={Boolean(settings.single_product_sticky_cart_bar)}
                      onChange={(v) => updateSetting('single_product_sticky_cart_bar', v)}
                    />
                    <ToggleRow
                      label="Estimateur de Livraison Tunisie"
                      description="Calculateur de date d'arrivée selon les 24 gouvernorats."
                      checked={Boolean(settings.single_product_show_delivery_estimator)}
                      onChange={(v) => updateSetting('single_product_show_delivery_estimator', v)}
                    />
                    <ToggleRow
                      label="Preuve Sociale (Live Views)"
                      description="Badge animé indiquant le nombre de personnes consultant l'offre."
                      checked={Boolean(settings.single_product_show_live_views)}
                      onChange={(v) => updateSetting('single_product_show_live_views', v)}
                    />
                    <ToggleRow
                      label="Jauge d'Urgence Stock Faible"
                      description="Barre de progression rouge lorsque le stock est critique."
                      checked={Boolean(settings.single_product_show_stock_urgency)}
                      onChange={(v) => updateSetting('single_product_show_stock_urgency', v)}
                    />
                    <ToggleRow
                      label="Partage WhatsApp & Réseaux"
                      description="Boutons de partage rapide pour les acheteurs."
                      checked={Boolean(settings.single_product_show_share_buttons)}
                      onChange={(v) => updateSetting('single_product_show_share_buttons', v)}
                    />
                    <ToggleRow
                      label="Calculateur de Prix de Gros"
                      description="Paliers de commande par lot pour boutiques grossistes."
                      checked={Boolean(settings.single_product_show_wholesale_calculator)}
                      onChange={(v) => updateSetting('single_product_show_wholesale_calculator', v)}
                    />
                    <ToggleRow
                      label="Chat Direct Vendeur"
                      description="Permet aux acheteurs de poser une question avant achat."
                      checked={Boolean(settings.single_product_show_contact_seller)}
                      onChange={(v) => updateSetting('single_product_show_contact_seller', v)}
                    />
                    <ToggleRow
                      label="Bloc de Réassurance & Confiance"
                      description="Affiche les 4 piliers de garantie et sécurité."
                      checked={Boolean(settings.single_product_show_reassurance)}
                      onChange={(v) => updateSetting('single_product_show_reassurance', v)}
                    />
                  </div>
                  {settings.single_product_show_stock_urgency && (
                    <div className="max-w-xs p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                      <NumberInput
                        settings={settings}
                        updateSetting={updateSetting}
                        k="single_product_stock_urgency_threshold"
                        label="Seuil d'Alerte Stock Faible"
                        min={1}
                        max={50}
                      />
                    </div>
                  )}
                </div>
              </ReGoCard>

              <ReGoCard
                title="Disposition & Structure du Contenu"
                subtitle="Galerie, contenu détaillé, carte vendeur et suggestions"
                icon={LayoutGrid}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <SelectInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="single_product_gallery_layout"
                    label="Style de la Galerie d'Images"
                    fallback="sticky_carousel"
                    options={[
                      { value: 'sticky_carousel', label: 'Carrousel Interactif avec Zoom (Recommandé)' },
                      { value: 'grid_mosaic', label: 'Mosaïque Moderne en Grille' },
                      { value: 'stacked', label: 'Images Empilées' },
                    ]}
                  />
                  <SelectInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="single_product_details_layout"
                    label="Présentation du Contenu Détaillé"
                    fallback="tabs"
                    options={[
                      { value: 'tabs', label: 'Onglets Horizontaux (Recommandé)' },
                      { value: 'accordions', label: 'Accordéons Déroulants' },
                      { value: 'stacked', label: 'Sections Empilées' },
                    ]}
                  />
                  <SelectInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="single_product_seller_card_style"
                    label="Style de la Carte Vendeur"
                    fallback="rich_banner"
                    options={[
                      { value: 'rich_banner', label: 'Bannière Enrichie avec Stats (Recommandé)' },
                      { value: 'compact', label: 'Carte Compacte' },
                      { value: 'glass', label: 'Carte Effet Verre (Glassmorphism)' },
                    ]}
                  />
                  <SelectInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="single_product_cross_sell_position"
                    label="Position des Suggestions & Cross-Sell"
                    fallback="bottom"
                    options={[
                      { value: 'bottom', label: 'En Bas de Page (Recommandé)' },
                      { value: 'sidebar', label: 'Dans la Barre Latérale' },
                      { value: 'both', label: 'Barre Latérale et Bas de Page' },
                    ]}
                  />
                </div>
              </ReGoCard>

              {settings.single_product_show_reassurance && (
                <ReGoCard
                  title="Constructeur Visuel des Piliers de Réassurance"
                  subtitle="Ajoutez, supprimez, réorganisez et personnalisez les piliers de confiance affichés sur la fiche produit."
                  icon={ShieldCheck}
                  actions={
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={addReassuranceItem}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-[var(--rego-r,8px)] bg-emerald-600 text-white hover:bg-emerald-500"
                      >
                        <Plus className="w-3 h-3" /> Ajouter un pilier
                      </button>
                      <button
                        type="button"
                        onClick={resetReassuranceDefaults}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                      >
                        <RotateCcw className="w-3 h-3" /> Réinitialiser (4 piliers)
                      </button>
                    </div>
                  }
                >
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {reassuranceItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="relative rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-1 border-b border-[var(--rego-border,#dedede)]/60 pb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--rego-ink-2,#737373)] bg-[var(--rego-surface,#f5f5f5)] px-1.5 py-0.5 rounded">
                              #{idx + 1}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveReassuranceItem(idx, 'left')}
                                title="Déplacer à gauche"
                                className="rounded p-1 text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-30"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === reassuranceItems.length - 1}
                                onClick={() => moveReassuranceItem(idx, 'right')}
                                title="Déplacer à droite"
                                className="rounded p-1 text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] disabled:opacity-30"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeReassuranceItem(idx)}
                                title="Supprimer ce pilier"
                                className="rounded p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">Icône</label>
                            <select
                              value={item.icon || 'ShieldCheck'}
                              onChange={(e) => updateReassuranceItem(idx, 'icon', e.target.value)}
                              className={REGO_INPUT_CLS}
                            >
                              {REASSURANCE_ICONS.map((ic) => (
                                <option key={ic.value} value={ic.value}>
                                  {ic.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">Titre</label>
                            <input
                              type="text"
                              value={item.title || ''}
                              onChange={(e) => updateReassuranceItem(idx, 'title', e.target.value)}
                              placeholder="Ex: 100% Sécurisé"
                              className={REGO_INPUT_CLS}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">Description</label>
                            <textarea
                              rows={2}
                              value={item.description || ''}
                              onChange={(e) => updateReassuranceItem(idx, 'description', e.target.value)}
                              placeholder="Ex: Paiement à la livraison ou par carte"
                              className={`${REGO_INPUT_CLS} resize-none`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <details className="text-[var(--rego-ink-2,#737373)]">
                      <summary className="cursor-pointer font-bold text-[var(--rego-fg,#111111)] hover:underline">
                        Mode Avancé : Éditer le JSON brut de réassurance
                      </summary>
                      <textarea
                        rows={4}
                        value={settings.single_product_reassurance_items || ''}
                        onChange={(e) => updateSetting('single_product_reassurance_items', e.target.value)}
                        className={`${REGO_INPUT_MONO_CLS} resize-none mt-2`}
                      />
                    </details>
                  </div>
                </ReGoCard>
              )}

              <ReGoCard
                title="Bac à Sable & Test en Direct"
                subtitle="Testez le rendu de n'importe quel produit avec le commutateur d'aperçu (?preview_version=v2 ou v1) sans altérer la configuration de production."
                icon={Sparkles}
              >
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 text-xs">
                  <div className="flex-1">
                    <FieldShell label="ID ou Slug du Produit de Test">
                      <input
                        type="text"
                        value={sandboxProductInput}
                        onChange={(e) => setSandboxProductInput(e.target.value)}
                        placeholder="demo ou identifiant-produit"
                        className={REGO_INPUT_CLS}
                      />
                    </FieldShell>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/hub/products/${encodeURIComponent(sandboxProductInput.trim() || 'demo')}?preview_version=v1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                    >
                      <span>Ouvrir en V1 (Classique)</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--rego-ink-2,#737373)]" />
                    </a>
                    <a
                      href={`/hub/products/${encodeURIComponent(sandboxProductInput.trim() || 'demo')}?preview_version=v2`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ouvrir en V2 (Showcase)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB: ALGORITHME & FLUX (section algorithm) */}
          {activeTab === 'algorithm' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReGoCard
                  title="Tri de Base du Catalogue"
                  subtitle="Ordre de tri appliqué au flux standard pour les visiteurs anonymes ou comme socle de base"
                  icon={SlidersHorizontal}
                >
                  <div className="space-y-3 text-xs">
                    <SelectInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="hub_feed_base_sort"
                      label="Stratégie de Tri par Défaut"
                      fallback="random"
                      options={[
                        { value: 'random', label: '🔀 Aléatoire (Mélange dynamique à chaque session)' },
                        { value: 'newest', label: '✨ Nouveautés (Date de publication DESC)' },
                        { value: 'alphabetical', label: '🔤 Alphabétique (Titre A-Z)' },
                        { value: 'best_sellers', label: '🔥 Meilleures Ventes (Volume de commandes DESC)' },
                      ]}
                    />
                    <p className="text-[11px] text-[var(--rego-ink-2,#737373)] bg-[var(--rego-surface,#f5f5f5)] p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]">
                      <span className="font-bold text-[var(--rego-fg,#111111)]">💡 Astuce : </span>
                      Le tri <strong>Aléatoire</strong> garantit une visibilité équitable pour tous les vendeurs à chaque nouvelle visite tout en préservant
                      la pertinence.
                    </p>
                  </div>
                </ReGoCard>

                <ReGoCard
                  title="Injection par Centres d'Intérêt IA"
                  subtitle="Pourcentage de produits personnalisés injectés dans le flux pour les acheteurs connectés (0% à 50%)"
                  icon={Sparkles}
                >
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--rego-fg,#111111)]">Taux d&apos;Injection Personnalisée</span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                        {settings.hub_feed_personalization_pct ?? 30}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      step={5}
                      value={settings.hub_feed_personalization_pct ?? 30}
                      onChange={(e) => updateSetting('hub_feed_personalization_pct', Number(e.target.value))}
                      className="w-full accent-emerald-600 h-2 bg-[var(--rego-surface,#f5f5f5)] rounded-lg cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5">
                      {[
                        { label: '0% (Off)', val: 0 },
                        { label: '15% (Léger)', val: 15 },
                        { label: '30% (Équilibré ⭐)', val: 30 },
                        { label: '50% (Max)', val: 50 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => updateSetting('hub_feed_personalization_pct', preset.val)}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-[var(--rego-r,8px)] border transition-colors ${
                            (settings.hub_feed_personalization_pct ?? 30) === preset.val
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] border-[var(--rego-border,#dedede)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <div className="h-3 w-full rounded-full overflow-hidden flex bg-[var(--rego-surface,#f5f5f5)]">
                        <div className="bg-emerald-500 transition-all duration-300" style={{ width: `${settings.hub_feed_personalization_pct ?? 30}%` }} />
                        <div className="bg-blue-500 transition-all duration-300" style={{ width: `${100 - (settings.hub_feed_personalization_pct ?? 30)}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-[var(--rego-ink-2,#737373)]">
                        <span className="text-emerald-700 dark:text-emerald-400">
                          🤖 {settings.hub_feed_personalization_pct ?? 30}% Intérêts IA (~{Math.round(24 * ((settings.hub_feed_personalization_pct ?? 30) / 100))} / 24 items)
                        </span>
                        <span className="text-blue-700 dark:text-blue-400">
                          📋 {100 - (settings.hub_feed_personalization_pct ?? 30)}% Tri Standard
                        </span>
                      </div>
                    </div>
                    <ToggleRow
                      label="A/B Testing du Flux Hub"
                      description="Alterne les variantes d'affichage du flux pour mesurer les performances."
                      checked={Boolean(settings.hub_feed_ab_testing_enabled)}
                      onChange={(v) => updateSetting('hub_feed_ab_testing_enabled', v)}
                    />
                  </div>
                </ReGoCard>
              </div>

              <ReGoCard
                title="Pénalité de Diversité (Anti-Bulle de Filtre & Équité Vendeurs)"
                subtitle="Empêche un vendeur ou un monopole algorithmique de saturer le flux. Répartit équitablement l'exposition entre boutiques."
                icon={ShieldCheck}
              >
                <div className="space-y-3 text-xs">
                  <ToggleRow
                    label="Activer la Pénalité de Diversité"
                    description="Empêche un vendeur ou un monopole algorithmique de saturer le flux Hub."
                    checked={settings.hub_feed_diversity_enabled !== false}
                    onChange={(v) => updateSetting('hub_feed_diversity_enabled', v)}
                  />
                  {settings.hub_feed_diversity_enabled !== false && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-[var(--rego-surface,#f5f5f5)] rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[var(--rego-fg,#111111)]">Max Articles par Vendeur (par page) :</span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                            {settings.hub_feed_max_items_per_store ?? 3} articles
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={6}
                          step={1}
                          value={settings.hub_feed_max_items_per_store ?? 3}
                          onChange={(e) => updateSetting('hub_feed_max_items_per_store', Number(e.target.value))}
                          className="w-full accent-emerald-600 h-2 bg-[var(--rego-bg,#ffffff)] rounded-lg cursor-pointer"
                        />
                        <div className="flex items-center gap-1">
                          {[
                            { label: '1 (Ultra-diversifié)', val: 1 },
                            { label: '2 (Équilibré)', val: 2 },
                            { label: '3 (Défaut ⭐)', val: 3 },
                            { label: '5 (Permissif)', val: 5 },
                          ].map((p) => (
                            <button
                              key={p.val}
                              type="button"
                              onClick={() => updateSetting('hub_feed_max_items_per_store', p.val)}
                              className={`flex-1 py-1 text-[10px] font-bold rounded border transition-colors ${
                                (settings.hub_feed_max_items_per_store ?? 3) === p.val
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] border-[var(--rego-border,#dedede)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 bg-[var(--rego-surface,#f5f5f5)] rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[var(--rego-fg,#111111)]">Intensité de l&apos;Anti-Bulle :</span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                            {settings.hub_feed_diversity_strength ?? 50}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          step={10}
                          value={settings.hub_feed_diversity_strength ?? 50}
                          onChange={(e) => updateSetting('hub_feed_diversity_strength', Number(e.target.value))}
                          className="w-full accent-blue-600 h-2 bg-[var(--rego-bg,#ffffff)] rounded-lg cursor-pointer"
                        />
                        <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                          Repousse les produits redondants du même vendeur vers le bas du flux pour maximiser le taux de découverte.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ReGoCard>

              <ReGoCard
                title="Cartes Produit & Grille du Hub"
                subtitle="Éléments affichés sur les cartes produit et mise en page de la grille (accueil, recherche, catégories)"
                icon={LayoutGrid}
              >
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <ToggleRow
                      label="⭐ Étoiles d'Avis & Notation"
                      description="Affiche les étoiles de notation et le nombre d'avis clients sur chaque carte produit."
                      checked={settings.hub_card_show_rating !== false}
                      onChange={(v) => updateSetting('hub_card_show_rating', v)}
                    />
                    <ToggleRow
                      label="🛍️ Bouton « Ajouter au Panier »"
                      description="Affiche un bouton d'ajout rapide au panier sur chaque carte produit du Hub."
                      checked={settings.hub_card_show_add_to_cart !== false}
                      onChange={(v) => updateSetting('hub_card_show_add_to_cart', v)}
                    />
                  </div>
                  {settings.hub_card_show_add_to_cart !== false && (
                    <SelectInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="hub_card_add_to_cart_style"
                      label="🎨 Style du Bouton Panier"
                      fallback="icon"
                      options={[
                        { value: 'icon', label: '🛒 Icône — Bouton rond discret' },
                        { value: 'compact', label: '🛒 Compact — Pill avec texte court' },
                        { value: 'full', label: '🛒 Pleine Largeur — Bouton large sous le prix' },
                      ]}
                    />
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <SelectInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="hub_grid_columns"
                      label="🏛️ Colonnes par Ligne (Desktop)"
                      fallback={5}
                      options={[2, 3, 4, 5, 6, 7, 8].map((c) => ({ value: c, label: `${c} Colonnes${c === 5 ? ' (Défaut)' : ''}` }))}
                      hint="Nombre de colonnes sur desktop (2 colonnes sur mobile)."
                    />
                    <SelectInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="hub_grid_items_per_load"
                      label="📦 Produits par Chargement"
                      fallback={12}
                      options={[6, 12, 18, 24, 30, 36, 42, 48].map((n) => ({ value: n, label: `${n} Produits${n === 12 ? ' (Défaut)' : ''}` }))}
                      hint="Nombre de produits chargés à chaque scroll infini ou clic « Load More »."
                    />
                  </div>
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB: COMMERCE & CATALOGUE (section commerce) */}
          {activeTab === 'commerce' && (
            <div className="space-y-4">
              <ReGoCard
                title="Disponibilité de la Marketplace"
                subtitle="Activer ou désactiver les principales fonctionnalités sans déployer de code"
                icon={SlidersHorizontal}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <ToggleRow
                    label="Marketplace en Ligne"
                    description="Autoriser la marketplace à accepter le trafic et les interactions normales."
                    checked={Boolean(settings.marketplace_enabled)}
                    onChange={(v) => updateSetting('marketplace_enabled', v)}
                  />
                  <ToggleRow
                    label="Inscription Vendeurs"
                    description="Autoriser les nouveaux vendeurs à s'inscrire et créer des boutiques."
                    checked={Boolean(settings.vendor_registration_enabled)}
                    onChange={(v) => updateSetting('vendor_registration_enabled', v)}
                  />
                  <ToggleRow
                    label="Inscription Acheteurs"
                    description="Autoriser les clients à créer des comptes acheteurs."
                    checked={Boolean(settings.buyer_registration_enabled)}
                    onChange={(v) => updateSetting('buyer_registration_enabled', v)}
                  />
                  <ToggleRow
                    label="Panier d'Achat"
                    description="Autoriser les clients à ajouter des produits au panier."
                    checked={Boolean(settings.cart_enabled)}
                    onChange={(v) => updateSetting('cart_enabled', v)}
                  />
                  <ToggleRow
                    label="Liste de Souhaits (Wishlist)"
                    description="Autoriser les clients à sauvegarder des produits pour plus tard."
                    checked={Boolean(settings.wishlist_enabled)}
                    onChange={(v) => updateSetting('wishlist_enabled', v)}
                  />
                  <ToggleRow
                    label="Livraison"
                    description="Activer les workflows de livraison et la configuration de livraison."
                    checked={Boolean(settings.shipping_enabled)}
                    onChange={(v) => updateSetting('shipping_enabled', v)}
                  />
                  <ToggleRow
                    label="Outils IA"
                    description="Activer les files IA, crédits, assistants SEO, compression d'images et paramètres fournisseur IA des vendeurs."
                    checked={Boolean(settings.ai_tools_enabled)}
                    onChange={(v) => updateSetting('ai_tools_enabled', v)}
                  />
                  <ToggleRow
                    label="Page Builder"
                    description="Activer l'édition Page Builder des vendeurs et le rendu des pages personnalisées storefront."
                    checked={Boolean(settings.page_builder_enabled)}
                    onChange={(v) => updateSetting('page_builder_enabled', v)}
                  />
                  <ToggleRow
                    label="Marketplace de Plugins"
                    description="Exposer les capacités de la marketplace de plugins lorsque le module est disponible."
                    checked={Boolean(settings.plugins_marketplace_enabled)}
                    onChange={(v) => updateSetting('plugins_marketplace_enabled', v)}
                  />
                  <ToggleRow
                    label="Email Marketing"
                    description="Exposer les capacités de l'add-on email marketing lorsque le module est disponible."
                    checked={Boolean(settings.email_marketing_enabled)}
                    onChange={(v) => updateSetting('email_marketing_enabled', v)}
                  />
                </div>
              </ReGoCard>

              <ReGoCard
                title="Modération & Contenus"
                subtitle="Règles de publication des produits et d'avis clients"
                icon={ShieldCheck}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <ToggleRow
                    label="Modération des Produits"
                    description="Exiger une revue administrateur avant la mise en ligne des produits de vendeurs non vérifiés."
                    checked={Boolean(settings.product_moderation_required)}
                    onChange={(v) => updateSetting('product_moderation_required', v)}
                  />
                  <ToggleRow
                    label="Publication Auto des Vendeurs Vérifiés"
                    description="Publier les produits des vendeurs vérifiés sans approbation manuelle."
                    checked={Boolean(settings.product_auto_publish_verified)}
                    onChange={(v) => updateSetting('product_auto_publish_verified', v)}
                  />
                  <ToggleRow
                    label={settings.seller_type_change_auto_approval ? 'Changement de Type Vendeur : Approbation Automatique' : 'Changement de Type Vendeur : Approbation Manuelle'}
                    description={
                      settings.seller_type_change_auto_approval
                        ? 'Les demandes de changement de type de vendeur sont approuvées automatiquement sans revue manuelle.'
                        : 'Chaque demande de changement de type de vendeur passe par une revue manuelle.'
                    }
                    checked={Boolean(settings.seller_type_change_auto_approval)}
                    onChange={(v) => updateSetting('seller_type_change_auto_approval', v)}
                  />
                  <ToggleRow
                    label="Avis Clients"
                    description="Autoriser les clients à soumettre des avis produits."
                    checked={Boolean(settings.reviews_enabled)}
                    onChange={(v) => updateSetting('reviews_enabled', v)}
                  />
                  <ToggleRow
                    label="Publication Auto des Avis"
                    description="Publier les nouveaux avis immédiatement après soumission."
                    checked={Boolean(settings.review_auto_publish)}
                    onChange={(v) => updateSetting('review_auto_publish', v)}
                  />
                </div>
              </ReGoCard>

              <ReGoCard
                title="Roue de Récompenses & Rétention (Widget Gamifié)"
                subtitle="Configuration du widget flottant, du libellé du bouton et des lots de la roue"
                icon={Gift}
              >
                <div className="space-y-3 text-xs">
                  <ToggleRow
                    label="Widget de Récompenses Gamifié"
                    description="Activer le widget flottant roue de récompenses et cartes à gratter sur les pages acheteurs."
                    checked={Boolean(settings.rewards_widget_enabled)}
                    onChange={(v) => updateSetting('rewards_widget_enabled', v)}
                  />
                  <TextInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="rewards_widget_button_label"
                    label="Libellé du Bouton Flottant"
                    placeholder="🎁 Gagnez jusqu'à 15 DT !"
                  />
                  <TextAreaInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="rewards_widget_prizes_json"
                    label="Lots & Coupons de la Roue (JSON)"
                    rows={6}
                    mono
                    hint="Tableau JSON des lots : label, code promo, remise, icône, couleur et description de chaque tranche de la roue."
                  />
                </div>
              </ReGoCard>

              <ReGoCard
                title="Taxes, Arrondis & Commandes Impayées"
                subtitle="Mode d'affichage des taxes, arrondi des prix et nettoyage automatique des commandes impayées"
                icon={Wallet}
              >
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SelectInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="tax_mode"
                      label="Mode de Taxe (TVA)"
                      options={[
                        { value: 'none', label: 'Aucun affichage de taxe' },
                        { value: 'included', label: 'Taxe incluse dans les prix' },
                        { value: 'exclusive', label: 'Taxe ajoutée au paiement' },
                      ]}
                    />
                    <NumberInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="default_tax_rate"
                      label="Taux de Taxe par Défaut (TVA)"
                      suffix="%"
                      min={0}
                      max={100}
                      step={0.1}
                    />
                    <SelectInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="price_rounding_mode"
                      label="Arrondi des Prix"
                      options={[
                        { value: 'none', label: 'Aucun arrondi' },
                        { value: 'nearest_0_001', label: 'Au 0.001 le plus proche' },
                        { value: 'nearest_0_010', label: 'Au 0.010 le plus proche' },
                        { value: 'nearest_0_100', label: 'Au 0.100 le plus proche' },
                      ]}
                    />
                    <NumberInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="auto_cancel_unpaid_minutes"
                      label="Annulation Auto Après"
                      suffix="minutes"
                      min={5}
                      max={10080}
                    />
                  </div>
                  <ToggleRow
                    label="Annulation Auto des Commandes Impayées"
                    description="Annuler automatiquement les commandes impayées après le délai configuré."
                    checked={Boolean(settings.auto_cancel_unpaid_enabled)}
                    onChange={(v) => updateSetting('auto_cancel_unpaid_enabled', v)}
                  />
                  <ToggleRow
                    label="Découpage des Commandes (Order Splitting)"
                    description="Lorsqu'activé, les paniers multi-vendeurs créent des commandes séparées par vendeur."
                    checked={Boolean(settings.order_splitting_enabled)}
                    onChange={(v) => updateSetting('order_splitting_enabled', v)}
                  />
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB: FINANCES & PAIEMENTS (section finance) */}
          {activeTab === 'finance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReGoCard
                  title="Commissions & Virements Vendeurs"
                  subtitle="Politique financière et calendrier des règlements"
                  icon={CreditCard}
                >
                  <div className="space-y-3 text-xs">
                    <NumberInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="platform_commission_rate"
                      label="Taux de Commission Plateforme par Défaut (%)"
                      min={0}
                      max={100}
                      step={0.5}
                      hint="Taux de commission de repli sur les ventes pour les boutiques sans abonnement payant actif."
                    />
                    <NumberInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="min_withdrawal_tnd"
                      label="Seuil Minimum de Retrait Portefeuille (TND)"
                      min={1}
                    />
                    <SelectInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="payout_schedule"
                      label="Fréquence des Virements Programmés"
                      options={[
                        { value: 'manual', label: 'Manuel' },
                        { value: 'daily', label: 'Quotidien (Daily)' },
                        { value: 'weekly', label: 'Hebdomadaire (Chaque Lundi)' },
                        { value: 'biweekly', label: 'Bimensuel (Le 1er et le 15)' },
                        { value: 'monthly', label: 'Mensuel' },
                      ]}
                    />
                    <TextInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="default_currency"
                      label="Devise de Règlement"
                      placeholder="TND"
                    />
                    <TextInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="invoice_platform_matricule_fiscal"
                      label="Matricule Fiscal de la Plateforme (Défaut Factures)"
                      placeholder="0001234/A/M/000"
                      mono
                      hint="Identifiant fiscal légal tunisien figurant sur les factures émises pour les acheteurs (Facture de Vente)."
                    />
                    <div className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--rego-fg,#111111)]">Commissions par Niveau d&apos;Abonnement</p>
                        <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                          Les plans payants prennent le pas sur le taux global de repli ({settings.platform_commission_rate}%).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('plans')}
                        className="px-2.5 py-1.5 text-[11px] font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:border-[var(--rego-accent,#ad0505)] shrink-0"
                      >
                        Gérer les Plans →
                      </button>
                    </div>
                  </div>
                </ReGoCard>

                <ReGoCard
                  title="Périodes de Rétention des Fonds"
                  subtitle="Nombre de jours de conservation des fonds avant disponibilité dans le portefeuille vendeur"
                  icon={Wallet}
                >
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <NumberInput settings={settings} updateSetting={updateSetting} k="retention_days_flouci" label="Flouci" suffix="jours" min={1} max={90} />
                    <NumberInput settings={settings} updateSetting={updateSetting} k="retention_days_konnect" label="Konnect" suffix="jours" min={1} max={90} />
                    <NumberInput settings={settings} updateSetting={updateSetting} k="retention_days_mandat" label="Mandat Minute" suffix="jours" min={1} max={90} />
                    <NumberInput settings={settings} updateSetting={updateSetting} k="retention_days_cod" label="COD (Paiement à la Livraison)" suffix="jours" min={1} max={90} />
                  </div>
                </ReGoCard>
              </div>

              <ReGoCard
                title="Remboursements Automatisés"
                subtitle="Traitement automatique des remboursements sur commandes livrées"
                icon={Wallet}
              >
                <div className="space-y-3 text-xs">
                  <ToggleRow
                    label="Remboursements Auto sur Commandes Livrées"
                    description="ON : les remboursements sur commandes LIVRÉES sont traités par le vendeur sans revue, jusqu'au seuil ci-dessous. OFF : chaque remboursement exige une revue superadmin. Les remboursements sur commandes non livrées exigent TOUJOURS une revue."
                    checked={Boolean(settings.refund_auto_process_delivered_enabled)}
                    onChange={(v) => updateSetting('refund_auto_process_delivered_enabled', v)}
                  />
                  <NumberInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="refund_auto_process_delivered_max_tnd"
                    label="Seuil de Remboursement Auto"
                    suffix={settings.default_currency || 'TND'}
                    min={0}
                    hint="Les remboursements sur commandes livrées à hauteur de ce montant ou moins sont traités automatiquement ; au-delà, ils passent toujours par la file de revue superadmin (Admin → Revue Remboursement)."
                  />
                </div>
              </ReGoCard>

              <ReGoCard
                title="Passerelles de Paiement Marketplace"
                subtitle="Activation des canaux de règlement disponibles aux acheteurs"
                icon={Zap}
              >
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <ToggleRow
                      label="Flouci"
                      description="Autoriser les paiements au checkout via Flouci."
                      checked={Boolean(settings.payment_flouci_enabled)}
                      onChange={(v) => updateSetting('payment_flouci_enabled', v)}
                    />
                    <ToggleRow
                      label="Konnect"
                      description="Autoriser les paiements au checkout via Konnect."
                      checked={Boolean(settings.payment_konnect_enabled)}
                      onChange={(v) => updateSetting('payment_konnect_enabled', v)}
                    />
                    <ToggleRow
                      label="PayPal (International)"
                      description="Autoriser les paiements internationaux au checkout via PayPal."
                      checked={Boolean(settings.payment_paypal_enabled)}
                      onChange={(v) => updateSetting('payment_paypal_enabled', v)}
                    />
                    <ToggleRow
                      label="Mandat Minute"
                      description="Autoriser les instructions de paiement manuel Mandat Minute."
                      checked={Boolean(settings.payment_mandat_enabled)}
                      onChange={(v) => updateSetting('payment_mandat_enabled', v)}
                    />
                    <ToggleRow
                      label="Paiement à la Livraison (COD)"
                      description="Autoriser les commandes COD lorsque c'est supporté."
                      checked={Boolean(settings.payment_cod_enabled)}
                      onChange={(v) => updateSetting('payment_cod_enabled', v)}
                    />
                    <ToggleRow
                      label="Mode Sandbox / Test"
                      description="Marquer la configuration de paiement comme mode test / préproduction."
                      checked={Boolean(settings.payment_sandbox_mode)}
                      onChange={(v) => updateSetting('payment_sandbox_mode', v)}
                    />
                    <ToggleRow
                      label="Identifiants Propres au Vendeur"
                      description="Autoriser les vendeurs éligibles à utiliser leurs identifiants de passerelle chiffrés."
                      checked={Boolean(settings.payment_vendor_direct_enabled)}
                      onChange={(v) => updateSetting('payment_vendor_direct_enabled', v)}
                    />
                  </div>
                  <SelectInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="payment_platform_credentials_source"
                    label="Source des Identifiants Plateforme"
                    options={[
                      { value: 'environment', label: "Secrets d'environnement" },
                      { value: 'platform_config', label: 'Métadonnées de configuration plateforme' },
                      { value: 'vendor_direct_only', label: 'Identifiants vendeur uniquement' },
                    ]}
                  />
                </div>
              </ReGoCard>

              <ReGoCard
                title="Configuration PayPal & Identifiants"
                subtitle="Identifiants API PayPal REST v2 (Sandbox et Live) à l'échelle de la plateforme"
                icon={CreditCard}
              >
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                    <SelectInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="payment_paypal_mode"
                      label="Mode d'Environnement Actif"
                      options={[
                        { value: 'sandbox', label: 'Sandbox (Test / Préproduction)' },
                        { value: 'live', label: 'Live (Production)' },
                      ]}
                    />
                    <TextInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="payment_paypal_currency"
                      label="Devise PayPal Cible"
                      placeholder="EUR or USD"
                    />
                    <NumberInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="payment_paypal_fx_rate_tnd_to_target"
                      label="Taux de Change TND (1 TND = X Devise Cible)"
                      min={0.01}
                      max={10}
                      step={0.01}
                      parse={(raw) => Number(raw) || 0.30}
                    />
                  </div>
                  <div className="space-y-3 p-3 rounded-[var(--rego-r,8px)] border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                      1. Identifiants Sandbox (Test)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <TextInput settings={settings} updateSetting={updateSetting} k="payment_paypal_sandbox_client_id" label="Sandbox Client ID" placeholder="e.g. AUaFWDFZE..." mono />
                      <TextInput settings={settings} updateSetting={updateSetting} k="payment_paypal_sandbox_client_secret" label="Sandbox Client Secret" placeholder="e.g. EE2-3eVt..." mono />
                    </div>
                    <TextInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="payment_paypal_sandbox_webhook_id"
                      label="Sandbox Webhook ID"
                      placeholder="e.g. 8WH12345678... (Assigné à l'enregistrement de l'URL Webhook dans le PayPal Dev Dashboard)"
                      mono
                    />
                  </div>
                  <div className="space-y-3 p-3 rounded-[var(--rego-r,8px)] border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                      2. Identifiants Live (Production)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <TextInput settings={settings} updateSetting={updateSetting} k="payment_paypal_live_client_id" label="Live Client ID" placeholder="e.g. BAAAmZT6..." mono />
                      <TextInput settings={settings} updateSetting={updateSetting} k="payment_paypal_live_client_secret" label="Live Client Secret" placeholder="e.g. EHDOvLKU..." mono />
                    </div>
                    <TextInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="payment_paypal_live_webhook_id"
                      label="Live Webhook ID"
                      placeholder="e.g. 9KL98765432..."
                      mono
                    />
                  </div>
                  <p className="text-[11px] text-[var(--rego-ink-2,#737373)] leading-relaxed bg-[var(--rego-surface,#f5f5f5)] p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]">
                    📌 <strong>Qu&apos;est-ce que le Webhook ID ?</strong> En ajoutant l&apos;URL Webhook de la plateforme
                    (<code className="font-mono">/api/pd/payments/webhook/paypal</code>) dans le PayPal Developer Dashboard sous Apps &amp; Credentials →
                    Webhooks, PayPal génère un <strong>Webhook ID</strong>. Collez-le ci-dessus afin que PandaMarket puisse vérifier cryptographiquement
                    chaque événement de paiement entrant.
                  </p>
                </div>
              </ReGoCard>

              <ReGoCard
                title="Mandat Minute — Bénéficiaire & Email de Preuve"
                subtitle="Coordonnées du bénéficiaire et adresse email où les clients soumettent les reçus de virement Mandat Minute"
                icon={Wallet}
              >
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TextInput settings={settings} updateSetting={updateSetting} k="mandat_recipient_name" label="Nom du Bénéficiaire" />
                    <TextInput settings={settings} updateSetting={updateSetting} k="mandat_recipient_cin" label="Numéro d'Identifiant (CIN / MF)" />
                    <TextInput settings={settings} updateSetting={updateSetting} k="mandat_recipient_city" label="Ville" />
                    <TextInput settings={settings} updateSetting={updateSetting} k="mandat_recipient_phone" label="Numéro de Téléphone du Bénéficiaire" />
                    <TextInput settings={settings} updateSetting={updateSetting} k="mandat_bank_name" label="Banque / Poste (ex : STB, La Poste)" />
                    <TextInput settings={settings} updateSetting={updateSetting} k="mandat_bank_rib" label="RIB (20 chiffres)" mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="mandat_bank_iban" label="IBAN (TN59...)" mono />
                  </div>
                  <TextInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="mandat_proof_email"
                    label="Adresse Email de Preuve de Paiement"
                    placeholder="e.g. billing@pandamarket.tn"
                    type="email"
                    mono
                  />
                  <div className="space-y-3 p-3 rounded-[var(--rego-r,8px)] border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                      Copie Rapide pour le Support & Demandes Acheteurs
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      <CopyChip label="Nom du Bénéficiaire" value={settings.mandat_recipient_name} />
                      <CopyChip label="CIN / Identifiant Fiscal" value={settings.mandat_recipient_cin} />
                      <CopyChip label="Ville" value={settings.mandat_recipient_city} />
                      <CopyChip label="Téléphone" value={settings.mandat_recipient_phone} />
                      <CopyChip label="Banque / Poste" value={settings.mandat_bank_name} />
                      <CopyChip label="RIB" value={settings.mandat_bank_rib} />
                      <CopyChip label="IBAN" value={settings.mandat_bank_iban} />
                      <CopyChip label="Email de Preuve" value={settings.mandat_proof_email} />
                    </div>
                    <CopyChip
                      label="Instructions Complètes de Virement"
                      value={[
                        settings.mandat_recipient_name ? `Bénéficiaire: ${settings.mandat_recipient_name}` : '',
                        settings.mandat_recipient_cin ? `CIN/MF: ${settings.mandat_recipient_cin}` : '',
                        settings.mandat_recipient_city ? `Ville: ${settings.mandat_recipient_city}` : '',
                        settings.mandat_bank_name ? `Banque: ${settings.mandat_bank_name}` : '',
                        settings.mandat_bank_rib ? `RIB: ${settings.mandat_bank_rib}` : '',
                        settings.mandat_bank_iban ? `IBAN: ${settings.mandat_bank_iban}` : '',
                        settings.mandat_recipient_phone ? `Tél: ${settings.mandat_recipient_phone}` : '',
                        settings.mandat_proof_email ? `Email preuve: ${settings.mandat_proof_email}` : '',
                      ]
                        .filter(Boolean)
                        .join(' | ')}
                    />
                  </div>
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB: LIVRAISON & ZONES (section shipping) */}
          {activeTab === 'shipping' && (
            <div className="space-y-4">
              <ReGoCard
                title="Transporteurs, Zones & Tarifs"
                subtitle="Transporteurs de la plateforme, origine par défaut, zones de villes et tarifs de repli utilisés au checkout"
                icon={Truck}
              >
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    <ToggleRow
                      label="Livraison Gérée par le Vendeur"
                      description="Autoriser les vendeurs à gérer leur propre logistique."
                      checked={Boolean(settings.shipping_self_managed_enabled)}
                      onChange={(v) => updateSetting('shipping_self_managed_enabled', v)}
                    />
                    <ToggleRow
                      label="Livraison Unifiée Plateforme"
                      description="Autoriser le calcul de transporteur et de tarifs de repli par la plateforme."
                      checked={Boolean(settings.shipping_platform_unified_enabled)}
                      onChange={(v) => updateSetting('shipping_platform_unified_enabled', v)}
                    />
                    <ToggleRow
                      label="Transporteur Aramex"
                      description="Inclure Aramex dans les devis de livraison plateforme lorsque les identifiants sont disponibles."
                      checked={Boolean(settings.shipping_aramex_enabled)}
                      onChange={(v) => updateSetting('shipping_aramex_enabled', v)}
                    />
                    <ToggleRow
                      label="Transporteur La Poste"
                      description="Inclure les estimations à tarif fixe de La Poste TN."
                      checked={Boolean(settings.shipping_laposte_enabled)}
                      onChange={(v) => updateSetting('shipping_laposte_enabled', v)}
                    />
                    <ToggleRow
                      label="Tarif de Repli Plateforme"
                      description="Renvoyer les tarifs fixes/zonés configurés lorsque les tarifs transporteurs en direct sont indisponibles."
                      checked={Boolean(settings.shipping_platform_fallback_enabled)}
                      onChange={(v) => updateSetting('shipping_platform_fallback_enabled', v)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <SelectInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="shipping_default_provider"
                      label="Transporteur par Défaut"
                      options={[
                        { value: 'auto', label: 'Auto' },
                        { value: 'aramex', label: 'Aramex' },
                        { value: 'laposte', label: 'La Poste' },
                        { value: 'platform', label: 'Repli Plateforme' },
                      ]}
                    />
                    <TextInput settings={settings} updateSetting={updateSetting} k="shipping_default_origin_city" label="Ville d'Origine par Défaut" placeholder="Tunis" />
                    <TextInput settings={settings} updateSetting={updateSetting} k="shipping_default_origin_country" label="Pays d'Origine par Défaut" placeholder="TN" />
                    <NumberInput settings={settings} updateSetting={updateSetting} k="shipping_platform_flat_rate_tnd" label="Tarif Fixe Standard" suffix="TND" min={0} max={1000} step={0.5} />
                    <NumberInput settings={settings} updateSetting={updateSetting} k="shipping_domestic_zone_rate_tnd" label="Tarif Zone Domestique" suffix="TND" min={0} max={1000} step={0.5} />
                    <NumberInput settings={settings} updateSetting={updateSetting} k="shipping_remote_zone_rate_tnd" label="Tarif Zone Éloignée" suffix="TND" min={0} max={1000} step={0.5} />
                    <NumberInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="shipping_free_shipping_threshold_tnd"
                      label="Seuil de Livraison Gratuite"
                      suffix="TND"
                      min={0}
                      max={100000}
                      hint="Montant du sous-total du panier au-delà duquel la livraison devient 100% gratuite."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TextAreaInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="shipping_domestic_zone_cities"
                      label="Villes de la Zone Domestique (Côtière)"
                      rows={2}
                      placeholder="Tunis,Ariana,Ben Arous,Manouba"
                      mono
                      hint="Liste des villes du tier standard (ex : Tunis, Ariana, Sousse, Sfax), séparées par des virgules."
                    />
                    <TextAreaInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="shipping_remote_zone_cities"
                      label="Villes de la Zone Éloignée (Sud)"
                      rows={2}
                      placeholder="Tozeur,Tataouine,Kebili"
                      mono
                      hint="Liste des villes de la zone étendue nécessitant des taux de fret plus élevés."
                    />
                  </div>
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB: SÉCURITÉ & CONNEXIONS (section security) */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <ReGoCard
                title="Double Authentification (2FA) du Compte"
                subtitle="Protégez votre compte administrateur avec la vérification en deux étapes"
                icon={Lock}
                noPadding
              >
                <div className="p-3">
                  <AccountTwoFactorPanel compact accentClass="bg-[var(--rego-accent,#ad0505)]" />
                </div>
              </ReGoCard>

              <ReGoCard
                title="Contrôles de Sécurité"
                subtitle="Verrouillage de connexion, règles de robustesse des mots de passe, 2FA par rôle et restrictions de domaines personnalisés"
                icon={ShieldCheck}
              >
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <NumberInput settings={settings} updateSetting={updateSetting} k="security_login_max_attempts" label="Tentatives de Connexion Échouées" suffix="tentatives" min={3} max={20} />
                    <NumberInput settings={settings} updateSetting={updateSetting} k="security_login_lockout_minutes" label="Fenêtre de Verrouillage" suffix="minutes" min={1} max={1440} />
                    <NumberInput settings={settings} updateSetting={updateSetting} k="security_password_min_length" label="Longueur Minimale du Mot de Passe" suffix="caractères" min={8} max={72} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    <ToggleRow
                      label="Exiger une Majuscule"
                      description="Les mots de passe nouveaux et réinitialisés doivent contenir au moins une majuscule."
                      checked={Boolean(settings.security_password_require_uppercase)}
                      onChange={(v) => updateSetting('security_password_require_uppercase', v)}
                    />
                    <ToggleRow
                      label="Exiger une Minuscule"
                      description="Les mots de passe nouveaux et réinitialisés doivent contenir au moins une minuscule."
                      checked={Boolean(settings.security_password_require_lowercase)}
                      onChange={(v) => updateSetting('security_password_require_lowercase', v)}
                    />
                    <ToggleRow
                      label="Exiger un Chiffre"
                      description="Les mots de passe nouveaux et réinitialisés doivent contenir au moins un chiffre."
                      checked={Boolean(settings.security_password_require_number)}
                      onChange={(v) => updateSetting('security_password_require_number', v)}
                    />
                    <ToggleRow
                      label="Exiger un Symbole"
                      description="Les mots de passe nouveaux et réinitialisés doivent contenir au moins un caractère non alphanumérique."
                      checked={Boolean(settings.security_password_require_symbol)}
                      onChange={(v) => updateSetting('security_password_require_symbol', v)}
                    />
                    <ToggleRow
                      label="Domaines Personnalisés"
                      description="Autoriser les vendeurs éligibles à attacher des domaines storefront personnalisés."
                      checked={Boolean(settings.security_custom_domains_enabled)}
                      onChange={(v) => updateSetting('security_custom_domains_enabled', v)}
                    />
                  </div>
                  <p className="text-[11px] font-semibold leading-relaxed text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-[var(--rego-r,8px)]">
                    L&apos;application du 2FA par rôle bloque l&apos;émission de jetons pour les rôles correspondants, sauf si le compte a déjà le 2FA activé.
                    Utilisez des rôles séparés par des virgules : customer, vendor, admin, super_admin.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <TextInput settings={settings} updateSetting={updateSetting} k="security_2fa_required_roles" label="Rôles avec 2FA Obligatoire" placeholder="admin,super_admin" mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="security_custom_domain_allowed_suffixes" label="Suffixes de Domaines Autorisés" placeholder="example.com,market.tn" mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="security_custom_domain_blocked_suffixes" label="Suffixes de Domaines Bloqués" placeholder="localhost,pandamarket.tn" mono />
                  </div>
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB: OPÉRATIONS & MAINTENANCE (section operations) */}
          {activeTab === 'operations' && (
            <div className="space-y-4">
              <ReGoCard
                title="Mode Maintenance de la Plateforme"
                subtitle="Suspension temporaire de l'accès public pour travaux — les administrateurs contournent automatiquement"
                icon={Construction}
              >
                <div className="space-y-3 text-xs">
                  {settings.maintenance_enabled && (
                    <div className="flex items-center gap-2 p-3 rounded-[var(--rego-r,8px)] border border-amber-300 dark:border-amber-800 bg-amber-100 dark:bg-amber-950/40">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Le mode maintenance est ACTIF</p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">La marketplace est actuellement indisponible pour les utilisateurs non-admin.</p>
                      </div>
                    </div>
                  )}
                  <div
                    className={`flex items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border-2 transition-all ${
                      settings.maintenance_enabled
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40'
                        : 'border-[var(--rego-border,#dedede)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[var(--rego-fg,#111111)]">Activer le Mode Maintenance</p>
                        <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                          Danger
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5 leading-relaxed">
                        Bloquer tout accès non-admin à la marketplace. La plateforme passe hors ligne immédiatement.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!settings.maintenance_enabled) {
                          setShowMaintenanceConfirm(true);
                        } else {
                          updateSetting('maintenance_enabled', false);
                        }
                      }}
                      className={`relative h-7 w-14 shrink-0 rounded-full transition-all duration-300 shadow-inner ${
                        settings.maintenance_enabled ? 'bg-rose-600' : 'bg-[var(--rego-surface,#e5e5e5)]'
                      }`}
                      aria-label="Activer le Mode Maintenance"
                    >
                      <span
                        className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white dark:bg-white shadow-sm transition-transform duration-300 ${
                          settings.maintenance_enabled ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <ToggleRow
                    label="Bloquer Aussi les Vitrines Marchandes"
                    description="Bloquer également l'accès à toutes les vitrines vendeurs (sous-domaines + domaines personnalisés)."
                    checked={Boolean(settings.maintenance_block_storefronts)}
                    onChange={(v) => updateSetting('maintenance_block_storefronts', v)}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextInput settings={settings} updateSetting={updateSetting} k="maintenance_title" label="Titre de l'Écran de Maintenance" placeholder="Maintenance en cours" />
                    <TextInput settings={settings} updateSetting={updateSetting} k="maintenance_eta" label="Retour Estimé (date ISO)" placeholder="2026-01-15T14:00:00Z" mono />
                  </div>
                  <TextAreaInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="maintenance_message"
                    label="Message Explicatif"
                    placeholder="Entrez un message à afficher pendant la maintenance..."
                  />
                  <div className="space-y-2">
                    <FieldShell
                      label="Illustration de Maintenance"
                      badge={<span className="text-[10px] font-semibold text-[var(--rego-ink-2,#737373)]">800×600px (4:3) • Max 1MB</span>}
                    >
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={settings.maintenance_illustration_url || ''}
                          onChange={(e) => updateSetting('maintenance_illustration_url', e.target.value)}
                          placeholder="/pd-themes/maintenance.webp"
                          className={REGO_INPUT_MONO_CLS}
                        />
                        {settings.maintenance_illustration_url && (
                          <div className="overflow-hidden rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]">
                            <img
                              src={getResizedImageUrl(settings.maintenance_illustration_url, 'medium')}
                              alt="Aperçu de l'illustration de maintenance"
                              className="h-36 w-full object-cover"
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setAssetPickerTarget('maintenance_illustration_url')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90"
                        >
                          <UploadCloud className="w-3.5 h-3.5" /> Choisir une illustration
                        </button>
                      </div>
                    </FieldShell>
                  </div>
                  <TextAreaInput
                    settings={settings}
                    updateSetting={updateSetting}
                    k="maintenance_allowed_ips"
                    label="IPs Autorisées (séparées par des virgules)"
                    rows={2}
                    placeholder="192.168.1.1, 10.0.0.5"
                    mono
                  />
                </div>
              </ReGoCard>

              <ReGoCard
                title="Limites de Téléversement"
                subtitle="Contrôle des médias produits et des limites d'inventaire vendeur par défaut"
                icon={ImageIcon}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <NumberInput settings={settings} updateSetting={updateSetting} k="max_upload_size_mb" label="Taille Max de Téléversement" suffix="MB" min={1} max={100} />
                  <NumberInput settings={settings} updateSetting={updateSetting} k="max_product_images" label="Images Max par Produit" suffix="images" min={1} max={50} />
                  <NumberInput settings={settings} updateSetting={updateSetting} k="max_products_per_store_free" label="Limite Produits Boutique Gratuite" suffix="produits" min={1} max={10000} />
                  <NumberInput settings={settings} updateSetting={updateSetting} k="default_low_stock_threshold" label="Seuil de Stock Faible" suffix="unités" min={0} max={1000} />
                </div>
              </ReGoCard>

              <ReGoCard
                title="Configurations des Tailles d'Images"
                subtitle="Variantes multi-tailles façon WordPress — chaque image téléversée est automatiquement redimensionnée selon ces préréglages"
                icon={ImageIcon}
              >
                <div className="space-y-3 text-xs">
                  {([
                    { preset: 'thumbnail', label: 'Thumbnail', desc: 'Mini-aperçus, avatars, listes admin', wKey: 'image_size_thumbnail_w', hKey: 'image_size_thumbnail_h', cropKey: 'image_size_thumbnail_crop' },
                    { preset: 'small', label: 'Small', desc: 'Cartes produit, articles panier, grilles', wKey: 'image_size_small_w', hKey: 'image_size_small_h', cropKey: 'image_size_small_crop' },
                    { preset: 'medium', label: 'Medium', desc: 'Vue détaillée produit, bannières catégorie', wKey: 'image_size_medium_w', hKey: 'image_size_medium_h', cropKey: 'image_size_medium_crop' },
                    { preset: 'large', label: 'Large', desc: 'Lightboxes, bannières hero, vue zoom', wKey: 'image_size_large_w', hKey: 'image_size_large_h', cropKey: 'image_size_large_crop' },
                  ]).map((p) => (
                    <div key={p.preset} className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)]/10 text-[var(--rego-accent,#ad0505)]">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-[var(--rego-fg,#111111)]">{p.label}</p>
                          <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">{p.desc}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <NumberInput settings={settings} updateSetting={updateSetting} k={p.wKey} label="Largeur" suffix="px" />
                        <NumberInput settings={settings} updateSetting={updateSetting} k={p.hKey} label="Hauteur" suffix="px" />
                        <SelectInput
                          settings={settings}
                          updateSetting={updateSetting}
                          k={p.cropKey}
                          label="Mode de Recadrage"
                          fallback="inside"
                          options={[
                            { value: 'cover', label: 'Cover (recadrer pour remplir)' },
                            { value: 'inside', label: 'Inside (ajuster sans recadrer)' },
                          ]}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <NumberInput settings={settings} updateSetting={updateSetting} k="image_quality_webp" label="Qualité de Sortie WebP" suffix="%" min={30} max={100} />
                  </div>
                  <p className="text-[11px] font-semibold leading-relaxed text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-[var(--rego-r,8px)]">
                    📌 Les modifications de tailles d&apos;images n&apos;affectent que les <strong>téléversements futurs</strong>. Pour appliquer les nouvelles
                    dimensions aux images existantes, utilisez l&apos;action <strong>« Régénérer Toutes les Variantes d&apos;Images »</strong> depuis la page
                    Médias de la Plateforme.
                  </p>
                </div>
              </ReGoCard>

              <ReGoCard
                title="Chat & Messagerie"
                subtitle="Limiter la fréquence des messages, le nombre d'images, leur taille et la longueur du texte pour tous les utilisateurs"
                icon={MessageSquare}
              >
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3">
                    <ToggleRow
                      label="Bulle de Chat Instantané"
                      description="Afficher ou masquer la bulle de chat flottante sur les pages marketplace et storefronts."
                      checked={Boolean(settings.chat_bubble_enabled)}
                      onChange={(v) => updateSetting('chat_bubble_enabled', v)}
                    />
                    <SelectInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="chat_bubble_position"
                      label="Position de la Bulle"
                      options={[
                        { value: 'bottom-right', label: 'Bas à Droite' },
                        { value: 'bottom-left', label: 'Bas à Gauche' },
                      ]}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <NumberInput settings={settings} updateSetting={updateSetting} k="chat_message_rate_limit_per_minute" label="Messages par Minute" suffix="messages" min={1} max={300} />
                    <NumberInput settings={settings} updateSetting={updateSetting} k="chat_max_images_per_message" label="Images par Message" suffix="images" min={1} max={10} />
                    <NumberInput settings={settings} updateSetting={updateSetting} k="chat_max_image_size_mb" label="Taille Max Image Chat" suffix="MB" min={1} max={25} />
                    <NumberInput settings={settings} updateSetting={updateSetting} k="chat_max_message_length" label="Longueur Max du Message" suffix="caractères" min={1} max={5000} />
                  </div>
                </div>
              </ReGoCard>

              <ReGoCard
                title="Notifications"
                subtitle="Notifications in-app, diffusion WebSocket temps réel, e-mails transactionnels et routage du fournisseur SMS OTP"
                icon={Bell}
              >
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <ToggleRow
                      label="Notifications In-App"
                      description="Créer des enregistrements de notifications pour acheteurs, vendeurs et admins."
                      checked={Boolean(settings.notifications_in_app_enabled)}
                      onChange={(v) => updateSetting('notifications_in_app_enabled', v)}
                    />
                    <ToggleRow
                      label="Push WebSocket Temps Réel"
                      description="Pousser instantanément les notifications in-app vers les utilisateurs connectés."
                      checked={Boolean(settings.notifications_realtime_enabled)}
                      onChange={(v) => updateSetting('notifications_realtime_enabled', v)}
                    />
                    <ToggleRow
                      label="E-mails Transactionnels"
                      description="Interrupteur principal de la livraison d'e-mails en file ; les identifiants SMTP restent sous l'onglet E-mails."
                      checked={Boolean(settings.notifications_email_enabled)}
                      onChange={(v) => updateSetting('notifications_email_enabled', v)}
                    />
                    <ToggleRow
                      label="Vérification SMS OTP"
                      description="Autoriser l'envoi de codes de vérification téléphonique via le fournisseur SMS configuré."
                      checked={Boolean(settings.notifications_sms_enabled)}
                      onChange={(v) => updateSetting('notifications_sms_enabled', v)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SelectInput
                      settings={settings}
                      updateSetting={updateSetting}
                      k="notifications_sms_provider"
                      label="Fournisseur SMS"
                      options={[
                        { value: 'environment', label: 'Défaut Environnement' },
                        { value: 'console', label: 'Repli Console / Log' },
                        { value: 'twilio', label: 'Twilio' },
                        { value: 'infobip', label: 'Infobip' },
                        { value: 'whatsapp_gateway', label: 'Passerelle WhatsApp (Evolution API)' },
                      ]}
                    />
                    <TextInput settings={settings} updateSetting={updateSetting} k="notifications_sms_sender_name" label="Nom d'Expéditeur SMS" placeholder="PandaMarket" />
                  </div>
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB: INTÉGRATIONS & WEBMASTER (section integrations) */}
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <ReGoCard
                title="Télémétrie & Outils Webmaster"
                subtitle="Balises de suivi publiques et métadonnées de vérification de propriété injectées dans le shell marketplace"
                icon={BarChart3}
              >
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <ToggleRow
                      label="Google Analytics 4"
                      description="Injecter la balise de mesure GA4 configurée sur les pages publiques."
                      checked={Boolean(settings.analytics_ga4_enabled)}
                      onChange={(v) => updateSetting('analytics_ga4_enabled', v)}
                    />
                    <ToggleRow
                      label="Google Tag Manager"
                      description="Injecter le script conteneur GTM configuré et l'iframe noscript."
                      checked={Boolean(settings.analytics_gtm_enabled)}
                      onChange={(v) => updateSetting('analytics_gtm_enabled', v)}
                    />
                    <ToggleRow
                      label="Meta Pixel"
                      description="Injecter le code de base Meta Pixel configuré et le repli image."
                      checked={Boolean(settings.analytics_meta_pixel_enabled)}
                      onChange={(v) => updateSetting('analytics_meta_pixel_enabled', v)}
                    />
                  </div>
                  <p className="text-[11px] font-semibold leading-relaxed text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-[var(--rego-r,8px)]">
                    Les identifiants analytics sont publics par conception. Ne collez pas de secrets API, de jetons privés ou de jetons API Cloudflare ici.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextInput settings={settings} updateSetting={updateSetting} k="analytics_ga4_measurement_id" label="GA4 Measurement ID" placeholder="G-XXXXXXXXXX" mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="analytics_gtm_container_id" label="GTM Container ID" placeholder="GTM-XXXXXXX" mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="analytics_meta_pixel_id" label="Meta Pixel ID" placeholder="123456789012345" mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="search_console_verification" label="Jeton de Vérification Search Console" placeholder="google-site-verification token" mono />
                  </div>
                </div>
              </ReGoCard>

              <ReGoCard
                title="Métadonnées Cloudflare"
                subtitle="Identifiants de compte et de zone Cloudflare non secrets pour la visibilité opérationnelle et l'automatisation future des hostnames personnalisés"
                icon={Globe2}
              >
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <ToggleRow
                      label="Intégration Cloudflare"
                      description="Marquer Cloudflare comme intégration CDN/DNS active pour la marketplace."
                      checked={Boolean(settings.cloudflare_integration_enabled)}
                      onChange={(v) => updateSetting('cloudflare_integration_enabled', v)}
                    />
                    <ToggleRow
                      label="Automatisation Custom Hostname"
                      description="Autoriser la future automatisation des domaines personnalisés à utiliser les métadonnées Cloudflare SaaS."
                      checked={Boolean(settings.cloudflare_custom_hostnames_enabled)}
                      onChange={(v) => updateSetting('cloudflare_custom_hostnames_enabled', v)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextInput settings={settings} updateSetting={updateSetting} k="cloudflare_account_id" label="Cloudflare Account ID" placeholder="identifiant de compte" mono />
                    <TextInput settings={settings} updateSetting={updateSetting} k="cloudflare_zone_id" label="Cloudflare Zone ID" placeholder="identifiant de zone" mono />
                  </div>
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB: E-MAILS TRANSACTIONNELS (éditeur complet via l'admin classique) */}
          {activeTab === 'email' && (
            <ReGoCard
              title="Configuration SMTP & Modèles d'E-mails"
              subtitle="Envoi transactionnel, identité de l'expéditeur, mot de passe chiffré et test de livraison"
              icon={Mail}
            >
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]">
                  <Server className="w-4 h-4 text-[var(--rego-accent,#ad0505)] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-[var(--rego-fg,#111111)]">Envoi d&apos;e-mails transactionnels</p>
                    <p className="text-[11px] text-[var(--rego-ink-2,#737373)] leading-relaxed">
                      La configuration SMTP complète (hôte, port, mot de passe chiffré, préréglages fournisseurs Brevo / Resend / Gmail / Outlook, test de
                      connexion) et le gestionnaire des modèles d&apos;e-mails transactionnels de la marketplace sont gérés dans l&apos;éditeur dédié de
                      l&apos;administration Classique.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenEmailSettings}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ouvrir l&apos;Éditeur E-mail Complet</span>
                </button>
                <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                  L&apos;interrupteur principal de la livraison d&apos;e-mails reste disponible ici : onglet « Opérations &amp; Maintenance » → Notifications →
                  E-mails Transactionnels.
                </p>
              </div>
            </ReGoCard>
          )}

          {/* TAB: PLANS D'ABONNEMENT (rendu du même éditeur que l'admin classique) */}
          {activeTab === 'plans' && (
            <ReGoCard
              title="Plans d'Abonnement Vendeurs"
              subtitle="Tarifs, quotas et matrice de fonctionnalités par plan"
              icon={Crown}
              noPadding
            >
              <div className="p-1">
                <AdminPlansPage />
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
              <h4 className="text-base text-blue-800 dark:text-blue-300 hover:underline cursor-pointer font-medium">
                {settings.marketplace_name} — {settings.marketplace_tagline}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Découvrez {settings.marketplace_name || 'PandaMarket'}, la première place de marché moderne en Tunisie. Vendez et achetez en toute sécurité
                avec livraison partout en Tunisie.
              </p>
            </div>
          </div>
        </ReGoDrawer>
      }
      modals={
        <>
          <MarketplaceAssetPicker
            open={assetPickerTarget !== null}
            title={assetPickerTitle}
            type="image"
            onClose={() => setAssetPickerTarget(null)}
            onSelect={(url) => {
              if (assetPickerTarget) updateSetting(assetPickerTarget, url);
              setAssetPickerTarget(null);
            }}
          />
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
              Seuls les comptes administrateurs pourront naviguer sur la plateforme. Tous les acheteurs et vendeurs verront l&apos;écran d&apos;attente de
              maintenance.
            </p>
          </ReGoModal>
        </>
      }
    />
  );
}

