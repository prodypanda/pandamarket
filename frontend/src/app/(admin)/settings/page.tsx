'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { MarketplaceAssetPicker } from '@/components/admin/MarketplaceAssetPicker';
import { HomepageBlocksEditor } from '@/components/admin/HomepageBlocksEditor';
import { HeroCarouselEditor } from '@/components/admin/HeroCarouselEditor';
import { AccountTwoFactorPanel } from '@/components/AccountTwoFactorPanel';
import { EmailTemplateManager } from '@/components/email/EmailTemplateManager';
import AdminPlansPage from '../plans/page';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Settings, Save, RotateCcw, Store, Wallet, Image as ImageIcon, ShieldCheck, ToggleLeft, UploadCloud, Construction, AlertTriangle, Headphones, Mail, Server, Send, CheckCircle2, XCircle, Eye, EyeOff, Shield, Globe2, SlidersHorizontal, CreditCard, Bell, BarChart3, Crown, LayoutGrid, Truck, Gift, Copy } from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import {
  getDirtySettingsKeys,
  mergeServerSettingsPreservingDrafts,
  mergeSavedSettings,
  mergeSubmittedSettings,
  pickChangedSettings,
  type PlatformSettingsResponse,
  type SettingsSectionVersions,
} from '@/lib/admin-settings-save';
import { type PlatformSettings as SharedPlatformSettings, type PlatformSettingsTab as SharedPlatformSettingsTab } from '@/types/settings';

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
  hub_homepage_pagination_style: 'infinite' | 'load_more' | 'pagination' | 'none';
  hub_megamenu_style: 'standard' | 'visual_rich' | 'ultra_rich' | 'ultra_rich_deep';
  hub_megamenu_lazy_loading: boolean;
  hub_category_page_style: 'v1_classic' | 'v2_modern_showcase';
  hub_homepage_banner_title: string;
  hub_homepage_banner_subtitle: string;
  hub_homepage_banner_cta_label: string;
  hub_homepage_banner_cta_url: string;
  hub_homepage_banner_image_url: string;
  hub_homepage_blocks: string;
  hub_hero_show_category_sidebar: boolean;
  hub_hero_show_carousel: boolean;
  hub_hero_show_seller_rail: boolean;
  hub_hero_category_sidebar_max_items: number;
  hub_hero_carousel_max_categories: number;
  hub_hero_carousel_slides: string;
  hub_hero_carousel_source_mode: string;
  hub_hero_carousel_autoplay: boolean;
  hub_hero_carousel_interval: number;
  hub_hero_carousel_transition: string;
  hub_hero_carousel_dots_style: string;
  hub_hero_carousel_show_arrows: boolean;
  hub_hero_seller_rail_title: string;
  hub_hero_seller_rail_subtitle: string;
  hub_hero_seller_rail_cta_label: string;
  hub_hero_seller_rail_cta_url: string;
  hub_hero_seller_rail_badge_text: string;
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
  rewards_widget_enabled: boolean;
  rewards_widget_button_label: string;
  rewards_widget_prizes_json: string;
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
  image_size_thumbnail_w: number;
  image_size_thumbnail_h: number;
  image_size_thumbnail_crop: 'cover' | 'inside';
  image_size_small_w: number;
  image_size_small_h: number;
  image_size_small_crop: 'cover' | 'inside';
  image_size_medium_w: number;
  image_size_medium_h: number;
  image_size_medium_crop: 'cover' | 'inside';
  image_size_large_w: number;
  image_size_large_h: number;
  image_size_large_crop: 'cover' | 'inside';
  image_quality_webp: number;
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
  platform_commission_rate: number;
  default_currency: string;
  payment_sandbox_mode: boolean;
  payment_flouci_enabled: boolean;
  payment_konnect_enabled: boolean;
  payment_paypal_enabled: boolean;
  payment_paypal_mode: 'sandbox' | 'live';
  payment_paypal_sandbox_client_id: string;
  payment_paypal_sandbox_client_secret: string;
  payment_paypal_sandbox_webhook_id: string;
  payment_paypal_live_client_id: string;
  payment_paypal_live_client_secret: string;
  payment_paypal_live_webhook_id: string;
  payment_paypal_currency: string;
  payment_paypal_fx_rate_tnd_to_target: number;
  payment_mandat_enabled: boolean;
  payment_cod_enabled: boolean;
  payment_vendor_direct_enabled: boolean;
  payment_platform_credentials_source: 'environment' | 'platform_config' | 'vendor_direct_only';
  mandat_recipient_name: string;
  mandat_recipient_cin: string;
  mandat_recipient_city: string;
  mandat_proof_email: string;
}

type SettingsTab = 'marketplace' | 'commerce' | 'finance' | 'shipping' | 'security' | 'operations' | 'integrations' | 'plans' | 'email';
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
  marketplace_public_url: 'https://garbage.team',
  marketplace_theme: 'panda',
  marketplace_primary_color: '#16C784',
  marketplace_secondary_color: '#0f9f6e',
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
  hub_homepage_pagination_style: 'infinite',
  hub_megamenu_style: 'standard',
  hub_megamenu_lazy_loading: true,
  hub_category_page_style: 'v1_classic',
  hub_homepage_banner_title: '',
  hub_homepage_banner_subtitle: '',
  hub_homepage_banner_cta_label: 'Explorer le Hub',
  hub_homepage_banner_cta_url: '/hub/search',
  hub_homepage_banner_image_url: '',
  hub_homepage_blocks: '',
  hub_hero_show_category_sidebar: true,
  hub_hero_show_carousel: true,
  hub_hero_show_seller_rail: true,
  hub_hero_category_sidebar_max_items: 14,
  hub_hero_carousel_max_categories: 5,
  hub_hero_carousel_slides: '[]',
  hub_hero_carousel_source_mode: 'hybrid',
  hub_hero_carousel_autoplay: true,
  hub_hero_carousel_interval: 6000,
  hub_hero_carousel_transition: 'slide',
  hub_hero_carousel_dots_style: 'pill',
  hub_hero_carousel_show_arrows: true,
  hub_hero_seller_rail_title: 'Accès Vendeurs & Fournisseurs',
  hub_hero_seller_rail_subtitle: 'Ouvrez votre boutique B2B ou accédez à votre espace fournisseur',
  hub_hero_seller_rail_cta_label: 'Espace Vendeur',
  hub_hero_seller_rail_cta_url: '/hub/dashboard',
  hub_hero_seller_rail_badge_text: 'PandaMarket B2B',
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
  rewards_widget_enabled: true,
  rewards_widget_button_label: "🎁 Gagnez jusqu'à 15 DT !",
  rewards_widget_prizes_json: '[{"label":"5 DT Offerts","code":"CHANCE5DT","disc":5.0,"icon":"🎟️","color":"#EF4444","desc":"5.000 DT de remise immédiate sur votre panier"},{"label":"Livraison 0 DT","code":"LIVRAISON_ZERO","disc":7.0,"icon":"🚚","color":"#10B981","desc":"Frais de livraison 100% offerts"},{"label":"-10% Panier","code":"PANDA10","disc":10,"icon":"🔥","color":"#F59E0B","desc":"10% de réduction immédiate sur toute votre commande"},{"label":"15 DT Cadeau","code":"SUPER15","disc":15.0,"icon":"🎁","color":"#8B5CF6","desc":"15.000 DT de réduction dès 80 DT d’achat"},{"label":"-5% Fidélité","code":"FIDELITE5","disc":5,"icon":"⭐","color":"#3B82F6","desc":"5% de réduction exclusive client"},{"label":"5 DT Offerts","code":"CHANCE5DT","disc":5.0,"icon":"🎟️","color":"#EC4899","desc":"5.000 DT de remise immédiate"}]',
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
  image_size_thumbnail_w: 150,
  image_size_thumbnail_h: 150,
  image_size_thumbnail_crop: 'cover',
  image_size_small_w: 300,
  image_size_small_h: 300,
  image_size_small_crop: 'inside',
  image_size_medium_w: 600,
  image_size_medium_h: 600,
  image_size_medium_crop: 'inside',
  image_size_large_w: 1200,
  image_size_large_h: 1200,
  image_size_large_crop: 'inside',
  image_quality_webp: 82,
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
  mandat_recipient_cin: '01234567',
  mandat_recipient_city: 'Tunis',
  mandat_proof_email: 'billing@pandamarket.tn',
  platform_commission_rate: 15,
  default_currency: 'TND',
  payment_sandbox_mode: true,
  payment_flouci_enabled: true,
  payment_konnect_enabled: true,
  payment_paypal_enabled: true,
  payment_paypal_mode: 'sandbox',
  payment_paypal_sandbox_client_id: '',
  payment_paypal_sandbox_client_secret: '',
  payment_paypal_sandbox_webhook_id: '',
  payment_paypal_live_client_id: '',
  payment_paypal_live_client_secret: '',
  payment_paypal_live_webhook_id: '',
  payment_paypal_currency: 'EUR',
  payment_paypal_fx_rate_tnd_to_target: 0.30,
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
  { id: 'marketplace', label: 'Marketplace & Hero', description: 'Identity, branding, themes, megamenu & hero builder', icon: Globe2 },
  { id: 'commerce', label: 'Commerce & Catalog', description: 'Product rules, moderation, reviews, AI & builder', icon: SlidersHorizontal },
  { id: 'finance', label: 'Finance & Payments', description: 'Gateways, Flouci, Konnect, commissions & payouts', icon: CreditCard },
  { id: 'shipping', label: 'Shipping & Delivery', description: 'Aramex, La Poste, platform delivery & zone rates', icon: Truck },
  { id: 'security', label: 'Security & Governance', description: 'Login security, password rules, custom domains & 2FA', icon: ShieldCheck },
  { id: 'operations', label: 'Platform Operations', description: 'Maintenance mode, storage limits & chat quotas', icon: Shield },
  { id: 'integrations', label: 'Integrations & Webmaster', description: 'GA4, GTM, Meta Pixel, Cloudflare & Search Console', icon: BarChart3 },
  { id: 'plans', label: 'Subscription Plans', description: 'Seller plans, prices, quotas and feature matrix', icon: Crown },
  { id: 'email', label: 'Transactional Emails', description: 'SMTP provider, credentials, test sender & templates', icon: Mail },
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
  | 'hub_homepage_pagination_style'
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
  'hub_hero_carousel_slides',
  'hub_hero_carousel_source_mode',
  'hub_hero_carousel_transition',
  'hub_hero_carousel_dots_style',
  'hub_hero_seller_rail_title',
  'hub_hero_seller_rail_subtitle',
  'hub_hero_seller_rail_cta_label',
  'hub_hero_seller_rail_cta_url',
  'hub_hero_seller_rail_badge_text',
  'payment_paypal_sandbox_client_id',
  'payment_paypal_sandbox_client_secret',
  'payment_paypal_sandbox_webhook_id',
  'payment_paypal_live_client_id',
  'payment_paypal_live_client_secret',
  'payment_paypal_live_webhook_id',
  'payment_paypal_currency',
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
  'mandat_proof_email',
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
  'payment_paypal_fx_rate_tnd_to_target',
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
  'hub_hero_category_sidebar_max_items',
  'hub_hero_carousel_max_categories',
  'hub_hero_carousel_interval',
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
  'rewards_widget_enabled',
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
  'payment_paypal_enabled',
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
  'hub_hero_show_category_sidebar',
  'hub_hero_show_carousel',
  'hub_hero_show_seller_rail',
  'hub_hero_carousel_autoplay',
  'hub_hero_carousel_show_arrows',
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
    'hub_homepage_pagination_style',
    'hub_megamenu_style',
    'hub_megamenu_lazy_loading',
    'hub_category_page_style',
    'hub_homepage_banner_title',
    'hub_homepage_banner_subtitle',
    'hub_homepage_banner_cta_label',
    'hub_homepage_banner_cta_url',
    'hub_homepage_banner_image_url',
    'hub_homepage_blocks',
    'hub_hero_show_category_sidebar',
    'hub_hero_show_carousel',
    'hub_hero_show_seller_rail',
    'hub_hero_category_sidebar_max_items',
    'hub_hero_carousel_max_categories',
    'hub_hero_carousel_slides',
    'hub_hero_carousel_source_mode',
    'hub_hero_carousel_autoplay',
    'hub_hero_carousel_interval',
    'hub_hero_carousel_transition',
    'hub_hero_carousel_dots_style',
    'hub_hero_carousel_show_arrows',
    'hub_hero_seller_rail_title',
    'hub_hero_seller_rail_subtitle',
    'hub_hero_seller_rail_cta_label',
    'hub_hero_seller_rail_cta_url',
    'hub_hero_seller_rail_badge_text',
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
    'rewards_widget_enabled',
    'rewards_widget_button_label',
    'rewards_widget_prizes_json',
    'cart_enabled',
    'catalog_featured_category_slugs',
    'catalog_default_sort',
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
    'payment_paypal_enabled',
    'payment_paypal_mode',
    'payment_paypal_sandbox_client_id',
    'payment_paypal_sandbox_client_secret',
    'payment_paypal_sandbox_webhook_id',
    'payment_paypal_live_client_id',
    'payment_paypal_live_client_secret',
    'payment_paypal_live_webhook_id',
    'payment_paypal_currency',
    'payment_paypal_fx_rate_tnd_to_target',
    'payment_mandat_enabled',
    'payment_cod_enabled',
    'payment_vendor_direct_enabled',
    'payment_platform_credentials_source',
    'mandat_recipient_name',
    'mandat_recipient_cin',
    'mandat_recipient_city',
    'mandat_proof_email',
  ],
  shipping: [
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
  ],
  security: [
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

interface SettingsSearchItem {
  key: string;
  tab: SettingsTab;
  label: string;
  description: string;
  keywords: string[];
}

const SETTINGS_SEARCH_INDEX: SettingsSearchItem[] = [
  // Marketplace & Hero
  { key: 'marketplace_name', tab: 'marketplace', label: 'Marketplace Name', description: 'Brand and display name of the marketplace platform', keywords: ['name', 'brand', 'nom', 'title'] },
  { key: 'marketplace_tagline', tab: 'marketplace', label: 'Marketplace Tagline', description: 'Subtitle and promotional tagline displayed in headers and metadata', keywords: ['tagline', 'slogan', 'description', 'subtitle'] },
  { key: 'marketplace_logo_url', tab: 'marketplace', label: 'Main Logo URL', description: 'Primary logo image URL for standard light backgrounds', keywords: ['logo', 'image', 'brand', 'header'] },
  { key: 'marketplace_logo_light_url', tab: 'marketplace', label: 'Light Logo URL', description: 'Alternative logo for dark/colored background surfaces', keywords: ['logo', 'light', 'white', 'brand'] },
  { key: 'marketplace_logo_dark_url', tab: 'marketplace', label: 'Dark Logo URL', description: 'Alternative logo for bright/white background surfaces', keywords: ['logo', 'dark', 'black', 'brand'] },
  { key: 'marketplace_favicon_url', tab: 'marketplace', label: 'Favicon URL', description: 'Browser tab icon image URL', keywords: ['favicon', 'icon', 'tab'] },
  { key: 'marketplace_og_image_url', tab: 'marketplace', label: 'OpenGraph Share Image', description: 'Default banner image for social sharing previews (FB, Twitter, WhatsApp)', keywords: ['og', 'image', 'share', 'social', 'preview'] },
  { key: 'marketplace_public_url', tab: 'marketplace', label: 'Public Canonical URL', description: 'Production public base URL of the marketplace', keywords: ['url', 'domain', 'canonical', 'link'] },
  { key: 'marketplace_theme', tab: 'marketplace', label: 'Marketplace Visual Theme', description: 'Active marketplace design aesthetic (PandaMarket, AliExpress, AliExpress 2.0)', keywords: ['theme', 'style', 'design', 'aliexpress', 'skin'] },
  { key: 'marketplace_primary_color', tab: 'marketplace', label: 'Primary Brand Color', description: 'Primary accent color across all Hub homepage layouts and controls', keywords: ['color', 'primary', 'brand', 'green', 'couleur', 'accent'] },
  { key: 'marketplace_secondary_color', tab: 'marketplace', label: 'Secondary Brand Color', description: 'Secondary accent color for badges, gradients, and buttons', keywords: ['color', 'secondary', 'brand', 'couleur', 'accent'] },
  { key: 'marketplace_default_locale', tab: 'marketplace', label: 'Default Locale', description: 'Default storefront language (French, English, Arabic)', keywords: ['language', 'locale', 'french', 'arabic', 'english', 'langue'] },
  { key: 'marketplace_rtl_enabled', tab: 'marketplace', label: 'RTL (Right-to-Left) Support', description: 'Enable bidirectional Arabic layout support across buyer surfaces', keywords: ['rtl', 'arabic', 'direction', 'layout'] },
  { key: 'hub_homepage_layout', tab: 'marketplace', label: 'Hub Homepage Layout', description: 'Homepage arrangement style (Classic, Deals, Premium Deals, Alibaba, Amazon)', keywords: ['layout', 'homepage', 'amazon', 'alibaba', 'deals', 'grid'] },
  { key: 'hub_homepage_pagination_style', tab: 'marketplace', label: 'Product Pagination Mode', description: 'Choose between Infinite Scroll, Load More button, or Numeric Pagination', keywords: ['pagination', 'scroll', 'infinite', 'load more', 'pages'] },
  { key: 'hub_megamenu_style', tab: 'marketplace', label: 'Header Mega Menu Style', description: 'Visual density and showcase mode of the header category dropdown', keywords: ['megamenu', 'menu', 'categories', 'navigation', 'dropdown'] },
  { key: 'hub_hero_show_carousel', tab: 'marketplace', label: 'Hero Promotional Carousel', description: 'Toggle promotional hero banner carousel slider', keywords: ['carousel', 'slider', 'banner', 'hero', 'promo'] },
  { key: 'hub_hero_show_category_sidebar', tab: 'marketplace', label: 'Hero Category Sidebar Rail', description: 'Toggle left-side quick category rail in the hero section', keywords: ['sidebar', 'category', 'rail', 'hero'] },
  { key: 'hub_hero_show_seller_rail', tab: 'marketplace', label: 'Hero Seller Onboarding Rail', description: 'Promotional right-side widget encouraging new seller signups', keywords: ['seller', 'rail', 'onboarding', 'signup', 'vendor'] },
  { key: 'hub_homepage_banner_title', tab: 'marketplace', label: 'Promotional Banner Title', description: 'Headline for the secondary homepage promotional banner', keywords: ['banner', 'title', 'promo', 'headline'] },
  { key: 'hub_homepage_banner_image_url', tab: 'marketplace', label: 'Promotional Banner Image', description: 'Background asset for homepage banner', keywords: ['banner', 'image', 'promo'] },

  // Commerce & Catalog
  { key: 'marketplace_enabled', tab: 'commerce', label: 'Marketplace Active State', description: 'Master switch to open or pause general marketplace transactions', keywords: ['marketplace', 'active', 'status', 'open', 'pause'] },
  { key: 'vendor_registration_enabled', tab: 'commerce', label: 'Vendor Registration Open', description: 'Allow new merchants and creators to sign up and open stores', keywords: ['vendor', 'seller', 'signup', 'registration', 'vendeur'] },
  { key: 'buyer_registration_enabled', tab: 'commerce', label: 'Buyer Registration Open', description: 'Allow new buyers to register accounts on the platform', keywords: ['buyer', 'client', 'signup', 'registration', 'acheteur'] },
  { key: 'product_moderation_required', tab: 'commerce', label: 'Product Moderation Queue', description: 'Require admin review before unverified seller listings go live', keywords: ['moderation', 'approval', 'review', 'products', 'validation'] },
  { key: 'product_auto_publish_verified', tab: 'commerce', label: 'Auto-Publish for Verified Sellers', description: 'Automatically publish listings from verified and trusted merchants', keywords: ['auto publish', 'verified', 'instant'] },
  { key: 'seller_type_change_auto_approval', tab: 'commerce', label: 'Seller Tier Upgrade Approval', description: 'Auto-approve seller tier change requests without manual review', keywords: ['seller type', 'tier', 'approval', 'upgrade'] },
  { key: 'reviews_enabled', tab: 'commerce', label: 'Customer Reviews System', description: 'Allow verified buyers to leave ratings and text reviews', keywords: ['reviews', 'ratings', 'avis', 'commentaires', 'stars'] },
  { key: 'wishlist_enabled', tab: 'commerce', label: 'Buyer Wishlist Feature', description: 'Allow buyers to bookmark and save favorite products', keywords: ['wishlist', 'favoris', 'bookmark', 'heart'] },
  { key: 'ai_tools_enabled', tab: 'commerce', label: 'AI Assistant & Copilot Tools', description: 'Enable Gemini AI copywriter, SEO generator, and product enhancers for sellers', keywords: ['ai', 'gemini', 'copilot', 'generator', 'intelligence'] },
  { key: 'page_builder_enabled', tab: 'commerce', label: 'Storefront Drag-and-Drop Page Builder', description: 'Allow merchants to design custom landing pages and visual blocks', keywords: ['page builder', 'blocks', 'landing', 'customizer'] },
  { key: 'rewards_widget_enabled', tab: 'commerce', label: 'Gamified Rewards & Wheel Widget', description: 'Enable floating gamification wheel and scratch cards for customer retention', keywords: ['rewards', 'wheel', 'gamification', 'roulette', 'cadeau', 'prizes', 'spin'] },
  { key: 'rewards_widget_prizes_json', tab: 'commerce', label: 'Wheel Prize Slices & Coupons', description: 'Configure wheel slices, promo coupon codes, discounts, and colors', keywords: ['rewards', 'prizes', 'coupons', 'wheel', 'slices', 'promos'] },
  { key: 'catalog_default_sort', tab: 'commerce', label: 'Catalog Default Sort Order', description: 'Default sorting for catalog and search listings (newest, price, popularity)', keywords: ['sort', 'catalog', 'tri', 'order', 'default'] },
  { key: 'tax_mode', tab: 'commerce', label: 'Tax Mode & Calculations', description: 'Tax display mode (tax included, tax exclusive, or none)', keywords: ['tax', 'tva', 'included', 'exclusive', 'impot'] },
  { key: 'default_tax_rate', tab: 'commerce', label: 'Default Tax Rate (%)', description: 'Default VAT / TVA percentage rate applied to taxable catalog items', keywords: ['tax rate', 'tva', 'taux', 'percentage'] },
  { key: 'price_rounding_mode', tab: 'commerce', label: 'Price Rounding Mode', description: 'Rounding precision for currency display and conversions', keywords: ['rounding', 'arrondi', 'price', 'precision'] },
  { key: 'auto_cancel_unpaid_enabled', tab: 'commerce', label: 'Auto-Cancel Unpaid Orders', description: 'Automatically release stock and cancel orders unpaid within time limit', keywords: ['cancel', 'unpaid', 'timeout', 'orders', 'expiration'] },

  // Finance & Payments
  { key: 'payment_flouci_enabled', tab: 'finance', label: 'Flouci Mobile Wallet Gateway', description: 'Enable fast mobile payment and QR code checkout via Flouci Tunisia', keywords: ['flouci', 'payment', 'wallet', 'gateway', 'paiement', 'mobile'] },
  { key: 'payment_konnect_enabled', tab: 'finance', label: 'Konnect Tunisia Payment Gateway', description: 'Accept bank cards (Carte Bancaire, e-Dinar, Visa, Mastercard) through Konnect', keywords: ['konnect', 'payment', 'carte', 'edinar', 'visa', 'mastercard'] },
  { key: 'payment_paypal_enabled', tab: 'finance', label: 'PayPal Global Gateway', description: 'Accept international payments with automatic currency FX conversion', keywords: ['paypal', 'gateway', 'international', 'usd', 'eur'] },
  { key: 'payment_mandat_enabled', tab: 'finance', label: 'Mandat Minute / Postal Wire', description: 'Allow offline payments via Tunisian Post (La Poste Mandat Minute)', keywords: ['mandat', 'poste', 'wire', 'postal', 'offline'] },
  { key: 'payment_cod_enabled', tab: 'finance', label: 'Cash on Delivery (COD)', description: 'Allow buyers to pay the courier in cash upon package delivery', keywords: ['cod', 'cash', 'delivery', 'livraison', 'especes', 'paiement'] },
  { key: 'payment_sandbox_mode', tab: 'finance', label: 'Payment Test / Sandbox Mode', description: 'Run all payment gateway transactions in test/staging sandbox environment', keywords: ['sandbox', 'test', 'mode', 'simulation'] },
  { key: 'platform_commission_rate', tab: 'finance', label: 'Platform Marketplace Commission (%)', description: 'Standard commission percentage retained by the marketplace on sales', keywords: ['commission', 'rate', 'percentage', 'fee', 'frais'] },
  { key: 'min_withdrawal_tnd', tab: 'finance', label: 'Minimum Vendor Payout Withdrawal (TND)', description: 'Minimum wallet balance required for sellers to request a payout transfer', keywords: ['payout', 'withdrawal', 'minimum', 'retrait', 'solde'] },
  { key: 'payout_schedule', tab: 'finance', label: 'Automated Payout Schedule', description: 'Frequency of vendor wallet settlements (Daily, Weekly, Bi-weekly, Monthly, Manual)', keywords: ['payout', 'schedule', 'settlement', 'virement', 'frequence'] },
  { key: 'default_currency', tab: 'finance', label: 'Default Marketplace Currency', description: 'Standard platform currency code (TND, EUR, USD)', keywords: ['currency', 'devise', 'tnd', 'dinar'] },

  // Shipping & Delivery
  { key: 'shipping_enabled', tab: 'shipping', label: 'Platform Shipping Management', description: 'Master switch for automated platform shipping and rate calculation', keywords: ['shipping', 'delivery', 'livraison', 'expedition'] },
  { key: 'shipping_aramex_enabled', tab: 'shipping', label: 'Aramex Courier Integration', description: 'Automate tracking number generation and package pickup with Aramex', keywords: ['aramex', 'shipping', 'courier', 'livraison', 'tracking'] },
  { key: 'shipping_laposte_enabled', tab: 'shipping', label: 'Rapid-Poste / La Poste Delivery', description: 'National postal parcel delivery service integration', keywords: ['laposte', 'rapidposte', 'poste', 'shipping', 'colis'] },
  { key: 'shipping_platform_flat_rate_tnd', tab: 'shipping', label: 'Flat Standard Shipping Fee (TND)', description: 'Base shipping cost applied to customer carts in standard zones', keywords: ['rate', 'fee', 'shipping', 'frais', 'livraison', 'tarif'] },
  { key: 'shipping_free_shipping_threshold_tnd', tab: 'shipping', label: 'Free Shipping Order Threshold (TND)', description: 'Cart subtotal amount above which shipping becomes 100% free', keywords: ['free shipping', 'threshold', 'gratuite', 'livraison gratuite'] },
  { key: 'shipping_domestic_zone_cities', tab: 'shipping', label: 'Domestic Coastal Zone Cities', description: 'List of standard tier cities (e.g. Tunis, Ariana, Sousse, Sfax)', keywords: ['cities', 'zones', 'domestic', 'villes', 'regions'] },
  { key: 'shipping_remote_zone_cities', tab: 'shipping', label: 'Remote / South Zone Cities', description: 'List of extended delivery zone cities requiring higher freight rates', keywords: ['remote', 'south', 'zones', 'regions', 'lointaines'] },

  // Security & Governance
  { key: 'security_login_max_attempts', tab: 'security', label: 'Max Failed Login Attempts', description: 'Failed login attempts allowed before IP/account temporary lockout', keywords: ['security', 'login', 'attempts', 'lockout', 'connexion', 'securite'] },
  { key: 'security_password_min_length', tab: 'security', label: 'Minimum Password Length', description: 'Enforce strong user and merchant password length policy', keywords: ['password', 'length', 'mot de passe', 'security'] },
  { key: 'security_2fa_required_roles', tab: 'security', label: 'Enforced Two-Factor (2FA) Roles', description: 'User roles required to set up 2FA (admin, super_admin, vendor)', keywords: ['2fa', 'two-factor', 'otp', 'authenticator', 'securite'] },
  { key: 'security_custom_domains_enabled', tab: 'security', label: 'Seller Custom Domains Support', description: 'Allow sellers to connect their own custom domains with SSL certificate', keywords: ['custom domain', 'domain', 'dns', 'cname', 'ssl'] },

  // Platform Operations
  { key: 'maintenance_enabled', tab: 'operations', label: 'Platform Maintenance Mode', description: 'Lock public buyer storefronts with custom outage announcement screen', keywords: ['maintenance', 'outage', 'lock', 'status', 'fermeture'] },
  { key: 'maintenance_title', tab: 'operations', label: 'Maintenance Screen Title', description: 'Headline shown to visitors during maintenance downtime', keywords: ['maintenance', 'title', 'headline'] },
  { key: 'maintenance_allowed_ips', tab: 'operations', label: 'Maintenance IP Whitelist', description: 'Comma-separated IP addresses allowed to bypass maintenance mode', keywords: ['ip', 'whitelist', 'bypass', 'maintenance'] },
  { key: 'chat_bubble_enabled', tab: 'operations', label: 'Live Storefront Support Chat', description: 'Toggle floating buyer-to-vendor direct live chat widget', keywords: ['chat', 'bubble', 'support', 'live', 'messaging'] },
  { key: 'max_upload_size_mb', tab: 'operations', label: 'Max File Upload Size (MB)', description: 'Maximum allowed attachment and image file upload size in megabytes', keywords: ['upload', 'size', 'storage', 'limit', 'mb', 'fichier'] },
  { key: 'max_product_images', tab: 'operations', label: 'Max Images Per Product Listing', description: 'Maximum number of gallery images allowed per product listing', keywords: ['images', 'product', 'gallery', 'photos', 'limit'] },

  // Integrations & Webmaster
  { key: 'analytics_ga4_measurement_id', tab: 'integrations', label: 'Google Analytics 4 (GA4)', description: 'GA4 Measurement ID (format: G-XXXXXXXXXX) for eCommerce tracking', keywords: ['ga4', 'google', 'analytics', 'tracking', 'statistiques'] },
  { key: 'analytics_gtm_container_id', tab: 'integrations', label: 'Google Tag Manager (GTM)', description: 'GTM Container ID (format: GTM-XXXXXXX)', keywords: ['gtm', 'google', 'tag manager', 'container'] },
  { key: 'analytics_meta_pixel_id', tab: 'integrations', label: 'Meta (Facebook) Pixel ID', description: 'Meta Pixel ID for conversion and retargeting ads', keywords: ['meta', 'facebook', 'pixel', 'ads', 'retargeting'] },
  { key: 'cloudflare_integration_enabled', tab: 'integrations', label: 'Cloudflare Custom Hostnames (SSL)', description: 'Cloudflare for SaaS integration for automatic SSL certificate provisioning', keywords: ['cloudflare', 'ssl', 'domain', 'saas', 'dns'] },
  { key: 'search_console_verification', tab: 'integrations', label: 'Google Search Console Verification', description: 'HTML meta tag verification token for Google Webmaster Tools', keywords: ['search console', 'google', 'seo', 'verification', 'webmaster'] },

  // Subscriptions & Plans
  { key: 'plans_management', tab: 'plans', label: 'Seller Subscription Tiers', description: 'Configure Free, Starter, Pro, and Enterprise seller plans, quotas, and feature flags', keywords: ['plans', 'subscription', 'pricing', 'tiers', 'seller', 'abonnement', 'tarifs'] },

  // Transactional Emails
  { key: 'smtp_configuration', tab: 'email', label: 'SMTP Server & Transactional Email', description: 'Configure Brevo, Resend, SendGrid, Gmail, or Custom SMTP server credentials', keywords: ['smtp', 'email', 'host', 'port', 'password', 'mail', 'brevo', 'resend', 'sendgrid', 'templates'] },
];

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

  // Validate rewards_widget_prizes_json is valid JSON array
  try {
    const parsed = JSON.parse(payload.rewards_widget_prizes_json || '[]');
    if (!Array.isArray(parsed) || parsed.length === 0) {
      payload.rewards_widget_prizes_json = DEFAULT_SETTINGS.rewards_widget_prizes_json;
    }
  } catch {
    payload.rewards_widget_prizes_json = DEFAULT_SETTINGS.rewards_widget_prizes_json;
  }

  payload.marketplace_theme = payload.marketplace_theme === 'aliexpress2' ? 'aliexpress2' : payload.marketplace_theme === 'aliexpress' ? 'aliexpress' : 'panda';
  payload.marketplace_default_locale = payload.marketplace_default_locale === 'ar' ? 'ar' : payload.marketplace_default_locale === 'en' ? 'en' : 'fr';
  payload.payment_paypal_mode = payload.payment_paypal_mode === 'live' ? 'live' : 'sandbox';
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
  payload.hub_homepage_pagination_style = payload.hub_homepage_pagination_style === 'infinite'
    ? 'infinite'
    : payload.hub_homepage_pagination_style === 'load_more'
      ? 'load_more'
      : payload.hub_homepage_pagination_style === 'pagination'
        ? 'pagination'
        : 'none';
  payload.hub_megamenu_style = payload.hub_megamenu_style === 'visual_rich'
    ? 'visual_rich'
    : payload.hub_megamenu_style === 'ultra_rich'
      ? 'ultra_rich'
      : payload.hub_megamenu_style === 'ultra_rich_deep'
        ? 'ultra_rich_deep'
        : 'standard';
  payload.hub_megamenu_lazy_loading = Boolean(payload.hub_megamenu_lazy_loading);
  payload.hub_category_page_style = payload.hub_category_page_style === 'v2_modern_showcase' ? 'v2_modern_showcase' : 'v1_classic';
  payload.hub_hero_show_category_sidebar = Boolean(payload.hub_hero_show_category_sidebar);
  payload.hub_hero_show_carousel = Boolean(payload.hub_hero_show_carousel);
  payload.hub_hero_show_seller_rail = Boolean(payload.hub_hero_show_seller_rail);
  payload.hub_hero_category_sidebar_max_items = Math.max(1, Math.min(30, Number(payload.hub_hero_category_sidebar_max_items) || 14));
  payload.hub_hero_carousel_max_categories = Math.max(1, Math.min(10, Number(payload.hub_hero_carousel_max_categories) || 5));
  payload.hub_hero_carousel_autoplay = Boolean(payload.hub_hero_carousel_autoplay);
  payload.hub_hero_carousel_interval = Math.max(2000, Math.min(30000, Number(payload.hub_hero_carousel_interval) || 6000));
  payload.hub_hero_carousel_show_arrows = Boolean(payload.hub_hero_carousel_show_arrows);
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

function createSettingsRequestId() {
  const suffix = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `settings-load-${suffix}`;
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

interface RewardPrize {
  label: string;
  code: string;
  disc: number;
  icon: string;
  color: string;
  desc: string;
}

function RewardsPrizeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [mode, setMode] = useState<'visual' | 'json'>('visual');
  const [jsonDraft, setJsonDraft] = useState(value);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setJsonDraft(value);
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (e: unknown) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }, [value]);

  const prizes: RewardPrize[] = useMemo(() => {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  }, [value]);

  const updatePrize = (index: number, updated: Partial<RewardPrize>) => {
    const next = [...prizes];
    next[index] = { ...next[index], ...updated };
    onChange(JSON.stringify(next, null, 2));
  };

  const addPrize = () => {
    const next = [
      ...prizes,
      {
        label: '5 DT Offerts',
        code: `CHANCE${Math.floor(Math.random() * 90 + 10)}DT`,
        disc: 5.0,
        icon: '🎁',
        color: '#16C784',
        desc: '5.000 DT de remise immédiate sur votre panier',
      },
    ];
    onChange(JSON.stringify(next, null, 2));
  };

  const removePrize = (index: number) => {
    if (prizes.length <= 2) return;
    const next = prizes.filter((_, i) => i !== index);
    onChange(JSON.stringify(next, null, 2));
  };

  const handleJsonChange = (newJson: string) => {
    setJsonDraft(newJson);
    try {
      const parsed = JSON.parse(newJson);
      if (!Array.isArray(parsed)) {
        setJsonError('JSON must be an array of prize objects');
      } else {
        setJsonError(null);
        onChange(newJson);
      }
    } catch (e: unknown) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonDraft(formatted);
      onChange(formatted);
      setJsonError(null);
    } catch {}
  };

  return (
    <div id="setting-rewards_widget_prizes_json" className="space-y-4 md:col-span-2 rounded-2xl border border-slate-200/80 bg-stone-50/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Wheel Prize Slices & Rewards ({prizes.length} Slices)
          </label>
          <p className="text-xs text-slate-500">
            Configure coupons, discounts, and visual colors for the spinning wheel gamification widget.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === 'visual' ? 'json' : 'visual')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            {mode === 'visual' ? '{ } Raw JSON Mode' : '🎛️ Visual Editor Mode'}
          </button>
        </div>
      </div>

      {mode === 'visual' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {prizes.map((prize, idx) => (
              <div
                key={idx}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={prize.icon || '🎁'}
                      onChange={(e) => updatePrize(idx, { icon: e.target.value })}
                      title="Emoji Icon"
                      className="h-9 w-10 rounded-lg border border-slate-200 bg-stone-50 text-center text-base"
                    />
                    <input
                      type="text"
                      value={prize.label}
                      onChange={(e) => updatePrize(idx, { label: e.target.value })}
                      placeholder="Prize Label (e.g. 5 DT Offerts)"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-[#B91C1C]"
                    />
                    <input
                      type="color"
                      value={prize.color || '#16C784'}
                      onChange={(e) => updatePrize(idx, { color: e.target.value })}
                      title="Slice Color"
                      className="h-8 w-8 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Coupon Code</label>
                      <input
                        type="text"
                        value={prize.code}
                        onChange={(e) => updatePrize(idx, { code: e.target.value.toUpperCase() })}
                        placeholder="CODE"
                        className="w-full rounded-lg border border-slate-200 bg-stone-50 px-2 py-1 text-xs font-mono font-bold text-slate-700 outline-none focus:border-[#B91C1C]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Discount Value</label>
                      <input
                        type="number"
                        step="0.5"
                        value={prize.disc}
                        onChange={(e) => updatePrize(idx, { disc: Number(e.target.value) || 0 })}
                        placeholder="DT / %"
                        className="w-full rounded-lg border border-slate-200 bg-stone-50 px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-[#B91C1C]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400">Description</label>
                    <input
                      type="text"
                      value={prize.desc || ''}
                      onChange={(e) => updatePrize(idx, { desc: e.target.value })}
                      placeholder="Description shown upon winning"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 outline-none focus:border-[#B91C1C]"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-[10px] font-bold text-slate-400">Slice #{idx + 1}</span>
                  {prizes.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removePrize(idx)}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700 transition"
                    >
                      Delete Slice
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={addPrize}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
            >
              + Add Wheel Slice
            </button>
            <button
              type="button"
              onClick={() => onChange(DEFAULT_SETTINGS.rewards_widget_prizes_json)}
              className="text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            rows={8}
            value={jsonDraft}
            onChange={(e) => handleJsonChange(e.target.value)}
            className={`w-full rounded-xl border px-4 py-3 font-mono text-xs outline-none transition-all ${
              jsonError
                ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/15'
                : 'border-slate-200 bg-white focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15'
            }`}
          />
          {jsonError ? (
            <p className="text-xs font-bold text-red-600">
              ⚠️ Invalid JSON: {jsonError} (fix before saving)
            </p>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600">✓ Valid JSON syntax</span>
              <button
                type="button"
                onClick={formatJson}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Beautify / Format JSON
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 select-all truncate">
          {value || <span className="text-slate-400 font-normal">Not configured</span>}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!value}
          title="Copy to clipboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-[#B91C1C] hover:bg-[#B91C1C] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      {copied && (
        <p className="text-[10px] font-bold text-emerald-600 ml-1">Copied to clipboard!</p>
      )}
    </div>
  );
}

export default function SuperAdminSettingsPage() {
  const { t } = useLocale();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [settingsLoadSucceeded, setSettingsLoadSucceeded] = useState(false);
  const [settingsLoadError, setSettingsLoadError] = useState<{ message: string; requestId: string; status?: number } | null>(null);
  const [settingsLoadAttempt, setSettingsLoadAttempt] = useState(0);
  const [sectionVersions, setSectionVersions] = useState<SettingsSectionVersions>({});
  const [marketplaceLogoPickerTarget, setMarketplaceLogoPickerTarget] = useState<'marketplace_logo_url' | 'marketplace_logo_light_url' | 'marketplace_logo_dark_url' | 'maintenance_illustration_url' | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('marketplace');
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);

  function updateSetting<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    if (!settingsLoadSucceeded) return;
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
      <div id={`setting-${key}`} key={key} className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-stone-50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md">
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
      <div id={`setting-${key}`} key={key} className="space-y-1.5">
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
      <div id={`setting-${key}`} key={key} className="space-y-1.5">
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

  function renderTextAreaInput<K extends StringSettingKey>(key: K, label: string, placeholder = '') {
    return (
      <div id={`setting-${key}`} key={key} className="space-y-1.5 md:col-span-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">{label}</label>
        <textarea
          rows={4}
          value={settings[key]}
          placeholder={placeholder}
          onChange={(e) => updateSetting(key, e.target.value as PlatformSettings[K])}
          className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-xs font-mono text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
        />
      </div>
    );
  }

  function renderColorInput<K extends StringSettingKey>(key: K, label: string) {
    return (
      <div id={`setting-${key}`} key={key} className="space-y-1.5">
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
          setSectionVersions(data.section_versions || {});
          setSettingsLoadSucceeded(true);
        }
      } catch (err) {
        if (active) {
          setSettingsLoadSucceeded(false);
          setError(err instanceof Error ? err.message : 'Failed to load platform settings');
        }
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
    if (!isPlatformSettingsTab(activeTab) || !settingsLoadSucceeded) return;

    const section = activeTab;
    const normalizedSettings = { ...DEFAULT_SETTINGS, ...buildSettingsPayload(settings) };
    const payload = pickChangedSettings(
      normalizedSettings as SharedPlatformSettings,
      savedSettings as SharedPlatformSettings,
      SETTINGS_TAB_KEYS[section],
    ) as Partial<PlatformSettings>;
    const submittedKeys = Object.keys(payload) as Array<keyof PlatformSettings>;
    if (submittedKeys.length === 0) {
      setSettings((current) => {
        const next = { ...current };
        for (const key of SETTINGS_TAB_KEYS[section]) {
          if (current[key] === settings[key] && normalizedSettings[key] === savedSettings[key]) {
            next[key] = normalizedSettings[key] as never;
          }
        }
        return next;
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const sectionVersion = sectionVersions[section as SharedPlatformSettingsTab];
      if (sectionVersion !== undefined) headers['If-Match'] = sectionVersion ? `"${sectionVersion}"` : '"0"';

      const res = await fetchWithCsrf(`/api/pd/admin/settings/${section}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json() as PlatformSettingsResponse;
        const responseSection = data.sections?.[section as SharedPlatformSettingsTab]
          ?? (data.data ? Object.fromEntries(SETTINGS_TAB_KEYS[section].map((key) => [key, data.data?.[key]])) as Partial<PlatformSettings> : undefined);
        setSettings((current) => mergeSubmittedSettings(
          current as SharedPlatformSettings,
          savedSettings as SharedPlatformSettings,
          payload as Partial<SharedPlatformSettings>,
          responseSection,
          settings as SharedPlatformSettings,
        ).current as PlatformSettings);
        setSavedSettings((previous) => mergeSavedSettings(
          previous as SharedPlatformSettings,
          payload as Partial<SharedPlatformSettings>,
          responseSection,
        ) as PlatformSettings);
        setSectionVersions((previous) => ({ ...previous, ...data.section_versions }));
        // Bust the cached hub pages so theme/layout changes show up immediately.
        fetch('/api/marketplace/revalidate', { method: 'POST', credentials: 'include' }).catch(() => undefined);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else if (res.status === 409) {
        let conflictData: PlatformSettingsResponse & { error?: { message?: string; details?: { current_version?: string | null } } } = {};
        try {
          conflictData = await res.json();
        } catch {
          // Keep the fallback conflict message below.
        }
        const responseSection = conflictData.sections?.[section as SharedPlatformSettingsTab]
          ?? (conflictData.data ? Object.fromEntries(SETTINGS_TAB_KEYS[section].map((key) => [key, conflictData.data?.[key]])) as Partial<PlatformSettings> : undefined);
        if (responseSection) {
          setSettings((current) => mergeServerSettingsPreservingDrafts(
            current as SharedPlatformSettings,
            savedSettings as SharedPlatformSettings,
            responseSection,
          ).current as PlatformSettings);
          setSavedSettings((previous) => mergeServerSettingsPreservingDrafts(
            previous as SharedPlatformSettings,
            previous as SharedPlatformSettings,
            responseSection,
          ).saved as PlatformSettings);
        }
        const currentVersion = conflictData.section_versions?.[section as SharedPlatformSettingsTab]
          ?? conflictData.error?.details?.current_version;
        if (currentVersion !== undefined) {
          setSectionVersions((previous) => ({ ...previous, [section]: currentVersion }));
        }
        setError(conflictData.error?.message || 'This section changed after you loaded it. Your draft is preserved; review the latest saved values and save again.');
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

  const dirtyTabs = useMemo(() => {
    const dirty = new Set<PlatformSettingsTab>();
    (Object.keys(SETTINGS_TAB_KEYS) as PlatformSettingsTab[]).forEach((section) => {
      const dirtyKeys = getDirtySettingsKeys(
        settings as SharedPlatformSettings,
        savedSettings as SharedPlatformSettings,
        SETTINGS_TAB_KEYS[section],
      );
      if (dirtyKeys.length > 0) dirty.add(section);
    });
    return dirty;
  }, [settings, savedSettings]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return SETTINGS_SEARCH_INDEX.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        item.tab.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const activePlatformDirtyKeys = isPlatformSettingsTab(activeTab)
    ? getDirtySettingsKeys(settings as SharedPlatformSettings, savedSettings as SharedPlatformSettings, SETTINGS_TAB_KEYS[activeTab])
    : [];
  const hasUnsavedPlatformChanges = activePlatformDirtyKeys.length > 0;
  const hasAnyUnsavedPlatformChanges = dirtyTabs.size > 0;

  function handleTabClick(tabId: SettingsTab) {
    if (tabId === activeTab) return;
    if (isPlatformSettingsTab(activeTab) && dirtyTabs.has(activeTab)) {
      setPendingTab(tabId);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(tabId);
    }
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasAnyUnsavedPlatformChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasAnyUnsavedPlatformChanges]);

  function resetActiveSection() {
    if (!isPlatformSettingsTab(activeTab)) return;
    const sectionKeys = SETTINGS_TAB_KEYS[activeTab];
    setSettings((previous) => {
      const next = { ...previous };
      for (const key of sectionKeys) {
        (next as unknown as Record<keyof SharedPlatformSettings, SharedPlatformSettings[keyof SharedPlatformSettings]>)[key] = (savedSettings as SharedPlatformSettings)[key];
      }
      return next;
    });
    setSaved(false);
    setError('');
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

      {savedSettings.maintenance_enabled && (
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-red-600 px-4 py-3 text-xs font-black text-white uppercase tracking-widest shadow-lg shadow-red-950/20 animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          <span>MAINTENANCE MODE IS ACTIVE — Storefronts are offline</span>
          <AlertTriangle className="h-4 w-4" />
        </div>
      )}

      <div className="sticky top-0 z-40 -mx-4 flex flex-col gap-4 rounded-b-3xl border-b border-amber-100 bg-white/95 px-4 py-3.5 shadow-sm backdrop-blur-xl sm:-mx-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B91C1C] text-white shadow-lg shadow-red-900/20">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">Settings Control Center</h2>
            <p className={`text-xs font-medium ${hasUnsavedPlatformChanges ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
              {hasUnsavedPlatformChanges ? 'Unsaved changes in this section — save before leaving.' : 'Review changes carefully, then save once.'}
            </p>
          </div>
        </div>

        {/* Real-time Setting Filter Bar */}
        <div className="flex flex-1 items-center gap-3 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search setting (e.g. logo, aramex, flouci, theme, hero, smtp)..."
              className="w-full rounded-full border border-slate-200 bg-slate-50/80 pl-9 pr-8 py-2 text-xs font-bold text-slate-700 outline-none transition-all focus:border-[#ff6a00] focus:bg-white focus:ring-2 focus:ring-[#ff6a00]/15"
            />
            <SlidersHorizontal className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-xs font-black text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedPlatformChanges && (
            <button
              type="button"
              onClick={resetActiveSection}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Discard Draft
            </button>
          )}
          <button
            onClick={activeTab === 'plans' ? undefined : activeTab === 'email' ? handleSmtpSave : handleSave}
            disabled={activeTab === 'plans' || (activeTab === 'email' ? smtpSaving || smtpLoading : saving || loading || !settingsLoadSucceeded || !hasUnsavedPlatformChanges)}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#B91C1C] px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-900/25 transition-all hover:-translate-y-0.5 hover:bg-[#991B1B] hover:shadow-red-900/30 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {activeTab === 'email'
              ? smtpSaving ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />
              : saving ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {activeTab === 'plans' ? 'Use Plan Actions Below' : activeTab === 'email' ? smtpSaved ? 'Email Saved!' : 'Save Email Config' : saved ? 'Saved Successfully!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Real-Time Settings Search Results Panel */}
      {searchQuery.trim() && (
        <div className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-2xl animate-in fade-in duration-200">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">
              {searchResults.length} Setting{searchResults.length === 1 ? '' : 's'} Found for &ldquo;{searchQuery}&rdquo;
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-slate-400 hover:text-slate-700"
            >
              Clear Search (✕)
            </button>
          </div>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((result) => (
                <button
                  key={result.key}
                  type="button"
                  onClick={() => {
                    handleTabClick(result.tab);
                    setSearchQuery('');
                    setTimeout(() => {
                      document.getElementById(`setting-${result.key}`)?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                      });
                    }, 150);
                  }}
                  className="flex flex-col items-start gap-1 rounded-2xl border border-slate-100 bg-stone-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50/60 hover:shadow-md"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900">{result.label}</span>
                    <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
                      {result.tab}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 line-clamp-2">{result.description}</p>
                  <span className="mt-1 font-mono text-[10px] text-slate-400">key: {result.key}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm font-bold text-slate-600">No settings match &ldquo;{searchQuery}&rdquo;</p>
              <p className="mt-1 text-xs text-slate-400">Try searching for &quot;logo&quot;, &quot;shipping&quot;, &quot;aramex&quot;, &quot;flouci&quot;, &quot;color&quot;, &quot;smtp&quot;, or &quot;plans&quot;.</p>
            </div>
          )}
        </div>
      )}

      {error && <div role="alert" aria-live="assertive" className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">Loading settings...</div>}

      {/* Modern Compact Settings Navigation Pills with Custom Red Scrollbar */}
      <div
        className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm scrollbar-thin scrollbar-thumb-[#B91C1C]/40 scrollbar-track-slate-100 hover:scrollbar-thumb-[#B91C1C]"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#B91C1C #F1F5F9' }}
      >
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          const isDirty = dirtyTabs.has(tab.id as PlatformSettingsTab);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              title={tab.description}
              className={`group relative flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                selected
                  ? 'bg-gradient-to-r from-[#B91C1C] to-[#991B1B] text-white shadow-md shadow-red-900/25 scale-[1.02]'
                  : 'bg-stone-50 text-slate-600 hover:bg-amber-50/70 hover:text-slate-900 hover:border-amber-200'
              }`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                selected ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-700'
              }`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="whitespace-nowrap tracking-tight">{tab.label}</span>
              {isDirty && (
                <span
                  className={`h-2 w-2 rounded-full ring-2 ${
                    selected ? 'bg-amber-300 ring-[#B91C1C]' : 'bg-amber-500 ring-white'
                  } animate-pulse`}
                  title="Unsaved changes in this section"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className={activeTab === 'security' ? 'rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-xl shadow-slate-200/40' : 'hidden'}>
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
          {/* Custom Danger Maintenance Toggle with Confirmation Guard */}
          <div
            id="setting-maintenance_enabled"
            className={`flex items-center justify-between gap-4 rounded-2xl border-2 p-5 transition-all ${
              settings.maintenance_enabled
                ? 'border-red-300 bg-red-50/80 shadow-md shadow-red-500/10'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="pr-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900">Enable Maintenance Mode</p>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-700">
                  DANGER
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500 leading-relaxed">
                Block all non-admin access to the marketplace. This takes your platform offline immediately.
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
                settings.maintenance_enabled ? 'bg-red-600 shadow-red-900/20' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                  settings.maintenance_enabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
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
                <img src={settings.maintenance_illustration_url ? getResizedImageUrl(settings.maintenance_illustration_url, 'medium') : ''} alt="Maintenance illustration preview" className="h-36 w-full object-cover" />
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
                        style={{ backgroundImage: `url(${getResizedImageUrl(logo.value, 'large')})` }}
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Homepage Product Grid Loading Style</label>
            <select
              value={settings.hub_homepage_pagination_style || 'none'}
              onChange={(e) => updateSetting('hub_homepage_pagination_style', e.target.value as PlatformSettings['hub_homepage_pagination_style'])}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="none">None (Show exactly 12 items only)</option>
              <option value="infinite">Infinite Scroll (Auto load on scroll)</option>
              <option value="load_more">Load More Button</option>
              <option value="pagination">Classic Pagination (1, 2, 3...)</option>
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
              <option value="visual_rich">Version 2: Visual Cards (Compact Pictures & Descriptions)</option>
              <option value="ultra_rich">Version 3: Ultra-Rich Showcase (Large Pictures & Hero Banners)</option>
              <option value="ultra_rich_deep">Version 4: Ultra-Rich Deep Showcase (Large Pictures & Interactive Submenus)</option>
            </select>
          </div>
          {renderToggle({
            key: 'hub_megamenu_lazy_loading',
            label: 'Megamenu Lazy Loading',
            description:
              'When enabled, category trees are lazy-loaded on demand when hovering or clicking the Megamenu, improving initial page load speed.',
          })}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Category / Subcategory Page Style Version</label>
            <select
              value={settings.hub_category_page_style || 'v1_classic'}
              onChange={(e) => updateSetting('hub_category_page_style', e.target.value as PlatformSettings['hub_category_page_style'])}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="v1_classic">Version 1: Classic Header & Grid</option>
              <option value="v2_modern_showcase">Version 2: Modern Showcase (Bigger Picture Hero & Compact Info Area)</option>
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

      <section className={`${activeTab === 'marketplace' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<LayoutGrid className="h-5 w-5" />}
          title="Alibaba B2B Hero Section (Categories, Carousel & Seller Rail)"
          description="Configure the Hero area of the Alibaba B2B homepage — toggle category sidebar, carousel, and seller rail visibility; customize max categories, seller rail text, and custom carousel slides."
        />
        <div className="space-y-6">
          {/* Visibility Toggles */}
          <div>
            <h4 className="mb-3 text-sm font-black text-slate-700">Hero Column Visibility</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { key: 'hub_hero_show_category_sidebar' as const, label: 'Category Sidebar', description: 'Show the vertical category department sidebar on the left.' },
                { key: 'hub_hero_show_carousel' as const, label: 'Hero Carousel', description: 'Show the main hero carousel/banner in the center.' },
                { key: 'hub_hero_show_seller_rail' as const, label: 'Seller Rail', description: 'Show the seller/supplier rail on the right.' },
              ].map(renderToggle)}
            </div>
          </div>

          {/* Category Sidebar Settings */}
          {settings.hub_hero_show_category_sidebar && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
              <h4 className="mb-3 text-sm font-black text-slate-800 flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-[#ff6a00]" /> Category Sidebar Settings
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Max Categories Displayed</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.hub_hero_category_sidebar_max_items}
                    onChange={(e) => updateSetting('hub_hero_category_sidebar_max_items', Math.max(1, Math.min(30, Number(e.target.value) || 14)))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">Controls how many top-level categories appear in the vertical department menu (1 to 30).</p>
                </div>
              </div>
            </div>
          )}

          {/* Seller Rail Settings */}
          {settings.hub_hero_show_seller_rail && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
              <h4 className="mb-3 text-sm font-black text-slate-800 flex items-center gap-2">
                <Store className="h-4 w-4 text-[#ff6a00]" /> Seller Rail Configuration
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {renderTextInput('hub_hero_seller_rail_title', 'Rail Card Title', 'Accès Vendeurs & Fournisseurs')}
                {renderTextInput('hub_hero_seller_rail_subtitle', 'Rail Subtitle', 'Ouvrez votre boutique B2B...')}
                {renderTextInput('hub_hero_seller_rail_cta_label', 'CTA Button Label', 'Espace Vendeur')}
                {renderTextInput('hub_hero_seller_rail_cta_url', 'CTA Button URL', '/hub/dashboard')}
                {renderTextInput('hub_hero_seller_rail_badge_text', 'Badge Text', 'PandaMarket B2B')}
              </div>
            </div>
          )}

          {/* Carousel Slides Configuration */}
          {settings.hub_hero_show_carousel && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-4">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-[#ff6a00]" /> Hero Carousel Configuration
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4 border-b border-slate-200/80 pb-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Slide Source Mode</label>
                  <select
                    value={settings.hub_hero_carousel_source_mode}
                    onChange={(e) => updateSetting('hub_hero_carousel_source_mode', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C]"
                  >
                    <option value="hybrid">🔀 Hybrid (Custom Slides + Categories)</option>
                    <option value="custom_only">🎯 Custom Carousel Slides Only</option>
                    <option value="auto_categories_only">🏷️ Auto Category Banners Only</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Auto Category Slides Count</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.hub_hero_carousel_max_categories}
                    onChange={(e) => updateSetting('hub_hero_carousel_max_categories', Math.max(1, Math.min(10, Number(e.target.value) || 5)))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C]"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">Number of top categories to auto-generate banners for (1 to 10).</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Slide Rotation Delay (ms)</label>
                  <select
                    value={settings.hub_hero_carousel_interval}
                    onChange={(e) => updateSetting('hub_hero_carousel_interval', Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C]"
                  >
                    <option value={3000}>3 Seconds (Fast)</option>
                    <option value={5000}>5 Seconds (Recommended)</option>
                    <option value={6000}>6 Seconds (Standard)</option>
                    <option value={8000}>8 Seconds (Slow)</option>
                    <option value={10000}>10 Seconds (Very Slow)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Indicator Dots Style</label>
                  <select
                    value={settings.hub_hero_carousel_dots_style}
                    onChange={(e) => updateSetting('hub_hero_carousel_dots_style', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C]"
                  >
                    <option value="pill">Pill Dots</option>
                    <option value="circle">Circle Dots</option>
                    <option value="numbers">Numbers / Counter</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 pb-2">
                {[
                  { key: 'hub_hero_carousel_autoplay' as const, label: 'Auto-Play Slide Rotation', description: 'Automatically advance to the next slide.' },
                  { key: 'hub_hero_carousel_show_arrows' as const, label: 'Navigation Arrows', description: 'Show left/right arrow buttons on the banner.' },
                ].map(renderToggle)}
              </div>
              <div>
                <HeroCarouselEditor
                  value={settings.hub_hero_carousel_slides}
                  onChange={(next) => updateSetting('hub_hero_carousel_slides', next)}
                />
              </div>
            </div>
          )}
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
            { key: 'ai_tools_enabled' as const, label: 'AI Tools', description: 'Enable AI queues, credits, SEO helpers, image compression, and vendor AI provider settings.' },
            { key: 'page_builder_enabled' as const, label: 'Page Builder', description: 'Enable vendor Page Builder editing and storefront custom page rendering.' },
            { key: 'plugins_marketplace_enabled' as const, label: 'Plugins Marketplace', description: 'Expose plugin marketplace capabilities when the module is available.' },
            { key: 'email_marketing_enabled' as const, label: 'Email Marketing', description: 'Expose email marketing add-on capabilities when the module is available.' },
          ].map(renderToggle)}
        </div>
      </section>

      <section className={`${activeTab === 'commerce' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 space-y-6`}>
        <SectionHeader
          icon={<Gift className="h-5 w-5" />}
          title="Gamified Rewards & Retention Widget"
          description="Configure floating rewards wheel, scratch cards, button label, and wheel prizes for customer conversion."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: 'rewards_widget_enabled' as const, label: 'Gamified Rewards Widget', description: 'Enable floating rewards wheel and scratch card widget on buyer storefront pages.' },
          ].map(renderToggle)}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {renderTextInput(
            'rewards_widget_button_label',
            'Floating Trigger Button Label',
            "🎁 Gagnez jusqu'à 15 DT !",
          )}
          <RewardsPrizeEditor
            value={settings.rewards_widget_prizes_json}
            onChange={(val) => updateSetting('rewards_widget_prizes_json', val)}
          />
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

      <section className={`${activeTab === 'shipping' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<Truck className="h-5 w-5" />}
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
            { key: 'payment_paypal_enabled' as const, label: 'PayPal (International)', description: 'Allow global checkout payments via PayPal.' },
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

      {/* PayPal Configuration Details */}
      <section className={`${activeTab === 'finance' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 space-y-6`}>
        <SectionHeader
          icon={<CreditCard className="h-5 w-5 text-blue-600" />}
          title="PayPal Configuration & Credentials"
          description="Configure platform-wide Sandbox and Live API credentials for PayPal REST API v2."
        />

        {/* Mode & Currency Conversion */}
        <div className="rounded-2xl bg-blue-50/60 p-5 border border-blue-100 space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">Active Mode & Currency Conversion</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Active Environment Mode</label>
              <select
                value={settings.payment_paypal_mode}
                onChange={(e) => updateSetting('payment_paypal_mode', e.target.value as 'sandbox' | 'live')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C]"
              >
                <option value="sandbox">Sandbox (Testing / Preproduction)</option>
                <option value="live">Live (Production)</option>
              </select>
            </div>
            {renderTextInput('payment_paypal_currency', 'Target PayPal Currency', 'EUR or USD')}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">TND FX Rate (1 TND = X Target)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="10"
                value={settings.payment_paypal_fx_rate_tnd_to_target}
                onChange={(e) => updateSetting('payment_paypal_fx_rate_tnd_to_target', Number(e.target.value) || 0.30)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C]"
              />
            </div>
          </div>
        </div>

        {/* Sandbox Credentials */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">1. Sandbox (Testing) Credentials</h4>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {renderTextInput('payment_paypal_sandbox_client_id', 'Sandbox Client ID', 'e.g. AUaFWDFZE...')}
            {renderTextInput('payment_paypal_sandbox_client_secret', 'Sandbox Client Secret', 'e.g. EE2-3eVt...')}
            <div className="md:col-span-2">
              {renderTextInput('payment_paypal_sandbox_webhook_id', 'Sandbox Webhook ID', 'e.g. 8WH12345678... (Assigned when registering Webhook URL in PayPal Dev Dashboard)')}
            </div>
          </div>
        </div>

        {/* Live Credentials */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900">2. Live (Production) Credentials</h4>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {renderTextInput('payment_paypal_live_client_id', 'Live Client ID', 'e.g. BAAAmZT6...')}
            {renderTextInput('payment_paypal_live_client_secret', 'Live Client Secret', 'e.g. EHDOvLKU...')}
            <div className="md:col-span-2">
              {renderTextInput('payment_paypal_live_webhook_id', 'Live Webhook ID', 'e.g. 9KL98765432...')}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-800">📌 What is Webhook ID and how to get it?</p>
          <p>When you add your platform Webhook URL (<code className="font-mono text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-300">https://www.garbage.team/api/pd/payments/webhook/paypal</code>) in the PayPal Developer Dashboard under Apps & Credentials → Webhooks, PayPal generates a <strong>Webhook ID</strong>. Paste it above so PandaMarket can cryptographically verify every inbound payment event.</p>
        </div>
      </section>

      {/* Mandat Minute Recipient Info */}
      <section className={`${activeTab === 'finance' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<Wallet className="h-5 w-5" />}
          title="Mandat Minute Recipient & Proof Email"
          description="Configure the beneficiary details and email address where customers submit Mandat Minute wire receipts."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">{renderTextInput('mandat_recipient_name', 'Recipient Name')}</div>
          {renderTextInput('mandat_recipient_cin', 'Identifiant Number (CIN / MF)')}
          {renderTextInput('mandat_recipient_city', 'City')}
          <div className="md:col-span-2">{renderTextInput('mandat_proof_email', 'Proof of Payment Email Address', 'e.g. billing@pandamarket.tn')}</div>
        </div>

        {/* Read-only quick copy summary for support agents */}
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-amber-900">
              Quick Copy for Support & Buyer Inquiries
            </p>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2.5 py-0.5">
              1-Click Copy
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CopyableField label="Recipient Name" value={settings.mandat_recipient_name} />
            <CopyableField label="CIN / Tax ID" value={settings.mandat_recipient_cin} />
            <CopyableField label="City" value={settings.mandat_recipient_city} />
            <CopyableField label="Proof Email" value={settings.mandat_proof_email} />
          </div>
          <CopyableField
            label="Full Payment Wire Instructions"
            value={[
              settings.mandat_recipient_name ? `Bénéficiaire: ${settings.mandat_recipient_name}` : '',
              settings.mandat_recipient_cin ? `CIN/MF: ${settings.mandat_recipient_cin}` : '',
              settings.mandat_recipient_city ? `Ville: ${settings.mandat_recipient_city}` : '',
              settings.mandat_proof_email ? `Email preuve: ${settings.mandat_proof_email}` : '',
            ].filter(Boolean).join(' | ')}
          />
        </div>
      </section>

      <section className={`${activeTab === 'security' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
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

      {/* Image Size Configurations */}
      <section className={`${activeTab === 'operations' ? '' : 'hidden'} rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40`}>
        <SectionHeader
          icon={<ImageIcon className="h-5 w-5" />}
          title="Image Size Configurations"
          description="Configure WordPress-style multi-size image variants. Every uploaded image is automatically resized to these presets for faster page loading."
        />
        <div className="space-y-6">
          {/* Presets Grid */}
          {([
            { preset: 'thumbnail', label: 'Thumbnail', desc: 'Tiny previews, avatars, admin lists', wKey: 'image_size_thumbnail_w' as const, hKey: 'image_size_thumbnail_h' as const, cropKey: 'image_size_thumbnail_crop' as const, minW: 20, maxW: 2000, minH: 20, maxH: 2000 },
            { preset: 'small', label: 'Small', desc: 'Product cards, cart items, grids', wKey: 'image_size_small_w' as const, hKey: 'image_size_small_h' as const, cropKey: 'image_size_small_crop' as const, minW: 50, maxW: 2000, minH: 50, maxH: 2000 },
            { preset: 'medium', label: 'Medium', desc: 'Product detail view, category banners', wKey: 'image_size_medium_w' as const, hKey: 'image_size_medium_h' as const, cropKey: 'image_size_medium_crop' as const, minW: 100, maxW: 3000, minH: 100, maxH: 3000 },
            { preset: 'large', label: 'Large', desc: 'Lightboxes, hero banners, zoom view', wKey: 'image_size_large_w' as const, hKey: 'image_size_large_h' as const, cropKey: 'image_size_large_crop' as const, minW: 200, maxW: 4000, minH: 200, maxH: 4000 },
          ]).map((p) => (
            <div key={p.preset} className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B91C1C]/10 text-[#B91C1C]">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{p.label}</p>
                  <p className="text-xs font-semibold text-slate-400">{p.desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {renderNumberInput(p.wKey, 'Width', 'px', p.minW, p.maxW)}
                {renderNumberInput(p.hKey, 'Height', 'px', p.minH, p.maxH)}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Crop Mode</label>
                  <select
                    value={settings[p.cropKey] || 'inside'}
                    onChange={(e) => updateSetting(p.cropKey, e.target.value as PlatformSettings[typeof p.cropKey])}
                    className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
                  >
                    <option value="cover">Cover (crop to fill)</option>
                    <option value="inside">Inside (fit without crop)</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          {/* WebP Quality */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {renderNumberInput('image_quality_webp', 'WebP Output Quality', '%', 30, 100)}
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-4 text-xs font-semibold leading-relaxed text-amber-800">
            📌 Changes to image sizes only affect <strong>future uploads</strong>. To apply new dimensions to existing images, use the <strong>&quot;Regenerate All Image Variants&quot;</strong> action from the Platform Media page.
          </div>
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

      {/* Floating Sticky Save Settings Bar */}
      {isPlatformSettingsTab(activeTab) && (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-slate-700/80 bg-slate-900/95 px-5 py-3 text-white shadow-2xl backdrop-blur-md transition-all hover:border-[#ff6a00]/50">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${hasUnsavedPlatformChanges ? 'bg-amber-400 animate-pulse' : hasAnyUnsavedPlatformChanges ? 'bg-sky-400' : 'bg-emerald-400'}`} />
          <span className="text-xs font-extrabold">
            {hasUnsavedPlatformChanges
              ? `${activePlatformDirtyKeys.length} unsaved ${activePlatformDirtyKeys.length === 1 ? 'change' : 'changes'} here`
              : hasAnyUnsavedPlatformChanges ? 'Unsaved changes in another section' : 'Settings up to date'}
          </span>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <button
          type="button"
          onClick={resetActiveSection}
          disabled={!hasUnsavedPlatformChanges || saving}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading || !settingsLoadSucceeded || !hasUnsavedPlatformChanges}
          className="inline-flex items-center gap-2 rounded-full bg-[#ff6a00] px-5 py-2 text-xs font-black text-white shadow-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" /> Save Changes
            </>
          )}
        </button>
      </div>
      )}

      {/* Unsaved Changes Tab Switch Confirmation Dialog */}
      {showUnsavedDialog && pendingTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[2rem] border border-amber-200 bg-white p-8 shadow-2xl">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Unsaved Changes</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              You have unsaved changes in the <strong className="capitalize">{activeTab}</strong> section. If you switch sections now, your uncommitted edits will be discarded.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedDialog(false);
                  setPendingTab(null);
                }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Stay & Save
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isPlatformSettingsTab(activeTab)) {
                    const sectionKeys = SETTINGS_TAB_KEYS[activeTab];
                    setSettings((prev) => {
                      const next = { ...prev };
                      for (const key of sectionKeys) {
                        (next as any)[key] = (savedSettings as any)[key];
                      }
                      return next;
                    });
                  }
                  setActiveTab(pendingTab);
                  setShowUnsavedDialog(false);
                  setPendingTab(null);
                }}
                className="flex-1 rounded-xl bg-[#B91C1C] py-2.5 text-xs font-bold text-white hover:bg-[#991B1B] shadow-sm transition"
              >
                Discard & Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dangerous Action Confirmation Dialog for Maintenance Mode */}
      {showMaintenanceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-[2rem] border border-red-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-black text-slate-950">Enable Maintenance Mode?</h3>
            <p className="mt-2 text-xs font-medium text-slate-600 leading-relaxed">
              This will <strong>immediately block all buyers and vendors</strong> from browsing and purchasing on the marketplace. Only admin accounts will be able to access the platform.
            </p>
            <p className="mt-2 text-xs font-bold text-red-600">
              Are you sure you want to take the platform offline?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowMaintenanceConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateSetting('maintenance_enabled', true);
                  setShowMaintenanceConfirm(false);
                }}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 shadow-md shadow-red-900/20 transition"
              >
                Yes, Take Offline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
