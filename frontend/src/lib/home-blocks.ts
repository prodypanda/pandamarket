/**
 * Homepage block configuration for the admin-configurable hub templates
 * (Alibaba B2B and Amazon classic).
 *
 * The super admin dashboard stores a JSON document in the
 * `hub_homepage_blocks` platform setting:
 *
 * {
 *   "alibaba": [{ "id": "deals", "enabled": true, "title": "...", "limit": 6 }, ...],
 *   "amazon":  [{ "id": "lightning_deals", ... }, ...]
 * }
 *
 * Array order defines the render order of the reorderable (non-fixed)
 * sections. An empty/absent setting renders the built-in defaults, so the
 * feature is fully backward compatible.
 */

export type HomeTemplateId = 'alibaba' | 'amazon';

export interface HomeBlockDefinition {
  id: string;
  label: string;
  description: string;
  /** Fixed blocks keep their position in the layout and cannot be reordered. */
  fixed?: boolean;
  supportsTitle?: boolean;
  supportsLimit?: boolean;
  defaultTitle?: string;
  defaultLimit?: number;
  maxLimit?: number;
}

export interface HomeBlockConfig {
  id: string;
  enabled: boolean;
  title?: string;
  limit?: number;
}

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
      description: 'Mega category sidebar, admin banner carousel, top sellers and RFQ rail.',
      fixed: true,
    },
    {
      id: 'deals',
      label: "Today's deals",
      description: 'Daily deals grid with a live countdown.',
      supportsTitle: true,
      supportsLimit: true,
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
      description: 'Hero carousel with the overlapping category cards row.',
      fixed: true,
    },
    {
      id: 'lightning_deals',
      label: 'Lightning deals',
      description: 'Horizontal deals rail with a live countdown.',
      supportsTitle: true,
      supportsLimit: true,
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
};

export function getDefaultHomeBlocks(template: HomeTemplateId): HomeBlockConfig[] {
  return HOME_TEMPLATE_BLOCKS[template].map((def) => sanitizeBlock(def, undefined));
}

function sanitizeBlock(def: HomeBlockDefinition, raw: unknown): HomeBlockConfig {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const block: HomeBlockConfig = {
    id: def.id,
    enabled: record.enabled !== false,
  };

  if (def.supportsTitle) {
    const rawTitle = typeof record.title === 'string' ? record.title.trim().slice(0, 120) : '';
    block.title = rawTitle || def.defaultTitle;
  }

  if (def.supportsLimit) {
    const rawLimit = Number(record.limit);
    block.limit = Number.isInteger(rawLimit) && rawLimit >= 1
      ? Math.min(rawLimit, def.maxLimit || 24)
      : def.defaultLimit;
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
