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

  it('verifies Top 3 candidates generation and structure in fallback engine', async () => {
    const prompt = `Vous êtes un Expert en Classification Taxonomique & Merchandising E-commerce d'élite de PandaMarket.
Produit à classifier :
- Titre : Robe Caftan Artisanal Brodée Fil d'Or
- Description : Caftan traditionnel en soie avec broderies dorées

Catégories Marketplace Hub disponibles (choix contraint avec ID) :
- Mode & Accessoires (id: "cat_market_fashion")
- Robes & Caftans (id: "cat_market_caftans")
- Artisanat Tunisien (id: "cat_market_crafts")
- Électronique (id: "cat_market_elec")

Catégories Vitrine Boutique existantes du vendeur :
- Prêt-à-porter (id: "sf_fashion")
  └─ Caftans de Fête (id: "sf_caftans")`;

    const result = await aiConfigService.generateTextForPurpose('category_classification', prompt);
    expect(result.text).toBeDefined();

    const parsed = JSON.parse(result.text);
    expect(parsed.candidates).toBeDefined();
    expect(Array.isArray(parsed.candidates)).toBe(true);
    expect(parsed.candidates.length).toBeGreaterThanOrEqual(1);
    expect(parsed.candidates.length).toBeLessThanOrEqual(3);

    const top1 = parsed.candidates[0];
    expect(top1.rank).toBe(1);
    expect(top1.confidence).toBeGreaterThan(0.5);
    expect(top1.marketplace_category_id).toBeDefined();
    expect(top1.marketplace_category_name).toBeDefined();
    expect(top1.storefront_category_name).toBeDefined();
  });

  it('correctly classifies Tunisian Extra Virgin Olive Oil with high confidence and no false electronics match', async () => {
    const prompt = `Vous êtes un Expert en Classification Taxonomique & Merchandising E-commerce d'élite de PandaMarket.
📦 PRODUIT À CLASSIFIER :
- Titre : Huile d'Olive Vierge Extra Infusée au Piment Rouge & Romarin Sauvage 250ml
- Description : Huile d'olive extra vierge de première pression à froid macérée artisanalement avec des piments rouges Baklouti séchés et du romarin sauvage de montagne. Idéale pour pizzas, grillades et pâtes.
- Marque : MED-FOOD-012
- Attributs & Spécifications : Contenance: 250 ml (Bouteille en verre avec verseur), Ingrédients: Huile d'olive extra vierge 97%, Piments rouges 2%, Romarin sauvage 1%
- Tags : huile pimentée, huile aromatisée, romarin, terroir tunisie
- Prix indicatif : 25 TND
- Langue : French

Catégories Marketplace Hub disponibles (choix contraint avec ID) :
- Électronique & High-Tech (id: "cat_market_electronics")
  - TV, Audio & Photo (id: "cat_market_audio_tv")
    - Casques & Écouteurs (id: "cat_market_headphones")
- Alimentation & Terroir Tunisien (id: "cat_market_food")
  - Huile d'Olive Vierge Extra (id: "cat_market_olive_oil")
  - Harissa Artisanale & Épices (id: "cat_market_harissa_spices")

Catégories Vitrine Boutique existantes du vendeur :
- Électronique & High-Tech (id: "pd_cat_4cvg9FCmEqkrAju7")

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE SANS TEXTE ADDITIONNEL :
{
  "candidates": []
}`;

    const result = await aiConfigService.generateTextForPurpose('category_classification', prompt);
    const parsed = JSON.parse(result.text);

    expect(parsed.candidates).toBeDefined();
    expect(parsed.candidates.length).toBeGreaterThanOrEqual(1);

    const top1 = parsed.candidates[0];
    expect(top1.marketplace_category_id).toBe('cat_market_olive_oil');
    expect(top1.confidence).toBeGreaterThanOrEqual(0.85);
    expect(top1.storefront_parent_name).toBeDefined();
    expect(top1.storefront_parent_name).toContain('Épicerie');
    expect(top1.storefront_category_name).toContain('Huile');
    expect(top1.storefront_category_id).toBeNull();
    expect(top1.created_new).toBe(true);

    for (const c of parsed.candidates) {
      expect(c.marketplace_category_id).not.toBe('cat_market_electronics');
      expect(c.marketplace_category_id).not.toBe('cat_market_audio_tv');
      expect(c.marketplace_category_id).not.toBe('cat_market_headphones');
    }
  });

  it('verifies listPurposeRouting includes category_classification', async () => {
    const routing = await aiConfigService.listPurposeRouting();
    const catRoute = routing.find((r) => r.purpose === 'category_classification');
    expect(catRoute).toBeDefined();
    expect(catRoute?.purpose).toBe('category_classification');
  });

  it('correctly classifies cat litter bentonite to pet care in fallback engine without matching stop-word false positives', async () => {
    const prompt = `Vous êtes un Expert en Classification Taxonomique & Merchandising E-commerce d'élite de PandaMarket.

📦 PRODUIT À CLASSIFIER :
- Titre : Bentonite Litière Agglomérante pour Chats, Contrôle des Odeurs & Haute Absorption 5L
- Description : La litière agglomérante SamCat Clumping Cat Litter offre une solution pratique et hygiénique pour le confort de votre chat. Grâce à sa formule à forte absorption, elle forme des blocs compacts faciles à retirer, aidant ainsi à garder le bac propre plus longtemps. Elle neutralise efficacement les mauvaises odeurs.
- Marque : SamCat
- Attributs & Spécifications : Non spécifiés
- Tags : litiere chat, bentonite
- Prix indicatif : 79 TND
- Langue : French

Catégories Marketplace Hub disponibles (choix contraint avec ID) :
- Électronique & High-Tech (id: "cat_market_electronics")
  - Haut-parleurs & Barres de son (id: "cat_market_speakers")
- Maison, Meubles & Déco (id: "cat_market_home")
  - Jardinage & Animaux de Compagnie (id: "cat_sub_garden_pets")

Catégories Vitrine Boutique existantes du vendeur :
- Rayon Principal (id: "pd_cat_SSgrub7drUHvGAfx")
  └─ Haut-parleurs & Barres de son (id: "pd_cat_5Arnw7r9vMWcS7kk")

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE SANS TEXTE ADDITIONNEL :
{
  "candidates": []
}`;

    const result = await aiConfigService.generateTextForPurpose('category_classification', prompt);
    const parsed = JSON.parse(result.text);

    expect(parsed.candidates).toBeDefined();
    const top1 = parsed.candidates[0];
    expect(top1.marketplace_category_id).toBe('cat_sub_garden_pets');
    expect(top1.marketplace_category_id).not.toBe('cat_market_speakers');
    expect(top1.storefront_parent_name).toContain('Animal');
  });
});
