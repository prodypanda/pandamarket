import { smsService } from './sms.service';
import { logger } from '../utils/logger';

export interface OrderItemSummary {
  title: string;
  quantity: number;
  price?: number;
}

export class WhatsAppOrderNotificationService {
  /**
   * Dispatches WhatsApp order confirmation message upon successful order creation.
   */
  async sendOrderConfirmationWhatsApp(params: {
    orderId: string;
    phone: string;
    customerName: string;
    items: OrderItemSummary[];
    totalTnd: number;
    trackingUrl: string;
  }): Promise<boolean> {
    try {
      const itemsList = params.items
        .slice(0, 3)
        .map((it) => `• ${it.title} (x${it.quantity})`)
        .join('\n');
      const moreItems = params.items.length > 3 ? `\n... et ${params.items.length - 3} autre(s) article(s)` : '';

      const message = [
        `👋 Bonjour ${params.customerName || 'Cher client'},`,
        `🛍️ Votre commande *#${params.orderId.slice(-8).toUpperCase()}* sur PandaMarket a bien été confirmée !`,
        '',
        `📦 *Articles :*`,
        itemsList + moreItems,
        '',
        `💰 *Total :* ${params.totalTnd.toFixed(3)} TND`,
        `🔍 *Suivre votre commande :* ${params.trackingUrl}`,
        '',
        `Merci de votre confiance ! 🐼🇹🇳`,
      ].join('\n');

      return await smsService.sendSms(params.phone, message);
    } catch (err) {
      logger.error({ err, orderId: params.orderId }, 'Failed to dispatch WhatsApp order confirmation');
      return false;
    }
  }

  /**
   * Dispatches WhatsApp shipment notification when carrier tracking is assigned.
   */
  async sendOrderShippedWhatsApp(params: {
    orderId: string;
    phone: string;
    customerName: string;
    carrierName: string;
    trackingNumber: string;
    trackingUrl: string;
  }): Promise<boolean> {
    try {
      const message = [
        `🚚 Bonjour ${params.customerName || 'Cher client'},`,
        `Votre colis pour la commande *#${params.orderId.slice(-8).toUpperCase()}* a été expédié !`,
        '',
        `📦 *Transporteur :* ${params.carrierName || 'Livraison Express'}`,
        `🔖 *Numéro de suivi :* ${params.trackingNumber}`,
        `📍 *Suivre le colis :* ${params.trackingUrl}`,
        '',
        `Préparez le montant exact si vous avez choisi le paiement à la livraison (COD).`,
        `À très bientôt sur PandaMarket ! 🐼`,
      ].join('\n');

      return await smsService.sendSms(params.phone, message);
    } catch (err) {
      logger.error({ err, orderId: params.orderId }, 'Failed to dispatch WhatsApp shipment notification');
      return false;
    }
  }

  /**
   * Dispatches out-for-delivery WhatsApp message on the morning of delivery.
   */
  async sendOutForDeliveryWhatsApp(params: {
    orderId: string;
    phone: string;
    customerName: string;
    courierPhone?: string;
  }): Promise<boolean> {
    try {
      const courierInfo = params.courierPhone ? `\n📞 Contact du livreur : ${params.courierPhone}` : '';

      const message = [
        `🛵 Bonjour ${params.customerName || 'Cher client'},`,
        `Votre commande *#${params.orderId.slice(-8).toUpperCase()}* est *en cours de livraison aujourd'hui* !`,
        courierInfo,
        '',
        `Merci de rester joignable pour faciliter la réception de votre colis. 🐼🇹🇳`,
      ].join('\n');

      return await smsService.sendSms(params.phone, message);
    } catch (err) {
      logger.error({ err, orderId: params.orderId }, 'Failed to dispatch WhatsApp out-for-delivery notification');
      return false;
    }
  }
}

export const whatsAppOrderNotificationService = new WhatsAppOrderNotificationService();
