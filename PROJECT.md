# Project: PandaMarket Seller Dashboard Bento Cockpit Views

## Architecture
- **Framework**: Next.js 16.2.4 (Turbopack, App Router, React 19).
- **Design System & Styling**: Tailwind CSS, PandaMarket Design Tokens (`bg-white dark:bg-slate-900`, `border-slate-200/80 dark:border-slate-800`, `shadow-2xs`), Lucide Icons.
- **State & Context**:
  - `DashboardStyleContext` (`frontend/src/contexts/DashboardStyleContext.tsx`): Manages `dashboardStyle: 'classic' | 'bento'` with localStorage caching (`pd_seller_dashboard_style`) and background API synchronization (`PUT /api/pd/stores/me/settings`).
  - `DashboardStyleProvider`: Mounted globally in `frontend/src/app/hub/dashboard/layout.tsx:769`, accessible via `useDashboardStyle()` in all subpages.
- **Localization**: `useLocale()` with full French/Arabic (`dir={dir}`) bidirectional support.
- **Quality & Anti-Pattern Gates**: `node scripts/detect.mjs --json` (0 native dialogs, 0 raw red hexes, 100% paired dark mode classes, 0 empty event handlers).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Orders Bento Cockpit Component | Create `OrdersBentoCockpit.tsx` with courier dispatch pipeline, urgent COD deck, visual card stream | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Orders Page Integration | Wire `useDashboardStyle().dashboardStyle` into `orders/page.tsx` for seamless toggle | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Products Bento Cockpit Component | Create `ProductsBentoCockpit.tsx` with stock alert deck, velocity hero, PandaAds shortcut, visual grid | M2 | ORIGINAL_REQUEST §R2 |
| 4 | Products Page Integration | Wire `useDashboardStyle().dashboardStyle` and quick-stock adjustment into `products/page.tsx` | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Wallet Bento Cockpit Component | Create `WalletBentoCockpit.tsx` with cash flow velocity rings, instant payout launcher with 20-digit RIB | M3 | ORIGINAL_REQUEST §R3 |
| 6 | Wallet & Financial Page Integration | Wire `useDashboardStyle().dashboardStyle` into `wallet/page.tsx` and `financial/page.tsx` | M3 | ORIGINAL_REQUEST §R3 |
| 7 | Analytics Bento Cockpit Component | Create `AnalyticsBentoCockpit.tsx` with modular KPI cockpit, ROAS vs Net Margin, heat clock, performance rings | M4 | ORIGINAL_REQUEST §R4 |
| 8 | Analytics & Ads Page Integration | Wire `useDashboardStyle().dashboardStyle` into `analytics/page.tsx` and `ads/page.tsx` | M4 | ORIGINAL_REQUEST §R4 |
| 9 | Zero Anti-Pattern Compliance | Ensure `scripts/detect.mjs` reports 0 anti-patterns across all 6 target pages and 4 new components | M5 | ORIGINAL_REQUEST §Acceptance Criteria |
| 10 | Build & Route Verification | `npm run build -w frontend` succeeds with 0 errors and generates all 109 routes | M5 | ORIGINAL_REQUEST §Acceptance Criteria |
| 11 | Full Test Suite Execution | `npm run test -w frontend` passes 100% green | M5 | ORIGINAL_REQUEST §Acceptance Criteria |
| 12 | Git Synchronization | Clean working directory synchronized with origin/main | M5 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Orders Bento Cockpit | `OrdersBentoCockpit.tsx` + `orders/page.tsx` | None | IN_PROGRESS |
| M2 | Products Bento Cockpit | `ProductsBentoCockpit.tsx` + `products/page.tsx` | None | PLANNED |
| M3 | Wallet & Financial Bento Cockpit | `WalletBentoCockpit.tsx` + `wallet/page.tsx` + `financial/page.tsx` | None | PLANNED |
| M4 | Analytics & Ads Bento Cockpit | `AnalyticsBentoCockpit.tsx` + `analytics/page.tsx` + `ads/page.tsx` | None | PLANNED |
| M5 | Final Verification & Sync | Anti-pattern detector, Turbopack 109 routes build, full test suite, git sync | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### 1. `OrdersBentoCockpitProps` (`frontend/src/components/dashboard/OrdersBentoCockpit.tsx`)
```typescript
export interface OrdersBentoCockpitProps {
  orders: Order[];
  meta?: OrderMeta | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onSelectOrder: (order: Order) => void;
  onFulfillOrder: (order: Order) => void;
  onGenerateLabel: (order: Order) => void;
  onUpdateCodStatus: (
    orderId: string,
    status: 'pending' | 'confirmed' | 'rejected' | 'unreachable' | 'otp_verified',
    callAttemptsDelta?: number,
    notes?: string
  ) => Promise<void>;
  onSendCodOtp: (orderId: string) => Promise<void>;
  onVerifyCodOtp?: (orderId: string, otp: string) => Promise<void>;
  onPrintOrder: (order: Order, kind: 'invoice' | 'delivery_slip') => void;
  onCancelFulfillment: (order: Order) => void;
  updatingCodStatus?: boolean;
  sendingCodOtp?: boolean;
  codFeedback?: string;
  dir?: 'ltr' | 'rtl';
}
```

### 2. `ProductsBentoCockpitProps` (`frontend/src/components/dashboard/ProductsBentoCockpit.tsx`)
```typescript
export interface ProductsBentoCockpitProps {
  products: Product[];
  loading: boolean;
  totalProducts: number;
  storeCounts: {
    total: number;
    published: number;
    draft: number;
    low_stock: number;
  };
  categories: Category[];
  onRefresh: () => Promise<void>;
  onEditProduct: (product: Product) => void;
  onCreateProduct: () => void;
  onDeleteProduct: (product: Product) => void;
  onStatusChange: (product: Product, status: string) => Promise<void>;
  onQuickAdjustStock: (product: Product, newQuantity: number) => Promise<void>;
  limits?: {
    maxProducts?: number;
    currentProducts?: number;
  };
  dir?: 'ltr' | 'rtl';
}
```

### 3. `WalletBentoCockpitProps` (`frontend/src/components/dashboard/WalletBentoCockpit.tsx`)
```typescript
export interface WalletBentoCockpitProps {
  wallet: {
    balance: number | string | null;
    pending_balance: number | string | null;
    total_earned: number | string | null;
    total_withdrawn: number | string | null;
    payout_mode: 'on_demand' | 'automatic';
    retention_days?: number;
  } | null;
  transactions: Array<{
    id: string;
    type: string;
    amount: number | string | null;
    status: string;
    reference?: string | null;
    created_at: string;
  }>;
  onRefresh: () => Promise<void>;
  onRequestPayout?: (amount: number, rib: string) => Promise<void>;
  loading: boolean;
  requestingPayout?: boolean;
  dir?: 'ltr' | 'rtl';
}
```

### 4. `AnalyticsBentoCockpitProps` (`frontend/src/components/dashboard/AnalyticsBentoCockpit.tsx`)
```typescript
export interface AnalyticsBentoCockpitProps {
  data: {
    revenue_trend: Array<{ date: string; revenue: number; orders: number }>;
    order_breakdown: Array<{ status: string; count: number }>;
    top_products: Array<{ id: string; title: string; image_url: string | null; revenue: number; units_sold: number }>;
    revenue_by_day: Array<{ day: number; label: string; revenue: number; orders: number }>;
    kpis: {
      total_revenue: number;
      total_orders: number;
      avg_order_value: number;
      repeat_customer_rate: number;
      conversion_period_growth: number;
    };
  } | null;
  adsData?: {
    account?: { balance: string; reserved_balance: string; total_spend: string; active_campaigns: number } | null;
    analytics?: { impressions: number; clicks: number; ctr: number; average_cpc: number; conversions: number; revenue: string; roas: number } | null;
    daily?: Array<{ stat_date: string; impressions: number; clicks: number; conversions: number; spend: string; revenue: string }>;
  } | null;
  period: 7 | 30 | 90;
  onPeriodChange: (p: 7 | 30 | 90) => void;
  loading: boolean;
  onRefresh?: () => Promise<void>;
  dir?: 'ltr' | 'rtl';
}
```

## Code Layout
- `frontend/src/components/dashboard/OrdersBentoCockpit.tsx` — Orders Bento Cockpit component
- `frontend/src/components/dashboard/ProductsBentoCockpit.tsx` — Products Bento Cockpit component
- `frontend/src/components/dashboard/WalletBentoCockpit.tsx` — Wallet & Financial Bento Cockpit component
- `frontend/src/components/dashboard/AnalyticsBentoCockpit.tsx` — Analytics & Ads Bento Cockpit component
- `frontend/src/app/hub/dashboard/orders/page.tsx` — Orders dashboard page
- `frontend/src/app/hub/dashboard/products/page.tsx` — Products dashboard page
- `frontend/src/app/hub/dashboard/wallet/page.tsx` — Wallet dashboard page
- `frontend/src/app/hub/dashboard/financial/page.tsx` — Financial dashboard page
- `frontend/src/app/hub/dashboard/analytics/page.tsx` — Analytics dashboard page
- `frontend/src/app/hub/dashboard/ads/page.tsx` — Ads dashboard page
