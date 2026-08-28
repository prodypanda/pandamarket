/**
 * Poste Tunisienne D17 Payment Provider Adapter — PLAN-T4-03
 *
 * SAFETY (deploy-pipeline audit 2026-08-28): this provider has NO real
 * gateway integration. The previous implementation fabricated a redirect
 * URL and verify() unconditionally returned `captured`, which would credit
 * vendor wallets for any order once the merchant key env var was set.
 * It is now fail-closed in ALL environments: init() and verify() always
 * throw. Re-enable only by implementing real D17 API calls (init session +
 * server-side verification) inside this class.
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
  'D17 Poste Tunisienne gateway is not integrated yet — payments cannot be initialized.';

export class D17PaymentProvider implements PaymentProvider {
  readonly gateway: PaymentGateway = 'manual_mandat' as PaymentGateway;

  async init(_ctx: PaymentInitContext): Promise<PaymentInitResult> {
    throw new PdServiceUnavailableError(NOT_IMPLEMENTED);
  }

  async verify(_reference: string): Promise<PaymentVerifyResult> {
    // Never trust client-side claims: without a real verification API call
    // this gateway MUST NOT report a payment as captured.
    throw new PdServiceUnavailableError(
      'D17 Poste Tunisienne gateway is not integrated yet — payment verification unavailable.',
    );
  }
}

export const d17PaymentProvider = new D17PaymentProvider();
