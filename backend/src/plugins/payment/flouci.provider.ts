/**
 * Flouci payment provider.
 * Docs: https://developers.flouci.com
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
import { PaymentGateway } from '@pandamarket/types';
import { logger } from '../../utils/logger';
import { tndToMillimes } from '../../utils/money';

export class FlouciProvider implements PaymentProvider {
  readonly gateway = PaymentGateway.Flouci;

  async init(ctx: PaymentInitContext): Promise<PaymentInitResult> {
    const token = ctx.vendor_credentials?.flouci_app_token ?? config.flouci.appToken;
    const secret = ctx.vendor_credentials?.flouci_app_secret ?? config.flouci.appSecret;

    try {
      const { data } = await axios.post(
        `${config.flouci.baseUrl}/generate_payment`,
        {
          app_token: token,
          app_secret: secret,
          amount: tndToMillimes(ctx.amount), // Flouci wants millimes
          accept_url: ctx.success_url,
          cancel_url: ctx.fail_url,
          decline_url: ctx.fail_url,
          session_timeout_secs: 1800,
          developer_tracking_id: ctx.order_id,
        },
        { timeout: 10_000 },
      );
      const link = data?.result?.link;
      const paymentId = data?.result?.payment_id;
      if (!link || !paymentId) {
        throw new Error('Flouci returned no link/payment_id');
      }
      return {
        redirect_url: link,
        gateway_reference: paymentId,
        metadata: { provider: 'flouci' },
      };
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'Flouci init failed');
      throw new PdError(
        PdErrorCode.PAY_INIT_FAILED,
        'Failed to initialise Flouci payment',
        502,
        { gateway: 'flouci' },
      );
    }
  }

  async verify(
    reference: string,
    vendor_credentials?: Record<string, string>,
  ): Promise<PaymentVerifyResult> {
    const token = vendor_credentials?.flouci_app_token ?? config.flouci.appToken;
    const secret = vendor_credentials?.flouci_app_secret ?? config.flouci.appSecret;
    try {
      const { data } = await axios.get(
        `${config.flouci.baseUrl}/verify_payment/${reference}`,
        {
          headers: { apppublic: token, appsecret: secret },
          timeout: 10_000,
        },
      );
      const status: string = data?.result?.status ?? '';
      const amountMillimes = Number(data?.result?.amount ?? 0);
      const successful = status === 'SUCCESS' || data?.result?.success === true;
      return {
        status: successful ? 'captured' : 'failed',
        amount: amountMillimes / 1000,
        metadata: { provider_status: status },
      };
    } catch (err) {
      logger.error({ err: (err as Error).message, reference }, 'Flouci verify failed');
      throw new PdError(
        PdErrorCode.PAY_VERIFICATION_FAILED,
        'Failed to verify Flouci payment',
        502,
        { gateway: 'flouci' },
      );
    }
  }
}

export const flouciProvider = new FlouciProvider();
