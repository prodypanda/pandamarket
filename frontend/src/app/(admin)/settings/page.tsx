'use client';

import { fetchWithCsrf } from '@/lib/api';
import { MarketplaceAssetPicker } from '@/components/admin/MarketplaceAssetPicker';
import { AccountTwoFactorPanel } from '@/components/AccountTwoFactorPanel';
import { type ReactNode, useEffect, useState } from 'react';
import { MessageSquare, Settings, Save, RotateCcw, Store, Wallet, Image as ImageIcon, ShieldCheck, ToggleLeft, UploadCloud } from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';

interface PlatformSettings {
  marketplace_name: string;
  marketplace_tagline: string;
  marketplace_logo_url: string;
  marketplace_theme: 'panda' | 'aliexpress';
  marketplace_support_email: string;
  marketplace_support_phone: string;
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
  mandat_recipient_name: string;
  mandat_recipient_cin: string;
  mandat_recipient_city: string;
  platform_commission_rate: number;
  default_currency: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  marketplace_name: 'PandaMarket',
  marketplace_tagline: 'Le marketplace tunisien pour boutiques modernes',
  marketplace_logo_url: '',
  marketplace_theme: 'panda',
  marketplace_support_email: 'support@pandamarket.tn',
  marketplace_support_phone: '',
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
};

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
  'marketplace_support_email',
  'marketplace_support_phone',
  'mandat_recipient_name',
  'mandat_recipient_cin',
  'mandat_recipient_city',
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

  payload.marketplace_theme = payload.marketplace_theme === 'aliexpress' ? 'aliexpress' : 'panda';
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
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-xl bg-[#16C784]/10 p-2 text-[#16C784]">{icon}</div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
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

  function updateSetting<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function renderToggle({ key, label, description }: ToggleSetting) {
    return (
      <div key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => updateSetting(key, !settings[key])}
          className={`relative h-6 w-12 rounded-full transition-colors ${
            settings[key] ? 'bg-[#16C784]' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              settings[key] ? 'translate-x-6' : ''
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
      <div key={key}>
        <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={settings[key]}
            onChange={(e) => updateSetting(key, Number(e.target.value) as PlatformSettings[K])}
            className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#16C784] focus:outline-none focus:ring-2 focus:ring-[#16C784]/20"
          />
          <span className="text-sm text-gray-500">{suffix}</span>
        </div>
      </div>
    );
  }

  function renderTextInput<K extends StringSettingKey>(key: K, label: string, placeholder = '') {
    return (
      <div key={key}>
        <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
        <input
          type="text"
          value={settings[key]}
          placeholder={placeholder}
          onChange={(e) => updateSetting(key, e.target.value as PlatformSettings[K])}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#16C784] focus:outline-none focus:ring-2 focus:ring-[#16C784]/20"
        />
      </div>
    );
  }

  function renderMarketplaceThemeSelector() {
    const themeOptions = [
      {
        id: 'panda' as const,
        name: 'PandaMarket Classic',
        description: 'Amazon/Alibaba-inspired marketplace homepage with dark hero and service blocks.',
        colors: ['#16C784', '#0F172A', '#F8FAFC'],
      },
      {
        id: 'aliexpress' as const,
        name: 'AliExpress Style',
        description: 'Red/orange deal-focused marketplace with category rail, coupons, and flash offers.',
        colors: ['#FF4747', '#FF7A00', '#FFF3E8'],
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
              className={`rounded-2xl border-2 p-4 text-left transition-all ${
                selected ? 'border-[#16C784] bg-[#16C784]/5 shadow-sm' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
            >
              <div className="mb-3 overflow-hidden rounded-xl border border-white/70 bg-white shadow-sm">
                <div className="flex h-12 items-center gap-1 px-3" style={{ backgroundColor: theme.colors[2] }}>
                  {theme.colors.map((color) => (
                    <span key={color} className="h-5 flex-1 rounded-md" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 p-3">
                  <span className="h-8 rounded-lg bg-gray-100" />
                  <span className="h-8 rounded-lg bg-gray-100" />
                  <span className="h-8 rounded-lg bg-gray-100" />
                </div>
              </div>
              <p className="font-semibold text-gray-900">{theme.name}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">{theme.description}</p>
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

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#16C784]/10 p-2">
            <Settings className="h-6 w-6 text-[#16C784]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
            <p className="text-sm text-gray-500">Configure marketplace, seller, checkout, wallet, and media behavior.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#16C784] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#14b876] disabled:opacity-50"
        >
          {saving ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">Loading settings...</div>}

      <AccountTwoFactorPanel accentClass="bg-slate-950" />

      <section className="rounded-xl border border-gray-100 bg-white p-6">
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
            <label className="mb-2 block text-sm font-medium text-gray-700">Marketplace Logo</label>
            <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-32 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {settings.marketplace_logo_url ? (
                    <div
                      aria-label={settings.marketplace_name}
                      role="img"
                      className="h-full w-full bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${settings.marketplace_logo_url})` }}
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-gray-300" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{settings.marketplace_logo_url ? 'Logo configured' : 'No logo selected'}</p>
                  <p className="text-xs text-gray-500">Upload or choose an image from the marketplace gallery.</p>
                </div>
              </div>
              <div className="flex gap-2">
                {settings.marketplace_logo_url && (
                  <button
                    type="button"
                    onClick={() => updateSetting('marketplace_logo_url', '')}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white"
                  >
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMarketplaceLogoPickerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#16C784] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14b876]"
                >
                  <UploadCloud className="h-4 w-4" />
                  Choose logo
                </button>
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">Marketplace Theme</label>
            {renderMarketplaceThemeSelector()}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-6">
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

      <section className="rounded-xl border border-gray-100 bg-white p-6">
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
      <section className="rounded-xl border border-gray-100 bg-white p-6">
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
      <section className="rounded-xl border border-gray-100 bg-white p-6">
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
      <section className="rounded-xl border border-gray-100 bg-white p-6">
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
      <section className="rounded-xl border border-gray-100 bg-white p-6">
        <SectionHeader
          icon={<Wallet className="h-5 w-5" />}
          title="Mandat Minute Recipient"
          description="This information is displayed to customers when they choose Mandat Minute payment."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-3">{renderTextInput('mandat_recipient_name', 'Recipient Name')}</div>
          {renderTextInput('mandat_recipient_cin', 'CIN Number')}
          {renderTextInput('mandat_recipient_city', 'City')}
        </div>
      </section>

      {/* Upload Limits */}
      <section className="rounded-xl border border-gray-100 bg-white p-6">
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

      <section className="rounded-xl border border-gray-100 bg-white p-6">
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
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Bubble Position</label>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-2">
              {(['bottom-right', 'bottom-left'] as const).map((position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => updateSetting('chat_bubble_position', position)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    settings.chat_bubble_position === position
                      ? 'bg-[#16C784] text-white shadow-sm'
                      : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {position === 'bottom-right' ? 'Bottom-right corner' : 'Bottom-left corner'}
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
