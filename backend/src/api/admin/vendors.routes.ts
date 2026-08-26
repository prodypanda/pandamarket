import { query } from '../../db/pool';
import { PdErrorCode, PdNotFoundError } from '../../errors';
import { asyncHandler, validate } from '../../middlewares';
import { authService } from '../../services/auth.service';
import { storeService } from '../../services/store.service';
import { subscriptionService } from '../../services/subscription.service';
import { logger } from '../../utils/logger';
import { normalizePlanId } from '../../utils/plan-id';
import { SellerType, StoreStatus, SubscriptionType } from '@pandamarket/types';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

/** Vendor Management — extracted from admin.route.ts (E15 split). */
const router = Router();

const vendorListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  owner_id: z.string().max(80).optional(),
  status: z.nativeEnum(StoreStatus).optional(),
  verified_only: z.coerce.boolean().optional(),
  seller_type: z.nativeEnum(SellerType).optional(),
  pending_seller_type_request: z.coerce.boolean().optional(),
});

const vendorAccountListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  multi_store_only: z.coerce.boolean().optional(),
});

const buyerListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  email_verified: z.enum(['true', 'false']).optional(),
  has_orders: z.enum(['true', 'false']).optional(),
});

const updateVendorSellerTypeSchema = z.object({
  seller_type: z.nativeEnum(SellerType),
});

const rejectSellerTypeRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});

const vendorOwnerActionSchema = z.object({
  reason: z.string().max(500).optional(),
});

const updateVendorSubscriptionSchema = z.object({
  subscription_plan: z.string().transform((value) => normalizePlanId(value)),
  subscription_type: z.nativeEnum(SubscriptionType).default(SubscriptionType.Commission),
  subscription_expires_at: z.string().datetime().nullable().optional(),
});

router.get(
  '/vendor-accounts',
  validate(vendorAccountListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, multi_store_only } = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
      multi_store_only?: boolean;
    };
    const result = await storeService.listVendorAccountsForAdmin({
      page,
      limit,
      search,
      multiStoreOnly: multi_store_only,
    });
    res.status(200).json(result);
  }),
);

router.put(
  '/vendor-accounts/:id/suspend',
  validate(vendorOwnerActionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null }>(
      `UPDATE pd_user
       SET is_active = false,
           updated_at = NOW()
       WHERE id = $1
         AND role = $2
       RETURNING id, email`,
      [req.params.id, 'vendor'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Vendor account not found');
    await authService.logout(rows[0].id);
    logger.warn(
      { owner_id: rows[0].id, admin_id: req.user!.id, reason: req.body.reason },
      'Admin suspended vendor account',
    );
    res.status(200).json({ success: true, owner: rows[0] });
  }),
);

router.put(
  '/vendor-accounts/:id/reactivate',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null }>(
      `UPDATE pd_user
       SET is_active = true,
           updated_at = NOW()
       WHERE id = $1
         AND role = $2
       RETURNING id, email`,
      [req.params.id, 'vendor'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Vendor account not found');
    logger.info(
      { owner_id: rows[0].id, admin_id: req.user!.id },
      'Admin reactivated vendor account',
    );
    res.status(200).json({ success: true, owner: rows[0] });
  }),
);

router.put(
  '/vendor-accounts/:id/reset-2fa',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null }>(
      'SELECT id, email FROM pd_user WHERE id = $1 AND role = $2',
      [req.params.id, 'vendor'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Vendor account not found');
    await authService.resetTwoFactorForUser(rows[0].id);
    logger.warn({ owner_id: rows[0].id, admin_id: req.user!.id }, 'Admin reset vendor account 2FA');
    res.status(200).json({ success: true, owner: rows[0] });
  }),
);

router.get(
  '/buyers',
  validate(buyerListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, status, email_verified, has_orders } = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
      status?: 'active' | 'inactive';
      email_verified?: 'true' | 'false';
      has_orders?: 'true' | 'false';
    };
    const result = await storeService.listBuyersForAdmin({
      page,
      limit,
      search,
      status,
      emailVerified: email_verified === undefined ? undefined : email_verified === 'true',
      hasOrders: has_orders === undefined ? undefined : has_orders === 'true',
    });
    res.status(200).json(result);
  }),
);

router.put(
  '/buyers/:id/suspend',
  validate(vendorOwnerActionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null }>(
      `UPDATE pd_user
       SET is_active = false,
           updated_at = NOW()
       WHERE id = $1
         AND role = $2
       RETURNING id, email`,
      [req.params.id, 'customer'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Buyer account not found');
    await authService.logout(rows[0].id);
    logger.warn(
      { buyer_id: rows[0].id, admin_id: req.user!.id, reason: req.body.reason },
      'Admin suspended buyer account',
    );
    res.status(200).json({ success: true, buyer: rows[0] });
  }),
);

router.put(
  '/buyers/:id/reactivate',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null }>(
      `UPDATE pd_user
       SET is_active = true,
           updated_at = NOW()
       WHERE id = $1
         AND role = $2
       RETURNING id, email`,
      [req.params.id, 'customer'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Buyer account not found');
    logger.info(
      { buyer_id: rows[0].id, admin_id: req.user!.id },
      'Admin reactivated buyer account',
    );
    res.status(200).json({ success: true, buyer: rows[0] });
  }),
);

router.put(
  '/buyers/:id/reset-2fa',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null }>(
      'SELECT id, email FROM pd_user WHERE id = $1 AND role = $2',
      [req.params.id, 'customer'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Buyer account not found');
    await authService.resetTwoFactorForUser(rows[0].id);
    logger.warn({ buyer_id: rows[0].id, admin_id: req.user!.id }, 'Admin reset buyer account 2FA');
    res.status(200).json({ success: true, buyer: rows[0] });
  }),
);

router.put(
  '/buyers/:id/email-verification',
  validate(z.object({ email_verified: z.boolean() })),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ id: string; email: string | null; email_verified: boolean }>(
      `UPDATE pd_user
       SET email_verified = $2,
           updated_at = NOW()
       WHERE id = $1
         AND role = $3
       RETURNING id, email, email_verified`,
      [req.params.id, req.body.email_verified, 'customer'],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Buyer account not found');
    logger.info(
      { buyer_id: rows[0].id, admin_id: req.user!.id, email_verified: rows[0].email_verified },
      'Admin updated buyer email verification',
    );
    res.status(200).json({ success: true, buyer: rows[0] });
  }),
);

router.get(
  '/vendors',
  validate(vendorListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page,
      limit,
      search,
      owner_id,
      status,
      verified_only,
      seller_type,
      pending_seller_type_request,
    } = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
      owner_id?: string;
      status?: StoreStatus;
      verified_only?: boolean;
      seller_type?: SellerType;
      pending_seller_type_request?: boolean;
    };
    const result = await storeService.listForAdmin({
      page,
      limit,
      search,
      ownerId: owner_id,
      status,
      verifiedOnly: verified_only,
      sellerType: seller_type,
      pendingSellerTypeRequest: pending_seller_type_request,
    });
    res.status(200).json(result);
  }),
);

router.put(
  '/vendors/:id/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.verify(req.params.id);
    logger.info({ store_id: req.params.id, admin_id: req.user!.id }, 'Admin verified store');
    res.status(200).json({ success: true, store });
  }),
);

router.put(
  '/vendors/:id/reactivate',
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.reactivate(req.params.id);
    logger.info({ store_id: req.params.id, admin_id: req.user!.id }, 'Admin reactivated store');
    res.status(200).json({ success: true, store });
  }),
);

router.put(
  '/vendors/:id/seller-type',
  validate(updateVendorSellerTypeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.updateSellerType(req.params.id, req.body.seller_type);
    logger.info(
      { store_id: req.params.id, admin_id: req.user!.id, seller_type: req.body.seller_type },
      'Admin updated seller type',
    );
    res.status(200).json({ success: true, store });
  }),
);

router.put(
  '/vendors/:id/seller-type-request/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.approveSellerTypeChange(req.params.id);
    logger.info(
      { store_id: req.params.id, admin_id: req.user!.id, seller_type: store.seller_type },
      'Admin approved seller type change',
    );
    res.status(200).json({ success: true, store });
  }),
);

router.put(
  '/vendors/:id/seller-type-request/reject',
  validate(rejectSellerTypeRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.rejectSellerTypeChange(req.params.id, req.body.reason);
    logger.info(
      { store_id: req.params.id, admin_id: req.user!.id },
      'Admin rejected seller type change',
    );
    res.status(200).json({ success: true, store });
  }),
);

router.put(
  '/vendors/:id/suspend',
  asyncHandler(async (req: Request, res: Response) => {
    const reason = req.body.reason || 'Suspended by admin';
    await storeService.suspend(req.params.id, reason);
    logger.info({ store_id: req.params.id, admin_id: req.user!.id }, 'Admin suspended store');
    res.status(200).json({ success: true, message: 'Store suspended' });
  }),
);

router.put(
  '/vendors/:id/owner/suspend',
  validate(vendorOwnerActionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ owner_id: string; owner_email: string | null }>(
      `UPDATE pd_user u
       SET is_active = false,
           updated_at = NOW()
       FROM pd_store s
       WHERE s.id = $1
         AND s.owner_id = u.id
       RETURNING u.id AS owner_id, u.email AS owner_email`,
      [req.params.id],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Vendor owner not found');
    await authService.logout(rows[0].owner_id);
    logger.warn(
      {
        store_id: req.params.id,
        owner_id: rows[0].owner_id,
        admin_id: req.user!.id,
        reason: req.body.reason,
      },
      'Admin suspended vendor owner',
    );
    res.status(200).json({ success: true, owner: rows[0] });
  }),
);

router.put(
  '/vendors/:id/owner/reactivate',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ owner_id: string; owner_email: string | null }>(
      `UPDATE pd_user u
       SET is_active = true,
           updated_at = NOW()
       FROM pd_store s
       WHERE s.id = $1
         AND s.owner_id = u.id
       RETURNING u.id AS owner_id, u.email AS owner_email`,
      [req.params.id],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Vendor owner not found');
    logger.info(
      { store_id: req.params.id, owner_id: rows[0].owner_id, admin_id: req.user!.id },
      'Admin reactivated vendor owner',
    );
    res.status(200).json({ success: true, owner: rows[0] });
  }),
);

router.put(
  '/vendors/:id/owner/reset-2fa',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ owner_id: string; owner_email: string | null }>(
      `SELECT s.owner_id, u.email AS owner_email
       FROM pd_store s
       JOIN pd_user u ON u.id = s.owner_id
       WHERE s.id = $1`,
      [req.params.id],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Vendor owner not found');
    await authService.resetTwoFactorForUser(rows[0].owner_id);
    logger.warn(
      { store_id: req.params.id, owner_id: rows[0].owner_id, admin_id: req.user!.id },
      'Admin reset vendor owner 2FA',
    );
    res.status(200).json({ success: true, owner: rows[0] });
  }),
);

router.put(
  '/vendors/:id/subscription',
  validate(updateVendorSubscriptionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await subscriptionService.getLimits(req.body.subscription_plan);
    const store = await storeService.updateSubscription(
      req.params.id,
      req.body.subscription_plan,
      req.body.subscription_type,
      req.body.subscription_expires_at,
    );
    logger.info(
      { store_id: req.params.id, admin_id: req.user!.id, plan: req.body.subscription_plan },
      'Admin updated vendor subscription',
    );
    res.status(200).json({ success: true, store });
  }),
);

router.delete(
  '/vendors/:id/payment-config',
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.clearPaymentConfig(req.params.id);
    logger.warn(
      { store_id: req.params.id, admin_id: req.user!.id },
      'Admin cleared vendor payment config',
    );
    res.status(200).json({ success: true, store });
  }),
);

router.delete(
  '/vendors/:id/custom-domain',
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.clearCustomDomain(req.params.id);
    logger.warn(
      { store_id: req.params.id, admin_id: req.user!.id },
      'Admin cleared vendor custom domain',
    );
    res.status(200).json({ success: true, store });
  }),
);
export default router;