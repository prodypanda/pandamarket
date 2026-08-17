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
  hub_feed_base_sort: 'random' | 'newest' | 'alphabetical' | 'best_sellers';
  hub_feed_personalization_pct: number;
  hub_feed_diversity_enabled: boolean;
  hub_feed_diversity_strength: number;
  hub_feed_max_items_per_store: number;
  hub_feed_ab_testing_enabled: boolean;
  hub_card_show_rating: boolean;
  hub_card_show_add_to_cart: boolean;
  hub_card_add_to_cart_style: 'icon' | 'compact' | 'full';
  hub_grid_columns: number;
  hub_grid_items_per_load: number;
  hub_search_grid_columns: number;
  hub_search_items_per_page: number;
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
  watermark_enabled: boolean;
  watermark_type: 'text' | 'image' | 'both';
  watermark_text: string;
  watermark_image_url: string;
  watermark_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'diagonal_repeat';
  watermark_opacity: number;
  watermark_scale: 'small' | 'medium' | 'large';
  watermark_style: 'subtle' | 'badge' | 'glassmorphism';
  watermark_show_on_gallery: boolean;
  watermark_show_on_cards: boolean;
  watermark_show_on_lightbox: boolean;
  watermark_copy_protection: boolean;
}

export type SettingsTab = 'marketplace' | 'commerce' | 'algorithm' | 'finance' | 'shipping' | 'security' | 'operations' | 'integrations' | 'plans' | 'email';
export type PlatformSettingsTab = Exclude<SettingsTab, 'email' | 'plans'>;

export interface SmtpConfigPublic {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass_set: boolean;
  smtp_secure: boolean;
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_enabled: boolean;
}

export interface SmtpFormData {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: boolean;
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_enabled: boolean;
}

export type SmtpTestStatus = 'idle' | 'testing' | 'success' | 'error';

export const DEFAULT_SETTINGS: PlatformSettings = {
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
  hub_feed_base_sort: 'random',
  hub_feed_personalization_pct: 30,
  hub_feed_diversity_enabled: true,
  hub_feed_diversity_strength: 50,
  hub_feed_max_items_per_store: 3,
  hub_feed_ab_testing_enabled: true,
  hub_card_show_rating: true,
  hub_card_show_add_to_cart: true,
  hub_card_add_to_cart_style: 'icon',
  hub_grid_columns: 5,
  hub_grid_items_per_load: 12,
  hub_search_grid_columns: 5,
  hub_search_items_per_page: 20,
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
  watermark_enabled: false,
  watermark_type: 'text',
  watermark_text: 'PandaMarket',
  watermark_image_url: '',
  watermark_position: 'bottom-right',
  watermark_opacity: 40,
  watermark_scale: 'medium',
  watermark_style: 'subtle',
  watermark_show_on_gallery: true,
  watermark_show_on_cards: true,
  watermark_show_on_lightbox: true,
  watermark_copy_protection: false,
};

export const DEFAULT_SMTP_FORM: SmtpFormData = {
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_pass: '',
  smtp_secure: false,
  smtp_from_name: 'PandaMarket',
  smtp_from_email: 'noreply@pandamarket.tn',
  smtp_enabled: false,
};