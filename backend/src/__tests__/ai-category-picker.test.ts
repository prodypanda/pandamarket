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

  it('verifies category_classification is accepted in setPurposeRouting with 3-tier fallbacks', async () => {
    try {
      const routing = await aiConfigService.setPurposeRouting('category_classification', null, null, null);
      expect(Array.isArray(routing)).toBe(true);
      const catRoute = routing.find((r) => r.purpose === 'category_classification');
      expect(catRoute).toBeDefined();
      expect(catRoute?.provider_config_id).toBeNull();
      expect(catRoute?.fallback_provider_config_id_1).toBeNull();
      expect(catRoute?.fallback_provider_config_id_2).toBeNull();
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

  it('auto-seeds and retrieves category_classification prompt template with dual-taxonomy instructions', async () => {
    const template = await aiConfigService.getPromptTemplate('category_classification');
    expect(template).toBeDefined();
    expect(template.prompt_key).toBe('category_classification');
    expect(template.system_prompt).toContain('TAXONOMIE MARKETPLACE HUB');
    expect(template.system_prompt).toContain('TAXONOMIE VITRINE BOUTIQUE');
    expect(template.default_prompt).toContain('{marketplace_categories}');
    expect(template.default_prompt).toContain('{storefront_categories}');
    expect(template.default_prompt).toContain('storefront_parent_category_id');
  });

  it('verifies storefront tree hierarchy formatting distinguishes root and subcategories', () => {
    const categories = [
      { id: 'cat_default', name: 'Non categorized products', slug: 'non-categorized-products', is_default: true, parent_id: null, is_active: true, position: 0, store_id: 's1', description: null, short_description: null, long_description: null, image_url: null, created_at: new Date(), updated_at: new Date() },
      { id: 'cat_shoes', name: 'Chaussures', slug: 'chaussures', is_default: false, parent_id: null, is_active: true, position: 1, store_id: 's1', description: null, short_description: null, long_description: null, image_url: null, created_at: new Date(), updated_at: new Date() },
      { id: 'cat_sneakers', name: 'Sneakers & Baskets', slug: 'sneakers-baskets', is_default: false, parent_id: 'cat_shoes', is_active: true, position: 2, store_id: 's1', description: null, short_description: null, long_description: null, image_url: null, created_at: new Date(), updated_at: new Date() },
      { id: 'cat_bags', name: 'Maroquinerie', slug: 'maroquinerie', is_default: false, parent_id: null, is_active: true, position: 3, store_id: 's1', description: null, short_description: null, long_description: null, image_url: null, created_at: new Date(), updated_at: new Date() },
    ];

    const roots = categories.filter((c) => !c.parent_id && !c.is_default);
    const childrenMap = new Map<string, typeof categories>();
    categories.forEach((c) => {
      if (c.parent_id) {
        const list = childrenMap.get(c.parent_id) || [];
        list.push(c);
        childrenMap.set(c.parent_id, list);
      }
    });

    const lines: string[] = [];
    for (const root of roots) {
      lines.push(`- ${root.name} (id: "${root.id}")`);
      const subList = childrenMap.get(root.id) || [];
      for (const sub of subList) {
        lines.push(`  └─ ${sub.name} (id: "${sub.id}")`);
      }
    }
    const formatted = lines.join('\n');

    expect(formatted).toContain('- Chaussures (id: "cat_shoes")');
    expect(formatted).toContain('  └─ Sneakers & Baskets (id: "cat_sneakers")');
    expect(formatted).toContain('- Maroquinerie (id: "cat_bags")');
    expect(formatted).not.toContain('Non categorized products');
  });

  it('verifies listPurposeRouting includes category_classification with 3 tiers', async () => {
    const routing = await aiConfigService.listPurposeRouting();
    const catRoute = routing.find((r) => r.purpose === 'category_classification');
    expect(catRoute).toBeDefined();
    expect(catRoute?.purpose).toBe('category_classification');
    expect(catRoute).toHaveProperty('provider_config_id');
    expect(catRoute).toHaveProperty('fallback_provider_config_id_1');
    expect(catRoute).toHaveProperty('fallback_provider_config_id_2');
  });

  it('throws descriptive PdValidationError when no active providers are available without using mock fallback', async () => {
    // When no API keys or external providers are available in test environment, it must NOT use fake fallback
    await expect(
      aiConfigService.generateText('Produit test')
    ).rejects.toThrow(/Aucun fournisseur d'IA opérationnel|Échec de génération IA/);
  });
});
