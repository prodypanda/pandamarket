'use client';

import { fetchWithCsrf } from '@/lib/api';
import { MarketplaceAssetPicker } from '@/components/admin/MarketplaceAssetPicker';
import { HomepageBlocksEditor } from '@/components/admin/HomepageBlocksEditor';
import { AccountTwoFactorPanel } from '@/components/AccountTwoFactorPanel';
import { EmailTemplateManager } from '@/components/email/EmailTemplateManager';
import AdminPlansPage from '../plans/page';
import { type ReactNode, useEffect, useState } from 'react';
import { MessageSquare, Settings, Save, RotateCcw, Store, Wallet, Image as ImageIcon, ShieldCheck, ToggleLeft, UploadCloud, Construction, AlertTriangle, Headphones, Mail, Server, Send, CheckCircle2, XCircle, Eye, EyeOff, Shield, Globe2, SlidersHorizontal, CreditCard, Bell, BarChart3, Crown } from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';

interface PlatformSettings {
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
  marketplace_supported_locales: string;
  marketplace_rtl_enabled: boolean;
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
  marketplace_help_url: string;
  marketplace_terms_url: string;
  marketplace_privacy_url: string;
  marketplace_refund_url: string;
  marketplace_cookie_policy_url: string;
  marketplace_contact_url: string;
  catalog_featured_category_slugs: string;
  catalog_default_sort: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'title_asc';
  hub_homepage_layout: 'theme_default' | 'classic' | 'deals' | 'premium_deals' | 'alibaba' | 'amazon';
  hub_megamenu_style: 'standard' | 'visual_rich';
  hub_homepage_banner_title: string;
  hub_homepage_banner_subtitle: string;
  hub_homepage_banner_cta_label: string;
  hub_homepage_banner_cta_url: string;
  hub_homepage_banner_image_url: string;
  hub_homepage_blocks: string;
  analytics_ga4_enabled: boolean;
  analytics_ga4_measurement_id: string;
  analytics_gtm_enabled: boolean;
  analytics_gtm_container_id: string;
  analytics_meta_pixel_enabled: boolean;
  analytics_meta_pixel_id: string;
  search_console_verification: string;
  cloudflare_integration_enabled: boolean;
  cloudflare_account_id: string;
  cloudflare_zone_id: string;
  cloudflare_custom_hostnames_enabled: boolean;
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
  ai_tools_enabled: boolean;
  page_builder_enabled: boolean;
  plugins_marketplace_enabled: boolean;
  email_marketing_enabled: boolean;
  cart_enabled: boolean;
  shipping_enabled: boolean;
  shipping_self_managed_enabled: boolean;
  shipping_platform_unified_enabled: boolean;
  shipping_default_provider: 'auto' | 'aramex' | 'laposte' | 'platform';
  shipping_aramex_enabled: boolean;
  shipping_laposte_enabled: boolean;
  shipping_platform_fallback_enabled: boolean;
  shipping_default_origin_city: string;
  shipping_default_origin_country: string;
  shipping_domestic_zone_cities: string;
  shipping_remote_zone_cities: string;
  shipping_platform_flat_rate_tnd: number;
  shipping_domestic_zone_rate_tnd: number;
  shipping_remote_zone_rate_tnd: number;
  shipping_free_shipping_threshold_tnd: number;
  order_splitting_enabled: boolean;
  tax_mode: 'none' | 'included' | 'exclusive';
  default_tax_rate: number;
  price_rounding_mode: 'none' | 'nearest_0_001' | 'nearest_0_010' | 'nearest_0_100';
  auto_cancel_unpaid_enabled: boolean;
  auto_cancel_unpaid_minutes: number;
  retention_days_flouci: number;
  retention_days_konnect: number;
  retention_days_mandat: number;
  retention_days_cod: number;
  payout_schedule: 'manual' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
  min_withdrawal_tnd: number;
  max_upload_size_mb: number;
  max_product_images: number;
  max_products_per_store_free: number;
  default_low_stock_threshold: number;
  chat_message_rate_limit_per_minute: number;
  chat_max_images_per_message: number;
  chat_max_image_size_mb: number;
  chat_max_message_length: number;
  notifications_in_app_enabled: boolean;
  notifications_realtime_enabled: boolean;
  notifications_email_enabled: boolean;
  notifications_sms_enabled: boolean;
  notifications_sms_provider: 'environment' | 'console' | 'twilio' | 'infobip';
  notifications_sms_sender_name: string;
  security_login_max_attempts: number;
  security_login_lockout_minutes: number;
  security_password_min_length: number;
  security_password_require_uppercase: boolean;
  security_password_require_lowercase: boolean;
  security_password_require_number: boolean;
  security_password_require_symbol: boolean;
  security_2fa_required_roles: string;
  security_custom_domains_enabled: boolean;
  security_custom_domain_allowed_suffixes: string;
  security_custom_domain_blocked_suffixes: string;
  maintenance_enabled: boolean;
  maintenance_title: string;
  maintenance_message: string;
  maintenance_illustration_url: string;
  maintenance_eta: string;
  maintenance_allowed_ips: string;
  maintenance_block_storefronts: boolean;
  mandat_recipient_name: string;
  mandat_recipient_cin: string;
  mandat_recipient_city: string;
  platform_commission_rate: number;
  default_currency: string;
  payment_sandbox_mode: boolean;
  payment_flouci_enabled: boolean;
  payment_konnect_enabled: boolean;
  payment_mandat_enabled: boolean;
  payment_cod_enabled: boolean;
  payment_vendor_direct_enabled: boolean;
  payment_platform_credentials_source: 'environment' | 'platform_config' | 'vendor_direct_only';
}

type SettingsTab = 'marketplace' | 'commerce' | 'finance' | 'operations' | 'integrations' | 'plans' | 'email';
type PlatformSettingsTab = Exclude<SettingsTab, 'email' | 'plans'>;

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
  hub_megamenu_style: 'standard',
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
  mandat_recipient_name: 'PandaMarket SARL',
  mandat_recipient_cin: '',
  mandat_recipient_city: 'Tunis',
  platform_commission_rate: 15,
  default_currency: 'TND',
  payment_sandbox_mode: true,
  payment_flouci_enabled: true,
  payment_konnect_enabled: true,
  payment_mandat_enabled: true,
  payment_cod_enabled: true,
  payment_vendor_direct_enabled: true,
  payment_platform_credentials_source: 'environment',
  maintenance_enabled: false,
  maintenance_title: 'Maintenance en cours',
  maintenance_message: 'Notre plateforme est en cours de maintenance. Nous serons de retour très bientôt.',
  maintenance_illustration_url: '',
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
  { id: 'integrations', label: 'Integrations', description: 'Analytics, verification and Cloudflare metadata', icon: BarChart3 },
  { id: 'plans', label: 'Plans', description: 'Seller plans, prices, quotas and included features', icon: Crown },
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

type FreeTextSettingKey = Exclude<
  StringSettingKey,
  | 'marketplace_theme'
  | 'marketplace_default_locale'
  | 'chat_bubble_position'
  | 'catalog_default_sort'
  | 'hub_homepage_layout'
  | 'hub_megamenu_style'
  | 'shipping_default_provider'
  | 'notifications_sms_provider'
  | 'tax_mode'
  | 'price_rounding_mode'
  | 'payout_schedule'
  | 'payment_platform_credentials_source'
>;

const TEXT_SETTING_KEYS = [
  'marketplace_name',
  'marketplace_tagline',
  'marketplace_logo_url',
  'marketplace_logo_light_url',
  'marketplace_logo_dark_url',
  'marketplace_favicon_url',
  'marketplace_og_image_url',
  'marketplace_public_url',
  'marketplace_primary_color',
  'marketplace_secondary_color',
  'marketplace_supported_locales',
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
  'hub_homepage_banner_title',
  'hub_homepage_banner_subtitle',
  'hub_homepage_banner_cta_label',
  'hub_homepage_banner_cta_url',
  'hub_homepage_banner_image_url',
  'hub_homepage_blocks',
  'analytics_ga4_measurement_id',
  'analytics_gtm_container_id',
  'analytics_meta_pixel_id',
  'search_console_verification',
  'cloudflare_account_id',
  'cloudflare_zone_id',
  'shipping_default_origin_city',
  'shipping_default_origin_country',
  'shipping_domestic_zone_cities',
  'shipping_remote_zone_cities',
  'mandat_recipient_name',
  'mandat_recipient_cin',
  'mandat_recipient_city',
  'notifications_sms_sender_name',
  'security_2fa_required_roles',
  'security_custom_domain_allowed_suffixes',
  'security_custom_domain_blocked_suffixes',
  'maintenance_title',
  'maintenance_message',
  'maintenance_illustration_url',
  'maintenance_eta',
  'maintenance_allowed_ips',
] as const satisfies readonly FreeTextSettingKey[];

const NUMBER_SETTING_KEYS = [
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
  'max_upload_size_mb',
  'max_product_images',
  'max_products_per_store_free',
  'default_low_stock_threshold',
  'platform_commission_rate',
  'chat_message_rate_limit_per_minute',
  'chat_max_images_per_message',
  'chat_max_image_size_mb',
  'chat_max_message_length',
  'security_login_max_attempts',
  'security_login_lockout_minutes',
  'security_password_min_length',
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
] as const satisfies readonly BooleanSettingKey[];

const SETTINGS_TAB_KEYS: Record<PlatformSettingsTab, readonly (keyof PlatformSettings)[]> = {
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
    'hub_megamenu_style',
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

interface ToggleSetting {
  key: BooleanSettingKey;
  label: string;
  description: string;
}

function isPlatformSettingsTab(tab: SettingsTab): tab is PlatformSettingsTab {
  return tab !== 'email' && tab !== 'plans';
}

function buildSettingsPayload(current: PlatformSettings, tab?: PlatformSettingsTab): Partial<PlatformSettings> {
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
  payload.marketplace_default_locale = payload.marketplace_default_locale === 'ar' ? 'ar' : payload.marketplace_default_locale === 'en' ? 'en' : 'fr';
  payload.marketplace_primary_color = /^#[0-9A-Fa-f]{6}$/.test(payload.marketplace_primary_color) ? payload.marketplace_primary_color : DEFAULT_SETTINGS.marketplace_primary_color;
  payload.marketplace_secondary_color = /^#[0-9A-Fa-f]{6}$/.test(payload.marketplace_secondary_color) ? payload.marketplace_secondary_color : DEFAULT_SETTINGS.marketplace_secondary_color;
  payload.catalog_default_sort = payload.catalog_default_sort === 'oldest'
    ? 'oldest'
    : payload.catalog_default_sort === 'price_asc'
      ? 'price_asc'
      : payload.catalog_default_sort === 'price_desc'
        ? 'price_desc'
        : payload.catalog_default_sort === 'title_asc'
          ? 'title_asc'
          : 'newest';
  payload.hub_homepage_layout = payload.hub_homepage_layout === 'classic'
    ? 'classic'
    : payload.hub_homepage_layout === 'deals'
      ? 'deals'
      : payload.hub_homepage_layout === 'premium_deals'
        ? 'premium_deals'
        : payload.hub_homepage_layout === 'alibaba'
          ? 'alibaba'
          : payload.hub_homepage_layout === 'amazon'
            ? 'amazon'
            : 'theme_default';
  payload.shipping_default_provider = payload.shipping_default_provider === 'aramex'
    ? 'aramex'
    : payload.shipping_default_provider === 'laposte'
      ? 'laposte'
      : payload.shipping_default_provider === 'platform'
        ? 'platform'
        : 'auto';
  payload.shipping_default_origin_country = String(payload.shipping_default_origin_country || DEFAULT_SETTINGS.shipping_default_origin_country).trim().toUpperCase();
  payload.tax_mode = payload.tax_mode === 'included' ? 'included' : payload.tax_mode === 'exclusive' ? 'exclusive' : 'none';
  payload.price_rounding_mode = payload.price_rounding_mode === 'nearest_0_010'
    ? 'nearest_0_010'
    : payload.price_rounding_mode === 'nearest_0_100'
      ? 'nearest_0_100'
      : payload.price_rounding_mode === 'none'
        ? 'none'
        : 'nearest_0_001';
  payload.payout_schedule = payload.payout_schedule === 'daily'
    ? 'daily'
    : payload.payout_schedule === 'biweekly'
      ? 'biweekly'
      : payload.payout_schedule === 'monthly'
        ? 'monthly'
        : payload.payout_schedule === 'manual'
          ? 'manual'
          : 'weekly';
  payload.payment_platform_credentials_source = payload.payment_platform_credentials_source === 'platform_config'
    ? 'platform_config'
    : payload.payment_platform_credentials_source === 'vendor_direct_only'
      ? 'vendor_direct_only'
      : 'environment';
  payload.notifications_sms_provider = payload.notifications_sms_provider === 'console'
    ? 'console'
    : payload.notifications_sms_provider === 'twilio'
      ? 'twilio'
      : payload.notifications_sms_provider === 'infobip'
        ? 'infobip'
        : 'environment';
  payload.notifications_sms_sender_name = payload.notifications_sms_sender_name || DEFAULT_SETTINGS.notifications_sms_sender_name;
  payload.analytics_ga4_measurement_id = /^G-[A-Z0-9]{4,20}$/.test(payload.analytics_ga4_measurement_id) ? payload.analytics_ga4_measurement_id : '';
  payload.analytics_gtm_container_id = /^GTM-[A-Z0-9]{4,20}$/.test(payload.analytics_gtm_container_id) ? payload.analytics_gtm_container_id : '';
  payload.analytics_meta_pixel_id = /^\d{5,30}$/.test(payload.analytics_meta_pixel_id) ? payload.analytics_meta_pixel_id : '';
  payload.search_console_verification = /^[A-Za-z0-9_-]{0,255}$/.test(payload.search_console_verification) ? payload.search_console_verification : '';
  payload.cloudflare_account_id = /^[A-Za-z0-9_-]{0,128}$/.test(payload.cloudflare_account_id) ? payload.cloudflare_account_id : '';
  payload.cloudflare_zone_id = /^[A-Za-z0-9_-]{0,128}$/.test(payload.cloudflare_zone_id) ? payload.cloudflare_zone_id : '';
  payload.security_2fa_required_roles = String(payload.security_2fa_required_roles || '')
    .split(',')
    .map((role) => role.trim().toLowerCase())
    .filter((role) => ['customer', 'vendor', 'admin', 'super_admin'].includes(role))
    .join(',');
  payload.security_custom_domain_allowed_suffixes = String(payload.security_custom_domain_allowed_suffixes || '')
    .split(',')
    .map((suffix) => suffix.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean)
    .join(',');
  payload.security_custom_domain_blocked_suffixes = String(payload.security_custom_domain_blocked_suffixes || '')
    .split(',')
    .map((suffix) => suffix.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean)
    .join(',');
  payload.chat_bubble_position = payload.chat_bubble_position === 'bottom-left' ? 'bottom-left' : 'bottom-right';
  payload.default_currency = String(payload.default_currency || DEFAULT_SETTINGS.default_currency).trim().toUpperCase();

  if (!tab) return payload;

  const sectionPayload: Record<string, PlatformSettings[keyof PlatformSettings]> = {};
  for (const key of SETTINGS_TAB_KEYS[tab]) {
    sectionPayload[key] = payload[key];
  }
  return sectionPayload as Partial<PlatformSettings>;
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
  const [savedSettings, setSavedSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [marketplaceLogoPickerTarget, setMarketplaceLogoPickerTarget] = useState<'marketplace_logo_url' | 'marketplace_logo_light_url' | 'marketplace_logo_dark_url' | 'maintenance_illustration_url' | null>(null);
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

  function renderColorInput<K extends StringSettingKey>(key: K, label: string) {
    return (
      <div key={key} className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">{label}</label>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-stone-50 px-3 py-2.5">
          <input
            type="color"
            value={settings[key]}
            onChange={(e) => updateSetting(key, e.target.value as PlatformSettings[K])}
            className="h-9 w-12 rounded-lg border border-slate-200 bg-white"
          />
          <input
            type="text"
            value={settings[key]}
            onChange={(e) => updateSetting(key, e.target.value as PlatformSettings[K])}
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none"
          />
        </div>
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
        if (active) {
          const loadedSettings = { ...DEFAULT_SETTINGS, ...(data.data || {}) };
          setSettings(loadedSettings);
          setSavedSettings(loadedSettings);
        }
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
    if (!isPlatformSettingsTab(activeTab)) return;

    setSaving(true);
    setError('');
    try {
      const payload = buildSettingsPayload(settings, activeTab);
      const res = await fetchWithCsrf(`/api/pd/admin/settings/${activeTab}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json() as { data?: Partial<PlatformSettings> };
        const nextSettings = { ...DEFAULT_SETTINGS, ...(data.data || { ...settings, ...payload }) };
        setSettings(nextSettings);
        setSavedSettings(nextSettings);
        // Bust the cached hub pages so theme/layout changes show up immediately.
        fetch('/api/marketplace/revalidate', { method: 'POST', credentials: 'include' }).catch(() => undefined);
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

  const hasUnsavedPlatformChanges = isPlatformSettingsTab(activeTab)
    ? SETTINGS_TAB_KEYS[activeTab].some((key) => settings[key] !== savedSettings[key])
    : false;

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
            <p className={`text-sm font-medium ${hasUnsavedPlatformChanges ? 'text-amber-600' : 'text-slate-500'}`}>
              {hasUnsavedPlatformChanges ? 'Unsaved changes in this section — save before leaving.' : 'Review changes carefully, then save once.'}
            </p>
          </div>
        </div>
        <button
          onClick={activeTab === 'plans' ? undefined : activeTab === 'email' ? handleSmtpSave : handleSave}
          disabled={activeTab === 'plans' || (activeTab === 'email' ? smtpSaving || smtpLoading : saving)}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#B91C1C] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/25 transition-all hover:-translate-y-0.5 hover:bg-[#991B1B] hover:shadow-red-900/30 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {activeTab === 'email'
            ? smtpSaving ? <RotateCcw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />
            : saving ? <RotateCcw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {activeTab === 'plans' ? 'Use Plan Actions Below' : activeTab === 'email' ? smtpSaved ? 'Email Saved!' : 'Save Email Config' : saved ? 'Saved Successfully!' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">Loading settings...</div>}

      <div className="grid gap-3 rounded-[2rem] border border-slate-200/70 bg-white p-3 shadow-xl shadow-slate-200/40 md:grid-cols-2 xl:grid-cols-7">
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
          <div className="md:col-span-2 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            {renderTextInput('maintenance_illustration_url', 'Maintenance Illustration URL', '/pd-themes/maintenance.webp')}
            {settings.maintenance_illustration_url && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img src={settings.maintenance_illustration_url} alt="Maintenance illustration preview" className="h-36 w-full object-cover" />
              </div>
            )}
            <button
              type="button"
              onClick={() => setMarketplaceLogoPickerTarget('maintenance_illustration_url')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-3 py-2 text-xs font-bold text-white hover:bg-[#991B1B]"
            >
              <UploadCloud className="h-4 w-4" />
              Choose illustration
            </button>
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
          {renderTextInput('marketplace_support_whatsapp', 'Support WhatsApp', '+216 ...')}
          {renderTextInput('marketplace_address', 'Business Address')}
          {renderTextInput('marketplace_city', 'City')}
          {renderTextInput('marketplace_country', 'Country')}
          {renderTextInput('marketplace_business_hours', 'Business Hours', 'Mon–Fri 09:00–18:00')}
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Marketplace Logos</label>
            <p className="text-xs font-medium text-slate-500 ml-1">Use a dark logo on light surfaces and a light logo on dark surfaces. The main logo remains the fallback.</p>
            <div className="grid gap-4 rounded-[1.5rem] border border-slate-200/70 bg-stone-50 p-5 shadow-sm lg:grid-cols-3">
              {[
                { key: 'marketplace_logo_url' as const, label: 'Main Logo', value: settings.marketplace_logo_url, previewClass: 'bg-white' },
                { key: 'marketplace_logo_dark_url' as const, label: 'Dark Logo', value: settings.marketplace_logo_dark_url, previewClass: 'bg-white' },
                { key: 'marketplace_logo_light_url' as const, label: 'Light Logo', value: settings.marketplace_logo_light_url, previewClass: 'bg-slate-950' },
              ].map((logo) => (
                <div key={logo.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className={`flex h-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 ${logo.previewClass}`}>
                    {logo.value ? (
                      <div
                        aria-label={`${settings.marketplace_name} ${logo.label}`}
                        role="img"
                        className="h-full w-full bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${logo.value})` }}
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-900">{logo.label}</p>
                  <p className="text-xs font-medium text-slate-500">{logo.value ? 'Logo configured' : 'No logo selected'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {logo.value && (
                      <button
                        type="button"
                        onClick={() => updateSetting(logo.key, '')}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMarketplaceLogoPickerTarget(logo.key)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-3 py-2 text-xs font-bold text-white hover:bg-[#991B1B]"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Choose
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {renderColorInput('marketplace_primary_color', 'Primary Color')}
          {renderColorInput('marketplace_secondary_color', 'Secondary Color')}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Default Locale</label>
            <select
              value={settings.marketplace_default_locale}
              onChange={(e) => updateSetting('marketplace_default_locale', e.target.value as PlatformSettings['marketplace_default_locale'])}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="fr">French</option>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          {renderTextInput('marketplace_supported_locales', 'Supported Locales', 'fr,en,ar')}
          {renderToggle({
            key: 'marketplace_rtl_enabled',
            label: 'Enable RTL',
            description: 'Allow right-to-left rendering for supported languages such as Arabic.',
          })}
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
          {renderTextInput('marketplace_refund_url', 'Refund Policy URL', '/hub/search')}
          {renderTextInput('marketplace_cookie_policy_url', 'Cookie Policy URL', '/hub/search')}
          {renderTextInput('marketplace_contact_url', 'Contact URL', '/hub/search')}
        </div>
      </section>

      <section className={`${activeTab === 'marketplace' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<ImageIcon className="h-5 w-5" />}
          title="Hub Homepage and Catalog"
          description="Configure homepage layout, hero banner copy, featured category order, and the default product sort."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Homepage Layout</label>
            <select
              value={settings.hub_homepage_layout}
              onChange={(e) => updateSetting('hub_homepage_layout', e.target.value as PlatformSettings['hub_homepage_layout'])}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="theme_default">Theme default</option>
              <option value="classic">Classic marketplace</option>
              <option value="deals">Deals marketplace</option>
              <option value="premium_deals">Premium deals</option>
              <option value="alibaba">Alibaba B2B</option>
              <option value="amazon">Amazon classic</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Categories Megamenu Version</label>
            <select
              value={settings.hub_megamenu_style || 'standard'}
              onChange={(e) => updateSetting('hub_megamenu_style', e.target.value as PlatformSettings['hub_megamenu_style'])}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="standard">Version 1: Standard List (Alibaba Compact)</option>
              <option value="visual_rich">Version 2: Visual Rich (Pictures & Descriptions Showcase)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Default Product Sort</label>
            <select
              value={settings.catalog_default_sort}
              onChange={(e) => updateSetting('catalog_default_sort', e.target.value as PlatformSettings['catalog_default_sort'])}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="title_asc">Title A-Z</option>
            </select>
          </div>
          {renderTextInput('hub_homepage_banner_title', 'Banner Title', 'Your marketplace headline')}
          {renderTextInput('hub_homepage_banner_subtitle', 'Banner Subtitle', 'Short hero description')}
          {renderTextInput('hub_homepage_banner_cta_label', 'Banner CTA Label', 'Explorer le Hub')}
          {renderTextInput('hub_homepage_banner_cta_url', 'Banner CTA URL', '/hub/search')}
          <div className="md:col-span-2">
            {renderTextInput('hub_homepage_banner_image_url', 'Banner Image URL', '/pd-product-images/...')}
          </div>
          <div className="md:col-span-2">
            {renderTextInput('catalog_featured_category_slugs', 'Featured Category Slugs', 'electronics,beauty,home')}
          </div>
        </div>
      </section>

      <section className={`${activeTab === 'marketplace' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<SlidersHorizontal className="h-5 w-5" />}
          title="Homepage Blocks"
          description="Enable, reorder, and customize blocks, banners, CTAs, and hero slides for Alibaba, Amazon, AliExpress, and Classic homepages."
        />
        <HomepageBlocksEditor
          value={settings.hub_homepage_blocks}
          onChange={(next) => updateSetting('hub_homepage_blocks', next)}
        />
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
            { key: 'ai_tools_enabled' as const, label: 'AI Tools', description: 'Enable AI queues, credits, SEO helpers, image compression, and vendor AI provider settings.' },
            { key: 'page_builder_enabled' as const, label: 'Page Builder', description: 'Enable vendor Page Builder editing and storefront custom page rendering.' },
            { key: 'plugins_marketplace_enabled' as const, label: 'Plugins Marketplace', description: 'Expose plugin marketplace capabilities when the module is available.' },
            { key: 'email_marketing_enabled' as const, label: 'Email Marketing', description: 'Expose email marketing add-on capabilities when the module is available.' },
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

      <section className={`${activeTab === 'commerce' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<Store className="h-5 w-5" />}
          title="Shipping Carriers, Zones and Rates"
          description="Configure platform shipping carriers, default origin, city zones, and fallback rates used at checkout."
        />
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'shipping_self_managed_enabled' as const, label: 'Self-Managed Shipping', description: 'Allow vendors to handle their own logistics.' },
            { key: 'shipping_platform_unified_enabled' as const, label: 'Platform Unified Shipping', description: 'Allow platform carrier and fallback rate calculation.' },
            { key: 'shipping_aramex_enabled' as const, label: 'Aramex Carrier', description: 'Include Aramex in platform shipping quotes when credentials are available.' },
            { key: 'shipping_laposte_enabled' as const, label: 'La Poste Carrier', description: 'Include La Poste TN flat-rate estimates.' },
            { key: 'shipping_platform_fallback_enabled' as const, label: 'Platform Fallback Rate', description: 'Return configured flat/zone rates when live carrier rates are unavailable.' },
          ].map(renderToggle)}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Default Provider</label>
            <select
              value={settings.shipping_default_provider}
              onChange={(e) => updateSetting('shipping_default_provider', e.target.value as PlatformSettings['shipping_default_provider'])}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="auto">Auto</option>
              <option value="aramex">Aramex</option>
              <option value="laposte">La Poste</option>
              <option value="platform">Platform fallback</option>
            </select>
          </div>
          {renderTextInput('shipping_default_origin_city', 'Default Origin City', 'Tunis')}
          {renderTextInput('shipping_default_origin_country', 'Default Origin Country', 'TN')}
          {renderNumberInput('shipping_platform_flat_rate_tnd', 'Platform Flat Rate', 'TND', 0, 1000, 0.5)}
          {renderNumberInput('shipping_domestic_zone_rate_tnd', 'Domestic Zone Rate', 'TND', 0, 1000, 0.5)}
          {renderNumberInput('shipping_remote_zone_rate_tnd', 'Remote Zone Rate', 'TND', 0, 1000, 0.5)}
          {renderNumberInput('shipping_free_shipping_threshold_tnd', 'Free Shipping Threshold', 'TND', 0, 100000, 1)}
          <div className="md:col-span-2">
            {renderTextInput('shipping_domestic_zone_cities', 'Domestic Zone Cities', 'Tunis,Ariana,Ben Arous,Manouba')}
          </div>
          <div className="md:col-span-2">
            {renderTextInput('shipping_remote_zone_cities', 'Remote Zone Cities', 'Tozeur,Tataouine,Kebili')}
          </div>
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

      <section className={`${activeTab === 'commerce' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<SlidersHorizontal className="h-5 w-5" />}
          title="Tax, Rounding and Unpaid Orders"
          description="Configure platform-wide tax display mode, price rounding, and automatic cleanup for unpaid orders."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Tax Mode</label>
            <select
              value={settings.tax_mode}
              onChange={(e) => updateSetting('tax_mode', e.target.value as PlatformSettings['tax_mode'])}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="none">No tax display</option>
              <option value="included">Tax included in prices</option>
              <option value="exclusive">Tax added at checkout</option>
            </select>
          </div>
          {renderNumberInput('default_tax_rate', 'Default Tax Rate', '%', 0, 100, 0.1)}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Price Rounding</label>
            <select
              value={settings.price_rounding_mode}
              onChange={(e) => updateSetting('price_rounding_mode', e.target.value as PlatformSettings['price_rounding_mode'])}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="none">No rounding</option>
              <option value="nearest_0_001">Nearest 0.001</option>
              <option value="nearest_0_010">Nearest 0.010</option>
              <option value="nearest_0_100">Nearest 0.100</option>
            </select>
          </div>
          {renderNumberInput('auto_cancel_unpaid_minutes', 'Auto-Cancel After', 'minutes', 5, 10080)}
          {renderToggle({
            key: 'auto_cancel_unpaid_enabled',
            label: 'Auto-Cancel Unpaid Orders',
            description: 'Automatically cancel unpaid orders after the configured delay.',
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
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Payout Schedule</label>
            <select
              value={settings.payout_schedule}
              onChange={(e) => updateSetting('payout_schedule', e.target.value as PlatformSettings['payout_schedule'])}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="manual">Manual</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </section>

      <section className={`${activeTab === 'finance' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<CreditCard className="h-5 w-5" />}
          title="Payment Gateways"
          description="Enable or disable checkout gateways and control platform vs vendor-direct credential usage."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'payment_flouci_enabled' as const, label: 'Flouci', description: 'Allow checkout payments through Flouci.' },
            { key: 'payment_konnect_enabled' as const, label: 'Konnect', description: 'Allow checkout payments through Konnect.' },
            { key: 'payment_mandat_enabled' as const, label: 'Mandat Minute', description: 'Allow manual Mandat Minute payment instructions.' },
            { key: 'payment_cod_enabled' as const, label: 'Cash on Delivery', description: 'Allow COD orders when supported.' },
            { key: 'payment_sandbox_mode' as const, label: 'Sandbox Mode', description: 'Mark payment configuration as test/preproduction mode.' },
            { key: 'payment_vendor_direct_enabled' as const, label: 'Vendor Direct Credentials', description: 'Allow eligible sellers to use their encrypted gateway credentials.' },
          ].map(renderToggle)}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Platform Credentials Source</label>
            <select
              value={settings.payment_platform_credentials_source}
              onChange={(e) => updateSetting('payment_platform_credentials_source', e.target.value as PlatformSettings['payment_platform_credentials_source'])}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="environment">Environment secrets</option>
              <option value="platform_config">Platform config metadata</option>
              <option value="vendor_direct_only">Vendor direct only</option>
            </select>
          </div>
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

      <section className={`${activeTab === 'operations' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Security Controls"
          description="Configure login lockout thresholds, password strength rules, role-based 2FA enforcement, and custom-domain restrictions."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {renderNumberInput('security_login_max_attempts', 'Failed Login Attempts', 'attempts', 3, 20)}
          {renderNumberInput('security_login_lockout_minutes', 'Login Lockout Window', 'minutes', 1, 1440)}
          {renderNumberInput('security_password_min_length', 'Minimum Password Length', 'chars', 8, 72)}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'security_password_require_uppercase' as const, label: 'Require Uppercase', description: 'New and reset passwords must include at least one uppercase letter.' },
            { key: 'security_password_require_lowercase' as const, label: 'Require Lowercase', description: 'New and reset passwords must include at least one lowercase letter.' },
            { key: 'security_password_require_number' as const, label: 'Require Number', description: 'New and reset passwords must include at least one numeric digit.' },
            { key: 'security_password_require_symbol' as const, label: 'Require Symbol', description: 'New and reset passwords must include at least one non-alphanumeric symbol.' },
            { key: 'security_custom_domains_enabled' as const, label: 'Custom Domains', description: 'Allow eligible sellers to attach custom storefront domains.' },
          ].map(renderToggle)}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 text-xs font-semibold leading-relaxed text-amber-800">
            2FA role enforcement blocks token issuance for matching roles unless the account already has 2FA enabled. Use comma-separated roles: customer, vendor, admin, super_admin.
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {renderTextInput('security_2fa_required_roles', '2FA Required Roles', 'admin,super_admin')}
          {renderTextInput('security_custom_domain_allowed_suffixes', 'Allowed Domain Suffixes', 'example.com,market.tn')}
          {renderTextInput('security_custom_domain_blocked_suffixes', 'Blocked Domain Suffixes', 'localhost,pandamarket.tn')}
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

      <section className={`${activeTab === 'operations' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<Bell className="h-5 w-5" />}
          title="Notifications"
          description="Control in-app notifications, realtime WebSocket delivery, transactional email delivery, and SMS OTP provider routing."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'notifications_in_app_enabled' as const, label: 'In-App Notifications', description: 'Create notification records for buyers, sellers, and admins.' },
            { key: 'notifications_realtime_enabled' as const, label: 'Realtime WebSocket Push', description: 'Push in-app notifications instantly to connected users.' },
            { key: 'notifications_email_enabled' as const, label: 'Transactional Emails', description: 'Master switch for queued email delivery; SMTP credentials remain under the Email tab.' },
            { key: 'notifications_sms_enabled' as const, label: 'SMS OTP Verification', description: 'Allow phone verification codes to be sent through the configured SMS provider.' },
          ].map(renderToggle)}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">SMS Provider</label>
            <select
              value={settings.notifications_sms_provider}
              onChange={(e) => updateSetting('notifications_sms_provider', e.target.value as PlatformSettings['notifications_sms_provider'])}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="environment">Environment default</option>
              <option value="console">Console/log fallback</option>
              <option value="twilio">Twilio</option>
              <option value="infobip">Infobip</option>
            </select>
          </div>
          {renderTextInput('notifications_sms_sender_name', 'SMS Sender Name', 'PandaMarket')}
        </div>
      </section>

      <section className={`${activeTab === 'integrations' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<BarChart3 className="h-5 w-5" />}
          title="Analytics and Verification"
          description="Configure public analytics tags and site ownership verification metadata injected into the marketplace shell."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'analytics_ga4_enabled' as const, label: 'Google Analytics 4', description: 'Inject the configured GA4 measurement tag on public pages.' },
            { key: 'analytics_gtm_enabled' as const, label: 'Google Tag Manager', description: 'Inject the configured GTM container script and noscript iframe.' },
            { key: 'analytics_meta_pixel_enabled' as const, label: 'Meta Pixel', description: 'Inject the configured Meta Pixel base code and image fallback.' },
          ].map(renderToggle)}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 text-xs font-semibold leading-relaxed text-amber-800">
            Analytics identifiers are public by design. Do not paste API secrets, private tokens, or Cloudflare API tokens here.
          </div>
          {renderTextInput('analytics_ga4_measurement_id', 'GA4 Measurement ID', 'G-XXXXXXXXXX')}
          {renderTextInput('analytics_gtm_container_id', 'GTM Container ID', 'GTM-XXXXXXX')}
          {renderTextInput('analytics_meta_pixel_id', 'Meta Pixel ID', '123456789012345')}
          {renderTextInput('search_console_verification', 'Search Console Verification Token', 'google-site-verification token')}
        </div>
      </section>

      <section className={`${activeTab === 'integrations' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<Globe2 className="h-5 w-5" />}
          title="Cloudflare Metadata"
          description="Store non-secret Cloudflare account and zone identifiers for operational visibility and future custom-hostname automation."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'cloudflare_integration_enabled' as const, label: 'Cloudflare Integration', description: 'Mark Cloudflare as the active CDN/DNS integration for the marketplace.' },
            { key: 'cloudflare_custom_hostnames_enabled' as const, label: 'Custom Hostname Automation', description: 'Allow future custom-domain automation to use Cloudflare SaaS custom hostname metadata.' },
          ].map(renderToggle)}
          {renderTextInput('cloudflare_account_id', 'Cloudflare Account ID', 'account identifier')}
          {renderTextInput('cloudflare_zone_id', 'Cloudflare Zone ID', 'zone identifier')}
        </div>
      </section>

      <section className={`${activeTab === 'plans' ? '' : 'hidden'}`}>
        <AdminPlansPage />
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
        open={marketplaceLogoPickerTarget !== null}
        title={marketplaceLogoPickerTarget === 'maintenance_illustration_url' ? 'Maintenance illustration gallery' : 'Marketplace logo gallery'}
        type="image"
        onClose={() => setMarketplaceLogoPickerTarget(null)}
        onSelect={(url) => {
          if (marketplaceLogoPickerTarget) updateSetting(marketplaceLogoPickerTarget, url);
          setMarketplaceLogoPickerTarget(null);
        }}
      />
    </div>
  );
}
