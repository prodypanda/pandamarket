/**
 * Plan-related constants and helpers.
 * The actual quotas live in the `subscription_limits` table (seeded),
 * but these defaults are kept here for type safety and quick lookups.
 */

import { SubscriptionPlan } from '@pandamarket/types';

/**
 * Default plan quotas (mirrors the seed in `data/seed.ts` and PRD section 4.1).
 * Use the database row as source of truth at runtime; these are only fallbacks.
 */
export const PLAN_DEFAULTS: Record<
  SubscriptionPlan,
  {
    max_products: number; // -1 = unlimited
    max_images_per_product: number;
    has_ai_seo: boolean;
    has_image_compression: boolean;
    has_custom_domain: boolean;
    has_page_builder: boolean;
    has_direct_payment: boolean;
    has_white_label: boolean;
    commission_rate: number;
    ai_tokens_included: number;
    yearly_price: number;
  }
> = {
  [SubscriptionPlan.Free]: {
    max_products: 10,
    max_images_per_product: 2,
    has_ai_seo: false,
    has_image_compression: false,
    has_custom_domain: false,
    has_page_builder: false,
    has_direct_payment: false,
    has_white_label: false,
    commission_rate: 0.15,
    ai_tokens_included: 0,
    yearly_price: 0,
  },
  [SubscriptionPlan.Starter]: {
    max_products: 50,
    max_images_per_product: 5,
    has_ai_seo: true,
    has_image_compression: true,
    has_custom_domain: true,
    has_page_builder: false,
    has_direct_payment: false,
    has_white_label: false,
    commission_rate: 0,
    ai_tokens_included: 50,
    yearly_price: 300,
  },
  [SubscriptionPlan.Regular]: {
    max_products: 100,
    max_images_per_product: 7,
    has_ai_seo: true,
    has_image_compression: true,
    has_custom_domain: true,
    has_page_builder: true,
    has_direct_payment: false,
    has_white_label: false,
    commission_rate: 0,
    ai_tokens_included: 100,
    yearly_price: 600,
  },
  [SubscriptionPlan.Agency]: {
    max_products: 300,
    max_images_per_product: 10,
    has_ai_seo: true,
    has_image_compression: true,
    has_custom_domain: true,
    has_page_builder: true,
    has_direct_payment: false,
    has_white_label: false,
    commission_rate: 0,
    ai_tokens_included: 300,
    yearly_price: 1200,
  },
  [SubscriptionPlan.Pro]: {
    max_products: -1,
    max_images_per_product: 15,
    has_ai_seo: true,
    has_image_compression: true,
    has_custom_domain: true,
    has_page_builder: true,
    has_direct_payment: true,
    has_white_label: false,
    commission_rate: 0,
    ai_tokens_included: -1,
    yearly_price: 2400,
  },
  [SubscriptionPlan.Golden]: {
    max_products: -1,
    max_images_per_product: 20,
    has_ai_seo: true,
    has_image_compression: true,
    has_custom_domain: true,
    has_page_builder: true,
    has_direct_payment: true,
    has_white_label: false,
    commission_rate: 0,
    ai_tokens_included: -1,
    yearly_price: 4800,
  },
  [SubscriptionPlan.Platinum]: {
    max_products: -1,
    max_images_per_product: 30,
    has_ai_seo: true,
    has_image_compression: true,
    has_custom_domain: true,
    has_page_builder: true,
    has_direct_payment: true,
    has_white_label: true,
    commission_rate: 0,
    ai_tokens_included: -1,
    yearly_price: 9600,
  },
};

/**
 * Plan ranking (for upgrade/downgrade comparisons).
 * Higher number = higher tier.
 */
export const PLAN_RANK: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.Free]: 0,
  [SubscriptionPlan.Starter]: 1,
  [SubscriptionPlan.Regular]: 2,
  [SubscriptionPlan.Agency]: 3,
  [SubscriptionPlan.Pro]: 4,
  [SubscriptionPlan.Golden]: 5,
  [SubscriptionPlan.Platinum]: 6,
};

export function isHigherOrEqualPlan(plan: SubscriptionPlan, minimum: SubscriptionPlan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[minimum];
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}
