# E2E Test Infra: PandaMarket Platform Analytics Command Center

## Test Philosophy
- **Requirement-Driven & Opaque-Box**: Derived strictly from `ORIGINAL_REQUEST.md` (R1 through R6) and acceptance criteria, independent of internal implementation artifacts.
- **Methodology**: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload/Scenario Testing.
- **Strict Quality Gate**: 100% test pass rate across backend and frontend, 0 TypeScript compilation errors (`npx tsc --noEmit`), and independent Forensic Integrity Audit verification.

---

## Feature Inventory & Tier Mapping

| # | Feature | Requirement Source | Tier 1 (Coverage ≥5) | Tier 2 (Boundary ≥5) | Tier 3 (Pairwise) | Tier 4 (Real-World) |
|---|---------|-------------------|:-------------------:|:-------------------:|:-----------------:|:-------------------:|
| 1 | Real-time visitor stream & 60s velocity chart | R1 | 5 | 5 | ✓ | ✓ |
| 2 | Tunisia 24-Governorates & Diaspora Heatmap | R1 | 5 | 5 | ✓ | ✓ |
| 3 | Live checkout micro-ticker & anomaly alerts | R1 | 5 | 5 | ✓ | ✓ |
| 4 | Tri-Fold Financial Reconciliation | R2 | 5 | 5 | ✓ | ✓ |
| 5 | SaaS MRR Waterfall Engine | R2 | 5 | 5 | ✓ | ✓ |
| 6 | Payment Gateway Reliability & Conversion Matrix | R2 | 5 | 5 | ✓ | ✓ |
| 7 | Multi-currency normalization engine (TND/EUR/USD) | R2 | 5 | 5 | ✓ | ✓ |
| 8 | 7-Stage Granular Conversion Funnel | R3 | 5 | 5 | ✓ | ✓ |
| 9 | Zero-result search query intelligence | R3 | 5 | 5 | ✓ | ✓ |
| 10 | N-day repurchase cohort retention matrix | R3 | 5 | 5 | ✓ | ✓ |
| 11 | 2x2 Vendor Performance Scatter Matrix | R4 | 5 | 5 | ✓ | ✓ |
| 12 | Operational SLA Tracking (Dispatch, ODR, On-time) | R4 | 5 | 5 | ✓ | ✓ |
| 13 | Vendor Fraud, Wash Trading & Churn Radar | R4 | 5 | 5 | ✓ | ✓ |
| 14 | 30/60/90-Day Predictive Forecasting | R5 | 5 | 5 | ✓ | ✓ |
| 15 | Dynamic "What-If" Scenario Simulator | R5 | 5 | 5 | ✓ | ✓ |
| 16 | Daily Executive Natural Language AI Digest | R5 | 5 | 5 | ✓ | ✓ |
| 17 | Multi-Format Scheduled Reports (PDF / Excel) | R6 | 5 | 5 | ✓ | ✓ |
| 18 | 10 Domain Tabs & Impeccable Glassmorphic UI | R6 | 5 | 5 | ✓ | ✓ |
| 19 | Interactive Slide-Out Entity Drilldown Drawer | R6 | 5 | 5 | ✓ | ✓ |

---

## Test Architecture

### Runners & Invocations
- **Backend Test Runner**: Vitest `v2.0.5`
  - Invocation: `npm --prefix backend test` or `npx vitest run src/__tests__/analytics`
  - Pass/Fail Semantics: Exit code 0 on 100% assertions passing.
- **Frontend Test Runner**: Vitest `v2.0.5` + React Testing Library + jsdom
  - Invocation: `npm --prefix frontend test`
  - Pass/Fail Semantics: Exit code 0 on 100% component and utility tests passing.
- **TypeScript Typecheck**:
  - Invocation: `cd backend && npx tsc --noEmit` and `cd frontend && npx tsc --noEmit`
  - Pass/Fail Semantics: Strict 0 errors.
- **E2E Browser Test Runner**: Playwright
  - Invocation: `npx playwright test e2e/platform-analytics.spec.ts`

### Directory & File Layout
```
backend/src/__tests__/
├── analytics-reconciliation.test.ts      [Tier 1-3: Tri-fold GMV, Escrow, Commissions, Multi-currency FX]
├── analytics-saas-waterfall.test.ts      [Tier 1-3: Beginning, New, Exp, Cont, Churn, Net New MRR]
├── analytics-gateways-matrix.test.ts     [Tier 1-3: Flouci, Konnect, Mandat, Stripe, PayPal, COD]
├── analytics-funnel-7stage.test.ts       [Tier 1-3: 7-stage conversion, drop-offs, cart abandonment]
├── analytics-unmet-search.test.ts        [Tier 1-3: Zero-result search queries, opportunity scores]
├── analytics-vendor-quadrant.test.ts     [Tier 1-3: 2x2 scatter matrix, SLA metrics, risk radar]
├── analytics-predictive-forecast.test.ts [Tier 1-3: 30/60/90d forecast, Holt-Winters, What-If simulator]
└── analytics-reports-export.test.ts      [Tier 1-3: Multi-format Excel / PDF scheduled exports]

frontend/src/__tests__/
├── currency-normalizer.test.ts           [Tier 1-2: TND (3 dec), EUR (2 dec), USD (2 dec) formatting & rounding]
├── platform-analytics-tabs.test.tsx      [Tier 1-3: All 10 domain tabs rendering, period comparison]
├── interactive-drilldown-drawer.test.tsx [Tier 1-3: Drawer slide-in, entity metadata for 5 entities]
└── tunisia-choropleth-map.test.tsx       [Tier 1-2: 24 governorates SVG paths, heat intensity scaling]

frontend/e2e/
└── platform-analytics.spec.ts            [Tier 4: Full real-world Superadmin interactive journeys]
```

---

## Real-World Application Scenarios (Tier 4)

| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | **Superadmin Morning Live Pulse & Heatmap Reconnaissance**: Log in to platform analytics, review 60s live velocity ticker, switch between Tunisia 24-governorate choropleth and Diaspora map, inspect live checkout micro-ticker. | F1, F2, F3, F18 | Medium |
| 2 | **Monthly Financial Close & Multi-Currency SaaS Audit**: Switch currency from TND to EUR to USD, verify GMV vs Commission Take vs Escrow balance reconciliation, audit SaaS MRR waterfall step components, inspect gateway conversion matrix. | F4, F5, F6, F7, F18 | High |
| 3 | **Conversion Bottleneck & Merchandising Optimization**: Open 7-stage funnel tab, inspect drop-off rates from Cart to Shipping, drill into Zero-Result Search query table, identify unmet demand opportunities. | F8, F9, F10, F18, F19 | High |
| 4 | **Merchant SLA Governance & Risk Intervention**: Open Vendor Performance tab, inspect 2x2 scatter matrix (Champions vs At-Risk), filter by SLA compliance < 90%, open slide-out drilldown drawer for highest risk vendor. | F11, F12, F13, F18, F19 | High |
| 5 | **Executive Budgeting & AI "What-If" Strategy Session**: Navigate to AI Forecasting tab, inspect 30/60/90d projection with confidence bands, adjust What-If simulator sliders (+20% traffic, +2% commission rate), review real-time projected net revenue, generate and copy Executive AI Digest. | F14, F15, F16, F18 | High |
| 6 | **Automated Scheduled Report Generation & Export**: Create and trigger an executive monthly report export in Multi-Sheet Excel and PDF format, verify download content completeness. | F17, F18 | Medium |

---

## Coverage Thresholds

- **Tier 1 (Feature Coverage)**: ≥5 tests × 19 features = **≥ 95 test cases**
- **Tier 2 (Boundary & Corner Cases)**: ≥5 tests × 19 features = **≥ 95 test cases**
- **Tier 3 (Cross-Feature Combinations)**: **≥ 19 test cases** (Pairwise coverage)
- **Tier 4 (Real-World Application Scenarios)**: **≥ 6 comprehensive E2E scenarios**
- **Total Minimum Target**: **≥ 215 verified test cases** with 100% pass rate.
