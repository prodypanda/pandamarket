/**
 * Payment provider abstraction.
 * Each plugin implements `init()` (start a checkout) and `verify()` (confirm a payment).
 */

import { PaymentGateway } from '@pandamarket/types';

export interface PaymentInitContext {
  order_id: string;
  amount: number;        // TND, 3 decimals
  currency: string;      // 'TND'
  customer_email: string;
  success_url: string;
  fail_url: string;
  /** Optional vendor-side credentials (Pro+ direct payment mode). */
  vendor_credentials?: Record<string, string>;
}

export interface PaymentInitResult {
  /** URL the client must be redirected to in order to pay. */
  redirect_url: string;
  /** Gateway-side reference (we store this on the order). */
  gateway_reference: string;
  /** Free-form metadata returned by the gateway. */
  metadata?: Record<string, unknown>;
}

export interface PaymentVerifyResult {
  status: 'captured' | 'pending' | 'failed';
  amount?: number;
  metadata?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly gateway: PaymentGateway;
  init(ctx: PaymentInitContext): Promise<PaymentInitResult>;
  verify(reference: string, vendor_credentials?: Record<string, string>): Promise<PaymentVerifyResult>;
}
