import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiJobType } from '@pandamarket/types';
import { aiConfigService } from '../services/ai-config.service';

describe('AI Category Picker & Feature Pricing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies CategoryClassification exists in AiJobType enum', () => {
    expect(AiJobType.CategoryClassification).toBe('category_classification');
  });

  it('verifies category_classification is accepted in setPurposeRouting', async () => {
    try {
      await aiConfigService.setPurposeRouting('category_classification', null);
    } catch (err: any) {
      expect(err?.message).not.toContain('Invalid AI purpose');
    }
  });

  it('provides default token price for CategoryClassification job type', async () => {
    const price = await aiConfigService.getFeaturePrice(AiJobType.CategoryClassification);
    expect(price).toBe(2);
  });

  it('verifies category_classification is present in listPricing', async () => {
    const pricingList = await aiConfigService.listPricing();
    const catPricing = pricingList.find((p) => p.job_type === AiJobType.CategoryClassification);
    expect(catPricing).toBeDefined();
    expect(catPricing?.tokens_required).toBeGreaterThanOrEqual(1);
  });

  it('auto-seeds and retrieves category_classification prompt template', async () => {
    const template = await aiConfigService.getPromptTemplate('category_classification');
    expect(template).toBeDefined();
    expect(template.prompt_key).toBe('category_classification');
    expect(template.system_prompt).toContain('PandaMarket');
    expect(template.default_prompt).toContain('{marketplace_categories}');
  });
});
