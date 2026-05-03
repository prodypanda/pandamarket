import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { kycService } from '../services/kyc.service';
import { asyncHandler, validate, requireStore } from '../middlewares';

const router = Router();

const submitDocumentsSchema = z.object({
  rc_document_url: z.string().min(1, 'RC document URL is required'),
  cin_document_url: z.string().min(1, 'CIN document URL is required'),
  phone_number: z.string().min(8, 'Phone number is required'),
});

// Vendor: Submit KYC documents
router.post(
  '/documents',
  requireStore,
  validate(submitDocumentsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const verification = await kycService.submit({
      store_id: req.user!.store_id!,
      rc_document_url: req.body.rc_document_url,
      cin_document_url: req.body.cin_document_url,
      phone_number: req.body.phone_number,
    });
    res.status(201).json({ verification });
  }),
);

// Vendor: Get verification status
router.get(
  '/status',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const verification = await kycService.getByStore(req.user!.store_id!);
    res.status(200).json({ verification });
  }),
);

export default router;
