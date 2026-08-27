import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailProviderService } from '../services/email-provider.service';

describe('PLAN-M-01: Production Transactional Email Provider (Brevo + Resend Fallback)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('delivers email via primary Brevo API when configured and healthy', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messageId: '<brevo-123@smtp-relay.mailin.fr>' }),
    });
    global.fetch = mockFetch;

    const provider = new EmailProviderService({
      brevoApiKey: 'test-brevo-key',
      resendApiKey: 'test-resend-key',
      fromName: 'PandaMarket Support',
      fromEmail: 'support@pandamarket.tn',
    });

    const result = await provider.send({
      to: 'buyer@example.com',
      subject: 'Confirmation de votre commande',
      html: '<h1>Merci pour votre achat !</h1>',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('brevo');
    expect(result.messageId).toBe('<brevo-123@smtp-relay.mailin.fr>');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.brevo.com/v3/smtp/email');
  });

  it('falls back to Resend API when Brevo returns an error', async () => {
    const mockFetch = vi.fn()
      // 1. Brevo fails with 500
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })
      // 2. Resend succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'resend_msg_789' }),
      });
    global.fetch = mockFetch;

    const provider = new EmailProviderService({
      brevoApiKey: 'test-brevo-key',
      resendApiKey: 'test-resend-key',
      fromName: 'PandaMarket Support',
      fromEmail: 'support@pandamarket.tn',
    });

    const result = await provider.send({
      to: 'seller@example.com',
      subject: 'Nouvelle vente reçue',
      html: '<p>Vous avez une nouvelle commande</p>',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('resend');
    expect(result.messageId).toBe('resend_msg_789');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0]).toBe('https://api.resend.com/emails');
  });

  it('throws descriptive error when all providers fail', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => 'Bad Gateway',
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });
    global.fetch = mockFetch;

    const provider = new EmailProviderService({
      brevoApiKey: 'test-brevo-key',
      resendApiKey: 'test-resend-key',
    });

    await expect(
      provider.send({
        to: 'user@example.com',
        subject: 'Code de vérification',
        html: '<p>Votre code: 123456</p>',
      }),
    ).rejects.toThrow(/All transactional email providers failed/);
  });
});
