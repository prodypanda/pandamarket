/**
 * Konnect payment provider.
 * Docs: https://api.konnect.network/api/v2/docs
 * Konnect uses millimes (1 TND = 1000 millimes).
 */

import axios from 'axios';
import {
  PaymentInitContext,
  PaymentInitResult,
  PaymentProvider,
  PaymentVerifyResult,
} from './payment-provider.interface';
import { config } from '../../config';
import { PdError, PdErrorCode } from '../../errors';
import { providerInitFailure } from './provider-errors';
import { PaymentGateway } from '@pandamarket/types';
import { logger } from '../../utils/logger';
import { millimesToTnd, tndToMillimes } from '../../utils/money';

export class KonnectProvider implements PaymentProvider {
  readonly gateway = PaymentGateway.Konnect;

  async init(ctx: PaymentInitContext): Promise<PaymentInitResult> {
    const apiKey = ctx.vendor_credentials?.konnect_api_key ?? config.konnect.apiKey;
    const wallet = ctx.vendor_credentials?.konnect_receiver_wallet ?? config.konnect.receiverWallet;
    let requestStarted = false;
    try {
      requestStarted = true;
      const { data } = await axios.post(
        `${config.konnect.baseUrl}/payments/init-payment`,
        {
          receiverWalletId: wallet,
          amount: tndToMillimes(ctx.amount),
          token: 'TND',
          type: 'immediate',
          acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
          lifespan: 30,
          successUrl: ctx.success_url,
          failUrl: ctx.fail_url,
          theme: 'light',
          orderId: ctx.order_id,
          firstName: 'Customer',
          lastName: ' ',
          email: ctx.customer_email,
        },
        { headers: { 'x-api-key': apiKey }, timeout: 10_000 },
      );
      const payUrl = data?.payUrl;
      const paymentRef = data?.paymentRef;
      if (!payUrl || !paymentRef) {
        throw new Error('Konnect returned no payUrl/paymentRef');
      }
      return {
        redirect_url: payUrl,
        gateway_reference: paymentRef,
        metadata: { provider: 'konnect' },
      };
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'Konnect init failed');
      throw providerInitFailure(
        'konnect',
        'Failed to initialise Konnect payment',
        err,
        requestStarted,
      );
    }
  }

  async verify(
    reference: string,
    vendor_credentials?: Record<string, string>,
  ): Promise<PaymentVerifyResult> {
    const apiKey = vendor_credentials?.konnect_api_key ?? config.konnect.apiKey;
    try {
      const { data } = await axios.get(
        `${config.konnect.baseUrl}/payments/${reference}`,
        { headers: { 'x-api-key': apiKey }, timeout: 10_000 },
      );
      const status: string = data?.payment?.status ?? '';
      const amountMillimes = Number(data?.payment?.amount ?? 0);
      const completed = status === 'completed';
      const rawCurrency = data?.payment?.token;
      const currency = typeof rawCurrency === 'string' && /^[A-Za-z]{3}$/.test(rawCurrency.trim())
        ? rawCurrency.trim().toUpperCase()
        : 'TND';
      return {
        status: completed ? 'captured' : status === 'pending' ? 'pending' : 'failed',
        amount: millimesToTnd(amountMillimes),
        metadata: { provider_status: status, currency },
      };
    } catch (err) {
      logger.error({ err: (err as Error).message, reference }, 'Konnect verify failed');
      throw new PdError(
        PdErrorCode.PAY_VERIFICATION_FAILED,
        'Failed to verify Konnect payment',
        502,
        { gateway: 'konnect' },
      );
    }
  }
}

export const konnectProvider = new KonnectProvider();
