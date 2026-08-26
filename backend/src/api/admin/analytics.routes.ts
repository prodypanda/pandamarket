import { asyncHandler, requireAdmin, requireAuth } from '../../middlewares';
import { extractAnalyticsQueryParams } from './_shared';
import { Request, Response, Router } from 'express';

/** Superadmin Modular Platform Analytics APIs (R1 & R2) + Superadmin Modular Platform Analytics APIs + Part 6: Analytics Drilldowns, Metric Definitions & Saved Views + Part 7: Analytics Intelligence, Risk, Cohorts & Schedules — extracted from admin.route.ts (E15 split). */
const router = Router();

router.get(
  '/analytics/pulse/live',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const data = await analyticsService.getLivePulseData();
    res.status(200).json({ success: true, data });
  }),
);

router.get(
  '/analytics/geo/heatmap',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const params = extractAnalyticsQueryParams(req);
    const data = await analyticsService.getGeoHeatmapData(params);
    res.status(200).json({ success: true, data });
  }),
);

router.get(
  '/analytics/financials/reconciliation',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsReconciliationService } = await import('../../services/analytics-reconciliation.service');
    const params = extractAnalyticsQueryParams(req);
    const data = await analyticsReconciliationService.getTriFoldReconciliation(params);
    res.status(200).json({ success: true, data });
  }),
);

router.get(
  '/analytics/financials/mrr-waterfall',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsReconciliationService } = await import('../../services/analytics-reconciliation.service');
    const params = extractAnalyticsQueryParams(req);
    const data = await analyticsReconciliationService.getSaaSMRRWaterfall(params);
    res.status(200).json({ success: true, data });
  }),
);

router.get(
  '/analytics/gateways/matrix',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsReconciliationService } = await import('../../services/analytics-reconciliation.service');
    const params = extractAnalyticsQueryParams(req);
    const data = await analyticsReconciliationService.getGatewayReliabilityMatrix(params);
    res.status(200).json({ success: true, data });
  }),
);

// ==========================================================
// Superadmin Modular Platform Analytics APIs
// ==========================================================

router.get(
  '/analytics/overview',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const data = await analyticsService.getGlobalOverview(req.query);
    res.status(200).json({ success: true, data });
  }),
);

router.get(
  '/analytics/revenue',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const data = await analyticsService.getRevenueAndSaaSMetrics(req.query);
    res.status(200).json({ success: true, data });
  }),
);

router.get(
  '/analytics/vendors',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const data = await analyticsService.getVendorAnalytics(req.query);
    res.status(200).json({ success: true, data });
  }),
);

router.get(
  '/analytics/ads',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const data = await analyticsService.getAdsAnalytics(req.query);
    res.status(200).json({ success: true, data });
  }),
);

router.get(
  '/analytics/system',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const data = await analyticsService.getSystemHealthMetrics(req.query);
    res.status(200).json({ success: true, data });
  }),
);

router.get(
  '/analytics/business',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const data = await analyticsService.getBusinessAnalytics(req.query);
    res.status(200).json({ success: true, data });
  }),
);

router.get(
  '/analytics/page-views',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const data = await analyticsService.getPageViewsAnalytics(req.query);
    res.status(200).json({ success: true, data });
  }),
);

router.get(
  '/analytics/page-views-live',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const data = await analyticsService.getPageViewsLiveData();
    res.status(200).json({ success: true, data });
  }),
);

router.post(
  '/analytics/export',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const csvContent = await analyticsService.generateExportCSV(req.body || {});
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=platform_analytics_report.csv');
    res.status(200).send(csvContent);
  }),
);

// ==========================================================
// Part 6: Analytics Drilldowns, Metric Definitions & Saved Views
// ==========================================================

router.get(
  '/analytics/drilldown/orders',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const result = await analyticsService.getOrdersDrilldown(req.query as unknown as import('../../types/analytics-types').AnalyticsDrilldownQueryParams);
    res.status(200).json({ success: true, ...result });
  }),
);

router.get(
  '/analytics/drilldown/vendors',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const result = await analyticsService.getVendorsDrilldown(req.query as unknown as import('../../types/analytics-types').AnalyticsDrilldownQueryParams);
    res.status(200).json({ success: true, ...result });
  }),
);

router.get(
  '/analytics/drilldown/buyers',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const result = await analyticsService.getBuyersDrilldown(req.query as unknown as import('../../types/analytics-types').AnalyticsDrilldownQueryParams);
    res.status(200).json({ success: true, ...result });
  }),
);

router.get(
  '/analytics/drilldown/products',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const result = await analyticsService.getProductsDrilldown(req.query as unknown as import('../../types/analytics-types').AnalyticsDrilldownQueryParams);
    res.status(200).json({ success: true, ...result });
  }),
);

router.get(
  '/analytics/drilldown/search',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const result = await analyticsService.getSearchDrilldown(req.query as unknown as import('../../types/analytics-types').AnalyticsDrilldownQueryParams);
    res.status(200).json({ success: true, ...result });
  }),
);

router.get(
  '/analytics/drilldown/events',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const result = await analyticsService.getEventsDrilldown(req.query as unknown as import('../../types/analytics-types').AnalyticsDrilldownQueryParams);
    res.status(200).json({ success: true, ...result });
  }),
);

router.get(
  '/analytics/definitions',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const definitions = analyticsService.getMetricDefinitions();
    res.status(200).json({ success: true, definitions });
  }),
);

router.get(
  '/analytics/saved-views',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const adminUserId = (req as any).user?.id;
    const views = await analyticsService.listSavedViews(adminUserId);
    res.status(200).json({ success: true, views });
  }),
);

router.post(
  '/analytics/saved-views',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const adminUserId = (req as any).user?.id;
    const view = await analyticsService.createSavedView(adminUserId, req.body);
    res.status(201).json({ success: true, view });
  }),
);

router.delete(
  '/analytics/saved-views/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const adminUserId = (req as any).user?.id;
    await analyticsService.deleteSavedView(adminUserId, req.params.id);
    res.status(200).json({ success: true });
  }),
);

router.post(
  '/analytics/saved-views/:id/default',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const adminUserId = (req as any).user?.id;
    await analyticsService.setDefaultSavedView(adminUserId, req.params.id);
    res.status(200).json({ success: true });
  }),
);

// ==========================================================
// Part 7: Analytics Intelligence, Risk, Cohorts & Schedules
// ==========================================================

router.get(
  '/analytics/anomalies',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const params = extractAnalyticsQueryParams(req);
    const result = await analyticsService.getAnomalyInsights(params);
    res.status(200).json(result);
  }),
);

router.post(
  '/analytics/intelligence/snapshot',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const result = await analyticsService.computeDailyIntelligenceSnapshots();
    res.status(200).json({ success: true, ...result });
  }),
);

router.get(
  '/analytics/risk/vendors',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const params = extractAnalyticsQueryParams(req);
    const result = await analyticsService.getVendorRiskInsights(params);
    res.status(200).json(result);
  }),
);

router.get(
  '/analytics/risk/churn',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const params = extractAnalyticsQueryParams(req);
    const result = await analyticsService.getChurnRiskInsights(params);
    res.status(200).json(result);
  }),
);

router.get(
  '/analytics/cohorts',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const params = extractAnalyticsQueryParams(req);
    const cohortType = req.query.cohort_type as any;
    const result = await analyticsService.getCohortInsights({ ...params, cohortType });
    res.status(200).json(result);
  }),
);

router.get(
  '/analytics/schedules',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const adminUserId = (req as any).user?.id;
    const schedules = await analyticsService.getReportSchedules(adminUserId);
    res.status(200).json({ success: true, schedules });
  }),
);

router.post(
  '/analytics/schedules',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const adminUserId = (req as any).user?.id;
    const schedule = await analyticsService.createReportSchedule(adminUserId, req.body);
    res.status(201).json({ success: true, schedule });
  }),
);

router.put(
  '/analytics/schedules/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const adminUserId = (req as any).user?.id;
    const schedule = await analyticsService.updateReportSchedule(adminUserId, req.params.id, req.body);
    if (!schedule) {
      res.status(404).json({ error: { message: 'Report schedule not found' } });
      return;
    }
    res.status(200).json({ success: true, schedule });
  }),
);

router.delete(
  '/analytics/schedules/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const adminUserId = (req as any).user?.id;
    const deleted = await analyticsService.deleteReportSchedule(adminUserId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: { message: 'Report schedule not found' } });
      return;
    }
    res.status(200).json({ success: true });
  }),
);

router.post(
  '/analytics/schedules/:id/run-now',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const adminUserId = (req as any).user?.id;
    const result = await analyticsService.runReportScheduleNow(adminUserId, req.params.id);
    res.status(200).json({ success: true, result });
  }),
);
export default router;