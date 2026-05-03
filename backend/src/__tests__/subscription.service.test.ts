/**
 * Unit tests for SubscriptionService.
 * Tests plan listing, limits, upgrade/downgrade logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/pool', () => ({
  query: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../utils/plans', () => ({
  isUnlimited: vi.fn((val: number) => val === -1),
  PLAN_RANK: {
    free: 0,
    starter: 1,
    regular: 2,
    agency: 3,
    pro: 4,
    golden: 5,
    platinum: 6,
  },
}));

import { query } from '../db/pool';
import { SubscriptionService } from '../services/subscription.service';

const mockQuery = vi.mocked(query);

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionService = new SubscriptionService();
    subscriptionService.invalidateCache();
  });

  describe('listAll', () => {
    it('should return all plans sorted by price', async () => {
      const mockPlans = [
        { plan_id: 'free', max_products: 10, commission_rate: '15.00', yearly_price: '0.00', max_images_per_product: 2, has_ai_seo: false, has_image_compression: false, has_custom_domain: false, has_page_builder: false, has_direct_payment: false, has_white_label: false, ai_tokens_included: 0 },
        { plan_id: 'starter', max_products: 50, commission_rate: '0.00', yearly_price: '300.00', max_images_per_product: 5, has_ai_seo: true, has_image_compression: true, has_custom_domain: true, has_page_builder: false, has_direct_payment: false, has_white_label: false, ai_tokens_included: 50 },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockPlans,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const plans = await subscriptionService.listAll();

      expect(plans).toHaveLength(2);
      expect(plans[0].plan_id).toBe('free');
      expect(plans[0].commission_rate).toBe(15);
      expect(plans[0].yearly_price).toBe(0);
      expect(plans[1].plan_id).toBe('starter');
      expect(plans[1].commission_rate).toBe(0);
      expect(plans[1].yearly_price).toBe(300);
    });
  });

  describe('getLimits', () => {
    it('should return limits for a valid plan', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          plan_id: 'pro',
          max_products: -1,
          max_images_per_product: 15,
          has_ai_seo: true,
          has_image_compression: true,
          has_custom_domain: true,
          has_page_builder: true,
          has_direct_payment: true,
          has_white_label: false,
          commission_rate: '0.00',
          ai_tokens_included: -1,
          yearly_price: '2400.00',
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const limits = await subscriptionService.getLimits('pro' as any);

      expect(limits.max_products).toBe(-1);
      expect(limits.has_direct_payment).toBe(true);
      expect(limits.commission_rate).toBe(0);
    });

    it('should throw for non-existent plan', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(subscriptionService.getLimits('nonexistent' as any)).rejects.toThrow(
        'Plan nonexistent not found',
      );
    });

    it('should cache plan limits after first fetch', async () => {
      const mockPlan = {
        plan_id: 'starter',
        max_products: 50,
        max_images_per_product: 5,
        has_ai_seo: true,
        has_image_compression: true,
        has_custom_domain: true,
        has_page_builder: false,
        has_direct_payment: false,
        has_white_label: false,
        commission_rate: '0.00',
        ai_tokens_included: 50,
        yearly_price: '300.00',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockPlan],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await subscriptionService.getLimits('starter' as any);
      await subscriptionService.getLimits('starter' as any);

      // Should only query once due to caching
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('changePlan', () => {
    it('should reject changing to the same plan', async () => {
      await expect(
        subscriptionService.changePlan('store-1', 'starter' as any, 'starter' as any),
      ).rejects.toThrow('Already on this plan');
    });

    it('should allow upgrade without product count check', async () => {
      // Update store
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        subscriptionService.changePlan('store-1', 'free' as any, 'starter' as any),
      ).resolves.not.toThrow();
    });

    it('should block downgrade when product count exceeds new limit', async () => {
      // getLimits for new plan
      mockQuery.mockResolvedValueOnce({
        rows: [{
          plan_id: 'free',
          max_products: 10,
          max_images_per_product: 2,
          has_ai_seo: false,
          has_image_compression: false,
          has_custom_domain: false,
          has_page_builder: false,
          has_direct_payment: false,
          has_white_label: false,
          commission_rate: '15.00',
          ai_tokens_included: 0,
          yearly_price: '0.00',
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // Product count query
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '25' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        subscriptionService.changePlan('store-1', 'starter' as any, 'free' as any),
      ).rejects.toThrow('Cannot downgrade');
    });
  });
});
