import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSendSms } = vi.hoisted(() => ({
  mockSendSms: vi.fn(),
}));

vi.mock('../services/sms.service', () => ({
  smsService: {
    sendSms: mockSendSms,
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { whatsAppOrderNotificationService } from '../services/whatsapp-order-notification.service';

describe('PLAN-T4-01: WhatsApp Automated Order Tracking & Support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches order confirmation WhatsApp message with line item breakdown', async () => {
    mockSendSms.mockResolvedValueOnce(true);

    const sent = await whatsAppOrderNotificationService.sendOrderConfirmationWhatsApp({
      orderId: 'ord_12345678',
      phone: '+21620123456',
      customerName: 'Yassine',
      items: [
        { title: 'Chéchia Traditionnelle', quantity: 1, price: 35.0 },
        { title: 'Fouta Coton Bio', quantity: 2, price: 25.0 },
      ],
      totalTnd: 85.0,
      trackingUrl: 'https://pandamarket.tn/orders/ord_12345678',
    });

    expect(sent).toBe(true);
    expect(mockSendSms).toHaveBeenCalledWith(
      '+21620123456',
      expect.stringContaining('Chéchia Traditionnelle'),
    );
    expect(mockSendSms).toHaveBeenCalledWith(
      '+21620123456',
      expect.stringContaining('85.000 TND'),
    );
  });

  it('dispatches order shipped WhatsApp notification with carrier tracking', async () => {
    mockSendSms.mockResolvedValueOnce(true);

    const sent = await whatsAppOrderNotificationService.sendOrderShippedWhatsApp({
      orderId: 'ord_12345678',
      phone: '+21620123456',
      customerName: 'Yassine',
      carrierName: 'Aramex Tunisie',
      trackingNumber: 'ARX-998877',
      trackingUrl: 'https://pandamarket.tn/tracking/ARX-998877',
    });

    expect(sent).toBe(true);
    expect(mockSendSms).toHaveBeenCalledWith(
      '+21620123456',
      expect.stringContaining('Aramex Tunisie'),
    );
    expect(mockSendSms).toHaveBeenCalledWith(
      '+21620123456',
      expect.stringContaining('ARX-998877'),
    );
  });

  it('dispatches out-for-delivery WhatsApp message with courier details', async () => {
    mockSendSms.mockResolvedValueOnce(true);

    const sent = await whatsAppOrderNotificationService.sendOutForDeliveryWhatsApp({
      orderId: 'ord_12345678',
      phone: '+21620123456',
      customerName: 'Yassine',
      courierPhone: '+21698765432',
    });

    expect(sent).toBe(true);
    expect(mockSendSms).toHaveBeenCalledWith(
      '+21620123456',
      expect.stringContaining('+21698765432'),
    );
  });
});
