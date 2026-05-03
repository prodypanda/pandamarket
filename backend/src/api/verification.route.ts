import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { kycService } from '../services/kyc.service';
import { smsService } from '../services/sms.service';
import { asyncHandler, validate, requireStore, authRateLimit } from '../middlewares';

const router = Router();

const submitDocumentsSchema = z.object({
  rc_document_url: z.string().min(1, 'RC document URL is required'),
  cin_document_url: z.string().min(1, 'CIN document URL is required'),
  phone_number: z.string().min(8, 'Phone number is required'),
});

const sendOtpSchema = z.object({
  phone_number: z.string().min(8, 'Phone number is required'),
});

const verifyOtpSchema = z.object({
  phone_number: z.string().min(8, 'Phone number is required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
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

// Vendor: Send phone OTP for KYC step 2
router.post(
  '/phone/send-otp',
  requireStore,
  authRateLimit,
  validate(sendOtpSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await smsService.sendOtp(req.body.phone_number);
    res.status(200).json(result);
  }),
);

// Vendor: Verify phone OTP for KYC step 2
router.post(
  '/phone/verify-otp',
  requireStore,
  authRateLimit,
  validate(verifyOtpSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const valid = await smsService.verifyOtp(req.body.phone_number, req.body.otp);
    if (!valid) {
      res.status(400).json({ error: { code: 'PD_KYC_INVALID_OTP', message: 'Invalid OTP code' } });
      return;
    }
    // Mark phone as verified in the KYC record
    const verification = await kycService.getByStore(req.user!.store_id!);
    if (verification) {
      await kycService.markPhoneVerified(verification.id);
    }
    res.status(200).json({ verified: true, message: 'Phone number verified successfully' });
  }),
);

export default router;
