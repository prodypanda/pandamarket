import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { aiCopywriterService } from '../services/ai-copywriter.service';

describe('PLAN-T4-06: Advanced AI Commerce Suite & Tunisian Darija Copywriter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates authentic Tunisian Darija and French marketing captions with prices in Dinars', async () => {
    const copy = await aiCopywriterService.generateCopy({
      productTitle: 'Fouta Traditionnelle Tissée Main',
      category: 'Artisanat & Maison',
      priceTnd: 28.5,
      storeName: 'Atelier Medina',
      tone: 'artisan',
      phone: '+21620123456',
    });

    expect(copy.headline).toContain('Fouta Traditionnelle Tissée Main');
    expect(copy.headline).toContain('Atelier Medina');

    // Verify Darija phrasing
    expect(copy.captionDarija).toContain('5edma 100% tounsia');
    expect(copy.captionDarija).toContain('28.500 DT');
    expect(copy.captionDarija).toContain('24h-48h fi tounes');
    expect(copy.captionDarija).toContain('+21620123456');

    // Verify French copy
    expect(copy.captionFrench).toContain('28.500 DT');
    expect(copy.captionFrench).toContain('Paiement à la livraison');

    // Verify hashtags
    expect(copy.hashtags).toContain('#PandaMarketTN');
    expect(copy.hashtags).toContain('#MadeInTunisia');
  });

  it('generates promotional urgency copy for flash sales', async () => {
    const copy = await aiCopywriterService.generateCopy({
      productTitle: 'Montre Quartz Chrono',
      priceTnd: 120.0,
      storeName: 'WatchStore TN',
      tone: 'promo',
    });

    expect(copy.captionDarija).toContain('PROMO EXCEPTIONNELLE');
    expect(copy.captionDarija).toContain('Prix choc : *120.000 DT*');
    expect(copy.captionDarija).toContain('Paiement à la livraison');
  });
});
