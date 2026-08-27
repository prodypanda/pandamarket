import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { d17PaymentProvider } from '../plugins/payment/d17.provider';
import { sobflousPaymentProvider } from '../plugins/payment/sobflous.provider';

describe('PLAN-T4-03: Tunisian Mobile Payment Gateways Expansion (D17 & Sobflous)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes D17 Poste Tunisienne mobile payment session', async () => {
    const res = await d17PaymentProvider.init({
      order_id: 'ord_12345678',
      amount: 45.5,
      currency: 'TND',
      customer_email: 'client@example.tn',
      success_url: 'https://pandamarket.tn/checkout/success',
      fail_url: 'https://pandamarket.tn/checkout/fail',
    });

    expect(res.redirect_url).toContain('https://d17.poste.tn/pay');
    expect(res.redirect_url).toContain('amount=45.500');
    expect(res.redirect_url).toContain('order=ord_12345678');
    expect(res.gateway_reference).toContain('D17_');

    const verify = await d17PaymentProvider.verify(res.gateway_reference);
    expect(verify.status).toBe('captured');
  });

  it('initializes Sobflous checkout session with signature verification', async () => {
    const res = await sobflousPaymentProvider.init({
      order_id: 'ord_12345678',
      amount: 60.0,
      currency: 'TND',
      customer_email: 'client@example.tn',
      success_url: 'https://pandamarket.tn/checkout/success',
      fail_url: 'https://pandamarket.tn/checkout/fail',
    });

    expect(res.redirect_url).toContain('https://www.sobflous.tn/payment/checkout');
    expect(res.redirect_url).toContain('amount=60.000');
    expect(res.redirect_url).toContain('sig=');
    expect(res.gateway_reference).toContain('SOB_');

    const verify = await sobflousPaymentProvider.verify(res.gateway_reference);
    expect(verify.status).toBe('captured');
  });
});
