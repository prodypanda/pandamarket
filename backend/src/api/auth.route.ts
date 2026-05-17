import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserRole } from '@pandamarket/types';
import { authService, type UserRow } from '../services/auth.service';
import { asyncHandler, validate, authRateLimit, requireAuth } from '../middlewares';
import { incrementBusinessMetric } from '../utils/metrics';
import { query } from '../db/pool';
import { PdAuthenticationError, PdErrorCode } from '../errors';
import { accountSecurityService } from '../services/account-security.service';

const router = Router();
const SELECTED_STORE_COOKIE = 'pd_selected_store_id';

// ==========================================================
// Schemas
// ==========================================================

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(['customer', 'vendor', 'Customer', 'Vendor']).optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const updateMeSchema = z.object({
  first_name: z.string().trim().min(1).max(100).optional(),
  last_name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(30).optional(),
});

const twoFactorCodeSchema = z.object({
  code: z.string().trim().min(4).max(32),
});

const twoFactorChallengeSchema = twoFactorCodeSchema.extend({
  challenge_id: z.string().min(16).max(128),
});

const revokeSessionSchema = z.object({
  session_id: z.string().min(8).max(100),
});

function normalizeRole(role?: string | null): UserRole | null {
  if (role === 'customer' || role === 'Customer') return UserRole.Customer;
  if (role === 'vendor' || role === 'Vendor') return UserRole.Vendor;
  if (role === 'admin' || role === 'Admin') return UserRole.Admin;
  if (role === 'super_admin' || role === 'SuperAdmin') return UserRole.SuperAdmin;
  return null;
}

function normalizeUser<T extends { role: UserRole | string }>(user: T): T {
  const role = normalizeRole(user.role);
  return role ? { ...user, role } : user;
}

function publicUser<T extends {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role: UserRole | string;
  store_id?: string | null;
  email_verified?: boolean;
  is_active?: boolean;
  phone?: string | null;
  created_at?: Date | string;
  two_factor_enabled?: boolean;
}>(user: T) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    role: user.role,
    store_id: user.store_id ?? null,
    email_verified: user.email_verified,
    is_active: user.is_active,
    phone: user.phone ?? null,
    created_at: user.created_at,
    two_factor_enabled: Boolean(user.two_factor_enabled),
  };
}

function setAccessCookie(res: Response, accessToken: string) {
  res.cookie('pd_at', accessToken, {
    httpOnly: true,
    secure: process.env.PD_NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });
}

function clearSelectedStoreCookie(res: Response) {
  res.clearCookie(SELECTED_STORE_COOKIE, { path: '/' });
}

function assertLoginRole(role: UserRole | string, allowedRoles: UserRole[]) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole || !allowedRoles.includes(normalizedRole)) {
    throw new PdAuthenticationError(
      PdErrorCode.AUTH_INVALID_CREDENTIALS,
      'Invalid email or password',
    );
  }
}

async function loginAndRespond(req: Request, res: Response, allowedRoles?: UserRole[]) {
  const context = accountSecurityService.fromRequest(req, { auth_flow: 'password' });
  let user: UserRow;
  try {
    user = normalizeUser(await authService.login(req.body.email, req.body.password));
    if (allowedRoles) {
      assertLoginRole(user.role, allowedRoles);
    }
  } catch (err) {
    await accountSecurityService.recordLoginFailureByEmail(req.body.email, context, err instanceof Error ? err.message : 'login_failed');
    throw err;
  }
  const twoFactorRequired = await authService.isTwoFactorRequired(user);
  if (user.two_factor_enabled) {
    const challenge = await authService.createTwoFactorChallenge(user);
    await accountSecurityService.recordEvent({
      ...context,
      user_id: user.id,
      email: user.email,
      role: user.role,
      store_id: user.store_id,
      event_type: 'login_2fa_challenge',
      success: true,
    });
    res.status(200).json({
      requires_2fa: true,
      two_factor_required: twoFactorRequired,
      ...challenge,
      user: publicUser(user),
    });
    return;
  }
  if (twoFactorRequired) {
    throw new PdAuthenticationError(
      PdErrorCode.AUTH_2FA_REQUIRED,
      'Two-factor authentication is required for this account role. Set up 2FA before signing in.',
      { role: user.role },
    );
  }
  const tokens = await authService.issueTokens(user, context);
  await accountSecurityService.recordEvent({
    ...context,
    user_id: user.id,
    email: user.email,
    role: user.role,
    store_id: user.store_id,
    session_id: tokens.session_id,
    event_type: 'login_success',
    success: true,
  });

  clearSelectedStoreCookie(res);
  setAccessCookie(res, tokens.access_token);

  res.status(200).json({ user: publicUser(user), tokens });
}

async function registerAndRespond(req: Request, res: Response, forcedRole?: UserRole) {
  const requestedRole = normalizeRole(req.body.role);
  const context = accountSecurityService.fromRequest(req, { auth_flow: 'register' });
  const user = normalizeUser(await authService.register({
    ...req.body,
    role: forcedRole ?? requestedRole ?? UserRole.Customer,
  }));
  const tokens = await authService.issueTokens(user, context);
  incrementBusinessMetric('user_registrations', { role: user.role });
  await accountSecurityService.recordEvent({
    ...context,
    user_id: user.id,
    email: user.email,
    role: user.role,
    store_id: user.store_id,
    session_id: tokens.session_id,
    event_type: 'register_login',
    success: true,
  });

  clearSelectedStoreCookie(res);
  setAccessCookie(res, tokens.access_token);

  res.status(201).json({ user: publicUser(user), tokens });
}

// ==========================================================
// Routes
// ==========================================================

router.get('/csrf', (_req: Request, res: Response) => {
  res.status(200).json({ success: true });
});

router.post(
  '/register',
  authRateLimit,
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await registerAndRespond(req, res);
  }),
);

router.post(
  '/register/customer',
  authRateLimit,
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await registerAndRespond(req, res, UserRole.Customer);
  }),
);

router.post(
  '/register/vendor',
  authRateLimit,
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await registerAndRespond(req, res, UserRole.Vendor);
  }),
);

router.post(
  '/login',
  authRateLimit,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await loginAndRespond(req, res);
  }),
);

router.post(
  '/login/customer',
  authRateLimit,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await loginAndRespond(req, res, [UserRole.Customer]);
  }),
);

router.post(
  '/login/vendor',
  authRateLimit,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await loginAndRespond(req, res, [UserRole.Vendor]);
  }),
);

router.post(
  '/login/admin',
  authRateLimit,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await loginAndRespond(req, res, [UserRole.Admin, UserRole.SuperAdmin]);
  }),
);

router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tokens = await authService.refresh(req.body.refresh_token, accountSecurityService.fromRequest(req, { auth_flow: 'refresh' }));

    setAccessCookie(res, tokens.access_token);

    res.status(200).json({ tokens });
  }),
);

router.post(
  '/2fa/verify',
  authRateLimit,
  validate(twoFactorChallengeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const context = accountSecurityService.fromRequest(req, { auth_flow: '2fa' });
    const user = normalizeUser(await authService.verifyTwoFactorChallenge(req.body.challenge_id, req.body.code));
    const tokens = await authService.issueTokens(user, context);
    await accountSecurityService.recordEvent({
      ...context,
      user_id: user.id,
      email: user.email,
      role: user.role,
      store_id: user.store_id,
      session_id: tokens.session_id,
      event_type: 'login_2fa_success',
      success: true,
    });
    clearSelectedStoreCookie(res);
    setAccessCookie(res, tokens.access_token);
    res.status(200).json({ user: publicUser(user), tokens });
  }),
);

router.get(
  '/2fa/status',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const status = await authService.getTwoFactorStatus(req.user!.id);
    res.status(200).json({ data: status, status });
  }),
);

router.post(
  '/2fa/setup',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const setup = await authService.beginTwoFactorSetup(req.user!.id);
    res.status(200).json({ data: setup, setup });
  }),
);

router.post(
  '/2fa/confirm',
  requireAuth,
  validate(twoFactorCodeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.confirmTwoFactorSetup(req.user!.id, req.body.code);
    await accountSecurityService.recordEvent({
      ...accountSecurityService.fromRequest(req),
      user_id: req.user!.id,
      session_id: req.user!.session_id,
      event_type: '2fa_enabled',
      success: true,
    });
    res.status(200).json({ data: result, ...result });
  }),
);

router.post(
  '/2fa/disable',
  requireAuth,
  validate(twoFactorCodeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const status = await authService.disableTwoFactor(req.user!.id, req.body.code);
    await accountSecurityService.recordEvent({
      ...accountSecurityService.fromRequest(req),
      user_id: req.user!.id,
      session_id: req.user!.session_id,
      event_type: '2fa_disabled',
      success: true,
    });
    res.status(200).json({ data: status, status });
  }),
);

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (req.user) {
      await accountSecurityService.recordEvent({
        ...accountSecurityService.fromRequest(req),
        user_id: req.user.id,
        role: req.user.role,
        store_id: req.user.store_id,
        session_id: req.user.session_id,
        event_type: 'logout',
        success: true,
      });
      await authService.logout(req.user.id);
    }
    res.clearCookie('pd_at');
    clearSelectedStoreCookie(res);
    res.status(200).json({ success: true });
  }),
);

router.get(
  '/security/activity',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    await accountSecurityService.touchSession(
      req.user!.session_id,
      accountSecurityService.fromRequest(req),
      'security_activity_view',
    );
    const data = await accountSecurityService.listSecurityOverview(req.user!.id);
    res.status(200).json({
      data: { ...data, current_session_id: req.user!.session_id ?? null },
      ...data,
      current_session_id: req.user!.session_id ?? null,
    });
  }),
);

router.post(
  '/security/sessions/revoke',
  requireAuth,
  validate(revokeSessionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const revoked = await accountSecurityService.revokeSession(req.user!.id, req.body.session_id);
    res.status(200).json({ success: true, revoked });
  }),
);

router.post(
  '/security/sessions/revoke-others',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const revoked = await accountSecurityService.revokeOtherSessions(req.user!.id, req.user!.session_id);
    res.status(200).json({ success: true, revoked });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query(
      `SELECT id, email, first_name, last_name, role, store_id, email_verified, is_active, phone, created_at,
              two_factor_enabled
       FROM pd_user
       WHERE id = $1`,
      [req.user!.id],
    );
    const user = rows[0] ?? req.user;
    res.status(200).json({ user, data: user });
  }),
);

router.put(
  '/me',
  requireAuth,
  validate(updateMeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query(
      `UPDATE pd_user
       SET first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           phone = COALESCE($4, phone),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, first_name, last_name, role, store_id, email_verified, is_active, phone, created_at, two_factor_enabled`,
      [
        req.user!.id,
        req.body.first_name ?? null,
        req.body.last_name ?? null,
        req.body.phone ?? null,
      ],
    );
    const user = rows[0];
    res.status(200).json({ user, data: user });
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
    await authService.forgotPassword(req.body.email, accountSecurityService.fromRequest(req, { auth_flow: 'forgot_password' }));
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
    await authService.resetPassword(req.body.token, req.body.password, accountSecurityService.fromRequest(req, { auth_flow: 'reset_password' }));
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
