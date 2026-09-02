---
target: seller dashboard/ads
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-09-02T02-03-36Z
slug: frontend-src-app-hub-dashboard-ads-page-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 3/4 | Refill uploads lack percentage progress; no skeleton state during initial fetch. |
| 2 | Match System / Real World | 3/4 | Clear Tunisian banking vocabulary (RIB, CIN, Mandat, TND); acronyms (CPC, CPM, ROAS) lack tooltips. |
| 3 | User Control and Freedom | 3/4 | Step navigation and localStorage draft preservation work well; hidden campaigns lack an unhide tab. |
| 4 | Consistency and Standards | 2/4 | Subcomponents (MediaPicker, Preview) have un-themed tokens and hardcoded English strings. |
| 5 | Error Prevention | 3/4 | Robust step-by-step wizard budget checks; editing approved ads lacks explicit re-moderation notice. |
| 6 | Recognition Rather Than Recall | 4/4 | Rich product dropdown with thumbnails and live prices; live creative preview; 1-click bid suggestions. |
| 7 | Flexibility and Efficiency | 3/4 | Quick date and refill presets; AI copy suggestions; lacks bulk campaign actions and search filter. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Serene monochrome containers with subtle semantic tints; 8-metric KPI grid can wrap on smaller laptops. |
| 9 | Error Recovery | 3/4 | Inline alerts with rejection reasons; coupon and creation errors fall back to top global banner. |
| 10 | Help and Documentation | 2/4 | Basic microcopy present; missing placement preview visual map and merchant marketing guide. |
| **Total** | | **29/40** | **Good** |

#### Design Specificity Verdict

**LLM assessment**: The Seller Ads Center demonstrates strong domain and regional grounding for Tunisian e-commerce sellers. Native 3-decimal TND currency formatting, multi-channel payment support (Flouci, Konnect, STB Mandat with RIB/IBAN/CIN), and direct catalog-to-ad workflows give it authenticity. Gaps remain in subcomponent design token harmonization (`AdsCreativeMediaPicker`, `AdsCreativePreview`) and browser prompt invocations.

**Deterministic scan**: 0 anti-pattern violations detected across all target files (`page.tsx`, `AdsCampaignWizard.tsx`, `AdsPerformanceCharts.tsx`). Clean adherence to 4px spacing tokens, absence of artificial AI gradients, and full light/dark mode surface coverage.

#### Overall Impression
A highly functional and well-structured advertising suite tailored to local Tunisian merchants. The visual hierarchy and calm aesthetic are solid; the primary opportunities lie in upgrading browser primitives to branded dialogs, harmonizing peripheral subcomponents, and bolstering accessibility attributes.

#### What's Working
1. **Catalog-Integrated Campaign Wizard**: Rich product picker with live thumbnails, prices, and 1-click AI copywriting suggestions delivers a rapid authoring flow.
2. **Comprehensive Tunisian Payment Dual-Track**: Seamless coexistence of digital wallets and traditional bank transfer / postal mandat with receipt upload.
3. **Focused ROI & Reach Visualizations**: Purpose-built dual line charts separating engagement metrics from financial returns.

#### Priority Issues
- **[P1] Inconsistent Tokens & Hardcoded Strings in Subcomponents**: `AdsCreativeMediaPicker.tsx` and `AdsCreativePreview.tsx` deviate in palette and use un-localized English strings.
  - *Why it matters*: Fractures design consistency and degrades merchant trust.
  - *Fix*: Align with dashboard tokens (`bg-slate-900 dark:bg-white`, `rounded-xl`, dark mode variants) and localize strings.
  - *Suggested command*: `$impeccable polish`
- **[P1] Invasive Browser Primitives (`window.prompt` & `window.confirm`)**: Promo code redemption and campaign hiding use native browser dialogs.
  - *Why it matters*: Breaks keyboard/screen-reader flows and looks unpolished.
  - *Fix*: Replace with inline promo redemption cards and undoable confirmation dialogs.
  - *Suggested command*: `$impeccable refine`
- **[P2] Missing Moderation & Admin Processing SLA Timeframe**: Merchants have no estimate of when manual payments or ads are reviewed.
  - *Why it matters*: Causes merchant anxiety and duplicate submissions.
  - *Fix*: Add explicit review timeframe notices (*"Validation moyenne : 2 à 4h ouvrées"*).
  - *Suggested command*: `$impeccable clarify`
- **[P2] Accessibility Attributes on Modals and Icon-Only Buttons**: Missing `role="dialog"`, `aria-label`, and `scope="col"`.
  - *Why it matters*: Impedes screen-reader users and keyboard navigation.
  - *Fix*: Add comprehensive ARIA tags and accessible labels.
  - *Suggested command*: `$impeccable harden`
- **[P3] Mobile Touch Ergonomics on SVG Charts & Compact Buttons**: Hover-only SVG tooltip and compact touch targets.
  - *Why it matters*: Touch users on phones cannot reliably inspect chart points.
  - *Fix*: Add touch interaction handlers and ensure 44px touch targets.
  - *Suggested command*: `$impeccable adapt`

#### Persona Red Flags
- **Alex (Power User)**: Lacks search bar, status filtering, and bulk pause/resume for large campaign portfolios; no CSV export.
- **Jordan (First-Timer)**: Unfamiliar acronyms (CPC, CPM, ROAS) lack explanatory tooltips; unclear why campaign requires admin review before activating.
- **Sam (Accessibility-Dependent)**: SVG charts lack ARIA descriptions; `window.prompt` disrupts screen-reader focus; modal dialogs lack standard ARIA roles.

#### Minor Observations
- Success notifications for coupon redemption render at the top of the dashboard, which may be out of viewport if scrolled.
- Auto-refill state exists but could benefit from a dedicated settings management card.

#### Questions to Consider
- "Could merchants boost top-selling products in 1 click directly from the Product Inventory list without entering the full Ads Center?"
- "Would displaying estimated Merchant Profit Margin alongside ROAS help artisans better budget their ad spend?"
