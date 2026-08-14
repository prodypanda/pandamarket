# Project: PandaMarket Platform Analytics Overhaul

## Architecture
PandaMarket Superadmin Platform Analytics Command Center overhaul spanning backend high-performance aggregation pipelines, Redis memoization, real-time telemetry streams, AI predictive time-series modeling, multi-currency normalization, and a high-craft glassmorphic frontend with 10 domain tabs, bespoke SVG/Canvas visualizations, and interactive slide-out entity drilldowns.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                          Frontend Command Center (Next.js 16 App Router)                    │
│  - 10 Domain Tabs: Live Pulse, Overview, Financials, Funnels, Vendors, Merchandising,       │
│    Geography, Forecasting, Ads, Governance                                                  │
│  - Bespoke SVG/Canvas Chart Visualizers (60s Velocity, 24-Gov Choropleth, MRR Waterfall,   │
│    7-Stage Funnel, 2x2 Scatter Quadrant, Risk Spider Radar, 30/60/90d Confidence Bands)     │
│  - Multi-Currency Context (TND, EUR, USD) & Interactive Right Slide-Out Drilldown Drawer    │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │ HTTPS / REST / Socket.IO
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                         Backend Analytics Engine (Express + TypeScript)                     │
│  - Routes: `/api/pd/admin/analytics/*` (Admin Auth & Superadmin Guarded)                    │
│  - Services: Tri-Fold Reconciliation, SaaS Waterfall, 7-Stage Funnel, Vendor SLA & Radar,  │
│    Holt-Winters Forecasting, What-If Simulator, Executive AI Digest, Multi-Sheet Reports    │
│  - Real-Time Pulse: 60s Sliding Buffer & Live Checkout Event Broadcaster                    │
└───────────────────────┬───────────────────────────────────────────────┬─────────────────────┘
                        │                                               │
                        ▼                                               ▼
┌───────────────────────────────────────────────┐     ┌───────────────────────────────────────┐
│           Redis Caching & Rollups             │     │      PostgreSQL Database Engine       │
│  - 60s Sliding Ring Buffer                    │     │  - Core Tables: `pd_order`, `wallet`, │
│  - Query Result Caching with TTL              │     │    `pd_fulfillment`, `pd_store`, etc. │
│  - Real-time visitor & event deduplication    │     │  - Rollup Tables: Daily & Search      │
└───────────────────────────────────────────────┘     └───────────────────────────────────────┘
```

---

## Feature Inventory

Every feature identified in the Survey phase is enumerated below with its assigned milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Real-time visitor stream & 60s velocity chart | 60-second second-by-second throughput and active visitor pulse | M1 (Backend) / M4 (Frontend) | R1 |
| 2 | Tunisia 24-Governorates & Diaspora Choropleth | Interactive SVG choropleth mapping all 24 governorates + top diaspora nations | M1 (Backend) / M4 (Frontend) | R1 |
| 3 | Live checkout micro-ticker & anomaly alerts | Live event stream of checkouts/carts with anomaly threshold alerts | M1 (Backend) / M4 (Frontend) | R1 |
| 4 | Tri-Fold Financial Reconciliation | GMV vs Net Commission Take vs Escrow Floating Balance & Payouts | M1 (Backend) / M4 (Frontend) | R2 |
| 5 | SaaS MRR Waterfall Engine | Beginning MRR, New, Expansion, Contraction, Churn, Net New MRR, Quick Ratio | M1 (Backend) / M4 (Frontend) | R2 |
| 6 | Payment Gateway Reliability & Conversion Matrix | Flouci, Konnect, Mandat, Stripe, PayPal, COD success rates and latency | M1 (Backend) / M4 (Frontend) | R2 |
| 7 | Multi-currency normalization engine | Dynamic conversion across TND (3 decimals), EUR (2 decimals), USD (2 decimals) | M1 (Backend) / M4 (Frontend) | R2 |
| 8 | 7-Stage Granular Conversion Funnel | Session → Product → Cart → Checkout → Address → Payment → Order with drop-offs | M2 (Backend) / M4 (Frontend) | R3 |
| 9 | Zero-result search query intelligence | Unmet customer demand ranking, opportunity scoring, and catalog gap suggestions | M2 (Backend) / M4 (Frontend) | R3 |
| 10 | N-day repurchase cohort retention matrix | True SQL-based repeat buyer retention grid across Day 1, 7, 14, 30, 60, 90 | M2 (Backend) / M4 (Frontend) | R3 |
| 11 | 2x2 Vendor Performance Scatter Matrix | Scatter plot of GMV vs Fulfillment SLA Compliance (Champions, Stars, At-Risk, etc.) | M2 (Backend) / M4 (Frontend) | R4 |
| 12 | Operational SLA Tracking | Avg Time to Dispatch (hrs), Order Defect Rate (ODR %), On-time delivery % | M2 (Backend) / M4 (Frontend) | R4 |
| 13 | Vendor Fraud, Wash Trading & Churn Radar | Multi-signal risk radar and early warning heuristics | M2 (Backend) / M4 (Frontend) | R4 |
| 14 | 30/60/90-Day Predictive Forecasting | Time-series forecasting with 80% and 95% confidence intervals | M3 (Backend) / M4 (Frontend) | R5 |
| 15 | Dynamic "What-If" Scenario Simulator | Parametric simulator for commission rate, traffic multiplier, merchant growth | M3 (Backend) / M4 (Frontend) | R5 |
| 16 | Daily Executive Natural Language AI Digest | AI-synthesized narrative digest with takeaways, anomalies, recommendations | M3 (Backend) / M4 (Frontend) | R5 |
| 17 | Multi-Format Scheduled Reports | Daily/Weekly/Monthly PDF and Multi-Sheet Excel export engine | M3 (Backend) / M4 (Frontend) | R6 |
| 18 | 10 Domain Tabs & Impeccable Glassmorphic UI | Dark/light glassmorphic command center across all 10 domain tabs | M4 (Frontend) | R6 |
| 19 | Interactive Slide-Out Entity Drilldown Drawer | Contextual slide-out drawer for Orders, Vendors, Products, Logs, Customers | M4 (Frontend) | R6 |
| 20 | Opaque-box E2E Test Suite (Tiers 1-4) | Comprehensive test suite covering all features, boundaries, combinations | Track A (E2E) | AC |
| 21 | Final Verification, Audit & Deployment | 100% E2E Pass, Tier 5 Adversarial Hardening, Forensic Audit, Render Deploy | M5 (Final) | AC |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| **Track A** | E2E Testing Track | Requirement-driven opaque-box test suites (Tiers 1-4) -> `TEST_READY.md` | none | IN_PROGRESS |
| **M1** | Backend Core Engine & Financials | R1 (Pulse & Geo APIs), R2 (Reconciliation, SaaS Waterfall, Gateways, FX) | none | IN_PROGRESS |
| **M2** | Funnels, Search & Vendor Quadrant | R3 (7-Stage Funnel, Zero-Search, Cohorts), R4 (2x2 Quadrant, SLA, Risk Radar) | M1 contracts | PLANNED |
| **M3** | AI Forecasting, Simulator & Reports | R5 (30/60/90d Forecast, What-If Simulator, AI Digest), R6 (Report Exports) | M1 contracts | PLANNED |
| **M4** | Frontend Command Center & UI/UX Craft | All 10 Domain Tabs, Bespoke SVG/Canvas Charts, Drilldown Drawer, Glassmorphism | M1-M3 contracts | PLANNED |
| **M5** | Final Verification, Audit & Deployment | Pass 100% E2E Tests, Adversarial Hardening (Tier 5), Forensic Audit, Render Deploy | Track A, M1-M4 | PLANNED |

---

## Interface Contracts

### Backend ↔ Frontend REST Endpoints

1. **`GET /api/pd/admin/analytics/pulse/live`**
   - Output: `{ success: true, data: { live_active_visitors_now: number, velocity: VelocityPoint[], micro_ticker: LiveCheckoutTickerItem[], anomaly_alerts: AnomalyAlertItem[] } }`
2. **`GET /api/pd/admin/analytics/geo/heatmap?timeRange=&startDate=&endDate=`**
   - Output: `{ success: true, data: GeoHeatmapResponseDTO }` (24 governorates + top diaspora countries)
3. **`GET /api/pd/admin/analytics/financials/reconciliation?timeRange=&currency=`**
   - Output: `{ success: true, data: FinancialReconciliationDTO }` (GMV, Commission, Escrow, Multi-currency TND/EUR/USD)
4. **`GET /api/pd/admin/analytics/financials/mrr-waterfall?timeRange=&currency=`**
   - Output: `{ success: true, data: SaaSMasterWaterfallDTO }` (Beginning, New, Expansion, Contraction, Churn, Net New, Quick Ratio)
5. **`GET /api/pd/admin/analytics/gateways/matrix?timeRange=`**
   - Output: `{ success: true, data: { gateways: PaymentGatewayReliabilityItem[] } }`
6. **`GET /api/pd/admin/analytics/funnel/conversion?timeRange=&storeId=`**
   - Output: `{ success: true, data: Granular7StageFunnelDTO }` (7 discrete stages, conversion %, drop-off %)
7. **`GET /api/pd/admin/analytics/search/unmet-demand?timeRange=&limit=`**
   - Output: `{ success: true, data: { queries: UnmetSearchDemandItem[] } }`
8. **`GET /api/pd/admin/analytics/cohorts/repurchase?interval=`**
   - Output: `{ success: true, data: { cohorts: RepurchaseCohortMatrixDTO } }`
9. **`GET /api/pd/admin/analytics/vendors/quadrant?timeRange=&minOrders=`**
   - Output: `{ success: true, data: VendorQuadrantMatrixResponseDTO }` (2x2 scatter coordinates, categories, SLA compliance)
10. **`GET /api/pd/admin/analytics/predictive/forecast?horizon=30d|60d|90d&metric=gmv|revenue|orders`**
    - Output: `{ success: true, data: TimeSeriesForecastResponseDTO }` (Historical + projected + 80%/95% confidence bands)
11. **`POST /api/pd/admin/analytics/predictive/simulate`**
    - Body: `{ traffic_delta_pct, conversion_delta_pct, commission_rate_pct, subscription_price_delta_pct, vendor_growth_pct }`
    - Output: `{ success: true, data: WhatIfSimulationResultDTO }`
12. **`GET /api/pd/admin/analytics/predictive/digest?timeRange=`**
    - Output: `{ success: true, data: ExecutiveAIDigestDTO }`
13. **`POST /api/pd/admin/analytics/export/multi-format`**
    - Body: `{ format: 'excel' | 'pdf' | 'csv', timeRange, currency, sections }`
    - Output: Binary stream or downloadable attachment.

---

## Code Layout & File Ownership Boundaries

- **Backend Types & DTOs**: `backend/src/types/analytics-types.ts`, `packages/types/src/index.ts`
- **Backend Analytics Services**:
  - `backend/src/services/analytics.service.ts` (Core aggregations, rollups, live pulse)
  - `backend/src/services/analytics-reconciliation.service.ts` (Financials, SaaS waterfall, gateways, multi-currency)
  - `backend/src/services/analytics-funnel.service.ts` (7-Stage funnel, search demand, cohorts)
  - `backend/src/services/analytics-vendor-quadrant.service.ts` (Vendor 2x2 matrix, SLA, risk radar)
  - `backend/src/services/analytics-forecasting.service.ts` (Holt-Winters time-series, What-If simulator, AI digest)
  - `backend/src/services/analytics-reports.service.ts` (Multi-sheet export, PDF/HTML formats, schedules)
- **Backend Analytics Routes**:
  - `backend/src/api/admin.route.ts` (Mounts all `/analytics/*` endpoints with `requireAdmin`)
  - `backend/src/api/analytics.route.ts` (Public event ingestion and storefront telemetry)
- **Frontend Command Center Components**:
  - `frontend/src/app/(admin)/platform-analytics/page.tsx` (Root command center container)
  - `frontend/src/components/admin/platform-analytics/AnalyticsTabsNav.tsx` (10-domain tab navigation)
  - `frontend/src/components/admin/platform-analytics/PlatformAnalyticsHeader.tsx` (Filters, currency, export)
  - `frontend/src/components/admin/platform-analytics/tabs/*.tsx` (10 dedicated tab components)
  - `frontend/src/components/admin/platform-analytics/charts/*.tsx` (Bespoke SVG/Canvas visualizers)
  - `frontend/src/components/admin/platform-analytics/interactive/*.tsx` (Drilldown drawer, ticker, simulator)
  - `frontend/src/components/admin/platform-analytics/utils/*.ts` (Currency normalizer, SVG maps)
  - `frontend/src/lib/admin-platform-analytics.ts` (Typed API client hooks and fetchers)
- **E2E Testing Track**:
  - `backend/src/__tests__/analytics-e2e-suite.test.ts`
  - `frontend/src/__tests__/platform-analytics-components.test.tsx`
  - `frontend/src/__tests__/analytics-currency-normalizer.test.ts`
  - `frontend/e2e/platform-analytics.spec.ts`
