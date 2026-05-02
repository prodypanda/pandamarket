import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { walletService } from '../services/wallet.service';
import { asyncHandler, validate, requireStore } from '../middlewares';
import { PayoutMode } from '@pandamarket/types';

const router = Router();

const withdrawSchema = z.object({
  amount: z.number().min(20),
  notes: z.string().optional(),
});

const payoutModeSchema = z.object({
  mode: z.nativeEnum(PayoutMode),
});

// Vendor: Get wallet summary
router.get(
  '/me',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const wallet = await walletService.getByStore(req.user!.store_id!);
    res.status(200).json({ wallet });
  }),
);

// Vendor: List wallet transactions
router.get(
  '/me/transactions',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await walletService.listTransactions(req.user!.store_id!, { page, limit });
    res.status(200).json(result);
  }),
);

// Vendor: Request withdrawal
router.post(
  '/me/withdraw',
  requireStore,
  validate(withdrawSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const wallet = await walletService.withdraw({
      store_id: req.user!.store_id!,
      amount: req.body.amount,
      notes: req.body.notes,
    });
    res.status(200).json({ wallet });
  }),
);

// Vendor: Update payout mode
router.put(
  '/me/payout-mode',
  requireStore,
  validate(payoutModeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const wallet = await walletService.setPayoutMode(req.user!.store_id!, req.body.mode);
    res.status(200).json({ wallet });
  }),
);

export default router;
