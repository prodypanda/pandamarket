/**
 * PayPal REST API payment provider.
 * Docs: https://developer.paypal.com/docs/api/orders/v2/
 */

import axios from 'axios';
import {
  PaymentInitContext,
  PaymentInitResult,
  PaymentProvider,
  PaymentVerifyResult,
} from './payment-provider.interface';
import { config } from '../../config';
import { platformConfigService } from '../../services/platform-config.service';
import { PdError, PdErrorCode } from '../../errors';
import { PaymentGateway } from '@pandamarket/types';
import { logger } from '../../utils/logger';

export class PayPalProvider implements PaymentProvider {
  readonly gateway = PaymentGateway.PayPal;

  private async getCredentials(vendor_credentials?: Record<string, string>) {
    const settings = await platformConfigService.getSettings();
    const mode = (settings.payment_paypal_mode as 'sandbox' | 'live') || config.paypal.mode || 'sandbox';

    let clientId = vendor_credentials?.paypal_client_id;
    let clientSecret = vendor_credentials?.paypal_client_secret;
    let webhookId = '';

    if (!clientId || !clientSecret) {
      if (mode === 'live') {
        clientId = (settings.payment_paypal_live_client_id as string) || config.paypal.clientId;
        clientSecret = (settings.payment_paypal_live_client_secret as string) || config.paypal.clientSecret;
        webhookId = (settings.payment_paypal_live_webhook_id as string) || config.paypal.webhookId;
      } else {
        clientId = (settings.payment_paypal_sandbox_client_id as string) || config.paypal.clientId;
        clientSecret = (settings.payment_paypal_sandbox_client_secret as string) || config.paypal.clientSecret;
        webhookId = (settings.payment_paypal_sandbox_webhook_id as string) || config.paypal.webhookId;
      }
    }

    const baseUrl = mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const targetCurrency = (settings.payment_paypal_currency as string) || 'EUR';
    const fxRate = Number(settings.payment_paypal_fx_rate_tnd_to_target) || 0.30;

    return { clientId, clientSecret, webhookId, mode, baseUrl, targetCurrency, fxRate };
  }

  private async getAccessToken(clientId: string, clientSecret: string, baseUrl: string): Promise<string> {
    if (!clientId || !clientSecret) {
      throw new Error('PayPal Client ID or Client Secret missing for the selected environment mode');
    }
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const { data } = await axios.post(
      `${baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10_000,
      },
    );
    return data.access_token;
  }

  async init(ctx: PaymentInitContext): Promise<PaymentInitResult> {
    const creds = await this.getCredentials(ctx.vendor_credentials);

    try {
      const accessToken = await this.getAccessToken(creds.clientId, creds.clientSecret, creds.baseUrl);

      let currencyCode = (ctx.currency || 'USD').toUpperCase();
      let amountValue = ctx.amount;

      // Convert TND to PayPal supported currency (EUR/USD) using configured exchange rate
      if (currencyCode === 'TND') {
        currencyCode = creds.targetCurrency;
        amountValue = Math.round(ctx.amount * creds.fxRate * 100) / 100;
      }

      const { data } = await axios.post(
        `${creds.baseUrl}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: ctx.order_id,
              description: `Order ${ctx.order_id} on PandaMarket`,
              amount: {
                currency_code: currencyCode,
                value: amountValue.toFixed(2),
              },
            },
          ],
          application_context: {
            brand_name: 'PandaMarket',
            user_action: 'PAY_NOW',
            return_url: ctx.success_url,
            cancel_url: ctx.fail_url,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
        },
      );

      const orderId = data?.id;
      const approveLink = data?.links?.find((l: { rel: string; href: string }) => l.rel === 'approve')?.href;

      if (!orderId || !approveLink) {
        throw new Error('PayPal returned no order ID or approve link');
      }

      return {
        redirect_url: approveLink,
        gateway_reference: orderId,
        metadata: {
          provider: 'paypal',
          mode: creds.mode,
          original_amount_tnd: ctx.amount,
          converted_amount: amountValue,
          currency: currencyCode,
        },
      };
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'PayPal init failed');
      throw new PdError(
        PdErrorCode.PAY_INIT_FAILED,
        'Failed to initialise PayPal payment',
        502,
        { gateway: 'paypal' },
      );
    }
  }

  async verify(
    reference: string,
    vendor_credentials?: Record<string, string>,
  ): Promise<PaymentVerifyResult> {
    const creds = await this.getCredentials(vendor_credentials);
    try {
      const accessToken = await this.getAccessToken(creds.clientId, creds.clientSecret, creds.baseUrl);

      const getRes = await axios.get(`${creds.baseUrl}/v2/checkout/orders/${reference}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10_000,
      });

      const orderStatus = getRes.data?.status;
      let capturedAmount = Number(getRes.data?.purchase_units?.[0]?.amount?.value ?? 0);

      if (orderStatus === 'COMPLETED') {
        return {
          status: 'captured',
          amount: capturedAmount,
          metadata: { provider_status: orderStatus },
        };
      }

      if (orderStatus === 'APPROVED') {
        const captureRes = await axios.post(
          `${creds.baseUrl}/v2/checkout/orders/${reference}/capture`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10_000,
          },
        );
        const captureStatus = captureRes.data?.status;
        const captured = captureStatus === 'COMPLETED';
        return {
          status: captured ? 'captured' : 'failed',
          amount: capturedAmount,
          metadata: { provider_status: captureStatus },
        };
      }

      return {
        status: 'failed',
        amount: capturedAmount,
        metadata: { provider_status: orderStatus },
      };
    } catch (err) {
      logger.error({ err: (err as Error).message, reference }, 'PayPal verify failed');
      throw new PdError(
        PdErrorCode.PAY_VERIFICATION_FAILED,
        'Failed to verify PayPal payment',
        502,
        { gateway: 'paypal' },
      );
    }
  }

  /**
   * Verify inbound PayPal Webhook signature via PayPal REST API
   */
  async verifyWebhookSignature(headers: Record<string, string>, rawBody: Record<string, unknown>): Promise<boolean> {
    try {
      const creds = await this.getCredentials();
      if (!creds.webhookId) {
        logger.warn('PayPal Webhook ID is not configured — skipping signature check in dev mode');
        return true;
      }
      const accessToken = await this.getAccessToken(creds.clientId, creds.clientSecret, creds.baseUrl);

      const { data } = await axios.post(
        `${creds.baseUrl}/v1/notifications/verify-webhook-signature`,
        {
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: creds.webhookId,
          webhook_event: rawBody,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
        },
      );

      return data?.verification_status === 'SUCCESS';
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'PayPal webhook signature verification failed');
      return false;
    }
  }
}

export const paypalProvider = new PayPalProvider();
