/**
 * Homepage block configuration for the admin-configurable hub templates
 * (Alibaba B2B, Amazon classic, AliExpress deals and the classic hub).
 *
 * The super admin dashboard stores a JSON document in the
 * `hub_homepage_blocks` platform setting:
 *
 * {
 *   "alibaba":    [{ "id": "deals", "enabled": true, "title": "...", "limit": 6,
 *                    "image_url": "...", "cta_label": "...", "cta_url": "..." }, ...],
 *   "amazon":     [{ "id": "hero", "slides": [{ "title": "...", "image_url": "..." }] }, ...],
 *   "aliexpress": [...],
 *   "classic":    [...]
 * }
 *
 * Array order defines the render order of the reorderable (non-fixed)
 * sections. An empty/absent setting renders the built-in defaults, so the
 * feature is fully backward compatible.
 */

export type HomeTemplateId = 'alibaba' | 'amazon' | 'aliexpress' | 'classic';

export interface HomeHeroSlide {
  title: string;
  subtitle?: string;
  image_url?: string;
  cta_label?: string;
  cta_url?: string;
}

export interface HomeBlockDefinition {
  id: string;
  label: string;
  description: string;
  /** Fixed blocks keep their position in the layout and cannot be reordered. */
  fixed?: boolean;
  supportsTitle?: boolean;
  supportsLimit?: boolean;
  /** Optional banner image rendered above the section content. */
  supportsImage?: boolean;
  /** Optional CTA label/URL (used by the banner image or the section link). */
  supportsCta?: boolean;
  /** Multi-slide hero manager (admin-defined slides override the fallback). */
  supportsSlides?: boolean;
  maxSlides?: number;
  defaultTitle?: string;
  defaultLimit?: number;
  maxLimit?: number;
}

export interface HomeBlockConfig {
  id: string;
  enabled: boolean;
  title?: string;
  limit?: number;
  image_url?: string;
  cta_label?: string;
  cta_url?: string;
  slides?: HomeHeroSlide[];
}

const MAX_URL_LENGTH = 2048;
const DEFAULT_MAX_SLIDES = 6;

export const HOME_TEMPLATE_BLOCKS: Record<HomeTemplateId, HomeBlockDefinition[]> = {
  alibaba: [
    {
      id: 'utility_bar',
      label: 'Utility bar',
      description: 'Top navy bar with trade assurance text, support email and quick links.',
      fixed: true,
    },
    {
      id: 'hero',
      label: 'Hero — categories, carousel & seller rail',
      description: 'Mega category sidebar, hero carousel, top sellers and RFQ rail. Add slides to fully control the carousel.',
      fixed: true,
      supportsSlides: true,
      maxSlides: 6,
    },
    {
      id: 'deals',
      label: "Today's deals",
      description: 'Daily deals grid with a live countdown.',
      supportsTitle: true,
      supportsLimit: true,
      supportsImage: true,
      supportsCta: true,
      defaultTitle: "Today's deals",
      defaultLimit: 6,
      maxLimit: 12,
    },
    {
      id: 'sponsored_brands',
      label: 'Sponsored brands',
      description: 'Highlighted seller brand cards.',
      supportsTitle: true,
      supportsLimit: true,
      supportsImage: true,
      supportsCta: true,
      defaultTitle: 'Sponsored brands',
      defaultLimit: 4,
      maxLimit: 8,
    },
    {
      id: 'product_grid',
      label: 'Product grid',
      description: 'Main trending products grid.',
      supportsTitle: true,
      supportsLimit: true,
      supportsImage: true,
      supportsCta: true,
      defaultTitle: 'Just for you',
      defaultLimit: 12,
      maxLimit: 24,
    },
    {
      id: 'recently_viewed',
      label: 'Recently viewed',
      description: 'Products the visitor recently opened (stored in their browser).',
    },
    {
      id: 'footer_links',
      label: 'Footer link columns',
      description: 'Buy with confidence, sell, logistics and legal link columns.',
      fixed: true,
    },
  ],
  amazon: [
    {
      id: 'utility_bar',
      label: 'Utility bar',
      description: 'Top dark bar with delivery promise and quick links.',
      fixed: true,
    },
    {
      id: 'category_strip',
      label: 'Category strip',
      description: 'Horizontal department strip with hover preview panels.',
      fixed: true,
      supportsLimit: true,
      defaultLimit: 10,
      maxLimit: 20,
    },
    {
      id: 'hero',
      label: 'Hero + overlapping category cards',
      description: 'Hero carousel with the overlapping category cards row. Add slides to fully control the carousel.',
      fixed: true,
      supportsSlides: true,
      maxSlides: 6,
    },
    {
      id: 'lightning_deals',
      label: 'Lightning deals',
      description: 'Horizontal deals rail with a live countdown.',
      supportsTitle: true,
      supportsLimit: true,
      supportsImage: true,
      supportsCta: true,
      defaultTitle: 'Lightning deals',
      defaultLimit: 8,
      maxLimit: 16,
    },
    {
      id: 'top_sellers',
      label: 'Top sellers',
      description: 'Rail of the most active marketplace sellers.',
      supportsTitle: true,
      supportsLimit: true,
      defaultTitle: 'Top sellers',
      defaultLimit: 8,
      maxLimit: 12,
    },
    {
      id: 'sponsored_brands',
      label: 'Sponsored brands',
      description: 'Highlighted seller brand cards.',
      supportsTitle: true,
      supportsLimit: true,
      supportsImage: true,
      supportsCta: true,
      defaultTitle: 'Sponsored brands',
      defaultLimit: 3,
      maxLimit: 6,
    },
    {
      id: 'recently_viewed',
      label: 'Recently viewed',
      description: 'Products the visitor recently opened (stored in their browser).',
    },
    {
      id: 'footer_links',
      label: 'Footer link columns',
      description: 'Back-to-top bar and the dark footer link columns.',
      fixed: true,
    },
  ],
  aliexpress: [
    {
      id: 'promo_bar',
      label: 'Promo bar',
      description: 'Top gradient strip with the mega deals message and explore link.',
      fixed: true,
    },
    {
      id: 'hero',
      label: 'Hero — categories, banner & service cards',
      description: 'Category sidebar, main banner and service/trust cards. Add slides to rotate the banner.',
      fixed: true,
      supportsSlides: true,
      maxSlides: 6,
    },
    {
      id: 'flash_deals',
      label: 'Flash deals',
      description: 'Flash deals grid.',
      supportsTitle: true,
      supportsLimit: true,
      supportsImage: true,
      supportsCta: true,
      defaultTitle: 'Flash Deals',
      defaultLimit: 6,
      maxLimit: 12,
    },
    {
      id: 'category_tiles',
      label: 'Category tiles',
      description: 'Grid of featured category tiles.',
      supportsLimit: true,
      defaultLimit: 8,
      maxLimit: 16,
    },
    {
      id: 'recommended',
      label: 'Recommended products',
      description: 'The "Just for you" recommended products grid.',
      supportsTitle: true,
      supportsLimit: true,
      supportsImage: true,
      supportsCta: true,
      defaultTitle: 'Recommended Products',
      defaultLimit: 10,
      maxLimit: 20,
    },
    {
      id: 'recently_viewed',
      label: 'Recently viewed',
      description: 'Products the visitor recently opened (stored in their browser).',
    },
  ],
  classic: [
    {
      id: 'hero',
      label: 'Hero — departments, banner & top picks',
      description: 'Departments sidebar, main banner and top-pick product rail. Add slides to rotate the banner.',
      fixed: true,
      supportsSlides: true,
      maxSlides: 6,
    },
    {
      id: 'value_props',
      label: 'Service badges',
      description: 'Delivery, payment, verified stores and support badges under the hero.',
      fixed: true,
    },
    {
      id: 'features',
      label: 'Feature cards',
      description: 'Three marketplace value proposition cards.',
    },
    {
      id: 'categories',
      label: 'Categories grid',
      description: 'Featured marketplace categories grid.',
      supportsLimit: true,
      defaultLimit: 8,
      maxLimit: 12,
    },
    {
      id: 'deals_spotlight',
      label: 'Deals spotlight',
      description: 'Daily deals gradient card with trending products.',
      supportsTitle: true,
      supportsLimit: true,
      defaultTitle: 'Daily marketplace deals',
      defaultLimit: 4,
      maxLimit: 8,
    },
    {
      id: 'trending',
      label: 'Trending products',
      description: 'Main trending products section.',
      supportsTitle: true,
    },
    {
      id: 'category_showcase',
      label: 'Category showcase',
      description: 'Large category showcase cards.',
      supportsLimit: true,
      defaultLimit: 3,
      maxLimit: 6,
    },
    {
      id: 'cta_banner',
      label: 'Seller CTA banner',
      description: 'Bottom "open your store" call-to-action banner.',
      supportsTitle: true,
      supportsImage: true,
      supportsCta: true,
      defaultTitle: 'Open your store',
    },
    {
      id: 'recently_viewed',
      label: 'Recently viewed',
      description: 'Products the visitor recently opened (stored in their browser).',
    },
  ],
};

export function getDefaultHomeBlocks(template: HomeTemplateId): HomeBlockConfig[] {
  return HOME_TEMPLATE_BLOCKS[template].map((def) => sanitizeBlock(def, undefined));
}

function sanitizeText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sanitizeSlide(raw: unknown): HomeHeroSlide | null {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const title = sanitizeText(record.title, 160);
  if (!title) return null;
  return {
    title,
    subtitle: sanitizeText(record.subtitle, 320),
    image_url: sanitizeText(record.image_url, MAX_URL_LENGTH),
    cta_label: sanitizeText(record.cta_label, 80),
    cta_url: sanitizeText(record.cta_url, MAX_URL_LENGTH),
  };
}

function sanitizeBlock(def: HomeBlockDefinition, raw: unknown): HomeBlockConfig {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const block: HomeBlockConfig = {
    id: def.id,
    enabled: record.enabled !== false,
  };

  if (def.supportsTitle) {
    const rawTitle = sanitizeText(record.title, 120);
    block.title = rawTitle || def.defaultTitle;
  }

  if (def.supportsLimit) {
    const rawLimit = Number(record.limit);
    block.limit = Number.isInteger(rawLimit) && rawLimit >= 1
      ? Math.min(rawLimit, def.maxLimit || 24)
      : def.defaultLimit;
  }

  if (def.supportsImage) {
    block.image_url = sanitizeText(record.image_url, MAX_URL_LENGTH);
  }

  if (def.supportsCta) {
    block.cta_label = sanitizeText(record.cta_label, 80);
    block.cta_url = sanitizeText(record.cta_url, MAX_URL_LENGTH);
  }

  if (def.supportsSlides) {
    const rawSlides = Array.isArray(record.slides) ? record.slides : [];
    block.slides = rawSlides
      .slice(0, def.maxSlides || DEFAULT_MAX_SLIDES)
      .map(sanitizeSlide)
      .filter((slide): slide is HomeHeroSlide => slide !== null);
  }

  return block;
}

/**
 * Parses the raw `hub_homepage_blocks` setting and returns a sanitized,
 * ordered block list for the given template. Unknown blocks are dropped,
 * missing blocks are appended in their default position, and every value is
 * clamped to safe bounds. Invalid JSON falls back to the defaults.
 */
export function resolveHomeBlocks(raw: string | null | undefined, template: HomeTemplateId): HomeBlockConfig[] {
  const defs = HOME_TEMPLATE_BLOCKS[template];
  const defById = new Map(defs.map((def) => [def.id, def]));

  let savedList: unknown;
  if (raw && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      savedList = parsed && typeof parsed === 'object' ? parsed[template] : undefined;
    } catch {
      savedList = undefined;
    }
  }

  const savedById = new Map<string, unknown>();
  const savedOrder: string[] = [];
  if (Array.isArray(savedList)) {
    for (const entry of savedList) {
      const id = entry && typeof entry === 'object' ? (entry as Record<string, unknown>).id : undefined;
      if (typeof id === 'string' && defById.has(id) && !savedById.has(id)) {
        savedById.set(id, entry);
        savedOrder.push(id);
      }
    }
  }

  const orderedIds = [
    ...savedOrder,
    ...defs.map((def) => def.id).filter((id) => !savedById.has(id)),
  ];

  return orderedIds.map((id) => sanitizeBlock(defById.get(id) as HomeBlockDefinition, savedById.get(id)));
}

export function serializeHomepageBlocksSetting(config: Record<HomeTemplateId, HomeBlockConfig[]>): string {
  return JSON.stringify(config);
}
