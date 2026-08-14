/**
 * Hub Homepage Layout Capability Matrix (HC-01, AS-24)
 * Authoritative registry defining feature support across all marketplace homepage themes.
 */

export type MarketplaceThemeLayoutId = 'default' | 'classic' | 'deals' | 'premium_deals' | 'alibaba' | 'amazon';

export interface LayoutCapabilityDefinition {
  id: MarketplaceThemeLayoutId;
  name: string;
  badge: string;
  description: string;
  supportsHeroCarousel: boolean;
  supportsCarouselTransitions: boolean;
  supportsCustomSlides: boolean;
  supportsCategoryMegaMenu: boolean;
  supportsSellerRail: boolean;
  supportsCustomHomepageBlocks: boolean;
  supportsPromotionalBanner: boolean;
  supportsSponsoredAdsRail: boolean;
  supportsFlashDealsBar: boolean;
  supportedSettings: string[];
}

export const LAYOUT_CAPABILITY_MATRIX: Record<MarketplaceThemeLayoutId, LayoutCapabilityDefinition> = {
  default: {
    id: 'default',
    name: 'Theme Default',
    badge: 'Standard',
    description: 'Auto-adapts layout configuration to match the global active theme default.',
    supportsHeroCarousel: true,
    supportsCarouselTransitions: true,
    supportsCustomSlides: true,
    supportsCategoryMegaMenu: true,
    supportsSellerRail: true,
    supportsCustomHomepageBlocks: true,
    supportsPromotionalBanner: true,
    supportsSponsoredAdsRail: true,
    supportsFlashDealsBar: true,
    supportedSettings: [
      'hub_homepage_banner_enabled',
      'hub_homepage_banner_title',
      'hub_homepage_banner_subtitle',
      'hub_homepage_banner_cta_text',
      'hub_homepage_banner_cta_link',
      'hub_homepage_banner_image_url',
      'hub_hero_show_carousel',
      'hub_hero_carousel_autoplay',
      'hub_hero_carousel_interval',
      'hub_hero_carousel_transition',
      'hub_hero_carousel_show_arrows',
      'hub_hero_carousel_dots_style',
      'hub_hero_carousel_slides',
      'hub_homepage_blocks',
    ],
  },
  alibaba: {
    id: 'alibaba',
    name: 'Alibaba B2B',
    badge: 'Wholesale & RFQ',
    description: 'High-density multi-column mega menu, interactive hero carousel, and dedicated supplier sidebar.',
    supportsHeroCarousel: true,
    supportsCarouselTransitions: true,
    supportsCustomSlides: true,
    supportsCategoryMegaMenu: true,
    supportsSellerRail: true,
    supportsCustomHomepageBlocks: true,
    supportsPromotionalBanner: true,
    supportsSponsoredAdsRail: true,
    supportsFlashDealsBar: true,
    supportedSettings: [
      'hub_hero_show_carousel',
      'hub_hero_carousel_autoplay',
      'hub_hero_carousel_interval',
      'hub_hero_carousel_transition',
      'hub_hero_carousel_show_arrows',
      'hub_hero_carousel_dots_style',
      'hub_hero_carousel_slides',
      'hub_hero_carousel_max_categories',
      'hub_hero_carousel_source_mode',
      'hub_hero_show_seller_rail',
      'hub_hero_seller_rail_title',
      'hub_hero_seller_rail_badge_text',
      'hub_hero_seller_rail_primary_cta_text',
      'hub_hero_seller_rail_primary_cta_link',
      'hub_hero_seller_rail_secondary_cta_text',
      'hub_hero_seller_rail_secondary_cta_link',
      'hub_homepage_banner_enabled',
      'hub_homepage_banner_title',
      'hub_homepage_banner_subtitle',
      'hub_homepage_banner_cta_text',
      'hub_homepage_banner_cta_link',
      'hub_homepage_banner_image_url',
      'hub_homepage_blocks',
    ],
  },
  classic: {
    id: 'classic',
    name: 'Classic Marketplace',
    badge: 'Standard E-Commerce',
    description: 'Hero promotional banner, category pill navigation, and structured product grids.',
    supportsHeroCarousel: false,
    supportsCarouselTransitions: false,
    supportsCustomSlides: false,
    supportsCategoryMegaMenu: true,
    supportsSellerRail: false,
    supportsCustomHomepageBlocks: true,
    supportsPromotionalBanner: true,
    supportsSponsoredAdsRail: true,
    supportsFlashDealsBar: false,
    supportedSettings: [
      'hub_homepage_banner_enabled',
      'hub_homepage_banner_title',
      'hub_homepage_banner_subtitle',
      'hub_homepage_banner_cta_text',
      'hub_homepage_banner_cta_link',
      'hub_homepage_banner_image_url',
      'hub_homepage_blocks',
    ],
  },
  deals: {
    id: 'deals',
    name: 'Deals & Clearance (AliExpress)',
    badge: 'Flash Deals & Discounts',
    description: 'High-energy discount cards, countdown deals, and automated product carousels.',
    supportsHeroCarousel: true,
    supportsCarouselTransitions: false,
    supportsCustomSlides: false,
    supportsCategoryMegaMenu: false,
    supportsSellerRail: false,
    supportsCustomHomepageBlocks: true,
    supportsPromotionalBanner: true,
    supportsSponsoredAdsRail: true,
    supportsFlashDealsBar: true,
    supportedSettings: [
      'hub_homepage_banner_enabled',
      'hub_homepage_banner_title',
      'hub_homepage_banner_subtitle',
      'hub_homepage_banner_cta_text',
      'hub_homepage_banner_cta_link',
      'hub_homepage_banner_image_url',
      'hub_homepage_blocks',
    ],
  },
  premium_deals: {
    id: 'premium_deals',
    name: 'Premium Deals (AliExpress 2)',
    badge: 'Modern Curated Deals',
    description: 'Modern glassmorphism cards, curated top picks, and dynamic product grids.',
    supportsHeroCarousel: true,
    supportsCarouselTransitions: false,
    supportsCustomSlides: false,
    supportsCategoryMegaMenu: false,
    supportsSellerRail: false,
    supportsCustomHomepageBlocks: true,
    supportsPromotionalBanner: true,
    supportsSponsoredAdsRail: true,
    supportsFlashDealsBar: true,
    supportedSettings: [
      'hub_homepage_banner_enabled',
      'hub_homepage_banner_title',
      'hub_homepage_banner_subtitle',
      'hub_homepage_banner_cta_text',
      'hub_homepage_banner_cta_link',
      'hub_homepage_banner_image_url',
      'hub_homepage_blocks',
    ],
  },
  amazon: {
    id: 'amazon',
    name: 'Amazon Classic',
    badge: 'Department Grid',
    description: 'Multi-category bento boxes, persistent search navigation, and deal rows.',
    supportsHeroCarousel: true,
    supportsCarouselTransitions: false,
    supportsCustomSlides: false,
    supportsCategoryMegaMenu: true,
    supportsSellerRail: false,
    supportsCustomHomepageBlocks: true,
    supportsPromotionalBanner: true,
    supportsSponsoredAdsRail: true,
    supportsFlashDealsBar: true,
    supportedSettings: [
      'hub_homepage_banner_enabled',
      'hub_homepage_banner_title',
      'hub_homepage_banner_subtitle',
      'hub_homepage_banner_cta_text',
      'hub_homepage_banner_cta_link',
      'hub_homepage_banner_image_url',
      'hub_homepage_blocks',
    ],
  },
};

/**
 * Checks if a specific setting key is supported in the target layout
 */
export function isSettingSupportedByLayout(settingKey: string, layoutId: MarketplaceThemeLayoutId): boolean {
  const layout = LAYOUT_CAPABILITY_MATRIX[layoutId] || LAYOUT_CAPABILITY_MATRIX.default;
  return layout.supportedSettings.includes(settingKey);
}

/**
 * Returns list of layouts that support a given setting
 */
export function getSupportingLayoutsForSetting(settingKey: string): MarketplaceThemeLayoutId[] {
  return (Object.keys(LAYOUT_CAPABILITY_MATRIX) as MarketplaceThemeLayoutId[]).filter((layoutId) =>
    LAYOUT_CAPABILITY_MATRIX[layoutId].supportedSettings.includes(settingKey)
  );
}
