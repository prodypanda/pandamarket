# PandaMarket Dashboard Architecture: Page Layout & Element Ordering Standards

## 1. Executive Summary

To achieve supreme visual consistency, ergonomic flow, and seamless multi-theme switching, every page across the **Seller Dashboard** and **Superadmin Dashboard** must adhere to an uncompromising **8-Layer Anatomical Hierarchy**.

Regardless of whether a user selects **Bento Cockpit**, **Classique E-Commerce**, or the incoming **OpenDesign** template, the top-to-bottom and contextual progression of elements follows this exact blueprint.

---

## 2. Universal 8-Layer Anatomical Hierarchy

```
+-----------------------------------------------------------------------------------+
| LAYER 1: Breadcrumb Navigation & Scope Path (Home > Section > Sub-section)       |
+-----------------------------------------------------------------------------------+
| LAYER 2: Page Header Bar (Title, Icon, Status Tag, Live Refresh, Primary Actions) |
+-----------------------------------------------------------------------------------+
| LAYER 3: Critical Operational Banner (Conditional: KYC, COD Warning, Low Stock)    |
+-----------------------------------------------------------------------------------+
| LAYER 4: Telemetry & KPI Cards Strip (3 to 5 Metrics with Comparison Delta)       |
+-----------------------------------------------------------------------------------+
| LAYER 5: Control Bar & Filter Toolbar (Search, Dropdown Filters, Dates, Actions)  |
+-----------------------------------------------------------------------------------+
| LAYER 6: Main Operational Working Area                                            |
|          [Variant A: Data Table with Paginated Records]                           |
|          [Variant B: Bento Grid Interactive Cards Matrix]                         |
|          [Variant C: Form / Stepper Canvas with Preview Frame]                    |
+-----------------------------------------------------------------------------------+
| LAYER 7: Detail Inspection Drawer / Context Side-Panel (Sliding Drawer on Select) |
+-----------------------------------------------------------------------------------+
| LAYER 8: Modals, Dialogs & Action Confirmations (Z-Index 50+ Focus Trap)         |
+-----------------------------------------------------------------------------------+
```

---

### Deep Dive into the 8 Structural Layers

#### Layer 1: Breadcrumb Navigation & Scope Path
- **Position**: Absolute top of page content area, below application header.
- **Components**:
  - Home link (`Accueil` / `Administration`).
  - Section link (e.g. `Ventes`, `Catalogue`, `Conformité`).
  - Active page name (bold text or high-contrast token).
- **Behavior**: Clickable trail enabling one-click parent navigation; handles RTL flipping automatically in Arabic.

#### Layer 2: Page Header Bar
- **Position**: Immediately beneath breadcrumb trail.
- **Components**:
  - Domain icon (Lucide icon with theme-derived accent styling).
  - Page Title (H1 equivalent, high semantic importance).
  - Contextual Status Tag / Environment Badge (e.g. `LIVE`, `VERIFIED`, `SANDBOX`).
  - Subtitle / Operational Objective (describes purpose of page in one concise sentence).
  - Primary Action Cluster:
    - Secondary Action Button (e.g. `Exporter CSV`, `Actualiser`, `Guide`).
    - Primary Action Button (e.g. `+ Nouveau Produit`, `Valider Paiement`, `Créer Campagne`).

#### Layer 3: Critical Operational Banner (Conditional)
- **Position**: Above metric cards, demanding immediate visual priority when active.
- **Trigger Conditions**:
  - Unverified KYC documents requiring upload or revision.
  - Critical low-stock threshold reached across multiple SKUs.
  - Urgent Cash on Delivery (COD) unconfirmed orders approaching carrier cutoff.
  - Expiring SaaS subscription or payment gateway credential error.
- **States**: `Warning` (Amber/Yellow), `Critical/Error` (Red), `Information` (Blue), `Success` (Green).
- **Interactions**: Direct resolution button (e.g. `Résoudre Immédiatement`) and optional dismissal.

#### Layer 4: Telemetry & KPI Cards Strip
- **Position**: Directly above the main control and data working area.
- **Structure**: 3 to 5 standardized metric cards.
- **Card Content Anatomy**:
  - Metric Label (e.g. `Chiffre d'Affaires Brut`, `Commandes à Valider`, `Taux Anti-Refus`).
  - Primary Numerical Value (formatted in `TND` with 3-decimal millimes where applicable, e.g. `1,280.500 TND`).
  - Comparison Delta Indicator (e.g. `+14.2% vs période précédente` in green, or `-3.1%` in red).
  - Micro sparkline chart or iconography indicating metric category.

#### Layer 5: Control Bar & Filter Toolbar
- **Position**: Header of the main working area, directly binding user input to the data surface.
- **Components**:
  - Full-text instant search input with clearable `X` button and shortcut tooltip (`Ctrl+K`).
  - Quick Category / Status Filter Pills or Tabs (e.g. `Tous`, `En attente`, `Expédiés`, `Livrés`).
  - Dropdown Select Filters (e.g. 24 Tunisian Governorates, Carriers, Payment Methods).
  - Date Range Picker (e.g. `Aujourd'hui`, `7 derniers jours`, `30 jours`, `Personnalisé`).
  - Bulk Actions Dropdown (activates when records are selected: `Exporter`, `Changer statut`, `Imprimer bordereaux`).

#### Layer 6: Main Operational Working Area
- **Position**: Core center of the interface.
- **Archetype 1: Data Table View (Classique & Enterprise Mode)**:
  - Sticky header row with sortable column indicators.
  - Checkbox selection column for bulk batch operations.
  - High-readability data rows with primary text, secondary subtitles, and pill badges.
  - Row action menu (three dots or quick icon hover buttons).
  - Pagination footer: `Affichage 1-25 sur 142 résultats`, page size selector (10, 25, 50, 100), previous/next controls.
- **Archetype 2: Bento Grid Matrix (Bento Cockpit & Command Mode)**:
  - Responsive modular cards grid (12-column foundation).
  - Visual telemetry widgets, interactive status dials, and fast-action docks.
  - Drag-or-click interactive cards with live sparklines.
- **Archetype 3: Two-Column Form & Preview Canvas (Visual Builders & CMS)**:
  - Left column: Input controls, accordion sections, and configuration fields.
  - Right column: Real-time live preview canvas (responsive mobile/tablet/desktop simulator).

#### Layer 7: Detail Inspection Drawer / Context Side-Panel
- **Position**: Slides out from the right (or left in RTL) without navigating away from the parent page.
- **Components**:
  - Drawer Header: Item identifier (e.g. `Commande #CMD-84920`, `Vendeur: Boutique Elyssa`), close `X` button.
  - Content Tabs: Overview, Timeline, Financial Breakdown, Customer Details, Audit History.
  - Sticky Action Footer: Instant actions (e.g. `Imprimer Bordereau Aramex`, `Confirmer COD par SMS`, `Suspendre Compte`).

#### Layer 8: Modals, Dialogs & Action Confirmations
- **Position**: Fixed overlay centered on viewport, backdrop blur, keyboard trap.
- **Components**:
  - Dialog Title & Close Icon.
  - Explanatory context / warning description.
  - Form inputs or action confirmation fields.
  - Footer buttons: `Annuler` (neutral secondary) and `Confirmer` (primary action / destructive red).

---

## 3. Theme Adaptation Matrix by Layout Archetype

| Layer Component | Bento Cockpit Theme | Classique E-Commerce Theme | OpenDesign Minimalist Theme |
|---|---|---|---|
| **Layer 1: Breadcrumbs** | Compact pill format with micro-separators | Traditional text hierarchy with slashes | Ultra-clean monospaced typography with subtle dot |
| **Layer 2: Header Bar** | High-density compact bar with integrated switch dock | Generous vertical padding with full-width action bar | Floating sleek bar with hairline border separation |
| **Layer 3: Alerts** | Glowing neon outline badge with pulse icon | Standard solid amber/red notification banner | Minimalist tinted card with rounded border |
| **Layer 4: KPI Strip** | Bento grid modules with integrated sparklines | Horizontal card row with prominent shadow | Flat monochrome cards with bold numerical typography |
| **Layer 5: Control Bar** | Floating toolbar dock with icon tooltips | Traditional full-width filter bar with select dropdowns | Seamless integrated input bar with subtle line divider |
| **Layer 6: Working Area** | Modular bento tiles with drag & quick expand | Standard enterprise tabular grid with clear row borders | Minimalist table with generous whitespace and hover tint |
| **Layer 7: Drawers** | Dark glassmorphic slide-out with telemetry docks | Clean white drawer with collapsible sections | Floating panel with hairline border and subtle shadow |
| **Layer 8: Modals** | Cyberpunk/cockpit frosted modal with accent rim | Standard enterprise dialog with drop shadow | Sculpted minimalist dialog with tactile rounded corners |

---

## 4. Tunisian Commerce Localization Constraints

1. **Currency**: All monetary values MUST format with 3 decimal places (millimes): `1,250.000 TND`.
2. **Governorates**: All regional filters and delivery matrices MUST list all 24 Tunisian Governorates grouped by economic hubs:
   - *Grand Tunis*: Tunis, Ariana, Ben Arous, Manouba
   - *Nord-Est*: Nabeul, Zaghouan, Bizerte
   - *Nord-Ouest*: Béja, Jendouba, Le Kef, Siliana
   - *Centre-Est*: Sousse, Monastir, Mahdia, Sfax
   - *Centre-Ouest*: Kairouan, Kasserine, Sidi Bouzid
   - *Sud-Est*: Gabès, Médenine, Tataouine
   - *Sud-Ouest*: Gafsa, Tozeur, Kébili
3. **Banking**: Bank payout account numbers (RIB) MUST validate against the standard 20-digit Tunisian format with Modulo 97 checksum.
4. **COD Delivery**: Cash on Delivery (Paiement à la livraison) MUST include an Anti-Refus score, SMS OTP verification badge, and delivery handshake proof.
