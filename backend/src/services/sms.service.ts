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
 * Normalise a Tunisian phone number to +216XXXXXXXX format.
 */
function normalisePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-().]/g, '');
  // If starts with 00216, replace with +216
  if (cleaned.startsWith('00216')) {
    cleaned = '+216' + cleaned.slice(5);
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
  return cleaned;
}

type SmsProvider = 'twilio' | 'infobip' | 'whatsapp_gateway' | 'console';

function configuredSmsProvider(settings: PlatformSettings): SmsProvider {
  const provider = String(settings.notifications_sms_provider || 'environment');
  if (provider === 'twilio' || provider === 'infobip' || provider === 'whatsapp_gateway' || provider === 'console') return provider;
  return config.sms.provider;
}

function configuredSmsSender(settings: PlatformSettings): string {
  const sender = String(settings.notifications_sms_sender_name || '').trim();
  return sender || 'PandaMarket';
}

export class SmsService {
  /**
   * Send an OTP to the given phone number.
   * Returns true if sent successfully.
   */
  async sendOtp(phone: string): Promise<{ sent: boolean; message: string }> {
    const normalised = normalisePhone(phone);

    // Validate format
    if (!/^\+216\d{8}$/.test(normalised)) {
      throw new PdValidationError('Invalid Tunisian phone number. Expected format: +216XXXXXXXX');
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
   * Send a general SMS / WhatsApp notification message to a recipient.
   */
  async sendSms(to: string, message: string): Promise<boolean> {
    const normalised = normalisePhone(to);
    const settings = await platformConfigService.getSettings();
    if (!settings.notifications_sms_enabled) {
      logger.info('SMS notifications disabled in platform settings');
      return false;
    }
    const provider = configuredSmsProvider(settings);
    const sender = configuredSmsSender(settings);
    return this.dispatchSms(normalised, message, provider, sender);
  }

  /**
   * Dispatch SMS via the configured provider.
   */
  private async dispatchSms(to: string, message: string, provider: SmsProvider, sender: string): Promise<boolean> {
    switch (provider) {
      case 'whatsapp_gateway':
        return this.sendViaWhatsAppGateway(to, message);
      case 'twilio':
        return this.sendViaTwilio(to, message);
      case 'infobip':
        return this.sendViaInfobip(to, message, sender);
      case 'console':
      default:
        // Development fallback — sanitize phone and never leak plain OTP to production logs
        if (config.env === 'production') {
          logger.info({ to: to.slice(0, 7) + '****' }, '[SMS] Dispatched OTP via console stub in production mode');
        } else {
          logger.info({ to: to.slice(0, 7) + '****' }, '[SMS DEV] Would send SMS (suppressed OTP logging)');
        }
        return false;
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

  /**
   * Send WhatsApp message via Evolution API gateway.
   */
  private async sendViaWhatsAppGateway(to: string, message: string): Promise<boolean> {
    const gatewayUrl = config.sms.whatsappGatewayUrl;
    const token = config.sms.whatsappGatewayToken;
    if (!gatewayUrl || !token) {
      logger.warn('WhatsApp gateway credentials not configured (PD_WHATSAPP_GATEWAY_URL or PD_WHATSAPP_GATEWAY_TOKEN missing)');
      return false;
    }

    try {
      // Format number without + (e.g. 216XXXXXXXX)
      const recipientNumber = to.replace(/\+/g, '').trim();
      const response = await axios.post(
        `${gatewayUrl.replace(/\/+$/, '')}/message/sendText/default`,
        {
          number: recipientNumber,
          text: message,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: token,
          },
          timeout: 10_000,
        },
      );

      return response.status >= 200 && response.status < 300;
    } catch (err: any) {
      logger.error(
        { error: err?.message, to: to.slice(0, 7) + '****' },
        'Failed to send message via WhatsApp gateway',
      );
      return false;
    }
  }
}

export const smsService = new SmsService();
