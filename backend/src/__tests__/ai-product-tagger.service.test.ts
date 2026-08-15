/**
 * AI Product Auto-Tagger Service Test Suite
 *
 * Feature Covered:
 *   - Feature 20 / Requirement R3: AI Product Auto-Tagging & BullMQ Queue Integration
 *     - Gemini Pro structured prompt parsing
 *     - Fallback keyword extraction heuristic
 *     - Product tagging lifecycle & database persistence
 *     - Untagged product sweep & diagnostic health monitor
 *     - BullMQ async queueing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  aiProductTaggerService,
  AiProductTaggerService,
} from '../services/ai-product-tagger.service';
import { aiConfigService } from '../services/ai-config.service';
import { aiQueue } from '../queues/ai-queue';
import { query } from '../db/pool';

vi.mock('../db/pool', () => ({
  query: vi.fn(),
}));

vi.mock('../queues/ai-queue', () => ({
  aiQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job_test_123' }),
  },
}));

vi.mock('../services/ai-config.service', () => ({
  aiConfigService: {
    generateTextForPurpose: vi.fn(),
  },
}));

describe('AiProductTaggerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractTags', () => {
    it('returns empty tags for empty product title', async () => {
      const result = await aiProductTaggerService.extractTags({ title: '' });
      expect(result.tags).toEqual([]);
      expect(result.source).toBe('fallback');
    });

    it('extracts fallback tags when Gemini is unavailable or throws', async () => {
      vi.mocked(aiConfigService.generateTextForPurpose).mockRejectedValueOnce(
        new Error('API key missing or rate limited')
      );

      const result = await aiProductTaggerService.extractTags({
        title: 'Robot Arduino Uno Starter Kit Électronique',
        category: 'Robotique',
        description: 'Kit complet avec capteurs et servomoteurs pour débutants',
      });

      expect(result.source).toBe('fallback');
      expect(result.tags.length).toBeGreaterThanOrEqual(4);
      expect(result.tags).toContain('arduino');
      expect(result.tags).toContain('robot');
    });

    it('parses valid JSON response from Gemini Pro', async () => {
      vi.mocked(aiConfigService.generateTextForPurpose).mockResolvedValueOnce({
        text: JSON.stringify({
          tags: ['arduino', 'microcontroller', 'electronique', 'diy', 'robotique', 'capteurs'],
        }),
      } as any);

      const result = await aiProductTaggerService.extractTags({
        title: 'Arduino Mega 2560 R3',
        category: 'Microcontrôleurs',
      });

      expect(result.source).toBe('gemini-pro');
      expect(result.tags).toEqual([
        'arduino',
        'microcontroller',
        'electronique',
        'diy',
        'robotique',
        'capteurs',
      ]);
    });

    it('handles markdown code block wrapped JSON from Gemini', async () => {
      vi.mocked(aiConfigService.generateTextForPurpose).mockResolvedValueOnce({
        text: '```json\n{\n  "tags": ["poterie", "ceramique", "fait-main", "artisanat-tunisien", "decoration"]\n}\n```',
      } as any);

      const result = await aiProductTaggerService.extractTags({
        title: 'Vase en céramique peint à la main',
        category: 'Artisanat',
      });

      expect(result.source).toBe('gemini-pro');
      expect(result.tags).toContain('poterie');
      expect(result.tags).toContain('fait-main');
    });

    it('supplements fallback tags if Gemini returns fewer than 4 tags', async () => {
      vi.mocked(aiConfigService.generateTextForPurpose).mockResolvedValueOnce({
        text: JSON.stringify({ tags: ['arduino'] }),
      } as any);

      const result = await aiProductTaggerService.extractTags({
        title: 'Module Bluetooth HC-05 Sans Fil',
        category: 'Communication',
        description: 'Module émetteur récepteur série pour projets électroniques',
      });

      expect(result.source).toBe('gemini-pro');
      expect(result.tags.length).toBeGreaterThanOrEqual(4);
      expect(result.tags).toContain('arduino');
    });
  });

  describe('tagProduct', () => {
    it('throws error if product is not found in database', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any);

      await expect(aiProductTaggerService.tagProduct('non_existent_id')).rejects.toThrow(
        'Product not found for tagging'
      );
    });

    it('skips tagging if product already has >= 4 tags and is synced, unless force=true', async () => {
      const existingDate = new Date('2026-08-14T12:00:00Z');
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          {
            id: 'prod_123',
            store_id: 'str_1',
            title: 'Raspberry Pi 4',
            category: 'Mini PC',
            description: 'Carte mère Linux',
            interest_tags: ['raspberry-pi', 'linux', 'arm', 'mini-pc'],
            interest_tags_synced_at: existingDate,
            attributes: null,
          },
        ],
      } as any);

      const result = await aiProductTaggerService.tagProduct('prod_123');

      expect(result.productId).toBe('prod_123');
      expect(result.tags).toEqual(['raspberry-pi', 'linux', 'arm', 'mini-pc']);
      expect(result.syncedAt).toEqual(existingDate);
      expect(query).toHaveBeenCalledTimes(1); // Only SELECT, no UPDATE
    });

    it('tags product and saves to database when untagged or forced', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'prod_456',
              store_id: 'str_2',
              title: 'Drone Quadcopter FPV Brushless',
              category: 'Aéromodélisme',
              description: 'Drone de course haute vitesse',
              interest_tags: [],
              interest_tags_synced_at: null,
              attributes: null,
            },
          ],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // UPDATE query

      vi.mocked(aiConfigService.generateTextForPurpose).mockResolvedValueOnce({
        text: JSON.stringify({
          tags: ['drone', 'fpv', 'quadcopter', 'brushless', 'aeromodelisme', 'racing'],
        }),
      } as any);

      const result = await aiProductTaggerService.tagProduct('prod_456');

      expect(result.productId).toBe('prod_456');
      expect(result.tags).toContain('drone');
      expect(result.tags).toContain('fpv');
      expect(query).toHaveBeenCalledTimes(2);
      expect(vi.mocked(query).mock.calls[1][0]).toContain('UPDATE pd_product');
    });
  });

  describe('queueProductTagging', () => {
    it('enqueues job to aiQueue pd_ai_queue', async () => {
      await aiProductTaggerService.queueProductTagging('prod_789', 'str_3');

      expect(aiQueue.add).toHaveBeenCalledWith(
        'product_tagging',
        expect.objectContaining({
          type: 'product_tagging',
          product_id: 'prod_789',
          store_id: 'str_3',
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        })
      );
    });
  });

  describe('sweepUntaggedProducts', () => {
    it('scans and tags untagged products in batches', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [
            { id: 'p1', store_id: 's1' },
            { id: 'p2', store_id: 's2' },
          ],
        } as any) // SELECT untagged
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'p1',
              store_id: 's1',
              title: 'Product 1',
              category: 'Cat 1',
              description: '',
              interest_tags: [],
              interest_tags_synced_at: null,
              attributes: null,
            },
          ],
        } as any) // p1 select
        .mockResolvedValueOnce({ rows: [] } as any) // p1 update
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'p2',
              store_id: 's2',
              title: 'Product 2',
              category: 'Cat 2',
              description: '',
              interest_tags: [],
              interest_tags_synced_at: null,
              attributes: null,
            },
          ],
        } as any) // p2 select
        .mockResolvedValueOnce({ rows: [] } as any); // p2 update

      vi.mocked(aiConfigService.generateTextForPurpose).mockRejectedValue(new Error('no ai'));

      const result = await aiProductTaggerService.sweepUntaggedProducts(10);

      expect(result.totalScanned).toBe(2);
      expect(result.tagged).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.fallbackUsed).toBe(2);
    });
  });

  describe('getTaggingHealth', () => {
    it('calculates coverage percentage and healthy/degraded status', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ count: '100' }] } as any) // total published
        .mockResolvedValueOnce({ rows: [{ count: '85' }] } as any) // tagged published (85%)
        .mockResolvedValueOnce({
          rows: [
            { tag: 'electronique', count: '45' },
            { tag: 'arduino', count: '30' },
          ],
        } as any); // top tags

      const health = await aiProductTaggerService.getTaggingHealth();

      expect(health.status).toBe('healthy');
      expect(health.totalProducts).toBe(100);
      expect(health.taggedProducts).toBe(85);
      expect(health.tagCoveragePct).toBe(85);
      expect(health.topTags).toEqual([
        { tag: 'electronique', count: 45 },
        { tag: 'arduino', count: 30 },
      ]);
    });

    it('returns degraded status when coverage is below 80%', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ count: '100' }] } as any) // total published
        .mockResolvedValueOnce({ rows: [{ count: '50' }] } as any) // tagged published (50%)
        .mockResolvedValueOnce({ rows: [] } as any); // top tags

      const health = await aiProductTaggerService.getTaggingHealth();

      expect(health.status).toBe('degraded');
      expect(health.tagCoveragePct).toBe(50);
    });
  });
});
