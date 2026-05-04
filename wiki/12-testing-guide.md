# 12 — Testing Guide

## Overview

| Level | Tool | Count | Location |
|-------|------|-------|----------|
| **Unit Tests** (Backend) | Vitest | 9 suites | `backend/src/__tests__/` |
| **Unit Tests** (Frontend) | Vitest + RTL | 3 suites | `frontend/src/__tests__/` |
| **E2E Tests** | Playwright | 6 files | `frontend/e2e/` |
| **Load Tests** | k6 | 3 scripts | `tests/load/` |

## Running Tests

### Backend Unit Tests

```powershell
# Run all backend tests
npm run test -w backend

# Run a specific test file
npx vitest run src/__tests__/wallet.service.test.ts -w backend

# Run with coverage
npx vitest run --coverage -w backend
```

### Frontend Unit Tests

```powershell
# Run all frontend tests
npm run test -w frontend

# Run a specific test
npx vitest run src/__tests__/cart-context.test.tsx -w frontend
```

### E2E Tests (Playwright)

```powershell
# Make sure dev servers are running first!
# Then run E2E tests:
npx playwright test -w frontend

# Run a specific test file
npx playwright test e2e/auth-flow.spec.ts -w frontend

# Run with UI mode (interactive)
npx playwright test --ui -w frontend
```

### Load Tests (k6)

```powershell
# Install k6 first: https://k6.io/docs/get-started/installation/
k6 run tests/load/search.js
k6 run tests/load/checkout.js
k6 run tests/load/vendor-api.js
```

## Backend Test Suites

### 1. `wallet.service.test.ts`
Tests wallet operations: getByStore, create, roundTnd parsing, balance calculations.

### 2. `auth.service.test.ts`
Tests authentication: register, login, lockout after 5 failed attempts, issueTokens, forgot/reset password, logout with token revocation.

### 3. `subscription.service.test.ts`
Tests subscription logic: listAll plans, getLimits with caching, downgrade blocking when product count exceeds new plan limits.

### 4. `kyc.service.test.ts`
Tests KYC workflow: submit documents, re-submit after rejection, block re-submit when pending, block when already approved.

### 5. `payment-providers.test.ts`
Comprehensive 5-section test suite:
- **FlouciProvider:** init escrow/direct, verify success/fail, vendor creds, error handling
- **KonnectProvider:** init, verify completed/pending/failed, vendor creds
- **ManualMandatProvider:** init instructions, verify approved/pending/rejected/no-proof
- **CodProvider:** init, verify always pending
- **Provider Registry:** getPaymentProvider, decryptVendorConfig, invalid gateway, corrupted config

### 6. `payment.service.test.ts`
Tests payment service: initPayment with provider registry, processPaymentWebhook with idempotency.

### 7. `tenant-isolation.test.ts`
8 test sections covering multi-tenant security:
- Product ownership, wallet isolation, order isolation
- AI job isolation, API key isolation
- Cross-store wallet prevention, cross-store product modification
- Store resolution

### 8. `mandat.service.test.ts`
17 tests: uploadProof (5), approve (3), reject (3), listByStatus (4), getById (2).

### 9. `page-builder.service.test.ts`
9 tests: assertHasPageBuilder (Regular+ allow, Free/Starter block, nonexistent store), listPages, listPublishedPages (no builder_data leak), getPageById (tenant isolation), createPage (slug validation, 20-page limit, homepage unset), deletePage (tenant isolation), getHomepageOverride, size validation (5MB limit).

## Frontend Test Suites

### 1. `cart-context.test.tsx` (12 tests)
Tests CartContext provider: add items, remove items, update quantity, clear cart, groupByStore, variant handling, total calculation.

### 2. `csv-export.test.ts` (10 tests)
Tests CSV export utility: auto-detect columns, custom columns, special character escaping, null/array/Date handling.

### 3. `skeleton.test.tsx` (9 tests)
Tests all 6 skeleton component variants (Skeleton, ProductCardSkeleton, ProductGridSkeleton, ProductDetailSkeleton, OrderListSkeleton, DashboardStatsSkeleton), responsive grid, custom props.

## E2E Test Files

| File | Coverage |
|------|----------|
| `hub-navigation.spec.ts` | Hub homepage, search, category browsing, product detail |
| `auth-flow.spec.ts` | Login, register, forgot password, email verification |
| `vendor-dashboard.spec.ts` | Dashboard overview, products CRUD, orders, wallet |
| `checkout-flow.spec.ts` | Cart, checkout with different payment methods |
| `admin-panel.spec.ts` | Admin login, KYC queue, mandat queue, reports |
| `api-health.spec.ts` | Health endpoint, ready endpoint, API responses |

**Playwright config:** 4 browser projects (chromium, firefox, mobile-chrome, mobile-safari).

## Load Test Scripts

| Script | VUs | Target | Threshold |
|--------|-----|--------|-----------|
| `search.js` | 100 | Search endpoint | p95 < 100ms |
| `checkout.js` | 20 | Full checkout flow | p95 < 500ms |
| `vendor-api.js` | 30 | Vendor API (CRUD) | p95 < 300ms |

Each script includes ramp-up stages, custom metrics, and threshold assertions.

## CI/CD Pipeline

The `.gitlab-ci.yml` runs tests automatically:

```
Push/MR --> Lint --> Test --> Security --> Build --> E2E
```

1. **Lint:** TypeScript type-check + ESLint (backend + frontend)
2. **Test:** Vitest with PostgreSQL + Redis services in CI
3. **Security:** SAST, Secret Detection, Dependency Scanning, npm audit
4. **Build:** `tsc` (backend) + `next build` (frontend)
5. **E2E:** Playwright tests (on merge to main)

### CI Test Environment
The test stage spins up PostgreSQL and Redis as CI services:
- PostgreSQL: `postgres:16-alpine` with test database
- Redis: `redis:7.2-alpine`

## Writing New Tests

### Backend Test Convention
```typescript
// File: backend/src/__tests__/my-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('myMethod()', () => {
    it('should do something expected', async () => {
      // Arrange
      const input = { ... };

      // Act
      const result = await myService.myMethod(input);

      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

### Frontend Test Convention
```typescript
// File: frontend/src/__tests__/my-component.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from '../components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Naming Convention
- Backend: `[service-name].service.test.ts` or `[feature].test.ts`
- Frontend: `[component-name].test.tsx` or `[utility].test.ts`
- E2E: `[flow-name].spec.ts`
