import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { paymentService } from '../services/payment.service';
import { mandatService } from '../services/mandat.service';
import { orderService } from '../services/order.service';
import { asyncHandler, requireAuth, validate } from '../middlewares';
import { PaymentGateway, MandatUploader } from '@pandamarket/types';

const router = Router();

const initPaymentSchema = z.object({
  order_id: z.string(),
  gateway: z.enum([PaymentGateway.Flouci, PaymentGateway.Konnect]),
});

const mandatUploadSchema = z.object({
  order_id: z.string(),
  image_url: z.string().url(),
});

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

    let checkoutUrl = '';
    if (gateway === PaymentGateway.Flouci) {
      checkoutUrl = await paymentService.initFlouciPayment(order);
    } else if (gateway === PaymentGateway.Konnect) {
      checkoutUrl = await paymentService.initKonnectPayment(order);
    }

    res.status(200).json({ checkout_url: checkoutUrl });
    return;
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
    return;
  }),
);

// Flouci Webhook
router.post(
  '/webhook/flouci',
  asyncHandler(async (req: Request, res: Response) => {
    // In production, verify Flouci signature here
    const { payment_id, order_id } = req.body;
    await paymentService.verifyFlouciPayment(payment_id, order_id);
    res.status(200).send('OK');
  }),
);

// Konnect Webhook
router.post(
  '/webhook/konnect',
  asyncHandler(async (req: Request, res: Response) => {
    // In production, verify Konnect signature here
    const { payment_ref, order_id } = req.body;
    await paymentService.verifyKonnectPayment(payment_ref, order_id);
    res.status(200).send('OK');
  }),
);

export default router;
