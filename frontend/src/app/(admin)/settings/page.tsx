'use client';

import { fetchWithCsrf } from '@/lib/api';
import { MarketplaceAssetPicker } from '@/components/admin/MarketplaceAssetPicker';
import { AccountTwoFactorPanel } from '@/components/AccountTwoFactorPanel';
import { EmailTemplateManager } from '@/components/email/EmailTemplateManager';
import { type ReactNode, useEffect, useState } from 'react';
import { MessageSquare, Settings, Save, RotateCcw, Store, Wallet, Image as ImageIcon, ShieldCheck, ToggleLeft, UploadCloud, Construction, AlertTriangle, Headphones, Mail, Server, Send, CheckCircle2, XCircle, Eye, EyeOff, Shield, Globe2, SlidersHorizontal, CreditCard } from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';

interface PlatformSettings {
  marketplace_name: string;
  marketplace_tagline: string;
  marketplace_logo_url: string;
  marketplace_favicon_url: string;
  marketplace_og_image_url: string;
  marketplace_public_url: string;
  marketplace_theme: 'panda' | 'aliexpress' | 'aliexpress2';
  marketplace_support_email: string;
  marketplace_support_phone: string;
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
  marketplace_help_url: string;
  marketplace_terms_url: string;
  marketplace_privacy_url: string;
  marketplace_contact_url: string;
  chat_bubble_enabled: boolean;
  chat_bubble_position: 'bottom-right' | 'bottom-left';
  marketplace_enabled: boolean;
  vendor_registration_enabled: boolean;
  buyer_registration_enabled: boolean;
  product_moderation_required: boolean;
  product_auto_publish_verified: boolean;
  seller_type_change_auto_approval: boolean;
  reviews_enabled: boolean;
  review_auto_publish: boolean;
  wishlist_enabled: boolean;
  cart_enabled: boolean;
  shipping_enabled: boolean;
  order_splitting_enabled: boolean;
  retention_days_flouci: number;
  retention_days_konnect: number;
  retention_days_mandat: number;
  retention_days_cod: number;
  min_withdrawal_tnd: number;
  max_upload_size_mb: number;
  max_product_images: number;
  max_products_per_store_free: number;
  default_low_stock_threshold: number;
  chat_message_rate_limit_per_minute: number;
  chat_max_images_per_message: number;
  chat_max_image_size_mb: number;
  chat_max_message_length: number;
  maintenance_enabled: boolean;
  maintenance_title: string;
  maintenance_message: string;
  maintenance_eta: string;
  maintenance_allowed_ips: string;
  maintenance_block_storefronts: boolean;
  mandat_recipient_name: string;
  mandat_recipient_cin: string;
  mandat_recipient_city: string;
  platform_commission_rate: number;
  default_currency: string;
}

type SettingsTab = 'marketplace' | 'commerce' | 'finance' | 'operations' | 'email';

interface SmtpConfigPublic {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass_set: boolean;
  smtp_secure: boolean;
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_enabled: boolean;
}

interface SmtpFormData {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: boolean;
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_enabled: boolean;
}

type SmtpTestStatus = 'idle' | 'testing' | 'success' | 'error';

const DEFAULT_SETTINGS: PlatformSettings = {
  marketplace_name: 'PandaMarket',
  marketplace_tagline: 'Le marketplace tunisien pour boutiques modernes',
  marketplace_logo_url: '',
  marketplace_favicon_url: '/favicon.ico',
  marketplace_og_image_url: '/og-image.png',
  marketplace_public_url: 'https://pandamarket.tn',
  marketplace_theme: 'panda',
  marketplace_support_email: 'support@pandamarket.tn',
  marketplace_support_phone: '',
  marketplace_facebook_url: '',
  marketplace_instagram_url: '',
  marketplace_x_url: '',
  marketplace_tiktok_url: '',
  marketplace_youtube_url: '',
  marketplace_linkedin_url: '',
  marketplace_whatsapp_url: '',
  marketplace_telegram_url: '',
  marketplace_pinterest_url: '',
  marketplace_snapchat_url: '',
  marketplace_help_url: '/hub/search',
  marketplace_terms_url: '/hub/search',
  marketplace_privacy_url: '/hub/search',
  marketplace_contact_url: '/hub/search',
  chat_bubble_enabled: true,
  chat_bubble_position: 'bottom-right',
  marketplace_enabled: true,
  vendor_registration_enabled: true,
  buyer_registration_enabled: true,
  product_moderation_required: true,
  product_auto_publish_verified: true,
  seller_type_change_auto_approval: false,
  reviews_enabled: true,
  review_auto_publish: true,
  wishlist_enabled: true,
  cart_enabled: true,
  shipping_enabled: true,
  order_splitting_enabled: true,
  retention_days_flouci: 7,
  retention_days_konnect: 7,
  retention_days_mandat: 14,
  retention_days_cod: 14,
  min_withdrawal_tnd: 20,
  max_upload_size_mb: 10,
  max_product_images: 10,
  max_products_per_store_free: 50,
  default_low_stock_threshold: 5,
  chat_message_rate_limit_per_minute: 20,
  chat_max_images_per_message: 4,
  chat_max_image_size_mb: 5,
  chat_max_message_length: 5000,
  mandat_recipient_name: 'PandaMarket SARL',
  mandat_recipient_cin: '',
  mandat_recipient_city: 'Tunis',
  platform_commission_rate: 15,
  default_currency: 'TND',
  maintenance_enabled: false,
  maintenance_title: 'Maintenance en cours',
  maintenance_message: 'Notre plateforme est en cours de maintenance. Nous serons de retour très bientôt.',
  maintenance_eta: '',
  maintenance_allowed_ips: '',
  maintenance_block_storefronts: false,
};

const DEFAULT_SMTP_FORM: SmtpFormData = {
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_pass: '',
  smtp_secure: false,
  smtp_from_name: 'PandaMarket',
  smtp_from_email: 'noreply@pandamarket.tn',
  smtp_enabled: false,
};

const SMTP_PROVIDER_PRESETS: Record<string, { host: string; port: number; secure: boolean; label: string }> = {
  brevo: { host: 'smtp-relay.brevo.com', port: 587, secure: false, label: 'Brevo' },
  resend: { host: 'smtp.resend.com', port: 465, secure: true, label: 'Resend' },
  gmail: { host: 'smtp.gmail.com', port: 587, secure: false, label: 'Gmail' },
  outlook: { host: 'smtp-mail.outlook.com', port: 587, secure: false, label: 'Outlook' },
  mailgun: { host: 'smtp.mailgun.org', port: 587, secure: false, label: 'Mailgun' },
  sendgrid: { host: 'smtp.sendgrid.net', port: 587, secure: false, label: 'SendGrid' },
  custom: { host: '', port: 587, secure: false, label: 'Custom' },
};

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string; description: string; icon: typeof Store }> = [
  { id: 'marketplace', label: 'Marketplace', description: 'Identity, branding, social and footer links', icon: Globe2 },
  { id: 'commerce', label: 'Commerce', description: 'Availability, moderation and order workflows', icon: SlidersHorizontal },
  { id: 'finance', label: 'Finance', description: 'Commissions, payouts and payment instructions', icon: CreditCard },
  { id: 'operations', label: 'Operations', description: 'Security, maintenance, upload and chat limits', icon: Shield },
  { id: 'email', label: 'Email', description: 'SMTP provider, sender identity and test email', icon: Mail },
];

type BooleanSettingKey = {
  [K in keyof PlatformSettings]: PlatformSettings[K] extends boolean ? K : never;
}[keyof PlatformSettings];

type NumberSettingKey = {
  [K in keyof PlatformSettings]: PlatformSettings[K] extends number ? K : never;
}[keyof PlatformSettings];

type StringSettingKey = {
  [K in keyof PlatformSettings]: PlatformSettings[K] extends string ? K : never;
}[keyof PlatformSettings];

const TEXT_SETTING_KEYS = [
  'marketplace_name',
  'marketplace_tagline',
  'marketplace_logo_url',
  'marketplace_favicon_url',
  'marketplace_og_image_url',
  'marketplace_public_url',
  'marketplace_support_email',
  'marketplace_support_phone',
  'marketplace_facebook_url',
  'marketplace_instagram_url',
  'marketplace_x_url',
  'marketplace_tiktok_url',
  'marketplace_youtube_url',
  'marketplace_linkedin_url',
  'marketplace_whatsapp_url',
  'marketplace_telegram_url',
  'marketplace_pinterest_url',
  'marketplace_snapchat_url',
  'marketplace_help_url',
  'marketplace_terms_url',
  'marketplace_privacy_url',
  'marketplace_contact_url',
  'mandat_recipient_name',
  'mandat_recipient_cin',
  'mandat_recipient_city',
  'maintenance_title',
  'maintenance_message',
  'maintenance_eta',
  'maintenance_allowed_ips',
] as const satisfies readonly StringSettingKey[];

const NUMBER_SETTING_KEYS = [
  'retention_days_flouci',
  'retention_days_konnect',
  'retention_days_mandat',
  'retention_days_cod',
  'min_withdrawal_tnd',
  'max_upload_size_mb',
  'max_product_images',
  'max_products_per_store_free',
  'default_low_stock_threshold',
  'platform_commission_rate',
  'chat_message_rate_limit_per_minute',
  'chat_max_images_per_message',
  'chat_max_image_size_mb',
  'chat_max_message_length',
] as const satisfies readonly NumberSettingKey[];

const BOOLEAN_SETTING_KEYS = [
  'marketplace_enabled',
  'vendor_registration_enabled',
  'buyer_registration_enabled',
  'product_moderation_required',
  'product_auto_publish_verified',
  'seller_type_change_auto_approval',
  'reviews_enabled',
  'review_auto_publish',
  'wishlist_enabled',
  'cart_enabled',
  'shipping_enabled',
  'order_splitting_enabled',
  'chat_bubble_enabled',
  'maintenance_enabled',
  'maintenance_block_storefronts',
] as const satisfies readonly BooleanSettingKey[];

interface ToggleSetting {
  key: BooleanSettingKey;
  label: string;
  description: string;
}

function buildSettingsPayload(current: PlatformSettings): PlatformSettings {
  const payload: PlatformSettings = { ...DEFAULT_SETTINGS, ...current };

  for (const key of TEXT_SETTING_KEYS) {
    payload[key] = String(payload[key] ?? '').trim();
  }

  for (const key of NUMBER_SETTING_KEYS) {
    const value = Number(payload[key]);
    payload[key] = Number.isFinite(value) ? value : DEFAULT_SETTINGS[key];
  }

  for (const key of BOOLEAN_SETTING_KEYS) {
    payload[key] = Boolean(payload[key]);
  }

  payload.marketplace_theme = payload.marketplace_theme === 'aliexpress2' ? 'aliexpress2' : payload.marketplace_theme === 'aliexpress' ? 'aliexpress' : 'panda';
  payload.chat_bubble_position = payload.chat_bubble_position === 'bottom-left' ? 'bottom-left' : 'bottom-right';
  payload.default_currency = String(payload.default_currency || DEFAULT_SETTINGS.default_currency).trim().toUpperCase();

  return payload;
}

async function getSettingsErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json() as {
      error?: { message?: string; details?: { fields?: Record<string, string> } };
      message?: string;
    };
    const message = data.error?.message || data.message || fallback;
    const fields = data.error?.details?.fields;
    if (fields && Object.keys(fields).length > 0) {
      return `${message}: ${Object.entries(fields).map(([field, error]) => `${field} ${error}`).join(', ')}`;
    }
    return message;
  } catch {
    try {
      const text = await res.text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4 border-b border-slate-100 pb-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-red-50 text-[#B91C1C] shadow-inner">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-black tracking-tight text-slate-950">{title}</h3>
        <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { t } = useLocale();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [marketplaceLogoPickerOpen, setMarketplaceLogoPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('marketplace');
  const [smtpForm, setSmtpForm] = useState<SmtpFormData>(DEFAULT_SMTP_FORM);
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false);
  const [smtpLoading, setSmtpLoading] = useState(true);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpError, setSmtpError] = useState('');
  const [smtpSelectedPreset, setSmtpSelectedPreset] = useState('custom');
  const [smtpShowPassword, setSmtpShowPassword] = useState(false);
  const [smtpTestStatus, setSmtpTestStatus] = useState<SmtpTestStatus>('idle');
  const [smtpTestMessage, setSmtpTestMessage] = useState('');
  const [smtpTestEmail, setSmtpTestEmail] = useState('');

  function updateSetting<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateSmtpField<K extends keyof SmtpFormData>(key: K, value: SmtpFormData[K]) {
    setSmtpForm((prev) => ({ ...prev, [key]: value }));
    setSmtpSaved(false);
    setSmtpError('');
  }

  function applySmtpPreset(presetKey: string) {
    setSmtpSelectedPreset(presetKey);
    const preset = SMTP_PROVIDER_PRESETS[presetKey];
    if (preset && presetKey !== 'custom') {
      setSmtpForm((prev) => ({
        ...prev,
        smtp_host: preset.host,
        smtp_port: preset.port,
        smtp_secure: preset.secure,
      }));
      setSmtpSaved(false);
      setSmtpError('');
    }
  }

  function renderToggle({ key, label, description }: ToggleSetting) {
    return (
      <div key={key} className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-stone-50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md">
        <div className="pr-4">
          <p className="text-sm font-bold text-slate-900">{label}</p>
          <p className="mt-1 text-xs font-medium text-slate-500 leading-relaxed">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => updateSetting(key, !settings[key])}
          className={`relative h-7 w-14 shrink-0 rounded-full transition-all duration-300 shadow-inner ${
            settings[key] ? 'bg-[#B91C1C] shadow-red-900/20' : 'bg-slate-200'
          }`}
        >
          <span
            className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
              settings[key] ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    );
  }

  function renderNumberInput<K extends NumberSettingKey>(
    key: K,
    label: string,
    suffix: string,
    min: number,
    max?: number,
    step?: number,
  ) {
    return (
      <div key={key} className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={settings[key]}
            onChange={(e) => updateSetting(key, Number(e.target.value) as PlatformSettings[K])}
            className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
          />
          <span className="text-sm font-bold text-slate-400 shrink-0">{suffix}</span>
        </div>
      </div>
    );
  }

  function renderTextInput<K extends StringSettingKey>(key: K, label: string, placeholder = '') {
    return (
      <div key={key} className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">{label}</label>
        <input
          type="text"
          value={settings[key]}
          placeholder={placeholder}
          onChange={(e) => updateSetting(key, e.target.value as PlatformSettings[K])}
          className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
        />
      </div>
    );
  }

  function renderMarketplaceThemeSelector() {
    const themeOptions = [
      {
        id: 'panda' as const,
        name: 'PandaMarket Classic',
        description: 'Classic red and gold marketplace homepage with clear hierarchy and elegant service blocks.',
        colors: ['#B91C1C', '#C6922E', '#FAF7F0'],
      },
      {
        id: 'aliexpress' as const,
        name: 'AliExpress Style',
        description: 'Red/orange deal-focused marketplace with category rail, coupons, and flash offers.',
        colors: ['#FF4747', '#FF7A00', '#FFF3E8'],
      },
      {
        id: 'aliexpress2' as const,
        name: 'AliExpress 2.0 (Super Deal)',
        description: 'Sharper, sleeker, ultra-modern "Super Deal" aesthetic with heavy glassmorphism.',
        colors: ['#FF4747', '#FF8A00', '#FAFAFA'],
      },
    ];

    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {themeOptions.map((theme) => {
          const selected = settings.marketplace_theme === theme.id;
          return (
            <button
              type="button"
              key={theme.id}
              onClick={() => updateSetting('marketplace_theme', theme.id)}
              className={`rounded-[1.5rem] border-2 p-5 text-left transition-all duration-300 group ${
                selected ? 'border-[#B91C1C] bg-amber-50/60 shadow-lg shadow-red-900/10' : 'border-slate-100 bg-white hover:border-amber-200 hover:shadow-md'
              }`}
            >
              <div className="mb-4 overflow-hidden rounded-xl border border-white/70 bg-white shadow-sm ring-1 ring-slate-900/5">
                <div className="flex h-12 items-center gap-1 px-3" style={{ backgroundColor: theme.colors[2] }}>
                  {theme.colors.map((color) => (
                    <span key={color} className="h-5 flex-1 rounded-md shadow-sm" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 p-3">
                  <span className="h-8 rounded-lg bg-slate-100" />
                  <span className="h-8 rounded-lg bg-slate-100" />
                  <span className="h-8 rounded-lg bg-slate-100" />
                </div>
              </div>
              <p className={`font-bold ${selected ? 'text-[#7F1D1D]' : 'text-slate-900'}`}>{theme.name}</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{theme.description}</p>
            </button>
          );
        })}
      </div>
    );
  }

  useEffect(() => {
    let active = true;
    async function fetchSettings() {
      setLoading(true);
      setError('');
      try {
        const res = await fetchWithCsrf('/api/pd/admin/settings', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load platform settings');
        const data = await res.json();
        if (active) setSettings({ ...DEFAULT_SETTINGS, ...(data.data || {}) });
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load platform settings');
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchSettings();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchSmtpConfig() {
      setSmtpLoading(true);
      setSmtpError('');
      try {
        const res = await fetchWithCsrf('/api/pd/admin/smtp-config', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load email configuration');
        const { data } = (await res.json()) as { data: SmtpConfigPublic };
        if (!active) return;
        setSmtpForm({
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          smtp_user: data.smtp_user,
          smtp_pass: '',
          smtp_secure: data.smtp_secure,
          smtp_from_name: data.smtp_from_name,
          smtp_from_email: data.smtp_from_email,
          smtp_enabled: data.smtp_enabled,
        });
        setSmtpPasswordSet(data.smtp_pass_set);
        const matchedPreset = Object.entries(SMTP_PROVIDER_PRESETS).find(
          ([key, preset]) => key !== 'custom' && preset.host === data.smtp_host,
        );
        setSmtpSelectedPreset(matchedPreset ? matchedPreset[0] : 'custom');
      } catch (err) {
        if (active) setSmtpError(err instanceof Error ? err.message : 'Failed to load email configuration');
      } finally {
        if (active) setSmtpLoading(false);
      }
    }
    fetchSmtpConfig();
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload = buildSettingsPayload(settings);
      const res = await fetchWithCsrf('/api/pd/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSettings(payload);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(await getSettingsErrorMessage(res, 'Failed to save platform settings'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save platform settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleSmtpSave() {
    if (!smtpForm.smtp_host) {
      setSmtpError('SMTP host is required before saving email configuration');
      return;
    }

    setSmtpSaving(true);
    setSmtpError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/smtp-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(smtpForm),
      });
      if (res.ok) {
        setSmtpSaved(true);
        if (smtpForm.smtp_pass) {
          setSmtpPasswordSet(true);
          setSmtpForm((prev) => ({ ...prev, smtp_pass: '' }));
        }
        setTimeout(() => setSmtpSaved(false), 3000);
      } else {
        setSmtpError(await getSettingsErrorMessage(res, 'Failed to save email configuration'));
      }
    } catch (err) {
      setSmtpError(err instanceof Error ? err.message : 'Failed to save email configuration');
    } finally {
      setSmtpSaving(false);
    }
  }

  async function handleSmtpTest() {
    setSmtpTestStatus('testing');
    setSmtpTestMessage('');
    try {
      const payload: Record<string, unknown> = {};
      if (smtpForm.smtp_host) {
        payload.smtp_host = smtpForm.smtp_host;
        payload.smtp_port = smtpForm.smtp_port;
        payload.smtp_user = smtpForm.smtp_user;
        payload.smtp_pass = smtpForm.smtp_pass || undefined;
        payload.smtp_secure = smtpForm.smtp_secure;
        payload.smtp_from_name = smtpForm.smtp_from_name;
        payload.smtp_from_email = smtpForm.smtp_from_email;
      }
      if (smtpTestEmail) payload.recipient_email = smtpTestEmail;

      const res = await fetchWithCsrf('/api/pd/admin/smtp-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const result = (await res.json()) as { success: boolean; message: string };
      setSmtpTestStatus(result.success ? 'success' : 'error');
      setSmtpTestMessage(result.message);
    } catch {
      setSmtpTestStatus('error');
      setSmtpTestMessage('Network error — could not reach the server');
    }
  }

  return (
    <div className="relative mx-auto max-w-7xl space-y-8 pb-12">
      <div className="overflow-hidden rounded-[2rem] border border-amber-100 bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-7 text-white shadow-2xl shadow-red-950/10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-amber-200/30 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-100">
              Superadmin control center
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Platform Settings</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-white/75">
              Configure marketplace identity, availability, payments, moderation, maintenance, uploads, and communication limits from one clear settings surface.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[360px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-100">Marketplace</p>
              <p className="mt-2 text-lg font-black">{settings.marketplace_enabled ? 'Online' : 'Paused'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-100">Theme</p>
              <p className="mt-2 text-lg font-black capitalize">{settings.marketplace_theme}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-40 -mx-4 flex flex-col gap-4 rounded-b-3xl border-b border-amber-100 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-xl sm:-mx-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B91C1C] text-white shadow-lg shadow-red-900/20">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">Settings editor</h2>
            <p className="text-sm font-medium text-slate-500">Review changes carefully, then save once.</p>
          </div>
        </div>
        <button
          onClick={activeTab === 'email' ? handleSmtpSave : handleSave}
          disabled={activeTab === 'email' ? smtpSaving || smtpLoading : saving}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#B91C1C] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/25 transition-all hover:-translate-y-0.5 hover:bg-[#991B1B] hover:shadow-red-900/30 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {activeTab === 'email'
            ? smtpSaving ? <RotateCcw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />
            : saving ? <RotateCcw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {activeTab === 'email' ? smtpSaved ? 'Email Saved!' : 'Save Email Config' : saved ? 'Saved Successfully!' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">Loading settings...</div>}

      <div className="grid gap-3 rounded-[2rem] border border-slate-200/70 bg-white p-3 shadow-xl shadow-slate-200/40 lg:grid-cols-5">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-[96px] items-start gap-3 rounded-[1.35rem] border p-4 text-left transition-all ${
                selected
                  ? 'border-[#B91C1C]/35 bg-gradient-to-br from-amber-50 to-red-50 text-[#7F1D1D] shadow-md shadow-red-900/10'
                  : 'border-transparent bg-white text-slate-600 hover:border-amber-100 hover:bg-stone-50'
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${selected ? 'bg-[#B91C1C] text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-black">{tab.label}</span>
                <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">{tab.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={activeTab === 'operations' ? 'rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-xl shadow-slate-200/40' : 'hidden'}>
        <AccountTwoFactorPanel accentClass="bg-[#B91C1C]" />
      </div>

      <section className={`${activeTab === 'operations' ? '' : 'hidden'} rounded-[2rem] border p-8 shadow-xl transition-all ${
            settings.maintenance_enabled
              ? 'border-amber-300/60 bg-amber-50/70 shadow-amber-500/10'
              : 'border-slate-200/70 bg-white shadow-slate-200/40'
          }`}>
        <SectionHeader
          icon={<Construction className="h-5 w-5" />}
          title="Maintenance Mode"
          description="Put the entire marketplace under maintenance. Admins bypass automatically."
        />

        {settings.maintenance_enabled && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-100 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Maintenance mode is ACTIVE</p>
              <p className="text-xs text-amber-700">The marketplace is currently unavailable to non-admin users.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderToggle({
            key: 'maintenance_enabled',
            label: 'Enable Maintenance Mode',
            description: 'Block all non-admin access to the marketplace.',
          })}
          {renderToggle({
            key: 'maintenance_block_storefronts',
            label: 'Block Storefronts Too',
            description: 'Also block access to all vendor storefronts (subdomains + custom domains).',
          })}
          <div className="md:col-span-2">
            {renderTextInput('maintenance_title', 'Maintenance Title', 'Maintenance en cours')}
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Maintenance Message</label>
            <textarea
              value={settings.maintenance_message}
              onChange={(e) => updateSetting('maintenance_message', e.target.value)}
              placeholder="Enter a message to display during maintenance..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none transition-all text-sm font-medium text-slate-700 resize-none"
            />
          </div>
          {renderTextInput('maintenance_eta', 'Estimated Return (ISO date)', '2026-01-15T14:00:00Z')}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Allowed IPs (comma-separated)</label>
            <textarea
              value={settings.maintenance_allowed_ips}
              onChange={(e) => updateSetting('maintenance_allowed_ips', e.target.value)}
              placeholder="192.168.1.1, 10.0.0.5"
              rows={2}
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 outline-none transition-all text-sm font-mono text-slate-700 resize-none"
            />
          </div>
        </div>
      </section>

      <section className={`${activeTab === 'marketplace' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<Store className="h-5 w-5" />}
          title="Marketplace Identity"
          description="Control the public marketplace identity and customer support contact details."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderTextInput('marketplace_name', 'Marketplace Name')}
          {renderTextInput('marketplace_support_email', 'Support Email', 'support@pandamarket.tn')}
          <div className="md:col-span-2">
            {renderTextInput('marketplace_tagline', 'Marketplace Tagline')}
          </div>
          {renderTextInput('marketplace_support_phone', 'Support Phone')}
          <div className="md:col-span-2">
            {renderTextInput('marketplace_public_url', 'Public Marketplace URL', 'https://pandamarket.tn')}
          </div>
          <div className="md:col-span-2">
            {renderTextInput('marketplace_og_image_url', 'Social Sharing Image URL', '/og-image.png')}
          </div>
          <div className="md:col-span-2">
            {renderTextInput('marketplace_favicon_url', 'Favicon URL', '/favicon.ico')}
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Marketplace Logo</label>
            <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200/70 bg-stone-50 p-5 sm:flex-row sm:items-center sm:justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-32 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {settings.marketplace_logo_url ? (
                    <div
                      aria-label={settings.marketplace_name}
                      role="img"
                      className="h-full w-full bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${settings.marketplace_logo_url})` }}
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-slate-300" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{settings.marketplace_logo_url ? 'Logo configured' : 'No logo selected'}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1">Upload or choose from gallery.</p>
                </div>
              </div>
              <div className="flex gap-2">
                {settings.marketplace_logo_url && (
                  <button
                    type="button"
                    onClick={() => updateSetting('marketplace_logo_url', '')}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm transition-all"
                  >
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMarketplaceLogoPickerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#991B1B] shadow-md shadow-red-900/20 transition-all hover:-translate-y-0.5"
                >
                  <UploadCloud className="h-4 w-4" />
                  Choose logo
                </button>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 space-y-1.5 mt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Marketplace Theme</label>
            {renderMarketplaceThemeSelector()}
          </div>
        </div>
      </section>

      <section className={`${activeTab === 'marketplace' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<Store className="h-5 w-5" />}
          title="Marketplace Social Links"
          description="Show official marketplace social profiles in the public Hub footer."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderTextInput('marketplace_facebook_url', 'Facebook URL', 'https://facebook.com/...')}
          {renderTextInput('marketplace_instagram_url', 'Instagram URL', 'https://instagram.com/...')}
          {renderTextInput('marketplace_x_url', 'X URL', 'https://x.com/...')}
          {renderTextInput('marketplace_tiktok_url', 'TikTok URL', 'https://tiktok.com/@...')}
          {renderTextInput('marketplace_youtube_url', 'YouTube URL', 'https://youtube.com/@...')}
          {renderTextInput('marketplace_linkedin_url', 'LinkedIn URL', 'https://linkedin.com/company/...')}
          {renderTextInput('marketplace_whatsapp_url', 'WhatsApp URL', 'https://wa.me/...')}
          {renderTextInput('marketplace_telegram_url', 'Telegram URL', 'https://t.me/...')}
          {renderTextInput('marketplace_pinterest_url', 'Pinterest URL', 'https://pinterest.com/...')}
          {renderTextInput('marketplace_snapchat_url', 'Snapchat URL', 'https://snapchat.com/add/...')}
        </div>
      </section>

      <section className={`${activeTab === 'marketplace' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<Headphones className="h-5 w-5" />}
          title="Marketplace Support Links"
          description="Control the Help, Terms, Privacy, and Contact links shown in the public Hub footer."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderTextInput('marketplace_help_url', 'Help URL', '/hub/search')}
          {renderTextInput('marketplace_terms_url', 'Terms URL', '/hub/search')}
          {renderTextInput('marketplace_privacy_url', 'Privacy URL', '/hub/search')}
          {renderTextInput('marketplace_contact_url', 'Contact URL', '/hub/search')}
        </div>
      </section>

      <section className={`${activeTab === 'commerce' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<ToggleLeft className="h-5 w-5" />}
          title="Marketplace Availability"
          description="Enable or disable major marketplace features without deploying code."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'marketplace_enabled' as const, label: 'Marketplace Online', description: 'Allow the marketplace to accept normal traffic and interactions.' },
            { key: 'vendor_registration_enabled' as const, label: 'Vendor Registration', description: 'Allow new sellers to register and create stores.' },
            { key: 'buyer_registration_enabled' as const, label: 'Buyer Registration', description: 'Allow shoppers to create customer accounts.' },
            { key: 'cart_enabled' as const, label: 'Shopping Cart', description: 'Allow customers to add products to cart.' },
            { key: 'wishlist_enabled' as const, label: 'Wishlist', description: 'Allow customers to save products for later.' },
            { key: 'shipping_enabled' as const, label: 'Shipping', description: 'Enable shipping workflows and shipping configuration.' },
          ].map(renderToggle)}
        </div>
      </section>

      <section className={`${activeTab === 'commerce' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Content Moderation"
          description="Configure product publication and customer review rules."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'product_moderation_required' as const, label: 'Product Moderation', description: 'Require admin review before unverified seller products go live.' },
            { key: 'product_auto_publish_verified' as const, label: 'Verified Seller Auto-Publish', description: 'Publish verified seller products without manual approval.' },
            {
              key: 'seller_type_change_auto_approval' as const,
              label: settings.seller_type_change_auto_approval
                ? t('sellerTypes.approval.autoApproval')
                : t('sellerTypes.approval.manualApproval'),
              description: settings.seller_type_change_auto_approval
                ? t('sellerTypes.approval.autoApprovalDesc')
                : t('sellerTypes.approval.manualApprovalDesc'),
            },
            { key: 'reviews_enabled' as const, label: 'Customer Reviews', description: 'Allow customers to submit product reviews.' },
            { key: 'review_auto_publish' as const, label: 'Auto-Publish Reviews', description: 'Publish new reviews immediately after submission.' },
          ].map(renderToggle)}
        </div>
      </section>

      {/* Order Splitting */}
      <section className={`${activeTab === 'commerce' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<Store className="h-5 w-5" />}
          title="Order Splitting"
          description="Configure how multi-vendor orders are split and fulfilled."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {renderToggle({
            key: 'order_splitting_enabled',
            label: 'Enable Order Splitting',
            description: 'When enabled, multi-vendor carts create separate fulfillments per vendor.',
          })}
        </div>
      </section>

      {/* Retention Periods */}
      <section className={`${activeTab === 'finance' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<Wallet className="h-5 w-5" />}
          title="Retention Periods"
          description="Number of days funds are held before becoming available in the vendor wallet."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {renderNumberInput('retention_days_flouci', 'Flouci', 'days', 1, 90)}
          {renderNumberInput('retention_days_konnect', 'Konnect', 'days', 1, 90)}
          {renderNumberInput('retention_days_mandat', 'Mandat Minute', 'days', 1, 90)}
          {renderNumberInput('retention_days_cod', 'COD', 'days', 1, 90)}
        </div>
      </section>

      {/* Financial Settings */}
      <section className={`${activeTab === 'finance' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<Wallet className="h-5 w-5" />}
          title="Financial Settings"
          description="Manage platform commission, withdrawal threshold, and default currency."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {renderNumberInput('platform_commission_rate', 'Free Plan Commission Rate', '%', 0, 100, 0.5)}
          {renderNumberInput('min_withdrawal_tnd', 'Minimum Withdrawal Amount', settings.default_currency, 1)}
          {renderTextInput('default_currency', 'Settlement Currency')}
        </div>
      </section>

      {/* Mandat Minute Recipient Info */}
      <section className={`${activeTab === 'finance' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<Wallet className="h-5 w-5" />}
          title="Mandat Minute Recipient"
          description="This information is displayed to customers when they choose Mandat Minute payment."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-3">{renderTextInput('mandat_recipient_name', 'Recipient Name')}</div>
          {renderTextInput('mandat_recipient_cin', 'Identifiant Number')}
          {renderTextInput('mandat_recipient_city', 'City')}
        </div>
      </section>

      {/* Upload Limits */}
      <section className={`${activeTab === 'operations' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<ImageIcon className="h-5 w-5" />}
          title="Upload Limits"
          description="Control product media and default vendor inventory limits."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {renderNumberInput('max_upload_size_mb', 'Max File Upload Size', 'MB', 1, 100)}
          {renderNumberInput('max_product_images', 'Max Product Images', 'images', 1, 50)}
          {renderNumberInput('max_products_per_store_free', 'Free Store Product Limit', 'products', 1, 10000)}
          {renderNumberInput('default_low_stock_threshold', 'Low Stock Threshold', 'units', 0, 1000)}
        </div>
      </section>

      <section className={`${activeTab === 'operations' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<MessageSquare className="h-5 w-5" />}
          title="Chat Security"
          description="Limit chat message frequency, image count, image size, and text length for all users."
        />
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-[1fr_2fr]">
          {renderToggle({
            key: 'chat_bubble_enabled',
            label: 'Instant Chat Bubble',
            description: 'Show or hide the floating chat bubble on marketplace and storefront pages.',
          })}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Bubble Position</label>
            <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] border border-slate-200/70 bg-stone-50 p-2 shadow-sm">
              {(['bottom-right', 'bottom-left'] as const).map((position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => updateSetting('chat_bubble_position', position)}
                  className={`rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
                    settings.chat_bubble_position === position
                      ? 'bg-[#B91C1C] text-white shadow-md shadow-red-900/20 scale-[1.02]'
                      : 'bg-transparent text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-900'
                  }`}
                >
                  {position === 'bottom-right' ? 'Bottom-right' : 'Bottom-left'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {renderNumberInput('chat_message_rate_limit_per_minute', 'Messages per Minute', 'messages', 1, 300)}
          {renderNumberInput('chat_max_images_per_message', 'Images per Message', 'images', 1, 10)}
          {renderNumberInput('chat_max_image_size_mb', 'Max Chat Image Size', 'MB', 1, 25)}
          {renderNumberInput('chat_max_message_length', 'Max Message Length', 'chars', 1, 5000)}
        </div>
      </section>

      <section className={`${activeTab === 'email' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<Mail className="h-5 w-5" />}
          title="Email Configuration"
          description="Configure SMTP delivery, sender identity, encrypted password storage, and test email delivery from the settings page."
        />

        {smtpError && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {smtpError}
          </div>
        )}

        {smtpLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-[1.5rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${smtpForm.smtp_enabled ? 'bg-[#B91C1C] text-white' : 'bg-white text-slate-400'} shadow-sm`}>
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-950">Transactional email sending</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {smtpForm.smtp_enabled ? 'Emails are sent through configured SMTP.' : 'Email sending is disabled until SMTP is enabled.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateSmtpField('smtp_enabled', !smtpForm.smtp_enabled)}
                className={`relative h-7 w-14 shrink-0 rounded-full transition-all duration-300 shadow-inner ${smtpForm.smtp_enabled ? 'bg-[#B91C1C] shadow-red-900/20' : 'bg-slate-300'}`}
              >
                <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${smtpForm.smtp_enabled ? 'translate-x-7' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200/70 bg-stone-50 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#B91C1C] shadow-sm">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950">Provider preset</h3>
                  <p className="text-xs font-medium text-slate-500">Select a provider to prefill host, port, and TLS mode.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {Object.entries(SMTP_PROVIDER_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applySmtpPreset(key)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${
                      smtpSelectedPreset === key
                        ? 'border-[#B91C1C] bg-white text-[#B91C1C] shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:text-[#B91C1C]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">SMTP Host</label>
                <input
                  type="text"
                  value={smtpForm.smtp_host}
                  onChange={(event) => updateSmtpField('smtp_host', event.target.value)}
                  placeholder="smtp.example.com"
                  className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Port</label>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={smtpForm.smtp_port}
                  onChange={(event) => updateSmtpField('smtp_port', parseInt(event.target.value, 10) || 587)}
                  className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Username / API Key</label>
                <input
                  type="text"
                  value={smtpForm.smtp_user}
                  onChange={(event) => updateSmtpField('smtp_user', event.target.value)}
                  placeholder="your-api-key or email"
                  className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">TLS on connect</label>
                <button
                  type="button"
                  onClick={() => updateSmtpField('smtp_secure', !smtpForm.smtp_secure)}
                  className={`flex h-[46px] w-full items-center justify-between rounded-xl border px-4 text-sm font-black transition-all ${
                    smtpForm.smtp_secure ? 'border-[#B91C1C] bg-amber-50 text-[#B91C1C]' : 'border-slate-200 bg-stone-50 text-slate-500'
                  }`}
                >
                  {smtpForm.smtp_secure ? 'Enabled' : 'Disabled'}
                  <span className={`h-3 w-3 rounded-full ${smtpForm.smtp_secure ? 'bg-[#B91C1C]' : 'bg-slate-300'}`} />
                </button>
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                  Password / Secret
                  {smtpPasswordSet && !smtpForm.smtp_pass && (
                    <span className="ml-2 normal-case tracking-normal text-[#B91C1C]">Password is set; leave empty to keep it.</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={smtpShowPassword ? 'text' : 'password'}
                    value={smtpForm.smtp_pass}
                    onChange={(event) => updateSmtpField('smtp_pass', event.target.value)}
                    placeholder={smtpPasswordSet ? '••••••••••••' : 'Enter password or API secret'}
                    className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 pr-12 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setSmtpShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-[#B91C1C]"
                  >
                    {smtpShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">From Name</label>
                <input
                  type="text"
                  value={smtpForm.smtp_from_name}
                  onChange={(event) => updateSmtpField('smtp_from_name', event.target.value)}
                  placeholder="PandaMarket"
                  className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">From Email</label>
                <input
                  type="email"
                  value={smtpForm.smtp_from_email}
                  onChange={(event) => updateSmtpField('smtp_from_email', event.target.value)}
                  placeholder="noreply@pandamarket.tn"
                  className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
                />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200/70 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0F0F23] text-white shadow-sm">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950">Test connection</h3>
                  <p className="text-xs font-medium text-slate-500">Verify the current form values and optionally send a test email.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Test Recipient</label>
                  <input
                    type="email"
                    value={smtpTestEmail}
                    onChange={(event) => setSmtpTestEmail(event.target.value)}
                    placeholder="admin@pandamarket.tn"
                    className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSmtpTest}
                  disabled={smtpTestStatus === 'testing' || !smtpForm.smtp_host}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F0F23] px-5 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#1A1A3A] disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {smtpTestStatus === 'testing' ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {smtpTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              {smtpTestStatus !== 'idle' && smtpTestStatus !== 'testing' && (
                <div className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${
                  smtpTestStatus === 'success'
                    ? 'border-amber-100 bg-amber-50 text-[#B91C1C]'
                    : 'border-red-100 bg-red-50 text-red-700'
                }`}>
                  {smtpTestStatus === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                  {smtpTestMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className={`${activeTab === 'email' ? '' : 'hidden'}`}>
        <EmailTemplateManager
          scope="marketplace"
          title="Marketplace email styles"
          description="Manage marketplace-wide transactional templates such as buyer registration, order placed, and payment confirmation."
        />
      </section>

      <MarketplaceAssetPicker
        open={marketplaceLogoPickerOpen}
        title="Marketplace logo gallery"
        type="image"
        onClose={() => setMarketplaceLogoPickerOpen(false)}
        onSelect={(url) => {
          updateSetting('marketplace_logo_url', url);
          setMarketplaceLogoPickerOpen(false);
        }}
      />
    </div>
  );
}
