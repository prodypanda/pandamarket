# E2E Test Infra: PandaMarket Seller Dashboard

## Test Philosophy
- **Requirement-Driven & Opaque-Box**: Derived strictly from `ORIGINAL_REQUEST.md` and user requirements.
- **Deterministic Quality Gates**: Continuous verification via automated detector scripts (`scripts/detect.mjs`), TypeScript type safety (`tsc --noEmit`), and full production compilation (`npm run build` targeting 109 routes).

## Feature Inventory
| # | Feature | Source | Tier 1 (Functional) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Workload) |
|---|---------|--------|:-------------------:|:-----------------:|:----------------------:|:-----------------:|
| 1 | Orders Cancellation Modal | ORIGINAL_REQUEST §R1 | ✓ (Modal renders on cancel) | ✓ (Escape key, 0/500 char limits) | ✓ (State update & order refresh) | ✓ (Real cancellation flow) |
| 2 | Products Deletion Modal | ORIGINAL_REQUEST §R1 | ✓ (Modal renders on delete) | ✓ (Backdrop click / escape) | ✓ (Optimistic UI update) | ✓ (Catalog delete flow) |
| 3 | Reusable Modal & Dialogs | Spec Mining | ✓ (Modal, Confirm, Prompt open/close) | ✓ (Focus trap, aria-modal, keybindings) | ✓ (Dark/light theme rendering) | ✓ (Interactive dialog suites) |
| 4 | Tunisian RIB Validation (Modulo 97) | ORIGINAL_REQUEST §R3 | ✓ (20-digit string check) | ✓ (Non-digit chars, invalid length, invalid key) | ✓ (Live bank detection badge) | ✓ (Payout withdrawal submission) |
| 5 | Custom Domains 1-Click DNS Copy | ORIGINAL_REQUEST §R3 | ✓ (Copy button invokes clipboard) | ✓ (Visual 2s feedback toast) | ✓ (Propagation link formatting) | ✓ (Merchant domain setup) |
| 6 | Responsive Theme Viewports | ORIGINAL_REQUEST §R3 | ✓ (Desktop/Tablet/Mobile toggles) | ✓ (Container dimensions & scale) | ✓ (Theme selection & live preview) | ✓ (Storefront design workflow) |
| 7 | 28 Dark Mode Surfaces Parity | ORIGINAL_REQUEST §R2 | ✓ (100% paired dark: classes) | ✓ (0 raw red hexes `#B91C1C`/`#991B1B`) | ✓ (Contrast in light & dark modes) | ✓ (Full dashboard navigation) |
| 8 | Bidirectional Layout (dir={dir}) | ORIGINAL_REQUEST §R2 | ✓ (RTL / LTR support) | ✓ (Arabic locale font & alignments) | ✓ (Theme toggle + language switch) | ✓ (Arabic seller store management) |

## Test Architecture
- **Detector Script**: `scripts/detect.mjs`
  - Validates 0 occurrences of `window.confirm`, `window.alert`, `window.prompt`, `confirm(`, `prompt(`, `alert(` in `frontend/src/app/hub/dashboard`.
  - Validates 0 raw red hex codes (`#B91C1C`, `#991B1B`, `#7F1D1D`, `#3B0D0D`).
  - Validates dark mode pairing and lack of empty handler stubs.
- **Next.js Production Build**:
  - `cd frontend && npm run build` verifying static page generation for all 109 routes with 0 TypeScript/Turbopack errors.
- **Unit & Logic Tests**:
  - Algorithmic validation for `tunisia-banking.ts` (STB, BIAT, BNA, Poste Tunisienne).

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Expected Outcome |
|---|----------|--------------------|------------------|
| 1 | Merchant cancels unfulfillable order | Orders Cancellation Modal, Character Counter | Modal appears with textarea, limits 500 chars, submits reason to API, cancels order cleanly |
| 2 | Merchant removes obsolete product | Products Deletion Modal, Confirm Dialog | Custom confirmation modal opens with product details, cancels on Escape, deletes on confirm |
| 3 | Tunisian merchant requests payout | Wallet RIB Input, Bank Identification, Summary Card | User inputs 20-digit RIB, bank badge displays "BIAT", summary shows statutory retention notes |
| 4 | Merchant configures custom domain | Domains DNS Table, 1-Click Copy, Propagation Checker | Merchant copies CNAME with 1 click, sees "Copié !" visual feedback, clicks external DNS check link |
| 5 | Merchant previews and applies theme | Themes Viewport Toggles (Desktop/Tablet/Mobile) | Merchant switches viewport sizes to verify responsive layout before activation |
| 6 | Arabic merchant navigates full dashboard in Dark Mode | Dark Mode Parity & dir="rtl" across 28 surfaces | All 28 surfaces render with high-contrast slate-900 / dark:bg-white tokens in RTL layout |

## Coverage Thresholds
- 0 native dialog anti-patterns across all 38 seller dashboard routes
- 0 raw red hex token violations across all 28 target surfaces
- 100% successful generation of 109 routes during `npm run build`
- 100% clean check from `scripts/detect.mjs`
