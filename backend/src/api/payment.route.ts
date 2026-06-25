import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { z } from 'zod';
import { paymentService } from '../services/payment.service';
import { mandatService } from '../services/mandat.service';
import { orderService } from '../services/order.service';
import { asyncHandler, requireAuth, requireStorefrontCustomer, validate } from '../middlewares';
import { PaymentGateway, MandatUploader } from '@pandamarket/types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { query as dbQuery } from '../db/pool';

const router = Router();

const initPaymentSchema = z.object({
  order_id: z.string(),
  store_id: z.string().min(1).optional(),
  gateway: z.enum([
    PaymentGateway.Flouci,
    PaymentGateway.Konnect,
    PaymentGateway.ManualMandat,
    PaymentGateway.Cod,
  ]),
});

const mandatUploadSchema = z.object({
  order_id: z.string(),
  image_url: z.string().min(1),
});

// =====================================================
// HMAC Signature Verification Helpers
// =====================================================

/**
 * Verify Flouci webhook signature using HMAC-SHA256.
 * Flouci sends the signature in the `x-flouci-signature` header.
 */
function verifyFlouciSignature(req: Request): boolean {
  const signature = req.headers['x-flouci-signature'] as string | undefined;
  if (!signature) {
    logger.warn('Flouci webhook missing signature header');
    return false;
  }
  const payload = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', config.flouci.appSecret)
    .update(payload)
    .digest('hex');
  try {
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Verify Konnect webhook signature using HMAC-SHA256.
 * Konnect sends the signature in the `x-konnect-signature` header.
 */
function verifyKonnectSignature(req: Request): boolean {
  const signature = req.headers['x-konnect-signature'] as string | undefined;
  if (!signature) {
    logger.warn('Konnect webhook missing signature header');
    return false;
  }
  const payload = JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', config.konnect.apiKey).update(payload).digest('hex');
  try {
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// =====================================================
// Routes
// =====================================================

// Initialize Payment Link
router.post(
  '/init',
  requireAuth,
  validate(initPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { order_id, gateway } = req.body;
    const order = await orderService.getById(order_id);

    // Verify order belongs to user
    if (order.customer_id !== req.user!.id) {
      res.status(403).json({ error: { message: 'Forbidden' } });
      return;
    }

    // Fetch the customer's email for the payment provider
    const { rows: userRows } = await dbQuery<{ email: string }>(
      'SELECT email FROM pd_user WHERE id = $1',
      [req.user!.id],
    );
    const customerEmail = userRows[0]?.email ?? '';

    const result = await paymentService.initPayment(
      order,
      gateway as PaymentGateway,
      customerEmail,
    );

    res.status(200).json({
      checkout_url: result.redirect_url,
      gateway_reference: result.gateway_reference,
      metadata: result.metadata,
    });
  }),
);

router.post(
  '/storefront/init',
  requireStorefrontCustomer,
  validate(initPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { order_id, gateway } = req.body;
    const order = await orderService.getById(order_id);

    if (order.storefront_customer_id !== req.storefrontCustomer!.id) {
      res.status(403).json({ error: { message: 'Forbidden' } });
      return;
    }

    const belongsToStore = await orderService.hasStoreItems(
      order_id,
      req.storefrontCustomer!.store_id,
    );
    if (!belongsToStore) {
      res.status(403).json({ error: { message: 'Forbidden' } });
      return;
    }

    const { rows: customerRows } = await dbQuery<{ email: string }>(
      'SELECT email FROM pd_storefront_customer WHERE id = $1 AND store_id = $2',
      [req.storefrontCustomer!.id, req.storefrontCustomer!.store_id],
    );
    const customerEmail = customerRows[0]?.email ?? '';

    const result = await paymentService.initPayment(
      order,
      gateway as PaymentGateway,
      customerEmail,
    );

    res.status(200).json({
      checkout_url: result.redirect_url,
      gateway_reference: result.gateway_reference,
      metadata: result.metadata,
    });
  }),
);
// Upload Mandat Proof
router.post(
  '/mandat/upload',
  requireAuth,
  validate(mandatUploadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { order_id, image_url } = req.body;
    const order = await orderService.getById(order_id);

    if (order.customer_id !== req.user!.id) {
      res.status(403).json({ error: { message: 'Forbidden' } });
      return;
    }

    const proof = await mandatService.uploadProof({
      order_id,
      uploaded_by: MandatUploader.Buyer,
      uploader_user_id: req.user!.id,
      image_url,
      amount_expected: parseFloat(order.total),
    });

    res.status(201).json({ proof });
  }),
);

// Flouci Webhook — with HMAC signature verification + idempotency
router.post(
  '/webhook/flouci',
  asyncHandler(async (req: Request, res: Response) => {
    // Verify HMAC signature (skip in development if no secret configured)
    const signatureValid = verifyFlouciSignature(req);
    if (!signatureValid && config.env === 'production') {
      logger.warn({ ip: req.ip }, 'Flouci webhook signature verification failed');
      res.status(401).json({ error: { message: 'Invalid signature' } });
      return;
    }

    const { payment_id, order_id } = req.body;
    if (!payment_id || !order_id) {
      res.status(400).json({ error: { message: 'Missing payment_id or order_id' } });
      return;
    }

    await paymentService.processPaymentWebhook({
      gateway: PaymentGateway.Flouci,
      gatewayEventId: payment_id,
      orderId: order_id,
      rawPayload: req.body,
      sourceIp: req.ip ?? undefined,
      signatureValid,
    });

    res.status(200).send('OK');
  }),
);

// Konnect Webhook — with HMAC signature verification + idempotency
router.post(
  '/webhook/konnect',
  asyncHandler(async (req: Request, res: Response) => {
    // Verify HMAC signature (skip in development if no secret configured)
    const signatureValid = verifyKonnectSignature(req);
    if (!signatureValid && config.env === 'production') {
      logger.warn({ ip: req.ip }, 'Konnect webhook signature verification failed');
      res.status(401).json({ error: { message: 'Invalid signature' } });
      return;
    }

    const { payment_ref, order_id } = req.body;
    if (!payment_ref || !order_id) {
      res.status(400).json({ error: { message: 'Missing payment_ref or order_id' } });
      return;
    }

    await paymentService.processPaymentWebhook({
      gateway: PaymentGateway.Konnect,
      gatewayEventId: payment_ref,
      orderId: order_id,
      rawPayload: req.body,
      sourceIp: req.ip ?? undefined,
      signatureValid,
    });

    res.status(200).send('OK');
  }),
);

export default router;
