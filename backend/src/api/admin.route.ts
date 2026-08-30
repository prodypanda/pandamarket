/**
 * Admin API router — composer.
 *
 * Split (E15 phase 1): domain routers live in ./admin/*.routes.ts and are
 * mounted here IN THE ORIGINAL SECTION ORDER so Express route precedence is
 * preserved. The guard below applies to every mounted child.
 */
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middlewares';
import adsRoutes from './admin/ads.routes';
import miscRoutes from './admin/misc.routes';
import categoriesRoutes from './admin/categories.routes';
import kycRoutes from './admin/kyc.routes';
import mandatsRoutes from './admin/mandats.routes';
import reportsRoutes from './admin/reports.routes';
import productsRoutes from './admin/products.routes';
import vendorsRoutes from './admin/vendors.routes';
import statsRoutes from './admin/stats.routes';
import withdrawalsRoutes from './admin/withdrawals.routes';
import refundsRoutes from './admin/refunds.routes';
import settingsRoutes from './admin/settings.routes';
import auditLogRoutes from './admin/audit-log.routes';
import aiCostsRoutes from './admin/ai-costs.routes';
import smtpConfigRoutes from './admin/smtp-config.routes';
import subscriptionOrdersRoutes from './admin/subscription-orders.routes';
import analyticsRoutes from './admin/analytics.routes';
import subscriptionLifecycleRoutes from './admin/subscription-lifecycle.routes';

const router = Router();

// All admin routes require authentication + admin role
router.use(requireAuth, requireAdmin);

// Mount domain routers in the original admin.route.ts section order.
// (ads + misc lived at the very top of the pre-split file, so they mount first.)
router.use(adsRoutes);
router.use(miscRoutes);
router.use(categoriesRoutes);
router.use(kycRoutes);
router.use(mandatsRoutes);
router.use(reportsRoutes);
router.use(productsRoutes);
router.use(vendorsRoutes);
router.use(statsRoutes);
router.use(withdrawalsRoutes);
router.use(refundsRoutes);
router.use(settingsRoutes);
router.use(auditLogRoutes);
router.use(aiCostsRoutes);
router.use(smtpConfigRoutes);
router.use(subscriptionOrdersRoutes);
router.use(analyticsRoutes);
router.use(subscriptionLifecycleRoutes);

export default router;
