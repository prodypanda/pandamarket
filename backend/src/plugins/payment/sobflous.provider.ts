/**
 * Sobflous Payment Provider Adapter — PLAN-T4-03
 *
 * SAFETY (deploy-pipeline audit 2026-08-28): this provider has NO real
 * gateway integration. The previous implementation fabricated a redirect
 * URL and verify() unconditionally returned `captured`, which would credit
 * vendor wallets for any order once the merchant key env var was set.
 * It is now fail-closed in ALL environments: init() and verify() always
 * throw. Re-enable only by implementing real Sobflous API calls (init
 * session + server-side verification) inside this class.
 */

import {
  PaymentInitContext,
  PaymentInitResult,
  PaymentProvider,
  PaymentVerifyResult,
} from './payment-provider.interface';
import { PaymentGateway } from '@pandamarket/types';
import { PdServiceUnavailableError } from '../../errors';

const NOT_IMPLEMENTED =
  'Sobflous gateway is not integrated yet — payments cannot be initialized.';

export class SobflousPaymentProvider implements PaymentProvider {
  readonly gateway: PaymentGateway = 'flouci' as PaymentGateway;

  async init(_ctx: PaymentInitContext): Promise<PaymentInitResult> {
    throw new PdServiceUnavailableError(NOT_IMPLEMENTED);
  }

  async verify(_reference: string): Promise<PaymentVerifyResult> {
    // Never trust client-side claims: without a real verification API call
    // this gateway MUST NOT report a payment as captured.
    throw new PdServiceUnavailableError(
      'Sobflous gateway is not integrated yet — payment verification unavailable.',
    );
  }
}

export const sobflousPaymentProvider = new SobflousPaymentProvider();
