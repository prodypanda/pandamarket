import { describe, it, expect } from 'vitest';

import { d17PaymentProvider } from '../plugins/payment/d17.provider';
import { sobflousPaymentProvider } from '../plugins/payment/sobflous.provider';

const initCtx = {
  order_id: 'ord_12345678',
  amount: 45.5,
  currency: 'TND',
  customer_email: 'client@example.tn',
  success_url: 'https://pandamarket.tn/checkout/success',
  fail_url: 'https://pandamarket.tn/checkout/fail',
};

describe('PLAN-T4-03: Tunisian Mobile Payment Gateways (D17 & Sobflous) — neutralized stubs', () => {
  it('D17 init() is fail-closed: no payment session can be created', async () => {
    await expect(d17PaymentProvider.init(initCtx)).rejects.toThrow(/not integrated/i);
  });

  it('D17 verify() never reports captured without a real gateway call', async () => {
    await expect(d17PaymentProvider.verify('D17_test_ref')).rejects.toThrow(/not integrated/i);
  });

  it('Sobflous init() is fail-closed: no payment session can be created', async () => {
    await expect(sobflousPaymentProvider.init(initCtx)).rejects.toThrow(/not integrated/i);
  });

  it('Sobflous verify() never reports captured without a real gateway call', async () => {
    await expect(sobflousPaymentProvider.verify('SOB_test_ref')).rejects.toThrow(/not integrated/i);
  });
});
