import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn(async (cb: any) => {
    const mockClient = {
      query: vi.fn().mockImplementation(async (sql: any) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO pd_store_menu')) {
          return { rows: [{ id: 'menu_hdr_1' }], rowCount: 1 };
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO pd_store_footer')) {
          return { rows: [{ id: 'ftr_1' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }),
    };
    return cb(mockClient);
  }),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn((prefix: string) => `pd_${prefix}_test123`),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  childLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { query } from '../db/pool';
import { menuService } from '../services/menu.service';

const mockedQuery = vi.mocked(query);

describe('MenuService — Store Menus and Footer Schema (GAP-P1-013)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Draft Navigation & Items', () => {
    it('saves draft navigation with hierarchical menu items', async () => {
      const draftData = {
        menus: [
          {
            location: 'header' as const,
            items: [
              {
                type: 'custom_url' as const,
                url: '/promo',
                localized_label: 'Promotions',
                sort_order: 0,
                children: [
                  {
                    type: 'custom_url' as const,
                    url: '/promo/summer',
                    localized_label: 'Summer Sale',
                    sort_order: 0,
                  },
                ],
              },
            ],
          },
        ],
      };

      // Mock getDraftNavigation DB response after update
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'menu_hdr_1',
            location: 'header',
            is_published: false,
            draft_revision: draftData.menus[0],
            published_revision: {},
          },
        ],
        rowCount: 1,
      } as any);

      // Mock getMenuItems DB response
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'item_1',
            parent_id: null,
            type: 'custom_url',
            url: '/promo',
            localized_label: { fr: 'Promotions', en: 'Promotions' },
            sort_order: 0,
            is_active: true,
          },
          {
            id: 'item_2',
            parent_id: 'item_1',
            type: 'custom_url',
            url: '/promo/summer',
            localized_label: { fr: 'Summer Sale', en: 'Summer Sale' },
            sort_order: 0,
            is_active: true,
          },
        ],
        rowCount: 2,
      } as any);

      const result = await menuService.updateDraftNavigation('store_123', draftData);

      expect(result.menus).toHaveLength(1);
      expect(result.menus[0].location).toBe('header');
      expect(result.menus[0].items).toHaveLength(1);
      expect(result.menus[0].items[0].children).toHaveLength(1);
      expect(result.menus[0].items[0].children[0].url).toBe('/promo/summer');
    });
  });

  describe('Draft Footer & Blocks', () => {
    it('saves draft footer blocks', async () => {
      const draftFooter = {
        blocks: [
          {
            type: 'contact' as const,
            title: 'Contact Us',
            content: { phone: '+21698765432', email: 'support@store.com' },
            sort_order: 0,
          },
        ],
      };

      // Mock getDraftFooter footer row
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'ftr_1',
            is_published: false,
            draft_revision: draftFooter,
            published_revision: {},
          },
        ],
        rowCount: 1,
      } as any);

      // Mock getDraftFooter blocks
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'ftrblk_1',
            type: 'contact',
            title: 'Contact Us',
            content: { phone: '+21698765432', email: 'support@store.com' },
            sort_order: 0,
          },
        ],
        rowCount: 1,
      } as any);

      const result = await menuService.updateDraftFooter('store_123', draftFooter);

      expect(result.footer?.id).toBe('ftr_1');
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('contact');
      expect(result.blocks[0].content).toEqual({ phone: '+21698765432', email: 'support@store.com' });
    });
  });

  describe('Publishing Content', () => {
    it('copies draft revisions to published revisions and sets is_published = true', async () => {
      const result = await menuService.publishContent('store_123');

      expect(result.success).toBe(true);
      expect(result.store_id).toBe('store_123');
    });
  });

  describe('Public Storefront Navigation', () => {
    it('returns published navigation menus and footer blocks', async () => {
      // 1. Published menus query
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'menu_hdr_1',
            location: 'header',
            published_revision: { location: 'header' },
          },
        ],
        rowCount: 1,
      } as any);

      // 2. Menu items query
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'item_pub_1',
            parent_id: null,
            type: 'category',
            reference_id: 'cat_electronics',
            url: '/categories/electronics',
            localized_label: { fr: 'Électronique' },
            sort_order: 0,
            is_active: true,
          },
        ],
        rowCount: 1,
      } as any);

      // 3. Published footer query
      mockedQuery.mockResolvedValueOnce({
        rows: [{ id: 'ftr_pub_1', published_revision: {} }],
        rowCount: 1,
      } as any);

      // 4. Footer blocks query
      mockedQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'blk_1',
            type: 'social',
            title: 'Suivez-nous',
            content: { facebook: 'https://facebook.com/store' },
            sort_order: 0,
          },
        ],
        rowCount: 1,
      } as any);

      const pubNav = await menuService.getPublicNavigation('store_123');

      expect(pubNav.menus).toHaveLength(1);
      expect(pubNav.menus[0].location).toBe('header');
      expect(pubNav.menus[0].items[0].reference_id).toBe('cat_electronics');
      expect(pubNav.footer?.id).toBe('ftr_pub_1');
      expect(pubNav.footer?.blocks).toHaveLength(1);
      expect(pubNav.footer?.blocks[0].type).toBe('social');
    });
  });
});
