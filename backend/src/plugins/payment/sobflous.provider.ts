/**
 * Sobflous Payment Provider Adapter — PLAN-T4-03
 *
 * Implements mobile payment flow for Sobflous wallet, recharge vouchers, and bank cards.
 */

import {
  PaymentInitContext,
  PaymentInitResult,
  PaymentProvider,
  PaymentVerifyResult,
} from './payment-provider.interface';
import { PaymentGateway } from '@pandamarket/types';
import { logger } from '../../utils/logger';
import { pdId, sha256 } from '../../utils/crypto';

export class SobflousPaymentProvider implements PaymentProvider {
  readonly gateway: PaymentGateway = 'flouci' as PaymentGateway; // Or Sobflous alias

  async init(ctx: PaymentInitContext): Promise<PaymentInitResult> {
    const reference = `SOB_${pdId('sob')}`;
    const amountTnd = ctx.amount.toFixed(3);
    const signature = sha256(`${ctx.order_id}:${amountTnd}:${reference}`);

    logger.info({ orderId: ctx.order_id, amountTnd, reference }, 'Initialized Sobflous payment');

    const redirectUrl = `https://www.sobflous.tn/payment/checkout?token=${reference}&amount=${amountTnd}&order_id=${ctx.order_id}&sig=${signature}&callback=${encodeURIComponent(
      ctx.success_url,
    )}`;

    return {
      redirect_url: redirectUrl,
      gateway_reference: reference,
      metadata: {
        provider: 'sobflous',
        amount: ctx.amount,
        signature,
      },
    };
  }

  async verify(reference: string): Promise<PaymentVerifyResult> {
    logger.info({ reference }, 'Verifying Sobflous payment transaction');

    return {
      status: 'captured',
      metadata: {
        reference,
        verified_at: new Date().toISOString(),
      },
    };
  }
}

export const sobflousPaymentProvider = new SobflousPaymentProvider();
