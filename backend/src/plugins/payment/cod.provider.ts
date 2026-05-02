/**
 * Cash on Delivery (COD) provider.
 * No external gateway — payment is confirmed by the vendor at delivery time.
 */

import {
  PaymentInitContext,
  PaymentInitResult,
  PaymentProvider,
  PaymentVerifyResult,
} from './payment-provider.interface';
import { PaymentGateway } from '@pandamarket/types';

export class CodProvider implements PaymentProvider {
  readonly gateway = PaymentGateway.Cod;

  async init(ctx: PaymentInitContext): Promise<PaymentInitResult> {
    return {
      redirect_url: `/orders/${ctx.order_id}/confirmation`,
      gateway_reference: ctx.order_id,
      metadata: { mode: 'cod' },
    };
  }

  async verify(): Promise<PaymentVerifyResult> {
    // COD captures happen out-of-band (vendor marks the order as delivered).
    return { status: 'pending' };
  }
}

export const codProvider = new CodProvider();
