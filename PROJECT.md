# Project: PandaMarket Seller Dashboard Enhancements

## Architecture
The PandaMarket Seller Dashboard (`frontend/src/app/hub/dashboard`) is a multi-tenant merchant control panel built on Next.js 16 (App Router with Turbopack), React 19, TypeScript, and Tailwind CSS v4.

Key architectural boundaries:
- **UI Primitives Layer** (`frontend/src/components/ui/`): Reusable accessible modal dialogs (`Modal.tsx`, `ConfirmDialog.tsx`, `PromptDialog.tsx`), theme toggles, and base components.
- **Merchant Workflow Libraries** (`frontend/src/lib/`): Specialized domain utilities (`tunisia-banking.ts` with Modulo 97 RIB checksum and bank directory, security headers, CSRF fetch helpers).
- **Dashboard Feature Surfaces** (`frontend/src/app/hub/dashboard/`): 38 seller views partitioned into:
  - Finance & Banking (`wallet`, `financial`, `subscription`, `my-subscription-orders`)
  - Compliance & Settings (`kyc`, `settings`, `select-store`, `create-store`, `notifications`, `support`, `reports`)
  - Developer & API (`api-keys`, `webhooks`)
  - Online Store Suite (`online-store`, `domains`, `seo`, `themes`, `customers`, `customize`, `navigation`, `page-builder`)
  - AI Tools Studio (`ai/AiToolsStudio.tsx`)
- **Shared Dashboard Components** (`frontend/src/components/dashboard/`): `OnboardingQuickResume.tsx`, `ReferenceSelector.tsx`, `UnsavedChangesBanner.tsx`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Accessible Modal Primitives | Build accessible `Modal.tsx`, `ConfirmDialog.tsx`, `PromptDialog.tsx` with focus traps, escape key support, and dark mode tokens | M1 | Survey (Explorer 1) |
| 2 | Orders Cancellation Modal | Replace `window.prompt` in `orders/page.tsx` with accessible cancellation modal dialog (reason input, 0/500 char counter, escape key, error handling) | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Products Deletion Modal | Replace `window.confirm` in `products/page.tsx` with accessible deletion modal (product details preview, spinner, escape key) | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Secondary Surface Dialog Eradication | Replace legacy `confirm()` in `my-subscription-orders`, `page-builder`, `settings`, `subscription`, and `webhooks` with custom confirm dialogs | M1 | Survey (Spec Miner / Explorer 1) |
| 5 | Tunisian Banking Library | Implement `tunisia-banking.ts` with 20-digit RIB parser, Modulo 97 checksum computation, and 23-bank directory | M2 | ORIGINAL_REQUEST §R3 |
| 6 | Wallet RIB & Bank Identification | Add structured RIB input, live bank detection badge, checksum validation, and withdrawal summary with retention notes in `wallet/page.tsx` | M2 | ORIGINAL_REQUEST §R3 |
| 7 | Custom Domains DNS & Propagation | Add 1-click DNS record copy with visual feedback, DNS record table (CNAME, A, TXT), and propagation checker hyperlink in `domains/page.tsx` | M2 | ORIGINAL_REQUEST §R3 |
| 8 | Themes Responsive Viewport Previews | Add multi-viewport preview toggles (Desktop 100%, Tablet 768px, Mobile 375px) in `themes/page.tsx` | M2 | ORIGINAL_REQUEST §R3 |
| 9 | Finance & Compliance Dark Mode & Tokens | 100% dark mode parity, `dir={dir}` support, and replace raw `#B91C1C` / `#991B1B` tokens in `financial`, `subscription`, `my-subscription-orders`, `kyc`, `settings`, `select-store`, `create-store`, `notifications`, `support`, `reports`, `reports/[id]` | M3 | ORIGINAL_REQUEST §R2 |
| 10 | Developer & Online Store Dark Mode & Tokens | 100% dark mode parity, `dir={dir}` support, and replace raw `#B91C1C` / `#991B1B` tokens in `api-keys`, `webhooks`, `online-store/page.tsx`, `online-store/seo`, `online-store/customers`, `online-store/customize`, `online-store/navigation`, `themes/customize`, `page-builder`, `ai/AiToolsStudio.tsx` | M3 | ORIGINAL_REQUEST §R2 |
| 11 | Dashboard Shared Components Dark Mode & Tokens | 100% dark mode parity and token harmonization in `OnboardingQuickResume.tsx`, `ReferenceSelector.tsx`, `UnsavedChangesBanner.tsx` | M3 | ORIGINAL_REQUEST §R2 |
| 12 | Deterministic Anti-Pattern Detector | Implement `scripts/detect.mjs` validating 0 native dialogs, 0 legacy red hexes, 100% dark mode coverage, and 0 empty handlers | M4 (E2E) | ORIGINAL_REQUEST §Verification |
| 13 | Full Build & Route Compilation | Verify `npm run build` succeeds with 0 TypeScript/Turbopack errors and generates all 109 routes | M4 | ORIGINAL_REQUEST §Verification |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Eradicate Native Dialogs & Modal Primitives | Create `Modal.tsx`, `ConfirmDialog.tsx`, `PromptDialog.tsx`; refactor `orders/page.tsx`, `products/page.tsx`, and secondary dialogs | none | PLANNED |
| M2 | Tunisian Merchant Workflow Enhancements | Create `tunisia-banking.ts`; enhance `wallet/page.tsx`, `domains/page.tsx`, `themes/page.tsx` | M1 | PLANNED |
| M3 | 100% Dark Mode Parity & Token Harmonization across 28 Surfaces | Refactor all 28 unpolished surfaces (Financial, Compliance, Online Store, Developer, AI Tools, Components) with standard tokens and `dir={dir}` | M1 | PLANNED |
| M4 | Final Full Build, E2E Detector & Verification | Run detector suite (`scripts/detect.mjs`), `npm run build` (109 routes), and synchronize Git | M1, M2, M3 | PLANNED |

## Interface Contracts

### Modal & Dialog Primitives (`frontend/src/components/ui/`)
- `Modal`: `isOpen: boolean`, `onClose: () => void`, `title?: ReactNode`, `subtitle?: ReactNode`, `children: ReactNode`, `footer?: ReactNode`, `maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'`
- `ConfirmDialog`: `isOpen: boolean`, `onClose: () => void`, `onConfirm: () => void | Promise<void>`, `title: string`, `description: ReactNode`, `confirmLabel?: string`, `cancelLabel?: string`, `variant?: 'danger' | 'warning' | 'primary'`, `loading?: boolean`
- `PromptDialog`: `isOpen: boolean`, `onClose: () => void`, `onSubmit: (value: string) => void | Promise<void>`, `title: string`, `description?: string`, `label?: string`, `placeholder?: string`, `maxLength?: number`, `required?: boolean`, `inputType?: 'text' | 'textarea'`, `loading?: boolean`

### Tunisian Banking Utility (`frontend/src/lib/tunisia-banking.ts`)
- `computeTunisianRibKey(base18: string): string`: Computes 2-digit Clé RIB using `97 - (BigInt(clean18 + '00') % 97n)`.
- `validateTunisianRib(rawRib: string)`: Returns `{ isValid: boolean, bankCode?: string, branchCode?: string, accountNumber?: string, ribKey?: string, bankName?: string, error?: string }`.
- `TUNISIAN_BANKS`: Record of 2-digit bank codes to bank metadata (`nameFr`, `nameAr`, `bic`, `code`).

### Design Tokens Standard
- Surface Primary: `bg-white dark:bg-slate-900`
- Surface Secondary / Well: `bg-slate-50/50 dark:bg-slate-800/40`
- Borders: `border-slate-200/80 dark:border-slate-800`
- Text Primary: `text-slate-900 dark:text-white`
- Text Secondary: `text-slate-500 dark:text-slate-400`
- Buttons Primary: `bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium shadow-2xs`
- Danger Badges: `bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50`
- Elevation: `shadow-2xs` or `shadow-sm`

## Code Layout
```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Modal.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── PromptDialog.tsx
│   │   └── dashboard/
│   │       ├── OnboardingQuickResume.tsx
│   │       ├── ReferenceSelector.tsx
│   │       └── UnsavedChangesBanner.tsx
│   ├── lib/
│   │   └── tunisia-banking.ts
│   └── app/
│       └── hub/
│           └── dashboard/
│               ├── orders/page.tsx
│               ├── products/page.tsx
│               ├── wallet/page.tsx
│               ├── financial/page.tsx
│               ├── kyc/page.tsx
│               ├── settings/page.tsx
│               ├── select-store/page.tsx
│               ├── create-store/page.tsx
│               ├── notifications/page.tsx
│               ├── support/page.tsx
│               ├── reports/page.tsx
│               ├── reports/[id]/page.tsx
│               ├── api-keys/page.tsx
│               ├── webhooks/page.tsx
│               ├── subscription/page.tsx
│               ├── my-subscription-orders/page.tsx
│               ├── online-store/
│               │   ├── page.tsx
│               │   ├── domains/page.tsx
│               │   ├── seo/page.tsx
│               │   ├── themes/page.tsx
│               │   ├── themes/customize/page.tsx
│               │   ├── customers/page.tsx
│               │   ├── customize/page.tsx
│               │   └── navigation/page.tsx
│               ├── page-builder/page.tsx
│               └── ai/AiToolsStudio.tsx
scripts/
└── detect.mjs
```
