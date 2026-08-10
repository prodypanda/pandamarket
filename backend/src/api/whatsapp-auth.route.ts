import { Router, Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { UserRole } from '@pandamarket/types';
import { asyncHandler } from '../middlewares';
import { smsService } from '../services/sms.service';
import { authService } from '../services/auth.service';
import { orderService } from '../services/order.service';
import { config } from '../config';

import { platformConfigService } from '../services/platform-config.service';

const router = Router();

async function getGatewayCredentials() {
  const settings = await platformConfigService.getSettings();
  const rawUrl = (settings as any).whatsapp_gateway_url || config.sms.whatsappGatewayUrl || 'https://evolution-api-5x9s.onrender.com';
  const token = (settings as any).whatsapp_gateway_token || config.sms.whatsappGatewayToken || 'sRdf4D54F1SDnuF511dvs541f21dvs51VsF21sGRfs541p2ou900a';
  const instance = (settings as any).whatsapp_gateway_instance || 'pandamarket';
  const baseUrl = rawUrl.split('/message/')[0].replace(/\/+$/, '');
  return { settings, rawUrl, token, instance, baseUrl };
}

/**
 * Get JSON live status of WhatsApp Evolution API instance
 */
router.get(
  '/status',
  asyncHandler(async (_req: Request, res: Response) => {
    const { settings, rawUrl, token, instance, baseUrl } = await getGatewayCredentials();
    const provider = settings.notifications_sms_provider || 'whatsapp_gateway';

    try {
      const response = await axios.get(`${baseUrl}/instance/connectionState/${instance}`, {
        headers: { apikey: token },
        timeout: 5000,
      });

      const state = response.data?.instance?.state || 'close';
      res.json({
        success: true,
        data: {
          state,
          provider,
          instanceName: instance,
          baseUrl,
          gatewayUrl: rawUrl,
          rawResponse: response.data,
        },
      });
    } catch (err: any) {
      res.json({
        success: false,
        data: {
          state: 'disconnected',
          provider,
          instanceName: instance,
          baseUrl,
          error: err.message,
        },
      });
    }
  }),
);

/**
 * Get JSON live QR Code and connection state for admin dashboard
 */
router.get(
  '/qr-data',
  asyncHandler(async (_req: Request, res: Response) => {
    const { token, instance, baseUrl } = await getGatewayCredentials();

    try {
      const response = await axios.get(`${baseUrl}/instance/connect/${instance}`, {
        headers: { apikey: token },
        timeout: 8000,
      });

      const base64 = response.data?.base64 || response.data?.code || null;
      const state = response.data?.instance?.state || 'close';

      res.json({
        success: true,
        data: {
          state,
          base64,
          pairingCode: response.data?.pairingCode || null,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.response?.data?.message || err.message,
      });
    }
  }),
);

/**
 * Generate 8-digit WhatsApp Pairing Code for phone number
 */
router.post(
  '/pair-code',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({ phone: z.string().min(8) });
    const parsed = schema.parse(req.body);
    const { token, instance, baseUrl } = await getGatewayCredentials();

    const cleanPhone = parsed.phone.replace(/\D/g, '');

    try {
      const response = await axios.get(`${baseUrl}/instance/connect/${instance}?number=${cleanPhone}`, {
        headers: { apikey: token },
        timeout: 10000,
      });

      res.json({
        success: true,
        data: {
          pairingCode: response.data?.pairingCode || response.data?.code || null,
          state: response.data?.instance?.state || 'connecting',
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.response?.data?.message || err.message,
      });
    }
  }),
);

/**
 * Disconnect / Logout WhatsApp instance to allow re-pairing
 */
router.post(
  '/logout',
  asyncHandler(async (_req: Request, res: Response) => {
    const { token, instance, baseUrl } = await getGatewayCredentials();

    try {
      await axios.delete(`${baseUrl}/instance/logout/${instance}`, {
        headers: { apikey: token },
        timeout: 8000,
      });

      res.json({ success: true, message: 'Session WhatsApp déconnectée avec succès' });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.response?.data?.message || err.message,
      });
    }
  }),
);

/**
 * Send test WhatsApp OTP message from Admin panel
 */
router.post(
  '/test-send',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      phone: z.string().min(8, 'Numéro de téléphone invalide'),
    });
    const parsed = schema.parse(req.body);

    const result = await smsService.sendWhatsAppOtp(parsed.phone);

    res.json({
      success: true,
      message: result.message,
      dev_otp: result.otpForDev,
    });
  }),
);

/**
 * Render HTML page displaying live WhatsApp QR Code from Evolution API.
 */
router.get(
  '/qr-code',
  asyncHandler(async (_req: Request, res: Response) => {
    const { token, instance, baseUrl } = await getGatewayCredentials();

    if (!baseUrl || !token) {
      res.status(400).send('<h3>Passerelle WhatsApp non configurée.</h3>');
      return;
    }

    try {
      const connectUrl = `${baseUrl}/instance/connect/${instance}`;

      const response = await axios.get(connectUrl, {
        headers: { apikey: token },
      });

      const qrImage = response.data?.base64 || response.data?.code;
      const state = response.data?.instance?.state || 'close';

      if (state === 'open' || !qrImage) {
        res.setHeader('Content-Type', 'text/html');
        res.send(`
          <div style="font-family:system-ui;text-align:center;padding:50px;">
            <h2 style="color:#25D366;font-size:24px;">✅ WhatsApp est Déjà Connecté !</h2>
            <p style="color:#64748b;">Votre numéro WhatsApp est associé et prêt à envoyer des codes OTP en direct sur PandaMarket.</p>
          </div>
        `);
        return;
      }

      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>PandaMarket - Scanner QR Code WhatsApp</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: white; color: #0f172a; padding: 32px; border-radius: 28px; text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.5); max-width: 380px; w-width: 100%; }
            img { width: 260px; height: 260px; border-radius: 18px; margin: 16px 0; border: 3px solid #25D366; }
            h2 { margin: 0; color: #0f172a; font-size: 22px; font-weight: 900; }
            p { font-size: 13px; color: #64748b; margin-top: 8px; line-height: 1.5; font-weight: 500; }
            .step { background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 18px; border-radius: 16px; font-size: 12px; font-weight: 700; margin-top: 18px; color: #1e293b; text-align: left; line-height: 1.7; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Connecter WhatsApp 📱</h2>
            <p>Scannez ce QR Code avec votre téléphone pour activer l'envoi de SMS / WhatsApp OTP sur PandaMarket.</p>
            <img src="${qrImage}" alt="WhatsApp QR Code" />
            <div class="step">
              1. Ouvrez WhatsApp sur votre téléphone<br>
              2. Allez dans <strong>Réglages ➔ Appareils connectés</strong><br>
              3. Appuyez sur <strong>Lier un appareil</strong> et scannez ce code.
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (err: any) {
      res.status(500).send(`<h3>Erreur de connexion Evolution API: ${err.message}</h3>`);
    }
  }),
);

function setAccessCookie(res: Response, accessToken: string) {
  res.cookie('pd_at', accessToken, {
    httpOnly: true,
    secure: process.env.PD_NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });
}

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie('pd_rt', refreshToken, {
    httpOnly: true,
    secure: process.env.PD_NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/pd/auth',
  });
}

/**
 * Send a 6-digit WhatsApp OTP code to the provided phone number.
 */
router.post(
  '/send-otp',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      phone: z.string().min(8, 'Numéro de téléphone requis'),
    });
    const parsed = schema.parse(req.body);
    const result = await smsService.sendWhatsAppOtp(parsed.phone);

    res.status(200).json({
      success: true,
      message: result.message,
      dev_otp: result.otpForDev,
    });
  }),
);

/**
 * Verify WhatsApp 6-digit OTP code and log in or register seller/buyer.
 */
router.post(
  '/verify-otp',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      phone: z.string().min(8),
      otp: z.string().length(6, 'Le code doit contenir 6 chiffres'),
      role: z.nativeEnum(UserRole).optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    });

    const parsed = schema.parse(req.body);
    const secContext = {
      ip: req.ip || '',
      userAgent: (req.headers['user-agent'] as string) || '',
    };

    const { user, tokens, is_new_user } = await authService.loginOrRegisterWithWhatsApp(
      {
        phone: parsed.phone,
        otp: parsed.otp,
        role: parsed.role,
        first_name: parsed.first_name,
        last_name: parsed.last_name,
      },
      secContext,
    );

    setAccessCookie(res, tokens.access_token);
    setRefreshCookie(res, tokens.refresh_token);

    res.status(200).json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          store_id: user.store_id,
          phone: user.phone,
          email_verified: user.email_verified,
        },
        tokens,
        is_new_user,
      },
    });
  }),
);

/**
 * Fast WhatsApp Checkout: OTP verification + Auto Auth + Order Placement in 1 step.
 */
router.post(
  '/fast-checkout',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      phone: z.string().min(8),
      otp: z.string().length(6),
      first_name: z.string().min(1, 'Prénom requis'),
      last_name: z.string().min(1, 'Nom requis'),
      address_line_1: z.string().min(3, 'Adresse requise'),
      city: z.string().min(2, 'Ville requise'),
      governorate: z.string().optional(),
      payment_gateway: z.string().default('cod'),
      items: z
        .array(
          z.object({
            product_id: z.string(),
            variant_id: z.string().nullable().optional(),
            quantity: z.number().int().positive(),
            store_id: z.string().optional(),
          }),
        )
        .min(1, 'Au moins un produit est requis'),
      notes: z.string().optional(),
    });

    const parsed = schema.parse(req.body);
    const secContext = {
      ip: req.ip || '',
      userAgent: (req.headers['user-agent'] as string) || '',
    };

    // 1. Verify WhatsApp OTP & Auth User
    const { user, tokens, is_new_user } = await authService.loginOrRegisterWithWhatsApp(
      {
        phone: parsed.phone,
        otp: parsed.otp,
        role: UserRole.Customer,
        first_name: parsed.first_name,
        last_name: parsed.last_name,
      },
      secContext,
    );

    setAccessCookie(res, tokens.access_token);
    setRefreshCookie(res, tokens.refresh_token);

    // 2. Prepare shipping address payload
    const shippingAddress = {
      first_name: parsed.first_name,
      last_name: parsed.last_name,
      email: user.email,
      phone: parsed.phone,
      address_line_1: parsed.address_line_1,
      city: parsed.city,
      state: parsed.governorate || parsed.city,
      country: 'TN',
      postal_code: '1000',
    };

    // 3. Create Order via orderService.checkout
    const order = await orderService.checkout({
      customer_id: user.id,
      payment_gateway: parsed.payment_gateway as any,
      items: parsed.items.map((it) => ({
        product_id: it.product_id,
        variant_id: it.variant_id ?? undefined,
        quantity: it.quantity,
      })),
      shipping_address: shippingAddress as any,
    });

    res.status(201).json({
      data: {
        order,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
        },
        is_new_user,
      },
    });
  }),
);

export default router;
