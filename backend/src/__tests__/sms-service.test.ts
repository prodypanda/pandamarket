import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../config', () => ({
  config: {
    env: 'production',
    sms: {
      provider: 'whatsapp_gateway',
      whatsappGatewayUrl: 'https://whatsapp.example.com',
      whatsappGatewayToken: 'test_token_123',
    },
  },
}));

import { smsService } from '../services/sms.service';
import { logger } from '../utils/logger';

describe('PLAN-B-17: WhatsApp Gateway & Secure OTP Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches messages via WhatsApp Gateway endpoint with apikey header', async () => {
    (axios.post as any).mockResolvedValueOnce({
      status: 200,
      data: { key: { id: 'msg_123' } },
    });

    const result = await (smsService as any).sendViaWhatsAppGateway('+21698765432', 'Votre code: 123456');

    expect(result).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      'https://whatsapp.example.com/message/sendText/default',
      {
        number: '21698765432',
        text: 'Votre code: 123456',
      },
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          apikey: 'test_token_123',
        },
      })
    );
  });

  it('does not log raw OTP messages in production fallback', async () => {
    const to = '+21698765432';
    const message = 'Secret OTP is 987654';

    const sent = await (smsService as any).dispatchSms(to, message, 'console', 'PandaMarket');

    expect(sent).toBe(false);
    expect(logger.info).toHaveBeenCalledWith(
      { to: '+216987****' },
      expect.stringContaining('[SMS]')
    );

    // Verify plaintext message was NOT logged
    const loggedArgs = (logger.info as any).mock.calls[0][0];
    expect(loggedArgs.message).toBeUndefined();
  });
});
