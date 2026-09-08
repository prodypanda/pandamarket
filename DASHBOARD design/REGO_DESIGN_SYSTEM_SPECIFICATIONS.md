# ReGo Visual Design System Specifications (PandaMarket Dashboards)

## 1. Executive Summary & Design Philosophy

The **ReGo Design System** represents a state-of-the-art, modernist aesthetic engineered specifically for high-velocity e-commerce and multi-tenant marketplace governance.

Extracted directly from the official ReGo project artifacts (`pandamarket-seller-cockpit.html` and the 67 template surfaces), this design language balances **maximum information density** with **tactile visual clarity**. It replaces traditional bulky card padding with refined hairline borders, subtle OKLCH color mixing, responsive typography scales, and modular bento grid primitives.

---

## 2. Core Color Architecture & OKLCH Mixing Tokens

The design system utilizes **OKLCH color space mixing** (`color-mix(in oklch, ...)`) to ensure perceptually uniform contrast, smooth dark/light transitions, and harmonious color blending.

### A. Global Semantic Tokens (Light & Dark Foundations)

```css
:root {
  /* Surface & Canvas Tokens */
  --bg: #ffffff;
  --surface: #f5f5f5;
  --fg: #111111;
  --muted: #949494;
  --border: #dedede;
  --inv: #ffffff;

  /* Primary Marketplace Brand Accent */
  --accent: #ad0505;

  /* Derived OKLCH Text Inks */
  --ink-2: color-mix(in oklch, var(--fg) 55%, var(--muted)); /* Secondary copy */
  --ink-3: color-mix(in oklch, var(--fg) 32%, var(--muted)); /* Subtle metadata & hints */
  --fg-soft: color-mix(in oklch, var(--fg) 5%, transparent);  /* Hover fills */

  /* Derived OKLCH Accent Inks */
  --accent-soft: color-mix(in oklch, var(--accent) 10%, transparent); /* Badge backgrounds */
  --accent-soft2: color-mix(in oklch, var(--accent) 16%, #ffffff);   /* Hover chip tints */
  --accent-ink: color-mix(in oklch, var(--accent) 14%, var(--fg));   /* High-contrast brand text */
  --accent-deep: color-mix(in oklch, var(--accent) 86%, #111111);   /* Pressed buttons & borders */
  --accent-line: color-mix(in oklch, var(--accent) 38%, #ffffff);   /* Accent outlines */
  --accent-live: color-mix(in oklch, var(--accent) 55%, transparent);/* Pulsing live badges */

  /* Surface Lines & Glassmorphism */
  --on-ink: color-mix(in oklch, var(--bg) 92%, transparent);
  --on-ink-2: color-mix(in oklch, var(--bg) 58%, transparent);
  --line-ink: color-mix(in oklch, var(--bg) 18%, transparent);
  --glass: color-mix(in oklch, #ffffff 80%, transparent);

  /* Shadows & Elevation */
  --shadow-s: 0 1px 2px color-mix(in oklch, var(--fg) 5%, transparent), 0 1px 1px color-mix(in oklch, var(--fg) 4%, transparent);
  --sh1: 0 1px 2px color-mix(in oklch, #111111 6%, transparent);
  --sh2: 0 10px 30px -12px color-mix(in oklch, #111111 22%, transparent), 0 2px 6px color-mix(in oklch, #111111 6%, transparent);

  /* Geometry */
  --r: 8px; /* Standard card & button corner radius */
}

/* Dark Mode Foundation */
[data-theme="dark"],
.dark {
  --bg: #0f0f0f;
  --surface: #181818;
  --fg: #f3f3f3;
  --muted: #787878;
  --border: #282828;
  --inv: #000000;
  --glass: color-mix(in oklch, #181818 80%, transparent);
  --shadow-s: 0 1px 2px rgba(0, 0, 0, 0.4), 0 1px 1px rgba(0, 0, 0, 0.3);
  --sh2: 0 10px 30px -12px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4);
}
```

---

### B. The 6 Regional Color Accent Palettes

Merchants and Superadmins can select their preferred accent colorway. Each palette defines light and dark variables:

1. **Panda Rouge (Crimson)** — Default:
   - Light: `--a: oklch(0.5 0.15 40); --asoft: oklch(0.93 0.05 44); --ac: oklch(0.4 0.13 40);`
   - Dark: `--a: oklch(0.8 0.11 44); --asoft: oklch(0.3 0.06 44); --ac: oklch(0.85 0.1 45);`
2. **Ocre Terracotta (`.acc-ocre`)**:
   - Light: `--a: oklch(0.62 0.13 78); --asoft: oklch(0.94 0.06 82); --ac: oklch(0.5 0.12 80);`
   - Dark: `--a: oklch(0.84 0.1 80); --asoft: oklch(0.3 0.06 82); --ac: oklch(0.86 0.09 82);`
3. **Olive Méditerranée (`.acc-olive`)**:
   - Light: `--a: oklch(0.47 0.11 122); --asoft: oklch(0.93 0.05 124); --ac: oklch(0.36 0.1 122);`
   - Dark: `--a: oklch(0.78 0.11 124); --asoft: oklch(0.3 0.07 124); --ac: oklch(0.84 0.1 124);`
4. **Bleu Sidi Bou Saïd (`.acc-bleu`)**:
   - Light: `--a: oklch(0.48 0.14 252); --asoft: oklch(0.93 0.05 254); --ac: oklch(0.4 0.13 252);`
   - Dark: `--a: oklch(0.76 0.12 252); --asoft: oklch(0.3 0.08 252); --ac: oklch(0.83 0.11 250);`
5. **Prune Artisanale (`.acc-prune`)**:
   - Light: `--a: oklch(0.45 0.13 8); --asoft: oklch(0.93 0.05 10); --ac: oklch(0.36 0.12 8);`
   - Dark: `--a: oklch(0.78 0.11 6); --asoft: oklch(0.3 0.07 8); --ac: oklch(0.84 0.1 8);`
6. **Charbon Tunis (`.acc-charbon`)**:
   - Light: `--a: oklch(0.36 0.02 90); --asoft: oklch(0.91 0.01 90); --ac: oklch(0.28 0.02 90);`
   - Dark: `--a: oklch(0.82 0.03 90); --asoft: oklch(0.34 0.02 90); --ac: oklch(0.88 0.03 90);`

---

## 3. Typography & Heading Weights Engine

### A. Font Families & Fallbacks
- Primary Body & Interface: `'Inter', 'Inter Fallback', system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`
- Tabular Monospace (Prices, SKUs, RIBs, Hashes): `ui-monospace, Consolas, "Liberation Mono", monospace`

### B. Heading Weight Options
Users can adjust heading character and optical weight:
- **`ty-fort` (Strong & Punchy)**: `--thw: 820; --thls: -0.03em;` (Maximum visual hierarchy for executive overviews).
- **`ty-standard` (Balanced)**: `--thw: 650; --thls: -0.018em;` (Default enterprise balance).
- **`ty-clair` (Light & Elegant)**: `--thw: 520; --thls: -0.004em;` (Editorial, luxury, and boutique stores).

### C. Fluid Typographic Scale
- Large KPI Metric: `--fs-kpi: clamp(30px, 2.6vw, 46px)`
- Hero Titles: `--fs-big: clamp(20px, 2vw, 30px)`
- Section H2 Titles: `--fs-h: 24px`
- Contextual Subtitles: `--fs-sub: 15px`
- Table & Body Text: `13px` or `14px`
- Badges & Micro-tags: `10px` or `11px` uppercase tracking

---

## 4. Density & Spacing Engine (Ergonomics)

Density classes adjust card padding (`--cp`) and grid gaps (`--gg`):
- **Compact (`.den-comp`)**: `--cp: 5px; --gg: 6px;`
  - *Best for*: Order books, logistics dispatch, server logs, financial ledgers, audit trails.
- **Standard (Default)**: `--cp: 8px; --gg: 8px;`
  - *Best for*: General catalog editing, customer directory, messaging inbox.
- **Airy (`.den-air`)**: `--cp: 11px; --gg: 12px;`
  - *Best for*: Visual store customizer, marketing campaigns, analytics presentations.

---

## 5. Component Primitives & Visual Patterns

### 1. The Bento Card & Split Card (`.card`, `.cardsplit`)
- Border: `1px solid var(--border)`
- Background: `var(--bg)` with optional subtle glass overlay `var(--glass)`
- Border radius: `var(--r: 8px)`
- Structure:
  - Header: `.card-head` (Title, description, action menu).
  - Body: `.card-body` (Data surface, charts, forms).
  - Split Cards (`.cardsplit`): Divide horizontal real estate into two asymmetric zones (e.g. 40% metrics / 60% chart).

### 2. KPI Hero Widget (`.kpi-hero`)
- Features large fluid typography `--fs-kpi` with font-variant-numeric: tabular-nums.
- Embedded trend pill: `.bchip-ok` (`+14.2%`) or `.bchip-warn` (`-3.1%`).
- Integral sparkline chart container with minimal padding.

### 3. Status Badge Chips (`.bchip`)
- Minimalist rounded badges (`border-radius: 9999px` or `4px`):
  - `.bchip-ok`: Emerald tint background with deep green text (`color-mix(in oklch, #10b981 12%, transparent)`).
  - `.bchip-warn`: Amber tint background (`color-mix(in oklch, #f59e0b 12%, transparent)`).
  - `.bchip-err`: Crimson tint background (`color-mix(in oklch, var(--accent) 12%, transparent)`).
  - `.bchip-accent`: Brand accent tint.

### 4. Monetary Amount Box (`.amt`, `.amtbox`)
- Special component for Tunisian Dinar formatting:
  - Integer portion: Bold, high contrast.
  - Millimes portion: Raised, medium contrast, 3 decimal places (`.500`).
  - Currency label: `TND` in uppercase monospace pill.

### 5. Buttons & Interactive Controls
- `.btn`: Base button with `--r: 8px`, smooth hover transition.
- `.btn-ink`: Solid high-contrast button (`bg: var(--fg); text: var(--bg)`).
- `.btn-outline-ink`: Hairline border with transparent background.
- `.btn-sm`: Compact button for table rows and action menus.
- `.btn-danger`: Red action button for irreversible deletions or cancellations.
- `.btn-ghost`: Borderless icon button for toolbars.

### 6. Inspection Drawer & Modals
- **Drawer (`.drawer`)**: Slides out smoothly from the right, `backdrop-filter: blur(8px)`, fixed action footer.
- **Modal (`.modal`)**: Centered on screen, `max-width: 560px` or `840px`, backdrop blur, `z-index: 50+`.
