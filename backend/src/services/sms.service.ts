/**
 * SmsService — Phone verification for KYC step 2.
 *
 * Supports multiple providers:
 *   - Twilio (international)
 *   - Infobip (Tunisia-friendly)
 *   - Console/log fallback (development)
 *
 * Flow:
 *   1. Vendor submits phone number during KYC
 *   2. System sends a 6-digit OTP via SMS
 *   3. Vendor enters the OTP in the dashboard
 *   4. System verifies the OTP and marks phone_verified = true
 *
 * OTP is stored in Redis with a 10-minute TTL.
 */

import { getRedis, withRedisTimeout } from '../db/redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { PdValidationError, PdRateLimitError } from '../errors';
import { randomInt } from 'node:crypto';
import axios from 'axios';
import { platformConfigService, type PlatformSettings } from './platform-config.service';

const OTP_TTL_SECONDS = 600; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_LIMIT_SECONDS = 60; // 1 OTP per minute per phone

function otpKey(phone: string): string {
  return `pd:otp:${phone}`;
}

function otpAttemptsKey(phone: string): string {
  return `pd:otp_attempts:${phone}`;
}

function otpRateLimitKey(phone: string): string {
  return `pd:otp_rate:${phone}`;
}

/**
 * Generate a cryptographically random 6-digit OTP.
 */
function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

/**
 * Normalise a phone number to E.164 format (+216XXXXXXXX or +<country_code><number>).
 */
export function normalisePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-().]/g, '');
  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }
  // If starts with 216 (no +), add +
  if (cleaned.startsWith('216') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  // If starts with 0 and is 8+ digits, assume Tunisian local
  if (cleaned.startsWith('0') && cleaned.length >= 8) {
    cleaned = '+216' + cleaned.slice(1);
  }
  // If just 8 digits (no prefix), assume Tunisian
  if (/^\d{8}$/.test(cleaned)) {
    cleaned = '+216' + cleaned;
  }
  // If digits only without +, prepend + if looks like E.164
  if (/^\d{9,15}$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

type SmsProvider = 'twilio' | 'infobip' | 'meta_whatsapp' | 'whatsapp_gateway' | 'console';

function configuredSmsProvider(settings: PlatformSettings): SmsProvider {
  const provider = String(settings.notifications_sms_provider || 'environment');
  if (
    provider === 'twilio' ||
    provider === 'infobip' ||
    provider === 'meta_whatsapp' ||
    provider === 'whatsapp_gateway' ||
    provider === 'console'
  ) return provider as SmsProvider;
  return config.sms.provider;
}

function configuredSmsSender(settings: PlatformSettings): string {
  const sender = String(settings.notifications_sms_sender_name || '').trim();
  return sender || 'PandaMarket';
}

export class SmsService {
  /**
   * Send a WhatsApp 6-digit OTP code to the given phone number.
   */
  async sendWhatsAppOtp(phone: string): Promise<{ sent: boolean; message: string; otpForDev?: string }> {
    const normalised = normalisePhone(phone);

    if (!/^\+\d{8,15}$/.test(normalised)) {
      throw new PdValidationError('Numéro de téléphone invalide. Exemple: +216 98 123 456');
    }

    const redis = getRedis();

    // Rate limit: 1 OTP per minute per phone
    const rateLimited = await withRedisTimeout(redis.get(otpRateLimitKey(normalised)));
    if (rateLimited) {
      throw new PdRateLimitError(OTP_RATE_LIMIT_SECONDS);
    }

    // Generate OTP
    const otp = generateOtp();

    // Store in Redis
    await withRedisTimeout(redis.setex(otpKey(normalised), OTP_TTL_SECONDS, otp));
    await withRedisTimeout(redis.del(otpAttemptsKey(normalised))); // Reset attempts
    await withRedisTimeout(redis.setex(otpRateLimitKey(normalised), OTP_RATE_LIMIT_SECONDS, '1'));

    const settings = await platformConfigService.getSettings();
    const sender = configuredSmsSender(settings);
    const message = `📱 ${sender}: Votre code de vérification WhatsApp est ${otp}. Valide pendant 10 minutes.`;

    // Attempt dispatch via Twilio WhatsApp / Infobip / SMS Fallback
    const sent = await this.dispatchWhatsAppOrSms(normalised, message, settings);

    logger.info({ phone: normalised.slice(0, 7) + '****', sent, devOtp: sent ? undefined : otp }, 'WhatsApp OTP generated');

    return {
      sent,
      message: sent
        ? 'Code de vérification envoyé sur votre WhatsApp'
        : `Code de vérification généré : ${otp} (mode dev)`,
      otpForDev: sent ? undefined : otp,
    };
  }

  /**
   * Send an OTP to the given phone number via SMS.
   * Returns true if sent successfully.
   */
  async sendOtp(phone: string): Promise<{ sent: boolean; message: string }> {
    const normalised = normalisePhone(phone);

    // Validate format
    if (!/^\+\d{8,15}$/.test(normalised)) {
      throw new PdValidationError('Invalid phone number. Expected format: +216XXXXXXXX');
    }

    const settings = await platformConfigService.getSettings();
    if (!settings.notifications_sms_enabled) {
      logger.info({ phone: normalised.slice(0, 7) + '****' }, 'SMS OTP skipped by platform settings');
      return { sent: false, message: 'SMS verification is disabled by platform settings' };
    }

    const redis = getRedis();

    // Rate limit: 1 OTP per minute per phone
    const rateLimited = await withRedisTimeout(redis.get(otpRateLimitKey(normalised)));
    if (rateLimited) {
      throw new PdRateLimitError(OTP_RATE_LIMIT_SECONDS);
    }

    // Generate OTP
    const otp = generateOtp();

    // Store in Redis
    await withRedisTimeout(redis.setex(otpKey(normalised), OTP_TTL_SECONDS, otp));
    await withRedisTimeout(redis.del(otpAttemptsKey(normalised))); // Reset attempts
    await withRedisTimeout(redis.setex(otpRateLimitKey(normalised), OTP_RATE_LIMIT_SECONDS, '1'));

    // Send via configured provider
    const sent = await this.dispatchSms(
      normalised,
      `${configuredSmsSender(settings)}: Votre code de vérification est ${otp}. Valide pendant 10 minutes.`,
      configuredSmsProvider(settings),
      configuredSmsSender(settings),
    );

    if (sent) {
      logger.info({ phone: normalised.slice(0, 7) + '****' }, 'OTP sent');
    }

    return {
      sent,
      message: sent
        ? 'Code de vérification envoyé par SMS'
        : 'Code de vérification généré (vérifiez les logs en mode développement)',
    };
  }

  /**
   * Verify an OTP entered by the user.
   */
  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const normalised = normalisePhone(phone);
    const redis = getRedis();

    // Check attempt count
    const attempts = parseInt((await withRedisTimeout(redis.get(otpAttemptsKey(normalised)))) ?? '0', 10);
    if (attempts >= OTP_MAX_ATTEMPTS) {
      // Delete the OTP to force re-send
      await withRedisTimeout(redis.del(otpKey(normalised)));
      throw new PdValidationError('Too many failed attempts. Please request a new code.');
    }

    // Get stored OTP
    const storedOtp = await withRedisTimeout(redis.get(otpKey(normalised)));
    if (!storedOtp) {
      throw new PdValidationError('Code expired or not found. Please request a new code.');
    }

    // Increment attempts
    await withRedisTimeout(redis.incr(otpAttemptsKey(normalised)));
    await withRedisTimeout(redis.expire(otpAttemptsKey(normalised), OTP_TTL_SECONDS));

    // Constant-time comparison (prevent timing attacks)
    if (otp.length !== storedOtp.length) return false;
    let mismatch = 0;
    for (let i = 0; i < otp.length; i++) {
      mismatch |= otp.charCodeAt(i) ^ storedOtp.charCodeAt(i);
    }

    if (mismatch !== 0) {
      return false;
    }

    // OTP is valid — clean up
    await withRedisTimeout(redis.del(otpKey(normalised)));
    await withRedisTimeout(redis.del(otpAttemptsKey(normalised)));

    logger.info({ phone: normalised.slice(0, 7) + '****' }, 'OTP verified successfully');
    return true;
  }

  /**
   * Dispatch WhatsApp or SMS message via configured provider.
   */
  private async dispatchWhatsAppOrSms(to: string, message: string, settings: PlatformSettings): Promise<boolean> {
    const provider = configuredSmsProvider(settings);
    const sender = configuredSmsSender(settings);

    const metaToken = (settings as any).meta_whatsapp_token || config.sms.metaWhatsappToken;
    const metaPhoneId = (settings as any).meta_whatsapp_phone_id || config.sms.metaWhatsappPhoneId;

    const gwUrl = (settings as any).whatsapp_gateway_url || config.sms.whatsappGatewayUrl;
    const gwToken = (settings as any).whatsapp_gateway_token || config.sms.whatsappGatewayToken;
    const gwInstance = (settings as any).whatsapp_gateway_instance || 'pandamarket';

    // 1. Meta WhatsApp Cloud API (Direct Official Meta — 1,000 free conversations/month)
    if (provider === 'meta_whatsapp' || (metaToken && metaPhoneId)) {
      const metaSent = await this.sendViaMetaWhatsAppCloudApi(to, message, metaToken, metaPhoneId);
      if (metaSent) return true;
    }

    // 2. Custom WhatsApp Gateway / Evolution API (QR Code scan)
    if (provider === 'whatsapp_gateway' || gwUrl) {
      const gwSent = await this.sendViaCustomWhatsAppGateway(to, message, gwUrl, gwToken, gwInstance);
      if (gwSent) return true;
    }

    // 3. Twilio WhatsApp
    if (provider === 'twilio' && config.sms.twilioAccountSid && config.sms.twilioAuthToken) {
      const waSent = await this.sendViaTwilioWhatsApp(to, message);
      if (waSent) return true;
    }

    // Fallback to SMS dispatch
    return this.dispatchSms(to, message, provider, sender);
  }

  private async sendViaMetaWhatsAppCloudApi(to: string, message: string, token?: string, phoneId?: string): Promise<boolean> {
    try {
      const authToken = token || config.sms.metaWhatsappToken;
      const pid = phoneId || config.sms.metaWhatsappPhoneId;
      if (!authToken || !pid) {
        logger.warn('Meta WhatsApp Cloud API credentials not configured');
        return false;
      }

      const cleanTo = to.replace(/\D/g, '');
      const url = `https://graph.facebook.com/v18.0/${pid}/messages`;

      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: { preview_url: false, body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
        },
      );
      return true;
    } catch (err) {
      logger.warn({ err }, 'Meta WhatsApp Cloud API dispatch failed');
      return false;
    }
  }

  private async sendViaCustomWhatsAppGateway(
    to: string,
    message: string,
    gatewayUrl?: string,
    gatewayToken?: string,
    instanceName: string = 'pandamarket',
  ): Promise<boolean> {
    try {
      let rawUrl = (gatewayUrl || config.sms.whatsappGatewayUrl || '').trim();
      const token = (gatewayToken || config.sms.whatsappGatewayToken || '').trim();
      if (!rawUrl) {
        logger.warn('Custom WhatsApp Gateway URL not configured');
        return false;
      }

      // Format Evolution API target URL
      let targetUrl = rawUrl;
      if (!targetUrl.includes('/message/sendText/')) {
        const baseUrl = targetUrl.replace(/\/+$/, '');
        targetUrl = `${baseUrl}/message/sendText/${instanceName}`;
      }

      const cleanTo = to.replace(/\D/g, '');
      await axios.post(
        targetUrl,
        {
          number: cleanTo,
          text: message,
          // Fallbacks for other generic gateways
          to: cleanTo,
          phone: cleanTo,
          message,
          body: message,
        },
        {
          headers: {
            ...(token ? { apikey: token, Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
          },
          timeout: 12_000,
        },
      );
      return true;
    } catch (err: any) {
      logger.warn({ err: err.message, status: err.response?.status, data: err.response?.data }, 'Custom WhatsApp Gateway dispatch failed');
      return false;
    }
  }

  private async sendViaTwilioWhatsApp(to: string, message: string): Promise<boolean> {
    try {
      const accountSid = config.sms.twilioAccountSid;
      const authToken = config.sms.twilioAuthToken;
      if (!accountSid || !authToken) {
        return false;
      }
      let from = config.sms.twilioFromNumber || '';
      if (!from.startsWith('whatsapp:')) {
        from = `whatsapp:${from}`;
      }

      const waTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      await axios.post(
        url,
        new URLSearchParams({ To: waTo, From: from, Body: message }),
        {
          auth: { username: accountSid, password: authToken },
          timeout: 10_000,
        },
      );
      return true;
    } catch (err) {
      logger.warn({ err }, 'Twilio WhatsApp message dispatch failed');
      return false;
    }
  }

  /**
   * Dispatch SMS via the configured provider.
   */
  private async dispatchSms(to: string, message: string, provider: SmsProvider, sender: string): Promise<boolean> {
    switch (provider) {
      case 'twilio':
        return this.sendViaTwilio(to, message);
      case 'infobip':
        return this.sendViaInfobip(to, message, sender);
      case 'console':
      default:
        // Development fallback — log to console
        logger.info({ to, message }, '[SMS DEV] Would send SMS');
        return false; // Return false to indicate it wasn't actually sent
    }
  }

  private async sendViaTwilio(to: string, message: string): Promise<boolean> {
    try {
      const accountSid = config.sms.twilioAccountSid;
      const authToken = config.sms.twilioAuthToken;
      const from = config.sms.twilioFromNumber;

      if (!accountSid || !authToken || !from) {
        logger.warn('Twilio credentials not configured');
        return false;
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      await axios.post(
        url,
        new URLSearchParams({ To: to, From: from, Body: message }),
        {
          auth: { username: accountSid, password: authToken },
          timeout: 10_000,
        },
      );
      return true;
    } catch (err) {
      logger.error({ err }, 'Twilio SMS send failed');
      return false;
    }
  }

  private async sendViaInfobip(to: string, message: string, sender: string): Promise<boolean> {
    try {
      const apiKey = config.sms.infobipApiKey;
      const baseUrl = config.sms.infobipBaseUrl;

      if (!apiKey || !baseUrl) {
        logger.warn('Infobip credentials not configured');
        return false;
      }

      await axios.post(
        `${baseUrl}/sms/2/text/advanced`,
        {
          messages: [
            {
              destinations: [{ to }],
              from: sender,
              text: message,
            },
          ],
        },
        {
          headers: {
            Authorization: `App ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
        },
      );
      return true;
    } catch (err) {
      logger.error({ err }, 'Infobip SMS send failed');
      return false;
    }
  }
}

export const smsService = new SmsService();
