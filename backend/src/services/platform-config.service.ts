import { query, transaction } from '../db/pool';
import { getRedis } from '../db/redis';
import { logger } from '../utils/logger';

export type PlatformSettingValue = string | number | boolean;
export type PlatformSettingSection = 'marketplace' | 'commerce' | 'finance' | 'operations' | 'integrations';
const PLATFORM_CONFIG_CACHE_KEY = 'pd:platform-config:settings';
const PLATFORM_CONFIG_CACHE_TTL_SECONDS = 60;
const PLATFORM_CONFIG_INVALIDATION_CHANNEL = 'pd:platform-config:invalidate';

export const PLATFORM_SETTING_DEFAULTS = {
  marketplace_name: 'PandaMarket',
  marketplace_tagline: 'Le marketplace tunisien pour boutiques modernes',
  marketplace_logo_url: '',
  marketplace_logo_light_url: '',
  marketplace_logo_dark_url: '',
  marketplace_favicon_url: '/favicon.ico',
  marketplace_og_image_url: '/og-image.png',
  marketplace_public_url: 'https://pandamarket.tn',
  marketplace_theme: 'panda',
  marketplace_primary_color: '#B91C1C',
  marketplace_secondary_color: '#C6922E',
  marketplace_default_locale: 'fr',
  marketplace_supported_locales: 'fr,en,ar',
  marketplace_rtl_enabled: true,
  marketplace_support_email: 'support@pandamarket.tn',
  marketplace_support_phone: '',
  marketplace_support_whatsapp: '',
  marketplace_address: '',
  marketplace_city: 'Tunis',
  marketplace_country: 'Tunisia',
  marketplace_business_hours: '',
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
  marketplace_refund_url: '',
  marketplace_cookie_policy_url: '',
  marketplace_contact_url: '/hub/search',
  catalog_featured_category_slugs: '',
  catalog_default_sort: 'newest',
  hub_homepage_layout: 'theme_default',
  hub_homepage_banner_title: '',
  hub_homepage_banner_subtitle: '',
  hub_homepage_banner_cta_label: 'Explorer le Hub',
  hub_homepage_banner_cta_url: '/hub/search',
  hub_homepage_banner_image_url: '',
  hub_homepage_blocks: '',
  analytics_ga4_enabled: false,
  analytics_ga4_measurement_id: '',
  analytics_gtm_enabled: false,
  analytics_gtm_container_id: '',
  analytics_meta_pixel_enabled: false,
  analytics_meta_pixel_id: '',
  search_console_verification: '',
  cloudflare_integration_enabled: false,
  cloudflare_account_id: '',
  cloudflare_zone_id: '',
  cloudflare_custom_hostnames_enabled: false,
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
  ai_tools_enabled: true,
  page_builder_enabled: true,
  plugins_marketplace_enabled: false,
  email_marketing_enabled: false,
  cart_enabled: true,
  shipping_enabled: true,
  shipping_self_managed_enabled: true,
  shipping_platform_unified_enabled: true,
  shipping_default_provider: 'auto',
  shipping_aramex_enabled: true,
  shipping_laposte_enabled: true,
  shipping_platform_fallback_enabled: true,
  shipping_default_origin_city: 'Tunis',
  shipping_default_origin_country: 'TN',
  shipping_domestic_zone_cities: 'Tunis,Ariana,Ben Arous,Manouba',
  shipping_remote_zone_cities: '',
  shipping_platform_flat_rate_tnd: 7,
  shipping_domestic_zone_rate_tnd: 7,
  shipping_remote_zone_rate_tnd: 12,
  shipping_free_shipping_threshold_tnd: 0,
  order_splitting_enabled: true,
  tax_mode: 'none',
  default_tax_rate: 0,
  price_rounding_mode: 'nearest_0_001',
  auto_cancel_unpaid_enabled: true,
  auto_cancel_unpaid_minutes: 60,
  retention_days_flouci: 7,
  retention_days_konnect: 7,
  retention_days_mandat: 14,
  retention_days_cod: 14,
  payout_schedule: 'weekly',
  min_withdrawal_tnd: 20,
  platform_commission_rate: 15,
  default_currency: 'TND',
  payment_sandbox_mode: true,
  payment_flouci_enabled: true,
  payment_konnect_enabled: true,
  payment_mandat_enabled: true,
  payment_cod_enabled: true,
  payment_vendor_direct_enabled: true,
  payment_platform_credentials_source: 'environment',
  mandat_recipient_name: 'PandaMarket SARL',
  mandat_recipient_cin: '01234567',
  mandat_recipient_city: 'Tunis',
  mandat_bank_name: 'STB (Société Tunisienne de Banque)',
  mandat_bank_rib: '10 000 0000000000000 00',
  mandat_bank_iban: 'TN59 1000 0000 0000 0000 0000',
  mandat_recipient_phone: '+216 71 000 000',
  max_upload_size_mb: 10,
  max_product_images: 10,
  max_products_per_store_free: 50,
  default_low_stock_threshold: 5,
  chat_message_rate_limit_per_minute: 20,
  chat_max_images_per_message: 4,
  chat_max_image_size_mb: 5,
  chat_max_message_length: 5000,
  notifications_in_app_enabled: true,
  notifications_realtime_enabled: true,
  notifications_email_enabled: true,
  notifications_sms_enabled: true,
  notifications_sms_provider: 'environment',
  notifications_sms_sender_name: 'PandaMarket',
  security_login_max_attempts: 5,
  security_login_lockout_minutes: 15,
  security_password_min_length: 8,
  security_password_require_uppercase: false,
  security_password_require_lowercase: false,
  security_password_require_number: false,
  security_password_require_symbol: false,
  security_2fa_required_roles: '',
  security_custom_domains_enabled: true,
  security_custom_domain_allowed_suffixes: '',
  security_custom_domain_blocked_suffixes: '',
  maintenance_enabled: false,
  maintenance_title: 'Maintenance en cours',
  maintenance_message: 'Notre plateforme est en cours de maintenance. Nous serons de retour très bientôt.',
  maintenance_illustration_url: '',
  maintenance_eta: '',
  maintenance_allowed_ips: '',
  maintenance_block_storefronts: false,
  ads_enabled: true,
  ads_moderation_required: true,
  ads_min_refill_tnd: 5,
  ads_max_refill_tnd: 10000,
  ads_min_daily_budget_tnd: 1,
  ads_max_campaign_days: 90,
  ads_frequency_cap_daily: 5,
  ads_click_attribution_days: 7,
  ads_view_attribution_days: 1,
  ads_sponsored_products_enabled: true,
  ads_sponsored_brands_enabled: true,
  ads_sponsored_content_enabled: true,
  ads_prohibited_terms: '',
  ads_creative_image_required: false,
  ads_max_creative_description_length: 500,
} satisfies Record<string, PlatformSettingValue>;

export type PlatformSettingKey = keyof typeof PLATFORM_SETTING_DEFAULTS;
export type PlatformSettings = Record<PlatformSettingKey, PlatformSettingValue>;
export type PlatformSettingsBySection = Record<PlatformSettingSection, Partial<PlatformSettings>>;

export const PLATFORM_SETTING_KEYS = Object.keys(PLATFORM_SETTING_DEFAULTS) as PlatformSettingKey[];

export const PUBLIC_PLATFORM_SETTING_KEYS = [
  'marketplace_name',
  'marketplace_tagline',
  'marketplace_logo_url',
  'marketplace_logo_light_url',
  'marketplace_logo_dark_url',
  'marketplace_favicon_url',
  'marketplace_og_image_url',
  'marketplace_public_url',
  'marketplace_theme',
  'marketplace_primary_color',
  'marketplace_secondary_color',
  'marketplace_default_locale',
  'marketplace_supported_locales',
  'marketplace_rtl_enabled',
  'marketplace_support_email',
  'marketplace_support_phone',
  'marketplace_support_whatsapp',
  'marketplace_address',
  'marketplace_city',
  'marketplace_country',
  'marketplace_business_hours',
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
  'marketplace_refund_url',
  'marketplace_cookie_policy_url',
  'marketplace_contact_url',
  'catalog_featured_category_slugs',
  'catalog_default_sort',
  'hub_homepage_layout',
  'hub_homepage_banner_title',
  'hub_homepage_banner_subtitle',
  'hub_homepage_banner_cta_label',
  'hub_homepage_banner_cta_url',
  'hub_homepage_banner_image_url',
  'hub_homepage_blocks',
  'analytics_ga4_enabled',
  'analytics_ga4_measurement_id',
  'analytics_gtm_enabled',
  'analytics_gtm_container_id',
  'analytics_meta_pixel_enabled',
  'analytics_meta_pixel_id',
  'search_console_verification',
  'reviews_enabled',
  'review_auto_publish',
  'wishlist_enabled',
  'ai_tools_enabled',
  'page_builder_enabled',
  'plugins_marketplace_enabled',
  'email_marketing_enabled',
  'chat_bubble_enabled',
  'chat_bubble_position',
  'default_currency',
  'maintenance_enabled',
  'maintenance_title',
  'maintenance_message',
  'maintenance_illustration_url',
  'maintenance_eta',
  'maintenance_block_storefronts',
] as const satisfies readonly PlatformSettingKey[];

export const PLATFORM_SETTING_SECTION_META: Array<{
  id: PlatformSettingSection;
  label: string;
  description: string;
}> = [
  { id: 'marketplace', label: 'Marketplace', description: 'Identity, branding, social and footer links' },
  { id: 'commerce', label: 'Commerce', description: 'Availability, moderation and order workflows' },
  { id: 'finance', label: 'Finance', description: 'Commissions, payouts and payment instructions' },
  { id: 'operations', label: 'Operations', description: 'Security, maintenance, upload and chat limits' },
  { id: 'integrations', label: 'Integrations', description: 'Analytics, verification and Cloudflare metadata' },
];

export const PLATFORM_SETTING_SECTION_KEYS: Record<PlatformSettingSection, readonly PlatformSettingKey[]> = {
  marketplace: [
    'marketplace_name',
    'marketplace_tagline',
    'marketplace_logo_url',
    'marketplace_logo_light_url',
    'marketplace_logo_dark_url',
    'marketplace_favicon_url',
    'marketplace_og_image_url',
    'marketplace_public_url',
    'marketplace_theme',
    'marketplace_primary_color',
    'marketplace_secondary_color',
    'marketplace_default_locale',
    'marketplace_supported_locales',
    'marketplace_rtl_enabled',
    'marketplace_support_email',
    'marketplace_support_phone',
    'marketplace_support_whatsapp',
    'marketplace_address',
    'marketplace_city',
    'marketplace_country',
    'marketplace_business_hours',
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
    'marketplace_refund_url',
    'marketplace_cookie_policy_url',
    'marketplace_contact_url',
    'catalog_featured_category_slugs',
    'catalog_default_sort',
    'hub_homepage_layout',
    'hub_homepage_banner_title',
    'hub_homepage_banner_subtitle',
    'hub_homepage_banner_cta_label',
    'hub_homepage_banner_cta_url',
    'hub_homepage_banner_image_url',
    'hub_homepage_blocks',
  ],
  commerce: [
    'marketplace_enabled',
    'vendor_registration_enabled',
    'buyer_registration_enabled',
    'product_moderation_required',
    'product_auto_publish_verified',
    'seller_type_change_auto_approval',
    'reviews_enabled',
    'review_auto_publish',
    'wishlist_enabled',
    'ai_tools_enabled',
    'page_builder_enabled',
    'plugins_marketplace_enabled',
    'email_marketing_enabled',
    'cart_enabled',
    'shipping_enabled',
    'shipping_self_managed_enabled',
    'shipping_platform_unified_enabled',
    'shipping_default_provider',
    'shipping_aramex_enabled',
    'shipping_laposte_enabled',
    'shipping_platform_fallback_enabled',
    'shipping_default_origin_city',
    'shipping_default_origin_country',
    'shipping_domestic_zone_cities',
    'shipping_remote_zone_cities',
    'shipping_platform_flat_rate_tnd',
    'shipping_domestic_zone_rate_tnd',
    'shipping_remote_zone_rate_tnd',
    'shipping_free_shipping_threshold_tnd',
    'order_splitting_enabled',
    'tax_mode',
    'default_tax_rate',
    'price_rounding_mode',
    'auto_cancel_unpaid_enabled',
    'auto_cancel_unpaid_minutes',
    'ads_enabled',
    'ads_moderation_required',
    'ads_min_daily_budget_tnd',
    'ads_max_campaign_days',
    'ads_frequency_cap_daily',
    'ads_click_attribution_days',
    'ads_view_attribution_days',
    'ads_sponsored_products_enabled',
    'ads_sponsored_brands_enabled',
    'ads_sponsored_content_enabled',
    'ads_prohibited_terms',
    'ads_creative_image_required',
    'ads_max_creative_description_length',
  ],
  finance: [
    'retention_days_flouci',
    'retention_days_konnect',
    'retention_days_mandat',
    'retention_days_cod',
    'payout_schedule',
    'min_withdrawal_tnd',
    'platform_commission_rate',
    'default_currency',
    'payment_sandbox_mode',
    'payment_flouci_enabled',
    'payment_konnect_enabled',
    'payment_mandat_enabled',
    'payment_cod_enabled',
    'payment_vendor_direct_enabled',
    'payment_platform_credentials_source',
    'mandat_recipient_name',
    'mandat_recipient_cin',
    'mandat_recipient_city',
    'ads_min_refill_tnd',
    'ads_max_refill_tnd',
  ],
  operations: [
    'chat_bubble_enabled',
    'chat_bubble_position',
    'max_upload_size_mb',
    'max_product_images',
    'max_products_per_store_free',
    'default_low_stock_threshold',
    'chat_message_rate_limit_per_minute',
    'chat_max_images_per_message',
    'chat_max_image_size_mb',
    'chat_max_message_length',
    'notifications_in_app_enabled',
    'notifications_realtime_enabled',
    'notifications_email_enabled',
    'notifications_sms_enabled',
    'notifications_sms_provider',
    'notifications_sms_sender_name',
    'security_login_max_attempts',
    'security_login_lockout_minutes',
    'security_password_min_length',
    'security_password_require_uppercase',
    'security_password_require_lowercase',
    'security_password_require_number',
    'security_password_require_symbol',
    'security_2fa_required_roles',
    'security_custom_domains_enabled',
    'security_custom_domain_allowed_suffixes',
    'security_custom_domain_blocked_suffixes',
    'maintenance_enabled',
    'maintenance_title',
    'maintenance_message',
    'maintenance_illustration_url',
    'maintenance_eta',
    'maintenance_allowed_ips',
    'maintenance_block_storefronts',
  ],
  integrations: [
    'analytics_ga4_enabled',
    'analytics_ga4_measurement_id',
    'analytics_gtm_enabled',
    'analytics_gtm_container_id',
    'analytics_meta_pixel_enabled',
    'analytics_meta_pixel_id',
    'search_console_verification',
    'cloudflare_integration_enabled',
    'cloudflare_account_id',
    'cloudflare_zone_id',
    'cloudflare_custom_hostnames_enabled',
  ],
};

const BOOLEAN_PLATFORM_SETTING_KEYS = new Set<PlatformSettingKey>([
  'marketplace_enabled',
  'vendor_registration_enabled',
  'buyer_registration_enabled',
  'product_moderation_required',
  'product_auto_publish_verified',
  'seller_type_change_auto_approval',
  'reviews_enabled',
  'review_auto_publish',
  'wishlist_enabled',
  'ai_tools_enabled',
  'page_builder_enabled',
  'plugins_marketplace_enabled',
  'email_marketing_enabled',
  'cart_enabled',
  'shipping_enabled',
  'shipping_self_managed_enabled',
  'shipping_platform_unified_enabled',
  'shipping_aramex_enabled',
  'shipping_laposte_enabled',
  'shipping_platform_fallback_enabled',
  'order_splitting_enabled',
  'auto_cancel_unpaid_enabled',
  'chat_bubble_enabled',
  'marketplace_rtl_enabled',
  'payment_sandbox_mode',
  'payment_flouci_enabled',
  'payment_konnect_enabled',
  'payment_mandat_enabled',
  'payment_cod_enabled',
  'payment_vendor_direct_enabled',
  'notifications_in_app_enabled',
  'notifications_realtime_enabled',
  'notifications_email_enabled',
  'notifications_sms_enabled',
  'security_password_require_uppercase',
  'security_password_require_lowercase',
  'security_password_require_number',
  'security_password_require_symbol',
  'security_custom_domains_enabled',
  'maintenance_enabled',
  'maintenance_block_storefronts',
  'analytics_ga4_enabled',
  'analytics_gtm_enabled',
  'analytics_meta_pixel_enabled',
  'cloudflare_integration_enabled',
  'cloudflare_custom_hostnames_enabled',
  'ads_enabled',
  'ads_moderation_required',
  'ads_sponsored_products_enabled',
  'ads_sponsored_brands_enabled',
  'ads_sponsored_content_enabled',
  'ads_creative_image_required',
]);

const NUMERIC_PLATFORM_SETTING_KEYS = new Set<PlatformSettingKey>([
  'retention_days_flouci',
  'retention_days_konnect',
  'retention_days_mandat',
  'retention_days_cod',
  'shipping_platform_flat_rate_tnd',
  'shipping_domestic_zone_rate_tnd',
  'shipping_remote_zone_rate_tnd',
  'shipping_free_shipping_threshold_tnd',
  'default_tax_rate',
  'auto_cancel_unpaid_minutes',
  'min_withdrawal_tnd',
  'platform_commission_rate',
  'max_upload_size_mb',
  'max_product_images',
  'max_products_per_store_free',
  'default_low_stock_threshold',
  'chat_message_rate_limit_per_minute',
  'chat_max_images_per_message',
  'chat_max_image_size_mb',
  'chat_max_message_length',
  'security_login_max_attempts',
  'security_login_lockout_minutes',
  'security_password_min_length',
  'ads_min_refill_tnd',
  'ads_max_refill_tnd',
  'ads_min_daily_budget_tnd',
  'ads_max_campaign_days',
  'ads_frequency_cap_daily',
  'ads_click_attribution_days',
  'ads_view_attribution_days',
  'ads_max_creative_description_length',
]);

export function isPlatformSettingSection(value: string): value is PlatformSettingSection {
  return value === 'marketplace' || value === 'commerce' || value === 'finance' || value === 'operations' || value === 'integrations';
}

function isPlatformSettingKey(value: string): value is PlatformSettingKey {
  return Object.prototype.hasOwnProperty.call(PLATFORM_SETTING_DEFAULTS, value);
}

function coerceSettingValue(key: PlatformSettingKey, value: string): PlatformSettingValue {
  if (BOOLEAN_PLATFORM_SETTING_KEYS.has(key)) return value === 'true';
  if (NUMERIC_PLATFORM_SETTING_KEYS.has(key)) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : PLATFORM_SETTING_DEFAULTS[key];
  }
  return value;
}

function toStorageValue(value: PlatformSettingValue) {
  return String(value);
}

function pickSettings(settings: PlatformSettings, keys: readonly PlatformSettingKey[]) {
  const picked: Partial<PlatformSettings> = {};
  for (const key of keys) {
    picked[key] = settings[key];
  }
  return picked;
}

function groupSettings(settings: PlatformSettings): PlatformSettingsBySection {
  return {
    marketplace: pickSettings(settings, PLATFORM_SETTING_SECTION_KEYS.marketplace),
    commerce: pickSettings(settings, PLATFORM_SETTING_SECTION_KEYS.commerce),
    finance: pickSettings(settings, PLATFORM_SETTING_SECTION_KEYS.finance),
    operations: pickSettings(settings, PLATFORM_SETTING_SECTION_KEYS.operations),
    integrations: pickSettings(settings, PLATFORM_SETTING_SECTION_KEYS.integrations),
  };
}

class PlatformConfigService {
  private async readCachedSettings(): Promise<PlatformSettings | null> {
    try {
      const cached = await getRedis().get(PLATFORM_CONFIG_CACHE_KEY);
      if (!cached) return null;
      return { ...PLATFORM_SETTING_DEFAULTS, ...(JSON.parse(cached) as Partial<PlatformSettings>) } as PlatformSettings;
    } catch (err) {
      logger.warn({ err }, 'Failed to read platform config cache');
      return null;
    }
  }

  private async writeCachedSettings(settings: PlatformSettings) {
    try {
      await getRedis().setex(PLATFORM_CONFIG_CACHE_KEY, PLATFORM_CONFIG_CACHE_TTL_SECONDS, JSON.stringify(settings));
    } catch (err) {
      logger.warn({ err }, 'Failed to write platform config cache');
    }
  }

  private async invalidateCache(updatedKeys: PlatformSettingKey[]) {
    try {
      const redis = getRedis();
      await redis.del(PLATFORM_CONFIG_CACHE_KEY);
      await redis.publish(
        PLATFORM_CONFIG_INVALIDATION_CHANNEL,
        JSON.stringify({ updated_keys: updatedKeys, updated_at: new Date().toISOString() }),
      );
    } catch (err) {
      logger.warn({ err }, 'Failed to invalidate platform config cache');
    }
  }

  async getSettings(): Promise<PlatformSettings> {
    const cachedSettings = await this.readCachedSettings();
    if (cachedSettings) return cachedSettings;

    const { rows } = await query<{ key: string; value: string }>(
      `SELECT key, value FROM pd_platform_config WHERE key = ANY($1::text[]) ORDER BY key`,
      [PLATFORM_SETTING_KEYS],
    );

    const settings = { ...PLATFORM_SETTING_DEFAULTS } as PlatformSettings;
    for (const row of rows) {
      if (isPlatformSettingKey(row.key)) {
        settings[row.key] = coerceSettingValue(row.key, row.value);
      }
    }
    await this.writeCachedSettings(settings);
    return settings;
  }

  async getGroupedSettings() {
    const settings = await this.getSettings();
    return {
      data: settings,
      sections: groupSettings(settings),
      section_meta: PLATFORM_SETTING_SECTION_META,
    };
  }

  async getPublicSettings() {
    const settings = await this.getSettings();
    const publicSettings: Record<string, string> = {};
    for (const key of PUBLIC_PLATFORM_SETTING_KEYS) {
      publicSettings[key] = toStorageValue(settings[key]);
    }
    return publicSettings;
  }

  async updateSettings(input: Partial<Record<PlatformSettingKey, PlatformSettingValue>>, adminId: string) {
    const entries = Object.entries(input).filter(
      (entry): entry is [PlatformSettingKey, PlatformSettingValue] => isPlatformSettingKey(entry[0]) && entry[1] !== undefined,
    );

    await transaction(async (client) => {
      for (const [key, value] of entries) {
        await client.query(
          `INSERT INTO pd_platform_config (key, value, updated_by, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
          [key, toStorageValue(value), adminId],
        );
      }
    });

    const updatedKeys = entries.map(([key]) => key);
    await this.invalidateCache(updatedKeys);
    return updatedKeys;
  }

  async updateSectionSettings(
    section: PlatformSettingSection,
    input: Partial<Record<PlatformSettingKey, PlatformSettingValue>>,
    adminId: string,
  ) {
    const allowedKeys = new Set<PlatformSettingKey>(PLATFORM_SETTING_SECTION_KEYS[section]);
    const sectionInput: Partial<Record<PlatformSettingKey, PlatformSettingValue>> = {};
    for (const [key, value] of Object.entries(input)) {
      if (isPlatformSettingKey(key) && allowedKeys.has(key) && value !== undefined) {
        sectionInput[key] = value;
      }
    }
    return this.updateSettings(sectionInput, adminId);
  }
}

export const platformConfigService = new PlatformConfigService();
