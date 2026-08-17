import { query, transaction } from '../db/pool';
import { getRedis, withRedisTimeout } from '../db/redis';
import { logger } from '../utils/logger';
import { PdConflictError, PdErrorCode } from '../errors';

export type PlatformSettingValue = string | number | boolean;
export type PlatformSettingSection = 'marketplace' | 'algorithm' | 'commerce' | 'finance' | 'shipping' | 'security' | 'operations' | 'integrations';
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
  hub_card_show_rating: 'true',
  hub_card_show_add_to_cart: 'true',
  hub_card_add_to_cart_style: 'icon',
  hub_grid_columns: '5',
  hub_grid_items_per_load: '12',
  hub_feed_base_sort: 'random',
  hub_feed_personalization_pct: 30,
  hub_feed_diversity_enabled: true,
  hub_feed_diversity_strength: 50,
  hub_feed_max_items_per_store: 3,
  hub_feed_ab_testing_enabled: true,
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
  mandat_recipient_name: 'PandaMarket SARL',
  mandat_recipient_cin: '01234567',
  mandat_recipient_city: 'Tunis',
  mandat_bank_name: 'STB (Société Tunisienne de Banque)',
  mandat_bank_rib: '10 000 0000000000000 00',
  mandat_proof_email: 'billing@pandamarket.tn',
  mandat_bank_iban: 'TN59 1000 0000 0000 0000 0000',
  mandat_recipient_phone: '+216 71 000 000',
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
  rewards_widget_enabled: true,
  rewards_widget_button_label: "🎁 Gagnez jusqu'à 15 DT !",
  rewards_widget_prizes_json: '[{"label":"5 DT Offerts","code":"CHANCE5DT","disc":5.0,"icon":"🎟️","color":"#EF4444","desc":"5.000 DT de remise immédiate sur votre panier"},{"label":"Livraison 0 DT","code":"LIVRAISON_ZERO","disc":7.0,"icon":"🚚","color":"#10B981","desc":"Frais de livraison 100% offerts"},{"label":"-10% Panier","code":"PANDA10","disc":10,"icon":"🔥","color":"#F59E0B","desc":"10% de réduction immédiate sur toute votre commande"},{"label":"15 DT Cadeau","code":"SUPER15","disc":15.0,"icon":"🎁","color":"#8B5CF6","desc":"15.000 DT de réduction dès 80 DT d’achat"},{"label":"-5% Fidélité","code":"FIDELITE5","disc":5,"icon":"⭐","color":"#3B82F6","desc":"5% de réduction exclusive client"},{"label":"5 DT Offerts","code":"CHANCE5DT","disc":5.0,"icon":"🎟️","color":"#EC4899","desc":"5.000 DT de remise immédiate"}]',
} satisfies Record<string, PlatformSettingValue>;

export type PlatformSettingKey = keyof typeof PLATFORM_SETTING_DEFAULTS;
export type PlatformSettings = Record<PlatformSettingKey, PlatformSettingValue>;
export type PlatformSettingsBySection = Record<PlatformSettingSection, Partial<PlatformSettings>>;
export type PlatformSettingsSectionVersions = Record<PlatformSettingSection, string | null>;

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
  'hub_card_show_rating',
  'hub_card_show_add_to_cart',
  'hub_card_add_to_cart_style',
  'hub_grid_columns',
  'hub_grid_items_per_load',
  'hub_feed_base_sort',
  'hub_feed_personalization_pct',
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
  'rewards_widget_enabled',
  'rewards_widget_button_label',
  'rewards_widget_prizes_json',
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
  { id: 'marketplace', label: 'Marketplace & Hero', description: 'Identity, branding, themes, megamenu & hero builder' },
  { id: 'algorithm', label: 'Algorithme & Flux Hub', description: 'Tri du catalogue, personnalisation IA & santé du tagging sémantique' },
  { id: 'commerce', label: 'Commerce & Catalog', description: 'Product rules, moderation, reviews, AI & builder' },
  { id: 'finance', label: 'Finance & Payments', description: 'Gateways, Flouci, Konnect, commissions & payouts' },
  { id: 'shipping', label: 'Shipping & Delivery', description: 'Aramex, La Poste, platform delivery & zone rates' },
  { id: 'security', label: 'Security & Governance', description: 'Login security, password rules, custom domains & 2FA' },
  { id: 'operations', label: 'Platform Operations', description: 'Maintenance mode, storage limits & chat quotas' },
  { id: 'integrations', label: 'Integrations & Webmaster', description: 'GA4, GTM, Meta Pixel, Cloudflare & Search Console' },
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
    'hub_card_show_rating',
    'hub_card_show_add_to_cart',
    'hub_card_add_to_cart_style',
    'hub_grid_columns',
    'hub_grid_items_per_load',
  ],
  algorithm: [
    'hub_feed_base_sort',
    'hub_feed_personalization_pct',
    'hub_feed_diversity_enabled',
    'hub_feed_diversity_strength',
    'hub_feed_max_items_per_store',
    'hub_feed_ab_testing_enabled',
    'hub_card_show_rating',
    'hub_card_show_add_to_cart',
    'hub_card_add_to_cart_style',
    'hub_grid_columns',
    'hub_grid_items_per_load',
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
    'image_size_thumbnail_w',
    'image_size_thumbnail_h',
    'image_size_thumbnail_crop',
    'image_size_small_w',
    'image_size_small_h',
    'image_size_small_crop',
    'image_size_medium_w',
    'image_size_medium_h',
    'image_size_medium_crop',
    'image_size_large_w',
    'image_size_large_h',
    'image_size_large_crop',
    'image_quality_webp',
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
  'ads_enabled',
  'ads_moderation_required',
  'ads_sponsored_products_enabled',
  'ads_sponsored_brands_enabled',
  'ads_sponsored_content_enabled',
  'ads_creative_image_required',
  'rewards_widget_enabled',
  'hub_card_show_rating',
  'hub_card_show_add_to_cart',
  'hub_feed_diversity_enabled',
  'hub_feed_ab_testing_enabled',
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
  'image_size_thumbnail_w',
  'image_size_thumbnail_h',
  'image_size_small_w',
  'image_size_small_h',
  'image_size_medium_w',
  'image_size_medium_h',
  'image_size_large_w',
  'image_size_large_h',
  'image_quality_webp',
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
  'hub_feed_personalization_pct',
  'hub_feed_diversity_strength',
  'hub_feed_max_items_per_store',
]);

export function isPlatformSettingSection(value: string): value is PlatformSettingSection {
  return value === 'marketplace'
    || value === 'algorithm'
    || value === 'commerce'
    || value === 'finance'
    || value === 'shipping'
    || value === 'security'
    || value === 'operations'
    || value === 'integrations';
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
    algorithm: pickSettings(settings, PLATFORM_SETTING_SECTION_KEYS.algorithm),
    commerce: pickSettings(settings, PLATFORM_SETTING_SECTION_KEYS.commerce),
    finance: pickSettings(settings, PLATFORM_SETTING_SECTION_KEYS.finance),
    shipping: pickSettings(settings, PLATFORM_SETTING_SECTION_KEYS.shipping),
    security: pickSettings(settings, PLATFORM_SETTING_SECTION_KEYS.security),
    operations: pickSettings(settings, PLATFORM_SETTING_SECTION_KEYS.operations),
    integrations: pickSettings(settings, PLATFORM_SETTING_SECTION_KEYS.integrations),
  };
}

function versionValue(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

class PlatformConfigService {
  // In-process cache so a down/slow Redis doesn't add its timeout penalty to
  // every single request. Kept short; Redis (when healthy) remains primary.
  private memoryCache: { settings: PlatformSettings; expiresAt: number } | null = null;
  private static readonly MEMORY_CACHE_TTL_MS = 30_000;

  private remember(settings: PlatformSettings) {
    this.memoryCache = { settings, expiresAt: Date.now() + PlatformConfigService.MEMORY_CACHE_TTL_MS };
  }

  private async readCachedSettings(): Promise<PlatformSettings | null> {
    try {
      const cached = await withRedisTimeout(getRedis().get(PLATFORM_CONFIG_CACHE_KEY));
      if (!cached) return null;
      return { ...PLATFORM_SETTING_DEFAULTS, ...(JSON.parse(cached) as Partial<PlatformSettings>) } as PlatformSettings;
    } catch (err) {
      logger.warn({ err }, 'Failed to read platform config cache');
      return null;
    }
  }

  private async writeCachedSettings(settings: PlatformSettings) {
    try {
      await withRedisTimeout(getRedis().setex(PLATFORM_CONFIG_CACHE_KEY, PLATFORM_CONFIG_CACHE_TTL_SECONDS, JSON.stringify(settings)));
    } catch (err) {
      logger.warn({ err }, 'Failed to write platform config cache');
    }
  }

  private async invalidateCache(updatedKeys: PlatformSettingKey[]) {
    // Always drop the in-process copy so updates are visible immediately.
    this.memoryCache = null;
    try {
      const redis = getRedis();
      await withRedisTimeout(redis.del(PLATFORM_CONFIG_CACHE_KEY));
      await withRedisTimeout(
        redis.publish(
          PLATFORM_CONFIG_INVALIDATION_CHANNEL,
          JSON.stringify({ updated_keys: updatedKeys, updated_at: new Date().toISOString() }),
        ),
      );
    } catch (err) {
      logger.warn({ err }, 'Failed to invalidate platform config cache');
    }
  }

  async getSettings(): Promise<PlatformSettings> {
    if (this.memoryCache && this.memoryCache.expiresAt > Date.now()) {
      return this.memoryCache.settings;
    }

    const cachedSettings = await this.readCachedSettings();
    if (cachedSettings) {
      this.remember(cachedSettings);
      return cachedSettings;
    }

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
    this.remember(settings);
    await this.writeCachedSettings(settings);
    return settings;
  }

  async getGroupedSettings() {
    const settings = await this.getSettings();
    const sectionVersions = await this.getSectionVersions();
    return {
      data: settings,
      sections: groupSettings(settings),
      section_meta: PLATFORM_SETTING_SECTION_META,
      section_versions: sectionVersions,
    };
  }

  async getSectionVersions(): Promise<PlatformSettingsSectionVersions> {
    const versions = {} as PlatformSettingsSectionVersions;
    for (const section of Object.keys(PLATFORM_SETTING_SECTION_KEYS) as PlatformSettingSection[]) {
      versions[section] = null;
    }

    const { rows } = await query<{ key: string; updated_at: Date | string | null }>(
      `SELECT key, updated_at
       FROM pd_platform_config
       WHERE key = ANY($1::text[])`,
      [PLATFORM_SETTING_KEYS],
    );
    const keyVersions = new Map(rows.map((row) => [row.key, versionValue(row.updated_at)]));

    for (const section of Object.keys(PLATFORM_SETTING_SECTION_KEYS) as PlatformSettingSection[]) {
      const timestamps = PLATFORM_SETTING_SECTION_KEYS[section]
        .map((key) => keyVersions.get(key))
        .filter((value): value is string => Boolean(value));
      versions[section] = timestamps.length > 0
        ? new Date(Math.max(...timestamps.map((value) => Date.parse(value)))).toISOString()
        : null;
    }
    return versions;
  }

  async getPublicSettings() {
    const settings = await this.getSettings();
    const publicSettings: Record<string, PlatformSettingValue> = {};
    for (const key of PUBLIC_PLATFORM_SETTING_KEYS) {
      publicSettings[key] = settings[key];
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
    expectedVersion?: string | null,
  ) {
    const allowedKeys = new Set<PlatformSettingKey>(PLATFORM_SETTING_SECTION_KEYS[section]);
    const sectionInput: Partial<Record<PlatformSettingKey, PlatformSettingValue>> = {};
    for (const [key, value] of Object.entries(input)) {
      if (isPlatformSettingKey(key) && allowedKeys.has(key) && value !== undefined) {
        sectionInput[key] = value;
      }
    }
    const entries = Object.entries(sectionInput) as Array<[PlatformSettingKey, PlatformSettingValue]>;
    await transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`pd_platform_settings:${section}`]);
      if (expectedVersion !== undefined) {
        const { rows } = await client.query<{ updated_at: Date | string | null }>(
          `SELECT MAX(updated_at) AS updated_at
           FROM pd_platform_config
           WHERE key = ANY($1::text[])`,
          [PLATFORM_SETTING_SECTION_KEYS[section]],
        );
        const currentVersion = versionValue(rows[0]?.updated_at);
        if (currentVersion !== expectedVersion) {
          throw new PdConflictError(
            PdErrorCode.SETTINGS_CONFLICT,
            'This settings section changed after it was loaded. Review the latest values before saving again.',
            { section, expected_version: expectedVersion, current_version: currentVersion },
          );
        }
      }

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
}

export const platformConfigService = new PlatformConfigService();
