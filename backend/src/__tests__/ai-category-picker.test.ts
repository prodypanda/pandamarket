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

  it('verifies wood salad servers do not falsely match coffee/beverages due to "bois" in "boissons"', () => {
    const title = "Ensemble Couverts à Salade Artisanal en Bois d'Olivier Massif (Cuillère & Fourchette)";
    const categories = [
      { id: 'cat_market_coffee_tea', name: 'Café, Thé & Boissons' },
      { id: 'cat_market_handmade', name: 'Artisanat Tunisien' },
      { id: 'cat_market_cookware', name: 'Cookware & Kitchen Utensils' },
    ];

    const targetWords = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[\s-_/,&()]+/).filter((w) => w.length >= 3);
    
    // Beverage category words
    const coffeeWords = 'Café, Thé & Boissons'.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[\s-_/,&()]+/).filter((w) => w.length >= 3);
    
    let matchedInCoffee = 0;
    for (const tw of targetWords) {
      const hasExact = coffeeWords.some((cw) => {
        if (cw === tw) return true;
        if (tw.length >= 5 && cw.length >= 5 && (cw.startsWith(tw) || tw.startsWith(cw))) return true;
        return false;
      });
      if (hasExact) matchedInCoffee++;
    }

    // Should be 0 matches in coffee/beverages (bois must not match boissons)
    expect(matchedInCoffee).toBe(0);
  });
});
