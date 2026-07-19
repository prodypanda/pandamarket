export interface MarketplaceSettings {
  marketplace_name?: string;
  marketplace_tagline?: string;
  marketplace_logo_url?: string;
  marketplace_logo_light_url?: string;
  marketplace_logo_dark_url?: string;
  marketplace_favicon_url?: string;
  marketplace_og_image_url?: string;
  marketplace_public_url?: string;
  marketplace_theme?: 'panda' | 'aliexpress' | 'aliexpress2';
  marketplace_primary_color?: string;
  marketplace_secondary_color?: string;
  marketplace_default_locale?: 'fr' | 'en' | 'ar';
  marketplace_supported_locales?: string;
  marketplace_rtl_enabled?: string | boolean;
  marketplace_support_email?: string;
  marketplace_support_phone?: string;
  marketplace_support_whatsapp?: string;
  marketplace_address?: string;
  marketplace_city?: string;
  marketplace_country?: string;
  marketplace_business_hours?: string;
  marketplace_facebook_url?: string;
  marketplace_instagram_url?: string;
  marketplace_x_url?: string;
  marketplace_tiktok_url?: string;
  marketplace_youtube_url?: string;
  marketplace_linkedin_url?: string;
  marketplace_whatsapp_url?: string;
  marketplace_telegram_url?: string;
  marketplace_pinterest_url?: string;
  marketplace_snapchat_url?: string;
  marketplace_help_url?: string;
  marketplace_terms_url?: string;
  marketplace_privacy_url?: string;
  marketplace_refund_url?: string;
  marketplace_cookie_policy_url?: string;
  marketplace_contact_url?: string;
  catalog_featured_category_slugs?: string;
  catalog_default_sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'title_asc' | string;
  hub_homepage_layout?: 'theme_default' | 'classic' | 'deals' | 'premium_deals' | string;
  hub_homepage_banner_title?: string;
  hub_homepage_banner_subtitle?: string;
  hub_homepage_banner_cta_label?: string;
  hub_homepage_banner_cta_url?: string;
  hub_homepage_banner_image_url?: string;
  analytics_ga4_enabled?: boolean;
  analytics_ga4_measurement_id?: string;
  analytics_gtm_enabled?: boolean;
  analytics_gtm_container_id?: string;
  analytics_meta_pixel_enabled?: boolean;
  analytics_meta_pixel_id?: string;
  search_console_verification?: string;
  reviews_enabled?: boolean;
  review_auto_publish?: boolean;
  wishlist_enabled?: boolean;
  ai_tools_enabled?: boolean;
  page_builder_enabled?: boolean;
  plugins_marketplace_enabled?: boolean;
  email_marketing_enabled?: boolean;
  default_currency?: string;
  maintenance_enabled?: string | boolean;
  maintenance_title?: string;
  maintenance_message?: string;
  maintenance_illustration_url?: string;
  maintenance_eta?: string;
  maintenance_block_storefronts?: string | boolean;
}

export const MARKETPLACE_SETTINGS_TAG = 'marketplace-settings';

export async function getMarketplaceSettings(): Promise<MarketplaceSettings> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/marketplace/settings`, {
      next: { revalidate: 30, tags: [MARKETPLACE_SETTINGS_TAG] },
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.data || {};
  } catch {
    return {};
  }
}

export function getMarketplacePublicUrl(settings?: Pick<MarketplaceSettings, 'marketplace_public_url'>): string {
  const candidates = [
    settings?.marketplace_public_url,
    process.env.NEXT_PUBLIC_HUB_URL,
    'https://pandamarket.tn',
  ];

  for (const candidate of candidates) {
    const normalized = normalizeHttpUrl(candidate);
    if (normalized) return normalized;
  }

  return 'https://pandamarket.tn';
}

function normalizeHttpUrl(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}
