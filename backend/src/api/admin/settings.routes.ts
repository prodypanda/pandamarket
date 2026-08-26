import { PdConflictError, PdErrorCode } from '../../errors';
import { asyncHandler, validate } from '../../middlewares';
import { invalidateMaintenanceCache } from '../../middlewares/maintenance.middleware';
import { platformConfigService, type PlatformSettingKey, type PlatformSettingSection, type PlatformSettingValue } from '../../services/platform-config.service';
import { logger } from '../../utils/logger';
import { UserRole } from '@pandamarket/types';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

/** Global Platform Settings — extracted from admin.route.ts (E15 split). */
const router = Router();

const publicLinkSettingSchema = z.coerce
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value === '' || /^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value),
    'Must be a relative path or http(s) URL',
  );

const hexColorSettingSchema = z.coerce
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color like #B91C1C');
const ga4MeasurementIdSchema = z.coerce
  .string()
  .trim()
  .regex(/^(|G-[A-Z0-9]{4,20})$/, 'Must be blank or a GA4 measurement ID like G-XXXXXXXXXX');
const gtmContainerIdSchema = z.coerce
  .string()
  .trim()
  .regex(/^(|GTM-[A-Z0-9]{4,20})$/, 'Must be blank or a GTM container ID like GTM-XXXXXXX');
const metaPixelIdSchema = z.coerce
  .string()
  .trim()
  .regex(/^(|\d{5,30})$/, 'Must be blank or a numeric Meta Pixel ID');
const searchConsoleVerificationSchema = z.coerce
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{0,255}$/, 'Must contain only letters, numbers, underscores, or hyphens');
const cloudflareIdentifierSchema = z.coerce
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{0,128}$/, 'Must contain only letters, numbers, underscores, or hyphens');

const hubHomepageBlocksSchema = z.coerce
  .string()
  .trim()
  .max(40000)
  .refine((value) => {
    if (value === '') return true;
    try {
      const parsed = JSON.parse(value);
      return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }, 'Must be blank or a JSON object describing homepage blocks');

const globalSettingsSchema = z.object({
  marketplace_name: z.coerce.string().min(1).max(120).optional(),
  marketplace_tagline: z.coerce.string().max(255).optional(),
  marketplace_logo_url: z.coerce.string().max(2048).optional(),
  marketplace_logo_light_url: z.coerce.string().max(2048).optional(),
  marketplace_logo_dark_url: z.coerce.string().max(2048).optional(),
  marketplace_favicon_url: publicLinkSettingSchema.optional(),
  marketplace_og_image_url: publicLinkSettingSchema.optional(),
  marketplace_public_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_theme: z.enum(['panda', 'aliexpress', 'aliexpress2']).optional(),
  marketplace_primary_color: hexColorSettingSchema.optional(),
  marketplace_secondary_color: hexColorSettingSchema.optional(),
  marketplace_default_locale: z.enum(['fr', 'en', 'ar']).optional(),
  marketplace_supported_locales: z.coerce.string().trim().max(40).optional(),
  marketplace_rtl_enabled: z.boolean().optional(),
  marketplace_support_email: z.union([z.coerce.string().email(), z.literal('')]).optional(),
  marketplace_support_phone: z.coerce.string().max(40).optional(),
  marketplace_support_whatsapp: z.coerce.string().max(80).optional(),
  marketplace_address: z.coerce.string().max(255).optional(),
  marketplace_city: z.coerce.string().max(100).optional(),
  marketplace_country: z.coerce.string().max(100).optional(),
  marketplace_business_hours: z.coerce.string().max(255).optional(),
  marketplace_facebook_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_instagram_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_x_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_tiktok_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_youtube_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_linkedin_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_whatsapp_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_telegram_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_pinterest_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_snapchat_url: z.union([z.coerce.string().url(), z.literal('')]).optional(),
  marketplace_help_url: publicLinkSettingSchema.optional(),
  marketplace_terms_url: publicLinkSettingSchema.optional(),
  marketplace_privacy_url: publicLinkSettingSchema.optional(),
  marketplace_refund_url: publicLinkSettingSchema.optional(),
  marketplace_cookie_policy_url: publicLinkSettingSchema.optional(),
  marketplace_contact_url: publicLinkSettingSchema.optional(),
  catalog_featured_category_slugs: z.coerce.string().trim().max(1000).optional(),
  catalog_default_sort: z
    .enum(['newest', 'oldest', 'price_asc', 'price_desc', 'title_asc'])
    .optional(),
  hub_homepage_layout: z
    .enum(['theme_default', 'classic', 'deals', 'premium_deals', 'alibaba', 'amazon'])
    .optional(),
  hub_homepage_pagination_style: z
    .enum(['infinite', 'load_more', 'pagination', 'none'])
    .optional(),
  hub_megamenu_style: z
    .enum(['standard', 'visual_rich', 'ultra_rich', 'ultra_rich_deep'])
    .optional(),
  hub_megamenu_lazy_loading: z.boolean().optional(),
  hub_category_page_style: z.enum(['v1_classic', 'v2_modern_showcase']).optional(),
  hub_homepage_banner_title: z.coerce.string().trim().max(160).optional(),
  hub_homepage_banner_subtitle: z.coerce.string().trim().max(320).optional(),
  hub_homepage_banner_cta_label: z.coerce.string().trim().max(80).optional(),
  hub_homepage_banner_cta_url: publicLinkSettingSchema.optional(),
  hub_homepage_banner_image_url: publicLinkSettingSchema.optional(),
  hub_homepage_blocks: hubHomepageBlocksSchema.optional(),
  hub_hero_show_category_sidebar: z.boolean().optional(),
  hub_hero_show_carousel: z.boolean().optional(),
  hub_hero_show_seller_rail: z.boolean().optional(),
  hub_hero_category_sidebar_max_items: z.coerce.number().int().min(1).max(30).optional(),
  hub_hero_carousel_max_categories: z.coerce.number().int().min(1).max(10).optional(),
  hub_hero_carousel_slides: z.coerce.string().max(10000).optional(),
  hub_hero_carousel_source_mode: z
    .enum(['hybrid', 'custom_only', 'auto_categories_only'])
    .optional(),
  hub_hero_carousel_autoplay: z.boolean().optional(),
  hub_hero_carousel_interval: z.coerce.number().int().min(2000).max(30000).optional(),
  hub_hero_carousel_transition: z.enum(['slide', 'fade', 'zoom']).optional(),
  hub_hero_carousel_dots_style: z.enum(['pill', 'circle', 'numbers', 'hidden']).optional(),
  hub_hero_carousel_show_arrows: z.boolean().optional(),
  hub_hero_seller_rail_title: z.coerce.string().trim().max(160).optional(),
  hub_hero_seller_rail_subtitle: z.coerce.string().trim().max(320).optional(),
  hub_hero_seller_rail_cta_label: z.coerce.string().trim().max(80).optional(),
  hub_hero_seller_rail_cta_url: publicLinkSettingSchema.optional(),
  hub_hero_seller_rail_badge_text: z.coerce.string().trim().max(80).optional(),
  hub_card_show_rating: z.boolean().optional(),
  hub_card_show_add_to_cart: z.boolean().optional(),
  hub_card_add_to_cart_style: z.enum(['icon', 'compact', 'full']).optional(),
  hub_card_show_store_name: z.boolean().optional(),
  hub_card_show_store_verified: z.boolean().optional(),
  hub_card_show_store_score: z.boolean().optional(),
  hub_grid_columns: z.coerce.number().int().min(2).max(8).optional(),
  hub_grid_items_per_load: z.coerce.number().int().min(6).max(48).optional(),
  hub_search_grid_columns: z.coerce.number().int().min(2).max(8).optional(),
  hub_search_items_per_page: z.coerce.number().int().min(6).max(100).optional(),
  hub_search_sponsored_enabled: z.boolean().optional(),
  hub_search_sponsored_columns: z.coerce.number().int().min(1).max(8).optional(),
  hub_search_sponsored_count: z.coerce.number().int().min(1).max(24).optional(),
  watermark_enabled: z.boolean().optional(),
  watermark_type: z.enum(['text', 'image', 'both']).optional(),
  watermark_text: z.coerce.string().trim().max(100).optional(),
  watermark_image_url: publicLinkSettingSchema.optional(),
  watermark_position: z
    .enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'diagonal_repeat'])
    .optional(),
  watermark_opacity: z.coerce.number().int().min(10).max(100).optional(),
  watermark_scale: z.enum(['small', 'medium', 'large']).optional(),
  watermark_style: z.enum(['subtle', 'badge', 'glassmorphism']).optional(),
  watermark_show_on_gallery: z.boolean().optional(),
  watermark_show_on_cards: z.boolean().optional(),
  watermark_show_on_lightbox: z.boolean().optional(),
  watermark_copy_protection: z.boolean().optional(),
  single_product_page_version: z.enum(['v1_classic', 'v2_modern_showcase']).optional(),
  single_product_gallery_layout: z.enum(['sticky_carousel', 'grid_mosaic', 'stacked']).optional(),
  single_product_sticky_cart_bar: z.boolean().optional(),
  single_product_show_reassurance: z.boolean().optional(),
  single_product_reassurance_items: z.coerce.string().optional(),
  single_product_show_delivery_estimator: z.boolean().optional(),
  single_product_show_stock_urgency: z.boolean().optional(),
  single_product_stock_urgency_threshold: z.coerce.number().int().min(1).max(100).optional(),
  single_product_show_share_buttons: z.boolean().optional(),
  single_product_seller_card_style: z.enum(['compact', 'rich_banner', 'glass']).optional(),
  single_product_details_layout: z.enum(['tabs', 'accordions', 'stacked']).optional(),
  single_product_cross_sell_position: z.enum(['bottom', 'sidebar', 'both']).optional(),
  single_product_show_wholesale_calculator: z.boolean().optional(),
  single_product_show_live_views: z.boolean().optional(),
  single_product_show_contact_seller: z.boolean().optional(),
  hub_feed_base_sort: z.enum(['random', 'newest', 'alphabetical', 'best_sellers']).optional(),
  hub_feed_personalization_pct: z.coerce.number().int().min(0).max(50).optional(),
  hub_feed_diversity_enabled: z.boolean().optional(),
  hub_feed_diversity_strength: z.coerce.number().int().min(0).max(100).optional(),
  hub_feed_max_items_per_store: z.coerce.number().int().min(1).max(10).optional(),
  hub_feed_ab_testing_enabled: z.boolean().optional(),
  analytics_ga4_enabled: z.boolean().optional(),
  analytics_ga4_measurement_id: ga4MeasurementIdSchema.optional(),
  analytics_gtm_enabled: z.boolean().optional(),
  analytics_gtm_container_id: gtmContainerIdSchema.optional(),
  analytics_meta_pixel_enabled: z.boolean().optional(),
  analytics_meta_pixel_id: metaPixelIdSchema.optional(),
  search_console_verification: searchConsoleVerificationSchema.optional(),
  cloudflare_integration_enabled: z.boolean().optional(),
  cloudflare_account_id: cloudflareIdentifierSchema.optional(),
  cloudflare_zone_id: cloudflareIdentifierSchema.optional(),
  cloudflare_custom_hostnames_enabled: z.boolean().optional(),
  chat_bubble_enabled: z.boolean().optional(),
  chat_bubble_position: z.enum(['bottom-right', 'bottom-left']).optional(),
  marketplace_enabled: z.boolean().optional(),
  vendor_registration_enabled: z.boolean().optional(),
  buyer_registration_enabled: z.boolean().optional(),
  product_moderation_required: z.boolean().optional(),
  product_auto_publish_verified: z.boolean().optional(),
  seller_type_change_auto_approval: z.boolean().optional(),
  reviews_enabled: z.boolean().optional(),
  review_auto_publish: z.boolean().optional(),
  wishlist_enabled: z.boolean().optional(),
  ai_tools_enabled: z.boolean().optional(),
  page_builder_enabled: z.boolean().optional(),
  plugins_marketplace_enabled: z.boolean().optional(),
  email_marketing_enabled: z.boolean().optional(),
  rewards_widget_enabled: z.boolean().optional(),
  rewards_widget_button_label: z.coerce.string().trim().max(300).optional(),
  rewards_widget_prizes_json: z.coerce.string().trim().max(20000).optional(),
  cart_enabled: z.boolean().optional(),
  shipping_enabled: z.boolean().optional(),
  shipping_self_managed_enabled: z.boolean().optional(),
  shipping_platform_unified_enabled: z.boolean().optional(),
  shipping_default_provider: z.enum(['auto', 'aramex', 'laposte', 'platform']).optional(),
  shipping_aramex_enabled: z.boolean().optional(),
  shipping_laposte_enabled: z.boolean().optional(),
  shipping_platform_fallback_enabled: z.boolean().optional(),
  shipping_default_origin_city: z.coerce.string().trim().min(1).max(100).optional(),
  shipping_default_origin_country: z.coerce.string().trim().min(2).max(2).optional(),
  shipping_domestic_zone_cities: z.coerce.string().trim().max(2000).optional(),
  shipping_remote_zone_cities: z.coerce.string().trim().max(2000).optional(),
  shipping_platform_flat_rate_tnd: z.coerce.number().min(0).max(1000).optional(),
  shipping_domestic_zone_rate_tnd: z.coerce.number().min(0).max(1000).optional(),
  shipping_remote_zone_rate_tnd: z.coerce.number().min(0).max(1000).optional(),
  shipping_free_shipping_threshold_tnd: z.coerce.number().min(0).max(100000).optional(),
  order_splitting_enabled: z.boolean().optional(),
  tax_mode: z.enum(['none', 'included', 'exclusive']).optional(),
  default_tax_rate: z.coerce.number().min(0).max(100).optional(),
  price_rounding_mode: z
    .enum(['none', 'nearest_0_001', 'nearest_0_010', 'nearest_0_100'])
    .optional(),
  auto_cancel_unpaid_enabled: z.boolean().optional(),
  auto_cancel_unpaid_minutes: z.coerce.number().int().min(5).max(10080).optional(),
  retention_days_flouci: z.coerce.number().int().min(1).max(90).optional(),
  retention_days_konnect: z.coerce.number().int().min(1).max(90).optional(),
  retention_days_mandat: z.coerce.number().int().min(1).max(90).optional(),
  retention_days_cod: z.coerce.number().int().min(1).max(90).optional(),
  payout_schedule: z.enum(['manual', 'daily', 'weekly', 'biweekly', 'monthly']).optional(),
  min_withdrawal_tnd: z.coerce.number().min(1).optional(),
  platform_commission_rate: z.coerce.number().min(0).max(100).optional(),
  default_currency: z.string().min(3).max(3).optional(),
  payment_sandbox_mode: z.boolean().optional(),
  payment_flouci_enabled: z.boolean().optional(),
  payment_konnect_enabled: z.boolean().optional(),
  payment_paypal_enabled: z.boolean().optional(),
  payment_paypal_mode: z.enum(['sandbox', 'live']).optional(),
  payment_paypal_sandbox_client_id: z.coerce.string().max(500).optional(),
  payment_paypal_sandbox_client_secret: z.coerce.string().max(500).optional(),
  payment_paypal_sandbox_webhook_id: z.coerce.string().max(500).optional(),
  payment_paypal_live_client_id: z.coerce.string().max(500).optional(),
  payment_paypal_live_client_secret: z.coerce.string().max(500).optional(),
  payment_paypal_live_webhook_id: z.coerce.string().max(500).optional(),
  payment_paypal_currency: z.coerce.string().max(10).optional(),
  payment_paypal_fx_rate_tnd_to_target: z.coerce.number().min(0.0001).max(1000).optional(),
  payment_mandat_enabled: z.boolean().optional(),
  payment_cod_enabled: z.boolean().optional(),
  payment_vendor_direct_enabled: z.boolean().optional(),
  payment_platform_credentials_source: z
    .enum(['environment', 'platform_config', 'vendor_direct_only'])
    .optional(),
  mandat_recipient_name: z.coerce.string().max(200).optional(),
  mandat_recipient_cin: z.coerce.string().max(20).optional(),
  mandat_recipient_city: z.coerce.string().max(100).optional(),
  mandat_proof_email: z.coerce.string().email().optional(),
  max_upload_size_mb: z.coerce.number().int().min(1).max(100).optional(),
  max_product_images: z.coerce.number().int().min(1).max(50).optional(),
  max_products_per_store_free: z.coerce.number().int().min(1).max(10000).optional(),
  default_low_stock_threshold: z.coerce.number().int().min(0).max(1000).optional(),
  image_size_thumbnail_w: z.coerce.number().int().min(20).max(2000).optional(),
  image_size_thumbnail_h: z.coerce.number().int().min(20).max(2000).optional(),
  image_size_thumbnail_crop: z.enum(['cover', 'inside']).optional(),
  image_size_small_w: z.coerce.number().int().min(50).max(2000).optional(),
  image_size_small_h: z.coerce.number().int().min(50).max(2000).optional(),
  image_size_small_crop: z.enum(['cover', 'inside']).optional(),
  image_size_medium_w: z.coerce.number().int().min(100).max(3000).optional(),
  image_size_medium_h: z.coerce.number().int().min(100).max(3000).optional(),
  image_size_medium_crop: z.enum(['cover', 'inside']).optional(),
  image_size_large_w: z.coerce.number().int().min(200).max(4000).optional(),
  image_size_large_h: z.coerce.number().int().min(200).max(4000).optional(),
  image_size_large_crop: z.enum(['cover', 'inside']).optional(),
  image_quality_webp: z.coerce.number().int().min(30).max(100).optional(),
  chat_message_rate_limit_per_minute: z.coerce.number().int().min(1).max(300).optional(),
  chat_max_images_per_message: z.coerce.number().int().min(1).max(10).optional(),
  chat_max_image_size_mb: z.coerce.number().int().min(1).max(25).optional(),
  chat_max_message_length: z.coerce.number().int().min(1).max(5000).optional(),
  notifications_in_app_enabled: z.boolean().optional(),
  notifications_realtime_enabled: z.boolean().optional(),
  notifications_email_enabled: z.boolean().optional(),
  notifications_sms_enabled: z.boolean().optional(),
  notifications_sms_provider: z.enum(['environment', 'console', 'twilio', 'infobip']).optional(),
  notifications_sms_sender_name: z.coerce.string().trim().min(1).max(30).optional(),
  security_login_max_attempts: z.coerce.number().int().min(3).max(20).optional(),
  security_login_lockout_minutes: z.coerce.number().int().min(1).max(1440).optional(),
  security_password_min_length: z.coerce.number().int().min(8).max(72).optional(),
  security_password_require_uppercase: z.boolean().optional(),
  security_password_require_lowercase: z.boolean().optional(),
  security_password_require_number: z.boolean().optional(),
  security_password_require_symbol: z.boolean().optional(),
  security_2fa_required_roles: z.coerce.string().trim().max(120).optional(),
  security_custom_domains_enabled: z.boolean().optional(),
  security_custom_domain_allowed_suffixes: z.coerce.string().trim().max(1000).optional(),
  security_custom_domain_blocked_suffixes: z.coerce.string().trim().max(1000).optional(),
  maintenance_enabled: z.boolean().optional(),
  maintenance_title: z.coerce.string().max(200).optional(),
  maintenance_message: z.coerce.string().max(2000).optional(),
  maintenance_illustration_url: publicLinkSettingSchema.optional(),
  maintenance_eta: z.coerce.string().max(100).optional(),
  maintenance_allowed_ips: z.coerce.string().max(2000).optional(),
  maintenance_block_storefronts: z.boolean().optional(),
});

const marketplaceSettingsSchema = globalSettingsSchema
  .pick({
    marketplace_name: true,
    marketplace_tagline: true,
    marketplace_logo_url: true,
    marketplace_logo_light_url: true,
    marketplace_logo_dark_url: true,
    marketplace_favicon_url: true,
    marketplace_og_image_url: true,
    marketplace_public_url: true,
    marketplace_theme: true,
    marketplace_primary_color: true,
    marketplace_secondary_color: true,
    marketplace_default_locale: true,
    marketplace_supported_locales: true,
    marketplace_rtl_enabled: true,
    marketplace_support_email: true,
    marketplace_support_phone: true,
    marketplace_support_whatsapp: true,
    marketplace_address: true,
    marketplace_city: true,
    marketplace_country: true,
    marketplace_business_hours: true,
    marketplace_facebook_url: true,
    marketplace_instagram_url: true,
    marketplace_x_url: true,
    marketplace_tiktok_url: true,
    marketplace_youtube_url: true,
    marketplace_linkedin_url: true,
    marketplace_whatsapp_url: true,
    marketplace_telegram_url: true,
    marketplace_pinterest_url: true,
    marketplace_snapchat_url: true,
    marketplace_help_url: true,
    marketplace_terms_url: true,
    marketplace_privacy_url: true,
    marketplace_refund_url: true,
    marketplace_cookie_policy_url: true,
    marketplace_contact_url: true,
    catalog_featured_category_slugs: true,
    catalog_default_sort: true,
    hub_homepage_layout: true,
    hub_homepage_pagination_style: true,
    hub_megamenu_style: true,
    hub_megamenu_lazy_loading: true,
    hub_category_page_style: true,
    hub_homepage_banner_title: true,
    hub_homepage_banner_subtitle: true,
    hub_homepage_banner_cta_label: true,
    hub_homepage_banner_cta_url: true,
    hub_homepage_banner_image_url: true,
    hub_homepage_blocks: true,
    hub_hero_show_category_sidebar: true,
    hub_hero_show_carousel: true,
    hub_hero_show_seller_rail: true,
    hub_hero_category_sidebar_max_items: true,
    hub_hero_carousel_max_categories: true,
    hub_hero_carousel_slides: true,
    hub_hero_carousel_source_mode: true,
    hub_hero_carousel_autoplay: true,
    hub_hero_carousel_interval: true,
    hub_hero_carousel_transition: true,
    hub_hero_carousel_dots_style: true,
    hub_hero_carousel_show_arrows: true,
    hub_hero_seller_rail_title: true,
    hub_hero_seller_rail_subtitle: true,
    hub_hero_seller_rail_cta_label: true,
    hub_hero_seller_rail_cta_url: true,
    hub_hero_seller_rail_badge_text: true,
    hub_card_show_rating: true,
    hub_card_show_add_to_cart: true,
    hub_card_add_to_cart_style: true,
    hub_card_show_store_name: true,
    hub_card_show_store_verified: true,
    hub_card_show_store_score: true,
    hub_grid_columns: true,
    hub_grid_items_per_load: true,
    hub_search_grid_columns: true,
    hub_search_items_per_page: true,
    hub_search_sponsored_enabled: true,
    hub_search_sponsored_columns: true,
    hub_search_sponsored_count: true,
    watermark_enabled: true,
    watermark_type: true,
    watermark_text: true,
    watermark_image_url: true,
    watermark_position: true,
    watermark_opacity: true,
    watermark_scale: true,
    watermark_style: true,
    watermark_show_on_gallery: true,
    watermark_show_on_cards: true,
    watermark_show_on_lightbox: true,
    watermark_copy_protection: true,
  })
  .strict();

const commerceSettingsSchema = globalSettingsSchema
  .pick({
    marketplace_enabled: true,
    vendor_registration_enabled: true,
    buyer_registration_enabled: true,
    product_moderation_required: true,
    product_auto_publish_verified: true,
    seller_type_change_auto_approval: true,
    reviews_enabled: true,
    review_auto_publish: true,
    wishlist_enabled: true,
    ai_tools_enabled: true,
    page_builder_enabled: true,
    plugins_marketplace_enabled: true,
    email_marketing_enabled: true,
    rewards_widget_enabled: true,
    rewards_widget_button_label: true,
    rewards_widget_prizes_json: true,
    cart_enabled: true,
    catalog_featured_category_slugs: true,
    catalog_default_sort: true,
    shipping_enabled: true,
    shipping_self_managed_enabled: true,
    shipping_platform_unified_enabled: true,
    shipping_default_provider: true,
    shipping_aramex_enabled: true,
    shipping_laposte_enabled: true,
    shipping_platform_fallback_enabled: true,
    shipping_default_origin_city: true,
    shipping_default_origin_country: true,
    shipping_domestic_zone_cities: true,
    shipping_remote_zone_cities: true,
    shipping_platform_flat_rate_tnd: true,
    shipping_domestic_zone_rate_tnd: true,
    shipping_remote_zone_rate_tnd: true,
    shipping_free_shipping_threshold_tnd: true,
    order_splitting_enabled: true,
    tax_mode: true,
    default_tax_rate: true,
    price_rounding_mode: true,
    auto_cancel_unpaid_enabled: true,
    auto_cancel_unpaid_minutes: true,
  })
  .passthrough();

const financeSettingsSchema = globalSettingsSchema
  .pick({
    retention_days_flouci: true,
    retention_days_konnect: true,
    retention_days_mandat: true,
    retention_days_cod: true,
    payout_schedule: true,
    min_withdrawal_tnd: true,
    platform_commission_rate: true,
    default_currency: true,
    payment_sandbox_mode: true,
    payment_flouci_enabled: true,
    payment_konnect_enabled: true,
    payment_paypal_enabled: true,
    payment_paypal_mode: true,
    payment_paypal_sandbox_client_id: true,
    payment_paypal_sandbox_client_secret: true,
    payment_paypal_sandbox_webhook_id: true,
    payment_paypal_live_client_id: true,
    payment_paypal_live_client_secret: true,
    payment_paypal_live_webhook_id: true,
    payment_paypal_currency: true,
    payment_paypal_fx_rate_tnd_to_target: true,
    payment_mandat_enabled: true,
    payment_cod_enabled: true,
    payment_vendor_direct_enabled: true,
    payment_platform_credentials_source: true,
    mandat_recipient_name: true,
    mandat_recipient_cin: true,
    mandat_recipient_city: true,
    mandat_proof_email: true,
  })
  .strict();

const operationsSettingsSchema = globalSettingsSchema
  .pick({
    chat_bubble_enabled: true,
    chat_bubble_position: true,
    max_upload_size_mb: true,
    max_product_images: true,
    max_products_per_store_free: true,
    default_low_stock_threshold: true,
    chat_message_rate_limit_per_minute: true,
    chat_max_images_per_message: true,
    chat_max_image_size_mb: true,
    chat_max_message_length: true,
    notifications_in_app_enabled: true,
    notifications_realtime_enabled: true,
    notifications_email_enabled: true,
    notifications_sms_enabled: true,
    notifications_sms_provider: true,
    notifications_sms_sender_name: true,
    security_login_max_attempts: true,
    security_login_lockout_minutes: true,
    security_password_min_length: true,
    security_password_require_uppercase: true,
    security_password_require_lowercase: true,
    security_password_require_number: true,
    security_password_require_symbol: true,
    security_2fa_required_roles: true,
    security_custom_domains_enabled: true,
    security_custom_domain_allowed_suffixes: true,
    security_custom_domain_blocked_suffixes: true,
    maintenance_enabled: true,
    maintenance_title: true,
    maintenance_message: true,
    maintenance_illustration_url: true,
    maintenance_eta: true,
    maintenance_allowed_ips: true,
    maintenance_block_storefronts: true,
  })
  .strict();

const integrationsSettingsSchema = globalSettingsSchema
  .pick({
    analytics_ga4_enabled: true,
    analytics_ga4_measurement_id: true,
    analytics_gtm_enabled: true,
    analytics_gtm_container_id: true,
    analytics_meta_pixel_enabled: true,
    analytics_meta_pixel_id: true,
    search_console_verification: true,
    cloudflare_integration_enabled: true,
    cloudflare_account_id: true,
    cloudflare_zone_id: true,
    cloudflare_custom_hostnames_enabled: true,
  })
  .strict();

const shippingSettingsSchema = globalSettingsSchema
  .pick({
    shipping_enabled: true,
    shipping_self_managed_enabled: true,
    shipping_platform_unified_enabled: true,
    shipping_default_provider: true,
    shipping_aramex_enabled: true,
    shipping_laposte_enabled: true,
    shipping_platform_fallback_enabled: true,
    shipping_default_origin_city: true,
    shipping_default_origin_country: true,
    shipping_domestic_zone_cities: true,
    shipping_remote_zone_cities: true,
    shipping_platform_flat_rate_tnd: true,
    shipping_domestic_zone_rate_tnd: true,
    shipping_remote_zone_rate_tnd: true,
    shipping_free_shipping_threshold_tnd: true,
  })
  .strict();

const securitySettingsSchema = globalSettingsSchema
  .pick({
    security_login_max_attempts: true,
    security_login_lockout_minutes: true,
    security_password_min_length: true,
    security_password_require_uppercase: true,
    security_password_require_lowercase: true,
    security_password_require_number: true,
    security_password_require_symbol: true,
    security_2fa_required_roles: true,
    security_custom_domains_enabled: true,
    security_custom_domain_allowed_suffixes: true,
    security_custom_domain_blocked_suffixes: true,
  })
  .strict();

const algorithmSettingsSchema = globalSettingsSchema
  .pick({
    hub_feed_base_sort: true,
    hub_feed_personalization_pct: true,
    hub_feed_diversity_enabled: true,
    hub_feed_diversity_strength: true,
    hub_feed_max_items_per_store: true,
    hub_feed_ab_testing_enabled: true,
    hub_card_show_rating: true,
    hub_card_show_add_to_cart: true,
    hub_card_add_to_cart_style: true,
    hub_card_show_store_name: true,
    hub_card_show_store_verified: true,
    hub_card_show_store_score: true,
    hub_grid_columns: true,
    hub_grid_items_per_load: true,
    hub_search_grid_columns: true,
    hub_search_items_per_page: true,
    hub_search_sponsored_enabled: true,
    hub_search_sponsored_columns: true,
    hub_search_sponsored_count: true,
  })
  .strict();

const corePagesSettingsSchema = globalSettingsSchema
  .pick({
    single_product_page_version: true,
    single_product_gallery_layout: true,
    single_product_sticky_cart_bar: true,
    single_product_show_reassurance: true,
    single_product_reassurance_items: true,
    single_product_show_delivery_estimator: true,
    single_product_show_stock_urgency: true,
    single_product_stock_urgency_threshold: true,
    single_product_show_share_buttons: true,
    single_product_seller_card_style: true,
    single_product_details_layout: true,
    single_product_cross_sell_position: true,
    single_product_show_wholesale_calculator: true,
    single_product_show_live_views: true,
    single_product_show_contact_seller: true,
  })
  .strict();

const settingsSectionParamSchema = z.object({
  section: z.enum([
    'marketplace',
    'core_pages',
    'algorithm',
    'commerce',
    'finance',
    'shipping',
    'security',
    'operations',
    'integrations',
  ]),
});

const settingsSectionSchemas: Record<PlatformSettingSection, z.ZodTypeAny> = {
  marketplace: marketplaceSettingsSchema,
  core_pages: corePagesSettingsSchema,
  algorithm: algorithmSettingsSchema,
  commerce: commerceSettingsSchema,
  finance: financeSettingsSchema,
  shipping: shippingSettingsSchema,
  security: securitySettingsSchema,
  operations: operationsSettingsSchema,
  integrations: integrationsSettingsSchema,
};

/**
 * GET /admin/settings — Retrieve current platform settings.
 * Settings are stored in pd_platform_config (key-value).
 * Falls back to defaults from config.ts if not set.
 */
router.get(
  '/settings',
  asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json(await platformConfigService.getGroupedSettings());
  }),
);

/**
 * PUT /admin/settings — Update platform settings.
 * Upserts each key-value pair into pd_platform_config.
 */
router.put(
  '/settings',
  validate(globalSettingsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const updatedKeys = await platformConfigService.updateSettings(
      req.body as Partial<Record<PlatformSettingKey, PlatformSettingValue>>,
      req.user!.id,
    );

    logger.info({ admin_id: req.user!.id, keys: updatedKeys }, 'Admin updated platform settings');

    if (updatedKeys.some((key) => key.startsWith('maintenance_'))) {
      invalidateMaintenanceCache();
    }

    res.status(200).json({
      success: true,
      message: 'Settings updated',
      updated_keys: updatedKeys,
      ...(await platformConfigService.getGroupedSettings()),
    });
  }),
);

router.put(
  '/settings/:section',
  validate(settingsSectionParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { section } = req.params as { section: PlatformSettingSection };

    // Privileged Section Authorization Guard (SO-02)
    if (['finance', 'security'].includes(section) && req.user?.role !== UserRole.SuperAdmin) {
      res.status(403).json({
        error: {
          code: 'PD_FORBIDDEN',
          message: `Modifying ${section} settings requires SuperAdmin privileges`,
        },
      });
      return;
    }

    const parsedResult = settingsSectionSchemas[section].safeParse(req.body);
    if (!parsedResult.success) {
      res.status(400).json({
        error: {
          code: 'PD_VALIDATION_ERROR',
          message: 'Invalid settings payload',
          details: parsedResult.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
      return;
    }
    const parsed = parsedResult.data as Partial<Record<PlatformSettingKey, PlatformSettingValue>>;
    const expectedVersionHeader = req.header('if-match');
    const expectedVersion = expectedVersionHeader === undefined
      ? undefined
      : expectedVersionHeader.replace(/^W\//, '').replace(/^"|"$/g, '') === '0'
        ? null
        : expectedVersionHeader.replace(/^W\//, '').replace(/^"|"$/g, '');

    let updatedKeys: PlatformSettingKey[];
    try {
      updatedKeys = await platformConfigService.updateSectionSettings(
        section,
        parsed,
        req.user!.id,
        expectedVersion,
      );
    } catch (error) {
      if (error instanceof PdConflictError && error.code === PdErrorCode.SETTINGS_CONFLICT) {
        const latest = await platformConfigService.getGroupedSettings();
        res.status(409).json({
          error: {
            code: error.code,
            message: error.message,
            details: { ...error.details, current_version: latest.section_versions[section] },
          },
          ...latest,
        });
        return;
      }
      throw error;
    }

    logger.info(
      { admin_id: req.user!.id, section, keys: updatedKeys },
      'Admin updated platform settings section',
    );

    if (updatedKeys.some((key) => key.startsWith('maintenance_'))) {
      invalidateMaintenanceCache();
    }

    res.status(200).json({
      success: true,
      message: 'Settings section updated',
      section,
      updated_keys: updatedKeys,
      ...(await platformConfigService.getGroupedSettings()),
    });
  }),
);
export default router;