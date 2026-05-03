import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { asyncHandler, validate, authRateLimit, requireAuth } from '../middlewares';

const router = Router();

// ==========================================================
// Schemas
// ==========================================================

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(['Customer', 'Vendor']).optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

// ==========================================================
// Routes
// ==========================================================

router.post(
  '/register',
  authRateLimit,
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    const tokens = await authService.issueTokens(user);
    
    // Set cookie for access token (optional, based on design)
    res.cookie('pd_at', tokens.access_token, {
      httpOnly: true,
      secure: process.env.PD_NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.status(201).json({ user, tokens });
  }),
);

router.post(
  '/login',
  authRateLimit,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.login(req.body.email, req.body.password);
    const tokens = await authService.issueTokens(user);

    res.cookie('pd_at', tokens.access_token, {
      httpOnly: true,
      secure: process.env.PD_NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ user, tokens });
  }),
);

router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tokens = await authService.refresh(req.body.refresh_token);

    res.cookie('pd_at', tokens.access_token, {
      httpOnly: true,
      secure: process.env.PD_NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ tokens });
  }),
);

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (req.user) {
      await authService.logout(req.user.id);
    }
    res.clearCookie('pd_at');
    res.status(200).json({ success: true });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    // Return basic user info stored in the token or fetch from DB
    res.status(200).json({ user: req.user });
  }),
);

// Forgot password
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post(
  '/forgot-password',
  authRateLimit,
  validate(forgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    // Always return success to prevent email enumeration
    res.status(200).json({ message: 'If an account exists with this email, a reset link has been sent.' });
  }),
);

// Reset password
const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

router.post(
  '/reset-password',
  authRateLimit,
  validate(resetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.status(200).json({ message: 'Password reset successfully. Please log in.' });
  }),
);

// Send verification email
router.post(
  '/send-verification',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    await authService.sendVerificationEmail(req.user!.id);
    res.status(200).json({ message: 'Verification email sent.' });
  }),
);

// Verify email
const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

router.get(
  '/verify-email',
  validate(verifyEmailSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    await authService.verifyEmail(req.query.token as string);
    res.status(200).json({ message: 'Email verified successfully.' });
  }),
);

export default router;
