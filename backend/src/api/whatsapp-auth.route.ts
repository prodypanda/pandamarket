import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserRole } from '@pandamarket/types';
import { asyncHandler } from '../middlewares';
import { smsService } from '../services/sms.service';
import { authService } from '../services/auth.service';
import { orderService } from '../services/order.service';

const router = Router();

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
