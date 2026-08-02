import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storefrontAuthService } from '../services/storefront-auth.service';
import { asyncHandler, authRateLimit, requireStorefrontCustomer, validate } from '../middlewares';

const router = Router();

const storefrontRegisterSchema = z.object({
  store_id: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().optional(),
});

const storefrontLoginSchema = z.object({
  store_id: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

const storefrontVerifyEmailSchema = z.object({
  store_id: z.string().min(1),
  token: z.string().min(1),
});

const storefrontForgotPasswordSchema = z.object({
  store_id: z.string().min(1),
  email: z.string().email(),
});

const storefrontResetPasswordSchema = z.object({
  store_id: z.string().min(1),
  token: z.string().min(1),
  password: z.string().min(8),
});

const storefrontRefreshSchema = z.object({
  refresh_token: z.string().optional(),
});

function setStorefrontCookies(res: Response, accessToken: string, refreshToken?: string) {
  res.cookie('pd_storefront_at', accessToken, {
    httpOnly: true,
    secure: process.env.PD_NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  if (refreshToken) {
    res.cookie('pd_storefront_rt', refreshToken, {
      httpOnly: true,
      secure: process.env.PD_NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }
}

router.post(
  '/register',
  authRateLimit,
  validate(storefrontRegisterSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await storefrontAuthService.register(req.body);
    const access_token = storefrontAuthService.issueAccessToken(result.customer);
    setStorefrontCookies(res, access_token);
    res.status(201).json({ customer: result.customer, tokens: { access_token }, verify_token: result.verify_token });
  }),
);

router.post(
  '/login',
  authRateLimit,
  validate(storefrontLoginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const meta = { userAgent: req.headers['user-agent'], ipAddress: req.ip };
    const result = await storefrontAuthService.login(req.body.store_id, req.body.email, req.body.password, meta);
    setStorefrontCookies(res, result.access_token, result.refresh_token);
    res.status(200).json({ customer: result.customer, tokens: { access_token: result.access_token, refresh_token: result.refresh_token } });
  }),
);

router.post(
  '/verify-email',
  validate(storefrontVerifyEmailSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await storefrontAuthService.verifyEmail(req.body.store_id, req.body.token);
    res.status(200).json({ success: true, message: 'Email verified successfully' });
  }),
);

router.post(
  '/forgot-password',
  authRateLimit,
  validate(storefrontForgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await storefrontAuthService.forgotPassword(req.body.store_id, req.body.email);
    res.status(200).json({ success: true, message: 'If an account exists, a password reset email has been sent.' });
  }),
);

router.post(
  '/reset-password',
  authRateLimit,
  validate(storefrontResetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await storefrontAuthService.resetPassword(req.body.store_id, req.body.token, req.body.password);
    res.clearCookie('pd_storefront_at');
    res.clearCookie('pd_storefront_rt');
    res.status(200).json({ success: true, message: 'Password has been reset successfully. Please log in.' });
  }),
);

router.post(
  '/refresh',
  validate(storefrontRefreshSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies?.pd_storefront_rt || req.body.refresh_token;
    if (!rawRefreshToken) {
      res.status(401).json({ error: { message: 'Refresh token required' } });
      return;
    }
    const result = await storefrontAuthService.refreshSession(rawRefreshToken);
    setStorefrontCookies(res, result.access_token, result.refresh_token);
    res.status(200).json({ tokens: { access_token: result.access_token, refresh_token: result.refresh_token } });
  }),
);

router.get(
  '/me',
  requireStorefrontCustomer,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storefrontAuthService.getById(req.storefrontCustomer!.id, req.storefrontCustomer!.store_id);
    res.status(200).json({ customer, data: customer });
  }),
);

router.post(
  '/logout',
  requireStorefrontCustomer,
  asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie('pd_storefront_at');
    res.clearCookie('pd_storefront_rt');
    res.status(200).json({ success: true });
  }),
);

router.get(
  '/sessions',
  requireStorefrontCustomer,
  asyncHandler(async (req: Request, res: Response) => {
    const sessions = await storefrontAuthService.listSessions(req.storefrontCustomer!.id, req.storefrontCustomer!.store_id);
    res.status(200).json({ sessions, data: sessions });
  }),
);

router.delete(
  '/sessions/:id',
  requireStorefrontCustomer,
  asyncHandler(async (req: Request, res: Response) => {
    await storefrontAuthService.revokeSession(req.storefrontCustomer!.id, req.storefrontCustomer!.store_id, req.params.id);
    res.status(200).json({ success: true });
  }),
);

export default router;
