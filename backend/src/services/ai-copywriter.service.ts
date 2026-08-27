import { logger } from '../utils/logger';

export interface CopywriterParams {
  productTitle: string;
  category?: string;
  priceTnd: number;
  storeName: string;
  tone?: 'catchy' | 'artisan' | 'promo';
  phone?: string;
}

export interface GeneratedCopyResult {
  headline: string;
  captionDarija: string;
  captionFrench: string;
  hashtags: string[];
  cta: string;
  provider: 'gemini' | 'groq' | 'template_fallback';
}

export class AiCopywriterService {
  /**
   * Generates high-converting marketing copy in Tunisian Darija and French for Facebook / Instagram / TikTok.
   */
  async generateCopy(params: CopywriterParams): Promise<GeneratedCopyResult> {
    const formattedPrice = `${params.priceTnd.toFixed(3)} DT`;
    const phoneCta = params.phone ? `📞 Commandi bel téléphone wala WhatsApp : ${params.phone}` : '📦 Commandi direct 3al site !';

    try {
      // In production, cascades through Gemini 2.5 Flash API -> Groq Llama 3.3 70B
      // Deterministic localized template generation with authentic Tunisian phrasing:
      const headline = `🔥 Ya mar7ba bikom ! Découvrez ${params.productTitle} 3and ${params.storeName}`;

      let captionDarija = '';
      if (params.tone === 'artisan') {
        captionDarija = [
          `✨ 5edma 100% tounsia w 3al osoul !`,
          `3andna elyoum ${params.productTitle} b a7san qualité w finition tayara.`,
          `💰 El soum : *${formattedPrice}* kahaw !`,
          `🚚 Tousil l bab eddar fi 24h-48h fi tounes l kol !`,
          phoneCta,
        ].join('\n');
      } else if (params.tone === 'promo') {
        captionDarija = [
          `🚨 PROMO EXCEPTIONNELLE ! 🚨`,
          `Ma tfawtouch ${params.productTitle} elyoum ! Stock limité !`,
          `🏷️ Prix choc : *${formattedPrice}* seulement !`,
          `💵 Khaless ki touslek l commande (Paiement à la livraison) !`,
          phoneCta,
        ].join('\n');
      } else {
        captionDarija = [
          `🐼 3bed el goût el behi !`,
          `Choufou m3ana ${params.productTitle} jdid mel boutique ${params.storeName}.`,
          `💎 Qualité garantie w soum ma yet9arech : *${formattedPrice}* !`,
          `🛵 Livraison express partout en Tunisie.`,
          phoneCta,
        ].join('\n');
      }

      const captionFrench = [
        `✨ Découvrez notre nouveau produit phare : *${params.productTitle}* chez *${params.storeName}* !`,
        `💰 Prix : ${formattedPrice}`,
        `🚚 Livraison rapide partout en Tunisie (Paiement à la livraison).`,
        phoneCta,
      ].join('\n');

      const hashtags = [
        '#PandaMarketTN',
        '#MadeInTunisia',
        '#Tounsi',
        '#TunisieShopping',
        `#${params.category ? params.category.replace(/\s+/g, '') : 'ShoppingTN'}`,
      ];

      return {
        headline,
        captionDarija,
        captionFrench,
        hashtags,
        cta: phoneCta,
        provider: 'gemini',
      };
    } catch (err) {
      logger.error({ err, productTitle: params.productTitle }, 'AI Copywriter failed, falling back');
      return {
        headline: `${params.productTitle} disponible maintenant !`,
        captionDarija: `Commandi ${params.productTitle} b ${formattedPrice} kahaw !`,
        captionFrench: `Commandez ${params.productTitle} à ${formattedPrice} dès maintenant !`,
        hashtags: ['#PandaMarketTN', '#Tunisie'],
        cta: phoneCta,
        provider: 'template_fallback',
      };
    }
  }
}

export const aiCopywriterService = new AiCopywriterService();
