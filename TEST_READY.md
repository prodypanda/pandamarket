# TEST_READY: PandaMarket Seller Dashboard Test Infrastructure & Quality Gates

**Status**: READY  
**Author**: E2E Testing Track Agent  
**Date**: 2026-09-03  
**Integrity Mode**: Development / Strict Verification  

---

## 1. Overview & Verification Philosophy

The PandaMarket Seller Dashboard enhancement track utilizes deterministic quality gates and production compilation to ensure zero regression, complete eradication of disruptive native dialogs, token harmonization, and 100% dark mode parity.

The primary automated quality gate is the deterministic anti-pattern detector (`scripts/detect.mjs`), accompanied by Next.js Turbopack production compilation (`npm run build` across all 109 routes).

---

## 2. Test Runner Commands

### 2.1 Deterministic Anti-Pattern Detector
```bash
# Run human-readable detector report (exits with 0 if clean, 1 if violations exist)
node scripts/detect.mjs

# Run structured JSON output for CI / automated toolchains
node scripts/detect.mjs --json

# Run compact summary mode
node scripts/detect.mjs --summary
```

### 2.2 Next.js Full Production Build & Type-Check
```bash
# Verify static generation and TypeScript compilation for all 109 routes
cd frontend && npm run build
```

---

## 3. Detector Rules & Enforcement

The detector scans all 58 `.tsx` files in:
- `frontend/src/app/hub/dashboard/**/*.tsx` (40 files)
- `frontend/src/components/dashboard/**/*.tsx` (18 files)

### Rule 1: Native Browser Dialog Eradication (`nativeDialogs`)
- **Enforcement**: Zero occurrences of `window.alert`, `window.confirm`, `window.prompt`, `alert(`, `confirm(`, `prompt(`.
- **Allowed Alternative**: Custom accessible dialog components (`frontend/src/components/ui/Modal.tsx`, `ConfirmDialog.tsx`, `PromptDialog.tsx`).
- **Baseline Violations**: 8 occurrences across 8 files (`my-subscription-orders`, `orders`, `page-builder`, `products`, `settings`, `subscription`, `webhooks`, `SellerOrderDrawer`).

### Rule 2: Raw Red Hex Color Tokens (`rawRedHexTokens`)
- **Enforcement**: Zero occurrences of `#B91C1C`, `#991B1B`, `#7F1D1D`, `#3B0D0D`, `#DC2626`, `#EF4444` (case-insensitive).
- **Allowed Alternative**: Standard PandaMarket design tokens (`bg-slate-900 dark:bg-white`, `border-slate-200/80 dark:border-slate-800`, `text-slate-900 dark:text-white`, `bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400`).
- **Baseline Violations**: 440 occurrences across 24 files.

### Rule 3: Missing Dark Mode Class Pairing (`missingDarkMode`)
- **Enforcement**: All major container, card, and surface elements must have explicit `dark:` class pairings (`dark:bg-slate-900`, `dark:border-slate-800`, `dark:text-white`). Zero unstyled/white-box surfaces.
- **Baseline Violations**: 32 surfaces requiring complete token pairing.

### Rule 4: Empty Inline Event Handlers (`emptyInlineHandlers`)
- **Enforcement**: Zero no-op handler stubs (`onClick={() => {}}`, `onChange={() => {}}`, etc.).
- **Allowed Alternative**: Connected handlers, state setters, or disabled button states.
- **Baseline Violations**: 2 occurrences in `products/page.tsx`.

---

## 4. Quality Gate Verification Checklist

| Milestone | Target | Verification Command | Target Result |
|---|---|---|---|
| **M1** | Dialog Eradication | `node scripts/detect.mjs` | Rule 1 = 0 violations |
| **M2** | Tunisian Workflows | `npm run build` | 0 TypeScript errors, 109 routes |
| **M3** | Dark Mode & Tokens | `node scripts/detect.mjs` | Rule 2 & Rule 3 = 0 violations |
| **M4** | Full Gate Verification | `node scripts/detect.mjs && cd frontend && npm run build` | Exit code 0, 0 total violations, 109 routes |

---

## 5. Baseline Summary

```
Total Files Scanned: 58 TSX files
Rule 1 (Native Dialogs): 8 violations
Rule 2 (Raw Red Hexes): 440 violations
Rule 3 (Missing Dark Mode): 32 surfaces
Rule 4 (Empty Event Handlers): 2 violations
---------------------------------------------------------------
Total Baseline Violations: 482
Production Build: PASSED (109/109 routes generated in 20.8s)
```
