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

const storefrontMeSchema = z.object({
  store_id: z.string().min(1),
});

function setStorefrontCookie(res: Response, accessToken: string) {
  res.cookie('pd_storefront_at', accessToken, {
    httpOnly: true,
    secure: process.env.PD_NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });
}

router.post(
  '/register',
  authRateLimit,
  validate(storefrontRegisterSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storefrontAuthService.register(req.body);
    const access_token = storefrontAuthService.issueAccessToken(customer);
    setStorefrontCookie(res, access_token);
    res.status(201).json({ customer, tokens: { access_token } });
  }),
);

router.post(
  '/login',
  authRateLimit,
  validate(storefrontLoginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storefrontAuthService.login(req.body.store_id, req.body.email, req.body.password);
    const access_token = storefrontAuthService.issueAccessToken(customer);
    setStorefrontCookie(res, access_token);
    res.status(200).json({ customer, tokens: { access_token } });
  }),
);

router.get(
  '/me',
  validate(storefrontMeSchema, 'query'),
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
    res.status(200).json({ success: true });
  }),
);

export default router;
